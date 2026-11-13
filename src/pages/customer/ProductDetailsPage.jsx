import { useState, useEffect } from "react";
import SectionDecoration from "../../components/common/SectionDecoration";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, ShoppingCart, Minus, Plus, ChevronRight, Truck, Shield, RotateCcw, BellRing, Loader2, Maximize2 } from "lucide-react";
import ImageLightbox from "../../components/product/ImageLightbox";

const PLACEHOLDER = "https://placehold.co/600x600/004741/FFFFFF?text=%20";
import { useLanguage } from "../../context/LanguageContext";
import { useCart } from "../../context/CartContext";
import { useWishlist } from "../../context/WishlistContext";
import { useProducts } from "../../hooks/useProducts";
import { useData } from "../../context/DataContext";
import { useTranslations } from "../../hooks/useTranslations";
import { formatPrice, calculateDiscount, effectivePrice, productImage, flavorLabel, hasFlavors } from "../../utils";
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
  // Once the visitor picks an image themselves, stop moving it under them.
  const [autoPlay, setAutoPlay] = useState(true);
  // A liquid is bought in one flavour; nothing is preselected so the choice is deliberate.
  const [selectedFlavorIndex, setSelectedFlavorIndex] = useState(null);
  const [flavorError, setFlavorError] = useState(false);

  // State for Notify Me
  const [notifyContact, setNotifyContact] = useState("");
  const [notifySubmitted, setNotifySubmitted] = useState(false);
  const [notifySubmitting, setNotifySubmitting] = useState(false);

  /*
   * Computed above the early return below, because the rotation effect needs it
   * and hooks cannot run conditionally.
   *
   * Blanks are dropped so a product saved with an empty slot does not render a
   * broken thumbnail or open an empty lightbox pane.
   */
  const gallery = (Array.isArray(product?.images) ? product.images : []).filter(
    (src) => typeof src === "string" && src.trim() !== ""
  );

  /** Advance the large image on its own, so the whole set is seen passively. */
  useEffect(() => {
    if (!autoPlay || gallery.length < 2) return undefined;

    // Someone who asked for less motion should not have the page animating at
    // them; they still have the thumbnails and the lightbox.
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return undefined;

    const timer = setInterval(() => {
      setSelectedImage((current) => (current + 1) % gallery.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [autoPlay, gallery.length]);

  // A new product means a new gallery and a new flavour list: start fresh.
  useEffect(() => {
    setSelectedImage(0);
    setAutoPlay(true);
    setSelectedFlavorIndex(null);
    setFlavorError(false);
  }, [id]);

  /** Picking a thumbnail takes over from the rotation. */
  const selectImage = (index) => {
    setAutoPlay(false);
    setSelectedImage(index);
  };

  const openLightbox = (index) => {
    setAutoPlay(false);
    setLightboxIndex(index);
  };

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
  const price = effectivePrice(product);
  const discount = calculateDiscount(product.price, product.discountPrice);
  const related = getRelatedProducts(product.id, product.category);
  const inWishlist = isInWishlist(product.id);

  const flavorOptions = hasFlavors(product)
    ? product.flavors.filter((flavor) => flavorLabel(flavor) !== "")
    : [];

  const handleAddToCart = () => {
    const flavor = flavorOptions[selectedFlavorIndex] ?? null;
    if (flavorOptions.length > 0 && !flavor) {
      setFlavorError(true);
      toast.error(isRtl ? "من فضلك اختر الطعم أولاً" : "Please choose a flavour first");
      return;
    }
    addToCart(product, quantity, flavor);
  };

  const handleNotifySubmit = async (e) => {
    e.preventDefault();

    // Same rule the checkout and the API apply, so a number that is accepted
    // here is one we can actually message later.
    const phone = notifyContact.replace(/\D/g, "");
    if (!/^01[0125][0-9]{8}$/.test(phone)) {
      toast.error(isRtl ? "رقم الموبايل غير صحيح" : "Please enter a valid Egyptian mobile number");
      return;
    }

    setNotifySubmitting(true);
    try {
      const success = await requestStockNotification(product.id, phone);
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
    <div className="relative overflow-hidden pt-24 pb-20">
      <SectionDecoration variant="vapour" position="top-end" size="w-72 h-96" tone="text-primary" />
      <SectionDecoration
        variant="coil"
        position="bottom-start"
        size="w-64 h-64"
        tone="text-accent"
        motion="none"
      />
      <SectionDecoration
        variant="hex"
        position="mid-start"
        size="w-[24rem] h-[24rem]"
        tone="text-primary"
        motion="none"
        className="opacity-[0.035] dark:opacity-[0.06]"
      />
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
            {/*
              One large image with a strip of small square thumbnails.

              The large image advances on its own every few seconds so a visitor
              sees the whole set without touching anything. Any interaction —
              picking a thumbnail or opening the lightbox — stops the rotation
              for good, because continuing to move under someone who has just
              chosen a photo is the opposite of helpful.
            */}
            <button
              type="button"
              onClick={() => gallery.length > 0 && openLightbox(selectedImage)}
              className="group relative mb-3 block aspect-square w-full cursor-zoom-in overflow-hidden
                         rounded-2xl bg-gray-100 dark:bg-slate-700"
              aria-label={isRtl ? "تكبير الصورة" : "Enlarge image"}
            >
              <img
                key={gallery[selectedImage] ?? "placeholder"}
                src={gallery[selectedImage] || PLACEHOLDER}
                alt={name}
                className="h-full w-full animate-[fade-in_0.4s_ease-out] object-cover
                           transition-transform duration-300 group-hover:scale-105"
                onError={(e) => {
                  e.currentTarget.src = PLACEHOLDER;
                }}
              />
              <span
                className="absolute bottom-3 end-3 flex h-10 w-10 items-center justify-center rounded-full
                           bg-black/50 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100"
              >
                <Maximize2 className="h-4 w-4" />
              </span>

              {gallery.length > 1 && (
                <span
                  className="absolute bottom-3 start-3 rounded-full bg-black/50 px-2.5 py-1 text-xs
                             tabular-nums text-white backdrop-blur-sm"
                  dir="ltr"
                >
                  {selectedImage + 1} / {gallery.length}
                </span>
              )}
            </button>

            {gallery.length > 1 && (
              <div className="grid grid-cols-5 gap-2 sm:grid-cols-6 lg:grid-cols-5">
                {gallery.map((img, i) => (
                  <button
                    key={`${img}-${i}`}
                    type="button"
                    onClick={() => selectImage(i)}
                    aria-label={isRtl ? `عرض الصورة ${i + 1}` : `Show image ${i + 1}`}
                    aria-current={selectedImage === i}
                    className={`aspect-square overflow-hidden rounded-lg border-2 transition-colors ${
                      selectedImage === i
                        ? "border-primary"
                        : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={img}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = PLACEHOLDER;
                      }}
                    />
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

            {/* Optional — a device or an accessory simply has none, so this
                renders nothing rather than an empty heading. */}
            {flavorOptions.length > 0 && (
              <div className="mb-8">
                <span
                  id="flavor-label"
                  className="mb-2 block text-sm font-medium text-gray-900 dark:text-white"
                >
                  {isRtl ? "اختر الطعم" : "Choose a flavour"}
                  <span className="text-red-500"> *</span>
                </span>
                <div
                  role="radiogroup"
                  aria-labelledby="flavor-label"
                  className={`flex flex-wrap gap-2 rounded-xl transition-shadow ${
                    flavorError ? "ring-2 ring-red-500 ring-offset-4 dark:ring-offset-slate-900" : ""
                  }`}
                >
                  {flavorOptions.map((flavor, index) => {
                    const selected = selectedFlavorIndex === index;
                    return (
                      <button
                        key={`${flavorLabel(flavor, language)}-${index}`}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => {
                          setSelectedFlavorIndex(index);
                          setFlavorError(false);
                        }}
                        className={`rounded-full border-2 px-4 py-1.5 text-sm font-medium transition-colors ${
                          selected
                            ? "border-primary bg-primary text-on-primary"
                            : "border-primary/20 bg-primary/10 text-primary hover:border-primary dark:bg-primary/20"
                        }`}
                      >
                        {flavorLabel(flavor, language)}
                      </button>
                    );
                  })}
                </div>
                {flavorError && (
                  <p className="mt-3 text-sm text-red-500">
                    {isRtl ? "من فضلك اختر الطعم أولاً" : "Please choose a flavour first"}
                  </p>
                )}
              </div>
            )}

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
                      {isRtl
                        ? "اكتب رقم موبايلك وهنبعتلك رسالة أول ما المنتج يرجع."
                        : "Enter your mobile number and we'll message you as soon as it's back."}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      {/* Phone only. The alert is delivered over WhatsApp, so an
                          email address here was never actually contactable. */}
                      <input
                        type="tel"
                        required
                        inputMode="numeric"
                        autoComplete="tel"
                        dir="ltr"
                        maxLength={11}
                        pattern="01[0125][0-9]{8}"
                        value={notifyContact}
                        onChange={(e) =>
                          setNotifyContact(e.target.value.replace(/\D/g, "").slice(0, 11))
                        }
                        placeholder="01XXXXXXXXX"
                        aria-label={isRtl ? "رقم الموبايل" : "Mobile number"}
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
              {/* A real link, not just a decorative icon — the policy it
                  refers to needs to be reachable from the product page. */}
              <Link to="/return-policy" className="text-center group">
                <RotateCcw className="w-6 h-6 mx-auto mb-2 text-primary" />
                <p className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-primary group-hover:underline transition-colors">
                  {language === "ar" ? "إرجاع سهل" : "Easy Return"}
                </p>
              </Link>
            </div>

            <p className="mt-4 text-center text-xs text-gray-400 dark:text-gray-500">
              <Link to="/return-policy" className="underline hover:text-primary transition-colors">
                {isRtl ? "سياسة الاستبدال والاسترجاع" : "Return & Refund Policy"}
              </Link>
            </p>
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