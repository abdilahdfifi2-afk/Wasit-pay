import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { translate, type Lang, type TKey } from "@/lib/i18n";

type Ctx = {
  language: Lang;
  setLanguage: (l: Lang) => void;
  t: (key: TKey) => string;
  dir: "ltr" | "rtl";
};

const LanguageContext = createContext<Ctx | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Lang>("en");

  useEffect(() => {
    const stored = (typeof window !== "undefined" && (localStorage.getItem("amanpay_lang") as Lang)) || null;
    if (stored && ["en", "ar", "fr"].includes(stored)) setLanguageState(stored);
  }, []);

  const dir = language === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = language;
    document.documentElement.dir = dir;
  }, [language, dir]);

  const setLanguage = (l: Lang) => {
    setLanguageState(l);
    if (typeof window !== "undefined") localStorage.setItem("amanpay_lang", l);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: (k) => translate(language, k), dir }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
