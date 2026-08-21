"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, XCircle, FileText, Save, History,
  ChevronDown, ChevronRight, Activity, ShieldCheck,
  AlertCircle, Sparkles, Check, X, Loader2
} from "lucide-react";
import type { Client } from "@/lib/crocodil/types";
import { useToast } from "@/components/crocodil/Toast";

// ── 3 Bölümlü & 7 Basamaklı Evrensel Klinik Kinematik Kriterleri ────────────
export interface EvaluationItemDef {
  id: string;
  code: string;
  title: string;
  description: string;
  targetPlane?: string;
}

export interface StepDef {
  stepId: number;
  stepName: string;
  subtitle: string;
  items: EvaluationItemDef[];
}

export interface SectionDef {
  sectionKey: "section_a" | "section_b" | "section_c";
  title: string;
  subtitle: string;
  steps: StepDef[];
}

export const KINEMATICS_SCHEMA: SectionDef[] = [
  {
    sectionKey: "section_a",
    title: "Bölüm A: Maksillofasiyal ve Kraniofasiyal Yapısal Analiz",
    subtitle: "İstirahat ve Statik Postür İncelemesi",
    steps: [
      {
        stepId: 0,
        stepName: "Yapısal ve Statik Analiz",
        subtitle: "İstirahat halinde kraniofasiyal doku, simetri ve postür",
        items: [
          {
            id: "a1_simetri",
            code: "A1",
            title: "Fasiyal ve Kraniofasiyal Simetri",
            description: "İstirahat halinde sol ve sağ yüz yarılarının simetrisi, kas tonusu dengesi ve fasikülasyon olmaması.",
            targetPlane: "Frontal Plan",
          },
          {
            id: "a2_mandibular_postur",
            code: "A2",
            title: "Mandibular İstirahat Postürü",
            description: "Çenenin istirahat pozisyonu, interoklüzal serbest aralık ve aşırı retrüzyon/protrüzyon olmaması.",
            targetPlane: "Sagittal Plan",
          },
          {
            id: "a3_labial_tonus",
            code: "A3",
            title: "Labial Tonus ve Dudak Kapanışı",
            description: "İstirahat halinde dudakların sızdırmazlığı, kompetan labial kapanış ve ağız solunumu bulgusu olmaması.",
            targetPlane: "Koronal Plan",
          },
          {
            id: "a4_lingual_postur",
            code: "A4",
            title: "Lingual İstirahat Yerleşimi",
            description: "Dilin ağız tabanındaki konumu, istirahat postüründe protruzyon/anterior itim olmaksızın stabil duruşu.",
            targetPlane: "Horizontal Plan",
          },
          {
            id: "a5_doku_tonus",
            code: "A5",
            title: "Kraniofasiyal Tonus ve Damak Morfolojisi",
            description: "Yumuşak doku gerginliği, sert/yumuşak damak morfolojik bütünlüğü ve kraniofasiyal tonus dengesi.",
            targetPlane: "Yapısal Doku",
          },
        ],
      },
    ],
  },
  {
    sectionKey: "section_b",
    title: "Bölüm B: Nöromotor Fonksiyon Basamakları",
    subtitle: "Dinamik Motor Kontrol ve Artikülatör Alt Sistemler",
    steps: [
      {
        stepId: 1,
        stepName: "Basamak I: Temel Tonus ve Postüral Stabilite",
        subtitle: "Baş/boyun kontrolü ve solunum desteği",
        items: [
          {
            id: "b1_postur",
            code: "B1.1",
            title: "Baş ve Boyun Postüral Kontrolü",
            description: "Konuşma ve fonasyon sırasında başın sagittal/koronal hatta stabilitesi, aşırı ekstansiyon olmaması.",
            targetPlane: "Postüral Stabilite",
          },
          {
            id: "b1_solunum",
            code: "B1.2",
            title: "Solunum Desteği ve Solunum-Fonasyon Koordinasyonu",
            description: "Yeterli diyafragmatik/kostal solunum desteği ve kontrollü subglottik hava basıncı oluşturma yetisi.",
            targetPlane: "Respirasyon",
          },
        ],
      },
      {
        stepId: 2,
        stepName: "Basamak II: Vokal Uzama ve Rezonans Desteği",
        subtitle: "Fonasyon kararlılığı ve velofarengeal denge",
        items: [
          {
            id: "b2_mpt_f0",
            code: "B2.1",
            title: "Maksimum Fonasyon Süresi (MPT) ve Perde Kararlılığı",
            description: "Sesin kesintisiz, titreşimsiz sürdürülmesi ve F0 temel frekans tutarlılığı.",
            targetPlane: "Fonasyon",
          },
          {
            id: "b2_rezonans",
            code: "B2.2",
            title: "Velofarengeal Kapanma ve Oral-Nazal Denge",
            description: "Oral seslerde tam velofarengeal kapanma; aşırı hipernazalite veya nazal emisyon olmaması.",
            targetPlane: "Rezonans",
          },
        ],
      },
      {
        stepId: 3,
        stepName: "Basamak III: Mandibular Kinematik (Dikey Hareket Açıklığı)",
        subtitle: "Sagittal planda çene açılma açıklığı ve stabilizasyon",
        items: [
          {
            id: "b3_rom",
            code: "B3.1",
            title: "Mandibular Dikey Açılma Açıklığı (ROM)",
            description: "Sagittal planda yeterli dikey açılma aralığı (norm: 35 ± 8°) ve akıcı hareket genişliği.",
            targetPlane: "Sagittal Kinematik",
          },
          {
            id: "b3_stabilite",
            code: "B3.2",
            title: "Mandibular Stabilite ve Çene Kayması Kontrolü",
            description: "Konuşma üretimi sırasında lateral (sağ/sol) veya anterior kayma olmaksızın düzgün dikey hat.",
            targetPlane: "Mandibular Stabilite",
          },
        ],
      },
      {
        stepId: 4,
        stepName: "Basamak IV: Labio-Fasial Aktivasyon ve Dudak Kontrolü",
        subtitle: "Koronal/Transvers planda labial yuvarlama ve yayma",
        items: [
          {
            id: "b4_yuvarlama",
            code: "B4.1",
            title: "Dudak Yuvarlama (Protruzyon) ve Yayma (Retraksiyon)",
            description: "Yuvarlak (/o/, /u/) ve yayvan (/i/, /e/) ünlüler arasında dinamik, simetrik labial geçiş.",
            targetPlane: "Transvers Plan",
          },
          {
            id: "b4_okluzyon",
            code: "B4.2",
            title: "Bilabial Oklüzyon ve İntraoral Hava Basıncı Tutumu",
            description: "/p/, /b/, /m/ üretimlerinde çift dudak sızdırmazlığı ve patlamalı hava çıkışı kontrolü.",
            targetPlane: "Labio-Fasial",
          },
        ],
      },
      {
        stepId: 5,
        stepName: "Basamak V: Lingual Artikülasyon ve İnce Motor Kontrol",
        subtitle: "Horizontal planda bağımsız dil ucu ve dil gövdesi hareketi",
        items: [
          {
            id: "b5_elevasyon",
            code: "B5.1",
            title: "Dil Ucu Elevasyonu ve Alveolar Kontakt",
            description: "/t/, /d/, /n/, /l/ üretimlerinde çeneden bağımsız anterior dil ucu elevasyonu ve alveolar temas.",
            targetPlane: "Anterior Lingual",
          },
          {
            id: "b5_retraksiyon",
            code: "B5.2",
            title: "Dil Gövdesi / Kökü Hareketi ve Velar Temas",
            description: "/k/, /g/ üretimlerinde dil gövdesinin elevasyonu ve velar bölgeye bağımsız teması.",
            targetPlane: "Posterior Lingual",
          },
        ],
      },
    ],
  },
  {
    sectionKey: "section_c",
    title: "Bölüm C: Bağlantılı Konuşma ve Entegrasyon",
    subtitle: "Kompleks Ardışık Hareketler, Akıcılık ve Vokal Prosodi",
    steps: [
      {
        stepId: 6,
        stepName: "Basamak VI: Koartikülasyon ve Ardışık Hareketler",
        subtitle: "Hece geçişleri, DDK ritmikliği ve motor planlama doğruluğu",
        items: [
          {
            id: "c6_ddk",
            code: "C6.1",
            title: "Diadokokinezi (DDK / AMR-SMR) Hızı ve Ritmikliği",
            description: "/pa-ta-ka/ ve ardışık hece dizilimlerinde ritmik tutarlılık, hece netliği ve hedef hızı.",
            targetPlane: "Koartikülasyon",
          },
          {
            id: "c6_groping_yok",
            code: "C6.2",
            title: "Motor Planlama Doğruluğu (Arama / Groping Yokluğu)",
            description: "Hedef sese/heceye girişte çene ve dudakta gecikmeli arama (groping) veya blok olmaksızın doğrudan üretim.",
            targetPlane: "Motor Planlama",
          },
        ],
      },
      {
        stepId: 7,
        stepName: "Basamak VII: Vokal Melodi ve Prosodi",
        subtitle: "Cümle içi tonlama, perde modülasyonu ve doğal konuşma ritmi",
        items: [
          {
            id: "c7_melodi",
            code: "C7.1",
            title: "Cümle İçi Entonasyon ve Melodik Hat",
            description: "Soru, ünlem ve bildirme cümlelerinde perde varyasyonu ve doğal melodik iniş/çıkışlar.",
            targetPlane: "Prosodi",
          },
          {
            id: "c7_ritim",
            code: "C7.2",
            title: "Vurgu, Duraklama ve Konuşma Hızı Regülasyonu",
            description: "Cümle içi sözcük vurgusu, uygun soluk duraklamaları ve doğal konuşma temposu.",
            targetPlane: "Ritim & Hız",
          },
        ],
      },
    ],
  },
];

export interface ItemResponse {
  val: boolean | null; // true: EVET, false: HAYIR, null: İşaretsiz
  yorum: string;
}

export interface EvaluationRecord {
  id?: string;
  clientId: string;
  evaluationDate: string;
  responses: Record<string, ItemResponse>;
  overallScore: number;
  stepScores: Record<number, number>;
  clinicianSummary: string;
  recommendations: string;
}

export function ClinicalKinematicsForm({
  clientId,
  client,
}: {
  clientId: string;
  client: Client;
}) {
  const { success: toastSuccess, error: toastError } = useToast();
  const [responses, setResponses] = useState<Record<string, ItemResponse>>({});
  const [clinicianSummary, setClinicianSummary] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string>("section_b");
  const [pastEvaluations, setPastEvaluations] = useState<EvaluationRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Yerel depolama & geçmiş yükleme
  useEffect(() => {
    try {
      const storageKey = `crocodil_kinematics_${clientId}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPastEvaluations(parsed);
          const latest = parsed[0];
          setResponses(latest.responses || {});
          setClinicianSummary(latest.clinicianSummary || "");
          setRecommendations(latest.recommendations || "");
        }
      }
    } catch (e) {
      console.error("Geçmiş değerlendirme yüklenemedi:", e);
    }
  }, [clientId]);

  // Cevap güncelleme fonksiyonu
  const handleSetResponse = (itemId: string, val: boolean) => {
    setResponses((prev) => ({
      ...prev,
      [itemId]: {
        val,
        yorum: prev[itemId]?.yorum || "",
      },
    }));
  };

  const handleSetYorum = (itemId: string, yorum: string) => {
    setResponses((prev) => ({
      ...prev,
      [itemId]: {
        val: prev[itemId]?.val ?? null,
        yorum,
      },
    }));
  };

  // Skor Hesaplamaları
  const allItems: EvaluationItemDef[] = KINEMATICS_SCHEMA.flatMap((s) =>
    s.steps.flatMap((st) => st.items)
  );

  const answeredItems = allItems.filter((it) => responses[it.id]?.val !== null && responses[it.id]?.val !== undefined);
  const yesCount = allItems.filter((it) => responses[it.id]?.val === true).length;
  const overallScore = answeredItems.length > 0 ? Math.round((yesCount / answeredItems.length) * 100) : 0;

  // Basamak bazlı skorlar
  const stepScores: Record<number, number> = {};
  for (let step = 0; step <= 7; step++) {
    const stepItems = KINEMATICS_SCHEMA.flatMap((s) => s.steps)
      .filter((st) => st.stepId === step)
      .flatMap((st) => st.items);

    const stepAnswered = stepItems.filter((it) => responses[it.id]?.val !== null && responses[it.id]?.val !== undefined);
    const stepYes = stepItems.filter((it) => responses[it.id]?.val === true).length;
    stepScores[step] = stepAnswered.length > 0 ? Math.round((stepYes / stepAnswered.length) * 100) : 0;
  }

  // Değerlendirmeyi Kaydet
  const handleSaveEvaluation = async () => {
    setIsSaving(true);
    try {
      const newRecord: EvaluationRecord = {
        id: `eval_${Date.now()}`,
        clientId,
        evaluationDate: new Date().toISOString(),
        responses,
        overallScore,
        stepScores,
        clinicianSummary,
        recommendations,
      };

      // 1. LocalStorage Kaydı
      const storageKey = `crocodil_kinematics_${clientId}`;
      const updatedList = [newRecord, ...pastEvaluations.filter((p) => p.id !== newRecord.id)];
      localStorage.setItem(storageKey, JSON.stringify(updatedList));
      setPastEvaluations(updatedList);

      // 2. Supabase Kaydı (Graceful API çağrısı)
      try {
        const sectionAData: Record<string, unknown> = {};
        const sectionBData: Record<string, unknown> = {};
        const sectionCData: Record<string, unknown> = {};

        for (const [key, val] of Object.entries(responses)) {
          if (key.startsWith("a")) sectionAData[key] = val;
          else if (key.startsWith("b")) sectionBData[key] = val;
          else if (key.startsWith("c")) sectionCData[key] = val;
        }

        // Supabase REST kaydı (Mevcut Supabase URL ve Key ile)
        const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://irsygizkcyflryyaysij.supabase.co";
        const sbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

        if (sbKey) {
          await fetch(`${sbUrl}/rest/v1/clinical_kinematics_evaluations`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: sbKey,
              Authorization: `Bearer ${sbKey}`,
              Prefer: "return=representation",
            },
            body: JSON.stringify({
              client_id: clientId,
              evaluation_date: newRecord.evaluationDate,
              section_a: sectionAData,
              section_b: sectionBData,
              section_c: sectionCData,
              step_scores: stepScores,
              overall_score: overallScore,
              clinician_summary: clinicianSummary,
              recommendations: recommendations,
            }),
          });
        }
      } catch (sbErr) {
        console.warn("Supabase paralel kaydı atlandı (Yerel kayıt başarılı):", sbErr);
      }

      toastSuccess("Klinik Kinematik Değerlendirme başarıyla kaydedildi!");
    } catch (err) {
      console.error(err);
      toastError("Kayıt sırasında bir hata oluştu.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Üst Özet ve Eylem Barı ────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 border border-teal-100 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-teal-50 text-teal-600 font-bold">
              <Activity className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-gray-800">
                Nöromotor ve Kinematik Klinik Değerlendirme Formu
              </h2>
              <p className="text-xs text-gray-500">
                3 Bölüm · 7 Fonksiyon Basamağı · Human-in-the-Loop Klinisyen Değerlendirmesi
              </p>
            </div>
          </div>
        </div>

        {/* Skor Kartı & Kaydet Butonu */}
        <div className="flex items-center gap-4 flex-wrap w-full md:w-auto justify-end">
          <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
            <div className="text-right">
              <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                Genel Uyum
              </div>
              <div className="text-lg font-extrabold text-teal-700 font-mono">
                %{overallScore}
              </div>
            </div>
            <div className="w-9 h-9 rounded-full bg-teal-50 border-2 border-teal-500 flex items-center justify-center text-xs font-bold text-teal-700">
              {yesCount}/{answeredItems.length}
            </div>
          </div>

          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <History className="w-3.5 h-3.5" />
            Geçmiş ({pastEvaluations.length})
          </button>

          <button
            onClick={handleSaveEvaluation}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all hover:opacity-95"
            style={{ background: "linear-gradient(135deg, #0d9488, #14b8a6)" }}
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSaving ? "Kaydediliyor..." : "Değerlendirmeyi Kaydet"}
          </button>
        </div>
      </div>

      {/* ── Geçmiş Kayıtlar Çekmecesi ────────────────────────────────────── */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-teal-900/5 rounded-2xl p-4 border border-teal-200 overflow-hidden"
          >
            <div className="text-xs font-bold text-teal-800 mb-2 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" />
              Önceki Değerlendirme Oturumları ({pastEvaluations.length})
            </div>
            {pastEvaluations.length === 0 ? (
              <div className="text-xs text-gray-500 italic py-2">Henüz kayıtlı değerlendirme bulunmuyor.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {pastEvaluations.map((ev, i) => (
                  <button
                    key={ev.id || i}
                    onClick={() => {
                      setResponses(ev.responses || {});
                      setClinicianSummary(ev.clinicianSummary || "");
                      setRecommendations(ev.recommendations || "");
                      setShowHistory(false);
                      toastSuccess("Seçilen değerlendirme oturumu forma yüklendi.");
                    }}
                    className="p-3 rounded-xl bg-white border border-teal-100 text-left hover:border-teal-400 transition-colors shadow-sm"
                  >
                    <div className="flex justify-between items-center text-xs font-bold text-gray-700">
                      <span>{new Date(ev.evaluationDate).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}</span>
                      <span className="text-teal-600">%{ev.overallScore}</span>
                    </div>
                    <div className="text-[11px] text-gray-400 mt-1 line-clamp-1">
                      {ev.clinicianSummary || "Klinisyen notu yok"}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 3 Bölümlü Değerlendirme Akordeonu ────────────────────────────── */}
      <div className="space-y-4">
        {KINEMATICS_SCHEMA.map((section) => {
          const isExpanded = expandedSection === section.sectionKey;
          const sectionItems = section.steps.flatMap((st) => st.items);
          const sectionYes = sectionItems.filter((it) => responses[it.id]?.val === true).length;
          const sectionAnswered = sectionItems.filter((it) => responses[it.id]?.val !== null && responses[it.id]?.val !== undefined).length;
          const sectionPct = sectionAnswered > 0 ? Math.round((sectionYes / sectionAnswered) * 100) : 0;

          return (
            <div
              key={section.sectionKey}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden transition-all"
            >
              {/* Bölüm Başlığı */}
              <button
                onClick={() => setExpandedSection(isExpanded ? "" : section.sectionKey)}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
                style={{ background: isExpanded ? "rgba(13,148,136,0.03)" : "white" }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 font-bold flex items-center justify-center text-sm border border-teal-200">
                    {section.sectionKey === "section_a" ? "A" : section.sectionKey === "section_b" ? "B" : "C"}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-800">{section.title}</h3>
                    <p className="text-xs text-gray-400">{section.subtitle}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-xs font-bold text-teal-700 font-mono">
                      %{sectionPct}
                    </span>
                    <span className="text-[11px] text-gray-400 ml-1.5">
                      ({sectionYes}/{sectionItems.length})
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </button>

              {/* Bölüm İçeriği (Basamaklar & Maddeler) */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 border-t border-gray-100 bg-slate-50/50 space-y-6"
                  >
                    {section.steps.map((step) => {
                      const stepScore = stepScores[step.stepId] || 0;

                      return (
                        <div key={step.stepId} className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm space-y-3">
                          {/* Basamak Başlığı */}
                          <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                            <div>
                              <div className="text-xs font-extrabold text-teal-800 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-teal-500" />
                                {step.stepName}
                              </div>
                              <div className="text-[11px] text-gray-400 mt-0.5">{step.subtitle}</div>
                            </div>
                            <div className="text-xs font-bold text-teal-600 font-mono bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-100">
                              %{stepScore} Uyum
                            </div>
                          </div>

                          {/* Maddeler Tablosu / Listesi */}
                          <div className="space-y-3 pt-1">
                            {step.items.map((item) => {
                              const resp = responses[item.id] || { val: null, yorum: "" };
                              const isYes = resp.val === true;
                              const isNo = resp.val === false;

                              return (
                                <div
                                  key={item.id}
                                  className="p-3.5 rounded-xl border transition-all"
                                  style={{
                                    borderColor: isYes ? "#99f6e4" : isNo ? "#fecdd3" : "#e5e7eb",
                                    background: isYes ? "#f0fdfa" : isNo ? "#fff1f2" : "#fafafa",
                                  }}
                                >
                                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-mono">
                                          {item.code}
                                        </span>
                                        <span className="text-xs font-bold text-gray-800">
                                          {item.title}
                                        </span>
                                        {item.targetPlane && (
                                          <span className="text-[10px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100 font-medium">
                                            {item.targetPlane}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                                        {item.description}
                                      </p>
                                    </div>

                                    {/* EVET / HAYIR Butonları (Human-in-the-Loop) */}
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => handleSetResponse(item.id, true)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                          isYes
                                            ? "bg-teal-600 text-white shadow-sm ring-2 ring-teal-400"
                                            : "bg-white text-gray-600 border border-gray-200 hover:bg-teal-50 hover:text-teal-700"
                                        }`}
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                        EVET
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => handleSetResponse(item.id, false)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                          isNo
                                            ? "bg-rose-600 text-white shadow-sm ring-2 ring-rose-400"
                                            : "bg-white text-gray-600 border border-gray-200 hover:bg-rose-50 hover:text-rose-700"
                                        }`}
                                      >
                                        <X className="w-3.5 h-3.5" />
                                        HAYIR
                                      </button>
                                    </div>
                                  </div>

                                  {/* Yorum / Klinisyen Gözlem Alanı */}
                                  <div className="mt-2.5">
                                    <input
                                      type="text"
                                      value={resp.yorum || ""}
                                      onChange={(e) => handleSetYorum(item.id, e.target.value)}
                                      placeholder="Klinisyen gözlemi / kinematik not..."
                                      className="w-full text-xs px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-700 placeholder-gray-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* ── Klinisyen Genel Özeti ve Öneriler ─────────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
          <FileText className="w-4 h-4 text-teal-600" />
          Klinik Sentez ve Terapi Önerileri
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Klinisyen Genel Değerlendirme Notu
            </label>
            <textarea
              rows={3}
              value={clinicianSummary}
              onChange={(e) => setClinicianSummary(e.target.value)}
              placeholder="Hastanın artikülatör alt sistemlerdeki genel uyum ve motor kontrol düzeyi..."
              className="w-full text-xs p-3 rounded-xl border border-gray-200 text-gray-700 placeholder-gray-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Hedeflenen Nöromotor Basamaklar ve Klinik Öneriler
            </label>
            <textarea
              rows={3}
              value={recommendations}
              onChange={(e) => setRecommendations(e.target.value)}
              placeholder="Örn: Basamak III Mandibular stabilite ve Basamak VI hece geçişleri üzerinde yoğunlaşılmalı..."
              className="w-full text-xs p-3 rounded-xl border border-gray-200 text-gray-700 placeholder-gray-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
