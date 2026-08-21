"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// ── Modül 105 sensör paketinin TypeScript tipi ──────────────────────────────
export interface SensorPacket {
  timestamp_ms: number;

  // Kinematik (MPU6050 → Kalman işlenmiş)
  imu_pitch_deg: number;
  imu_roll_deg: number;
  imu_yaw_deg: number;
  imu_accel_x: number;
  imu_accel_y: number;
  imu_accel_z: number;

  // sEMG (AD8232)
  semg_left_uv: number;
  semg_right_uv: number;
  semg_asymmetry_pct: number;

  // Solunum (Piezo)
  resp_waveform: number;
  resp_rate_bpm: number;

  // Ses (INMP441)
  mic_rms_db: number;
  mic_f0_hz: number;
  mic_voiced: boolean;

  // Nöromotor Basamak & Durum Meta
  hayden_level?: number;
  clinical_step?: number;
  session_phase?: "istirahat" | "görev" | "toparlanma";

  // Sensör Füzyonu & Groping Analizi
  is_calibrated?: boolean;
  groping_detected?: boolean;
  motor_acoustic_latency_ms?: number;
  groping_episodes_count?: number;
}

// ── Sliding-window ring buffer — Sıfır GC tahsisi ile 100Hz akışı yönetir ────
const RING_CAPACITY = 800; // 8 saniyelik geniş bellek tamponu

interface RingBuffer {
  data: SensorPacket[];
  head: number;
  size: number;
}

function createRing(): RingBuffer {
  return { data: new Array(RING_CAPACITY), head: 0, size: 0 };
}

function pushRing(buf: RingBuffer, pkt: SensorPacket): RingBuffer {
  if (buf.size < RING_CAPACITY) {
    buf.data[buf.size] = pkt;
    buf.size++;
  } else {
    buf.data[buf.head] = pkt;
    buf.head = (buf.head + 1) % RING_CAPACITY;
  }
  return buf;
}

/** Ring buffer'dan son N paketi kronolojik sırada döner (Sıfır bellek sızıntısı). */
export function ringSlice(buf: RingBuffer, n: number): SensorPacket[] {
  if (buf.size === 0) return [];
  const count = Math.min(n, buf.size);
  const arr: SensorPacket[] = [];
  for (let i = 0; i < count; i++) {
    const idx = (buf.head + buf.size - count + i) % RING_CAPACITY;
    if (buf.data[idx]) {
      arr.push(buf.data[idx]);
    }
  }
  return arr;
}

// ── Hook dönüş değerleri ─────────────────────────────────────────────────────
const NUMERIC_KEYS: (keyof SensorPacket)[] = [
  "imu_pitch_deg", "imu_roll_deg", "imu_yaw_deg",
  "imu_accel_x", "imu_accel_y", "imu_accel_z",
  "semg_left_uv", "semg_right_uv", "semg_asymmetry_pct",
  "resp_waveform", "resp_rate_bpm",
  "mic_rms_db", "mic_f0_hz",
];

function computeDisplayPacket(packets: SensorPacket[]): SensorPacket | null {
  const valid = packets.filter((p) => p && typeof p.imu_pitch_deg === "number" && !isNaN(p.imu_pitch_deg));
  if (valid.length === 0) return null;
  const last = valid[valid.length - 1];
  const averaged = { ...last } as SensorPacket;
  for (const key of NUMERIC_KEYS) {
    const numbers = valid.map((p) => Number(p[key])).filter((n) => Number.isFinite(n));
    if (numbers.length > 0) {
      const sum = numbers.reduce((acc, n) => acc + n, 0);
      (averaged as unknown as Record<string, unknown>)[key as string] = sum / numbers.length;
    }
  }
  return averaged;
}

export interface UseWebSocketReturn {
  latest: SensorPacket | null;
  displayLatest: SensorPacket | null;
  window: SensorPacket[];
  isConnected: boolean;
  isReconnecting: boolean;
  packetCount: number;
  fps: number;
  latencyMs: number;
  error: string | null;
  connect: () => void;
  disconnect: () => void;
}

const WS_URL = "ws://localhost:8765/ws/stream";
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BASE_MS = 1000;

export const GRAPH_SYNC_INTERVAL_MS = 50;  // 50ms (20 FPS Sabit Akıcı Sync)
export const SLIDING_WINDOW_SIZE = 350;     // 350 nokta (3.5 saniyelik EKG / Telemetri Monitör Penceresi)

export function useM105Stream(haydenLevel: number = 4): UseWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const ringRef = useRef<RingBuffer>(createRing());
  const latestRef = useRef<SensorPacket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);
  const fpsFrames = useRef<number[]>([]);

  // React state
  const [latest, setLatest] = useState<SensorPacket | null>(null);
  const [displayLatest, setDisplayLatest] = useState<SensorPacket | null>(null);
  const [windowPkts, setWindowPkts] = useState<SensorPacket[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [packetCount, setPacketCount] = useState(0);
  const [fps, setFps] = useState(0);
  const [latencyMs, setLatencyMs] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const packetCountRef = useRef(0);
  const latencyRef = useRef(0);
  const lastGraphUpdateRef = useRef(0);
  const lastDisplayUpdateRef = useRef(0);

  // ── Sıfır Darboğazlı RAF Senkronizasyonu ────────────────────────────────
  const startRafLoop = useCallback(() => {
    const tick = () => {
      const now = performance.now();

      if (now - lastGraphUpdateRef.current >= GRAPH_SYNC_INTERVAL_MS) {
        lastGraphUpdateRef.current = now;
        setLatest(latestRef.current);
        setWindowPkts(ringSlice(ringRef.current, SLIDING_WINDOW_SIZE));
        setPacketCount(packetCountRef.current);
        setLatencyMs(latencyRef.current);
      }

      if (now - lastDisplayUpdateRef.current >= 400) {
        lastDisplayUpdateRef.current = now;
        const avgWindow = ringSlice(ringRef.current, 40);
        setDisplayLatest(computeDisplayPacket(avgWindow));
      }

      fpsFrames.current.push(now);
      fpsFrames.current = fpsFrames.current.filter((t) => now - t < 1000);
      setFps(fpsFrames.current.length);

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const stopRafLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  // ── WebSocket bağlantısı ─────────────────────────────────────────────────
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const url = `${WS_URL}?hayden_level=${haydenLevel}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setIsReconnecting(false);
      setError(null);
      reconnectAttempts.current = 0;
      startRafLoop();
    };

    ws.onmessage = (evt: MessageEvent) => {
      try {
        const pkt = JSON.parse(evt.data as string);

        // Ping, komut veya geçersiz paketleri yoksay
        if (!pkt || (pkt as any).type === "ping" || (pkt as any).cmd) return;
        if (typeof pkt.timestamp_ms !== "number" || typeof pkt.imu_pitch_deg !== "number") return;

        const sensorPkt = pkt as SensorPacket;

        // Gecikme hesabı
        const lag = Date.now() - sensorPkt.timestamp_ms;
        if (lag > 0 && lag < 10000) {
          latencyRef.current = lag;
        }

        latestRef.current = sensorPkt;
        ringRef.current = pushRing(ringRef.current, sensorPkt);
        packetCountRef.current++;
      } catch {
        // parse hataları sessizce yoksayılır
      }
    };

    ws.onerror = () => {
      setError("WebSocket bağlantı hatası oluştu.");
    };

    ws.onclose = () => {
      setIsConnected(false);
      stopRafLoop();

      // Üstel yeniden bağlanma
      if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
        const delay = RECONNECT_BASE_MS * 2 ** reconnectAttempts.current;
        reconnectAttempts.current++;
        setIsReconnecting(true);
        reconnectTimer.current = setTimeout(connect, delay);
      } else {
        setIsReconnecting(false);
        setError(
          `Python sunucusuna (${WS_URL}) bağlanılamadı. ` +
          "module_105/server/main.py çalışıyor mu?"
        );
      }
    };
  }, [haydenLevel, startRafLoop, stopRafLoop]);

  const disconnect = useCallback(() => {
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    reconnectAttempts.current = MAX_RECONNECT_ATTEMPTS; // yeniden bağlanmayı engelle
    wsRef.current?.close();
    stopRafLoop();
    setIsConnected(false);
    setIsReconnecting(false);
  }, [stopRafLoop]);

  // ── Lifecycle ────────────────────────────────────────────────────────────
  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
      stopRafLoop();
    };
  }, [connect, stopRafLoop]);

  return {
    latest,
    displayLatest,
    window: windowPkts,
    isConnected,
    isReconnecting,
    packetCount,
    fps,
    latencyMs,
    error,
    connect,
    disconnect,
  };
}
