import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useData } from "../../context/DataContext";
import { useTranslations } from "../../hooks/useTranslations";

/**
 * Shown when no banner has been published.
 *
 * Every string comes from store settings, so this is the shop's real name and
 * tagline rather than filler. Purely CSS/gradient — no image to load, so it
 * costs nothing against LCP, and the drift stops under prefers-reduced-motion.
 */
const FallbackHero = () => {
  const { language } = useLanguage();
  const { settings } = useData();
  const isRtl = language === "ar";

  const storeName = (isRtl ? settings.storeNameAr : settings.storeNameEn) || "Nomany Store";
  const tagline = isRtl ? settings.footerTextAr : settings.footerTextEn;
  const hashtag = isRtl ? settings.hashtagAr : settings.hashtagEn;

  // The gradient below is deliberately literal rather than `bg-primary`: this
  // is a dark surface carrying white text in BOTH themes, and the primary token
  // lifts to a bright teal in dark mode, where white would drop to roughly 2:1.
  // The values are the brand's own primary and primary-dark.
  return (
    <section className="relative h-[500px] md:h-[600px] lg:h-[700px] overflow-hidden bg-[linear-gradient(135deg,#00332e_0%,#004741_50%,#00332e_100%)]">
      {/* Ambient vapour, decorative only. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 start-[-10%] h-[420px] w-[420px] rounded-full bg-accent/20 blur-3xl motion-safe:animate-pulse" />
        <div className="absolute bottom-[-15%] end-[-5%] h-[380px] w-[380px] rounded-full bg-[#006b62]/40 blur-3xl" />
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-hidden"
      >
        <span
          className="px-4 text-center text-[80px] font-bold leading-none tracking-wider break-words sm:text-[120px] md:text-[180px] lg:text-[220px]"
          style={{ color: "rgba(255,255,255,0.07)", WebkitTextStroke: "1px rgba(212,168,67,0.2)" }}
        >
          {storeName}
        </span>
      </div>

      <div className="relative z-20 flex h-full items-center">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl"
          >
            {hashtag && (
              <p className="mb-3 text-lg font-bold tracking-wide text-accent md:text-xl">{hashtag}</p>
            )}
            <h1 className="mb-4 text-4xl font-bold leading-tight text-white drop-shadow-lg md:text-5xl lg:text-6xl">
              {storeName}
            </h1>
            {tagline && (
              <p className="mb-8 text-lg text-white/90 drop-shadow-md md:text-xl">{tagline}</p>
            )}
            <div className="flex flex-wrap gap-3">
              <Link
                to="/products"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 font-semibold text-primary shadow-lg transition-colors duration-200 hover:bg-secondary"
              >
                {isRtl ? "تسوق الآن" : "Shop now"}
              </Link>
              <Link
                to="/offers"
                className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-8 py-4 font-semibold text-white transition-colors duration-200 hover:bg-white/10"
              >
                {isRtl ? "العروض" : "Offers"}
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

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

  if (!homepage.hero.enabled) return null;

  // A brand-new shop has no banner rows, and the Banners admin page was removed
  // — so this used to return null and the homepage opened on a category grid
  // tucked under the fixed navbar. The fallback keeps the same footprint and
  // builds its copy from store settings, so it is never stale placeholder text.
  if (activeBanners.length === 0) return <FallbackHero />;

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
          {/* start/end rather than left/right, so the controls follow the
              reading direction instead of sitting backwards in Arabic. */}
          <button
            onClick={prev}
            aria-label={language === "ar" ? "الشريحة السابقة" : "Previous slide"}
            className="absolute start-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors flex items-center justify-center z-30"
          >
            <ChevronLeft className="w-6 h-6 rtl:rotate-180" />
          </button>
          <button
            onClick={next}
            aria-label={language === "ar" ? "الشريحة التالية" : "Next slide"}
            className="absolute end-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors flex items-center justify-center z-30"
          >
            <ChevronRight className="w-6 h-6 rtl:rotate-180" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-30">
            {activeBanners.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrent(index)}
                aria-label={
                  language === "ar" ? `الشريحة ${index + 1}` : `Go to slide ${index + 1}`
                }
                aria-current={index === current}
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