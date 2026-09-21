"use client";

import React from "react";

export interface ClickMarker {
  id: string;
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
  hit: boolean;
  playerName?: string;
  timestamp: number;
}

export function ClickMarkersOverlay({
  markers,
  targetReveal,
}: {
  markers: ClickMarker[];
  targetReveal: { x: number; y: number; radius: number; winnerName?: string } | null;
}) {
  return (
    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
      {/* Incorrect / User click markers */}
      {markers.map((marker) => (
        <div
          key={marker.id}
          className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none"
          style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
        >
          {marker.hit ? (
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-4 border-emerald-400 bg-emerald-500/30 animate-ping-slow" />
              <div className="absolute inset-0 m-auto w-6 h-6 rounded-full bg-emerald-400 flex items-center justify-center text-white text-xs font-bold">
                ✓
              </div>
            </div>
          ) : (
            <div className="relative flex flex-col items-center animate-not-waldo">
              <div className="w-8 h-8 rounded-full border-2 border-rose-500/80 bg-rose-500/20 animate-click-pop" />
              <span className="text-[10px] tracking-wide font-semibold text-rose-200 bg-rose-950/90 border border-rose-500/40 px-2 py-0.5 rounded-full shadow-lg mt-1 whitespace-nowrap">
                Not Waldo
              </span>
            </div>
          )}
        </div>
      ))}

      {/* Target Reveal: Clean hollow circle centered on Waldo with finder badge */}
      {targetReveal && (
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30"
          style={{
            left: `${targetReveal.x}%`,
            top: `${targetReveal.y}%`,
          }}
        >
          {/* Clean hollow circle around Waldo (completely transparent inside so he is 100% visible) */}
          <div
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-[3px] sm:border-4 border-rose-500 bg-transparent shadow-[0_0_15px_rgba(244,63,94,0.85)] animate-pulse"
          />

          {/* Subtle outer dashed accent ring */}
          <div
            className="absolute inset-0 -m-1 rounded-full border border-dashed border-amber-400 bg-transparent pointer-events-none opacity-75"
          />

          {/* Who found him badge: neatly positioned underneath the circle, outside the image area of Waldo */}
          {targetReveal.winnerName && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 whitespace-nowrap pointer-events-none">
              <span className="inline-flex items-center gap-1 bg-rose-600/95 text-white text-[11px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full shadow-xl border border-white/70 tracking-wide">
                <span>Found by {targetReveal.winnerName}</span>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
