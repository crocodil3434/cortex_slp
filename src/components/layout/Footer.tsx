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

        {/* Contact / Social Media */}
        <div className="flex flex-col space-y-4 text-sm">
          <h4 className="text-sage-300 font-semibold mb-2">İletişim & Sosyal Medya</h4>
          
          <div className="flex flex-col space-y-3">
            <a href="mailto:furkanyaya@cortexslp.com" className="flex items-center space-x-3 text-sage-200/60 hover:text-sage-300 transition-colors duration-300">
              <Mail className="w-4 h-4" />
              <span>furkanyaya@cortexslp.com</span>
            </a>
            
            <a href="tel:+905413296554" className="flex items-center space-x-3 text-sage-200/60 hover:text-sage-300 transition-colors duration-300">
              <Phone className="w-4 h-4" />
              <span className="tracking-wider">+90 541 329 65 54</span>
            </a>

            <div className="flex items-center space-x-3 text-sage-200/60 pt-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
              <div className="flex space-x-2">
                <a href="https://instagram.com/croco.ai" target="_blank" rel="noreferrer" className="hover:text-sage-300 transition-colors duration-300">@croco.ai</a>
                <span className="text-white/20">|</span>
                <a href="https://instagram.com/dktfurkan" target="_blank" rel="noreferrer" className="hover:text-sage-300 transition-colors duration-300">@dktfurkan</a>
              </div>
            </div>

            <a href="https://www.linkedin.com/in/furkanyaya" target="_blank" rel="noreferrer" className="flex items-center space-x-3 text-sage-200/60 hover:text-sage-300 transition-colors duration-300 pt-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>
              <span>linkedin.com/in/furkanyaya</span>
            </a>
          </div>
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
