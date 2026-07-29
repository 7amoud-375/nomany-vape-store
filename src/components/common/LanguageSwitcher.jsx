import { useLanguage } from "../../context/LanguageContext";
import { Globe } from "lucide-react";

const LanguageSwitcher = () => {
  const { language, toggleLanguage } = useLanguage();

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium
                 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800
                 transition-colors duration-200"
      aria-label="Toggle language"
    >
      <Globe className="w-4 h-4" />
      <span className="hidden sm:inline">{language === "ar" ? "English" : "العربية"}</span>
    </button>
  );
};

export default LanguageSwitcher;
