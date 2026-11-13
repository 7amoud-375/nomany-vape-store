import { Link } from "react-router-dom";
import SectionDecoration from "../../components/common/SectionDecoration";
import { motion } from "framer-motion";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, RotateCcw } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useCart } from "../../context/CartContext";
import { useTranslations } from "../../hooks/useTranslations";
import { formatPrice, productImage, effectivePrice, flavorLabel, hasFlavors } from "../../utils";
import Button from "../../components/ui/Button";
import toast from "react-hot-toast";

const PLACEHOLDER = "https://placehold.co/100x100/004741/FFFFFF?text=%20";

const CartPage = () => {
  const { language } = useLanguage();
  const { cartItems, updateQuantity, removeFromCart, cartTotal, clearCart } = useCart();
  const { t } = useTranslations();
  const isRtl = language === "ar";

  const handleClearCart = () => {
    clearCart();
    toast.success(isRtl ? "تم إفراغ السلة" : "Cart cleared");
  };

  if (cartItems.length === 0) {
    return (
      <div className="pt-32 pb-20">
        <div className="container-custom text-center">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
            <ShoppingBag className="w-10 h-10 text-gray-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t("emptyCart")}</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8">{t("emptyCartMessage")}</p>
          <Link to="/products" className="btn-primary">{t("continueShopping")}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden pt-24 pb-20">
      <SectionDecoration variant="dots" position="top-end" size="w-72 h-72" tone="text-primary" />
      <SectionDecoration
        variant="trace"
        position="bottom-start"
        size="w-64 h-64"
        tone="text-accent"
        motion="none"
      />
      <div className="container-custom">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">{t("yourCart")}</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item, index) => (
              <motion.div
                key={item.lineKey}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="card p-4 flex gap-4"
              >
                <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-100 dark:bg-slate-700 flex-shrink-0">
                  <img
                    src={productImage(item) || PLACEHOLDER}
                    alt={isRtl ? item.nameAr : item.nameEn}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = `https://placehold.co/200x200/004741/FFFFFF?text=${encodeURIComponent(isRtl ? item.nameAr : item.nameEn)}`;
                    }}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                    {isRtl ? item.nameAr : item.nameEn}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{item.brand}</p>
                  {item.selectedFlavor && (
                    <p className="mb-2 text-sm font-medium text-primary">
                      {isRtl ? "الطعم: " : "Flavour: "}
                      {flavorLabel(item.selectedFlavor, language)}
                    </p>
                  )}
                  {/* Added before flavours were selectable — the customer picks
                      one on the product page, and the old line is replaced. */}
                  {hasFlavors(item) && !item.selectedFlavor && (
                    <Link
                      to={`/products/${item.id}`}
                      className="mb-2 inline-block text-sm font-medium text-red-500 underline"
                    >
                      {isRtl ? "اختر الطعم لهذا المنتج" : "Choose a flavour for this product"}
                    </Link>
                  )}
                  <p className="font-bold text-primary">
                    {formatPrice(effectivePrice(item), language)}
                  </p>
                </div>

                <div className="flex flex-col items-end justify-between">
                  <button
                    onClick={() => removeFromCart(item.lineKey)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="flex items-center border border-gray-200 dark:border-slate-600 rounded-xl overflow-hidden">
                    <button
                      onClick={() => updateQuantity(item.lineKey, item.quantity - 1)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center font-semibold text-sm">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.lineKey, item.quantity + 1)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}

            <button
              onClick={handleClearCart}
              className="text-sm text-red-500 hover:text-red-600 flex items-center gap-1"
            >
              <Trash2 className="w-4 h-4" />
              {t("clear")}
            </button>
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="card p-6 sticky top-24">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">{t("orderSummary")}</h3>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">{t("subtotal")}</span>
                  <span className="font-medium">{formatPrice(cartTotal, language)}</span>
                </div>

                {/*
                  Delivery is priced per area now, chosen at checkout — showing
                  a flat number here before that choice exists would either be
                  wrong for most areas or would need to guess one, and either
                  way it does not match what the customer is actually charged.
                */}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">{isRtl ? "التوصيل" : "Shipping"}</span>
                  <span className="text-gray-400 dark:text-gray-500">
                    {isRtl ? "بيتحدد في صفحة الدفع" : "Calculated at checkout"}
                  </span>
                </div>

                <div className="border-t border-gray-100 dark:border-slate-700 pt-3">
                  <div className="flex justify-between">
                    <span className="font-bold text-gray-900 dark:text-white">
                      {isRtl ? "الإجمالي قبل التوصيل" : "Total before delivery"}
                    </span>
                    <span className="font-bold text-primary text-xl">{formatPrice(cartTotal, language)}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
                    {isRtl
                      ? "+ سعر التوصيل حسب المنطقة اللي هتختارها"
                      : "+ delivery fee, based on the area you choose"}
                  </p>
                </div>
              </div>

              <Link to="/checkout" className="block">
                <Button className="w-full">
                  {t("checkout")}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>

              {/* Visible before payment, not just buried in the footer — a
                  clear link to the refund policy here. */}
              <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
                <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                <Link to="/return-policy" className="underline hover:text-primary transition-colors">
                  {isRtl ? "سياسة الاستبدال والاسترجاع" : "Return & Refund Policy"}
                </Link>
              </p>

              <Link
                to="/products"
                className="block text-center mt-4 text-sm text-gray-500 hover:text-primary transition-colors"
              >
                {t("continueShopping")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;