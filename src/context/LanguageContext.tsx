"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { tr } from "../dictionaries/tr";
import { en } from "../dictionaries/en";

type Dictionary = typeof tr;
type Language = "tr" | "en";

interface LanguageContextType {
  lang: Language;
  t: Dictionary;
  toggleLanguage: () => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLang] = useState<Language>("tr");

  const toggleLanguage = () => {
    setLang((prev) => (prev === "tr" ? "en" : "tr"));
  };

  const t = lang === "tr" ? tr : en;

  return (
    <LanguageContext.Provider value={{ lang, t, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
