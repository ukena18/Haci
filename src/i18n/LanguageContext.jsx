import React, { createContext, useContext, useState } from "react";
import { translations } from "./translations";

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(localStorage.getItem("lang") || "tr");

  function t(key) {
    return translations[lang]?.[key] ?? translations.tr?.[key] ?? key;
  }

  function changeLanguage(newLang) {
    setLang(newLang);
    localStorage.setItem("lang", newLang);
  }

  return (
    <LanguageContext.Provider value={{ lang, t, changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLang must be used inside LanguageProvider");
  }
  return ctx;
}
