import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Phone, Mail, Clock, Send, MessageSquare } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useData } from "../../context/DataContext";
import { useTranslations } from "../../hooks/useTranslations";
import SectionTitle from "../../components/common/SectionTitle";
import Button from "../../components/ui/Button";
import toast from "react-hot-toast";

const ContactPage = () => {
  const { language } = useLanguage();
  const { settings } = useData();
  const { t } = useTranslations();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    toast.success(language === "ar" ? "تم إرسال رسالتك بنجاح!" : "Your message has been sent successfully!");
    setFormData({ name: "", email: "", message: "" });
  };

  return (
    <div className="pt-24 pb-20">
      <div className="container-custom">
        <SectionTitle
          title={t("contactUs")}
          subtitle={language === "ar" ? "نحن هنا لمساعدتك" : "We are here to help you"}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Info */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <div className="card p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">{t("storeInfo")}</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{language === "ar" ? "العنوان" : "Address"}</p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">{language === "ar" ? settings.addressAr : settings.addressEn}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{language === "ar" ? "الهاتف" : "Phone"}</p>
                    <a href={`tel:${settings.phone}`} className="text-gray-500 dark:text-gray-400 text-sm hover:text-primary">{settings.phone}</a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{language === "ar" ? "البريد" : "Email"}</p>
                    <a href={`mailto:${settings.email}`} className="text-gray-500 dark:text-gray-400 text-sm hover:text-primary">{settings.email}</a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{language === "ar" ? "ساعات العمل" : "Business Hours"}</p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">{language === "ar" ? settings.businessHoursAr : settings.businessHoursEn}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Map Placeholder */}
            <div className="card overflow-hidden">
              <div className="aspect-video bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="w-10 h-10 text-primary mx-auto mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {language === "ar" ? "موقع المتجر على الخريطة" : "Store location on map"}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-2"
          >
            <div className="card p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t("contactForm")}</h3>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t("yourName")}</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t("yourEmail")}</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                      className="input-field"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t("yourMessage")}</label>
                  <textarea
                    rows={5}
                    required
                    value={formData.message}
                    onChange={(e) => setFormData((p) => ({ ...p, message: e.target.value }))}
                    className="input-field resize-none"
                  />
                </div>

                <Button type="submit" className="w-full">
                  <Send className="w-4 h-4" />
                  {t("sendMessage")}
                </Button>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
