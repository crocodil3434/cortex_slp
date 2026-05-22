"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/context/LanguageContext";
import { Mail, MapPin, Phone } from "lucide-react";

export const Footer = () => {
  const { t } = useLanguage();

  return (
    <footer className="gradient-footer text-white py-16 mt-auto">
      <div className="container mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12">
        {/* Brand */}
        <div className="flex flex-col space-y-5">
          <div className="flex items-center space-x-3 flex-shrink-0">
            <div className="w-12 h-12 rounded-full overflow-hidden border border-white/10 flex-shrink-0 relative shadow-sm">
              <Image 
                src="/logo.jpg" 
                alt="Cortex SLP Logo" 
                fill 
                className="object-cover" 
              />
            </div>
            <span className="font-serif text-lg md:text-xl font-bold text-white tracking-tight whitespace-nowrap">
              CORTEX <span className="text-sage-300">SLP</span>
            </span>
          </div>
          <p className="text-sage-200/70 text-sm max-w-xs leading-relaxed">
            {t.hero.subtitle}
          </p>
        </div>

        {/* Navigation */}
        <div className="flex flex-col space-y-3 text-sm">
          <h4 className="text-sage-300 font-semibold mb-2">{t.footer.menu}</h4>
          <Link href="#services" className="text-sage-200/60 hover:text-sage-300 transition-colors duration-300">{t.header.services}</Link>
          <Link href="/courses" className="text-sage-200/60 hover:text-sage-300 transition-colors duration-300">{t.header.courses}</Link>
          <Link href="/shop" className="text-sage-200/60 hover:text-sage-300 transition-colors duration-300">{t.header.shop}</Link>
          <Link href="/triage" className="text-sage-200/60 hover:text-sage-300 transition-colors duration-300">{t.header.triage}</Link>
          <Link href="#about" className="text-sage-200/60 hover:text-sage-300 transition-colors duration-300">{t.header.about}</Link>
        </div>

        {/* Contact / Social Media Placeholder */}
        <div className="flex flex-col space-y-4 text-sm">
          {/* İleride sosyal medyalar eklenecek */}
        </div>
      </div>
      
      <div className="container mx-auto px-6 mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center text-xs text-sage-200/40">
        <p>&copy; {new Date().getFullYear()} CORTEX SLP. All rights reserved.</p>
        <div className="flex space-x-6 mt-4 md:mt-0">
          <Link href="/privacy" className="hover:text-sage-300 transition-colors duration-300">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-sage-300 transition-colors duration-300">Terms of Service</Link>
        </div>
      </div>
    </footer>
  );
};
