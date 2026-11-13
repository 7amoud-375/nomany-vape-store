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

import { settings as seedSettings } from "../data/settings";
import { todayLocalISO, hasFlavors, normaliseFlavor } from "../utils";

// Kept in step with ADMIN_USERNAME / ADMIN_PASSWORD in api/.env, so the same
// credentials work locally and on the server. Dev-only — this file is behind
// import.meta.env.DEV and never reaches a production build.
export const DEV_USERNAME = "admin";
export const DEV_PASSWORD = "nomany123";

const KEY = "nomany_dev_backend";

const load = () => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // Corrupt state — start over rather than wedging the dashboard.
  }
  // Starts empty, mirroring a fresh database. The demo catalogue that used to
  // seed this made the dashboard look populated on a shop that had nothing in
  // it, and every one of those rows had to be deleted by hand.
  return {
    products: [],
    categories: [],
    brands: [],
    offers: [],
    banners: [],
    settings: seedSettings,
    orders: [],
    stockNotifications: [],
    nextId: 1,
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

/** Mirrors the API's match_delivery_city(): either language, case-insensitive. */
const matchDeliveryCity = (typed) => {
  const needle = String(typed || "").trim().toLowerCase();
  if (!needle) return null;
  const cities = Array.isArray(state.settings.deliveryCities) ? state.settings.deliveryCities : [];
  return (
    cities.find(
      (c) =>
        String(c?.nameAr || "").toLowerCase() === needle ||
        String(c?.nameEn || "").toLowerCase() === needle
    ) ?? null
  );
};

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

  getOrdersInRange(from, to) {
    return clone(state.orders.filter((o) => o.date >= from && o.date <= to));
  },

  updateOrderDetails(dbId, data) {
    const order = state.orders.find((o) => String(o.dbId) === String(dbId));
    if (!order) throw new DevError("Order not found", 404);

    const phone = String(data?.phone || "").replace(/\s/g, "");
    if (!String(data?.customerName || "").trim() || !/^01[0125][0-9]{8}$/.test(phone)) {
      throw new DevError("A name and a valid Egyptian mobile number are required", 400);
    }

    Object.assign(order, {
      customerName: data.customerName.trim(),
      phone,
      address: data.address ?? "",
      city: data.city ?? "",
      notes: data.notes ?? "",
    });
    persist();
    return clone(order);
  },

  placeOrder(payload) {
    // Same rule the real API enforces: the fee comes from the matched
    // delivery area, never from anything the caller sends, and an order with
    // no recognised area is refused rather than silently priced at zero.
    const cityMatch = matchDeliveryCity(payload.city);
    if (!cityMatch) {
      const typed = String(payload.city || "").trim();
      throw new DevError(
        typed === "" ? "Please choose your delivery area" : `We do not deliver to "${typed}" yet`,
        400
      );
    }

    let subtotal = 0;
    const lines = [];

    for (const line of payload.items || []) {
      const product = state.products.find((p) => String(p.id) === String(line.productId));
      if (!product) throw new DevError("A product in your cart is no longer available", 409);

      // Mirrors api/index.php: a product with flavours needs one it lists.
      let flavor = null;
      if (hasFlavors(product)) {
        const wanted = normaliseFlavor(line.flavor);
        flavor =
          product.flavors
            .map(normaliseFlavor)
            .find((f) => f.nameAr === wanted.nameAr && f.nameEn === wanted.nameEn) ?? null;
        if (!flavor) {
          throw new DevError(`Please choose an available flavour for "${product.nameEn}"`, 409);
        }
      }

      const price = Number(product.price) || 0;
      const discount = Number(product.discountPrice) || 0;
      const unit = discount > 0 && discount < price ? discount : price;

      subtotal += unit * line.quantity;
      lines.push({
        productId: product.id,
        nameEn: product.nameEn,
        nameAr: product.nameAr,
        flavor,
        price: unit,
        quantity: line.quantity,
        image: (product.images || [])[0] ?? null,
      });
    }

    const shipping = cityMatch.fee;
    const date = todayLocalISO();
    const sequence = state.orders.filter((o) => o.date === date).length + 1;

    const order = {
      id: `NOM-${date.replace(/-/g, "").slice(2)}-${String(sequence).padStart(3, "0")}`,
      dbId: newId(),
      customerName: payload.customerName,
      phone: payload.phone,
      email: payload.email,
      address: payload.address,
      // Canonical name, the same as the real API stores — consistent
      // regardless of which language the order was placed in.
      city: cityMatch.nameAr || cityMatch.nameEn,
      notes: payload.notes,
      products: lines,
      subtotal,
      shippingCost: shipping,
      total: subtotal + shipping,
      paymentMethod: payload.paymentMethod || "cod",
      paymentStatus: "unpaid",
      date,
      time: new Date().toLocaleTimeString(),
    };

    state.orders = [order, ...state.orders];
    persist();

    const paymentStatus = order.paymentMethod === "cod" ? "pending_cash" : "pending_manual";
    return { success: true, order: clone(order), payment: { status: paymentStatus } };
  },

  setOrderPaymentStatus(dbId, paid) {
    const order = state.orders.find((o) => String(o.dbId) === String(dbId));
    if (order) {
      order.paymentStatus = paid ? "paid" : "unpaid";
      persist();
    }
    return { success: true, paymentStatus: paid ? "paid" : "unpaid" };
  },

  deleteOrder(dbId) {
    state.orders = state.orders.filter((o) => String(o.dbId) !== String(dbId));
    persist();
    return { success: true };
  },

  paymentMethods() {
    return { methods: ["cod", "instapay", "vodafone_cash"] };
  },

  // -- Stock notifications --------------------------------------------------
  addStockAlert(productId, contact) {
    const phone = String(contact || "").replace(/\D/g, "");
    if (!/^01[0125][0-9]{8}$/.test(phone)) {
      throw new DevError("A valid Egyptian mobile number is required", 400);
    }

    const duplicate = state.stockNotifications.some(
      (n) => !n.notified && String(n.productId) === String(productId) && n.contact === phone
    );
    if (!duplicate) {
      state.stockNotifications.push({
        id: newId(),
        productId,
        contact: phone,
        notified: 0,
        createdAt: new Date().toISOString(),
      });
      persist();
    }
    return { success: true };
  },

  /** Shaped like the real API: joined to the product, phone only. */
  getStockAlerts(productId, includeDone = false) {
    return clone(
      state.stockNotifications
        .filter((n) => (includeDone ? true : !n.notified))
        .filter((n) => (productId == null ? true : String(n.productId) === String(productId)))
        .map((n) => {
          const product = state.products.find((p) => String(p.id) === String(n.productId));
          return {
            id: n.id,
            productId: n.productId,
            phone: n.contact,
            notified: !!n.notified,
            createdAt: n.createdAt || new Date().toISOString(),
            productNameEn: product?.nameEn ?? null,
            productNameAr: product?.nameAr ?? null,
            productImage: (product?.images || [])[0] ?? null,
            available: product ? !!product.availability : null,
          };
        })
        .sort((a, b) => Number(a.notified) - Number(b.notified))
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

  deleteStockAlert(id) {
    state.stockNotifications = state.stockNotifications.filter(
      (n) => String(n.id) !== String(id)
    );
    persist();
    return { success: true };
  },

  // -- Live updates ----------------------------------------------------------
  /** Same cursor contract as GET /api/updates. */
  updates(sinceOrder = 0, sinceNotification = 0) {
    const orderKey = (o) => Number(o.dbId) || 0;
    const maxOrder = state.orders.reduce((m, o) => Math.max(m, orderKey(o)), 0);
    const maxNote = state.stockNotifications.reduce((m, n) => Math.max(m, Number(n.id) || 0), 0);

    return {
      cursor: { order: maxOrder, notification: maxNote },
      orders: clone(state.orders.filter((o) => orderKey(o) > sinceOrder)),
      notifications: this.getStockAlerts(null, true).filter((n) => n.id > sinceNotification),
    };
  },

  // -- Analytics -------------------------------------------------------------
  /** Same response shape as GET /api/analytics, computed over local orders. */
  analytics(period = "30d") {
    const spans = { today: 0, "7d": 6, "30d": 29, "90d": 89 };
    const end = todayLocalISO();

    const shift = (days) => {
      const d = new Date(`${end}T00:00:00`);
      d.setDate(d.getDate() - days);
      return d.toISOString().slice(0, 10);
    };

    const start = period === "all" ? "1970-01-01" : shift(spans[period] ?? 29);
    const inWindow = state.orders.filter((o) => o.date >= start && o.date <= end);
    // Used to exclude cancelled orders; there is no fulfilment status any
    // more (see constants/index.js), so every order in the window counts.
    const earning = inWindow;

    const revenue = earning.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

    const byDate = {};
    earning.forEach((o) => {
      byDate[o.date] = byDate[o.date] || { orders: 0, revenue: 0 };
      byDate[o.date].orders += 1;
      byDate[o.date].revenue += Number(o.total) || 0;
    });

    const series = [];
    if (period === "all") {
      Object.keys(byDate).sort().forEach((date) => series.push({ date, ...byDate[date] }));
    } else {
      for (let day = spans[period] ?? 29; day >= 0; day--) {
        const date = shift(day);
        series.push({ date, ...(byDate[date] || { orders: 0, revenue: 0 }) });
      }
    }

    const tally = (rows) => {
      const map = {};
      rows.forEach(({ key, quantity, revenue: amount, meta }) => {
        if (!map[key]) map[key] = { ...meta, quantity: 0, revenue: 0 };
        map[key].quantity += quantity;
        map[key].revenue += amount;
      });
      return Object.values(map).sort((a, b) => b.quantity - a.quantity);
    };

    const lines = [];
    earning.forEach((order) => {
      (order.products || []).forEach((line) => {
        const product = state.products.find((p) => String(p.id) === String(line.productId));
        const category = state.categories.find((c) => String(c.id) === String(product?.category));
        lines.push({
          productId: line.productId,
          quantity: Number(line.quantity) || 0,
          revenue: (Number(line.price) || 0) * (Number(line.quantity) || 0),
          product,
          category,
        });
      });
    });

    const counts = (rows) => rows.reduce((map, row) => {
      map[row] = (map[row] || 0) + 1;
      return map;
    }, {});

    return {
      period: { id: period, startDate: period === "all" ? null : start, endDate: end, timezone: "local" },
      revenue: {
        total: revenue,
        subtotal: earning.reduce((sum, o) => sum + (Number(o.subtotal) || 0), 0),
        shipping: earning.reduce((sum, o) => sum + (Number(o.shippingCost) || 0), 0),
        orderCount: earning.length,
        averageOrderValue: earning.length ? Math.round((revenue / earning.length) * 100) / 100 : 0,
      },
      paymentStatusBreakdown: Object.entries(counts(inWindow.map((o) => o.paymentStatus || "unpaid")))
        .map(([status, count]) => ({ status, count })),
      paymentSplit: Object.entries(counts(earning.map((o) => o.paymentMethod || "cod")))
        .map(([method, count]) => ({
          method,
          count,
          revenue: earning
            .filter((o) => (o.paymentMethod || "cod") === method)
            .reduce((sum, o) => sum + (Number(o.total) || 0), 0),
        })),
      series,
      topProducts: tally(
        lines.map((l) => ({
          key: l.productId,
          quantity: l.quantity,
          revenue: l.revenue,
          meta: {
            id: l.productId,
            nameEn: l.product?.nameEn ?? "Deleted product",
            nameAr: l.product?.nameAr ?? "منتج محذوف",
          },
        }))
      ).slice(0, 8),
      topCategories: tally(
        lines.map((l) => ({
          key: l.category?.id ?? 0,
          quantity: l.quantity,
          revenue: l.revenue,
          meta: {
            id: l.category?.id ?? null,
            nameEn: l.category?.nameEn ?? "Uncategorised",
            nameAr: l.category?.nameAr ?? "بدون قسم",
          },
        }))
      ).slice(0, 6),
      catalogue: {
        products: state.products.length,
        categories: state.categories.length,
        brands: state.brands.length,
        outOfStock: state.products.filter((p) => !p.availability).length,
        activeOffers: state.offers.filter((o) => o.active).length,
      },
    };
  },

  /** Wipe local dev data — handy when the seed shape changes. */
  reset() {
    localStorage.removeItem(KEY);
    state = load();
    persist();
  },
};

export { DevError };
