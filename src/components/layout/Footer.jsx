import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, Phone, Mail, Clock, Facebook, Instagram, Send } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useData } from "../../context/DataContext";
import { useTranslations } from "../../hooks/useTranslations";
import Logo from "../common/Logo";

const Footer = () => {
  const { language } = useLanguage();
  const { settings, categories } = useData();
  const { t } = useTranslations();

  return (
    <footer className="bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800">
      <div className="container-custom py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Logo className="mb-4" />
            
            {/* HASHTAG */}
            <p className="text-primary font-bold text-sm mb-3 tracking-wide">
              {language === "ar" ? settings.hashtagAr : settings.hashtagEn}
            </p>
            
            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-6">
              {language === "ar" ? settings.footerTextAr : settings.footerTextEn}
            </p>
            <div className="flex items-center gap-3">
              <a
                href={settings.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center
                         text-gray-600 dark:text-gray-400 hover:bg-primary hover:text-on-primary
                         transition-all duration-200"
              >
                <Facebook className="w-4 h-4" />
              </a>
              <a
                href={settings.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center
                         text-gray-600 dark:text-gray-400 hover:bg-primary hover:text-on-primary
                         transition-all duration-200"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href={`https://wa.me/${String(settings.whatsapp ?? "").replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center
                         text-gray-600 dark:text-gray-400 hover:bg-primary hover:text-on-primary
                         transition-all duration-200"
              >
                <Send className="w-4 h-4" />
              </a>
              {/* Only rendered once a link is saved in the dashboard, so the
                  footer never shows a dead icon. */}
              {settings.tiktok && (
                <a
                  href={settings.tiktok}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="TikTok"
                  className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center
                           text-gray-600 dark:text-gray-400 hover:bg-primary hover:text-on-primary
                           transition-all duration-200"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1Z" />
                  </svg>
                </a>
              )}
            </div>
          </motion.div>

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
              {t("quickLinks")}
            </h3>
            <ul className="space-y-3">
              <li>
                <Link to="/" className="text-gray-500 dark:text-gray-400 hover:text-primary transition-colors text-sm">
                  {language === "ar" ? "الرئيسية" : "Home"}
                </Link>
              </li>
              <li>
                <Link to="/products" className="text-gray-500 dark:text-gray-400 hover:text-primary transition-colors text-sm">
                  {language === "ar" ? "المنتجات" : "Products"}
                </Link>
              </li>
              <li>
                <Link to="/offers" className="text-gray-500 dark:text-gray-400 hover:text-primary transition-colors text-sm">
                  {language === "ar" ? "العروض" : "Offers"}
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-gray-500 dark:text-gray-400 hover:text-primary transition-colors text-sm">
                  {language === "ar" ? "من نحن" : "About"}
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-gray-500 dark:text-gray-400 hover:text-primary transition-colors text-sm">
                  {language === "ar" ? "اتصل بنا" : "Contact"}
                </Link>
              </li>
              <li>
                <Link to="/return-policy" className="text-gray-500 dark:text-gray-400 hover:text-primary transition-colors text-sm">
                  {language === "ar" ? "سياسة الاستبدال والاسترجاع" : "Return Policy"}
                </Link>
              </li>
            </ul>
          </motion.div>

          {/* Categories */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
              {t("categories")}
            </h3>
            <ul className="space-y-3">
              {categories.map((cat) => (
                <li key={cat.id}>
                  <Link
                    to={`/categories/${cat.id}`}
                    className="text-gray-500 dark:text-gray-400 hover:text-primary transition-colors text-sm"
                  >
                    {language === "ar" ? cat.nameAr : cat.nameEn}
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Contact Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
              {t("storeInfo")}
            </h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-gray-500 dark:text-gray-400 text-sm">
                  {language === "ar" ? settings.addressAr : settings.addressEn}
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-primary flex-shrink-0" />
                <a href={`tel:${settings.phone}`} className="text-gray-500 dark:text-gray-400 hover:text-primary transition-colors text-sm">
                  {settings.phone}
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-primary flex-shrink-0" />
                <a href={`mailto:${settings.email}`} className="text-gray-500 dark:text-gray-400 hover:text-primary transition-colors text-sm">
                  {settings.email}
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="text-gray-500 dark:text-gray-400 text-sm">
                  {language === "ar" ? settings.businessHoursAr : settings.businessHoursEn}
                </span>
              </li>
            </ul>
          </motion.div>
        </div>

        {/* Copyright */}
        <div className="mt-10 pt-6 border-t border-gray-100 dark:border-slate-800 text-center">
          <p className="text-sm text-gray-400 dark:text-gray-500">
            &copy; {new Date().getFullYear()} {language === "ar" ? settings.storeNameAr : settings.storeNameEn}. {t("copyright")}.
          </p>
        </div>
        {/* Coded By Ibrahem 7amoud */}
        <div className="text-center  text-gray-400 dark:text-gray-500">
          <p className="">Coded by
            <a
            className="underline pl-1 text-black dark:text-white"
            href="https://my-portfolio-chi-two-55.vercel.app"
            target="_blank"
            >
              Ibrahem Hamoud
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;