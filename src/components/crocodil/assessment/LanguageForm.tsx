"use client";
import React, { useState } from "react";
import type { AssessmentFormProps } from "./shared";
import { LABEL, INPUT, SECTION, SECTION_TITLE, TEXTAREA, SaveBar } from "./shared";
import type { TestScore } from "@/lib/crocodil/types";
import { Plus, Trash2, BookOpen, MessageSquare, Eye } from "lucide-react";

function TestScoreRow({ score, onChange, onDelete }: {
  score: TestScore;
  onChange: (s: TestScore) => void;
  onDelete: () => void;
}) {
  return (
    <div className="border rounded-xl p-3 space-y-2" style={{ borderColor: "#e5e7eb" }}>
      <div className="flex gap-2">
        <input type="text" value={score.testName} onChange={(e) => onChange({ ...score, testName: e.target.value })}
          placeholder="Test adı (CELF-5, PPVT-5, TIFALDI...)" className={INPUT + " flex-1"} style={{ borderColor: "#e5e7eb" }} />
        <button onClick={onDelete} className="w-8 h-10 flex items-center justify-center text-red-400 hover:text-red-600 flex-shrink-0">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <input type="text" value={score.subtestName ?? ""} onChange={(e) => onChange({ ...score, subtestName: e.target.value })}
        placeholder="Alt test adı (opsiyonel)" className={INPUT} style={{ borderColor: "#e5e7eb" }} />
      <div className="grid grid-cols-4 gap-2">
        {[
          { key: "rawScore", label: "Ham Puan" },
          { key: "standardScore", label: "Standart Puan" },
          { key: "percentile", label: "Yüzdelik (%)" },
        ].map(({ key, label }) => (
          <div key={key}>
            <label className={LABEL}>{label}</label>
            <input type="number" value={(score as any)[key] ?? ""} onChange={(e) => onChange({ ...score, [key]: e.target.value ? Number(e.target.value) : undefined })}
              placeholder="—" className={INPUT} style={{ borderColor: "#e5e7eb" }} />
          </div>
        ))}
        <div>
          <label className={LABEL}>Yaş Eşd.</label>
          <input type="text" value={score.ageEquivalent ?? ""} onChange={(e) => onChange({ ...score, ageEquivalent: e.target.value })}
            placeholder="4;6" className={INPUT} style={{ borderColor: "#e5e7eb" }} />
        </div>
      </div>
      <textarea value={score.notes ?? ""} onChange={(e) => onChange({ ...score, notes: e.target.value })}
        placeholder="Not..." rows={1} className="w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-teal-400 transition-colors resize-none"
        style={{ borderColor: "#e5e7eb" }} />
    </div>
  );
}

export default function LanguageForm({ assessment, onSave }: AssessmentFormProps) {
  const [data, setData] = useState(assessment.language ?? {
    receptiveTests: [], receptiveNotes: "",
    mlu: undefined, tnw: undefined, ndw: undefined, expressive_notes: "",
    pragmaticNotes: "", pragmaticScore: undefined,
    literacyNotes: "",
  });
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"receptive" | "expressive" | "pragmatic" | "literacy">("receptive");

  const addTest = () => setData((d) => ({
    ...d, receptiveTests: [...(d.receptiveTests ?? []), { testName: "" }]
  }));

  const handleSave = async () => {
    setSaving(true);
    await onSave({ language: data });
    setSaving(false);
  };

  const TABS = [
    { key: "receptive" as const, label: "Alıcı Dil", icon: "👂" },
    { key: "expressive" as const, label: "İfade Edici", icon: "🗣️" },
    { key: "pragmatic" as const, label: "Pragmatik", icon: "🤝" },
    { key: "literacy" as const, label: "Okuma-Yazma", icon: "📖" },
  ];

  return (
    <div className="p-5 max-w-2xl mx-auto">
      {/* Sekme navigasyonu */}
      <div className="flex gap-1 mb-5 bg-gray-100 rounded-xl p-1">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all"
            style={{ background: activeTab === t.key ? "white" : "transparent", color: activeTab === t.key ? "#0d9488" : "#6b7280",
              boxShadow: activeTab === t.key ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>
            <span>{t.icon}</span><span className="hidden sm:block">{t.label}</span>
          </button>
        ))}
      </div>

      {activeTab === "receptive" && (
        <div className="space-y-4">
          <div className={SECTION} style={{ borderColor: "#e5f7f5" }}>
            <div className={SECTION_TITLE}><BookOpen className="w-4 h-4 text-blue-500" />Alıcı Dil Test Skorları</div>
            <div className="p-3 rounded-xl text-xs" style={{ background: "#eff6ff", border: "1px solid #dbeafe", color: "#6b7280" }}>
              <strong>Sık kullanılan testler:</strong> CELF-5, CELF-P:3, PPVT-5, TIFALDI, TEDIL, COST, Ankara Dil Gelişim Testi, Türkçe Alıcı Dil Testi
            </div>
            <div className="space-y-3">
              {(data.receptiveTests ?? []).map((score, i) => (
                <TestScoreRow key={i} score={score}
                  onChange={(s) => setData((d) => ({ ...d, receptiveTests: d.receptiveTests?.map((x, j) => j === i ? s : x) }))}
                  onDelete={() => setData((d) => ({ ...d, receptiveTests: d.receptiveTests?.filter((_, j) => j !== i) }))}
                />
              ))}
              <button onClick={addTest}
                className="flex items-center gap-2 text-sm text-teal-600 hover:text-teal-700 transition-colors">
                <Plus className="w-4 h-4" /> Test Ekle
              </button>
            </div>
            <div>
              <label className={LABEL}>Alıcı Dil Gözlem Notları</label>
              <textarea value={data.receptiveNotes ?? ""} onChange={(e) => setData((d) => ({ ...d, receptiveNotes: e.target.value }))}
                placeholder="Direktif anlama, kavram anlama, metin anlama gözlemleri..." rows={3}
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-400 resize-none" style={{ borderColor: "#e5e7eb" }} />
            </div>
          </div>
        </div>
      )}

      {activeTab === "expressive" && (
        <div className={SECTION} style={{ borderColor: "#e5f7f5" }}>
          <div className={SECTION_TITLE}><MessageSquare className="w-4 h-4 text-blue-500" />İfade Edici Dil Analizi</div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { key: "mlu" as const, label: "MLU (Ort. Sözce Uzunluğu)", placeholder: "4.5" },
              { key: "tnw" as const, label: "TNW (Toplam Sözcük)", placeholder: "120" },
              { key: "ndw" as const, label: "NDW (Farklı Sözcük)", placeholder: "85" },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className={LABEL}>{label}</label>
                <input type="number" step="0.1" value={data[key] ?? ""} placeholder={placeholder}
                  onChange={(e) => setData((d) => ({ ...d, [key]: e.target.value ? Number(e.target.value) : undefined }))}
                  className={INPUT} style={{ borderColor: "#e5e7eb" }} />
              </div>
            ))}
          </div>
          <div>
            <label className={LABEL}>İfade Edici Dil Notları</label>
            <textarea value={data.expressive_notes ?? ""} onChange={(e) => setData((d) => ({ ...d, expressive_notes: e.target.value }))}
              placeholder="Sözdizimi profili (basit/bileşik/karmaşık), morfem hataları, sözcük bulma güçlüğü, anlatı becerileri..." rows={4}
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-400 resize-none" style={{ borderColor: "#e5e7eb" }} />
          </div>
          <div className="p-3 rounded-xl text-xs" style={{ background: "#f0fdf9", border: "1px solid #e5f7f5", color: "#6b7280" }}>
            <strong>Referans:</strong> 4 yaş MLU: ~4.5 | 5 yaş: ~5.5 | 6 yaş: ~6.5 · TNW yeterli dil örneği için min. 50-100 sözce
          </div>
        </div>
      )}

      {activeTab === "pragmatic" && (
        <div className={SECTION} style={{ borderColor: "#e5f7f5" }}>
          <div className={SECTION_TITLE}><span>🤝</span>Pragmatik İletişim Değerlendirmesi</div>
          {[
            { label: "Göz Teması", key: "eyeContact" },
            { label: "Sıra Bekleme", key: "turnTaking" },
            { label: "Konu Başlatma", key: "topicInitiation" },
            { label: "Konu Sürdürme", key: "topicMaintenance" },
            { label: "Bağlam Uygunluğu", key: "contextualApp" },
          ].map(({ label, key }) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm text-gray-700">{label}</span>
              <div className="flex gap-1">
                {["0 – Bozulmuş", "1 – Gelişiyor", "2 – İşlevsel", "3 – İyi"].map((opt, i) => (
                  <button key={i}
                    onClick={() => setData((d) => ({ ...d, [key]: i }))}
                    className="px-2 py-1 rounded-lg text-xs border transition-all"
                    style={{
                      background: (data as any)[key] === i ? "#0d9488" : "white",
                      borderColor: (data as any)[key] === i ? "#0d9488" : "#e5e7eb",
                      color: (data as any)[key] === i ? "white" : "#374151",
                    }}>
                    {i}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div>
            <label className={LABEL}>Pragmatik Notlar</label>
            <textarea value={data.pragmaticNotes ?? ""} onChange={(e) => setData((d) => ({ ...d, pragmaticNotes: e.target.value }))}
              placeholder="Sosyal bağlam duyarlılığı, jest kullanımı, ortak dikkat, ima anlama..." rows={3}
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-400 resize-none" style={{ borderColor: "#e5e7eb" }} />
          </div>
        </div>
      )}

      {activeTab === "literacy" && (
        <div className={SECTION} style={{ borderColor: "#e5f7f5" }}>
          <div className={SECTION_TITLE}><Eye className="w-4 h-4 text-blue-500" />Okuma-Yazma Değerlendirmesi</div>
          <div>
            <label className={LABEL}>Fonolojik Farkındalık Düzeyi</label>
            <div className="flex gap-2 flex-wrap">
              {["Kelime", "Hece", "Kafiye", "Fonem (başlangıç)", "Fonem (analiz/sentez)"].map((opt) => (
                <button key={opt}
                  onClick={() => {
                    const level = data.literacyNotes?.includes(opt)
                      ? data.literacyNotes.replace(opt + ",", "").replace(opt, "")
                      : (data.literacyNotes ?? "") + opt + ",";
                    setData((d) => ({ ...d, literacyNotes: level }));
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs border transition-all"
                  style={{
                    background: data.literacyNotes?.includes(opt) ? "rgba(13,148,136,0.1)" : "white",
                    borderColor: data.literacyNotes?.includes(opt) ? "#0d9488" : "#e5e7eb",
                    color: data.literacyNotes?.includes(opt) ? "#0d9488" : "#374151",
                  }}>
                  {opt}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={LABEL}>Okuma-Yazma Notları</label>
            <textarea value={data.literacyNotes ?? ""} onChange={(e) => setData((d) => ({ ...d, literacyNotes: e.target.value }))}
              placeholder="Harf/sözcük tanıma, okuma hızı, anlama yüzdesi, yazı örneği analizi, dekodlama becerileri..." rows={4}
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-400 resize-none" style={{ borderColor: "#e5e7eb" }} />
          </div>
        </div>
      )}

      <SaveBar onSave={handleSave} saving={saving} />
    </div>
  );
}
