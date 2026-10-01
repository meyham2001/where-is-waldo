"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sliders, Sparkles, ArrowRight, Eye, CheckCircle2, AlertCircle, Crown } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { saveHostToken } from "@/lib/host-session";

export default function HomePage() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Old-style invite links (/?room=CODE) prefill the join form
    const roomParam = new URLSearchParams(window.location.search).get("room");
    if (roomParam) setJoinCode(roomParam.toUpperCase());
  }, []);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) return;
    setLoading(true);
    setError("");

    const player = {
      id: `p_${Math.random().toString(36).substring(2, 9)}`,
      name: playerName.trim(),
      avatar: "🎩",
      color: "#E11D48",
    };

    try {
      const res = await fetch("/api/room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create a room");

      const roomId = data.room.roomId;
      saveHostToken(roomId, data.hostToken);
      localStorage.setItem(`waldo_player_${roomId}`, JSON.stringify(data.player));
      router.push(`/room/${roomId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create a room");
      setLoading(false);
    }
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const code = joinCode.trim().toLowerCase();
    if (code) router.push(`/room/${code}`);
  };

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col justify-between py-10 px-4 sm:px-6 relative overflow-hidden">
      {/* Decorative gradient blur background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-96 bg-gradient-to-b from-rose-500/15 via-blue-500/5 to-transparent blur-3xl pointer-events-none -z-10" />

      <div className="max-w-5xl mx-auto w-full space-y-10 my-auto">
        {/* Header Badge */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            DXD Multiplayer Party Game
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white">
            Where&apos;s <span className="text-rose-500 underline decoration-rose-500/30 decoration-wavy">Waldo?</span>
          </h1>

          <p className="text-slate-400 text-sm sm:text-base md:text-lg max-w-xl mx-auto">
            Battle live with up to 10 DXD teammates! Scan 8 hand-drawn high-res maps, zoom in, and race to be the first to click Waldo.
          </p>
        </div>

        {/* Two-column layout: Join Form + Target Guide */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Room Form Card */}
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-slate-900/90 border border-slate-800 p-6 sm:p-8 rounded-3xl shadow-2xl space-y-5 text-left backdrop-blur-xl">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                  <Crown className="w-5 h-5 text-amber-400" />
                  <span>Host a New Game</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  You&apos;ll be the game admin: pick the maps, share the invite link, and start the rounds.
                </p>
              </div>

              <form onSubmit={handleCreateRoom} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Your Nickname
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={20}
                    placeholder="e.g. Marc"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all"
                  />
                </div>

                {error && (
                  <p className="text-xs text-rose-400 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || !playerName.trim()}
                  className="w-full bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center gap-2 text-base group disabled:opacity-50 cursor-pointer"
                >
                  <span>{loading ? "Creating room..." : "Create Room"}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </form>

              <form onSubmit={handleJoinRoom} className="border-t border-slate-800 pt-4 space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Got an invite code?
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. K7QM2X"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
                    className="flex-1 min-w-0 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all uppercase"
                  />
                  <button
                    type="submit"
                    disabled={!joinCode.trim()}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    Join
                  </button>
                </div>
              </form>
            </div>

            {/* Feature Badges */}
            <div className="grid grid-cols-3 gap-3 text-xs text-slate-400">
              <div className="p-3 bg-slate-900/50 border border-slate-800/80 rounded-xl text-center">
                <span className="font-bold text-white block mb-0.5">8 Verified Maps</span>
                Calibrated hitboxes
              </div>
              <div className="p-3 bg-slate-900/50 border border-slate-800/80 rounded-xl text-center">
                <span className="font-bold text-white block mb-0.5">Up to 10 Players</span>
                Instant live scoring
              </div>
              <div className="p-3 bg-slate-900/50 border border-slate-800/80 rounded-xl text-center">
                <span className="font-bold text-white block mb-0.5">Zero Lag</span>
                Serverless on Vercel
              </div>
            </div>
          </div>

          {/* Right Column: "Who is Waldo?" Target Profile Card */}
          <div className="lg:col-span-6 bg-slate-900/90 border border-slate-800 p-6 rounded-3xl shadow-2xl space-y-5 text-left backdrop-blur-xl relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-rose-500" />
                <h3 className="text-lg font-black tracking-tight text-white">
                  Target Profile: What Does Waldo Look Like?
                </h3>
              </div>
              <span className="text-[11px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                WANTED
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-5 items-center">
              {/* Image Frame */}
              <div className="relative w-44 h-64 sm:w-48 sm:h-72 flex-shrink-0 rounded-2xl overflow-hidden border-2 border-rose-500/40 shadow-2xl shadow-rose-950/50 bg-slate-950">
                <Image
                  src="/waldo-reference.png"
                  alt="Where's Waldo Official Character Guide"
                  fill
                  className="object-cover"
                  priority
                />
              </div>

              {/* Checklist Characteristics */}
              <div className="space-y-3 text-xs text-slate-300 flex-1">
                <p className="text-slate-400 text-xs">
                  New to the game? Make sure you spot all 4 identifying trademarks before clicking:
                </p>

                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span><strong className="text-white">Bobble Hat:</strong> Red and white knit hat with a fluffy pompom on top.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span><strong className="text-white">Glasses:</strong> Round, dark-rimmed spectacles and a friendly smile.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span><strong className="text-white">Striped Sweater:</strong> Horizontal red-and-white long-sleeve stripes.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span><strong className="text-white">Gear:</strong> Brown curved walking cane, blue jeans, and travel pack.</span>
                  </li>
                </ul>

                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2 text-[11px] text-rose-300">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
                  <span><strong>Watch out for decoys!</strong> Some scenes feature characters with striped shirts but no glasses, or different hat colors. Only real Waldo counts!</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Admin Calibrator Link */}
        <div className="text-center pt-2">
          <Link
            href="/calibrate"
            className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-rose-400 transition-colors bg-slate-900/60 border border-slate-800/80 px-3.5 py-1.5 rounded-full"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Interactive Hitbox Calibrator & Visual Inspector</span>
          </Link>
        </div>
      </div>

      <footer className="text-center text-xs text-slate-600 mt-8">
        Built for DXD team fun & game nights • Zero-maintenance serverless on Vercel
      </footer>
    </main>
  );
}
