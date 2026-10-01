"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { ZoomIn, ZoomOut, RotateCcw, Crosshair } from "lucide-react";
import { ClickMarkersOverlay, ClickMarker } from "./ClickFeedback";

interface WaldoViewerProps {
  imageSrc: string;
  levelTitle: string;
  onGuess: (x: number, y: number) => void;
  targetReveal: { x: number; y: number; radius: number; winnerName?: string } | null;
  disabled?: boolean;
  markers?: ClickMarker[];
}

// Low-res copy generated next to each scene (`level-1-beach.webp` -> `level-1-beach-preview.webp`)
function previewSrc(src: string) {
  return src.replace(/\.webp$/, "-preview.webp");
}

export default function WaldoViewer({
  imageSrc,
  levelTitle,
  onGuess,
  targetReveal,
  disabled = false,
  markers = [],
}: WaldoViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [fullResLoaded, setFullResLoaded] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Synchronous refs for smooth 60/120fps gesture updates without closure lag
  const scaleRef = useRef(1);
  const positionRef = useRef({ x: 0, y: 0 });
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, posX: 0, posY: 0 });
  const hasMovedRef = useRef(false);
  const baseSizeRef = useRef({ w: 0, h: 0 });

  // Reset zoom when image changes
  useEffect(() => {
    scaleRef.current = 1;
    positionRef.current = { x: 0, y: 0 };
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setImageLoaded(false);
    setFullResLoaded(false);
    setIsAnimating(false);

    // Show the small preview immediately and swap in the full-res scene once it has downloaded
    const fullRes = new window.Image();
    fullRes.onload = () => setFullResLoaded(true);
    fullRes.src = imageSrc;
    return () => {
      fullRes.onload = null;
    };
  }, [imageSrc]);

  // When target is revealed, smoothly auto-pan and zoom to Waldo!
  const centerOnTarget = useCallback(() => {
    if (!targetReveal || !containerRef.current || !imageRef.current) return;
    const baseW = imageRef.current.clientWidth || baseSizeRef.current.w;
    const baseH = imageRef.current.clientHeight || baseSizeRef.current.h;
    if (!baseW || !baseH) return;

    const targetScale = 2.6;
    // Calculate offset from image center (50%, 50%)
    const dxFromCenter = ((targetReveal.x - 50) / 100) * baseW;
    const dyFromCenter = ((targetReveal.y - 50) / 100) * baseH;

    const targetX = -dxFromCenter * targetScale;
    const targetY = -dyFromCenter * targetScale;

    setIsAnimating(true);
    scaleRef.current = targetScale;
    positionRef.current = { x: targetX, y: targetY };
    setScale(targetScale);
    setPosition({ x: targetX, y: targetY });
  }, [targetReveal]);

  // Store image rendered base size when loaded
  const handleImageLoad = () => {
    if (imageRef.current) {
      baseSizeRef.current = {
        w: imageRef.current.clientWidth,
        h: imageRef.current.clientHeight,
      };
    }
    setImageLoaded(true);
  };

  // Native wheel and pinch listener on the container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheelNative = (e: WheelEvent) => {
      // Prevent browser default page pinch zoom and scrolling
      e.preventDefault();
      e.stopPropagation();

      // Disable CSS transition during manual gesture for 1:1 instantaneous response
      setIsAnimating(false);

      const containerRect = container.getBoundingClientRect();
      const W = containerRect.width;
      const H = containerRect.height;
      const mouseX = e.clientX - containerRect.left;
      const mouseY = e.clientY - containerRect.top;

      const currentScale = scaleRef.current;
      const currentPos = positionRef.current;

      // Detect trackpad pinch gesture (e.ctrlKey is true on macOS trackpad pinch)
      const isPinch = e.ctrlKey;

      let dy = e.deltaY;
      if (e.deltaMode === 1) dy *= 25; // lines mode
      else if (e.deltaMode === 2) dy *= 250; // pages mode

      // Two-finger horizontal pan on trackpad when zoomed in
      if (!isPinch && currentScale > 1 && Math.abs(e.deltaX) > Math.abs(dy) * 1.5) {
        const baseW = baseSizeRef.current.w || W;
        const maxPanX = Math.max(0, (baseW * currentScale - W) / 2) + W * 0.2;
        const nextX = Math.max(-maxPanX, Math.min(maxPanX, currentPos.x - e.deltaX));
        positionRef.current = { x: nextX, y: currentPos.y };
        setPosition({ x: nextX, y: currentPos.y });
        return;
      }

      // Fine-tuned sensitivity:
      // Trackpad pinch typically fires 60-120 events with dy in the 5-25 range.
      // Slower sensitivity (0.0022 for pinch, 0.0012 for wheel) gives smooth, gentle control.
      const sensitivity = isPinch ? 0.0022 : 0.0012;
      const rawDelta = -dy * sensitivity;

      // Clamp delta per event to eliminate snapping or inertia flings
      const maxDelta = isPinch ? 0.05 : 0.12;
      const clampedDelta = Math.max(-maxDelta, Math.min(maxDelta, rawDelta));
      const factor = Math.exp(clampedDelta);

      const minScale = 1;
      const maxScale = 5.5;
      const targetScale = currentScale * factor;
      const newScale = Math.min(Math.max(targetScale, minScale), maxScale);

      if (Math.abs(newScale - currentScale) < 0.0001) return;

      const scaleChange = newScale / currentScale;

      // Current center of image relative to container (centered flexbox base)
      const imgCenterX = W / 2 + currentPos.x;
      const imgCenterY = H / 2 + currentPos.y;

      // Calculate new position so the point under cursor stays stationary
      let newX = currentPos.x + (mouseX - imgCenterX) * (1 - scaleChange);
      let newY = currentPos.y + (mouseY - imgCenterY) * (1 - scaleChange);

      // Return to exact center if zoomed fully out
      if (newScale <= 1.01) {
        newX = 0;
        newY = 0;
      } else {
        // Constrain pan within comfortable bounds
        const baseW = baseSizeRef.current.w || W;
        const baseH = baseSizeRef.current.h || H;
        const maxPanX = Math.max(0, (baseW * newScale - W) / 2) + W * 0.2;
        const maxPanY = Math.max(0, (baseH * newScale - H) / 2) + H * 0.2;
        newX = Math.max(-maxPanX, Math.min(maxPanX, newX));
        newY = Math.max(-maxPanY, Math.min(maxPanY, newY));
      }

      scaleRef.current = newScale;
      positionRef.current = { x: newX, y: newY };
      setScale(newScale);
      setPosition({ x: newX, y: newY });
    };

    container.addEventListener("wheel", handleWheelNative, { passive: false });

    // Prevent Safari default pinch-to-zoom on the webpage
    const preventSafariGesture = (e: Event) => e.preventDefault();
    container.addEventListener("gesturestart", preventSafariGesture, { passive: false });
    container.addEventListener("gesturechange", preventSafariGesture, { passive: false });
    container.addEventListener("gestureend", preventSafariGesture, { passive: false });

    return () => {
      container.removeEventListener("wheel", handleWheelNative);
      container.removeEventListener("gesturestart", preventSafariGesture);
      container.removeEventListener("gesturechange", preventSafariGesture);
      container.removeEventListener("gestureend", preventSafariGesture);
    };
  }, []);

  // Mouse & Pointer Drag Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // primary click only
    setIsAnimating(false);
    setIsDragging(true);
    hasMovedRef.current = false;
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      posX: positionRef.current.x,
      posY: positionRef.current.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.mouseX;
    const dy = e.clientY - dragStartRef.current.mouseY;

    if (Math.hypot(dx, dy) > 4) {
      hasMovedRef.current = true;
    }

    if (containerRef.current) {
      const W = containerRef.current.clientWidth;
      const H = containerRef.current.clientHeight;
      const baseW = baseSizeRef.current.w || W;
      const baseH = baseSizeRef.current.h || H;
      const curScale = scaleRef.current;

      const maxPanX = Math.max(0, (baseW * curScale - W) / 2) + W * 0.2;
      const maxPanY = Math.max(0, (baseH * curScale - H) / 2) + H * 0.2;

      const nextX = Math.max(-maxPanX, Math.min(maxPanX, dragStartRef.current.posX + dx));
      const nextY = Math.max(-maxPanY, Math.min(maxPanY, dragStartRef.current.posY + dy));

      positionRef.current = { x: nextX, y: nextY };
      setPosition({ x: nextX, y: nextY });
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    setIsDragging(false);

    // If mouse didn't drag, register click guess
    if (!hasMovedRef.current && !disabled && imageRef.current) {
      const imgRect = imageRef.current.getBoundingClientRect();
      const clickX = e.clientX - imgRect.left;
      const clickY = e.clientY - imgRect.top;

      if (
        clickX >= 0 &&
        clickX <= imgRect.width &&
        clickY >= 0 &&
        clickY <= imgRect.height
      ) {
        const percentX = parseFloat(((clickX / imgRect.width) * 100).toFixed(2));
        const percentY = parseFloat(((clickY / imgRect.height) * 100).toFixed(2));
        onGuess(percentX, percentY);
      }
    }
  };

  // Zoom control buttons (+ / - / reset)
  const handleZoomButton = (targetFactor: number) => {
    setIsAnimating(true);
    const curScale = scaleRef.current;
    const newScale = Math.min(Math.max(curScale * targetFactor, 1), 5.5);
    const scaleChange = newScale / curScale;

    const newPos = newScale === 1
      ? { x: 0, y: 0 }
      : { x: positionRef.current.x * scaleChange, y: positionRef.current.y * scaleChange };

    scaleRef.current = newScale;
    positionRef.current = newPos;
    setScale(newScale);
    setPosition(newPos);
  };

  const resetZoom = () => {
    setIsAnimating(true);
    scaleRef.current = 1;
    positionRef.current = { x: 0, y: 0 };
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  return (
    <div className="relative w-full h-[76vh] md:h-[82vh] bg-slate-950 overflow-hidden rounded-2xl border border-slate-800 shadow-2xl flex items-center justify-center select-none">
      {/* Loading state */}
      {!imageLoaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 z-30 space-y-4">
          <div className="w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-400">Loading high-res scene: {levelTitle}...</p>
        </div>
      )}
      {imageLoaded && !fullResLoaded && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 rounded-full px-3 py-1.5 text-xs text-slate-300 pointer-events-none">
          <div className="w-3 h-3 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
          Loading full detail...
        </div>
      )}

      {/* Interactive pan/zoom container */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className={`w-full h-full flex items-center justify-center overflow-hidden ${
          isDragging ? "cursor-grabbing" : scale > 1 ? "cursor-grab" : "cursor-crosshair"
        }`}
        style={{ touchAction: "none" }}
      >
        <div
          className={`relative flex items-center justify-center max-w-full max-h-full ${
            isAnimating ? "transition-transform duration-300 ease-out" : ""
          }`}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: "center center",
            willChange: "transform",
          }}
        >
          <img
            ref={imageRef}
            src={fullResLoaded ? imageSrc : previewSrc(imageSrc)}
            alt={levelTitle}
            draggable={false}
            decoding="async"
            onLoad={handleImageLoad}
            className="max-w-none h-[76vh] md:h-[82vh] w-auto object-contain pointer-events-none rounded shadow-md"
          />

          {/* Overlaid Click & Target feedback (scales with image) */}
          <ClickMarkersOverlay markers={markers} targetReveal={targetReveal} />
        </div>
      </div>

      {/* Floating Zoom & Controls Overlay */}
      <div className="absolute bottom-4 right-4 flex items-center bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-1.5 shadow-2xl gap-1 z-30">
        <button
          onClick={() => handleZoomButton(1.3)}
          title="Zoom In"
          className="p-2 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleZoomButton(1 / 1.3)}
          title="Zoom Out"
          className="p-2 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="w-px h-5 bg-slate-700 mx-1" />
        <button
          onClick={resetZoom}
          title="Reset View"
          className="p-2 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-semibold"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{Math.round(scale * 100)}%</span>
        </button>
        {targetReveal && (
          <>
            <div className="w-px h-5 bg-slate-700 mx-1" />
            <button
              onClick={centerOnTarget}
              title="Snap to Waldo's location"
              className="px-2.5 py-1.5 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white rounded-lg text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer animate-pulse"
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>Focus Waldo</span>
            </button>
          </>
        )}
      </div>

      {/* Target hint & instructions */}
      <div className="absolute top-4 left-4 flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-slate-700/70 px-3 py-1.5 rounded-xl shadow-lg z-30 text-xs font-medium text-slate-300">
        {targetReveal ? (
          <div className="flex items-center gap-2 text-rose-300 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            <span>🎯 Waldo found! Showing exact location on map</span>
          </div>
        ) : (
          <>
            <Crosshair className="w-4 h-4 text-rose-500 animate-pulse" />
            <span>Pinch or scroll to zoom • Drag to pan • Click Waldo to score!</span>
          </>
        )}
      </div>
    </div>
  );
}
