import { motion } from "framer-motion";
import SectionDecoration from "../common/SectionDecoration";
import { ShieldCheck, Truck, Tag, Headphones } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useData } from "../../context/DataContext";
import { useTranslations } from "../../hooks/useTranslations";
import SectionTitle from "../common/SectionTitle";

const iconMap = {
  ShieldCheck,
  Truck,
  Tag,
  Headphones,
};

const WhyChooseUs = () => {
  const { language } = useLanguage();
  const { homepage } = useData();
  const { t } = useTranslations();

  if (!homepage.whyChooseUs.enabled) return null;

  return (
    <section className="relative overflow-hidden py-20 bg-white dark:bg-slate-900">
      <SectionDecoration variant="rings" position="bottom-end" size="w-72 h-72" tone="text-primary" />
      <SectionDecoration
        variant="trace"
        position="top-start"
        size="w-72 h-72"
        tone="text-accent"
        motion="none"
      />
      <SectionDecoration
        variant="hex"
        position="mid-end"
        size="w-[22rem] h-[22rem]"
        tone="text-primary"
        motion="none"
        className="opacity-[0.04] dark:opacity-[0.07]"
      />
      <div className="container-custom">
        <SectionTitle
          title={language === "ar" ? homepage.whyChooseUs.titleAr : homepage.whyChooseUs.titleEn}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {homepage.whyChooseUs.features.map((feature, index) => {
            const Icon = iconMap[feature.icon] || ShieldCheck;
            return (
              <motion.div
                key={feature.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                  <Icon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  {language === "ar" ? feature.titleAr : feature.titleEn}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                  {language === "ar" ? feature.descriptionAr : feature.descriptionEn}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default WhyChooseUs;
