import { useEffect, useRef } from "react";
import { X } from "lucide-react";

const PaymobIframe = ({ url, onClose, onSuccess, onFailure }) => {
  const iframeRef = useRef(null);

  useEffect(() => {
    // Listen for postMessage from iframe
    const handleMessage = (event) => {
      // Verify origin
      if (event.origin !== "https://accept.paymob.com") return;
      
      const { data } = event;
      if (data.type === "payment_success") {
        onSuccess(data);
      } else if (data.type === "payment_failure") {
        onFailure(data);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onSuccess, onFailure]);

  // Handle iframe load events
  const handleLoad = () => {
    console.log("Paymob iframe loaded");
  };

  // Handle close with escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl h-[85vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-sm">
                {document.documentElement.dir === "rtl" ? "دفع آمن" : "Secure Payment"}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {document.documentElement.dir === "rtl" ? "بياناتك مشفرة بالكامل" : "Your data is fully encrypted"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        <div className="flex-1 relative">
          <iframe
            ref={iframeRef}
            src={url}
            className="w-full h-full border-0"
            title="Paymob Payment"
            allow="payment"
            onLoad={handleLoad}
          />
        </div>
        <div className="p-3 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {document.documentElement.dir === "rtl" 
              ? "🔒 مدعوم من Paymob - بوابة دفع مصرية مرخصة" 
              : "🔒 Powered by Paymob - Licensed Egyptian Payment Gateway"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymobIframe;