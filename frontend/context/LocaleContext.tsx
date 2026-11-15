"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type LocaleCode = "he" | "en";

interface LocaleContextType {
  locale: LocaleCode;
  dir: "rtl" | "ltr";
  setLocale: (lang: LocaleCode) => void;
  toggleLocale: () => void;
  t: (heText: string, enText: string) => string;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);
const STORAGE_KEY = "wanderlust_preferred_locale";

export const LocaleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<LocaleCode>("he");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as LocaleCode | null;
      if (saved === "he" || saved === "en") {
        setLocaleState(saved);
      }
    } catch {
      // Ignore storage read errors
    }
  }, []);

  useEffect(() => {
    const dir = locale === "he" ? "rtl" : "ltr";
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale]);

  const setLocale = (lang: LocaleCode) => {
    setLocaleState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Ignore storage write errors
    }
  };

  const toggleLocale = () => setLocale(locale === "he" ? "en" : "he");
  const t = (heText: string, enText: string) => (locale === "he" ? heText : enText);

  return (
    <LocaleContext.Provider
      value={{
        locale,
        dir: locale === "he" ? "rtl" : "ltr",
        setLocale,
        toggleLocale,
        t,
      }}
    >
      {children}
    </LocaleContext.Provider>
  );
};

export const useLocale = () => {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return ctx;
};
