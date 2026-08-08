"use client";
import React, { useState } from "react";
import type { AssessmentFormProps } from "./shared";
import { LABEL, INPUT, SECTION, SECTION_TITLE, TEXTAREA, CheckboxGroup, SaveBar } from "./shared";

const DYSARTHRIA_TYPES = ["Spastik", "Flaksid", "Ataksik", "Hipokinetik", "Hiperkinetik", "UKS (Üst Motor Nöron)", "Karma"];
const APRAXIA_FEATURES = [
  "Sözcük uzadıkça artan hatalar", "Tutarsız ses hataları", 
  "Groping (Arama/Çabalama davranışı)", "Otomatik konuşmanın (sayma vb.) daha iyi olması", 
  "Prosodi bozukluğu (eşitlenmiş vurgu)", "Başlatma güçlüğü"
];

export default function MotorSpeechForm({ assessment, onSave }: AssessmentFormProps) {
  const [data, setData] = useState(assessment.motorSpeech ?? {
    diagnosisType: "",
    dysarthriaType: "",
    apraxiaFeatures: [],
    ddkAmr: undefined, ddkSmr: undefined,
    fda2Score: undefined,
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave({ motorSpeech: data });
    setSaving(false);
  };

  return (
    <div className="p-5 max-w-2xl mx-auto">
      <div className={SECTION} style={{ borderColor: "#ffedd5" }}>
        <div className={SECTION_TITLE}><span>⚙️</span>Motor Konuşma Bozukluğu</div>
        
        <div className="flex gap-2 mb-4">
          {["Dizartri", "Apraksi (AOS / CAS)", "Karma (Dizartri + Apraksi)"].map((opt) => (
            <button key={opt} onClick={() => setData((d) => ({ ...d, diagnosisType: opt }))}
              className="px-4 py-2 rounded-xl text-sm font-semibold border transition-all"
              style={{ background: data.diagnosisType === opt ? "#f97316" : "white",
                borderColor: data.diagnosisType === opt ? "#f97316" : "#e5e7eb", color: data.diagnosisType === opt ? "white" : "#4b5563" }}>
              {opt}
            </button>
          ))}
        </div>

        {(data.diagnosisType === "Dizartri" || data.diagnosisType === "Karma (Dizartri + Apraksi)") && (
          <div className="mb-4">
            <label className={LABEL}>Dizartri Tipi</label>
            <div className="flex gap-2 flex-wrap">
              {DYSARTHRIA_TYPES.map((opt) => (
                <button key={opt} onClick={() => setData((d) => ({ ...d, dysarthriaType: opt }))}
                  className="px-3 py-1.5 rounded-xl text-xs border transition-all"
                  style={{ background: data.dysarthriaType === opt ? "rgba(249,115,22,0.15)" : "white",
                    borderColor: data.dysarthriaType === opt ? "#f97316" : "#e5e7eb", color: data.dysarthriaType === opt ? "#ea580c" : "#374151" }}>
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}

        {(data.diagnosisType === "Apraksi (AOS / CAS)" || data.diagnosisType === "Karma (Dizartri + Apraksi)") && (
          <div className="mb-4">
            <CheckboxGroup label="Apraksi (CAS/AOS) Gözlemleri" options={APRAXIA_FEATURES} selected={data.apraxiaFeatures ?? []}
              onChange={(s) => setData((d) => ({ ...d, apraxiaFeatures: s }))} />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className={LABEL}>DDK - AMR (pa-pa-pa)</label>
            <input type="number" step="0.1" value={data.ddkAmr ?? ""} placeholder="sn (örn: 4.5)"
              onChange={(e) => setData((d) => ({ ...d, ddkAmr: e.target.value ? Number(e.target.value) : undefined }))}
              className={INPUT} style={{ borderColor: "#e5e7eb" }} />
          </div>
          <div>
            <label className={LABEL}>DDK - SMR (pa-ta-ka)</label>
            <input type="number" step="0.1" value={data.ddkSmr ?? ""} placeholder="sn (örn: 6.2)"
              onChange={(e) => setData((d) => ({ ...d, ddkSmr: e.target.value ? Number(e.target.value) : undefined }))}
              className={INPUT} style={{ borderColor: "#e5e7eb" }} />
          </div>
        </div>
        <p className="text-[10px] text-gray-400 mt-1 mb-4">Diadochokinetic (DDK) Rate. AMR: Alternating Motion Rate, SMR: Sequential Motion Rate</p>

        <div>
          <label className={LABEL}>Klinik Gözlem & Semptom Notları</label>
          <textarea value={data.notes ?? ""} onChange={(e) => setData((d) => ({ ...d, notes: e.target.value }))}
            placeholder="Respirasyon, fonasyon, artikülasyon, rezonans ve prosodi (5 alt sistem) analiziniz..." rows={4}
            className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400 resize-none" style={{ borderColor: "#e5e7eb" }} />
        </div>
      </div>
      <SaveBar onSave={handleSave} saving={saving} />
    </div>
  );
}
