"use client";
import React, { useState } from "react";
import type { AssessmentFormProps } from "./shared";
import { LABEL, INPUT, SECTION, SECTION_TITLE, TEXTAREA, CheckboxGroup, SaveBar } from "./shared";
import type { SoundInventoryItem } from "@/lib/crocodil/types";

// Türkçe Ünsüz Envanteri (IPA)
const TR_CONSONANTS = [
  { ipa: "p", label: "p" }, { ipa: "b", label: "b" }, { ipa: "t", label: "t" },
  { ipa: "d", label: "d" }, { ipa: "k", label: "k" }, { ipa: "ɡ", label: "g" },
  { ipa: "tʃ", label: "ç" }, { ipa: "dʒ", label: "c" }, { ipa: "f", label: "f" },
  { ipa: "v", label: "v" }, { ipa: "s", label: "s" }, { ipa: "z", label: "z" },
  { ipa: "ʃ", label: "ş" }, { ipa: "ʒ", label: "j" }, { ipa: "h", label: "h" },
  { ipa: "m", label: "m" }, { ipa: "n", label: "n" }, { ipa: "ŋ", label: "ng" },
  { ipa: "l", label: "l" }, { ipa: "r", label: "r" }, { ipa: "j", label: "y" },
];

const STATUS_STYLES: Record<string, { bg: string; border: string; text: string; label: string }> = {
  correct:  { bg: "#ecfdf5", border: "#10b981", text: "#059669", label: "✓" },
  error:    { bg: "#fef3c7", border: "#f59e0b", text: "#d97706", label: "⚠" },
  absent:   { bg: "#fef2f2", border: "#ef4444", text: "#dc2626", label: "✗" },
  untested: { bg: "white",   border: "#e5e7eb", text: "#9ca3af", label: "?" },
};

const FONOLOJIK_SURECLER = [
  "Ünlü uyumu bozulması", "Ön sesletim (fronting)", "Art sesletim (backing)",
  "Duraklı ünsüz zayıflaması", "Ünsüz silinmesi (final)", "Ünsüz silinmesi (initial)",
  "Hece silinmesi (unstressed)", "Ekleme (epenthesis)", "Benzeşim (assimilation)",
  "Kümeleme azaltma", "Gliding (r→y)", "Stopping (frikatiflerin duraklıya çevrilmesi)",
  "Voicing değişimi", "Denazalizasyon",
];

export default function ArticulationForm({ assessment, onSave }: AssessmentFormProps) {
  const [data, setData] = useState(assessment.articulation ?? {
    soundInventory: [] as SoundInventoryItem[],
    tests: [],
    phonologicalProcesses: [] as string[],
    intelligibilityFamiliar: undefined,
    intelligibilityUnfamiliar: undefined,
    stimulabilityNotes: "",
    notes: "",
  });
  const [selectedSound, setSelectedSound] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const getSoundData = (ipa: string): SoundInventoryItem | undefined =>
    data.soundInventory.find((s) => s.sound === ipa);

  const setSoundStatus = (ipa: string, status: "correct" | "error" | "absent") => {
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
    if (status === "error") setSelectedSound(ipa);
    else setSelectedSound(null);
  };

  const updateSoundDetail = (ipa: string, updates: Partial<SoundInventoryItem>) => {
    setData((d) => ({
      ...d,
      soundInventory: d.soundInventory.map((s) => s.sound === ipa ? { ...s, ...updates } : s),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave({ articulation: data });
    setSaving(false);
  };

  return (
    <div className="p-5 max-w-2xl mx-auto">

      {/* IPA Ses Envanteri */}
      <div className={SECTION} style={{ borderColor: "#e5f7f5" }}>
        <div className={SECTION_TITLE}>
          <span className="text-base">🔤</span>
          IPA Ses Envanteri — Türkçe Ünsüzler
        </div>
        <div className="p-3 rounded-xl text-xs mb-3" style={{ background: "#f0fdf9", border: "1px solid #e5f7f5", color: "#6b7280" }}>
          Tıklayarak durumu seçin: <span className="text-green-600 font-medium">✓ Doğru</span> · <span className="text-amber-600 font-medium">⚠ Hatalı</span> · <span className="text-red-600 font-medium">✗ Yok</span>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {TR_CONSONANTS.map(({ ipa, label }) => {
            const soundData = getSoundData(ipa);
            const status = soundData?.status ?? "untested";
            const style = STATUS_STYLES[status];
            return (
              <div key={ipa} className="flex flex-col gap-1">
                <button
                  className="w-full aspect-square rounded-xl text-sm font-bold border-2 transition-all"
                  style={{ background: style.bg, borderColor: style.border, color: style.text }}
                  onClick={() => {
                    const next = status === "untested" ? "correct" : status === "correct" ? "error" : status === "error" ? "absent" : "correct";
                    setSoundStatus(ipa, next);
                  }}
                >
                  {label}
                </button>
                <div className="text-center text-[10px]" style={{ color: style.text }}>{style.label}</div>
              </div>
            );
          })}
        </div>

        {/* Hatalı ses detayı */}
        {selectedSound && (
          <div className="mt-3 p-3 rounded-xl border" style={{ background: "#fffbeb", borderColor: "#fcd34d" }}>
            <p className="text-xs font-semibold text-amber-700 mb-2">/{selectedSound}/ hata detayı:</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>Hata Türü</label>
                <select
                  value={getSoundData(selectedSound)?.errorType ?? ""}
                  onChange={(e) => updateSoundDetail(selectedSound, { errorType: e.target.value as any })}
                  className={INPUT} style={{ borderColor: "#e5e7eb" }}
                >
                  <option value="">Seçin</option>
                  <option value="substitution">Substitüsyon (yerine koyma)</option>
                  <option value="omission">Omisyon (silme)</option>
                  <option value="distortion">Distorsiyon (çarpıtma)</option>
                  <option value="addition">Ekleme</option>
                </select>
              </div>
              {getSoundData(selectedSound)?.errorType === "substitution" && (
                <div>
                  <label className={LABEL}>Yerine Kullanılan Ses</label>
                  <input type="text" placeholder="/t/ → /s/" value={getSoundData(selectedSound)?.substitution ?? ""}
                    onChange={(e) => updateSoundDetail(selectedSound, { substitution: e.target.value })}
                    className={INPUT} style={{ borderColor: "#e5e7eb" }} />
                </div>
              )}
            </div>
            <div className="mt-2">
              <label className={LABEL}>Pozisyon</label>
              <div className="flex gap-2">
                {[{ v: "initial", l: "Sözcük Başı" }, { v: "medial", l: "Sözcük Ortası" }, { v: "final", l: "Sözcük Sonu" }].map(({ v, l }) => {
                  const positions = getSoundData(selectedSound)?.errorPosition ?? [];
                  const isSelected = positions.includes(v as any);
                  return (
                    <button key={v}
                      onClick={() => updateSoundDetail(selectedSound, {
                        errorPosition: isSelected ? positions.filter((p) => p !== v) : [...positions, v as any]
                      })}
                      className="px-3 py-1.5 rounded-xl text-xs border transition-all"
                      style={{ background: isSelected ? "#f59e0b" : "white", borderColor: isSelected ? "#f59e0b" : "#e5e7eb", color: isSelected ? "white" : "#374151" }}>
                      {l}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Özet */}
        <div className="grid grid-cols-3 gap-2 mt-2 text-center">
          {Object.entries(STATUS_STYLES).filter(([k]) => k !== "untested").map(([status, style]) => {
            const count = data.soundInventory.filter((s) => s.status === status).length;
            return (
              <div key={status} className="rounded-xl p-2 border" style={{ background: style.bg, borderColor: style.border }}>
                <div className="text-lg font-bold" style={{ color: style.text }}>{count}</div>
                <div className="text-xs capitalize" style={{ color: style.text }}>
                  {status === "correct" ? "Doğru" : status === "error" ? "Hatalı" : "Yok"}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Fonolojik Süreçler */}
      <div className={SECTION} style={{ borderColor: "#e5f7f5" }}>
        <div className={SECTION_TITLE}><span>🔄</span>Fonolojik Süreçler</div>
        <CheckboxGroup
          label="Gözlenen fonolojik süreçleri işaretleyin:"
          options={FONOLOJIK_SURECLER}
          selected={data.phonologicalProcesses ?? []}
          onChange={(s) => setData((d) => ({ ...d, phonologicalProcesses: s }))}
        />
      </div>

      {/* Anlaşılırlık */}
      <div className={SECTION} style={{ borderColor: "#e5f7f5" }}>
        <div className={SECTION_TITLE}><span>📢</span>Anlaşılırlık & Stimülabilite</div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Tanıdık Kişi için Anlaşılırlık (%)</label>
            <input type="number" min={0} max={100} value={data.intelligibilityFamiliar ?? ""}
              onChange={(e) => setData((d) => ({ ...d, intelligibilityFamiliar: e.target.value ? Number(e.target.value) : undefined }))}
              placeholder="85" className={INPUT} style={{ borderColor: "#e5e7eb" }} />
          </div>
          <div>
            <label className={LABEL}>Yabancı Kişi için Anlaşılırlık (%)</label>
            <input type="number" min={0} max={100} value={data.intelligibilityUnfamiliar ?? ""}
              onChange={(e) => setData((d) => ({ ...d, intelligibilityUnfamiliar: e.target.value ? Number(e.target.value) : undefined }))}
              placeholder="60" className={INPUT} style={{ borderColor: "#e5e7eb" }} />
          </div>
        </div>
        <div className="p-3 rounded-xl text-xs" style={{ background: "#f0fdf9", border: "1px solid #e5f7f5", color: "#6b7280" }}>
          <strong>Referans:</strong> 2 yaş: %50 tanıdık · 3 yaş: %75 · 4 yaş: %100 tanıdık / %75 yabancı · 5+ yaş: %100 her ikisi
        </div>
        <div>
          <label className={LABEL}>Stimülabilite Notları</label>
          <textarea value={data.stimulabilityNotes ?? ""} onChange={(e) => setData((d) => ({ ...d, stimulabilityNotes: e.target.value }))}
            placeholder="Hatalı seslerin uyarım düzeyine yanıtı: ses düzeyi / hece / sözcük / cümle..." rows={2}
            className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-400 resize-none" style={{ borderColor: "#e5e7eb" }} />
        </div>
      </div>

      <SaveBar onSave={handleSave} saving={saving} />
    </div>
  );
}
