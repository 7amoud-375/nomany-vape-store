import { Link, useNavigate } from "react-router-dom";
import SectionDecoration from "../../components/common/SectionDecoration";
import { motion } from "framer-motion";
import { Heart, ShoppingBag } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useWishlist } from "../../context/WishlistContext";
import { useCart } from "../../context/CartContext";
import { useTranslations } from "../../hooks/useTranslations";
import { formatPrice, effectivePrice, productImage, hasFlavors } from "../../utils";
import Button from "../../components/ui/Button";

const PLACEHOLDER = "https://placehold.co/200x200/004741/FFFFFF?text=%20";

const WishlistPage = () => {
  const { language } = useLanguage();
  const { wishlist, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const { t } = useTranslations();

  if (wishlist.length === 0) {
    return (
      <div className="pt-32 pb-20">
        <div className="container-custom text-center">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
            <Heart className="w-10 h-10 text-gray-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {language === "ar" ? "المفضلة فارغة" : "Wishlist is empty"}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8">
            {language === "ar" ? "لم تقم بإضافة أي منتجات إلى المفضلة بعد" : "You haven't added any products to your wishlist yet"}
          </p>
          <Link to="/products" className="btn-primary">{t("continueShopping")}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden pt-24 pb-20">
      <SectionDecoration variant="rings" position="top-end" size="w-72 h-72" tone="text-accent" />
      <div className="container-custom">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">{t("wishlist")}</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {wishlist.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="card overflow-hidden group"
            >
              <Link to={`/products/${item.id}`} className="block">
                <div className="relative aspect-square overflow-hidden bg-gray-100 dark:bg-slate-700">
                  <img
                    src={productImage(item) || PLACEHOLDER}
                    alt={language === "ar" ? item.nameAr : item.nameEn}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    onError={(e) => {
                      e.target.src = `https://placehold.co/400x400/004741/FFFFFF?text=${encodeURIComponent(language === "ar" ? item.nameAr : item.nameEn)}`;
                    }}
                  />
                </div>
              </Link>

              <div className="p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-1">
                  {language === "ar" ? item.nameAr : item.nameEn}
                </h3>
                <p className="font-bold text-primary mb-4">
                  {formatPrice(effectivePrice(item), language)}
                </p>

                <div className="flex gap-2">
                  {/* A liquid needs its flavour chosen on the product page. */}
                  <Button
                    onClick={() =>
                      hasFlavors(item) ? navigate(`/products/${item.id}`) : addToCart(item)
                    }
                    disabled={!item.availability}
                    size="sm"
                    className="flex-1"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    {hasFlavors(item)
                      ? language === "ar" ? "اختر الطعم" : "Choose flavour"
                      : t("addToCart")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeFromWishlist(item.id)}
                    className="border-red-200 text-red-500 hover:bg-red-50"
                  >
                    <Heart className="w-4 h-4 fill-current" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WishlistPage;
