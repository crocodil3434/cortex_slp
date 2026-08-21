"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Mic, Play, RefreshCw, CheckCircle2, AlertTriangle,
  Volume2, Sparkles, Activity, ShieldAlert, Check, XCircle
} from "lucide-react";

// ── Normatif Referans Değerleri (Türkçe Yetişkin / Çocuk Formant Ortalamaları) ─
const NORM_VOWELS = {
  A: { f1: 780, f2: 1240, label: "/A/", name: "Açık - Art - Düz", color: "#f59e0b" },
  I: { f1: 290, f2: 2250, label: "/İ/", name: "Kapalı - Ön - Düz", color: "#3b82f6" },
  U: { f1: 340, f2: 820,  label: "/U/", name: "Kapalı - Art - Yuvarlak", color: "#ec4899" },
};

// Normatif Sağlıklı Üçgen Alan Eşiği (Hz²)
const NORM_VSA_THRESHOLD = 260000;

interface VowelSample {
  f1: number;
  f2: number;
  f0?: number;
  rms_db?: number;
  sampleCount: number;
}

export function VsaCalibrationGame() {
  const [activeVowelKey, setActiveVowelKey] = useState<"A" | "I" | "U">("A");
  const [gameState, setGameState] = useState<"idle" | "countdown" | "recording" | "completed">("idle");
  const [countdown, setCountdown] = useState(3);
  const [recordProgress, setRecordProgress] = useState(0);

  // Ölçülen Formant Değerleri (Sadece gerçek ses verisi varsa dolar)
  const [measuredVowels, setMeasuredVowels] = useState<Record<string, VowelSample>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // DSP Backend & Web Audio Durumları
  const [wsConnected, setWsConnected] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [liveRmsDb, setLiveRmsDb] = useState(-100);

  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bufferRef = useRef<{ f1: number[]; f2: number[]; f0: number[]; rms: number[] }>({
    f1: [], f2: [], f0: [], rms: []
  });

  // Web Audio Context & Analyser
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // ── 1. Python WebSocket Bağlantısı (ws://localhost:8000/ws/audio) ───────────
  useEffect(() => {
    let isMounted = true;
    let ws: WebSocket | null = null;

    try {
      ws = new WebSocket("ws://localhost:8000/ws/audio");
      wsRef.current = ws;

      ws.onopen = () => {
        if (isMounted) setWsConnected(true);
      };

      ws.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data);
          if (isMounted && data) {
            if (typeof data.rms_db === "number") setLiveRmsDb(data.rms_db);
            // Sadece ses aktivitesi (is_speech) varsa ve geçerli formant geldiyse buffer'a ekle
            if (data.is_speech && data.f1 && data.f2 && data.rms_db > -45) {
              bufferRef.current.f1.push(data.f1);
              bufferRef.current.f2.push(data.f2);
              if (data.f0) bufferRef.current.f0.push(data.f0);
              bufferRef.current.rms.push(data.rms_db);
            }
          }
        } catch {
          // sessiz
        }
      };

      ws.onerror = () => {
        if (isMounted) setWsConnected(false);
      };

      ws.onclose = () => {
        if (isMounted) setWsConnected(false);
      };
    } catch {
      if (isMounted) setWsConnected(false);
    }

    return () => {
      isMounted = false;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  // ── 2. Tarayıcı Mikrofonu (Web Audio API Gerçek Zamanlı FFT Analizi) ───────
  useEffect(() => {
    let isMounted = true;

    const startBrowserMic = async () => {
      try {
        if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) return;
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        micStreamRef.current = stream;
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioCtxRef.current = audioCtx;

        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.8;
        source.connect(analyser);
        analyserRef.current = analyser;

        setMicActive(true);

        const freqData = new Uint8Array(analyser.frequencyBinCount);
        const timeData = new Uint8Array(analyser.fftSize);

        const analyzeLoop = () => {
          if (!isMounted || !analyserRef.current) return;
          analyserRef.current.getByteTimeDomainData(timeData);
          analyserRef.current.getByteFrequencyData(freqData);

          // RMS Hesabı
          let sumSquares = 0;
          for (let i = 0; i < timeData.length; i++) {
            const val = (timeData[i] - 128) / 128;
            sumSquares += val * val;
          }
          const rms = Math.sqrt(sumSquares / timeData.length);
          const rmsDb = rms > 0.001 ? 20 * Math.log10(rms) : -100;
          setLiveRmsDb(Math.round(rmsDb));

          // Ses aktivitesi varsa (RMS > -42 dB) FFT'den Formant Tepelerini Çıkar
          if (rmsDb > -42 && audioCtx.sampleRate) {
            const nyquist = audioCtx.sampleRate / 2;
            const binHz = nyquist / freqData.length;

            // F1 Adayları (200 - 1100 Hz aralığı)
            const minF1Bin = Math.floor(200 / binHz);
            const maxF1Bin = Math.floor(1100 / binHz);
            let maxF1Val = 0;
            let peakF1Bin = minF1Bin;

            for (let b = minF1Bin; b <= maxF1Bin; b++) {
              if (freqData[b] > maxF1Val) {
                maxF1Val = freqData[b];
                peakF1Bin = b;
              }
            }

            // F2 Adayları (850 - 2800 Hz aralığı)
            const minF2Bin = Math.max(peakF1Bin + Math.floor(200 / binHz), Math.floor(850 / binHz));
            const maxF2Bin = Math.floor(2800 / binHz);
            let maxF2Val = 0;
            let peakF2Bin = minF2Bin;

            for (let b = minF2Bin; b <= maxF2Bin; b++) {
              if (freqData[b] > maxF2Val) {
                maxF2Val = freqData[b];
                peakF2Bin = b;
              }
            }

            if (maxF1Val > 40 && maxF2Val > 30) {
              const detectedF1 = Math.round(peakF1Bin * binHz);
              const detectedF2 = Math.round(peakF2Bin * binHz);

              bufferRef.current.f1.push(detectedF1);
              bufferRef.current.f2.push(detectedF2);
              bufferRef.current.rms.push(rmsDb);
            }
          }

          animFrameRef.current = requestAnimationFrame(analyzeLoop);
        };

        animFrameRef.current = requestAnimationFrame(analyzeLoop);
      } catch {
        if (isMounted) setMicActive(false);
      }
    };

    startBrowserMic();

    return () => {
      isMounted = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);

  // ── 3. Kayıt Başlatma & 3 Saniyelik Geri Sayım ─────────────────────────────
  const startRecordingFlow = (vowelKey: "A" | "I" | "U") => {
    setErrorMessage(null);
    setActiveVowelKey(vowelKey);
    setGameState("countdown");
    setCountdown(3);
    bufferRef.current = { f1: [], f2: [], f0: [], rms: [] };

    let c = 3;
    const cdInterval = setInterval(() => {
      c--;
      if (c > 0) {
        setCountdown(c);
      } else {
        clearInterval(cdInterval);
        // Kaydı Başlat
        setGameState("recording");
        setRecordProgress(0);
        bufferRef.current = { f1: [], f2: [], f0: [], rms: [] };

        let elapsed = 0;
        const totalDurationMs = 3000;
        const tickMs = 50;

        const recInterval = setInterval(() => {
          elapsed += tickMs;
          const pct = Math.min(100, (elapsed / totalDurationMs) * 100);
          setRecordProgress(pct);

          if (elapsed >= totalDurationMs) {
            clearInterval(recInterval);
            finishVowelRecording(vowelKey);
          }
        }, tickMs);
        timerRef.current = recInterval;
      }
    }, 1000);
  };

  // ── 4. Kayıt Tamamlama ve GERÇEK VERİ KONTROLÜ ─────────────────────────────
  const finishVowelRecording = (vowelKey: "A" | "I" | "U") => {
    const f1s = bufferRef.current.f1;
    const f2s = bufferRef.current.f2;
    const f0s = bufferRef.current.f0;
    const rmss = bufferRef.current.rms;

    // KESİN KONTROL: Eğer ses gelmediyse (buffer boş veya çok az veri varsa) ASLA KAFADAN DEĞER ATAMA!
    if (f1s.length < 8) {
      setGameState("idle");
      setErrorMessage(
        `❌ ${NORM_VOWELS[vowelKey].label} sesi için yeterli ses sinyali algılanamadı! Lütfen mikrofona daha yakın, net ve kesintisiz ses çıkararak tekrar deneyin.`
      );
      // O sesin durumunu kaydetme (boş bırak)
      return;
    }

    // Aykırı değerleri filtrele (Medyan veya kırpılmış ortalama)
    const sortedF1 = [...f1s].sort((a, b) => a - b);
    const sortedF2 = [...f2s].sort((a, b) => a - b);
    const midIdx = Math.floor(sortedF1.length / 2);

    const finalF1 = sortedF1[midIdx];
    const finalF2 = sortedF2[midIdx];
    const finalF0 = f0s.length > 0 ? f0s[Math.floor(f0s.length / 2)] : undefined;
    const finalRms = rmss.length > 0 ? Math.round(rmss.reduce((a, b) => a + b, 0) / rmss.length) : undefined;

    setErrorMessage(null);

    setMeasuredVowels((prev) => {
      const updated = {
        ...prev,
        [vowelKey]: {
          f1: finalF1,
          f2: finalF2,
          f0: finalF0,
          rms_db: finalRms,
          sampleCount: f1s.length,
        },
      };

      // Eğer 3 ses de GERÇEK verilerle tamamlandıysa completed durumuna geç
      if (updated["A"] && updated["I"] && updated["U"]) {
        setGameState("completed");
      } else {
        setGameState("idle");
        // Sıradaki boş sese otomatik geç
        if (vowelKey === "A" && !updated["I"]) setActiveVowelKey("I");
        else if (vowelKey === "I" && !updated["U"]) setActiveVowelKey("U");
      }

      return updated;
    });
  };

  // ── 5. VSA ve FCR Hesaplamaları ───────────────────────────────────────────
  const hasAllVowels = Boolean(measuredVowels["A"] && measuredVowels["I"] && measuredVowels["U"]);

  const calculateVSA = (
    a: { f1: number; f2: number },
    i: { f1: number; f2: number },
    u: { f1: number; f2: number }
  ) => {
    // Gauss Alan Formülü: VSA = 0.5 * | F1_i*(F2_a - F2_u) + F1_a*(F2_u - F2_i) + F1_u*(F2_i - F2_a) |
    const area = 0.5 * Math.abs(
      i.f1 * (a.f2 - u.f2) + a.f1 * (u.f2 - i.f2) + u.f1 * (i.f2 - a.f2)
    );
    return Math.round(area);
  };

  const normVsa = calculateVSA(NORM_VOWELS.A, NORM_VOWELS.I, NORM_VOWELS.U);
  const patientVsa = hasAllVowels
    ? calculateVSA(measuredVowels["A"], measuredVowels["I"], measuredVowels["U"])
    : 0;

  // Formant Centralization Ratio (FCR)
  const patientFcr = hasAllVowels
    ? (measuredVowels["U"].f2 + measuredVowels["A"].f2 + measuredVowels["I"].f1 + measuredVowels["U"].f1) /
      (measuredVowels["I"].f2 + measuredVowels["A"].f1)
    : 1.0;

  const isRestrictedVsa = hasAllVowels && (patientVsa < NORM_VSA_THRESHOLD || patientFcr > 1.04);

  // ── 6. Formant Uzayı SVG Koordinat Dönüştürücüsü ──────────────────────────
  const svgW = 380;
  const svgH = 210;
  const pad = 28;

  const mapToSvg = (f1: number, f2: number) => {
    const minF2 = 600, maxF2 = 2600;
    const minF1 = 200, maxF1 = 900;
    const normX = (maxF2 - Math.max(minF2, Math.min(maxF2, f2))) / (maxF2 - minF2);
    const normY = (Math.max(minF1, Math.min(maxF1, f1)) - minF1) / (maxF1 - minF1);
    const x = pad + normX * (svgW - pad * 2);
    const y = pad + normY * (svgH - pad * 2);
    return { x, y };
  };

  const normA = mapToSvg(NORM_VOWELS.A.f1, NORM_VOWELS.A.f2);
  const normI = mapToSvg(NORM_VOWELS.I.f1, NORM_VOWELS.I.f2);
  const normU = mapToSvg(NORM_VOWELS.U.f1, NORM_VOWELS.U.f2);

  const ptA = measuredVowels["A"] ? mapToSvg(measuredVowels["A"].f1, measuredVowels["A"].f2) : null;
  const ptI = measuredVowels["I"] ? mapToSvg(measuredVowels["I"].f1, measuredVowels["I"].f2) : null;
  const ptU = measuredVowels["U"] ? mapToSvg(measuredVowels["U"].f1, measuredVowels["U"].f2) : null;

  return (
    <div
      style={{
        padding: 16,
        borderRadius: 16,
        background: "linear-gradient(145deg, rgba(15,32,39,0.9), rgba(8,18,20,0.95))",
        border: "1px solid rgba(59,130,246,0.3)",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      }}
    >
      {/* ── Başlık ve Bağlantı Durumu ─────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(59,130,246,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>
            👅
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "white", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              VSA (Vowel Space Area) Akustik Ünlü Uzamı Kalibrasyon Oyunu
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)" }}>
              F1 (Çene Açıklığı) ve F2 (Dil İleri-Geri Ekseni) Akustik Üçgen Analizi
            </div>
          </div>
        </div>

        {/* Canlı Mikrofon & DSP Durumu */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: "4px 10px",
              borderRadius: 99,
              display: "flex",
              alignItems: "center",
              gap: 5,
              background: (wsConnected || micActive) ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
              border: `1px solid ${(wsConnected || micActive) ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)"}`,
              color: (wsConnected || micActive) ? "#4ade80" : "#f87171",
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: (wsConnected || micActive) ? "#22c55e" : "#ef4444" }} />
            {wsConnected ? "DSP Backend Aktif" : micActive ? "Tarayıcı Mikrofonu Hazır" : "Mikrofon Kapalı"}
          </div>

          <div style={{ fontSize: 10, color: liveRmsDb > -45 ? "#4ade80" : "rgba(255,255,255,0.4)", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
            {liveRmsDb > -90 ? `${liveRmsDb} dBFS` : "Sessiz"}
          </div>
        </div>
      </div>

      {/* Hata / Uyarı Mesajı (Ses Algılanamadığında) */}
      {errorMessage && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            background: "rgba(239,68,68,0.15)",
            border: "1px solid rgba(239,68,68,0.4)",
            color: "#fca5a5",
            fontSize: 11,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ── 3 Aşamalı Ses Seçim Kartları ──────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {(["A", "I", "U"] as const).map((key) => {
          const info = NORM_VOWELS[key];
          const isMeasured = Boolean(measuredVowels[key]);
          const isSelected = activeVowelKey === key;
          const val = measuredVowels[key];

          return (
            <div
              key={key}
              onClick={() => {
                if (gameState === "idle" || gameState === "completed") {
                  setActiveVowelKey(key);
                  setErrorMessage(null);
                }
              }}
              style={{
                padding: 12,
                borderRadius: 12,
                cursor: gameState === "recording" ? "not-allowed" : "pointer",
                background: isSelected ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${isSelected ? "#3b82f6" : isMeasured ? "rgba(34,197,94,0.4)" : "rgba(255,255,255,0.08)"}`,
                transition: "all 0.2s ease",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 18, fontWeight: 900, color: info.color }}>{info.label}</span>
                {isMeasured ? (
                  <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "rgba(34,197,94,0.2)", color: "#4ade80" }}>
                    ✓ Ölçüldü
                  </span>
                ) : (
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>Ölçüm Yok</span>
                )}
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>{info.name}</div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>
                {isMeasured ? `F1: ${val.f1} Hz | F2: ${val.f2} Hz (${val.sampleCount} pkt)` : `Ref: F1=${info.f1} / F2=${info.f2}`}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Kayıt / Kalibrasyon Yönlendirme Paneli ─────────────────────────── */}
      <div
        style={{
          padding: 14,
          borderRadius: 12,
          background: "rgba(0,0,0,0.3)",
          border: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: gameState === "recording" ? "rgba(239,68,68,0.2)" : "rgba(59,130,246,0.15)",
              border: `2px solid ${gameState === "recording" ? "#ef4444" : "#3b82f6"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              color: gameState === "recording" ? "#ef4444" : "#3b82f6",
              flexShrink: 0,
            }}
          >
            {gameState === "countdown" ? (
              <span style={{ fontSize: 20, fontWeight: 900 }}>{countdown}</span>
            ) : gameState === "recording" ? (
              <Mic className="w-5 h-5 animate-pulse" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
          </div>

          <div style={{ flex: 1 }}>
            {gameState === "countdown" && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#f59e0b" }}>Hazırlanın...</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>
                  {countdown} saniye sonra <strong>{NORM_VOWELS[activeVowelKey].label}</strong> sesini uzatın.
                </div>
              </div>
            )}

            {gameState === "recording" && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#ef4444" }}>
                  🔴 Kaydediliyor: Lütfen 3 saniye boyunca {NORM_VOWELS[activeVowelKey].label} sesini uzatın!
                </div>
                {/* İlerleme Çubuğu */}
                <div style={{ height: 6, width: "100%", background: "rgba(255,255,255,0.1)", borderRadius: 3, marginTop: 6, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${recordProgress}%`, background: "linear-gradient(90deg, #3b82f6, #ef4444)", transition: "width 0.05s linear" }} />
                </div>
              </div>
            )}

            {(gameState === "idle" || gameState === "completed") && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: "white" }}>
                  {hasAllVowels
                    ? "🎉 3 Ünlü Sesi de Gerçek Sinyalle Doğrulandı!"
                    : `Sıradaki Ses: ${NORM_VOWELS[activeVowelKey].label} (${NORM_VOWELS[activeVowelKey].name})`}
                </div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)" }}>
                  {hasAllVowels
                    ? "Aşağıdaki Akustik Üçgen ve VSA alan analizini inceleyebilirsiniz."
                    : "Butona basarak mikrofonunuza doğru 3 saniye boyunca sesi uzatın."}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Aksiyon Butonları */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            disabled={gameState === "recording" || gameState === "countdown"}
            onClick={() => startRecordingFlow(activeVowelKey)}
            style={{
              padding: "8px 16px",
              borderRadius: 10,
              fontSize: 11,
              fontWeight: 800,
              color: "white",
              background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
              border: "1px solid #3b82f6",
              cursor: gameState === "recording" ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
            }}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {measuredVowels[activeVowelKey] ? `${NORM_VOWELS[activeVowelKey].label} Tekrar Ölç` : `${NORM_VOWELS[activeVowelKey].label} Ölçümünü Başlat`}
          </button>

          {Object.keys(measuredVowels).length > 0 && (
            <button
              onClick={() => {
                setMeasuredVowels({});
                setActiveVowelKey("A");
                setGameState("idle");
                setErrorMessage(null);
              }}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                fontSize: 11,
                fontWeight: 700,
                color: "rgba(255,255,255,0.6)",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Sıfırla
            </button>
          )}
        </div>
      </div>

      {/* ── 5. VOWEL SPACE AREA (AKUSTİK ÜÇGEN) GRAFİK & ANALİZ ALANI ───────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 14 }}>
        {/* Akustik Ünlü Üçgeni (Acoustic Vowel Triangle SVG) */}
        <div
          style={{
            padding: 12,
            borderRadius: 12,
            background: "rgba(0,0,0,0.4)",
            border: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            position: "relative",
          }}
        >
          <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>
              Akustik Ünlü Dörtgeni / Formant Uzayı
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 9 }}>
              <span style={{ color: "rgba(255,255,255,0.4)" }}>--- Norm Referans</span>
              <span style={{ color: "#3b82f6", fontWeight: 700 }}>— Ölçülen VSA</span>
            </div>
          </div>

          <svg width="100%" height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} style={{ overflow: "visible" }}>
            {/* Arka Plan Izgarası */}
            <line x1={pad} y1={pad} x2={svgW - pad} y2={pad} stroke="rgba(255,255,255,0.05)" strokeDasharray="2 2" />
            <line x1={pad} y1={svgH - pad} x2={svgW - pad} y2={svgH - pad} stroke="rgba(255,255,255,0.05)" strokeDasharray="2 2" />
            <line x1={pad} y1={pad} x2={pad} y2={svgH - pad} stroke="rgba(255,255,255,0.05)" strokeDasharray="2 2" />
            <line x1={svgW - pad} y1={pad} x2={svgW - pad} y2={svgH - pad} stroke="rgba(255,255,255,0.05)" strokeDasharray="2 2" />

            {/* Eksen Etiketleri */}
            <text x={pad} y={svgH - 8} fill="rgba(255,255,255,0.3)" fontSize="8" fontFamily="monospace">F2: 2600 Hz (Ön)</text>
            <text x={svgW - pad} y={svgH - 8} fill="rgba(255,255,255,0.3)" fontSize="8" textAnchor="end" fontFamily="monospace">F2: 600 Hz (Art)</text>
            <text x={pad - 4} y={pad + 8} fill="rgba(255,255,255,0.3)" fontSize="8" textAnchor="end" fontFamily="monospace">F1: 200 Hz</text>
            <text x={pad - 4} y={svgH - pad} fill="rgba(255,255,255,0.3)" fontSize="8" textAnchor="end" fontFamily="monospace">F1: 900 Hz</text>

            {/* 1. Normatif Referans Üçgeni (Kesikli Çizgi) */}
            <polygon
              points={`${normI.x},${normI.y} ${normA.x},${normA.y} ${normU.x},${normU.y}`}
              fill="rgba(255,255,255,0.02)"
              stroke="rgba(255,255,255,0.25)"
              strokeWidth="1.2"
              strokeDasharray="4 4"
            />

            {/* Normatif Referans Noktaları */}
            <circle cx={normI.x} cy={normI.y} r="3" fill="rgba(255,255,255,0.3)" />
            <circle cx={normA.x} cy={normA.y} r="3" fill="rgba(255,255,255,0.3)" />
            <circle cx={normU.x} cy={normU.y} r="3" fill="rgba(255,255,255,0.3)" />

            {/* 2. Hastanın Ölçülen Akustik Üçgeni (Sadece 3 ses de ölçüldüyse çizilir) */}
            {ptI && ptA && ptU && (
              <polygon
                points={`${ptI.x},${ptI.y} ${ptA.x},${ptA.y} ${ptU.x},${ptU.y}`}
                fill={isRestrictedVsa ? "rgba(245,158,11,0.18)" : "rgba(59,130,246,0.22)"}
                stroke={isRestrictedVsa ? "#f59e0b" : "#3b82f6"}
                strokeWidth="2.2"
              />
            )}

            {/* Ölçülen Noktalar (Gerçek veriyle ölçülenler görünür) */}
            {ptI && (
              <g>
                <circle cx={ptI.x} cy={ptI.y} r="5" fill="#3b82f6" stroke="white" strokeWidth="1.5" />
                <text x={ptI.x} y={ptI.y - 8} fill="#3b82f6" fontSize="10" fontWeight="bold" textAnchor="middle">/İ/</text>
              </g>
            )}
            {ptA && (
              <g>
                <circle cx={ptA.x} cy={ptA.y} r="5" fill="#f59e0b" stroke="white" strokeWidth="1.5" />
                <text x={ptA.x} y={ptA.y + 14} fill="#f59e0b" fontSize="10" fontWeight="bold" textAnchor="middle">/A/</text>
              </g>
            )}
            {ptU && (
              <g>
                <circle cx={ptU.x} cy={ptU.y} r="5" fill="#ec4899" stroke="white" strokeWidth="1.5" />
                <text x={ptU.x + 12} y={ptU.y + 4} fill="#ec4899" fontSize="10" fontWeight="bold">/U/</text>
              </g>
            )}
          </svg>
        </div>

        {/* Klinik Değerlendirme & Metrik Kartı */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>VSA Akustik Alan (Hz²)</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: hasAllVowels ? (isRestrictedVsa ? "#f59e0b" : "#3b82f6") : "rgba(255,255,255,0.3)", marginTop: 2 }}>
              {hasAllVowels ? `${patientVsa.toLocaleString()} Hz²` : "Ölçüm Bekleniyor"}
            </div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
              Normatif Referans: ~{normVsa.toLocaleString()} Hz²
            </div>
          </div>

          <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>Formant Merkezileşme (FCR)</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: hasAllVowels ? (patientFcr > 1.04 ? "#ef4444" : "#22c55e") : "rgba(255,255,255,0.3)", marginTop: 2 }}>
              {hasAllVowels ? patientFcr.toFixed(3) : "—"}
            </div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
              FCR &lt; 1.00: Geniş Çalışma Alanı | FCR &gt; 1.05: Daralma / Hipokinetik
            </div>
          </div>

          {/* Klinik Sonuç Rozeti (SADECE 3 ses de gerçek veriyle ölçülünce görünür) */}
          {hasAllVowels ? (
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                background: isRestrictedVsa ? "rgba(245,158,11,0.12)" : "rgba(34,197,94,0.12)",
                border: `1px solid ${isRestrictedVsa ? "rgba(245,158,11,0.4)" : "rgba(34,197,94,0.4)"}`,
                display: "flex",
                flexDirection: "column",
                gap: 3,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 800, color: isRestrictedVsa ? "#f59e0b" : "#22c55e" }}>
                {isRestrictedVsa ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                {isRestrictedVsa ? "Uyarı: Lingual Hareket Kısıtlılığı (Formant Merkezileşmesi)" : "Normal: Geniş Lingual Artikülatör Çalışma Alanı"}
              </div>
              <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.7)", lineHeight: 1.4 }}>
                {isRestrictedVsa
                  ? "Dil ön-arka ekseninde ve çene dikey açıklığında kısıtlılık izlendi. VSA daralması dizartri veya lingual hipokineziye işaret edebilir."
                  : "Dil ucu elevasyonu ve dil kökü retraksiyonu klinik normlarla uyumlu geniş bir akustik dörtgen oluşturuyor."}
              </div>
            </div>
          ) : (
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                fontSize: 10,
                color: "rgba(255,255,255,0.4)",
                lineHeight: 1.4,
              }}
            >
              ⏳ Klinik VSA alan analizi ve tanı rozeti için <strong>/A/, /İ/ ve /U/</strong> seslerinin üçünün de mikrofondan ses kaydıyla başarıyla tamamlanması gerekmektedir.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
