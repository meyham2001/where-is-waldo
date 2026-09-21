import { RoomState, Player, Level } from "./game-types";
import rawLevels from "../../data/levels.json";

const levels = rawLevels as Level[];

// Global in-memory store for development and serverless fallback
declare global {
  // eslint-disable-next-line no-var
  var __WALDO_ROOMS__: Map<string, RoomState> | undefined;
}

if (!global.__WALDO_ROOMS__) {
  global.__WALDO_ROOMS__ = new Map<string, RoomState>();
}

const rooms = global.__WALDO_ROOMS__;

export function getOrCreateRoom(roomId: string, hostPlayer?: { id: string; name: string; avatar: string; color: string }): RoomState {
  const normalizedId = roomId.toLowerCase().trim();
  let room = rooms.get(normalizedId);

  if (!room) {
    const now = Date.now();
    room = {
      roomId: normalizedId,
      status: "lobby",
      hostId: hostPlayer?.id || "",
      currentRoundIndex: 0,
      totalRounds: levels.length,
      roundStartTime: null,
      roundResult: null,
      players: {},
      selectedLevelIds: levels.map((l) => l.id),
      createdAt: now,
      lastUpdated: now,
    };
    rooms.set(normalizedId, room);
  } else {
    room.totalRounds = levels.length;
    room.selectedLevelIds = levels.map((l) => l.id);
  }

  if (hostPlayer && !room.players[hostPlayer.id]) {
    const isFirstPlayer = Object.keys(room.players).length === 0;
    if (isFirstPlayer || !room.hostId) {
      room.hostId = hostPlayer.id;
    }
    room.players[hostPlayer.id] = {
      id: hostPlayer.id,
      name: hostPlayer.name,
      avatar: hostPlayer.avatar,
      color: hostPlayer.color,
      score: 0,
      isHost: room.hostId === hostPlayer.id,
      joinedAt: Date.now(),
      lastActive: Date.now(),
    };
    room.lastUpdated = Date.now();
  }

  return room;
}

export function joinRoom(
  roomId: string,
  player: { id: string; name: string; avatar: string; color: string }
): RoomState {
  const room = getOrCreateRoom(roomId);
  const now = Date.now();

  // Deduplicate: check if a player with the same name already exists in this room
  const cleanName = (player.name || "").trim().toLowerCase();
  const existingByName = Object.values(room.players).find(
    (p) => p.name.trim().toLowerCase() === cleanName
  );

  const targetId = existingByName ? existingByName.id : player.id;
  const existingPlayer = room.players[targetId];

  const isHost = Object.keys(room.players).length === 0 || room.hostId === targetId || (existingPlayer && existingPlayer.isHost);
  if (isHost && !room.hostId) {
    room.hostId = targetId;
  }

  room.players[targetId] = {
    id: targetId,
    name: player.name || (existingPlayer ? existingPlayer.name : "Player"),
    avatar: player.avatar || (existingPlayer ? existingPlayer.avatar : "🎩"),
    color: player.color || (existingPlayer ? existingPlayer.color : "#E11D48"),
    score: existingPlayer ? existingPlayer.score : 0,
    isHost: isHost || room.hostId === targetId,
    joinedAt: existingPlayer ? existingPlayer.joinedAt : now,
    lastActive: now,
  };

  room.lastUpdated = now;
  return room;
}

export function startRound(roomId: string, hostId: string, roundIndex?: number): RoomState | { error: string } {
  const room = getOrCreateRoom(roomId);
  if (room.hostId !== hostId) {
    return { error: "Only the room host can start the game." };
  }

  const targetRound = typeof roundIndex === "number" ? roundIndex : room.currentRoundIndex;
  if (targetRound >= levels.length) {
    room.status = "finished";
    room.lastUpdated = Date.now();
    return room;
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
  room.lastUpdated = Date.now();
  return room;
}

export function submitClick(
  roomId: string,
  playerId: string,
  x: number,
  y: number
): { hit: boolean; room: RoomState; distance: number } {
  const room = getOrCreateRoom(roomId);
  const player = room.players[playerId];

  if (!player || room.status !== "playing") {
    return { hit: false, room, distance: 999 };
  }

  const currentLevel = levels[room.currentRoundIndex];
  if (!currentLevel) {
    return { hit: false, room, distance: 999 };
  }

  const target = currentLevel.target;
  const dx = x - target.x;
  const dy = y - target.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Check if click is within radius
  if (distance <= target.radius) {
    // Round won!
    player.score += 1;
    const timeTaken = room.roundStartTime ? (Date.now() - room.roundStartTime) / 1000 : 0;

    room.status = "round_won";
    room.roundResult = {
      roundIndex: room.currentRoundIndex,
      winnerPlayerId: player.id,
      winnerName: player.name,
      timeSeconds: parseFloat(timeTaken.toFixed(1)),
      targetX: target.x,
      targetY: target.y,
    };
    room.lastUpdated = Date.now();
    return { hit: true, room, distance };
  }

  return { hit: false, room, distance };
}

export function finishGameEarly(roomId: string, hostId: string): RoomState | { error: string } {
  const room = getOrCreateRoom(roomId);
  if (room.hostId !== hostId) {
    return { error: "Only the room host can end the game." };
  }

  room.status = "finished";
  room.lastUpdated = Date.now();
  return room;
}

export function resetGame(roomId: string, hostId: string): RoomState | { error: string } {
  const room = getOrCreateRoom(roomId);
  if (room.hostId !== hostId) {
    return { error: "Only the room host can reset the game." };
  }

  room.status = "lobby";
  room.currentRoundIndex = 0;
  room.totalRounds = levels.length;
  room.selectedLevelIds = levels.map((l) => l.id);
  room.roundStartTime = null;
  room.roundResult = null;
  for (const pid of Object.keys(room.players)) {
    room.players[pid].score = 0;
  }
  room.lastUpdated = Date.now();
  return room;
}

export function restartGame(roomId: string, hostId: string): RoomState | { error: string } {
  const room = getOrCreateRoom(roomId);
  if (room.hostId !== hostId) {
    return { error: "Only the room host can restart the game." };
  }

  room.status = "playing";
  room.currentRoundIndex = 0;
  room.totalRounds = levels.length;
  room.selectedLevelIds = levels.map((l) => l.id);
  room.roundStartTime = Date.now();
  room.roundResult = null;
  for (const pid of Object.keys(room.players)) {
    room.players[pid].score = 0;
  }
  room.lastUpdated = Date.now();
  return room;
}

export function getLevels(): Level[] {
  return levels;
}

