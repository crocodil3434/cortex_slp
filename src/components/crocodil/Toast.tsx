"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";

// ── Tipler ────────────────────────────────────────────────────
export type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextValue {
  toast: (opts: { type: ToastType; title: string; message?: string }) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

// ── Context ───────────────────────────────────────────────────
const ToastContext = createContext<ToastContextValue | null>(null);

// ── Config ────────────────────────────────────────────────────
const CONFIG: Record<ToastType, { icon: React.ElementType; bg: string; border: string; iconColor: string; titleColor: string }> = {
  success: {
    icon: CheckCircle2,
    bg: "linear-gradient(135deg, #f0fdf9, #ecfdf5)",
    border: "#6ee7b7",
    iconColor: "#10b981",
    titleColor: "#065f46",
  },
  error: {
    icon: XCircle,
    bg: "linear-gradient(135deg, #fff5f5, #fef2f2)",
    border: "#fca5a5",
    iconColor: "#ef4444",
    titleColor: "#991b1b",
  },
  warning: {
    icon: AlertTriangle,
    bg: "linear-gradient(135deg, #fffbeb, #fef9c3)",
    border: "#fcd34d",
    iconColor: "#f59e0b",
    titleColor: "#92400e",
  },
  info: {
    icon: Info,
    bg: "linear-gradient(135deg, #eff6ff, #f0f9ff)",
    border: "#93c5fd",
    iconColor: "#3b82f6",
    titleColor: "#1e40af",
  },
};

// ── Toast Bileşeni ────────────────────────────────────────────
function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const cfg = CONFIG[toast.type];
  const Icon = cfg.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 60, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="flex items-start gap-3 min-w-[280px] max-w-sm w-full rounded-2xl shadow-lg border px-4 py-3"
      style={{
        background: cfg.bg,
        borderColor: cfg.border,
        boxShadow: "0 8px 30px rgba(0,0,0,0.1)",
      }}
    >
      <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: cfg.iconColor }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: cfg.titleColor }}>{toast.title}</p>
        {toast.message && (
          <p className="text-xs mt-0.5 opacity-75" style={{ color: cfg.titleColor }}>{toast.message}</p>
        )}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="flex-shrink-0 p-0.5 rounded-lg hover:bg-black/5 transition-colors"
      >
        <X className="w-3.5 h-3.5" style={{ color: cfg.iconColor }} />
      </button>
    </motion.div>
  );
}

// ── Provider ──────────────────────────────────────────────────
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback(({ type, title, message }: { type: ToastType; title: string; message?: string }) => {
    const id = `toast-${++counterRef.current}`;
    setToasts(prev => [...prev.slice(-4), { id, type, title, message }]);
    setTimeout(() => dismiss(id), type === "error" ? 6000 : 3500);
  }, [dismiss]);

  const success = useCallback((title: string, message?: string) => toast({ type: "success", title, message }), [toast]);
  const error = useCallback((title: string, message?: string) => toast({ type: "error", title, message }), [toast]);
  const warning = useCallback((title: string, message?: string) => toast({ type: "warning", title, message }), [toast]);
  const info = useCallback((title: string, message?: string) => toast({ type: "info", title, message }), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info }}>
      {children}

      {/* Toast Container */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 items-end pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map(t => (
            <div key={t.id} className="pointer-events-auto">
              <ToastItem toast={t} onDismiss={dismiss} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
