import { useState, useEffect, useRef } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Package,
  Grid3X3,
  Tag,
  Percent,
  ShoppingCart,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Store,
} from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import { useTranslations } from "../../hooks/useTranslations";
import navigation from "../../data/navigation";
import { ADMIN_LOGIN_PATH } from "../../constants";

const iconMap = {
  overview: LayoutDashboard,
  products: Package,
  categories: Grid3X3,
  brands: Tag,
  offers: Percent,
  orders: ShoppingCart,
  analytics: BarChart3,
  settings: Settings,
};

const DashboardSidebar = () => {
  const { language, isRTL } = useLanguage();
  const { logout, username } = useAuth();
  const { t } = useTranslations();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const panelRef = useRef(null);

  const navLinks = navigation.dashboard;

  // Close on navigation. The per-link onClick missed any route change that did
  // not come from clicking a link -- back button, redirect, programmatic nav.
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  // Escape closes it, and the page behind must not scroll while it is open.
  useEffect(() => {
    if (!isMobileOpen) return undefined;

    const onKeyDown = (e) => {
      if (e.key === "Escape") setIsMobileOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileOpen]);

  const handleLogout = async () => {
    await logout();
    navigate(ADMIN_LOGIN_PATH, { replace: true });
  };

  return (
    <>
      {/* Open button. Hidden while the panel is open so it cannot sit on top of
          the panel's own content -- the old version overlapped the header. */}
      {!isMobileOpen && (
        <button
          onClick={() => setIsMobileOpen(true)}
          aria-label={language === "ar" ? "فتح القائمة" : "Open menu"}
          aria-expanded={false}
          className={`lg:hidden fixed top-4 z-[60] p-2.5 rounded-xl bg-white dark:bg-slate-800 shadow-lg
                      border border-gray-100 dark:border-slate-700
                      text-gray-700 dark:text-gray-200 active:scale-95 transition-transform ${
                        isRTL ? "right-4" : "left-4"
                      }`}
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[55] bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setIsMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      <aside
        ref={panelRef}
        aria-hidden={!isMobileOpen ? undefined : false}
        className={`fixed top-0 bottom-0 w-64 bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800
                    z-[56] transition-transform duration-300 ease-out lg:translate-x-0 ${
                      isRTL
                        ? `right-0 border-l ${isMobileOpen ? "translate-x-0" : "translate-x-full"}`
                        : `left-0 border-r ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}`
                    }`}
      >
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
                <span className="text-white font-bold text-lg">N</span>
              </div>
              <div className="min-w-0">
                <p className="font-bold text-gray-900 dark:text-white truncate">{t("dashboard")}</p>
                <p className="text-xs text-gray-400 truncate">{username || "Admin"}</p>
              </div>
            </div>

            {/* Close lives inside the panel so it is always reachable. */}
            <button
              onClick={() => setIsMobileOpen(false)}
              aria-label={language === "ar" ? "إغلاق القائمة" : "Close menu"}
              className="lg:hidden p-2 -m-2 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200
                         hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navLinks.map((link) => {
              const Icon = iconMap[link.id] || LayoutDashboard;
              // `end` on the index route stops "/dashboard" staying active on
              // every child page.
              return (
                <NavLink
                  key={link.id}
                  to={link.path}
                  end={link.path === "/dashboard"}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-primary text-white shadow-sm"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className="w-5 h-5 shrink-0" />
                      <span className="flex-1">{language === "ar" ? link.labelAr : link.labelEn}</span>
                      {isActive && <ChevronRight className={`w-4 h-4 ${isRTL ? "rotate-180" : ""}`} />}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>

          <div className="p-4 border-t border-gray-100 dark:border-slate-800 space-y-1">
            <NavLink
              to="/"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
                         text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Store className="w-5 h-5" />
              {language === "ar" ? "عرض المتجر" : "View store"}
            </NavLink>

            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500
                         hover:bg-red-50 dark:hover:bg-red-900/20 w-full transition-colors"
            >
              <LogOut className="w-5 h-5" />
              {language === "ar" ? "تسجيل الخروج" : "Logout"}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default DashboardSidebar;
