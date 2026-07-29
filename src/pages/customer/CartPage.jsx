import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useCart } from "../../context/CartContext";
import { useData } from "../../context/DataContext"; // ADDED: Import useData
import { useTranslations } from "../../hooks/useTranslations";
import { formatPrice, toNumber, productImage, effectivePrice } from "../../utils";
import Button from "../../components/ui/Button";
import toast from "react-hot-toast";

const PLACEHOLDER = "https://placehold.co/100x100/004741/FFFFFF?text=%20";

const CartPage = () => {
  const { language } = useLanguage();
  const { cartItems, updateQuantity, removeFromCart, cartTotal, clearCart } = useCart();
  const { settings } = useData(); // ADDED: Get settings from database
  const { t } = useTranslations();
  const isRtl = language === "ar";

  // CHANGED: Calculate dynamic shipping cost from settings
  const shippingCost = cartItems.length > 0 ? toNumber(settings?.shippingCost) : 0;
  const finalTotal = cartTotal + shippingCost;

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
    <div className="pt-24 pb-20">
      <div className="container-custom">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">{t("yourCart")}</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item, index) => (
              <motion.div
                key={item.id}
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
                  <p className="font-bold text-primary">
                    {formatPrice(effectivePrice(item), language)}
                  </p>
                </div>

                <div className="flex flex-col items-end justify-between">
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="flex items-center border border-gray-200 dark:border-slate-600 rounded-xl overflow-hidden">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center font-semibold text-sm">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
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
                
                {/* CHANGED: Show Dynamic Shipping Cost */}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">{isRtl ? "التوصيل" : "Shipping"}</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatPrice(shippingCost, language)}
                  </span>
                </div>

                <div className="border-t border-gray-100 dark:border-slate-700 pt-3">
                  <div className="flex justify-between">
                    <span className="font-bold text-gray-900 dark:text-white">{t("total")}</span>
                    {/* CHANGED: Show finalTotal instead of cartTotal */}
                    <span className="font-bold text-primary text-xl">{formatPrice(finalTotal, language)}</span>
                  </div>
                </div>
              </div>

              <Link to="/checkout" className="block">
                <Button className="w-full">
                  {t("checkout")}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>

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