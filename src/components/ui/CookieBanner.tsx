"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/context/LanguageContext";
import { Cookie, X } from "lucide-react";

export const CookieBanner = () => {
  const [isVisible, setIsVisible] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    const consent = localStorage.getItem("cortex_cookie_consent");
    if (!consent) {
      // Slight delay for a pop-in feel
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("cortex_cookie_consent", "true");
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="fixed bottom-6 left-6 right-6 md:left-auto md:right-6 md:max-w-md z-50"
        >
          <div className="bg-white rounded-2xl p-6 border border-sage-100 shadow-[0_8px_30px_rgba(90,143,106,0.12)]">
            <div className="flex items-start space-x-4">
              <div className="bg-sage-100 p-2.5 rounded-xl shrink-0">
                <Cookie className="w-5 h-5 text-sage-500" />
              </div>
              <div className="flex-1 space-y-3">
                <p className="text-warm-gray-600 text-sm leading-relaxed">
                  {t.footer.cookieText}
                </p>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleAccept}
                    className="bg-sage-500 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-sage-600 transition-colors duration-300"
                  >
                    {t.footer.cookieAccept}
                  </button>
                  <a href="/privacy" className="text-sage-500 text-sm font-medium hover:text-sage-700 transition-colors">
                    {t.footer.cookieBanner}
                  </a>
                </div>
              </div>
              <button onClick={handleAccept} className="text-warm-gray-300 hover:text-warm-gray-500 transition-colors shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
