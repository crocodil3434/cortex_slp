"""
Modül 105 – Mock Data Generator
================================
Hayden (1986) Motor Konuşma Hiyerarşisi'ni simüle eden sahte veri üreticisi.

Üretilen kanallar (100 Hz, 10 ms aralıkla):
  - IMU  : MPU6050 – pitch / roll / yaw açıları (derece)
  - SEMG : AD8232  – sol/sağ masseter kası aktivasyonu (µV)
  - RESP : Piezo   – göğüs-karın solunum dalga formu (a.u.)
  - MIC  : INMP441 – ses şiddeti RMS + dominant frekans (Hz)

Hayden Hiyerarşisi Basamakları (simülasyonda etiket olarak kullanılır):
  L1 – Respirasyon (Respiration)
  L2 – Fonasyon    (Phonation)
  L3 – Rezonans    (Resonance)
  L4 – Artikülasyon (Articulation)
  L5 – Prozodi      (Prosody)
  L6 – Hız/Ritim   (Rate/Rhythm)
  L7 – Bütünleşim  (Integration)
"""

import asyncio
import math
import random
import time
from dataclasses import dataclass, asdict


# ---------------------------------------------------------------------------
# Hayden Hiyerarşisi sabit tanımları
# ---------------------------------------------------------------------------
HAYDEN_LEVELS = {
    1: "Respirasyon",
    2: "Fonasyon",
    3: "Rezonans",
    4: "Artikülasyon",
    5: "Prozodi",
    6: "Hız/Ritim",
    7: "Bütünleşim",
}

# Yaşa göre normatif değerler (basitleştirilmiş referans – Adım 2'de DB'ye taşınır)
NORM_TARGETS = {
    "resp_rate_bpm": 16.0,        # solunum/dak
    "phonation_duration_s": 20.0, # max. fonasyon süresi (sn)
    "f0_hz": 120.0,               # temel frekans (Hz) – yetişkin erkek
    "ddk_rate_hz": 5.0,           # diadokokinezi hızı (tekrar/sn)
    "semg_rms_uv": 50.0,          # masseter istirahat RMS (µV)
}


# ---------------------------------------------------------------------------
# Veri paketi yapısı
# ---------------------------------------------------------------------------
@dataclass
class SensorPacket:
    """ESP32'nin gerçekte göndereceği JSON paketinin Python karşılığı."""
    timestamp_ms: int        # unix epoch milisaniye

    # --- IMU (MPU6050) ---
    imu_pitch_deg: float     # +/- sagittal tilt (çene açısı proxy)
    imu_roll_deg: float      # lateral tilt
    imu_yaw_deg: float       # rotasyon
    imu_accel_x: float       # ivme (g)
    imu_accel_y: float
    imu_accel_z: float

    # --- sEMG (AD8232) ---
    semg_left_uv: float      # sol masseter
    semg_right_uv: float     # sağ masseter
    semg_asymmetry_pct: float

    # --- Solunum (Piezo) ---
    resp_waveform: float     # anlık dalga formu değeri (-1..1)
    resp_rate_bpm: float     # son 10 sn'nin tahmin edilen hızı

    # --- Ses (INMP441 I2S simülasyonu) ---
    mic_rms_db: float        # RMS ses seviyesi (dBFS)
    mic_f0_hz: float         # tahmini temel frekans
    mic_voiced: bool         # sesli segment mi?

    # --- Durum / Etiket ---
    hayden_level: int        # 1-7 aktif hiyerarşi basamağı
    session_phase: str       # "istirahat" | "görev" | "toparlanma"


# ---------------------------------------------------------------------------
# Fiziksel sinyal simülatörleri (gerçekçi biyomekanik davranış)
# ---------------------------------------------------------------------------

class RespirationSimulator:
    """
    Gerçekçi solunum döngüsü:
      - Temel frekans: ~0.27 Hz (16 bpm) + küçük doğal varyasyon
      - İnhale (0.4T) / Exhale (0.6T) asimetrisi
    """
    def __init__(self, rate_bpm: float = 16.0, noise_amp: float = 0.04):
        self.rate_hz = rate_bpm / 60.0
        self.noise_amp = noise_amp
        self._phase = 0.0
        self._rate_jitter = 0.0

    def step(self, dt: float) -> tuple[float, float]:
        """(dalga_formu, anlık_bpm) döner."""
        # Doğal hız varyasyonu (sinus aritmisi)
        self._rate_jitter += random.gauss(0, 0.002)
        self._rate_jitter = max(-0.05, min(0.05, self._rate_jitter))

        effective_hz = self.rate_hz + self._rate_jitter
        self._phase = (self._phase + 2 * math.pi * effective_hz * dt) % (2 * math.pi)

        # Asimetrik solunum profili (inhale hızlı, exhale yavaş)
        t = self._phase / (2 * math.pi)
        if t < 0.4:
            wave = math.sin(math.pi * t / 0.4)
        else:
            wave = math.sin(math.pi * (1.0 - (t - 0.4) / 0.6))

        noise = random.gauss(0, self.noise_amp)
        return wave + noise, effective_hz * 60.0


class IMUSimulator:
    """
    MPU6050 – baş ve çene hareketlerini simüle eder.
    Görev sırasında pitch ±15°, yaw ±5° sapma ekler.
    """
    def __init__(self):
        self._t = 0.0
        self._drift_pitch = 0.0
        self._drift_roll = 0.0

    def step(self, dt: float, task_active: bool) -> dict:
        self._t += dt

        # Çok yavaş baş sürüklenmesi (kas yorgunluğu simülasyonu)
        self._drift_pitch += random.gauss(0, 0.01)
        self._drift_roll  += random.gauss(0, 0.005)
        self._drift_pitch  = max(-5.0, min(5.0, self._drift_pitch))
        self._drift_roll   = max(-3.0, min(3.0, self._drift_roll))

        # Görev sırasında çene hareketi (konuşma ritmi 5 Hz diadokokinezi)
        task_amp = 12.0 if task_active else 1.5
        ddk_freq = 4.8 + random.gauss(0, 0.1)  # ~5 Hz diadokokinezi

        pitch = (task_amp * math.sin(2 * math.pi * ddk_freq * self._t)
                 + self._drift_pitch
                 + random.gauss(0, 0.3))
        roll  = (2.0 * math.sin(2 * math.pi * 0.7 * self._t + 1.2)
                 + self._drift_roll
                 + random.gauss(0, 0.2))
        yaw   = (3.0 * math.sin(2 * math.pi * 0.3 * self._t + 0.5)
                 + random.gauss(0, 0.15))

        # Yerçekimi bileşenli ivme (sabit g + titreme)
        g = 9.81
        pitch_rad = math.radians(pitch)
        ax = -math.sin(pitch_rad) * g + random.gauss(0, 0.05)
        ay = random.gauss(0, 0.03)
        az = math.cos(pitch_rad) * g + random.gauss(0, 0.05)

        return {
            "pitch": round(pitch, 4),
            "roll":  round(roll,  4),
            "yaw":   round(yaw,   4),
            "ax":    round(ax, 4),
            "ay":    round(ay, 4),
            "az":    round(az, 4),
        }


class SEMGSimulator:
    """
    AD8232 – masseter sEMG.
    İstirahat: ~5-10 µV baseline.
    Kas aktivasyonu: 40-120 µV RMS.
    """
    def __init__(self):
        self._t = 0.0
        self._activation_left  = 0.0
        self._activation_right = 0.0

    def step(self, dt: float, task_active: bool) -> dict:
        self._t += dt

        target = 80.0 if task_active else 8.0
        # Birinci dereceden yaklaşım (kas aktivasyon dinamiği τ ≈ 0.1s)
        tau = 0.12
        self._activation_left  += (target - self._activation_left)  * (dt / tau)
        self._activation_right += (target - self._activation_right) * (dt / tau)

        # Hafif asimetri simülasyonu (gerçek kas asimetrisi)
        asymmetry_factor = 1.0 + 0.08 * math.sin(2 * math.pi * 0.05 * self._t)

        left  = self._activation_left  * asymmetry_factor + abs(random.gauss(0, 3.0))
        right = self._activation_right / asymmetry_factor + abs(random.gauss(0, 3.0))
        left  = max(0.0, left)
        right = max(0.0, right)

        asymmetry_pct = abs(left - right) / max(left + right, 1e-9) * 100.0

        return {
            "left_uv":        round(left, 2),
            "right_uv":       round(right, 2),
            "asymmetry_pct":  round(asymmetry_pct, 2),
        }


class MicrophoneSimulator:
    """
    INMP441 I2S mikrofon – ses sinyalini simüle eder.
    Görev sırasında F0 ~110-140 Hz arası titreşim üretir.
    """
    def __init__(self, f0_hz: float = 120.0):
        self._t = 0.0
        self._f0 = f0_hz
        self._voiced = False
        self._voiced_timer = 0.0
        self._silence_timer = 0.0
        # Konuşma ritmi: ~0.35s sesli, ~0.15s sessiz (heceler)
        self._next_switch = random.uniform(0.2, 0.5)

    def step(self, dt: float, task_active: bool) -> dict:
        self._t += dt

        if task_active:
            # Sesli/sessiz geçiş (konuşma ritmi)
            self._voiced_timer += dt
            if self._voiced_timer >= self._next_switch:
                self._voiced = not self._voiced
                self._voiced_timer = 0.0
                if self._voiced:
                    self._next_switch = random.uniform(0.15, 0.45)  # sesli segment
                    self._f0 = random.gauss(120.0, 8.0)             # F0 jitter
                else:
                    self._next_switch = random.uniform(0.05, 0.20)  # sessiz segment
        else:
            self._voiced = False

        if self._voiced:
            # Harmonik ses sentezi (F0 + harmonikler)
            signal = (
                0.6  * math.sin(2 * math.pi * self._f0 * self._t) +
                0.25 * math.sin(2 * math.pi * 2 * self._f0 * self._t) +
                0.10 * math.sin(2 * math.pi * 3 * self._f0 * self._t) +
                0.05 * math.sin(2 * math.pi * 4 * self._f0 * self._t)
            )
            rms = math.sqrt(signal ** 2)
            rms_db = 20 * math.log10(max(rms, 1e-9)) + random.gauss(0, 0.5)
            f0_measured = self._f0 + random.gauss(0, 2.0)
        else:
            noise = random.gauss(0, 0.005)
            rms_db = 20 * math.log10(abs(noise) + 1e-9)
            f0_measured = 0.0

        return {
            "rms_db":  round(rms_db, 2),
            "f0_hz":   round(max(0.0, f0_measured), 2),
            "voiced":  self._voiced,
        }


# ---------------------------------------------------------------------------
# Ana Mock Generator
# ---------------------------------------------------------------------------

class MockDataGenerator:
    """
    Tüm sensörleri koordineli olarak çalıştıran ana simülatör.
    100 Hz (10 ms aralık) üretir.
    Görev fazları otomatik döner: istirahat 5s → görev 15s → toparlanma 3s
    """

    SAMPLE_RATE_HZ = 100        # Hz
    INTERVAL_MS    = 10         # ms

    # Faz süreleri (saniye)
    PHASE_DURATIONS = {
        "istirahat":   5.0,
        "görev":      15.0,
        "toparlanma":  3.0,
    }
    PHASE_SEQUENCE = ["istirahat", "görev", "toparlanma"]

    def __init__(self, hayden_level: int = 4):
        self._resp = RespirationSimulator()
        self._imu  = IMUSimulator()
        self._semg = SEMGSimulator()
        self._mic  = MicrophoneSimulator()

        self._hayden_level  = max(1, min(7, hayden_level))
        self._phase_idx     = 0
        self._phase_elapsed = 0.0
        self._dt            = self.INTERVAL_MS / 1000.0  # 0.01 s

    @property
    def current_phase(self) -> str:
        return self.PHASE_SEQUENCE[self._phase_idx]

    @property
    def task_active(self) -> bool:
        return self.current_phase == "görev"

    def _advance_phase(self, dt: float):
        """Faz zamanlayıcısını ilerlet."""
        self._phase_elapsed += dt
        current_duration = self.PHASE_DURATIONS[self.current_phase]
        if self._phase_elapsed >= current_duration:
            self._phase_elapsed = 0.0
            self._phase_idx = (self._phase_idx + 1) % len(self.PHASE_SEQUENCE)

    def generate_packet(self) -> SensorPacket:
        """Bir sonraki 10ms veri paketini üretir."""
        dt = self._dt
        self._advance_phase(dt)

        task = self.task_active
        resp_wave, resp_bpm = self._resp.step(dt)
        imu  = self._imu.step(dt, task)
        semg = self._semg.step(dt, task)
        mic  = self._mic.step(dt, task)

        return SensorPacket(
            timestamp_ms        = int(time.time() * 1000),
            imu_pitch_deg       = imu["pitch"],
            imu_roll_deg        = imu["roll"],
            imu_yaw_deg         = imu["yaw"],
            imu_accel_x         = imu["ax"],
            imu_accel_y         = imu["ay"],
            imu_accel_z         = imu["az"],
            semg_left_uv        = semg["left_uv"],
            semg_right_uv       = semg["right_uv"],
            semg_asymmetry_pct  = semg["asymmetry_pct"],
            resp_waveform       = round(resp_wave, 5),
            resp_rate_bpm       = round(resp_bpm, 2),
            mic_rms_db          = mic["rms_db"],
            mic_f0_hz           = mic["f0_hz"],
            mic_voiced          = mic["voiced"],
            hayden_level        = self._hayden_level,
            session_phase       = self.current_phase,
        )

    def to_dict(self) -> dict:
        """JSON serileştirme için dict döner."""
        return asdict(self.generate_packet())

    async def stream(self, callback, stop_event: asyncio.Event | None = None):
        """
        100 Hz'de paketi callback'e iletir.
        stop_event set edilince durur.
        """
        interval = self._dt
        while True:
            if stop_event and stop_event.is_set():
                break
            packet = self.to_dict()
            await callback(packet)
            await asyncio.sleep(interval)
