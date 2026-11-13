import { useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Package, Grid3X3, Tag, Percent,
  ShoppingCart, BarChart3, Settings, LogOut, Menu, X, Store, BellRing,
} from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import navigation from "../../data/navigation";
import { ADMIN_LOGIN_PATH } from "../../constants";
import { CountBadge } from "./ui";

const iconMap = {
  overview: LayoutDashboard,
  products: Package,
  categories: Grid3X3,
  brands: Tag,
  offers: Percent,
  orders: ShoppingCart,
  stockAlerts: BellRing,
  analytics: BarChart3,
  settings: Settings,
};

const DashboardSidebar = () => {
  const { language, isRTL } = useLanguage();
  const { logout, username } = useAuth();
  const { products, categories, brands, offers, orders } = useData();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Live tallies beside each menu entry, the way the reference console does it.
  const counts = {
    products: products?.length ?? 0,
    categories: categories?.length ?? 0,
    brands: brands?.length ?? 0,
    offers: offers?.filter((o) => o.active).length ?? 0,
    orders: orders?.length ?? 0,
  };

  // Close on any route change, not just link clicks — back button and redirects
  // must close it too.
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMobileOpen) return undefined;

    const onKeyDown = (e) => e.key === "Escape" && setIsMobileOpen(false);
    window.addEventListener("keydown", onKeyDown);

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [isMobileOpen]);

  const handleLogout = async () => {
    await logout();
    navigate(ADMIN_LOGIN_PATH, { replace: true });
  };

  return (
    <>
      {!isMobileOpen && (
        <button
          onClick={() => setIsMobileOpen(true)}
          aria-label={language === "ar" ? "فتح القائمة" : "Open menu"}
          className={`lg:hidden fixed top-3 z-[60] p-2.5 rounded-xl bg-primary-dark text-white shadow-lg
                      active:scale-95 transition-transform ${isRTL ? "right-4" : "left-4"}`}
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
            className="fixed inset-0 z-[55] bg-primary-dark/60 backdrop-blur-sm lg:hidden"
            onClick={() => setIsMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      <aside
        // primary-dark rather than primary: this is a dark chrome panel whose
        // children are all white, and the dark theme flips `primary` to a light
        // mint that white would vanish against. primary-dark stays a deep
        // Cyprus in both themes (#002f2a / #005049).
        className={`fixed top-0 bottom-0 w-64 z-[56] flex flex-col justify-between
                    bg-primary-dark text-white transition-transform duration-300 ease-out lg:translate-x-0 ${
                      isRTL
                        ? `right-0 border-l border-accent/10 ${isMobileOpen ? "translate-x-0" : "translate-x-full"}`
                        : `left-0 border-r border-accent/10 ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}`
                    }`}
      >
        <div className="min-h-0 flex flex-col">
          <div className="flex items-start justify-between gap-2 border-b border-white/10 p-6">
            <div className="min-w-0">
              <h2 className="font-display text-2xl font-bold text-accent truncate">
                {language === "ar" ? "النعماني" : "Nomany"}
              </h2>
              <p className="mt-1 text-[10px] uppercase tracking-widest text-white/50">
                {language === "ar" ? "لوحة التحكم" : "Admin Console"}
              </p>
            </div>
            <button
              onClick={() => setIsMobileOpen(false)}
              aria-label={language === "ar" ? "إغلاق" : "Close"}
              className="lg:hidden shrink-0 -m-2 p-2 text-white/60 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto space-y-1 p-4">
            {navigation.dashboard.map((link) => {
              const Icon = iconMap[link.id] || LayoutDashboard;
              const count = counts[link.id];

              return (
                <NavLink
                  key={link.id}
                  to={link.path}
                  end={link.path === "/dashboard"}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-4 py-3 transition-all ${
                      isActive
                        ? `bg-white/5 text-accent ${isRTL ? "border-l-4" : "border-r-4"} border-accent`
                        : "text-white/85 hover:bg-white/5"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon size={18} className={isActive ? "text-accent" : "text-white/60"} />
                      <span className="flex-1 text-sm font-medium truncate">
                        {language === "ar" ? link.labelAr : link.labelEn}
                      </span>
                      {count > 0 && <CountBadge value={count} active />}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="space-y-3 border-t border-white/10 p-4">
          <div className="flex items-center gap-3 px-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent/20 text-sm font-bold uppercase text-accent">
              {username?.slice(0, 1) || "A"}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-white" dir="ltr">
                {username || "Admin"}
              </p>
              <p className="truncate text-[10px] text-white/50">
                {language === "ar" ? "مدير" : "Administrator"}
              </p>
            </div>
          </div>

          <NavLink
            to="/"
            className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-white/85 transition-colors hover:bg-white/5"
          >
            <Store size={18} className="text-white/60" />
            <span className="text-sm font-medium">
              {language === "ar" ? "عرض المتجر" : "View store"}
            </span>
          </NavLink>

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-start text-red-300 transition-colors hover:bg-red-500/10"
          >
            <LogOut size={18} className="text-red-400/80" />
            <span className="text-sm font-medium">
              {language === "ar" ? "تسجيل الخروج" : "Log out"}
            </span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default DashboardSidebar;
