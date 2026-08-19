"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from "recharts";
import type { SensorPacket } from "@/lib/crocodil/useM105Stream";
import { KpiCard } from "./ChartPrimitives";

// ── Ailece okunabilir norm referansları ──────────────────────────────────────
const FAMILY_METRICS = [
  {
    key: "resp_rate_bpm",
    label: "Nefes Hızı",
    unit: "nefes/dak",
    friendlyName: "Nefes Desteği",
    norm: 14.0,
    normRange: [10, 22] as [number, number],
    description: "Konuşma sırasındaki nefes alma hızı. Normal erişkinlerde 10–22 nefes/dak.",
    icon: "🫁",
    color: "#22c55e",
  },
  {
    key: "mic_f0_hz",
    label: "Ses Tonu (F0)",
    unit: "Hz",
    friendlyName: "Ses Kalitesi",
    norm: 210.0,
    normRange: [150, 270] as [number, number],
    description: "Temel konuşma sesinin frekansı. Yaşa ve cinsiyete göre değişir.",
    icon: "🎵",
    color: "#0d9488",
  },
  {
    key: "imu_pitch_deg",
    label: "Çene Hareketi",
    unit: "°",
    friendlyName: "Ağız Açıklığı",
    norm: 35.0,
    normRange: [20, 50] as [number, number],
    description: "Konuşma sırasında çenenin ne kadar açıldığı. Yetersiz açılma anlaşılırlığı düşürür.",
    icon: "🦷",
    color: "#f59e0b",
  },
  {
    key: "mic_rms_db",
    label: "Ses Şiddeti",
    unit: "dBFS",
    friendlyName: "Ses Yüksekliği",
    norm: -25.0,
    normRange: [-40, -15] as [number, number],
    description: "Konuşma sesinin güçlülüğü. Çok alçak ses anlaşılırlığı azaltır.",
    icon: "📢",
    color: "#3b82f6",
  },
];

// ── Norm karşılaştırma çubuğu ─────────────────────────────────────────────────
function NormComparisonBar({
  metric, value,
}: {
  metric: typeof FAMILY_METRICS[number];
  value: number | null;
}) {
  const isInRange = value !== null &&
    value >= metric.normRange[0] && value <= metric.normRange[1];
  const isLow  = value !== null && value < metric.normRange[0];

  const color = value === null ? "rgba(255,255,255,0.2)"
    : isInRange ? metric.color
    : isLow     ? "#ef4444"
    : "#f59e0b";

  const statusLabel = value === null ? "Bağlanıyor..."
    : isInRange ? "Normal aralıkta ✓"
    : isLow     ? "Beklentinin altında ↓"
    : "Beklentinin üstünde ↑";

  // Bar grafik verisi: [Alt Norm, Hasta Değeri, Üst Norm] oransal
  const chartData = [
    { name: "Alt sınır", val: metric.normRange[0] },
    { name: "Ölçüm",     val: value ?? metric.norm },
    { name: "Üst sınır", val: metric.normRange[1] },
    { name: "Norm",      val: metric.norm },
  ];

  const friendlyVal = value !== null
    ? `${typeof value === "number" && value < 0 ? value.toFixed(0) : value.toFixed(1)} ${metric.unit}`
    : "—";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
        overflow: "hidden",
      }}
    >
      {/* Üst başlık */}
      <div style={{
        padding: "14px 16px 10px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 12,
        background: "rgba(255,255,255,0.02)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>{metric.icon}</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.9)" }}>
              {metric.friendlyName}
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 2, lineHeight: 1.4, maxWidth: 260 }}>
              {metric.description}
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color }}>
            {friendlyVal}
          </div>
          <div style={{
            fontSize: 9, fontWeight: 700, color,
            textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 2,
          }}>
            {statusLabel}
          </div>
        </div>
      </div>

      {/* Bar grafik */}
      <div style={{ padding: "12px 16px 4px" }}>
        <ResponsiveContainer width="100%" height={55}>
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="name" tick={{ fontSize: 8, fill: "rgba(255,255,255,0.3)" }} />
            <YAxis tick={{ fontSize: 8, fill: "rgba(255,255,255,0.3)" }} />
            <Tooltip
              contentStyle={{ background: "#0f2027", border: "1px solid rgba(13,148,136,0.3)", borderRadius: 8, fontSize: 11 }}
              itemStyle={{ color: metric.color }}
              formatter={(v: unknown) => [`${(v as number).toFixed(1)} ${metric.unit}`, ""] as [string, string]}
            />
            <ReferenceLine y={metric.norm} stroke={metric.color} strokeDasharray="4 4" strokeOpacity={0.5} />
            <Bar dataKey="val" radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={false}>
              {chartData.map((entry, index) => (
                <Cell
                  key={index}
                  fill={
                    entry.name === "Ölçüm" ? color :
                    entry.name === "Norm"  ? metric.color :
                    "rgba(255,255,255,0.12)"
                  }
                  fillOpacity={entry.name === "Ölçüm" ? 0.9 : entry.name === "Norm" ? 0.5 : 0.3}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}

// ── Gemini AI Yorum Alanı ─────────────────────────────────────────────────────
function GeminiPlaceholder() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        padding: "20px 24px",
        borderRadius: 14,
        border: "1.5px dashed rgba(217,119,6,0.35)",
        background: "rgba(217,119,6,0.04)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 20 }}>✨</span>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#fbbf24", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Gemini AI Klinik Yorum
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 1 }}>
            Motor konuşma değerlendirme özeti — aile için sadeleştirilmiş dil
          </div>
        </div>
        <span style={{
          marginLeft: "auto", fontSize: 9, fontWeight: 700,
          padding: "3px 8px", borderRadius: 99,
          color: "#fbbf24", background: "rgba(217,119,6,0.2)",
          border: "1px solid rgba(217,119,6,0.3)",
        }}>
          YAKINDA
        </span>
      </div>

      {/* Yer tutucu metin blokları */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {[90, 75, 60].map((w, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(251,191,36,0.4)", flexShrink: 0 }} />
            <div style={{
              height: 10, width: `${w}%`,
              background: "rgba(251,191,36,0.1)",
              borderRadius: 4,
            }} />
          </div>
        ))}
      </div>

      <div style={{
        marginTop: 16, padding: "10px 14px", borderRadius: 8,
        background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)",
        fontFamily: "monospace", fontSize: 11, color: "rgba(255,255,255,0.35)",
        lineHeight: 1.7,
      }}>
        <span style={{ color: "#fbbf24" }}>// Gemini API Yorum Çıktısı Buraya Gelecek</span>
        {"\n"}
        <span style={{ color: "#a855f7" }}>await</span>
        {" generateFamilyReport(sessionData, zScores, locale: "}
        <span style={{ color: "#22c55e" }}>&quot;tr-TR&quot;</span>
        {");"}
      </div>
    </motion.div>
  );
}

// ── Ana Aile Raporu Bileşeni ──────────────────────────────────────────────────
export function FamilyReportView({
  latest,
  packetCount,
}: {
  latest: SensorPacket | null;
  packetCount: number;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Başlık */}
      <div style={{
        padding: "16px 20px",
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 }}>
            Modül 105 — Aile Raporu
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "rgba(255,255,255,0.9)", marginTop: 2 }}>
            Değerlendirme Özeti
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <KpiCard label="Paket" value={packetCount} />
        </div>
      </div>

      {/* Norm karşılaştırma grafikleri */}
      <div style={{
        fontSize: 9, color: "rgba(255,255,255,0.3)",
        textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700,
      }}>
        Norm Yaş Grubu Karşılaştırması
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {FAMILY_METRICS.map((metric) => (
          <NormComparisonBar
            key={metric.key}
            metric={metric}
            value={latest ? (latest[metric.key as keyof SensorPacket] as number) : null}
          />
        ))}
      </div>

      {/* Gemini placeholder */}
      <GeminiPlaceholder />
    </div>
  );
}
