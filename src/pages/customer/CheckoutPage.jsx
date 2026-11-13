import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight, CheckCircle, Landmark, Truck, Wallet, Loader2 } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useCart } from "../../context/CartContext";
import { useData } from "../../context/DataContext";
import { useTranslations } from "../../hooks/useTranslations";
import { formatPrice, effectivePrice, toNumber, productImage, flavorLabel, hasFlavors } from "../../utils";
import { placeOrder, fetchPaymentMethods } from "../../services/apiClient";
import SectionDecoration from "../../components/common/SectionDecoration";
import Button from "../../components/ui/Button";
import toast from "react-hot-toast";

const PLACEHOLDER = "https://placehold.co/100x100/004741/FFFFFF?text=%20";

const METHOD_META = {
  cod:           { icon: Truck,    labelAr: "الدفع عند الاستلام", labelEn: "Cash on delivery" },
  instapay:      { icon: Landmark, labelAr: "انستا باي",          labelEn: "InstaPay" },
  vodafone_cash: { icon: Wallet,   labelAr: "فودافون كاش",        labelEn: "Vodafone Cash" },
};

// The customer transfers themselves and sends proof over WhatsApp — there is
// no gateway, so the only thing checkout needs to show is where to send the
// money. Falls back to a "contact us" note if the admin has not filled the
// number in yet (Dashboard -> Settings -> Payment).
const manualInstructions = (methodId, settings, isRtl) => {
  const value = methodId === "instapay" ? settings?.instapayNumber : settings?.vodafoneCashNumber;
  if (value) return value;
  return isRtl ? "هيوصلك الرقم من المتجر لتأكيد التحويل" : "The store will send you the transfer details";
};

const CheckoutPage = () => {
  const { language } = useLanguage();
  const { cartItems, cartTotal, clearCart } = useCart();
  const { settings } = useData();
  const { t } = useTranslations();
  const isRtl = language === "ar";

  // Each area the shop delivers to, with its own fee — chosen at checkout, and
  // re-validated on the server on every order, so what is shown here is a
  // convenience for the total, not the authority on what gets charged.
  const cities = useMemo(() => {
    const list = Array.isArray(settings?.deliveryCities) ? settings.deliveryCities : [];
    return list
      .filter((c) => c?.nameAr || c?.nameEn)
      .map((c) => ({
        // Canonical identity — the value actually stored on the order — is the
        // Arabic name, matching what the server resolves to. Falls back to the
        // English name only if an area was somehow saved without one.
        value: c.nameAr || c.nameEn,
        label: isRtl ? c.nameAr || c.nameEn : c.nameEn || c.nameAr,
        fee: toNumber(c.fee),
      }));
  }, [settings?.deliveryCities, isRtl]);

  const [form, setForm] = useState({
    fullName: "", phone: "", email: "", address: "", city: "", notes: "",
    paymentMethod: "cod",
  });

  const selectedCity = cities.find((c) => c.value === form.city) || null;

  // No area chosen means no fee is known yet, so the total stays deliberately
  // incomplete rather than showing a number the customer would not be charged.
  const shippingCost = selectedCity ? selectedCity.fee : null;
  const finalTotal = shippingCost === null ? null : cartTotal + shippingCost;
  const [methods, setMethods] = useState(["cod"]);
  const [submitting, setSubmitting] = useState(false);
  const [placed, setPlaced] = useState(null);
  // Why an order was refused, shown on the page itself.
  const [formError, setFormError] = useState("");

  // Asked from the server rather than hard-coded so a future method can be
  // added there without a client release.
  useEffect(() => {
    fetchPaymentMethods()
      .then((result) => setMethods(result.methods || ["cod"]))
      .catch(() => setMethods(["cod"]));
  }, []);

  const field = (key) => ({
    value: form[key],
    onChange: (e) => setForm((p) => ({ ...p, [key]: e.target.value })),
  });

  /** One refusal, shown on the page and — where it works — as a toast. */
  const fail = (message) => {
    setFormError(message);
    toast.error(message);
    return false;
  };

  const validate = () => {
    setFormError("");

    // A cart saved before flavours were selectable holds liquids with no
    // flavour on them. The server rejects those, so they are caught here and
    // named, rather than failing at the end in a language the customer may not
    // read.
    const missing = cartItems.find((item) => hasFlavors(item) && !item.selectedFlavor);
    if (missing) {
      const productName = isRtl ? missing.nameAr : missing.nameEn;
      return fail(
        isRtl
          ? `من فضلك اختر الطعم لمنتج "${productName}" من صفحة المنتج`
          : `Please choose a flavour for "${productName}" on its product page`
      );
    }
    if (!form.fullName.trim() || !form.address.trim()) {
      return fail(isRtl ? "يرجى ملء جميع الحقول المطلوبة" : "Please fill all required fields");
    }
    // Checked separately from the other required fields so the message tells
    // the customer exactly what is missing rather than a generic "fill
    // everything in" when the rest of the form is actually complete.
    if (!selectedCity) {
      return fail(isRtl ? "يرجى اختيار منطقة التوصيل" : "Please choose your delivery area");
    }
    if (!/^01[0125][0-9]{8}$/.test(form.phone.replace(/\s/g, ""))) {
      return fail(isRtl ? "رقم الهاتف غير صحيح" : "Please enter a valid Egyptian mobile number");
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
        items: cartItems.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
          flavor: item.selectedFlavor ?? null,
        })),
      });

      setPlaced(result.order);
      clearCart();
      toast.success(isRtl ? "تم تأكيد طلبك!" : "Your order is confirmed!");
    } catch (error) {
      fail(error.message || (isRtl ? "فشل إرسال الطلب" : "Could not place the order"));
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
    const isManual = placed.paymentMethod === "instapay" || placed.paymentMethod === "vodafone_cash";
    const methodMeta = METHOD_META[placed.paymentMethod];
    const transferTo = isManual ? manualInstructions(placed.paymentMethod, settings, isRtl) : null;

    const whatsapp = String(settings?.whatsapp ?? "").replace(/\D/g, "");
    const message = encodeURIComponent(
      `🛒 *${isRtl ? "طلب جديد" : "New order"}*\n\n` +
      `*${isRtl ? "رقم الطلب" : "Order"}:* ${placed.id}\n` +
      `*${isRtl ? "الاسم" : "Name"}:* ${placed.customerName}\n` +
      `*${isRtl ? "الهاتف" : "Phone"}:* ${placed.phone}\n` +
      `*${isRtl ? "العنوان" : "Address"}:* ${placed.address}, ${placed.city}\n` +
      `*${isRtl ? "الإجمالي" : "Total"}:* ${placed.total} EGP` +
      (isManual
        ? `\n*${isRtl ? "الدفع" : "Payment"}:* ${isRtl ? methodMeta?.labelAr : methodMeta?.labelEn}\n\n` +
          (isRtl
            ? "📎 حوّلت المبلغ وهبعت صورة الإيصال دلوقتي."
            : "📎 I've made the transfer — attaching the receipt now.")
        : "")
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

          {isManual ? (
            <div className="mb-8 rounded-xl border-2 border-primary/20 bg-primary/5 p-5 text-start">
              <p className="mb-3 text-sm font-medium text-gray-900 dark:text-white">
                {isRtl
                  ? `حوّل ${formatPrice(placed.total, language)} على ${methodMeta?.labelAr}:`
                  : `Transfer ${formatPrice(placed.total, language)} via ${methodMeta?.labelEn}:`}
              </p>
              <p className="mb-3 break-all rounded-lg bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 px-3 py-2 font-mono text-sm font-bold text-primary" dir="ltr">
                {transferTo}
              </p>
              {/* Not a soft suggestion: with no gateway confirming payment
                  automatically, this WhatsApp message is the only signal the
                  admin gets that money actually moved. Skipping it means the
                  order just sits there — worth saying plainly. */}
              <p className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-2 text-xs font-medium text-amber-800 dark:text-amber-300">
                {isRtl
                  ? "⚠️ الطلب متأكدش لحد ما تبعتلنا إيصال التحويل على واتساب — من غيره مش هيتنفذ."
                  : "⚠️ Your order isn't confirmed until you send us the transfer receipt on WhatsApp — without it, it won't be processed."}
              </p>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 mb-8">
              {isRtl
                ? "ابعتلنا الطلب على واتساب عشان نأكده أسرع."
                : "Send us the order on WhatsApp so we can confirm it faster."}
            </p>
          )}

          <div className="flex flex-col gap-3">
            {whatsapp && (
              <a
                href={`https://wa.me/${whatsapp}?text=${message}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary bg-green-600 hover:bg-green-700 text-white"
              >
                {isManual
                  ? isRtl ? "إرسال الإيصال على واتساب" : "Send receipt via WhatsApp"
                  : isRtl ? "إرسال الطلب على واتساب" : "Send via WhatsApp"}
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
      {/* A soft cart/checkout motif — quiet enough not to compete with a form
          the customer is trying to fill in accurately. */}
      <SectionDecoration
        variant="waves"
        position="bottom-start"
        size="w-full h-32"
        tone="text-primary"
        motion="none"
        className="opacity-[0.04] dark:opacity-[0.07]"
      />
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

              {/* Area before street address: it sets the delivery fee, so the
                  total in the summary only becomes real once this is chosen. */}
              <div>
                <label htmlFor="checkout-city" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t("city")} <span className="text-red-500">*</span>
                </label>
                <select
                  id="checkout-city"
                  required
                  {...field("city")}
                  disabled={cities.length === 0}
                  className="input-field disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="">
                    {isRtl ? "اختر منطقة التوصيل…" : "Choose your delivery area…"}
                  </option>
                  {cities.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                {cities.length === 0 && (
                  <p className="mt-1.5 text-xs text-red-500">
                    {isRtl
                      ? "لسه مفيش مناطق توصيل متاحة. كلمنا للطلب."
                      : "No delivery areas are set up yet. Please contact us to order."}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t("address")} <span className="text-red-500">*</span>
                </label>
                <input type="text" required {...field("address")} className="input-field" />
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
                {/* The transfer target itself, shown as soon as the method is
                    picked — not just after the order exists — so the
                    customer isn't left hunting for it. Repeats on the
                    confirmation screen once there's an order number to go
                    with it. */}
                {(form.paymentMethod === "instapay" || form.paymentMethod === "vodafone_cash") && (
                  <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                    <p className="text-xs text-gray-600 dark:text-gray-300 mb-1.5">
                      {isRtl ? "هتحول على:" : "Transfer to:"}
                    </p>
                    <p className="break-all font-mono text-sm font-bold text-primary" dir="ltr">
                      {manualInstructions(form.paymentMethod, settings, isRtl)}
                    </p>
                    <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                      {isRtl
                        ? "هتحول بنفسك بعد تأكيد الطلب، وبعدها لازم تبعتلنا إيصال التحويل على واتساب — من غيره الطلب مش هيتنفذ."
                        : "You'll transfer yourself after confirming the order, then send us the receipt on WhatsApp — without it, the order won't be processed."}
                    </p>
                  </div>
                )}
              </div>

              {/* Shown on the page, not only as a toast: the reason an order
                  was refused has to survive next to the button that refused it. */}
              {formError && (
                <p
                  role="alert"
                  className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium
                             text-red-600 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-400"
                >
                  {formError}
                </p>
              )}

              <Button
                type="submit"
                disabled={submitting || cities.length === 0}
                className="w-full flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {t("placeOrder")}
              </Button>
            </form>
          </div>

          <div className="lg:col-span-1">
            <div className="card p-6 sticky top-24">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">{t("orderSummary")}</h3>

              <div className="space-y-4 mb-6 max-h-64 overflow-y-auto">
                {cartItems.map((item) => (
                  <div key={item.lineKey ?? item.id} className="flex gap-3">
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
                      {item.selectedFlavor && (
                        <p className="text-xs text-primary truncate">
                          {flavorLabel(item.selectedFlavor, language)}
                        </p>
                      )}
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
                  <span className="text-gray-500 dark:text-gray-400">
                    {isRtl ? "التوصيل" : "Shipping"}
                    {selectedCity && <span className="text-gray-400"> — {selectedCity.label}</span>}
                  </span>
                  {/* No fee is invented before an area is chosen — showing a
                      number here that then changes reads as the site got the
                      price wrong. */}
                  <span className={shippingCost === null ? "text-gray-400" : ""}>
                    {shippingCost === null
                      ? isRtl ? "اختر المنطقة" : "Choose your area"
                      : formatPrice(shippingCost, language)}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-100 dark:border-slate-800">
                  <span className="text-gray-900 dark:text-white">{t("total")}</span>
                  <span className="text-primary">
                    {finalTotal === null ? "—" : formatPrice(finalTotal, language)}
                  </span>
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
