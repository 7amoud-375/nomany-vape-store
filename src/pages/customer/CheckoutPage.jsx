import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight, CheckCircle, CreditCard, Truck, Wallet, Loader2 } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useCart } from "../../context/CartContext";
import { useData } from "../../context/DataContext";
import { useTranslations } from "../../hooks/useTranslations";
import { formatPrice, effectivePrice, toNumber, todayLocalISO, productImage } from "../../utils";
import { PAYMENT_METHODS } from "../../constants";
import Button from "../../components/ui/Button";
import PaymobIframe from "../../components/payment/PaymobIframe";
import VodafoneCashForm from "../../components/payment/VodafoneCashForm";
import {
  createPaymentSession,
  payWithVodafone,
  verifyPayment,
} from "../../services/paymobService";
import toast from "react-hot-toast";

const PENDING_KEY = "pendingPaymobOrder";
const PLACEHOLDER = "https://placehold.co/100x100/004741/FFFFFF?text=%20";

const CheckoutPage = () => {
  const { language } = useLanguage();
  const { cartItems, cartTotal, clearCart } = useCart();
  const { addOrder, settings } = useData();
  const { t } = useTranslations();
  const isRtl = language === "ar";

  const shippingCost = cartItems.length > 0 ? toNumber(settings?.shippingCost) : 0;
  const finalTotal = cartTotal + shippingCost;

  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    notes: "",
    paymentMethod: "cod",
  });

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [paidTotal, setPaidTotal] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [session, setSession] = useState(null); // { merchantOrderId, iframeUrl }
  const [showVodafoneForm, setShowVodafoneForm] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Guards the resume-on-mount effect so React 18 StrictMode's double-invoke
  // cannot kick off two verification runs (and two orders).
  const resumedRef = useRef(false);

  const finishAsPaid = useCallback(
    (merchantOrderId, total) => {
      setOrderId(merchantOrderId);
      setPaidTotal(total);
      setIsSubmitted(true);
      setSession(null);
      setIsVerifying(false);
      localStorage.removeItem(PENDING_KEY);
      clearCart();
      toast.success(isRtl ? "تم الدفع بنجاح!" : "Payment successful!");
    },
    [clearCart, isRtl]
  );

  /**
   * Wait for the HMAC-verified callback to land.
   *
   * Payment state comes only from the server. The old code marked an order paid
   * because the URL said `?success=true`, which anyone could type.
   */
  const pollForConfirmation = useCallback(
    async (merchantOrderId, { attempts, intervalMs }) => {
      setIsVerifying(true);

      for (let attempt = 0; attempt < attempts; attempt += 1) {
        try {
          const result = await verifyPayment(merchantOrderId);
          if (result.paid) {
            finishAsPaid(merchantOrderId, toNumber(result.totalCents) / 100);
            return true;
          }
          if (result.status === "failed") {
            setIsVerifying(false);
            setSession(null);
            localStorage.removeItem(PENDING_KEY);
            toast.error(isRtl ? "فشل الدفع، حاول مرة أخرى" : "Payment failed, please try again");
            return false;
          }
        } catch {
          // Transient network error — keep waiting.
        }
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }

      setIsVerifying(false);
      toast(
        isRtl
          ? "لم نستلم تأكيد الدفع بعد. إذا تم خصم المبلغ، تواصل معنا برقم الطلب."
          : "We haven't received payment confirmation yet. If you were charged, contact us with your order number.",
        { duration: 8000 }
      );
      return false;
    },
    [finishAsPaid, isRtl]
  );

  // Resume after Paymob sends the customer back as a full page redirect.
  useEffect(() => {
    if (resumedRef.current) return;
    resumedRef.current = true;

    let pending = null;
    try {
      pending = JSON.parse(localStorage.getItem(PENDING_KEY) || "null");
    } catch {
      pending = null;
    }
    if (!pending?.merchantOrderId) return;

    // Only resume a recent attempt; a week-old key should not resurrect itself.
    if (pending.startedAt && Date.now() - pending.startedAt > 2 * 60 * 60 * 1000) {
      localStorage.removeItem(PENDING_KEY);
      return;
    }

    setFormData((prev) => ({ ...prev, ...(pending.formData || {}) }));
    pollForConfirmation(pending.merchantOrderId, { attempts: 8, intervalMs: 2000 });
  }, [pollForConfirmation]);

  // While the payment iframe is open, poll in the background. This replaces the
  // postMessage listener, which Paymob never actually sends.
  useEffect(() => {
    if (!session?.merchantOrderId) return undefined;

    let cancelled = false;
    const timer = setInterval(async () => {
      try {
        const result = await verifyPayment(session.merchantOrderId);
        if (cancelled) return;
        if (result.paid) {
          clearInterval(timer);
          finishAsPaid(session.merchantOrderId, toNumber(result.totalCents) / 100);
        }
      } catch {
        // Ignore and try again on the next tick.
      }
    }, 3000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [session, finishAsPaid]);

  const generateFallbackOrderNumber = () =>
    `NOM-${todayLocalISO().replace(/-/g, "").slice(2)}-${Math.floor(1000 + Math.random() * 9000)}`;

  const buildOrder = (id, status, total) => ({
    id,
    customerName: formData.fullName,
    phone: formData.phone,
    email: formData.email,
    address: formData.address,
    city: formData.city,
    notes: formData.notes,
    paymentMethod: formData.paymentMethod,
    products: cartItems.map((item) => ({
      productId: item.id,
      nameAr: item.nameAr,
      nameEn: item.nameEn,
      price: effectivePrice(item),
      quantity: item.quantity,
      image: productImage(item),
    })),
    shippingCost,
    total,
    status,
    date: todayLocalISO(),
    time: new Date().toLocaleTimeString(),
  });

  const validate = () => {
    if (!formData.fullName.trim() || !formData.phone.trim() || !formData.address.trim() || !formData.city.trim()) {
      toast.error(isRtl ? "يرجى ملء جميع الحقول المطلوبة" : "Please fill all required fields");
      return false;
    }
    if (!/^01[0125][0-9]{8}$/.test(formData.phone.replace(/\s/g, ""))) {
      toast.error(isRtl ? "رقم الهاتف غير صحيح" : "Please enter a valid Egyptian mobile number");
      return false;
    }
    return true;
  };

  /** Open a server-priced payment session and register the order against it. */
  const startPaymentSession = async (method) => {
    const data = await createPaymentSession({
      cartItems,
      method,
      customer: {
        name: formData.fullName,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        city: formData.city,
      },
    });

    // The server decides the total; the browser only reports it.
    const serverTotal = toNumber(data.totalCents) / 100;

    await addOrder(buildOrder(data.merchantOrderId, "awaiting_payment", serverTotal));

    localStorage.setItem(
      PENDING_KEY,
      JSON.stringify({
        merchantOrderId: data.merchantOrderId,
        formData,
        startedAt: Date.now(),
      })
    );

    return data;
  };

  const handleVodafoneSubmit = async (phoneNumber) => {
    setIsProcessing(true);
    try {
      const data = await startPaymentSession("vodafone");
      await payWithVodafone(data.merchantOrderId, phoneNumber);

      setShowVodafoneForm(false);
      toast.success(
        isRtl ? "تحقق من هاتفك لتأكيد الدفع" : "Check your phone to approve the payment"
      );

      // Wallet approvals are manual, so allow a couple of minutes.
      await pollForConfirmation(data.merchantOrderId, { attempts: 40, intervalMs: 3000 });
    } catch (error) {
      console.error(error);
      toast.error(error.message || (isRtl ? "فشل الدفع" : "Payment failed"));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    if (formData.paymentMethod === "cod") {
      setIsProcessing(true);
      try {
        const id = generateFallbackOrderNumber();
        const saved = await addOrder(buildOrder(id, "pending", finalTotal));
        if (saved) {
          setOrderId(id);
          setPaidTotal(finalTotal);
          setIsSubmitted(true);
          clearCart();
          toast.success(isRtl ? "تم تأكيد طلبك!" : "Your order has been confirmed!");
        }
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    if (formData.paymentMethod === "vodafone") {
      setShowVodafoneForm(true);
      return;
    }

    setIsProcessing(true);
    try {
      const data = await startPaymentSession("card");
      setSession({ merchantOrderId: data.merchantOrderId, iframeUrl: data.iframeUrl });
    } catch (error) {
      console.error(error);
      toast.error(error.message || (isRtl ? "فشل إعداد الدفع" : "Failed to set up payment"));
    } finally {
      setIsProcessing(false);
    }
  };

  // ---------------------------------------------------------------------------

  if (isVerifying && !isSubmitted) {
    return (
      <div className="pt-32 pb-20 text-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-6" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          {isRtl ? "جاري تأكيد الدفع..." : "Confirming your payment..."}
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          {isRtl ? "لا تغلق هذه الصفحة" : "Please don't close this page"}
        </p>
      </div>
    );
  }

  if (cartItems.length === 0 && !isSubmitted) {
    return (
      <div className="pt-32 pb-20 text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t("emptyCart")}</h2>
        <Link to="/products" className="btn-primary">{t("continueShopping")}</Link>
      </div>
    );
  }

  if (isSubmitted) {
    const adminWhatsApp = settings?.whatsapp?.replace(/[^0-9]/g, "") || "";
    const waMessage = encodeURIComponent(
      `🛒 *${isRtl ? "طلب جديد" : "New Order"}*\n\n` +
        `*${isRtl ? "رقم الطلب" : "Order Number"}: ${orderId}*\n\n` +
        `*${isRtl ? "الاسم" : "Name"}:* ${formData.fullName}\n` +
        `*${isRtl ? "الهاتف" : "Phone"}:* ${formData.phone}\n` +
        `*${isRtl ? "العنوان" : "Address"}:* ${formData.address}, ${formData.city}\n` +
        `*${isRtl ? "الإجمالي" : "Total"}:* ${paidTotal} EGP\n` +
        `*${isRtl ? "طريقة الدفع" : "Payment"}:* ${formData.paymentMethod}\n\n` +
        `${isRtl ? "يرجى تأكيد الطلب" : "Please confirm the order"}`
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
            {t("orderNumber")}: <span className="font-bold text-primary">{orderId}</span>
          </p>
          <p className="text-gray-500 dark:text-gray-400 mb-8">
            {isRtl
              ? "يرجى الضغط على الزر بالأسفل لإرسال طلبك لنا عبر واتساب لإتمام التأكيد"
              : "Please click the button below to send us your order via WhatsApp to confirm"}
          </p>

          <div className="flex flex-col gap-3">
            <a
              href={`https://wa.me/${adminWhatsApp}?text=${waMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              {isRtl ? "إرسال الطلب عبر واتساب" : "Send Order via WhatsApp"}
            </a>
            <Link to="/" className="btn-secondary">{t("goHome")}</Link>
          </div>
        </div>
      </div>
    );
  }

  const paymentIcons = {
    cod: <Truck className="w-5 h-5" />,
    card: <CreditCard className="w-5 h-5" />,
    vodafone: <Wallet className="w-5 h-5" />,
  };

  const submitLabel = () => {
    if (isProcessing) return isRtl ? "جاري المعالجة..." : "Processing...";
    if (formData.paymentMethod === "cod") return t("placeOrder");
    return isRtl ? "الدفع الآن" : "Pay Now";
  };

  const field = (key) => ({
    value: formData[key],
    onChange: (e) => setFormData((p) => ({ ...p, [key]: e.target.value })),
  });

  return (
    <div className="pt-24 pb-20">
      <div className="container-custom">
        <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-8">
          <Link to="/" className="hover:text-primary">{isRtl ? "الرئيسية" : "Home"}</Link>
          <ChevronRight className="w-4 h-4" />
          <Link to="/cart" className="hover:text-primary">{t("cart")}</Link>
          <ChevronRight className="w-4 h-4" />
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
                  <input type="text" required {...field("fullName")} className="input-field"
                    placeholder={isRtl ? "الاسم الكامل" : "Full Name"} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t("phoneNumber")} <span className="text-red-500">*</span>
                  </label>
                  <input type="tel" required {...field("phone")} className="input-field"
                    placeholder="01XXXXXXXXX" dir="ltr" />
                </div>
              </div>

              {/* Collected so payment receipts reach the customer instead of a
                  hardcoded placeholder address. */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {isRtl ? "البريد الإلكتروني" : "Email"}
                </label>
                <input type="email" {...field("email")} className="input-field"
                  placeholder={isRtl ? "لإرسال إيصال الدفع (اختياري)" : "For your payment receipt (optional)"}
                  dir="ltr" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t("address")} <span className="text-red-500">*</span>
                </label>
                <input type="text" required {...field("address")} className="input-field"
                  placeholder={isRtl ? "العنوان بالتفصيل" : "Detailed Address"} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t("city")} <span className="text-red-500">*</span>
                </label>
                <input type="text" required {...field("city")} className="input-field"
                  placeholder={isRtl ? "المحافظة / المدينة" : "Governorate / City"} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {isRtl ? "ملاحظات إضافية" : "Additional Notes"}
                </label>
                <textarea rows={3} {...field("notes")} className="input-field resize-none"
                  placeholder={isRtl ? "أي ملاحظات خاصة بالطلب..." : "Any special instructions..."} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  {t("paymentMethod")}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {PAYMENT_METHODS.map((method) => (
                    <label
                      key={method.id}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        formData.paymentMethod === method.id
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500"
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value={method.id}
                        checked={formData.paymentMethod === method.id}
                        onChange={(e) => setFormData((p) => ({ ...p, paymentMethod: e.target.value }))}
                        className="sr-only"
                      />
                      <div className={`p-2 rounded-lg ${
                        formData.paymentMethod === method.id
                          ? "bg-primary/10 text-primary"
                          : "bg-gray-100 dark:bg-slate-700 text-gray-500"
                      }`}>
                        {paymentIcons[method.id]}
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {isRtl ? method.labelAr : method.labelEn}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isProcessing}>
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    {submitLabel()}
                  </>
                ) : (
                  submitLabel()
                )}
              </Button>
            </form>
          </div>

          <div className="lg:col-span-1">
            <div className="card p-6 sticky top-24">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">{t("orderSummary")}</h3>

              <div className="space-y-4 mb-6 max-h-64 overflow-y-auto">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-slate-700 flex-shrink-0">
                      <img
                        src={productImage(item) || PLACEHOLDER}
                        alt={isRtl ? item.nameAr : item.nameEn}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.src = PLACEHOLDER; }}
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

              <div className="border-t border-gray-100 dark:border-slate-700 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">{t("subtotal")}</span>
                  <span>{formatPrice(cartTotal, language)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">{isRtl ? "التوصيل" : "Shipping"}</span>
                  <span className="text-gray-900 dark:text-white">{formatPrice(shippingCost, language)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-100 dark:border-slate-700">
                  <span className="text-gray-900 dark:text-white">{t("total")}</span>
                  <span className="text-primary">{formatPrice(finalTotal, language)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {session?.iframeUrl && (
        <PaymobIframe
          url={session.iframeUrl}
          onClose={() => {
            setSession(null);
            toast(isRtl ? "تم إلغاء الدفع" : "Payment cancelled");
          }}
        />
      )}

      {showVodafoneForm && (
        <VodafoneCashForm
          onSubmit={handleVodafoneSubmit}
          onClose={() => setShowVodafoneForm(false)}
          isProcessing={isProcessing}
        />
      )}
    </div>
  );
};

export default CheckoutPage;
