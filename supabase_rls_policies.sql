-- ============================================================
-- CROCODIL — Supabase Row Level Security (RLS) Policies
-- Supabase SQL Editor'a yapıştırın ve çalıştırın
-- ============================================================

-- ─────────────────────────────────────────────────────────
-- 1. CLIENTS
-- ─────────────────────────────────────────────────────────
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clients_select" ON clients;
DROP POLICY IF EXISTS "clients_insert" ON clients;
DROP POLICY IF EXISTS "clients_update" ON clients;
DROP POLICY IF EXISTS "clients_delete" ON clients;

CREATE POLICY "clients_select" ON clients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "clients_insert" ON clients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "clients_update" ON clients FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "clients_delete" ON clients FOR DELETE USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────
-- 2. SETTINGS
-- ─────────────────────────────────────────────────────────
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings_all" ON settings;

CREATE POLICY "settings_all" ON settings
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────
-- 3. ASSESSMENTS
-- ─────────────────────────────────────────────────────────
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "assessments_select" ON assessments;
DROP POLICY IF EXISTS "assessments_insert" ON assessments;
DROP POLICY IF EXISTS "assessments_update" ON assessments;
DROP POLICY IF EXISTS "assessments_delete" ON assessments;

CREATE POLICY "assessments_select" ON assessments
  FOR SELECT USING (EXISTS (SELECT 1 FROM clients WHERE clients.id = assessments.client_id AND clients.user_id = auth.uid()));
CREATE POLICY "assessments_insert" ON assessments
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM clients WHERE clients.id = assessments.client_id AND clients.user_id = auth.uid()));
CREATE POLICY "assessments_update" ON assessments
  FOR UPDATE USING (EXISTS (SELECT 1 FROM clients WHERE clients.id = assessments.client_id AND clients.user_id = auth.uid()));
CREATE POLICY "assessments_delete" ON assessments
  FOR DELETE USING (EXISTS (SELECT 1 FROM clients WHERE clients.id = assessments.client_id AND clients.user_id = auth.uid()));

-- ─────────────────────────────────────────────────────────
-- 4. THERAPY_SESSIONS
-- ─────────────────────────────────────────────────────────
ALTER TABLE therapy_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sessions_select" ON therapy_sessions;
DROP POLICY IF EXISTS "sessions_insert" ON therapy_sessions;
DROP POLICY IF EXISTS "sessions_update" ON therapy_sessions;
DROP POLICY IF EXISTS "sessions_delete" ON therapy_sessions;

CREATE POLICY "sessions_select" ON therapy_sessions
  FOR SELECT USING (EXISTS (SELECT 1 FROM clients WHERE clients.id = therapy_sessions.client_id AND clients.user_id = auth.uid()));
CREATE POLICY "sessions_insert" ON therapy_sessions
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM clients WHERE clients.id = therapy_sessions.client_id AND clients.user_id = auth.uid()));
CREATE POLICY "sessions_update" ON therapy_sessions
  FOR UPDATE USING (EXISTS (SELECT 1 FROM clients WHERE clients.id = therapy_sessions.client_id AND clients.user_id = auth.uid()));
CREATE POLICY "sessions_delete" ON therapy_sessions
  FOR DELETE USING (EXISTS (SELECT 1 FROM clients WHERE clients.id = therapy_sessions.client_id AND clients.user_id = auth.uid()));

-- ─────────────────────────────────────────────────────────
-- 5. SMART_GOALS
-- ─────────────────────────────────────────────────────────
ALTER TABLE smart_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "goals_select" ON smart_goals;
DROP POLICY IF EXISTS "goals_insert" ON smart_goals;
DROP POLICY IF EXISTS "goals_update" ON smart_goals;
DROP POLICY IF EXISTS "goals_delete" ON smart_goals;

CREATE POLICY "goals_select" ON smart_goals
  FOR SELECT USING (EXISTS (SELECT 1 FROM clients WHERE clients.id = smart_goals.client_id AND clients.user_id = auth.uid()));
CREATE POLICY "goals_insert" ON smart_goals
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM clients WHERE clients.id = smart_goals.client_id AND clients.user_id = auth.uid()));
CREATE POLICY "goals_update" ON smart_goals
  FOR UPDATE USING (EXISTS (SELECT 1 FROM clients WHERE clients.id = smart_goals.client_id AND clients.user_id = auth.uid()));
CREATE POLICY "goals_delete" ON smart_goals
  FOR DELETE USING (EXISTS (SELECT 1 FROM clients WHERE clients.id = smart_goals.client_id AND clients.user_id = auth.uid()));

-- ─────────────────────────────────────────────────────────
-- 6. CALENDAR_EVENTS (user_id sütunu ekleniyor)
-- ─────────────────────────────────────────────────────────
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

UPDATE calendar_events ce
SET user_id = c.user_id
FROM clients c
WHERE ce.client_id = c.id AND ce.user_id IS NULL;

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "events_select" ON calendar_events;
DROP POLICY IF EXISTS "events_insert" ON calendar_events;
DROP POLICY IF EXISTS "events_update" ON calendar_events;
DROP POLICY IF EXISTS "events_delete" ON calendar_events;

CREATE POLICY "events_select" ON calendar_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "events_insert" ON calendar_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "events_update" ON calendar_events FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "events_delete" ON calendar_events FOR DELETE USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────
-- 7. AI_MATERIALS
-- ─────────────────────────────────────────────────────────
ALTER TABLE ai_materials ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

ALTER TABLE ai_materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_materials_all" ON ai_materials;

CREATE POLICY "ai_materials_all" ON ai_materials
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────
-- 8. STORAGE BUCKET & POLICIES (Dosya Yükleme)
-- ─────────────────────────────────────────────────────────

-- 1. "patient-files" adında yeni bir bucket oluştur
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'patient-files', 
  'patient-files', 
  false, 
  52428800, -- 50MB
  '{"image/*","application/pdf","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document","audio/*","video/*","application/zip"}'
)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage için RLS (Row Level Security)
-- Kullanıcılar sadece kendi userId'leri altındaki dosyalara erişebilir
-- Path yapısı: userId/clientId/filename

-- SELECT (Dosya okuma)
CREATE POLICY "storage_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'patient-files' 
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );

-- INSERT (Dosya yükleme)
CREATE POLICY "storage_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'patient-files' 
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );

-- DELETE (Dosya silme)
CREATE POLICY "storage_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'patient-files' 
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );
