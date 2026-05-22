"use client";

import React from "react";
import { motion } from "framer-motion";
import { useLanguage } from "@/context/LanguageContext";
import { Quote } from "lucide-react";

export const ClinicalPhilosophy = () => {
  const { t } = useLanguage();

  return (
    <section id="about" className="w-full py-32 gradient-sage relative overflow-hidden">
      {/* Decorative blurs */}
      <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-sage-300/20 rounded-full blur-3xl -translate-y-1/2"></div>
      <div className="absolute top-1/2 right-1/4 w-64 h-64 bg-sky-200/20 rounded-full blur-3xl -translate-y-1/2"></div>

      <div className="container mx-auto px-6 max-w-4xl text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="bg-white/70 backdrop-blur-sm rounded-3xl p-12 md:p-20 border border-sage-100 space-y-8"
        >
          <div className="flex justify-center">
            <div className="bg-sage-100 p-4 rounded-2xl">
              <Quote className="w-8 h-8 text-sage-500" />
            </div>
          </div>
          
          <h2 className="font-serif text-2xl md:text-4xl lg:text-5xl text-warm-gray-800 leading-tight italic font-medium">
            &ldquo;{t.philosophy.quote}&rdquo;
          </h2>
          
          <div className="flex items-center justify-center space-x-3">
            <div className="w-12 h-px bg-sage-300"></div>
            <span className="text-sage-600 text-sm font-semibold tracking-wide">
              {t.philosophy.author}
            </span>
            <div className="w-12 h-px bg-sage-300"></div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
