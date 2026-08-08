"use client";
import React, { useState } from "react";
import type { AssessmentFormProps } from "./shared";
import { LABEL, INPUT, SECTION, SECTION_TITLE, TEXTAREA, CheckboxGroup, RadioGroup, SaveBar, ScaleSelector } from "./shared";

const AVOIDANCE = ["Belirli konuşma ortamlarından kaçınma", "Sözcük değiştirme", "Konu değiştirme", "Telefon kullanmama", "Sosyal etkinliklerden çekilme", "İş/okul sunumlarından kaçınma", "Sessiz kalma / konuşmayı erteleme"];
const PHYSICAL_CONCOMITANTS = ["Baş sallama", "Göz kırpma artışı", "Yüz grimasi", "El/ayak sıkıştırma", "Göz kaçırma", "Ağız açma/kapama", "Boyun gerginliği", "Nefes tutma"];

export default function FluencyForm({ assessment, onSave }: AssessmentFormProps) {
  const [data, setData] = useState(assessment.fluency ?? {
    type: null,
    ssi4FrequencyScore: undefined, ssi4DurationScore: undefined, ssi4PhysicalScore: undefined,
    ssi4Total: undefined, ssi4Severity: "",
    sldPercent: undefined, avgDurationSeconds: undefined,
    oasesSection1: undefined, oasesSection2: undefined, oasesSection3: undefined, oasesSection4: undefined,
    avoidanceBehaviors: [] as string[], physicalConcomitants: [] as string[],
    contextVariability: "", notes: "",
  });
  const [saving, setSaving] = useState(false);

  const ssi4Total = (data.ssi4FrequencyScore ?? 0) + (data.ssi4DurationScore ?? 0) + (data.ssi4PhysicalScore ?? 0);
  const ssi4Severity = ssi4Total <= 10 ? "Çok Hafif" : ssi4Total <= 17 ? "Hafif" : ssi4Total <= 23 ? "Orta" : ssi4Total <= 27 ? "Orta-Ağır" : ssi4Total <= 35 ? "Ağır" : "Çok Ağır";

  const handleSave = async () => {
    setSaving(true);
    await onSave({ fluency: { ...data, ssi4Total, ssi4Severity } });
    setSaving(false);
  };

  return (
    <div className="p-5 max-w-2xl mx-auto">

      {/* Akıcısızlık Tipi */}
      <div className={SECTION} style={{ borderColor: "#e5f7f5" }}>
        <div className={SECTION_TITLE}><span>🌊</span>Akıcısızlık Bozukluğu Tipi</div>
        <RadioGroup
          label="Tanısal sınıflama:"
          options={[
            { value: "stuttering", label: "Kekemelik (Gelişimsel / Edinilmiş)" },
            { value: "cluttering", label: "Kluttering (Hızlı-Düzensiz Konuşma)" },
            { value: "neurogenic", label: "Nörojenik Akıcısızlık (ABI/İnme sonrası)" },
            { value: "mixed", label: "Karma (Kekemelik + Kluttering)" },
          ]}
          value={data.type ?? ""}
          onChange={(v) => setData((d) => ({ ...d, type: v as any }))}
        />
      </div>

      {/* SSI-4 */}
      <div className={SECTION} style={{ borderColor: "#e5f7f5" }}>
        <div className={SECTION_TITLE}><span>📊</span>SSI-4 — Stuttering Severity Instrument (4. Baskı)</div>
        <div className="grid grid-cols-1 gap-4">
          {/* Frekans */}
          <div>
            <label className={LABEL}>SLD% — Akıcısızlık Yüzdesi (%)</label>
            <input type="number" min={0} max={100} step={0.1} value={data.sldPercent ?? ""}
              onChange={(e) => setData((d) => ({ ...d, sldPercent: e.target.value ? Number(e.target.value) : undefined }))}
              placeholder="8.5" className={INPUT} style={{ borderColor: "#e5e7eb" }} />
            <p className="text-xs text-gray-400 mt-0.5">Spontan konuşma + monolog örneklerinden hesaplanır</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={LABEL}>Frekans Skoru (0-18)</label>
              <input type="number" min={0} max={18} value={data.ssi4FrequencyScore ?? ""}
                onChange={(e) => setData((d) => ({ ...d, ssi4FrequencyScore: e.target.value ? Number(e.target.value) : undefined }))}
                className={INPUT} style={{ borderColor: "#e5e7eb" }} />
            </div>
            <div>
              <label className={LABEL}>Süre Skoru (2-18)</label>
              <input type="number" min={2} max={18} value={data.ssi4DurationScore ?? ""}
                onChange={(e) => setData((d) => ({ ...d, ssi4DurationScore: e.target.value ? Number(e.target.value) : undefined }))}
                className={INPUT} style={{ borderColor: "#e5e7eb" }} />
              <p className="text-xs text-gray-400 mt-0.5">Uzamaların ortalama süresi</p>
            </div>
            <div>
              <label className={LABEL}>Fiziksel Skoru (0-20)</label>
              <input type="number" min={0} max={20} value={data.ssi4PhysicalScore ?? ""}
                onChange={(e) => setData((d) => ({ ...d, ssi4PhysicalScore: e.target.value ? Number(e.target.value) : undefined }))}
                className={INPUT} style={{ borderColor: "#e5e7eb" }} />
            </div>
          </div>

          {/* SSI-4 Toplam */}
          {(data.ssi4FrequencyScore !== undefined || data.ssi4DurationScore !== undefined) && (
            <div className="p-4 rounded-xl flex items-center gap-4" style={{ background: "linear-gradient(135deg, #f0fdf9, #ecfdf5)", border: "1px solid #a7f3d0" }}>
              <div className="text-center">
                <div className="text-3xl font-bold text-teal-700">{ssi4Total}</div>
                <div className="text-xs text-teal-600">Toplam</div>
              </div>
              <div className="h-12 w-px bg-teal-200" />
              <div>
                <div className="text-base font-bold text-teal-700">{ssi4Severity}</div>
                <div className="text-xs text-teal-500">SSI-4 Şiddet Kategorisi</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* OASES */}
      <div className={SECTION} style={{ borderColor: "#e5f7f5" }}>
        <div className={SECTION_TITLE}><span>😟</span>OASES — Kekemeliğin Yaşam Etkisi Ölçeği</div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: "oasesSection1" as const, label: "Bölüm I: Kekemelik hakkındaki genel görüş" },
            { key: "oasesSection2" as const, label: "Bölüm II: Kekemeliğe tepkiler" },
            { key: "oasesSection3" as const, label: "Bölüm III: Günlük iletişim" },
            { key: "oasesSection4" as const, label: "Bölüm IV: Yaşam kalitesi" },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className={LABEL}>{label}</label>
              <input type="number" min={1} max={5} step={0.1} value={data[key] ?? ""}
                onChange={(e) => setData((d) => ({ ...d, [key]: e.target.value ? Number(e.target.value) : undefined }))}
                placeholder="1-5" className={INPUT} style={{ borderColor: "#e5e7eb" }} />
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400">OASES: 1-5 ölçeği. ≥3.5 yüksek etki. Yetişkin/çocuk versiyonları mevcuttur.</p>
      </div>

      {/* Kaçınma Davranışları */}
      <div className={SECTION} style={{ borderColor: "#e5f7f5" }}>
        <CheckboxGroup
          label="Kaçınma Davranışları"
          options={AVOIDANCE}
          selected={data.avoidanceBehaviors ?? []}
          onChange={(s) => setData((d) => ({ ...d, avoidanceBehaviors: s }))}
          cols={1}
        />
      </div>

      {/* Eşlik Eden Davranışlar */}
      <div className={SECTION} style={{ borderColor: "#e5f7f5" }}>
        <CheckboxGroup
          label="Eşlik Eden Motor Davranışlar (Fiziksel Eşlikler)"
          options={PHYSICAL_CONCOMITANTS}
          selected={data.physicalConcomitants ?? []}
          onChange={(s) => setData((d) => ({ ...d, physicalConcomitants: s }))}
        />
      </div>

      {/* Bağlam Değişkenliği */}
      <div className={SECTION} style={{ borderColor: "#e5f7f5" }}>
        <label className={LABEL}>Konuşma Ortamına Göre Değişkenlik</label>
        <textarea value={data.contextVariability ?? ""} onChange={(e) => setData((d) => ({ ...d, contextVariability: e.target.value }))}
          placeholder="Telefon konuşmasında ağırlaşıyor mu? Yabancılarla, stres altında, okuma sırasında nasıl?..." rows={3}
          className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-400 resize-none" style={{ borderColor: "#e5e7eb" }} />
      </div>

      <SaveBar onSave={handleSave} saving={saving} />
    </div>
  );
}
