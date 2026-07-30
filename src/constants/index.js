export const APP_NAME = "Nomany Store";
export const SITE_DOMAIN = "nomany-vape-store.com";
export const SITE_URL = `https://${SITE_DOMAIN}`;

/**
 * The dashboard login lives on an unlisted path — it is not in any menu and
 * not linked from anywhere on the site.
 *
 * Treat this as one less thing to stumble across, not as a security control:
 * the password is what actually protects the dashboard, and firestore.rules
 * protects the data even if someone finds this URL.
 *
 * Change the value here if you ever want a different address.
 */
export const ADMIN_LOGIN_PATH = "/nomany-control-8821";

/**
 * Firebase Auth identifies accounts by email, but the admin signs in with a
 * username. Usernames are mapped onto this internal domain, which is never
 * used to send mail.
 */
export const ADMIN_EMAIL_DOMAIN = "nomany-admin.local";

export const LOCAL_STORAGE_KEYS = {
  CART: "vapestore_cart",
  WISHLIST: "vapestore_wishlist",
  THEME: "vapestore_theme",
  LANGUAGE: "vapestore_language",
  RECENTLY_VIEWED: "vapestore_recently_viewed",
  ORDERS: "vapestore_orders",
  SETTINGS: "vapestore_settings",
  PRODUCTS: "vapestore_admin_products",
  CATEGORIES: "vapestore_admin_categories",
  BRANDS: "vapestore_admin_brands",
  BANNERS: "vapestore_admin_banners",
  OFFERS: "vapestore_admin_offers",
  TESTIMONIALS: "vapestore_admin_testimonials",
  HOMEPAGE: "vapestore_admin_homepage",
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

export const ORDER_STATUS = {
  AWAITING_PAYMENT: "awaiting_payment",
  PAID: "paid",
  PENDING: "pending",
  CONFIRMED: "confirmed",
  PREPARING: "preparing",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
};

export const ORDER_STATUS_COLORS = {
  awaiting_payment: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  preparing: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  shipped: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  delivered: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export const PAYMENT_METHODS = [
  { id: "cod", labelAr: "الدفع عند الاستلام", labelEn: "Cash on Delivery", icon: "truck" },
  { id: "card", labelAr: "بطاقة ائتمان", labelEn: "Credit Card", icon: "card" },
  { id: "vodafone", labelAr: "فودافون كاش", labelEn: "Vodafone Cash", icon: "wallet" },
];

export const ORDER_STATUS_LABELS = {
  awaiting_payment: { ar: "بانتظار الدفع", en: "Awaiting payment" },
  pending: { ar: "قيد الانتظار", en: "Pending" },
  paid: { ar: "مدفوع", en: "Paid" },
  confirmed: { ar: "مؤكد", en: "Confirmed" },
  preparing: { ar: "قيد التجهيز", en: "Preparing" },
  shipped: { ar: "تم الشحن", en: "Shipped" },
  delivered: { ar: "تم التوصيل", en: "Delivered" },
  cancelled: { ar: "ملغي", en: "Cancelled" },
};

// Paymob iframe and integration ids now live in api/.env and are chosen
// server-side. Nothing about payment routing belongs in the client bundle.

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
};