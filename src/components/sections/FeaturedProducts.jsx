import { Link } from "react-router-dom";
import SectionDecoration from "../common/SectionDecoration";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useData } from "../../context/DataContext";
import { useProducts } from "../../hooks/useProducts";
import { useTranslations } from "../../hooks/useTranslations";
import SectionTitle from "../common/SectionTitle";
import ProductGrid from "../product/ProductGrid";

const FeaturedProducts = () => {
  const { language } = useLanguage();
  const { homepage } = useData();
  const { featuredProducts } = useProducts();
  const { t } = useTranslations();

  if (!homepage.featuredProducts.enabled) return null;

  const products = featuredProducts.slice(0, homepage.featuredProducts.limit);

  return (
    <section className="relative overflow-hidden py-20 bg-white dark:bg-slate-900">
      <SectionDecoration variant="dots" position="top-end" size="w-80 h-80" tone="text-primary" />
      <div className="container-custom">
        <div className="flex items-end justify-between mb-12">
          <div className="text-left">
            <h2 className="section-title">
              {language === "ar" ? homepage.featuredProducts.titleAr : homepage.featuredProducts.titleEn}
            </h2>
          </div>
          <Link
            to="/products"
            className="hidden sm:flex items-center gap-2 text-primary font-medium hover:gap-3 transition-all"
          >
            {t("viewDetails")}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <ProductGrid products={products} />

        <div className="mt-10 text-center sm:hidden">
          <Link to="/products" className="btn-primary inline-flex items-center gap-2">
            {t("viewDetails")}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FeaturedProducts;
