export interface WaldoTarget {
  x: number; // percentage (0 - 100)
  y: number; // percentage (0 - 100)
  radius: number; // percentage radius for forgiving hit detection (default 2.5 - 3.5%)
}

export interface Level {
  id: number;
  title: string;
  subtitle: string;
  image: string;
  hint: string;
  target: WaldoTarget;
}

export interface Player {
  id: string;
  name: string;
  color: string;
  avatar: string;
  score: number;
  isHost: boolean;
  joinedAt: number;
  lastActive: number;
}

export type GameStatus = "lobby" | "playing" | "round_won" | "finished";

export interface RoundResult {
  roundIndex: number;
  winnerPlayerId: string;
  winnerName: string;
  timeSeconds: number;
  targetX: number;
  targetY: number;
}

export interface RoomState {
  roomId: string;
  // Incremented on every write; clients ignore room snapshots older than the one they have
  version: number;
  status: GameStatus;
  hostId: string;
  currentRoundIndex: number;
  totalRounds: number;
  roundStartTime: number | null;
  roundResult: RoundResult | null;
  players: Record<string, Player>;
  selectedLevelIds: number[];
  createdAt: number;
  lastUpdated: number;
}
