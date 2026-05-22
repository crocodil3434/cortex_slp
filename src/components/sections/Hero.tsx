"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { useLanguage } from "@/context/LanguageContext";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const heroImages = [
  "/clinic-hero.png",
  "/clinic-therapy.png",
  "/clinic-consultation.png",
];

export const Hero = () => {
  const { t } = useLanguage();
  const [currentImage, setCurrentImage] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative w-full min-h-[92vh] flex items-center gradient-hero overflow-hidden">
      <div className="container mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center z-10 py-20">
        {/* Left: Text Content */}
        <div className="space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="inline-flex items-center space-x-2 bg-sage-100 text-sage-700 px-4 py-2 rounded-full text-xs font-semibold"
          >
            <span className="w-2 h-2 bg-sage-400 rounded-full animate-pulse"></span>
            <span>{t.hero.badge}</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease: "easeOut" }}
            className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-warm-gray-800"
          >
            {t.hero.title.split(",")[0]}
            <span className="text-sage-500">,</span>
            <br />
            <span className="text-sage-600">
              {t.hero.title.includes(",") ? t.hero.title.split(",").slice(1).join(",") : ""}
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            className="text-warm-gray-500 text-lg leading-relaxed max-w-lg"
          >
            {t.hero.subtitle}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.45, ease: "easeOut" }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <Link 
              href="/randevu"
              className="inline-flex items-center justify-center bg-sage-500 text-white px-8 py-4 rounded-2xl text-sm font-semibold hover:bg-sage-600 transition-all duration-300 hover:scale-[1.02] group"
            >
              {t.hero.cta}
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link 
              href="#services"
              className="inline-flex items-center justify-center border-2 border-sage-200 text-sage-700 px-8 py-4 rounded-2xl text-sm font-semibold hover:bg-sage-50 hover:border-sage-300 transition-all duration-300"
            >
              {t.hero.ctaSecondary}
            </Link>
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.6 }}
            className="flex items-center space-x-8 pt-4"
          >
            <div className="text-center">
              <p className="text-2xl font-bold text-sage-600">12+</p>
              <p className="text-xs text-warm-gray-400">{t.hero.stat1Label}</p>
            </div>
            <div className="w-px h-10 bg-sage-200"></div>
            <div className="text-center">
              <p className="text-2xl font-bold text-sage-600">5K+</p>
              <p className="text-xs text-warm-gray-400">{t.hero.stat2Label}</p>
            </div>
            <div className="w-px h-10 bg-sage-200"></div>
            <div className="text-center">
              <p className="text-2xl font-bold text-sage-600">%97</p>
              <p className="text-xs text-warm-gray-400">{t.hero.stat3Label}</p>
            </div>
          </motion.div>
        </div>

        {/* Right: Image Carousel */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="relative w-full h-[450px] md:h-[550px] rounded-3xl overflow-hidden"
        >
          {heroImages.map((img, index) => (
            <motion.div
              key={img}
              initial={false}
              animate={{ 
                opacity: currentImage === index ? 1 : 0,
                scale: currentImage === index ? 1 : 1.05,
              }}
              transition={{ duration: 1.2, ease: "easeInOut" }}
              className="absolute inset-0"
            >
              <Image
                src={img}
                alt={`CORTEX SLP Klinik ${index + 1}`}
                fill
                className="object-cover"
                priority={index === 0}
              />
            </motion.div>
          ))}
          
          {/* Image carousel dots */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex space-x-2 z-10">
            {heroImages.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentImage(index)}
                className={`h-2 rounded-full transition-all duration-500 ${
                  currentImage === index ? "w-8 bg-white" : "w-2 bg-white/50"
                }`}
              />
            ))}
          </div>

          {/* Soft gradient overlay at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/20 to-transparent"></div>
        </motion.div>
      </div>

      {/* Decorative soft shapes */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-sage-200/30 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-sky-200/20 rounded-full blur-3xl"></div>
    </section>
  );
};
