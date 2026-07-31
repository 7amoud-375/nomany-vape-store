import { Link } from "react-router-dom";
import SectionDecoration from "../common/SectionDecoration";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useData } from "../../context/DataContext";
import { useTranslations } from "../../hooks/useTranslations";
import SectionTitle from "../common/SectionTitle";

const FeaturedCategories = () => {
  const { language } = useLanguage();
  const { categories, homepage } = useData();
  const { t } = useTranslations();

  if (!homepage.featuredCategories.enabled) return null;

  return (
    <section className="relative overflow-hidden py-20">
      <SectionDecoration variant="arcs" position="bottom-start" size="w-72 h-72" tone="text-primary" />
      <div className="container-custom">
        <SectionTitle
          title={language === "ar" ? homepage.featuredCategories.titleAr : homepage.featuredCategories.titleEn}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((category, index) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <Link to={`/categories/${category.id}`} className="group block">
                <div className="relative aspect-[4/5] rounded-2xl overflow-hidden">
                  <img
                    src={category.image}
                    alt={language === "ar" ? category.nameAr : category.nameEn}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    onError={(e) => {
                      e.target.src = `https://placehold.co/400x500/004741/FFFFFF?text=${encodeURIComponent(language === "ar" ? category.nameAr : category.nameEn)}`;
                    }}
                  />
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors" />

                  <div className="absolute inset-0 flex flex-col justify-end p-6">
                    <h3 className="text-xl font-bold text-white mb-1">
                      {language === "ar" ? category.nameAr : category.nameEn}
                    </h3>
                    <p className="text-white/80 text-sm mb-3">
                      {category.productCount} {t("products")}
                    </p>
                    <div className="flex items-center gap-1 text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0">
                      <span>{t("viewDetails")}</span>
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedCategories;
