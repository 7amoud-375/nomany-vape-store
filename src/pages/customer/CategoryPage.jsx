import { useParams, Link } from "react-router-dom";
import SectionDecoration from "../../components/common/SectionDecoration";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useData } from "../../context/DataContext";
import { useProducts } from "../../hooks/useProducts";
import { useTranslations } from "../../hooks/useTranslations";
import SectionTitle from "../../components/common/SectionTitle";
import ProductGrid from "../../components/product/ProductGrid";

const CategoryPage = () => {
  const { id } = useParams();
  const { language } = useLanguage();
  const { categories } = useData();
  const { products } = useProducts();
  const { t } = useTranslations();

  // Same string-vs-number trap as products: a category added from the
  // dashboard gets a generated string id, the seed ones are plain slugs.
  const category = categories.find((c) => String(c.id) === String(id));
  const categoryProducts = products.filter((p) => String(p.category) === String(id));

  if (!category) {
    return (
      <div className="pt-32 pb-20 text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t("noProducts")}</h2>
        <Link to="/categories" className="btn-primary">{t("back")}</Link>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden pt-24 pb-20">
      <SectionDecoration variant="arcs" position="top-end" size="w-72 h-72" tone="text-primary" />
      <div className="container-custom">
        <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-8">
          <Link to="/" className="hover:text-primary">{language === "ar" ? "الرئيسية" : "Home"}</Link>
          <ChevronRight className="w-4 h-4" />
          <Link to="/categories" className="hover:text-primary">{t("categories")}</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900 dark:text-white">
            {language === "ar" ? category.nameAr : category.nameEn}
          </span>
        </nav>

        <SectionTitle
          title={language === "ar" ? category.nameAr : category.nameEn}
          subtitle={language === "ar" ? category.descriptionAr : category.descriptionEn}
        />

        <ProductGrid products={categoryProducts} />
      </div>
    </div>
  );
};

export default CategoryPage;
