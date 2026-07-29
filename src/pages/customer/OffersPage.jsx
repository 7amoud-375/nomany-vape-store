import { motion } from "framer-motion";
import { Percent, Clock } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useData } from "../../context/DataContext";
import { useProducts } from "../../hooks/useProducts";
import { useTranslations } from "../../hooks/useTranslations";
import { formatDate } from "../../utils";
import SectionTitle from "../../components/common/SectionTitle";
import ProductGrid from "../../components/product/ProductGrid";

const OffersPage = () => {
  const { language } = useLanguage();
  const { offers } = useData();
  const { offers: offerProducts } = useProducts();
  const { t } = useTranslations();

  return (
    <div className="pt-24 pb-20">
      <div className="container-custom">
        <SectionTitle
          title={t("offers")}
          subtitle={language === "ar" ? "عروض حصرية لا تفوتها" : "Exclusive offers you don't want to miss"}
        />

        {/* Active Offers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {offers.filter((o) => o.active).map((offer, index) => (
            <motion.div
              key={offer.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="card overflow-hidden"
            >
              <div className="relative h-48">
                <img
                  src={offer.image}
                  alt={language === "ar" ? offer.titleAr : offer.titleEn}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = `https://placehold.co/600x300/004741/FFFFFF?text=${encodeURIComponent(language === "ar" ? offer.titleAr : offer.titleEn)}`;
                  }}
                />
                <div className="absolute top-4 left-4 bg-accent text-white px-3 py-1 rounded-lg font-bold text-lg">
                  -{offer.discountPercentage}%
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {language === "ar" ? offer.titleAr : offer.titleEn}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                  {language === "ar" ? offer.descriptionAr : offer.descriptionEn}
                </p>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Clock className="w-4 h-4" />
                  <span>{formatDate(offer.endDate, language)}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Products on Offer */}
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">{t("products")}</h2>
        <ProductGrid products={offerProducts} />
      </div>
    </div>
  );
};

export default OffersPage;
