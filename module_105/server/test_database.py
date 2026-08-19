"""
Modül 105 – Veritabanı Test Paketi
====================================
Tüm tabloları, ilişkileri, CRUD işlemlerini,
Z-score hesaplamalarını ve normatif veri bütünlüğünü doğrular.

Çalıştırma:
    python test_database.py
"""

import json
import sqlite3
import sys
import time
from datetime import date, datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from database import (
    DB_PATH, NORM_SEED_DATA,
    ekle_danisan, ekle_olcum, ekle_seans, ekle_ham_veri,
    get_connection, hesapla_zscore, init_db, seans_hiyerarsi_raporu,
    toplu_zscore,
)
from mock_generator import MockDataGenerator

# Test için geçici DB (gerçek DB'yi kirletme)
TEST_DB = Path(__file__).parent.parent / "test_m105.db"


# ─────────────────────────────────────────────────────
# Yardımcı
# ─────────────────────────────────────────────────────

PASS = "\033[92m[PASS]\033[0m"
FAIL = "\033[91m[FAIL]\033[0m"
INFO = "\033[94m[INFO]\033[0m"
BOLD = "\033[1m"
RESET = "\033[0m"

errors = []

def ok(msg):   print(f"  {PASS} {msg}")
def fail(msg): print(f"  {FAIL} {msg}"); errors.append(msg)
def info(msg): print(f"  {INFO} {msg}")


def assert_eq(label, got, expected):
    if got == expected:
        ok(f"{label}: {got!r}")
    else:
        fail(f"{label}: beklenen={expected!r}, gelen={got!r}")


def assert_gt(label, got, threshold):
    if got > threshold:
        ok(f"{label}: {got} > {threshold}")
    else:
        fail(f"{label}: {got} > {threshold} BAŞARISIZ")


def assert_not_none(label, got):
    if got is not None:
        ok(f"{label}: {got!r}")
    else:
        fail(f"{label}: None döndü")


# ─────────────────────────────────────────────────────
# TEST 1: Veritabanı başlatma ve şema doğrulama
# ─────────────────────────────────────────────────────

def test_schema_olusturma():
    print(f"\n{BOLD}TEST 1: Şema Oluşturma ve Tablo Doğrulama{RESET}")
    t0 = time.perf_counter()

    conn = init_db(TEST_DB)

    beklenen_tablolar = {
        "Danisanlar", "Seanslar", "Hiyerarsi_Olcumleri",
        "Norm_Degerleri", "Ham_Sensor_Verileri"
    }
    mevcut_tablolar = {
        row[0] for row in
        conn.execute("SELECT name FROM sqlite_master WHERE type='table'")
    }

    for tablo in beklenen_tablolar:
        if tablo in mevcut_tablolar:
            ok(f"Tablo mevcut: {tablo}")
        else:
            fail(f"Tablo EKSİK: {tablo}")

    # Index kontrolü
    indexler = {
        row[0] for row in
        conn.execute("SELECT name FROM sqlite_master WHERE type='index'")
    }
    beklenen_indexler = [
        "idx_danisanlar_crocodil_id",
        "idx_seanslar_danisan",
        "idx_olcumler_seans_hayden",
        "idx_norm_metrik_yas_cinsiyet",
        "idx_ham_sensor_timestamp",
    ]
    for idx in beklenen_indexler:
        if idx in indexler:
            ok(f"Index mevcut: {idx}")
        else:
            fail(f"Index EKSİK: {idx}")

    elapsed = (time.perf_counter() - t0) * 1000
    info(f"Şema oluşturma süresi: {elapsed:.2f}ms")
    conn.close()


# ─────────────────────────────────────────────────────
# TEST 2: Norm verisi bütünlüğü
# ─────────────────────────────────────────────────────

def test_norm_verileri():
    print(f"\n{BOLD}TEST 2: Normatif Veri Bütünlüğü{RESET}")
    conn = get_connection(TEST_DB)

    toplam = conn.execute("SELECT COUNT(*) FROM Norm_Degerleri").fetchone()[0]
    assert_gt("Norm satır sayısı", toplam, 10)

    # Zorunlu metriklerin varlığını kontrol et
    zorunlu_metrikler = [
        "l4_ddk_hz",
        "l2_maks_fonasyon_suresi_sn",
        "l2_f0_hz",
        "l6_konusma_hizi_spm",
        "l2_jitter_pct",
        "l2_shimmer_pct",
        "l2_hnr_db",
        "l1_solunum_hizi_bpm",
    ]
    for metrik in zorunlu_metrikler:
        count = conn.execute(
            "SELECT COUNT(*) FROM Norm_Degerleri WHERE metrik_adi=?", (metrik,)
        ).fetchone()[0]
        if count > 0:
            ok(f"Norm mevcut: {metrik} ({count} satır)")
        else:
            fail(f"Norm EKSİK: {metrik}")

    # Hayden seviyesi kapsamını kontrol et
    seviyeler = {
        row[0] for row in
        conn.execute("SELECT DISTINCT hayden_seviye FROM Norm_Degerleri")
    }
    info(f"Norm verisi olan Hayden seviyeleri: {sorted(seviyeler)}")
    assert_gt("Kapsanan Hayden seviyesi sayısı", len(seviyeler), 3)

    # std_sapma > 0 doğrulaması
    sifir_std = conn.execute(
        "SELECT COUNT(*) FROM Norm_Degerleri WHERE std_sapma <= 0"
    ).fetchone()[0]
    assert_eq("Sıfır/negatif std_sapma sayısı", sifir_std, 0)

    conn.close()


# ─────────────────────────────────────────────────────
# TEST 3: CRUD – Danışan, Seans, Ölçüm
# ─────────────────────────────────────────────────────

def test_crud_islemleri():
    print(f"\n{BOLD}TEST 3: CRUD Islemleri (Danisan -> Seans -> Olcum){RESET}")
    conn = get_connection(TEST_DB)

    # 3a: Danışan oluştur
    danisan_id = ekle_danisan(
        conn,
        crocodil_client_id = "test-uuid-0001",
        ad                 = "Ayşe",
        soyad              = "Yılmaz",
        dogum_tarihi       = "1985-03-15",
        cinsiyet           = "kadın",
        dominant_el        = "sağ",
        birincil_tani      = "dizartri",
        altta_yatan_etiyoloji = "MS",
        bozukluk_suresi_ay = 18,
        notlar             = "Test danışanı – Modül 105 simülasyon"
    )
    assert_gt("Danışan ID (>0)", danisan_id, 0)

    # Duplicate crocodil_id testi (UNIQUE kısıtı)
    try:
        ekle_danisan(conn, crocodil_client_id="test-uuid-0001",
                     ad="Kopya", soyad="Test", dogum_tarihi="2000-01-01")
        fail("UNIQUE kısıtı tetiklenmedi!")
    except sqlite3.IntegrityError:
        ok("UNIQUE(crocodil_client_id) kısıtı doğru çalışıyor")

    # 3b: Seans oluştur
    seans_id = ekle_seans(
        conn,
        danisan_id           = danisan_id,
        seans_tarihi         = datetime.now().isoformat(),
        seans_no             = 1,
        sure_dakika          = 45,
        mod                  = "klinik",
        seans_amaci          = "baseline_olcum",
        genel_anlasılırlık_pct = 65.0,
        konusma_hizi_spm     = 145.0,
        klinisyen_notu       = "Hasta kooperatif, dizartri belirtileri belirgin."
    )
    assert_gt("Seans ID (>0)", seans_id, 0)

    # FK doğrulama: geçersiz danisan_id
    try:
        ekle_seans(conn, danisan_id=99999,
                   seans_tarihi=datetime.now().isoformat(), seans_no=1)
        fail("FK kısıtı tetiklenmedi (danisan_id=99999)!")
    except sqlite3.IntegrityError:
        ok("FK(danisan_id) kısıtı doğru çalışıyor")

    # 3c: Hayden L4 ölçümü ekle (Artikülasyon – en kritik motor konuşma basamağı)
    olcum_id = ekle_olcum(
        conn, seans_id, hayden_seviye=4,
        l4_cene_acisi_ort_deg  = 8.3,
        l4_cene_acisi_max_deg  = 14.2,
        l4_cene_acisi_range_deg= 5.9,
        l4_semg_sol_rms_uv     = 42.1,
        l4_semg_sag_rms_uv     = 38.7,
        l4_semg_asimetri_pct   = 8.4,
        l4_ddk_hz              = 3.8,      # Patolojik (<4.5)
        l4_ddk_duzenlilik_cv   = 0.18,     # Yüksek (apraksi şüphesi)
        l4_anlasılırlık_pct    = 62.0,
        ham_imu_ozet_json      = {"pitch_mean": 8.3, "pitch_std": 2.1, "roll_mean": 1.2},
        ham_semg_ozet_json     = {"left_rms": 42.1, "right_rms": 38.7, "peak_uv": 95.4},
        l7_genel_siddet        = "orta",
        veri_kalitesi_skoru    = 0.87,
        olcum_suresi_sn        = 120,
        notlar                 = "DDK belirgin yavaş, CV yüksek – apraksi/dizartri karışımı"
    )
    assert_gt("Ölçüm ID (>0)", olcum_id, 0)

    # 3d: Ölçüm okunabiliyor mu?
    row = conn.execute(
        "SELECT * FROM Hiyerarsi_Olcumleri WHERE id=?", (olcum_id,)
    ).fetchone()
    assert_not_none("Ölçüm okundu", row)
    assert_eq("hayden_seviye", row["hayden_seviye"], 4)
    assert_eq("hayden_adi", row["hayden_adi"], "Artikülasyon")

    # JSON sütunu parse edilebiliyor mu?
    imu_json = json.loads(row["ham_imu_ozet_json"])
    assert_eq("IMU JSON 'pitch_mean'", imu_json["pitch_mean"], 8.3)
    ok("JSON sütunu parse edildi")

    # 3e: Tüm Hayden seviyeleri için ölçüm ekle
    hayden_metrikleri = {
        1: {"l1_solunum_hizi_bpm": 12.5, "l1_ic_dis_orani": 0.38},
        2: {"l2_maks_fonasyon_suresi_sn": 7.2, "l2_f0_hz": 198.0,
            "l2_jitter_pct": 1.8, "l2_shimmer_pct": 5.1, "l2_hnr_db": 10.2},
        3: {"l3_hipernasal_indeks": 0.35, "l3_f1_hz": 520.0, "l3_f2_hz": 1680.0},
        5: {"l5_f0_sapma_std_hz": 5.2, "l5_durak_orani_pct": 28.0},
        6: {"l6_konusma_hizi_spm": 88.0, "l6_ritim_tutarlilik_cv": 0.42},
        7: {"l7_motor_senkroni_indeks": 0.61, "l7_genel_siddet": "orta"},
    }
    for seviye, metrikler in hayden_metrikleri.items():
        oid = ekle_olcum(conn, seans_id, hayden_seviye=seviye, **metrikler)
        ok(f"Hayden L{seviye} ölçümü eklendi (id={oid})")

    conn.close()
    return danisan_id, seans_id


# ─────────────────────────────────────────────────────
# TEST 4: Z-Score hesaplama
# ─────────────────────────────────────────────────────

def test_zscore_hesaplama(danisan_id, seans_id):
    print(f"\n{BOLD}TEST 4: Z-Score Hesaplama (Motor Konuşma Kriterleri){RESET}")
    conn = get_connection(TEST_DB)

    # Danışan yaşı hesapla
    row = conn.execute(
        "SELECT dogum_tarihi, cinsiyet FROM Danisanlar WHERE id=?", (danisan_id,)
    ).fetchone()
    birth = datetime.strptime(row["dogum_tarihi"], "%Y-%m-%d")
    yas   = (datetime.now() - birth).days // 365
    cinsiyet = row["cinsiyet"]
    info(f"Danışan: {yas} yaş, {cinsiyet}")

    # Z-score test senaryoları
    testler = [
        # (metrik, deger, yas, cinsiyet, beklenen_yon)
        ("l4_ddk_hz",          3.8,  yas, cinsiyet, "negatif"),  # patolojik: düşük
        ("l2_maks_fonasyon_suresi_sn", 7.2, yas, cinsiyet, "negatif"),  # MPT düşük
        ("l2_hnr_db",         10.2,  yas, cinsiyet, "negatif"),  # HNR düşük
        ("l6_konusma_hizi_spm", 88.0, yas, cinsiyet, "negatif"), # hız düşük
        ("l1_solunum_hizi_bpm",12.5,  yas, cinsiyet, "normal"),  # normal aralık
        ("l2_jitter_pct",       1.8,  yas, cinsiyet, "pozitif"), # jitter yüksek = kötü
        ("l2_shimmer_pct",      5.1,  yas, cinsiyet, "pozitif"), # shimmer yüksek = kötü
    ]

    for metrik, deger, y, c, beklenen_yon in testler:
        z = hesapla_zscore(conn, metrik, deger, y, c)
        if z is None:
            fail(f"Z-score None: {metrik} (yas={y}, cinsiyet={c})")
            continue

        yon = "pozitif" if z > 0 else "negatif" if z < 0 else "sıfır"
        esik = abs(z) > 1.5
        isaretler = " ⚠️ KLİNİK ANLAM" if esik else ""

        if yon == beklenen_yon or beklenen_yon == "normal":
            ok(f"Z({metrik}={deger}) = {z:+.2f}{isaretler}")
        else:
            fail(f"Z({metrik}={deger}) = {z:+.2f} – beklenen yön: {beklenen_yon}")

    # Toplu Z-score
    metrikleri = {
        "l4_ddk_hz":              3.8,
        "l6_konusma_hizi_spm":   88.0,
        "l2_maks_fonasyon_suresi_sn": 7.2,
    }
    zscoreler = toplu_zscore(conn, metrikleri, yas, cinsiyet)
    ok(f"Toplu Z-score: {json.dumps({k: f'{v:+.2f}' for k,v in zscoreler.items() if v is not None})}")

    # Z-score veritabanına geri yaz
    row2 = conn.execute(
        "SELECT id FROM Hiyerarsi_Olcumleri WHERE seans_id=? AND hayden_seviye=4",
        (seans_id,)
    ).fetchone()
    if row2:
        conn.execute(
            "UPDATE Hiyerarsi_Olcumleri SET zscore_sonuclar_json=? WHERE id=?",
            (json.dumps({f"{m}_z": v for m, v in zscoreler.items()}, ensure_ascii=False),
             row2["id"])
        )
        conn.commit()
        ok("Z-score sonuçları Hiyerarsi_Olcumleri'ne yazıldı")

    conn.close()


# ─────────────────────────────────────────────────────
# TEST 5: Ham sensör verisi yazma (Mock Generator entegrasyonu)
# ─────────────────────────────────────────────────────

def test_ham_veri_yazma(seans_id):
    print(f"\n{BOLD}TEST 5: Ham Sensör Verisi – Mock Generator Entegrasyonu{RESET}")
    conn = get_connection(TEST_DB)

    gen = MockDataGenerator(hayden_level=4)
    N   = 200  # 200 paket = 2 saniyelik veri (100 Hz)

    t0 = time.perf_counter()
    for _ in range(N):
        paket = gen.to_dict()
        ekle_ham_veri(conn, seans_id, paket)
    conn.commit()
    elapsed_ms = (time.perf_counter() - t0) * 1000

    # Doğrulama
    count = conn.execute(
        "SELECT COUNT(*) FROM Ham_Sensor_Verileri WHERE seans_id=?", (seans_id,)
    ).fetchone()[0]
    assert_eq(f"{N} paket yazıldı mı", count, N)

    throughput = N / (elapsed_ms / 1000)
    ok(f"Yazma hızı: {throughput:.0f} paket/sn ({elapsed_ms:.1f}ms/{N} paket)")

    if throughput > 1000:
        ok("Throughput > 1000 pk/sn – 100Hz ESP32 akışını karşılar")
    else:
        fail(f"Throughput düşük: {throughput:.0f} pk/sn")

    # Ham veri timestamp monoton mu?
    ts_list = [
        row[0] for row in
        conn.execute(
            "SELECT timestamp_ms FROM Ham_Sensor_Verileri "
            "WHERE seans_id=? ORDER BY id", (seans_id,)
        )
    ]
    monoton = all(ts_list[i] <= ts_list[i+1] for i in range(len(ts_list)-1))
    if monoton:
        ok("Timestamp'lar monoton artan")
    else:
        fail("Timestamp sıralaması bozuk!")

    conn.close()


# ─────────────────────────────────────────────────────
# TEST 6: Hiyerarşi raporu sorgusu
# ─────────────────────────────────────────────────────

def test_hiyerarsi_raporu(seans_id):
    print(f"\n{BOLD}TEST 6: Hiyerarşi Raporu Sorgusu{RESET}")
    conn = get_connection(TEST_DB)

    rapor = seans_hiyerarsi_raporu(conn, seans_id)
    assert_gt("Rapor satır sayısı", len(rapor), 0)
    ok(f"Toplam {len(rapor)} Hayden basamağı raporlandı")

    print()
    print("  ┌─────────────────────────────────────────────────────────────────┐")
    print("  │ HAYDEN HİYERARŞİSİ – SEANS ÖZETİ                               │")
    print("  ├──────┬──────────────┬────────────┬────────────┬─────────────────┤")
    print("  │ L#   │ Alan         │ DDK (Hz)   │ F0 (Hz)    │ Anlasılırlık    │")
    print("  ├──────┼──────────────┼────────────┼────────────┼─────────────────┤")

    for r in rapor:
        seviye = r["hayden_seviye"]
        ad     = r["hayden_adi"][:12].ljust(12)
        ddk    = f"{r['l4_ddk_hz']:.1f}" if r["l4_ddk_hz"] else "—"
        f0     = f"{r['l2_f0_hz']:.0f}" if r["l2_f0_hz"] else "—"
        anlasil= f"{r['l4_anlasılırlık_pct']:.0f}%" if r["l4_anlasılırlık_pct"] else "—"
        print(f"  │ L{seviye}   │ {ad} │ {ddk:<10} │ {f0:<10} │ {anlasil:<15} │")

    print("  └──────┴──────────────┴────────────┴────────────┴─────────────────┘")
    conn.close()


# ─────────────────────────────────────────────────────
# TEST 7: Foreign Key cascade
# ─────────────────────────────────────────────────────

def test_foreign_key_cascade():
    print(f"\n{BOLD}TEST 7: Foreign Key CASCADE Silme{RESET}")
    conn = get_connection(TEST_DB)

    # Geçici danışan
    did = ekle_danisan(conn, ad="Silinecek", soyad="Test",
                       dogum_tarihi="1990-01-01", crocodil_client_id="del-test-999")
    sid = ekle_seans(conn, danisan_id=did,
                     seans_tarihi=datetime.now().isoformat(), seans_no=1)
    ekle_olcum(conn, sid, hayden_seviye=4, l4_ddk_hz=5.0)

    # Cascade sil
    conn.execute("DELETE FROM Danisanlar WHERE id=?", (did,))
    conn.commit()

    # Orphan kayıt olmamalı
    seans_count = conn.execute(
        "SELECT COUNT(*) FROM Seanslar WHERE danisan_id=?", (did,)
    ).fetchone()[0]
    olcum_count = conn.execute(
        "SELECT COUNT(*) FROM Hiyerarsi_Olcumleri WHERE seans_id=?", (sid,)
    ).fetchone()[0]

    assert_eq("Cascade sonrası seans silinmiş", seans_count, 0)
    assert_eq("Cascade sonrası ölçüm silinmiş", olcum_count, 0)
    conn.close()


# ─────────────────────────────────────────────────────
# Temizlik
# ─────────────────────────────────────────────────────

def cleanup():
    if TEST_DB.exists():
        TEST_DB.unlink()
        info(f"Test veritabanı silindi: {TEST_DB.name}")


# ─────────────────────────────────────────────────────
# Ana test akışı
# ─────────────────────────────────────────────────────

if __name__ == "__main__":
    print(f"\n{'='*65}")
    print(f"  {BOLD}MODÜL 105 – VERİTABANI TEST PAKETİ{RESET}")
    print(f"  Motor Konuşma Bozuklukları | SQLite | Hayden (1986)")
    print(f"{'='*65}")

    cleanup()  # Önceki test kalıntısını sil

    try:
        test_schema_olusturma()
        test_norm_verileri()
        danisan_id, seans_id = test_crud_islemleri()
        test_zscore_hesaplama(danisan_id, seans_id)
        test_ham_veri_yazma(seans_id)
        test_hiyerarsi_raporu(seans_id)
        test_foreign_key_cascade()
    except Exception as e:
        import traceback
        fail(f"Beklenmeyen hata: {e}")
        traceback.print_exc()
    finally:
        cleanup()

    # Sonuç
    print(f"\n{'='*65}")
    if errors:
        print(f"  {FAIL} {len(errors)} TEST BAŞARISIZ:")
        for e in errors:
            print(f"       • {e}")
        sys.exit(1)
    else:
        print(f"  {PASS} {BOLD}TÜM TESTLER BAŞARILI{RESET}")
    print(f"{'='*65}\n")
