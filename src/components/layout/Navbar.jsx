import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ShoppingCart,
  Heart,
  Menu,
  X,
  ChevronDown,
} from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useCart } from "../../context/CartContext";
import { useWishlist } from "../../context/WishlistContext";
import { useScrollPosition } from "../../hooks/useScrollPosition";
import { useTranslations } from "../../hooks/useTranslations";
import navigation from "../../data/navigation";
import Logo from "../common/Logo";
import LanguageSwitcher from "../common/LanguageSwitcher";
import ThemeToggle from "../common/ThemeToggle";

const Navbar = () => {
  const { language, isRTL } = useLanguage();
  const { cartCount } = useCart();
  const { wishlist } = useWishlist();
  const { isScrolled } = useScrollPosition();
  const { t } = useTranslations();
  const location = useLocation();
  const navigate = useNavigate();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const navLinks = navigation.customer;

  /**
   * Navigate through the router, not window.location.
   *
   * The old assignment did a full document load: the whole bundle was
   * re-downloaded and parsed, every context was rebuilt from scratch, and the
   * cart flashed empty until localStorage was re-read. In a single-page app
   * that is a page reload dressed up as a search.
   */
  const handleSearch = (e) => {
    e.preventDefault();
    const term = searchQuery.trim();
    if (!term) return;

    navigate(`/search?q=${encodeURIComponent(term)}`);
    setIsSearchOpen(false);
    setSearchQuery("");
  };

  // Close both overlays on any route change — back button and redirects too,
  // not just the paths that go through a click handler.
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsSearchOpen(false);
  }, [location]);

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "glass shadow-lg border-b border-gray-200/50 dark:border-slate-700/50"
            : "bg-transparent"
        }`}
      >
        <div className="container-custom">
          <nav className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <Logo />

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.id}
                  to={link.path}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors duration-200 ${
                    location.pathname === link.path
                      ? "text-primary bg-primary/5 dark:bg-primary/10"
                      : "text-gray-600 dark:text-gray-400 hover:text-primary hover:bg-gray-50 dark:hover:bg-slate-800"
                  }`}
                >
                  {language === "ar" ? link.labelAr : link.labelEn}
                </Link>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              {/* Search */}
              <button
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="p-2 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Search"
              >
                <Search className="w-5 h-5" />
              </button>

              {/* No account links: the store has no customer accounts and the
                  dashboard sign-in lives on an unlisted path. */}

              {/* Wishlist */}
              <Link
                to="/wishlist"
                className="relative p-2 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Wishlist"
              >
                <Heart className="w-5 h-5" />
                {wishlist.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-on-primary text-xs rounded-full flex items-center justify-center">
                    {wishlist.length}
                  </span>
                )}
              </Link>

              {/* Cart */}
              <Link
                to="/cart"
                className="relative p-2 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Cart"
              >
                <ShoppingCart className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-on-primary text-xs rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </Link>

              <div className="hidden sm:block w-px h-6 bg-gray-200 dark:bg-slate-700 mx-1" />

              {/* Language */}
              <div className="hidden sm:block">
                <LanguageSwitcher />
              </div>

              {/* Theme */}
              <ThemeToggle />

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </nav>
        </div>
      </motion.header>

      {/*
        Search Overlay — plain conditional rendering, deliberately not
        AnimatePresence.

        Submitting the form navigates, and that re-render raced the exit
        animation: the overlay faded to opacity 0 but AnimatePresence never
        unmounted it, leaving an invisible full-screen layer with
        `pointer-events: auto` on top of the page. Every click after a search
        hit that layer instead of the page, which looked exactly like "the
        search is broken".

        The open animation is CSS, so there is no exit to leave behind and no
        way for the node to outlive the state.
      */}
      {isSearchOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm motion-safe:animate-[fade-in_0.2s_ease-out]"
          onClick={() => setIsSearchOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={t("searchPlaceholder")}
        >
          <div
            className="container-custom pt-24"
            onClick={(e) => e.stopPropagation()}
          >
              <form onSubmit={handleSearch} className="relative">
                <Search className="absolute start-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("searchPlaceholder")}
                  className="w-full ps-12 pe-12 py-4 rounded-2xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white
                           shadow-xl border border-gray-200 dark:border-slate-700
                           focus:outline-none focus:ring-2 focus:ring-primary/30
                           text-lg"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(false)}
                  className="absolute end-4 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </form>
          </div>
        </div>
      )}

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, x: isRTL ? 300 : -300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isRTL ? 300 : -300 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 left-0 right-0 z-[55] lg:hidden"
          >
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              className={`absolute top-0 bottom-0 w-80 max-w-[85vw] bg-white dark:bg-slate-900 shadow-2xl ${
                isRTL ? "right-0" : "left-0"
              }`}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-8">
                  <Logo />
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100 dark:border-slate-800">
                  <LanguageSwitcher />
                  <ThemeToggle />
                </div>

                <div className="space-y-1">
                  {navLinks.map((link) => (
                    <Link
                      key={link.id}
                      to={link.path}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                        location.pathname === link.path
                          ? "text-primary bg-primary/5 dark:bg-primary/10"
                          : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      {language === "ar" ? link.labelAr : link.labelEn}
                    </Link>
                  ))}
                </div>

                <div className="mt-6 pt-6 border-t border-gray-100 dark:border-slate-800 space-y-3">
                  <Link
                    to="/cart"
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    {t("cart")}
                    {cartCount > 0 && (
                      <span className="ml-auto bg-primary text-on-primary text-xs px-2 py-1 rounded-full">
                        {cartCount}
                      </span>
                    )}
                  </Link>
                  <Link
                    to="/wishlist"
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800"
                  >
                    <Heart className="w-5 h-5" />
                    {t("wishlist")}
                    {wishlist.length > 0 && (
                      <span className="ml-auto bg-primary text-on-primary text-xs px-2 py-1 rounded-full">
                        {wishlist.length}
                      </span>
                    )}
                  </Link>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;