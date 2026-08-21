"""
test_sensor_fusion.py
=====================
SensorFusionEngine unit tests verifying:
  1. MPU Tare Calibration (Zero offset).
  2. Groping Detection (Motor effort onset > 400ms without acoustic output).
  3. Non-Groping scenario (Acoustic output arrives in <400ms).
  4. C Group Fusion Recording session summary metrics.
"""

import unittest
from sensor_fusion import SensorFusionEngine


class TestSensorFusion(unittest.TestCase):

    def setUp(self):
        self.engine = SensorFusionEngine()

    def test_calibration(self):
        # Ham açı 15.5 derece iken kalibre et
        self.engine.calibrate_mpu(15.5, 2.0, 1.0)
        self.assertEqual(self.engine.offset_pitch, 15.5)

        # Yeni gelen paket ham 15.5 ise kalibre edilmiş açı 0.0 olmalı
        pkt = {
            "timestamp_ms": 1000,
            "imu_pitch_deg": 15.5,
            "imu_roll_deg": 2.0,
            "imu_yaw_deg": 1.0,
            "semg_left_uv": 10.0,
            "mic_rms_db": -50.0,
            "mic_voiced": False,
        }
        fused = self.engine.process_packet(pkt)
        self.assertAlmostEqual(fused["calibrated_pitch_deg"], 0.0, places=2)
        self.assertAlmostEqual(fused["imu_pitch_deg"], 0.0, places=2)

    def test_groping_detection(self):
        # 1. Başlangıç: İstirahat (Motor efor yok, ses yok)
        p0 = {
            "timestamp_ms": 1000,
            "imu_pitch_deg": 0.0,
            "semg_left_uv": 10.0,
            "mic_rms_db": -50.0,
            "mic_voiced": False,
        }
        f0 = self.engine.process_packet(p0)
        self.assertFalse(f0["groping_detected"])

        # 2. Motor efor başladı (sEMG = 75 uV > 50 uV), ses henüz yok
        p1 = {
            "timestamp_ms": 1100,
            "imu_pitch_deg": 1.0,
            "semg_left_uv": 75.0,
            "mic_rms_db": -50.0,
            "mic_voiced": False,
        }
        f1 = self.engine.process_packet(p1)
        self.assertTrue(f1["is_motor_active"])
        # 100ms geçti (<400ms) -> henüz groping bayrağı kalkmamalı
        self.assertFalse(f1["groping_detected"])

        # 3. Motor efor devam ediyor, aradan 450ms geçti (toplam 550ms efor), ses hala YOK
        p2 = {
            "timestamp_ms": 1650,
            "imu_pitch_deg": 2.0,
            "semg_left_uv": 80.0,
            "mic_rms_db": -50.0,
            "mic_voiced": False,
        }
        f2 = self.engine.process_packet(p2)
        # > 400ms motor efor akustik olmaksızın sürdü -> GROPING TESPİT EDİLMELİ!
        self.assertTrue(f2["groping_detected"])
        self.assertGreaterEqual(f2["motor_acoustic_latency_ms"], 400.0)
        self.assertEqual(f2["groping_episodes_count"], 1)

    def test_normal_articulation_no_groping(self):
        # Motor efor başladı ve 150ms sonra ses çıktı
        p1 = {
            "timestamp_ms": 1000,
            "imu_pitch_deg": 5.0,
            "semg_left_uv": 60.0,
            "mic_rms_db": -50.0,
            "mic_voiced": False,
        }
        self.engine.process_packet(p1)

        # 150ms sonra ses oluştu (mic_voiced = True)
        p2 = {
            "timestamp_ms": 1150,
            "imu_pitch_deg": 12.0,
            "semg_left_uv": 65.0,
            "mic_rms_db": -22.0,
            "mic_voiced": True,
        }
        f2 = self.engine.process_packet(p2)
        self.assertFalse(f2["groping_detected"])
        self.assertAlmostEqual(f2["motor_acoustic_latency_ms"], 150.0, places=1)

    def test_fusion_recording_session(self):
        self.engine.start_fusion_recording()
        for t in range(100):
            self.engine.process_packet({
                "timestamp_ms": 1000 + t * 10,
                "imu_pitch_deg": 10.0 + (t % 5),
                "semg_left_uv": 30.0 + (t % 20),
                "mic_rms_db": -30.0,
                "mic_voiced": True,
            })
        rep = self.engine.stop_fusion_recording()
        self.assertEqual(rep["packet_count"], 100)
        self.assertIn("synchrony_score_pct", rep)
        self.assertIn("groping_risk_level", rep)


if __name__ == "__main__":
    unittest.main()
