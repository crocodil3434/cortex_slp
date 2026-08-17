-- ============================================================
-- SUPABASE POSTGRESQL SCHEMA FOR CORTEX SLP
-- Lütfen bu SQL kodunu Supabase Dashboard > SQL Editor sekmesine yapıştırıp çalıştırın (Run).
-- ============================================================

-- ENUMS
CREATE TYPE client_status AS ENUM ('aktif', 'pasif', 'tamamlandı');
CREATE TYPE gender_enum AS ENUM ('erkek', 'kadın', 'belirtilmemiş');
CREATE TYPE handedness_enum AS ENUM ('sağ', 'sol', 'çift');
CREATE TYPE assessment_status AS ENUM ('devam', 'tamamlandı');
CREATE TYPE session_mode AS ENUM ('klinik', 'ev', 'online', 'hastane');
CREATE TYPE goal_status AS ENUM ('aktif', 'tamamlandı', 'revize');
CREATE TYPE calendar_event_type AS ENUM ('google', 'manual');

-- 1. CLIENTS (Danışanlar)
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Klinisyen (Auth user)
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    birth_date DATE,
    gender gender_enum DEFAULT 'belirtilmemiş',
    handedness handedness_enum DEFAULT 'sağ',
    id_number TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    parent_name TEXT,
    parent_phone TEXT,
    parent_relation TEXT,
    referral_source TEXT,
    referral_diagnosis TEXT,
    primary_diagnosis TEXT,
    insurance_type TEXT,
    insurance_name TEXT,
    google_event_id TEXT,
    google_calendar_linked BOOLEAN DEFAULT FALSE,
    status client_status DEFAULT 'aktif',
    notes TEXT,
    avatar_initials TEXT,
    color_tag TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. SETTINGS
CREATE TABLE settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    pin TEXT,
    clinician_name TEXT,
    clinic_name TEXT,
    gemini_api_key TEXT,
    google_calendar_client_id TEXT,
    google_calendar_linked BOOLEAN DEFAULT FALSE,
    hospital_api_url TEXT,
    hospital_api_key TEXT,
    theme TEXT DEFAULT 'light',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ASSESSMENTS (Değerlendirmeler)
CREATE TABLE assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    assessor TEXT,
    selected_categories TEXT[] DEFAULT '{}',
    status assessment_status DEFAULT 'devam',
    
    -- Değerlendirme kategorileri (JSONB)
    personal JSONB,
    language JSONB,
    articulation JSONB,
    fluency JSONB,
    voice JSONB,
    dysphagia JSONB,
    aphasia JSONB,
    aac JSONB,
    motor_speech JSONB,
    social_comm JSONB,
    icf JSONB,
    conclusion JSONB,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. THERAPY SESSIONS (Terapi Seansları)
CREATE TABLE therapy_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    session_date TIMESTAMPTZ NOT NULL,
    duration_minutes INT DEFAULT 45,
    session_mode session_mode DEFAULT 'klinik',
    attendees TEXT,
    session_number INT NOT NULL,
    
    goal_progress JSONB DEFAULT '[]'::jsonb,
    techniques_used TEXT[] DEFAULT '{}',
    materials TEXT,
    activities TEXT,
    clinician_notes TEXT,
    home_program TEXT,
    hep JSONB,
    parent_training_notes TEXT,
    next_session_plan TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. SMART GOALS (Hedefler)
CREATE TABLE smart_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    icf_code TEXT,
    description TEXT NOT NULL,
    target_percent INT DEFAULT 80,
    current_percent INT DEFAULT 0,
    domain TEXT CHECK (domain IN ('bodyFunction', 'activity', 'participation')),
    status goal_status DEFAULT 'aktif',
    deadline DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. CALENDAR EVENTS (Takvim)
CREATE TABLE calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    type calendar_event_type DEFAULT 'manual',
    session_type TEXT,
    notes TEXT,
    google_event_id TEXT,
    color TEXT
);

-- 6. AI MATERIALS (Yapay Zeka Materyalleri)
CREATE TABLE ai_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    request JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. SETTINGS (Ayarlar)
CREATE TABLE settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    clinician_name TEXT,
    clinic_name TEXT,
    gemini_api_key TEXT,
    google_calendar_client_id TEXT,
    google_calendar_linked BOOLEAN DEFAULT FALSE,
    hospital_api_url TEXT,
    hospital_api_key TEXT,
    theme TEXT DEFAULT 'light',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- UPDATE TRIGGER (updated_at)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_clients_modtime
    BEFORE UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assessments_modtime
    BEFORE UPDATE ON assessments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_modtime
    BEFORE UPDATE ON settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ROW LEVEL SECURITY (RLS)
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE therapy_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE smart_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- POLICIES (Users can only see and edit their own data)
CREATE POLICY "Users can view their own clients" ON clients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own clients" ON clients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own clients" ON clients FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own clients" ON clients FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view assessments for their clients" ON assessments FOR SELECT USING (EXISTS (SELECT 1 FROM clients WHERE clients.id = assessments.client_id AND clients.user_id = auth.uid()));
CREATE POLICY "Users can insert assessments for their clients" ON assessments FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM clients WHERE clients.id = assessments.client_id AND clients.user_id = auth.uid()));
CREATE POLICY "Users can update assessments for their clients" ON assessments FOR UPDATE USING (EXISTS (SELECT 1 FROM clients WHERE clients.id = assessments.client_id AND clients.user_id = auth.uid()));
CREATE POLICY "Users can delete assessments for their clients" ON assessments FOR DELETE USING (EXISTS (SELECT 1 FROM clients WHERE clients.id = assessments.client_id AND clients.user_id = auth.uid()));

CREATE POLICY "Users can view therapy_sessions for their clients" ON therapy_sessions FOR SELECT USING (EXISTS (SELECT 1 FROM clients WHERE clients.id = therapy_sessions.client_id AND clients.user_id = auth.uid()));
CREATE POLICY "Users can insert therapy_sessions for their clients" ON therapy_sessions FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM clients WHERE clients.id = therapy_sessions.client_id AND clients.user_id = auth.uid()));
CREATE POLICY "Users can update therapy_sessions for their clients" ON therapy_sessions FOR UPDATE USING (EXISTS (SELECT 1 FROM clients WHERE clients.id = therapy_sessions.client_id AND clients.user_id = auth.uid()));
CREATE POLICY "Users can delete therapy_sessions for their clients" ON therapy_sessions FOR DELETE USING (EXISTS (SELECT 1 FROM clients WHERE clients.id = therapy_sessions.client_id AND clients.user_id = auth.uid()));

CREATE POLICY "Users can view smart_goals for their clients" ON smart_goals FOR SELECT USING (EXISTS (SELECT 1 FROM clients WHERE clients.id = smart_goals.client_id AND clients.user_id = auth.uid()));
CREATE POLICY "Users can insert smart_goals for their clients" ON smart_goals FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM clients WHERE clients.id = smart_goals.client_id AND clients.user_id = auth.uid()));
CREATE POLICY "Users can update smart_goals for their clients" ON smart_goals FOR UPDATE USING (EXISTS (SELECT 1 FROM clients WHERE clients.id = smart_goals.client_id AND clients.user_id = auth.uid()));
CREATE POLICY "Users can delete smart_goals for their clients" ON smart_goals FOR DELETE USING (EXISTS (SELECT 1 FROM clients WHERE clients.id = smart_goals.client_id AND clients.user_id = auth.uid()));

CREATE POLICY "Users can view own settings" ON settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own settings" ON settings FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own calendar_events" ON calendar_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own calendar_events" ON calendar_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own calendar_events" ON calendar_events FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own calendar_events" ON calendar_events FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own ai_materials" ON ai_materials FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own ai_materials" ON ai_materials FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own ai_materials" ON ai_materials FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own ai_materials" ON ai_materials FOR DELETE USING (auth.uid() = user_id);
