"use client";

import React, { useEffect } from "react";
import { RoomState, Player } from "@/lib/game-types";
import { Trophy, ArrowRight, Award, Crown, X, Eye, MapPin } from "lucide-react";

interface ScoreboardModalProps {
  room: RoomState;
  currentPlayer: Player | null;
  onNextRound: () => void;
  onFinishGameEarly?: () => void;
  onClose?: () => void;
  isLastRound: boolean;
}

export default function ScoreboardModal({
  room,
  currentPlayer,
  onNextRound,
  onFinishGameEarly,
  onClose,
  isLastRound,
}: ScoreboardModalProps) {
  const result = room.roundResult;
  const playersList = Object.values(room.players || {}).sort((a, b) => b.score - a.score);
  const isHost = currentPlayer?.isHost || false;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onClose) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl max-w-lg w-full p-6 md:p-8 space-y-6 text-center relative transform scale-100 transition-all border-t-4 border-t-rose-500 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-full transition-colors cursor-pointer"
            title="Return to Map"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Round Winner Headline */}
        <div className="space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 mx-auto flex items-center justify-center text-3xl shadow-inner animate-bounce-short">
            🎯
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-white">
            Waldo Was Found!
          </h2>
          {result && (
            <p className="text-slate-300 text-sm md:text-base font-medium">
              <span className="font-bold text-rose-400">{result.winnerName}</span> spotted him in{" "}
              <span className="font-mono font-bold text-amber-400">{result.timeSeconds}s</span> (+1 pt)
            </p>
          )}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            <MapPin className="w-3.5 h-3.5" />
            <span>Waldo&apos;s location is revealed live on the map!</span>
          </div>
        </div>

        {/* Live Standings List */}
        <div className="space-y-2 text-left bg-slate-950/60 p-4 rounded-2xl border border-slate-800 max-h-56 overflow-y-auto">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex justify-between px-2">
            <span>DXD Teammate</span>
            <span>Total Points</span>
          </div>

          {playersList.map((player, idx) => (
            <div
              key={player.id}
              className={`flex items-center justify-between p-2.5 rounded-xl transition-all ${
                player.id === result?.winnerPlayerId
                  ? "bg-rose-500/15 border border-rose-500/40 font-semibold"
                  : "bg-slate-900/40 border border-transparent"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-bold text-slate-500 w-4">
                  #{idx + 1}
                </span>
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shadow-sm"
                  style={{ backgroundColor: player.color }}
                >
                  {player.avatar}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-white">{player.name}</span>
                  {player.isHost && <Crown className="w-3 h-3 text-amber-400" />}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-mono font-bold text-base text-amber-300">
                  {player.score}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Next Round & Explore Map Actions */}
        <div className="pt-2 space-y-2.5">
          {isHost ? (
            <>
              <button
                type="button"
                onClick={onNextRound}
                className="w-full bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-black py-3.5 rounded-xl shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center gap-2 text-base cursor-pointer"
              >
                {isLastRound ? (
                  <>
                    <Award className="w-5 h-5" />
                    <span>See Final Results & Winner</span>
                  </>
                ) : (
                  <>
                    <span>Start Next Round ({room.currentRoundIndex + 2}/{room.totalRounds})</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

              {!isLastRound && onFinishGameEarly && (
                <button
                  type="button"
                  onClick={onFinishGameEarly}
                  className="w-full bg-slate-800/80 hover:bg-slate-700/90 text-amber-400 hover:text-amber-300 font-semibold py-2.5 rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-2 text-xs cursor-pointer shadow-sm"
                >
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <span>Finish Tournament Now & Crown Winner</span>
                </button>
              )}
            </>
          ) : (
            <div className="bg-slate-950 border border-slate-800 py-3 px-4 rounded-xl text-xs text-slate-400 flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>Waiting for creator to start {isLastRound ? "final results" : "next round"}...</span>
            </div>
          )}

          {/* Return to Map Button */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700/80"
            >
              <Eye className="w-3.5 h-3.5 text-rose-400" />
              <span>Explore Map (See Waldo in Scene)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
