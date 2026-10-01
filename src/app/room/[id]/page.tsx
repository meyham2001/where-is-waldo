"use client";

import React, { useEffect, useState, useRef, use } from "react";
import { RoomState, Player, Level } from "@/lib/game-types";
import { getPusherClient } from "@/lib/pusher-client";
import { getHostToken } from "@/lib/host-session";
import LobbyView from "@/components/LobbyView";
import WaldoViewer from "@/components/WaldoViewer";
import ScoreboardModal from "@/components/ScoreboardModal";
import RoundWonBanner from "@/components/RoundWonBanner";
import PodiumView from "@/components/PodiumView";
import InviteModal from "@/components/InviteModal";
import ConfirmModal, { ConfirmVariant, ConfirmIconType } from "@/components/ConfirmModal";
import confetti from "canvas-confetti";
import { ClickMarker } from "@/components/ClickFeedback";
import { Timer, Home, Trophy, Eye, X, CheckCircle2, AlertCircle, UserPlus, RotateCcw, Square, LogOut } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import rawLevels from "../../../../data/levels.json";

const levels = rawLevels as Level[];

// Rounds follow the host's chosen maps and order
function levelForRound(room: RoomState, roundIndex: number): Level | null {
  const levelId = room.selectedLevelIds[roundIndex];
  return levels.find((l) => l.id === levelId) ?? null;
}

export default function RoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const roomId = resolvedParams.id.toLowerCase();

  const [room, setRoom] = useState<RoomState | null>(null);
  const [roomNotFound, setRoomNotFound] = useState(false);
  const [joinError, setJoinError] = useState("");
  const currentLevel = room ? levelForRound(room, room.currentRoundIndex) : null;
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [markers, setMarkers] = useState<ClickMarker[]>([]);
  const [elapsedTime, setElapsedTime] = useState("0.0");
  const [lastClickTime, setLastClickTime] = useState(0);
  const [showWaldoGuide, setShowWaldoGuide] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showScoreboardModal, setShowScoreboardModal] = useState(false);
  const [hasOptedIntoActiveRound, setHasOptedIntoActiveRound] = useState(false);
  const wasInLobbyRef = useRef(false);
  const prevStatusRef = useRef<string | undefined>(undefined);
  const roomVersionRef = useRef(0);
  const refreshInFlightRef = useRef(false);
  const rejoinInFlightRef = useRef(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const currentPlayerRef = useRef<Player | null>(null);
  currentPlayerRef.current = currentPlayer;

  // Polling, Pusher and action responses can arrive out of order; only ever move forward in versions
  const applyRoom = (next: RoomState | null | undefined) => {
    if (!next || (next.version ?? 0) < roomVersionRef.current) return false;
    roomVersionRef.current = next.version ?? 0;
    setRoom(next);

    const activePlayer = currentPlayerRef.current;
    if (activePlayer && next.players[activePlayer.id]) {
      setCurrentPlayer(next.players[activePlayer.id]);
    }
    return true;
  };

  // Initialize or restore player from localStorage and register with the backend
  useEffect(() => {
    const saved = localStorage.getItem(`waldo_player_${roomId}`);
    if (saved) {
      try {
        const parsed: Player = JSON.parse(saved);
        setCurrentPlayer(parsed);

        // Send registration to server immediately
        fetch(`/api/room/${roomId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "join", player: parsed, hostToken: getHostToken(roomId) }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.room && data.player) {
              setCurrentPlayer(data.player);
              localStorage.setItem(`waldo_player_${roomId}`, JSON.stringify(data.player));
              applyRoom(data.room);
            }
          })
          .catch(console.error);
      } catch (e) {
        console.error("Failed to parse saved player:", e);
      }
    }
  }, [roomId]);

  // Fetch current room state
  const refreshRoom = async () => {
    if (refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;
    try {
      const res = await fetch(`/api/room/${roomId}`, { cache: "no-store" });
      setRoomNotFound(res.status === 404);
      if (!res.ok) return;
      const data = await res.json();
      if (!applyRoom(data.room)) return;

      // If player is missing from server state (e.g. room expired), re-register once
      const activePlayer = currentPlayerRef.current;
      if (activePlayer && !data.room.players[activePlayer.id] && !rejoinInFlightRef.current) {
        rejoinInFlightRef.current = true;
        fetch(`/api/room/${roomId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "join", player: activePlayer, hostToken: getHostToken(roomId) }),
        })
          .then((r) => r.json())
          .then((joined) => applyRoom(joined.room))
          .catch(console.error)
          .finally(() => {
            rejoinInFlightRef.current = false;
          });
      }
    } catch (err) {
      console.error("Failed to fetch room:", err);
    } finally {
      refreshInFlightRef.current = false;
    }
  };

  // Setup real-time listeners and polling fallback
  useEffect(() => {
    refreshRoom();

    // Setup Pusher if available
    const pusher = getPusherClient();
    let channel: any = null;

    if (pusher) {
      channel = pusher.subscribe(`room-${roomId}`);
      for (const event of ["player-joined", "round-started", "round-won", "game-reset", "game-finished"]) {
        channel.bind(event, (data: { room: RoomState }) => applyRoom(data.room));
      }
    }

    // Polling keeps everyone in sync; with Pusher it is only a safety net
    const interval = setInterval(refreshRoom, pusher ? 3000 : 1000);

    return () => {
      clearInterval(interval);
      if (channel && pusher) {
        channel.unbind_all();
        pusher.unsubscribe(`room-${roomId}`);
      }
    };
  }, [roomId]);

  // React to status transitions exactly once, however the new state arrived
  useEffect(() => {
    const status = room?.status;
    if (status === prevStatusRef.current) return;

    if (status === "round_won" && prevStatusRef.current !== undefined) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
    }
    if (status === "playing" || status === "lobby") {
      setShowScoreboardModal(false);
    }
    prevStatusRef.current = status;
  }, [room?.status]);

  // Preload the next map while players look at the round result, so it shows instantly
  useEffect(() => {
    if (!room) return;
    const nextLevel = levelForRound(room, room.currentRoundIndex + 1);
    if (nextLevel) {
      for (const src of [nextLevel.image.replace(/\.webp$/, "-preview.webp"), nextLevel.image]) {
        const img = new window.Image();
        img.src = src;
      }
    }
  }, [room?.currentRoundIndex]);

  // Round stopwatch timer
  useEffect(() => {
    if (room?.status === "playing" && room.roundStartTime) {
      timerRef.current = setInterval(() => {
        const diff = (Date.now() - (room.roundStartTime || Date.now())) / 1000;
        setElapsedTime(diff.toFixed(1));
      }, 100);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [room?.status, room?.roundStartTime]);

  // Clear all click markers whenever moving to a new round
  useEffect(() => {
    setMarkers([]);
  }, [room?.currentRoundIndex]);

  // Track if player was in lobby before game starts
  useEffect(() => {
    if (room?.status === "lobby") {
      wasInLobbyRef.current = true;
      setHasOptedIntoActiveRound(false);
    }
  }, [room?.status]);

  // Actions: apply the server's response directly so a poll that is already in flight can't hide it
  const postAction = async (payload: Record<string, unknown>) => {
    try {
      const res = await fetch(`/api/room/${roomId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, hostToken: getHostToken(roomId) }),
      });
      const data = await res.json();
      if (!res.ok) console.error(`Action "${payload.action}" rejected:`, data.error);
      applyRoom(data.room);
    } catch (err) {
      console.error(`Action "${payload.action}" failed:`, err);
    }
  };

  // Actions
  const handleJoin = async (name: string, avatar: string, color: string) => {
    const id = currentPlayer?.id || `p_${Math.random().toString(36).substring(2, 9)}`;
    const newPlayer: Player = {
      id,
      name,
      avatar,
      color,
      score: 0,
      isHost: false,
      joinedAt: Date.now(),
      lastActive: Date.now(),
    };

    setJoinError("");
    const res = await fetch(`/api/room/${roomId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "join", player: newPlayer, hostToken: getHostToken(roomId) }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setJoinError(data.error || "Could not join the room.");
      return;
    }
    {
      const activeP = data.player || data.room.players[id];
      if (activeP) {
        setCurrentPlayer(activeP);
        localStorage.setItem(`waldo_player_${roomId}`, JSON.stringify(activeP));
      }
      applyRoom(data.room);
    }
  };

  const handleSetLevels = async (levelIds: number[]) => {
    if (!currentPlayer?.isHost) return;
    await postAction({ action: "set-levels", levelIds });
  };

  const handleStartGame = async () => {
    if (!currentPlayer?.isHost) return;
    setMarkers([]);
    await postAction({ action: "start", roundIndex: 0 });
  };

  const handleNextRound = async () => {
    if (!currentPlayer?.isHost || !room) return;
    setMarkers([]);
    const nextIdx = room.currentRoundIndex + 1;
    await postAction({ action: "start", roundIndex: nextIdx });
  };

  const handleFinishGameEarly = async () => {
    if (!currentPlayer?.isHost || !room) return;
    await postAction({ action: "finish" });
  };

  const handlePlayAgain = async () => {
    if (!currentPlayer?.isHost) return;
    await postAction({ action: "reset" });
  };

  const handleResetToLobby = async () => {
    if (!currentPlayer?.isHost || !room) return;
    setMarkers([]);
    setHasOptedIntoActiveRound(false);
    wasInLobbyRef.current = true;
    await postAction({ action: "reset" });
  };

  const handleRestartGame = async () => {
    if (!currentPlayer?.isHost || !room) return;
    setMarkers([]);
    setHasOptedIntoActiveRound(true);
    await postAction({ action: "restart" });
  };

  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    badgeText?: string;
    confirmText?: string;
    cancelText?: string;
    variant?: ConfirmVariant;
    icon?: ConfirmIconType;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    description: "",
    onConfirm: () => {},
  });

  const showConfirm = (config: {
    title: string;
    description: string;
    badgeText?: string;
    confirmText?: string;
    cancelText?: string;
    variant?: ConfirmVariant;
    icon?: ConfirmIconType;
    onConfirm: () => void;
  }) => {
    setConfirmConfig({
      ...config,
      isOpen: true,
    });
  };

  const closeConfirm = () => {
    setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
  };

  const requestResetToLobby = () => {
    showConfirm({
      title: "Stop Game & Return to Lobby?",
      description:
        "This will stop the active round for all players and return everyone back to the lobby. Player scores will be reset to 0.",
      badgeText: "Stop Active Match",
      confirmText: "Stop & Return to Lobby",
      cancelText: "Keep Playing",
      variant: "danger",
      icon: "stop",
      onConfirm: handleResetToLobby,
    });
  };

  const requestRestartGame = () => {
    showConfirm({
      title: "Restart Game From Round 1?",
      description:
        "This will restart the tournament from the very first map for all connected teammates. All current scores will be reset to 0.",
      badgeText: "Restart Match",
      confirmText: "Restart from Round 1",
      cancelText: "Keep Playing",
      variant: "warning",
      icon: "restart",
      onConfirm: handleRestartGame,
    });
  };

  const handleGuess = async (x: number, y: number) => {
    if (!currentPlayer || room?.status !== "playing") return;

    // 600ms anti-spam cooldown
    const now = Date.now();
    if (now - lastClickTime < 600) return;
    setLastClickTime(now);

    try {
      const res = await fetch(`/api/room/${roomId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "click", playerId: currentPlayer.id, x, y }),
      });

      if (res.ok) {
        const data = await res.json();

        // Add feedback marker
        const newMarker: ClickMarker = {
          id: `m_${Date.now()}_${Math.random()}`,
          x,
          y,
          hit: data.hit,
          timestamp: Date.now(),
        };

        setMarkers((prev) => [...prev, newMarker]);

        // Auto remove feedback marker after 3 seconds
        setTimeout(() => {
          setMarkers((prev) => prev.filter((m) => m.id !== newMarker.id));
        }, 3000);

        applyRoom(data.room);
      }
    } catch (err) {
      console.error("Click submission failed:", err);
    }
  };

  if (roomNotFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white space-y-4 px-4 text-center">
        <AlertCircle className="w-10 h-10 text-rose-500" />
        <h1 className="text-xl font-bold">Room {roomId.toUpperCase()} doesn&apos;t exist</h1>
        <p className="text-sm text-slate-400 max-w-sm">
          The code may be mistyped, or the room expired after a day of inactivity. Ask the host for a fresh invite link, or host your own game.
        </p>
        <Link href="/" className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-sm font-bold transition-colors">
          Back to home
        </Link>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white space-y-3">
        <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-400">Loading Waldo room...</p>
      </div>
    );
  }

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  const isJoined = Boolean(
    currentPlayer &&
    currentPlayer.id &&
    currentPlayer.name &&
    room.players &&
    room.players[currentPlayer.id]
  );

  // View: Lobby (Always show if room is in lobby OR if user hasn't joined/picked nickname yet OR hasn't opted into active round)
  const shouldShowLobby =
    room.status === "lobby" ||
    !isJoined ||
    (room.status === "playing" && !currentPlayer?.isHost && !wasInLobbyRef.current && !hasOptedIntoActiveRound);

  const confirmModalElement = (
    <ConfirmModal
      isOpen={confirmConfig.isOpen}
      title={confirmConfig.title}
      description={confirmConfig.description}
      badgeText={confirmConfig.badgeText}
      confirmText={confirmConfig.confirmText}
      cancelText={confirmConfig.cancelText}
      variant={confirmConfig.variant}
      icon={confirmConfig.icon}
      onConfirm={confirmConfig.onConfirm}
      onClose={closeConfirm}
    />
  );

  if (shouldShowLobby) {
    return (
      <main className="min-h-screen bg-slate-950 py-4">
        <LobbyView
          room={room}
          currentPlayer={currentPlayer}
          onJoin={handleJoin}
          joinError={joinError}
          onSetLevels={handleSetLevels}
          levels={levels}
          onStartGame={handleStartGame}
          onRestartGame={requestRestartGame}
          shareUrl={shareUrl}
          onResetToLobby={requestResetToLobby}
          onEnterActiveGame={() => setHasOptedIntoActiveRound(true)}
        />
        {confirmModalElement}
      </main>
    );
  }

  // View: Podium / Game Finished
  if (room.status === "finished") {
    return (
      <main className="min-h-screen bg-slate-950 py-4">
        <PodiumView
          room={room}
          currentPlayer={currentPlayer}
          onPlayAgain={handlePlayAgain}
        />
        {confirmModalElement}
      </main>
    );
  }

  // Target reveal details if round is won
  const targetReveal =
    room.status === "round_won" && room.roundResult && currentLevel
      ? {
          x: room.roundResult.targetX,
          y: room.roundResult.targetY,
          radius: currentLevel.target.radius,
          winnerName: room.roundResult.winnerName,
        }
      : null;

  const sortedPlayers = Object.values(room.players || {}).sort((a, b) => b.score - a.score);

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col justify-between p-2 md:p-4">
      {/* Top Header Bar */}
      <header className="flex items-center justify-between bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl px-4 py-2.5 shadow-xl mb-2 gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (currentPlayer?.isHost) {
                showConfirm({
                  title: "Stop Game & Return to Lobby?",
                  description:
                    "As the room host, stopping the game will end the active round for all players and return everyone to the lobby.",
                  badgeText: "Host Action",
                  confirmText: "Stop & Return to Lobby",
                  cancelText: "Keep Playing",
                  variant: "danger",
                  icon: "stop",
                  onConfirm: handleResetToLobby,
                });
              } else {
                showConfirm({
                  title: "Leave Game?",
                  description: `Are you sure you want to leave room ${roomId.toUpperCase()} and return to the main menu?`,
                  badgeText: "Leave Room",
                  confirmText: "Leave Game",
                  cancelText: "Stay in Game",
                  variant: "danger",
                  icon: "logout",
                  onConfirm: () => {
                    window.location.href = "/";
                  },
                });
              }
            }}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
            title={currentPlayer?.isHost ? "Stop game & return to lobby" : "Leave room"}
          >
            <Home className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-rose-500/20 text-rose-400 text-xs font-bold px-2 py-0.5 rounded-full border border-rose-500/30">
                Round {room.currentRoundIndex + 1}/{room.totalRounds}
              </span>
              <h2 className="text-sm md:text-base font-bold text-white truncate max-w-[150px] md:max-w-md">
                {currentLevel?.title || "Searching for Waldo..."}
              </h2>
              {currentPlayer?.isHost && (
                <>
                  <button
                    onClick={requestRestartGame}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded-full transition-colors cursor-pointer"
                    title="Stop and restart match from Round 1"
                  >
                    <RotateCcw className="w-3 h-3 text-rose-400" />
                    <span>Restart</span>
                  </button>

                  <button
                    onClick={requestResetToLobby}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-full transition-colors cursor-pointer"
                    title="Stop game and return everyone to lobby"
                  >
                    <Square className="w-2.5 h-2.5 fill-rose-400 text-rose-400" />
                    <span>Stop & Lobby</span>
                  </button>

                  <button
                    onClick={() => {
                      showConfirm({
                        title: "End Tournament Early?",
                        description:
                          "This will conclude the game immediately and reveal the final podium based on current leaderboard scores.",
                        badgeText: "Crown Winner",
                        confirmText: "Crown Winner Now",
                        cancelText: "Keep Playing",
                        variant: "warning",
                        icon: "trophy",
                        onConfirm: handleFinishGameEarly,
                      });
                    }}
                    className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full transition-colors cursor-pointer"
                    title="Finish tournament and see champion"
                  >
                    <Trophy className="w-3 h-3 text-amber-400" />
                    <span>Crown Winner</span>
                  </button>
                </>
              )}
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              {currentLevel?.subtitle}
            </p>
          </div>
        </div>

        {/* Stopwatch & Player status & Guide & Invite */}
        <div className="flex items-center gap-2 md:gap-3">
          <button
            onClick={() => setShowInviteModal(true)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer"
            title="Invite colleagues to room"
          >
            <UserPlus className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">Invite Team</span>
            <span className="bg-rose-900/60 px-1.5 py-0.5 rounded text-[10px] font-mono border border-rose-400/20">
              {(room.roomId || roomId).toUpperCase()}
            </span>
          </button>

          <button
            onClick={() => setShowWaldoGuide(true)}
            className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-xl transition-colors border border-slate-700 cursor-pointer"
            title="What does Waldo look like?"
          >
            <Eye className="w-3.5 h-3.5 text-rose-400" />
            <span>Target Guide</span>
          </button>

          <div className="flex items-center gap-1.5 font-mono text-sm md:text-base font-bold bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-amber-400 shadow-inner">
            <Timer className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>{elapsedTime}s</span>
          </div>

          {/* Connected players quick roster */}
          <div className="flex items-center -space-x-1.5">
            {sortedPlayers.slice(0, 5).map((p) => (
              <div
                key={p.id}
                title={`${p.name}: ${p.score} pts`}
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs shadow ring-2 ring-slate-900 relative"
                style={{ backgroundColor: p.color }}
              >
                {p.avatar}
                {p.score > 0 && (
                  <span className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 font-black text-[9px] w-3.5 h-3.5 rounded-full flex items-center justify-center shadow">
                    {p.score}
                  </span>
                )}
              </div>
            ))}
            {sortedPlayers.length > 5 && (
              <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400 ring-2 ring-slate-900">
                +{sortedPlayers.length - 5}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Waldo Pan/Zoom Canvas */}
      {currentLevel && (
        <WaldoViewer
          imageSrc={currentLevel.image}
          levelTitle={currentLevel.title}
          onGuess={handleGuess}
          targetReveal={targetReveal}
          disabled={room.status !== "playing"}
          markers={markers}
        />
      )}

      {/* Floating Round Won Banner (Leaves map 100% visible and interactive with Waldo revealed) */}
      {room.status === "round_won" && (
        <RoundWonBanner
          room={room}
          currentPlayer={currentPlayer}
          onNextRound={handleNextRound}
          onOpenLeaderboard={() => setShowScoreboardModal(true)}
          isLastRound={room.currentRoundIndex + 1 >= room.totalRounds}
        />
      )}

      {/* Optional Full Standings / Leaderboard Popup */}
      {room.status === "round_won" && showScoreboardModal && (
        <ScoreboardModal
          room={room}
          currentPlayer={currentPlayer}
          onNextRound={handleNextRound}
          onFinishGameEarly={handleFinishGameEarly}
          onClose={() => setShowScoreboardModal(false)}
          isLastRound={room.currentRoundIndex + 1 >= room.totalRounds}
        />
      )}

      {/* Waldo Target Guide Modal */}
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
                    <span><strong className="text-white">Striped Shirt:</strong> Red and white horizontal stripes.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span><strong className="text-white">Gear:</strong> Wooden cane & blue jeans.</span>
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
              className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 rounded-xl transition-colors text-sm"
            >
              Resume Game
            </button>
          </div>
        </div>
      )}

      {/* Dedicated Invite Modal */}
      <InviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        roomId={room.roomId || roomId}
        shareUrl={shareUrl}
        isHost={currentPlayer?.isHost}
        roomStatus={room.status}
        onResetToLobby={requestResetToLobby}
      />

      {confirmModalElement}
    </main>
  );
}
