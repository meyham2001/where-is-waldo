"use client";

import React, { useEffect } from "react";
import confetti from "canvas-confetti";
import { RoomState, Player } from "@/lib/game-types";
import { Trophy, Crown, RotateCcw, Medal } from "lucide-react";

interface PodiumViewProps {
  room: RoomState;
  currentPlayer: Player | null;
  onPlayAgain: () => void;
}

export default function PodiumView({
  room,
  currentPlayer,
  onPlayAgain,
}: PodiumViewProps) {
  const players = Object.values(room.players || {}).sort((a, b) => b.score - a.score);
  const first = players[0];
  const second = players[1];
  const third = players[2];
  const isHost = currentPlayer?.isHost || false;

  useEffect(() => {
    // Launch celebratory confetti bursts
    const end = Date.now() + 3000;
    const colors = ["#E11D48", "#F59E0B", "#2563EB", "#10B981"];

    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors,
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-10 py-10 px-4 text-center">
      {/* Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
          <Trophy className="w-4 h-4" />
          TOURNAMENT COMPLETE
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-white">
          We Have A Champion!
        </h1>
        {first && (
          <p className="text-slate-400 text-base">
            Congratulations to <span className="font-bold text-amber-400">{first.name}</span> for taking 1st place with{" "}
            <span className="font-bold text-white">{first.score} pts</span> after {room.currentRoundIndex + 1} round{room.currentRoundIndex > 0 ? "s" : ""}!
          </p>
        )}
      </div>

      {/* 3D-Style Podium (2nd, 1st, 3rd) */}
      <div className="flex items-end justify-center gap-3 md:gap-6 pt-10 pb-4 max-w-xl mx-auto min-h-[280px]">
        {/* 2nd Place */}
        {second && (
          <div className="flex-1 flex flex-col items-center">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-md border border-white/20 mb-2" style={{ backgroundColor: second.color }}>
              {second.avatar}
            </div>
            <span className="text-xs font-bold text-white truncate max-w-[90px]">{second.name}</span>
            <span className="text-xs font-mono text-slate-400 mb-2">{second.score} pts</span>
            <div className="w-full bg-gradient-to-t from-slate-800 to-slate-700 h-28 rounded-t-2xl border-t-2 border-slate-400 flex flex-col items-center justify-center shadow-lg">
              <Medal className="w-6 h-6 text-slate-300" />
              <span className="text-xl font-black text-slate-300">2nd</span>
            </div>
          </div>
        )}

        {/* 1st Place */}
        {first && (
          <div className="flex-1 flex flex-col items-center">
            <Crown className="w-8 h-8 text-amber-400 animate-bounce mb-1" />
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-xl border-2 border-amber-400 mb-2 ring-4 ring-amber-400/20" style={{ backgroundColor: first.color }}>
              {first.avatar}
            </div>
            <span className="text-sm font-bold text-white truncate max-w-[110px]">{first.name}</span>
            <span className="text-xs font-mono font-bold text-amber-400 mb-2">{first.score} pts</span>
            <div className="w-full bg-gradient-to-t from-amber-700/80 to-amber-500 h-40 rounded-t-2xl border-t-2 border-amber-300 flex flex-col items-center justify-center shadow-2xl">
              <Trophy className="w-8 h-8 text-white" />
              <span className="text-2xl font-black text-white">1st</span>
            </div>
          </div>
        )}

        {/* 3rd Place */}
        {third && (
          <div className="flex-1 flex flex-col items-center">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-md border border-white/20 mb-2" style={{ backgroundColor: third.color }}>
              {third.avatar}
            </div>
            <span className="text-xs font-bold text-white truncate max-w-[90px]">{third.name}</span>
            <span className="text-xs font-mono text-slate-400 mb-2">{third.score} pts</span>
            <div className="w-full bg-gradient-to-t from-amber-900/60 to-amber-800/80 h-20 rounded-t-2xl border-t-2 border-amber-700 flex flex-col items-center justify-center shadow-lg">
              <Medal className="w-5 h-5 text-amber-600" />
              <span className="text-lg font-black text-amber-500">3rd</span>
            </div>
          </div>
        )}
      </div>

      {/* Full Leaderboard Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl max-w-xl mx-auto p-5 text-left shadow-xl">
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">
          DXD Leaderboard Standings
        </h3>
        <div className="divide-y divide-slate-800/80">
          {players.map((p, idx) => (
            <div key={p.id} className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-bold text-slate-500 w-5">
                  #{idx + 1}
                </span>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm" style={{ backgroundColor: p.color }}>
                  {p.avatar}
                </div>
                <span className="text-sm font-medium text-white">{p.name}</span>
              </div>
              <span className="font-mono font-bold text-sm text-amber-400">{p.score} pts</span>
            </div>
          ))}
        </div>
      </div>

      {/* Play Again Trigger */}
      <div className="pt-4 max-w-md mx-auto">
        {isHost ? (
          <button
            onClick={onPlayAgain}
            className="w-full bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center gap-2 text-base"
          >
            <RotateCcw className="w-5 h-5" />
            <span>Play Again (Return to Lobby)</span>
          </button>
        ) : (
          <p className="text-sm text-slate-400">
            Waiting for the host to restart the game...
          </p>
        )}
      </div>
    </div>
  );
}
