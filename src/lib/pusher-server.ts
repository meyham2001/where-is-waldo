import crypto from "crypto";

export async function broadcastRoomUpdate(roomId: string, event: string, data: any) {
  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "mt1";

  if (!appId || !key || !secret) {
    return; // Using serverless polling fallback
  }

  try {
    const body = JSON.stringify({
      name: event,
      channels: [`room-${roomId}`],
      data: JSON.stringify(data),
    });

    const bodyMd5 = crypto.createHash("md5").update(body, "utf8").digest("hex");
    const timestamp = Math.floor(Date.now() / 1000);
    const path = `/apps/${appId}/events`;
    const queryString = `auth_key=${key}&auth_timestamp=${timestamp}&auth_version=1.0&body_md5=${bodyMd5}`;
    const stringToSign = `POST\n${path}\n${queryString}`;

    const signature = crypto
      .createHmac("sha256", secret)
      .update(stringToSign, "utf8")
      .digest("hex");

    const url = `https://api-${cluster}.pusher.com${path}?${queryString}&auth_signature=${signature}`;

    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
  } catch (err) {
    console.error("Pusher broadcast error:", err);
  }
}
