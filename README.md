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

### Option 1: Zero-Config Deployment (Built-in Serverless Sync)
The app comes with an automated serverless polling/heartbeat fallback that works **out-of-the-box on Vercel** without needing any third-party accounts or environment variables.

1. Push this repository to GitHub.
2. Go to [Vercel](https://vercel.com) and click **"Add New Project"**.
3. Import the repository and click **"Deploy"**.
4. That's it! Share your Vercel URL with your colleagues.

### Option 2: Ultra-Low Latency (<50ms) with Pusher Channels (Recommended for Fast Paced Play)
Pusher provides a 100% free tier (200k messages/day, 100 concurrent connections) with zero server setup:

1. Create a free account at [pusher.com](https://pusher.com) and create a Channels app.
2. In your Vercel Project Settings -> **Environment Variables**, add:
   - `NEXT_PUBLIC_PUSHER_KEY` = your Pusher app key
   - `NEXT_PUBLIC_PUSHER_CLUSTER` = your Pusher cluster (e.g. `mt1` or `eu`)
   - `PUSHER_APP_ID` = your Pusher app ID
   - `PUSHER_SECRET` = your Pusher secret
3. Redeploy your project on Vercel.

---

## 🎯 Calibrating Coordinates

To inspect or adjust any scene's coordinates:
1. Navigate to `/calibrate` (or click "Coordinate Calibrator" from the home page).
2. Select any level from the dropdown.
3. Click on Waldo to view and adjust $(x\%, y\%)$ and the hit radius.
4. Click "Copy JSON" and paste into `data/levels.json`.
