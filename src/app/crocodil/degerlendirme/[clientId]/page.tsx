"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { getClient, saveAssessment, getAssessments } from "@/lib/crocodil/storage";
import type { AssessmentCategory } from "@/lib/crocodil/types";
import {
  ArrowLeft, Check, ChevronRight, Info, User, BookOpen,
  MessageCircle, Wind, Mic, Utensils, Brain, Volume2,
  Cpu, Heart, Map, FileText, Play,
} from "lucide-react";
import Link from "next/link";

interface CategoryDef {
  key: AssessmentCategory;
  label: string;
  icon: React.ElementType;
  color: string;
  description: string;
  badge?: string;
}

const CATEGORIES: CategoryDef[] = [
  { key: "personal",     label: "Kişisel Bilgiler & Anamnez", icon: User,          color: "#6b7280", description: "Demografik bilgiler, tıbbi geçmiş, gelişimsel hikaye" },
  { key: "language",     label: "Dil & İletişim",             icon: BookOpen,      color: "#3b82f6", description: "Alıcı dil, ifade edici dil, pragmatik, okuma-yazma", badge: "CELF/PPVT" },
  { key: "articulation", label: "Artikülasyon & Fonoloji",    icon: MessageCircle, color: "#10b981", description: "Ses envanteri, fonolojik süreçler, anlaşılırlık", badge: "DEAP/GFTA" },
  { key: "fluency",      label: "Akıcılık",                   icon: Wind,          color: "#0ea5e9", description: "Kekemelik tipi, SSI-4, OASES, kaçınma davranışları" },
  { key: "voice",        label: "Ses Bozuklukları",           icon: Mic,           color: "#8b5cf6", description: "GRBAS, CAPE-V, VHI-10, akustik parametreler (AVQI)", badge: "Akustik" },
  { key: "dysphagia",    label: "Yutma & Disfaji",            icon: Utensils,      color: "#f59e0b", description: "CSE, FEES belgesi, FOIS, IDDSI, EAT-10, DOSS", badge: "FEES" },
  { key: "aphasia",      label: "Afazi",                      icon: Brain,         color: "#ef4444", description: "WAB-R, BDAE, BNT, CETI, modalite profili", badge: "WAB/BDAE" },
  { key: "aac",          label: "AAC",                        icon: Volume2,       color: "#14b8a6", description: "İletişim ihtiyaç analizi, sembol sistemi, cihaz önerisi" },
  { key: "motorSpeech",  label: "Motor Konuşma",              icon: Cpu,           color: "#f97316", description: "Dizartri tipi, FDA-2, Apraksi ASRS, DDK" },
  { key: "socialComm",   label: "Sosyal İletişim",            icon: Heart,         color: "#ec4899", description: "Pragmatik profil, ortak dikkat, AQ-10, etkileşim" },
  { key: "icf",          label: "ICF Profili",                icon: Map,           color: "#6366f1", description: "Tüm SLP ICF kodları, AI asistan ile kodlama desteği", badge: "AI Asistan" },
  { key: "conclusion",   label: "Sonuç & Rapor",              icon: FileText,      color: "#0d9488", description: "AI özet, öncelik sıralama, terapi önerisi, PDF rapor", badge: "AI + PDF" },
];

export default function DegerlendirmePage() {
  const { clientId } = useParams<{ clientId: string }>();
  const router = useRouter();
  const [client, setClient] = useState<any>(null);
  const [selected, setSelected] = useState<Set<AssessmentCategory>>(new Set(["personal", "conclusion"]));
  const [started, setStarted] = useState(false);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) return;
    const load = async () => {
      const c = await getClient(clientId as string);
      if (!c) { router.push("/crocodil/danisman"); return; }
      setClient(c);
      const assessments = await getAssessments(clientId as string);
      const existing = assessments.find((a) => a.status === "devam");
      if (existing) setAssessmentId(existing.id);
    };
    load();
  }, [clientId, router]);

  const toggleCategory = (key: AssessmentCategory) => {
    // personal ve conclusion her zaman seçili
    if (key === "personal" || key === "conclusion") return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleStart = async () => {
    const orderedCategories = CATEGORIES.filter((c) => selected.has(c.key)).map((c) => c.key);
    const assessment = await saveAssessment({
      clientId: clientId as string,
      selectedCategories: orderedCategories,
      status: "devam",
    });
    setAssessmentId(assessment.id);
    setStarted(true);
    router.push(`/crocodil/degerlendirme/${clientId}/form/${assessment.id}/personal`);
  };

  if (!client) return null;

  return (
    <div className="flex flex-col h-full" style={{ background: "#f8fffe" }}>
      {/* Header */}
      <div className="px-5 py-4 border-b" style={{ background: "white", borderColor: "#e5f7f5" }}>
        <div className="flex items-center gap-3">
          <Link href={`/crocodil/danisman/${clientId}`}>
            <button className="w-8 h-8 rounded-lg border flex items-center justify-center hover:bg-gray-50 transition-colors" style={{ borderColor: "#e5e7eb" }}>
              <ArrowLeft className="w-4 h-4 text-gray-500" />
            </button>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-800">Değerlendirme Başlat</h1>
            <p className="text-xs text-gray-400">{client.firstName} {client.lastName} için alan seçin</p>
          </div>
        </div>
      </div>

      {/* İçerik */}
      <div className="flex-1 overflow-y-auto p-5">
        <div className="max-w-2xl mx-auto">
          {/* Açıklama */}
          <div className="bg-white rounded-2xl p-4 border mb-5 flex gap-3" style={{ borderColor: "#e5f7f5" }}>
            <Info className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-700">Şüphelendiğiniz alanları seçin</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Her seçilen alan için ayrı ve detaylı bir değerlendirme formu açılacak. Kişisel Bilgiler ve Sonuç & Rapor her zaman dahildir.
              </p>
            </div>
          </div>

          {/* Kategori Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selected.has(cat.key);
              const isLocked = cat.key === "personal" || cat.key === "conclusion";

              return (
                <motion.button
                  key={cat.key}
                  whileHover={!isLocked ? { scale: 1.01 } : {}}
                  whileTap={!isLocked ? { scale: 0.99 } : {}}
                  onClick={() => toggleCategory(cat.key)}
                  className="text-left rounded-2xl p-4 border transition-all relative"
                  style={{
                    background: isSelected ? `${cat.color}10` : "white",
                    borderColor: isSelected ? `${cat.color}60` : "#e5e7eb",
                    cursor: isLocked ? "default" : "pointer",
                    opacity: isLocked ? 0.85 : 1,
                  }}
                >
                  {/* Seçim işareti */}
                  <div
                    className="absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all"
                    style={{
                      borderColor: isSelected ? cat.color : "#d1d5db",
                      background: isSelected ? cat.color : "transparent",
                    }}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                  </div>

                  <div className="flex items-start gap-3 pr-7">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${cat.color}15` }}
                    >
                      <Icon className="w-4 h-4" style={{ color: cat.color }} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-800">{cat.label}</span>
                        {cat.badge && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                            style={{ background: `${cat.color}20`, color: cat.color }}>
                            {cat.badge}
                          </span>
                        )}
                        {isLocked && (
                          <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md">Zorunlu</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{cat.description}</p>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Alt buton */}
          <div className="sticky bottom-4">
            <div className="bg-white rounded-2xl p-4 border shadow-lg" style={{ borderColor: "#e5f7f5" }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    {selected.size} alan seçildi
                  </p>
                  <p className="text-xs text-gray-400">
                    {CATEGORIES.filter((c) => selected.has(c.key)).map((c) => c.label).join(", ")}
                  </p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleStart}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm"
                  style={{ background: "linear-gradient(135deg, #0d9488, #134e4a)" }}
                >
                  <Play className="w-4 h-4" />
                  Değerlendirmeyi Başlat
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
