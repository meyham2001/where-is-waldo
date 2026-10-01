# 🎩 Where's Waldo? - DXD Multiplayer Challenge

A real-time, interactive multiplayer hidden-object game built with **Next.js 15 (App Router)** and **Tailwind CSS**, designed specifically for easy deployment on **Vercel** with zero server maintenance.

---

## ✨ Key Features

- **Up to 10 DXD Teammates**: Live lobby, player roster with custom avatars & colors, 1-click room invite link, and real-time room synchronization.
- **8 High-Resolution Classic Levels**: Hand-drawn classic Martin Handford scenes.
- **Hardware-Accelerated Pan & Zoom**:
  - Mouse wheel zoom centered on cursor.
  - Click & drag to pan smoothly around crowded scenes.
  - Pinch-to-zoom on mobile and touch devices.
- **Fair Hit Detection**:
  - Normalized $(x\%, y\%)$ percentage coordinates scale reliably on phones, laptops, and 4K monitors.
  - 600ms click cooldown to prevent rapid spam clicking.
  - Generous hit radius around Waldo.
- **Round Reveal & Leaderboard**:
  - The instant Waldo is found, the round locks and Waldo is revealed with a glowing radar spotlight and the winner's name.
  - Live scoreboard tallies points after each round.
  - Top 3 championship podium with confetti celebration upon tournament completion.
- **Built-in Coordinate Calibrator (`/calibrate`)**:
  - Interactive visual tool to click and verify/adjust Waldo's coordinates on any image in real time.

---

## 🚀 Quick Start (Local Development)

```bash
# 1. Install dependencies
npm install

# 2. Run the development server
npm run dev

# 3. Open in your browser
http://localhost:3000
```

---

## 🌐 Deploying to Vercel (Zero Server Maintenance)

### Required: Shared Room Storage (Upstash Redis)
Vercel runs the API on many short-lived serverless instances, so room state must live in a shared store. Without it, players see conflicting game states (e.g. the end-of-round screen looping).

1. In your Vercel project, open **Storage → Create Database → Upstash for Redis** (free tier is plenty) and connect it to the project.
2. Vercel injects `KV_REST_API_URL` and `KV_REST_API_TOKEN` automatically (`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` also work).
3. Redeploy. Rooms expire after 24 hours of inactivity.

Locally (`npm run dev`) the app falls back to in-memory storage, so no setup is needed.

## 🎮 Hosting a Game

1. On the home page, enter your nickname and click **Create Room**. You get a random room code and become the room's admin (the host key is stored in your browser only).
2. In the lobby, pick which maps to play and drag them into order with the arrows.
3. Share the invite link; players join with their own nickname.
4. Click **Start Game** when everyone is in.

### Optional: Ultra-Low Latency (<50ms) with Pusher Channels
Pusher provides a 100% free tier (200k messages/day, 100 concurrent connections) with zero server setup:

1. Create a free account at [pusher.com](https://pusher.com) and create a Channels app.
2. In your Vercel Project Settings -> **Environment Variables**, add:
   - `NEXT_PUBLIC_PUSHER_KEY` = your Pusher app key
   - `NEXT_PUBLIC_PUSHER_CLUSTER` = your Pusher cluster (e.g. `mt1` or `eu`)
   - `PUSHER_APP_ID` = your Pusher app ID
   - `PUSHER_SECRET` = your Pusher secret
3. Redeploy your project on Vercel.

---

## 🖼️ Adding Maps

Add the scene to `public/levels/` as WebP plus a 1280px-wide `-preview.webp` copy (shown while the full image loads), then add an entry to `data/levels.json`.

## 🎯 Calibrating Coordinates

To inspect or adjust any scene's coordinates:
1. Navigate to `/calibrate` (or click "Coordinate Calibrator" from the home page).
2. Select any level from the dropdown.
3. Click on Waldo to view and adjust $(x\%, y\%)$ and the hit radius.
4. Click "Copy JSON" and paste into `data/levels.json`.
