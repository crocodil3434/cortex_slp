"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getSettings, saveAIMaterial } from "@/lib/crocodil/storage";
import { generateCrocodilMaterial } from "@/lib/crocodil/gemini";
import type { DisorderCategory, MaterialType, AgeGroup, SeverityLevel } from "@/lib/crocodil/types";
import {
  Sparkles, ChevronRight, Copy, Download, Check, RefreshCw,
  AlertCircle, Settings, ArrowLeft, Minus, Plus,
} from "lucide-react";
import Link from "next/link";

// ── Veri Tanımları ────────────────────────────────────────

const DISORDER_CARDS: { key: DisorderCategory; emoji: string; label: string; color: string }[] = [
  { key: "articulation", emoji: "🗣️", label: "Artikülasyon",       color: "#10b981" },
  { key: "language",     emoji: "📚", label: "Dil Bozukluğu",      color: "#3b82f6" },
  { key: "fluency",      emoji: "🌊", label: "Akıcılık",            color: "#0ea5e9" },
  { key: "voice",        emoji: "🎵", label: "Ses Bozukluğu",       color: "#8b5cf6" },
  { key: "dysphagia",    emoji: "🍽️", label: "Disfaji",             color: "#f59e0b" },
  { key: "aphasia",      emoji: "🧠", label: "Afazi",               color: "#ef4444" },
  { key: "aac",          emoji: "💬", label: "AAC",                 color: "#14b8a6" },
  { key: "motorSpeech",  emoji: "⚙️", label: "Motor Konuşma",       color: "#f97316" },
  { key: "socialComm",   emoji: "🤝", label: "Sosyal İletişim",     color: "#ec4899" },
];

const MATERIAL_TYPES: { key: MaterialType; emoji: string; label: string; desc: string }[] = [
  { key: "story",           emoji: "📖", label: "Hikaye",           desc: "Hedef sesi/yapıyı barındıran kısa hikaye" },
  { key: "wordList",        emoji: "📝", label: "Kelime Listesi",   desc: "Pozisyon bazlı hedef ses listesi" },
  { key: "activityGame",    emoji: "🃏", label: "Aktivite/Oyun",    desc: "Oyun tabanlı terapi aktivitesi" },
  { key: "homeProgram",     emoji: "🏠", label: "Ev Programı",      desc: "Haftalık ev çalışması kılavuzu" },
  { key: "sessionPlan",     emoji: "📋", label: "Seans Planı",      desc: "50 dk yapılandırılmış seans planı" },
  { key: "goalSuggestions", emoji: "🎯", label: "Hedef Önerileri",  desc: "ICF-SMART formatında 3-5 hedef" },
  { key: "parentLetter",    emoji: "📄", label: "Ebeveyn Mektubu",  desc: "Bilgilendirme ve öneriler mektubu" },
];

const AGE_OPTIONS: { key: AgeGroup; label: string }[] = [
  { key: "infant",     label: "Bebek (0-2 yaş)" },
  { key: "preschool",  label: "Okul Öncesi (3-5 yaş)" },
  { key: "schoolAge",  label: "Okul Çağı (6-12 yaş)" },
  { key: "adult",      label: "Yetişkin (18+ yaş)" },
  { key: "elderly",    label: "Yaşlı (65+ yaş)" },
];

const SEVERITY_OPTIONS: { key: SeverityLevel; label: string }[] = [
  { key: "hafif",     label: "Hafif" },
  { key: "orta",      label: "Orta" },
  { key: "ağır",      label: "Ağır" },
  { key: "çok-ağır",  label: "Çok Ağır" },
];

type Step = "disorder" | "details" | "result";

// Markdown'ı basit HTML'e çeviren yardımcı
function renderMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^## (.+)$/gm, '<h2 class="text-base font-bold text-gray-800 mt-4 mb-1">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 class="text-sm font-semibold text-gray-700 mt-3 mb-1">$1</h3>')
    .replace(/^# (.+)$/gm, '<h1 class="text-lg font-bold text-gray-800 mt-2 mb-2">$1</h1>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-gray-600">$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal text-gray-600">$1</li>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, "<br/>");
}

export default function CrocodilAIPage() {
  const [step, setStep] = useState<Step>("disorder");
  const [selectedDisorder, setSelectedDisorder] = useState<DisorderCategory | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialType | null>(null);
  const [ageGroup, setAgeGroup] = useState<AgeGroup>("schoolAge");
  const [severity, setSeverity] = useState<SeverityLevel>("orta");
  const [targetSound, setTargetSound] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [language, setLanguage] = useState<"tr" | "en">("tr");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [dotCount, setDotCount] = useState(0);
  const resultRef = useRef<HTMLDivElement>(null);

  const settings = typeof window !== "undefined" ? getSettings() : null;
  const hasApiKey = !!settings?.geminiApiKey;

  // Animasyonlu nokta
  useEffect(() => {
    if (!loading) return;
    const i = setInterval(() => setDotCount((d) => (d + 1) % 4), 400);
    return () => clearInterval(i);
  }, [loading]);

  const handleGenerate = async () => {
    if (!selectedDisorder || !selectedMaterial) return;
    if (!hasApiKey) {
      setError("Ayarlar sayfasından Gemini API anahtarı girmeniz gerekiyor.");
      return;
    }
    setLoading(true);
    setError("");
    setResult("");
    setStep("result");

    try {
      const text = await generateCrocodilMaterial(
        {
          disorder: selectedDisorder,
          materialType: selectedMaterial,
          ageGroup,
          severity,
          targetSound: targetSound || undefined,
          applicationContext: "clinic",
          language,
          additionalNotes: additionalNotes || undefined,
        },
        settings!.geminiApiKey!
      );
      setResult(text);
    } catch (err: any) {
      setError(err?.message ?? "Bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    if (!result || !selectedDisorder || !selectedMaterial) return;
    const disorder = DISORDER_CARDS.find((d) => d.key === selectedDisorder);
    const material = MATERIAL_TYPES.find((m) => m.key === selectedMaterial);
    saveAIMaterial({
      request: {
        disorder: selectedDisorder,
        materialType: selectedMaterial,
        ageGroup,
        severity,
        targetSound,
        language,
        additionalNotes,
        applicationContext: "clinic",
      },
      content: result,
      title: `${disorder?.label ?? ""} — ${material?.label ?? ""}`,
    });
    alert("Materyal kaydedildi!");
  };

  const handleReset = () => {
    setStep("disorder");
    setResult("");
    setError("");
    setSelectedDisorder(null);
    setSelectedMaterial(null);
    setTargetSound("");
    setAdditionalNotes("");
  };

  return (
    <div className="flex flex-col h-full" style={{ background: "#f8fffe" }}>
      {/* Header */}
      <div className="px-5 py-4 border-b" style={{ background: "white", borderColor: "#e5f7f5" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #d97706, #b45309)" }}
            >
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-800">Crocodil AI</h1>
              <p className="text-xs text-gray-400">Gemini 2.0 Flash destekli materyal üretici</p>
            </div>
          </div>
          {!hasApiKey && (
            <Link href="/crocodil/ayarlar">
              <button
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border"
                style={{ borderColor: "#fbbf24", color: "#d97706" }}
              >
                <Settings className="w-3.5 h-3.5" />
                API Ayarları
              </button>
            </Link>
          )}
        </div>

        {/* İlerleme */}
        <div className="flex items-center gap-2 mt-3">
          {(["disorder", "details", "result"] as Step[]).map((s, i) => (
            <React.Fragment key={s}>
              <div
                className="flex items-center gap-1.5 text-xs font-medium transition-colors"
                style={{ color: step === s ? "#0d9488" : i < ["disorder","details","result"].indexOf(step) ? "#10b981" : "#9ca3af" }}
              >
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{
                    background: step === s ? "#0d9488" : i < ["disorder","details","result"].indexOf(step) ? "#10b981" : "#e5e7eb",
                    color: step === s || i < ["disorder","details","result"].indexOf(step) ? "white" : "#9ca3af",
                  }}
                >
                  {i < ["disorder","details","result"].indexOf(step) ? "✓" : i + 1}
                </div>
                <span className="hidden sm:block">
                  {s === "disorder" ? "Bozukluk" : s === "details" ? "Detaylar" : "Sonuç"}
                </span>
              </div>
              {i < 2 && <ChevronRight className="w-3 h-3 text-gray-300" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* API uyarısı */}
      {!hasApiKey && (
        <div className="mx-5 mt-4 p-3 rounded-xl border flex items-start gap-2"
          style={{ background: "rgba(217,119,6,0.08)", borderColor: "rgba(217,119,6,0.3)" }}>
          <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            AI özelliği için Ayarlar sayfasından Gemini API anahtarı girmeniz gerekiyor.{" "}
            <Link href="/crocodil/ayarlar" className="underline font-medium">Ayarlara git →</Link>
          </p>
        </div>
      )}

      {/* İçerik */}
      <div className="flex-1 overflow-y-auto p-5">
        <AnimatePresence mode="wait">

          {/* ADIM 1: Bozukluk Seçimi */}
          {step === "disorder" && (
            <motion.div key="disorder" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-base font-bold text-gray-800 mb-4">
                Hangi bozukluk sınıfı için materyal üretilecek?
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                {DISORDER_CARDS.map((d) => (
                  <motion.button
                    key={d.key}
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setSelectedDisorder(d.key)}
                    className="rounded-2xl p-4 text-center border transition-all"
                    style={{
                      background: selectedDisorder === d.key ? `${d.color}12` : "white",
                      borderColor: selectedDisorder === d.key ? `${d.color}60` : "#e5e7eb",
                      boxShadow: selectedDisorder === d.key ? `0 0 0 2px ${d.color}40` : "none",
                    }}
                  >
                    <div className="text-3xl mb-2">{d.emoji}</div>
                    <div className="text-xs font-semibold text-gray-700">{d.label}</div>
                  </motion.button>
                ))}
              </div>

              <div className="sticky bottom-0">
                <motion.button
                  whileHover={{ scale: selectedDisorder ? 1.02 : 1 }}
                  whileTap={{ scale: selectedDisorder ? 0.98 : 1 }}
                  onClick={() => selectedDisorder && setStep("details")}
                  disabled={!selectedDisorder}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40"
                  style={{ background: "linear-gradient(135deg, #0d9488, #134e4a)" }}
                >
                  Devam Et →
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ADIM 2: Detaylar */}
          {step === "details" && (
            <motion.div key="details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-xl">
              <div className="flex items-center gap-2 mb-4">
                <button onClick={() => setStep("disorder")} className="text-gray-400 hover:text-gray-600">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h2 className="text-base font-bold text-gray-800">Materyal Detayları</h2>
              </div>

              {/* Materyal Türü */}
              <div className="mb-4">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">Materyal Türü</label>
                <div className="grid grid-cols-1 gap-2">
                  {MATERIAL_TYPES.map((m) => (
                    <button
                      key={m.key}
                      onClick={() => setSelectedMaterial(m.key)}
                      className="flex items-center gap-3 p-3 rounded-xl border text-left transition-all"
                      style={{
                        background: selectedMaterial === m.key ? "rgba(13,148,136,0.08)" : "white",
                        borderColor: selectedMaterial === m.key ? "rgba(13,148,136,0.4)" : "#e5e7eb",
                      }}
                    >
                      <span className="text-xl">{m.emoji}</span>
                      <div>
                        <div className="text-sm font-medium text-gray-800">{m.label}</div>
                        <div className="text-xs text-gray-400">{m.desc}</div>
                      </div>
                      {selectedMaterial === m.key && (
                        <Check className="w-4 h-4 text-teal-500 ml-auto flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Yaş & Şiddet */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Yaş Grubu</label>
                  <select
                    value={ageGroup}
                    onChange={(e) => setAgeGroup(e.target.value as AgeGroup)}
                    className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-400"
                    style={{ borderColor: "#e5e7eb" }}
                  >
                    {AGE_OPTIONS.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Şiddet</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as SeverityLevel)}
                    className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-400"
                    style={{ borderColor: "#e5e7eb" }}
                  >
                    {SEVERITY_OPTIONS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Dil */}
              <div className="mb-4">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Materyal Dili</label>
                <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: "#e5e7eb" }}>
                  {[{ key: "tr" as const, label: "🇹🇷 Türkçe" }, { key: "en" as const, label: "🇬🇧 İngilizce" }].map((l) => (
                    <button key={l.key} onClick={() => setLanguage(l.key)}
                      className="flex-1 py-2 text-sm font-medium transition-all"
                      style={{ background: language === l.key ? "#0d9488" : "white", color: language === l.key ? "white" : "#6b7280" }}>
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hedef (opsiyonel) */}
              {(selectedDisorder === "articulation" || selectedDisorder === "language") && (
                <div className="mb-4">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">
                    {selectedDisorder === "articulation" ? "Hedef Ses (opsiyonel)" : "Hedef Yapı (opsiyonel)"}
                  </label>
                  <input
                    type="text"
                    value={targetSound}
                    onChange={(e) => setTargetSound(e.target.value)}
                    placeholder={selectedDisorder === "articulation" ? "örn. /r/, /s/, /k/" : "örn. fiil çekimi, soru cümlesi"}
                    className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-400"
                    style={{ borderColor: "#e5e7eb" }}
                  />
                </div>
              )}

              {/* Ek notlar */}
              <div className="mb-5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Ek Notlar (opsiyonel)</label>
                <textarea
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  placeholder="Özel tercihler veya klinisyen notları..."
                  rows={3}
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-400 resize-none"
                  style={{ borderColor: "#e5e7eb" }}
                />
              </div>

              <motion.button
                whileHover={{ scale: selectedMaterial ? 1.02 : 1 }}
                whileTap={{ scale: selectedMaterial ? 0.98 : 1 }}
                onClick={handleGenerate}
                disabled={!selectedMaterial || !hasApiKey}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, #d97706, #0d9488)" }}
              >
                <Sparkles className="w-4 h-4" />
                Materyal Üret
              </motion.button>
            </motion.div>
          )}

          {/* ADIM 3: Sonuç */}
          {step === "result" && (
            <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="text-5xl mb-6"
                  >
                    🐊
                  </motion.div>
                  <h3 className="text-lg font-bold text-gray-800 mb-2">Crocodil düşünüyor{".".repeat(dotCount + 1)}</h3>
                  <p className="text-sm text-gray-400">Gemini 2.0 Flash ile klinik materyal hazırlanıyor</p>
                  <div className="flex gap-1 mt-4">
                    {[0, 1, 2].map((i) => (
                      <motion.div key={i}
                        animate={{ scale: [1, 1.4, 1] }}
                        transition={{ duration: 0.8, delay: i * 0.2, repeat: Infinity }}
                        className="w-2 h-2 rounded-full"
                        style={{ background: "#0d9488" }}
                      />
                    ))}
                  </div>
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">❌</div>
                  <p className="text-red-600 font-medium">{error}</p>
                  <button onClick={handleReset}
                    className="mt-4 px-4 py-2 rounded-xl text-sm font-medium border"
                    style={{ borderColor: "#e5e7eb", color: "#6b7280" }}>
                    Tekrar Dene
                  </button>
                </div>
              ) : (
                <>
                  {/* Aksiyon butonları */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{DISORDER_CARDS.find((d) => d.key === selectedDisorder)?.emoji}</span>
                      <span className="text-sm font-semibold text-gray-700">
                        {MATERIAL_TYPES.find((m) => m.key === selectedMaterial)?.label}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleReset}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs border hover:bg-gray-50 transition-colors"
                        style={{ borderColor: "#e5e7eb", color: "#6b7280" }}>
                        <RefreshCw className="w-3.5 h-3.5" />
                        Yeni Üret
                      </button>
                      <button onClick={handleCopy}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs border transition-colors"
                        style={{ borderColor: copied ? "#10b981" : "#e5e7eb", color: copied ? "#10b981" : "#6b7280" }}>
                        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? "Kopyalandı!" : "Kopyala"}
                      </button>
                      <button onClick={handleSave}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-white"
                        style={{ background: "linear-gradient(135deg, #0d9488, #134e4a)" }}>
                        <Download className="w-3.5 h-3.5" />
                        Kaydet
                      </button>
                    </div>
                  </div>

                  {/* Sonuç içeriği */}
                  <div
                    ref={resultRef}
                    className="bg-white rounded-2xl p-5 border text-sm leading-relaxed"
                    style={{ borderColor: "#f0fdf9", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(result) }}
                  />

                  {/* Uyarı */}
                  <div className="mt-3 p-3 rounded-xl flex items-start gap-2"
                    style={{ background: "rgba(217,119,6,0.06)", border: "1px solid rgba(217,119,6,0.2)" }}>
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700">
                      AI tarafından üretilen içerikler klinik yargınızla değerlendirilmelidir. Kullanmadan önce gözden geçirin.
                    </p>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
