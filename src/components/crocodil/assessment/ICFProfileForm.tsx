"use client";
import React, { useState, useEffect } from "react";
import type { AssessmentFormProps } from "./shared";
import { LABEL, INPUT, SECTION, SECTION_TITLE, TEXTAREA, SaveBar } from "./shared";
import { ICF_SLP_CODES } from "@/lib/crocodil/icf-codes";
type ICFCategory = "all" | "b" | "s" | "d" | "e";
import { askICFAssistant } from "@/lib/crocodil/gemini";
import { getSettings } from "@/lib/crocodil/storage";
import { Search, Plus, Sparkles, Map, Trash2, Loader2 } from "lucide-react";

export default function ICFProfileForm({ assessment, onSave, client }: AssessmentFormProps) {
  const [data, setData] = useState(assessment.icf ?? {
    codes: [],
    environmentalFactors: "",
    personalFactors: "",
  });
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ICFCategory | "all">("all");
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState("");
  
  const settings = getSettings();

  const handleSave = async () => {
    setSaving(true);
    await onSave({ icf: data });
    setSaving(false);
  };

  const addCode = (code: string, qualifier: number = 2) => {
    if (!data.codes?.find((c) => c.code === code)) {
      setData((d) => ({ ...d, codes: [...(d.codes ?? []), { code, qualifier, notes: "" }] }));
    }
  };

  const updateCode = (code: string, updates: any) => {
    setData((d) => ({
      ...d, codes: d.codes?.map((c) => c.code === code ? { ...c, ...updates } : c)
    }));
  };

  const removeCode = (code: string) => {
    setData((d) => ({ ...d, codes: d.codes?.filter((c) => c.code !== code) }));
  };

  const handleAiAsk = async () => {
    if (!settings?.geminiApiKey) {
      alert("AI özelliği için ayarlardan Gemini API anahtarı eklemelisiniz.");
      return;
    }
    setAiLoading(true);
    try {
      const context = `${client.firstName} (${client.birthDate ? new Date().getFullYear() - new Date(client.birthDate).getFullYear() : "?"} yaş). Seçilen alanlar: ${assessment.selectedCategories.join(", ")}.`;
      const res = await askICFAssistant(
        "Klinik tablosuna dayanarak, bu hasta için kullanılabilecek en önemli 3 ICF kodunu önerir misin?", 
        context, 
        settings.geminiApiKey
      );
      setAiResult(res);
    } catch (err: any) {
      setAiResult(err.message ?? "Hata");
    } finally {
      setAiLoading(false);
    }
  };

  const filteredCodes = ICF_SLP_CODES.filter((c) => 
    (categoryFilter === "all" || c.domain === categoryFilter) &&
    (c.code.toLowerCase().includes(search.toLowerCase()) || c.label.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-5 max-w-4xl mx-auto flex flex-col md:flex-row gap-5">
      {/* Sol Panel - Seçili Kodlar & Faktörler */}
      <div className="flex-1 space-y-4">
        <div className={SECTION} style={{ borderColor: "#c7d2fe" }}>
          <div className={SECTION_TITLE}><span>🗺️</span>Seçilen ICF Kodları (Profil)</div>
          
          <div className="space-y-3">
            {data.codes?.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Henüz kod eklenmedi. Sağdaki listeden seçin.</p>}
            
            {data.codes?.map((c: any) => {
              const def = ICF_SLP_CODES.find((x) => x.code === c.code);
              if (!def) return null;
              return (
                <div key={c.code} className="border p-3 rounded-xl" style={{ borderColor: "#e0e7ff", background: "#f5f3ff" }}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="font-bold text-indigo-700">{def.code}</span>
                      <span className="text-xs font-semibold text-gray-700 ml-2">{def.label}</span>
                    </div>
                    <button onClick={() => removeCode(c.code)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <div className="flex items-center gap-3">
                    <div>
                      <label className="text-[10px] text-gray-500 block uppercase font-bold mb-1">Şiddet (.0 - .4)</label>
                      <select value={c.qualifier} onChange={(e) => updateCode(c.code, { qualifier: Number(e.target.value) })}
                        className="border rounded-lg text-xs p-1" style={{ borderColor: "#c7d2fe" }}>
                        {[0,1,2,3,4,8,9].map((v) => <option key={v} value={v}>.{v}</option>)}
                      </select>
                    </div>
                    <div className="flex-1">
                      <input type="text" value={c.notes ?? ""} onChange={(e) => updateCode(c.code, { notes: e.target.value })}
                        placeholder="Klinik not..." className={INPUT + " !py-1"} style={{ borderColor: "#c7d2fe" }} />
                    </div>
                  </div>
                  <div className="text-[10px] text-indigo-400 mt-2">
                    0: Yok | 1: Hafif (%5-24) | 2: Orta (%25-49) | 3: Ağır (%50-95) | 4: Tam (%96-100)
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className={SECTION} style={{ borderColor: "#c7d2fe" }}>
          <div className={SECTION_TITLE}><span>🌍</span>Çevresel (e) & Kişisel Faktörler</div>
          <div>
            <label className={LABEL}>Çevresel Faktörler (e)</label>
            <textarea value={data.environmentalFactors ?? ""} onChange={(e) => setData((d) => ({ ...d, environmentalFactors: e.target.value }))}
              placeholder="Destekleyici veya engelleyici fiziksel/sosyal ortam... (e1-e5)" rows={3}
              className={TEXTAREA} style={{ borderColor: "#e5e7eb" }} />
          </div>
          <div className="mt-4">
            <label className={LABEL}>Kişisel Faktörler</label>
            <textarea value={data.personalFactors ?? ""} onChange={(e) => setData((d) => ({ ...d, personalFactors: e.target.value }))}
              placeholder="Yaş, cinsiyet, başa çıkma stratejileri, motivasyon, eğitim..." rows={3}
              className={TEXTAREA} style={{ borderColor: "#e5e7eb" }} />
          </div>
        </div>

        <SaveBar onSave={handleSave} saving={saving} />
      </div>

      {/* Sağ Panel - Arama & AI Asistan */}
      <div className="w-full md:w-80 flex flex-col gap-4">
        {/* AI Asistan */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-2xl border" style={{ borderColor: "#c7d2fe" }}>
          <div className="flex items-center gap-2 font-bold text-indigo-900 mb-2">
            <Sparkles className="w-4 h-4 text-purple-600" /> ICF AI Asistan
          </div>
          <p className="text-xs text-indigo-700 mb-3">Danışan profiline göre en uygun kodları önerir.</p>
          {aiResult ? (
            <div className="text-xs text-gray-700 bg-white p-3 rounded-xl border border-indigo-100 mb-3 max-h-48 overflow-y-auto whitespace-pre-wrap">
              {aiResult}
            </div>
          ) : null}
          <button onClick={handleAiAsk} disabled={aiLoading}
            className="w-full py-2 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}>
            {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Kod Önerisi Al"}
          </button>
        </div>

        {/* Veritabanı Arama */}
        <div className="bg-white rounded-2xl p-4 border flex-1 flex flex-col" style={{ borderColor: "#e5e7eb" }}>
          <div className="font-semibold text-gray-700 text-sm mb-3">Kod Veritabanı (SLP)</div>
          <div className="relative mb-3">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Kod veya isim ara..." value={search} onChange={(e) => setSearch(e.target.value)}
              className={INPUT + " pl-9"} style={{ borderColor: "#e5e7eb" }} />
          </div>
          <div className="flex gap-1 mb-3 overflow-x-auto pb-1">
            {[{v: "all", l: "Tümü"}, {v: "b", l: "Fonksiyon (b)"}, {v: "s", l: "Yapı (s)"}, {v: "d", l: "Aktivite (d)"}, {v: "e", l: "Çevre (e)"}].map((c) => (
              <button key={c.v} onClick={() => setCategoryFilter(c.v as any)}
                className="px-2 py-1 rounded-md text-[10px] font-bold border whitespace-nowrap"
                style={{ background: categoryFilter === c.v ? "#4f46e5" : "white", color: categoryFilter === c.v ? "white" : "#6b7280", borderColor: categoryFilter === c.v ? "#4f46e5" : "#e5e7eb" }}>
                {c.l}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[400px]">
            {filteredCodes.map((code) => (
              <div key={code.code} className="p-2 border rounded-lg hover:border-indigo-300 transition-colors group" style={{ borderColor: "#f3f4f6" }}>
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-bold text-xs" style={{ color: code.domain === "b" ? "#3b82f6" : code.domain === "s" ? "#f59e0b" : code.domain === "d" ? "#10b981" : "#8b5cf6" }}>
                      {code.code}
                    </span>
                    <p className="text-[11px] font-semibold text-gray-700 leading-tight mt-0.5">{code.label}</p>
                  </div>
                  <button onClick={() => addCode(code.code)} className="w-6 h-6 rounded bg-indigo-50 flex items-center justify-center text-indigo-600 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
