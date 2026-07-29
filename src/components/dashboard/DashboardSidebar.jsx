import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Package,
  Grid3X3,
  Tag,
  Percent,
  ShoppingCart,
  Users,
  BarChart3,
  Image,
  MessageSquareQuote,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import { useTranslations } from "../../hooks/useTranslations";
import navigation from "../../data/navigation";

const iconMap = {
  overview: LayoutDashboard,
  products: Package,
  categories: Grid3X3,
  brands: Tag,
  offers: Percent,
  orders: ShoppingCart,
  customers: Users,
  analytics: BarChart3,
  banners: Image,
  testimonials: MessageSquareQuote,
  settings: Settings,
};

const DashboardSidebar = () => {
  const { language, isRTL } = useLanguage(); // Added isRTL
  const { logout } = useAuth();
  const { t } = useTranslations();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const navLinks = navigation.dashboard;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <>
      {/* Mobile Toggle - Swaps side based on RTL */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className={`lg:hidden fixed top-4 z-[60] p-2 rounded-xl bg-white dark:bg-slate-800 shadow-lg ${
          isRTL ? "right-4" : "left-4"
        }`}
      >
        {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[55] bg-black/50 lg:hidden"
            onClick={() => setIsMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 w-64 bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800 z-[56] transition-transform duration-300 lg:translate-x-0 ${
          isRTL 
            ? `right-0 border-l ${isMobileOpen ? "translate-x-0" : "translate-x-full"}` 
            : `left-0 border-r ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}`
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="p-6 border-b border-gray-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <span className="text-white font-bold text-lg">N</span>
              </div>
              <div>
                <p className="font-bold text-gray-900 dark:text-white">{t("dashboard")}</p>
                <p className="text-xs text-gray-400">Admin Panel</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navLinks.map((link) => {
              const Icon = iconMap[link.id] || LayoutDashboard;
              const isActive = location.pathname === link.path;

              return (
                <NavLink
                  key={link.id}
                  to={link.path}
                  onClick={() => setIsMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-white"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="flex-1">{language === "ar" ? link.labelAr : link.labelEn}</span>
                  {/* Flip arrow direction in RTL */}
                  {isActive && <ChevronRight className={`w-4 h-4 ${isRTL ? "rotate-180" : ""}`} />}
                </NavLink>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-gray-100 dark:border-slate-800">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 w-full transition-colors"
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