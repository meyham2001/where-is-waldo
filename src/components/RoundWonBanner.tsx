"use client";

import React from "react";
import { RoomState, Player } from "@/lib/game-types";
import { Trophy, ArrowRight, Award, BarChart2 } from "lucide-react";

interface RoundWonBannerProps {
  room: RoomState;
  currentPlayer: Player | null;
  onNextRound: () => void;
  onOpenLeaderboard: () => void;
  isLastRound: boolean;
}

export default function RoundWonBanner({
  room,
  currentPlayer,
  onNextRound,
  onOpenLeaderboard,
  isLastRound,
}: RoundWonBannerProps) {
  const result = room.roundResult;
  const isHost = currentPlayer?.isHost || false;
  const winnerPlayer = result ? room.players[result.winnerPlayerId] : null;

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 max-w-2xl w-[92%] sm:w-auto animate-in slide-in-from-bottom duration-300">
      <div className="bg-slate-900/95 backdrop-blur-xl border-2 border-rose-500/80 rounded-2xl px-4 py-3 sm:px-5 sm:py-3.5 shadow-[0_10px_50px_rgba(0,0,0,0.8)] flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-6 text-center sm:text-left">
        {/* Left: Winner Info & Landmark Notice */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center text-xl flex-shrink-0 shadow-inner animate-bounce-short">
            🎯
          </div>
          <div>
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <span className="text-[10px] uppercase font-black tracking-wider bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full border border-rose-500/40">
                Round {room.currentRoundIndex + 1} Won!
              </span>
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                Waldo pinpointed on map
              </span>
            </div>
            {result && (
              <p className="text-xs sm:text-sm text-slate-200 mt-0.5">
                <span className="font-bold text-white">
                  {winnerPlayer?.avatar} {result.winnerName}
                </span>{" "}
                spotted him in{" "}
                <span className="font-mono font-bold text-amber-400">
                  {result.timeSeconds}s
                </span>{" "}
                <span className="text-emerald-400 font-bold">(+1 pt)</span>
              </p>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-center">
          <button
            type="button"
            onClick={onOpenLeaderboard}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm flex-shrink-0"
            title="View full player standings"
          >
            <BarChart2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Standings</span>
          </button>

          {isHost ? (
            <button
              type="button"
              onClick={onNextRound}
              className="flex-1 sm:flex-initial bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-black py-2.5 px-4 rounded-xl shadow-lg shadow-rose-600/40 text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer transition-all flex-shrink-0"
            >
              {isLastRound ? (
                <>
                  <Award className="w-4 h-4" />
                  <span>See Final Results & Winner</span>
                </>
              ) : (
                <>
                  <span>Next Round ({room.currentRoundIndex + 2}/{room.totalRounds})</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          ) : (
            <div className="bg-slate-950/90 border border-slate-800 text-amber-300 text-[11px] sm:text-xs px-3 py-2 rounded-xl flex items-center gap-2 font-medium flex-shrink-0">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>Waiting for creator to start {isLastRound ? "final results" : "next round"}...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
