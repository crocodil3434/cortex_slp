-- ============================================================================
-- CORTEX SLP / CROCODIL — KLİNİK KİNEMATİK VE NÖROMOTOR DEĞERLENDİRME TABLOSU
-- Migration: clinical_kinematics_evaluations
-- ============================================================================

-- 1. Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.clinical_kinematics_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    evaluator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    evaluation_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Bölüm A: Maksillofasiyal ve Kraniofasiyal Yapısal Analiz (İstirahat)
    -- Format: {"a1_simetri": {"deger": true, "yorum": "..."}, ...}
    section_a JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Bölüm B: Nöromotor Fonksiyon Basamakları (Basamak I - V)
    -- Format: {"b1_tonus": {"deger": true, "yorum": "..."}, "b2_vokal": ..., ...}
    section_b JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Bölüm C: Bağlantılı Konuşma ve Entegrasyon (Basamak VI - VII)
    -- Format: {"c6_koartikulasyon": {"deger": false, "yorum": "Groping gözlendi"}, ...}
    section_c JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Basamak Bazlı Skorlar ve Yüzdeler
    -- Format: {"basamak_1": 100, "basamak_2": 80, "basamak_3": 60, ...}
    step_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Genel Başarı Puanı (% 0 - 100)
    overall_score NUMERIC(5, 2) DEFAULT 0.00,
    
    -- Klinisyen Notları & Klinik Öneriler
    clinician_summary TEXT,
    recommendations TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. İndeksler
CREATE INDEX IF NOT EXISTS idx_cke_client_id ON public.clinical_kinematics_evaluations(client_id);
CREATE INDEX IF NOT EXISTS idx_cke_evaluation_date ON public.clinical_kinematics_evaluations(evaluation_date DESC);

-- 3. Row Level Security (RLS)
ALTER TABLE public.clinical_kinematics_evaluations ENABLE ROW LEVEL SECURITY;

-- Okuma Politikası: Danışanın sahibi olan klinisyen görebilir
CREATE POLICY "Klinisyen kendi danışanının değerlendirmelerini görebilir"
    ON public.clinical_kinematics_evaluations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.clients c
            WHERE c.id = clinical_kinematics_evaluations.client_id
            AND (c.user_id = auth.uid() OR auth.uid() IS NULL)
        )
    );

-- Ekleme Politikası
CREATE POLICY "Klinisyen değerlendirme ekleyebilir"
    ON public.clinical_kinematics_evaluations
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.clients c
            WHERE c.id = clinical_kinematics_evaluations.client_id
            AND (c.user_id = auth.uid() OR auth.uid() IS NULL)
        )
    );

-- Güncelleme Politikası
CREATE POLICY "Klinisyen değerlendirmeyi güncelleyebilir"
    ON public.clinical_kinematics_evaluations
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.clients c
            WHERE c.id = clinical_kinematics_evaluations.client_id
            AND (c.user_id = auth.uid() OR auth.uid() IS NULL)
        )
    );

-- Silme Politikası
CREATE POLICY "Klinisyen değerlendirmeyi silebilir"
    ON public.clinical_kinematics_evaluations
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.clients c
            WHERE c.id = clinical_kinematics_evaluations.client_id
            AND (c.user_id = auth.uid() OR auth.uid() IS NULL)
        )
    );
