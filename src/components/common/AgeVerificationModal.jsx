import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { LOCAL_STORAGE_KEYS } from "../../constants";

const AgeVerificationModal = () => {
  const { language } = useLanguage();
  const isRtl = language === "ar";

  // Read synchronously during the first render. Deciding this in an effect
  // painted the shop for a frame before the gate appeared.
  const [visible, setVisible] = useState(() => {
    try {
      return localStorage.getItem(LOCAL_STORAGE_KEYS.AGE_VERIFIED) !== "true";
    } catch {
      return true;
    }
  });

  // Hold the page still while the gate is up.
  useEffect(() => {
    if (!visible) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [visible]);

  const handleYes = () => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEYS.AGE_VERIFIED, "true");
    } catch {
      // Private browsing — let them through for this session anyway.
    }
    setVisible(false);
  };

  const handleNo = () => {
    window.location.replace("https://www.google.com");
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-8 text-center shadow-2xl"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
              <ShieldAlert className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {isRtl ? "تأكيد السن" : "Age Verification"}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-8">
              {isRtl
                ? "هذا الموقع يبيع منتجات مخصصة للبالغين فقط. هل عمرك 18 عامًا أو أكثر؟"
                : "This website sells age-restricted products. Are you 18 years of age or older?"}
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleNo}
                className="flex-1 py-3 rounded-xl border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
              >
                {isRtl ? "لا" : "No"}
              </button>
              <button
                onClick={handleYes}
                className="flex-1 py-3 rounded-xl bg-primary text-white font-medium hover:opacity-90 transition-opacity"
              >
                {isRtl ? "نعم، عمري 18+" : "Yes, I'm 18+"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AgeVerificationModal;