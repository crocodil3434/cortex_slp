"""
sensor_fusion.py
================
Cortex SLP / Crocodil — Modül 105 Sensör Füzyonu ve Groping (Motor Arama) Tespit Motoru

Özellikler:
  1. Kayan Pencere (Sliding Window): 100 Hz donanım paketlerini (MPU6050, AD8232) ve
     INMP441 akustik VAD (Voice Activity Detection) verilerini timestamp_ms'e göre eşler.
  2. MPU6050 Kalibrasyon / Tare (Sıfır Noktası):
     Klinisyen "Kalibre Et" dediğinde anlık açıları ofset kabul edip net çene açısını hesaplar.
  3. Basamak VI (Koartikülasyon) — Groping (Motor Arama) Algoritması:
     Motor efor (sEMG > 50 µV veya |Δpitch| > 3.0°) başladığı an zaman damgası tutulur.
     Eğer 400 ms içinde akustik ses çıktısı (mic_voiced veya RMS > -35 dBFS) oluşmazsa
     "groping_detected = True" bayrağını ve gecikme süresini (motor_acoustic_latency_ms) üretir.
  4. C Grubu Çoklu Sensör Füzyon Kaydı (5 - 10 sn):
     Oturum boyunca koartikülasyon akıcılığı, senkroni ve prosodik modülasyonu analiz eder.
"""

from __future__ import annotations

import time
import math
import logging
from collections import deque
from typing import Any, Dict, List, Optional

log = logging.getLogger("m105.fusion")

# ── Eşik Değerleri ve Parametreler ──────────────────────────────────────────
MOTOR_EFFORT_SEMG_UV_THRESHOLD = 50.0       # sEMG motor aktivasyon eşiği (µV)
MOTOR_EFFORT_PITCH_DELTA_DEG   = 3.0        # Çene dikey hareket eşiği (derece)
GROPING_LATENCY_THRESHOLD_MS   = 400.0      # Groping gecikme sınır süresi (ms)
ACOUSTIC_VOICED_RMS_DB_THRESH  = -35.0      # Ses varlık RMS eşiği (dBFS)
SLIDING_WINDOW_SIZE            = 500        # ~5 saniye (100 Hz'de 500 örnek)


class SensorFusionEngine:
    """
    Kinematik, sEMG ve Akustik alt sistemlerini kayan pencerede füzyonlayan analiz motoru.
    """

    def __init__(self, window_size: int = SLIDING_WINDOW_SIZE):
        self.window_size = window_size
        self.packet_window: deque[Dict[str, Any]] = deque(maxlen=window_size)

        # MPU6050 Sıfır Noktası Ofsetleri
        self.offset_pitch: float = 0.0
        self.offset_roll: float  = 0.0
        self.offset_yaw: float   = 0.0
        self.is_calibrated: bool = False

        # Motor Efor & Groping Durum Takibi
        self.baseline_pitch: Optional[float] = None
        self.motor_onset_timestamp_ms: Optional[int] = None
        self.is_motor_effort_active: bool = False
        self.last_groping_detected: bool = False
        self.last_motor_acoustic_latency_ms: float = 0.0
        self.groping_episodes_count: int = 0

        # C Grubu Füzyon Kayıt Oturumu
        self.is_fusion_recording: bool = False
        self.fusion_record_start_ms: int = 0
        self.fusion_record_packets: List[Dict[str, Any]] = []

    def calibrate_mpu(self, current_raw_pitch: float, current_raw_roll: float = 0.0, current_raw_yaw: float = 0.0):
        """
        Anlık açıları sıfır noktası ofseti olarak saklar.
        """
        self.offset_pitch = float(current_raw_pitch)
        self.offset_roll  = float(current_raw_roll)
        self.offset_yaw   = float(current_raw_yaw)
        self.baseline_pitch = 0.0
        self.is_calibrated = True
        log.info(f"[Füzyon] MPU6050 Kalibre Edildi -> Ofset Pitch: {self.offset_pitch:.2f}°")

    def reset_calibration(self):
        """Ofsetleri sıfırlar."""
        self.offset_pitch = 0.0
        self.offset_roll  = 0.0
        self.offset_yaw   = 0.0
        self.is_calibrated = False

    def start_fusion_recording(self):
        """C Grubu çoklu sensör füzyon kaydını başlatır."""
        self.is_fusion_recording = True
        self.fusion_record_start_ms = int(time.time() * 1000)
        self.fusion_record_packets.clear()
        self.groping_episodes_count = 0
        log.info("[Füzyon] C Grubu Füzyon Kaydı Başlatıldı")

    def stop_fusion_recording(self) -> Dict[str, Any]:
        """Füzyon kaydını durdurur ve özet analiz raporunu döner."""
        self.is_fusion_recording = False
        duration_s = (int(time.time() * 1000) - self.fusion_record_start_ms) / 1000.0
        pkt_count = len(self.fusion_record_packets)

        # Analiz Metrikleri
        if pkt_count > 0:
            latencies = [
                p.get("motor_acoustic_latency_ms", 0.0)
                for p in self.fusion_record_packets
                if p.get("groping_detected") or p.get("motor_acoustic_latency_ms", 0) > 0
            ]
            mean_latency = sum(latencies) / max(1, len(latencies))
            
            # Mandibular ROM
            pitches = [p.get("calibrated_pitch_deg", 0.0) for p in self.fusion_record_packets]
            rom_deg = max(pitches) - min(pitches) if pitches else 0.0

            # sEMG Tepe Gücü
            semgs = [p.get("semg_left_uv", 0.0) for p in self.fusion_record_packets]
            max_semg = max(semgs) if semgs else 0.0

            # Senkroni İndeksi (Motor ve Akustik çakışma oranı)
            coactive_pkts = sum(
                1 for p in self.fusion_record_packets
                if p.get("is_motor_active") and p.get("is_acoustic_active")
            )
            synchrony_index = round((coactive_pkts / max(1, pkt_count)) * 100.0, 1)
        else:
            mean_latency = 0.0
            rom_deg = 0.0
            max_semg = 0.0
            synchrony_index = 100.0

        report = {
            "duration_s": round(duration_s, 2),
            "packet_count": pkt_count,
            "groping_episodes_count": self.groping_episodes_count,
            "mean_motor_acoustic_latency_ms": round(mean_latency, 1),
            "mandibular_rom_deg": round(rom_deg, 1),
            "max_semg_uv": round(max_semg, 1),
            "synchrony_score_pct": synchrony_index,
            "groping_risk_level": "Yüksek" if self.groping_episodes_count >= 3 or mean_latency > 500 else "Normal/Düşük",
            "timestamp": int(time.time() * 1000),
        }
        log.info(f"[Füzyon] Kayıt Tamamlandı: {report}")
        return report

    def process_packet(self, packet: Dict[str, Any]) -> Dict[str, Any]:
        """
        Tek bir 100 Hz sensör paketini işler, kalibrasyon ofsetini uygular,
        akustik-motor füzyonunu gerçekleştirir ve Groping durumunu belirler.
        """
        now_ms = packet.get("timestamp_ms", int(time.time() * 1000))
        raw_pitch = float(packet.get("imu_pitch_deg", 0.0))
        raw_roll  = float(packet.get("imu_roll_deg", 0.0))
        raw_yaw   = float(packet.get("imu_yaw_deg", 0.0))

        # 1. Kalibrasyon / Tare Ofseti Uygulama
        calibrated_pitch = round(raw_pitch - self.offset_pitch, 2)
        calibrated_roll  = round(raw_roll - self.offset_roll, 2)
        calibrated_yaw   = round(raw_yaw - self.offset_yaw, 2)

        # Baseline Takibi
        if self.baseline_pitch is None:
            self.baseline_pitch = calibrated_pitch
        else:
            # Yavaş hareket eden alt taban (0.999 alfa)
            self.baseline_pitch = 0.999 * self.baseline_pitch + 0.001 * calibrated_pitch

        delta_pitch = abs(calibrated_pitch - (self.baseline_pitch or 0.0))

        # 2. Motor Aktivasyon Durumu (sEMG veya Çene Hareketi)
        semg_uv = float(packet.get("semg_left_uv", 0.0))
        is_motor_active = (semg_uv >= MOTOR_EFFORT_SEMG_UV_THRESHOLD) or (delta_pitch >= MOTOR_EFFORT_PITCH_DELTA_DEG)

        # 3. Akustik Ses Varlık Durumu (INMP441 VAD / RMS)
        mic_voiced = bool(packet.get("mic_voiced", False))
        mic_rms_db = float(packet.get("mic_rms_db", -60.0))
        is_acoustic_active = mic_voiced or (mic_rms_db >= ACOUSTIC_VOICED_RMS_DB_THRESH)

        # 4. Groping (Motor Arama) Algoritması (Basamak VI: Koartikülasyon)
        groping_detected = False
        motor_acoustic_latency_ms = 0.0

        if is_motor_active:
            if not self.is_motor_effort_active:
                # Motor efor yeni başladı -> Kronometre aç
                self.is_motor_effort_active = True
                self.motor_onset_timestamp_ms = now_ms
            else:
                # Motor efor devam ediyor, akustik ses var mı?
                elapsed_ms = now_ms - (self.motor_onset_timestamp_ms or now_ms)
                if not is_acoustic_active:
                    if elapsed_ms >= GROPING_LATENCY_THRESHOLD_MS:
                        # 400 ms geçtiği halde ses üretilemedi -> GROPING TESPİT EDİLDİ
                        groping_detected = True
                        motor_acoustic_latency_ms = float(elapsed_ms)
                        if not self.last_groping_detected:
                            self.groping_episodes_count += 1
                else:
                    # Akustik ses başladı -> Efor başarılı hedefe ulaştı
                    motor_acoustic_latency_ms = float(elapsed_ms)
                    self.is_motor_effort_active = False
                    self.motor_onset_timestamp_ms = None
        else:
            self.is_motor_effort_active = False
            self.motor_onset_timestamp_ms = None

        self.last_groping_detected = groping_detected
        self.last_motor_acoustic_latency_ms = motor_acoustic_latency_ms

        # Füzyon Metriklerini Pakete Zenginleştir
        fused_packet = dict(packet)
        fused_packet.update({
            "raw_pitch_deg":              raw_pitch,
            "calibrated_pitch_deg":        calibrated_pitch,
            "calibrated_roll_deg":         calibrated_roll,
            "calibrated_yaw_deg":          calibrated_yaw,
            "is_calibrated":               self.is_calibrated,
            "is_motor_active":             is_motor_active,
            "is_acoustic_active":          is_acoustic_active,
            "groping_detected":            groping_detected,
            "motor_acoustic_latency_ms":   round(motor_acoustic_latency_ms, 1),
            "groping_episodes_count":      self.groping_episodes_count,
            # Grafik bileşenlerinin doğrudan kalibre edilmiş açıyı kullanması için
            "imu_pitch_deg":               calibrated_pitch,
        })

        # Kayan pencereye ekle
        self.packet_window.append(fused_packet)

        # C Grubu Füzyon Kaydı aktifse oturuma ekle
        if self.is_fusion_recording:
            self.fusion_record_packets.append(fused_packet)

        return fused_packet
