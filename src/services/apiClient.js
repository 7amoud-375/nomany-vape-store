/**
 * Thin wrapper over the PHP API.
 *
 * The admin token lives in sessionStorage,
 * not localStorage, so closing the browser ends the session.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";
const TOKEN_KEY = "nomany_admin_token";

export const getToken = () => {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setToken = (token) => {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // Private browsing — the session just won't survive a reload.
  }
};

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, { method = "GET", body, auth = false, signal } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}/${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    // A PHP fatal or an HTML error page — surface something readable rather
    // than "Unexpected token < in JSON".
    throw new ApiError(`Server returned an unexpected response (${response.status})`, response.status);
  }

  if (!response.ok) {
    throw new ApiError(data.error || `Request failed (${response.status})`, response.status);
  }
  return data;
}

const get = (path, auth = false) => request(path, { auth });
const post = (path, body, auth = false) => request(path, { method: "POST", body, auth });
const put = (path, body, auth = true) => request(path, { method: "PUT", body, auth });
const del = (path) => request(path, { method: "DELETE", auth: true });

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export const apiLogin = (username, password) => post("admin/login", { username, password });
export const apiMe = () => get("admin/me", true);
export const apiChangePassword = (currentPassword, newPassword) =>
  put("admin/password", { currentPassword, newPassword });
export const apiChangeUsername = (currentPassword, username) =>
  put("admin/username", { currentPassword, username });

// ---------------------------------------------------------------------------
// Catalogue
// ---------------------------------------------------------------------------
export const fetchProducts = () => get("products");
export const createProduct = (data) => post("products", data, true);
export const updateProductApi = (id, data) => put(`products/${id}`, data);
export const deleteProductApi = (id) => del(`products/${id}`);

export const fetchCategories = () => get("categories");
export const createCategory = (data) => post("categories", data, true);
export const updateCategoryApi = (id, data) => put(`categories/${id}`, data);
export const deleteCategoryApi = (id) => del(`categories/${id}`);

export const fetchBrands = () => get("brands");
export const createBrand = (data) => post("brands", data, true);
export const updateBrandApi = (id, data) => put(`brands/${id}`, data);
export const deleteBrandApi = (id) => del(`brands/${id}`);

export const fetchOffers = () => get("offers");
export const createOffer = (data) => post("offers", data, true);
export const updateOfferApi = (id, data) => put(`offers/${id}`, data);
export const deleteOfferApi = (id) => del(`offers/${id}`);

export const fetchBanners = () => get("banners");

export const fetchSettings = () => get("settings");
export const saveSettings = (data) => put("settings", data);

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------
export const fetchOrders = (date) => get(`orders${date ? `?date=${encodeURIComponent(date)}` : ""}`, true);
export const placeOrder = (data) => post("orders", data);
export const setOrderStatus = (dbId, status) => put(`orders/${dbId}/status`, { status });
export const deleteOrderApi = (dbId) => del(`orders/${dbId}`);

export const fetchPaymentMethods = () => get("payment-methods");

// ---------------------------------------------------------------------------
// Stock notifications
// ---------------------------------------------------------------------------
export const requestStockAlert = (productId, contact) =>
  post("stock-notifications", { productId, contact });
export const fetchStockAlerts = (productId) =>
  get(`stock-notifications?productId=${encodeURIComponent(productId)}`, true);
export const resolveStockAlert = (id) => put(`stock-notifications/${id}`, {});

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------
export const fetchAnalytics = () => get("analytics", true);

export { ApiError };
