import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useData } from "../../context/DataContext";
import { useTranslations } from "../../hooks/useTranslations";
import SectionTitle from "../common/SectionTitle";

const TestimonialsSection = () => {
  const { language } = useLanguage();
  const { testimonials, homepage } = useData();
  const { t } = useTranslations();

  if (!homepage.testimonials.enabled) return null;

  return (
    <section className="py-20">
      <div className="container-custom">
        <SectionTitle
          title={language === "ar" ? homepage.testimonials.titleAr : homepage.testimonials.titleEn}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="card p-6 relative"
            >
              <Quote className="w-8 h-8 text-primary/20 absolute top-4 right-4" />

              <div className="flex items-center gap-1 mb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < testimonial.rating
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-200 dark:text-gray-600"
                    }`}
                  />
                ))}
              </div>

              <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-6">
                {language === "ar" ? testimonial.contentAr : testimonial.contentEn}
              </p>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-bold text-sm">
                    {(language === "ar" ? testimonial.nameAr : testimonial.nameEn).charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">
                    {language === "ar" ? testimonial.nameAr : testimonial.nameEn}
                  </p>
                  <p className="text-gray-400 text-xs">
                    {language === "ar" ? testimonial.roleAr : testimonial.roleEn}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
