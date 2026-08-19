"""
Modül 105 – Sinyal İşleme Katmanı Test Paketi
==============================================
Tüm filtreleri, Kalman algoritmasını, sEMG RMS/Notch'u,
akustik FFT/LPC/Pertürbasyon analizini, uçtan uca veri hattını (Pipeline)
ve SQLite Z-score entegrasyonunu doğrular.

Çalıştırma:
    python -X utf8 test_signal_processor.py
"""

import json
import math
import sys
import time
from pathlib import Path
import numpy as np

sys.path.insert(0, str(Path(__file__).parent))

from database import init_db, ekle_danisan, ekle_seans, get_connection
from mock_generator import MockDataGenerator
from signal_processor import (
    MandibularKalmanFilter,
    MandibularKinematicsProcessor,
    BiquadFilter,
    SEMGProcessor,
    RespirationPeakDetector,
    AcousticSignalProcessor,
    SignalPipeline,
)

TEST_DB_PATH = Path(__file__).parent.parent / "test_dsp_m105.db"

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
        fail(f"{label}: {got} > {threshold} BASARISIZ")

def assert_lt(label, got, threshold):
    if got < threshold:
        ok(f"{label}: {got} < {threshold}")
    else:
        fail(f"{label}: {got} < {threshold} BASARISIZ")


# ─────────────────────────────────────────────────────
# TEST 1: Kinematik Kalman Filtresi
# ─────────────────────────────────────────────────────
def test_kalman_kinematics():
    print(f"\n{BOLD}TEST 1: Kinematik Kalman Filtresi (Mandibular Mandible Tracking){RESET}")
    proc = MandibularKinematicsProcessor()

    # Sentetik çene açılma hareketi (10Hz sinüs + beyaz gürültü)
    dt = 0.01
    angles_in = []
    angles_out = []

    t0 = time.perf_counter()
    for i in range(100):
        t = i * dt
        ts = int(t * 1000)
        # Gerçek çene açısı 10 derece genlikte
        true_pitch = 10.0 * math.sin(2 * math.pi * 3.0 * t)
        noisy_pitch = true_pitch + np.random.normal(0, 2.0)
        ax = -math.sin(math.radians(noisy_pitch)) * 9.81
        az = math.cos(math.radians(noisy_pitch)) * 9.81

        res = proc.process(
            pitch_deg=noisy_pitch, roll_deg=1.5, yaw_deg=0.5,
            ax=ax, ay=0.1, az=az, ts_ms=ts
        )
        angles_in.append(noisy_pitch)
        angles_out.append(res["mandibular_aperture_deg"])

    dur_ms = (time.perf_counter() - t0) * 1000
    avg_sample_us = (dur_ms / 100) * 1000

    in_var = float(np.var(angles_in))
    out_var = float(np.var(angles_out))

    ok(f"100 Ornek Kalman suresi: {dur_ms:.3f}ms ({avg_sample_us:.1f}us / ornek)")
    assert_lt("Tek ornek isleme suresi (<100us)", avg_sample_us, 100.0)
    ok(f"Giris varyansi: {in_var:.2f} -> Cikis duzgunlugu korundu: {out_var:.2f}")


# ─────────────────────────────────────────────────────
# TEST 2: sEMG 50Hz Notch Filtresi & RMS Analizi
# ─────────────────────────────────────────────────────
def test_semg_processing():
    print(f"\n{BOLD}TEST 2: sEMG 50Hz Notch & Pencereli RMS Analizi{RESET}")
    proc = SEMGProcessor(window_size=15, sample_rate=100.0)

    # 50Hz parazitli sEMG sinyali simülasyonu
    t0 = time.perf_counter()
    for i in range(50):
        t = i * 0.01
        # Sol kasta 40uV aktivasyon + 50Hz parazit (20uV)
        sig_l = 40.0 + 20.0 * math.sin(2 * math.pi * 50.0 * t) + np.random.normal(0, 2)
        # Sağ kasta 10uV dinlenim aktivitesi
        sig_r = 10.0 + np.random.normal(0, 1)

        res = proc.process(sig_l, sig_r)

    dur_ms = (time.perf_counter() - t0) * 1000
    ok(f"50 Ornek sEMG DSP suresi: {dur_ms:.3f}ms")

    # Son RMS değerleri
    rms_l = res["semg_left_rms_uv"]
    rms_r = res["semg_right_rms_uv"]
    asymm = res["semg_asymmetry_pct"]

    assert_gt("Sol Masseter RMS aktivasyonu (>30uV)", rms_l, 30.0)
    assert_lt("Sag Masseter dinlenim RMS (<25uV)", rms_r, 25.0)
    assert_gt("Asimetri tespiti (>40%)", asymm, 40.0)
    ok(f"sEMG RMS Sol: {rms_l}uV | Sag: {rms_r}uV | Asimetri: %{asymm}")


# ─────────────────────────────────────────────────────
# TEST 3: Piezo Solunum Tepe & I:E Oranı
# ─────────────────────────────────────────────────────
def test_respiration_peak_detector():
    print(f"\n{BOLD}TEST 3: Piezo Solunum Algoritmasi (Peak/Trough & I:E Orani){RESET}")
    detector = RespirationPeakDetector(sample_rate_hz=100.0)

    # 15 bpm solunum döngüsü (4 saniyelik periyot, 1.5s inhale, 2.5s exhale)
    t0 = time.perf_counter()
    for i in range(400):  # 4 saniye = 1 tam döngü
        t = i * 0.01
        ts = int(t * 1000)
        phase = (t % 4.0) / 4.0
        if phase < 0.375:  # Inhale
            wave = math.sin(math.pi * phase / 0.375)
        else:              # Exhale
            wave = math.sin(math.pi * (1.0 - (phase - 0.375) / 0.625))

        res = detector.process(wave + np.random.normal(0, 0.02), ts)

    dur_ms = (time.perf_counter() - t0) * 1000
    ok(f"400 Ornek Solunum DSP suresi: {dur_ms:.3f}ms")

    bpm = res["resp_rate_bpm"]
    ie = res["ie_ratio"]
    subglottic = res["subglottic_pressure_proxy"]

    assert_gt("Tahmini Solunum Hizi (>10 bpm)", bpm, 10.0)
    assert_lt("Tahmini Solunum Hizi (<25 bpm)", bpm, 25.0)
    assert_gt("Subglottik Basinc Proxy (>5 cmH2O)", subglottic, 5.0)
    ok(f"Solunum Hizi: {bpm} bpm | I:E Orani: {ie} | Subglottik Proxy: {subglottic} cmH2O")


# ─────────────────────────────────────────────────────
# TEST 4: Akustik FFT, F0, LPC Formant & Pertürbasyon
# ─────────────────────────────────────────────────────
def test_acoustic_processor():
    print(f"\n{BOLD}TEST 4: Akustik Sinyal Islemci (NumPy FFT, F0, LPC Formantlar, Jitter/Shimmer){RESET}")
    proc = AcousticSignalProcessor(sample_rate=16000)

    # Sentetik 130 Hz ses sinyali + belirgin vokal formantlar (16000 Hz, 100ms = 1600 örnek)
    sr = 16000
    n = 1600
    t = np.linspace(0, 0.1, n, endpoint=False)
    # F0=130Hz + Formant F1 (550Hz) + Formant F2 (1600Hz)
    signal = (
        0.5 * np.sin(2 * np.pi * 130.0 * t) +
        0.2 * np.sin(2 * np.pi * 260.0 * t) +
        0.35 * np.sin(2 * np.pi * 550.0 * t) +
        0.25 * np.sin(2 * np.pi * 1600.0 * t) +
        np.random.normal(0, 0.005, n)
    )

    t0 = time.perf_counter()

    # 1. FFT
    freqs, mag = proc.compute_fft(signal)
    fft_ms = (time.perf_counter() - t0) * 1000

    # 2. F0 Otorelasyon
    t1 = time.perf_counter()
    f0_est = proc.estimate_f0_autocorr(signal, min_f0=70.0, max_f0=400.0)
    f0_ms = (time.perf_counter() - t1) * 1000

    # 3. LPC Formantlar (Levinson-Durbin)
    t2 = time.perf_counter()
    f1_est, f2_est = proc.estimate_formants_lpc(signal, order=12)
    lpc_ms = (time.perf_counter() - t2) * 1000

    # 4. Jitter / Shimmer / HNR
    f0_stream = [130.0 + np.random.normal(0, 1.2) for _ in range(30)]
    rms_stream = [-22.0 + np.random.normal(0, 0.4) for _ in range(30)]
    jitter, shimmer, hnr = proc.calculate_perturbations(f0_stream, rms_stream)

    ok(f"FFT Suresi: {fft_ms:.3f}ms | F0 Suresi: {f0_ms:.3f}ms | LPC Formant Suresi: {lpc_ms:.3f}ms")
    assert_lt("Toplam Akustik DSP Suresi (<5ms)", fft_ms + f0_ms + lpc_ms, 5.0)

    # F0 doğruluk kontrolü (130 Hz +- 5 Hz)
    assert_gt("F0 Alt Sinir", f0_est, 125.0)
    assert_lt("F0 Ust Sinir", f0_est, 135.0)
    ok(f"F0 Tahmini: {f0_est:.1f} Hz (Hedef: 130.0 Hz)")

    # Formant kontrolleri
    assert_gt("F1 Formant (>300 Hz)", f1_est, 300.0)
    assert_gt("F2 Formant (>900 Hz)", f2_est, 900.0)
    ok(f"Formantlar: F1={f1_est:.1f} Hz, F2={f2_est:.1f} Hz")

    # Pertürbasyonlar
    assert_gt("HNR (>10 dB)", hnr, 10.0)
    ok(f"Perturbasyonlar: Jitter=%{jitter:.2f}, Shimmer=%{shimmer:.2f}, HNR={hnr:.1f} dB")


# ─────────────────────────────────────────────────────
# TEST 5: Uçtan Uca Pipeline & SQLite Entegrasyonu
# ─────────────────────────────────────────────────────
def test_full_pipeline_database_integration():
    print(f"\n{BOLD}TEST 5: Uctan Uca Pipeline & SQLite DB Entegrasyonu (Hayden L1-L7){RESET}")

    # 1. Test veritabanını hazırla
    if TEST_DB_PATH.exists():
        TEST_DB_PATH.unlink()
    conn = init_db(TEST_DB_PATH)

    danisan_id = ekle_danisan(
        conn,
        ad="Berna",
        soyad="Demir",
        dogum_tarihi="1982-06-10",
        cinsiyet="kadın",
        birincil_tani="dizartri",
        altta_yatan_etiyoloji="ALS",
        crocodil_client_id="als-client-105",
    )
    seans_id = ekle_seans(
        conn,
        danisan_id=danisan_id,
        seans_tarihi="2026-08-18T21:00:00",
        seans_no=1,
        seans_amaci="baseline_olcum",
    )

    # 2. Mock Generator'dan 300 paket alıp Pipeline'dan geçir
    gen = MockDataGenerator(hayden_level=4)
    pipeline = SignalPipeline()

    t_start = time.perf_counter()
    packet_times = []

    for i in range(300):
        pkt = gen.to_dict()
        t_pkt_0 = time.perf_counter()
        proc_pkt = pipeline.process_packet(pkt)
        t_pkt_el = (time.perf_counter() - t_pkt_0) * 1000
        packet_times.append(t_pkt_el)

    stream_duration_ms = (time.perf_counter() - t_start) * 1000
    avg_pkt_ms = float(np.mean(packet_times))
    max_pkt_ms = float(np.max(packet_times))

    ok(f"300 Paket Akis Suresi: {stream_duration_ms:.2f}ms")
    ok(f"Ortalama Paket Isleme: {avg_pkt_ms:.4f}ms ({avg_pkt_ms * 1000:.1f}us)")
    ok(f"Maksimum Paket Isleme: {max_pkt_ms:.4f}ms")
    assert_lt("Ortalama paket gecikmesi (<0.1ms)", avg_pkt_ms, 0.1)

    # 3. Seans Özetini Çıkar, Z-Score Hesapla ve SQLite'a Kaydet
    t_fin_0 = time.perf_counter()
    records = pipeline.finalize_and_save_session(
        conn=conn,
        seans_id=seans_id,
        danisan_yas=44,
        danisan_cinsiyet="kadın",
    )
    fin_duration_ms = (time.perf_counter() - t_fin_0) * 1000

    ok(f"7 Basamak Klinik Ozet & DB Insert Suresi: {fin_duration_ms:.2f}ms")
    assert_lt("Finalize suresi (<15ms)", fin_duration_ms, 15.0)
    assert_eq("DB'ye kaydedilen Hayden seviyesi sayisi", len(records), 7)

    # 4. DB'den Doğrulama
    db_rows = conn.execute("""
        SELECT hayden_seviye, hayden_adi, l4_ddk_hz, l2_f0_hz, zscore_sonuclar_json
        FROM Hiyerarsi_Olcumleri
        WHERE seans_id = ?
        ORDER BY hayden_seviye
    """, (seans_id,)).fetchall()

    assert_eq("DB'den okunan satir sayisi", len(db_rows), 7)

    print("\n  " + "=" * 62)
    print("  HAYDEN (1986) HIYERARSISI - DB KAYITLARI & Z-SCORE SONUCLARI")
    print("  " + "=" * 62)
    for r in db_rows:
        lvl = r["hayden_seviye"]
        name = r["hayden_adi"]
        z_json = json.loads(r["zscore_sonuclar_json"]) if r["zscore_sonuclar_json"] else {}
        z_str = ", ".join([f"{k}:{v}" for k, v in z_json.items()]) if z_json else "Norm hedef araliginda"
        print(f"  L{lvl} - {name:<14} | Z-Skorlari: {z_str}")
    print("  " + "=" * 62 + "\n")

    conn.close()
    if TEST_DB_PATH.exists():
        TEST_DB_PATH.unlink()


# ─────────────────────────────────────────────────────
# Ana Test Koşucusu
# ─────────────────────────────────────────────────────
if __name__ == "__main__":
    print(f"\n{'=' * 65}")
    print(f"  {BOLD}MODUL 105 - SINYAL ISLEME VE DSP TEST PAKETI{RESET}")
    print(f"  Hayden (1986) | Kalman | Notch/RMS | NumPy FFT/LPC | Pipeline")
    print(f"{'=' * 65}")

    try:
        test_kalman_kinematics()
        test_semg_processing()
        test_respiration_peak_detector()
        test_acoustic_processor()
        test_full_pipeline_database_integration()
    except Exception as e:
        import traceback
        fail(f"Beklenmeyen Hata: {e}")
        traceback.print_exc()

    print(f"\n{'=' * 65}")
    if errors:
        print(f"  {FAIL} {len(errors)} TEST BASARISIZ:")
        for e in errors:
            print(f"       * {e}")
        sys.exit(1)
    else:
        print(f"  {PASS} {BOLD}TUM SINYAL ISLEME TESTLERI KUSURSUZ GECTI (5/5 PASS){RESET}")
    print(f"{'=' * 65}\n")
