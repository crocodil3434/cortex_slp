"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Activity, Users, Wifi, WifiOff, RefreshCw, Zap,
  Eye, Heart, ChevronRight, Radio, Save, CheckCircle2,
  User, ArrowLeft, Loader2, ExternalLink, Play, Square, Timer,
} from "lucide-react";
import { useM105Stream } from "@/lib/crocodil/useM105Stream";
import { CliniciansView } from "@/components/crocodil/m105/CliniciansView";
import { FamilyReportView } from "@/components/crocodil/m105/FamilyReportView";
import { SessionLabelModal } from "@/components/crocodil/m105/SessionLabelModal";
import type { DiagnosisLabel } from "@/components/crocodil/m105/SessionLabelModal";
import { getClients, getClient, saveAssessment } from "@/lib/crocodil/storage";
import type { Client } from "@/lib/crocodil/types";
import { useToast, ToastProvider } from "@/components/crocodil/Toast";

// ── Tasarım sabitleri ─────────────────────────────────────────────────────────
const C = {
  bg:     "#0b1a1a",
  panel:  "rgba(255,255,255,0.03)",
  border: "rgba(13,148,136,0.2)",
  teal:   "#0d9488",
  teal2:  "#14b8a6",
  text:   "rgba(255,255,255,0.85)",
  muted:  "rgba(255,255,255,0.35)",
};

// ── Bağlantı durum çipi ───────────────────────────────────────────────────────
function ConnectionChip({
  isConnected, isReconnecting, fps, latencyMs, error, onConnect, onDisconnect,
}: {
  isConnected: boolean; isReconnecting: boolean; fps: number;
  latencyMs: number; error: string | null;
  onConnect: () => void; onDisconnect: () => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
      {/* Durum LED */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 70 }}>
        <div style={{ position: "relative", width: 8, height: 8, flexShrink: 0 }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: isConnected ? "#22c55e" : isReconnecting ? "#f59e0b" : "#ef4444",
          }} />
          {isConnected && (
            <motion.div
              animate={{ scale: [1, 2.0, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{
                position: "absolute", inset: 0, borderRadius: "50%",
                background: "#22c55e",
              }}
            />
          )}
        </div>
        <span style={{
          fontSize: 10, fontWeight: 700, textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: isConnected ? "#22c55e" : isReconnecting ? "#f59e0b" : "#ef4444",
        }}>
          {isConnected ? "CANLI" : isReconnecting ? "BAĞLANIYOR" : "KAPALI"}
        </span>
      </div>

      {isConnected && (
        <>
          <div style={{ width: 1, height: 12, background: "rgba(255,255,255,0.1)", flexShrink: 0 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontVariantNumeric: "tabular-nums", minWidth: 100 }}>
            <span style={{ fontSize: 9, color: C.muted, width: 44 }}>
              <span style={{ color: C.teal2, fontWeight: 700 }}>{fps}</span> fps
            </span>
            <span style={{ fontSize: 9, color: C.muted, width: 48 }}>
              <span style={{ color: C.teal2, fontWeight: 700 }}>{latencyMs}</span> ms
            </span>
          </div>
        </>
      )}

      {/* Kontrol butonu */}
      <button
        onClick={isConnected ? onDisconnect : onConnect}
        style={{
          display: "flex", alignItems: "center", gap: 4,
          padding: "4px 10px", borderRadius: 99,
          fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em",
          cursor: "pointer",
          flexShrink: 0,
          border: `1px solid ${isConnected ? "rgba(239,68,68,0.4)" : "rgba(13,148,136,0.5)"}`,
          background: isConnected ? "rgba(239,68,68,0.08)" : "rgba(13,148,136,0.12)",
          color: isConnected ? "#ef4444" : C.teal2,
        }}
      >
        {isConnected ? <WifiOff size={10} /> : <Wifi size={10} />}
        {isConnected ? "Durdur" : "Bağlan"}
      </button>

      {/* Hata mesajı */}
      {error && !isConnected && (
        <div style={{
          padding: "4px 10px", borderRadius: 8, fontSize: 9,
          color: "#ef4444", background: "rgba(239,68,68,0.08)",
          border: "1px solid rgba(239,68,68,0.2)",
          maxWidth: 260,
        }}>
          {error}
        </div>
      )}
    </div>
  );
}

// ── Görünüm sekme seçici ──────────────────────────────────────────────────────
type ViewMode = "clinician" | "family";

function ViewSelector({ mode, onChange }: { mode: ViewMode; onChange: (v: ViewMode) => void }) {
  const tabs: { id: ViewMode; label: string; icon: React.ReactNode; sub: string }[] = [
    {
      id: "clinician",
      label: "Klinisyen",
      icon: <Activity size={13} />,
      sub: "Teknik veri · 7 basamak",
    },
    {
      id: "family",
      label: "Aile Raporu",
      icon: <Heart size={13} />,
      sub: "Sade dil · Norm karşılaştırması",
    },
  ];

  return (
    <div style={{
      display: "flex",
      gap: 4,
      background: "rgba(255,255,255,0.04)",
      border: C.border,
      borderWidth: 1,
      borderStyle: "solid",
      borderRadius: 12,
      padding: 4,
    }}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 14px", borderRadius: 8, cursor: "pointer",
            border: "none",
            background: mode === tab.id ? "rgba(13,148,136,0.25)" : "transparent",
            color: mode === tab.id ? C.teal2 : C.muted,
            transition: "all 0.2s",
          }}
        >
          {tab.icon}
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 11, fontWeight: 700 }}>{tab.label}</div>
            <div style={{ fontSize: 8, opacity: 0.7 }}>{tab.sub}</div>
          </div>
          {mode === tab.id && <ChevronRight size={10} style={{ marginLeft: 2, opacity: 0.5 }} />}
        </button>
      ))}
    </div>
  );
}

// ── Hayden seviyesi seçici (header mini) ─────────────────────────────────────
const LEVELS = [1, 2, 3, 4, 5, 6, 7];
const LEVEL_COLORS: Record<number, string> = {
  1: "#22c55e", 2: "#0d9488", 3: "#3b82f6", 4: "#f59e0b",
  5: "#a855f7", 6: "#ec4899", 7: "#f97316",
};

function HaydenLevelPicker({
  active, onChange,
}: { active: number; onChange: (l: number) => void }) {
  return (
    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
      {LEVELS.map((l) => (
        <button
          key={l}
          onClick={() => onChange(l)}
          title={`L${l}`}
          style={{
            width: 28, height: 28, borderRadius: 8,
            fontSize: 10, fontWeight: 800, cursor: "pointer",
            flexShrink: 0,
            border: `1.5px solid ${active === l ? LEVEL_COLORS[l] : "rgba(255,255,255,0.1)"}`,
            background: active === l ? `${LEVEL_COLORS[l]}20` : "transparent",
            color: active === l ? LEVEL_COLORS[l] : "rgba(255,255,255,0.3)",
          }}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

// ─── Animasyonlu arka plan grid motifi ───────────────────────────────────────
function GridBackground() {
  return (
    <div
      aria-hidden
      style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        backgroundImage: `
          linear-gradient(rgba(13,148,136,0.06) 1px, transparent 1px),
          linear-gradient(90deg, rgba(13,148,136,0.06) 1px, transparent 1px)
        `,
        backgroundSize: "40px 40px",
      }}
    />
  );
}

// ── Ana İçerik Bileşeni (Search Params için Suspense içerisi) ─────────────────
function Modul105Content() {
  const searchParams = useSearchParams();
  const clientIdQuery = searchParams.get("clientId");

  const [viewMode, setViewMode] = useState<ViewMode>("clinician");
  const [activeLevel, setActiveLevel] = useState(4);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedSession, setLastSavedSession] = useState<{ id: number; date: string } | null>(null);
  const [lastZScores, setLastZScores] = useState<Record<string, number | null>>({});
  const [lastCrocodilPayload, setLastCrocodilPayload] = useState<Record<string, unknown> | null>(null);
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
  const { success: toastSuccess, error: toastError } = useToast();

  const {
    latest, displayLatest, window: windowPkts, isConnected, isReconnecting,
    packetCount, fps, latencyMs, error, connect, disconnect,
  } = useM105Stream(activeLevel);

  // Danışan listesi ve seçili danışanı yükle
  useEffect(() => {
    document.title = "Modül 105 — PROMPT Kinematik & Akustik İstasyonu · Crocodil";
    const loadClients = async () => {
      try {
        const list = await getClients();
        setClients(list);
        if (clientIdQuery) {
          const match = list.find((c) => c.id === clientIdQuery);
          if (match) setSelectedClient(match);
        } else if (list.length > 0 && !selectedClient) {
          setSelectedClient(list[0]);
        }
      } catch (err) {
        console.error("Danışanlar yüklenemedi:", err);
      }
    };
    loadClients();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientIdQuery]);

  const [isTestActive, setIsTestActive] = useState(false);
  const [testSeconds, setTestSeconds] = useState(0);
  const testTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Kronometre sayacı
  useEffect(() => {
    if (isTestActive) {
      testTimerRef.current = setInterval(() => {
        setTestSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (testTimerRef.current) clearInterval(testTimerRef.current);
    }
    return () => {
      if (testTimerRef.current) clearInterval(testTimerRef.current);
    };
  }, [isTestActive]);

  // Testi Başlat
  const handleStartTest = async () => {
    if (!selectedClient) {
      toastError("Lütfen önce bir danışan seçin.");
      return;
    }
    setTestSeconds(0);
    setIsTestActive(true);
    try {
      await fetch("http://localhost:8765/api/test/start", { method: "POST" });
      toastSuccess("Test başlatıldı! Sensör verileri canlı kaydediliyor.");
    } catch {
      toastError("Sunucuya test başlatma komutu iletilemedi.");
    }
  };

  // Testi Sonlandır
  const handleStopTest = async () => {
    setIsTestActive(false);
    try {
      const res = await fetch("http://localhost:8765/api/test/stop", { method: "POST" });
      const json = await res.json();
      toastSuccess(`Test tamamlandı! ${json.packet_count || 0} paket kaydedildi.`);
    } catch {
      // ignore
    }
    // Test sonlanınca otomatik olarak Seans Kayıt & Etiketleme modalını aç
    setIsLabelModalOpen(true);
  };

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // "Seansı Kaydet" → Önce modalı aç
  const handleSaveButtonClick = () => {
    if (!selectedClient) {
      toastError("Lütfen önce bir danışan seçin.");
      return;
    }
    setIsLabelModalOpen(true);
  };

  // Modal onaylandığında: etiket + not ile gerçek kayıt
  const handleModalConfirm = async ({
    klinisyenNotu,
    nihaiTaniEtiketi,
  }: {
    klinisyenNotu: string;
    nihaiTaniEtiketi: DiagnosisLabel;
  }) => {
    if (!selectedClient) return;
    setIsSaving(true);
    try {
      // 1. Python API: sinyal işleme + SQLite + Supabase paralel yazma
      const res = await fetch("http://localhost:8765/api/sessions/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          crocodil_client_id:  selectedClient.id,
          ad:                  selectedClient.firstName,
          soyad:               selectedClient.lastName,
          dogum_tarihi:        selectedClient.birthDate || "1990-01-01",
          cinsiyet:            selectedClient.gender || "kadın",
          birincil_tani:       selectedClient.primaryDiagnosis || "dizartri",
          seans_amaci:         "baseline_olcum",
          hayden_level:        activeLevel,
          klinisyen_notu:      klinisyenNotu,
          nihai_tani_etiketi:  nihaiTaniEtiketi,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.msg || "Python sunucusunda seans kaydedilemedi.");
      }

      // 2. Z-skorları ve payload'ı state'e kaydet
      if (json.crocodil_payload) setLastCrocodilPayload(json.crocodil_payload);
      if (json.hayden_records) {
        const zMap: Record<string, number | null> = {};
        for (const rec of json.hayden_records) {
          try {
            const zj = typeof rec.zscore_sonuclar_json === "string"
              ? JSON.parse(rec.zscore_sonuclar_json)
              : (rec.zscore_sonuclar_json || {});
            Object.assign(zMap, zj);
          } catch { /* ignore parse errors */ }
        }
        setLastZScores(zMap);
      }

      // 3. Crocodil Assessments tablosuna kaydet
      await saveAssessment({
        clientId: selectedClient.id,
        selectedCategories: ["motorSpeech", "conclusion"],
        motorSpeech: json.crocodil_payload,
        conclusion: {
          recommendations: `Modül 105 PROMPT İstasyonu Değerlendirmesi: DDK Hızı ${json.crocodil_payload?.ddkAmr} Hz, Çene ROM ${json.crocodil_payload?.mandibularRomDeg}°.`,
          shortTermGoals: ["Mandibular dikey açılma aralığının korunması", "Diadokokineside ritmik tutarlılık"],
          longTermGoals: ["Fonksiyonel konuşma anlaşılırlığının artırılması"],
        },
        status: "tamamlandı",
      });

      setLastSavedSession({
        id: json.seans_id,
        date: new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
      });
      setIsLabelModalOpen(false);
      toastSuccess(
        `${selectedClient.firstName} ${selectedClient.lastName} için Seans #${json.seans_id} kaydedildi!` +
        (json.supabase_session_id ? ` ✓ Supabase` : "")
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Seans kaydedilirken bir hata oluştu.";
      console.error("Seans kayıt hatası:", err);
      toastError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        color: C.text,
        fontFamily: "'Inter', system-ui, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <GridBackground />

      {/* ── Radyal ışık efekti ── */}
      <div
        aria-hidden
        style={{
          position: "fixed", top: -200, left: "50%", transform: "translateX(-50%)",
          width: 800, height: 400, zIndex: 0, pointerEvents: "none",
          background: "radial-gradient(ellipse at center, rgba(13,148,136,0.12) 0%, transparent 70%)",
        }}
      />

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100vh" }}>

        {/* ═══════════════════════════════════════════════════════════════
            HEADER
        ═══════════════════════════════════════════════════════════════ */}
        <header style={{
          display: "flex", alignItems: "center", gap: 14,
          padding: "10px 20px",
          borderBottom: `1px solid ${C.border}`,
          background: "rgba(11,26,26,0.9)",
          backdropFilter: "blur(12px)",
          flexShrink: 0,
          flexWrap: "wrap",
        }}>
          {/* Geri Butonu (Eğer clientId varsa danışana dönüş) */}
          {selectedClient && (
            <Link href={`/crocodil/danisman/${selectedClient.id}`}>
              <button
                title="Danışan Sayfasına Dön"
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: C.text, cursor: "pointer",
                }}
              >
                <ArrowLeft size={14} />
              </button>
            </Link>
          )}

          {/* Marka */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(13,148,136,0.2)",
              border: `1px solid ${C.border}`,
              fontSize: 15,
            }}>
              📡
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: C.teal2, lineHeight: 1 }}>
                Modül 105
              </div>
              <div style={{ fontSize: 8, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                PROMPT Kinematik · Akustik
              </div>
            </div>
          </div>

          {/* ── Danışan Seçici Dropdown / Rozeti ── */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "4px 10px", borderRadius: 10,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}>
            <User size={12} style={{ color: C.teal2 }} />
            <select
              value={selectedClient?.id || ""}
              onChange={(e) => {
                const found = clients.find((c) => c.id === e.target.value);
                if (found) setSelectedClient(found);
              }}
              style={{
                background: "transparent",
                border: "none",
                color: C.text,
                fontSize: 11,
                fontWeight: 700,
                outline: "none",
                cursor: "pointer",
              }}
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id} style={{ background: "#0f2027", color: "white" }}>
                  {c.firstName} {c.lastName} {c.primaryDiagnosis ? `(${c.primaryDiagnosis})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: 1 }} />

          {/* Hayden Seçici */}
          {viewMode === "clinician" && (
            <HaydenLevelPicker active={activeLevel} onChange={setActiveLevel} />
          )}

          {/* Bağlantı Durum */}
          <ConnectionChip
            isConnected={isConnected}
            isReconnecting={isReconnecting}
            fps={fps}
            latencyMs={latencyMs}
            error={error}
            onConnect={connect}
            onDisconnect={disconnect}
          />

          {/* Paket sayacı */}
          {isConnected && (
            <div
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "4px 10px", borderRadius: 8,
                background: "rgba(13,148,136,0.1)",
                border: "1px solid rgba(13,148,136,0.2)",
                fontVariantNumeric: "tabular-nums",
                flexShrink: 0,
                minWidth: 110,
                justifyContent: "center",
              }}
            >
              <Radio size={9} style={{ color: C.teal2, flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: C.teal2, fontWeight: 700, whiteSpace: "nowrap" }}>
                {packetCount.toLocaleString()} paket
              </span>
            </div>
          )}

          {/* ── Testi Başlat / Sonlandır Kontrolü ── */}
          {isTestActive ? (
            <button
              onClick={handleStopTest}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "6px 14px", borderRadius: 10,
                fontSize: 11, fontWeight: 800, cursor: "pointer",
                border: "1px solid #ef4444",
                background: "linear-gradient(135deg, #b91c1c, #ef4444)",
                color: "white",
                boxShadow: "0 0 14px rgba(239,68,68,0.4)",
                transition: "all 0.2s",
                flexShrink: 0,
              }}
            >
              <Square size={11} fill="white" />
              <span>Testi Sonlandır</span>
              <span style={{
                background: "rgba(0,0,0,0.35)", padding: "1px 6px",
                borderRadius: 4, fontSize: 10, fontVariantNumeric: "tabular-nums",
                letterSpacing: "0.05em",
              }}>
                {formatDuration(testSeconds)}
              </span>
            </button>
          ) : (
            <button
              onClick={handleStartTest}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 14px", borderRadius: 10,
                fontSize: 11, fontWeight: 800, cursor: "pointer",
                border: "1px solid #22c55e",
                background: "linear-gradient(135deg, #15803d, #22c55e)",
                color: "white",
                boxShadow: "0 2px 10px rgba(34,197,94,0.3)",
                transition: "all 0.2s",
                flexShrink: 0,
              }}
            >
              <Play size={11} fill="white" />
              <span>Testi Başlat</span>
            </button>
          )}

          {/* ── Seansı Danışan Dosyasına Kaydet Butonu ── */}
          <button
            onClick={handleSaveButtonClick}
            disabled={isSaving}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 14px", borderRadius: 10,
              fontSize: 11, fontWeight: 700, cursor: isSaving ? "not-allowed" : "pointer",
              flexShrink: 0,
              border: "1px solid #14b8a6",
              background: isSaving ? "rgba(13,148,136,0.3)" : "linear-gradient(135deg, #0d9488, #14b8a6)",
              color: "white",
              boxShadow: "0 2px 10px rgba(13,148,136,0.3)",
              transition: "all 0.2s",
            }}
          >
            {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            {isSaving ? "Kaydediliyor..." : "Seansı Kaydet"}
          </button>
        </header>

        {/* ═══════════════════════════════════════════════════════════════
            SEKME SEÇİCİ & KAYIT BİLGİ BANTI
        ═══════════════════════════════════════════════════════════════ */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "8px 20px",
          borderBottom: `1px solid ${C.border}`,
          background: "rgba(11,26,26,0.7)",
          flexShrink: 0,
          gap: 12,
        }}>
          <ViewSelector mode={viewMode} onChange={setViewMode} />

          {/* Son Kaydedilen Seans Bildirimi */}
          {lastSavedSession && selectedClient && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "4px 12px", borderRadius: 8,
              background: "rgba(34,197,94,0.1)",
              border: "1px solid rgba(34,197,94,0.3)",
              fontSize: 10, color: "#22c55e",
            }}>
              <CheckCircle2 size={12} />
              <span>Seans #{lastSavedSession.id} ({lastSavedSession.date}) danışan dosyasına aktarıldı.</span>
              <Link href={`/crocodil/danisman/${selectedClient.id}`} style={{ color: "#22c55e", textDecoration: "underline", fontWeight: 700, marginLeft: 4 }}>
                Dosyayı Gör
              </Link>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            ANA İÇERİK
        ═══════════════════════════════════════════════════════════════ */}
        <main style={{
          flex: 1,
          overflow: "hidden",
          padding: "16px 24px",
        }}>
          {/* Bağlantı bekleme ekranı */}
          {!isConnected && !isReconnecting && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                gap: 20,
                textAlign: "center",
              }}
            >
              <motion.div
                animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.05, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
                style={{ fontSize: 64 }}
              >
                📡
              </motion.div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: C.text, marginBottom: 8 }}>
                  Python Sunucusuna Bağlanılamadı
                </div>
                <div style={{ fontSize: 13, color: C.muted, maxWidth: 420, lineHeight: 1.6 }}>
                  Motor konuşma veri akışı için Python sunucusunun çalışması gerekiyor.
                </div>
              </div>
              <div style={{
                padding: "12px 20px", borderRadius: 10,
                background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.07)",
                fontFamily: "monospace", fontSize: 12,
                color: C.teal2, textAlign: "left",
              }}>
                <span style={{ color: "rgba(255,255,255,0.3)" }}># module_105/server/</span>
                {"\n"}
                <span style={{ color: "#fbbf24" }}>python</span>
                {" main.py"}
              </div>
              {error && (
                <div style={{
                  padding: "8px 16px", borderRadius: 8,
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  fontSize: 11, color: "#ef4444", maxWidth: 380,
                }}>
                  {error}
                </div>
              )}
              <button
                onClick={connect}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "10px 20px", borderRadius: 10,
                  background: "rgba(13,148,136,0.15)",
                  border: "1.5px solid rgba(13,148,136,0.4)",
                  color: C.teal2, fontSize: 12, fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <RefreshCw size={13} />
                Yeniden Bağlan
              </button>
            </motion.div>
          )}

          {/* Bağlanıyor animasyonu */}
          {isReconnecting && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              height: "100%", flexDirection: "column", gap: 16,
            }}>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
              >
                <RefreshCw size={32} style={{ color: C.teal2 }} />
              </motion.div>
              <div style={{ fontSize: 13, color: C.muted }}>
                Python sunucusuna bağlanılıyor... (WS 8765)
              </div>
            </div>
          )}

          {/* Bağlı: Görünüm */}
          {isConnected && (
            <AnimatePresence mode="wait">
              {viewMode === "clinician" && (
                <motion.div
                  key="clinician"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.25 }}
                  style={{ height: "100%" }}
                >
                  <CliniciansView latest={latest} displayLatest={displayLatest} window={windowPkts} />
                </motion.div>
              )}

              {viewMode === "family" && (
                <motion.div
                  key="family"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.25 }}
                  style={{ height: "100%", overflowY: "auto" }}
                >
                  <FamilyReportView latest={displayLatest ?? latest} packetCount={packetCount} />
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </main>
      </div>

      {/* ── Gözetimli Öğrenme Etiketleme Modalı ── */}
      <SessionLabelModal
        isOpen={isLabelModalOpen}
        onClose={() => setIsLabelModalOpen(false)}
        onConfirm={handleModalConfirm}
        zScores={lastZScores}
        crocodilPayload={lastCrocodilPayload}
        clientName={selectedClient ? `${selectedClient.firstName} ${selectedClient.lastName}` : ""}
        isSaving={isSaving}
      />
    </div>
  );
}

export default function Modul105Page() {
  return (
    <ToastProvider>
      <Suspense fallback={<div style={{ padding: 24, color: "white" }}>Yükleniyor...</div>}>
        <Modul105Content />
      </Suspense>
    </ToastProvider>
  );
}
