"use client";

import React, { useState } from "react";
import { X, Copy, Check, Share2, Users, CheckCircle2, MessageSquare, RotateCcw, AlertTriangle } from "lucide-react";

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  shareUrl: string;
  isHost?: boolean;
  roomStatus?: string;
  onResetToLobby?: () => void;
}

export default function InviteModal({
  isOpen,
  onClose,
  roomId,
  shareUrl,
  isHost = false,
  roomStatus = "lobby",
  onResetToLobby,
}: InviteModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [resetting, setResetting] = useState(false);

  if (!isOpen) return null;

  const displayRoom = (roomId || "DXD").toUpperCase();
  const roomName = displayRoom === "DXD" ? "DXD Room" : `${displayRoom} Room`;

  // Pre-formatted message ready to paste directly into Microsoft Teams or Slack
  const teamsMessage = `🎯 Join our Where's Waldo match in the ${roomName}!\n\nClick the link to jump directly into our lobby:\n${shareUrl}\n\nRace to see who spots Waldo first! 🏆`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(teamsMessage);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2500);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(displayRoom);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `Where's Waldo - ${roomName}`,
          text: `Join our live Where's Waldo match in ${roomName}!`,
          url: shareUrl,
        });
      } catch (err) {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  const hasNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/90 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl relative space-y-5 text-left border-t-4 border-t-rose-500">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-full transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1 pr-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold uppercase tracking-wide">
            <Users className="w-3.5 h-3.5" />
            <span>Invite Your Team</span>
          </div>
          <h3 className="text-2xl font-black text-white flex items-center gap-2 pt-1">
            <span>Share {roomName}</span>
          </h3>
          <p className="text-xs sm:text-sm text-slate-400">
            Send this link to your colleagues on Microsoft Teams or Slack. The room code is pre-embedded so they can join with one click!
          </p>
        </div>

        {/* Active Game Notice for Host */}
        {isHost && roomStatus !== "lobby" && onResetToLobby && (
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-300 text-xs font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Active Game in Progress</span>
              </div>
              <span className="text-[10px] uppercase font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                Playing
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              You are currently in an active game. Return the room to the lobby so your team can join and everyone starts Round 1 together!
            </p>
            <button
              type="button"
              disabled={resetting}
              onClick={async () => {
                setResetting(true);
                await onResetToLobby();
                setResetting(false);
              }}
              className="w-full py-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{resetting ? "Returning to Lobby..." : "Return Room to Lobby (Gather Team)"}</span>
            </button>
          </div>
        )}

        {/* Room Code Badge */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Predefined Room Code
            </span>
            <span className="text-xl font-mono font-black text-rose-400 tracking-wider">
              {displayRoom}
            </span>
          </div>
          <button
            onClick={handleCopyCode}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border border-slate-700"
          >
            {copiedCode ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Code</span>
              </>
            )}
          </button>
        </div>

        {/* Direct Link Section */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
            Direct Join Link
          </label>
          <div className="flex items-center gap-2 bg-slate-950 p-2.5 rounded-2xl border border-slate-800 focus-within:border-rose-500 transition-colors">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="bg-transparent text-xs sm:text-sm text-slate-200 w-full outline-none font-mono px-1 select-all"
            />
            <button
              onClick={handleCopyLink}
              className="px-3.5 py-2 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-rose-600/30 flex-shrink-0 cursor-pointer"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>Copied Link!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Link</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Pre-formatted Teams / Slack message */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
              <span>Ready for Teams / Slack</span>
            </label>
            <span className="text-[11px] text-slate-500">Includes direct link</span>
          </div>

          <div className="p-3 bg-slate-950/90 rounded-2xl border border-slate-800 text-xs text-slate-300 font-mono whitespace-pre-wrap relative group">
            {teamsMessage}
          </div>

          <button
            onClick={handleCopyMessage}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors border border-slate-700 cursor-pointer shadow-sm"
          >
            {copiedMessage ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 font-bold">Copied Teams & Slack Message!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-indigo-400" />
                <span>Copy Message for Teams / Slack</span>
              </>
            )}
          </button>
        </div>

        {/* Native Share button (if supported) */}
        {hasNativeShare && (
          <button
            onClick={handleNativeShare}
            className="w-full py-3 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>Share via Apps (Teams, Slack, Mail)...</span>
          </button>
        )}

        {/* Helper Footer */}
        <div className="text-center pt-1 border-t border-slate-800">
          <p className="text-[11px] text-slate-500">
            Anyone who clicks this link automatically enters <strong className="text-slate-300">{roomName}</strong>. No setup needed!
          </p>
        </div>
      </div>
    </div>
  );
}
