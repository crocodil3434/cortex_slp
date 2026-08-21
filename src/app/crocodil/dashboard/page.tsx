"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { format, parseISO, isToday, isTomorrow, differenceInDays, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import { tr } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import {
  Users, CalendarDays, ClipboardList, Activity, Target, TrendingUp,
  AlertTriangle, Plus, ChevronRight, Clock, CheckCircle2, Zap, BarChart3,
} from "lucide-react";
import {
  getClients, getSessions, getGoals, getCalendarEvents, getSettings,
} from "@/lib/crocodil/storage";
import type { Client, TherapySession, SMARTGoal, CalendarEvent, CrocodilSettings } from "@/lib/crocodil/types";

const COLOR_PALETTE = ["#0d9488", "#3b82f6", "#a855f7", "#f59e0b", "#ef4444", "#10b981"];
function avatarColor(id: string) {
  return COLOR_PALETTE[(id.charCodeAt(0) + id.charCodeAt(id.length - 1)) % COLOR_PALETTE.length];
}

// Kart bileşeni
function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: "0 8px 30px rgba(0,0,0,0.08)" }}
      className="bg-white rounded-2xl p-5 border"
      style={{ borderColor: "#f0fdf9" }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}15` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-800 mb-0.5">{value}</div>
      <div className="text-sm font-medium text-gray-600">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </motion.div>
  );
}

// Randevu satırı
function EventRow({ event, clients }: { event: CalendarEvent; clients: Client[] }) {
  const client = clients.find(c => c.id === event.clientId);
  const start = new Date(event.start);
  const isNow = isToday(start);
  const isTmr = isTomorrow(start);
  return (
    <div className="flex items-center gap-3 py-2.5 border-b last:border-0" style={{ borderColor: "#f3f4f6" }}>
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
        style={{ background: event.type === "google" ? "linear-gradient(135deg, #4285f4,#0f9d58)" : "linear-gradient(135deg, #0d9488,#134e4a)" }}
      >
        {isNow ? "🔴" : format(start, "dd", { locale: tr })}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-gray-800 truncate">{event.title}</div>
        <div className="text-xs text-gray-400">
          {isNow ? "Bugün" : isTmr ? "Yarın" : format(start, "d MMM", { locale: tr })} · {format(start, "HH:mm")}
          {event.sessionType && ` · ${event.sessionType}`}
        </div>
      </div>
      {client && (
        <Link href={`/crocodil/danisman/${client.id}`}>
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
            style={{ background: avatarColor(client.id) }}
          >
            {client.avatarInitials ?? "??"}
          </div>
        </Link>
      )}
    </div>
  );
}

// Uyarı satırı
function AlertRow({ icon: Icon, text, color, href }: {
  icon: React.ElementType; text: string; color: string; href?: string;
}) {
  const content = (
    <div className="flex items-center gap-2 py-2 px-3 rounded-xl text-sm" style={{ background: `${color}10` }}>
      <Icon className="w-4 h-4 flex-shrink-0" style={{ color }} />
      <span className="text-gray-700">{text}</span>
      {href && <ChevronRight className="w-3 h-3 ml-auto text-gray-400" />}
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

export default function DashboardPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [sessions, setSessions] = useState<TherapySession[]>([]);
  const [goals, setGoals] = useState<SMARTGoal[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [settings, setSettings] = useState<CrocodilSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [clientStatusTab, setClientStatusTab] = useState<"aktif" | "pasif" | "tamamlandı">("aktif");

  useEffect(() => {
    const load = async () => {
      try {
        const [c, s, g, e, st] = await Promise.all([
          getClients(),
          getSessions(),
          getGoals(),
          getCalendarEvents(),
          getSettings(),
        ]);
        setClients(c);
        setSessions(s);
        setGoals(g);
        setEvents(e);
        setSettings(st);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="text-5xl"
        >🐊</motion.div>
      </div>
    );
  }

  // --- Hesaplamalar ---
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const activeClients = clients.filter(c => c.status === "aktif");
  const thisWeekSessions = sessions.filter(s => {
    const d = new Date(s.sessionDate);
    return d >= weekStart && d <= weekEnd;
  });
  const activeGoals = goals.filter(g => g.status === "aktif");
  const completedGoalsMonth = goals.filter(g =>
    g.status === "tamamlandı" && new Date(g.createdAt).getMonth() === now.getMonth()
  );
  const pendingAssessments = sessions.length === 0 && activeClients.length > 0;

  // Yaklaşan etkinlikler (bugün + 7 gün)
  const upcomingEvents = events
    .filter(e => {
      const d = new Date(e.start);
      return d >= now && differenceInDays(d, now) <= 7;
    })
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .slice(0, 6);

  // Deadline yaklaşan hedefler (7 gün içinde)
  const urgentGoals = goals.filter(g => {
    if (!g.deadline || g.status !== "aktif") return false;
    const diff = differenceInDays(new Date(g.deadline), now);
    return diff >= 0 && diff <= 7;
  });

  // Uzun süredir görülmeyen aktif hastalar (28 gün)
  const absentClients = activeClients.filter(c => {
    const clientSessions = sessions.filter(s => s.clientId === c.id);
    if (clientSessions.length === 0) return false;
    const lastSession = clientSessions.sort((a, b) =>
      new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime()
    )[0];
    return differenceInDays(now, new Date(lastSession.sessionDate)) > 28;
  });

  // Haftalık seans grafik verisi (son 8 hafta)
  const weeklyChartData = Array.from({ length: 8 }, (_, i) => {
    const wStart = new Date(weekStart);
    wStart.setDate(wStart.getDate() - (7 - i) * 7);
    const wEnd = new Date(wStart);
    wEnd.setDate(wStart.getDate() + 6);
    const count = sessions.filter(s => {
      const d = new Date(s.sessionDate);
      return d >= wStart && d <= wEnd;
    }).length;
    return { label: format(wStart, "d MMM", { locale: tr }), seans: count };
  });

  // Ortalama seans başarısı
  const avgAccuracy = (() => {
    const allProgress = sessions.flatMap(s => s.goalProgress.map(g => g.accuracyPercent));
    if (!allProgress.length) return null;
    return Math.round(allProgress.reduce((a, b) => a + b, 0) / allProgress.length);
  })();

  const hour = now.getHours();
  const greeting = hour < 12 ? "Günaydın" : hour < 18 ? "İyi günler" : "İyi akşamlar";
  const clinicianName = settings?.clinicianName?.split(" ")[0] ?? "Merhaba";

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ background: "#f8fffe" }}>
      {/* Header */}
      <div className="px-6 pt-6 pb-4" style={{ background: "white", borderBottom: "1px solid #e5f7f5" }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              {greeting}, {clinicianName} 👋
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {format(now, "d MMMM yyyy, EEEE", { locale: tr })}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/crocodil/danisman/yeni">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
                style={{ background: "linear-gradient(135deg, #0d9488, #134e4a)" }}
              >
                <Plus className="w-4 h-4" /> Yeni Danışan
              </motion.button>
            </Link>
            <Link href="/crocodil/takvim">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border"
                style={{ borderColor: "#e5e7eb", color: "#374151" }}
              >
                <CalendarDays className="w-4 h-4" /> Takvim
              </motion.button>
            </Link>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5 max-w-7xl w-full mx-auto">

        {/* İstatistik Kartları */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/crocodil/danisman?status=aktif" className="block">
            <StatCard icon={Users} label="Aktif Danışan" value={activeClients.length} sub={`${clients.length} toplam`} color="#0d9488" />
          </Link>
          <StatCard icon={Activity} label="Bu Haftaki Seans" value={thisWeekSessions.length} sub={`${sessions.length} toplam seans`} color="#3b82f6" />
          <StatCard icon={Target} label="Aktif Hedef" value={activeGoals.length} sub={`${completedGoalsMonth.length} bu ay tamamlandı`} color="#8b5cf6" />
          <StatCard
            icon={TrendingUp}
            label="Ort. Seans Başarısı"
            value={avgAccuracy !== null ? `%${avgAccuracy}` : "—"}
            sub="Tüm zamanlar"
            color="#f59e0b"
          />
        </div>

        {/* Ana İçerik — İki Kolon */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Sol Kolon: Yaklaşan Randevular, Grafikler ve Danışan Durumları */}
          <div className="lg:col-span-2 space-y-4">

            {/* Danışan Durum Dağılımı & Hızlı Yönetim Kartı */}
            <div className="bg-white rounded-2xl border p-5" style={{ borderColor: "#e5f7f5" }}>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div className="flex items-center gap-2 font-bold text-gray-800">
                  <Users className="w-4 h-4 text-teal-600" />
                  Danışan Durum Dağılımı
                </div>

                {/* Durum Sekmeleri */}
                <div className="flex rounded-xl overflow-hidden border bg-gray-50" style={{ borderColor: "#e5e7eb" }}>
                  {(["aktif", "pasif", "tamamlandı"] as const).map((st) => {
                    const count = clients.filter(c => c.status === st).length;
                    const isSel = clientStatusTab === st;
                    return (
                      <button
                        key={st}
                        onClick={() => setClientStatusTab(st)}
                        className="px-3 py-1.5 text-xs font-semibold capitalize transition-all flex items-center gap-1.5"
                        style={{
                          background: isSel ? "#0d9488" : "transparent",
                          color: isSel ? "white" : "#4b5563",
                        }}
                      >
                        <span>{st === "aktif" ? "Aktif" : st === "pasif" ? "Pasif" : "Tamamlandı"}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${isSel ? "bg-white/20 text-white" : "bg-gray-200 text-gray-600"}`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Danışan Listesi */}
              {clients.filter(c => c.status === clientStatusTab).length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-xs">
                  {clientStatusTab === "aktif" ? "Aktif" : clientStatusTab === "pasif" ? "Pasif" : "Tamamlandı"} durumunda kayıtlı danışan bulunmuyor.
                </div>
              ) : (
                <div className="space-y-2">
                  {clients.filter(c => c.status === clientStatusTab).slice(0, 4).map(c => (
                    <div
                      key={c.id}
                      onClick={() => router.push(`/crocodil/danisman/${c.id}`)}
                      className="flex items-center justify-between p-2.5 rounded-xl border transition-all hover:bg-teal-50/30 cursor-pointer"
                      style={{ borderColor: "#f0fdf9" }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                          style={{ background: avatarColor(c.id) }}
                        >
                          {c.avatarInitials ?? "??"}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-800">{c.firstName} {c.lastName}</div>
                          <div className="text-xs text-gray-400">{c.primaryDiagnosis || "Ön tanı belirtilmedi"}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className="text-[11px] font-bold px-2 py-0.5 rounded-full border"
                          style={{
                            background: c.status === "aktif" ? "rgba(13,148,136,0.12)" : c.status === "pasif" ? "rgba(107,114,128,0.1)" : "rgba(16,185,129,0.1)",
                            color: c.status === "aktif" ? "#0d9488" : c.status === "pasif" ? "#4b5563" : "#10b981",
                            borderColor: c.status === "aktif" ? "rgba(13,148,136,0.3)" : c.status === "pasif" ? "rgba(107,114,128,0.3)" : "rgba(16,185,129,0.3)",
                          }}
                        >
                          {c.status === "aktif" ? "Aktif" : c.status === "pasif" ? "Pasif" : "Tamamlandı"}
                        </span>
                        <ChevronRight className="w-4 h-4 text-gray-300" />
                      </div>
                    </div>
                  ))}

                  <div className="pt-2 flex items-center justify-between text-xs">
                    <span className="text-gray-400">
                      Toplam {clients.filter(c => c.status === clientStatusTab).length} {clientStatusTab} danışan
                    </span>
                    <Link
                      href={`/crocodil/danisman?status=${clientStatusTab}`}
                      className="text-teal-600 font-semibold hover:underline flex items-center gap-1"
                    >
                      Tümünü Gör ({clients.filter(c => c.status === clientStatusTab).length}) →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Yaklaşan Randevular */}
            <div className="bg-white rounded-2xl border p-5" style={{ borderColor: "#e5f7f5" }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 font-bold text-gray-800">
                  <CalendarDays className="w-4 h-4 text-teal-500" />
                  Yaklaşan Randevular
                  <span className="text-xs font-normal text-gray-400">(7 gün)</span>
                </div>
                <Link href="/crocodil/takvim" className="text-xs text-teal-600 hover:underline">Tümü →</Link>
              </div>
              {upcomingEvents.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Yaklaşan randevu yok</p>
                </div>
              ) : (
                <div>
                  {upcomingEvents.map(e => (
                    <EventRow key={e.id} event={e} clients={clients} />
                  ))}
                </div>
              )}
            </div>

            {/* Haftalık Seans Grafiği */}
            <div className="bg-white rounded-2xl border p-5" style={{ borderColor: "#e5f7f5" }}>
              <div className="flex items-center gap-2 font-bold text-gray-800 mb-4">
                <BarChart3 className="w-4 h-4 text-blue-500" />
                Seans Frekansı
                <span className="text-xs font-normal text-gray-400">(son 8 hafta)</span>
              </div>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9ca3af" }} />
                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9ca3af" }} />
                    <Tooltip
                      contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 15px rgba(0,0,0,0.1)", fontSize: 12 }}
                      cursor={{ fill: "rgba(13,148,136,0.06)" }}
                    />
                    <Bar dataKey="seans" name="Seans" fill="#0d9488" radius={[6, 6, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Sağ Kolon: Uyarılar + Hızlı Aksiyonlar */}
          <div className="space-y-4">

            {/* Dikkat Gerektiren Durumlar */}
            {(urgentGoals.length > 0 || absentClients.length > 0) && (
              <div className="bg-white rounded-2xl border p-5" style={{ borderColor: "#fef3c7" }}>
                <div className="flex items-center gap-2 font-bold text-gray-800 mb-3">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Dikkat Gerektiren
                </div>
                <div className="space-y-2">
                  {urgentGoals.map(g => {
                    const client = clients.find(c => c.id === g.clientId);
                    const daysLeft = differenceInDays(new Date(g.deadline!), now);
                    return (
                      <AlertRow
                        key={g.id}
                        icon={Target}
                        color="#f59e0b"
                        text={`${client?.firstName ?? ""} — Hedef deadline ${daysLeft === 0 ? "bugün" : `${daysLeft} gün`} sonra`}
                        href={`/crocodil/danisman/${g.clientId}`}
                      />
                    );
                  })}
                  {absentClients.slice(0, 3).map(c => {
                    const lastSession = sessions.filter(s => s.clientId === c.id).sort((a, b) =>
                      new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime()
                    )[0];
                    const days = differenceInDays(now, new Date(lastSession.sessionDate));
                    return (
                      <AlertRow
                        key={c.id}
                        icon={Clock}
                        color="#6b7280"
                        text={`${c.firstName} ${c.lastName} — ${days} gündür seans yok`}
                        href={`/crocodil/danisman/${c.id}`}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Hızlı Aksiyonlar */}
            <div className="bg-white rounded-2xl border p-5" style={{ borderColor: "#e5f7f5" }}>
              <div className="flex items-center gap-2 font-bold text-gray-800 mb-3">
                <Zap className="w-4 h-4 text-teal-500" />
                Hızlı Aksiyonlar
              </div>
              <div className="space-y-2">
                {[
                  { href: "/crocodil/danisman/yeni", icon: Users, label: "Yeni Danışan Ekle", color: "#0d9488" },
                  { href: "/crocodil/danisman", icon: ClipboardList, label: "Değerlendirme Başlat", color: "#3b82f6" },
                  { href: "/crocodil/ai", icon: Activity, label: "AI Materyal Üret", color: "#f59e0b" },
                  { href: "/crocodil/takvim", icon: CalendarDays, label: "Randevu Ekle", color: "#8b5cf6" },
                ].map(item => (
                  <Link key={item.href} href={item.href}>
                    <motion.div
                      whileHover={{ x: 2 }}
                      className="flex items-center gap-3 py-2 px-3 rounded-xl cursor-pointer transition-colors hover:bg-gray-50"
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${item.color}15` }}>
                        <item.icon className="w-4 h-4" style={{ color: item.color }} />
                      </div>
                      <span className="text-sm font-medium text-gray-700">{item.label}</span>
                      <ChevronRight className="w-3 h-3 text-gray-300 ml-auto" />
                    </motion.div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Son Danışanlar */}
            <div className="bg-white rounded-2xl border p-5" style={{ borderColor: "#e5f7f5" }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 font-bold text-gray-800">
                  <Users className="w-4 h-4 text-teal-500" />
                  Son Eklenenler
                </div>
                <Link href="/crocodil/danisman" className="text-xs text-teal-600 hover:underline">Tümü →</Link>
              </div>
              <div className="space-y-2">
                {clients.slice(0, 5).map(c => (
                  <Link key={c.id} href={`/crocodil/danisman/${c.id}`}>
                    <motion.div whileHover={{ x: 2 }} className="flex items-center gap-2 py-1.5 cursor-pointer rounded-lg hover:bg-gray-50 px-1">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ background: avatarColor(c.id) }}
                      >
                        {c.avatarInitials ?? "??"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{c.firstName} {c.lastName}</p>
                        <p className="text-xs text-gray-400 truncate">{c.primaryDiagnosis ?? "Tanı girilmemiş"}</p>
                      </div>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                        style={{
                          background: c.status === "aktif" ? "rgba(13,148,136,0.1)" : "rgba(107,114,128,0.1)",
                          color: c.status === "aktif" ? "#0d9488" : "#6b7280",
                        }}
                      >
                        {c.status === "aktif" ? "Aktif" : c.status === "pasif" ? "Pasif" : "Bitti"}
                      </span>
                    </motion.div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
