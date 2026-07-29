export const formatPrice = (price, locale = "ar") => {
  const currency = locale === "ar" ? "ج.م" : "EGP";
  return `${price.toLocaleString(locale === "ar" ? "ar-EG" : "en-US")} ${currency}`;
};

export const formatDate = (dateString, locale = "ar") => {
  const options = { year: "numeric", month: "long", day: "numeric" };
  return new Date(dateString).toLocaleDateString(
    locale === "ar" ? "ar-EG" : "en-US",
    options
  );
};

export const calculateDiscount = (price, discountPrice) => {
  if (!discountPrice || discountPrice >= price) return 0;
  return Math.round(((price - discountPrice) / price) * 100);
};

export const generateId = () => {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
};

export const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
};

export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
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

  if (filters.category && filters.category !== "all") {
    result = result.filter((p) => p.category === filters.category);
  }

  if (filters.brand && filters.brand !== "all") {
    result = result.filter((p) => p.brand === filters.brand);
  }

  if (filters.availability !== undefined) {
    result = result.filter((p) => p.availability === filters.availability);
  }

  if (filters.minPrice !== undefined) {
    result = result.filter((p) => (p.discountPrice || p.price) >= filters.minPrice);
  }

  if (filters.maxPrice !== undefined) {
    result = result.filter((p) => (p.discountPrice || p.price) <= filters.maxPrice);
  }

  if (filters.offer) {
    result = result.filter((p) => p.offer || p.discountPrice);
  }

  if (filters.rating) {
    result = result.filter((p) => p.rating >= filters.rating);
  }

  return result;
};

export const sortProducts = (products, sortBy) => {
  const sorted = [...products];

  switch (sortBy) {
    case "newest":
      return sorted.sort((a, b) => b.id - a.id);
    case "oldest":
      return sorted.sort((a, b) => a.id - b.id);
    case "price-low":
      return sorted.sort((a, b) => (a.discountPrice || a.price) - (b.discountPrice || b.price));
    case "price-high":
      return sorted.sort((a, b) => (b.discountPrice || b.price) - (a.discountPrice || a.price));
    case "best-selling":
      return sorted.sort((a, b) => b.reviewsCount - a.reviewsCount);
    case "highest-rated":
      return sorted.sort((a, b) => b.rating - a.rating);
    case "alphabetical":
      return sorted.sort((a, b) => a.nameEn.localeCompare(b.nameEn));
    default:
      return sorted;
  }
};

export const searchProducts = (products, query, locale = "ar") => {
  if (!query.trim()) return products;

  const lowerQuery = query.toLowerCase().trim();

  return products.filter((p) => {
    const name = locale === "ar" ? p.nameAr : p.nameEn;
    const desc = locale === "ar" ? p.descriptionAr : p.descriptionEn;
    return (
      name.toLowerCase().includes(lowerQuery) ||
      desc.toLowerCase().includes(lowerQuery) ||
      p.brand.toLowerCase().includes(lowerQuery) ||
      p.category.toLowerCase().includes(lowerQuery) ||
      p.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
    );
  });
};