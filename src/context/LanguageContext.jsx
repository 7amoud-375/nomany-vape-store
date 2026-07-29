import { createContext, useContext, useState, useEffect } from "react";
import { getLocalStorage, setLocalStorage } from "../utils";
import { LOCAL_STORAGE_KEYS } from "../constants";

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(() => {
    return getLocalStorage(LOCAL_STORAGE_KEYS.LANGUAGE, "ar");
  });

  const [dir, setDir] = useState(language === "ar" ? "rtl" : "ltr");

  useEffect(() => {
    setDir(language === "ar" ? "rtl" : "ltr");
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    setLocalStorage(LOCAL_STORAGE_KEYS.LANGUAGE, language);
  }, [language]);

  const setLanguage = (lang) => {
    setLanguageState(lang);
  };

  const toggleLanguage = () => {
    setLanguageState((prev) => (prev === "ar" ? "en" : "ar"));
  };

  const t = (key) => {
    // This will be connected to translations data
    return key;
  };

  const isRTL = language === "ar";
  const isLTR = language === "en";

  return (
    <LanguageContext.Provider
      value={{ language, setLanguage, toggleLanguage, dir, isRTL, isLTR, t }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export default LanguageContext;
