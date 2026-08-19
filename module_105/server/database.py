"""
Modül 105 – Veritabanı Katmanı (SQLite + Supabase)
====================================================
Motor Konuşma Bozuklukları (Motor Speech Disorders) için
Hayden (1986) Hiyerarşisi tabanlı klinik ölçüm veritabanı.

Tasarım kararları:
  ─ SQLite: yerel prototip / geliştirme (korunur, kaldırılmaz)
  ─ Supabase (PostgreSQL): üretim hedefi — ESP32 canlı veri alımı
  ─ SupabaseClient: httpx async REST üzerinden çalışır.
    Service Role Key ile RLS bypass edilir (sunucu taraflı).
  ─ m105_sessions + m105_raw_packets: migration scriptiyle oluşturulan
    yeni tablolar (supabase_m105_migration.sql).
  ─ JSONB: tüm Hayden metrikleri, Z-skorlar ve sensör paketleri.
  ─ Norm verileri: Duffy (2013), Yorkston et al. (2010),
    Kent (2004) referanslı, yaş-cinsiyet matrisli.
"""

import json
import os
import sqlite3
import sys
from datetime import date, datetime
from pathlib import Path
from typing import Any, Optional

# .env dosyasından Supabase kimlik bilgilerini yükle
try:
    from dotenv import load_dotenv
    _env_path = Path(__file__).parent / ".env"
    load_dotenv(dotenv_path=_env_path)
except ImportError:
    pass  # python-dotenv kurulu değilse env değişkenleri doğrudan okunur

# ─────────────────────────────────────────────────────
# Veritabanı konumu: module_105/ altında
# ─────────────────────────────────────────────────────
DB_PATH = Path(__file__).parent.parent / "motor_speech_m105.db"


# ─────────────────────────────────────────────────────
# Şema DDL
# ─────────────────────────────────────────────────────

SCHEMA_SQL = """
-- ============================================================
-- MODÜL 105 – MOTOR KONUŞMA BOZUKLUKLARI
-- SQLite Şeması  |  Hayden (1986) Hiyerarşisi
-- ============================================================

PRAGMA journal_mode = WAL;   -- Eşzamanlı okuma/yazma için
PRAGMA foreign_keys = ON;    -- FK zorunluluğu (SQLite varsayılan kapalı)
PRAGMA synchronous = NORMAL; -- Düşük gecikme + güvenli

-- ──────────────────────────────────────────────────────────
-- 1. DANISANLAR
-- Crocodil'deki `clients` tablosuyla UUID bazında eşleşir.
-- crocodil_client_id → Supabase geçişinde doğrudan FK olur.
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Danisanlar (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    crocodil_client_id  TEXT UNIQUE,        -- Supabase clients.id (UUID)

    -- Kimlik
    ad                  TEXT NOT NULL,
    soyad               TEXT NOT NULL,
    dogum_tarihi        TEXT NOT NULL,      -- ISO 8601: YYYY-MM-DD
    cinsiyet            TEXT CHECK(cinsiyet IN ('erkek','kadın','belirtilmemiş'))
                                DEFAULT 'belirtilmemiş',
    dominant_el         TEXT CHECK(dominant_el IN ('sağ','sol','çift'))
                                DEFAULT 'sağ',

    -- Motor konuşma bozukluğu demografisi
    birincil_tani       TEXT,               -- "dizartri","apraksi","mix","belirsiz"
    altta_yatan_etiyoloji TEXT,             -- "ALS","MS","SVO","PD","TBI","idiopatik" vb.
    bozukluk_suresi_ay  INTEGER,            -- Tanıdan bu yana ay

    -- İletişim (rapor çıktısı için)
    ebeveyn_ad          TEXT,
    telefon             TEXT,

    durum               TEXT CHECK(durum IN ('aktif','pasif','tamamlandı'))
                                DEFAULT 'aktif',
    notlar              TEXT,
    olusturulma_tarihi  TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%S','now')),
    guncelleme_tarihi   TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%S','now'))
);

-- ──────────────────────────────────────────────────────────
-- 2. SEANSLAR
-- Crocodil'deki `therapy_sessions` ile paralel yapı.
-- Her seans bir Modül 105 ölçüm oturumunu temsil eder.
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Seanslar (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    danisan_id          INTEGER NOT NULL
                            REFERENCES Danisanlar(id) ON DELETE CASCADE,
    crocodil_session_id TEXT,               -- Supabase therapy_sessions.id (UUID)

    seans_tarihi        TEXT NOT NULL,      -- ISO 8601
    seans_no            INTEGER NOT NULL,
    sure_dakika         INTEGER DEFAULT 45,
    mod                 TEXT CHECK(mod IN ('klinik','ev','online','hastane'))
                                DEFAULT 'klinik',
    klinisyen_notu      TEXT,

    -- Motor konuşma seans tipi
    seans_amaci         TEXT CHECK(seans_amaci IN (
                            'baseline_olcum',
                            'ara_degerlendirme',
                            'taburculuk_degerlendirmesi',
                            'arastirma'
                        )) DEFAULT 'baseline_olcum',

    -- Genel klinik impression (Modül 105 öncesi klinisyen izlenimi)
    genel_anlasılırlık_pct  REAL,           -- 0-100 (klinisyen tahmini)
    konusma_hizi_spm        REAL,           -- saniyede hece (syllables/min)

    olusturulma_tarihi  TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%S','now'))
);

-- ──────────────────────────────────────────────────────────
-- 3. HİYERARŞİ_ÖLÇÜMLERİ
-- Hayden (1986)'ın 7 basamağına karşılık gelen,
-- sensörlerden ham alınan ve işlenmiş metrikleri tutar.
--
-- JSON stratejisi: Her basamağın metrikleri JSON sütununda
-- saklanır. Bu, ESP32'nin ileride göndereceği yeni
-- alanlar için şema değişikliği gerektirmez ve
-- Supabase JSONB'ye doğrudan migrate edilir.
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Hiyerarsi_Olcumleri (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    seans_id            INTEGER NOT NULL
                            REFERENCES Seanslar(id) ON DELETE CASCADE,

    -- Hayden (1986) Basamağı
    hayden_seviye       INTEGER NOT NULL CHECK(hayden_seviye BETWEEN 1 AND 7),
    hayden_adi          TEXT NOT NULL,
    -- 1=Respirasyon, 2=Fonasyon, 3=Rezonans, 4=Artikülasyon
    -- 5=Prozodi, 6=Hız/Ritim, 7=Bütünleşim

    -- ── L1: Respirasyon ──────────────────────────────────
    -- Piezo sensör + IMU
    l1_solunum_hizi_bpm     REAL,           -- solunum/dak
    l1_ic_suresi_sn         REAL,           -- ortalama inhale süresi
    l1_dis_suresi_sn        REAL,           -- ortalama exhale süresi
    l1_ic_dis_orani         REAL,           -- I:E oranı
    l1_solunum_amplitud     REAL,           -- peak-to-peak dalga formu
    l1_subglottik_basinc_proxy REAL,        -- sEMG + solunum proxy (cmH₂O tahmini)

    -- ── L2: Fonasyon ─────────────────────────────────────
    -- INMP441 mikrofon
    l2_maks_fonasyon_suresi_sn REAL,        -- MPT (Maximum Phonation Time)
    l2_f0_hz                REAL,           -- Temel frekans (Hz)
    l2_f0_range_hz          REAL,           -- F0 aralığı (max-min)
    l2_jitter_pct           REAL,           -- Jitter (%)
    l2_shimmer_pct          REAL,           -- Shimmer (%)
    l2_hnr_db               REAL,           -- Harmonics-to-Noise Ratio (dB)
    l2_rms_db               REAL,           -- Ortalama ses şiddeti (dBFS)
    l2_sesli_segment_pct    REAL,           -- Sesli segment yüzdesi

    -- ── L3: Rezonans ─────────────────────────────────────
    -- Mikrofon + IMU (velofarengeal)
    l3_hipernasal_indeks    REAL,           -- 0-1 (FFT bazlı burun rezonansı proxy)
    l3_nazal_rms_orani      REAL,           -- Burun/ağız ses şiddeti oranı
    l3_f1_hz                REAL,           -- Formant 1 (vowel quality proxy)
    l3_f2_hz                REAL,           -- Formant 2

    -- ── L4: Artikülasyon ─────────────────────────────────
    -- IMU (çene) + sEMG (masseter) + Mikrofon
    l4_cene_acisi_ort_deg   REAL,           -- Ortalama çene açısı (derece)
    l4_cene_acisi_max_deg   REAL,           -- Maksimum çene açısı
    l4_cene_acisi_range_deg REAL,           -- Range of motion
    l4_semg_sol_rms_uv      REAL,           -- Sol masseter RMS (µV)
    l4_semg_sag_rms_uv      REAL,           -- Sağ masseter RMS (µV)
    l4_semg_asimetri_pct    REAL,           -- Masseter asimetrisi (%)
    l4_ddk_hz               REAL,           -- Diadokokinezi hızı (tekrar/sn)
    l4_ddk_duzenlilik_cv    REAL,           -- DDK düzenlilik (CV = std/mean)
    l4_anlasılırlık_pct     REAL,           -- Klinisyen puanlı anlasılırlık (%)

    -- ── L5: Prozodi ──────────────────────────────────────
    -- Mikrofon
    l5_f0_sapma_std_hz      REAL,           -- F0 varyasyon (prozodik zenginlik)
    l5_enerji_sapma_db      REAL,           -- Enerji varyasyonu (vurgulama)
    l5_hece_suresi_cv       REAL,           -- Hece süresi tutarsızlığı
    l5_durak_orani_pct      REAL,           -- Durakların konuşmaya oranı

    -- ── L6: Hız/Ritim ────────────────────────────────────
    -- Mikrofon + IMU
    l6_konusma_hizi_spm     REAL,           -- Konuşma hızı (syllable/min)
    l6_artikulasyon_hizi_spm REAL,          -- Yalnızca sesli segment hızı
    l6_hece_suresi_ort_ms   REAL,           -- Ortalama hece süresi (ms)
    l6_ritim_tutarlilik_cv  REAL,           -- Ritim tutarlılığı (CV)

    -- ── L7: Bütünleşim ───────────────────────────────────
    -- Tüm kanalların eş-zamanlı senkronizasyonu
    l7_motor_senkroni_indeks REAL,          -- IMU↔sEMG↔Mikrofon faz uyumu (0-1)
    l7_genel_siddet         TEXT CHECK(l7_genel_siddet IN
                                ('normal','hafif','orta','ağır','çok-ağır')),
    l7_yorumlanmis_etki     TEXT,           -- Klinisyen yorumu (serbest metin)

    -- ── Ham Sensör Verileri (arşiv) ──────────────────────
    -- Sinyal işleme sonrası filtre edilmiş özetler
    -- (ham 100Hz veri ayrı bir zaman serisi tablosunda)
    ham_imu_ozet_json       TEXT,           -- {pitch_mean, roll_std, yaw_range, …}
    ham_semg_ozet_json      TEXT,           -- {left_rms, right_rms, peak_uv, …}
    ham_resp_ozet_json      TEXT,           -- {rate_bpm, amplitude, ie_ratio, …}
    ham_mic_ozet_json       TEXT,           -- {f0_mean, jitter, shimmer, hnr, …}

    -- ── Z-Score Analizi ──────────────────────────────────
    zscore_sonuclar_json    TEXT,           -- {l1_solunum_z: -1.2, l4_ddk_z: -3.1, …}

    -- Meta
    olcum_suresi_sn         INTEGER,        -- Bu basamak için toplam ölçüm süresi
    veri_kalitesi_skoru     REAL,           -- 0-1 (sinyal kalitesi, gürültü kontrolü)
    notlar                  TEXT,
    olusturulma_tarihi      TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%S','now'))
);

-- ──────────────────────────────────────────────────────────
-- 3b. HAM_SENSOR_VERILERI (Zaman serisi)
-- 100 Hz'de gelen her paketi arşivler. Gerçek ESP32 veya
-- Mock Generator'dan gelen tüm anlık ölçümler burada tutulur.
-- Üretim ortamında bu tablo TimescaleDB'ye (PostgreSQL) taşınır.
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Ham_Sensor_Verileri (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    seans_id            INTEGER NOT NULL
                            REFERENCES Seanslar(id) ON DELETE CASCADE,
    hayden_seviye       INTEGER CHECK(hayden_seviye BETWEEN 1 AND 7),
    oturum_fazı         TEXT,               -- "istirahat"|"görev"|"toparlanma"

    -- Zaman damgası (ESP32'den gelen unix ms)
    timestamp_ms        INTEGER NOT NULL,

    -- IMU (MPU6050)
    imu_pitch_deg       REAL,
    imu_roll_deg        REAL,
    imu_yaw_deg         REAL,
    imu_accel_x         REAL,
    imu_accel_y         REAL,
    imu_accel_z         REAL,

    -- sEMG (AD8232)
    semg_sol_uv         REAL,
    semg_sag_uv         REAL,
    semg_asimetri_pct   REAL,

    -- Solunum (Piezo)
    resp_dalga          REAL,               -- -1..1
    resp_bpm            REAL,

    -- Mikrofon (INMP441)
    mic_rms_db          REAL,
    mic_f0_hz           REAL,
    mic_sesli            INTEGER,           -- 0 veya 1 (boolean)

    -- İşlenmiş (Python tarafından eklenir, ESP32 göndermez)
    kalman_pitch_deg    REAL,
    bandpass_semg_uv    REAL,
    fft_dominant_hz     REAL
);

-- Ham veri için zaman bazlı sorgulama indexi
CREATE INDEX IF NOT EXISTS idx_ham_sensor_timestamp
    ON Ham_Sensor_Verileri(seans_id, timestamp_ms);

CREATE INDEX IF NOT EXISTS idx_ham_sensor_seans_hayden
    ON Ham_Sensor_Verileri(seans_id, hayden_seviye);

-- ──────────────────────────────────────────────────────────
-- 4. NORM_DEGERLERİ
-- Z-score hesaplamasında kullanılan referans baseline değerleri.
-- Kaynaklar:
--   • Duffy, J.R. (2013). Motor Speech Disorders (3rd ed.)
--   • Yorkston et al. (2010). Management of Motor Speech Disorders
--   • Kent, R.D. (2004). The MIT Encyclopedia of Communication Disorders
--   • CAPE-V / CSL normatif veri tabloları
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Norm_Degerleri (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    metrik_adi          TEXT NOT NULL,      -- "l4_ddk_hz", "l2_mpt_sn" vb.
    metrik_etiketi      TEXT NOT NULL,      -- İnsan-okunabilir ad

    -- Demografik filtreler
    yas_alt             INTEGER NOT NULL,   -- yaş aralığı alt sınır
    yas_ust             INTEGER NOT NULL,   -- yaş aralığı üst sınır
    cinsiyet            TEXT DEFAULT 'ortak' CHECK(cinsiyet IN ('erkek','kadın','ortak')),

    -- Normatif istatistikler (sağlıklı popülasyon)
    ortalama            REAL NOT NULL,
    std_sapma           REAL NOT NULL,
    p5                  REAL,               -- 5. yüzdelik (alt normal sınır)
    p25                 REAL,               -- 25. yüzdelik
    p50                 REAL,               -- Medyan
    p75                 REAL,               -- 75. yüzdelik
    p95                 REAL,               -- 95. yüzdelik (üst normal sınır)

    -- Klinik kesim puanları (motor konuşma bozukluğu eşiği)
    klinik_esik_alt     REAL,               -- Bu altında bozukluk şüphesi
    klinik_esik_ust     REAL,               -- Bu üstünde bozukluk şüphesi (varsa)

    -- Meta
    birim               TEXT,               -- "Hz", "µV", "sn", "bpm", "%", "dB"
    kaynak              TEXT,               -- Referans: "Duffy 2013 Tablo X"
    hayden_seviye       INTEGER CHECK(hayden_seviye BETWEEN 1 AND 7),
    notlar              TEXT,
    olusturulma_tarihi  TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%S','now')),

    UNIQUE(metrik_adi, yas_alt, yas_ust, cinsiyet)
);

-- ──────────────────────────────────────────────────────────
-- Performans indexleri
-- ──────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_danisanlar_crocodil_id
    ON Danisanlar(crocodil_client_id);

CREATE INDEX IF NOT EXISTS idx_seanslar_danisan
    ON Seanslar(danisan_id, seans_tarihi);

CREATE INDEX IF NOT EXISTS idx_olcumler_seans_hayden
    ON Hiyerarsi_Olcumleri(seans_id, hayden_seviye);

CREATE INDEX IF NOT EXISTS idx_norm_metrik_yas_cinsiyet
    ON Norm_Degerleri(metrik_adi, yas_alt, yas_ust, cinsiyet);
"""


# ─────────────────────────────────────────────────────
# Normatif veri yükleme (seed)
# ─────────────────────────────────────────────────────

NORM_SEED_DATA = [
    # ── L1: Respirasyon ──────────────────────────────
    {
        "metrik_adi": "l1_solunum_hizi_bpm", "metrik_etiketi": "Solunum Hızı",
        "yas_alt": 18, "yas_ust": 65, "cinsiyet": "ortak",
        "ortalama": 14.0, "std_sapma": 2.5, "p5": 10.0, "p25": 12.0,
        "p50": 14.0, "p75": 16.0, "p95": 20.0,
        "klinik_esik_alt": 8.0, "klinik_esik_ust": 25.0,
        "birim": "bpm", "kaynak": "West & Hicks 2012", "hayden_seviye": 1,
        "notlar": "İstirahat solunumu. Konuşma sırasında 10-14 bpm beklenir."
    },
    {
        "metrik_adi": "l1_ic_dis_orani", "metrik_etiketi": "İnhale:Exhale Oranı",
        "yas_alt": 18, "yas_ust": 65, "cinsiyet": "ortak",
        "ortalama": 0.40, "std_sapma": 0.05, "p5": 0.30, "p25": 0.36,
        "p50": 0.40, "p75": 0.44, "p95": 0.50,
        "klinik_esik_alt": 0.25, "klinik_esik_ust": 0.60,
        "birim": "oran", "kaynak": "Duffy 2013, s.21", "hayden_seviye": 1,
        "notlar": "Normal konuşmada inhale:exhale ~1:2.5. Dizartride bozulur."
    },

    # ── L2: Fonasyon ─────────────────────────────────
    {
        "metrik_adi": "l2_maks_fonasyon_suresi_sn", "metrik_etiketi": "Maks. Fonasyon Süresi (MPT)",
        "yas_alt": 18, "yas_ust": 65, "cinsiyet": "erkek",
        "ortalama": 25.0, "std_sapma": 7.0, "p5": 14.0, "p25": 20.0,
        "p50": 25.0, "p75": 30.0, "p95": 40.0,
        "klinik_esik_alt": 10.0, "klinik_esik_ust": None,
        "birim": "sn", "kaynak": "Kent 2004, Tablo 3.2", "hayden_seviye": 2,
        "notlar": "Erkek. Dizartride genellikle <10sn klinik eşik."
    },
    {
        "metrik_adi": "l2_maks_fonasyon_suresi_sn", "metrik_etiketi": "Maks. Fonasyon Süresi (MPT)",
        "yas_alt": 18, "yas_ust": 65, "cinsiyet": "kadın",
        "ortalama": 20.0, "std_sapma": 5.0, "p5": 12.0, "p25": 16.0,
        "p50": 20.0, "p75": 24.0, "p95": 30.0,
        "klinik_esik_alt": 8.0, "klinik_esik_ust": None,
        "birim": "sn", "kaynak": "Kent 2004, Tablo 3.2", "hayden_seviye": 2,
        "notlar": "Kadın. <8sn klinik eşik."
    },
    {
        "metrik_adi": "l2_f0_hz", "metrik_etiketi": "Temel Frekans (F0)",
        "yas_alt": 18, "yas_ust": 65, "cinsiyet": "erkek",
        "ortalama": 120.0, "std_sapma": 20.0, "p5": 85.0, "p25": 105.0,
        "p50": 120.0, "p75": 140.0, "p95": 165.0,
        "klinik_esik_alt": 70.0, "klinik_esik_ust": 200.0,
        "birim": "Hz", "kaynak": "CAPE-V normları, ASHA 2006", "hayden_seviye": 2,
        "notlar": "Yetişkin erkek ortalama F0."
    },
    {
        "metrik_adi": "l2_f0_hz", "metrik_etiketi": "Temel Frekans (F0)",
        "yas_alt": 18, "yas_ust": 65, "cinsiyet": "kadın",
        "ortalama": 210.0, "std_sapma": 25.0, "p5": 165.0, "p25": 192.0,
        "p50": 210.0, "p75": 228.0, "p95": 255.0,
        "klinik_esik_alt": 140.0, "klinik_esik_ust": 300.0,
        "birim": "Hz", "kaynak": "CAPE-V normları, ASHA 2006", "hayden_seviye": 2,
        "notlar": "Yetişkin kadın ortalama F0."
    },
    {
        "metrik_adi": "l2_jitter_pct", "metrik_etiketi": "Jitter",
        "yas_alt": 18, "yas_ust": 65, "cinsiyet": "ortak",
        "ortalama": 0.45, "std_sapma": 0.25, "p5": 0.10, "p25": 0.25,
        "p50": 0.45, "p75": 0.65, "p95": 1.04,
        "klinik_esik_alt": None, "klinik_esik_ust": 1.04,
        "birim": "%", "kaynak": "CSL normları / Hirano 1981", "hayden_seviye": 2,
        "notlar": ">1.04% patolojik kabul edilir."
    },
    {
        "metrik_adi": "l2_shimmer_pct", "metrik_etiketi": "Shimmer",
        "yas_alt": 18, "yas_ust": 65, "cinsiyet": "ortak",
        "ortalama": 2.50, "std_sapma": 1.20, "p5": 0.80, "p25": 1.60,
        "p50": 2.50, "p75": 3.40, "p95": 4.64,
        "klinik_esik_alt": None, "klinik_esik_ust": 3.81,
        "birim": "%", "kaynak": "CSL normları", "hayden_seviye": 2,
        "notlar": ">3.81% patolojik. Dizartride sık yükselir."
    },
    {
        "metrik_adi": "l2_hnr_db", "metrik_etiketi": "Harmonik-Gürültü Oranı (HNR)",
        "yas_alt": 18, "yas_ust": 65, "cinsiyet": "ortak",
        "ortalama": 20.0, "std_sapma": 4.0, "p5": 13.0, "p25": 17.0,
        "p50": 20.0, "p75": 23.0, "p95": 27.0,
        "klinik_esik_alt": 12.0, "klinik_esik_ust": None,
        "birim": "dB", "kaynak": "Boersma 1993 / Praat normları", "hayden_seviye": 2,
        "notlar": "<12 dB patolojik. Flasid dizartride belirgin düşer."
    },

    # ── L4: Artikülasyon ─────────────────────────────
    {
        "metrik_adi": "l4_ddk_hz", "metrik_etiketi": "Diadokokinezi Hızı",
        "yas_alt": 18, "yas_ust": 65, "cinsiyet": "erkek",
        "ortalama": 6.2, "std_sapma": 0.8, "p5": 4.9, "p25": 5.6,
        "p50": 6.2, "p75": 6.8, "p95": 7.5,
        "klinik_esik_alt": 4.5, "klinik_esik_ust": None,
        "birim": "tekrar/sn", "kaynak": "Fletcher 1972; Duffy 2013 s.94", "hayden_seviye": 4,
        "notlar": "pa/ta/ka tekrar hızı. <4.5/sn dizartri şüphesi."
    },
    {
        "metrik_adi": "l4_ddk_hz", "metrik_etiketi": "Diadokokinezi Hızı",
        "yas_alt": 18, "yas_ust": 65, "cinsiyet": "kadın",
        "ortalama": 6.5, "std_sapma": 0.9, "p5": 5.0, "p25": 5.8,
        "p50": 6.5, "p75": 7.2, "p95": 8.0,
        "klinik_esik_alt": 4.5, "klinik_esik_ust": None,
        "birim": "tekrar/sn", "kaynak": "Fletcher 1972; Duffy 2013 s.94", "hayden_seviye": 4,
        "notlar": "Kadın normları erkekten hafif yüksek."
    },
    {
        "metrik_adi": "l4_ddk_duzenlilik_cv", "metrik_etiketi": "DDK Düzenlilik (CV)",
        "yas_alt": 18, "yas_ust": 65, "cinsiyet": "ortak",
        "ortalama": 0.05, "std_sapma": 0.02, "p5": 0.02, "p25": 0.04,
        "p50": 0.05, "p75": 0.07, "p95": 0.10,
        "klinik_esik_alt": None, "klinik_esik_ust": 0.12,
        "birim": "oran(CV)", "kaynak": "McHenry 2003", "hayden_seviye": 4,
        "notlar": "Varyasyon katsayısı. >0.12 apraksi/ataksik dizartri işareti."
    },
    {
        "metrik_adi": "l4_cene_acisi_max_deg", "metrik_etiketi": "Maks. Çene Açısı",
        "yas_alt": 18, "yas_ust": 65, "cinsiyet": "ortak",
        "ortalama": 35.0, "std_sapma": 8.0, "p5": 22.0, "p25": 29.0,
        "p50": 35.0, "p75": 41.0, "p95": 49.0,
        "klinik_esik_alt": 15.0, "klinik_esik_ust": None,
        "birim": "derece", "kaynak": "IMU proxy kalibrasyon - literatür beklentisi", "hayden_seviye": 4,
        "notlar": "MPU6050 pitch ölçümü proxy. Gerçek TMJ ROM için radyolojik onay gerekir."
    },
    {
        "metrik_adi": "l4_semg_asimetri_pct", "metrik_etiketi": "Masseter Asimetrisi",
        "yas_alt": 18, "yas_ust": 65, "cinsiyet": "ortak",
        "ortalama": 8.0, "std_sapma": 5.0, "p5": 1.0, "p25": 4.0,
        "p50": 8.0, "p75": 13.0, "p95": 20.0,
        "klinik_esik_alt": None, "klinik_esik_ust": 25.0,
        "birim": "%", "kaynak": "Ferrario et al. 2000", "hayden_seviye": 4,
        "notlar": ">25% belirgin asimetri. Unilateral dizartride yükselir."
    },

    # ── L5: Prozodi ──────────────────────────────────
    {
        "metrik_adi": "l5_f0_sapma_std_hz", "metrik_etiketi": "F0 Standart Sapması (Prozodik Zenginlik)",
        "yas_alt": 18, "yas_ust": 65, "cinsiyet": "ortak",
        "ortalama": 25.0, "std_sapma": 8.0, "p5": 12.0, "p25": 18.0,
        "p50": 25.0, "p75": 32.0, "p95": 42.0,
        "klinik_esik_alt": 8.0, "klinik_esik_ust": None,
        "birim": "Hz", "kaynak": "Patel et al. 2013", "hayden_seviye": 5,
        "notlar": "Düşük F0 varyasyonu = monoton konuşma (PD, flasid dizartri)."
    },

    # ── L6: Hız/Ritim ────────────────────────────────
    {
        "metrik_adi": "l6_konusma_hizi_spm", "metrik_etiketi": "Konuşma Hızı",
        "yas_alt": 18, "yas_ust": 65, "cinsiyet": "ortak",
        "ortalama": 230.0, "std_sapma": 40.0, "p5": 155.0, "p25": 200.0,
        "p50": 230.0, "p75": 265.0, "p95": 310.0,
        "klinik_esik_alt": 100.0, "klinik_esik_ust": None,
        "birim": "hece/dak", "kaynak": "Yorkston et al. 2010, Tablo A-1", "hayden_seviye": 6,
        "notlar": "<100 hece/dak fonksiyonel konuşmayı olumsuz etkiler."
    },
    {
        "metrik_adi": "l6_ritim_tutarlilik_cv", "metrik_etiketi": "Ritim Tutarlılığı (CV)",
        "yas_alt": 18, "yas_ust": 65, "cinsiyet": "ortak",
        "ortalama": 0.15, "std_sapma": 0.06, "p5": 0.06, "p25": 0.10,
        "p50": 0.15, "p75": 0.20, "p95": 0.28,
        "klinik_esik_alt": None, "klinik_esik_ust": 0.35,
        "birim": "oran(CV)", "kaynak": "Lowit & Kent 2011", "hayden_seviye": 6,
        "notlar": ">0.35 CV artmış ritmik tutarsızlık = ataksik/hiperkinetik dizartri."
    },

    # ── Çocuk normları (5-12 yaş) ────────────────────
    {
        "metrik_adi": "l4_ddk_hz", "metrik_etiketi": "Diadokokinezi Hızı (Çocuk)",
        "yas_alt": 5, "yas_ust": 12, "cinsiyet": "ortak",
        "ortalama": 4.5, "std_sapma": 0.7, "p5": 3.3, "p25": 4.0,
        "p50": 4.5, "p75": 5.0, "p95": 5.7,
        "klinik_esik_alt": 3.0, "klinik_esik_ust": None,
        "birim": "tekrar/sn", "kaynak": "Robbins & Klee 1987", "hayden_seviye": 4,
        "notlar": "5-12 yaş çocuk DDK normları. Serebral palsi değerlendirmesinde kullanılır."
    },
    {
        "metrik_adi": "l6_konusma_hizi_spm", "metrik_etiketi": "Konuşma Hızı (Çocuk)",
        "yas_alt": 5, "yas_ust": 12, "cinsiyet": "ortak",
        "ortalama": 165.0, "std_sapma": 35.0, "p5": 100.0, "p25": 140.0,
        "p50": 165.0, "p75": 190.0, "p95": 225.0,
        "klinik_esik_alt": 70.0, "klinik_esik_ust": None,
        "birim": "hece/dak", "kaynak": "Sturm & Seery 2007", "hayden_seviye": 6,
        "notlar": "5-12 yaş çocuk konuşma hızı normları."
    },
]


# ─────────────────────────────────────────────────────
# Veritabanı yönetimi
# ─────────────────────────────────────────────────────

def get_connection(db_path: Path = DB_PATH) -> sqlite3.Connection:
    """Thread-safe SQLite bağlantısı döner."""
    conn = sqlite3.connect(str(db_path), check_same_thread=False)
    conn.row_factory = sqlite3.Row  # Sözlük benzeri erişim
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    return conn


def init_db(db_path: Path = DB_PATH) -> sqlite3.Connection:
    """Veritabanını başlat: tabloları oluştur, norm verilerini yükle."""
    conn = get_connection(db_path)
    conn.executescript(SCHEMA_SQL)
    conn.commit()
    _seed_norm_data(conn)
    return conn


def _seed_norm_data(conn: sqlite3.Connection):
    """Normatif verileri idempotent olarak ekle (zaten varsa atla)."""
    inserted = 0
    skipped  = 0
    for row in NORM_SEED_DATA:
        try:
            conn.execute("""
                INSERT OR IGNORE INTO Norm_Degerleri
                    (metrik_adi, metrik_etiketi, yas_alt, yas_ust, cinsiyet,
                     ortalama, std_sapma, p5, p25, p50, p75, p95,
                     klinik_esik_alt, klinik_esik_ust,
                     birim, kaynak, hayden_seviye, notlar)
                VALUES
                    (:metrik_adi, :metrik_etiketi, :yas_alt, :yas_ust, :cinsiyet,
                     :ortalama, :std_sapma, :p5, :p25, :p50, :p75, :p95,
                     :klinik_esik_alt, :klinik_esik_ust,
                     :birim, :kaynak, :hayden_seviye, :notlar)
            """, row)
            if conn.execute("SELECT changes()").fetchone()[0] > 0:
                inserted += 1
            else:
                skipped += 1
        except sqlite3.Error as e:
            print(f"  [UYARI] Norm seed hatası: {e} | Satır: {row['metrik_adi']}")
    conn.commit()
    return inserted, skipped


# ─────────────────────────────────────────────────────
# CRUD yardımcıları
# ─────────────────────────────────────────────────────

def ekle_danisan(conn: sqlite3.Connection, **kwargs) -> int:
    """Yeni danışan ekle, id döner."""
    cur = conn.execute("""
        INSERT INTO Danisanlar
            (crocodil_client_id, ad, soyad, dogum_tarihi, cinsiyet,
             dominant_el, birincil_tani, altta_yatan_etiyoloji,
             bozukluk_suresi_ay, ebeveyn_ad, telefon, notlar)
        VALUES
            (:crocodil_client_id, :ad, :soyad, :dogum_tarihi, :cinsiyet,
             :dominant_el, :birincil_tani, :altta_yatan_etiyoloji,
             :bozukluk_suresi_ay, :ebeveyn_ad, :telefon, :notlar)
    """, {k: kwargs.get(k) for k in [
        "crocodil_client_id","ad","soyad","dogum_tarihi","cinsiyet",
        "dominant_el","birincil_tani","altta_yatan_etiyoloji",
        "bozukluk_suresi_ay","ebeveyn_ad","telefon","notlar"
    ]})
    conn.commit()
    return cur.lastrowid


def ekle_seans(conn: sqlite3.Connection, **kwargs) -> int:
    """Yeni ölçüm seansı ekle, id döner."""
    cur = conn.execute("""
        INSERT INTO Seanslar
            (danisan_id, crocodil_session_id, seans_tarihi, seans_no,
             sure_dakika, mod, klinisyen_notu, seans_amaci,
             genel_anlasılırlık_pct, konusma_hizi_spm)
        VALUES
            (:danisan_id, :crocodil_session_id, :seans_tarihi, :seans_no,
             :sure_dakika, :mod, :klinisyen_notu, :seans_amaci,
             :genel_anlasılırlık_pct, :konusma_hizi_spm)
    """, {k: kwargs.get(k) for k in [
        "danisan_id","crocodil_session_id","seans_tarihi","seans_no",
        "sure_dakika","mod","klinisyen_notu","seans_amaci",
        "genel_anlasılırlık_pct","konusma_hizi_spm"
    ]})
    conn.commit()
    return cur.lastrowid


def ekle_olcum(conn: sqlite3.Connection, seans_id: int, hayden_seviye: int, **metrics) -> int:
    """Hiyerarşi ölçümü ekle. metrics dict → ilgili kolonlara."""
    HAYDEN_ADLARI = {
        1: "Respirasyon", 2: "Fonasyon", 3: "Rezonans", 4: "Artikülasyon",
        5: "Prozodi",     6: "Hız/Ritim", 7: "Bütünleşim",
    }
    # JSON sütunlarını ayrıştır
    ham_fields = {k: metrics.pop(k) for k in [
        "ham_imu_ozet_json","ham_semg_ozet_json",
        "ham_resp_ozet_json","ham_mic_ozet_json","zscore_sonuclar_json"
    ] if k in metrics}

    for k, v in ham_fields.items():
        if isinstance(v, dict):
            metrics[k] = json.dumps(v, ensure_ascii=False)
        else:
            metrics[k] = v

    metrics["seans_id"]       = seans_id
    metrics["hayden_seviye"]  = hayden_seviye
    metrics["hayden_adi"]     = HAYDEN_ADLARI.get(hayden_seviye, "Bilinmiyor")

    # Dinamik INSERT (yalnızca sağlanan alanlar)
    cols   = ", ".join(metrics.keys())
    places = ", ".join(f":{k}" for k in metrics.keys())
    cur = conn.execute(
        f"INSERT INTO Hiyerarsi_Olcumleri ({cols}) VALUES ({places})",
        metrics
    )
    conn.commit()
    return cur.lastrowid


def hesapla_zscore(conn: sqlite3.Connection, metrik_adi: str,
                   deger: float, yas: int, cinsiyet: str) -> Optional[float]:
    """
    Verilen metrik için Z-score hesapla.
    Önce cinsiyete özgü norm ara; bulamazsa 'ortak' normları kullan.
    """
    for cins in (cinsiyet, "ortak"):
        row = conn.execute("""
            SELECT ortalama, std_sapma FROM Norm_Degerleri
            WHERE metrik_adi = ?
              AND yas_alt <= ? AND yas_ust >= ?
              AND cinsiyet = ?
            ORDER BY ABS(yas_ust - yas_alt) ASC
            LIMIT 1
        """, (metrik_adi, yas, yas, cins)).fetchone()
        if row:
            mu, sigma = row["ortalama"], row["std_sapma"]
            return round((deger - mu) / sigma, 3) if sigma > 0 else None
    return None


def toplu_zscore(conn: sqlite3.Connection, metrikler: dict[str, float],
                 yas: int, cinsiyet: str) -> dict[str, Optional[float]]:
    """Birden fazla metriğin Z-skorunu hesapla."""
    return {
        m: hesapla_zscore(conn, m, v, yas, cinsiyet)
        for m, v in metrikler.items()
    }


def ekle_ham_veri(conn: sqlite3.Connection, seans_id: int, paket: dict):
    """Mock Generator veya ESP32'den gelen tek paketi yaz."""
    conn.execute("""
        INSERT INTO Ham_Sensor_Verileri
            (seans_id, hayden_seviye, oturum_fazı, timestamp_ms,
             imu_pitch_deg, imu_roll_deg, imu_yaw_deg,
             imu_accel_x, imu_accel_y, imu_accel_z,
             semg_sol_uv, semg_sag_uv, semg_asimetri_pct,
             resp_dalga, resp_bpm, mic_rms_db, mic_f0_hz, mic_sesli)
        VALUES
            (:seans_id, :hayden_seviye, :oturum_fazi, :timestamp_ms,
             :imu_pitch_deg, :imu_roll_deg, :imu_yaw_deg,
             :imu_accel_x, :imu_accel_y, :imu_accel_z,
             :semg_sol_uv, :semg_sag_uv, :semg_asimetri_pct,
             :resp_dalga, :resp_bpm, :mic_rms_db, :mic_f0_hz, :mic_sesli)
    """, {
        "seans_id":          seans_id,
        "hayden_seviye":     paket.get("hayden_level"),
        "oturum_fazi":       paket.get("session_phase"),
        "timestamp_ms":      paket.get("timestamp_ms"),
        "imu_pitch_deg":     paket.get("imu_pitch_deg"),
        "imu_roll_deg":      paket.get("imu_roll_deg"),
        "imu_yaw_deg":       paket.get("imu_yaw_deg"),
        "imu_accel_x":       paket.get("imu_accel_x"),
        "imu_accel_y":       paket.get("imu_accel_y"),
        "imu_accel_z":       paket.get("imu_accel_z"),
        "semg_sol_uv":       paket.get("semg_left_uv"),
        "semg_sag_uv":       paket.get("semg_right_uv"),
        "semg_asimetri_pct": paket.get("semg_asymmetry_pct"),
        "resp_dalga":        paket.get("resp_waveform"),
        "resp_bpm":          paket.get("resp_rate_bpm"),
        "mic_rms_db":        paket.get("mic_rms_db"),
        "mic_f0_hz":         paket.get("mic_f0_hz"),
        "mic_sesli":         1 if paket.get("mic_voiced") else 0,
    })
    # NOT: batch insert için conn.commit() dışarıda çağrılır


# ─────────────────────────────────────────────────────
# Raporlama sorguları
# ─────────────────────────────────────────────────────

def seans_hiyerarsi_raporu(conn: sqlite3.Connection, seans_id: int) -> list[dict]:
    """Bir seansın tüm Hayden basamaklarını ve Z-skorlarını listele."""
    rows = conn.execute("""
        SELECT o.*, d.dogum_tarihi, d.cinsiyet, d.birincil_tani
        FROM Hiyerarsi_Olcumleri o
        JOIN Seanslar s ON s.id = o.seans_id
        JOIN Danisanlar d ON d.id = s.danisan_id
        WHERE o.seans_id = ?
        ORDER BY o.hayden_seviye
    """, (seans_id,)).fetchall()
    return [dict(r) for r in rows]


# ═════════════════════════════════════════════════════════════════════════════
# SUPABASE KATMANI — Büyük Göç (SQLite → PostgreSQL)
# ═════════════════════════════════════════════════════════════════════════════
#
# Bu bölüm SQLite'a dokunmaz. Paralel olarak Supabase'e yazar.
# Fiziksel ESP32 / MPU6050 / AD8232 / Piezo donanımı hazır olduğunda
# SQLite bölümü kaldırılabilir.
#
# Kullanım:
#   from database import SupabaseClient
#   import asyncio
#   client = SupabaseClient()
#   asyncio.run(client.save_session(...))
# ═════════════════════════════════════════════════════════════════════════════

try:
    import httpx as _httpx
    _HTTPX_AVAILABLE = True
except ImportError:
    _HTTPX_AVAILABLE = False
    print("[UYARI] httpx bulunamadı. 'pip install httpx' komutuyla yükleyin.")


class SupabaseClient:
    """
    Supabase REST API üzerinden m105_sessions ve m105_raw_packets tablolarına
    async olarak yazan istemci sınıfı.

    Service Role Key kullanır → RLS bypass → sunucu taraflı güvenli kullanım.
    """

    def __init__(self):
        self.url = os.getenv("SUPABASE_URL", "").rstrip("/")
        self.key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
        if not self.url or not self.key:
            raise EnvironmentError(
                "SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY "
                "ortam değişkenleri bulunamadı. "
                "module_105/server/.env dosyasını kontrol edin."
            )
        self.headers = {
            "apikey":        self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type":  "application/json",
            "Prefer":        "return=representation",
        }

    def _rest_url(self, table: str) -> str:
        return f"{self.url}/rest/v1/{table}"

    # ── Bağlantı testi ───────────────────────────────────────────────────────
    async def test_connection(self) -> dict:
        """
        Supabase bağlantısını doğrula.
        m105_sessions tablosundan 1 satır çekmeye çalışır.
        Dönüş: {"ok": bool, "msg": str}
        """
        if not _HTTPX_AVAILABLE:
            return {"ok": False, "msg": "httpx kütüphanesi yüklü değil"}
        try:
            async with _httpx.AsyncClient(timeout=10.0) as client:
                r = await client.get(
                    self._rest_url("m105_sessions"),
                    headers={**self.headers, "Range": "0-0"},
                )
            if r.status_code in (200, 206):
                return {"ok": True, "msg": "Supabase bağlantısı başarılı"}
            return {"ok": False, "msg": f"HTTP {r.status_code}: {r.text[:200]}"}
        except Exception as e:
            return {"ok": False, "msg": str(e)}

    # ── Danışan getir (clients tablosundan) ─────────────────────────────────
    async def get_client(self, client_id: str) -> Optional[dict]:
        """
        Supabase clients tablosundan danışan bilgisini UUID ile çek.
        RLS bypass için service role key kullanılır.
        """
        if not _HTTPX_AVAILABLE:
            return None
        try:
            async with _httpx.AsyncClient(timeout=10.0) as http:
                r = await http.get(
                    self._rest_url("clients"),
                    headers=self.headers,
                    params={"id": f"eq.{client_id}", "select": "*", "limit": "1"},
                )
            if r.status_code == 200:
                data = r.json()
                return data[0] if data else None
            return None
        except Exception as e:
            print(f"[Supabase] get_client hatası: {e}")
            return None

    # ── Seans Kaydet ────────────────────────────────────────────────────────
    async def save_session(
        self,
        client_id: str,
        session_number: int,
        session_goal: str = "baseline_olcum",
        hayden_level: int = 4,
        klinisyen_notu: str = "",
        nihai_tani_etiketi: str = "",
        hierarchy_metrics: Optional[dict] = None,
        zscore_results: Optional[dict] = None,
        crocodil_payload: Optional[dict] = None,
        sqlite_session_id: Optional[int] = None,
    ) -> Optional[str]:
        """
        m105_sessions tablosuna yeni seans satırı ekler.
        Başarıda: oluşturulan kaydın UUID'sini döner.
        Başarısızlıkta: None döner (hata loglanır).
        """
        if not _HTTPX_AVAILABLE:
            print("[Supabase] httpx yüklü değil, seans kaydedilemedi")
            return None

        payload: dict[str, Any] = {
            "client_id":          client_id,
            "session_number":     session_number,
            "session_goal":       session_goal,
            "hayden_level":       hayden_level,
            "klinisyen_notu":     klinisyen_notu or None,
            "nihai_tani_etiketi": nihai_tani_etiketi or None,
            "hierarchy_metrics":  hierarchy_metrics or {},
            "zscore_results":     zscore_results or {},
            "crocodil_payload":   crocodil_payload or {},
        }
        if sqlite_session_id is not None:
            payload["sqlite_session_id"] = sqlite_session_id

        try:
            async with _httpx.AsyncClient(timeout=15.0) as http:
                r = await http.post(
                    self._rest_url("m105_sessions"),
                    headers=self.headers,
                    json=payload,
                )
            if r.status_code in (200, 201):
                data = r.json()
                session_uuid = data[0]["id"] if isinstance(data, list) else data.get("id")
                print(f"[Supabase] Seans kaydedildi → {session_uuid}")
                return session_uuid
            else:
                print(f"[Supabase] save_session hatası: HTTP {r.status_code} → {r.text[:300]}")
                return None
        except Exception as e:
            print(f"[Supabase] save_session exception: {e}")
            return None

    # ── Seans Güncelle (etiket ekleme) ────────────────────────────────────
    async def update_session_label(
        self,
        session_uuid: str,
        klinisyen_notu: str = "",
        nihai_tani_etiketi: str = "",
    ) -> bool:
        """
        Mevcut bir m105_sessions kaydının klinisyen_notu ve
        nihai_tani_etiketi sütunlarını günceller.
        """
        if not _HTTPX_AVAILABLE:
            return False
        try:
            async with _httpx.AsyncClient(timeout=10.0) as http:
                r = await http.patch(
                    self._rest_url("m105_sessions"),
                    headers=self.headers,
                    params={"id": f"eq.{session_uuid}"},
                    json={
                        "klinisyen_notu":     klinisyen_notu or None,
                        "nihai_tani_etiketi": nihai_tani_etiketi or None,
                    },
                )
            return r.status_code in (200, 204)
        except Exception as e:
            print(f"[Supabase] update_session_label exception: {e}")
            return False

    # ── Ham Paket Batch Kaydet ─────────────────────────────────────────────
    async def save_raw_packets(
        self,
        session_uuid: str,
        packets: list[dict],
        hayden_level: int = 4,
    ) -> int:
        """
        m105_raw_packets tablosuna sensör paketlerini batch olarak ekler.
        packets: MockDataGenerator veya ESP32'den gelen dict listesi
        Dönüş: başarıyla eklenen paket sayısı
        """
        if not _HTTPX_AVAILABLE or not packets:
            return 0

        rows = []
        for pkt in packets:
            rows.append({
                "session_id":    session_uuid,
                "timestamp_ms":  pkt.get("timestamp_ms"),
                "hayden_level":  pkt.get("hayden_level", hayden_level),
                "session_phase": pkt.get("session_phase", "görev"),
                "imu_data": {
                    "pitch_deg": pkt.get("imu_pitch_deg"),
                    "roll_deg":  pkt.get("imu_roll_deg"),
                    "yaw_deg":   pkt.get("imu_yaw_deg"),
                    "accel_x":   pkt.get("imu_accel_x"),
                    "accel_y":   pkt.get("imu_accel_y"),
                    "accel_z":   pkt.get("imu_accel_z"),
                },
                "semg_data": {
                    "left_uv":       pkt.get("semg_left_uv"),
                    "right_uv":      pkt.get("semg_right_uv"),
                    "asymmetry_pct": pkt.get("semg_asymmetry_pct"),
                },
                "resp_data": {
                    "waveform": pkt.get("resp_waveform"),
                    "rate_bpm": pkt.get("resp_rate_bpm"),
                },
                "mic_data": {
                    "rms_db": pkt.get("mic_rms_db"),
                    "f0_hz":  pkt.get("mic_f0_hz"),
                    "voiced": pkt.get("mic_voiced"),
                },
            })

        # Supabase max 1000 satır per istek — chunk'la
        CHUNK = 500
        inserted = 0
        try:
            async with _httpx.AsyncClient(timeout=30.0) as http:
                for i in range(0, len(rows), CHUNK):
                    chunk = rows[i:i + CHUNK]
                    r = await http.post(
                        self._rest_url("m105_raw_packets"),
                        headers={**self.headers, "Prefer": "return=minimal"},
                        json=chunk,
                    )
                    if r.status_code in (200, 201):
                        inserted += len(chunk)
                    else:
                        print(f"[Supabase] raw_packets chunk hatası: HTTP {r.status_code}")
        except Exception as e:
            print(f"[Supabase] save_raw_packets exception: {e}")

        print(f"[Supabase] {inserted}/{len(packets)} ham paket kaydedildi")
        return inserted

    # ── Danışanın Seans Geçmişi ──────────────────────────────────────────
    async def get_client_sessions(self, client_id: str) -> list[dict]:
        """
        Belirli bir danışana ait m105_sessions kayıtlarını döner.
        """
        if not _HTTPX_AVAILABLE:
            return []
        try:
            async with _httpx.AsyncClient(timeout=10.0) as http:
                r = await http.get(
                    self._rest_url("m105_sessions"),
                    headers=self.headers,
                    params={
                        "client_id": f"eq.{client_id}",
                        "select":    "id,session_date,session_number,session_goal,hayden_level,"
                                     "klinisyen_notu,nihai_tani_etiketi,zscore_results,crocodil_payload",
                        "order":     "session_date.desc",
                    },
                )
            if r.status_code == 200:
                return r.json()
            return []
        except Exception as e:
            print(f"[Supabase] get_client_sessions exception: {e}")
            return []


# ── Singleton erişim kolaylığı ───────────────────────────────────────────────
_supabase_client: Optional[SupabaseClient] = None


def get_supabase_client() -> Optional[SupabaseClient]:
    """
    SupabaseClient singleton'ını döner.
    Ortam değişkenleri eksikse None döner (graceful degradation).
    """
    global _supabase_client
    if _supabase_client is None:
        try:
            _supabase_client = SupabaseClient()
        except EnvironmentError as e:
            print(f"[Supabase] İstemci oluşturulamadı: {e}")
    return _supabase_client
