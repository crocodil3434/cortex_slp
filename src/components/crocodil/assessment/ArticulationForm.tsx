"use client";
import React, { useState } from "react";
import type { AssessmentFormProps } from "./shared";
import { LABEL, INPUT, SECTION, SECTION_TITLE, TEXTAREA, CheckboxGroup, SaveBar } from "./shared";
import type { SoundInventoryItem } from "@/lib/crocodil/types";

// ── Türkçe Standart 21 Ünsüz Fonemi (IPA & Harf Karşılıkları) ─────────────────
const TR_CONSONANTS = [
  { ipa: "p",   label: "p", desc: "Ötümsüz Çift Dudak Patlamalı" },
  { ipa: "b",   label: "b", desc: "Ötümlü Çift Dudak Patlamalı" },
  { ipa: "t",   label: "t", desc: "Ötümsüz Dişyuvasıl Patlamalı" },
  { ipa: "d",   label: "d", desc: "Ötümlü Dişyuvasıl Patlamalı" },
  { ipa: "k",   label: "k", desc: "Ötümsüz Artdamaksıl/Öndamaksıl Patlamalı" },
  { ipa: "ɡ",   label: "g", desc: "Ötümlü Artdamaksıl/Öndamaksıl Patlamalı" },
  { ipa: "t͡ʃ", label: "ç", desc: "Ötümsüz Artdişyuvasıl Sürtüşmeli Patlamalı" },
  { ipa: "d͡ʒ", label: "c", desc: "Ötümlü Artdişyuvasıl Sürtüşmeli Patlamalı" },
  { ipa: "f",   label: "f", desc: "Ötümsüz Dudak-Diş Sürtüşmeli" },
  { ipa: "v",   label: "v", desc: "Ötümlü Dudak-Diş Sürtüşmeli" },
  { ipa: "s",   label: "s", desc: "Ötümsüz Dişyuvasıl Sürtüşmeli" },
  { ipa: "z",   label: "z", desc: "Ötümlü Dişyuvasıl Sürtüşmeli" },
  { ipa: "ʃ",   label: "ş", desc: "Ötümsüz Artdişyuvasıl Sürtüşmeli" },
  { ipa: "ʒ",   label: "j", desc: "Ötümlü Artdişyuvasıl Sürtüşmeli" },
  { ipa: "h",   label: "h", desc: "Ötümsüz Gırtlaksıl Sürtüşmeli" },
  { ipa: "m",   label: "m", desc: "Çift Dudak Genizsil" },
  { ipa: "n",   label: "n", desc: "Dişyuvasıl Genizsil" },
  { ipa: "l",   label: "l", desc: "Dişyuvasıl Yansıl Sürtüşmesiz" },
  { ipa: "ɾ",   label: "r", desc: "Dişyuvasıl Çarpmalı/Titremeli" },
  { ipa: "j",   label: "y", desc: "Öndamaksıl Sürtüşmesiz" },
  { ipa: "ɰ",   label: "ğ", desc: "Ötümlü Artdamaksıl Sürtüşmesiz (Yumuşak G)" },
];

// ── Türkçe Standart 8 Ünlü Fonemi (IPA & Artikülasyon Özellikleri) ─────────────
const TR_VOWELS = [
  // Düz Ünlüler
  { ipa: "a", label: "a", type: "Düz-Geniş-Art (Kalın)", desc: "Açık, Art, Düz" },
  { ipa: "e", label: "e", type: "Düz-Geniş-Ön (İnce)", desc: "Açık-orta, Ön, Düz [e/ɛ]" },
  { ipa: "ɯ", label: "ı", type: "Düz-Dar-Art (Kalın)",   desc: "Kapalı, Art, Düz [ɯ]" },
  { ipa: "i", label: "i", type: "Düz-Dar-Ön (İnce)",   desc: "Kapalı, Ön, Düz [i]" },
  // Yuvarlak Ünlüler
  { ipa: "o", label: "o", type: "Yuvarlak-Geniş-Art (Kalın)", desc: "Açık-orta, Art, Yuvarlak [o/ɔ]" },
  { ipa: "œ", label: "ö", type: "Yuvarlak-Geniş-Ön (İnce)", desc: "Açık-orta, Ön, Yuvarlak [œ/ø]" },
  { ipa: "u", label: "u", type: "Yuvarlak-Dar-Art (Kalın)",   desc: "Kapalı, Art, Yuvarlak [u]" },
  { ipa: "y", label: "ü", type: "Yuvarlak-Dar-Ön (İnce)",   desc: "Kapalı, Ön, Yuvarlak [y]" },
];

const STATUS_STYLES: Record<string, { bg: string; border: string; text: string; label: string }> = {
  correct:  { bg: "#ecfdf5", border: "#10b981", text: "#059669", label: "✓ Doğru" },
  error:    { bg: "#fef3c7", border: "#f59e0b", text: "#d97706", label: "⚠ Hatalı" },
  absent:   { bg: "#fef2f2", border: "#ef4444", text: "#dc2626", label: "✗ Yok" },
  untested: { bg: "white",   border: "#e5e7eb", text: "#9ca3af", label: "— Test Edilmedi" },
};

const FONOLOJIK_SURECLER = [
  "Ön sesletim (Fronting - /k, g/ → /t, d/)",
  "Art sesletim (Backing - /t, d/ → /k, g/)",
  "Duraklılaştırma (Stopping - Frikatiflerin patlamalıya çevrilmesi)",
  "Sürtüşmelileştirme (Gliding / Frikatifleştirme - /r/ → /y/ vb.)",
  "Ünsüz silinmesi - Sözcük Sonu (Final Consonant Deletion)",
  "Ünsüz silinmesi - Sözcük Başı (Initial Consonant Deletion)",
  "Ünsüz kümesi azaltma (Cluster Reduction - tren → ten)",
  "Hece silinmesi (Weak Syllable Deletion)",
  "Ekleme (Epenthesis - spor → sipor)",
  "Benzeşim (Assimilation / Velar/Labial Harmoni)",
  "Ötümlülük değişimi (Voicing / Devoicing)",
  "Denazalizasyon (/m, n/ genizsilliğinin kaybı)",
  "Ünlü uyumu bozulması & Ünlü Nötralleşmesi",
];

export default function ArticulationForm({ assessment, onSave }: AssessmentFormProps) {
  const [data, setData] = useState(assessment.articulation ?? {
    soundInventory: [] as SoundInventoryItem[],
    vowelInventory: [] as SoundInventoryItem[],
    tests: [],
    phonologicalProcesses: [] as string[],
    intelligibilityFamiliar: undefined,
    intelligibilityUnfamiliar: undefined,
    stimulabilityNotes: "",
    notes: "",
  });
  
  const [selectedConsonant, setSelectedConsonant] = useState<string | null>(null);
  const [selectedVowel, setSelectedVowel] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // ── Ünsüz Yardımcıları ──
  const getConsonantData = (ipa: string): SoundInventoryItem | undefined =>
    data.soundInventory.find((s) => s.sound === ipa);

  const setConsonantStatus = (ipa: string, status: "correct" | "error" | "absent") => {
    const exists = data.soundInventory.find((s) => s.sound === ipa);
    if (exists) {
      setData((d) => ({
        ...d,
        soundInventory: d.soundInventory.map((s) => s.sound === ipa ? { ...s, status } : s),
      }));
    } else {
      setData((d) => ({
        ...d,
        soundInventory: [...d.soundInventory, { sound: ipa, status }],
      }));
    }
    if (status === "error") setSelectedConsonant(ipa);
    else if (selectedConsonant === ipa) setSelectedConsonant(null);
  };

  const updateConsonantDetail = (ipa: string, updates: Partial<SoundInventoryItem>) => {
    setData((d) => ({
      ...d,
      soundInventory: d.soundInventory.map((s) => s.sound === ipa ? { ...s, ...updates } : s),
    }));
  };

  // ── Ünlü Yardımcıları ──
  const getVowelData = (ipa: string): SoundInventoryItem | undefined =>
    (data.vowelInventory ?? []).find((s) => s.sound === ipa);

  const setVowelStatus = (ipa: string, status: "correct" | "error" | "absent") => {
    const currentList = data.vowelInventory ?? [];
    const exists = currentList.find((s) => s.sound === ipa);
    if (exists) {
      setData((d) => ({
        ...d,
        vowelInventory: currentList.map((s) => s.sound === ipa ? { ...s, status } : s),
      }));
    } else {
      setData((d) => ({
        ...d,
        vowelInventory: [...currentList, { sound: ipa, status }],
      }));
    }
    if (status === "error") setSelectedVowel(ipa);
    else if (selectedVowel === ipa) setSelectedVowel(null);
  };

  const updateVowelDetail = (ipa: string, updates: Partial<SoundInventoryItem>) => {
    const currentList = data.vowelInventory ?? [];
    setData((d) => ({
      ...d,
      vowelInventory: currentList.map((s) => s.sound === ipa ? { ...s, ...updates } : s),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave({ articulation: data });
    setSaving(false);
  };

  return (
    <div className="p-5 max-w-3xl mx-auto space-y-5">

      {/* ── 1. TÜRKÇE ÜNSÜZ FONEM ENVANTERİ ─────────────────────────────────── */}
      <div className={SECTION} style={{ borderColor: "#ccfbf1" }}>
        <div className={SECTION_TITLE}>
          <span className="text-base">🔤</span>
          Türkçe Standart Ünsüz Fonem Envanteri (21 Ünsüz)
        </div>
        <div className="p-3 rounded-xl text-xs mb-3 flex items-center justify-between" style={{ background: "#f0fdf9", border: "1px solid #e5f7f5", color: "#475569" }}>
          <span>Tıklayarak durumu değiştirin: <strong className="text-green-600">✓ Doğru</strong> · <strong className="text-amber-600">⚠ Hatalı</strong> · <strong className="text-red-600">✗ Yok</strong></span>
          <span className="text-[11px] text-teal-700 font-semibold">TDK & IPA Standartları</span>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {TR_CONSONANTS.map(({ ipa, label, desc }) => {
            const soundData = getConsonantData(ipa);
            const status = soundData?.status ?? "untested";
            const style = STATUS_STYLES[status];
            const isSelected = selectedConsonant === ipa;

            return (
              <div key={ipa} className="flex flex-col gap-1">
                <button
                  title={`${label} [${ipa}] - ${desc}`}
                  className={`w-full aspect-square rounded-xl text-sm font-bold border-2 transition-all flex flex-col items-center justify-center relative ${
                    isSelected ? "ring-2 ring-amber-400 scale-105" : ""
                  }`}
                  style={{ background: style.bg, borderColor: style.border, color: style.text }}
                  onClick={() => {
                    const next = status === "untested" ? "correct" : status === "correct" ? "error" : status === "error" ? "absent" : "correct";
                    setConsonantStatus(ipa, next);
                  }}
                >
                  <span className="text-base leading-none">/{label}/</span>
                  <span className="text-[9px] font-mono opacity-60 mt-0.5">[{ipa}]</span>
                </button>
                <div className="text-center text-[9px] font-bold" style={{ color: style.text }}>
                  {status === "correct" ? "✓" : status === "error" ? "⚠ Hata" : status === "absent" ? "✗ Yok" : "—"}
                </div>
              </div>
            );
          })}
        </div>

        {/* Hatalı Ünsüz Detayı Paneli */}
        {selectedConsonant && (
          <div className="mt-3 p-3.5 rounded-xl border" style={{ background: "#fffbeb", borderColor: "#fcd34d" }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-amber-800">
                /{TR_CONSONANTS.find((c) => c.ipa === selectedConsonant)?.label ?? selectedConsonant}/ [{selectedConsonant}] Sesletim Hata Detayı:
              </p>
              <button onClick={() => setSelectedConsonant(null)} className="text-[11px] text-amber-700 hover:underline">Kapat ✕</button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>Hata Türü</label>
                <select
                  value={getConsonantData(selectedConsonant)?.errorType ?? ""}
                  onChange={(e) => updateConsonantDetail(selectedConsonant, { errorType: e.target.value as any })}
                  className={INPUT} style={{ borderColor: "#e5e7eb" }}
                >
                  <option value="">Seçin</option>
                  <option value="substitution">Substitüsyon (Yerine koyma - ör: /k/ → /t/)</option>
                  <option value="omission">Omisyon (Ses silinmesi - ör: kapı → apı)</option>
                  <option value="distortion">Distorsiyon (Çarpıtma / Pelteklik)</option>
                  <option value="addition">Ekleme (Epentez)</option>
                </select>
              </div>

              {getConsonantData(selectedConsonant)?.errorType === "substitution" && (
                <div>
                  <label className={LABEL}>Yerine Kullanılan Ses (Substitüsyon)</label>
                  <input
                    type="text"
                    placeholder="Örn: /s/ yerine /t/, /r/ yerine /y/"
                    value={getConsonantData(selectedConsonant)?.substitution ?? ""}
                    onChange={(e) => updateConsonantDetail(selectedConsonant, { substitution: e.target.value })}
                    className={INPUT} style={{ borderColor: "#e5e7eb" }}
                  />
                </div>
              )}
            </div>

            <div className="mt-3">
              <label className={LABEL}>Hatanın Görüldüğü Pozisyonlar</label>
              <div className="flex gap-2">
                {[
                  { v: "initial", l: "Sözcük Başı (SI)" },
                  { v: "medial",  l: "Sözcük Ortası (SM)" },
                  { v: "final",   l: "Sözcük Sonu (SF)" }
                ].map(({ v, l }) => {
                  const positions = getConsonantData(selectedConsonant)?.errorPosition ?? [];
                  const isPosSelected = positions.includes(v as any);
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => updateConsonantDetail(selectedConsonant, {
                        errorPosition: isPosSelected ? positions.filter((p) => p !== v) : [...positions, v as any]
                      })}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all"
                      style={{
                        background: isPosSelected ? "#f59e0b" : "white",
                        borderColor: isPosSelected ? "#f59e0b" : "#e5e7eb",
                        color: isPosSelected ? "white" : "#374151"
                      }}
                    >
                      {l}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Ünsüz Özet İstatistiği */}
        <div className="grid grid-cols-3 gap-2 mt-3 text-center">
          {["correct", "error", "absent"].map((status) => {
            const count = data.soundInventory.filter((s) => s.status === status).length;
            const style = STATUS_STYLES[status];
            return (
              <div key={status} className="rounded-xl p-2 border" style={{ background: style.bg, borderColor: style.border }}>
                <div className="text-base font-bold" style={{ color: style.text }}>{count} / 21</div>
                <div className="text-[11px] font-semibold" style={{ color: style.text }}>
                  {status === "correct" ? "Doğru Ünsüz" : status === "error" ? "Hatalı Ünsüz" : "Üretilemeyen (Yok)"}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 2. TÜRKÇE ÜNLÜ FONEM ENVANTERİ & BOZULMALARI ───────────────────────── */}
      <div className={SECTION} style={{ borderColor: "#fed7aa" }}>
        <div className={SECTION_TITLE}>
          <span className="text-base">🗣️</span>
          Türkçe Standart Ünlü Fonem Envanteri (8 Ünlü) & Sesbilimsel Analiz
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Özellikle motor konuşma etkilenmesi, CAS ve ağır fonolojik bozukluklarda görülen ünlü sapmalarını değerlendirin.
        </p>

        <div className="grid grid-cols-4 gap-2.5">
          {TR_VOWELS.map(({ ipa, label, type, desc }) => {
            const vowelData = getVowelData(ipa);
            const status = vowelData?.status ?? "untested";
            const style = STATUS_STYLES[status];
            const isSelected = selectedVowel === ipa;

            return (
              <div key={ipa} className="flex flex-col gap-1">
                <button
                  title={`${label} [${ipa}] - ${type} (${desc})`}
                  className={`w-full p-2.5 rounded-xl border-2 transition-all flex flex-col items-center justify-center relative ${
                    isSelected ? "ring-2 ring-orange-400 scale-105" : ""
                  }`}
                  style={{ background: style.bg, borderColor: style.border, color: style.text }}
                  onClick={() => {
                    const next = status === "untested" ? "correct" : status === "correct" ? "error" : status === "error" ? "absent" : "correct";
                    setVowelStatus(ipa, next);
                  }}
                >
                  <span className="text-lg font-bold leading-none">/{label}/</span>
                  <span className="text-[9px] font-mono opacity-70 mt-1">[{ipa}]</span>
                  <span className="text-[9px] font-medium text-gray-500 text-center line-clamp-1 mt-0.5">{type}</span>
                </button>
                <div className="text-center text-[9px] font-bold" style={{ color: style.text }}>
                  {status === "correct" ? "✓ Normal" : status === "error" ? "⚠ Bozulma" : status === "absent" ? "✗ Yok" : "—"}
                </div>
              </div>
            );
          })}
        </div>

        {/* Hatalı Ünlü Detayı Paneli */}
        {selectedVowel && (
          <div className="mt-3.5 p-3.5 rounded-xl border" style={{ background: "#fff7ed", borderColor: "#fdba74" }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-orange-900">
                /{TR_VOWELS.find((v) => v.ipa === selectedVowel)?.label ?? selectedVowel}/ [{selectedVowel}] Ünlü Bozulma Analizi:
              </p>
              <button onClick={() => setSelectedVowel(null)} className="text-[11px] text-orange-700 hover:underline">Kapat ✕</button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>Ünlü Sapma Türü</label>
                <select
                  value={getVowelData(selectedVowel)?.errorType ?? ""}
                  onChange={(e) => updateVowelDetail(selectedVowel, { errorType: e.target.value as any })}
                  className={INPUT} style={{ borderColor: "#fed7aa" }}
                >
                  <option value="">Seçin</option>
                  <option value="distortion">Ünlü Distorsiyonu (Kalite/Rezonans Bozulması)</option>
                  <option value="substitution">Ünlü Değişimi (Substitüsyon - ör: /a/ → /e/, /u/ → /o/)</option>
                  <option value="neutralization">Ünlü Nötralleşmesi (Merkez ünsüze kayma - Schwa)</option>
                  <option value="lengthening">Anormal Ünlü Uzatması / Kısalması</option>
                  <option value="addition">Diftonglaşma (Tek ünlünün iki ses gibi bölünmesi)</option>
                </select>
              </div>

              {getVowelData(selectedVowel)?.errorType === "substitution" && (
                <div>
                  <label className={LABEL}>Yerine Üretilen Ünlü</label>
                  <input
                    type="text"
                    placeholder="Örn: /a/ yerine /e/, /o/ yerine /u/"
                    value={getVowelData(selectedVowel)?.substitution ?? ""}
                    onChange={(e) => updateVowelDetail(selectedVowel, { substitution: e.target.value })}
                    className={INPUT} style={{ borderColor: "#fed7aa" }}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── 3. FONOLOJİK SÜREÇLER ───────────────────────────────────────────── */}
      <div className={SECTION} style={{ borderColor: "#e5f7f5" }}>
        <div className={SECTION_TITLE}><span>🔄</span>Fonolojik Süreçler (Fonemik Sapmalar)</div>
        <CheckboxGroup
          label="Danışanın konuşma örneğinde gözlenen fonolojik süreçleri işaretleyin:"
          options={FONOLOJIK_SURECLER}
          selected={data.phonologicalProcesses ?? []}
          onChange={(s) => setData((d) => ({ ...d, phonologicalProcesses: s }))}
        />
      </div>

      {/* ── 4. ANLAŞILIRLIK & STİMÜLABİLİTE ─────────────────────────────────── */}
      <div className={SECTION} style={{ borderColor: "#e5f7f5" }}>
        <div className={SECTION_TITLE}><span>📢</span>Konuşma Anlaşılırlığı & Stimülabilite (Uyarılabilirlik)</div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Tanıdık Dinleyici için Anlaşılırlık (%)</label>
            <input type="number" min={0} max={100} value={data.intelligibilityFamiliar ?? ""}
              onChange={(e) => setData((d) => ({ ...d, intelligibilityFamiliar: e.target.value ? Number(e.target.value) : undefined }))}
              placeholder="Örn: 80" className={INPUT} style={{ borderColor: "#e5e7eb" }} />
          </div>
          <div>
            <label className={LABEL}>Yabancı Dinleyici için Anlaşılırlık (%)</label>
            <input type="number" min={0} max={100} value={data.intelligibilityUnfamiliar ?? ""}
              onChange={(e) => setData((d) => ({ ...d, intelligibilityUnfamiliar: e.target.value ? Number(e.target.value) : undefined }))}
              placeholder="Örn: 50" className={INPUT} style={{ borderColor: "#e5e7eb" }} />
          </div>
        </div>
        <div className="p-3 rounded-xl text-xs" style={{ background: "#f0fdf9", border: "1px solid #e5f7f5", color: "#6b7280" }}>
          <strong>Gelişimsel Referans:</strong> 2 yaş: %50 tanıdık · 3 yaş: %75 · 4 yaş: %100 tanıdık / %75 yabancı · 5+ yaş: %100 her iki grup
        </div>
        <div>
          <label className={LABEL}>Stimülabilite Notları (İşitsel/Görsel/Dokunsal İpucu Yanıtı)</label>
          <textarea value={data.stimulabilityNotes ?? ""} onChange={(e) => setData((d) => ({ ...d, stimulabilityNotes: e.target.value }))}
            placeholder="Hatalı seslerin model olma ve dokunsal ipucuyla ses, hece, sözcük düzeyinde uyarılabilirlik durumu..." rows={2}
            className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-400 resize-none" style={{ borderColor: "#e5e7eb" }} />
        </div>
      </div>

      <SaveBar onSave={handleSave} saving={saving} />
    </div>
  );
}
