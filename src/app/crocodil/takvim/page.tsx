"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addWeeks, subWeeks, addMonths, subMonths, addDays, subDays, isToday, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  User,
  Calendar,
  AlertCircle,
  Check,
} from "lucide-react";
import {
  getCalendarEvents,
  getClients,
  deleteCalendarEvent,
  saveCalendarEvents,
  saveCalendarEvent,
} from "@/lib/crocodil/storage";
import type { CalendarEvent, Client } from "@/lib/crocodil/types";
import { syncGoogleCalendar } from "@/lib/crocodil/google-calendar";
import { Loader2 } from "lucide-react";

type ViewMode = "gunluk" | "haftalik" | "aylik";

const SESSION_COLORS: Record<string, { bg: string; border: string; dot: string; label: string }> = {
  google:   { bg: "rgba(59,130,246,0.15)", border: "rgba(59,130,246,0.4)", dot: "#3b82f6",  label: "Google Randevu" },
  manual_active:   { bg: "rgba(13,148,136,0.15)", border: "rgba(13,148,136,0.5)", dot: "#0d9488", label: "Aktif Terapi" },
  manual_first:    { bg: "rgba(239,68,68,0.12)",  border: "rgba(239,68,68,0.4)",  dot: "#ef4444", label: "İlk Görüşme" },
  manual_eval:     { bg: "rgba(168,85,247,0.15)", border: "rgba(168,85,247,0.4)", dot: "#a855f7", label: "Değerlendirme" },
  done:            { bg: "rgba(107,114,128,0.1)", border: "rgba(107,114,128,0.3)", dot: "#6b7280", label: "Tamamlandı" },
};

function getEventColor(event: CalendarEvent) {
  if (event.type === "google") return SESSION_COLORS.google;
  if (event.sessionType === "İlk Görüşme") return SESSION_COLORS.manual_first;
  if (event.sessionType === "Değerlendirme") return SESSION_COLORS.manual_eval;
  return SESSION_COLORS.manual_active;
}

function timeStr(iso: string) {
  return format(parseISO(iso), "HH:mm");
}

export default function TakvimPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>("gunluk");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    await syncGoogleCalendar(
      (newEvents) => {
        // We will merge and save these to storage. For now just to update state.
        const current = getCalendarEvents().filter(e => e.type !== "google");
        const all = [...current, ...newEvents];
        saveCalendarEvents(all);
        setEvents(all);
        setClients(getClients()); // Refresh in case new ones were added
        setSyncing(false);
      },
      (err) => {
        alert(err);
        setSyncing(false);
      }
    );
  };

  useEffect(() => {
    setEvents(getCalendarEvents());
    setClients(getClients());
  }, []);

  // Navigasyon
  const navigate = (dir: "prev" | "next" | "today") => {
    if (dir === "today") { setCurrentDate(new Date()); return; }
    const d = dir === "next" ? 1 : -1;
    if (viewMode === "gunluk") setCurrentDate((c) => addDays(c, d));
    else if (viewMode === "haftalik") setCurrentDate((c) => (d > 0 ? addWeeks(c, 1) : subWeeks(c, 1)));
    else setCurrentDate((c) => (d > 0 ? addMonths(c, 1) : subMonths(c, 1)));
  };

  // Başlık
  const headerTitle = useMemo(() => {
    if (viewMode === "gunluk") return format(currentDate, "d MMMM yyyy, EEEE", { locale: tr });
    if (viewMode === "haftalik") {
      const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
      const we = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(ws, "d MMM", { locale: tr })} – ${format(we, "d MMM yyyy", { locale: tr })}`;
    }
    return format(currentDate, "MMMM yyyy", { locale: tr });
  }, [currentDate, viewMode]);

  // Günün etkinlikleri
  const eventsForDay = (day: Date) =>
    events
      .filter((e) => isSameDay(parseISO(e.start), day))
      .sort((a, b) => a.start.localeCompare(b.start));

  const clientName = (clientId?: string) => {
    if (!clientId) return null;
    const c = clients.find((cl) => cl.id === clientId);
    return c ? `${c.firstName} ${c.lastName}` : null;
  };

  // ── Günlük Görünüm ──────────────────────────────────────
  const DailyView = () => {
    const dayEvents = eventsForDay(currentDate);
    const hours = Array.from({ length: 12 }, (_, i) => i + 8);

    return (
      <div className="flex flex-col gap-3 p-5">
        {hours.map((hour) => {
          const hourEvents = dayEvents.filter((e) => parseISO(e.start).getHours() === hour);
          return (
            <div key={hour} className="flex gap-3 min-h-[56px]">
              <div className="w-14 text-right pt-1 flex-shrink-0">
                <span className="text-xs font-medium" style={{ color: "#6b7280" }}>{hour.toString().padStart(2, "0")}:00</span>
              </div>
              <div className="flex-1 border-t pt-1" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
                {hourEvents.length === 0 ? (
                  hour === 12 ? (
                    <div className="flex items-center gap-2 text-xs" style={{ color: "#d1d5db" }}>
                      <div className="flex-1 h-px" style={{ background: "repeating-linear-gradient(90deg, #d1d5db 0, #d1d5db 4px, transparent 4px, transparent 8px)" }} />
                      <span>Öğle Arası</span>
                      <div className="flex-1 h-px" style={{ background: "repeating-linear-gradient(90deg, #d1d5db 0, #d1d5db 4px, transparent 4px, transparent 8px)" }} />
                    </div>
                  ) : null
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {hourEvents.map((event) => {
                      const colors = getEventColor(event);
                      const name = clientName(event.clientId);
                      return (
                        <motion.button
                          key={event.id}
                          whileHover={{ scale: 1.01, y: -1 }}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => event.clientId ? router.push(`/crocodil/danisman/${event.clientId}`) : setSelectedEvent(event)}
                          className="w-full text-left rounded-xl px-3 py-2.5 border transition-all"
                          style={{ background: colors.bg, borderColor: colors.border }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-2 h-2 rounded-full flex-shrink-0 mt-0.5" style={{ background: colors.dot }} />
                              <div className="min-w-0">
                                <div className="font-semibold text-sm text-gray-800 truncate">
                                  {name ?? event.title}
                                </div>
                                {event.sessionType && (
                                  <div className="text-xs mt-0.5" style={{ color: colors.dot }}>
                                    {event.sessionType}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-end flex-shrink-0 text-xs" style={{ color: "#9ca3af" }}>
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {timeStr(event.start)}
                              </div>
                              {!event.clientId && (
                                <button
                                  onClick={(ex) => { ex.stopPropagation(); router.push(`/crocodil/danisman/yeni?eventId=${event.id}`); }}
                                  className="mt-1 text-xs px-2 py-0.5 rounded-lg font-medium"
                                  style={{ background: "rgba(13,148,136,0.2)", color: "#0d9488" }}
                                >
                                  + Kayıt Oluştur
                                </button>
                              )}
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {dayEvents.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="text-5xl mb-4">📅</div>
            <p className="font-medium" style={{ color: "#374151" }}>Bu gün için randevu yok</p>
            <p className="text-sm mt-1" style={{ color: "#9ca3af" }}>Manuel etkinlik ekleyebilirsiniz</p>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowAddModal(true)}
              className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white"
              style={{ background: "linear-gradient(135deg, #0d9488, #134e4a)" }}
            >
              <Plus className="w-4 h-4" />
              Etkinlik Ekle
            </motion.button>
          </motion.div>
        )}
      </div>
    );
  };

  // ── Haftalık Görünüm ─────────────────────────────────────
  const WeeklyView = () => {
    const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: ws, end: addDays(ws, 6) });

    return (
      <div className="grid grid-cols-7 gap-px p-3" style={{ background: "rgba(0,0,0,0.05)" }}>
        {days.map((day) => {
          const dayEvts = eventsForDay(day);
          const today = isToday(day);
          return (
            <div
              key={day.toISOString()}
              className="min-h-[180px] p-2 rounded-lg"
              style={{ background: today ? "rgba(13,148,136,0.05)" : "white" }}
            >
              <div className={`text-center mb-2 ${today ? "font-bold" : ""}`}>
                <div className="text-xs uppercase tracking-wide" style={{ color: "#9ca3af" }}>
                  {format(day, "EEE", { locale: tr })}
                </div>
                <div
                  className={`text-lg font-bold w-8 h-8 flex items-center justify-center mx-auto rounded-full ${today ? "text-white" : "text-gray-700"}`}
                  style={today ? { background: "#0d9488" } : {}}
                >
                  {format(day, "d")}
                </div>
              </div>
              <div className="space-y-1">
                {dayEvts.slice(0, 4).map((event) => {
                  const colors = getEventColor(event);
                  const name = clientName(event.clientId);
                  return (
                    <button
                      key={event.id}
                      onClick={() => event.clientId ? router.push(`/crocodil/danisman/${event.clientId}`) : setSelectedEvent(event)}
                      className="w-full text-left text-xs px-2 py-1 rounded-lg truncate border"
                      style={{ background: colors.bg, borderColor: colors.border, color: "#374151" }}
                    >
                      <span className="mr-1" style={{ color: colors.dot }}>●</span>
                      {timeStr(event.start)} {name ?? event.title}
                    </button>
                  );
                })}
                {dayEvts.length > 4 && (
                  <button
                    onClick={() => { setCurrentDate(day); setViewMode("gunluk"); }}
                    className="w-full text-center text-xs py-0.5 rounded"
                    style={{ color: "#0d9488" }}
                  >
                    +{dayEvts.length - 4} daha
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ── Aylık Görünüm ─────────────────────────────────────────
  const MonthlyView = () => {
    const ms = startOfMonth(currentDate);
    const me = endOfMonth(currentDate);
    const ws = startOfWeek(ms, { weekStartsOn: 1 });
    const we = endOfWeek(me, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: ws, end: we });
    const dayNames = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

    return (
      <div className="p-3">
        <div className="grid grid-cols-7 mb-2">
          {dayNames.map((d) => (
            <div key={d} className="text-center text-xs font-medium py-2" style={{ color: "#9ca3af" }}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const dayEvts = eventsForDay(day);
            const today = isToday(day);
            const sameMonth = day.getMonth() === currentDate.getMonth();
            return (
              <motion.button
                key={day.toISOString()}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => { setCurrentDate(day); setViewMode("gunluk"); }}
                className="min-h-[80px] p-1.5 rounded-xl text-left transition-all"
                style={{
                  background: today ? "rgba(13,148,136,0.1)" : sameMonth ? "white" : "rgba(0,0,0,0.02)",
                  border: today ? "1px solid rgba(13,148,136,0.3)" : "1px solid transparent",
                  opacity: sameMonth ? 1 : 0.4,
                }}
              >
                <div
                  className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold mb-1 ${today ? "text-white" : "text-gray-600"}`}
                  style={today ? { background: "#0d9488" } : {}}
                >
                  {format(day, "d")}
                </div>
                {dayEvts.slice(0, 2).map((event) => {
                  const colors = getEventColor(event);
                  return (
                    <div
                      key={event.id}
                      className="text-[10px] px-1.5 py-0.5 rounded truncate mb-0.5 border"
                      style={{ background: colors.bg, borderColor: colors.border, color: "#374151" }}
                    >
                      {timeStr(event.start)} {clientName(event.clientId) ?? event.title}
                    </div>
                  );
                })}
                {dayEvts.length > 2 && (
                  <div className="text-[10px]" style={{ color: "#0d9488" }}>
                    +{dayEvts.length - 2}
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    );
  };

  // ── Hızlı Etkinlik Ekleme Modal ──────────────────────────
  const AddEventModal = () => {
    const [form, setForm] = useState({
      title: "",
      clientId: "",
      date: format(currentDate, "yyyy-MM-dd"),
      time: "09:00",
      duration: 50,
      sessionType: "Terapi",
    });

    const handleSave = () => {
      const startISO = new Date(`${form.date}T${form.time}`).toISOString();
      const endISO = new Date(new Date(`${form.date}T${form.time}`).getTime() + form.duration * 60000).toISOString();
      saveCalendarEvent({
        title: form.clientId ? (clientName(form.clientId) ?? form.title) : form.title,
        clientId: form.clientId || undefined,
        start: startISO,
        end: endISO,
        type: "manual",
        sessionType: form.sessionType,
      });
      setEvents(getCalendarEvents());
      setShowAddModal(false);
    };

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.5)" }}
        onClick={() => setShowAddModal(false)}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md rounded-2xl p-5 shadow-2xl"
          style={{ background: "white" }}
        >
          <h3 className="text-lg font-bold text-gray-800 mb-4">Yeni Etkinlik</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Danışan (opsiyonel)</label>
              <select
                value={form.clientId}
                onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-400"
                style={{ borderColor: "#e5e7eb" }}
              >
                <option value="">Manuel başlık girin</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                ))}
              </select>
            </div>
            {!form.clientId && (
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Başlık</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Etkinlik başlığı..."
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-400"
                  style={{ borderColor: "#e5e7eb" }}
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Tarih</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-400"
                  style={{ borderColor: "#e5e7eb" }}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Saat</label>
                <input
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-400"
                  style={{ borderColor: "#e5e7eb" }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Süre (dk)</label>
                <select
                  value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })}
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-400"
                  style={{ borderColor: "#e5e7eb" }}
                >
                  {[30, 45, 50, 60, 90].map((m) => (
                    <option key={m} value={m}>{m} dakika</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Tür</label>
                <select
                  value={form.sessionType}
                  onChange={(e) => setForm({ ...form, sessionType: e.target.value })}
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-400"
                  style={{ borderColor: "#e5e7eb" }}
                >
                  {["Terapi", "Değerlendirme", "İlk Görüşme", "Takip"].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-5">
            <button
              onClick={() => setShowAddModal(false)}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium border"
              style={{ borderColor: "#e5e7eb", color: "#6b7280" }}
            >
              İptal
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white"
              style={{ background: "linear-gradient(135deg, #0d9488, #134e4a)" }}
            >
              Kaydet
            </button>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  return (
    <div className="flex flex-col h-full" style={{ background: "#f8fffe" }}>
      {/* Üst bar */}
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ background: "white", borderColor: "#e5f7f5" }}>
        <div className="flex items-center gap-3">
          {/* Görünüm seçici */}
          <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: "#e5e7eb" }}>
            {(["gunluk", "haftalik", "aylik"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className="px-3 py-1.5 text-sm font-medium transition-all"
                style={{
                  background: viewMode === mode ? "#0d9488" : "transparent",
                  color: viewMode === mode ? "white" : "#6b7280",
                }}
              >
                {mode === "gunluk" ? "Günlük" : mode === "haftalik" ? "Haftalık" : "Aylık"}
              </button>
            ))}
          </div>

          {/* Navigasyon */}
          <div className="flex items-center gap-1">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate("prev")}
              className="w-8 h-8 rounded-lg flex items-center justify-center border transition-colors hover:bg-gray-50"
              style={{ borderColor: "#e5e7eb" }}
            >
              <ChevronLeft className="w-4 h-4 text-gray-500" />
            </motion.button>
            <button
              onClick={() => navigate("today")}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:bg-teal-50"
              style={{ borderColor: "#e5e7eb", color: "#0d9488" }}
            >
              Bugün
            </button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate("next")}
              className="w-8 h-8 rounded-lg flex items-center justify-center border transition-colors hover:bg-gray-50"
              style={{ borderColor: "#e5e7eb" }}
            >
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </motion.button>
          </div>

          {/* Tarih başlığı */}
          <h2 className="font-semibold text-gray-800 text-sm capitalize">
            {headerTitle}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Renk lejantı */}
          <div className="hidden md:flex items-center gap-3 text-xs text-gray-400 mr-2">
            {Object.entries(SESSION_COLORS).slice(0, 3).map(([key, val]) => (
              <div key={key} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ background: val.dot }} />
                <span>{val.label}</span>
              </div>
            ))}
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-gray-700 bg-white border shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
            style={{ borderColor: "#e5e7eb" }}
          >
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="text-blue-500 font-bold">G</span>}
            <span className="hidden sm:block">Takvimi Eşitle</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-sm"
            style={{ background: "linear-gradient(135deg, #0d9488, #134e4a)" }}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:block">Etkinlik Ekle</span>
          </motion.button>
        </div>
      </div>

      {/* İçerik */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={viewMode + currentDate.toDateString()}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {viewMode === "gunluk" && <DailyView />}
            {viewMode === "haftalik" && <WeeklyView />}
            {viewMode === "aylik" && <MonthlyView />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Modallar */}
      <AnimatePresence>
        {showAddModal && <AddEventModal />}
      </AnimatePresence>
    </div>
  );
}
