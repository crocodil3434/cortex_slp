-- ============================================================
-- MODUL 105 - Supabase PostgreSQL Migration
-- Supabase Dashboard > SQL Editor > New Query > Run
-- ============================================================

-- 1. m105_sessions
CREATE TABLE IF NOT EXISTS m105_sessions (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id            UUID REFERENCES clients(id) ON DELETE CASCADE,
    session_date         TIMESTAMPTZ DEFAULT NOW(),
    session_number       INT NOT NULL DEFAULT 1,
    session_goal         TEXT DEFAULT 'baseline_olcum',
    hayden_level         INT CHECK (hayden_level BETWEEN 1 AND 7),
    klinisyen_notu       TEXT,
    nihai_tani_etiketi   VARCHAR(60),
    hierarchy_metrics    JSONB DEFAULT '{}'::jsonb,
    zscore_results       JSONB DEFAULT '{}'::jsonb,
    crocodil_payload     JSONB DEFAULT '{}'::jsonb,
    sqlite_session_id    INT,
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- 2. m105_raw_packets
CREATE TABLE IF NOT EXISTS m105_raw_packets (
    id               BIGSERIAL PRIMARY KEY,
    session_id       UUID REFERENCES m105_sessions(id) ON DELETE CASCADE,
    timestamp_ms     BIGINT NOT NULL,
    hayden_level     INT CHECK (hayden_level BETWEEN 1 AND 7),
    session_phase    TEXT,
    imu_data         JSONB,
    semg_data        JSONB,
    resp_data        JSONB,
    mic_data         JSONB,
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Indeksler
CREATE INDEX IF NOT EXISTS idx_m105_sessions_client
    ON m105_sessions(client_id, session_date DESC);
CREATE INDEX IF NOT EXISTS idx_m105_sessions_label
    ON m105_sessions(nihai_tani_etiketi)
    WHERE nihai_tani_etiketi IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_m105_raw_packets_session_ts
    ON m105_raw_packets(session_id, timestamp_ms);

-- 4. updated_at trigger
CREATE OR REPLACE FUNCTION update_m105_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS m105_sessions_updated_at ON m105_sessions;
CREATE TRIGGER m105_sessions_updated_at
    BEFORE UPDATE ON m105_sessions
    FOR EACH ROW EXECUTE FUNCTION update_m105_updated_at();

-- 5. RLS
ALTER TABLE m105_sessions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE m105_raw_packets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "m105_sessions_own_clients" ON m105_sessions;
CREATE POLICY "m105_sessions_own_clients" ON m105_sessions
    FOR ALL
    USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()))
    WITH CHECK (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "m105_raw_packets_own_sessions" ON m105_raw_packets;
CREATE POLICY "m105_raw_packets_own_sessions" ON m105_raw_packets
    FOR ALL
    USING (session_id IN (
        SELECT s.id FROM m105_sessions s
        JOIN clients c ON c.id = s.client_id
        WHERE c.user_id = auth.uid()
    ));

-- 6. ML egitim view
CREATE OR REPLACE VIEW m105_labeled_dataset AS
SELECT
    s.id AS session_id, s.client_id, s.session_date, s.hayden_level,
    s.nihai_tani_etiketi AS label, s.klinisyen_notu,
    s.zscore_results, s.hierarchy_metrics,
    c.birth_date, c.gender, c.primary_diagnosis
FROM m105_sessions s
JOIN clients c ON c.id = s.client_id
WHERE s.nihai_tani_etiketi IS NOT NULL
ORDER BY s.session_date DESC;
