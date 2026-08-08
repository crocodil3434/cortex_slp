"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getClient, getSessions, getAssessments, getGoals } from "@/lib/crocodil/storage";
import type { Client, TherapySession, Assessment, SMARTGoal } from "@/lib/crocodil/types";
import { format, parseISO, differenceInYears } from "date-fns";
import { tr } from "date-fns/locale";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { ClinicalReportDocument } from "@/lib/crocodil/report-generator";
import {
  ArrowLeft, Plus, ClipboardList, Activity, BarChart3,
  Sparkles, Edit, Calendar, Clock, Target, TrendingUp,
  User, Phone, Stethoscope, Download, FileText
} from "lucide-react";
import Link from "next/link";

const COLOR_PALETTE = ["#0d9488","#3b82f6","#a855f7","#f59e0b","#ef4444","#10b981","#8b5cf6","#ec4899"];
function getAvatarColor(id: string) {
  const i = id.charCodeAt(0) + id.charCodeAt(id.length - 1);
  return COLOR_PALETTE[i % COLOR_PALETTE.length];
}

type TabKey = "genel" | "timeline" | "raporlar" | "analiz";

export default function DanismanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [sessions, setSessions] = useState<TherapySession[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [goals, setGoals] = useState<SMARTGoal[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>("genel");

  useEffect(() => {
    if (!id) return;
    const c = getClient(id);
    if (!c) { router.push("/crocodil/danisman"); return; }
    setClient(c);
    setSessions(getSessions(id));
    setAssessments(getAssessments(id));
    setGoals(getGoals(id));
  }, [id]);

  if (!client) return null;

  const avatarColor = getAvatarColor(client.id);
  const age = client.birthDate ? differenceInYears(new Date(), parseISO(client.birthDate)) : null;
  const activeGoals = goals.filter((g) => g.status === "aktif");
  const avgSuccess = sessions.length > 0
    ? Math.round(sessions.slice(0, 5).reduce((acc, s) => acc + (s.goalProgress.reduce((a, g) => a + g.accuracyPercent, 0) / Math.max(s.goalProgress.length, 1)), 0) / Math.min(sessions.length, 5))
    : 0;

  const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: "genel", label: "Genel Bakış", icon: User },
    { key: "timeline", label: "Zaman Çizelgesi", icon: Clock },
    { key: "raporlar", label: "Belgeler", icon: ClipboardList },
    { key: "analiz", label: "Analiz", icon: BarChart3 },
  ];

  return (
    <div className="flex flex-col h-full" style={{ background: "#f8fffe" }}>
      {/* Header */}
      <div className="px-5 py-4 border-b" style={{ background: "white", borderColor: "#e5f7f5" }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/crocodil/danisman")}
              className="w-8 h-8 rounded-lg border flex items-center justify-center hover:bg-gray-50 transition-colors flex-shrink-0"
              style={{ borderColor: "#e5e7eb" }}>
              <ArrowLeft className="w-4 h-4 text-gray-500" />
            </button>
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}99)` }}
            >
              {client.avatarInitials}
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-800">
                {client.firstName} {client.lastName}
              </h1>
              <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                {age !== null && <span>{age} yaş</span>}
                {client.primaryDiagnosis && (
                  <><span className="text-gray-200">·</span><span>{client.primaryDiagnosis}</span></>
                )}
              </div>
            </div>
          </div>

          {/* Hızlı Aksiyonlar */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Link href={`/crocodil/danisman/${id}/duzenle`}>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors hover:bg-gray-50"
                style={{ borderColor: "#d1d5db", color: "#4b5563" }}>
                <Edit className="w-3.5 h-3.5" />
                Düzenle
              </button>
            </Link>
            <Link href={`/crocodil/degerlendirme/${id}`}>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors hover:bg-teal-50"
                style={{ borderColor: "#0d9488", color: "#0d9488" }}>
                <ClipboardList className="w-3.5 h-3.5" />
                Değerlendir
              </button>
            </Link>
            <Link href={`/crocodil/terapi/${id}`}>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors hover:bg-blue-50"
                style={{ borderColor: "#3b82f6", color: "#3b82f6" }}>
                <Activity className="w-3.5 h-3.5" />
                Yeni Seans
              </button>
            </Link>
            <Link href={`/crocodil/ai?clientId=${id}`}>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-white"
                style={{ background: "linear-gradient(135deg, #d97706, #b45309)" }}>
                <Sparkles className="w-3.5 h-3.5" />
                AI Materyal
              </button>
            </Link>
          </div>
        </div>

        {/* İstatistik Bantı */}
        <div className="grid grid-cols-4 gap-3 mt-4">
          {[
            { label: "Toplam Seans", value: sessions.length, icon: "🎯" },
            { label: "Aktif Hedef", value: activeGoals.length, icon: "📌" },
            { label: "Ort. Başarı", value: `${avgSuccess}%`, icon: "📈" },
            { label: "Değerlendirme", value: assessments.length, icon: "📋" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl p-2.5 text-center border"
              style={{ background: "#f8fffe", borderColor: "#e5f7f5" }}>
              <div className="text-xl mb-1">{stat.icon}</div>
              <div className="text-lg font-bold text-gray-800">{stat.value}</div>
              <div className="text-xs text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tab Navigasyonu */}
      <div className="flex border-b px-5" style={{ background: "white", borderColor: "#e5f7f5" }}>
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 transition-all ${
                activeTab === tab.key ? "border-teal-500 text-teal-600" : "border-transparent text-gray-400 hover:text-gray-600"
              }`}>
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* İçerik */}
      <div className="flex-1 overflow-y-auto p-5">
        {activeTab === "genel" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
            {/* Kişisel Bilgiler */}
            <div className="bg-white rounded-2xl p-4 border" style={{ borderColor: "#f0fdf9" }}>
              <div className="flex items-center gap-2 font-semibold text-gray-700 mb-3">
                <User className="w-4 h-4 text-teal-600" />
                Kişisel Bilgiler
              </div>
              <div className="space-y-2 text-sm">
                {[
                  { label: "Cinsiyet", value: client.gender },
                  { label: "Doğum Tarihi", value: client.birthDate ? format(parseISO(client.birthDate), "d MMMM yyyy", { locale: tr }) : "—" },
                  { label: "Dominant El", value: client.handedness },
                  { label: "Telefon", value: client.phone ?? "—" },
                  { label: "E-posta", value: client.email ?? "—" },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-gray-400">{label}</span>
                    <span className="text-gray-700 font-medium capitalize">{value || "—"}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Klinik Bilgiler */}
            <div className="bg-white rounded-2xl p-4 border" style={{ borderColor: "#f0fdf9" }}>
              <div className="flex items-center gap-2 font-semibold text-gray-700 mb-3">
                <Stethoscope className="w-4 h-4 text-teal-600" />
                Klinik Bilgiler
              </div>
              <div className="space-y-2 text-sm">
                {[
                  { label: "Sevk Kaynağı", value: client.referralSource },
                  { label: "Sevk Tanısı", value: client.referralDiagnosis },
                  { label: "Ön Tanı", value: client.primaryDiagnosis },
                  { label: "Sigorta", value: client.insuranceType },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-gray-400">{label}</span>
                    <span className="text-gray-700 font-medium capitalize">{value || "—"}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Aktif Hedefler */}
            {activeGoals.length > 0 && (
              <div className="bg-white rounded-2xl p-4 border md:col-span-2" style={{ borderColor: "#f0fdf9" }}>
                <div className="flex items-center gap-2 font-semibold text-gray-700 mb-3">
                  <Target className="w-4 h-4 text-teal-600" />
                  Aktif Hedefler
                </div>
                <div className="space-y-2">
                  {activeGoals.map((goal) => (
                    <div key={goal.id} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 truncate">{goal.description}</p>
                        {goal.icfCode && <span className="text-xs text-teal-600">{goal.icfCode}</span>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="w-24 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${goal.currentPercent}%`,
                              background: goal.currentPercent >= goal.targetPercent ? "#10b981" : "#0d9488",
                            }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-gray-600 w-8 text-right">
                          {goal.currentPercent}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notlar */}
            {client.notes && (
              <div className="bg-white rounded-2xl p-4 border md:col-span-2" style={{ borderColor: "#f0fdf9" }}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Notlar</p>
                <p className="text-sm text-gray-600">{client.notes}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "timeline" && (
          <div className="max-w-2xl space-y-3">
            {[...sessions.map((s) => ({ type: "session" as const, data: s, date: s.sessionDate })),
              ...assessments.map((a) => ({ type: "assessment" as const, data: a, date: a.createdAt }))
            ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex gap-3"
              >
                <div className="flex flex-col items-center">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs flex-shrink-0"
                    style={{ background: item.type === "session" ? "#0d9488" : "#a855f7" }}
                  >
                    {item.type === "session" ? "S" : "D"}
                  </div>
                  {i < 20 && <div className="w-px flex-1 mt-1" style={{ background: "#e5e7eb" }} />}
                </div>
                <div className="flex-1 bg-white rounded-xl p-3 border mb-2" style={{ borderColor: "#f0fdf9" }}>
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-semibold" style={{ color: item.type === "session" ? "#0d9488" : "#a855f7" }}>
                        {item.type === "session" ? `Seans #${(item.data as TherapySession).sessionNumber}` : "Değerlendirme"}
                      </span>
                      {item.type === "session" && (item.data as TherapySession).clinicianNotes && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{(item.data as TherapySession).clinicianNotes}</p>
                      )}
                      {item.type === "assessment" && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {(item.data as Assessment).selectedCategories.length} alan değerlendirildi
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {format(parseISO(item.date), "d MMM yy", { locale: tr })}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}

            {sessions.length === 0 && assessments.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-3">📋</div>
                <p>Henüz kayıt yok</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "raporlar" && (
          <div className="max-w-3xl space-y-4">
            {/* Rapor İndirme Kartları */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Değerlendirme Raporu */}
              <div className="bg-white rounded-2xl p-5 border flex flex-col items-center justify-center text-center h-48" style={{ borderColor: "#ccfbf1" }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ background: "#f0fdf9" }}>
                  <FileText className="w-6 h-6 text-teal-600" />
                </div>
                <h3 className="font-semibold text-gray-800 mb-1">Klinik Değerlendirme Raporu</h3>
                <p className="text-xs text-gray-400 mb-4">En son tamamlanan değerlendirmenin kapsamlı PDF özeti</p>
                
                {assessments.filter(a => a.status === "tamamlandı").length > 0 ? (
                  <PDFDownloadLink
                    document={<ClinicalReportDocument 
                      client={client} 
                      assessment={assessments.find(a => a.status === "tamamlandı")}
                      clinicianName="Uzm. DKT." 
                      reportType="assessment" 
                    />}
                    fileName={`${client.firstName}_${client.lastName}_Degerlendirme.pdf`}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 w-full justify-center"
                    style={{ background: "#0d9488" }}
                  >
                    {({ loading }) => (
                      loading ? "PDF Hazırlanıyor..." : <><Download className="w-4 h-4" /> PDF İndir</>
                    )}
                  </PDFDownloadLink>
                ) : (
                  <button disabled className="px-4 py-2 rounded-xl text-sm font-medium border text-gray-400 w-full" style={{ borderColor: "#e5e7eb", background: "#f9fafb" }}>
                    Önce Değerlendirme Tamamlayın
                  </button>
                )}
              </div>

              {/* Terapi İlerleme Raporu */}
              <div className="bg-white rounded-2xl p-5 border flex flex-col items-center justify-center text-center h-48" style={{ borderColor: "#dbeafe" }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ background: "#eff6ff" }}>
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-800 mb-1">Terapi İlerleme Raporu</h3>
                <p className="text-xs text-gray-400 mb-4">Terapötik hedeflerin seans bazlı ilerleme durum raporu</p>
                
                {sessions.length > 0 ? (
                  <PDFDownloadLink
                    document={<ClinicalReportDocument 
                      client={client} 
                      sessions={sessions}
                      goals={goals}
                      clinicianName="Uzm. DKT." 
                      reportType="progress" 
                    />}
                    fileName={`${client.firstName}_${client.lastName}_Ilerleme.pdf`}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 w-full justify-center"
                    style={{ background: "#3b82f6" }}
                  >
                    {({ loading }) => (
                      loading ? "PDF Hazırlanıyor..." : <><Download className="w-4 h-4" /> PDF İndir</>
                    )}
                  </PDFDownloadLink>
                ) : (
                  <button disabled className="px-4 py-2 rounded-xl text-sm font-medium border text-gray-400 w-full" style={{ borderColor: "#e5e7eb", background: "#f9fafb" }}>
                    En az 1 Seans Gerekiyor
                  </button>
                )}
              </div>
              
            </div>
            
            {/* Eski Rapor Geçmişi Listesi (Mock/Visual only for now) */}
            <div className="bg-white rounded-2xl p-4 border" style={{ borderColor: "#f0fdf9" }}>
              <div className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-600" />
                Rapor Geçmişi
              </div>
              {assessments.filter(a => a.status === "tamamlandı").length > 0 ? (
                <div className="space-y-2">
                  {assessments.filter(a => a.status === "tamamlandı").map(a => (
                    <div key={a.id} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-lg border border-transparent hover:border-gray-100">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span className="text-xs text-gray-700">Değerlendirme Raporu</span>
                      </div>
                      <span className="text-xs text-gray-400">{format(parseISO(a.createdAt), "d MMM yyyy", { locale: tr })}</span>
                    </div>
                  ))}
                </div>
              ) : (
                 <p className="text-xs text-gray-400 italic">Geçmiş rapor bulunamadı.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === "analiz" && (
          <div className="max-w-2xl">
            <Link href={`/crocodil/analiz/${id}`}>
              <button className="w-full py-3 rounded-xl text-sm font-medium text-white"
                style={{ background: "linear-gradient(135deg, #0d9488, #134e4a)" }}>
                Detaylı Analiz Sayfasını Aç
              </button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
