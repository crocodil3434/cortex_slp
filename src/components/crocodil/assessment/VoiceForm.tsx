"use client";
import React, { useState } from "react";
import type { AssessmentFormProps } from "./shared";
import { LABEL, INPUT, SECTION, SECTION_TITLE, TEXTAREA, ScaleSelector, SaveBar, NumberInput } from "./shared";

const GRBAS_LABELS = ["Yok", "Hafif", "Orta", "Ağır"];
const CAPEV_LABELS = ["Normal", "Hafif/Hafifçe Deviyant", "Orta/Orta Deviyant", "Ağır/Belirgin Deviyant"];

export default function VoiceForm({ assessment, onSave, client }: AssessmentFormProps) {
  const [data, setData] = useState(assessment.voice ?? {
    grbasG: undefined, grbasR: undefined, grbasB: undefined, grbasA: undefined, grbasS: undefined,
    capevOverallSeverity: undefined, capevRoughness: undefined, capevBreathiness: undefined,
    capevStrain: undefined, capevPitch: undefined, capevLoudness: undefined,
    vhi10Total: undefined, vhi10Items: undefined,
    rsiTotal: undefined,
    f0: undefined, jitter: undefined, shimmer: undefined, hnr: undefined,
    cpps: undefined, avqi: undefined, mpt: undefined,
    resonanceProfile: undefined, pitchPerception: undefined, loudnessPerception: undefined,
    laryngologyNotes: "", voiceUsageProfile: "", notes: "",
  });
  const [activeTab, setActiveTab] = useState<"perceptual" | "acoustic" | "patient" | "clinical">("perceptual");
  const [vhi10Items, setVhi10Items] = useState<number[]>(data.vhi10Items ?? Array(10).fill(0));
  const [rsiItems, setRsiItems] = useState<number[]>(data.rsiItems ?? Array(9).fill(0));
  const [saving, setSaving] = useState(false);

  const vhi10Total = vhi10Items.reduce((a, b) => a + b, 0);
  const rsiTotal = rsiItems.reduce((a, b) => a + b, 0);

  const handleSave = async () => {
    setSaving(true);
    await onSave({ voice: { ...data, vhi10Total, vhi10Items, rsiTotal, rsiItems } });
    setSaving(false);
  };

  const VHI10_ITEMS = [
    "Konuşurken diğer insanlar sesimi duymakta güçlük çeker.",
    "Gün ortasında sesim sabahtan farklı duyulur.",
    "İnsanlar 'Neyin var?' diye sorar.",
    "Sesim rahatsız edicidir.",
    "Sesim sohbet sırasında bazen başarısız olur.",
    "İşim veya günlük aktivitelerim sesimi etkiler.",
    "Sesimden dolayı iletişim kurmaya çalışmayı bırakırım.",
    "Sesim gelecek konusunda beni sınırlar.",
    "Sesimden dolayı kendimi yalnız hissederim.",
    "Sesimden dolayı gelirde azalma yaşarım.",
  ];

  const RSI_ITEMS = [
    "Boğaz temizleme (haftalık)", "Boğazda balgam / akıntı hissi", "Aşırı balgam / burun akıntısı",
    "Yutma güçlüğü (yiyecek, sıvı, tablet)", "Yemek sonrası öksürük", "Nefes güçlüğü veya tıkanma atakları",
    "Süregelen veya rahatsız edici öksürük", "Boğazda yabancı cisim veya topak hissi",
    "Mide yanması, göğüs ağrısı veya hazımsızlık",
  ];

  const TABS = [
    { key: "perceptual" as const, label: "Perseptüel", icon: "👁️" },
    { key: "acoustic" as const, label: "Akustik", icon: "📊" },
    { key: "patient" as const, label: "Hasta Ölçekleri", icon: "📋" },
    { key: "clinical" as const, label: "Klinik", icon: "🏥" },
  ];

  return (
    <div className="p-5 max-w-2xl mx-auto">
      <div className="flex gap-1 mb-5 bg-gray-100 rounded-xl p-1">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium transition-all"
            style={{ background: activeTab === t.key ? "white" : "transparent", color: activeTab === t.key ? "#8b5cf6" : "#6b7280",
              boxShadow: activeTab === t.key ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>
            <span>{t.icon}</span><span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* PERSEPTÜEL */}
      {activeTab === "perceptual" && (
        <div className="space-y-4">
          {/* GRBAS */}
          <div className={SECTION} style={{ borderColor: "#f3e8ff" }}>
            <div className={SECTION_TITLE}><span>🎚️</span>GRBAS Perseptüel Ses Derecelendirmesi</div>
            <div className="p-3 rounded-xl text-xs" style={{ background: "#faf5ff", border: "1px solid #e9d5ff", color: "#7c3aed" }}>
              Her parametre için 0 (yok) ile 3 (ağır) arasında puanlayın
            </div>
            {[
              { key: "grbasG" as const, label: "G — Grade (Genel Şiddet)" },
              { key: "grbasR" as const, label: "R — Roughness (Pürüzlülük / Kreakıltılık)" },
              { key: "grbasB" as const, label: "B — Breathiness (Nefes Kaçağı)" },
              { key: "grbasA" as const, label: "A — Asthenia (Güçsüzlük)" },
              { key: "grbasS" as const, label: "S — Strain (Gerilim / Zorlanma)" },
            ].map(({ key, label }) => (
              <ScaleSelector key={key} label={label} value={data[key]} max={3}
                labels={GRBAS_LABELS} color="#8b5cf6"
                onChange={(v) => setData((d) => ({ ...d, [key]: v as any }))} />
            ))}

            {/* GRBAS profil görsel özeti */}
            {(data.grbasG !== undefined || data.grbasR !== undefined) && (
              <div className="mt-2 p-3 rounded-xl" style={{ background: "#faf5ff", border: "1px solid #e9d5ff" }}>
                <div className="text-xs font-semibold text-purple-600 mb-2">GRBAS Profili</div>
                <div className="flex gap-2 items-end h-12">
                  {[
                    { label: "G", value: data.grbasG },
                    { label: "R", value: data.grbasR },
                    { label: "B", value: data.grbasB },
                    { label: "A", value: data.grbasA },
                    { label: "S", value: data.grbasS },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex flex-col items-center flex-1 gap-1">
                      <div className="w-full rounded-t-md transition-all" style={{
                        height: `${((value ?? 0) / 3) * 40}px`,
                        background: "linear-gradient(to top, #8b5cf6, #c4b5fd)",
                        minHeight: value ? "4px" : "0",
                      }} />
                      <div className="text-xs font-bold text-purple-700">{label}</div>
                      <div className="text-xs text-gray-500">{value ?? "—"}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* CAPE-V */}
          <div className={SECTION} style={{ borderColor: "#f3e8ff" }}>
            <div className={SECTION_TITLE}><span>🎙️</span>CAPE-V — Uzlaşı Ses Perseptüel Değerlendirmesi</div>
            <div className="p-3 rounded-xl text-xs" style={{ background: "#faf5ff", border: "1px solid #e9d5ff", color: "#7c3aed" }}>
              ASHA CAPE-V: 0-100 VAS (Visual Analogue Scale). ≤40 hafif, 41-70 orta, &gt;70 ağır
            </div>
            {[
              { key: "capevOverallSeverity" as const, label: "Genel Şiddet" },
              { key: "capevRoughness" as const, label: "Pürüzlülük (Roughness)" },
              { key: "capevBreathiness" as const, label: "Nefes Kaçağı (Breathiness)" },
              { key: "capevStrain" as const, label: "Gerilim (Strain)" },
              { key: "capevPitch" as const, label: "Pitch Deviasyonu" },
              { key: "capevLoudness" as const, label: "Şiddet Deviasyonu" },
            ].map(({ key, label }) => (
              <div key={key}>
                <div className="flex justify-between mb-1">
                  <label className={LABEL}>{label}</label>
                  <span className="text-sm font-bold" style={{ color: "#8b5cf6" }}>
                    {data[key] !== undefined ? data[key] : "—"}
                  </span>
                </div>
                <input type="range" min={0} max={100} value={data[key] ?? 0}
                  onChange={(e) => setData((d) => ({ ...d, [key]: Number(e.target.value) }))}
                  className="w-full accent-purple-500" />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Normal</span><span>Hafif</span><span>Orta</span><span>Ağır</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AKUSTİK */}
      {activeTab === "acoustic" && (
        <div className={SECTION} style={{ borderColor: "#f3e8ff" }}>
          <div className={SECTION_TITLE}><span>📊</span>Akustik Ses Analizi Parametreleri</div>
          <div className="p-3 rounded-xl text-xs mb-3" style={{ background: "#faf5ff", border: "1px solid #e9d5ff", color: "#7c3aed" }}>
            Değerleri PRAAT, Phonalyze, Dr. Speech veya benzer akustik yazılımdan girin. Referans aralıkları gösterilmektedir.
          </div>
          <div className="grid grid-cols-1 gap-4">
            <NumberInput label="F0 — Temel Frekans" value={data.f0} min={50} max={400} step={1}
              unit=" Hz" refMin={client.gender === "kadın" ? 180 : 110} refMax={client.gender === "kadın" ? 240 : 165}
              refLabel={client.gender === "kadın" ? "Ref: 180-240 Hz (K)" : "Ref: 110-165 Hz (E)"}
              onChange={(v) => setData((d) => ({ ...d, f0: v }))} />
            <NumberInput label="Jitter — Frekans Pertürbasyonu" value={data.jitter} min={0} max={10} step={0.01}
              unit="%" refMin={0} refMax={1.04} refLabel="Ref: < 1.04%"
              onChange={(v) => setData((d) => ({ ...d, jitter: v }))} />
            <NumberInput label="Shimmer — Amplitüd Pertürbasyonu" value={data.shimmer} min={0} max={20} step={0.01}
              unit="%" refMin={0} refMax={3.81} refLabel="Ref: < 3.81%"
              onChange={(v) => setData((d) => ({ ...d, shimmer: v }))} />
            <NumberInput label="HNR — Harmonics-to-Noise Ratio" value={data.hnr} min={0} max={40} step={0.1}
              unit=" dB" refMin={20} refMax={40} refLabel="Ref: > 20 dB"
              onChange={(v) => setData((d) => ({ ...d, hnr: v }))} />
            <NumberInput label="CPPs — Cepstral Peak Prominence (Smoothed)" value={data.cpps} min={0} max={30} step={0.1}
              unit=" dB" refMin={4.5} refMax={30} refLabel="Ref: > 4.5 dB"
              onChange={(v) => setData((d) => ({ ...d, cpps: v }))} />
            <NumberInput label="AVQI — Akustik Ses Kalite İndeksi" value={data.avqi} min={0} max={10} step={0.01}
              unit="" refMin={0} refMax={2.95} refLabel="Ref: < 2.95 (normal)"
              onChange={(v) => setData((d) => ({ ...d, avqi: v }))} />
            <NumberInput label="MPT — Maksimum Fonasyon Süresi" value={data.mpt} min={0} max={40} step={0.1}
              unit=" sn" refMin={10} refMax={40} refLabel="Ref: > 10 sn"
              onChange={(v) => setData((d) => ({ ...d, mpt: v }))} />
          </div>

          {/* Otomatik değerlendirme */}
          {data.avqi !== undefined && (
            <div className="mt-4 p-3 rounded-xl" style={{
              background: data.avqi < 2.95 ? "#ecfdf5" : "rgba(239,68,68,0.08)",
              border: `1px solid ${data.avqi < 2.95 ? "#a7f3d0" : "rgba(239,68,68,0.3)"}`,
            }}>
              <p className="text-xs font-semibold" style={{ color: data.avqi < 2.95 ? "#059669" : "#dc2626" }}>
                AVQI: {data.avqi} → {data.avqi < 2.95 ? "✓ Normal sınırlar içinde" : "⚠ Patolojik ses kalitesi işareti"}
              </p>
            </div>
          )}
        </div>
      )}

      {/* HASTA ÖLÇEKLERİ */}
      {activeTab === "patient" && (
        <div className="space-y-4">
          {/* VHI-10 */}
          <div className={SECTION} style={{ borderColor: "#f3e8ff" }}>
            <div className={SECTION_TITLE}><span>📋</span>VHI-10 — Ses Handikap İndeksi (Kısa Form)</div>
            <div className="p-2 rounded-xl text-xs mb-2" style={{ background: "#faf5ff", border: "1px solid #e9d5ff", color: "#7c3aed" }}>
              0 = Hiçbir zaman · 1 = Neredeyse hiçbir zaman · 2 = Bazen · 3 = Neredeyse her zaman · 4 = Her zaman
            </div>
            {VHI10_ITEMS.map((item, i) => (
              <div key={i} className="border-b pb-3 last:border-0" style={{ borderColor: "#f3e8ff" }}>
                <p className="text-xs text-gray-600 mb-2">{i + 1}. {item}</p>
                <div className="flex gap-2">
                  {[0, 1, 2, 3, 4].map((v) => (
                    <button key={v} onClick={() => { const n = [...vhi10Items]; n[i] = v; setVhi10Items(n); }}
                      className="w-9 h-8 rounded-xl text-xs font-bold border-2 transition-all"
                      style={{ background: vhi10Items[i] === v ? "#8b5cf6" : "white", borderColor: vhi10Items[i] === v ? "#8b5cf6" : "#e5e7eb", color: vhi10Items[i] === v ? "white" : "#374151" }}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="p-3 rounded-xl flex items-center justify-between" style={{ background: "#faf5ff", border: "1px solid #e9d5ff" }}>
              <span className="text-sm font-semibold text-purple-700">Toplam VHI-10:</span>
              <span className="text-2xl font-bold text-purple-700">{vhi10Total}/40</span>
              <span className="text-xs text-purple-500">
                {vhi10Total <= 10 ? "Minimal" : vhi10Total <= 20 ? "Hafif" : vhi10Total <= 30 ? "Orta" : "Ağır"}
              </span>
            </div>
          </div>

          {/* RSI */}
          <div className={SECTION} style={{ borderColor: "#f3e8ff" }}>
            <div className={SECTION_TITLE}><span>🔥</span>RSI — Reflü Semptom İndeksi</div>
            <div className="p-2 rounded-xl text-xs mb-2" style={{ background: "#faf5ff", border: "1px solid #e9d5ff", color: "#7c3aed" }}>
              0 = Hiç yok · 5 = Çok şiddetli. RSI ≥ 13 anormal
            </div>
            {RSI_ITEMS.map((item, i) => (
              <div key={i} className="flex items-center justify-between border-b pb-2 last:border-0" style={{ borderColor: "#f3e8ff" }}>
                <span className="text-xs text-gray-600 flex-1 pr-4">{item}</span>
                <div className="flex gap-1">
                  {[0, 1, 2, 3, 4, 5].map((v) => (
                    <button key={v} onClick={() => { const n = [...rsiItems]; n[i] = v; setRsiItems(n); }}
                      className="w-7 h-7 rounded-lg text-xs font-bold border transition-all"
                      style={{ background: rsiItems[i] === v ? "#ef4444" : "white", borderColor: rsiItems[i] === v ? "#ef4444" : "#e5e7eb", color: rsiItems[i] === v ? "white" : "#374151" }}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="p-3 rounded-xl flex items-center justify-between" style={{ background: rsiTotal >= 13 ? "rgba(239,68,68,0.08)" : "#f0fdf9", border: `1px solid ${rsiTotal >= 13 ? "rgba(239,68,68,0.3)" : "#e5f7f5"}` }}>
              <span className="text-sm font-semibold" style={{ color: rsiTotal >= 13 ? "#dc2626" : "#059669" }}>RSI Toplam:</span>
              <span className="text-2xl font-bold" style={{ color: rsiTotal >= 13 ? "#dc2626" : "#059669" }}>{rsiTotal}/45</span>
              <span className="text-xs" style={{ color: rsiTotal >= 13 ? "#dc2626" : "#059669" }}>
                {rsiTotal >= 13 ? "⚠ Anormal (≥13)" : "✓ Normal (<13)"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* KLİNİK */}
      {activeTab === "clinical" && (
        <div className={SECTION} style={{ borderColor: "#f3e8ff" }}>
          <div className={SECTION_TITLE}><span>🏥</span>Klinik Ses Profili</div>
          {[
            { key: "resonanceProfile", label: "Rezonans Profili", options: ["normal", "hyponasale", "hypernasale", "mixed"] },
            { key: "pitchPerception", label: "Perde Algısı", options: ["normal", "low", "high", "variable"] },
            { key: "loudnessPerception", label: "Şiddet Algısı", options: ["normal", "low", "high", "variable"] },
          ].map(({ key, label, options }) => (
            <div key={key}>
              <label className={LABEL}>{label}</label>
              <div className="flex gap-2 flex-wrap">
                {options.map((opt) => (
                  <button key={opt}
                    onClick={() => setData((d) => ({ ...d, [key]: opt }))}
                    className="px-3 py-1.5 rounded-xl text-xs border transition-all capitalize"
                    style={{ background: (data as any)[key] === opt ? "rgba(139,92,246,0.15)" : "white", borderColor: (data as any)[key] === opt ? "#8b5cf6" : "#e5e7eb", color: (data as any)[key] === opt ? "#8b5cf6" : "#374151" }}>
                    {opt === "hyponasale" ? "Hiponazal" : opt === "hypernasale" ? "Hipernazal" : opt === "mixed" ? "Karma" : opt === "low" ? "Düşük" : opt === "high" ? "Yüksek" : opt === "variable" ? "Değişken" : "Normal"}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div>
            <label className={LABEL}>Laringoloji / KBB Muayene Notu</label>
            <textarea value={data.laryngologyNotes ?? ""} onChange={(e) => setData((d) => ({ ...d, laryngologyNotes: e.target.value }))}
              placeholder="KBB muayene bulgularını buraya yapıştırın (vokal kord hareketliliği, patoloji türü, stroboscopy bulguları vb.)..." rows={4}
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-400 resize-none" style={{ borderColor: "#e5e7eb" }} />
          </div>
          <div>
            <label className={LABEL}>Ses Kullanım Profili</label>
            <textarea value={data.voiceUsageProfile ?? ""} onChange={(e) => setData((d) => ({ ...d, voiceUsageProfile: e.target.value }))}
              placeholder="Mesleki ses yükü, hidrasyon alışkanlıkları, bağırma/fısıltı, reflü öyküsü, sigara, alkol..." rows={3}
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-400 resize-none" style={{ borderColor: "#e5e7eb" }} />
          </div>
        </div>
      )}

      <SaveBar onSave={handleSave} saving={saving} />
    </div>
  );
}
