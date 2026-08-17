"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { getSettings, saveSettings } from "@/lib/crocodil/storage";
import type { CrocodilSettings } from "@/lib/crocodil/types";
import { useToast } from "@/components/crocodil/Toast";
import { Save, Eye, EyeOff, Key, User, Calendar, Globe, AlertTriangle } from "lucide-react";

const LABEL = "text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1";
const INPUT = "w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-400 transition-colors bg-white";

export default function AyarlarPage() {
  const [form, setForm] = useState<Partial<CrocodilSettings>>({});
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showHospitalKey, setShowHospitalKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pinError, setPinError] = useState("");
  const [clinicianError, setClinicianError] = useState("");
  const { success, error } = useToast();

  useEffect(() => {
    getSettings().then(s => {
      if (s) setForm(s);
    });
  }, []);

  const f = (key: keyof CrocodilSettings) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSave = async () => {
    if (!form.clinicianName?.trim()) {
      setClinicianError("Klinisyen adı zorunludur.");
      error("Eksik Alan", "Lütfen klinisyen adınızı girin.");
      return;
    }
    setClinicianError("");
    try {
      await saveSettings(form as CrocodilSettings);
      setSaved(true);
      success("Ayarlar kaydedildi!", "Değişiklikleriniz başarıyla kaydedildi.");
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      error("Kaydetme hatası", e?.message);
    }
  };

  const SECTION = "bg-white rounded-2xl p-5 border space-y-4";

  return (
    <div className="flex flex-col h-full" style={{ background: "#f8fffe" }}>
      {/* Header */}
      <div className="px-5 py-4 border-b flex items-center justify-between" style={{ background: "white", borderColor: "#e5f7f5" }}>
        <div>
          <h1 className="text-lg font-bold text-gray-800">Ayarlar</h1>
          <p className="text-xs text-gray-400">Crocodil sistem ayarları</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: saved ? "linear-gradient(135deg, #10b981, #059669)" : "linear-gradient(135deg, #0d9488, #134e4a)" }}
        >
          <Save className="w-4 h-4" />
          {saved ? "Kaydedildi!" : "Kaydet"}
        </motion.button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 max-w-xl mx-auto w-full space-y-4">

        {/* Klinisyen Bilgileri */}
        <div className={SECTION} style={{ borderColor: "#e5f7f5" }}>
          <div className="flex items-center gap-2 font-semibold text-gray-700">
            <User className="w-4 h-4 text-teal-600" />
            Klinisyen Bilgileri
          </div>
          <div>
            <label className={LABEL}>Klinisyen Adı *</label>
            <input type="text" value={form.clinicianName ?? ""} onChange={f("clinicianName")} placeholder="Dr. Adınız Soyadınız" className={INPUT} style={{ borderColor: "#e5e7eb" }} />
          </div>
          <div>
            <label className={LABEL}>Klinik / Hastane Adı</label>
            <input type="text" value={form.clinicName ?? ""} onChange={f("clinicName")} placeholder="Klinik adı..." className={INPUT} style={{ borderColor: "#e5e7eb" }} />
          </div>
        </div>



        {/* Gemini AI */}
        <div className={SECTION} style={{ borderColor: "#fef3c7", background: "linear-gradient(135deg, #fffbeb, white)" }}>
          <div className="flex items-center gap-2 font-semibold text-gray-700">
            <span className="text-base">🤖</span>
            Gemini AI Ayarları
          </div>
          <div className="p-3 rounded-xl flex gap-2" style={{ background: "rgba(217,119,6,0.08)", border: "1px solid rgba(217,119,6,0.2)" }}>
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              API anahtarını almak için{" "}
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline font-medium">Google AI Studio</a>
              'ya gidin. Anahtar yalnızca bu cihazda saklanır.
            </p>
          </div>
          <div>
            <label className={LABEL}>Gemini API Key</label>
            <div className="relative">
              <input
                type={showGeminiKey ? "text" : "password"}
                value={form.geminiApiKey ?? ""}
                onChange={f("geminiApiKey")}
                placeholder="AIza..."
                className={INPUT + " pr-10"}
                style={{ borderColor: "#e5e7eb" }}
              />
              <button
                onClick={() => setShowGeminiKey(!showGeminiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Google Calendar */}
        <div className={SECTION} style={{ borderColor: "#e5f7f5" }}>
          <div className="flex items-center gap-2 font-semibold text-gray-700">
            <Calendar className="w-4 h-4 text-teal-600" />
            Google Calendar Entegrasyonu
          </div>
          <div className="p-3 rounded-xl text-xs" style={{ background: "#f0fdf9", border: "1px solid #e5f7f5", color: "#6b7280" }}>
            Google Calendar OAuth bağlantısı için Google Cloud Console'dan Client ID almanız gerekir.
            Randevu sayfanızdaki mevcut Google takvim URL'ini de kullanabilirsiniz.
          </div>
          <div>
            <label className={LABEL}>Google Calendar Client ID</label>
            <input
              type="text"
              value={form.googleCalendarClientId ?? ""}
              onChange={f("googleCalendarClientId")}
              placeholder="xxxxx.apps.googleusercontent.com"
              className={INPUT}
              style={{ borderColor: "#e5e7eb" }}
            />
          </div>
        </div>

        {/* Hastane API */}
        <div className={SECTION} style={{ borderColor: "#e5f7f5" }}>
          <div className="flex items-center gap-2 font-semibold text-gray-700">
            <Globe className="w-4 h-4 text-teal-600" />
            Hastane Sistemi API (Opsiyonel)
          </div>
          <p className="text-xs text-gray-400">Özel hastane EHR sistemine bağlantı için API bilgilerini girin.</p>
          <div>
            <label className={LABEL}>API URL</label>
            <input type="url" value={form.hospitalApiUrl ?? ""} onChange={f("hospitalApiUrl")} placeholder="https://hastane.com/api" className={INPUT} style={{ borderColor: "#e5e7eb" }} />
          </div>
          <div>
            <label className={LABEL}>API Key</label>
            <div className="relative">
              <input
                type={showHospitalKey ? "text" : "password"}
                value={form.hospitalApiKey ?? ""}
                onChange={f("hospitalApiKey")}
                placeholder="API anahtarı..."
                className={INPUT + " pr-10"}
                style={{ borderColor: "#e5e7eb" }}
              />
              <button onClick={() => setShowHospitalKey(!showHospitalKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showHospitalKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Versiyon */}
        <div className="text-center text-xs text-gray-300 pb-4">
          Crocodil v1.0 · CORTEX SLP · Medikal SLP Takip Sistemi
        </div>
      </div>
    </div>
  );
}
