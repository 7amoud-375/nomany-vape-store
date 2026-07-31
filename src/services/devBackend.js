/**
 * In-browser stand-in for the PHP API, for local development only.
 *
 * There is no PHP on a plain `npm run dev` machine, so every /api/* request
 * gets Vite's index.html back and the dashboard is unusable. This keeps the
 * whole admin working locally, backed by localStorage.
 *
 * It is imported dynamically and only ever reached behind `import.meta.env.DEV`,
 * so it is not part of a production build. Never rely on it for anything real:
 * the credentials below are fixed and the "token" is not a token.
 */

import { categories as seedCategories } from "../data/categories";
import { brands as seedBrands } from "../data/brands";
import { banners as seedBanners } from "../data/banners";
import { products as seedProducts } from "../data/products";
import { settings as seedSettings } from "../data/settings";
import { todayLocalISO } from "../utils";

export const DEV_USERNAME = "admin";
export const DEV_PASSWORD = "admin1234";

const KEY = "nomany_dev_backend";

const load = () => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // Corrupt state — start over rather than wedging the dashboard.
  }
  return {
    products: seedProducts.map((p, i) => ({ ...p, id: i + 1 })),
    categories: seedCategories.map((c, i) => ({ ...c, id: i + 1 })),
    brands: seedBrands.map((b, i) => ({ ...b, id: i + 1 })),
    offers: [],
    banners: seedBanners,
    settings: seedSettings,
    orders: [],
    stockNotifications: [],
    nextId: 1000,
  };
};

let state = load();
const persist = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Quota or private mode — changes just won't survive a reload.
  }
};

const newId = () => state.nextId++;
const clone = (value) => JSON.parse(JSON.stringify(value));

/** Matches the real API's error shape so the UI paths are identical. */
class DevError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

export const devBackend = {
  // -- Auth ----------------------------------------------------------------
  login(username, password) {
    if (username?.toLowerCase() !== DEV_USERNAME || password !== DEV_PASSWORD) {
      throw new DevError("Wrong username or password", 401);
    }
    return {
      success: true,
      token: "dev-token",
      user: { id: 1, username: DEV_USERNAME },
    };
  },

  me() {
    return { success: true, user: { id: 1, username: DEV_USERNAME } };
  },

  changePassword() {
    throw new DevError("Password changes need the real API — this is local dev mode", 501);
  },

  changeUsername() {
    throw new DevError("Username changes need the real API — this is local dev mode", 501);
  },

  // -- Catalogue -----------------------------------------------------------
  list(collection) {
    return clone(state[collection]);
  },

  create(collection, data) {
    const record = { ...data, id: newId(), createdAt: new Date().toISOString() };
    state[collection] = [record, ...state[collection]];
    persist();
    return clone(record);
  },

  update(collection, id, data) {
    const index = state[collection].findIndex((r) => String(r.id) === String(id));
    if (index === -1) throw new DevError("Not found", 404);
    state[collection][index] = { ...state[collection][index], ...data, id: state[collection][index].id };
    persist();
    return clone(state[collection][index]);
  },

  remove(collection, id) {
    // Mirror the real API's referential guards so behaviour matches.
    if (collection === "categories") {
      const inUse = state.products.filter((p) => String(p.category) === String(id)).length;
      if (inUse) throw new DevError(`Cannot delete: ${inUse} products use this category`, 409);
    }
    if (collection === "brands") {
      const inUse = state.products.filter((p) => String(p.brand) === String(id)).length;
      if (inUse) throw new DevError(`Cannot delete: ${inUse} products use this brand`, 409);
    }
    state[collection] = state[collection].filter((r) => String(r.id) !== String(id));
    persist();
    return { success: true };
  },

  // -- Settings ------------------------------------------------------------
  getSettings() {
    return clone(state.settings);
  },

  saveSettings(data) {
    state.settings = { ...state.settings, ...data };
    persist();
    return clone(state.settings);
  },

  // -- Orders --------------------------------------------------------------
  getOrders(date) {
    const rows = date === "all" || !date
      ? state.orders
      : state.orders.filter((o) => o.date === date);
    return clone(rows);
  },

  placeOrder(payload) {
    let subtotal = 0;
    const lines = [];

    for (const line of payload.items || []) {
      const product = state.products.find((p) => String(p.id) === String(line.productId));
      if (!product) throw new DevError("A product in your cart is no longer available", 409);

      const price = Number(product.price) || 0;
      const discount = Number(product.discountPrice) || 0;
      const unit = discount > 0 && discount < price ? discount : price;

      subtotal += unit * line.quantity;
      lines.push({
        productId: product.id,
        nameEn: product.nameEn,
        nameAr: product.nameAr,
        price: unit,
        quantity: line.quantity,
        image: (product.images || [])[0] ?? null,
      });
    }

    const shipping = Number(state.settings.shippingCost) || 0;
    const date = todayLocalISO();
    const sequence = state.orders.filter((o) => o.date === date).length + 1;

    const order = {
      id: `NOM-${date.replace(/-/g, "").slice(2)}-${String(sequence).padStart(3, "0")}`,
      dbId: newId(),
      customerName: payload.customerName,
      phone: payload.phone,
      email: payload.email,
      address: payload.address,
      city: payload.city,
      notes: payload.notes,
      products: lines,
      subtotal,
      shippingCost: shipping,
      total: subtotal + shipping,
      status: "pending",
      paymentMethod: payload.paymentMethod || "cod",
      paymentStatus: "unpaid",
      date,
      time: new Date().toLocaleTimeString(),
    };

    state.orders = [order, ...state.orders];
    persist();

    return { success: true, order: clone(order), payment: { status: "pending_cash" } };
  },

  setOrderStatus(dbId, status) {
    const order = state.orders.find((o) => String(o.dbId) === String(dbId));
    if (order) {
      order.status = status;
      persist();
    }
    return { success: true };
  },

  deleteOrder(dbId) {
    state.orders = state.orders.filter((o) => String(o.dbId) !== String(dbId));
    persist();
    return { success: true };
  },

  paymentMethods() {
    return { provider: "cod", methods: ["cod"] };
  },

  // -- Stock notifications --------------------------------------------------
  addStockAlert(productId, contact) {
    state.stockNotifications.push({ id: newId(), productId, contact, notified: 0 });
    persist();
    return { success: true };
  },

  getStockAlerts(productId) {
    return clone(
      state.stockNotifications.filter(
        (n) => !n.notified && String(n.productId) === String(productId)
      )
    );
  },

  resolveStockAlert(id) {
    const alert = state.stockNotifications.find((n) => String(n.id) === String(id));
    if (alert) {
      alert.notified = 1;
      persist();
    }
    return { success: true };
  },

  /** Wipe local dev data — handy when the seed shape changes. */
  reset() {
    localStorage.removeItem(KEY);
    state = load();
    persist();
  },
};

export { DevError };
