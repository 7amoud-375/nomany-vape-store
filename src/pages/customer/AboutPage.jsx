import { motion } from "framer-motion";
import { ShieldCheck, Truck, Headphones, Award } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useData } from "../../context/DataContext";
import { useTranslations } from "../../hooks/useTranslations";
import SectionTitle from "../../components/common/SectionTitle";

const AboutPage = () => {
  const { language } = useLanguage();
  const { settings } = useData();
  const { t } = useTranslations();

  const features = [
    {
      icon: ShieldCheck,
      titleAr: "منتجات أصلية 100%",
      titleEn: "100% Authentic Products",
      descAr: "نضمن لك جميع منتجاتنا أصلية ومضمونة من الماركات العالمية",
      descEn: "We guarantee all our products are authentic and guaranteed from global brands",
    },
    {
      icon: Truck,
      titleAr: "توصيل سريع",
      titleEn: "Fast Delivery",
      descAr: "نوصل طلباتك في أسرع وقت ممكن إلى باب منزلك",
      descEn: "We deliver your orders as fast as possible to your doorstep",
    },
    {
      icon: Headphones,
      titleAr: "دعم فني 24/7",
      titleEn: "24/7 Support",
      descAr: "فريق دعم فني متاح على مدار الساعة لمساعدتك",
      descEn: "Technical support team available 24/7 to help you",
    },
    {
      icon: Award,
      titleAr: "أفضل الأسعار",
      titleEn: "Best Prices",
      descAr: "نقدم لك أفضل الأسعار التنافسية في السوق",
      descEn: "We offer you the most competitive prices in the market",
    },
  ];

  return (
    <div className="pt-24 pb-20">
      <div className="container-custom">
        <SectionTitle
          title={language === "ar" ? "من نحن" : "About Us"}
          subtitle={language === "ar" ? "تعرف على النعماني ستور" : "Get to know Nomany Store"}
        />

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="card p-8 md:p-12 mb-16"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              {/* HASHTAG */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-primary font-bold text-lg mb-3 tracking-wide"
              >
                {language === "ar" ? settings.hashtagAr : settings.hashtagEn}
              </motion.p>

              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4">
                {language === "ar" ? "وجهتك الأولى لعالم الفيب" : "Your First Destination for Vaping"}
              </h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                {language === "ar"
                  ? "النعماني ستور هو متجر متخصص في بيع أجهزة الفيب الإلكترونية والسوائل والبودات والسجائر الإلكترونية المستهلكة. نقدم لك تشكيلة واسعة من أفضل الماركات العالمية بأسعار تنافسية."
                  : "Nomany Store is a specialized store selling electronic vape devices, liquids, pods, and disposable electronic cigarettes. We offer you a wide range of the best global brands at competitive prices."}
              </p>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                {language === "ar"
                  ? "هدفنا هو تقديم تجربة تسوق ممتازة مع منتجات أصلية وخدمة عملاء متميزة."
                  : "Our goal is to provide an excellent shopping experience with authentic products and outstanding customer service."}
              </p>
            </div>
            <div className="aspect-video rounded-2xl overflow-hidden bg-gray-100 dark:bg-slate-700">
              <img
                src="https://placehold.co/800x450/004741/FFFFFF?text=Nomany+Store"
                alt="Nomany Store"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </motion.div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="card p-6 text-center"
              >
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                  <Icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                  {language === "ar" ? feature.titleAr : feature.titleEn}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {language === "ar" ? feature.descAr : feature.descEn}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AboutPage;