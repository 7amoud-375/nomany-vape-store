import { useLanguage } from "../context/LanguageContext";
import translations from "../data/translations";

export const useTranslations = () => {
  const { language } = useLanguage();

  const t = (key) => {
    return translations[language]?.[key] || key;
  };

  return { t, language };
};

export default useTranslations;
