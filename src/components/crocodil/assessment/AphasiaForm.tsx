"use client";
import React, { useState } from "react";
import type { AssessmentFormProps } from "./shared";
import { LABEL, INPUT, SECTION, SECTION_TITLE, TEXTAREA, CheckboxGroup, RadioGroup, SaveBar } from "./shared";

const APHASIA_TYPES = ["Broca", "Wernicke", "Global", "İletim", "Anomik", "Transkortikal Motor", "Transkortikal Duyusal", "Karma", "Sınıflandırılamayan"];
const MODALITIES = [
  { key: "spontaneousSpeech", label: "Spontan Konuşma (Akıcılık / İçerik)" },
  { key: "auditoryComprehension", label: "İşitsel Anlama" },
  { key: "repetition", label: "Tekrarlama" },
  { key: "naming", label: "Adlandırma" },
  { key: "reading", label: "Okuma" },
  { key: "writing", label: "Yazma" },
];

export default function AphasiaForm({ assessment, onSave }: AssessmentFormProps) {
  const [data, setData] = useState(assessment.aphasia ?? {
    aphasiaType: "",
    wabAq: undefined, wabCq: undefined, wabLq: undefined,
    bntScore: undefined,
    cetiScore: undefined,
    modalities: {},
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave({ aphasia: data });
    setSaving(false);
  };

  const updateModality = (modKey: string, score: number) => {
    setData((d) => ({
      ...d, modalities: { ...d.modalities, [modKey]: score }
    }));
  };

  return (
    <div className="p-5 max-w-2xl mx-auto">

      {/* Tip & Genel Notlar */}
      <div className={SECTION} style={{ borderColor: "#fecaca" }}>
        <div className={SECTION_TITLE}><span>🧠</span>Afazi Tipi & Klinik İzlenim</div>
        <div>
          <label className={LABEL}>Klasik Afazi Sınıflandırması</label>
          <div className="flex gap-2 flex-wrap">
            {APHASIA_TYPES.map((opt) => (
              <button key={opt}
                onClick={() => setData((d) => ({ ...d, aphasiaType: opt }))}
                className="px-3 py-1.5 rounded-xl text-xs border transition-all"
                style={{ background: data.aphasiaType === opt ? "#ef4444" : "white",
                  borderColor: data.aphasiaType === opt ? "#ef4444" : "#e5e7eb", color: data.aphasiaType === opt ? "white" : "#374151" }}>
                {opt}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={LABEL}>Klinik Gözlem & Dil Profili (Paragraflı Özeti)</label>
          <textarea value={data.notes ?? ""} onChange={(e) => setData((d) => ({ ...d, notes: e.target.value }))}
            placeholder="Hasta konuşurken çok efor sarf ediyor mu? Paragramatizm var mı? Jargon veya neolojizm kullanıyor mu? Fasiyal asimetri veya hemipleji eşlik ediyor mu?..." rows={4}
            className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-red-400 resize-none" style={{ borderColor: "#e5e7eb" }} />
        </div>
      </div>

      {/* Modalite Profili (0-10) */}
      <div className={SECTION} style={{ borderColor: "#fecaca" }}>
        <div className={SECTION_TITLE}><span>📊</span>Modalite Profili</div>
        <div className="p-2 rounded-xl text-xs mb-3" style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c" }}>
          Klinik gözleme dayalı genel beceri düzeyi: 0 (Yok/Çok Ağır) — 10 (Normale Yakın)
        </div>
        <div className="space-y-3">
          {MODALITIES.map(({ key, label }) => {
            const score = (data.modalities as any)?.[key];
            return (
              <div key={key}>
                <div className="flex justify-between mb-1">
                  <label className={LABEL}>{label}</label>
                  <span className="text-xs font-bold" style={{ color: "#ef4444" }}>{score ?? "—"}</span>
                </div>
                <input type="range" min={0} max={10} step={1} value={score ?? 0}
                  onChange={(e) => updateModality(key, Number(e.target.value))}
                  className="w-full accent-red-500" />
              </div>
            );
          })}
        </div>
      </div>

      {/* Test Skorları */}
      <div className={SECTION} style={{ borderColor: "#fecaca" }}>
        <div className={SECTION_TITLE}><span>📋</span>Standart Test Skorları</div>
        
        {/* WAB-R */}
        <div className="mb-4">
          <label className="text-sm font-semibold text-gray-700 block mb-2">WAB-R (Western Aphasia Battery)</label>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={LABEL}>Afazi Katsayısı (AQ)</label>
              <input type="number" step={0.1} value={data.wabAq ?? ""} placeholder="0-100"
                onChange={(e) => setData((d) => ({ ...d, wabAq: e.target.value ? Number(e.target.value) : undefined }))}
                className={INPUT} style={{ borderColor: "#e5e7eb" }} />
              <p className="text-[10px] text-gray-400 mt-1">Konuşma+Anlama</p>
            </div>
            <div>
              <label className={LABEL}>Kortikal Katsayı (CQ)</label>
              <input type="number" step={0.1} value={data.wabCq ?? ""} placeholder="0-100"
                onChange={(e) => setData((d) => ({ ...d, wabCq: e.target.value ? Number(e.target.value) : undefined }))}
                className={INPUT} style={{ borderColor: "#e5e7eb" }} />
              <p className="text-[10px] text-gray-400 mt-1">+Okuma+Yazma+Apraksi</p>
            </div>
            <div>
              <label className={LABEL}>Dil Katsayısı (LQ)</label>
              <input type="number" step={0.1} value={data.wabLq ?? ""} placeholder="0-100"
                onChange={(e) => setData((d) => ({ ...d, wabLq: e.target.value ? Number(e.target.value) : undefined }))}
                className={INPUT} style={{ borderColor: "#e5e7eb" }} />
            </div>
          </div>
        </div>

        {/* BNT & CETI */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">BNT (Boston Naming Test)</label>
            <label className={LABEL}>Toplam Doğru</label>
            <input type="number" value={data.bntScore ?? ""} placeholder="/60"
              onChange={(e) => setData((d) => ({ ...d, bntScore: e.target.value ? Number(e.target.value) : undefined }))}
              className={INPUT} style={{ borderColor: "#e5e7eb" }} />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">CETI</label>
            <label className={LABEL}>İletişim Etkililiği Ölçeği</label>
            <input type="number" value={data.cetiScore ?? ""} placeholder="/160 (VAS toplamı)"
              onChange={(e) => setData((d) => ({ ...d, cetiScore: e.target.value ? Number(e.target.value) : undefined }))}
              className={INPUT} style={{ borderColor: "#e5e7eb" }} />
          </div>
        </div>
      </div>

      <SaveBar onSave={handleSave} saving={saving} />
    </div>
  );
}
