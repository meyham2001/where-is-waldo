"use client";

import React, { useEffect, useState } from "react";
import { Level } from "@/lib/game-types";
import { ArrowUp, ArrowDown, X, Plus, Map as MapIcon } from "lucide-react";

interface MapLineupProps {
  levels: Level[];
  selectedLevelIds: number[];
  editable: boolean;
  onChange: (levelIds: number[]) => void;
}

const previewSrc = (src: string) => src.replace(/\.webp$/, "-preview.webp");

export default function MapLineup({ levels, selectedLevelIds, editable, onChange }: MapLineupProps) {
  // Local copy so edits feel instant; re-synced whenever the server's lineup changes
  const [order, setOrder] = useState(selectedLevelIds);
  useEffect(() => setOrder(selectedLevelIds), [selectedLevelIds.join(",")]);

  const byId = new Map(levels.map((l) => [l.id, l]));
  const selected = order.map((id) => byId.get(id)).filter((l): l is Level => Boolean(l));
  const available = levels.filter((l) => !order.includes(l.id));

  const update = (next: number[]) => {
    setOrder(next);
    onChange(next);
  };

  const move = (index: number, delta: number) => {
    const next = [...order];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    update(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <MapIcon className="w-4 h-4 text-rose-400" />
          Map Lineup ({selected.length} {selected.length === 1 ? "round" : "rounds"})
        </h3>
        {!editable && <span className="text-[11px] text-slate-500">Chosen by the host</span>}
      </div>

      <ol className="space-y-1.5">
        {selected.map((level, i) => (
          <li
            key={level.id}
            className="flex items-center gap-3 p-1.5 pr-2 rounded-xl bg-slate-950/80 border border-slate-800/80"
          >
            <span className="w-5 text-center font-mono text-xs font-bold text-slate-500">{i + 1}</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewSrc(level.image)}
              alt=""
              loading="lazy"
              className="w-14 h-9 rounded-md object-cover flex-shrink-0 bg-slate-800"
            />
            <span className="text-sm font-medium text-white truncate flex-1">{level.title}</span>
            {editable && (
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  title="Move up"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === selected.length - 1}
                  title="Move down"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => update(order.filter((id) => id !== level.id))}
                  disabled={selected.length === 1}
                  title={selected.length === 1 ? "Keep at least one map" : "Remove from lineup"}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </li>
        ))}
      </ol>

      {editable && available.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Not playing</p>
          <div className="flex flex-wrap gap-1.5">
            {available.map((level) => (
              <button
                key={level.id}
                type="button"
                onClick={() => update([...order, level.id])}
                className="inline-flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded-lg bg-slate-950 border border-dashed border-slate-700 hover:border-rose-500 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                {level.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
