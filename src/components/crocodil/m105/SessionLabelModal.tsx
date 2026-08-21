"use client";

/**
 * SessionLabelModal — Gözetimli Öğrenme Etiketleme Paneli
 * ========================================================
 * "Seansı Kaydet" butonuna basıldığında açılan 3 bölmeli modal:
 *
 *  Bölüm 1 — Aletsel Veri (Read-only)
 *    Python API'sinden dönen Z-skorları ve norm sapmaları özeti
 *
 *  Bölüm 2 — Klinisyen Gözlemi
 *    Serbest metin textarea (klinisyen_notu)
 *
 *  Bölüm 3 — Nihai Tanı Etiketi (Ground Truth)
 *    ML modeli için etiketleme dropdown (nihai_tani_etiketi)
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Brain, Microscope, Tag, ChevronDown,
  AlertTriangle, CheckCircle2, Activity, Loader2,
} from "lucide-react";

// ── Tasarım sabitleri ──────────────────────────────────────────────────────
const C = {
  bg:      "#0b1a1a",
  panel:   "rgba(255,255,255,0.04)",
  border:  "rgba(13,148,136,0.25)",
  teal:    "#0d9488",
  teal2:   "#14b8a6",
  text:    "rgba(255,255,255,0.9)",
  muted:   "rgba(255,255,255,0.4)",
  danger:  "#ef4444",
  warn:    "#f59e0b",
  green:   "#22c55e",
};

// ── Tanı Etiketi Seçenekleri (ML Ground Truth) ────────────────────────────
export const DIAGNOSIS_LABELS = [
  {
    value: "nörotipik_gelişimsel_zayıflık",
    label: "Nörotipik / Gelişimsel Zayıflık",
    color: "#22c55e",
    desc: "Yaşa uygun sınır içi, hafif gelişimsel gecikme",
  },
  {
    value: "cocukluk_cagi_apraksisi",
    label: "Çocukluk Çağı Apraksisi (ÇÇA)",
    color: "#3b82f6",
    desc: "Motor planlama bozukluğu — tutarsız hata örüntüsü",
  },
  {
    value: "spastik_dizartri",
    label: "Spastik Dizartri",
    color: "#a855f7",
    desc: "UMN hasarı — hipertoni, yavaş/zorluklu konuşma",
  },
  {
    value: "gecikmiş_dil_konusma",
    label: "Gecikmiş Dil ve Konuşma (GDK)",
    color: "#f59e0b",
    desc: "Yaşa göre dil/konuşma gelişimi gecikmiş",
  },
  {
    value: "artikulasyon_bozuklugu",
    label: "Artikülasyon Bozukluğu",
    color: "#ec4899",
    desc: "Spesifik ses üretim hatası — motor değil fonolojik",
  },
  {
    value: "diger",
    label: "Diğer",
    color: "rgba(255,255,255,0.4)",
    desc: "Yukarıdaki kategorilere uymayan durum",
  },
] as const;

export type DiagnosisLabel = typeof DIAGNOSIS_LABELS[number]["value"] | "";

// ── Z-Skor Renk Hesabı ────────────────────────────────────────────────────
function zColor(z: number | null): string {
  if (z === null) return C.muted;
  const abs = Math.abs(z);
  if (abs > 3) return C.danger;
  if (abs > 2) return C.warn;
  if (abs > 1) return "#facc15";
  return C.green;
}

function zLabel(z: number | null): string {
  if (z === null) return "–";
  const abs = Math.abs(z);
  if (abs > 3) return "Çok Ağır";
  if (abs > 2) return "Ağır";
  if (abs > 1) return "Orta";
  return "Normal";
}

// ── Klinik Fonksiyon Basamakları Meta ──────────────────────────────────────
const CLINICAL_STEP_META: Record<number, { label: string; icon: string; metricKey: string }> = {
  1: { label: "Respirasyon",  icon: "🫁", metricKey: "l1_solunum_z" },
  2: { label: "Fonasyon",     icon: "🎵", metricKey: "l2_f0_z" },
  3: { label: "Rezonans",     icon: "🔊", metricKey: "l3_rezonans_z" },
  4: { label: "Artikülasyon", icon: "🦷", metricKey: "l4_ddk_z" },
  5: { label: "Prozodi",      icon: "🎼", metricKey: "l5_prozodi_z" },
  6: { label: "Hız / Ritim",  icon: "⚡", metricKey: "l6_hiz_z" },
  7: { label: "Bütünleşim",   icon: "🧠", metricKey: "l7_senkroni_z" },
};

// ── Bölüm 1: Aletsel Veri Özeti ─────────────────────────────────────────
function InstrumentalDataSection({
  zScores,
  crocodilPayload,
}: {
  zScores: Record<string, number | null>;
  crocodilPayload: Record<string, unknown> | null;
}) {
  const hasData = Object.keys(zScores).length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 12px", borderRadius: 8,
        background: "rgba(13,148,136,0.08)",
        border: "1px solid rgba(13,148,136,0.2)",
      }}>
        <Microscope size={13} style={{ color: C.teal2, flexShrink: 0 }} />
        <span style={{ fontSize: 10, color: C.muted, lineHeight: 1.5 }}>
          Bu bölüm yalnızca okunabilir. Aşağıdaki Z-skorlar sinyal işleme
          hattından (Python) hesaplanmıştır.
        </span>
      </div>

      {/* Z-Skor Tablosu */}
      {hasData ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {[1, 2, 3, 4, 5, 6, 7].map((lvl) => {
            const meta = CLINICAL_STEP_META[lvl];
            const z = zScores[meta.metricKey] ?? null;
            const color = zColor(z);
            const barWidth = z !== null
              ? `${Math.min(100, (Math.abs(z) / 4) * 100)}%`
              : "0%";

            return (
              <div key={lvl} style={{
                display: "grid",
                gridTemplateColumns: "100px 1fr 60px 70px",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                borderRadius: 8,
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 13 }}>{meta.icon}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: C.text }}>{meta.label}</span>
                </div>
                <div style={{
                  height: 4, background: "rgba(255,255,255,0.06)",
                  borderRadius: 2, overflow: "hidden",
                }}>
                  <div style={{
                    width: barWidth, height: "100%",
                    background: color, borderRadius: 2,
                    transition: "width 0.4s ease",
                  }} />
                </div>
                <span style={{
                  fontSize: 12, fontWeight: 800, color,
                  textAlign: "right", fontVariantNumeric: "tabular-nums",
                }}>
                  {z !== null ? `${z > 0 ? "+" : ""}${z.toFixed(2)}σ` : "–"}
                </span>
                <span style={{
                  fontSize: 9, fontWeight: 700, color,
                  textAlign: "center", textTransform: "uppercase", letterSpacing: "0.06em",
                }}>
                  {zLabel(z)}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{
          padding: "20px", borderRadius: 10, textAlign: "center",
          background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
        }}>
          <span style={{ fontSize: 11, color: C.muted }}>
            Seans kaydedilmeden Z-skor verisi mevcut değil.
            Kaydedildikten sonra burada görünecek.
          </span>
        </div>
      )}

      {/* Özet Metrikler */}
      {crocodilPayload && (
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
          gap: 6, marginTop: 4,
        }}>
          {[
            { label: "DDK Hızı",       value: crocodilPayload.ddkAmr as number, unit: "Hz" },
            { label: "F0 Medyan",      value: crocodilPayload.f0MedianHz as number, unit: "Hz" },
            { label: "Çene Açıklığı",  value: crocodilPayload.mandibularRomDeg as number, unit: "°" },
          ].filter(m => m.value != null).map((m) => (
            <div key={m.label} style={{
              padding: "8px 10px", borderRadius: 8,
              background: "rgba(13,148,136,0.06)",
              border: "1px solid rgba(13,148,136,0.15)",
              textAlign: "center",
            }}>
              <div style={{ fontSize: 9, color: C.muted, marginBottom: 3 }}>{m.label}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.teal2, fontVariantNumeric: "tabular-nums" }}>
                {typeof m.value === "number" ? m.value.toFixed(1) : "–"}
              </div>
              <div style={{ fontSize: 9, color: C.muted }}>{m.unit}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Bölüm 2: Klinisyen Gözlemi ──────────────────────────────────────────
function ClinicalObservationSection({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <label style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        Klinisyen Gözlem Notu
      </label>
      <textarea
        id="klinisyen-notu-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Seans sırasında gözlemlenen davranışlar, kompanzasyon stratejileri, hasta motivasyonu, dikkat süresi, ağrı/yorgunluk vb. notlarınızı buraya girin..."
        rows={5}
        style={{
          width: "100%",
          background: "rgba(255,255,255,0.04)",
          border: `1px solid ${value ? "rgba(13,148,136,0.4)" : "rgba(255,255,255,0.1)"}`,
          borderRadius: 10,
          color: C.text,
          fontSize: 12,
          padding: "12px 14px",
          resize: "vertical",
          outline: "none",
          lineHeight: 1.7,
          fontFamily: "'Inter', system-ui, sans-serif",
          transition: "border-color 0.2s",
          boxSizing: "border-box",
        }}
        onFocus={(e) => { e.target.style.borderColor = C.teal; }}
        onBlur={(e) => { e.target.style.borderColor = value ? "rgba(13,148,136,0.4)" : "rgba(255,255,255,0.1)"; }}
      />
      <div style={{ fontSize: 9, color: C.muted, textAlign: "right" }}>
        {value.length} karakter · ML modeli bu notları NLP ile işleyecek
      </div>
    </div>
  );
}

// ── Bölüm 3: Nihai Tanı Etiketi ─────────────────────────────────────────
function DiagnosisLabelSection({
  value,
  onChange,
}: {
  value: DiagnosisLabel;
  onChange: (v: DiagnosisLabel) => void;
}) {
  const selected = DIAGNOSIS_LABELS.find((l) => l.value === value);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <label style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        Nihai Tanı Etiketi <span style={{ color: C.danger }}>*</span>
      </label>

      <div style={{
        padding: "8px 12px", borderRadius: 8,
        background: "rgba(249,115,22,0.06)",
        border: "1px solid rgba(249,115,22,0.2)",
        display: "flex", gap: 8, alignItems: "flex-start",
      }}>
        <Brain size={12} style={{ color: "#f97316", flexShrink: 0, marginTop: 1 }} />
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>
          Bu etiket ML modelinin <strong style={{ color: "rgba(255,255,255,0.7)" }}>Ground Truth</strong> verisidir.
          Klinik değerlendirmenize dayalı olarak doğru kategoriyi seçin.
        </span>
      </div>

      {/* Etiket Kartları */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {DIAGNOSIS_LABELS.map((opt) => {
          const isSelected = value === opt.value;
          return (
            <button
              key={opt.value}
              id={`label-${opt.value}`}
              onClick={() => onChange(opt.value)}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 14px", borderRadius: 10,
                border: isSelected
                  ? `1.5px solid ${opt.color}`
                  : "1px solid rgba(255,255,255,0.07)",
                background: isSelected
                  ? `${opt.color}15`
                  : "rgba(255,255,255,0.02)",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.15s",
                width: "100%",
              }}
            >
              {/* Radio indicator */}
              <div style={{
                width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
                border: isSelected ? `2px solid ${opt.color}` : "2px solid rgba(255,255,255,0.2)",
                background: isSelected ? opt.color : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.15s",
              }}>
                {isSelected && (
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "white" }} />
                )}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 12, fontWeight: isSelected ? 700 : 500,
                  color: isSelected ? opt.color : C.text,
                }}>
                  {opt.label}
                </div>
                <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>
                  {opt.desc}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Sekme Başlığı ─────────────────────────────────────────────────────────
function SectionHeader({
  num, icon, title, active, onClick,
}: {
  num: number; icon: React.ReactNode; title: string;
  active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "10px 16px", borderRadius: 10,
        background: active ? "rgba(13,148,136,0.12)" : "transparent",
        border: active ? `1px solid ${C.border}` : "1px solid transparent",
        color: active ? C.teal2 : C.muted,
        cursor: "pointer", textAlign: "left",
        width: "100%", transition: "all 0.15s",
      }}
    >
      <div style={{
        width: 22, height: 22, borderRadius: 6,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: active ? "rgba(13,148,136,0.2)" : "rgba(255,255,255,0.06)",
        fontSize: 11, fontWeight: 800,
        color: active ? C.teal2 : C.muted,
        flexShrink: 0,
      }}>
        {num}
      </div>
      <div style={{ flex: 1 }}>
        {icon}
        <span style={{ fontSize: 11, fontWeight: 700, marginLeft: 6 }}>{title}</span>
      </div>
      <ChevronDown
        size={12}
        style={{
          transform: active ? "rotate(0deg)" : "rotate(-90deg)",
          transition: "transform 0.2s",
          opacity: 0.5,
        }}
      />
    </button>
  );
}

// ── Ana Modal Props ────────────────────────────────────────────────────────
export interface SessionLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { klinisyenNotu: string; nihaiTaniEtiketi: DiagnosisLabel }) => Promise<void>;
  zScores?: Record<string, number | null>;
  crocodilPayload?: Record<string, unknown> | null;
  clientName?: string;
  isSaving?: boolean;
}

// ── Ana Modal Bileşeni ────────────────────────────────────────────────────
export function SessionLabelModal({
  isOpen,
  onClose,
  onConfirm,
  zScores = {},
  crocodilPayload = null,
  clientName = "",
  isSaving = false,
}: SessionLabelModalProps) {
  const [activeSection, setActiveSection] = useState(1);
  const [klinisyenNotu, setKlinisyenNotu] = useState("");
  const [nihaiTaniEtiketi, setNihaiTaniEtiketi] = useState<DiagnosisLabel>("");

  const canConfirm = nihaiTaniEtiketi !== "" && !isSaving;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    await onConfirm({ klinisyenNotu, nihaiTaniEtiketi });
  };

  const handleClose = () => {
    if (!isSaving) {
      setActiveSection(1);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            style={{
              position: "fixed", inset: 0, zIndex: 200,
              background: "rgba(0,0,0,0.7)",
              backdropFilter: "blur(6px)",
            }}
          />

          {/* Modal Panel */}
          <motion.div
            initial={{ opacity: 0, y: 32, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            style={{
              position: "fixed",
              top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 201,
              width: "min(780px, 96vw)",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              background: "#0f1f1f",
              border: `1px solid ${C.border}`,
              borderRadius: 16,
              overflow: "hidden",
              boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(13,148,136,0.1)",
            }}
          >
            {/* ── Header ── */}
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "16px 20px",
              borderBottom: `1px solid rgba(255,255,255,0.07)`,
              flexShrink: 0,
              background: "rgba(13,148,136,0.04)",
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(13,148,136,0.2)",
                border: `1px solid ${C.border}`,
                fontSize: 16,
              }}>
                🏷️
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>
                  Seans Kayıt & Etiketleme
                </div>
                {clientName && (
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
                    {clientName} · Gözetimli Öğrenme için Ground Truth etiketi zorunludur
                  </div>
                )}
              </div>
              <button
                onClick={handleClose}
                disabled={isSaving}
                style={{
                  width: 28, height: 28, borderRadius: 8,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: C.muted, cursor: isSaving ? "not-allowed" : "pointer",
                }}
              >
                <X size={14} />
              </button>
            </div>

            {/* ── Body (2-col: nav + content) ── */}
            <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
              {/* Sol: Bölüm nav */}
              <div style={{
                width: 200, flexShrink: 0,
                borderRight: `1px solid rgba(255,255,255,0.06)`,
                padding: "12px 10px",
                display: "flex", flexDirection: "column", gap: 4,
                background: "rgba(0,0,0,0.2)",
              }}>
                <div style={{ fontSize: 8, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", padding: "0 6px 8px" }}>
                  Bölümler
                </div>
                <SectionHeader
                  num={1}
                  icon={<Activity size={11} style={{ display: "inline" }} />}
                  title="Aletsel Veri"
                  active={activeSection === 1}
                  onClick={() => setActiveSection(1)}
                />
                <SectionHeader
                  num={2}
                  icon={<Microscope size={11} style={{ display: "inline" }} />}
                  title="Klinisyen Gözlemi"
                  active={activeSection === 2}
                  onClick={() => setActiveSection(2)}
                />
                <SectionHeader
                  num={3}
                  icon={<Tag size={11} style={{ display: "inline" }} />}
                  title="Tanı Etiketi"
                  active={activeSection === 3}
                  onClick={() => setActiveSection(3)}
                />

                {/* Durum özeti */}
                <div style={{ marginTop: "auto", paddingTop: 12 }}>
                  <div style={{
                    padding: "8px 10px", borderRadius: 8,
                    background: nihaiTaniEtiketi
                      ? "rgba(34,197,94,0.08)"
                      : "rgba(245,158,11,0.08)",
                    border: nihaiTaniEtiketi
                      ? "1px solid rgba(34,197,94,0.2)"
                      : "1px solid rgba(245,158,11,0.2)",
                  }}>
                    {nihaiTaniEtiketi ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <CheckCircle2 size={10} style={{ color: C.green }} />
                        <span style={{ fontSize: 9, color: C.green, fontWeight: 700 }}>Etiket seçildi</span>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <AlertTriangle size={10} style={{ color: C.warn }} />
                        <span style={{ fontSize: 9, color: C.warn, fontWeight: 700 }}>Etiket gerekli</span>
                      </div>
                    )}
                    {nihaiTaniEtiketi && (
                      <div style={{ fontSize: 8, color: C.muted, marginTop: 3, lineHeight: 1.4 }}>
                        {DIAGNOSIS_LABELS.find(l => l.value === nihaiTaniEtiketi)?.label}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Sağ: İçerik */}
              <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
                <AnimatePresence mode="wait">
                  {activeSection === 1 && (
                    <motion.div
                      key="s1"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.15 }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 800, color: C.text, marginBottom: 16 }}>
                        🔬 Aletsel Ölçüm Özeti
                      </div>
                      <InstrumentalDataSection
                        zScores={zScores}
                        crocodilPayload={crocodilPayload}
                      />
                    </motion.div>
                  )}

                  {activeSection === 2 && (
                    <motion.div
                      key="s2"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.15 }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 800, color: C.text, marginBottom: 16 }}>
                        📝 Klinisyen Gözlem Notu
                      </div>
                      <ClinicalObservationSection
                        value={klinisyenNotu}
                        onChange={setKlinisyenNotu}
                      />
                    </motion.div>
                  )}

                  {activeSection === 3 && (
                    <motion.div
                      key="s3"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.15 }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 800, color: C.text, marginBottom: 16 }}>
                        🏷️ Nihai Tanı Etiketi (Ground Truth)
                      </div>
                      <DiagnosisLabelSection
                        value={nihaiTaniEtiketi}
                        onChange={setNihaiTaniEtiketi}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* ── Footer ── */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "14px 20px",
              borderTop: `1px solid rgba(255,255,255,0.07)`,
              flexShrink: 0,
              background: "rgba(0,0,0,0.2)",
              gap: 12,
            }}>
              <div style={{ fontSize: 10, color: C.muted }}>
                {klinisyenNotu.length > 0 && (
                  <span>Not: {klinisyenNotu.length} karakter · </span>
                )}
                {nihaiTaniEtiketi
                  ? <span style={{ color: C.green }}>✓ {DIAGNOSIS_LABELS.find(l => l.value === nihaiTaniEtiketi)?.label}</span>
                  : <span style={{ color: C.warn }}>⚠ Tanı etiketi seçilmedi</span>
                }
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setActiveSection(Math.min(3, activeSection + 1))}
                  style={{
                    padding: "8px 16px", borderRadius: 8, cursor: "pointer",
                    background: "transparent",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: C.muted, fontSize: 11, fontWeight: 600,
                    display: activeSection < 3 ? "block" : "none",
                  }}
                >
                  Sonraki Bölüm →
                </button>

                <button
                  onClick={handleClose}
                  disabled={isSaving}
                  style={{
                    padding: "8px 16px", borderRadius: 8, cursor: "pointer",
                    background: "transparent",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: C.muted, fontSize: 11, fontWeight: 600,
                  }}
                >
                  İptal
                </button>

                <button
                  id="session-label-confirm-btn"
                  onClick={handleConfirm}
                  disabled={!canConfirm}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "8px 20px", borderRadius: 8, cursor: canConfirm ? "pointer" : "not-allowed",
                    background: canConfirm
                      ? "linear-gradient(135deg, #0d9488, #14b8a6)"
                      : "rgba(255,255,255,0.06)",
                    border: canConfirm ? "1px solid #14b8a6" : "1px solid transparent",
                    color: canConfirm ? "white" : C.muted,
                    fontSize: 11, fontWeight: 700,
                    boxShadow: canConfirm ? "0 2px 10px rgba(13,148,136,0.3)" : "none",
                    transition: "all 0.2s",
                    opacity: canConfirm ? 1 : 0.5,
                  }}
                >
                  {isSaving ? <Loader2 size={12} className="animate-spin" /> : "✓"}
                  {isSaving ? "Kaydediliyor..." : "Kaydet & Etiketle"}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
