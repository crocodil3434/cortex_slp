"use client";
import React, { useState } from "react";
import type { AssessmentFormProps } from "./shared";
import { LABEL, INPUT, SECTION, SECTION_TITLE, TEXTAREA, CheckboxGroup, RadioGroup, SaveBar } from "./shared";
import { User, Stethoscope, Clock, BookOpen, AlertCircle } from "lucide-react";

export default function PersonalInfoForm({ assessment, onSave, client }: AssessmentFormProps) {
  const [data, setData] = useState(assessment.personal ?? {
    complaint: "", historyNotes: "", previousTherapy: false, previousTherapyDetails: "",
    medications: "", medicalHistory: "", familyHistory: "",
    firstWord: "", firstSentence: "", walkingAge: "",
  });
  const [saving, setSaving] = useState(false);

  const f = (key: keyof typeof data) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setData((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    await onSave({ personal: data });
    setSaving(false);
  };

  const isChild = client.birthDate
    ? Math.floor((Date.now() - new Date(client.birthDate).getTime()) / 31557600000) < 18
    : false;

  return (
    <div className="p-5 max-w-2xl mx-auto">

      {/* Ana Şikayet */}
      <div className={SECTION} style={{ borderColor: "#e5f7f5" }}>
        <div className={SECTION_TITLE}>
          <AlertCircle className="w-4 h-4 text-gray-500" />
          Ana Şikayet & Başvuru Nedeni
        </div>
        <div>
          <label className={LABEL}>Şikayetin Kendi İfadesiyle (veya ebeveyn ifadesi)</label>
          <textarea
            value={data.complaint}
            onChange={f("complaint")}
            placeholder="Danışanın veya ebeveynin başvuru sebebini kendi ifadesiyle not edin..."
            rows={3}
            className={TEXTAREA}
            style={{ borderColor: "#e5e7eb" }}
          />
        </div>
        <div>
          <label className={LABEL}>Şikayetin Başlangıcı</label>
          <textarea
            value={data.historyNotes}
            onChange={f("historyNotes")}
            placeholder="Ne zaman başladı? Ani mi, kademeli mi? Tetikleyici faktör var mı?..."
            rows={3}
            className={TEXTAREA}
            style={{ borderColor: "#e5e7eb" }}
          />
        </div>
      </div>

      {/* Tıbbi Geçmiş */}
      <div className={SECTION} style={{ borderColor: "#e5f7f5" }}>
        <div className={SECTION_TITLE}>
          <Stethoscope className="w-4 h-4 text-teal-600" />
          Tıbbi Geçmiş
        </div>
        <div>
          <label className={LABEL}>Tıbbi Öykü & Tanılar</label>
          <textarea
            value={data.medicalHistory}
            onChange={f("medicalHistory")}
            placeholder="İnme, TBI, serebral palsi, prematüre doğum, kulak enfeksiyonu öyküsü vb..."
            rows={3}
            className={TEXTAREA}
            style={{ borderColor: "#e5e7eb" }}
          />
        </div>
        <div>
          <label className={LABEL}>Kullanılan İlaçlar</label>
          <textarea
            value={data.medications}
            onChange={f("medications")}
            placeholder="Ses veya yutmayı etkileyebilecek ilaçlar özellikle not edilmeli (antipsikotik, ACE inhibitör, antihistaminik vb.)..."
            rows={2}
            className={TEXTAREA}
            style={{ borderColor: "#e5e7eb" }}
          />
        </div>
        <div>
          <label className={LABEL}>Aile Öyküsü</label>
          <textarea
            value={data.familyHistory}
            onChange={f("familyHistory")}
            placeholder="Ailede dil gecikmesi, kekemelik, işitme kaybı, nörolojik hastalık öyküsü..."
            rows={2}
            className={TEXTAREA}
            style={{ borderColor: "#e5e7eb" }}
          />
        </div>
      </div>

      {/* Önceki Terapi */}
      <div className={SECTION} style={{ borderColor: "#e5f7f5" }}>
        <div className={SECTION_TITLE}>
          <Clock className="w-4 h-4 text-teal-600" />
          Önceki Terapi Öyküsü
        </div>
        <RadioGroup
          label="Daha önce konuşma/dil terapisi aldı mı?"
          options={[
            { value: "true", label: "Evet, daha önce terapi aldı" },
            { value: "false", label: "Hayır, ilk kez başvuruyor" },
          ]}
          value={String(data.previousTherapy)}
          onChange={(v) => setData((d) => ({ ...d, previousTherapy: v === "true" }))}
          inline
        />
        {data.previousTherapy && (
          <div>
            <label className={LABEL}>Önceki Terapi Detayları</label>
            <textarea
              value={data.previousTherapyDetails}
              onChange={f("previousTherapyDetails")}
              placeholder="Ne kadar süre? Hangi yaklaşım? Son terapistin izlenimleri..."
              rows={2}
              className={TEXTAREA}
              style={{ borderColor: "#e5e7eb" }}
            />
          </div>
        )}
      </div>

      {/* Gelişimsel Öykü — sadece çocuklar */}
      {isChild && (
        <div className={SECTION} style={{ borderColor: "#e5f7f5" }}>
          <div className={SECTION_TITLE}>
            <BookOpen className="w-4 h-4 text-teal-600" />
            Gelişimsel Öykü (Çocuk)
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={LABEL}>İlk Sözcük (ay)</label>
              <input type="text" value={data.firstWord} onChange={f("firstWord")} placeholder="12 ay" className={INPUT} style={{ borderColor: "#e5e7eb" }} />
            </div>
            <div>
              <label className={LABEL}>İlk Cümle (ay)</label>
              <input type="text" value={data.firstSentence} onChange={f("firstSentence")} placeholder="24 ay" className={INPUT} style={{ borderColor: "#e5e7eb" }} />
            </div>
            <div>
              <label className={LABEL}>Yürüme (ay)</label>
              <input type="text" value={data.walkingAge} onChange={f("walkingAge")} placeholder="12 ay" className={INPUT} style={{ borderColor: "#e5e7eb" }} />
            </div>
          </div>
          <div className="p-3 rounded-xl text-xs" style={{ background: "#f0fdf9", border: "1px solid #e5f7f5", color: "#6b7280" }}>
            <strong>Beklenen Kilometre Taşları:</strong> İlk sözcük: 10-14 ay · İlk 2-sözcük birleşimi: 18-24 ay · Yürüme: 9-15 ay
          </div>
        </div>
      )}

      <SaveBar onSave={handleSave} saving={saving} />
    </div>
  );
}
