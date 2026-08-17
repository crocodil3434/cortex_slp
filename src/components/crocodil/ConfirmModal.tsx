"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";

// ── Tipler ────────────────────────────────────────────────────
interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface ConfirmContextValue {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise(resolve => {
      setPending({ ...opts, resolve });
    });
  }, []);

  const handleResponse = (result: boolean) => {
    pending?.resolve(result);
    setPending(null);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}

      <AnimatePresence>
        {pending && (
          <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
            >
              {/* Icon Area */}
              <div className={`px-6 pt-6 pb-4 flex flex-col items-center text-center`}>
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: pending.danger ? "#fef2f2" : "#fefce8" }}
                >
                  <AlertTriangle
                    className="w-7 h-7"
                    style={{ color: pending.danger ? "#ef4444" : "#f59e0b" }}
                  />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">{pending.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{pending.message}</p>
              </div>

              {/* Buttons */}
              <div className="px-6 pb-6 flex gap-3">
                <button
                  onClick={() => handleResponse(false)}
                  className="flex-1 py-2.5 rounded-xl border text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  style={{ borderColor: "#e5e7eb" }}
                >
                  {pending.cancelLabel ?? "İptal"}
                </button>
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => handleResponse(true)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
                  style={{
                    background: pending.danger
                      ? "linear-gradient(135deg, #ef4444, #dc2626)"
                      : "linear-gradient(135deg, #0d9488, #134e4a)",
                  }}
                >
                  {pending.confirmLabel ?? "Evet"}
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────
export function useConfirm(): ConfirmContextValue {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}
