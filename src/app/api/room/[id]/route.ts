import { NextRequest, NextResponse } from "next/server";
import {
  getOrCreateRoom,
  joinRoom,
  startRound,
  submitClick,
  resetGame,
  restartGame,
  finishGameEarly,
  getLevels,
} from "@/lib/room-store";
import { broadcastRoomUpdate } from "@/lib/pusher-server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const room = getOrCreateRoom(id);
  const levels = getLevels();

  return NextResponse.json({
    room,
    currentLevel: levels[room.currentRoundIndex] || null,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { action } = body;
  const levels = getLevels();

  let room = getOrCreateRoom(id);

  if (action === "join") {
    const { player } = body;
    if (!player || !player.id || !player.name) {
      return NextResponse.json({ error: "Missing player info" }, { status: 400 });
    }
    room = joinRoom(id, player);
    const cleanName = player.name.trim().toLowerCase();
    const joinedPlayer = Object.values(room.players).find(
      (p) => p.name.trim().toLowerCase() === cleanName
    ) || room.players[player.id];

    await broadcastRoomUpdate(id, "player-joined", { room, player: joinedPlayer });
    return NextResponse.json({ success: true, room, player: joinedPlayer });
  }

  if (action === "start") {
    const { hostId, roundIndex } = body;
    const res = startRound(id, hostId, roundIndex);
    if ("error" in res) {
      return NextResponse.json({ error: res.error }, { status: 403 });
    }
    room = res;
    await broadcastRoomUpdate(id, "round-started", {
      room,
      currentLevel: levels[room.currentRoundIndex],
    });
    return NextResponse.json({
      success: true,
      room,
      currentLevel: levels[room.currentRoundIndex],
    });
  }

  if (action === "click") {
    const { playerId, x, y } = body;
    if (typeof x !== "number" || typeof y !== "number" || !playerId) {
      return NextResponse.json({ error: "Invalid click payload" }, { status: 400 });
    }

    const { hit, room: updatedRoom, distance } = submitClick(id, playerId, x, y);

    if (hit) {
      await broadcastRoomUpdate(id, "round-won", {
        room: updatedRoom,
        result: updatedRoom.roundResult,
      });
    }

    return NextResponse.json({
      success: true,
      hit,
      distance: parseFloat(distance.toFixed(2)),
      room: updatedRoom,
    });
  }

  if (action === "finish") {
    const { hostId } = body;
    const res = finishGameEarly(id, hostId);
    if ("error" in res) {
      return NextResponse.json({ error: res.error }, { status: 403 });
    }
    room = res;
    await broadcastRoomUpdate(id, "game-finished", { room });
    return NextResponse.json({ success: true, room });
  }

  if (action === "reset") {
    const { hostId } = body;
    const res = resetGame(id, hostId);
    if ("error" in res) {
      return NextResponse.json({ error: res.error }, { status: 403 });
    }
    room = res;
    await broadcastRoomUpdate(id, "game-reset", { room });
    return NextResponse.json({ success: true, room });
  }

  if (action === "restart") {
    const { hostId } = body;
    const res = restartGame(id, hostId);
    if ("error" in res) {
      return NextResponse.json({ error: res.error }, { status: 403 });
    }
    room = res;
    await broadcastRoomUpdate(id, "round-started", {
      room,
      currentLevel: levels[0],
    });
    return NextResponse.json({
      success: true,
      room,
      currentLevel: levels[0],
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
