import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useData } from "../../context/DataContext";
import { useTranslations } from "../../hooks/useTranslations";

const HeroSlider = () => {
  const { language } = useLanguage();
  const { banners, homepage, settings } = useData();
  const { t } = useTranslations();
  const [current, setCurrent] = useState(0);

  const activeBanners = banners.filter((b) => b.active);
  const autoplay = homepage.hero.autoplay;
  const interval = homepage.hero.interval;

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % activeBanners.length);
  }, [activeBanners.length]);

  const prev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + activeBanners.length) % activeBanners.length);
  }, [activeBanners.length]);

  useEffect(() => {
    if (!autoplay || activeBanners.length <= 1) return;
    const timer = setInterval(next, interval);
    return () => clearInterval(timer);
  }, [autoplay, interval, next, activeBanners.length]);

  if (!homepage.hero.enabled || activeBanners.length === 0) return null;

  const banner = activeBanners[current];

  const titleText = language === "ar" ? banner.titleAr : banner.titleEn;
  const bgText = titleText ? titleText.replace(/[?؟!.,]/g, '').trim() : "";

  return (
    <section className="relative h-[500px] md:h-[600px] lg:h-[700px] overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={banner.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7 }}
          className="absolute inset-0"
        >
          {/* Background Image - ONLY renders if banner.image exists */}
          <div className="absolute inset-0 bg-primary">
            {banner.image && (
              <img
                src={banner.image}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => e.target.style.display = "none"}
              />
            )}
            <div className="absolute inset-0 bg-black/50" />
          </div>

          {/* Giant Background Text */}
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none z-10">
            <motion.h2
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="text-[80px] sm:text-[120px] md:text-[180px] lg:text-[220px] font-bold tracking-wider text-center leading-none break-words px-4"
              style={{ 
                color: 'rgba(255, 255, 255, 0.08)',
                WebkitTextStroke: "1px rgba(212, 168, 67, 0.2)" 
              }}
            >
              {bgText}
            </motion.h2>
          </div>

          {/* Main Content (Foreground) */}
          <div className="relative h-full flex items-center z-20">
            <div className="container-custom">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="max-w-2xl"
              >
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="text-accent font-bold text-lg md:text-xl mb-3 tracking-wide"
                >
                  {language === "ar" ? settings.hashtagAr : settings.hashtagEn}
                </motion.p>

                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight drop-shadow-lg">
                  {titleText}
                </h1>
                <p className="text-lg md:text-xl text-white/90 mb-8 drop-shadow-md">
                  {language === "ar" ? banner.subtitleAr : banner.subtitleEn}
                </p>
                <Link
                  to={banner.buttonLink}
                  className="inline-flex items-center gap-2 bg-white text-primary px-8 py-4 rounded-xl font-semibold hover:bg-secondary transition-colors duration-200 shadow-lg"
                >
                  {language === "ar" ? banner.buttonTextAr : banner.buttonTextEn}
                </Link>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation Arrows */}
      {activeBanners.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors flex items-center justify-center z-30"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors flex items-center justify-center z-30"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-30">
            {activeBanners.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrent(index)}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  index === current ? "bg-white w-8" : "bg-white/50 hover:bg-white/70"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
};

export default HeroSlider;