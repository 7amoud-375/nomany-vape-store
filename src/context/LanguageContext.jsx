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

  // No `t` here on purpose: this used to return the key unchanged, so anything
  // that picked it up rendered raw strings like "emptyCart". Use the
  // useTranslations hook instead.
  const isRTL = language === "ar";
  const isLTR = language === "en";

  return (
    <LanguageContext.Provider
      value={{ language, setLanguage, toggleLanguage, dir, isRTL, isLTR }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export default LanguageContext;
