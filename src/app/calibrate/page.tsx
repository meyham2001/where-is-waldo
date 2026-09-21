"use client";

import React, { useState, useRef } from "react";
import rawLevels from "../../../data/levels.json";
import { Level } from "@/lib/game-types";
import { Copy, Check, Crosshair, ArrowLeft, Sliders, PlayCircle } from "lucide-react";
import Link from "next/link";

export default function CalibratePage() {
  const levels = rawLevels as Level[];
  const [selectedLevelId, setSelectedLevelId] = useState<number>(levels[0].id);
  const currentLevel = levels.find((l) => l.id === selectedLevelId) || levels[0];

  const [targetX, setTargetX] = useState<number>(currentLevel.target.x);
  const [targetY, setTargetY] = useState<number>(currentLevel.target.y);
  const [radius, setRadius] = useState<number>(currentLevel.target.radius || 2.6);
  const [copied, setCopied] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const imageRef = useRef<HTMLImageElement>(null);

  // When changing level
  const handleSelectLevel = (id: number) => {
    const lvl = levels.find((l) => l.id === id);
    if (lvl) {
      setSelectedLevelId(lvl.id);
      setTargetX(lvl.target.x);
      setTargetY(lvl.target.y);
      setRadius(lvl.target.radius || 2.6);
      setTestResult(null);
    }
  };

  // Image click to set coordinates
  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const xPercent = parseFloat(((clickX / rect.width) * 100).toFixed(2));
    const yPercent = parseFloat(((clickY / rect.height) * 100).toFixed(2));

    setTargetX(xPercent);
    setTargetY(yPercent);

    // Test hit distance
    const dx = xPercent - targetX;
    const dy = yPercent - targetY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= radius) {
      setTestResult(`Hit! Distance: ${dist.toFixed(2)}% <= Radius: ${radius}%`);
    } else {
      setTestResult(`New Target Set: (x: ${xPercent}%, y: ${yPercent}%)`);
    }
  };

  const jsonSnippet = JSON.stringify(
    {
      id: currentLevel.id,
      title: currentLevel.title,
      subtitle: currentLevel.subtitle,
      image: currentLevel.image,
      hint: currentLevel.hint,
      target: {
        x: targetX,
        y: targetY,
        radius: radius,
      },
    },
    null,
    2
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 bg-slate-900 hover:bg-slate-800 rounded-xl border border-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
              <Crosshair className="w-5 h-5 text-rose-500" />
              <span>Waldo Coordinate Calibrator</span>
            </h1>
            <p className="text-xs text-slate-400">
              Click directly on Waldo in any photo to set and test his normalized target coordinates.
            </p>
          </div>
        </div>

        {/* Level Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-400">Scene:</label>
          <select
            value={selectedLevelId}
            onChange={(e) => handleSelectLevel(Number(e.target.value))}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-medium focus:outline-none focus:border-rose-500"
          >
            {levels.map((lvl) => (
              <option key={lvl.id} value={lvl.id}>
                #{lvl.id} - {lvl.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Image Canvas */}
        <div className="lg:col-span-8 bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-auto max-h-[78vh]">
          <div className="relative inline-block select-none cursor-crosshair">
            <img
              ref={imageRef}
              src={currentLevel.image}
              alt={currentLevel.title}
              onClick={handleImageClick}
              className="max-w-full h-auto max-h-[72vh] rounded-lg shadow-2xl pointer-events-auto"
            />

            {/* Visual Target Ring */}
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{ left: `${targetX}%`, top: `${targetY}%` }}
            >
              {/* Hitbox boundary circle */}
              <div
                className="rounded-full border-2 border-dashed border-emerald-400 bg-emerald-500/25"
                style={{
                  width: `${radius * 2 * 10}px`,
                  height: `${radius * 2 * 10}px`,
                  transform: "translate(-50%, -50%)",
                }}
              />
              {/* Center dot */}
              <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-rose-600 border-2 border-white shadow-lg flex items-center justify-center text-[10px] text-white font-bold">
                ✕
              </div>
            </div>
          </div>

          <div className="w-full flex items-center justify-between text-xs text-slate-400 mt-2 px-2">
            <span>Hint: {currentLevel.hint}</span>
            {testResult && (
              <span className="font-mono text-emerald-400 font-bold">{testResult}</span>
            )}
          </div>
        </div>

        {/* Right: Controls & JSON Output */}
        <div className="lg:col-span-4 space-y-5">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-rose-500" />
              <span>Target Parameters</span>
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Target X (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={targetX}
                  onChange={(e) => setTargetX(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Target Y (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={targetY}
                  onChange={(e) => setTargetY(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono text-slate-400 mb-1">
                <span>Hit Radius</span>
                <span className="text-rose-400 font-bold">{radius}%</span>
              </div>
              <input
                type="range"
                min="1"
                max="6"
                step="0.1"
                value={radius}
                onChange={(e) => setRadius(parseFloat(e.target.value))}
                className="w-full accent-rose-500 cursor-pointer"
              />
            </div>
          </div>

          {/* JSON Export Box */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                JSON Config
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-white px-2.5 py-1 rounded-lg transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied!" : "Copy JSON"}</span>
              </button>
            </div>

            <pre className="bg-slate-950 p-3 rounded-xl text-[11px] font-mono text-slate-300 overflow-x-auto max-h-56 border border-slate-800">
              {jsonSnippet}
            </pre>
          </div>
        </div>
      </div>
    </main>
  );
}
