import { Redis } from "@upstash/redis";
import crypto from "crypto";
import { RoomState, Player, Level } from "./game-types";
import rawLevels from "../../data/levels.json";

const levels = rawLevels as Level[];

// Rooms expire after a day of inactivity
const ROOM_TTL_SECONDS = 60 * 60 * 24;
const MAX_WRITE_ATTEMPTS = 8;

type PlayerInfo = { id: string; name: string; avatar: string; color: string };

export const ROOM_NOT_FOUND = "Room not found. Ask the host for a fresh invite link.";

// The host token is a secret held only by the creator's browser; it never leaves the server otherwise
interface StoredRoom extends RoomState {
  hostToken: string;
}

function toPublic(room: StoredRoom): RoomState {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { hostToken, ...publicRoom } = room;
  return publicRoom;
}

function isHost(room: StoredRoom, hostToken: unknown) {
  if (typeof hostToken !== "string" || !room.hostToken) return false;
  const a = Buffer.from(hostToken);
  const b = Buffer.from(room.hostToken);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function levelForRound(room: RoomState, roundIndex = room.currentRoundIndex): Level | null {
  const levelId = room.selectedLevelIds[roundIndex];
  return levels.find((l) => l.id === levelId) ?? null;
}
// Return NO_CHANGE from a mutation to skip the write (no version bump, no broadcast-worthy change)
const NO_CHANGE = Symbol("no-change");
type Mutation<T> = (room: StoredRoom) => T | typeof NO_CHANGE | { error: string };

// ---------------------------------------------------------------------------
// Storage backends
//
// On Vercel every request may hit a different serverless instance, so room state
// must live in a shared store (Upstash Redis). Every write is a compare-and-set
// on `room.version`, so concurrent requests never overwrite each other.
// Without Redis credentials (local `npm run dev`) we fall back to process memory.
// ---------------------------------------------------------------------------

interface RoomBackend {
  load(roomId: string): Promise<StoredRoom | null>;
  // Saves `room` only if the stored version still equals `expectedVersion`
  saveIfVersion(room: StoredRoom, expectedVersion: number): Promise<boolean>;
}

const CAS_SCRIPT = `
local current = redis.call('GET', KEYS[1])
local currentVersion = 0
if current then
  currentVersion = tonumber(cjson.decode(current).version) or 0
end
if currentVersion ~= tonumber(ARGV[2]) then
  return 0
end
redis.call('SET', KEYS[1], ARGV[1], 'EX', ARGV[3])
return 1
`;

function createRedisBackend(url: string, token: string): RoomBackend {
  const redis = new Redis({ url, token });
  const key = (roomId: string) => `waldo:room:${roomId}`;

  return {
    async load(roomId) {
      return (await redis.get<StoredRoom>(key(roomId))) ?? null;
    },
    async saveIfVersion(room, expectedVersion) {
      const result = await redis.eval(
        CAS_SCRIPT,
        [key(room.roomId)],
        [JSON.stringify(room), String(expectedVersion), String(ROOM_TTL_SECONDS)]
      );
      return Number(result) === 1;
    },
  };
}

declare global {
  // eslint-disable-next-line no-var
  var __WALDO_ROOMS__: Map<string, StoredRoom> | undefined;
}

function createMemoryBackend(): RoomBackend {
  if (!global.__WALDO_ROOMS__) {
    global.__WALDO_ROOMS__ = new Map<string, StoredRoom>();
  }
  const rooms = global.__WALDO_ROOMS__;

  return {
    async load(roomId) {
      const room = rooms.get(roomId);
      return room ? structuredClone(room) : null;
    },
    async saveIfVersion(room, expectedVersion) {
      const currentVersion = rooms.get(room.roomId)?.version ?? 0;
      if (currentVersion !== expectedVersion) return false;
      rooms.set(room.roomId, structuredClone(room));
      return true;
    },
  };
}

// Vercel's Upstash integration injects KV_REST_API_*; a direct Upstash setup uses UPSTASH_REDIS_REST_*
const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

if (!redisUrl && process.env.VERCEL) {
  console.warn(
    "[waldo] No Upstash Redis credentials found. Room state will NOT be shared between serverless instances."
  );
}

const backend: RoomBackend =
  redisUrl && redisToken ? createRedisBackend(redisUrl, redisToken) : createMemoryBackend();

function normalizeId(roomId: string) {
  return roomId.toLowerCase().trim();
}

const ROOM_CODE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"; // no look-alikes (0/o, 1/l/i)

function randomRoomCode(length = 6) {
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes, (b) => ROOM_CODE_ALPHABET[b % ROOM_CODE_ALPHABET.length]).join("");
}

function newPlayer(player: PlayerInfo, isHost: boolean, existing?: Player) {
  const now = Date.now();
  return {
    id: existing?.id ?? player.id,
    name: player.name || existing?.name || "Player",
    avatar: player.avatar || existing?.avatar || "🎩",
    color: player.color || existing?.color || "#E11D48",
    score: existing?.score ?? 0,
    isHost,
    joinedAt: existing?.joinedAt ?? now,
    lastActive: now,
  };
}

/**
 * Loads an existing room, applies `mutate`, and saves it atomically.
 * If another request wrote the room in the meantime, the mutation is retried on fresh state.
 * Returning `{ error }` from `mutate` aborts without saving; NO_CHANGE skips the write.
 */
async function updateRoom<T>(
  roomId: string,
  mutate: Mutation<T>
): Promise<{ room: RoomState; result: T | typeof NO_CHANGE } | { error: string }> {
  const id = normalizeId(roomId);

  for (let attempt = 0; attempt < MAX_WRITE_ATTEMPTS; attempt++) {
    const room = await backend.load(id);
    if (!room) return { error: ROOM_NOT_FOUND };
    const expectedVersion = room.version;

    const result = mutate(room);
    if (result && typeof result === "object" && "error" in result) {
      return { error: result.error };
    }
    if (result === NO_CHANGE) {
      return { room: toPublic(room), result };
    }

    room.version = expectedVersion + 1;
    room.lastUpdated = Date.now();
    if (await backend.saveIfVersion(room, expectedVersion)) {
      return { room: toPublic(room), result: result as T };
    }
  }

  return { error: "Room is busy, please try again." };
}

function hostOnly<T>(hostToken: unknown, action: string, mutate: Mutation<T>): Mutation<T> {
  return (room) => (isHost(room, hostToken) ? mutate(room) : { error: `Only the room host can ${action}.` });
}

async function hostUpdate(
  roomId: string,
  hostToken: unknown,
  action: string,
  mutate: Mutation<unknown>
): Promise<RoomState | { error: string }> {
  const res = await updateRoom(roomId, hostOnly(hostToken, action, mutate));
  return "error" in res ? res : res.room;
}

export async function createRoom(
  host: PlayerInfo
): Promise<{ room: RoomState; player: Player; hostToken: string } | { error: string }> {
  for (let attempt = 0; attempt < MAX_WRITE_ATTEMPTS; attempt++) {
    const now = Date.now();
    const roomId = randomRoomCode();
    const hostPlayer = newPlayer(host, true);
    const room: StoredRoom = {
      roomId,
      version: 1,
      status: "lobby",
      hostId: hostPlayer.id,
      hostToken: crypto.randomBytes(24).toString("base64url"),
      currentRoundIndex: 0,
      totalRounds: levels.length,
      roundStartTime: null,
      roundResult: null,
      players: { [hostPlayer.id]: hostPlayer },
      selectedLevelIds: levels.map((l) => l.id),
      createdAt: now,
      lastUpdated: now,
    };

    // Version 0 means "only if no room with this code exists yet"
    if (await backend.saveIfVersion(room, 0)) {
      return { room: toPublic(room), player: hostPlayer, hostToken: room.hostToken };
    }
  }
  return { error: "Could not create a room, please try again." };
}

export async function getRoom(roomId: string): Promise<RoomState | null> {
  const room = await backend.load(normalizeId(roomId));
  return room ? toPublic(room) : null;
}

export async function joinRoom(
  roomId: string,
  player: PlayerInfo,
  hostToken?: unknown
): Promise<{ room: RoomState; playerId: string } | { error: string }> {
  const res = await updateRoom(roomId, (room) => {
    const cleanName = (player.name || "").trim().toLowerCase();
    const sameName = Object.values(room.players).find(
      (p) => p.name.trim().toLowerCase() === cleanName && p.id !== player.id
    );

    // Taking over the host's seat requires the host token, so nobody becomes admin by typing the host's name
    if (sameName && sameName.id === room.hostId && !isHost(room, hostToken)) {
      return { error: "That nickname is taken by the host. Please pick another one." };
    }

    // Otherwise, rejoining under the same name (e.g. from another device) keeps that player's score
    const existing = sameName ?? room.players[player.id];
    const joined = newPlayer(player, (existing?.id ?? player.id) === room.hostId, existing);
    room.players[joined.id] = joined;
    return joined.id;
  });

  if ("error" in res) return res;
  return { room: res.room, playerId: res.result as string };
}

export async function setLevels(
  roomId: string,
  hostToken: unknown,
  levelIds: unknown
): Promise<RoomState | { error: string }> {
  const validIds = new Set(levels.map((l) => l.id));
  if (
    !Array.isArray(levelIds) ||
    levelIds.length === 0 ||
    !levelIds.every((id) => validIds.has(id)) ||
    new Set(levelIds).size !== levelIds.length
  ) {
    return { error: "Pick at least one map, each map at most once." };
  }

  return hostUpdate(roomId, hostToken, "choose the maps", (room) => {
    if (room.status !== "lobby") {
      return { error: "Maps can only be changed in the lobby." };
    }
    room.selectedLevelIds = levelIds as number[];
    room.totalRounds = levelIds.length;
    room.currentRoundIndex = 0;
    return null;
  });
}

export async function startRound(
  roomId: string,
  hostToken: unknown,
  roundIndex?: number
): Promise<RoomState | { error: string }> {
  return hostUpdate(roomId, hostToken, "start the game", (room) => {
    const targetRound = typeof roundIndex === "number" ? roundIndex : room.currentRoundIndex;

    // Idempotent: a duplicate "start" for the round already in progress must not restart it
    if (room.status === "playing" && room.currentRoundIndex === targetRound) {
      return NO_CHANGE;
    }
    // Advancing is only valid from the round that was just won
    if (targetRound > 0 && !(room.status === "round_won" && targetRound === room.currentRoundIndex + 1)) {
      return NO_CHANGE;
    }

    if (targetRound >= room.selectedLevelIds.length) {
      room.status = "finished";
      return null;
    }

    if (targetRound === 0) {
      resetRoomTo(room, "playing");
      return null;
    }

    room.status = "playing";
    room.currentRoundIndex = targetRound;
    room.roundStartTime = Date.now();
    room.roundResult = null;
    return null;
  });
}

export async function submitClick(
  roomId: string,
  playerId: string,
  x: number,
  y: number
): Promise<{ hit: boolean; room: RoomState | null; distance: number }> {
  const room = await getRoom(roomId);
  const currentLevel = room && levelForRound(room);

  if (!room || !currentLevel || !room.players[playerId] || room.status !== "playing") {
    return { hit: false, room, distance: 999 };
  }

  const target = currentLevel.target;
  const distance = Math.hypot(x - target.x, y - target.y);
  if (distance > target.radius) {
    return { hit: false, room, distance };
  }

  // Round won! Re-check inside the atomic update so only the first correct click scores.
  const roundIndex = room.currentRoundIndex;
  const res = await updateRoom(roomId, (fresh) => {
    const player = fresh.players[playerId];
    if (!player || fresh.status !== "playing" || fresh.currentRoundIndex !== roundIndex) {
      return NO_CHANGE;
    }

    player.score += 1;
    const timeTaken = fresh.roundStartTime ? (Date.now() - fresh.roundStartTime) / 1000 : 0;
    fresh.status = "round_won";
    fresh.roundResult = {
      roundIndex,
      winnerPlayerId: player.id,
      winnerName: player.name,
      timeSeconds: parseFloat(timeTaken.toFixed(1)),
      targetX: target.x,
      targetY: target.y,
    };
    return true;
  });

  if ("error" in res) {
    return { hit: false, room, distance };
  }
  // NO_CHANGE: someone else won this round first
  return { hit: res.result === true, room: res.room, distance };
}

export async function finishGameEarly(roomId: string, hostToken: unknown) {
  return hostUpdate(roomId, hostToken, "end the game", (room) => {
    room.status = "finished";
    return null;
  });
}

// Keeps the host's chosen maps and their order
function resetRoomTo(room: RoomState, status: "lobby" | "playing") {
  room.status = status;
  room.currentRoundIndex = 0;
  room.totalRounds = room.selectedLevelIds.length;
  room.roundStartTime = status === "playing" ? Date.now() : null;
  room.roundResult = null;
  for (const pid of Object.keys(room.players)) {
    room.players[pid].score = 0;
  }
}

export async function resetGame(roomId: string, hostToken: unknown) {
  return hostUpdate(roomId, hostToken, "reset the game", (room) => {
    resetRoomTo(room, "lobby");
    return null;
  });
}

export async function restartGame(roomId: string, hostToken: unknown) {
  return hostUpdate(roomId, hostToken, "restart the game", (room) => {
    resetRoomTo(room, "playing");
    return null;
  });
}

export function getLevels(): Level[] {
  return levels;
}
