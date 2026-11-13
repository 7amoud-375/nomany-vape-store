import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight, RotateCcw, ShieldCheck, Clock, Truck } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import SectionDecoration from "../../components/common/SectionDecoration";
import { useData } from "../../context/DataContext";
import { settings as defaultSettings } from "../../data/settings";

/**
 * Return policy. The text itself is admin-editable from Dashboard -> Settings,
 * so it can be reworded without a rebuild.
 */
const ReturnPolicyPage = () => {
  const { language } = useLanguage();
  const { settings } = useData();
  const isRtl = language === "ar";

  const body =
    (isRtl ? settings?.returnPolicyAr : settings?.returnPolicyEn) ||
    (isRtl ? defaultSettings.returnPolicyAr : defaultSettings.returnPolicyEn);

  // Blank lines separate paragraphs in the editable text.
  const paragraphs = String(body)
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const highlights = [
    {
      icon: Clock,
      titleAr: "١٤ يوم",
      titleEn: "14 days",
      textAr: "مهلة الإرجاع من تاريخ الاستلام",
      textEn: "to return from the delivery date",
    },
    {
      icon: ShieldCheck,
      titleAr: "بحالته الأصلية",
      titleEn: "Original condition",
      textAr: "غير مستخدم وبكامل عبواته",
      textEn: "unused and fully packaged",
    },
    {
      icon: Truck,
      titleAr: "٤٨ ساعة",
      titleEn: "48 hours",
      textAr: "للإبلاغ عن منتج تالف أو خاطئ",
      textEn: "to report a damaged or wrong item",
    },
  ];

  return (
    <div className="relative overflow-hidden pt-24 pb-20">
      <SectionDecoration variant="trace" position="top-end" size="w-72 h-72" tone="text-primary" motion="none" />
      <SectionDecoration variant="rings" position="bottom-start" size="w-64 h-64" tone="text-accent" />
      <div className="container-custom max-w-3xl">
        <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-8">
          <Link to="/" className="hover:text-primary transition-colors">
            {isRtl ? "الرئيسية" : "Home"}
          </Link>
          <ChevronRight className={`w-4 h-4 ${isRtl ? "rotate-180" : ""}`} />
          <span className="text-gray-900 dark:text-white">
            {isRtl ? "سياسة الاستبدال والاسترجاع" : "Return Policy"}
          </span>
        </nav>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <RotateCcw className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {isRtl ? "سياسة الاستبدال والاسترجاع" : "Return & Exchange Policy"}
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                {isRtl ? "راحتك وثقتك أهم حاجة عندنا" : "Your confidence matters to us"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
            {highlights.map(({ icon: Icon, titleAr, titleEn, textAr, textEn }) => (
              <div
                key={titleEn}
                className="card p-5 text-center border border-gray-100 dark:border-slate-800"
              >
                <Icon className="w-6 h-6 text-primary mx-auto mb-3" />
                <p className="font-bold text-gray-900 dark:text-white mb-1">
                  {isRtl ? titleAr : titleEn}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  {isRtl ? textAr : textEn}
                </p>
              </div>
            ))}
          </div>

          <div className="card p-8 space-y-5">
            {paragraphs.map((paragraph, index) => (
              <p
                key={index}
                className="text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line"
              >
                {paragraph}
              </p>
            ))}
          </div>

          <div className="mt-8 p-6 rounded-2xl bg-primary/5 dark:bg-primary/10 border border-primary/10 text-center">
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              {isRtl
                ? "عندك استفسار عن طلب أو عايز تبدأ إرجاع؟"
                : "Have a question about an order, or want to start a return?"}
            </p>
            <Link to="/contact" className="btn-primary inline-flex">
              {isRtl ? "تواصل معنا" : "Contact us"}
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ReturnPolicyPage;
