"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getClient, getSessions, getAssessments, getGoals, getSettings, getClientFiles, deleteClientFile, getClientFileUrl, type ClientFile } from "@/lib/crocodil/storage";
import type { Client, TherapySession, Assessment, SMARTGoal, CrocodilSettings } from "@/lib/crocodil/types";
import { format, parseISO, differenceInYears } from "date-fns";
import { tr } from "date-fns/locale";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { ClinicalReportDocument } from "@/lib/crocodil/report-generator";
import {
  ArrowLeft, Plus, ClipboardList, Activity, BarChart3,
  Sparkles, Edit, Calendar, Clock, Target, TrendingUp,
  User, Phone, Stethoscope, Download, FileText, Trash2
} from "lucide-react";
import Link from "next/link";
import { ClientGoalSummary } from "@/components/crocodil/ClientGoalSummary";
import { FileUploader, getFileIcon, formatBytes } from "@/components/crocodil/FileUploader";
import { useToast } from "@/components/crocodil/Toast";
import { useConfirm } from "@/components/crocodil/ConfirmModal";

const COLOR_PALETTE = ["#0d9488","#3b82f6","#a855f7","#f59e0b","#ef4444","#10b981","#8b5cf6","#ec4899"];
function getAvatarColor(id: string) {
  const i = id.charCodeAt(0) + id.charCodeAt(id.length - 1);
  return COLOR_PALETTE[i % COLOR_PALETTE.length];
}

type TabKey = "genel" | "seanslar" | "degerlendirmeler" | "belgeler";

export default function DanismanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [sessions, setSessions] = useState<TherapySession[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [goals, setGoals] = useState<SMARTGoal[]>([]);
  const [settings, setSettings] = useState<CrocodilSettings | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("genel");
  const [files, setFiles] = useState<ClientFile[]>([]);
  const { success: toastSuccess, error: toastError } = useToast();
  const { confirm } = useConfirm();

  const refreshFiles = async () => {
    if (!id) return;
    try {
      setFiles(await getClientFiles(id as string));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      try {
        const c = await getClient(id as string);
        if (!c) { router.push("/crocodil/danisman"); return; }
        setClient(c);
        setSessions(await getSessions(id as string));
        setAssessments(await getAssessments(id as string));
        setGoals(await getGoals(id as string));
        setSettings(await getSettings());
        setFiles(await getClientFiles(id as string));
      } catch (e) {
        console.error(e);
      }
    };
    fetchData();
  }, [id, router]);

  const handleDeleteFile = async (path: string) => {
    if (await confirm({ title: "Dosyayı silmek istediğinize emin misiniz?", message: "Bu işlem geri alınamaz.", danger: true })) {
      try {
        await deleteClientFile(path);
        toastSuccess("Dosya silindi");
        refreshFiles();
      } catch (err: any) {
        toastError(err.message || "Dosya silinemedi");
      }
    }
  };

  const handleDownloadFile = async (path: string) => {
    try {
      const url = await getClientFileUrl(path);
      window.open(url, "_blank");
    } catch (err: any) {
      toastError("Dosya bağlantısı oluşturulamadı");
    }
  };

  if (!client) return null;

  const avatarColor = getAvatarColor(client.id);
  const age = client.birthDate ? differenceInYears(new Date(), parseISO(client.birthDate)) : null;
  const activeGoals = goals.filter((g) => g.status === "aktif");
  const avgSuccess = sessions.length > 0
    ? Math.round(sessions.slice(0, 5).reduce((acc, s) => acc + (s.goalProgress.reduce((a, g) => a + g.accuracyPercent, 0) / Math.max(s.goalProgress.length, 1)), 0) / Math.min(sessions.length, 5))
    : 0;

  const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: "genel", label: "Genel Bakış", icon: User },
    { key: "seanslar", label: "Seanslar", icon: Activity },
    { key: "degerlendirmeler", label: "Değerlendirmeler", icon: ClipboardList },
    { key: "belgeler", label: "Belgeler", icon: FileText },
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
            <Link href={`/crocodil/modul105?clientId=${id}`}>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white shadow-sm transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #0d9488, #134e4a)", border: "1px solid #14b8a6" }}>
                <span className="text-sm">📡</span>
                Modül 105: PROMPT İstasyonu
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

            {/* Hedef Özeti */}
            <div className="md:col-span-2">
              <ClientGoalSummary goals={goals} />
            </div>

            {/* Notlar */}
            {client.notes && (
              <div className="bg-white rounded-2xl p-4 border md:col-span-2" style={{ borderColor: "#f0fdf9" }}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Notlar</p>
                <p className="text-sm text-gray-600">{client.notes}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "seanslar" && (
          <div className="max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-3">
              <h3 className="font-semibold text-gray-700 mb-4">Terapi Geçmişi</h3>
              {sessions.sort((a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime()).map((s, i) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex gap-3"
                >
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs flex-shrink-0 bg-teal-600">S</div>
                    {i < sessions.length - 1 && <div className="w-px flex-1 mt-1" style={{ background: "#e5e7eb" }} />}
                  </div>
                  <div className="flex-1 bg-white rounded-xl p-3 border mb-2" style={{ borderColor: "#f0fdf9" }}>
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-semibold text-teal-600">Seans #{s.sessionNumber}</span>
                        {s.clinicianNotes && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{s.clinicianNotes}</p>}
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">{format(parseISO(s.sessionDate), "d MMM yy", { locale: tr })}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
              {sessions.length === 0 && (
                <div className="text-center py-12 text-gray-400 border rounded-2xl border-dashed" style={{ borderColor: "#e5e7eb" }}>
                  <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Henüz seans kaydı yok</p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="bg-white rounded-2xl p-5 border flex flex-col items-center justify-center text-center shadow-sm" style={{ borderColor: "#dbeafe" }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ background: "#eff6ff" }}>
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-800 mb-1">Terapi İlerleme Raporu</h3>
                <p className="text-xs text-gray-400 mb-4">Terapötik hedeflerin seans bazlı ilerleme durum raporu</p>
                
                {sessions.length > 0 ? (
                  <PDFDownloadLink
                    document={<ClinicalReportDocument client={client} sessions={sessions} goals={goals} settings={settings} reportType="progress" />}
                    fileName={`${client.firstName}_${client.lastName}_Ilerleme.pdf`}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 w-full justify-center"
                    style={{ background: "#3b82f6" }}
                  >
                    {({ loading }) => (loading ? "PDF Hazırlanıyor..." : <><Download className="w-4 h-4" /> PDF İndir</>)}
                  </PDFDownloadLink>
                ) : (
                  <button disabled className="px-4 py-2 rounded-xl text-sm font-medium border text-gray-400 w-full" style={{ borderColor: "#e5e7eb", background: "#f9fafb" }}>
                    En az 1 Seans Gerekiyor
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "degerlendirmeler" && (
          <div className="max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-3">
              <h3 className="font-semibold text-gray-700 mb-4">Değerlendirme Geçmişi</h3>
              {assessments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((a, i) => (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex gap-3"
                >
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs flex-shrink-0 bg-purple-500">D</div>
                    {i < assessments.length - 1 && <div className="w-px flex-1 mt-1" style={{ background: "#e5e7eb" }} />}
                  </div>
                  <div className="flex-1 bg-white rounded-xl p-3 border mb-2 cursor-pointer hover:bg-gray-50 transition-colors" 
                       onClick={() => router.push(`/crocodil/degerlendirme/${client.id}`)}
                       style={{ borderColor: a.motorSpeech?.m105SessionId ? "#99f6e4" : "#f0fdf9" }}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-purple-600">Değerlendirme</span>
                          {a.motorSpeech?.m105SessionId && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-100 text-teal-700 border border-teal-200">
                              📡 Modül 105 PROMPT #{a.motorSpeech.m105SessionId}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{a.selectedCategories.length} alan değerlendirildi ({a.status})</p>

                        {/* Modül 105 Metrik Özeti */}
                        {a.motorSpeech?.m105SessionId && (
                          <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t text-[11px]" style={{ borderColor: "#f0fdf9" }}>
                            {a.motorSpeech.ddkAmr && (
                              <span className="px-2 py-0.5 rounded bg-orange-50 text-orange-700 font-medium">
                                DDK: {a.motorSpeech.ddkAmr} Hz
                              </span>
                            )}
                            {a.motorSpeech.mandibularRomDeg && (
                              <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-medium">
                                Çene ROM: {a.motorSpeech.mandibularRomDeg}°
                              </span>
                            )}
                            {a.motorSpeech.semgAsymmetryPct !== undefined && (
                              <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-700 font-medium">
                                sEMG Asim: %{a.motorSpeech.semgAsymmetryPct}
                              </span>
                            )}
                            {a.motorSpeech.respirationRateBpm && (
                              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium">
                                Solunum: {a.motorSpeech.respirationRateBpm} bpm
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{format(parseISO(a.createdAt), "d MMM yy", { locale: tr })}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
              {assessments.length === 0 && (
                <div className="text-center py-12 text-gray-400 border rounded-2xl border-dashed" style={{ borderColor: "#e5e7eb" }}>
                  <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Henüz değerlendirme kaydı yok</p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="bg-white rounded-2xl p-5 border flex flex-col items-center justify-center text-center shadow-sm" style={{ borderColor: "#ccfbf1" }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ background: "#f0fdf9" }}>
                  <FileText className="w-6 h-6 text-teal-600" />
                </div>
                <h3 className="font-semibold text-gray-800 mb-1">Klinik Değerlendirme Raporu</h3>
                <p className="text-xs text-gray-400 mb-4">En son tamamlanan değerlendirmenin kapsamlı PDF özeti</p>
                
                {assessments.filter(a => a.status === "tamamlandı").length > 0 ? (
                  <PDFDownloadLink
                    document={<ClinicalReportDocument client={client} assessment={assessments.find(a => a.status === "tamamlandı")} settings={settings} reportType="assessment" />}
                    fileName={`${client.firstName}_${client.lastName}_Degerlendirme.pdf`}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 w-full justify-center"
                    style={{ background: "#0d9488" }}
                  >
                    {({ loading }) => (loading ? "PDF Hazırlanıyor..." : <><Download className="w-4 h-4" /> PDF İndir</>)}
                  </PDFDownloadLink>
                ) : (
                  <button disabled className="px-4 py-2 rounded-xl text-sm font-medium border text-gray-400 w-full" style={{ borderColor: "#e5e7eb", background: "#f9fafb" }}>
                    Önce Değerlendirme Tamamlayın
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "belgeler" && (
          <div className="max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <div>
                <h3 className="font-semibold text-gray-700 mb-4">Yeni Dosya Yükle</h3>
                <FileUploader clientId={client.id} onUploadSuccess={refreshFiles} />
              </div>

              <div>
                <h3 className="font-semibold text-gray-700 mb-4">Danışan Dosyaları</h3>
                {files.length > 0 ? (
                  <div className="space-y-3">
                    {files.map((file, i) => (
                      <motion.div
                        key={file.url}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="bg-white rounded-xl p-3 border flex items-center justify-between hover:bg-gray-50 transition-colors"
                        style={{ borderColor: "#f0fdf9" }}
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0 border" style={{ borderColor: "#f9fafb" }}>
                            {getFileIcon(file.type)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-700 truncate">{file.name}</p>
                            <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                              <span>{formatBytes(file.size)}</span>
                              <span className="text-gray-300">•</span>
                              <span>{format(parseISO(file.createdAt), "d MMM yyyy", { locale: tr })}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleDownloadFile(file.url)} className="p-2 text-gray-400 hover:text-teal-600 transition-colors rounded-lg hover:bg-teal-50" title="İndir / Görüntüle">
                            <Download className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteFile(file.url)} className="p-2 text-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50" title="Sil">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl p-8 border border-dashed text-center" style={{ borderColor: "#d1d5db" }}>
                    <div className="w-12 h-12 mx-auto bg-gray-50 rounded-full flex items-center justify-center mb-3">
                      <FileText className="w-5 h-5 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">Henüz dosya yüklenmedi.</p>
                    <p className="text-xs text-gray-400 mt-1">Bu danışan için henüz sisteme bir dosya eklenmemiş.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white rounded-2xl p-5 border flex flex-col items-center justify-center text-center shadow-sm" style={{ borderColor: "#fef9c3" }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ background: "#fefce8" }}>
                  <span className="text-2xl">🏠</span>
                </div>
                <h3 className="font-semibold text-gray-800 mb-1">Ev Egzersiz Programı</h3>
                <p className="text-xs text-gray-400 mb-4">Son seansa ait ev egzersiz programını aile için indirin</p>
                
                {sessions.some(s => s.hep?.exercises?.length) ? (
                  <PDFDownloadLink
                    document={<ClinicalReportDocument client={client} sessions={sessions} settings={settings} reportType="hep" />}
                    fileName={`${client.firstName}_${client.lastName}_EvProgrami.pdf`}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 w-full justify-center"
                    style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
                  >
                    {({ loading }) => (loading ? "Hazırlanıyor..." : <><Download className="w-4 h-4" /> PDF İndir</>)}
                  </PDFDownloadLink>
                ) : (
                  <button disabled className="px-4 py-2 rounded-xl text-sm font-medium border text-gray-400 w-full" style={{ borderColor: "#e5e7eb", background: "#f9fafb" }}>
                    Seansta HEP Tanımlayın
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
