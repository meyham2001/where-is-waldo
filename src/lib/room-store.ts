import { Redis } from "@upstash/redis";
import { RoomState, Level } from "./game-types";
import rawLevels from "../../data/levels.json";

const levels = rawLevels as Level[];

// Rooms expire after a day of inactivity
const ROOM_TTL_SECONDS = 60 * 60 * 24;
const MAX_WRITE_ATTEMPTS = 8;

type PlayerInfo = { id: string; name: string; avatar: string; color: string };
// Return NO_CHANGE from a mutation to skip the write (no version bump, no broadcast-worthy change)
const NO_CHANGE = Symbol("no-change");
type Mutation<T> = (room: RoomState) => T | typeof NO_CHANGE | { error: string };

// ---------------------------------------------------------------------------
// Storage backends
//
// On Vercel every request may hit a different serverless instance, so room state
// must live in a shared store (Upstash Redis). Every write is a compare-and-set
// on `room.version`, so concurrent requests never overwrite each other.
// Without Redis credentials (local `npm run dev`) we fall back to process memory.
// ---------------------------------------------------------------------------

interface RoomBackend {
  load(roomId: string): Promise<RoomState | null>;
  // Saves `room` only if the stored version still equals `expectedVersion`
  saveIfVersion(room: RoomState, expectedVersion: number): Promise<boolean>;
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
      return (await redis.get<RoomState>(key(roomId))) ?? null;
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
  var __WALDO_ROOMS__: Map<string, RoomState> | undefined;
}

function createMemoryBackend(): RoomBackend {
  if (!global.__WALDO_ROOMS__) {
    global.__WALDO_ROOMS__ = new Map<string, RoomState>();
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

function newRoom(roomId: string): RoomState {
  const now = Date.now();
  return {
    roomId,
    version: 0,
    status: "lobby",
    hostId: "",
    currentRoundIndex: 0,
    totalRounds: levels.length,
    roundStartTime: null,
    roundResult: null,
    players: {},
    selectedLevelIds: levels.map((l) => l.id),
    createdAt: now,
    lastUpdated: now,
  };
}

/**
 * Loads the room (creating it if needed), applies `mutate`, and saves it atomically.
 * If another request wrote the room in the meantime, the mutation is retried on fresh state.
 * Returning `{ error }` from `mutate` aborts without saving.
 */
async function updateRoom<T>(
  roomId: string,
  mutate: Mutation<T>
): Promise<{ room: RoomState; result: T | typeof NO_CHANGE } | { error: string }> {
  const id = normalizeId(roomId);

  for (let attempt = 0; attempt < MAX_WRITE_ATTEMPTS; attempt++) {
    const room = (await backend.load(id)) ?? newRoom(id);
    const expectedVersion = room.version ?? 0;

    const result = mutate(room);
    if (result && typeof result === "object" && "error" in result) {
      return { error: result.error };
    }
    if (result === NO_CHANGE) {
      return { room: (await backend.load(id)) ?? room, result };
    }

    room.version = expectedVersion + 1;
    room.lastUpdated = Date.now();
    if (await backend.saveIfVersion(room, expectedVersion)) {
      return { room, result: result as T };
    }
  }

  return { error: "Room is busy, please try again." };
}

export async function getOrCreateRoom(roomId: string): Promise<RoomState> {
  const existing = await backend.load(normalizeId(roomId));
  if (existing) return existing;

  // Only the first request creates the room; a concurrent creator's room is kept as-is
  const res = await updateRoom(roomId, (room) => (room.version ? NO_CHANGE : null));
  return "error" in res ? newRoom(normalizeId(roomId)) : res.room;
}

export async function joinRoom(
  roomId: string,
  player: PlayerInfo
): Promise<{ room: RoomState; playerId: string } | { error: string }> {
  const res = await updateRoom(roomId, (room) => {
    const now = Date.now();

    // Deduplicate: reuse the existing player with the same name in this room
    const cleanName = (player.name || "").trim().toLowerCase();
    const existingByName = Object.values(room.players).find(
      (p) => p.name.trim().toLowerCase() === cleanName
    );

    const targetId = existingByName ? existingByName.id : player.id;
    const existingPlayer = room.players[targetId];

    if (!room.hostId) {
      room.hostId = targetId;
    }

    room.players[targetId] = {
      id: targetId,
      name: player.name || existingPlayer?.name || "Player",
      avatar: player.avatar || existingPlayer?.avatar || "🎩",
      color: player.color || existingPlayer?.color || "#E11D48",
      score: existingPlayer ? existingPlayer.score : 0,
      isHost: room.hostId === targetId,
      joinedAt: existingPlayer ? existingPlayer.joinedAt : now,
      lastActive: now,
    };

    return targetId;
  });

  if ("error" in res) return res;
  return { room: res.room, playerId: res.result as string };
}

export async function startRound(
  roomId: string,
  hostId: string,
  roundIndex?: number
): Promise<RoomState | { error: string }> {
  const res = await updateRoom(roomId, (room) => {
    if (room.hostId !== hostId) {
      return { error: "Only the room host can start the game." };
    }

    const targetRound = typeof roundIndex === "number" ? roundIndex : room.currentRoundIndex;

    // Idempotent: a duplicate "start" for the round already in progress must not restart it
    if (room.status === "playing" && room.currentRoundIndex === targetRound) {
      return NO_CHANGE;
    }
    // Advancing is only valid from the round that was just won
    if (targetRound > 0 && !(room.status === "round_won" && targetRound === room.currentRoundIndex + 1)) {
      return NO_CHANGE;
    }

    if (targetRound >= levels.length) {
      room.status = "finished";
      return null;
    }

    // If starting from round 0, reset all player scores to 0
    if (targetRound === 0) {
      for (const pid of Object.keys(room.players)) {
        room.players[pid].score = 0;
      }
    }

    room.status = "playing";
    room.currentRoundIndex = targetRound;
    room.roundStartTime = Date.now();
    room.roundResult = null;
    return null;
  });

  return "error" in res ? res : res.room;
}

export async function submitClick(
  roomId: string,
  playerId: string,
  x: number,
  y: number
): Promise<{ hit: boolean; room: RoomState; distance: number }> {
  const room = await getOrCreateRoom(roomId);
  const currentLevel = levels[room.currentRoundIndex];

  if (!room.players[playerId] || room.status !== "playing" || !currentLevel) {
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
  if (res.result === NO_CHANGE) {
    // Someone else won this round first
    return { hit: false, room: res.room, distance };
  }
  return { hit: true, room: res.room, distance };
}

export async function finishGameEarly(roomId: string, hostId: string): Promise<RoomState | { error: string }> {
  const res = await updateRoom(roomId, (room) => {
    if (room.hostId !== hostId) {
      return { error: "Only the room host can end the game." };
    }
    room.status = "finished";
    return null;
  });
  return "error" in res ? res : res.room;
}

function resetRoomTo(room: RoomState, status: "lobby" | "playing") {
  room.status = status;
  room.currentRoundIndex = 0;
  room.totalRounds = levels.length;
  room.selectedLevelIds = levels.map((l) => l.id);
  room.roundStartTime = status === "playing" ? Date.now() : null;
  room.roundResult = null;
  for (const pid of Object.keys(room.players)) {
    room.players[pid].score = 0;
  }
}

export async function resetGame(roomId: string, hostId: string): Promise<RoomState | { error: string }> {
  const res = await updateRoom(roomId, (room) => {
    if (room.hostId !== hostId) {
      return { error: "Only the room host can reset the game." };
    }
    resetRoomTo(room, "lobby");
    return null;
  });
  return "error" in res ? res : res.room;
}

export async function restartGame(roomId: string, hostId: string): Promise<RoomState | { error: string }> {
  const res = await updateRoom(roomId, (room) => {
    if (room.hostId !== hostId) {
      return { error: "Only the room host can restart the game." };
    }
    resetRoomTo(room, "playing");
    return null;
  });
  return "error" in res ? res : res.room;
}

export function getLevels(): Level[] {
  return levels;
}
