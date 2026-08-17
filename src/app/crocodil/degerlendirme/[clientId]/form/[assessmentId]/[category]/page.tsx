"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { getClient, getAssessment, saveAssessment } from "@/lib/crocodil/storage";
import type { AssessmentCategory, Assessment } from "@/lib/crocodil/types";

// Form bileşenleri
import PersonalInfoForm from "@/components/crocodil/assessment/PersonalInfoForm";
import LanguageForm from "@/components/crocodil/assessment/LanguageForm";
import ArticulationForm from "@/components/crocodil/assessment/ArticulationForm";
import FluencyForm from "@/components/crocodil/assessment/FluencyForm";
import VoiceForm from "@/components/crocodil/assessment/VoiceForm";
import DysphagiaForm from "@/components/crocodil/assessment/DysphagiaForm";
import AphasiaForm from "@/components/crocodil/assessment/AphasiaForm";
import AACForm from "@/components/crocodil/assessment/AACForm";
import MotorSpeechForm from "@/components/crocodil/assessment/MotorSpeechForm";
import SocialCommForm from "@/components/crocodil/assessment/SocialCommForm";
import ICFProfileForm from "@/components/crocodil/assessment/ICFProfileForm";
import ConclusionForm from "@/components/crocodil/assessment/ConclusionForm";

import {
  ArrowLeft, ArrowRight, Check, Save, ChevronRight, CheckCircle2, Circle,
} from "lucide-react";

const CATEGORY_META: Record<AssessmentCategory, { label: string; emoji: string; color: string }> = {
  personal:     { label: "Kişisel Bilgiler", emoji: "👤", color: "#6b7280" },
  language:     { label: "Dil & İletişim",   emoji: "📚", color: "#3b82f6" },
  articulation: { label: "Artikülasyon",      emoji: "🗣️", color: "#10b981" },
  fluency:      { label: "Akıcılık",          emoji: "🌊", color: "#0ea5e9" },
  voice:        { label: "Ses",               emoji: "🎵", color: "#8b5cf6" },
  dysphagia:    { label: "Yutma & Disfaji",   emoji: "🍽️", color: "#f59e0b" },
  aphasia:      { label: "Afazi",             emoji: "🧠", color: "#ef4444" },
  aac:          { label: "AAC",               emoji: "💬", color: "#14b8a6" },
  motorSpeech:  { label: "Motor Konuşma",     emoji: "⚙️", color: "#f97316" },
  socialComm:   { label: "Sosyal İletişim",   emoji: "🤝", color: "#ec4899" },
  icf:          { label: "ICF Profili",       emoji: "🗺️", color: "#6366f1" },
  conclusion:   { label: "Sonuç & Rapor",     emoji: "📄", color: "#0d9488" },
};

export default function AssessmentWizardPage() {
  const { clientId, assessmentId, category } = useParams<{
    clientId: string;
    assessmentId: string;
    category: string;
  }>();
  const router = useRouter();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [client, setClient] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const a = await getAssessment(assessmentId as string);
      const c = await getClient(clientId as string);
      if (!a || !c) { router.push(`/crocodil/danisman/${clientId}`); return; }
      setAssessment(a);
      setClient(c);
    };
    load();
  }, [assessmentId, clientId, router]);

  const currentCat = category as AssessmentCategory;
  const categories = assessment?.selectedCategories ?? [];
  const currentIdx = categories.indexOf(currentCat);
  const prevCat = currentIdx > 0 ? categories[currentIdx - 1] : null;
  const nextCat = currentIdx < categories.length - 1 ? categories[currentIdx + 1] : null;
  const isLast = !nextCat;

  const handleSave = useCallback(
    async (data: Partial<Assessment>) => {
      if (!assessment) return;
      setSaving(true);
      try {
        const updated = await saveAssessment({
          ...assessment,
          ...data,
          id: assessment.id,
          clientId: assessment.clientId,
        });
        setAssessment(updated);
      } finally {
        setSaving(false);
      }
    },
    [assessment]
  );

  const handleNext = async () => {
    if (nextCat) {
      router.push(`/crocodil/degerlendirme/${clientId}/form/${assessmentId}/${nextCat}`);
    } else {
      // Tamamlandı — değerlendirmeyi bitir
      await saveAssessment({ ...assessment!, status: "tamamlandı" });
      router.push(`/crocodil/danisman/${clientId}`);
    }
  };

  const handlePrev = () => {
    if (prevCat) router.push(`/crocodil/degerlendirme/${clientId}/form/${assessmentId}/${prevCat}`);
  };

  if (!assessment || !client) return null;

  const meta = CATEGORY_META[currentCat];
  const completedCats = categories.slice(0, currentIdx);

  const renderForm = () => {
    const props = { assessment, onSave: handleSave, client };
    switch (currentCat) {
      case "personal":     return <PersonalInfoForm {...props} />;
      case "language":     return <LanguageForm {...props} />;
      case "articulation": return <ArticulationForm {...props} />;
      case "fluency":      return <FluencyForm {...props} />;
      case "voice":        return <VoiceForm {...props} />;
      case "dysphagia":    return <DysphagiaForm {...props} />;
      case "aphasia":      return <AphasiaForm {...props} />;
      case "aac":          return <AACForm {...props} />;
      case "motorSpeech":  return <MotorSpeechForm {...props} />;
      case "socialComm":   return <SocialCommForm {...props} />;
      case "icf":          return <ICFProfileForm {...props} />;
      case "conclusion":   return <ConclusionForm {...props} />;
      default:             return <div className="p-8 text-center text-gray-400">Form hazırlanıyor...</div>;
    }
  };

  return (
    <div className="flex flex-col h-full" style={{ background: "#f8fffe" }}>
      {/* Header */}
      <div className="px-5 py-3 border-b" style={{ background: "white", borderColor: "#e5f7f5" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(`/crocodil/degerlendirme/${clientId}`)}
              className="w-8 h-8 rounded-lg border flex items-center justify-center hover:bg-gray-50 transition-colors"
              style={{ borderColor: "#e5e7eb" }}
            >
              <ArrowLeft className="w-4 h-4 text-gray-500" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xl">{meta.emoji}</span>
              <div>
                <div className="text-sm font-bold text-gray-800">{meta.label}</div>
                <div className="text-xs text-gray-400">
                  {client.firstName} {client.lastName} · Adım {currentIdx + 1}/{categories.length}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {saving && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                Kaydediliyor...
              </span>
            )}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleNext}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: isLast ? "linear-gradient(135deg, #10b981, #059669)" : "linear-gradient(135deg, #0d9488, #134e4a)" }}
            >
              {isLast ? (
                <><CheckCircle2 className="w-4 h-4" />Tamamla</>
              ) : (
                <>Sonraki <ArrowRight className="w-4 h-4" /></>
              )}
            </motion.button>
          </div>
        </div>

        {/* İlerleme çubuğu */}
        <div className="flex items-center gap-1 mt-3 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat, i) => {
            const m = CATEGORY_META[cat];
            const isActive = cat === currentCat;
            const isDone = i < currentIdx;
            return (
              <button
                key={cat}
                onClick={() => router.push(`/crocodil/degerlendirme/${clientId}/form/${assessmentId}/${cat}`)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex-shrink-0"
                style={{
                  background: isActive ? `${m.color}20` : isDone ? "rgba(16,185,129,0.1)" : "transparent",
                  color: isActive ? m.color : isDone ? "#10b981" : "#9ca3af",
                  border: isActive ? `1px solid ${m.color}50` : "1px solid transparent",
                }}
              >
                {isDone ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <span>{m.emoji}</span>
                )}
                <span className="hidden sm:block">{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Form içeriği */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentCat}
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {renderForm()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Alt navigasyon */}
      <div className="px-5 py-3 border-t flex justify-between" style={{ background: "white", borderColor: "#e5f7f5" }}>
        <button
          onClick={handlePrev}
          disabled={!prevCat}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors disabled:opacity-30 hover:bg-gray-50"
          style={{ borderColor: "#e5e7eb", color: "#6b7280" }}
        >
          <ArrowLeft className="w-4 h-4" />
          {prevCat ? CATEGORY_META[prevCat].label : "Geri"}
        </button>
        <button
          onClick={handleNext}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white"
          style={{ background: "linear-gradient(135deg, #0d9488, #134e4a)" }}
        >
          {isLast ? "Değerlendirmeyi Tamamla" : `${nextCat ? CATEGORY_META[nextCat].label : "Sonraki"}`}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
