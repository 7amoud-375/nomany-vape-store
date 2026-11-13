/**
 * Coerce a value that may be a string to a number.
 *
 * The dashboard's number inputs hand back strings ("450"), which silently turn
 * comparisons into lexicographic ones — "90" >= "450" is true. Everything that
 * does arithmetic or comparison on money or ratings goes through here.
 */
export const toNumber = (value, fallback = 0) => {
  const n = typeof value === "number" ? value : parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
};

/** The effective selling price: discount when it is real and lower. */
export const effectivePrice = (product) => {
  if (!product) return 0;
  const price = toNumber(product.price);
  const discount = toNumber(product.discountPrice);
  return discount > 0 && discount < price ? discount : price;
};

export const formatPrice = (price, locale = "ar") => {
  const currency = locale === "ar" ? "ج.م" : "EGP";
  const amount = toNumber(price);
  return `${amount.toLocaleString(locale === "ar" ? "ar-EG" : "en-US")} ${currency}`;
};

export const formatDate = (dateString, locale = "ar") => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

/**
 * Today's date as YYYY-MM-DD in the *local* timezone.
 *
 * toISOString() is UTC, so in Egypt (UTC+2/+3) it rolls over hours early and
 * put revenue on the wrong day.
 */
export const todayLocalISO = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const calculateDiscount = (price, discountPrice) => {
  const base = toNumber(price);
  const discounted = toNumber(discountPrice);
  if (!discounted || base <= 0 || discounted >= base) return 0;
  return Math.round(((base - discounted) / base) * 100);
};

/** Collision-resistant id. Date.now() repeats when two records are made fast. */
export const generateId = () => {
  const random = Math.random().toString(36).substring(2, 9);
  return `${Date.now().toString(36)}${random}`;
};

/**
 * URL-safe slug that keeps Arabic letters.
 *
 * The old pattern stripped every non-ASCII word character, so any Arabic name
 * slugged to an empty string and every Arabic product collided on "".
 */
export const slugify = (text) => {
  return String(text ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
};

export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
};

export const getLocalStorage = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
};

export const setLocalStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error("Error saving to localStorage:", error);
  }
};

export const removeLocalStorage = (key) => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error("Error removing from localStorage:", error);
  }
};

export const filterProducts = (products, filters) => {
  let result = [...products];

  // Ids are compared as strings on both sides. A category id arrives as a
  // number from the API but as a string from anything that has been through a
  // form control or a URL, and a strict compare silently matches nothing.
  if (filters.category && filters.category !== "all") {
    result = result.filter((p) => String(p.category) === String(filters.category));
  }

  if (filters.brand && filters.brand !== "all") {
    result = result.filter((p) => String(p.brand) === String(filters.brand));
  }

  if (filters.availability !== undefined) {
    result = result.filter((p) => p.availability === filters.availability);
  }

  if (filters.minPrice !== undefined) {
    result = result.filter((p) => effectivePrice(p) >= toNumber(filters.minPrice));
  }

  if (filters.maxPrice !== undefined) {
    result = result.filter((p) => effectivePrice(p) <= toNumber(filters.maxPrice));
  }

  if (filters.offer) {
    result = result.filter((p) => p.offer || p.discountPrice);
  }

  return result;
};

/** Newest-first ordering, falling back to id when a record predates createdAt. */
const createdOrder = (product) => {
  if (product.createdAt) {
    const time = new Date(product.createdAt).getTime();
    if (Number.isFinite(time)) return time;
  }
  return toNumber(product.id, 0);
};

export const sortProducts = (products, sortBy) => {
  const sorted = [...products];

  switch (sortBy) {
    case "newest":
      return sorted.sort((a, b) => createdOrder(b) - createdOrder(a));
    case "oldest":
      return sorted.sort((a, b) => createdOrder(a) - createdOrder(b));
    case "price-low":
      return sorted.sort((a, b) => effectivePrice(a) - effectivePrice(b));
    case "price-high":
      return sorted.sort((a, b) => effectivePrice(b) - effectivePrice(a));
    case "best-selling":
      return sorted.sort((a, b) => toNumber(b.reviewsCount) - toNumber(a.reviewsCount));
    case "alphabetical":
      return sorted.sort((a, b) => String(a.nameEn ?? "").localeCompare(String(b.nameEn ?? "")));
    default:
      return sorted;
  }
};

/**
 * Search across names, descriptions, brand, category and tags.
 *
 * Every field is coerced before use: a product saved without a description or
 * tags used to throw on `.toLowerCase()` and take the whole page down.
 */
export const searchProducts = (products, query, locale = "ar", lookups = {}) => {
  if (!query || !query.trim()) return products;

  const needle = query.toLowerCase().trim();
  const has = (value) => String(value ?? "").toLowerCase().includes(needle);

  /*
   * `product.category` and `product.brand` are numeric ids, so matching them
   * directly only ever matched someone typing a number. Passing the collections
   * in lets a search for "Vapes" or "SMOK" find the products that belong to
   * them, which is what anyone typing a category name expects.
   */
  const nameById = (collection, id, ...fields) => {
    if (!Array.isArray(collection) || id === null || id === undefined) return "";
    const match = collection.find((row) => String(row.id) === String(id));
    if (!match) return "";
    return fields.map((field) => match[field]).filter(Boolean).join(" ");
  };

  return products.filter((p) => {
    if (!p) return false;
    return (
      has(locale === "ar" ? p.nameAr : p.nameEn) ||
      has(locale === "ar" ? p.descriptionAr : p.descriptionEn) ||
      has(p.sku) ||
      has(nameById(lookups.categories, p.category, "nameAr", "nameEn")) ||
      has(nameById(lookups.brands, p.brand, "name")) ||
      (Array.isArray(p.tags) && p.tags.some((tag) => has(tag)))
    );
  });
};

/** First usable image, or null so callers can render their own placeholder. */
export const productImage = (product) => {
  const images = product?.images;
  if (!Array.isArray(images)) return null;
  return images.find((src) => typeof src === "string" && src.trim() !== "") ?? null;
};

/**
 * The display name for one flavour entry, in the visitor's language.
 *
 * Falls back to whichever name exists when the other is blank — an admin who
 * only filled in one language should still see the flavour rather than a
 * blank chip. A legacy entry saved as a plain string (from before flavours
 * carried two names) is handled the same way at either language.
 */
export const flavorLabel = (flavor, language = "ar") => {
  if (typeof flavor === "string") return flavor;
  const nameAr = flavor?.nameAr ?? "";
  const nameEn = flavor?.nameEn ?? "";
  return (language === "ar" ? nameAr || nameEn : nameEn || nameAr) || "";
};

/** Whether a product makes the customer pick a flavour before buying. */
export const hasFlavors = (product) =>
  Array.isArray(product?.flavors) && product.flavors.some((f) => flavorLabel(f) !== "");

/** A flavour entry as {nameAr, nameEn}, whichever shape it was stored in. */
export const normaliseFlavor = (flavor) =>
  typeof flavor === "string"
    ? { nameAr: flavor, nameEn: "" }
    : { nameAr: flavor?.nameAr ?? "", nameEn: flavor?.nameEn ?? "" };

/**
 * The identity of one cart line. The same liquid in two flavours is two lines,
 * so each keeps its own quantity and can be removed on its own.
 */
export const cartLineKey = (productId, flavor) => {
  if (!flavor) return String(productId);
  const { nameAr, nameEn } = normaliseFlavor(flavor);
  return `${productId}::${nameAr}|${nameEn}`;
};
