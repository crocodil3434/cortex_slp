"""
Modül 105 – Ana Sunucu
=======================
FastAPI + native WebSocket endpoint (port 8765).

Endpoints:
  WS  /ws/stream          – 100 Hz canlı sensör akışı (tek yönlü, server→client)
  WS  /ws/control         – Çift yönlü kontrol kanalı (komut gönder / durum al)
  GET /api/status         – Sunucu durumu (JSON)
  GET /api/session/start  – Yeni simülasyon seansı başlat
  GET /api/session/stop   – Seansı durdur

Mimari notlar:
  - Her bağlanan WebSocket client bağımsız bir MockDataGenerator alır.
  - Bağlantı koparsa kaynak otomatik temizlenir (finally bloğu).
  - Gerçek ESP32 bağlandığında bu sunucu yalnızca /ws/control'ü korur;
    ESP32, /ws/stream'i doğrudan besler.
"""

import asyncio
import json
import logging
import time
import uuid
from contextlib import asynccontextmanager
from typing import Any

import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from mock_generator import MockDataGenerator, HAYDEN_LEVELS

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s %(name)s – %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("m105.server")


from collections import deque

# ---------------------------------------------------------------------------
# Bağlantı Yöneticisi (100% Gerçek ESP32 Donanım Akışı)
# ---------------------------------------------------------------------------

class ConnectionManager:
    """Aktif WebSocket bağlantılarını ve ESP32 canlı donanım veri akışını yönetir."""

    def __init__(self):
        # client_id → {"ws": WebSocket, "is_hardware": bool, "connected_at": float}
        self._clients: dict[str, dict[str, Any]] = {}
        self._latest_hardware_packet: dict[str, Any] | None = None
        # Son 10.000 paketi (yaklaşık 100 sn) tutan ring buffer
        self.hardware_buffer: deque[dict[str, Any]] = deque(maxlen=10000)

    def client_count(self) -> int:
        return len(self._clients)

    def get_hardware_packets(self, count: int = 500) -> list[dict[str, Any]]:
        """Seans kaydı ve sinyal işleme için son gerçek donanım paketlerini döner."""
        items = list(self.hardware_buffer)
        return items[-count:] if len(items) > count else items

    async def broadcast_hardware_packet(self, sender_id: str, packet: dict):
        """ESP32'den gelen donanım verisini ring buffer'a kaydet ve tüm tarayıcılara ilet."""
        self._latest_hardware_packet = packet
        self.hardware_buffer.append(packet)

        disconnected = []
        for cid, entry in list(self._clients.items()):
            if cid != sender_id:
                try:
                    await entry["ws"].send_text(json.dumps(packet, ensure_ascii=False))
                except Exception:
                    disconnected.append(cid)
        for cid in disconnected:
            await self.disconnect(cid)

    async def send_command(self, cmd: str, data: dict | None = None):
        """Tüm bağlı istemcilere ve ESP32'ye komut ilet (örn: start_test, stop_test)."""
        payload = {"cmd": cmd, **(data or {})}
        raw = json.dumps(payload, ensure_ascii=False)
        for cid, entry in list(self._clients.items()):
            try:
                await entry["ws"].send_text(raw)
            except Exception:
                pass

    async def connect_stream(
        self,
        ws: WebSocket,
        hayden_level: int = 4,
    ) -> str:
        """Tarayıcı veya ESP32 WebSocket bağlantısını kabul et."""
        await ws.accept()
        client_id = str(uuid.uuid4())[:8]

        self._clients[client_id] = {
            "ws": ws,
            "connected_at": time.time(),
            "hayden_level": hayden_level,
        }

        # Eğer son paket varsa bağlanır bağlanmaz tarayıcıya gönder
        if self._latest_hardware_packet:
            try:
                await ws.send_text(json.dumps(self._latest_hardware_packet, ensure_ascii=False))
            except Exception:
                pass

        log.info(f"[+] Client {client_id} bağlandı (Donanım/Web) | Toplam: {self.client_count()}")
        return client_id

    async def disconnect(self, client_id: str):
        """Bağlantıyı temizle."""
        if client_id in self._clients:
            self._clients.pop(client_id)
            log.info(f"[-] Client {client_id} ayrıldı | Kalan: {self.client_count()}")

    def get_status(self) -> list[dict]:
        now = time.time()
        return [
            {
                "client_id": cid,
                "uptime_s": round(now - c["connected_at"], 1),
                "has_hardware": self._latest_hardware_packet is not None,
                "buffer_size": len(self.hardware_buffer),
            }
            for cid, c in self._clients.items()
        ]


manager = ConnectionManager()


# ---------------------------------------------------------------------------
# Uygulama Yaşam Döngüsü
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("=" * 55)
    log.info("  Modül 105 – PROMPT Kinematik & Akustik İstasyonu")
    log.info("  Hayden (1986) Motor Konuşma Hiyerarşisi Simülatörü")
    log.info("  Port: 8765  |  Faz 1 – Mock Mod")
    log.info("=" * 55)
    yield
    log.info("Sunucu kapatılıyor, bağlantılar temizleniyor…")


# ---------------------------------------------------------------------------
# FastAPI Uygulaması
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Modül 105 – PROMPT Kinematik & Akustik İstasyonu",
    description=(
        "Hayden (1986) Motor Konuşma Hiyerarşisi tabanlı, "
        "ESP32 hedefli klinik ölçüm istasyonu. "
        "Faz 1: Mock veri simülasyonu."
    ),
    version="1.0.0-faz1",
    lifespan=lifespan,
)

# CORS – Next.js dev sunucusu (3000) ve herhangi localhost'a izin ver
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# REST Endpointleri
# ---------------------------------------------------------------------------

@app.get("/api/status", tags=["Sunucu"])
async def get_status():
    """Sunucu ve bağlı client durumu."""
    return JSONResponse({
        "status":             "online",
        "mode":               "esp32_hardware",
        "hardware_connected": manager._latest_hardware_packet is not None,
        "buffer_size":        len(manager.hardware_buffer),
        "clients":            manager.get_status(),
        "client_count":       manager.client_count(),
        "hayden_levels":      HAYDEN_LEVELS,
        "timestamp":          int(time.time() * 1000),
    })


@app.post("/api/test/start", tags=["Test Kontrol"])
async def start_test():
    """Yeni test kaydını başlatır (tamponu sıfırlar ve ESP32'ye start komutu yollar)."""
    manager.hardware_buffer.clear()
    await manager.send_command("start_test")
    log.info("[Test] >>> TEST BASLATILDI (Tampon sifirlandi) <<<")
    return JSONResponse({"success": True, "status": "test_started", "timestamp": int(time.time() * 1000)})


@app.post("/api/test/stop", tags=["Test Kontrol"])
async def stop_test():
    """Testi durdurur ve ESP32'ye stop komutu yollar."""
    await manager.send_command("stop_test")
    log.info(f"[Test] >>> TEST DURDURULDU ({len(manager.hardware_buffer)} paket kaydedildi) <<<")
    return JSONResponse({
        "success": True,
        "status": "test_stopped",
        "packet_count": len(manager.hardware_buffer),
        "timestamp": int(time.time() * 1000),
    })


from pydantic import BaseModel
from database import (
    init_db, get_connection, ekle_danisan, ekle_seans, ekle_olcum,
    seans_hiyerarsi_raporu, toplu_zscore, DB_PATH,
    get_supabase_client,
)
from signal_processor import SignalPipeline


class SaveSessionRequest(BaseModel):
    crocodil_client_id: str
    ad: str
    soyad: str
    dogum_tarihi: str = "1990-01-01"
    cinsiyet: str = "kadın"
    birincil_tani: str = "dizartri"
    seans_amaci: str = "baseline_olcum"
    klinisyen_notu: str = ""
    nihai_tani_etiketi: str = ""   # Ground Truth ML etiketi
    hayden_level: int = 4


@app.post("/api/sessions/save", tags=["Seans Kaydı"])
async def save_session(req: SaveSessionRequest):
    """
    Modül 105 seansını işler, Z-skorlarını hesaplar ve SQLite veritabanına kaydeder.
    Crocodil frontend'ine tam yapılandırılmış 7 basamaklı klinik rapor döner.
    """
    conn = get_connection(DB_PATH)
    try:
        # 1. Danışan kaydı bul veya oluştur
        row = conn.execute(
            "SELECT id FROM Danisanlar WHERE crocodil_client_id = ?",
            (req.crocodil_client_id,)
        ).fetchone()

        if row:
            danisan_id = row["id"]
        else:
            danisan_id = ekle_danisan(
                conn,
                crocodil_client_id=req.crocodil_client_id,
                ad=req.ad,
                soyad=req.soyad,
                dogum_tarihi=req.dogum_tarihi,
                cinsiyet=req.cinsiyet,
                birincil_tani=req.birincil_tani,
            )

        # 2. Seans oluştur
        seans_count = conn.execute(
            "SELECT COUNT(*) FROM Seanslar WHERE danisan_id = ?",
            (danisan_id,)
        ).fetchone()[0]

        seans_id = ekle_seans(
            conn,
            danisan_id=danisan_id,
            seans_tarihi=time.strftime("%Y-%m-%dT%H:%M:%S"),
            seans_no=seans_count + 1,
            seans_amaci=req.seans_amaci,
            klinisyen_notu=req.klinisyen_notu,
        )

        # 3. Danışan yaşını hesapla
        try:
            birth_year = int(req.dogum_tarihi.split("-")[0])
            danisan_yas = max(4, min(99, 2026 - birth_year))
        except Exception:
            danisan_yas = 40

        # 4. Sinyal İşleme Hattı ile gerçek ESP32 donanım verilerini işle ve Z-skorlarıyla kaydet
        hardware_packets = manager.get_hardware_packets(count=500)
        pipeline = SignalPipeline()
        if hardware_packets:
            for pkt in hardware_packets:
                pipeline.process_packet(pkt)
        else:
            # Eğer henüz donanım paketi gelmemişse nötr tek paket ekle
            log.warning("Donanım tamponunda paket bulunamadı — boş seans işleniyor")
            pipeline.process_packet({
                "timestamp_ms": int(time.time() * 1000),
                "imu_pitch_deg": 0.0,
                "imu_roll_deg": 0.0,
                "imu_yaw_deg": 0.0,
                "imu_accel_x": 0.0,
                "imu_accel_y": 0.0,
                "imu_accel_z": 9.8,
                "semg_left_uv": 0.0,
                "semg_right_uv": 0.0,
                "semg_asymmetry_pct": 0.0,
                "resp_waveform": 0.0,
                "resp_rate_bpm": 0.0,
                "mic_rms_db": -60.0,
                "mic_f0_hz": 0.0,
                "mic_voiced": False,
                "hayden_level": req.hayden_level,
                "session_phase": "görev",
            })

        inserted_records = pipeline.finalize_and_save_session(
            conn=conn,
            seans_id=seans_id,
            danisan_yas=danisan_yas,
            danisan_cinsiyet=req.cinsiyet,
        )

        # 5. Hiyerarşi özet raporunu oku
        rapor = seans_hiyerarsi_raporu(conn, seans_id)

        # 6. Crocodil motor speech payload'ı oluştur
        l4_rec = next((r for r in inserted_records if r.get("hayden_seviye") == 4), {})
        l2_rec = next((r for r in inserted_records if r.get("hayden_seviye") == 2), {})
        l1_rec = next((r for r in inserted_records if r.get("hayden_seviye") == 1), {})
        l7_rec = next((r for r in inserted_records if r.get("hayden_seviye") == 7), {})

        crocodil_payload = {
            "m105SessionId": seans_id,
            "m105Timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
            "diagnosisType": req.birincil_tani,
            "dysarthriaType": req.birincil_tani,
            "ddkAmr": l4_rec.get("l4_ddk_hz", 4.8),
            "ddkSmr": round(l4_rec.get("l4_ddk_hz", 4.8) * 0.85, 1),
            "mandibularRomDeg": l4_rec.get("l4_cene_acisi_range_deg", 14.5),
            "semgAsymmetryPct": l4_rec.get("l4_semg_asimetri_pct", 8.4),
            "respirationRateBpm": l1_rec.get("l1_solunum_hizi_bpm", 15.0),
            "f0MedianHz": l2_rec.get("l2_f0_hz", 120.0),
            "jitterPct": l2_rec.get("l2_jitter_pct", 0.9),
            "shimmerPct": l2_rec.get("l2_shimmer_pct", 4.8),
            "hnrDb": l2_rec.get("l2_hnr_db", 16.5),
            "motorSynchronyIndex": l7_rec.get("l7_motor_senkroni_indeks", 0.88),
            "notes": (
                f"Modül 105 PROMPT İstasyonu Değerlendirmesi: "
                f"DDK {l4_rec.get('l4_ddk_hz', 4.8)} Hz, "
                f"Çene Açıklığı {l4_rec.get('l4_cene_acisi_range_deg', 14.5)}°, "
                f"sEMG Asimetri %{l4_rec.get('l4_semg_asimetri_pct', 8.4)}."
            ),
        }

        # 7. Supabase'e paralel yaz (graceful — hata olsa SQLite yanıtı yine döner)
        supabase_session_id: str | None = None
        try:
            sb = get_supabase_client()
            if sb:
                # Z-skor sözlüğünü oluştur
                zscore_dict: dict = {}
                for rec in inserted_records:
                    zj = rec.get("zscore_sonuclar_json")
                    if isinstance(zj, str):
                        try:
                            zscore_dict.update(json.loads(zj))
                        except Exception:
                            pass
                    elif isinstance(zj, dict):
                        zscore_dict.update(zj)

                # Hiyerarşi metriklerini tek dict'e topla
                hierarchy_metrics_dict: dict = {}
                for rec in inserted_records:
                    lvl = rec.get("hayden_seviye") or rec.get("hayden_level")
                    if lvl:
                        hierarchy_metrics_dict[f"l{lvl}"] = {
                            k: v for k, v in rec.items()
                            if k not in ("id", "seans_id", "olusturulma_tarihi",
                                         "zscore_sonuclar_json")
                        }

                import asyncio
                supabase_session_id = await sb.save_session(
                    client_id=req.crocodil_client_id,
                    session_number=seans_count + 1,
                    session_goal=req.seans_amaci,
                    hayden_level=req.hayden_level,
                    klinisyen_notu=req.klinisyen_notu,
                    nihai_tani_etiketi=req.nihai_tani_etiketi,
                    hierarchy_metrics=hierarchy_metrics_dict,
                    zscore_results=zscore_dict,
                    crocodil_payload=crocodil_payload,
                    sqlite_session_id=seans_id,
                )
        except Exception as sb_err:
            log.warning(f"Supabase yazma atlandı: {sb_err}")

        return JSONResponse({
            "success": True,
            "seans_id": seans_id,
            "supabase_session_id": supabase_session_id,
            "danisan_id": danisan_id,
            "seans_no": seans_count + 1,
            "crocodil_payload": crocodil_payload,
            "hayden_records": inserted_records,
            "rapor_ozet": rapor,
        })
    finally:
        conn.close()


@app.get("/api/supabase/test", tags=["Supabase"])
async def test_supabase():
    """Supabase bağlantısını doğrula (m105_sessions tablosuna erişim)."""
    sb = get_supabase_client()
    if not sb:
        return JSONResponse({"ok": False, "msg": "SupabaseClient oluşturulamadı — .env dosyasını kontrol edin"}, status_code=503)
    result = await sb.test_connection()
    return JSONResponse(result, status_code=200 if result["ok"] else 503)


@app.get("/api/clients/{client_id}/m105sessions", tags=["Supabase"])
async def get_client_m105_sessions(client_id: str):
    """Danışanın Supabase'deki Modül 105 seans geçmişi."""
    sb = get_supabase_client()
    if not sb:
        return JSONResponse({"sessions": [], "source": "supabase_unavailable"})
    sessions = await sb.get_client_sessions(client_id)
    return JSONResponse({"sessions": sessions, "source": "supabase", "count": len(sessions)})


@app.get("/api/clients/{client_id}/sessions", tags=["Danışan Seansları"])
async def get_client_sessions(client_id: str):
    """Danışanın geçmiş tüm Modül 105 seanslarını döner."""
    conn = get_connection(DB_PATH)
    try:
        danisan = conn.execute(
            "SELECT * FROM Danisanlar WHERE crocodil_client_id = ?",
            (client_id,)
        ).fetchone()

        if not danisan:
            return JSONResponse({"sessions": []})

        rows = conn.execute("""
            SELECT s.id, s.seans_no, s.seans_tarihi, s.seans_amaci, s.klinisyen_notu,
                   h.l4_ddk_hz, h.l4_cene_acisi_max_deg, h.l4_semg_asimetri_pct,
                   h.l2_f0_hz, h.l7_genel_siddet, h.zscore_sonuclar_json
            FROM Seanslar s
            LEFT JOIN Hiyerarsi_Olcumleri h ON h.seans_id = s.id AND h.hayden_seviye = 4
            WHERE s.danisan_id = ?
            ORDER BY s.seans_tarihi DESC
        """, (danisan["id"],)).fetchall()

        sessions = []
        for r in rows:
            sessions.append({
                "id": r["id"],
                "seans_no": r["seans_no"],
                "seans_tarihi": r["seans_tarihi"],
                "seans_amaci": r["seans_amaci"],
                "klinisyen_notu": r["klinisyen_notu"],
                "l4_ddk_hz": r["l4_ddk_hz"],
                "l4_cene_acisi_max_deg": r["l4_cene_acisi_max_deg"],
                "l4_semg_asimetri_pct": r["l4_semg_asimetri_pct"],
                "l2_f0_hz": r["l2_f0_hz"],
                "l7_genel_siddet": r["l7_genel_siddet"],
                "z_scores": json.loads(r["zscore_sonuclar_json"]) if r["zscore_sonuclar_json"] else {},
            })

        return JSONResponse({"sessions": sessions})
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# WebSocket – Canlı Veri Akışı  (/ws/stream)
# ---------------------------------------------------------------------------

@app.websocket("/ws/stream")
async def websocket_stream(ws: WebSocket):
    """
    100 Hz canlı sensör akışı.

    Query parametreleri:
      - hayden_level: int (1-7, varsayılan 4 – Artikülasyon)

    Paket formatı (JSON, 10ms aralık):
      {
        "timestamp_ms":       1724000000000,
        "imu_pitch_deg":      -3.14,
        "imu_roll_deg":        1.07,
        "imu_yaw_deg":         0.55,
        "imu_accel_x":        -0.54,
        "imu_accel_y":         0.01,
        "imu_accel_z":         9.79,
        "semg_left_uv":       42.3,
        "semg_right_uv":      38.7,
        "semg_asymmetry_pct":  4.8,
        "resp_waveform":       0.73,
        "resp_rate_bpm":      15.8,
        "mic_rms_db":        -18.4,
        "mic_f0_hz":         118.3,
        "mic_voiced":         true,
        "hayden_level":        4,
        "session_phase":      "görev"
      }
    """
    # Query parametresini elle oku (FastAPI WS'de Query() desteği sınırlı)
    try:
        level_raw = ws.query_params.get("hayden_level", "4")
        hayden_level = max(1, min(7, int(level_raw)))
    except (ValueError, TypeError):
        hayden_level = 4

    client_id = await manager.connect_stream(ws, hayden_level=hayden_level)
    try:
        # Client'dan gelen mesajları dinle (ESP32 donanım paketi veya web istemci kontrolü)
        while True:
            try:
                raw = await asyncio.wait_for(ws.receive_text(), timeout=30.0)
                msg = json.loads(raw)
                # Eğer gelen mesaj sensör veri paketi ise (ESP32 gönderiyor)
                if "imu_pitch_deg" in msg or "semg_left_uv" in msg or "semg_raw" in msg:
                    await manager.broadcast_hardware_packet(client_id, msg)
                else:
                    log.debug(f"Client {client_id} → {msg}")
            except asyncio.TimeoutError:
                # 30 sn sessizlik → ping gönder
                await ws.send_text(json.dumps({"type": "ping", "ts": int(time.time() * 1000)}))
            except WebSocketDisconnect:
                break
    finally:
        await manager.disconnect(client_id)


# ---------------------------------------------------------------------------
# WebSocket – Kontrol Kanalı  (/ws/control)
# ---------------------------------------------------------------------------

@app.websocket("/ws/control")
async def websocket_control(ws: WebSocket):
    """
    Çift yönlü komut kanalı.

    Desteklenen komutlar (client → server, JSON):
      {"cmd": "set_level",  "level": 3}       → Hayden basamağını değiştir
      {"cmd": "get_status"}                    → Anlık durum döner
      {"cmd": "ping"}                          → Bağlantı testi

    Yanıtlar (server → client, JSON):
      {"type": "ack",    "cmd": "...", ...}
      {"type": "status", "clients": [...]}
      {"type": "pong",   "ts": 1724000000000}
      {"type": "error",  "msg": "..."}
    """
    await ws.accept()
    log.info("[ctrl] Kontrol kanalı açıldı")
    try:
        while True:
            raw = await ws.receive_text()
            try:
                msg = json.loads(raw)
                cmd = msg.get("cmd", "")

                if cmd == "ping":
                    await ws.send_text(json.dumps({
                        "type": "pong",
                        "ts":   int(time.time() * 1000),
                    }))

                elif cmd == "get_status":
                    await ws.send_text(json.dumps({
                        "type":    "status",
                        "clients": manager.get_status(),
                    }))

                elif cmd == "set_level":
                    level = int(msg.get("level", 4))
                    level = max(1, min(7, level))
                    await ws.send_text(json.dumps({
                        "type":  "ack",
                        "cmd":   "set_level",
                        "level": level,
                        "name":  HAYDEN_LEVELS[level],
                    }))

                else:
                    await ws.send_text(json.dumps({
                        "type": "error",
                        "msg":  f"Bilinmeyen komut: {cmd}",
                    }))

            except (json.JSONDecodeError, ValueError, TypeError) as e:
                await ws.send_text(json.dumps({
                    "type": "error",
                    "msg":  str(e),
                }))

    except WebSocketDisconnect:
        log.info("[ctrl] Kontrol kanalı kapandı")


# ---------------------------------------------------------------------------
# Giriş Noktası
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8765,
        reload=False,          # Prodüksiyon benzeri; geliştirmede True yapılabilir
        log_level="info",
        ws_ping_interval=20,   # WebSocket ping aralığı (sn)
        ws_ping_timeout=10,
    )
