"use client";

import React, { useEffect } from "react";
import { X, Square, RotateCcw, Trophy, Home, AlertTriangle, LogOut } from "lucide-react";

export type ConfirmVariant = "danger" | "warning" | "info";
export type ConfirmIconType = "stop" | "restart" | "trophy" | "home" | "logout" | "alert";

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  badgeText?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  icon?: ConfirmIconType;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  description,
  badgeText = "Host Action Required",
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  icon = "alert",
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const renderIcon = () => {
    switch (icon) {
      case "stop":
        return <Square className="w-6 h-6 fill-current" />;
      case "restart":
        return <RotateCcw className="w-6 h-6" />;
      case "trophy":
        return <Trophy className="w-6 h-6" />;
      case "home":
        return <Home className="w-6 h-6" />;
      case "logout":
        return <LogOut className="w-6 h-6" />;
      case "alert":
      default:
        return <AlertTriangle className="w-6 h-6" />;
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case "warning":
        return {
          borderTop: "border-t-amber-500",
          iconBg: "bg-amber-500/15 border-amber-500/30 text-amber-400",
          confirmBtn:
            "bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black shadow-lg shadow-amber-500/20",
          badgeBg: "bg-amber-500/10 border-amber-500/30 text-amber-400",
        };
      case "info":
        return {
          borderTop: "border-t-blue-500",
          iconBg: "bg-blue-500/15 border-blue-500/30 text-blue-400",
          confirmBtn:
            "bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-black shadow-lg shadow-blue-600/30",
          badgeBg: "bg-blue-500/10 border-blue-500/30 text-blue-400",
        };
      case "danger":
      default:
        return {
          borderTop: "border-t-rose-500",
          iconBg: "bg-rose-500/15 border-rose-500/30 text-rose-400",
          confirmBtn:
            "bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-black shadow-lg shadow-rose-600/30",
          badgeBg: "bg-rose-500/10 border-rose-500/30 text-rose-400",
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div
      className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className={`bg-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl relative text-left space-y-5 border-t-4 ${styles.borderTop} animate-in zoom-in-95 duration-150`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Header Badge & Icon */}
        <div className="flex items-start gap-4 pr-8">
          <div
            className={`w-12 h-12 rounded-2xl border flex items-center justify-center flex-shrink-0 shadow-md ${styles.iconBg}`}
          >
            {renderIcon()}
          </div>
          <div className="space-y-1">
            {badgeText && (
              <span
                className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full border tracking-wide uppercase ${styles.badgeBg}`}
              >
                {badgeText}
              </span>
            )}
            <h3 className="text-xl font-black text-white tracking-tight">{title}</h3>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-slate-300 leading-relaxed pl-1">{description}</p>

        {/* Actions Buttons */}
        <div className="flex flex-col-reverse sm:flex-row items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-1/2 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white font-bold text-sm transition-all flex items-center justify-center cursor-pointer shadow-sm"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`w-full sm:w-1/2 py-3 px-4 rounded-xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${styles.confirmBtn}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
