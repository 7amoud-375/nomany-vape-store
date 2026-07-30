import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, ShoppingCart, Star, Minus, Plus, ChevronRight, Truck, Shield, RotateCcw, BellRing, Loader2, Maximize2 } from "lucide-react";
import ImageLightbox from "../../components/product/ImageLightbox";

const PLACEHOLDER = "https://placehold.co/600x600/004741/FFFFFF?text=%20";
import { useLanguage } from "../../context/LanguageContext";
import { useCart } from "../../context/CartContext";
import { useWishlist } from "../../context/WishlistContext";
import { useProducts } from "../../hooks/useProducts";
import { useData } from "../../context/DataContext";
import { useTranslations } from "../../hooks/useTranslations";
import { formatPrice, calculateDiscount, effectivePrice, productImage } from "../../utils";
import ProductGrid from "../../components/product/ProductGrid";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import toast from "react-hot-toast";

const ProductDetailsPage = () => {
  const { id } = useParams();
  const { language } = useLanguage();
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { getProductById, getRelatedProducts } = useProducts();
  const { requestStockNotification } = useData();
  const { t } = useTranslations();
  const isRtl = language === "ar";

  const product = getProductById(id);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  
  // State for Notify Me
  const [notifyContact, setNotifyContact] = useState("");
  const [notifySubmitted, setNotifySubmitted] = useState(false);
  const [notifySubmitting, setNotifySubmitting] = useState(false);

  if (!product) {
    return (
      <div className="pt-32 pb-20 text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t("noProducts")}</h2>
        <Link to="/products" className="btn-primary">{t("continueShopping")}</Link>
      </div>
    );
  }

  const name = language === "ar" ? product.nameAr : product.nameEn;
  const description = language === "ar" ? product.descriptionAr : product.descriptionEn;
  // Drop blanks so a product saved with an empty slot does not render a broken
  // thumbnail or open an empty lightbox pane.
  const gallery = (Array.isArray(product.images) ? product.images : []).filter(
    (src) => typeof src === "string" && src.trim() !== ""
  );
  const price = effectivePrice(product);
  const discount = calculateDiscount(product.price, product.discountPrice);
  const related = getRelatedProducts(product.id, product.category);
  const inWishlist = isInWishlist(product.id);

  const handleAddToCart = () => {
    addToCart(product, quantity);
  };

  const handleNotifySubmit = async (e) => {
    e.preventDefault();
    if (!notifyContact.trim()) return;
    
    setNotifySubmitting(true);
    try {
      const success = await requestStockNotification(product.id, notifyContact.trim());
      if (success) {
        setNotifySubmitted(true);
        setNotifyContact("");
      }
    } catch (error) {
      console.error("Notify Me Error:", error);
      toast.error(isRtl ? "حدث خطأ، يرجى المحاولة مرة أخرى" : "An error occurred, please try again");
    } finally {
      setNotifySubmitting(false);
    }
  };

  return (
    <div className="pt-24 pb-20">
      <div className="container-custom">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-8">
          <Link to="/" className="hover:text-primary">{language === "ar" ? "الرئيسية" : "Home"}</Link>
          <ChevronRight className="w-4 h-4" />
          <Link to="/products" className="hover:text-primary">{t("products")}</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900 dark:text-white">{name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20">
          {/* Images */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <button
              type="button"
              onClick={() => gallery.length > 0 && setLightboxIndex(selectedImage)}
              className="group relative w-full aspect-square rounded-2xl overflow-hidden bg-gray-100 dark:bg-slate-700 mb-4 cursor-zoom-in"
              aria-label={isRtl ? "تكبير الصورة" : "Enlarge image"}
            >
              <img
                src={gallery[selectedImage] || PLACEHOLDER}
                alt={name}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                onError={(e) => {
                  e.currentTarget.src = PLACEHOLDER;
                }}
              />
              <span className="absolute bottom-3 end-3 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm
                               text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Maximize2 className="w-4 h-4" />
              </span>
            </button>

            {gallery.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-1">
                {gallery.map((img, i) => (
                  <button
                    key={`${img}-${i}`}
                    onClick={() => setSelectedImage(i)}
                    onDoubleClick={() => setLightboxIndex(i)}
                    className={`w-20 h-20 rounded-xl overflow-hidden border-2 shrink-0 transition-colors ${
                      selectedImage === i ? "border-primary" : "border-transparent hover:border-gray-300"
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* Info */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <Badge variant="primary">{product.brand}</Badge>
              {product.newArrival && <Badge variant="success">{t("newArrival")}</Badge>}
              {discount > 0 && <Badge variant="offer">-{discount}%</Badge>}
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">{name}</h1>

            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center gap-1">
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <span className="font-semibold text-lg">{product.rating}</span>
              </div>
              <span className="text-gray-300">|</span>
              <span className="text-gray-500 dark:text-gray-400">{product.reviewsCount} {t("reviews")}</span>
              <span className="text-gray-300">|</span>
              <Badge variant={product.availability ? "success" : "danger"}>
                {product.availability ? t("inStock") : t("outOfStock")}
              </Badge>
            </div>

            <div className="flex items-baseline gap-3 mb-6">
              <span className="text-3xl font-bold text-primary">{formatPrice(price, language)}</span>
              {discount > 0 && (
                <span className="text-xl text-gray-400 line-through">{formatPrice(product.price, language)}</span>
              )}
            </div>

            <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-8">{description}</p>

            {/* CHECK IF OUT OF STOCK FOR NOTIFY ME */}
            {product.availability ? (
              <>
                <div className="flex items-center gap-4 mb-8">
                  <span className="font-medium text-gray-900 dark:text-white">{t("quantity")}</span>
                  <div className="flex items-center border border-gray-200 dark:border-slate-600 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="p-3 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      <Minus className="w-4 h-4 text-gray-900 dark:text-white" />
                    </button>
                    <span className="w-12 text-center font-semibold text-gray-900 dark:text-white">{quantity}</span>
                    <button
                      onClick={() => setQuantity((q) => q + 1)}
                      className="p-3 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      <Plus className="w-4 h-4 text-gray-900 dark:text-white" />
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 mb-8">
                  <Button onClick={handleAddToCart} className="flex-1">
                    <ShoppingCart className="w-5 h-5" />
                    {t("addToCart")}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => toggleWishlist(product)}
                    className={inWishlist ? "border-red-500 text-red-500" : ""}
                  >
                    <Heart className={`w-5 h-5 ${inWishlist ? "fill-current" : ""}`} />
                  </Button>
                </div>
              </>
            ) : (
              <div className="mb-8 p-6 rounded-2xl border-2 border-dashed border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-800">
                {notifySubmitted ? (
                  <div className="flex flex-col items-center text-center gap-3 py-4">
                    <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                      <BellRing className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">
                      {isRtl ? "تمام، هنبلغك أول ما يتوفر!" : "Got it — we'll notify you as soon as it's back!"}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {isRtl ? "سيتم إعلامك فور عودة هذا المنتج للمخزون." : "You will be alerted immediately once this product is restocked."}
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleNotifySubmit} className="flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                      <BellRing className="w-5 h-5 text-primary" />
                      <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                        {isRtl ? "أبلغني عند التوفر" : "Notify Me When Available"}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 -mt-2">
                      {isRtl ? "أدخل بريدك الإلكتروني أو رقم واتساب وسنخبرك فور عودة المنتج." : "Enter your email or WhatsApp number and we'll let you know when it's back."}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="text"
                        required
                        value={notifyContact}
                        onChange={(e) => setNotifyContact(e.target.value)}
                        placeholder={isRtl ? "البريد الإلكتروني أو رقم الواتساب" : "Email or WhatsApp number"}
                        className="input-field flex-1 text-base"
                      />
                      <Button 
                        type="submit" 
                        disabled={notifySubmitting} 
                        className="shrink-0 h-12"
                      >
                        {notifySubmitting ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {isRtl ? "جاري الإرسال..." : "Sending..."}
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <BellRing className="w-4 h-4" />
                            {isRtl ? "أبلغني" : "Notify Me"}
                          </span>
                        )}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Features */}
            <div className="grid grid-cols-3 gap-4 pt-8 border-t border-gray-100 dark:border-slate-700">
              <div className="text-center">
                <Truck className="w-6 h-6 mx-auto mb-2 text-primary" />
                <p className="text-xs text-gray-500 dark:text-gray-400">{language === "ar" ? "توصيل سريع" : "Fast Delivery"}</p>
              </div>
              <div className="text-center">
                <Shield className="w-6 h-6 mx-auto mb-2 text-primary" />
                <p className="text-xs text-gray-500 dark:text-gray-400">{language === "ar" ? "منتج أصلي" : "Authentic"}</p>
              </div>
              <div className="text-center">
                <RotateCcw className="w-6 h-6 mx-auto mb-2 text-primary" />
                <p className="text-xs text-gray-500 dark:text-gray-400">{language === "ar" ? "إرجاع سهل" : "Easy Return"}</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Related Products */}
        {related.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">{t("relatedProducts")}</h2>
            <ProductGrid products={related} />
          </div>
        )}
      </div>

      <ImageLightbox
        images={gallery}
        index={lightboxIndex}
        alt={name}
        onClose={() => setLightboxIndex(null)}
        onIndexChange={(next) => {
          setLightboxIndex(next);
          // Keep the page behind in step, so closing leaves you on the image
          // you were last looking at.
          setSelectedImage(next);
        }}
      />
    </div>
  );
};

export default ProductDetailsPage;