import { useState } from "react";
import { Smartphone, ArrowRight, X, Loader2 } from "lucide-react";
import Button from "../ui/Button";

const VodafoneCashForm = ({ onSubmit, onClose, isProcessing }) => {
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    
    const cleanPhone = phone.replace(/\D/g, "");
    
    if (cleanPhone.length < 10) {
      setError(document.documentElement.dir === "rtl" 
        ? "رقم الهاتف يجب أن يكون 10 أرقام على الأقل" 
        : "Phone number must be at least 10 digits");
      return;
    }
    
    if (!cleanPhone.startsWith("01")) {
      setError(document.documentElement.dir === "rtl" 
        ? "يجب أن يبدأ الرقم بـ 01" 
        : "Number must start with 01");
      return;
    }
    
    onSubmit(cleanPhone);
  };

  const isRtl = document.documentElement.dir === "rtl";

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white">
                {isRtl ? "فودافون كاش" : "Vodafone Cash"}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isRtl ? "ادخل رقم محفظتك" : "Enter your wallet number"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {isRtl ? "رقم فودافون كاش" : "Vodafone Cash Number"}
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
              placeholder="01XXXXXXXXX"
              className="input-field text-left dir-ltr"
              dir="ltr"
              required
              disabled={isProcessing}
            />
            {error && (
              <p className="text-xs text-red-500 mt-1">{error}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {isRtl 
                ? "أدخل رقم محفظة فودافون كاش المسجل باسمك" 
                : "Enter your registered Vodafone Cash wallet number"}
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={isProcessing}>
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                {isRtl ? "جاري المعالجة..." : "Processing..."}
              </>
            ) : (
              <>
                {isRtl ? "ادفع الآن" : "Pay Now"}
                <ArrowRight className={`w-4 h-4 ${isRtl ? "mr-2 rotate-180" : "ml-2"}`} />
              </>
            )}
          </Button>
        </form>

        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <p className="text-xs text-yellow-700 dark:text-yellow-400 text-center">
            {isRtl 
              ? "💡 ستصلك رسالة على هاتفك لتأكيد الدفع" 
              : "💡 You will receive a confirmation message on your phone"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default VodafoneCashForm;