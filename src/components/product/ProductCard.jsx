import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, ShoppingCart, Eye, Star } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useCart } from "../../context/CartContext";
import { useWishlist } from "../../context/WishlistContext";
import { useTranslations } from "../../hooks/useTranslations";
import { formatPrice, calculateDiscount } from "../../utils";
import Badge from "../ui/Badge";
import Modal from "../ui/Modal";

const ProductCard = ({ product, index = 0 }) => {
  const { language } = useLanguage();
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { t } = useTranslations();
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const name = language === "ar" ? product.nameAr : product.nameEn;
  const price = product.discountPrice || product.price;
  const discount = calculateDiscount(product.price, product.discountPrice);
  const inWishlist = isInWishlist(product.id);

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product);
  };

  const handleToggleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product);
  };

  const handleQuickView = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsQuickViewOpen(true);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: index * 0.05 }}
      >
        <Link to={`/products/${product.id}`} className="group block">
          <div className="card overflow-hidden group-hover:shadow-lg transition-all duration-300">
            {/* Image Container */}
            <div className="relative aspect-square overflow-hidden bg-gray-100 dark:bg-slate-700">
              {!imageLoaded && (
                <div className="absolute inset-0 skeleton" />
              )}
              <img
                src={product.images[0]}
                alt={name}
                className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${
                  imageLoaded ? "opacity-100" : "opacity-0"
                }`}
                onLoad={() => setImageLoaded(true)}
                onError={(e) => {
                  e.target.src = `https://placehold.co/400x400/004741/FFFFFF?text=${encodeURIComponent(name)}`;
                  setImageLoaded(true);
                }}
              />

              {/* Badges */}
              <div className="absolute top-3 left-3 flex flex-col gap-2">
                {product.newArrival && <Badge variant="primary">{t("newArrival")}</Badge>}
                {discount > 0 && <Badge variant="offer">-{discount}%</Badge>}
                {!product.availability && <Badge variant="danger">{t("outOfStock")}</Badge>}
              </div>

              {/* Actions */}
              <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <button
                  onClick={handleToggleWishlist}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-sm transition-colors ${
                    inWishlist
                      ? "bg-red-500 text-white"
                      : "bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-red-50 hover:text-red-500"
                  }`}
                >
                  <Heart className={`w-4 h-4 ${inWishlist ? "fill-current" : ""}`} />
                </button>
                <button
                  onClick={handleQuickView}
                  className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-primary hover:text-white shadow-sm transition-colors flex items-center justify-center"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>

              {/* Add to Cart Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                <button
                  onClick={handleAddToCart}
                  disabled={!product.availability}
                  className="w-full btn-primary py-2.5 text-sm flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="w-4 h-4" />
                  {t("addToCart")}
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{product.brand}</p>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-1 group-hover:text-primary transition-colors">
                {name}
              </h3>

              {/* Rating */}
              <div className="flex items-center gap-1 mb-2">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{product.rating}</span>
                <span className="text-xs text-gray-400">({product.reviewsCount})</span>
              </div>

              {/* Price */}
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-primary">{formatPrice(price, language)}</span>
                {discount > 0 && (
                  <span className="text-sm text-gray-400 line-through">{formatPrice(product.price, language)}</span>
                )}
              </div>
            </div>
          </div>
        </Link>
      </motion.div>

      {/* Quick View Modal */}
      <Modal isOpen={isQuickViewOpen} onClose={() => setIsQuickViewOpen(false)} title={name} size="lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-slate-700">
            <img
              src={product.images[0]}
              alt={name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.src = `https://placehold.co/400x400/004741/FFFFFF?text=${encodeURIComponent(name)}`;
              }}
            />
          </div>
          <div className="flex flex-col">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{product.brand}</p>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{name}</h2>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center gap-1">
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <span className="font-medium">{product.rating}</span>
              </div>
              <span className="text-gray-400">|</span>
              <span className="text-gray-500">{product.reviewsCount} {t("reviews")}</span>
            </div>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl font-bold text-primary">{formatPrice(price, language)}</span>
              {discount > 0 && (
                <span className="text-lg text-gray-400 line-through">{formatPrice(product.price, language)}</span>
              )}
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-6 line-clamp-3">
              {language === "ar" ? product.descriptionAr : product.descriptionEn}
            </p>
            <div className="flex gap-3 mt-auto">
              <button
                onClick={() => {
                  addToCart(product);
                  setIsQuickViewOpen(false);
                }}
                disabled={!product.availability}
                className="flex-1 btn-primary flex items-center justify-center gap-2"
              >
                <ShoppingCart className="w-5 h-5" />
                {t("addToCart")}
              </button>
              <button
                onClick={() => toggleWishlist(product)}
                className={`p-3 rounded-xl border-2 transition-colors ${
                  inWishlist
                    ? "border-red-500 text-red-500 bg-red-50"
                    : "border-gray-200 dark:border-slate-600 text-gray-400 hover:border-red-300 hover:text-red-500"
                }`}
              >
                <Heart className={`w-5 h-5 ${inWishlist ? "fill-current" : ""}`} />
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default ProductCard;
