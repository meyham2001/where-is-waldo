"use client";

import React, { useState } from "react";
import { RoomState, Player, Level } from "@/lib/game-types";
import { Users, Copy, Check, Play, Crown, Sparkles, HelpCircle, Edit3, X, CheckCircle2, AlertCircle, Eye, UserPlus, RotateCcw, Square } from "lucide-react";
import Image from "next/image";
import InviteModal from "./InviteModal";
import MapLineup from "./MapLineup";

interface LobbyViewProps {
  room: RoomState;
  currentPlayer: Player | null;
  onJoin: (name: string, avatar: string, color: string) => void;
  joinError?: string;
  levels: Level[];
  onSetLevels: (levelIds: number[]) => void;
  onStartGame: () => void;
  onRestartGame?: () => void;
  shareUrl: string;
  onResetToLobby?: () => void;
  onEnterActiveGame?: () => void;
}

const AVATAR_CHOICES = ["🎩", "👓", "🐶", "🧙‍♂️", "🕵️", "👑", "🚀", "🍕", "🎸", "🎯"];
const COLOR_CHOICES = [
  "#E11D48", // Rose
  "#2563EB", // Blue
  "#059669", // Emerald
  "#D97706", // Amber
  "#7C3AED", // Violet
  "#DB2777", // Pink
  "#0891B2", // Cyan
  "#EA580C", // Orange
];

export default function LobbyView({
  room,
  currentPlayer,
  onJoin,
  joinError,
  levels,
  onSetLevels,
  onStartGame,
  onRestartGame,
  shareUrl,
  onResetToLobby,
  onEnterActiveGame,
}: LobbyViewProps) {
  const [name, setName] = useState(currentPlayer?.name || "");
  const [avatar, setAvatar] = useState(currentPlayer?.avatar || "🎩");
  const [color, setColor] = useState(currentPlayer?.color || COLOR_CHOICES[0]);
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showWaldoGuide, setShowWaldoGuide] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Build the live list and ensure currentPlayer is represented
  const serverPlayers = Object.values(room.players || {});
  const playersList = [...serverPlayers];
  if (currentPlayer && !playersList.some((p) => p.id === currentPlayer.id)) {
    playersList.unshift(currentPlayer);
  }

  const isHost = Boolean(currentPlayer && currentPlayer.id === room.hostId);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmitJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onJoin(name.trim(), avatar, color);
    setIsEditing(false);
  };

  const roomDisplayName = `${(room.roomId || "").toUpperCase()} Room`;

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-6 px-4 relative">
      {/* Game Banner */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold tracking-wide uppercase">
          <Sparkles className="w-3.5 h-3.5" />
          {roomDisplayName} • MULTIPLAYER WALDO CHALLENGE
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white flex items-center justify-center gap-3">
          <span>Where&apos;s Waldo?</span>
          <span className="text-rose-500">{roomDisplayName}</span>
        </h1>
        <p className="text-slate-400 max-w-lg mx-auto text-sm md:text-base">
          Battle with up to 10 teammates! The first player to click Waldo in each round earns the point.
        </p>

        {/* Quick Actions: Invite Team & Waldo Guide */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          <button
            type="button"
            onClick={() => setShowInviteModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white text-xs md:text-sm font-bold shadow-lg shadow-rose-600/30 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invite Team to Room</span>
            <span className="bg-rose-800/60 px-2 py-0.5 rounded-md font-mono text-[11px] border border-rose-400/30">
              {room.roomId?.toUpperCase()}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setShowWaldoGuide(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white text-xs md:text-sm font-medium transition-all shadow-md cursor-pointer"
          >
            <Eye className="w-4 h-4 text-rose-400" />
            <span>What Does Waldo Look Like?</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Column: Player Join / Profile */}
        <div className="md:col-span-5 space-y-6">
          {!currentPlayer || isEditing ? (
            <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>{isEditing ? "Edit Profile" : "Join Game"}</span>
                </h2>
                {isEditing && (
                  <button
                    onClick={() => setIsEditing(false)}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                )}
              </div>

              <form onSubmit={handleSubmitJoin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Your Nickname
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={15}
                    placeholder="e.g. Marc"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Choose Avatar
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {AVATAR_CHOICES.map((av) => (
                      <button
                        key={av}
                        type="button"
                        onClick={() => setAvatar(av)}
                        className={`text-2xl p-2 rounded-xl transition-all border ${
                          avatar === av
                            ? "bg-rose-500/20 border-rose-500 scale-105"
                            : "bg-slate-950 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        {av}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Player Color
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {COLOR_CHOICES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={`h-8 rounded-lg transition-transform ${
                          color === c ? "scale-110 ring-2 ring-white ring-offset-2 ring-offset-slate-900" : "opacity-80 hover:opacity-100"
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                {joinError && (
                  <p className="text-xs text-rose-400 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {joinError}
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full mt-2 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold py-3 rounded-xl shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <Users className="w-4 h-4" />
                  <span>{isEditing ? "Save Changes" : "Join the Room"}</span>
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-inner border border-white/20"
                    style={{ backgroundColor: currentPlayer.color }}
                  >
                    {currentPlayer.avatar}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-base">{currentPlayer.name}</span>
                      {isHost && (
                        <span className="bg-amber-500/20 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                          <Crown className="w-3 h-3" /> HOST
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">Ready in lobby</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                  title="Edit Profile"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Share link card */}
              <div className="pt-3 border-t border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-rose-400" />
                    <span>Invite Teammates</span>
                  </label>
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
                  >
                    More Options & Teams Text →
                  </button>
                </div>
                <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800 focus-within:border-rose-500 transition-colors">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="bg-transparent text-xs text-slate-300 w-full outline-none font-mono select-all"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs flex items-center gap-1 transition-colors flex-shrink-0 cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? "Copied!" : "Copy"}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Instructions Box */}
          <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl space-y-2 text-xs text-slate-400">
            <div className="flex items-center gap-2 text-slate-200 font-semibold">
              <HelpCircle className="w-4 h-4 text-rose-400" />
              <span>How it works</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
              <li>When the host starts, a high-resolution scene appears for everyone.</li>
              <li>Zoom and pan smoothly using mouse wheel or pinch-drag.</li>
              <li>First player to click on Waldo wins the round point!</li>
              <li>Leaderboard updates after every round across every scene.</li>
            </ul>
          </div>
        </div>

        {/* Right Column: Connected Teammates & Host Controls */}
        <div className="md:col-span-7 space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-rose-400" />
                <h2 className="text-lg font-bold text-white">
                  Colleagues in Lobby ({playersList.length}/10)
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-semibold transition-colors cursor-pointer"
                  title="Invite teammates to room"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Invite Team</span>
                </button>
                <span className="text-xs bg-emerald-500/20 text-emerald-400 font-medium px-2.5 py-1 rounded-full border border-emerald-500/30 animate-pulse">
                  Live
                </span>
              </div>
            </div>

            {/* Players Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-h-[140px]">
              {playersList.length === 0 ? (
                <div className="col-span-2 flex flex-col items-center justify-center py-8 text-slate-500 text-sm border border-dashed border-slate-800 rounded-xl space-y-2">
                  <span>No players joined yet. Enter your name to join!</span>
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="text-xs text-rose-400 hover:text-rose-300 font-semibold underline cursor-pointer"
                  >
                    Click here to invite your team
                  </button>
                </div>
              ) : (
                playersList.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800/80"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-lg shadow-sm border border-white/20"
                        style={{ backgroundColor: p.color }}
                      >
                        {p.avatar}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-white truncate max-w-[120px]">
                            {p.name}
                          </span>
                          {p.id === room.hostId && (
                            <Crown className="w-3.5 h-3.5 text-amber-400" />
                          )}
                        </div>
                        <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                          Ready
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Map lineup: the host picks maps and their order before the game starts */}
            <div className="pt-4 border-t border-slate-800">
              <MapLineup
                levels={levels}
                selectedLevelIds={room.selectedLevelIds}
                editable={isHost && room.status === "lobby"}
                onChange={onSetLevels}
              />
            </div>

            {/* Host / Player Action Area */}
            <div className="pt-4 border-t border-slate-800">
              {currentPlayer && isHost ? (
                <div className="space-y-3">
                  {room.status === "playing" ? (
                    <div className="space-y-3">
                      <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between text-xs">
                        <span className="text-amber-300 font-bold">
                          ⚡ Round {room.currentRoundIndex + 1} currently in progress
                        </span>
                        <span className="text-slate-400">Waiting in Lobby</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {onResetToLobby && (
                          <button
                            type="button"
                            onClick={onResetToLobby}
                            className="bg-rose-950/80 hover:bg-rose-900/80 text-rose-300 border border-rose-700/60 font-bold py-3 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 text-xs cursor-pointer"
                          >
                            <Square className="w-3 h-3 fill-rose-400 text-rose-400" />
                            <span>Stop Game (Lobby)</span>
                          </button>
                        )}
                        {onRestartGame && (
                          <button
                            type="button"
                            onClick={onRestartGame}
                            className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-black py-3 px-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5 text-xs cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Restart (Round 1)</span>
                          </button>
                        )}
                        {onEnterActiveGame && (
                          <button
                            type="button"
                            onClick={onEnterActiveGame}
                            className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-3 rounded-xl border border-slate-700 shadow-md transition-all flex items-center justify-center gap-1.5 text-xs cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5 fill-white" />
                            <span>Resume Round</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        type="button"
                        onClick={() => setShowInviteModal(true)}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold py-3.5 px-4 rounded-xl border border-slate-700 shadow-md transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
                      >
                        <UserPlus className="w-4 h-4 text-rose-400" />
                        <span>Invite Team (Share Link)</span>
                      </button>
                      <button
                        type="button"
                        onClick={onStartGame}
                        disabled={playersList.length === 0}
                        className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <Play className="w-4 h-4 fill-white" />
                        <span>Start Game ({room.selectedLevelIds.length} {room.selectedLevelIds.length === 1 ? "Round" : "Rounds"})</span>
                      </button>
                    </div>
                  )}
                  <p className="text-center text-[11px] text-slate-500">
                    As host, wait until all teammates join the lobby, then click Start Game to launch all players simultaneously!
                  </p>
                </div>
              ) : currentPlayer ? (
                <div className="space-y-3">
                  {room.status === "playing" ? (
                    <div className="space-y-3">
                      <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center space-y-1">
                        <span className="text-amber-300 font-bold text-sm block">
                          ⚡ Round {room.currentRoundIndex + 1} is currently in progress!
                        </span>
                        <p className="text-slate-400 text-xs">
                          The host can reset the game so everyone starts Round 1 together, or you can jump into the active round now.
                        </p>
                      </div>
                      {onEnterActiveGame && (
                        <button
                          type="button"
                          onClick={onEnterActiveGame}
                          className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
                        >
                          <Play className="w-4 h-4 fill-white" />
                          <span>Jump Into Active Round</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl text-center text-sm text-slate-400">
                      Waiting for host to start the game...
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(true)}
                    className="w-full bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white font-semibold py-2.5 px-4 rounded-xl border border-slate-700/80 transition-all flex items-center justify-center gap-2 text-xs cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-rose-400" />
                    <span>Invite More Colleagues to {roomDisplayName}</span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Waldo Guide Modal */}
      {showWaldoGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-lg w-full shadow-2xl relative space-y-4">
            <button
              onClick={() => setShowWaldoGuide(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-800 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Eye className="w-5 h-5 text-rose-500" />
              <h3 className="text-lg font-black text-white">Target Profile: Who is Waldo?</h3>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/30 ml-auto mr-8">
                WANTED
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="relative w-40 h-60 flex-shrink-0 rounded-2xl overflow-hidden border-2 border-rose-500/40 shadow-xl bg-slate-950">
                <Image
                  src="/waldo-reference.png"
                  alt="Where's Waldo Official Guide"
                  fill
                  className="object-cover"
                />
              </div>

              <div className="space-y-2.5 text-xs text-slate-300">
                <p className="text-slate-400">Spot all 4 trademarks before clicking:</p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span><strong className="text-white">Bobble Hat:</strong> Red & white knit hat with a pompom on top.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span><strong className="text-white">Glasses:</strong> Round black-rimmed spectacles.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span><strong className="text-white">Striped Sweater:</strong> Horizontal red and white stripes.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span><strong className="text-white">Walking Cane:</strong> Curved wooden walking cane.</span>
                  </li>
                </ul>

                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2 text-[11px] text-rose-300">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
                  <span>Only the real Waldo scores! Beware of decoys without glasses or with different hats.</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowWaldoGuide(false)}
              className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 rounded-xl transition-colors text-sm cursor-pointer"
            >
              Got it, let&apos;s play!
            </button>
          </div>
        </div>
      )}

      {/* Dedicated Invite Modal */}
      <InviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        roomId={room.roomId}
        shareUrl={shareUrl}
        isHost={isHost}
        roomStatus={room.status}
        onResetToLobby={onResetToLobby}
      />
    </div>
  );
}
