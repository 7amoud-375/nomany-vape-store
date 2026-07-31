import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight, CheckCircle, CreditCard, Truck, Wallet, Loader2 } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useCart } from "../../context/CartContext";
import { useData } from "../../context/DataContext";
import { useTranslations } from "../../hooks/useTranslations";
import { formatPrice, effectivePrice, toNumber, productImage } from "../../utils";
import { placeOrder, fetchPaymentMethods } from "../../services/apiClient";
import SectionDecoration from "../../components/common/SectionDecoration";
import Button from "../../components/ui/Button";
import toast from "react-hot-toast";

const PLACEHOLDER = "https://placehold.co/100x100/004741/FFFFFF?text=%20";

const METHOD_META = {
  cod:    { icon: Truck,      labelAr: "الدفع عند الاستلام", labelEn: "Cash on delivery" },
  card:   { icon: CreditCard, labelAr: "بطاقة ائتمان",        labelEn: "Credit card" },
  wallet: { icon: Wallet,     labelAr: "محفظة إلكترونية",     labelEn: "Mobile wallet" },
};

const CheckoutPage = () => {
  const { language } = useLanguage();
  const { cartItems, cartTotal, clearCart } = useCart();
  const { settings } = useData();
  const { t } = useTranslations();
  const [searchParams] = useSearchParams();
  const isRtl = language === "ar";

  const shippingCost = cartItems.length > 0 ? toNumber(settings?.shippingCost) : 0;
  const finalTotal = cartTotal + shippingCost;

  const [form, setForm] = useState({
    fullName: "", phone: "", email: "", address: "", city: "", notes: "",
    paymentMethod: "cod",
  });
  const [methods, setMethods] = useState(["cod"]);
  const [submitting, setSubmitting] = useState(false);
  const [placed, setPlaced] = useState(null);

  // Only offer what the server says is actually configured — a card button
  // that dead-ends because credentials are missing is worse than no button.
  useEffect(() => {
    fetchPaymentMethods()
      .then((result) => setMethods(result.methods || ["cod"]))
      .catch(() => setMethods(["cod"]));
  }, []);

  // Coming back from a hosted payment page.
  useEffect(() => {
    if (searchParams.get("status") === "return") {
      toast(
        isRtl
          ? "بنتأكد من الدفع. هيوصلك تأكيد لما يتم."
          : "We're confirming your payment. You'll get confirmation once it clears.",
        { duration: 8000 }
      );
    }
  }, [searchParams, isRtl]);

  const field = (key) => ({
    value: form[key],
    onChange: (e) => setForm((p) => ({ ...p, [key]: e.target.value })),
  });

  const validate = () => {
    if (!form.fullName.trim() || !form.address.trim() || !form.city.trim()) {
      toast.error(isRtl ? "يرجى ملء جميع الحقول المطلوبة" : "Please fill all required fields");
      return false;
    }
    if (!/^01[0125][0-9]{8}$/.test(form.phone.replace(/\s/g, ""))) {
      toast.error(isRtl ? "رقم الهاتف غير صحيح" : "Please enter a valid Egyptian mobile number");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      // The server prices the cart from the database; we only send ids and
      // quantities, so nothing the browser says about money is trusted.
      const result = await placeOrder({
        customerName: form.fullName,
        phone: form.phone,
        email: form.email,
        address: form.address,
        city: form.city,
        notes: form.notes,
        paymentMethod: form.paymentMethod,
        items: cartItems.map((item) => ({ productId: item.id, quantity: item.quantity })),
      });

      if (result.payment?.status === "redirect" && result.payment.redirectUrl) {
        // Cart is intentionally left intact: if they abandon the payment page,
        // they come back to a full cart rather than an empty one.
        window.location.href = result.payment.redirectUrl;
        return;
      }

      setPlaced(result.order);
      clearCart();
      toast.success(isRtl ? "تم تأكيد طلبك!" : "Your order is confirmed!");
    } catch (error) {
      toast.error(error.message || (isRtl ? "فشل إرسال الطلب" : "Could not place the order"));
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------

  if (cartItems.length === 0 && !placed) {
    return (
      <div className="pt-32 pb-20 text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t("emptyCart")}</h2>
        <Link to="/products" className="btn-primary">{t("continueShopping")}</Link>
      </div>
    );
  }

  if (placed) {
    const whatsapp = String(settings?.whatsapp ?? "").replace(/\D/g, "");
    const message = encodeURIComponent(
      `🛒 *${isRtl ? "طلب جديد" : "New order"}*\n\n` +
      `*${isRtl ? "رقم الطلب" : "Order"}:* ${placed.id}\n` +
      `*${isRtl ? "الاسم" : "Name"}:* ${placed.customerName}\n` +
      `*${isRtl ? "الهاتف" : "Phone"}:* ${placed.phone}\n` +
      `*${isRtl ? "العنوان" : "Address"}:* ${placed.address}, ${placed.city}\n` +
      `*${isRtl ? "الإجمالي" : "Total"}:* ${placed.total} EGP`
    );

    return (
      <div className="pt-32 pb-20">
        <div className="container-custom max-w-lg mx-auto text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center"
          >
            <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
          </motion.div>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t("orderSuccess")}</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-2">
            {t("orderNumber")}: <span className="font-bold text-primary font-mono">{placed.id}</span>
          </p>
          <p className="text-gray-500 dark:text-gray-400 mb-8">
            {isRtl
              ? "ابعتلنا الطلب على واتساب عشان نأكده أسرع."
              : "Send us the order on WhatsApp so we can confirm it faster."}
          </p>

          <div className="flex flex-col gap-3">
            {whatsapp && (
              <a
                href={`https://wa.me/${whatsapp}?text=${message}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary bg-green-600 hover:bg-green-700 text-white"
              >
                {isRtl ? "إرسال الطلب على واتساب" : "Send via WhatsApp"}
              </a>
            )}
            <Link to="/" className="btn-secondary">{t("goHome")}</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden pt-24 pb-20">
      <SectionDecoration variant="dots" position="top-end" size="w-72 h-72" tone="text-primary" />
      <div className="container-custom">
        <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-8">
          <Link to="/" className="hover:text-primary">{isRtl ? "الرئيسية" : "Home"}</Link>
          <ChevronRight className={`w-4 h-4 ${isRtl ? "rotate-180" : ""}`} />
          <Link to="/cart" className="hover:text-primary">{t("cart")}</Link>
          <ChevronRight className={`w-4 h-4 ${isRtl ? "rotate-180" : ""}`} />
          <span className="text-gray-900 dark:text-white">{t("checkout")}</span>
        </nav>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">{t("checkoutTitle")}</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="card p-6 space-y-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t("customerInfo")}</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t("fullName")} <span className="text-red-500">*</span>
                  </label>
                  <input type="text" required {...field("fullName")} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t("phoneNumber")} <span className="text-red-500">*</span>
                  </label>
                  <input type="tel" required {...field("phone")} className="input-field" placeholder="01XXXXXXXXX" dir="ltr" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {isRtl ? "البريد الإلكتروني" : "Email"}
                </label>
                <input type="email" {...field("email")} className="input-field" dir="ltr"
                  placeholder={isRtl ? "اختياري — لإرسال الإيصال" : "Optional — for your receipt"} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t("address")} <span className="text-red-500">*</span>
                </label>
                <input type="text" required {...field("address")} className="input-field" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t("city")} <span className="text-red-500">*</span>
                </label>
                <input type="text" required {...field("city")} className="input-field" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {isRtl ? "ملاحظات إضافية" : "Additional notes"}
                </label>
                <textarea rows={3} {...field("notes")} className="input-field resize-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  {t("paymentMethod")}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {methods.map((id) => {
                    const meta = METHOD_META[id];
                    if (!meta) return null;
                    const Icon = meta.icon;
                    const active = form.paymentMethod === id;

                    return (
                      <label
                        key={id}
                        className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          active
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600"
                        }`}
                      >
                        <input
                          type="radio"
                          name="payment"
                          value={id}
                          checked={active}
                          onChange={(e) => setForm((p) => ({ ...p, paymentMethod: e.target.value }))}
                          className="sr-only"
                        />
                        <span className={`p-2 rounded-lg ${active ? "bg-primary/10 text-primary" : "bg-gray-100 dark:bg-slate-800 text-gray-500"}`}>
                          <Icon className="w-5 h-5" />
                        </span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {isRtl ? meta.labelAr : meta.labelEn}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <Button type="submit" disabled={submitting} className="w-full flex items-center justify-center gap-2">
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {form.paymentMethod === "cod"
                  ? t("placeOrder")
                  : isRtl ? "المتابعة للدفع" : "Continue to payment"}
              </Button>
            </form>
          </div>

          <div className="lg:col-span-1">
            <div className="card p-6 sticky top-24">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">{t("orderSummary")}</h3>

              <div className="space-y-4 mb-6 max-h-64 overflow-y-auto">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-slate-800 shrink-0">
                      <img
                        src={productImage(item) || PLACEHOLDER}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => { e.currentTarget.src = PLACEHOLDER; }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {isRtl ? item.nameAr : item.nameEn}
                      </p>
                      <p className="text-xs text-gray-500">x{item.quantity}</p>
                    </div>
                    <p className="text-sm font-medium">
                      {formatPrice(effectivePrice(item) * item.quantity, language)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-100 dark:border-slate-800 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">{t("subtotal")}</span>
                  <span>{formatPrice(cartTotal, language)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">{isRtl ? "التوصيل" : "Shipping"}</span>
                  <span>{formatPrice(shippingCost, language)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-100 dark:border-slate-800">
                  <span className="text-gray-900 dark:text-white">{t("total")}</span>
                  <span className="text-primary">{formatPrice(finalTotal, language)}</span>
                </div>
                <p className="text-xs text-gray-400 pt-1">
                  {isRtl
                    ? "الإجمالي النهائي بيتحسب على السيرفر من أسعار المتجر."
                    : "The final total is calculated on the server from store prices."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
