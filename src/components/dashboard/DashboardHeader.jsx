import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Bell, User, Check, ShoppingBag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";
import { useData } from "../../context/DataContext";
import { useAuth } from "../../context/AuthContext";
import { formatPrice } from "../../utils";
import { LOCAL_STORAGE_KEYS } from "../../constants";
import LanguageSwitcher from "../../components/common/LanguageSwitcher";
import ThemeToggle from "../../components/common/ThemeToggle";

const readSeen = () => {
  try {
    return new Set(JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.SEEN_ORDERS) || "[]"));
  } catch {
    return new Set();
  }
};

const DashboardHeader = () => {
  const { language, isRTL } = useLanguage();
  const { orders } = useData();
  const { username } = useAuth();
  const navigate = useNavigate();
  const isRtl = language === "ar";

  const [showDropdown, setShowDropdown] = useState(false);
  const [seen, setSeen] = useState(readSeen);
  const dropdownRef = useRef(null);

  /**
   * Notifications are derived from `orders`, which DataContext already keeps
   * live. The old header opened a *second* Firebase subscription to the same
   * collection purely to trigger a re-render — double the reads, and it fired
   * for non-admins too.
   */
  const notifications = useMemo(() => {
    return (orders || [])
      .filter((o) => o && o.id)
      .slice(0, 10)
      .map((order) => ({
        id: order.id,
        message: `${order.customerName || "—"} · ${formatPrice(order.total, language)}`,
        time: order.time || "",
        date: order.date || "",
        read: seen.has(order.id),
      }));
  }, [orders, seen, language]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markSeen = useCallback((ids) => {
    setSeen((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      localStorage.setItem(LOCAL_STORAGE_KEYS.SEEN_ORDERS, JSON.stringify([...next]));
      return next;
    });
  }, []);

  useEffect(() => {
    if (!showDropdown) return undefined;
    const onClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    const onEscape = (e) => e.key === "Escape" && setShowDropdown(false);

    document.addEventListener("mousedown", onClickOutside);
    window.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      window.removeEventListener("keydown", onEscape);
    };
  }, [showDropdown]);

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-4 sm:px-6 py-3">
      {/* Leaves room for the mobile menu button, which is fixed at this corner. */}
      <div className={`flex items-center justify-end gap-2 sm:gap-3 ${isRtl ? "pr-14 lg:pr-0" : "pl-14 lg:pl-0"}`}>
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown((v) => !v)}
            aria-label={isRtl ? "الإشعارات" : "Notifications"}
            className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            {unreadCount > 0 && (
              <span className={`absolute top-1 ${isRtl ? "left-1" : "right-1"} min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1`}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {showDropdown && (
            <div className={`absolute ${isRtl ? "left-0" : "right-0"} mt-2 w-[min(20rem,calc(100vw-2rem))] bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden`}>
              <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-100 dark:border-slate-700">
                <h3 className="font-semibold text-sm text-gray-900 dark:text-white">
                  {isRtl ? "الإشعارات" : "Notifications"}
                </h3>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markSeen(notifications.map((n) => n.id))}
                    className="text-xs text-primary hover:underline flex items-center gap-1 shrink-0"
                  >
                    <Check className="w-3 h-3" />
                    {isRtl ? "تحديد الكل كمقروء" : "Mark all read"}
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">{isRtl ? "لا توجد إشعارات" : "No notifications"}</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <button
                      key={notif.id}
                      onClick={() => {
                        markSeen([notif.id]);
                        setShowDropdown(false);
                        navigate("/dashboard/orders");
                      }}
                      className={`w-full px-4 py-3 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors border-b border-gray-50 dark:border-slate-700/50 last:border-0 text-start ${
                        !notif.read ? "bg-primary/5 dark:bg-primary/10" : ""
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        !notif.read ? "bg-primary/10 text-primary" : "bg-gray-100 dark:bg-slate-700 text-gray-400"
                      }`}>
                        <ShoppingBag className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                          {isRtl ? "طلب جديد" : "New order"}
                          {!notif.read && <span className="w-2 h-2 bg-red-500 rounded-full shrink-0" />}
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
                  className="text-xs text-primary hover:underline font-medium"
                >
                  {isRtl ? "عرض كل الطلبات" : "View all orders"}
                </button>
              </div>
            </div>
          )}
        </div>

        <LanguageSwitcher />
        <ThemeToggle />

        <div className={`flex items-center gap-2 ${isRtl ? "pr-2 border-r" : "pl-2 border-l"} border-gray-200 dark:border-slate-700`}>
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <User className="w-5 h-5 text-primary" />
          </div>
          {/* Was hardcoded to "admin@vapestore.com", which is not an address
              that exists anywhere in this project. */}
          <p className="hidden sm:block text-sm font-medium text-gray-900 dark:text-white truncate max-w-[10rem]" dir="ltr">
            {username || "Admin"}
          </p>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
