"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "@/context/LanguageContext";
import { Loader2, Calendar, Shield } from "lucide-react";

export default function AppointmentPage() {
  const { t, lang } = useLanguage();
  const isTR = lang === "tr";
  const [isLoading, setIsLoading] = useState(true);

  // Google Appointment Scheduling link
  const appointmentUrl = "https://calendar.app.google/3nPjQ47cWWaknxn69";

  return (
    <div className="min-h-screen gradient-hero py-24 px-6 relative overflow-hidden">
      {/* Decorative blurs */}
      <div className="absolute top-20 right-20 w-72 h-72 bg-sage-200/40 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 left-20 w-72 h-72 bg-sky-200/30 rounded-full blur-3xl"></div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-10 space-y-4"
        >
          <span className="inline-flex items-center space-x-2 bg-sage-100 text-sage-700 px-4 py-2 rounded-full text-xs font-semibold">
            <Calendar className="w-3.5 h-3.5" />
            <span>{t.appointment.badge}</span>
          </span>
          <h1 className="font-serif text-3xl md:text-5xl font-bold text-warm-gray-800">
            {t.appointment.title.split(" ").slice(0, -1).join(" ")}{" "}
            <span className="text-sage-500">
              {t.appointment.title.split(" ").slice(-1).join(" ")}
            </span>
          </h1>
          <p className="text-warm-gray-400 text-sm md:text-base leading-relaxed max-w-2xl mx-auto">
            {t.appointment.subtitle}
          </p>
        </motion.div>

        {/* Iframe Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="bg-white rounded-3xl border border-sage-100 shadow-[0_8px_30px_rgba(90,143,106,0.08)] overflow-hidden"
        >
          <div className="relative w-full min-h-[800px]">
            {/* Loading state */}
            {isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10 space-y-4">
                <div className="bg-sage-100 p-4 rounded-2xl">
                  <Loader2 className="w-8 h-8 text-sage-500 animate-spin" />
                </div>
                <p className="text-warm-gray-400 text-sm font-medium">
                  {t.appointment.loading}
                </p>
              </div>
            )}

            {/* Google Appointment iframe */}
            <iframe
              src={appointmentUrl}
              style={{ width: "100%", height: "800px", border: "none" }}
              onLoad={() => setIsLoading(false)}
              title={isTR ? "Randevu Takvimi" : "Appointment Calendar"}
              allow="camera; microphone"
            />
          </div>
        </motion.div>

        {/* Trust footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="flex items-center justify-center space-x-2 mt-8 text-warm-gray-300 text-xs"
        >
          <Shield className="w-3.5 h-3.5" />
          <span>
            {isTR
              ? "Tüm görüşmeler Google Meet üzerinden uçtan uca şifrelenmektedir."
              : "All sessions are end-to-end encrypted via Google Meet."}
          </span>
        </motion.div>
      </div>
    </div>
  );
}
