"use client";
import React, { useState } from "react";
import type { AssessmentFormProps } from "./shared";
import { LABEL, INPUT, SECTION, SECTION_TITLE, TEXTAREA, SaveBar, RadioGroup } from "./shared";
import { generateAssessmentSummary } from "@/lib/crocodil/gemini";
import { getSettings, saveGoal } from "@/lib/crocodil/storage";
import { FileText, Sparkles, Loader2, Target, Download } from "lucide-react";

export default function ConclusionForm({ assessment, onSave, client }: AssessmentFormProps) {
  const [data, setData] = useState(assessment.conclusion ?? {
    summary: "",
    clinicalImpression: "",
    prognosis: "",
    recommendation: "",
    referrals: "",
  });
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [goals, setGoals] = useState([{ desc: "", icf: "" }]);
  
  const settings = getSettings();
  const age = client.birthDate ? new Date().getFullYear() - new Date(client.birthDate).getFullYear() : 0;

  const handleSave = async () => {
    setSaving(true);
    await onSave({ conclusion: data });
    
    // Hedefleri kaydet
    const validGoals = goals.filter((g) => g.desc.trim());
    validGoals.forEach((g) => {
      saveGoal({
        clientId: client.id,
        description: g.desc,
        icfCode: g.icf || undefined,
        targetPercent: 80,
        currentPercent: 0,
        domain: "bodyFunction",
        status: "aktif",
      });
    });
    
    setSaving(false);
  };

  const handleGenerateSummary = async () => {
    if (!settings?.geminiApiKey) {
      alert("AI Özeti için ayarlardan Gemini API anahtarı eklemelisiniz.");
      return;
    }
    setAiLoading(true);
    try {
      // Tüm assessment verisini gönder (sadece dolu olanları)
      const payload = { ...assessment };
      delete (payload as any).id;
      delete (payload as any).clientId;
      delete (payload as any).createdAt;
      
      const summary = await generateAssessmentSummary(payload, age, settings.geminiApiKey);
      setData((d) => ({ ...d, summary }));
    } catch (err: any) {
      alert(err.message ?? "Hata");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="p-5 max-w-3xl mx-auto space-y-4">
      {/* AI Özet */}
      <div className={SECTION} style={{ borderColor: "#ccfbf1" }}>
        <div className="flex items-center justify-between mb-2">
          <div className={SECTION_TITLE}>
            <FileText className="w-4 h-4 text-teal-600" />
            Klinik Özet & İzlenim
          </div>
          <button onClick={handleGenerateSummary} disabled={aiLoading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-white shadow-sm"
            style={{ background: "linear-gradient(135deg, #0d9488, #134e4a)" }}>
            {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            AI ile Özetle
          </button>
        </div>
        <p className="text-xs text-gray-400 mb-3">Tüm formlardaki verilerinizi analiz ederek RCSLT formatında taslak özet çıkarır.</p>
        <textarea value={data.summary ?? ""} onChange={(e) => setData((d) => ({ ...d, summary: e.target.value }))}
          placeholder="Klinik özet buraya gelecek..." rows={12}
          className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-teal-400 resize-y"
          style={{ borderColor: "#e5e7eb", lineHeight: "1.6" }} />
      </div>

      {/* Tanı & Prognoz */}
      <div className="grid grid-cols-2 gap-4">
        <div className={SECTION} style={{ borderColor: "#e5f7f5" }}>
          <label className={LABEL}>Nihai SLP Tanısı</label>
          <textarea value={data.clinicalImpression ?? ""} onChange={(e) => setData((d) => ({ ...d, clinicalImpression: e.target.value }))}
            placeholder="Örn: Orta şiddette ifade edici dil bozukluğu ve /r/ rotasizmi..." rows={3}
            className={TEXTAREA} style={{ borderColor: "#e5e7eb" }} />
        </div>
        <div className={SECTION} style={{ borderColor: "#e5f7f5" }}>
          <RadioGroup label="Prognoz (Terapi Beklentisi)" options={[
            { value: "excellent", label: "Mükemmel" },
            { value: "good", label: "İyi" },
            { value: "fair", label: "Orta" },
            { value: "guarded", label: "Temkinli / Sınırlı" }
          ]} value={data.prognosis ?? ""} onChange={(v) => setData((d) => ({ ...d, prognosis: v }))} inline />
        </div>
      </div>

      {/* Terapi Hedefleri (Hemen Ekle) */}
      <div className={SECTION} style={{ borderColor: "#e5f7f5" }}>
        <div className={SECTION_TITLE}><Target className="w-4 h-4 text-teal-600" />Terapi Hedefleri (SMART/ICF)</div>
        <p className="text-xs text-gray-400 mb-3">Buraya eklediğiniz hedefler doğrudan hastanın hedefler listesine kaydedilecektir.</p>
        <div className="space-y-2">
          {goals.map((g, i) => (
            <div key={i} className="flex gap-2">
              <input type="text" value={g.desc} onChange={(e) => { const n = [...goals]; n[i].desc = e.target.value; setGoals(n); }}
                placeholder="Örn: Danışan 3 ay içinde bağımsız olarak /s/ sesini sözcük başında %80 doğrulukla üretir." className={INPUT + " flex-1"} style={{ borderColor: "#e5e7eb" }} />
              <input type="text" value={g.icf} onChange={(e) => { const n = [...goals]; n[i].icf = e.target.value; setGoals(n); }}
                placeholder="ICF Kodu (Ops.)" className={INPUT + " w-32"} style={{ borderColor: "#e5e7eb" }} />
            </div>
          ))}
          <button onClick={() => setGoals([...goals, { desc: "", icf: "" }])}
            className="text-xs font-semibold text-teal-600 hover:text-teal-700">+ Yeni Hedef Satırı</button>
        </div>
      </div>

      {/* Öneriler & Yönlendirmeler */}
      <div className="grid grid-cols-2 gap-4">
        <div className={SECTION} style={{ borderColor: "#e5f7f5" }}>
          <label className={LABEL}>Terapi Önerisi & Sıklık</label>
          <textarea value={data.recommendation ?? ""} onChange={(e) => setData((d) => ({ ...d, recommendation: e.target.value }))}
            placeholder="Haftada 2 seans, 45 dakika, 3 ay boyunca..." rows={2}
            className={TEXTAREA} style={{ borderColor: "#e5e7eb" }} />
        </div>
        <div className={SECTION} style={{ borderColor: "#e5f7f5" }}>
          <label className={LABEL}>Yönlendirmeler (Referrals)</label>
          <textarea value={data.referrals ?? ""} onChange={(e) => setData((d) => ({ ...d, referrals: e.target.value }))}
            placeholder="KBB (ses kısıklığı için), Odyoloji (işitme testi), Çocuk Psikiyatrisi..." rows={2}
            className={TEXTAREA} style={{ borderColor: "#e5e7eb" }} />
        </div>
      </div>

      <SaveBar onSave={handleSave} saving={saving} />
    </div>
  );
}
