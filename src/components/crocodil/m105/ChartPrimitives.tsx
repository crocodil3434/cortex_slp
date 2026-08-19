"use client";

import React, { useRef, useEffect, useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { SensorPacket } from "@/lib/crocodil/useM105Stream";

// ── Ortak tasarım token'ları ─────────────────────────────────────────────────
const C = {
  teal:    "#0d9488",
  teal2:   "#14b8a6",
  amber:   "#f59e0b",
  red:     "#ef4444",
  green:   "#22c55e",
  blue:    "#3b82f6",
  purple:  "#a855f7",
  text:    "rgba(255,255,255,0.85)",
  muted:   "rgba(255,255,255,0.35)",
  grid:    "rgba(255,255,255,0.06)",
  surface: "rgba(255,255,255,0.04)",
  border:  "rgba(13,148,136,0.25)",
};

// ── Mini Sayısal KPI Kartı ───────────────────────────────────────────────────
export function KpiCard({
  label, value, unit, danger, warn,
}: {
  label: string; value: string | number | React.ReactNode; unit?: string;
  danger?: boolean; warn?: boolean;
}) {
  const color = danger ? C.red : warn ? C.amber : C.teal2;
  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${danger ? "rgba(239,68,68,0.3)" : warn ? "rgba(245,158,11,0.3)" : C.border}`,
        borderRadius: 12,
        padding: "10px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 2,
        minWidth: 90,
      }}
    >
      <span style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
        {label}
      </span>
      <span style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
        {value}
        {unit && <span style={{ fontSize: 11, fontWeight: 500, color: C.muted, marginLeft: 3 }}>{unit}</span>}
      </span>
    </div>
  );
}

// ── Gerçek Zamanlı Alan Grafiği (Recharts AreaChart) ────────────────────────
export function LiveAreaChart({
  data, dataKey, color, label, min, max, domain,
  referenceLines,
}: {
  data: SensorPacket[];
  dataKey: keyof SensorPacket;
  color: string;
  label: string;
  min?: number;
  max?: number;
  domain?: [number | "auto", number | "auto"];
  referenceLines?: { y: number; label?: string; color?: string }[];
}) {
  const pts = useMemo(() => {
    return data.map((p, i) => ({
      t: i,
      v: typeof p[dataKey] === "number" ? (p[dataKey] as number) : 0,
    }));
  }, [data, dataKey]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {label}
      </span>
      <ResponsiveContainer width="100%" height={68}>
        <AreaChart data={pts} margin={{ top: 2, right: 0, left: -28, bottom: 0 }}>
          <defs>
            <linearGradient id={`grad-${dataKey as string}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.35} />
              <stop offset="95%" stopColor={color} stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
          <YAxis domain={domain ?? [min ?? "auto", max ?? "auto"]} tick={{ fontSize: 8, fill: C.muted }} />
          <Tooltip
            contentStyle={{ background: "#0f2027", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 11 }}
            labelStyle={{ color: C.muted }}
            itemStyle={{ color }}
            formatter={(v: unknown) => [(v as number).toFixed(2), label] as [string, string]}
            labelFormatter={() => ""}
          />
          {referenceLines?.map((rl, i) => (
            <ReferenceLine key={i} y={rl.y} stroke={rl.color ?? C.amber} strokeDasharray="3 3" />
          ))}
          <Area
            type="monotone" dataKey="v" stroke={color} strokeWidth={1.5}
            fill={`url(#grad-${dataKey as string})`} dot={false} isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── İkili sEMG Bar Grafiği ───────────────────────────────────────────────────
export function DualSEMGBar({ left, right, asymmetry }: {
  left: number; right: number; asymmetry: number;
}) {
  const maxVal = 120;
  const leftPct  = Math.min(100, (left / maxVal) * 100);
  const rightPct = Math.min(100, (right / maxVal) * 100);
  const dangerAsymm = asymmetry > 25;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
          sEMG Masseter
        </span>
        <span style={{ fontSize: 9, color: dangerAsymm ? C.red : C.muted }}>
          Asimetri: %{asymmetry.toFixed(1)}
        </span>
      </div>

      {/* Sol */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 9, color: C.muted, width: 26, textAlign: "right" }}>SOL</span>
        <div style={{ flex: 1, height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${leftPct}%`, borderRadius: 4,
            background: `linear-gradient(90deg, ${C.teal}, ${C.teal2})`,
            transition: "width 0.08s linear",
          }} />
        </div>
        <span style={{ fontSize: 9, color: C.text, width: 36 }}>{left.toFixed(0)} µV</span>
      </div>

      {/* Sağ */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 9, color: C.muted, width: 26, textAlign: "right" }}>SAĞ</span>
        <div style={{ flex: 1, height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${rightPct}%`, borderRadius: 4,
            background: `linear-gradient(90deg, ${C.blue}, #60a5fa)`,
            transition: "width 0.08s linear",
          }} />
        </div>
        <span style={{ fontSize: 9, color: C.text, width: 36 }}>{right.toFixed(0)} µV</span>
      </div>
    </div>
  );
}

// ── Faz Rozeti ───────────────────────────────────────────────────────────────
export function PhaseBadge({ phase }: { phase: string }) {
  const map: Record<string, { color: string; bg: string; label: string }> = {
    "istirahat":    { color: "#22c55e", bg: "rgba(34,197,94,0.12)",   label: "İSTİRAHAT" },
    "görev":        { color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  label: "GÖREV" },
    "toparlanma":   { color: "#3b82f6", bg: "rgba(59,130,246,0.12)",  label: "TOPARLANMA" },
  };
  const s = map[phase] ?? { color: C.muted, bg: C.surface, label: phase.toUpperCase() };
  return (
    <span style={{
      fontSize: 9, fontWeight: 800, letterSpacing: "0.12em",
      padding: "3px 8px", borderRadius: 99,
      color: s.color, background: s.bg, border: `1px solid ${s.color}30`,
    }}>
      {s.label}
    </span>
  );
}

// ── Z-Score çubuk göstergesi ─────────────────────────────────────────────────
export function ZScoreBar({
  label, z, unit,
}: { label: string; z: number | null; unit?: string }) {
  if (z === null) return null;
  const clampZ = Math.max(-4, Math.min(4, z));
  const pct    = ((clampZ + 4) / 8) * 100;
  const color  = Math.abs(z) > 2 ? C.red : Math.abs(z) > 1.5 ? C.amber : C.teal2;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 9, color: C.muted, fontWeight: 700, textTransform: "uppercase" }}>{label}</span>
        <span style={{ fontSize: 9, color, fontWeight: 800 }}>
          Z={z > 0 ? "+" : ""}{z.toFixed(2)}{unit ? ` ${unit}` : ""}
        </span>
      </div>
      <div style={{ position: "relative", height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3 }}>
        {/* Centre line at 50% */}
        <div style={{
          position: "absolute", top: -1, left: "50%", width: 1, height: 8,
          background: "rgba(255,255,255,0.15)",
        }} />
        <div style={{
          position: "absolute", top: 0, left: `${pct}%`,
          width: 8, height: 6, borderRadius: 3,
          background: color,
          transform: "translateX(-50%)",
          transition: "left 0.2s ease",
        }} />
      </div>
    </div>
  );
}

// ── Solunum Dalga Formu (Canvas) ─────────────────────────────────────────────
export function RespirationCanvas({ data }: { data: SensorPacket[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Arka plan grid
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = (H / 4) * i;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    const pts = data.map((p) => p.resp_waveform);
    const min = Math.min(...pts, -1);
    const max = Math.max(...pts, 1);
    const range = max - min || 2;

    // Sinyal çizgisi
    const gradient = ctx.createLinearGradient(0, 0, W, 0);
    gradient.addColorStop(0, "rgba(13,148,136,0.2)");
    gradient.addColorStop(0.7, C.teal);
    gradient.addColorStop(1, C.teal2);

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = C.teal;
    ctx.shadowBlur = 4;
    ctx.beginPath();

    pts.forEach((v, i) => {
      const x = (i / (pts.length - 1)) * W;
      const y = H - ((v - min) / range) * H;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.shadowBlur = 0;
  }, [data]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
        Piezo Solunum Dalga Formu
      </span>
      <canvas
        ref={canvasRef}
        width={320}
        height={60}
        style={{ width: "100%", height: 60, borderRadius: 8, background: "rgba(0,0,0,0.2)" }}
      />
    </div>
  );
}
