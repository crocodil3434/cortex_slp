"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/context/LanguageContext";
import { Globe, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const Header = () => {
  const { lang, t, toggleLanguage } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { href: "/#services", label: t.header.services },
    { href: "/courses", label: t.header.courses },
    { href: "/shop", label: t.header.shop },
    { href: "/triage", label: t.header.triage },
    { href: "/#about", label: t.header.about },
    { href: "/contact", label: t.header.contact },
  ];

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md h-20 flex items-center border-b border-sage-100">
        <div className="container mx-auto px-6 h-full flex items-center justify-between">
          {/* Brand */}
          <Link href="/" className="flex items-center space-x-3 flex-shrink-0">
            <div className="w-12 h-12 rounded-full overflow-hidden border border-sage-100 flex-shrink-0 relative shadow-sm">
              <Image 
                src="/logo.jpg" 
                alt="Cortex SLP Logo" 
                fill 
                className="object-cover" 
              />
            </div>
            <span className="font-serif text-lg md:text-xl font-bold text-warm-gray-800 tracking-tight whitespace-nowrap">
              CORTEX <span className="text-sage-500">SLP</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8 text-sm font-medium text-warm-gray-500">
            {navLinks.map((link) => (
              <Link 
                key={link.href} 
                href={link.href} 
                className="relative hover:text-sage-600 transition-colors duration-300 py-2 group"
              >
                {link.label}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-sage-400 rounded-full transition-all duration-300 group-hover:w-full"></span>
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            <button 
              onClick={toggleLanguage} 
              className="flex items-center space-x-1.5 text-warm-gray-400 hover:text-sage-600 transition-colors duration-300 text-sm font-medium"
            >
              <Globe className="w-4 h-4" />
              <span>{lang === "tr" ? "EN" : "TR"}</span>
            </button>
            <Link 
              href="/randevu" 
              className="hidden md:flex bg-sage-500 text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-sage-600 transition-all duration-300 hover:scale-[1.02] items-center"
            >
              {t.header.cta}
            </Link>

            {/* Mobile toggle */}
            <button 
              onClick={() => setMobileOpen(!mobileOpen)} 
              className="lg:hidden text-warm-gray-600 hover:text-sage-600 transition-colors"
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 top-20 z-40 bg-white/95 backdrop-blur-lg lg:hidden"
          >
            <nav className="flex flex-col items-center justify-center h-full space-y-8 text-lg font-medium text-warm-gray-600">
              {navLinks.map((link) => (
                <Link 
                  key={link.href} 
                  href={link.href} 
                  onClick={() => setMobileOpen(false)}
                  className="hover:text-sage-600 transition-colors duration-300"
                >
                  {link.label}
                </Link>
              ))}
              <Link 
                href="/randevu" 
                onClick={() => setMobileOpen(false)}
                className="bg-sage-500 text-white px-8 py-3 rounded-full text-base font-semibold hover:bg-sage-600 transition-all duration-300"
              >
                {t.header.cta}
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
