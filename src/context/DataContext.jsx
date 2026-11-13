import { createContext, useContext, useState, useCallback, useEffect, useMemo } from "react";
import { useAuth } from "./AuthContext";
import { useRealtime, useRealtimeEvent } from "./RealtimeContext";
import { todayLocalISO, toNumber } from "../utils";
import { homepage } from "../data/homepage";
import { settings as seedSettings } from "../data/settings";
import * as api from "../services/apiClient";
import toast from "react-hot-toast";

const DataContext = createContext();

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
};

export const DataProvider = ({ children }) => {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const { readyCount } = useRealtime();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [offers, setOffers] = useState([]);
  const [banners, setBanners] = useState([]);
  const [settings, setSettings] = useState({});
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // -- Catalogue ------------------------------------------------------------
  /**
   * Load from the API, falling back to the bundled sample data if it cannot be
   * reached.
   *
   * Without this the storefront renders completely blank whenever the API is
   * down or absent — no hero, no categories, no products — which is far worse
   * than showing placeholder content. It also means `npm run dev` works on a
   * machine with no PHP.
   *
   * An empty array from a *successful* response is respected as real: if the
   * shop genuinely has no products, that is what to show.
   */
  const reload = useCallback(async () => {
    const load = async (fetcher, fallback, label) => {
      try {
        return { data: await fetcher(), ok: true };
      } catch (error) {
        console.warn(`API unavailable for ${label}:`, error.message);
        return { data: fallback, ok: false };
      }
    };

    /*
     * The catalogue falls back to empty, not to sample data.
     *
     * There used to be a bundled demo catalogue here so the storefront was
     * never blank during an outage. On a live shop that is worse than blank:
     * it shows products that do not exist, at prices that are not real, and
     * they can be added to a cart. An empty catalogue plus the offline flag
     * below is the honest failure.
     *
     * Settings keep their fallback — they are branding and contact details,
     * not inventory, and a footer with no phone number helps nobody.
     */
    const [p, c, b, o, bn, s] = await Promise.all([
      load(api.fetchProducts, [], "products"),
      load(api.fetchCategories, [], "categories"),
      load(api.fetchBrands, [], "brands"),
      load(api.fetchOffers, [], "offers"),
      load(api.fetchBanners, [], "banners"),
      load(api.fetchSettings, seedSettings, "settings"),
    ]);

    setProducts(p.data);
    setCategories(c.data);
    setBrands(b.data);
    setOffers(o.data);
    setBanners(bn.data);
    setSettings(s.data);

    const offline = [p, c, b, o, bn, s].some((r) => !r.ok);
    setLoadError(offline ? "offline" : null);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // -- Orders (admin only) ---------------------------------------------------
  // Refreshed on a realtime event rather than a fixed timer. RealtimeContext
  // owns the polling; this just reacts, so a new order lands in every consumer
  // at once instead of up to twenty seconds later.
  const [orderDate, setOrderDate] = useState(() => todayLocalISO());

  const loadOrders = useCallback(
    async (date) => {
      if (!isAdmin) {
        setOrders([]);
        setOrdersLoading(false);
        return;
      }
      try {
        setOrders(await api.fetchOrders(date));
      } catch (error) {
        console.error("Could not load orders:", error);
      } finally {
        setOrdersLoading(false);
      }
    },
    [isAdmin]
  );

  useEffect(() => {
    if (authLoading) return;
    loadOrders(orderDate);
  }, [isAdmin, authLoading, orderDate, loadOrders]);

  /**
   * A new order arrived. Refetch rather than splicing it in: the list is
   * date-filtered and every derived total reads from it, so appending an order
   * that falls outside the selected day would quietly corrupt the figures.
   */
  useRealtimeEvent("order:new", (order) => {
    toast.success(
      `New order${order?.customerName ? ` — ${order.customerName}` : ""}`,
      { icon: "🛒", id: `order-${order?.id ?? Date.now()}` }
    );
    loadOrders(orderDate);
  });

  // Reconnecting after a drop: pick up whatever landed while polling was down.
  useEffect(() => {
    if (readyCount > 1) loadOrders(orderDate);
  }, [readyCount, loadOrders, orderDate]);

  // -- Generic CRUD helper ---------------------------------------------------
  const mutate = useCallback(
    async (action, setter, successMessage) => {
      try {
        const result = await action();
        if (setter) setter(result);
        if (successMessage) toast.success(successMessage);
        return result;
      } catch (error) {
        toast.error(error.message || "Something went wrong");
        return null;
      }
    },
    []
  );

  // -- Products --------------------------------------------------------------
  const addProduct = useCallback(
    (data) => mutate(
      async () => {
        const created = await api.createProduct(data);
        setProducts((prev) => [created, ...prev]);
        return created;
      },
      null,
      "Product added"
    ),
    [mutate]
  );

  const updateProduct = useCallback(
    (id, data) => mutate(
      async () => {
        const updated = await api.updateProductApi(id, data);
        setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        return updated;
      },
      null,
      "Product updated"
    ),
    [mutate]
  );

  const deleteProduct = useCallback(
    (id) => mutate(
      async () => {
        await api.deleteProductApi(id);
        setProducts((prev) => prev.filter((p) => p.id !== id));
      },
      null,
      "Product deleted"
    ),
    [mutate]
  );

  const duplicateProduct = useCallback(
    (product) => {
      const { id, createdAt, ...rest } = product;
      return addProduct({
        ...rest,
        nameAr: `${product.nameAr} (نسخة)`,
        nameEn: `${product.nameEn} (Copy)`,
        sku: product.sku ? `${product.sku}-COPY` : "",
      });
    },
    [addProduct]
  );

  // -- Categories ------------------------------------------------------------
  const addCategory = useCallback(
    (data) => mutate(async () => {
      const created = await api.createCategory(data);
      setCategories((prev) => [...prev, created]);
      return created;
    }, null, "Category added"),
    [mutate]
  );

  const updateCategory = useCallback(
    (id, data) => mutate(async () => {
      const updated = await api.updateCategoryApi(id, data);
      setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      return updated;
    }, null, "Category updated"),
    [mutate]
  );

  const deleteCategory = useCallback(
    (id) => mutate(async () => {
      await api.deleteCategoryApi(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      return true;
    }, null, "Category deleted"),
    [mutate]
  );

  // -- Brands ----------------------------------------------------------------
  const addBrand = useCallback(
    (data) => mutate(async () => {
      const created = await api.createBrand(data);
      setBrands((prev) => [...prev, created]);
      return created;
    }, null, "Brand added"),
    [mutate]
  );

  const updateBrand = useCallback(
    (id, data) => mutate(async () => {
      const updated = await api.updateBrandApi(id, data);
      setBrands((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      return updated;
    }, null, "Brand updated"),
    [mutate]
  );

  const deleteBrand = useCallback(
    (id) => mutate(async () => {
      await api.deleteBrandApi(id);
      setBrands((prev) => prev.filter((b) => b.id !== id));
      return true;
    }, null, "Brand deleted"),
    [mutate]
  );

  // -- Offers ----------------------------------------------------------------
  const addOffer = useCallback(
    (data) => mutate(async () => {
      const created = await api.createOffer(data);
      setOffers((prev) => [created, ...prev]);
      return created;
    }, null, "Offer created"),
    [mutate]
  );

  const updateOffer = useCallback(
    (id, data) => mutate(async () => {
      const updated = await api.updateOfferApi(id, data);
      setOffers((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      return updated;
    }, null, "Offer updated"),
    [mutate]
  );

  const deleteOffer = useCallback(
    (id) => mutate(async () => {
      await api.deleteOfferApi(id);
      setOffers((prev) => prev.filter((o) => o.id !== id));
    }, null, "Offer deleted"),
    [mutate]
  );

  // -- Orders ----------------------------------------------------------------
  /**
   * Whether the money has actually arrived — the one order state this shop
   * tracks (see constants/index.js). Replaces the old fulfilment-status
   * update, which nothing called any more now that Orders dropped its status
   * column.
   */
  const updateOrderPaymentStatus = useCallback(
    async (orderId, paid) => {
      const order = orders.find((o) => o.id === orderId);
      if (!order) return;
      await mutate(async () => {
        await api.setOrderPaymentStatus(order.dbId, paid);
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, paymentStatus: paid ? "paid" : "unpaid" } : o))
        );
      }, null, paid ? "Order marked paid" : "Order marked unpaid");
    },
    [orders, mutate]
  );

  const deleteOrder = useCallback(
    async (orderId) => {
      const order = orders.find((o) => o.id === orderId);
      if (!order) return false;
      const result = await mutate(async () => {
        await api.deleteOrderApi(order.dbId);
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
        return true;
      }, null, "Order deleted");
      return !!result;
    },
    [orders, mutate]
  );

  // -- Settings --------------------------------------------------------------
  const updateSettings = useCallback(
    (updates) => mutate(async () => {
      const saved = await api.saveSettings({ ...settings, ...updates });
      setSettings(saved);
      return saved;
    }, null, "Settings saved"),
    [settings, mutate]
  );

  // -- Stock notifications ---------------------------------------------------
  const requestStockNotification = useCallback(async (productId, contact) => {
    try {
      await api.requestStockAlert(productId, contact);
      toast.success("We'll let you know as soon as it's back!");
      return true;
    } catch (error) {
      toast.error(error.message || "Something went wrong");
      return false;
    }
  }, []);

  const fetchStockAlerts = useCallback(async (productId, includeDone = false) => {
    try {
      return await api.fetchStockAlerts(productId, includeDone);
    } catch {
      return [];
    }
  }, []);

  const resolveStockAlerts = useCallback(async (ids) => {
    await Promise.all(ids.map((id) => api.resolveStockAlert(id)));
  }, []);

  const deleteStockAlert = useCallback(async (id) => {
    await api.deleteStockAlert(id);
  }, []);

  // -- Derived ---------------------------------------------------------------
  /**
   * Categories carrying a live product count.
   *
   * The count is derived here rather than trusted from the server field. It is
   * then always consistent with the very list the page is rendering: adding,
   * deleting or recategorising a product updates the number immediately,
   * without waiting for a refetch, and a category can never claim products the
   * visitor cannot see.
   */
  const categoriesWithCounts = useMemo(() => {
    const tally = new Map();
    for (const product of products) {
      const key = String(product?.category ?? "");
      tally.set(key, (tally.get(key) ?? 0) + 1);
    }
    return categories.map((category) => ({
      ...category,
      productCount: tally.get(String(category.id)) ?? 0,
    }));
  }, [categories, products]);

  const stats = useMemo(() => {
    const today = todayLocalISO();
    // Used to exclude cancelled orders; there is no fulfilment status any
    // more (see constants/index.js), so every order counts.
    const counted = orders;

    return {
      totalProducts: products.length,
      totalCategories: categories.length,
      totalBrands: brands.length,
      totalOrders: orders.length,
      dailyRevenue: counted
        .filter((o) => o.date === today)
        .reduce((sum, o) => sum + toNumber(o.total), 0),
      monthlyRevenue: counted
        .filter((o) => String(o.date ?? "").slice(0, 7) === today.slice(0, 7))
        .reduce((sum, o) => sum + toNumber(o.total), 0),
      activeOffers: offers.filter((o) => o.active).length,
      outOfStock: products.filter((p) => !p.availability).length,
    };
  }, [products, categories, brands, orders, offers]);

  return (
    <DataContext.Provider
      value={{
        // Categories always carry a live productCount derived from `products`.
        products, categories: categoriesWithCounts, brands, banners, offers, settings,
        orders, ordersLoading, isLoading, loadError,
        orderDate, setOrderDate,
        reload,
        stats,
        addProduct, updateProduct, deleteProduct, duplicateProduct,
        addCategory, updateCategory, deleteCategory,
        addBrand, updateBrand, deleteBrand,
        addOffer, updateOffer, deleteOffer,
        updateOrderPaymentStatus, deleteOrder,
        updateSettings,
        requestStockNotification, fetchStockAlerts, resolveStockAlerts, deleteStockAlert,
        // Which homepage sections render, and their titles. Static config
        // rather than a database row — it changes when the design changes,
        // not from the dashboard.
        homepage,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export default DataContext;
