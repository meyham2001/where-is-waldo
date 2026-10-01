import { NextRequest, NextResponse } from "next/server";
import {
  getRoom,
  joinRoom,
  setLevels,
  startRound,
  submitClick,
  resetGame,
  restartGame,
  finishGameEarly,
  levelForRound,
  ROOM_NOT_FOUND,
} from "@/lib/room-store";
import { broadcastRoomUpdate } from "@/lib/pusher-server";
import { RoomState } from "@/lib/game-types";

// Room state must never be cached
export const dynamic = "force-dynamic";

function errorResponse(error: string, status = 400) {
  return NextResponse.json({ error }, { status: error === ROOM_NOT_FOUND ? 404 : status });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const room = await getRoom(id);
  if (!room) return errorResponse(ROOM_NOT_FOUND);

  return NextResponse.json(
    { room, currentLevel: levelForRound(room) },
    { headers: { "Cache-Control": "no-store" } }
  );
}

// Host-only actions: authorized by the secret host token handed out when the room was created
const HOST_ACTIONS: Record<
  string,
  { event: string; run: (id: string, body: any) => Promise<RoomState | { error: string }> }
> = {
  "set-levels": { event: "levels-updated", run: (id, b) => setLevels(id, b.hostToken, b.levelIds) },
  start: { event: "round-started", run: (id, b) => startRound(id, b.hostToken, b.roundIndex) },
  finish: { event: "game-finished", run: (id, b) => finishGameEarly(id, b.hostToken) },
  reset: { event: "game-reset", run: (id, b) => resetGame(id, b.hostToken) },
  restart: { event: "round-started", run: (id, b) => restartGame(id, b.hostToken) },
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { action } = body;

  if (action === "join") {
    const { player, hostToken } = body;
    if (!player || !player.id || !player.name) {
      return errorResponse("Missing player info");
    }
    const joined = await joinRoom(id, player, hostToken);
    if ("error" in joined) return errorResponse(joined.error, 409);

    const joinedPlayer = joined.room.players[joined.playerId];
    await broadcastRoomUpdate(id, "player-joined", { room: joined.room, player: joinedPlayer });
    return NextResponse.json({ success: true, room: joined.room, player: joinedPlayer });
  }

  if (action === "click") {
    const { playerId, x, y } = body;
    if (typeof x !== "number" || typeof y !== "number" || !playerId) {
      return errorResponse("Invalid click payload");
    }

    const { hit, room, distance } = await submitClick(id, playerId, x, y);
    if (!room) return errorResponse(ROOM_NOT_FOUND);

    if (hit) {
      await broadcastRoomUpdate(id, "round-won", { room, result: room.roundResult });
    }
    return NextResponse.json({
      success: true,
      hit,
      distance: parseFloat(distance.toFixed(2)),
      room,
    });
  }

  const hostAction = HOST_ACTIONS[action];
  if (hostAction) {
    const res = await hostAction.run(id, body);
    if ("error" in res) return errorResponse(res.error, 403);

    const currentLevel = levelForRound(res);
    await broadcastRoomUpdate(id, hostAction.event, { room: res, currentLevel });
    return NextResponse.json({ success: true, room: res, currentLevel });
  }

  return errorResponse("Unknown action");
}
