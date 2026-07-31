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

/**
 * In development, fall back to an in-browser stand-in when no PHP is running.
 *
 * `npm run dev` serves the React app but nothing answers /api/*, so Vite hands
 * back index.html and every call fails. Rather than leave the dashboard
 * unusable locally, route to devBackend instead.
 *
 * Guarded by import.meta.env.DEV and dynamically imported, so none of it exists
 * in a production build.
 */
let devBackendPromise = null;
let useDevBackend = false;

const loadDevBackend = () => {
  if (!devBackendPromise) devBackendPromise = import("./devBackend.js");
  return devBackendPromise;
};

async function request(path, { method = "GET", body, auth = false, signal } = {}) {
  if (import.meta.env.DEV && useDevBackend) {
    const { devBackend } = await loadDevBackend();
    return routeToDevBackend(devBackend, path, method, body);
  }

  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE}/${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (import.meta.env.DEV) return switchToDevBackend(path, method, body);
    throw new ApiError("Could not reach the server", 0);
  }

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    // HTML instead of JSON means no PHP is answering — in dev that is simply
    // "you have no backend running", not a server fault.
    if (import.meta.env.DEV) return switchToDevBackend(path, method, body);
    throw new ApiError(`Server returned an unexpected response (${response.status})`, response.status);
  }

  if (!response.ok) {
    throw new ApiError(data.error || `Request failed (${response.status})`, response.status);
  }
  return data;
}

async function switchToDevBackend(path, method, body) {
  const { devBackend, DEV_USERNAME, DEV_PASSWORD } = await loadDevBackend();

  if (!useDevBackend) {
    useDevBackend = true;
    console.info(
      `%c[dev] No PHP API detected — using the in-browser dev backend.\n` +
        `Dashboard login:  ${DEV_USERNAME} / ${DEV_PASSWORD}`,
      "color:#2eb9a7;font-weight:bold"
    );
  }

  return routeToDevBackend(devBackend, path, method, body);
}

/** Map a REST path onto the dev backend's methods. */
function routeToDevBackend(devBackend, path, method, body) {
  const [resource, id, action] = path.split("?")[0].split("/");
  const query = new URLSearchParams(path.split("?")[1] || "");

  const collections = {
    products: "products",
    categories: "categories",
    brands: "brands",
    offers: "offers",
    banners: "banners",
  };

  try {
    if (resource === "admin") {
      if (id === "login") return devBackend.login(body?.username, body?.password);
      if (id === "me") return devBackend.me();
      if (id === "password") return devBackend.changePassword();
      if (id === "username") return devBackend.changeUsername();
    }

    if (collections[resource]) {
      const name = collections[resource];
      if (method === "GET") return devBackend.list(name);
      if (method === "POST") return devBackend.create(name, body);
      if (method === "PUT") return devBackend.update(name, id, body);
      if (method === "DELETE") return devBackend.remove(name, id);
    }

    if (resource === "settings") {
      return method === "PUT" ? devBackend.saveSettings(body) : devBackend.getSettings();
    }

    if (resource === "orders") {
      if (method === "POST") return devBackend.placeOrder(body);
      if (method === "PUT" && action === "status") return devBackend.setOrderStatus(id, body?.status);
      if (method === "DELETE") return devBackend.deleteOrder(id);
      return devBackend.getOrders(query.get("date"));
    }

    if (resource === "payment-methods") return devBackend.paymentMethods();

    if (resource === "stock-notifications") {
      if (method === "POST") return devBackend.addStockAlert(body?.productId, body?.contact);
      if (method === "PUT") return devBackend.resolveStockAlert(id);
      return devBackend.getStockAlerts(query.get("productId"));
    }

    throw new ApiError(`dev backend has no route for ${method} ${path}`, 404);
  } catch (error) {
    throw new ApiError(error.message, error.status ?? 400);
  }
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
