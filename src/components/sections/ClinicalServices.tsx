"use client";

import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useLanguage } from "@/context/LanguageContext";
import {
  BookOpen, MessageCircle, Wind, Mic, Utensils,
  Brain, Volume2, Cpu, Heart, Map, FileText, ChevronRight
} from "lucide-react";
import Link from "next/link";

export const ClinicalServices = () => {
  const { t } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);

  const categories = [
    { slug: "dil-ve-iletisim", label: "Dil & İletişim", icon: BookOpen, color: "#3b82f6", bg: "bg-blue-50", text: "text-blue-600", desc: "Alıcı dil, ifade edici dil, pragmatik değerlendirmeler" },
    { slug: "artikulasyon", label: "Artikülasyon", icon: MessageCircle, color: "#10b981", bg: "bg-emerald-50", text: "text-emerald-600", desc: "Ses envanteri ve fonolojik süreç analizleri" },
    { slug: "akicilik", label: "Akıcılık", icon: Wind, color: "#0ea5e9", bg: "bg-sky-50", text: "text-sky-600", desc: "Kekemelik tipi ve akıcılık bozuklukları takibi" },
    { slug: "ses-bozukluklari", label: "Ses Bozuklukları", icon: Mic, color: "#8b5cf6", bg: "bg-violet-50", text: "text-violet-600", desc: "Vokal kord patolojileri ve sesin akustik ölçümleri" },
    { slug: "yutma-disfaji", label: "Yutma & Disfaji", icon: Utensils, color: "#f59e0b", bg: "bg-amber-50", text: "text-amber-600", desc: "Nörolojik/mekanik yutma bozuklukları rehabilitasyonu" },
    { slug: "afazi", label: "Afazi", icon: Brain, color: "#ef4444", bg: "bg-red-50", text: "text-red-600", desc: "Serebral vasküler olaylar sonrası dil kayıpları" },
    { slug: "aac-sistemleri", label: "AAC Sistemleri", icon: Volume2, color: "#14b8a6", bg: "bg-teal-50", text: "text-teal-600", desc: "Alternatif ve destekleyici iletişim yöntemleri" },
    { slug: "motor-konusma", label: "Motor Konuşma", icon: Cpu, color: "#f97316", bg: "bg-orange-50", text: "text-orange-600", desc: "Dizartri ve apraksi spesifik motor planlama" },
    { slug: "sosyal-iletisim", label: "Sosyal İletişim", icon: Heart, color: "#ec4899", bg: "bg-pink-50", text: "text-pink-600", desc: "Ortak dikkat ve pragmatik sosyal etkileşim" },
    { slug: "icf-kodlama", label: "ICF Kodlama", icon: Map, color: "#6366f1", bg: "bg-indigo-50", text: "text-indigo-600", desc: "Uluslararası Fonksiyonel Bütünleşik Sınıflandırma" },
    { slug: "ai-raporlama", label: "AI Raporlama", icon: FileText, color: "#0d9488", bg: "bg-teal-50", text: "text-teal-700", desc: "Yapay zeka destekli klinik özet ve dökümantasyon" },
  ];

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -350, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 350, behavior: "smooth" });
    }
  };

  return (
    <section id="services" className="w-full py-24 bg-cream relative overflow-hidden">
      <div className="absolute top-0 right-0 w-72 h-72 bg-sage-100/50 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-sky-100/30 rounded-full blur-3xl"></div>

      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16 space-y-4"
        >
          <span className="inline-block bg-sage-100 text-sage-700 px-4 py-1.5 rounded-full text-xs font-semibold">
            {t.services.badge}
          </span>
          <h2 className="font-serif text-3xl md:text-5xl font-bold text-warm-gray-800">
            {t.services.title.split(" ").slice(0, -2).join(" ")}{" "}
            <span className="text-sage-500">
              {t.services.title.split(" ").slice(-2).join(" ")}
            </span>
          </h2>
          <p className="text-warm-gray-400 max-w-2xl mx-auto text-base leading-relaxed">
            {t.services.desc}
          </p>
        </motion.div>

        {/* Grid Container */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
          {categories.map((cat, index) => (
            <Link href={`/hizmetler/${cat.slug}`} key={index}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: (index % 3) * 0.1 }}
                className="bg-white rounded-3xl p-6 border border-sage-100 hover:border-sage-300 hover:shadow-xl transition-all duration-300 group flex flex-col h-full cursor-pointer"
              >
                <div className={`w-14 h-14 rounded-2xl ${cat.bg} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                  <cat.icon className={`w-7 h-7 ${cat.text}`} />
                </div>
                <h3 className="font-serif text-lg font-bold text-warm-gray-800 mb-3 leading-snug">
                  {cat.label}
                </h3>
                <p className="text-warm-gray-500 text-sm leading-relaxed flex-1">
                  {cat.desc}
                </p>
                <div className="mt-4 flex items-center text-xs font-semibold text-sage-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  İncele
                  <ChevronRight className="w-4 h-4 ml-1" />
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>
      
    </section>
  );
};
