import { useState } from "react";
import SectionDecoration from "../common/SectionDecoration";
import { motion } from "framer-motion";
import { Mail, Send } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useData } from "../../context/DataContext";
import { useTranslations } from "../../hooks/useTranslations";
import toast from "react-hot-toast";

const Newsletter = () => {
  const { language } = useLanguage();
  const { homepage } = useData();
  const { t } = useTranslations();
  const [email, setEmail] = useState("");

  if (!homepage.newsletter.enabled) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    toast.success(language === "ar" ? "تم الاشتراك بنجاح!" : "Subscribed successfully!");
    setEmail("");
  };

  return (
    <section className="relative overflow-hidden py-20">
      <SectionDecoration variant="hatch" position="top-end" size="w-64 h-64" tone="text-accent" />
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative rounded-3xl overflow-hidden bg-primary p-8 md:p-16"
        >
          <div className="relative z-10 text-center max-w-2xl mx-auto">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-white/20 flex items-center justify-center">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
              {language === "ar" ? homepage.newsletter.titleAr : homepage.newsletter.titleEn}
            </h2>
            <p className="text-white/80 mb-8">
              {language === "ar" ? homepage.newsletter.subtitleAr : homepage.newsletter.subtitleEn}
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={language === "ar" ? homepage.newsletter.placeholderAr : homepage.newsletter.placeholderEn}
                className="flex-1 px-5 py-3.5 rounded-xl bg-white/20 border border-white/30 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/30"
              />
              <button
                type="submit"
                className="px-6 py-3.5 rounded-xl bg-white text-primary font-semibold hover:bg-secondary transition-colors flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                {language === "ar" ? homepage.newsletter.buttonAr : homepage.newsletter.buttonEn}
              </button>
            </form>
          </div>

          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        </motion.div>
      </div>
    </section>
  );
};

export default Newsletter;
