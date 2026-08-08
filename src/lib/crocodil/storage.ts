// ============================================================
// CROCODIL — localStorage CRUD Yardımcı Fonksiyonları
// ============================================================

import type {
  Client,
  Assessment,
  TherapySession,
  SMARTGoal,
  CalendarEvent,
  AIGeneratedMaterial,
  CrocodilSettings,
} from "./types";

// ── Anahtar sabitleri ─────────────────────────────────────
const KEYS = {
  CLIENTS: "crocodil_clients",
  ASSESSMENTS: "crocodil_assessments",
  SESSIONS: "crocodil_sessions",
  GOALS: "crocodil_goals",
  CALENDAR_EVENTS: "crocodil_calendar_events",
  AI_MATERIALS: "crocodil_ai_materials",
  SETTINGS: "crocodil_settings",
  PIN_ATTEMPTS: "crocodil_pin_attempts",
  PIN_LOCKED_UNTIL: "crocodil_pin_locked_until",
  AUTH_TOKEN: "crocodil_auth",
} as const;

// ── Genel yardımcılar ─────────────────────────────────────
function load<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function save<T>(key: string, data: T[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(data));
}

function loadOne<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function saveOne<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(data));
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ── PIN & Auth ────────────────────────────────────────────
export function hashPin(pin: string): string {
  // Basit hash (production'da bcrypt kullanılmalı)
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `croc_${Math.abs(hash).toString(16)}`;
}

export function verifyPin(inputPin: string): boolean {
  const settings = getSettings();
  if (!settings?.pin) return false;
  return hashPin(inputPin) === settings.pin;
}

export function isLocked(): { locked: boolean; remainingSeconds: number } {
  if (typeof window === "undefined") return { locked: false, remainingSeconds: 0 };
  const lockedUntil = localStorage.getItem(KEYS.PIN_LOCKED_UNTIL);
  if (!lockedUntil) return { locked: false, remainingSeconds: 0 };
  const remaining = Math.ceil((parseInt(lockedUntil) - Date.now()) / 1000);
  if (remaining <= 0) {
    localStorage.removeItem(KEYS.PIN_LOCKED_UNTIL);
    localStorage.removeItem(KEYS.PIN_ATTEMPTS);
    return { locked: false, remainingSeconds: 0 };
  }
  return { locked: true, remainingSeconds: remaining };
}

export function recordFailedAttempt(): number {
  if (typeof window === "undefined") return 0;
  const attempts = parseInt(localStorage.getItem(KEYS.PIN_ATTEMPTS) || "0") + 1;
  localStorage.setItem(KEYS.PIN_ATTEMPTS, String(attempts));
  if (attempts >= 3) {
    localStorage.setItem(KEYS.PIN_LOCKED_UNTIL, String(Date.now() + 30000));
  }
  return attempts;
}

export function clearFailedAttempts(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEYS.PIN_ATTEMPTS);
  localStorage.removeItem(KEYS.PIN_LOCKED_UNTIL);
}

export function setAuthSession(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(KEYS.AUTH_TOKEN, `auth_${Date.now()}`);
}

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return !!sessionStorage.getItem(KEYS.AUTH_TOKEN);
}

export function logout(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(KEYS.AUTH_TOKEN);
}

// ── Ayarlar ───────────────────────────────────────────────
export function getSettings(): CrocodilSettings | null {
  return loadOne<CrocodilSettings>(KEYS.SETTINGS);
}

export function saveSettings(settings: CrocodilSettings): void {
  saveOne(KEYS.SETTINGS, settings);
}

export function isFirstRun(): boolean {
  return !getSettings()?.pin;
}

// ── Danışanlar ────────────────────────────────────────────
export function getClients(): Client[] {
  return load<Client>(KEYS.CLIENTS).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function getClient(id: string): Client | undefined {
  return getClients().find((c) => c.id === id);
}

export function saveClient(client: Omit<Client, "id" | "createdAt" | "updatedAt"> & { id?: string }): Client {
  const clients = getClients();
  const now = new Date().toISOString();
  const initials = `${client.firstName[0] ?? "?"}${client.lastName[0] ?? "?"}`.toUpperCase();

  if (client.id) {
    const idx = clients.findIndex((c) => c.id === client.id);
    const updated: Client = { ...client, id: client.id, updatedAt: now, createdAt: clients[idx]?.createdAt ?? now, avatarInitials: initials };
    if (idx >= 0) clients[idx] = updated;
    else clients.push(updated);
    save(KEYS.CLIENTS, clients);
    return updated;
  }

  const newClient: Client = {
    ...client,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
    avatarInitials: initials,
    status: client.status ?? "aktif",
  };
  clients.unshift(newClient);
  save(KEYS.CLIENTS, clients);
  return newClient;
}

export function deleteClient(id: string): void {
  save(KEYS.CLIENTS, getClients().filter((c) => c.id !== id));
}

export function searchClients(query: string): Client[] {
  const q = query.toLowerCase();
  return getClients().filter(
    (c) =>
      c.firstName.toLowerCase().includes(q) ||
      c.lastName.toLowerCase().includes(q) ||
      c.primaryDiagnosis?.toLowerCase().includes(q) ||
      c.referralDiagnosis?.toLowerCase().includes(q)
  );
}

// ── Değerlendirmeler ──────────────────────────────────────
export function getAssessments(clientId?: string): Assessment[] {
  const all = load<Assessment>(KEYS.ASSESSMENTS);
  return clientId ? all.filter((a) => a.clientId === clientId) : all;
}

export function getAssessment(id: string): Assessment | undefined {
  return load<Assessment>(KEYS.ASSESSMENTS).find((a) => a.id === id);
}

export function saveAssessment(assessment: Partial<Assessment> & { clientId: string }): Assessment {
  const all = load<Assessment>(KEYS.ASSESSMENTS);
  const now = new Date().toISOString();

  if (assessment.id) {
    const idx = all.findIndex((a) => a.id === assessment.id);
    const updated: Assessment = { ...all[idx], ...assessment, updatedAt: now } as Assessment;
    if (idx >= 0) all[idx] = updated;
    else all.unshift(updated);
    save(KEYS.ASSESSMENTS, all);
    return updated;
  }

  const newAssessment: Assessment = {
    id: generateId(),
    createdAt: now,
    updatedAt: now,
    assessor: getSettings()?.clinicianName ?? "Klinisyen",
    selectedCategories: [],
    status: "devam",
    ...assessment,
  } as Assessment;
  all.unshift(newAssessment);
  save(KEYS.ASSESSMENTS, all);
  return newAssessment;
}

// ── Terapi Seansları ──────────────────────────────────────
export function getSessions(clientId?: string): TherapySession[] {
  const all = load<TherapySession>(KEYS.SESSIONS);
  const filtered = clientId ? all.filter((s) => s.clientId === clientId) : all;
  return filtered.sort((a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime());
}

export function getSession(id: string): TherapySession | undefined {
  return load<TherapySession>(KEYS.SESSIONS).find((s) => s.id === id);
}

export function saveSession(session: Omit<TherapySession, "id" | "createdAt" | "sessionNumber"> & { id?: string, sessionNumber?: number }): TherapySession {
  const all = load<TherapySession>(KEYS.SESSIONS);
  const now = new Date().toISOString();

  if (session.id) {
    const idx = all.findIndex((s) => s.id === session.id);
    const updated = { ...all[idx], ...session } as TherapySession;
    if (idx >= 0) all[idx] = updated;
    else all.unshift(updated);
    save(KEYS.SESSIONS, all);
    return updated;
  }

  // Seans numarasını otomatik belirle
  const clientSessions = all.filter((s) => s.clientId === session.clientId);
  const sessionNumber = clientSessions.length + 1;

  const newSession: TherapySession = {
    id: generateId(),
    createdAt: now,
    ...session,
    sessionNumber,
  };
  all.unshift(newSession);
  save(KEYS.SESSIONS, all);
  return newSession;
}

// ── Hedefler ──────────────────────────────────────────────
export function getGoals(clientId?: string): SMARTGoal[] {
  const all = load<SMARTGoal>(KEYS.GOALS);
  return clientId ? all.filter((g) => g.clientId === clientId) : all;
}

export function saveGoal(goal: Omit<SMARTGoal, "id" | "createdAt"> & { id?: string }): SMARTGoal {
  const all = load<SMARTGoal>(KEYS.GOALS);
  const now = new Date().toISOString();

  if (goal.id) {
    const idx = all.findIndex((g) => g.id === goal.id);
    const updated = { ...all[idx], ...goal } as SMARTGoal;
    if (idx >= 0) all[idx] = updated;
    else all.push(updated);
    save(KEYS.GOALS, all);
    return updated;
  }

  const newGoal: SMARTGoal = { id: generateId(), createdAt: now, ...goal };
  all.push(newGoal);
  save(KEYS.GOALS, all);
  return newGoal;
}

export function deleteGoal(id: string): void {
  save(KEYS.GOALS, getGoals().filter((g) => g.id !== id));
}

// ── Takvim Etkinlikleri ───────────────────────────────────
export function getCalendarEvents(dateFrom?: string, dateTo?: string): CalendarEvent[] {
  const all = load<CalendarEvent>(KEYS.CALENDAR_EVENTS);
  if (!dateFrom && !dateTo) return all;
  return all.filter((e) => {
    const t = new Date(e.start).getTime();
    if (dateFrom && t < new Date(dateFrom).getTime()) return false;
    if (dateTo && t > new Date(dateTo).getTime()) return false;
    return true;
  });
}

export function saveCalendarEvents(events: CalendarEvent[]): void {
  save(KEYS.CALENDAR_EVENTS, events);
}

export function saveCalendarEvent(event: Omit<CalendarEvent, "id"> & { id?: string }): CalendarEvent {
  const all = load<CalendarEvent>(KEYS.CALENDAR_EVENTS);
  if (event.id) {
    const idx = all.findIndex((e) => e.id === event.id);
    const updated = { ...all[idx], ...event } as CalendarEvent;
    if (idx >= 0) all[idx] = updated;
    else all.push(updated);
    save(KEYS.CALENDAR_EVENTS, all);
    return updated;
  }
  const newEvent: CalendarEvent = { id: generateId(), ...event };
  all.push(newEvent);
  save(KEYS.CALENDAR_EVENTS, all);
  return newEvent;
}

export function deleteCalendarEvent(id: string): void {
  save(KEYS.CALENDAR_EVENTS, getCalendarEvents().filter((e) => e.id !== id));
}

// ── AI Materyalleri ───────────────────────────────────────
export function getAIMaterials(clientId?: string): AIGeneratedMaterial[] {
  const all = load<AIGeneratedMaterial>(KEYS.AI_MATERIALS);
  return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function saveAIMaterial(material: Omit<AIGeneratedMaterial, "id" | "createdAt">): AIGeneratedMaterial {
  const all = load<AIGeneratedMaterial>(KEYS.AI_MATERIALS);
  const newMaterial: AIGeneratedMaterial = {
    id: generateId(),
    createdAt: new Date().toISOString(),
    ...material,
  };
  all.unshift(newMaterial);
  save(KEYS.AI_MATERIALS, all);
  return newMaterial;
}

// ── İstatistikler ─────────────────────────────────────────
export function getDashboardStats() {
  const clients = getClients();
  const sessions = getSessions();
  const assessments = getAssessments();
  const goals = getGoals();

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + 1);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const thisWeekSessions = sessions.filter((s) => {
    const d = new Date(s.sessionDate);
    return d >= weekStart && d <= weekEnd;
  });

  const completedGoals = goals.filter(
    (g) => g.status === "tamamlandı" && new Date(g.createdAt).getMonth() === now.getMonth()
  );

  const pendingAssessments = assessments.filter((a) => a.status === "devam");

  return {
    totalActiveClients: clients.filter((c) => c.status === "aktif").length,
    thisWeekSessions: thisWeekSessions.length,
    pendingAssessments: pendingAssessments.length,
    completedGoalsThisMonth: completedGoals.length,
  };
}
