"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  format, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  eachDayOfInterval, isSameDay, addWeeks, subWeeks, addMonths,
  subMonths, addDays, subDays, isToday, parseISO, isSameMonth,
  setHours, setMinutes,
} from "date-fns";
import { tr } from "date-fns/locale";
import Link from "next/link";
import {
  ChevronLeft, ChevronRight, Plus, Clock, User, CalendarDays,
  X, Save, Trash2, RefreshCw, Loader2, ExternalLink, GripVertical,
} from "lucide-react";
import { useToast } from "@/components/crocodil/Toast";
import { useConfirm } from "@/components/crocodil/ConfirmModal";
import {
  getCalendarEvents, getClients, saveCalendarEvent, deleteCalendarEvent,
} from "@/lib/crocodil/storage";
import type { CalendarEvent, Client } from "@/lib/crocodil/types";
import { syncGoogleCalendar } from "@/lib/crocodil/google-calendar";

// ── Renk sistemi ───────────────────────────────────────────────
const SESSION_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  "Terapi":         { bg: "rgba(13,148,136,0.12)",  border: "#0d9488", text: "#0d7a70" },
  "Değerlendirme":  { bg: "rgba(139,92,246,0.12)",  border: "#8b5cf6", text: "#7c3aed" },
  "İlk Görüşme":   { bg: "rgba(239,68,68,0.12)",   border: "#ef4444", text: "#dc2626" },
  "Konsültasyon":   { bg: "rgba(245,158,11,0.12)",  border: "#f59e0b", text: "#d97706" },
  "Ev Programı":    { bg: "rgba(16,185,129,0.12)",  border: "#10b981", text: "#059669" },
  "google":         { bg: "rgba(66,133,244,0.12)",  border: "#4285f4", text: "#2563eb" },
};

function getEventStyle(event: CalendarEvent) {
  if (event.type === "google") return SESSION_COLORS.google;
  return SESSION_COLORS[event.sessionType ?? "Terapi"] ?? SESSION_COLORS["Terapi"];
}

function timeStr(iso: string) { return format(parseISO(iso), "HH:mm"); }
function durationMin(e: CalendarEvent) {
  return Math.round((new Date(e.end).getTime() - new Date(e.start).getTime()) / 60000);
}

type ViewMode = "gun" | "hafta" | "ay";
const SESSION_TYPES = ["Terapi", "Değerlendirme", "İlk Görüşme", "Konsültasyon", "Ev Programı"];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 07:00 – 20:00

// ── Yardımcı: çakışma kontrolü ────────────────────────────────
function hasConflict(events: CalendarEvent[], start: string, end: string, excludeId?: string): boolean {
  return events.some(e => {
    if (e.id === excludeId) return false;
    return new Date(e.start) < new Date(end) && new Date(e.end) > new Date(start);
  });
}

// ── Etkinlik Detay Paneli ─────────────────────────────────────
function EventDetailPanel({ event, clients, onClose, onDelete, onEdit }: {
  event: CalendarEvent; clients: Client[];
  onClose: () => void; onDelete: (id: string) => void; onEdit: (e: CalendarEvent) => void;
}) {
  const client = clients.find(c => c.id === event.clientId);
  const style = getEventStyle(event);
  const start = parseISO(event.start);
  const end = parseISO(event.end);

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      className="w-72 flex-shrink-0 bg-white border-l flex flex-col"
      style={{ borderColor: "#e5f7f5" }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "#f0fdf9" }}>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: style.border }} />
          <span className="text-sm font-semibold text-gray-700">
            {event.sessionType ?? (event.type === "google" ? "Google" : "Randevu")}
          </span>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <h3 className="font-bold text-gray-800 leading-tight">{event.title}</h3>
        {event.type === "google" && (
          <span className="inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: "#4285f415", color: "#4285f4" }}>🔵 Google Takvim</span>
        )}

        <div className="bg-gray-50 rounded-xl p-3 space-y-2 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-teal-500" />
            {format(start, "d MMMM yyyy, EEEE", { locale: tr })}
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-500" />
            {format(start, "HH:mm")} – {format(end, "HH:mm")}
            <span className="text-xs text-gray-400">({durationMin(event)} dk)</span>
          </div>
        </div>

        {client ? (
          <Link href={`/crocodil/danisman/${client.id}`}>
            <div className="flex items-center gap-3 p-3 rounded-xl border hover:border-teal-300 transition-colors cursor-pointer" style={{ borderColor: "#e5e7eb" }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ background: "linear-gradient(135deg,#0d9488,#134e4a)" }}>
                {client.avatarInitials ?? "??"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{client.firstName} {client.lastName}</p>
                <p className="text-xs text-gray-400 truncate">{client.primaryDiagnosis ?? "Tanı girilmemiş"}</p>
              </div>
              <ExternalLink className="w-3 h-3 text-gray-300 flex-shrink-0" />
            </div>
          </Link>
        ) : (
          <div className="flex items-center gap-2 text-sm text-gray-400 p-3 bg-gray-50 rounded-xl">
            <User className="w-4 h-4" /> Bağlı danışan yok
          </div>
        )}

        {event.notes && (
          <div className="text-sm text-gray-600 bg-amber-50 rounded-xl p-3 border border-amber-100">{event.notes}</div>
        )}
      </div>

      {event.type !== "google" && (
        <div className="p-4 border-t flex gap-2" style={{ borderColor: "#f0fdf9" }}>
          <button onClick={() => onEdit(event)}
            className="flex-1 py-2 rounded-xl text-sm font-medium border hover:bg-gray-50 transition-colors"
            style={{ borderColor: "#e5e7eb", color: "#374151" }}>
            Düzenle
          </button>
          <button onClick={() => onDelete(event.id)}
            className="px-3 py-2 rounded-xl text-sm text-red-500 border border-red-100 hover:bg-red-50 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </motion.div>
  );
}

// ── Randevu Modalı ────────────────────────────────────────────
function EventModal({ open, onClose, onSave, clients, defaultDate, editEvent }: {
  open: boolean; onClose: () => void;
  onSave: (data: Omit<CalendarEvent, "id"> & { id?: string }) => Promise<void>;
  clients: Client[]; defaultDate?: string; editEvent?: CalendarEvent | null;
}) {
  const [form, setForm] = useState({
    title: "", clientId: "",
    date: defaultDate ?? new Date().toISOString().split("T")[0],
    time: "09:00", duration: 45, sessionType: "Terapi", notes: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (editEvent) {
        const s = parseISO(editEvent.start);
        const e = parseISO(editEvent.end);
        setForm({
          title: editEvent.title, clientId: editEvent.clientId ?? "",
          date: editEvent.start.split("T")[0], time: format(s, "HH:mm"),
          duration: Math.round((e.getTime() - s.getTime()) / 60000),
          sessionType: editEvent.sessionType ?? "Terapi", notes: editEvent.notes ?? "",
        });
      } else {
        setForm(f => ({ ...f, date: defaultDate ?? f.date, title: "", clientId: "", notes: "" }));
      }
    }
  }, [open, editEvent, defaultDate]);

  const handleSave = async () => {
    setSaving(true);
    const start = new Date(`${form.date}T${form.time}`).toISOString();
    const end = new Date(new Date(`${form.date}T${form.time}`).getTime() + form.duration * 60000).toISOString();
    const client = clients.find(c => c.id === form.clientId);
    await onSave({
      ...(editEvent ? { id: editEvent.id } : {}),
      title: form.title || (client ? `${client.firstName} ${client.lastName}` : "Randevu"),
      clientId: form.clientId || undefined,
      start, end, type: "manual",
      sessionType: form.sessionType,
      notes: form.notes || undefined,
    });
    setSaving(false);
    onClose();
  };

  if (!open) return null;
  const color = SESSION_COLORS[form.sessionType]?.border ?? "#0d9488";
  const LABEL = "text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5";
  const INPUT = "w-full border rounded-xl px-3 py-2 text-sm focus:outline-none transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
      >
        <div className="px-6 py-4 flex items-center justify-between border-b-2" style={{ borderColor: `${color}30`, background: `${color}0a` }}>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: color }} />
            <span className="font-bold text-gray-800">{editEvent ? "Etkinliği Düzenle" : "Yeni Randevu"}</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/60 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
          <div>
            <label className={LABEL}>Seans Türü</label>
            <div className="flex flex-wrap gap-2">
              {SESSION_TYPES.map(t => (
                <button key={t} onClick={() => setForm(f => ({ ...f, sessionType: t }))}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all"
                  style={{
                    background: form.sessionType === t ? SESSION_COLORS[t]?.border : "white",
                    borderColor: form.sessionType === t ? SESSION_COLORS[t]?.border : "#e5e7eb",
                    color: form.sessionType === t ? "white" : "#6b7280",
                  }}>{t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={LABEL}>Danışan</label>
            <select value={form.clientId} onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))}
              className={INPUT} style={{ borderColor: "#e5e7eb" }}>
              <option value="">— Danışan seçin (opsiyonel) —</option>
              {clients.filter(c => c.status === "aktif").map(c => (
                <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={LABEL}>Başlık (opsiyonel)</label>
            <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Boş bırakılırsa danışan adı kullanılır"
              className={INPUT} style={{ borderColor: "#e5e7eb" }} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Tarih</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className={INPUT} style={{ borderColor: "#e5e7eb" }} />
            </div>
            <div>
              <label className={LABEL}>Saat</label>
              <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                className={INPUT} style={{ borderColor: "#e5e7eb" }} />
            </div>
          </div>

          <div>
            <label className={LABEL}>Süre</label>
            <div className="flex gap-2">
              {[30, 45, 60, 90].map(d => (
                <button key={d} onClick={() => setForm(f => ({ ...f, duration: d }))}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold border transition-all"
                  style={{
                    background: form.duration === d ? color : "white",
                    borderColor: form.duration === d ? color : "#e5e7eb",
                    color: form.duration === d ? "white" : "#6b7280",
                  }}>{d} dk
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={LABEL}>Not (opsiyonel)</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2} placeholder="Kısa not ekleyin..."
              className={INPUT + " resize-none"} style={{ borderColor: "#e5e7eb" }} />
          </div>
        </div>

        <div className="px-6 py-4 border-t flex gap-3" style={{ borderColor: "#f0fdf9" }}>
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border text-sm font-medium text-gray-600 hover:bg-gray-50"
            style={{ borderColor: "#e5e7eb" }}>İptal
          </button>
          <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
            onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background: `linear-gradient(135deg, ${color}, ${color}bb)` }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Haftalık Grid Görünümü ─────────────────────────────────────
function WeekView({ currentDate, events, clients, onEventClick, onSlotClick }: {
  currentDate: Date; events: CalendarEvent[]; clients: Client[];
  onEventClick: (e: CalendarEvent) => void; onSlotClick: (date: string) => void;
}) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });

  return (
    <div className="flex-1 overflow-auto">
      {/* Gün başlıkları */}
      <div className="grid sticky top-0 z-10 bg-white border-b" style={{ gridTemplateColumns: "52px repeat(7, 1fr)", borderColor: "#f0fdf9" }}>
        <div className="border-r" style={{ borderColor: "#f0fdf9" }} />
        {days.map(day => (
          <div key={day.toString()} className="py-2 text-center border-r" style={{ borderColor: "#f0fdf9" }}>
            <div className="text-xs text-gray-400 uppercase font-semibold">{format(day, "EEE", { locale: tr })}</div>
            <div className={`text-sm font-bold mx-auto mt-0.5 w-7 h-7 rounded-full flex items-center justify-center ${isToday(day) ? "text-white" : "text-gray-700"}`}
              style={{ background: isToday(day) ? "#0d9488" : "transparent" }}>
              {format(day, "d")}
            </div>
          </div>
        ))}
      </div>

      {/* Saat satırları */}
      <div className="relative" style={{ gridTemplateColumns: "52px repeat(7, 1fr)" }}>
        {HOURS.map(hour => (
          <div key={hour} className="grid" style={{ gridTemplateColumns: "52px repeat(7, 1fr)", height: "60px" }}>
            <div className="border-r border-b flex items-start justify-end pr-2 pt-0.5" style={{ borderColor: "#f0fdf9" }}>
              <span className="text-[10px] text-gray-400 font-medium">{hour}:00</span>
            </div>
            {days.map(day => {
              const slotStart = setMinutes(setHours(day, hour), 0);
              const dayEvents = events.filter(e => {
                const es = parseISO(e.start);
                return isSameDay(es, day) && es.getHours() === hour;
              });
              return (
                <div key={day.toString()}
                  className="border-r border-b relative hover:bg-teal-50/30 cursor-pointer transition-colors"
                  style={{ borderColor: "#f0fdf9" }}
                  onClick={() => onSlotClick(format(slotStart, "yyyy-MM-dd"))}>
                  {dayEvents.map(evt => {
                    const st = getEventStyle(evt);
                    const dur = Math.min(durationMin(evt), 60);
                    const topPx = (parseISO(evt.start).getMinutes() / 60) * 60;
                    const heightPx = Math.max((dur / 60) * 60, 24);
                    return (
                      <div key={evt.id}
                        onClick={e => { e.stopPropagation(); onEventClick(evt); }}
                        className="absolute left-0.5 right-0.5 rounded-lg px-1.5 py-1 cursor-pointer overflow-hidden border-l-2 transition-all hover:brightness-95"
                        style={{
                          top: `${topPx}px`,
                          height: `${heightPx}px`,
                          background: st.bg,
                          borderLeftColor: st.border,
                          zIndex: 2,
                        }}>
                        <p className="text-[11px] font-bold truncate" style={{ color: st.text }}>{evt.title}</p>
                        <p className="text-[10px] opacity-70" style={{ color: st.text }}>{timeStr(evt.start)}</p>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Günlük Görünüm ─────────────────────────────────────────────
function DayView({ currentDate, events, clients, onEventClick, onSlotClick }: {
  currentDate: Date; events: CalendarEvent[]; clients: Client[];
  onEventClick: (e: CalendarEvent) => void; onSlotClick: (date: string) => void;
}) {
  const dayEvents = events.filter(e => isSameDay(parseISO(e.start), currentDate));
  return (
    <div className="flex-1 overflow-auto">
      <div className="sticky top-0 z-10 bg-white border-b py-3 px-4 text-center" style={{ borderColor: "#f0fdf9" }}>
        <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-base font-bold ${isToday(currentDate) ? "bg-teal-500 text-white" : "text-gray-700"}`}>
          {format(currentDate, "d")}
        </div>
        <div className="text-xs text-gray-400 mt-0.5">{format(currentDate, "EEEE, MMMM yyyy", { locale: tr })}</div>
      </div>
      {HOURS.map(hour => {
        const slotEvts = dayEvents.filter(e => parseISO(e.start).getHours() === hour);
        return (
          <div key={hour} className="flex border-b min-h-[60px] hover:bg-teal-50/20 cursor-pointer transition-colors"
            style={{ borderColor: "#f0fdf9" }}
            onClick={() => onSlotClick(format(currentDate, "yyyy-MM-dd"))}>
            <div className="w-14 flex-shrink-0 flex items-start justify-end pr-3 pt-1 border-r" style={{ borderColor: "#f0fdf9" }}>
              <span className="text-[11px] text-gray-400 font-medium">{hour}:00</span>
            </div>
            <div className="flex-1 p-1 space-y-1">
              {slotEvts.map(evt => {
                const st = getEventStyle(evt);
                return (
                  <div key={evt.id}
                    onClick={e => { e.stopPropagation(); onEventClick(evt); }}
                    className="rounded-xl px-3 py-2 border-l-2 cursor-pointer hover:brightness-95 transition-all"
                    style={{ background: st.bg, borderLeftColor: st.border }}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold" style={{ color: st.text }}>{evt.title}</span>
                      <span className="text-xs opacity-70" style={{ color: st.text }}>{timeStr(evt.start)} – {timeStr(evt.end)}</span>
                    </div>
                    {evt.sessionType && <span className="text-xs opacity-60" style={{ color: st.text }}>{evt.sessionType}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Aylık Görünüm ──────────────────────────────────────────────
function MonthView({ currentDate, events, onEventClick, onSlotClick }: {
  currentDate: Date; events: CalendarEvent[];
  onEventClick: (e: CalendarEvent) => void; onSlotClick: (date: string) => void;
}) {
  const mStart = startOfMonth(currentDate);
  const mEnd = endOfMonth(currentDate);
  const gridStart = startOfWeek(mStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(mEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const DAY_LABELS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

  return (
    <div className="flex-1 overflow-auto">
      {/* Haftanın günleri */}
      <div className="grid grid-cols-7 border-b sticky top-0 bg-white z-10" style={{ borderColor: "#f0fdf9" }}>
        {DAY_LABELS.map(d => (
          <div key={d} className="py-2 text-center text-xs font-semibold text-gray-400 uppercase">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7" style={{ gridAutoRows: "minmax(90px, 1fr)" }}>
        {days.map(day => {
          const dayEvts = events.filter(e => isSameDay(parseISO(e.start), day)).slice(0, 3);
          const extra = events.filter(e => isSameDay(parseISO(e.start), day)).length - 3;
          const inMonth = isSameMonth(day, currentDate);
          return (
            <div key={day.toString()}
              className="border-r border-b p-1.5 cursor-pointer transition-colors hover:bg-teal-50/30"
              style={{ borderColor: "#f0fdf9", opacity: inMonth ? 1 : 0.4 }}
              onClick={() => onSlotClick(format(day, "yyyy-MM-dd"))}>
              <div className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full mb-1 ${isToday(day) ? "bg-teal-500 text-white" : "text-gray-600"}`}>
                {format(day, "d")}
              </div>
              <div className="space-y-0.5">
                {dayEvts.map(evt => {
                  const st = getEventStyle(evt);
                  return (
                    <div key={evt.id}
                      onClick={e => { e.stopPropagation(); onEventClick(evt); }}
                      className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold truncate border-l-2 cursor-pointer hover:brightness-90"
                      style={{ background: st.bg, borderLeftColor: st.border, color: st.text }}>
                      {timeStr(evt.start)} {evt.title}
                    </div>
                  );
                })}
                {extra > 0 && (
                  <div className="text-[10px] text-gray-400 pl-1">+{extra} daha</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Ana Sayfa ─────────────────────────────────────────────────
export default function TakvimPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("hafta");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [defaultDate, setDefaultDate] = useState<string | undefined>();
  const [syncing, setSyncing] = useState(false);
  const { error, success } = useToast();
  const { confirm } = useConfirm();

  const loadEvents = useCallback(async () => {
    const [evts, cls] = await Promise.all([getCalendarEvents(), getClients()]);
    setEvents(evts);
    setClients(cls);
  }, []);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const navigate = useCallback((dir: "prev" | "next" | "today") => {
    if (dir === "today") { setCurrentDate(new Date()); return; }
    const d = dir === "next" ? 1 : -1;
    if (viewMode === "gun") setCurrentDate(c => addDays(c, d));
    else if (viewMode === "hafta") setCurrentDate(c => d > 0 ? addWeeks(c, 1) : subWeeks(c, 1));
    else setCurrentDate(c => d > 0 ? addMonths(c, 1) : subMonths(c, 1));
  }, [viewMode]);

  const headerTitle = useMemo(() => {
    if (viewMode === "gun") return format(currentDate, "d MMMM yyyy, EEEE", { locale: tr });
    if (viewMode === "hafta") {
      const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
      const we = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(ws, "d MMM", { locale: tr })} – ${format(we, "d MMM yyyy", { locale: tr })}`;
    }
    return format(currentDate, "MMMM yyyy", { locale: tr });
  }, [currentDate, viewMode]);

  const handleSync = async () => {
    setSyncing(true);
    await syncGoogleCalendar(
      async (newEvents) => {
        try {
          await Promise.all(newEvents.map(e => saveCalendarEvent(e)));
          await loadEvents();
          setSyncing(false);
          success("Senkronizasyon başarılı", "Google Takvim randevuları çekildi.");
        } catch (err: any) {
          error("Veritabanı Hatası", err?.message || String(err));
          setSyncing(false);
        }
      },
      (err: any) => { error("Google Takvim Hatası", err?.message || String(err)); setSyncing(false); }
    );
  };

  const handleSave = useCallback(async (data: Omit<CalendarEvent, "id"> & { id?: string }) => {
    if (hasConflict(events, data.start, data.end, data.id)) {
      const isConfirmed = await confirm({
        title: "Saat Çakışması",
        message: "Bu saatte başka bir randevu var. Yine de kaydetmek ister misiniz?",
        confirmLabel: "Evet, Kaydet",
        warning: true
      } as any);
      if (!isConfirmed) return;
    }
    await saveCalendarEvent(data as any);
    success("Başarılı", "Randevu kaydedildi.");
    await loadEvents();
  }, [events, loadEvents, confirm, success]);

  const handleDelete = useCallback(async (id: string) => {
    const isConfirmed = await confirm({
      title: "Randevuyu Sil",
      message: "Bu etkinliği silmek istediğinizden emin misiniz?",
      confirmLabel: "Sil",
      danger: true
    });
    if (!isConfirmed) return;
    await deleteCalendarEvent(id);
    success("Silindi", "Etkinlik başarıyla silindi.");
    setSelectedEvent(null);
    await loadEvents();
  }, [loadEvents, confirm, success]);

  const handleSlotClick = useCallback((date: string) => {
    setDefaultDate(date);
    setEditEvent(null);
    setShowModal(true);
  }, []);

  const VIEW_LABELS: Record<ViewMode, string> = { gun: "Günlük", hafta: "Haftalık", ay: "Aylık" };

  return (
    <div className="flex h-full overflow-hidden" style={{ background: "#f8fffe" }}>
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="px-5 py-3 border-b flex items-center gap-3 flex-wrap bg-white" style={{ borderColor: "#e5f7f5" }}>
          {/* Navigasyon */}
          <div className="flex items-center gap-1">
            <button onClick={() => navigate("prev")}
              className="w-8 h-8 rounded-lg border flex items-center justify-center hover:bg-gray-50 transition-colors"
              style={{ borderColor: "#e5e7eb" }}>
              <ChevronLeft className="w-4 h-4 text-gray-500" />
            </button>
            <button onClick={() => navigate("today")}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border hover:bg-gray-50 transition-colors"
              style={{ borderColor: "#e5e7eb", color: "#374151" }}>
              Bugün
            </button>
            <button onClick={() => navigate("next")}
              className="w-8 h-8 rounded-lg border flex items-center justify-center hover:bg-gray-50 transition-colors"
              style={{ borderColor: "#e5e7eb" }}>
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          <h1 className="text-base font-bold text-gray-800 flex-1 capitalize">{headerTitle}</h1>

          {/* Görünüm Seçici */}
          <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: "#e5e7eb" }}>
            {(["gun", "hafta", "ay"] as ViewMode[]).map(v => (
              <button key={v} onClick={() => setViewMode(v)}
                className="px-3 py-1.5 text-xs font-semibold transition-all"
                style={{
                  background: viewMode === v ? "#0d9488" : "white",
                  color: viewMode === v ? "white" : "#6b7280",
                }}>
                {VIEW_LABELS[v]}
              </button>
            ))}
          </div>

          {/* Google Sync */}
          <button onClick={handleSync} disabled={syncing}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors hover:bg-blue-50 disabled:opacity-60"
            style={{ borderColor: "#bfdbfe", color: "#2563eb" }}>
            {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Google Sync
          </button>

          {/* Yeni Randevu */}
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => { setEditEvent(null); setDefaultDate(undefined); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #0d9488, #134e4a)" }}>
            <Plus className="w-4 h-4" /> Randevu
          </motion.button>
        </div>

        {/* Renk açıklamaları */}
        <div className="px-5 py-2 border-b flex items-center gap-4 overflow-x-auto bg-white" style={{ borderColor: "#f0fdf9" }}>
          {Object.entries(SESSION_COLORS).map(([type, style]) => (
            <div key={type} className="flex items-center gap-1.5 flex-shrink-0">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: style.border }} />
              <span className="text-[11px] text-gray-500">{type === "google" ? "Google Takvim" : type}</span>
            </div>
          ))}
        </div>

        {/* Görünüm */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {viewMode === "hafta" && (
            <WeekView currentDate={currentDate} events={events} clients={clients}
              onEventClick={setSelectedEvent} onSlotClick={handleSlotClick} />
          )}
          {viewMode === "gun" && (
            <DayView currentDate={currentDate} events={events} clients={clients}
              onEventClick={setSelectedEvent} onSlotClick={handleSlotClick} />
          )}
          {viewMode === "ay" && (
            <MonthView currentDate={currentDate} events={events}
              onEventClick={setSelectedEvent} onSlotClick={handleSlotClick} />
          )}
        </div>
      </div>

      {/* Etkinlik Detay Paneli */}
      <AnimatePresence>
        {selectedEvent && (
          <EventDetailPanel event={selectedEvent} clients={clients}
            onClose={() => setSelectedEvent(null)}
            onDelete={handleDelete}
            onEdit={(e) => { setEditEvent(e); setShowModal(true); setSelectedEvent(null); }} />
        )}
      </AnimatePresence>

      {/* Randevu Modalı */}
      <AnimatePresence>
        {showModal && (
          <EventModal open={showModal}
            onClose={() => { setShowModal(false); setEditEvent(null); }}
            onSave={handleSave} clients={clients}
            defaultDate={defaultDate} editEvent={editEvent} />
        )}
      </AnimatePresence>
    </div>
  );
}
