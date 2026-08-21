"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, Zap, Target, RefreshCw, AlertTriangle,
  Volume2, Mic, CheckCircle2, Play, Square, Sparkles,
  Layers, Gauge, ArrowDownUp, Waves, Cpu
} from "lucide-react";
import {
  KpiCard, LiveAreaChart, DualSEMGBar,
  RespirationCanvas, ZScoreBar, PhaseBadge,
} from "./ChartPrimitives";
import type { SensorPacket } from "@/lib/crocodil/useM105Stream";

// ── Evrensel Nöromotor Fonksiyon Basamakları ──────────────────────────────────
export const CLINICAL_STEPS = [
  {
    id: 0, label: "Yapısal İstirahat", abbr: "YAP",
    desc: "Maksillofasiyal & kraniofasiyal statik postür ve simetri",
    icon: "📐", color: "#64748b", accent: "rgba(100,116,139,0.15)",
    metrics: ["imu_pitch_deg", "semg_left_uv"],
    normRefs: {},
  },
  {
    id: 1, label: "Basamak I: Temel Tonus & Postür", abbr: "B1",
    desc: "Solunum desteği, subglottik basınç ve postüral stabilite",
    icon: "🫁", color: "#22c55e", accent: "rgba(34,197,94,0.15)",
    metrics: ["resp_waveform", "resp_rate_bpm"],
    normRefs: { resp_rate_bpm: { mean: 14.0, sd: 2.5, unit: "bpm" } },
  },
  {
    id: 2, label: "Basamak II: Vokal Uzama & Rezonans", abbr: "B2",
    desc: "Vokal kord titreşimi, MPT ve F0 kararlılığı",
    icon: "🎵", color: "#0d9488", accent: "rgba(13,148,136,0.15)",
    metrics: ["mic_f0_hz", "mic_rms_db"],
    normRefs: { mic_f0_hz: { mean: 210.0, sd: 25.0, unit: "Hz" } },
  },
  {
    id: 3, label: "Basamak III: Mandibular Kinematik", abbr: "B3",
    desc: "Sagittal planda çene dikey hareket açıklığı (ROM) ve stabilite",
    icon: "🦷", color: "#f59e0b", accent: "rgba(245,158,11,0.15)",
    metrics: ["imu_pitch_deg", "semg_left_uv"],
    normRefs: { imu_pitch_deg: { mean: 35.0, sd: 8.0, unit: "°" } },
  },
  {
    id: 4, label: "Basamak IV: Labio-Fasial Aktivasyon", abbr: "B4",
    desc: "Koronal/transvers dudak yuvarlama, yayma ve bilabial oklüzyon",
    icon: "👄", color: "#ec4899", accent: "rgba(236,72,153,0.15)",
    metrics: ["semg_left_uv", "semg_right_uv"],
    normRefs: { semg_left_uv: { mean: 45.0, sd: 12.0, unit: "µV" } },
  },
  {
    id: 5, label: "Basamak V: Lingual Artikülasyon", abbr: "B5",
    desc: "Horizontal dil ucu elevasyonu ve dil kökü/gövdesi kontrolü",
    icon: "👅", color: "#3b82f6", accent: "rgba(59,130,246,0.15)",
    metrics: ["mic_f0_hz", "mic_rms_db"],
    normRefs: {},
  },
  {
    id: 6, label: "Basamak VI: Koartikülasyon & Ardışık", abbr: "B6",
    desc: "Hece geçişleri, DDK hızı ve Motor Arama (Groping) analizi",
    icon: "⚡", color: "#8b5cf6", accent: "rgba(139,92,246,0.15)",
    metrics: ["motor_acoustic_latency_ms", "imu_pitch_deg"],
    normRefs: { motor_acoustic_latency_ms: { mean: 120.0, sd: 40.0, unit: "ms" } },
  },
  {
    id: 7, label: "Basamak VII: Vokal Melodi & Prosodi", abbr: "B7",
    desc: "Cümle içi tonlama, perde modülasyonu ve motor senkroni",
    icon: "🧠", color: "#f97316", accent: "rgba(249,115,22,0.15)",
    metrics: ["mic_f0_hz"],
    normRefs: {},
  },
];

export interface FusionReportData {
  duration_s: number;
  packet_count: number;
  groping_episodes_count: number;
  mean_motor_acoustic_latency_ms: number;
  mandibular_rom_deg: number;
  max_semg_uv: number;
  synchrony_score_pct: number;
  groping_risk_level: string;
}

export function CliniciansView({
  latest,
  displayLatest,
  window: pkts,
  selectedLevel,
  onSelectLevel,
  onCalibrateMpu,
  onStartFusion,
  onStopFusion,
  isFusionRecording,
  fusionReport,
}: {
  latest: SensorPacket | null;
  displayLatest: SensorPacket | null;
  window: SensorPacket[];
  selectedLevel: number;
  onSelectLevel: (lvl: number) => void;
  onCalibrateMpu?: () => void;
  onStartFusion?: () => void;
  onStopFusion?: () => void;
  isFusionRecording?: boolean;
  fusionReport?: FusionReportData | null;
}) {
  const activeStep = CLINICAL_STEPS.find((s) => s.id === selectedLevel) || CLINICAL_STEPS[3];
  const [isCalibrating, setIsCalibrating] = useState(false);

  const handleCalibrateClick = async () => {
    setIsCalibrating(true);
    try {
      if (onCalibrateMpu) onCalibrateMpu();
    } finally {
      setTimeout(() => setIsCalibrating(false), 800);
    }
  };

  // Canlı Groping Değerleri
  const isGroping = Boolean((latest as any)?.groping_detected);
  const latencyMs = Number((latest as any)?.motor_acoustic_latency_ms || 0);
  const gropingCount = Number((latest as any)?.groping_episodes_count || 0);
  const isCalibrated = Boolean((latest as any)?.is_calibrated);

  // ── DİNAMİK GRAFİK VE VERİ KAYNAĞI YAPILANDIRMASI ─────────────────────────
  // 1. Basamak III (Mandibular Kinematik): MPU6050 Pitch verisi (°)
  // 2. Basamak I (Temel Tonus) & Basamak IV (Labio-Fasial): AD8232 sEMG verisi (µV)
  // 3. Basamak II, V, VI, VII (Akustik, Lingual, Koartikülasyon, Prosodi): INMP441 I2S Mikrofon (dBFS)
  // 4. Yapısal İstirahat (0): Statik İstirahat & Simetri Özeti Kartı
  const isStructuralRest = selectedLevel === 0;

  let chartTitle = "";
  let chartDataKey: keyof SensorPacket = "imu_pitch_deg";
  let chartUnit = "";
  let chartMin: number | undefined = undefined;
  let chartMax: number | undefined = undefined;
  let chartLiveValDisplay = "";

  if (selectedLevel === 3) {
    chartTitle = "MANDİBULAR ÇENE AÇISI (SAGİTTAL PİTCH °) & KİNEMATİK DALGA FORMU";
    chartDataKey = "imu_pitch_deg";
    chartUnit = "°";
    chartMin = -10;
    chartMax = 45;
    chartLiveValDisplay = `${displayLatest?.imu_pitch_deg?.toFixed(1) ?? "0.0"}°`;
  } else if (selectedLevel === 1 || selectedLevel === 4) {
    chartTitle = "KAS AKTİVASYONU (sEMG) & MOTOR EFOR DALGA FORMU";
    chartDataKey = "semg_left_uv";
    chartUnit = "µV";
    chartMin = 0;
    chartMax = 200;
    chartLiveValDisplay = `${displayLatest?.semg_left_uv?.toFixed(0) ?? "0"} µV`;
  } else if (selectedLevel === 2 || selectedLevel === 5 || selectedLevel === 6 || selectedLevel === 7) {
    chartTitle = "AKUSTİK & VOKAL DALGA FORMU (I2S)";
    chartDataKey = "mic_rms_db";
    chartUnit = "dBFS";
    chartMin = -60;
    chartMax = 0;
    const isVocal = Boolean(displayLatest?.mic_voiced);
    chartLiveValDisplay = `${displayLatest?.mic_rms_db?.toFixed(1) ?? "-60.0"} dBFS ${isVocal ? "🎙️ (Ses Aktif)" : "🔇 (Sessiz)"}`;
  }

  return (
    <div style={{ display: "flex", gap: 16, height: "100%", overflow: "hidden" }}>
      {/* ── SOL SÜTUN: 8 Basamaklı Fonksiyon Listesi ────────────────────────── */}
      <div
        style={{
          width: 280,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          gap: 6,
          overflowY: "auto",
          paddingRight: 4,
        }}
      >
        <div style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", padding: "4px 8px" }}>
          Nöromotor Fonksiyon Basamakları
        </div>

        {CLINICAL_STEPS.map((step) => {
          const isSelected = step.id === selectedLevel;

          return (
            <button
              key={step.id}
              onClick={() => onSelectLevel(step.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 12px",
                borderRadius: 12,
                border: isSelected ? `1px solid ${step.color}` : "1px solid rgba(255,255,255,0.06)",
                background: isSelected ? step.accent : "rgba(255,255,255,0.02)",
                color: isSelected ? "white" : "rgba(255,255,255,0.6)",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.2s",
                position: "relative",
              }}
            >
              <span style={{ fontSize: 16 }}>{step.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: isSelected ? "white" : "rgba(255,255,255,0.85)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {step.label}
                </div>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 2 }}>
                  {step.desc}
                </div>
              </div>
              {isSelected && (
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: step.color, boxShadow: `0 0 8px ${step.color}` }} />
              )}
            </button>
          );
        })}
      </div>

      {/* ── SAĞ SÜTUN: Seçili Basamağa Özel Canlı Ölçüm & Kontrol Paneli ────── */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>
        {/* Basamak Başlığı & Aksiyon Barı */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 18px",
            borderRadius: 14,
            background: "rgba(255,255,255,0.03)",
            border: `1px solid ${activeStep.color}40`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 24, padding: "6px 10px", borderRadius: 10, background: activeStep.accent }}>
              {activeStep.icon}
            </span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "white" }}>
                {activeStep.label}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>
                {activeStep.desc}
              </div>
            </div>
          </div>

          {/* ── BASAMAK III ÖZEL: Mandibular MPU Kalibrasyon Butonu ── */}
          {selectedLevel === 3 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {isCalibrated && (
                <span style={{ fontSize: 10, color: "#14b8a6", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                  <CheckCircle2 size={12} /> Çene Sıfırlandı
                </span>
              )}
              <button
                onClick={handleCalibrateClick}
                disabled={isCalibrating}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 14px",
                  borderRadius: 10,
                  fontSize: 11,
                  fontWeight: 800,
                  cursor: "pointer",
                  border: "1px solid #f59e0b",
                  background: "linear-gradient(135deg, #b45309, #f59e0b)",
                  color: "white",
                  boxShadow: "0 2px 10px rgba(245,158,11,0.3)",
                  transition: "all 0.2s",
                }}
              >
                <Target size={12} className={isCalibrating ? "animate-spin" : ""} />
                {isCalibrating ? "Sıfırlanıyor..." : "Çeneyi Kalibre Et (Sıfırla)"}
              </button>
            </div>
          )}

          {/* ── BASAMAK VI & VII ÖZEL: C Grubu Füzyon Kayıt Butonu ── */}
          {(selectedLevel === 6 || selectedLevel === 7) && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {isFusionRecording ? (
                <button
                  onClick={onStopFusion}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    padding: "6px 14px",
                    borderRadius: 10,
                    fontSize: 11,
                    fontWeight: 800,
                    cursor: "pointer",
                    border: "1px solid #ef4444",
                    background: "linear-gradient(135deg, #b91c1c, #ef4444)",
                    color: "white",
                    boxShadow: "0 0 14px rgba(239,68,68,0.4)",
                    transition: "all 0.2s",
                  }}
                >
                  <Square size={11} fill="white" />
                  <span>Füzyon Kaydını Bitir</span>
                </button>
              ) : (
                <button
                  onClick={onStartFusion}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 14px",
                    borderRadius: 10,
                    fontSize: 11,
                    fontWeight: 800,
                    cursor: "pointer",
                    border: "1px solid #8b5cf6",
                    background: "linear-gradient(135deg, #6d28d9, #8b5cf6)",
                    color: "white",
                    boxShadow: "0 2px 12px rgba(139,92,246,0.3)",
                    transition: "all 0.2s",
                  }}
                >
                  <Zap size={11} fill="white" />
                  <span>Füzyon Kaydını Başlat</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── BASAMAK VI ÖZEL: Canlı Groping (Motor Arama) Uyarı Paneli ──────── */}
        {selectedLevel === 6 && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              background: isGroping ? "rgba(239,68,68,0.15)" : "rgba(139,92,246,0.08)",
              border: isGroping ? "1px solid #ef4444" : "1px solid rgba(139,92,246,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              transition: "all 0.3s",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: isGroping ? "#ef4444" : "#8b5cf6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  boxShadow: isGroping ? "0 0 16px #ef4444" : "none",
                }}
              >
                {isGroping ? <AlertTriangle size={18} /> : <Cpu size={18} />}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: isGroping ? "#fca5a5" : "white" }}>
                  {isGroping ? "⚠️ Groping (Motor Konuşma Araması) Tespit Edildi!" : "Koartikülasyon Motor-Akustik Eşzamanlılığı"}
                </div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>
                  {isGroping
                    ? "Motor efor (sEMG / Çene) başladığı halde 400ms içinde ses çıktısı oluşamadı."
                    : "Motor planlama ve ses çıkışı normal eşik aralığında (<400ms)."}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 16, textAlign: "right" }}>
              <div>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>Gecikme</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: isGroping ? "#ef4444" : "#a78bfa", fontVariantNumeric: "tabular-nums" }}>
                  {latencyMs.toFixed(0)} ms
                </div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>Vaka Sayısı</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: gropingCount > 0 ? "#f59e0b" : "#14b8a6", fontVariantNumeric: "tabular-nums" }}>
                  {gropingCount}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── C Grubu Füzyon Kayıt Sonuç Raporu Kartı ── */}
        {fusionReport && (
          <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(13,148,136,0.1)", border: "1px solid #14b8a6", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            <div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)" }}>Süre / Paket</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "white" }}>{fusionReport.duration_s}s ({fusionReport.packet_count} pkt)</div>
            </div>
            <div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)" }}>Ort. Motor Gecikme</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b" }}>{fusionReport.mean_motor_acoustic_latency_ms} ms</div>
            </div>
            <div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)" }}>Senkroni İndeksi</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#14b8a6" }}>%{fusionReport.synchrony_score_pct}</div>
            </div>
            <div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)" }}>Groping Riski</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: fusionReport.groping_risk_level === "Yüksek" ? "#ef4444" : "#22c55e" }}>
                {fusionReport.groping_risk_level} ({fusionReport.groping_episodes_count} vaka)
              </div>
            </div>
          </div>
        )}

        {/* ── DİNAMİK ANA GRAFİK VEYA YAPISAL İSTİRAHAT KARTI ───────────────── */}
        {isStructuralRest ? (
          /* 4. Yapısal İstirahat: Statik İstirahat & Simetri Özeti Kartı */
          <div
            style={{
              flex: 1,
              minHeight: 260,
              padding: 18,
              borderRadius: 14,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(100,116,139,0.3)",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                📐 Maksillofasiyal ve Kraniofasiyal İstirahat Postür & Simetri Özeti
              </div>
              <span style={{ fontSize: 10, color: "#64748b", fontWeight: 700 }}>Statik Referans Analizi</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, flex: 1 }}>
              <div style={{ padding: 14, borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>Fasiyal İstirahat Simetrisi</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: (displayLatest?.semg_asymmetry_pct ?? 0) > 25 ? "#ef4444" : "#14b8a6", marginTop: 4 }}>
                  %{(100 - (displayLatest?.semg_asymmetry_pct ?? 0)).toFixed(1)}
                </div>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
                  Asimetri Sapması: %{displayLatest?.semg_asymmetry_pct?.toFixed(1) ?? "0.0"}
                </div>
              </div>

              <div style={{ padding: 14, borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>Mandibular İstirahat Açısı</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "white", marginTop: 4 }}>
                  {displayLatest?.imu_pitch_deg?.toFixed(1) ?? "0.0"}°
                </div>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
                  Lateral Eğim: {displayLatest?.imu_roll_deg?.toFixed(1) ?? "0.0"}°
                </div>
              </div>

              <div style={{ padding: 14, borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>Bazal İstirahat Tonusu</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#f59e0b", marginTop: 4 }}>
                  {displayLatest?.semg_left_uv?.toFixed(0) ?? "0"} µV
                </div>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
                  Referans İstirahat: 10 - 35 µV
                </div>
              </div>
            </div>

            <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(100,116,139,0.08)", border: "1px solid rgba(100,116,139,0.15)", fontSize: 10, color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>
              💡 <strong>Klinik Not:</strong> Yapısal istirahat aşamasında time-series dalga formu yerine statik kranial simetri, postüral hizalanma ve interoklüzal aralık stabilitesi değerlendirilir.
            </div>
          </div>
        ) : (
          /* Dinamik Zaman Serisi Dalga Formu Grafiği (Basamak 1 - 7) */
          <div
            style={{
              padding: 14,
              borderRadius: 14,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.85)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {chartTitle}
              </div>
              <div style={{ fontSize: 10, color: activeStep.color, fontWeight: 800 }}>
                Anlık: {chartLiveValDisplay}
              </div>
            </div>

            <div style={{ width: "100%", height: 150, position: "relative" }}>
              <LiveAreaChart
                data={pkts}
                dataKey={chartDataKey}
                color={activeStep.color}
                min={chartMin}
                max={chartMax}
                height={150}
              />
            </div>
          </div>
        )}

        {/* ── Alt KPI ve sEMG / Akustik Kartları ─────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {/* sEMG Masseter Aktivasyon Barı */}
          <div style={{ padding: 14, borderRadius: 14, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", marginBottom: 8 }}>
              Masseter sEMG Kas Aktivasyonu (µV)
            </div>
            <DualSEMGBar
              left={displayLatest?.semg_left_uv ?? 0}
              right={displayLatest?.semg_right_uv ?? 0}
              asymmetry={displayLatest?.semg_asymmetry_pct ?? 0}
            />
          </div>

          {/* Anlık Metrikler (Kinematik veya Akustik) */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {selectedLevel === 2 || selectedLevel === 5 || selectedLevel === 6 || selectedLevel === 7 ? (
              <>
                <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>Ses Şiddeti (RMS)</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#14b8a6", marginTop: 4 }}>
                    {displayLatest?.mic_rms_db?.toFixed(1) ?? "-60.0"} dB
                  </div>
                </div>
                <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>Vokal Aktivite (VAD)</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: displayLatest?.mic_voiced ? "#22c55e" : "rgba(255,255,255,0.4)", marginTop: 4 }}>
                    {displayLatest?.mic_voiced ? "🎙️ Ses Var" : "🔇 Sessiz"}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>Çene Açısı (Pitch)</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "white", marginTop: 4 }}>
                    {displayLatest?.imu_pitch_deg?.toFixed(1) ?? "0.0"}°
                  </div>
                </div>
                <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>Lateral Açı (Roll)</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "white", marginTop: 4 }}>
                    {displayLatest?.imu_roll_deg?.toFixed(1) ?? "0.0"}°
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
