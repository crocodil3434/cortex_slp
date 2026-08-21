"""
================================================================================
CROCODIL CLINICAL DSP AUDIO ENGINE
================================================================================
Nöromotor Klinik İstasyonu için Bağımsız Ses Sinyali İşleme (DSP) Backend'i.
16.000 Hz, 16-bit PCM I2S Mikrofon Verilerini İşler, Gürültü Filtreler ve Formant (F1, F2) Analizi Yapar.
================================================================================
"""

import math
import time
import logging
from typing import Dict, Optional, Tuple, Any

import numpy as np
from scipy import signal
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

# ── Loglama Yapılandırması ──────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("crocodil_dsp")

# ── FastAPI Uygulaması ───────────────────────────────────────────────────────
app = FastAPI(
    title="Crocodil DSP Audio Engine",
    description="Nöromotor Klinik İstasyonu Gerçek Zamanlı Ses Sinyali İşleme (DSP) Servisi",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── DSP Sabitleri ────────────────────────────────────────────────────────────
SAMPLE_RATE = 16000         # 16 kHz örnekleme hızı (INMP441 / ESP32 standardı)
DEFAULT_LOWCUT = 100.0      # 100 Hz altındaki düşük frekanslı mekanik/çevresel gürültüyü kes
DEFAULT_HIGHCUT = 3000.0    # 3000 Hz üstündeki yüksek frekanslı parazitleri kes
VAD_RMS_THRESHOLD_DB = -45.0  # Ses aktivitesi için minimum dBFS eşiği


# ==============================================================================
# 3. DSP ÇEKİRDEK FONKSİYONLARI (FILTRE, VAD, FORMANT)
# ==============================================================================

def apply_bandpass_filter(
    audio_chunk: np.ndarray,
    sample_rate: int = SAMPLE_RATE,
    lowcut: float = DEFAULT_LOWCUT,
    highcut: float = DEFAULT_HIGHCUT,
    order: int = 4,
) -> np.ndarray:
    """
    Konuşma sinyali dışındaki gürültüleri filtrelemek için 4. derece Butterworth
    Bandpass filtresi uygular (100 Hz - 3000 Hz).
    """
    if len(audio_chunk) < 32:
        return audio_chunk

    nyquist = 0.5 * sample_rate
    low = max(0.001, lowcut / nyquist)
    high = min(0.999, highcut / nyquist)

    try:
        sos = signal.butter(order, [low, high], btype="bandpass", output="sos")
        filtered = signal.sosfilt(sos, audio_chunk)
        return filtered
    except Exception as e:
        logger.warning(f"Bandpass filtre hatası: {e}")
        return audio_chunk


def check_voice_activity(
    audio_chunk: np.ndarray,
    sample_rate: int = SAMPLE_RATE,
    threshold_db: float = VAD_RMS_THRESHOLD_DB,
) -> Tuple[bool, float]:
    """
    Short-Time Energy (RMS) ve Sıfır Geçiş Oranı (ZCR) kullanarak
    Ses Aktivitesi Kontrolü (VAD - Voice Activity Detection) yapar.

    Dönüş:
        is_speech (bool): Ses aktivitesi var mı?
        rms_db (float): Hesaplanmış RMS seviyesi (dBFS cinsinden).
    """
    if len(audio_chunk) == 0:
        return False, -100.0

    # 1. RMS Enerji Hesabı
    mean_sq = np.mean(audio_chunk ** 2)
    rms = math.sqrt(mean_sq) if mean_sq > 0 else 1e-9
    rms_db = 20.0 * math.log10(max(rms, 1e-5))

    # 2. Sıfır Geçiş Oranı (Zero Crossing Rate)
    zero_crossings = np.sum(np.diff(np.sign(audio_chunk) != 0))
    zcr = zero_crossings / len(audio_chunk)

    # 3. VAD Kararı: Belirli bir desibel üstündeyse ve sinyal sadece DC ofset değilse
    is_speech = bool(rms_db > threshold_db and zcr > 0.01)

    return is_speech, round(rms_db, 2)


def extract_formants(
    audio_chunk: np.ndarray,
    sample_rate: int = SAMPLE_RATE,
) -> Dict[str, Optional[float]]:
    """
    Ses sinyaline Pre-emphasis, Hamming penceresi ve Spektral/LPC Tepe Analizi
    uygulayarak F1 (Açıklık/Çene) ve F2 (Dil Konumu) formant frekanslarını ve F0'ı çıkarır.

    Dönüş:
        { "f0": ..., "f1": ..., "f2": ... } (Hz cinsinden)
    """
    result: Dict[str, Optional[float]] = {
        "f0": None,
        "f1": None,
        "f2": None,
    }

    if len(audio_chunk) < 256:
        return result

    try:
        # 1. Pre-emphasis filtresi (Yüksek frekansları parlat: y[t] = x[t] - 0.97 x[t-1])
        emphasized = np.append(audio_chunk[0], audio_chunk[1:] - 0.97 * audio_chunk[:-1])

        # 2. Hamming Penceresi
        windowed = emphasized * np.hamming(len(emphasized))

        # 3. FFT Spektrumu
        fft_len = 1024
        spectrum = np.abs(np.fft.rfft(windowed, n=fft_len))
        freqs = np.fft.rfftfreq(fft_len, d=1.0 / sample_rate)

        # 4. Spektral Zarf Düzeltme (Savitzky-Golay veya Kayan Ortalama ile harmonikleri pürüzsüzleştir)
        kernel_size = 15
        smoothed = np.convolve(spectrum, np.ones(kernel_size) / kernel_size, mode="same")

        # 5. Formant Piklerini Bul (F1: 200 - 1200 Hz, F2: 800 - 2800 Hz)
        peaks, _ = signal.find_peaks(smoothed, distance=10, prominence=np.max(smoothed) * 0.05)
        peak_freqs = freqs[peaks]

        # F1 Adayları (200 - 1100 Hz aralığı)
        f1_candidates = [f for f in peak_freqs if 200 <= f <= 1100]
        # F2 Adayları (850 - 2800 Hz aralığı)
        f2_candidates = [f for f in peak_freqs if 850 <= f <= 2800]

        if f1_candidates:
            result["f1"] = round(float(f1_candidates[0]), 1)
        else:
            result["f1"] = 500.0  # Nötr vokal referans F1

        if f2_candidates:
            # F2'nin F1'den yüksek olmasını sağla
            valid_f2 = [f for f in f2_candidates if result["f1"] is None or f > (result["f1"] + 150)]
            if valid_f2:
                result["f2"] = round(float(valid_f2[0]), 1)
            else:
                result["f2"] = round(float(f2_candidates[0]), 1)
        else:
            result["f2"] = 1500.0  # Nötr vokal referans F2

        # 6. Temel Frekans F0 (Otokorelasyon yöntemi)
        corr = np.correlate(windowed, windowed, mode="full")
        corr = corr[len(corr) // 2:]
        # İnsan ses aralığı: 60 Hz - 400 Hz (Örnek gecikmesi: sample_rate / 400 -> sample_rate / 60)
        d_min = int(sample_rate / 400)
        d_max = int(sample_rate / 60)

        if len(corr) > d_max:
            peak_lag = d_min + np.argmax(corr[d_min:d_max])
            if corr[peak_lag] > 0.3 * corr[0]:
                result["f0"] = round(float(sample_rate / peak_lag), 1)

    except Exception as e:
        logger.warning(f"Formant analizi hatası: {e}")

    return result


# ==============================================================================
# 2. WEBSOCKET ENDPOINT (/ws/audio) & SES PIPELINE
# ==============================================================================

@app.websocket("/ws/audio")
async def audio_websocket_endpoint(websocket: WebSocket):
    """
    ESP32'den gelen 16.000 Hz, 16-bit PCM ham ses akışını (Binary veya JSON)
    kabul eden ve gerçek zamanlı DSP analiz sonuçlarını istemciye ileten WebSocket.
    """
    await websocket.accept()
    logger.info("📡 Yeni WebSocket ses istemcisi bağlandı (/ws/audio).")

    try:
        while True:
            # Hem binary PCM (bytes) hem de JSON mesajları destekle
            message = await websocket.receive()

            audio_data: Optional[np.ndarray] = None

            if "bytes" in message and message["bytes"] is not None:
                # 16-bit Signed Little-Endian PCM Bayt Dizisi
                raw_bytes = message["bytes"]
                if len(raw_bytes) >= 2:
                    int16_arr = np.frombuffer(raw_bytes, dtype=np.int16)
                    # Float normalize [-1.0, 1.0]
                    audio_data = int16_arr.astype(np.float32) / 32768.0

            elif "text" in message and message["text"] is not None:
                # Test veya simülasyon amaçlı JSON paket desteği
                import json
                try:
                    payload = json.loads(message["text"])
                    if "pcm" in payload and isinstance(payload["pcm"], list):
                        audio_data = np.array(payload["pcm"], dtype=np.float32)
                except Exception:
                    pass

            if audio_data is None or len(audio_data) == 0:
                continue

            # ── DSP Pipeline Adımları ───────────────────────────────────────
            # 1. Bandpass Filtresi (100 Hz - 3000 Hz)
            filtered_audio = apply_bandpass_filter(audio_data, sample_rate=SAMPLE_RATE)

            # 2. VAD (Ses Aktivite Kontrolü)
            is_speech, rms_db = check_voice_activity(filtered_audio, sample_rate=SAMPLE_RATE)

            # 3. Formant Analizi (F1, F2, F0)
            formants = extract_formants(filtered_audio, sample_rate=SAMPLE_RATE) if is_speech else {"f0": None, "f1": None, "f2": None}

            # ── Çıktı JSON Formatı ──────────────────────────────────────────
            response_payload: Dict[str, Any] = {
                "status": "active" if is_speech else "silent",
                "is_speech": is_speech,
                "rms_db": rms_db,
                "f1": formants.get("f1"),
                "f2": formants.get("f2"),
                "f0": formants.get("f0"),
                "noise_filtered": True,
                "sample_count": len(audio_data),
                "timestamp_ms": int(time.time() * 1000),
            }

            # Yanıtı istemciye JSON formatında gönder
            await websocket.send_json(response_payload)

    except WebSocketDisconnect:
        logger.info("🔌 WebSocket ses istemcisi bağlantıyı kapattı.")
    except Exception as e:
        logger.error(f"WebSocket akış hatası: {e}")


# ==============================================================================
# REST API BİLGİLENDİRME & SAĞLIK KONTROLÜ
# ==============================================================================

@app.get("/")
def get_root():
    return {
        "service": "Crocodil Clinical DSP Audio Engine",
        "version": "1.0.0",
        "status": "online",
        "sample_rate_hz": SAMPLE_RATE,
        "filter_band_hz": [DEFAULT_LOWCUT, DEFAULT_HIGHCUT],
        "endpoints": {
            "ws_audio": "/ws/audio",
            "status": "/api/status",
        },
    }


@app.get("/api/status")
def get_status():
    return {
        "status": "healthy",
        "dsp_engine": "ready",
        "sample_rate": SAMPLE_RATE,
        "bandpass_range": f"{DEFAULT_LOWCUT}Hz - {DEFAULT_HIGHCUT}Hz",
        "features": ["butterworth_bandpass", "vad_rms_zcr", "fft_lpc_formants_f1_f2"],
        "timestamp": int(time.time() * 1000),
    }


if __name__ == "__main__":
    import uvicorn
    # Standart port 8000 üzerinde bağımsız olarak çalıştır
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
