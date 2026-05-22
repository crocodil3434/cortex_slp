"use client";

import React from "react";
import { motion } from "framer-motion";
import { useLanguage } from "@/context/LanguageContext";
import { ShoppingBag, Clock } from "lucide-react";

export default function ShopPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-[80vh] gradient-sky flex items-center justify-center px-6 relative overflow-hidden">
      {/* Decorative blurs */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-sky-200/40 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 right-20 w-72 h-72 bg-sage-200/30 rounded-full blur-3xl"></div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="bg-white rounded-3xl p-12 md:p-20 border border-sky-100 shadow-[0_8px_30px_rgba(124,207,253,0.1)] text-center space-y-6 max-w-lg relative z-10"
      >
        <div className="flex justify-center">
          <div className="bg-sky-100 p-4 rounded-2xl">
            <ShoppingBag className="w-8 h-8 text-sky-400" />
          </div>
        </div>
        <h1 className="font-serif text-3xl md:text-4xl font-bold text-warm-gray-800">
          {t.courses.title}
        </h1>
        <p className="text-warm-gray-400 text-sm leading-relaxed max-w-sm mx-auto">
          {t.courses.subtitle}
        </p>
        <div className="flex items-center justify-center space-x-2 text-sky-400 text-xs font-medium pt-4">
          <Clock className="w-4 h-4" />
          <span>{t.courses.comingSoon}</span>
        </div>
      </motion.div>
    </div>
  );
}
