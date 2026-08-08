"use client";
import React, { useState } from "react";
import type { AssessmentFormProps } from "./shared";
import { LABEL, INPUT, SECTION, SECTION_TITLE, TEXTAREA, CheckboxGroup, SaveBar } from "./shared";

const ACCESS_METHODS = ["Doğrudan Dokunma", "Göz İzleme (Eye Tracking)", "Anahtar (Switch) / Tarama", "İşaretçi (Kafa/Ağız)", "Partner Destekli Tarama"];
const SYMBOL_TYPES = ["Gerçek Nesne", "Fotoğraf", "Çizim (PCS/SymbolStix vb.)", "Yazı / Harf (Ortografi)"];

export default function AACForm({ assessment, onSave }: AssessmentFormProps) {
  const [data, setData] = useState(assessment.aac ?? {
    currentCommunication: "",
    accessMethod: [],
    symbolType: [],
    deviceHistory: "",
    recommendation: "",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave({ aac: data });
    setSaving(false);
  };

  return (
    <div className="p-5 max-w-2xl mx-auto">
      <div className={SECTION} style={{ borderColor: "#ccfbf1" }}>
        <div className={SECTION_TITLE}><span>💬</span>Alternatif & Destekleyici İletişim (AAC)</div>
        
        <div>
          <label className={LABEL}>Mevcut İletişim Yöntemleri</label>
          <textarea value={data.currentCommunication ?? ""} onChange={(e) => setData((d) => ({ ...d, currentCommunication: e.target.value }))}
            placeholder="Şu an ihtiyaçlarını nasıl belirtiyor? (jest, mimik, ağlama, işaret etme, vokalleşme)..." rows={3}
            className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-400 resize-none" style={{ borderColor: "#e5e7eb" }} />
        </div>

        <div>
          <label className={LABEL}>Cihaz / Deneyim Geçmişi</label>
          <textarea value={data.deviceHistory ?? ""} onChange={(e) => setData((d) => ({ ...d, deviceHistory: e.target.value }))}
            placeholder="Daha önce PECS, iletişim panosu veya tablet tabanlı bir uygulama (Proloquo2Go, Grid vb.) kullanıldı mı?..." rows={2}
            className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-400 resize-none" style={{ borderColor: "#e5e7eb" }} />
        </div>

        <CheckboxGroup label="Fiziksel Erişim Yöntemi (Önerilen/Denenecek)" options={ACCESS_METHODS} selected={data.accessMethod ?? []}
          onChange={(s) => setData((d) => ({ ...d, accessMethod: s }))} />

        <CheckboxGroup label="Sembol Tipi (Kognitif Düzeye Göre)" options={SYMBOL_TYPES} selected={data.symbolType ?? []}
          onChange={(s) => setData((d) => ({ ...d, symbolType: s }))} />

        <div className="mt-4">
          <label className={LABEL}>AAC Önerisi ve Hedefler</label>
          <textarea value={data.recommendation ?? ""} onChange={(e) => setData((d) => ({ ...d, recommendation: e.target.value }))}
            placeholder="Örn: 20 sembollü yüksek teknolojili tablet tabanlı sistem. Core vocabulary (temel sözcükler) öğretimi..." rows={4}
            className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-400 resize-none" style={{ borderColor: "#e5e7eb" }} />
        </div>
      </div>
      <SaveBar onSave={handleSave} saving={saving} />
    </div>
  );
}
