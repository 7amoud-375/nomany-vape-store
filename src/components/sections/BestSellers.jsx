import { Link } from "react-router-dom";
import SectionDecoration from "../common/SectionDecoration";
import { ArrowRight } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useData } from "../../context/DataContext";
import { useProducts } from "../../hooks/useProducts";
import { useTranslations } from "../../hooks/useTranslations";
import SectionTitle from "../common/SectionTitle";
import ProductGrid from "../product/ProductGrid";

const BestSellers = () => {
  const { language } = useLanguage();
  const { homepage } = useData();
  const { bestSellers } = useProducts();
  const { t } = useTranslations();

  if (!homepage.bestSellers.enabled) return null;

  const products = bestSellers.slice(0, homepage.bestSellers.limit);

  return (
    <section className="relative overflow-hidden py-20">
      <SectionDecoration variant="tag" position="top-start" size="w-56 h-56" tone="text-accent" />
      <SectionDecoration
        variant="coil"
        position="bottom-end"
        size="w-64 h-64"
        tone="text-primary"
        motion="none"
      />
      <SectionDecoration
        variant="sparks"
        position="top-end"
        size="w-60 h-60"
        tone="text-accent"
        motion="none"
      />
      <div className="container-custom">
        <div className="flex items-end justify-between mb-12">
          <div>
            <h2 className="section-title">
              {language === "ar" ? homepage.bestSellers.titleAr : homepage.bestSellers.titleEn}
            </h2>
          </div>
          <Link
            to="/products?sort=best-selling"
            className="hidden sm:flex items-center gap-2 text-primary font-medium hover:gap-3 transition-all"
          >
            {t("viewDetails")}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <ProductGrid products={products} />
      </div>
    </section>
  );
};

export default BestSellers;
