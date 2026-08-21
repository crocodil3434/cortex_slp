"use client";
import React, { useState } from "react";
import type { AssessmentFormProps } from "./shared";
import { LABEL, INPUT, SECTION, SECTION_TITLE, TEXTAREA, CheckboxGroup, SaveBar } from "./shared";
import Link from "next/link";
import { Radio, Sparkles, Activity, ShieldAlert, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { ClinicalKinematicsForm } from "./ClinicalKinematicsForm";

// ── Dizartri Alt Tipleri (Darley, Aronson & Brown Sınıflandırması) ───────────
const DYSARTHRIA_TYPES = [
  { id: "Spastik (Üst Motor Nöron)", label: "Spastik (Bilateral ÜMN - Gergin/Boğuk ses, yavaş hız)" },
  { id: "Flaksid (Alt Motor Nöron)", label: "Flaksid (AMN - Nefesli ses, hipernazalite, kas atrofisi/fasikülasyon)" },
  { id: "Ataksik (Serebellar)", label: "Ataksik (Serebellar - Sarhoşumsu konuşma, eşitlenmiş vurgu, ritim tutarsızlığı)" },
  { id: "Hipokinetik (Ekstrapiramidal)", label: "Hipokinetik (Parkinsonizm - Monoton perde/şiddet, festinasyon/hızlanma)" },
  { id: "Hiperkinetik (Distoni/Kore)", label: "Hiperkinetik (Ekstrapiramidal - İstemsiz hareketler, ani ses patlamaları)" },
  { id: "Unilateral ÜMN", label: "Unilateral Üst Motor Nöron (Hafif-orta tek taraflı zayıflık)" },
  { id: "Karma / Mikst Dizartri", label: "Karma / Mikst (Spastik-Flaksid, ALS, Travmatik vb.)" },
];

// ── Apraksi Alt Tipleri & Özellikleri (CAS / AOS) ─────────────────────────────
const APRAXIA_TYPES = [
  { id: "CAS", label: "Çocukluk Çağı Konuşma Apraksisi (CAS / ÇÖKA - Gelişimsel)" },
  { id: "AOS", label: "Edinsel Konuşma Apraksisi (AOS - İnme/TBI/Kortikal)" },
  { id: "OralApraxia", label: "Sözsüz Oral/Fasial Apraksi (İstemli konuşma dışı hareket güçlüğü)" },
];

const APRAXIA_FEATURES = [
  "Sözcük uzadıkça ve hece karmaşıklaştıkça artan hatalar",
  "Aynı sözcükte tutarsız/değişken sesletim hataları",
  "Groping (Konuşma organlarında pozisyon arama/çabalama davranışı)",
  "Otomatik konuşmanın (sayma, ezber) istemli konuşmadan belirgin iyi olması",
  "Prosodi bozukluğu (eşitlenmiş ve aşırı vurgu, hece parçalanması)",
  "Konuşmayı başlatmada belirgin zorlanma ve sessiz bloklar",
  "Ünlü bozulmaları ve hece geçişlerinde koartikülasyon kopukluğu",
];

// ── Tipik Gelişimde Motor Konuşma Etkilenmesi (Gelişimsel Koordinasyon) ────────
const TYPICAL_MOTOR_FEATURES = [
  "Nörolojik hasar/apraksi olmaksızın artikülatör hız ve çeviklik zayıflığı",
  "Hızlı konuşmada fonetik dağılma ve hece yutma (koordinasyon yetersizliği)",
  "Mandibular çene açılma derecesinde kısıtlılık veya aşırı açıklık",
  "Hece uzatması ve kelime arası geçişlerde motor akıcılık tutukluğu",
  "Sıralama hatası olmaksızın motor planlama yavaşlığı",
  "Geç konuşan / Dili yeni yakalayan çocukta motor artikülatör olgunlaşma gecikmesi",
  "Fasiyal ve lingual kas tonusunda hafif hipotoni/gevşeklik eğilimi",
];

export default function MotorSpeechForm({ assessment, onSave }: AssessmentFormProps) {
  const [data, setData] = useState(assessment.motorSpeech ?? {
    diagnosisType: "",
    dysarthriaType: "",
    apraxiaType: "",
    apraxiaFeatures: [],
    typicalMotorFeatures: [],
    typicalMotorNotes: "",
    respirationSupport: "adequate",
    phonationQuality: "normal",
    resonanceFunction: "normal",
    articulationPrecision: "normal",
    prosodyControl: "normal",
    ddkAmr: undefined,
    ddkSmr: undefined,
    ddkRegularity: "regular",
    fda2Score: undefined,
    notes: "",
  });

  const [showKinematics, setShowKinematics] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave({ motorSpeech: data });
    setSaving(false);
  };

  const isDysarthria = data.diagnosisType === "Dizartri" || data.diagnosisType === "Karma Motor Bozukluk";
  const isApraxia = data.diagnosisType === "Apraksi (CAS / AOS)" || data.diagnosisType === "Karma Motor Bozukluk";
  const isTypicalMotor = data.diagnosisType === "Tipik Gelişimde Motor Konuşma Etkilenmesi";

  return (
    <div className="p-5 max-w-3xl mx-auto space-y-4">
      {/* Modül 105 Canlı Ölçüm Başlatma Banner'ı */}
      <div className="rounded-2xl p-4 border flex items-center justify-between gap-4"
        style={{ background: "linear-gradient(135deg, #0f2027, #134e4a)", borderColor: "rgba(13,148,136,0.3)" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg bg-teal-500/20 border border-teal-500/30">
            📡
          </div>
          <div>
            <div className="text-white font-bold text-sm flex items-center gap-2">
              Modül 105
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-500/30 text-teal-300 border border-teal-400/30">
                Canlı Biyogeribildirim & Kinematik
              </span>
            </div>
            <p className="text-teal-300/70 text-xs mt-0.5">
              Çene kinematiği (Kalman), sEMG masseter ve akustik F0 verilerini doğrudan aktarın.
            </p>
          </div>
        </div>
        <Link href={`/crocodil/modul105?clientId=${assessment.clientId}`}>
          <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white transition-all hover:scale-105 shadow-md flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #0d9488, #14b8a6)" }}>
            <Radio className="w-3.5 h-3.5" />
            Ölçümü Başlat
          </button>
        </Link>
      </div>

      {/* Modül 105 Telemetri Özeti */}
      {data.m105SessionId && (
        <div className="bg-teal-50/70 rounded-2xl p-4 border" style={{ borderColor: "#99f6e4" }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-teal-800 flex items-center gap-1.5">
              <span>📊</span> Modül 105 Sensör Ölçüm Özeti (Seans #{data.m105SessionId})
            </span>
            <span className="text-[10px] text-teal-600 font-medium">{data.m105Timestamp || "Son Ölçüm"}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-white p-2 rounded-xl border border-teal-100">
              <span className="text-[10px] text-gray-400 block">DDK Hızı</span>
              <span className="font-bold text-gray-800 text-sm">{data.ddkAmr || "—"} Hz</span>
            </div>
            <div className="bg-white p-2 rounded-xl border border-teal-100">
              <span className="text-[10px] text-gray-400 block">Çene ROM</span>
              <span className="font-bold text-gray-800 text-sm">{data.mandibularRomDeg || "—"}°</span>
            </div>
            <div className="bg-white p-2 rounded-xl border border-teal-100">
              <span className="text-[10px] text-gray-400 block">sEMG Asimetri</span>
              <span className="font-bold text-gray-800 text-sm">%{data.semgAsymmetryPct ?? "—"}</span>
            </div>
            <div className="bg-white p-2 rounded-xl border border-teal-100">
              <span className="text-[10px] text-gray-400 block">Solunum</span>
              <span className="font-bold text-gray-800 text-sm">{data.respirationRateBpm || "—"} bpm</span>
            </div>
            <div className="bg-white p-2 rounded-xl border border-teal-100">
              <span className="text-[10px] text-gray-400 block">F0 Medyan</span>
              <span className="font-bold text-gray-800 text-sm">{data.f0MedianHz || "—"} Hz</span>
            </div>
            <div className="bg-white p-2 rounded-xl border border-teal-100">
              <span className="text-[10px] text-gray-400 block">HNR</span>
              <span className="font-bold text-gray-800 text-sm">{data.hnrDb || "—"} dB</span>
            </div>
          </div>
        </div>
      )}

      {/* ── 1. MOTOR KONUŞMA TANI VE SINIFLANDIRMASI ──────────────────────────── */}
      <div className={SECTION} style={{ borderColor: "#ffedd5" }}>
        <div className={SECTION_TITLE}>
          <span>⚙️</span>
          Motor Konuşma Değerlendirmesi & Tanı Profili
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Danışanın motor konuşma etkilenme tipini ve klinik alt sınıflandırmasını belirleyin:
        </p>

        {/* Ana Tanı Seçimi */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {[
            { id: "Dizartri", label: "Dizartri", icon: "🧠", color: "#ea580c" },
            { id: "Apraksi (CAS / AOS)", label: "Apraksi (CAS / AOS)", icon: "🎯", color: "#f97316" },
            { id: "Tipik Gelişimde Motor Konuşma Etkilenmesi", label: "Tipik Gelişimde Motor Etkilenme", icon: "🌱", color: "#0d9488" },
            { id: "Karma Motor Bozukluk", label: "Karma / Diğer", icon: "🔀", color: "#6366f1" },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setData((d) => ({ ...d, diagnosisType: opt.id }))}
              className={`p-3 rounded-xl text-xs font-bold border-2 transition-all flex flex-col items-center justify-center gap-1.5 ${
                data.diagnosisType === opt.id ? "shadow-md scale-102" : "opacity-80 hover:opacity-100"
              }`}
              style={{
                background: data.diagnosisType === opt.id ? `${opt.color}15` : "white",
                borderColor: data.diagnosisType === opt.id ? opt.color : "#e5e7eb",
                color: data.diagnosisType === opt.id ? opt.color : "#4b5563",
              }}
            >
              <span className="text-lg">{opt.icon}</span>
              <span className="text-center leading-tight">{opt.label}</span>
            </button>
          ))}
        </div>

        {/* ── DİZARTRİ ALT TİPLERİ ── */}
        {isDysarthria && (
          <div className="mb-4 p-3.5 rounded-xl border bg-orange-50/50" style={{ borderColor: "#fed7aa" }}>
            <label className={LABEL}>Dizartri Klinik Alt Tipi</label>
            <div className="grid grid-cols-1 gap-1.5 mt-1">
              {DYSARTHRIA_TYPES.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setData((d) => ({ ...d, dysarthriaType: opt.id }))}
                  className={`px-3 py-2 rounded-xl text-xs text-left border transition-all flex items-center justify-between ${
                    data.dysarthriaType === opt.id ? "bg-orange-500 text-white font-semibold border-orange-500 shadow-sm" : "bg-white text-gray-700 border-gray-200 hover:bg-orange-50/30"
                  }`}
                >
                  <span>{opt.label}</span>
                  {data.dysarthriaType === opt.id && <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 ml-2" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── APRAKSİ ALT TİPLERİ & GÖZLEMLERİ ── */}
        {isApraxia && (
          <div className="mb-4 p-3.5 rounded-xl border bg-amber-50/50 space-y-3" style={{ borderColor: "#fde68a" }}>
            <div>
              <label className={LABEL}>Apraksi Tipi</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1">
                {APRAXIA_TYPES.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setData((d) => ({ ...d, apraxiaType: opt.id }))}
                    className={`p-2.5 rounded-xl text-xs text-center border transition-all ${
                      data.apraxiaType === opt.id ? "bg-amber-500 text-white font-bold border-amber-500" : "bg-white text-gray-700 border-gray-200"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <CheckboxGroup
              label="Apraksi (CAS / AOS) Temel Klinik Bulguları:"
              options={APRAXIA_FEATURES}
              selected={data.apraxiaFeatures ?? []}
              onChange={(s) => setData((d) => ({ ...d, apraxiaFeatures: s }))}
            />
          </div>
        )}

        {/* ── TİPİK GELİŞİMDE MOTOR KONUŞMA ETKİLENMESİ ── */}
        {isTypicalMotor && (
          <div className="mb-4 p-3.5 rounded-xl border bg-teal-50/50 space-y-3" style={{ borderColor: "#99f6e4" }}>
            <div className="flex items-center gap-2">
              <span className="text-teal-700 font-bold text-xs">🌱 Normal Gelişimde Motor Konuşma Koordinasyon Güçlüğü</span>
            </div>
            <p className="text-[11px] text-teal-800/80 leading-relaxed">
              Nörolojik hasar olmaksızın, hızlı konuşma, hece geçişleri ve fonetik-motor entegrasyonda zorluk yaşayan tipik gelişimli çocukların profili:
            </p>

            <CheckboxGroup
              label="Gözlenen Gelişimsel Motor Konuşma Bulguları:"
              options={TYPICAL_MOTOR_FEATURES}
              selected={data.typicalMotorFeatures ?? []}
              onChange={(s) => setData((d) => ({ ...d, typicalMotorFeatures: s }))}
            />

            <div>
              <label className={LABEL}>Gelişimsel Motor Konuşma Notları</label>
              <textarea
                value={data.typicalMotorNotes ?? ""}
                onChange={(e) => setData((d) => ({ ...d, typicalMotorNotes: e.target.value }))}
                placeholder="Örn: Dil gelişimi kronolojik yaşıyla uyumlu ancak ardışık hece geçişlerinde çene-dil koordinasyonunda yorgunluk ve fonetik netlik kaybı izleniyor..."
                rows={2}
                className="w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-teal-400 resize-none bg-white"
                style={{ borderColor: "#99f6e4" }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── 2. MOTOR KONUŞMANIN 5 ALT SİSTEMİ ───────────────────────────────── */}
      <div className={SECTION} style={{ borderColor: "#e5f7f5" }}>
        <div className={SECTION_TITLE}>
          <Activity className="w-4 h-4 text-teal-600" />
          5 Motor Konuşma Alt Sistemi Analizi
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Solunum */}
          <div className="p-3 rounded-xl border bg-white" style={{ borderColor: "#e5e7eb" }}>
            <label className={LABEL}>1. Solunum Desteği (Respirasyon)</label>
            <select
              value={data.respirationSupport ?? "adequate"}
              onChange={(e) => setData((d) => ({ ...d, respirationSupport: e.target.value as any }))}
              className={INPUT + " text-xs"}
              style={{ borderColor: "#e5e7eb" }}
            >
              <option value="adequate">Yeterli / Normal solunum desteği</option>
              <option value="reduced">Azalmış (Sözcük ortasında nefes alma, kısa cümleler)</option>
              <option value="impaired">Ağır Yetersiz (Paradoksal solunum, çok zayıf subglottal basınç)</option>
            </select>
          </div>

          {/* Fonasyon */}
          <div className="p-3 rounded-xl border bg-white" style={{ borderColor: "#e5e7eb" }}>
            <label className={LABEL}>2. Fonasyon & Ses Kalitesi</label>
            <select
              value={data.phonationQuality ?? "normal"}
              onChange={(e) => setData((d) => ({ ...d, phonationQuality: e.target.value as any }))}
              className={INPUT + " text-xs"}
              style={{ borderColor: "#e5e7eb" }}
            >
              <option value="normal">Normal ses kalitesi ve kararlılık</option>
              <option value="breathy">Nefesli / Soluklu (Flaksid eğilim)</option>
              <option value="strained">Gergin / Boğuk / Zorlanmalı (Spastik eğilim)</option>
              <option value="wet">Islak / Sekresyonlu ses</option>
              <option value="tremor">Vokal Tremor / Dalgalanma</option>
            </select>
          </div>

          {/* Rezonans */}
          <div className="p-3 rounded-xl border bg-white" style={{ borderColor: "#e5e7eb" }}>
            <label className={LABEL}>3. Rezonans (Velofarengeal Kapanma)</label>
            <select
              value={data.resonanceFunction ?? "normal"}
              onChange={(e) => setData((d) => ({ ...d, resonanceFunction: e.target.value as any }))}
              className={INPUT + " text-xs"}
              style={{ borderColor: "#e5e7eb" }}
            >
              <option value="normal">Normal oral/nazal rezonans dengesi</option>
              <option value="hypernasal">Hipernazalite (Açık nazal kaçak)</option>
              <option value="hyponasal">Hiponazalite (Tıkalı geniz rezonansı)</option>
              <option value="nasal_emission">Nazal Emisyon (Basınçlı ünsüzlerde burundan hava kaçışı)</option>
              <option value="cul_de_sac">Cul-de-sac Rezonansı</option>
            </select>
          </div>

          {/* Artikülasyon */}
          <div className="p-3 rounded-xl border bg-white" style={{ borderColor: "#e5e7eb" }}>
            <label className={LABEL}>4. Artikülasyon Hassasiyeti</label>
            <select
              value={data.articulationPrecision ?? "normal"}
              onChange={(e) => setData((d) => ({ ...d, articulationPrecision: e.target.value as any }))}
              className={INPUT + " text-xs"}
              style={{ borderColor: "#e5e7eb" }}
            >
              <option value="normal">Keskin ve doğru artikülasyon</option>
              <option value="slurred">Peltemsi / Anlaşılmaz (Slurred / Dizartrik)</option>
              <option value="distorted">Sistematik Distorsiyon / Çarpıtma</option>
              <option value="inconsistent">Tutarsız ve değişken sesletim (Apraktik)</option>
            </select>
          </div>

          {/* Prosodi */}
          <div className="p-3 rounded-xl border bg-white sm:col-span-2" style={{ borderColor: "#e5e7eb" }}>
            <label className={LABEL}>5. Prosodi & Konuşma Riti</label>
            <select
              value={data.prosodyControl ?? "normal"}
              onChange={(e) => setData((d) => ({ ...d, prosodyControl: e.target.value as any }))}
              className={INPUT + " text-xs"}
              style={{ borderColor: "#e5e7eb" }}
            >
              <option value="normal">Doğal vurgu, tonlama ve akış hızı</option>
              <option value="monotone">Monoton Perde & Monoton Şiddet</option>
              <option value="excess_equal_stress">Eşitlenmiş ve Aşırı Vurgu (Robotik / Hece parçalanması)</option>
              <option value="rate_irregular">Değişken / Düzensiz Hız (Ani hızlanma veya bloklar)</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── 3. DİADOKOKİNETİK (DDK) HIZ VE RİTİM ─────────────────────────────── */}
      <div className={SECTION} style={{ borderColor: "#e5f7f5" }}>
        <div className={SECTION_TITLE}>
          <span>⏱️</span>
          Diadokokinetik Hız (DDK: AMR & SMR)
        </div>
        <p className="text-xs text-gray-400 mb-3">
          Motor konuşma planlama hızı, hece geçiş stabilitesi ve arama (groping) davranışını ölçün:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={LABEL}>AMR (pa-pa-pa / ta-ta-ta)</label>
            <input
              type="number"
              step="0.1"
              value={data.ddkAmr ?? ""}
              placeholder="Hz (örn: 5.2 hece/sn)"
              onChange={(e) => setData((d) => ({ ...d, ddkAmr: e.target.value ? Number(e.target.value) : undefined }))}
              className={INPUT}
              style={{ borderColor: "#e5e7eb" }}
            />
          </div>
          <div>
            <label className={LABEL}>SMR (pa-ta-ka)</label>
            <input
              type="number"
              step="0.1"
              value={data.ddkSmr ?? ""}
              placeholder="Hz (örn: 4.0 hece/sn)"
              onChange={(e) => setData((d) => ({ ...d, ddkSmr: e.target.value ? Number(e.target.value) : undefined }))}
              className={INPUT}
              style={{ borderColor: "#e5e7eb" }}
            />
          </div>
          <div>
            <label className={LABEL}>Ritim & Düzenlilik</label>
            <select
              value={data.ddkRegularity ?? "regular"}
              onChange={(e) => setData((d) => ({ ...d, ddkRegularity: e.target.value as any }))}
              className={INPUT}
              style={{ borderColor: "#e5e7eb" }}
            >
              <option value="regular">Düzenli ve senkronize</option>
              <option value="irregular">Düzensiz / Ritmi bozuk</option>
              <option value="groping">Groping / Arama ve sıralama hatası</option>
            </select>
          </div>
        </div>
        <div className="p-2.5 rounded-xl text-[11px] text-gray-500 mt-2 bg-gray-50 border border-gray-100">
          <strong>Referans Değerler (Çocuk/Yetişkin):</strong> AMR: 4.5 – 6.5 hece/sn · SMR: 3.5 – 5.5 hece/sn
        </div>

        <div className="mt-4">
          <label className={LABEL}>Klinik Gözlem & Semptom Notları</label>
          <textarea
            value={data.notes ?? ""}
            onChange={(e) => setData((d) => ({ ...d, notes: e.target.value }))}
            placeholder="Oral motor yapı, istemli hareket kontrolü, fonksiyonel konuşma anlaşılırlığı ve klinik gözlemleriniz..."
            rows={4}
            className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-400 resize-none"
            style={{ borderColor: "#e5e7eb" }}
          />
        </div>
      </div>

      {/* ── 3. KLİNİK KİNEMATİK VE BİYOMEKANİK DEĞERLENDİRME ENTEGRASYONU ── */}
      <div className="rounded-2xl border transition-all overflow-hidden shadow-sm"
        style={{
          borderColor: showKinematics ? "#0d9488" : "#fed7aa",
          background: showKinematics ? "#f8fffe" : "white"
        }}
      >
        <div
          onClick={() => setShowKinematics(!showKinematics)}
          className="p-4 flex items-center justify-between cursor-pointer hover:bg-orange-50/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold shadow-inner"
              style={{
                background: showKinematics ? "linear-gradient(135deg, #0d9488, #134e4a)" : "#ffedd5",
                color: showKinematics ? "white" : "#ea580c"
              }}
            >
              📐
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-gray-800 text-sm">Kinematik ve Biyomekanik Değerlendirme (Modül 105)</h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-orange-50 text-orange-700 border-orange-200">
                  Opsiyonel / İleri Seviye
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Maksillofasiyal yapısal analiz, 7 basamaklı çene kinematiği ve sensör skorlarını bu değerlendirmeye dahil edin
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowKinematics(!showKinematics); }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border shadow-sm flex-shrink-0"
            style={{
              background: showKinematics ? "#0d9488" : "linear-gradient(135deg, #ea580c, #c2410c)",
              color: "white",
              borderColor: showKinematics ? "#0d9488" : "#ea580c",
            }}
          >
            {showKinematics ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                Kinematiği Gizle
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                + Kinematik Değerlendirme Ekle
              </>
            )}
          </button>
        </div>

        {showKinematics && (
          <div className="p-4 border-t bg-white" style={{ borderColor: "#e5f7f5" }}>
            <ClinicalKinematicsForm clientId={assessment.clientId} />
          </div>
        )}
      </div>

      <SaveBar onSave={handleSave} saving={saving} />
    </div>
  );
}
