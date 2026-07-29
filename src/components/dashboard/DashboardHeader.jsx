import { useState, useEffect, useRef } from "react";
import { Bell, Search, User, Check, ShoppingBag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";
import { useTheme } from "../../context/ThemeContext";
import { useData } from "../../context/DataContext";
import { useTranslations } from "../../hooks/useTranslations";
import { subscribeToOrders } from "../../services/firebaseService";
import LanguageSwitcher from "../../components/common/LanguageSwitcher";
import ThemeToggle from "../../components/common/ThemeToggle";

const SEEN_ORDERS_KEY = "nomany_seen_orders";

const DashboardHeader = () => {
  const { language } = useLanguage();
  const { t } = useTranslations();
  const { orders } = useData();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  // Get seen order IDs from localStorage
  const getSeenOrderIds = () => {
    try {
      return new Set(JSON.parse(localStorage.getItem(SEEN_ORDERS_KEY) || "[]"));
    } catch {
      return new Set();
    }
  };

  // Mark orders as seen
  const markAsSeen = (orderIds) => {
    const seen = getSeenOrderIds();
    orderIds.forEach(id => seen.add(id));
    localStorage.setItem(SEEN_ORDERS_KEY, JSON.stringify([...seen]));
    updateNotifications();
  };

  // Mark all as seen
  const markAllAsSeen = () => {
    const allIds = orders.map(o => o.id);
    markAsSeen(allIds);
    setUnreadCount(0);
  };

  // Update notifications list
  const updateNotifications = () => {
    const seen = getSeenOrderIds();
    const recentOrders = (orders || [])
      .filter(o => o != null && o.id)
      .sort((a, b) => {
        const dateA = new Date(`${a.date || ""} ${a.time || ""}`);
        const dateB = new Date(`${b.date || ""} ${b.time || ""}`);
        return dateB - dateA;
      })
      .slice(0, 10);

    const notifs = recentOrders.map(order => ({
      id: order.id,
      title: language === "ar" ? "طلب جديد" : "New Order",
      message: `${order.customerName || "Unknown"} — ${(order.total || 0).toFixed(2)} EGP`,
      time: order.time || "",
      date: order.date || "",
      read: seen.has(order.id),
      status: order.status,
    }));

    setNotifications(notifs);
    setUnreadCount(notifs.filter(n => !n.read).length);
  };

  // Subscribe to real-time orders
  useEffect(() => {
    updateNotifications();
  }, [orders, language]);

  // Also subscribe directly to Firebase for instant updates
  useEffect(() => {
    const unsubscribe = subscribeToOrders((firebaseOrders) => {
      updateNotifications();
    });
    return () => unsubscribe();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNotificationClick = (notif) => {
    markAsSeen([notif.id]);
    setShowDropdown(false);
    navigate("/dashboard/orders");
  };

  const handleBellClick = () => {
    setShowDropdown(!showDropdown);
    if (!showDropdown && unreadCount > 0) {
      // Optional: auto-mark as seen when opening dropdown
      // markAllAsSeen();
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Search */}
        <div className="hidden md:flex items-center flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={t("search")}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 ml-auto">
          {/* Notification Bell */}
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={handleBellClick}
              className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Dropdown */}
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden z-50">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-700">
                  <h3 className="font-semibold text-sm text-gray-900 dark:text-white">
                    {language === "ar" ? "الإشعارات" : "Notifications"}
                  </h3>
                  {unreadCount > 0 && (
                    <button 
                      onClick={markAllAsSeen}
                      className="text-xs text-primary hover:text-primary-light flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" />
                      {language === "ar" ? "تحديد الكل مقروء" : "Mark all read"}
                    </button>
                  )}
                </div>
                
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">{language === "ar" ? "لا توجد إشعارات" : "No notifications"}</p>
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <button
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`w-full px-4 py-3 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors border-b border-gray-50 dark:border-slate-700/50 last:border-0 text-left ${!notif.read ? "bg-primary/5 dark:bg-primary/10" : ""}`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${!notif.read ? "bg-primary/10 text-primary" : "bg-gray-100 dark:bg-slate-700 text-gray-400"}`}>
                          <ShoppingBag className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {notif.title}
                            {!notif.read && <span className="ml-2 w-2 h-2 bg-red-500 rounded-full inline-block" />}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{notif.message}</p>
                          <p className="text-[10px] text-gray-400 mt-1">{notif.date} {notif.time}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
                
                <div className="px-4 py-2 border-t border-gray-100 dark:border-slate-700 text-center">
                  <button 
                    onClick={() => { setShowDropdown(false); navigate("/dashboard/orders"); }}
                    className="text-xs text-primary hover:text-primary-light font-medium"
                  >
                    {language === "ar" ? "عرض كل الطلبات" : "View all orders"}
                  </button>
                </div>
              </div>
            )}
          </div>

          <LanguageSwitcher />
          <ThemeToggle />

          <div className="flex items-center gap-3 pl-3 border-l border-gray-200 dark:border-slate-700">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-gray-900 dark:text-white">Admin</p>
              <p className="text-xs text-gray-400">admin@vapestore.com</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;