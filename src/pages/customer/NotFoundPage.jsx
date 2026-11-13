import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, Search } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useTranslations } from "../../hooks/useTranslations";
import Button from "../../components/ui/Button";
import SectionDecoration from "../../components/common/SectionDecoration";

const NotFoundPage = () => {
  const { language } = useLanguage();
  const { t } = useTranslations();

  return (
    <div className="relative overflow-hidden min-h-screen flex items-center justify-center px-4">
      <SectionDecoration variant="plume" position="bottom-start" size="w-72 h-96" tone="text-primary" motion="none" />
      <SectionDecoration variant="sparks" position="top-end" size="w-64 h-64" tone="text-accent" motion="none" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        <div className="w-32 h-32 mx-auto mb-8 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-6xl font-bold text-primary">404</span>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">{t("pageNotFound")}</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">{t("pageNotFoundMessage")}</p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/">
            <Button>
              <Home className="w-4 h-4" />
              {t("goHome")}
            </Button>
          </Link>
          <Link to="/products">
            <Button variant="secondary">
              <Search className="w-4 h-4" />
              {language === "ar" ? "تصفح المنتجات" : "Browse Products"}
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFoundPage;
