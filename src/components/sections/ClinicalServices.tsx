"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { useLanguage } from "@/context/LanguageContext";
import { Stethoscope, Brain, Mic } from "lucide-react";

export const ClinicalServices = () => {
  const { t } = useLanguage();

  const services = [
    {
      icon: Stethoscope,
      title: t.services.card1.title,
      desc: t.services.card1.desc,
      image: "/clinic-therapy.png",
      color: "from-sage-400 to-sage-600",
      lightColor: "bg-sage-50",
      iconColor: "text-sage-600",
    },
    {
      icon: Brain,
      title: t.services.card2.title,
      desc: t.services.card2.desc,
      image: "/clinic-consultation.png",
      color: "from-sky-400 to-sky-500",
      lightColor: "bg-sky-50",
      iconColor: "text-sky-500",
    },
    {
      icon: Mic,
      title: t.services.card3.title,
      desc: t.services.card3.desc,
      image: "/clinic-hero.png",
      color: "from-sage-300 to-sage-500",
      lightColor: "bg-sage-50",
      iconColor: "text-sage-500",
    },
  ];

  return (
    <section id="services" className="w-full py-24 bg-cream relative overflow-hidden">
      {/* Decorative shapes */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-sage-100/50 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-sky-100/30 rounded-full blur-3xl"></div>

      <div className="container mx-auto px-6 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-20 space-y-4"
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

        {/* Services Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
              className="group bg-white rounded-3xl overflow-hidden border border-sage-100 hover:border-sage-200 transition-all duration-500 hover:-translate-y-2"
            >
              {/* Card Image */}
              <div className="relative h-56 overflow-hidden">
                <Image
                  src={service.image}
                  alt={service.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
                <div className={`absolute top-4 left-4 ${service.lightColor} p-3 rounded-2xl`}>
                  <service.icon className={`w-5 h-5 ${service.iconColor}`} />
                </div>
              </div>

              {/* Card Content */}
              <div className="p-8 space-y-4">
                <h3 className="font-serif text-xl font-bold text-warm-gray-800 leading-snug">
                  {service.title}
                </h3>
                <p className="text-warm-gray-400 text-sm leading-relaxed">
                  {service.desc}
                </p>
                <div className="pt-2">
                  <span className={`inline-flex items-center text-xs font-semibold ${service.iconColor} group-hover:gap-2 transition-all duration-300`}>
                    {t.services.moreInfo}
                    <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
