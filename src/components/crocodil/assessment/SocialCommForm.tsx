"use client";
import React, { useState } from "react";
import type { AssessmentFormProps } from "./shared";
import { LABEL, INPUT, SECTION, SECTION_TITLE, TEXTAREA, CheckboxGroup, SaveBar } from "./shared";

const SOCIAL_BEHAVIORS = [
  { key: "jointAttention", label: "Ortak Dikkat (Joint Attention)" },
  { key: "eyeContact", label: "Göz Teması" },
  { key: "turnTaking", label: "Sıra Bekleme / Alma" },
  { key: "imitation", label: "Taklit Becerileri" },
  { key: "facialExpressions", label: "Yüz İfadeleri / Mimik Kullanımı" },
  { key: "gestures", label: "Jest Kullanımı (İşaret etme vb.)" },
  { key: "theoryOfMind", label: "Zihin Kuramı (Theory of Mind)" },
];

export default function SocialCommForm({ assessment, onSave }: AssessmentFormProps) {
  const [data, setData] = useState(assessment.socialComm ?? {
    behaviors: {},
    aq10Score: undefined,
    playSkills: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave({ socialComm: data });
    setSaving(false);
  };

  const updateBehavior = (key: string, value: string) => {
    setData((d) => ({
      ...d, behaviors: { ...d.behaviors, [key]: value }
    }));
  };

  return (
    <div className="p-5 max-w-2xl mx-auto">
      <div className={SECTION} style={{ borderColor: "#fbcfe8" }}>
        <div className={SECTION_TITLE}><span>🤝</span>Sosyal İletişim & Pragmatik Beceriler</div>

        <div className="space-y-3 mb-6">
          {SOCIAL_BEHAVIORS.map(({ key, label }) => {
            const currentVal = (data.behaviors as any)?.[key];
            return (
              <div key={key} className="flex items-center justify-between border-b pb-2" style={{ borderColor: "#fce7f3" }}>
                <span className="text-sm text-gray-700">{label}</span>
                <div className="flex gap-1">
                  {["Yok", "Tutarsız", "İşlevsel"].map((opt) => (
                    <button key={opt} onClick={() => updateBehavior(key, opt)}
                      className="px-2 py-1 rounded-lg text-xs border transition-all"
                      style={{ background: currentVal === opt ? "#ec4899" : "white",
                        borderColor: currentVal === opt ? "#ec4899" : "#e5e7eb", color: currentVal === opt ? "white" : "#374151" }}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mb-4">
          <label className={LABEL}>Oyun Becerileri (Özellikle Pediatrik)</label>
          <textarea value={data.playSkills ?? ""} onChange={(e) => setData((d) => ({ ...d, playSkills: e.target.value }))}
            placeholder="Yalnız oyun, paralel oyun, sembolik oyun (mış gibi yapma), işbirliğine dayalı oyun düzeyleri..." rows={2}
            className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-pink-400 resize-none" style={{ borderColor: "#e5e7eb" }} />
        </div>

        <div className="mb-4">
          <label className={LABEL}>AQ-10 Skoru (Autism Spectrum Quotient - Kısa Form)</label>
          <input type="number" min={0} max={10} value={data.aq10Score ?? ""} placeholder="/10 (Yetişkin/Çocuk/Ergen formu)"
            onChange={(e) => setData((d) => ({ ...d, aq10Score: e.target.value ? Number(e.target.value) : undefined }))}
            className={INPUT} style={{ borderColor: "#e5e7eb" }} />
          <p className="text-[10px] text-gray-400 mt-1">Tarama amaçlıdır, tanı koydurmaz (Kesme puanı genellikle ≥ 6)</p>
        </div>

        <div>
          <label className={LABEL}>Sosyal İletişim / Pragmatik Notları</label>
          <textarea value={data.notes ?? ""} onChange={(e) => setData((d) => ({ ...d, notes: e.target.value }))}
            placeholder="Mecaz anlama, sosyal ipuçlarını okuma, sıra alma, empati, stereotipik davranışlar, vb..." rows={3}
            className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-pink-400 resize-none" style={{ borderColor: "#e5e7eb" }} />
        </div>
      </div>
      <SaveBar onSave={handleSave} saving={saving} />
    </div>
  );
}
