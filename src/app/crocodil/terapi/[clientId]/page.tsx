"use client";
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getClient, getGoals, getSessions, saveSession, getSettings } from "@/lib/crocodil/storage";
import type { SMARTGoal, TherapySession } from "@/lib/crocodil/types";
import { ArrowLeft, Play, Save, Target, Plus, CheckCircle2, TrendingUp, AlertCircle, FileText } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

const LABEL = "text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1";
const INPUT = "w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-400 transition-colors bg-white";

export default function TerapiSeansPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const router = useRouter();
  const [client, setClient] = useState<any>(null);
  const [goals, setGoals] = useState<SMARTGoal[]>([]);
  const [sessionCount, setSessionCount] = useState(0);
  const [saving, setSaving] = useState(false);

  // Form State
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split("T")[0]);
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [goalProgress, setGoalProgress] = useState<{ goalId: string; trials: number; correct: number; notes: string }[]>([]);
  const [techniquesUsed, setTechniquesUsed] = useState<string[]>([]);
  const [clinicianNotes, setClinicianNotes] = useState("");
  const [homeProgram, setHomeProgram] = useState("");

  const COMMON_TECHNIQUES = [
    "PROMPT (Restructuring Oral Muscular Phonetic Targets)", "LSVT LOUD", "Melodik Entonasyon Terapisi (MIT)",
    "Hanen Programı", "Lidcombe Programı", "Fonolojik Farkındalık Eğitimi", "Yutma Manevrası (Mendelsohn/Supraglottik)",
    "AAC Modelleme (Aided Language Stimulation)", "Minimal Çiftler (Minimal Pairs)", "Vokal Fonksiyon Egzersizleri (VFE)"
  ];

  useEffect(() => {
    if (!clientId) return;
    const c = getClient(clientId);
    if (!c) { router.push("/crocodil/danisman"); return; }
    setClient(c);
    const g = getGoals(clientId).filter(x => x.status === "aktif");
    setGoals(g);
    setGoalProgress(g.map(goal => ({ goalId: goal.id, trials: 10, correct: 0, notes: "" })));
    setSessionCount(getSessions(clientId).length);
  }, [clientId]);

  const handleSave = () => {
    setSaving(true);
    const session: Omit<TherapySession, "id" | "createdAt" | "sessionNumber"> = {
      clientId,
      sessionDate,
      durationMinutes,
      sessionMode: "klinik",
      goalProgress: goalProgress.map(gp => ({
        goalId: gp.goalId,
        trials: gp.trials,
        correct: gp.correct,
        accuracyPercent: gp.trials > 0 ? Math.round((gp.correct / gp.trials) * 100) : 0,
        notes: gp.notes,
      })),
      techniquesUsed,
      clinicianNotes,
      homeProgram,
    };
    
    saveSession(session);
    router.push(`/crocodil/danisman/${clientId}`);
  };

  if (!client) return null;

  return (
    <div className="flex flex-col h-full" style={{ background: "#f8fffe" }}>
      {/* Header */}
      <div className="px-5 py-4 border-b flex items-center justify-between" style={{ background: "white", borderColor: "#e5f7f5" }}>
        <div className="flex items-center gap-3">
          <Link href={`/crocodil/danisman/${clientId}`}>
            <button className="w-8 h-8 rounded-lg border flex items-center justify-center hover:bg-gray-50 transition-colors" style={{ borderColor: "#e5e7eb" }}>
              <ArrowLeft className="w-4 h-4 text-gray-500" />
            </button>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-800">Seans #{sessionCount + 1}</h1>
            <p className="text-xs text-gray-400">{client.firstName} {client.lastName}</p>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, #3b82f6, #1d4ed8)" }}
        >
          <Save className="w-4 h-4" />
          {saving ? "Kaydediliyor..." : "Seansı Kaydet"}
        </motion.button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 max-w-3xl mx-auto w-full space-y-4">
        
        {/* Seans Detayları */}
        <div className="bg-white rounded-2xl p-4 border grid grid-cols-2 gap-4" style={{ borderColor: "#e5e7eb" }}>
          <div>
            <label className={LABEL}>Tarih</label>
            <input type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} className={INPUT} style={{ borderColor: "#e5e7eb" }} />
          </div>
          <div>
            <label className={LABEL}>Süre (dk)</label>
            <input type="number" value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value))} className={INPUT} style={{ borderColor: "#e5e7eb" }} />
          </div>
        </div>

        {/* Hedef Çalışmaları (Trial Data) */}
        <div className="bg-white rounded-2xl p-5 border" style={{ borderColor: "#bfdbfe" }}>
          <div className="flex items-center gap-2 font-semibold text-blue-700 mb-4">
            <Target className="w-4 h-4" /> Aktif Hedefler & Veri Toplama (Trial Data)
          </div>
          
          {goals.length === 0 ? (
            <div className="p-4 rounded-xl flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>Bu danışan için henüz aktif hedef bulunmuyor. Hedef eklemek için değerlendirme modülünü veya danışan profilini kullanın.</div>
            </div>
          ) : (
            <div className="space-y-4">
              {goals.map((goal, i) => {
                const gp = goalProgress.find(x => x.goalId === goal.id);
                if (!gp) return null;
                const accuracy = gp.trials > 0 ? Math.round((gp.correct / gp.trials) * 100) : 0;
                
                return (
                  <div key={goal.id} className="p-4 rounded-xl border" style={{ borderColor: "#e0e7ff", background: "#f8fafc" }}>
                    <p className="text-sm font-semibold text-gray-800 mb-1">{goal.description}</p>
                    <p className="text-[10px] text-gray-400 mb-3">Hedef: %{goal.targetPercent} | {goal.icfCode}</p>
                    
                    <div className="grid grid-cols-12 gap-3 items-end">
                      <div className="col-span-3">
                        <label className={LABEL}>Deneme (Trial)</label>
                        <input type="number" min={0} value={gp.trials} onChange={(e) => {
                          const n = [...goalProgress]; n[i].trials = Number(e.target.value); setGoalProgress(n);
                        }} className={INPUT} style={{ borderColor: "#e5e7eb" }} />
                      </div>
                      <div className="col-span-3">
                        <label className={LABEL}>Doğru (+)</label>
                        <input type="number" min={0} max={gp.trials} value={gp.correct} onChange={(e) => {
                          const n = [...goalProgress]; n[i].correct = Number(e.target.value); setGoalProgress(n);
                        }} className={INPUT} style={{ borderColor: "#e5e7eb" }} />
                      </div>
                      <div className="col-span-6 flex items-center gap-3">
                        <div className="flex-1 h-8 rounded-full overflow-hidden bg-gray-200">
                          <div className="h-full transition-all flex items-center justify-center text-[10px] font-bold text-white"
                            style={{ 
                              width: `${accuracy}%`, 
                              background: accuracy >= goal.targetPercent ? "#10b981" : "#3b82f6",
                              minWidth: accuracy > 0 ? "2rem" : "0"
                            }}>
                            {accuracy > 0 ? `%${accuracy}` : ""}
                          </div>
                        </div>
                        <div className="text-xs font-bold w-12 text-right" style={{ color: accuracy >= goal.targetPercent ? "#10b981" : "#3b82f6" }}>
                          %{accuracy}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Kullanılan Teknikler */}
        <div className="bg-white rounded-2xl p-5 border" style={{ borderColor: "#e5e7eb" }}>
          <div className="font-semibold text-gray-700 text-sm mb-3">Kullanılan Teknikler & Yaklaşımlar</div>
          <div className="flex gap-2 flex-wrap">
            {COMMON_TECHNIQUES.map(tech => (
              <button key={tech} onClick={() => setTechniquesUsed(prev => prev.includes(tech) ? prev.filter(t => t !== tech) : [...prev, tech])}
                className="px-3 py-1.5 rounded-xl text-xs border transition-all"
                style={{ 
                  background: techniquesUsed.includes(tech) ? "#dbeafe" : "white",
                  borderColor: techniquesUsed.includes(tech) ? "#3b82f6" : "#e5e7eb",
                  color: techniquesUsed.includes(tech) ? "#1d4ed8" : "#4b5563"
                }}>
                {tech}
              </button>
            ))}
          </div>
        </div>

        {/* Notlar & Ev Programı */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-5 border" style={{ borderColor: "#e5e7eb" }}>
            <div className="font-semibold text-gray-700 text-sm mb-3">Klinik Notlar (SOAP - O/A)</div>
            <textarea value={clinicianNotes} onChange={(e) => setClinicianNotes(e.target.value)}
              placeholder="Davranışsal gözlemler, cue (ipucu) ihtiyacı (min/mod/max), dikkat süresi..." rows={4}
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 resize-none" style={{ borderColor: "#e5e7eb" }} />
          </div>
          
          <div className="bg-white rounded-2xl p-5 border" style={{ borderColor: "#e5e7eb" }}>
            <div className="font-semibold text-gray-700 text-sm mb-3">Ev Programı & Aile Eğitimi</div>
            <textarea value={homeProgram} onChange={(e) => setHomeProgram(e.target.value)}
              placeholder="Aileye verilen ödevler, uygulanacak teknikler..." rows={4}
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 resize-none" style={{ borderColor: "#e5e7eb" }} />
            <div className="mt-2 text-right">
              <Link href={`/crocodil/ai?clientId=${clientId}&intent=homeProgram`} target="_blank">
                <button className="text-[10px] font-semibold text-orange-600 hover:underline">
                  ✨ AI ile Ev Programı Üret
                </button>
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
