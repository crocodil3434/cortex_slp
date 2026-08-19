"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  KpiCard, LiveAreaChart, DualSEMGBar,
  RespirationCanvas, ZScoreBar, PhaseBadge,
} from "./ChartPrimitives";
import type { SensorPacket } from "@/lib/crocodil/useM105Stream";

// ── Hayden Hiyerarşisi meta verisi ──────────────────────────────────────────
const HAYDEN_LEVELS = [
  {
    id: 1, label: "Respirasyon",   abbr: "L1",
    desc: "Solunum desteği ve subglottik basınç",
    icon: "🫁", color: "#22c55e", accent: "rgba(34,197,94,0.15)",
    metrics: ["resp_waveform", "resp_rate_bpm"],
    normRefs: { resp_rate_bpm: { mean: 14.0, sd: 2.5, unit: "bpm" } },
  },
  {
    id: 2, label: "Fonasyon",      abbr: "L2",
    desc: "Vokal kord titreşimi, MPT ve F0 kararlılığı",
    icon: "🎵", color: "#0d9488", accent: "rgba(13,148,136,0.15)",
    metrics: ["mic_f0_hz", "mic_rms_db"],
    normRefs: { mic_f0_hz: { mean: 210.0, sd: 25.0, unit: "Hz" } },
  },
  {
    id: 3, label: "Rezonans",      abbr: "L3",
    desc: "Velofarengeal kapanma, nazal rezonans dengesi",
    icon: "🔊", color: "#3b82f6", accent: "rgba(59,130,246,0.15)",
    metrics: ["mic_rms_db"],
    normRefs: {},
  },
  {
    id: 4, label: "Artikülasyon",  abbr: "L4",
    desc: "Mandibular ROM, sEMG asimetrisi ve DDK hızı",
    icon: "🦷", color: "#f59e0b", accent: "rgba(245,158,11,0.15)",
    metrics: ["imu_pitch_deg", "semg_left_uv", "semg_right_uv"],
    normRefs: { imu_pitch_deg: { mean: 35.0, sd: 8.0, unit: "°" } },
  },
  {
    id: 5, label: "Prozodi",       abbr: "L5",
    desc: "F0 varyasyonu, vurgulama ve melodik hat",
    icon: "🎼", color: "#a855f7", accent: "rgba(168,85,247,0.15)",
    metrics: ["mic_f0_hz"],
    normRefs: {},
  },
  {
    id: 6, label: "Hız / Ritim",   abbr: "L6",
    desc: "Konuşma hızı, hece süresi tutarlılığı",
    icon: "⚡", color: "#ec4899", accent: "rgba(236,72,153,0.15)",
    metrics: ["mic_voiced"],
    normRefs: {},
  },
  {
    id: 7, label: "Bütünleşim",    abbr: "L7",
    desc: "Tüm basamakların motor senkroni indeksi",
    icon: "🧠", color: "#f97316", accent: "rgba(249,115,22,0.15)",
    metrics: [],
    normRefs: {},
  },
];

// ── Z-score hesabı (tarayıcı tarafı) ─────────────────────────────────────────
function liveZ(val: number, mean: number, sd: number) {
  return sd > 0 ? (val - mean) / sd : null;
}

// ── Hayden Grid Hücresi ──────────────────────────────────────────────────────
function HaydenCell({
  level, isSelected, onClick, displayLatest,
}: {
  level: typeof HAYDEN_LEVELS[number];
  isSelected: boolean;
  onClick: () => void;
  displayLatest: SensorPacket | null;
}) {
  // Kararlı (ortalanmış) değer — titremez
  const val: number | null = displayLatest
    ? (displayLatest[level.metrics[0] as keyof SensorPacket] as number) ?? null
    : null;
  const normRef = Object.values(level.normRefs)[0];
  const z = val !== null && normRef ? liveZ(val, normRef.mean, normRef.sd) : null;
  const alarm = z !== null && Math.abs(z) > 2;

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        padding: "14px 16px",
        borderRadius: 12,
        cursor: "pointer",
        position: "relative",
        overflow: "hidden",
        border: isSelected
          ? `1.5px solid ${level.color}`
          : alarm
          ? "1.5px solid rgba(239,68,68,0.5)"
          : "1px solid rgba(255,255,255,0.07)",
        background: isSelected
          ? level.accent
          : alarm
          ? "rgba(239,68,68,0.06)"
          : "rgba(255,255,255,0.03)",
        textAlign: "left",
        width: "100%",
      }}
    >
      {/* Seçili sol çizgi */}
      {isSelected && (
        <motion.div
          layoutId="hayden-indicator"
          style={{
            position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
            background: level.color, borderRadius: "3px 0 0 3px",
          }}
          transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
        />
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>{level.icon}</span>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{
                fontSize: 9, fontWeight: 800, letterSpacing: "0.1em",
                color: level.color, textTransform: "uppercase",
              }}>
                {level.abbr}
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>
                {level.label}
              </span>
            </div>
          </div>
        </div>

        {/* Anlık değer */}
        {val !== null && (
          <span style={{
            fontSize: 13, fontWeight: 800,
            color: alarm ? "#ef4444" : level.color,
            fontVariantNumeric: "tabular-nums",
            textAlign: "right",
            minWidth: 45,
          }}>
            {typeof val === "boolean" ? (val ? "✓" : "–") : val.toFixed(1)}
            {normRef && <span style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", marginLeft: 2 }}>{normRef.unit}</span>}
          </span>
        )}
      </div>

      {/* Küçük Z-bar */}
      {z !== null && (
        <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
          <motion.div
            animate={{ width: `${Math.min(100, (Math.abs(z) / 4) * 100)}%` }}
            transition={{ duration: 0.15 }}
            style={{
              height: "100%",
              background: alarm ? "#ef4444" : level.color,
              borderRadius: 2,
            }}
          />
        </div>
      )}
    </motion.button>
  );
}

// ── Seçili Basamak Detay Paneli ───────────────────────────────────────────────
function LevelDetailPanel({
  level, window, displayLatest,
}: {
  level: typeof HAYDEN_LEVELS[number];
  window: SensorPacket[];
  displayLatest: SensorPacket | null;
}) {
  const normRef = Object.values(level.normRefs)[0];
  const normKey = Object.keys(level.normRefs)[0] as keyof SensorPacket | undefined;
  const val = displayLatest && normKey ? (displayLatest[normKey] as number) : null;
  const z = val !== null && normRef ? liveZ(val, normRef.mean, normRef.sd) : null;

  return (
    <motion.div
      key={level.id}
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.2 }}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        height: "100%",
      }}
    >
      {/* Başlık */}
      <div style={{
        padding: "16px 20px",
        borderRadius: 12,
        border: `1.5px solid ${level.color}40`,
        background: level.accent,
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}>
        <span style={{ fontSize: 28 }}>{level.icon}</span>
        <div>
          <div style={{ fontSize: 9, color: level.color, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em" }}>
            Hayden (1986) — {level.abbr}
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "rgba(255,255,255,0.9)" }}>{level.label}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>{level.desc}</div>
        </div>
      </div>

      {/* L1 – Solunum Özel */}
      {level.id === 1 && (
        <>
          <RespirationCanvas data={window} />
          {displayLatest && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <KpiCard label="Solunum Hızı" value={displayLatest.resp_rate_bpm.toFixed(1)} unit="bpm"
                warn={displayLatest.resp_rate_bpm < 10 || displayLatest.resp_rate_bpm > 22} />
              <KpiCard label="Dalga formu" value={displayLatest.resp_waveform.toFixed(3)} />
              <KpiCard label="Faz" value={<PhaseBadge phase={displayLatest.session_phase} />} />
            </div>
          )}
          {z !== null && (
            <ZScoreBar label={`Solunum Hızı (Norm: ${normRef?.mean} ± ${normRef?.sd} bpm)`} z={z} />
          )}
        </>
      )}

      {/* L2 – Fonasyon Özel */}
      {level.id === 2 && (
        <>
          <LiveAreaChart data={window} dataKey="mic_f0_hz" color={level.color}
            label="Temel Frekans F0 (Hz)" domain={[0, 350]}
            referenceLines={[
              { y: 85,  color: "#ef444460", label: "Min" },
              { y: 255, color: "#ef444460", label: "Max" },
            ]}
          />
          <LiveAreaChart data={window} dataKey="mic_rms_db" color="#60a5fa"
            label="Ses Şiddeti RMS (dBFS)" domain={[-60, 0]} />
          {displayLatest && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <KpiCard label="F0" value={displayLatest.mic_f0_hz.toFixed(0)} unit="Hz"
                warn={displayLatest.mic_voiced && displayLatest.mic_f0_hz > 0 && (displayLatest.mic_f0_hz < 100 || displayLatest.mic_f0_hz > 280)} />
              <KpiCard label="RMS" value={displayLatest.mic_rms_db.toFixed(1)} unit="dBFS" />
              <KpiCard label="Sesli?" value={displayLatest.mic_voiced ? "Evet" : "Hayır"} />
            </div>
          )}
          {z !== null && <ZScoreBar label="F0 (Kadın normuna göre)" z={z} />}
        </>
      )}

      {/* L3 – Rezonans */}
      {level.id === 3 && (
        <>
          <LiveAreaChart data={window} dataKey="mic_rms_db" color={level.color}
            label="Rezonans Ses Şiddeti Proxy (dBFS)" domain={[-60, 0]} />
          <div style={{ padding: 14, borderRadius: 10, background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.2)" }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
              ℹ️ Hipernazalite indeksi ve F1/F2 formantları ESP32 + mikrofon bağlandığında aktifleşir.
              Şu an simülasyon modunda FFT proxy değerleri kullanılmaktadır.
            </span>
          </div>
        </>
      )}

      {/* L4 – Artikülasyon Özel */}
      {level.id === 4 && (
        <>
          <LiveAreaChart data={window} dataKey="imu_pitch_deg" color={level.color}
            label="Mandibular Çene Açısı — IMU Pitch (°)" domain={[-30, 30]}
            referenceLines={[{ y: 0, color: "rgba(255,255,255,0.2)" }]}
          />
          {displayLatest && (
            <>
              <DualSEMGBar
                left={displayLatest.semg_left_uv}
                right={displayLatest.semg_right_uv}
                asymmetry={displayLatest.semg_asymmetry_pct}
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
                <KpiCard label="Pitch" value={displayLatest.imu_pitch_deg.toFixed(1)} unit="°" />
                <KpiCard label="Roll" value={displayLatest.imu_roll_deg.toFixed(1)} unit="°" />
                <KpiCard label="Sol sEMG" value={displayLatest.semg_left_uv.toFixed(0)} unit="µV" />
                <KpiCard label="Sağ sEMG" value={displayLatest.semg_right_uv.toFixed(0)} unit="µV" />
              </div>
            </>
          )}
          {z !== null && <ZScoreBar label="Mandibular ROM (Norm 35 ± 8°)" z={z} />}
        </>
      )}

      {/* L5 / L6 – Prozodi & Hız */}
      {(level.id === 5 || level.id === 6) && (
        <>
          <LiveAreaChart data={window} dataKey="mic_f0_hz" color={level.color}
            label={level.id === 5 ? "F0 Varyasyonu (Prozodik Zenginlik)" : "Sesli Segment Oranı Proxy"}
            domain={[0, 350]}
          />
          {displayLatest && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <KpiCard label="F0" value={displayLatest.mic_f0_hz.toFixed(0)} unit="Hz" />
              <KpiCard label="Sesli" value={displayLatest.mic_voiced ? "Aktif" : "Sessiz"} />
            </div>
          )}
        </>
      )}

      {/* L7 – Bütünleşim */}
      {level.id === 7 && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {displayLatest && (
              <>
                <KpiCard label="IMU Pitch" value={displayLatest.imu_pitch_deg.toFixed(1)} unit="°" />
                <KpiCard label="F0" value={displayLatest.mic_f0_hz.toFixed(0)} unit="Hz" />
                <KpiCard label="Sol sEMG" value={displayLatest.semg_left_uv.toFixed(0)} unit="µV" />
                <KpiCard label="Resp. Hız" value={displayLatest.resp_rate_bpm.toFixed(1)} unit="bpm" />
              </>
            )}
          </div>
          <div style={{ padding: 14, borderRadius: 10, background: "rgba(249,115,22,0.07)", border: "1px solid rgba(249,115,22,0.2)" }}>
            <div style={{ fontSize: 10, color: "#f97316", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
              Motor Senkroni Analizi
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
              IMU ↔ sEMG ↔ Mikrofon faz uyumu metrikleri seans sonu özet raporunda hesaplanacak.
              Python signal_processor.py'den alınan Z-skorlar Adım 3 tablosunda görüntülendi.
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}

// ── Ana Klinisyen Görünümü Bileşeni ──────────────────────────────────────────
export function CliniciansView({
  latest,
  displayLatest,
  window: windowPkts,
}: {
  latest: SensorPacket | null;
  displayLatest?: SensorPacket | null;
  window: SensorPacket[];
}) {
  const [selectedLevel, setSelectedLevel] = useState(4);
  const activeLevel = HAYDEN_LEVELS.find((l) => l.id === selectedLevel)!;

  return (
    <div style={{ display: "flex", gap: 16, height: "100%", overflow: "hidden" }}>
      {/* ── Sol: 7 Basamak Grid ── */}
      <div style={{
        width: 240,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        gap: 6,
        overflowY: "auto",
      }}>
        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, padding: "0 4px 6px" }}>
          Hayden (1986) Hiyerarşisi
        </div>
        {HAYDEN_LEVELS.map((lvl) => (
          <HaydenCell
            key={lvl.id}
            level={lvl}
            isSelected={selectedLevel === lvl.id}
            onClick={() => setSelectedLevel(lvl.id)}
            displayLatest={displayLatest ?? null}
          />
        ))}
      </div>

      {/* ── Sağ: Canlı Grafik Paneli ── */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <AnimatePresence mode="wait">
          <LevelDetailPanel
            key={selectedLevel}
            level={activeLevel}
            window={windowPkts}
            displayLatest={displayLatest ?? null}
          />
        </AnimatePresence>
      </div>
    </div>
  );
}
