"use client";
import React, { useState } from "react";
import type { AssessmentFormProps } from "./shared";
import { LABEL, INPUT, SECTION, SECTION_TITLE, TEXTAREA, CheckboxGroup, RadioGroup, SaveBar } from "./shared";

const CSE_SYMPTOMS = [
  "Yutkunurken öksürme", "Yutkunma sonrası ses kısıklığı (wet voice)",
  "Salya akması / kontrol kaybı", "Ağızda yiyecek birikmesi",
  "Çiğneme güçlüğü", "Yutma gecikmesi", "Burundan yiyecek/sıvı gelmesi",
  "Kilo kaybı", "Tekrarlayan pnömoni",
];

const EAT10_ITEMS = [
  "Yutma problemim kilo kaybetmeme neden oluyor",
  "Yutma problemim dışarıda yemek yememe engel oluyor",
  "Yutma problemim sıvı gıdalar veya içecekleri tüketmemde zorluk yaratıyor",
  "Yutma problemim katı gıdaları tüketmemde zorluk yaratıyor",
  "Yutma problemim hapları veya ilaçları yutmada zorluk yaratıyor",
  "Yutkunmak acı verici",
  "Yutma problemimden dolayı yediğim şeyden zevk almıyorum",
  "Yutkunurken yiyecek boğazıma takılıyor",
  "Yemek yerken öksürüyorum",
  "Yutkunmak benim için çok yorucu",
];

const PENETRATION_ASPIRATION_SCALE = [
  { val: 1, label: "Materyal havayoluna (vokal kord üstüne) girmez" },
  { val: 2, label: "Materyal girer, vokal kordların üstünde kalır, temizlenir" },
  { val: 3, label: "Materyal girer, vokal kordların üstünde kalır, temizlenemez" },
  { val: 4, label: "Materyal girer, vokal kordlara temas eder, temizlenir" },
  { val: 5, label: "Materyal girer, vokal kordlara temas eder, temizlenemez" },
  { val: 6, label: "Materyal vokal kordların altına geçer, hasta öksürerek dışarı atar" },
  { val: 7, label: "Materyal vokal kordların altına geçer, öksürür ancak temizlenemez" },
  { val: 8, label: "SESSİZ ASPİRASYON: Materyal kord altına geçer, öksürük refleksi yoktur" },
];

export default function DysphagiaForm({ assessment, onSave }: AssessmentFormProps) {
  const [data, setData] = useState(assessment.dysphagia ?? {
    cseSymptoms: [], cseNotes: "",
    oralMotorExam: "",
    eat10Total: undefined, eat10Items: undefined,
    foisScore: undefined,
    iddsiFood: undefined, iddsiLiquid: undefined,
    instrumentalType: undefined, instrumentalFindings: "", pasScore: undefined,
    recommendations: "",
  });
  const [activeTab, setActiveTab] = useState<"cse" | "instrumental" | "scales">("cse");
  const [eat10Items, setEat10Items] = useState<number[]>(data.eat10Items ?? Array(10).fill(0));
  const [saving, setSaving] = useState(false);

  const eat10Total = eat10Items.reduce((a, b) => a + b, 0);

  const handleSave = async () => {
    setSaving(true);
    await onSave({ dysphagia: { ...data, eat10Total, eat10Items } });
    setSaving(false);
  };

  const TABS = [
    { key: "cse" as const, label: "Klinik (CSE)", icon: "🥄" },
    { key: "instrumental" as const, label: "FEES / MBSS", icon: "🔬" },
    { key: "scales" as const, label: "Ölçekler", icon: "📊" },
  ];

  return (
    <div className="p-5 max-w-2xl mx-auto">
      <div className="flex gap-1 mb-5 bg-gray-100 rounded-xl p-1">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all"
            style={{ background: activeTab === t.key ? "white" : "transparent", color: activeTab === t.key ? "#f59e0b" : "#6b7280",
              boxShadow: activeTab === t.key ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>
            <span>{t.icon}</span><span className="hidden sm:block">{t.label}</span>
          </button>
        ))}
      </div>

      {/* KLİNİK / CSE */}
      {activeTab === "cse" && (
        <div className="space-y-4">
          <div className={SECTION} style={{ borderColor: "#fef3c7" }}>
            <div className={SECTION_TITLE}><span>👄</span>Oral Motor Sınav (OME)</div>
            <textarea value={data.oralMotorExam ?? ""} onChange={(e) => setData((d) => ({ ...d, oralMotorExam: e.target.value }))}
              placeholder="Dudak kapanması, dil asimetrisi/gücü, velar elevasyon, gag refleksi, dentisyon durumu..." rows={3}
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400 resize-none" style={{ borderColor: "#e5e7eb" }} />
          </div>

          <div className={SECTION} style={{ borderColor: "#fef3c7" }}>
            <div className={SECTION_TITLE}><span>💧</span>Klinik Yutma Değerlendirmesi (CSE)</div>
            <CheckboxGroup label="Gözlenen Semptomlar (Su / Püre / Katı)" options={CSE_SYMPTOMS} selected={data.cseSymptoms ?? []}
              onChange={(s) => setData((d) => ({ ...d, cseSymptoms: s }))} />
            <div className="mt-4">
              <label className={LABEL}>Besin Deneme Gözlemleri</label>
              <textarea value={data.cseNotes ?? ""} onChange={(e) => setData((d) => ({ ...d, cseNotes: e.target.value }))}
                placeholder="Örn: 5ml suda öksürük yok, 10ml'de yaş ses. Pürede oral faz uzun..." rows={3}
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400 resize-none" style={{ borderColor: "#e5e7eb" }} />
            </div>
          </div>
        </div>
      )}

      {/* FEES / MBSS */}
      {activeTab === "instrumental" && (
        <div className="space-y-4">
          <div className={SECTION} style={{ borderColor: "#fef3c7" }}>
            <div className={SECTION_TITLE}><span>🔬</span>Enstrümantal Değerlendirme Bulguları</div>
            <div className="flex gap-2 mb-4">
              {[{ v: "fees", l: "FEES" }, { v: "mbss", l: "MBSS (Video Floroskopi)" }].map(({ v, l }) => (
                <button key={v} onClick={() => setData((d) => ({ ...d, instrumentalType: v as any }))}
                  className="px-4 py-2 rounded-xl text-sm font-semibold border transition-all"
                  style={{ background: data.instrumentalType === v ? "rgba(245,158,11,0.15)" : "white",
                    borderColor: data.instrumentalType === v ? "#f59e0b" : "#e5e7eb", color: data.instrumentalType === v ? "#d97706" : "#4b5563" }}>
                  {l}
                </button>
              ))}
            </div>

            <div>
              <label className={LABEL}>Enstrümantal Bulgular</label>
              <textarea value={data.instrumentalFindings ?? ""} onChange={(e) => setData((d) => ({ ...d, instrumentalFindings: e.target.value }))}
                placeholder="Örn: Beyaz sıvı pyriform sinüslerde gölleniyor. Katılarda valleculada residü..." rows={4}
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400 resize-none" style={{ borderColor: "#e5e7eb" }} />
            </div>

            <div className="mt-4">
              <label className={LABEL}>Penetrasyon-Aspirasyon Skalası (PAS 1-8)</label>
              <div className="flex flex-col gap-2">
                {PENETRATION_ASPIRATION_SCALE.map(({ val, label }) => (
                  <button key={val} onClick={() => setData((d) => ({ ...d, pasScore: val }))}
                    className="flex items-center gap-3 p-2 rounded-lg border text-left transition-all"
                    style={{ background: data.pasScore === val ? (val >= 6 ? "#fef2f2" : val >= 2 ? "#fffbeb" : "#ecfdf5") : "white",
                      borderColor: data.pasScore === val ? (val >= 6 ? "#ef4444" : val >= 2 ? "#f59e0b" : "#10b981") : "#e5e7eb" }}>
                    <div className="w-6 h-6 rounded bg-white flex items-center justify-center font-bold flex-shrink-0"
                      style={{ color: data.pasScore === val ? (val >= 6 ? "#dc2626" : val >= 2 ? "#d97706" : "#059669") : "#9ca3af" }}>
                      {val}
                    </div>
                    <span className="text-xs font-medium text-gray-700">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ÖLÇEKLER */}
      {activeTab === "scales" && (
        <div className="space-y-4">
          <div className={SECTION} style={{ borderColor: "#fef3c7" }}>
            <div className={SECTION_TITLE}><span>📈</span>EAT-10: Yutma Bozukluğu Değerlendirme Aracı</div>
            <div className="p-2 rounded-xl text-xs mb-3" style={{ background: "#fffbeb", border: "1px solid #fde68a", color: "#d97706" }}>
              0 = Sorun yok · 4 = Ciddi problem (Toplam EAT-10 skoru ≥ 3 ise yutma bozukluğu riski)
            </div>
            {EAT10_ITEMS.map((item, i) => (
              <div key={i} className="border-b pb-2 mb-2 last:border-0 last:pb-0 last:mb-0" style={{ borderColor: "#fef3c7" }}>
                <p className="text-[11px] text-gray-600 mb-1.5 leading-tight">{i + 1}. {item}</p>
                <div className="flex gap-1">
                  {[0, 1, 2, 3, 4].map((v) => (
                    <button key={v} onClick={() => { const n = [...eat10Items]; n[i] = v; setEat10Items(n); }}
                      className="w-7 h-6 rounded-lg text-xs font-bold border transition-all"
                      style={{ background: eat10Items[i] === v ? "#f59e0b" : "white", borderColor: eat10Items[i] === v ? "#f59e0b" : "#e5e7eb", color: eat10Items[i] === v ? "white" : "#374151" }}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="p-3 rounded-xl flex items-center justify-between mt-3" style={{ background: eat10Total >= 3 ? "rgba(239,68,68,0.08)" : "#ecfdf5", border: `1px solid ${eat10Total >= 3 ? "rgba(239,68,68,0.3)" : "#a7f3d0"}` }}>
              <span className="text-sm font-semibold" style={{ color: eat10Total >= 3 ? "#dc2626" : "#059669" }}>EAT-10 Toplam:</span>
              <span className="text-xl font-bold" style={{ color: eat10Total >= 3 ? "#dc2626" : "#059669" }}>{eat10Total}/40</span>
              <span className="text-xs font-bold" style={{ color: eat10Total >= 3 ? "#dc2626" : "#059669" }}>{eat10Total >= 3 ? "⚠ Riskli (≥3)" : "✓ Normal"}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className={SECTION} style={{ borderColor: "#fef3c7" }}>
              <div className={SECTION_TITLE}>FOIS (1-7)</div>
              <input type="number" min={1} max={7} value={data.foisScore ?? ""}
                onChange={(e) => setData((d) => ({ ...d, foisScore: e.target.value ? Number(e.target.value) : undefined }))}
                placeholder="1 (Hiç oral yok) - 7 (Tam normal)" className={INPUT} style={{ borderColor: "#e5e7eb" }} />
              <p className="text-[10px] text-gray-400 mt-1">Fonksiyonel Oral Alım Skalası</p>
            </div>
            <div className={SECTION} style={{ borderColor: "#fef3c7" }}>
              <div className={SECTION_TITLE}>IDDSI (Diyet)</div>
              <div className="space-y-2">
                <input type="number" min={0} max={4} value={data.iddsiLiquid ?? ""}
                  onChange={(e) => setData((d) => ({ ...d, iddsiLiquid: e.target.value ? Number(e.target.value) : undefined }))}
                  placeholder="Sıvı (0-4)" className={INPUT} style={{ borderColor: "#e5e7eb" }} />
                <input type="number" min={3} max={7} value={data.iddsiFood ?? ""}
                  onChange={(e) => setData((d) => ({ ...d, iddsiFood: e.target.value ? Number(e.target.value) : undefined }))}
                  placeholder="Katı (3-7)" className={INPUT} style={{ borderColor: "#e5e7eb" }} />
              </div>
            </div>
          </div>
        </div>
      )}

      <SaveBar onSave={handleSave} saving={saving} />
    </div>
  );
}
