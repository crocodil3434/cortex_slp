// ============================================================
// CROCODIL — Supabase PostgreSQL CRUD Yardımcı Fonksiyonları
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
import { createClient } from "@/lib/supabase/client";

// ── Genel yardımcılar ─────────────────────────────────────
const getSupabase = () => createClient();

async function getCurrentUserId(): Promise<string> {
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) throw new Error("Kullanıcı oturumu bulunamadı.");
  return session.user.id;
}

export async function logout(): Promise<void> {
  const supabase = getSupabase();
  await supabase.auth.signOut();
}

export async function isAuthenticated(): Promise<boolean> {
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
}

// ── Ayarlar ───────────────────────────────────────────────
function mapSettingsFromDb(db: any): CrocodilSettings {
  return {
    pin: db.pin,
    clinicianName: db.clinician_name,
    clinicName: db.clinic_name,
    geminiApiKey: db.gemini_api_key,
    googleCalendarClientId: db.google_calendar_client_id,
    googleCalendarLinked: db.google_calendar_linked,
    hospitalApiUrl: db.hospital_api_url,
    hospitalApiKey: db.hospital_api_key,
    theme: db.theme || "light"
  };
}

export async function getSettings(): Promise<CrocodilSettings | null> {
  try {
    const supabase = getSupabase();
    const userId = await getCurrentUserId();
    const { data, error } = await supabase.from("settings").select("*").eq("user_id", userId).single();
    if (error && error.code !== "PGRST116") throw error; // PGRST116 is no rows returned
    if (!data) return null;
    return mapSettingsFromDb(data);
  } catch (err) {
    console.error("getSettings error", err);
    return null;
  }
}

export async function saveSettings(settings: Partial<CrocodilSettings>): Promise<void> {
  const supabase = getSupabase();
  const userId = await getCurrentUserId();
  
  const dbData = {
    user_id: userId,
    pin: settings.pin,
    clinician_name: settings.clinicianName,
    clinic_name: settings.clinicName,
    gemini_api_key: settings.geminiApiKey,
    google_calendar_client_id: settings.googleCalendarClientId,
    google_calendar_linked: settings.googleCalendarLinked,
    hospital_api_url: settings.hospitalApiUrl,
    hospital_api_key: settings.hospitalApiKey,
    theme: settings.theme,
    updated_at: new Date().toISOString()
  };
  
  // Sadece undefined olmayan alanları gönder
  Object.keys(dbData).forEach((key) => {
    if (dbData[key as keyof typeof dbData] === undefined) {
      delete dbData[key as keyof typeof dbData];
    }
  });

  const { data: existing } = await supabase.from("settings").select("user_id").eq("user_id", userId).single();
  
  if (existing) {
    const { error } = await supabase.from("settings").update(dbData).eq("user_id", userId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("settings").insert([dbData]);
    if (error) throw error;
  }
}

// ── Danışanlar ────────────────────────────────────────────
export async function getClients(): Promise<Client[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("clients").select("*").order("updated_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapClientFromDb);
}

export async function getClient(id: string): Promise<Client | undefined> {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("clients").select("*").eq("id", id).single();
  if (error) return undefined;
  return mapClientFromDb(data);
}

export async function saveClient(client: Omit<Client, "id" | "createdAt" | "updatedAt"> & { id?: string }): Promise<Client> {
  const supabase = getSupabase();
  const userId = await getCurrentUserId();
  const initials = `${client.firstName?.[0] ?? "?"}${client.lastName?.[0] ?? "?"}`.toUpperCase();

  const dbData = {
    user_id: userId,
    first_name: client.firstName,
    last_name: client.lastName,
    birth_date: client.birthDate || null,
    gender: client.gender,
    handedness: client.handedness,
    id_number: client.idNumber,
    phone: client.phone,
    email: client.email,
    address: client.address,
    parent_name: client.parentName,
    parent_phone: client.parentPhone,
    parent_relation: client.parentRelation,
    referral_source: client.referralSource,
    referral_diagnosis: client.referralDiagnosis,
    primary_diagnosis: client.primaryDiagnosis,
    insurance_type: client.insuranceType,
    insurance_name: client.insuranceName,
    google_event_id: client.googleEventId,
    google_calendar_linked: client.googleCalendarLinked,
    status: client.status ?? "aktif",
    notes: client.notes,
    avatar_initials: initials,
    color_tag: client.colorTag
  };

  if (client.id) {
    const { data, error } = await supabase.from("clients").update(dbData).eq("id", client.id).select().single();
    if (error) throw error;
    return mapClientFromDb(data);
  } else {
    const { data, error } = await supabase.from("clients").insert([dbData]).select().single();
    if (error) throw error;
    return mapClientFromDb(data);
  }
}

export async function deleteClient(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) throw error;
}

export async function searchClients(query: string): Promise<Client[]> {
  const all = await getClients();
  const q = query.toLowerCase();
  return all.filter(
    (c) =>
      c.firstName.toLowerCase().includes(q) ||
      c.lastName.toLowerCase().includes(q) ||
      c.primaryDiagnosis?.toLowerCase().includes(q) ||
      c.referralDiagnosis?.toLowerCase().includes(q)
  );
}

// ── Değerlendirmeler ──────────────────────────────────────
export async function getAssessments(clientId?: string): Promise<Assessment[]> {
  const supabase = getSupabase();
  let query = supabase.from("assessments").select("*").order("created_at", { ascending: false });
  if (clientId) query = query.eq("client_id", clientId);
  
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(mapAssessmentFromDb);
}

export async function getAssessment(id: string): Promise<Assessment | undefined> {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("assessments").select("*").eq("id", id).single();
  if (error) return undefined;
  return mapAssessmentFromDb(data);
}

export async function saveAssessment(assessment: Partial<Assessment> & { clientId: string }): Promise<Assessment> {
  const supabase = getSupabase();
  
  const dbData = {
    client_id: assessment.clientId,
    assessor: assessment.assessor,
    selected_categories: assessment.selectedCategories,
    status: assessment.status,
    personal: assessment.personal,
    language: assessment.language,
    articulation: assessment.articulation,
    fluency: assessment.fluency,
    voice: assessment.voice,
    dysphagia: assessment.dysphagia,
    aphasia: assessment.aphasia,
    aac: assessment.aac,
    motor_speech: assessment.motorSpeech,
    social_comm: assessment.socialComm,
    icf: assessment.icf,
    conclusion: assessment.conclusion
  };

  if (assessment.id) {
    const { data, error } = await supabase.from("assessments").update(dbData).eq("id", assessment.id).select().single();
    if (error) throw error;
    return mapAssessmentFromDb(data);
  } else {
    const { data, error } = await supabase.from("assessments").insert([dbData]).select().single();
    if (error) throw error;
    return mapAssessmentFromDb(data);
  }
}

// ── Terapi Seansları ──────────────────────────────────────
export async function getSessions(clientId?: string): Promise<TherapySession[]> {
  const supabase = getSupabase();
  let query = supabase.from("therapy_sessions").select("*").order("session_date", { ascending: false });
  if (clientId) query = query.eq("client_id", clientId);
  
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(mapSessionFromDb);
}

export async function getSession(id: string): Promise<TherapySession | undefined> {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("therapy_sessions").select("*").eq("id", id).single();
  if (error) return undefined;
  return mapSessionFromDb(data);
}

export async function saveSession(session: Omit<TherapySession, "id" | "createdAt" | "sessionNumber"> & { id?: string, sessionNumber?: number }): Promise<TherapySession> {
  const supabase = getSupabase();
  
  let num = session.sessionNumber;
  if (!num) {
    const { count } = await supabase.from("therapy_sessions").select("*", { count: "exact", head: true }).eq("client_id", session.clientId);
    num = (count || 0) + 1;
  }

  const dbData = {
    client_id: session.clientId,
    session_date: session.sessionDate,
    duration_minutes: session.durationMinutes,
    session_mode: session.sessionMode,
    attendees: session.attendees,
    session_number: num,
    goal_progress: session.goalProgress,
    techniques_used: session.techniquesUsed,
    materials: session.materials,
    activities: session.activities,
    clinician_notes: session.clinicianNotes,
    home_program: session.homeProgram,
    hep: session.hep,
    parent_training_notes: session.parentTrainingNotes,
    next_session_plan: session.nextSessionPlan
  };

  if (session.id) {
    const { data, error } = await supabase.from("therapy_sessions").update(dbData).eq("id", session.id).select().single();
    if (error) throw error;
    return mapSessionFromDb(data);
  } else {
    const { data, error } = await supabase.from("therapy_sessions").insert([dbData]).select().single();
    if (error) throw error;
    return mapSessionFromDb(data);
  }
}

// ── Hedefler ──────────────────────────────────────────────
export async function getGoals(clientId?: string): Promise<SMARTGoal[]> {
  const supabase = getSupabase();
  let query = supabase.from("smart_goals").select("*").order("created_at", { ascending: false });
  if (clientId) query = query.eq("client_id", clientId);
  
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(mapGoalFromDb);
}

export async function saveGoal(goal: Omit<SMARTGoal, "id" | "createdAt"> & { id?: string }): Promise<SMARTGoal> {
  const supabase = getSupabase();
  
  const dbData = {
    client_id: goal.clientId,
    icf_code: goal.icfCode,
    description: goal.description,
    target_percent: goal.targetPercent,
    current_percent: goal.currentPercent,
    domain: goal.domain,
    status: goal.status,
    deadline: goal.deadline
  };

  if (goal.id) {
    const { data, error } = await supabase.from("smart_goals").update(dbData).eq("id", goal.id).select().single();
    if (error) throw error;
    return mapGoalFromDb(data);
  } else {
    const { data, error } = await supabase.from("smart_goals").insert([dbData]).select().single();
    if (error) throw error;
    return mapGoalFromDb(data);
  }
}

export async function deleteGoal(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("smart_goals").delete().eq("id", id);
  if (error) throw error;
}

// ── Takvim Etkinlikleri ───────────────────────────────────
export async function getCalendarEvents(dateFrom?: string, dateTo?: string): Promise<CalendarEvent[]> {
  const supabase = getSupabase();
  const userId = await getCurrentUserId();
  let query = supabase.from("calendar_events").select("*").eq("user_id", userId);
  
  if (dateFrom) query = query.gte("start_time", dateFrom);
  if (dateTo) query = query.lte("start_time", dateTo);
  
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(mapEventFromDb);
}

export async function saveCalendarEvent(event: Omit<CalendarEvent, "id"> & { id?: string }): Promise<CalendarEvent> {
  const supabase = getSupabase();
  const userId = await getCurrentUserId();
  
  const dbData = {
    user_id: userId,
    client_id: event.clientId,
    title: event.title,
    start_time: event.start,
    end_time: event.end,
    type: event.type,
    session_type: event.sessionType,
    notes: event.notes,
    google_event_id: event.googleEventId,
    color: event.color
  };

  if (event.googleEventId) {
    const { data: existing } = await supabase.from("calendar_events").select("id").eq("google_event_id", event.googleEventId).maybeSingle();
    if (existing) {
      const { data, error } = await supabase.from("calendar_events").update(dbData).eq("id", existing.id).select().single();
      if (error) throw error;
      return mapEventFromDb(data);
    }
  }

  if (event.id && event.id.length === 36) { // 36 chars is a UUID length
    const { data, error } = await supabase.from("calendar_events").update(dbData).eq("id", event.id).select().single();
    if (error) throw error;
    return mapEventFromDb(data);
  } else {
    const { data, error } = await supabase.from("calendar_events").insert([dbData]).select().single();
    if (error) throw error;
    return mapEventFromDb(data);
  }
}

export async function deleteCalendarEvent(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("calendar_events").delete().eq("id", id);
  if (error) throw error;
}

// ── AI Materyalleri ───────────────────────────────────────
export async function getAIMaterials(): Promise<AIGeneratedMaterial[]> {
  const supabase = getSupabase();
  const userId = await getCurrentUserId();
  const { data, error } = await supabase.from("ai_materials").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapAiMaterialFromDb);
}

export async function saveAIMaterial(material: Omit<AIGeneratedMaterial, "id" | "createdAt">): Promise<AIGeneratedMaterial> {
  const supabase = getSupabase();
  const userId = await getCurrentUserId();
  
  const dbData = {
    user_id: userId,
    title: material.title,
    content: material.content,
    request: material.request
  };

  const { data, error } = await supabase.from("ai_materials").insert([dbData]).select().single();
  if (error) throw error;
  return mapAiMaterialFromDb(data);
}

// ── İstatistikler ─────────────────────────────────────────
export async function getDashboardStats() {
  const clients = await getClients();
  const sessions = await getSessions();
  const assessments = await getAssessments();
  const goals = await getGoals();

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


// --- Mappers ---

function mapClientFromDb(db: any): Client {
  return {
    id: db.id,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
    firstName: db.first_name,
    lastName: db.last_name,
    birthDate: db.birth_date,
    gender: db.gender,
    handedness: db.handedness,
    idNumber: db.id_number,
    phone: db.phone,
    email: db.email,
    address: db.address,
    parentName: db.parent_name,
    parentPhone: db.parent_phone,
    parentRelation: db.parent_relation,
    referralSource: db.referral_source,
    referralDiagnosis: db.referral_diagnosis,
    primaryDiagnosis: db.primary_diagnosis,
    insuranceType: db.insurance_type,
    insuranceName: db.insurance_name,
    googleEventId: db.google_event_id,
    googleCalendarLinked: db.google_calendar_linked,
    status: db.status,
    notes: db.notes,
    avatarInitials: db.avatar_initials,
    colorTag: db.color_tag,
  };
}

function mapAssessmentFromDb(db: any): Assessment {
  return {
    id: db.id,
    clientId: db.client_id,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
    assessor: db.assessor,
    selectedCategories: db.selected_categories || [],
    status: db.status,
    personal: db.personal,
    language: db.language,
    articulation: db.articulation,
    fluency: db.fluency,
    voice: db.voice,
    dysphagia: db.dysphagia,
    aphasia: db.aphasia,
    aac: db.aac,
    motorSpeech: db.motor_speech,
    socialComm: db.social_comm,
    icf: db.icf,
    conclusion: db.conclusion,
  };
}

function mapSessionFromDb(db: any): TherapySession {
  return {
    id: db.id,
    clientId: db.client_id,
    createdAt: db.created_at,
    sessionDate: db.session_date,
    durationMinutes: db.duration_minutes,
    sessionMode: db.session_mode,
    attendees: db.attendees,
    sessionNumber: db.session_number,
    goalProgress: db.goal_progress || [],
    techniquesUsed: db.techniques_used || [],
    materials: db.materials,
    activities: db.activities,
    clinicianNotes: db.clinician_notes,
    homeProgram: db.home_program,
    hep: db.hep,
    parentTrainingNotes: db.parent_training_notes,
    nextSessionPlan: db.next_session_plan,
  };
}

function mapGoalFromDb(db: any): SMARTGoal {
  return {
    id: db.id,
    clientId: db.client_id,
    createdAt: db.created_at,
    icfCode: db.icf_code,
    description: db.description,
    targetPercent: db.target_percent,
    currentPercent: db.current_percent,
    domain: db.domain,
    status: db.status,
    deadline: db.deadline,
  };
}

function mapEventFromDb(db: any): CalendarEvent {
  return {
    id: db.id,
    clientId: db.client_id,
    title: db.title,
    start: db.start_time,
    end: db.end_time,
    type: db.type,
    sessionType: db.session_type,
    notes: db.notes,
    googleEventId: db.google_event_id,
    color: db.color,
  };
}

function mapAiMaterialFromDb(db: any): AIGeneratedMaterial {
  return {
    id: db.id,
    createdAt: db.created_at,
    title: db.title,
    content: db.content,
    request: db.request,
  };
}

// ── Modül 4: Storage Fonksiyonları ─────────────────────────────────────────

export type ClientFile = {
  name: string;
  url: string; // Internal path
  size: number;
  type: string;
  createdAt: string;
};

export async function uploadClientFile(clientId: string, file: File): Promise<string> {
  const supabase = getSupabase();
  const userId = await getCurrentUserId();
  // Benzersiz isim oluştur
  const uniqueName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
  const path = `${userId}/${clientId}/${uniqueName}`;
  
  const { data, error } = await supabase.storage.from("patient-files").upload(path, file);
  if (error) throw error;
  
  return data.path;
}

export async function getClientFiles(clientId: string): Promise<ClientFile[]> {
  const supabase = getSupabase();
  const userId = await getCurrentUserId();
  
  const { data, error } = await supabase.storage.from("patient-files").list(`${userId}/${clientId}`);
  if (error) throw error;
  
  return data
    .filter(f => f.name !== ".emptyFolderPlaceholder")
    .map(f => ({
      name: f.name.replace(/^\d+_/, ""), // baştaki timestamp'i kaldır
      url: `${userId}/${clientId}/${f.name}`,
      size: f.metadata?.size || 0,
      type: f.metadata?.mimetype || "application/octet-stream",
      createdAt: f.created_at || new Date().toISOString(),
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function deleteClientFile(path: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.storage.from("patient-files").remove([path]);
  if (error) throw error;
}

export async function getClientFileUrl(path: string): Promise<string> {
  const supabase = getSupabase();
  // 1 saatlik imzalı URL
  const { data, error } = await supabase.storage.from("patient-files").createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}

