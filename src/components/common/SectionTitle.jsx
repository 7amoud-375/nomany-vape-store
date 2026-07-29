import { motion } from "framer-motion";
import { useTranslations } from "../../hooks/useTranslations";

const SectionTitle = ({ title, subtitle, centered = true, className = "" }) => {
  const { language } = useTranslations();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className={`mb-12 ${centered ? "text-center" : ""} ${className}`}
    >
      <h2 className="section-title">{title}</h2>
      {subtitle && (
        <p className={`section-subtitle ${language === "ar" ? "rtl:text-right" : "ltr:text-left"}`}>
          {subtitle}
        </p>
      )}
    </motion.div>
  );
};

export default SectionTitle;
