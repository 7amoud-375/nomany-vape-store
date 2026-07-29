import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight, CheckCircle, CreditCard, Truck, Wallet, Loader2 } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useCart } from "../../context/CartContext";
import { useData } from "../../context/DataContext";
import { useTranslations } from "../../hooks/useTranslations";
import { formatPrice } from "../../utils";
import { PAYMENT_METHODS, INTEGRATION_IDS } from "../../constants";
import Button from "../../components/ui/Button";
import PaymobIframe from "../../components/payment/PaymobIframe";
import VodafoneCashForm from "../../components/payment/VodafoneCashForm";
import { initiateCardPayment, initiateVodafoneCash } from "../../services/paymobService";
import toast from "react-hot-toast";

const CheckoutPage = () => {
  const { language } = useLanguage();
  const { cartItems, cartTotal, clearCart } = useCart();
  const { addOrder, settings } = useData();
  const { t } = useTranslations();
  const isRtl = language === "ar";
  const [searchParams] = useSearchParams();

  // ADDED: Dynamic shipping cost from settings
  const shippingCost = cartItems.length > 0 ? Number(settings?.shippingCost || 0) : 0;
  const finalTotal = cartTotal + shippingCost;

  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    address: "",
    city: "",
    notes: "",
    paymentMethod: "cod",
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [iframeUrl, setIframeUrl] = useState(null);
  const [showVodafoneForm, setShowVodafoneForm] = useState(false);

  // Store final total in state so it persists if cart clears during redirect
  const [redirectTotal, setRedirectTotal] = useState(0);

  // 1. Handle Paymob Redirect on component mount
  useEffect(() => {
    const isPaymobRedirect = searchParams.get("success");
    
    if (isPaymobRedirect !== null) {
      const isSuccessful = searchParams.get("success") === "true";
      
      if (isSuccessful) {
        // Retrieve the data we saved before redirecting to Paymob
        const pendingData = JSON.parse(localStorage.getItem("pendingPaymobOrder") || "{}");
        
        if (pendingData.formData) {
          setFormData(pendingData.formData);
          setRedirectTotal(pendingData.finalTotal || 0);
          
          // Create the order in Firebase now that payment is confirmed
          const generateOrderNumber = () => {
            const now = new Date();
            const datePart = now.getFullYear().toString().slice(-2) +
              String(now.getMonth() + 1).padStart(2, "0") +
              String(now.getDate()).padStart(2, "0");
            const randomPart = Math.floor(1000 + Math.random() * 9000);
            return `NOM-${datePart}-${randomPart}`;
          };

          const newOrderId = generateOrderNumber();
          
          const orderData = {
            id: newOrderId,
            customerName: pendingData.formData.fullName,
            phone: pendingData.formData.phone,
            address: pendingData.formData.address,
            city: pendingData.formData.city,
            notes: pendingData.formData.notes,
            paymentMethod: "card",
            products: pendingData.products || [],
            total: pendingData.finalTotal,
            status: "paid",
            date: new Date().toISOString().split("T")[0],
            time: new Date().toLocaleTimeString(),
          };

          addOrder(orderData);
          setOrderId(newOrderId);
          setIsSubmitted(true);
          clearCart();
          localStorage.removeItem("pendingPaymobOrder"); // Clean up
          toast.success(isRtl ? "تم الدفع بنجاح!" : "Payment successful!");
        }
      } else {
        toast.error(isRtl ? "فشل الدفع" : "Payment failed");
        localStorage.removeItem("pendingPaymobOrder");
      }
    }
  }, [searchParams]);

  if (cartItems.length === 0 && !isSubmitted) {
    return (
      <div className="pt-32 pb-20 text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t("emptyCart")}</h2>
        <Link to="/products" className="btn-primary">{t("continueShopping")}</Link>
      </div>
    );
  }

  // SUCCESS SCREEN WITH DYNAMIC WHATSAPP BUTTON
  if (isSubmitted) {
    const adminWhatsApp = settings?.whatsapp?.replace(/[^0-9]/g, "") || "";
    const totalForMessage = redirectTotal || finalTotal;
    
    const waMessage = encodeURIComponent(
      `🛒 *${isRtl ? "طلب جديد" : "New Order"}*\n\n` +
      `*${isRtl ? "رقم الطلب" : "Order Number"}: ${orderId}*\n\n` +
      `*${isRtl ? "الاسم" : "Name"}:* ${formData.fullName}\n` +
      `*${isRtl ? "الهاتف" : "Phone"}:* ${formData.phone}\n` +
      `*${isRtl ? "العنوان" : "Address"}:* ${formData.address}, ${formData.city}\n` +
      `*${isRtl ? "الإجمالي" : "Total"}:* ${totalForMessage} EGP\n` +
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
            {isRtl ? "يرجى الضغط على الزر بالأسفل لإرسال طلبك لنا عبر واتساب لإتمام التأكيد" : "Please click the button below to send us your order via WhatsApp to confirm"}
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

  const generateOrderNumber = () => {
    const now = new Date();
    const datePart = now.getFullYear().toString().slice(-2) +
      String(now.getMonth() + 1).padStart(2, "0") +
      String(now.getDate()).padStart(2, "0");
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    return `NOM-${datePart}-${randomPart}`;
  };

  const createLocalOrder = async (status = "pending", paymobOrderId = null) => {
    const newOrderId = generateOrderNumber();
    
    const orderData = {
      id: newOrderId,
      customerName: formData.fullName,
      phone: formData.phone,
      address: formData.address,
      city: formData.city,
      notes: formData.notes,
      paymentMethod: formData.paymentMethod,
      products: cartItems.map((item) => ({
        productId: item.id,
        nameAr: item.nameAr,
        nameEn: item.nameEn,
        price: item.discountPrice || item.price,
        quantity: item.quantity,
        image: item.images[0],
      })),
      total: finalTotal, // Uses dynamic total
      status: status,
      date: new Date().toISOString().split("T")[0],
      time: new Date().toLocaleTimeString(),
      paymobOrderId: paymobOrderId,
    };

    await addOrder(orderData);
    return newOrderId;
  };

  const handlePaymobSuccess = async () => {
    setIframeUrl(null);
    const newOrderId = await createLocalOrder("paid");
    setOrderId(newOrderId);
    setIsSubmitted(true);
    clearCart();
    toast.success(isRtl ? "تم الدفع بنجاح!" : "Payment successful!");
  };

  const handlePaymobFailure = () => {
    setIframeUrl(null);
    toast.error(isRtl ? "فشل الدفع، حاول مرة أخرى" : "Payment failed, please try again");
  };

  const handleVodafoneSubmit = async (phoneNumber) => {
    setIsProcessing(true);
    try {
      const orderData = {
        total: finalTotal, // Uses dynamic total
        email: "customer@example.com",
        firstName: formData.fullName.split(" ")[0],
        lastName: formData.fullName.split(" ").slice(1).join(" "),
        customerName: formData.fullName,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        products: cartItems.map((item) => ({
          nameEn: item.nameEn,
          price: item.discountPrice || item.price,
          quantity: item.quantity,
        })),
        integrationId: INTEGRATION_IDS.VODAFONE,
        vodafoneIntegrationId: INTEGRATION_IDS.VODAFONE,
      };

      const result = await initiateVodafoneCash(orderData, phoneNumber);
      
      if (result.success || result.pending) {
        setShowVodafoneForm(false);
        const newOrderId = await createLocalOrder("pending", result.paymobOrderId);
        setOrderId(newOrderId);
        setIsSubmitted(true);
        clearCart();
        toast.success(isRtl ? "تم إرسال طلب الدفع!" : "Payment request sent! Check your phone.");
      } else {
        throw new Error("Payment failed");
      }
    } catch (error) {
      toast.error(isRtl ? "فشل الدفع" : "Payment failed");
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.fullName || !formData.phone || !formData.address || !formData.city) {
      toast.error(isRtl ? "يرجى ملء جميع الحقول المطلوبة" : "Please fill all required fields");
      return;
    }

    if (formData.paymentMethod === "cod") {
      const newOrderId = await createLocalOrder("pending");
      setOrderId(newOrderId);
      setIsSubmitted(true);
      clearCart();
      toast.success(isRtl ? "تم تأكيد طلبك!" : "Your order has been confirmed!");
      return;
    }

    if (formData.paymentMethod === "card") {
      setIsProcessing(true);
      try {
        // SAVE DATA TO LOCAL STORAGE IN CASE PAYMOB REDIRECTS THE PAGE
        localStorage.setItem("pendingPaymobOrder", JSON.stringify({
          formData: formData,
          products: cartItems.map((item) => ({
            productId: item.id,
            nameAr: item.nameAr,
            nameEn: item.nameEn,
            price: item.discountPrice || item.price,
            quantity: item.quantity,
            image: item.images[0],
          })),
          finalTotal: finalTotal // Save dynamic total
        }));

        const orderData = {
          total: finalTotal, // Uses dynamic total
          email: "customer@example.com",
          firstName: formData.fullName.split(" ")[0],
          lastName: formData.fullName.split(" ").slice(1).join(" "),
          customerName: formData.fullName,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          products: cartItems.map((item) => ({
            nameEn: item.nameEn,
            price: item.discountPrice || item.price,
            quantity: item.quantity,
          })),
          integrationId: INTEGRATION_IDS.CARD,
        };

        const { iframeUrl: url } = await initiateCardPayment(orderData);
        setIframeUrl(url);
      } catch (error) {
        toast.error(isRtl ? "فشل إعداد الدفع" : "Failed to setup payment");
        console.error(error);
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    if (formData.paymentMethod === "vodafone") {
      setShowVodafoneForm(true);
      return;
    }
  };

  const paymentIcons = {
    cod: <Truck className="w-5 h-5" />,
    card: <CreditCard className="w-5 h-5" />,
    vodafone: <Wallet className="w-5 h-5" />,
  };

  const getSubmitButtonText = () => {
    if (isProcessing) return isRtl ? "جاري المعالجة..." : "Processing...";
    if (formData.paymentMethod === "cod") return t("placeOrder");
    return isRtl ? "الدفع الآن" : "Pay Now";
  };

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
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData((p) => ({ ...p, fullName: e.target.value }))}
                    className="input-field"
                    placeholder={isRtl ? "الاسم الكامل" : "Full Name"}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t("phoneNumber")} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                    className="input-field"
                    placeholder="01XXXXXXXXX"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t("address")} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))}
                  className="input-field"
                  placeholder={isRtl ? "العنوان بالتفصيل" : "Detailed Address"}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t("city")} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.city}
                  onChange={(e) => setFormData((p) => ({ ...p, city: e.target.value }))}
                  className="input-field"
                  placeholder={isRtl ? "المحافظة / المدينة" : "Governorate / City"}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {isRtl ? "ملاحظات إضافية" : "Additional Notes"}
                </label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                  className="input-field resize-none"
                  placeholder={isRtl ? "أي ملاحظات خاصة بالطلب..." : "Any special instructions..."}
                />
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
                      {formData.paymentMethod === method.id && (
                        <div className="ml-auto">
                          <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-white" />
                          </div>
                        </div>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isProcessing}>
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    {getSubmitButtonText()}
                  </>
                ) : (
                  getSubmitButtonText()
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
                        src={item.images[0]}
                        alt={isRtl ? item.nameAr : item.nameEn}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = `https://placehold.co/100x100/004741/FFFFFF?text=X`;
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {isRtl ? item.nameAr : item.nameEn}
                      </p>
                      <p className="text-xs text-gray-500">x{item.quantity}</p>
                    </div>
                    <p className="text-sm font-medium">
                      {formatPrice((item.discountPrice || item.price) * item.quantity, language)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-100 dark:border-slate-700 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">{t("subtotal")}</span>
                  <span>{formatPrice(cartTotal, language)}</span>
                </div>
                {/* CHANGED: Show dynamic shipping cost */}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">{isRtl ? "التوصيل" : "Shipping"}</span>
                  <span className="text-gray-900 dark:text-white">{formatPrice(shippingCost, language)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-100 dark:border-slate-700">
                  <span className="text-gray-900 dark:text-white">{t("total")}</span>
                  {/* CHANGED: Display finalTotal instead of cartTotal */}
                  <span className="text-primary">{formatPrice(finalTotal, language)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {iframeUrl && (
        <PaymobIframe
          url={iframeUrl}
          onClose={() => setIframeUrl(null)}
          onSuccess={handlePaymobSuccess}
          onFailure={handlePaymobFailure}
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