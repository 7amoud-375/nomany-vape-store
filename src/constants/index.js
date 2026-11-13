export const APP_NAME = "Nomany Store";
export const SITE_DOMAIN = "nomany-vape-store.com";
export const SITE_URL = `https://${SITE_DOMAIN}`;

/**
 * The dashboard login lives on an unlisted path — it is not in any menu and
 * not linked from anywhere on the site.
 *
 * Treat this as one less thing to stumble across, not as a security control:
 * the password is what actually protects the dashboard, and the API rejects
 * unauthenticated requests even if someone finds this URL.
 *
 * Change the value here if you ever want a different address.
 */
export const ADMIN_LOGIN_PATH = "/nomany-control-8821";

/**
 * Browser-side state only. The admin_* keys that used to live here were from
 * the era when the dashboard kept the catalogue in localStorage; the catalogue
 * is in MySQL now and nothing read them any more.
 */
export const LOCAL_STORAGE_KEYS = {
  CART: "vapestore_cart",
  WISHLIST: "vapestore_wishlist",
  THEME: "vapestore_theme",
  LANGUAGE: "vapestore_language",
  AGE_VERIFIED: "vapestore_age_verified",
  SEEN_ORDERS: "vapestore_seen_orders",
};

export const SORT_OPTIONS = [
  { id: "newest", labelAr: "الأحدث", labelEn: "Newest" },
  { id: "oldest", labelAr: "الأقدم", labelEn: "Oldest" },
  { id: "price-low", labelAr: "السعر: من الأقل", labelEn: "Price: Low to High" },
  { id: "price-high", labelAr: "السعر: من الأعلى", labelEn: "Price: High to Low" },
  { id: "best-selling", labelAr: "الأكثر مبيعاً", labelEn: "Best Selling" },
  { id: "alphabetical", labelAr: "أبجدياً", labelEn: "Alphabetically" },
];

export const PAYMENT_METHODS = [
  { id: "cod", labelAr: "الدفع عند الاستلام", labelEn: "Cash on Delivery", icon: "truck" },
  { id: "instapay", labelAr: "انستا باي", labelEn: "InstaPay", icon: "landmark" },
  { id: "vodafone_cash", labelAr: "فودافون كاش", labelEn: "Vodafone Cash", icon: "wallet" },
];

/**
 * The one order state this shop actually tracks: has the money arrived.
 *
 * There used to be a whole fulfilment-status list here too (pending,
 * confirmed, preparing, shipped, delivered, cancelled) but nothing in the
 * dashboard ever set most of those, and Orders dropped the last control that
 * did on purpose — see DashboardOrders.jsx. Removed rather than left unused,
 * so nothing can start reading it again as if it were live.
 */
export const PAYMENT_STATUS_LABELS = {
  unpaid: { ar: "غير مدفوع", en: "Unpaid" },
  paid: { ar: "مدفوع", en: "Paid" },
};

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
};