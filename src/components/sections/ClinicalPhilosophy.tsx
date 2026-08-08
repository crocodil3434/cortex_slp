"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Quote } from "lucide-react";

const quotes = [
  {
    text: "İletişim, insan deneyiminin özüdür; onu onarmak, bireyi hayata yeniden bağlamaktır.",
    author: "— ASHA"
  },
  {
    text: "Yutma fonksiyonunun rehabilitasyonu sadece beslenmeyi değil, yaşam kalitesini ve onurunu geri kazandırmaktır.",
    author: "— Dr. Jeri Logemann"
  },
  {
    text: "Beyin plastisitesi bize gösteriyor ki; doğru hedeflenmiş ve yoğun terapi, hasarlı sinir ağlarını yeniden yapılandırabilir.",
    author: "— Nöroplastisite Prensibi"
  },
  {
    text: "Ses, ruhun aynasıdır; vokal rehabilitasyon, bireyin kendi kimliğini yeniden bulma yolculuğudur.",
    author: "— Dr. Joseph Stemple"
  },
  {
    text: "Kanıta dayalı pratik, klinik uzmanlık ile en iyi bilimsel verilerin hasta değerleriyle bütünleştiği noktadır.",
    author: "— Dr. David Sackett"
  }
];

export const ClinicalPhilosophy = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % quotes.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section id="about" className="w-full py-32 gradient-sage relative overflow-hidden">
      {/* Decorative blurs */}
      <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-sage-300/20 rounded-full blur-3xl -translate-y-1/2"></div>
      <div className="absolute top-1/2 right-1/4 w-64 h-64 bg-sky-200/20 rounded-full blur-3xl -translate-y-1/2"></div>

      <div className="container mx-auto px-6 max-w-4xl text-center relative z-10">
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-12 md:p-20 border border-sage-100 space-y-8 min-h-[350px] flex flex-col justify-center">
          <div className="flex justify-center">
            <div className="bg-sage-100 p-4 rounded-2xl">
              <Quote className="w-8 h-8 text-sage-500" />
            </div>
          </div>
          
          <div className="relative h-40 flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.8 }}
                className="absolute w-full"
              >
                <h2 className="font-serif text-2xl md:text-3xl lg:text-4xl text-warm-gray-800 leading-relaxed italic font-medium mb-6">
                  &ldquo;{quotes[currentIndex].text}&rdquo;
                </h2>
                
                <div className="flex items-center justify-center space-x-3">
                  <div className="w-12 h-px bg-sage-300"></div>
                  <span className="text-sage-600 text-sm font-semibold tracking-wide uppercase">
                    {quotes[currentIndex].author}
                  </span>
                  <div className="w-12 h-px bg-sage-300"></div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
};
