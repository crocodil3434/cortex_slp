"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  verifyPin,
  isLocked,
  recordFailedAttempt,
  clearFailedAttempts,
  setAuthSession,
  isFirstRun,
  saveSettings,
  hashPin,
} from "@/lib/crocodil/storage";
import { Delete, ShieldCheck, Lock } from "lucide-react";

const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

export default function CrocodilPinPage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [setupStep, setSetupStep] = useState<"enter" | "confirm">("enter");
  const [shake, setShake] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [locked, setLocked] = useState(false);
  const [lockSeconds, setLockSeconds] = useState(0);
  const [firstRun, setFirstRun] = useState(false);
  const [clinicianName, setClinicianName] = useState("");
  const [nameStep, setNameStep] = useState(true);

  useEffect(() => {
    setFirstRun(isFirstRun());
  }, []);

  // Kilit sayacı
  useEffect(() => {
    if (!locked) return;
    const interval = setInterval(() => {
      const { locked: still, remainingSeconds } = isLocked();
      if (!still) {
        setLocked(false);
        setLockSeconds(0);
        setError("");
      } else {
        setLockSeconds(remainingSeconds);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [locked]);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 600);
  };

  const handleDigit = useCallback(
    (digit: string) => {
      if (digit === "⌫") {
        if (firstRun && setupStep === "confirm") {
          setConfirmPin((p) => p.slice(0, -1));
        } else {
          setPin((p) => p.slice(0, -1));
        }
        setError("");
        return;
      }
      if (!digit) return;

      if (firstRun && setupStep === "confirm") {
        if (confirmPin.length < 6) setConfirmPin((p) => p + digit);
      } else {
        if (pin.length < 6) setPin((p) => p + digit);
      }
    },
    [pin, confirmPin, firstRun, setupStep]
  );

  // PIN dolunca otomatik kontrol
  useEffect(() => {
    if (firstRun) {
      if (setupStep === "enter" && pin.length === 6) {
        // İlk adım tamamlandı, onayla
        setTimeout(() => setSetupStep("confirm"), 300);
      } else if (setupStep === "confirm" && confirmPin.length === 6) {
        if (pin === confirmPin) {
          // PIN oluştur
          saveSettings({
            pin: hashPin(pin),
            clinicianName,
            theme: "light",
          });
          setSuccess(true);
          setTimeout(() => {
            setAuthSession();
            router.push("/crocodil/takvim");
          }, 1500);
        } else {
          triggerShake();
          setError("PIN'ler eşleşmiyor. Tekrar deneyin.");
          setTimeout(() => {
            setConfirmPin("");
            setPin("");
            setSetupStep("enter");
          }, 800);
        }
      }
    } else {
      if (pin.length === 6) {
        const { locked: isLock, remainingSeconds } = isLocked();
        if (isLock) {
          setLocked(true);
          setLockSeconds(remainingSeconds);
          setPin("");
          return;
        }
        if (verifyPin(pin)) {
          clearFailedAttempts();
          setSuccess(true);
          setTimeout(() => {
            setAuthSession();
            router.push("/crocodil/takvim");
          }, 1200);
        } else {
          const attempts = recordFailedAttempt();
          triggerShake();
          setError(attempts >= 3 ? "Çok fazla hatalı giriş. 30 saniye bekleyin." : `Hatalı PIN. ${3 - attempts} deneme hakkınız kaldı.`);
          if (attempts >= 3) setLocked(true);
          setTimeout(() => setPin(""), 600);
        }
      }
    }
  }, [pin, confirmPin]);

  const currentPin = firstRun && setupStep === "confirm" ? confirmPin : pin;

  if (firstRun && nameStep) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden" style={{ background: "linear-gradient(135deg, #0f2027 0%, #134e4a 50%, #0f2027 100%)" }}>
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full opacity-10"
              style={{
                width: `${150 + i * 80}px`,
                height: `${150 + i * 80}px`,
                background: "radial-gradient(circle, #0d9488, transparent)",
                left: `${10 + i * 15}%`,
                top: `${5 + i * 12}%`,
              }}
              animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
              transition={{ duration: 8 + i * 2, repeat: Infinity, ease: "linear" }}
            />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 w-full max-w-sm mx-4 text-center"
        >
          <div className="text-7xl mb-6">🐊</div>
          <h1 className="text-3xl font-bold text-white mb-2">Crocodil'e Hoş Geldiniz</h1>
          <p className="text-teal-300 text-sm mb-8">Medikal SLP Takip Sistemi — İlk kurulum</p>

          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20">
            <label className="block text-white/70 text-sm font-medium mb-2 text-left">
              Klinisyen Adı
            </label>
            <input
              type="text"
              value={clinicianName}
              onChange={(e) => setClinicianName(e.target.value)}
              placeholder="Dr. Adınız Soyadınız"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 outline-none focus:border-teal-400 transition-colors"
            />
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => clinicianName.trim() && setNameStep(false)}
              disabled={!clinicianName.trim()}
              className="mt-4 w-full py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #0d9488, #134e4a)", color: "white" }}
            >
              Devam Et →
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #0f2027 0%, #134e4a 50%, #0f2027 100%)" }}
    >
      {/* Animasyonlu arka plan */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full opacity-[0.07]"
            style={{
              width: `${200 + i * 100}px`,
              height: `${200 + i * 100}px`,
              background: "radial-gradient(circle, #0d9488, transparent)",
              left: `${5 + i * 20}%`,
              top: `${10 + i * 15}%`,
            }}
            animate={{ scale: [1, 1.3, 1], opacity: [0.07, 0.12, 0.07] }}
            transition={{ duration: 5 + i * 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 w-full max-w-sm mx-4"
      >
        {/* Başlık */}
        <div className="text-center mb-8">
          <motion.div
            animate={{ rotate: success ? [0, 10, -10, 0] : 0 }}
            className="text-6xl mb-4 inline-block"
          >
            {success ? "✅" : locked ? "🔒" : "🐊"}
          </motion.div>
          <h1 className="text-2xl font-bold text-white">
            {firstRun
              ? setupStep === "enter"
                ? "PIN Oluşturun"
                : "PIN'i Onaylayın"
              : "Klinik Portal"}
          </h1>
          <p className="text-teal-300/70 text-sm mt-1">
            {firstRun
              ? setupStep === "enter"
                ? "6 haneli PIN kodunuzu belirleyin"
                : "Aynı PIN'i tekrar girin"
              : "PIN kodunuzu girin"}
          </p>
        </div>

        {/* PIN noktaları */}
        <motion.div
          animate={shake ? { x: [-8, 8, -8, 8, -4, 4, 0] } : {}}
          transition={{ duration: 0.5 }}
          className="flex justify-center gap-3 mb-6"
        >
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <motion.div
              key={i}
              animate={{
                scale: currentPin.length > i ? 1.2 : 1,
                background: success
                  ? "#10b981"
                  : currentPin.length > i
                  ? "#0d9488"
                  : "rgba(255,255,255,0.2)",
              }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="w-4 h-4 rounded-full"
            />
          ))}
        </motion.div>

        {/* Hata mesajı */}
        <AnimatePresence>
          {(error || locked) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center mb-4"
            >
              {locked ? (
                <div className="flex items-center justify-center gap-2 text-red-400 text-sm">
                  <Lock className="w-4 h-4" />
                  <span>Kilitli — {lockSeconds}s</span>
                </div>
              ) : (
                <p className="text-red-400 text-sm">{error}</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3">
          {DIGITS.map((digit, i) => {
            if (digit === "") return <div key={i} />;
            return (
              <motion.button
                key={i}
                whileHover={!locked ? { scale: 1.05, background: "rgba(13,148,136,0.3)" } : {}}
                whileTap={!locked ? { scale: 0.92 } : {}}
                onClick={() => !locked && handleDigit(digit)}
                disabled={locked || success}
                className="aspect-square rounded-2xl flex items-center justify-center text-white text-2xl font-medium transition-all disabled:opacity-40 select-none"
                style={{
                  background: digit === "⌫" ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  backdropFilter: "blur(10px)",
                }}
              >
                {digit === "⌫" ? <Delete className="w-5 h-5" /> : digit}
              </motion.button>
            );
          })}
        </div>

        {/* Alt bilgi */}
        {!firstRun && (
          <p className="text-center text-white/30 text-xs mt-6">
            Cortex SLP · Medikal Klinik Sistemi
          </p>
        )}
      </motion.div>
    </div>
  );
}
