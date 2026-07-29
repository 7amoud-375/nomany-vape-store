import { useState } from "react";
import { useLanguage } from "../../context/LanguageContext";
import { useData } from "../../context/DataContext";
import { useTranslations } from "../../hooks/useTranslations";
import Button from "../../components/ui/Button";
import toast from "react-hot-toast";

const DashboardSettings = () => {
  const { language } = useLanguage();
  const { settings, updateSettings } = useData();
  const { t } = useTranslations();

  const [formData, setFormData] = useState(settings);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Ensure shippingCost is saved as a number
    const dataToSave = {
      ...formData,
      shippingCost: Number(formData.shippingCost) || 0
    };
    
    updateSettings(dataToSave);
    toast.success(language === "ar" ? "تم حفظ الإعدادات بنجاح" : "Settings saved successfully");
  };

  const fields = [
    { key: "storeNameAr", labelAr: "اسم المتجر (عربي)", labelEn: "Store Name (Arabic)" },
    { key: "storeNameEn", labelAr: "اسم المتجر (English)", labelEn: "Store Name (English)" },
    { key: "hashtagAr", labelAr: "الهاشتاج (عربي)", labelEn: "Hashtag (Arabic)" },
    { key: "hashtagEn", labelAr: "الهاشتاج (English)", labelEn: "Hashtag (English)" },
    { key: "phone", labelAr: "الهاتف", labelEn: "Phone" },
    { key: "whatsapp", labelAr: "واتساب", labelEn: "WhatsApp" },
    { key: "email", labelAr: "البريد الإلكتروني", labelEn: "Email" },
    { key: "facebook", labelAr: "فيسبوك", labelEn: "Facebook" },
    { key: "instagram", labelAr: "انستغرام", labelEn: "Instagram" },
    { key: "addressAr", labelAr: "العنوان (عربي)", labelEn: "Address (Arabic)" },
    { key: "addressEn", labelAr: "العنوان (English)", labelEn: "Address (English)" },
    { key: "businessHoursAr", labelAr: "ساعات العمل (عربي)", labelEn: "Business Hours (Arabic)" },
    { key: "businessHoursEn", labelAr: "ساعات العمل (English)", labelEn: "Business Hours (English)" },
    { key: "footerTextAr", labelAr: "نص الفوتر (عربي)", labelEn: "Footer Text (Arabic)" },
    { key: "footerTextEn", labelAr: "نص الفوتر (English)", labelEn: "Footer Text (English)" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">{t("settings")}</h1>

      <form onSubmit={handleSubmit} className="card p-8 space-y-6 max-w-2xl">
        {/* Shipping Cost Specific Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {language === "ar" ? "تكلفة الشحن (ج.م)" : "Shipping Cost (EGP)"}
          </label>
          <input
            type="number"
            min="0"
            value={formData.shippingCost || 0}
            onChange={(e) => setFormData((p) => ({ ...p, shippingCost: e.target.value }))}
            className="input-field"
            placeholder="80"
          />
          <p className="text-xs text-gray-500 mt-2">
            {language === "ar" ? "سيتم إضافة هذا المبلغ تلقائياً لإجمالي كل طلب في السلة وصفحة الدفع." : "This amount will be automatically added to the total of every order in the cart and checkout."}
          </p>
        </div>

        <div className="border-t border-gray-200 dark:border-slate-700 pt-6 space-y-6">
          {fields.map((field) => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {language === "ar" ? field.labelAr : field.labelEn}
              </label>
              <input
                type="text"
                value={formData[field.key] || ""}
                onChange={(e) => setFormData((p) => ({ ...p, [field.key]: e.target.value }))}
                className="input-field"
              />
            </div>
          ))}
        </div>

        <Button type="submit" className="w-full">
          {language === "ar" ? "حفظ الإعدادات" : "Save Settings"}
        </Button>
      </form>
    </div>
  );
};

export default DashboardSettings;