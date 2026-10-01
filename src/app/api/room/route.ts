import { NextRequest, NextResponse } from "next/server";
import { createRoom } from "@/lib/room-store";

// Creates a room with a fresh random code; the creator becomes its host
export async function POST(request: NextRequest) {
  const { player } = await request.json();
  if (!player || !player.id || !player.name) {
    return NextResponse.json({ error: "Missing player info" }, { status: 400 });
  }

  const res = await createRoom(player);
  if ("error" in res) {
    return NextResponse.json({ error: res.error }, { status: 503 });
  }
  return NextResponse.json({ success: true, ...res });
}
