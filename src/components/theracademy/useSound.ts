"use client";
import { useEffect, useRef, useState } from "react";

// Original synthesized ambient sound. No tracking, external audio or autoplay.
export function useSound() {
  const context = useRef<AudioContext | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const onVisibility = () => { if (document.hidden) { void context.current?.suspend(); setEnabled(false); } };
    document.addEventListener("visibilitychange", onVisibility);
    return () => { document.removeEventListener("visibilitychange", onVisibility); void context.current?.close(); context.current = null; };
  }, []);
  async function toggle() {
    try {
      if (!context.current) {
        const ctx = new AudioContext(); context.current = ctx;
        const master = ctx.createGain(); master.gain.value = 0.025; master.connect(ctx.destination);
        [130.81, 196, 261.63].forEach((frequency, i) => {
          const osc = ctx.createOscillator(); osc.type = "sine"; osc.frequency.value = frequency;
          const gain = ctx.createGain(); gain.gain.value = 0.3;
          const lfo = ctx.createOscillator(); lfo.frequency.value = 0.09 + i * 0.03;
          const depth = ctx.createGain(); depth.gain.value = 0.12;
          lfo.connect(depth); depth.connect(gain.gain); osc.connect(gain); gain.connect(master); osc.start(); lfo.start();
        });
      }
      if (enabled) await context.current.suspend(); else await context.current.resume();
      setEnabled(!enabled); setError("");
    } catch { setError("Ses bu tarayıcıda başlatılamadı."); setEnabled(false); }
  }
  function cue() {
    const ctx = context.current;
    if (!enabled || !ctx || ctx.state !== "running") return;
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.frequency.setValueAtTime(440, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.14);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.018, ctx.currentTime + 0.02); gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
    osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.22);
  }
  return { enabled, toggle, cue, error };
}
