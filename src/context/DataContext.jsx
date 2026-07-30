import { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from "react";
import { products as initialProducts } from "../data/products";
import { categories as initialCategories } from "../data/categories";
import { brands as initialBrands } from "../data/brands";
import { banners as initialBanners } from "../data/banners";
import { offers as initialOffers } from "../data/offers";
import { testimonials as initialTestimonials } from "../data/testimonials";
import { settings as initialSettings } from "../data/settings";
import { homepage as initialHomepage } from "../data/homepage";
import { getLocalStorage, setLocalStorage, generateId, todayLocalISO } from "../utils";
import { LOCAL_STORAGE_KEYS } from "../constants";
import { useAuth } from "./AuthContext";
import {
  addOrderToFirebase,
  updateOrderStatusInFirebase,
  deleteOrderFromFirebase,
  subscribeToOrders,
  syncProductsToFirebase,
  subscribeToProducts,
  syncCategoriesToFirebase,
  subscribeToCategories,
  syncBrandsToFirebase,
  subscribeToBrands,
  syncOffersToFirebase,
  subscribeToOffers,
  syncBannersToFirebase,
  subscribeToBanners,
  syncTestimonialsToFirebase,
  subscribeToTestimonials,
  syncSettingsToFirebase,
  subscribeToSettings,
  syncHomepageToFirebase,
  subscribeToHomepage,
  addStockNotificationRequest,
  getPendingStockNotifications,
  markStockNotificationsSent,
} from "../services/firebaseService";
import toast from "react-hot-toast";

const DataContext = createContext();

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
};

/**
 * One store collection: seeded from localStorage, kept live by Firebase, and
 * written back through `commit`.
 *
 * `commit` deliberately performs its writes *outside* the state updater. The
 * previous version called Firebase from inside setState, which React may invoke
 * more than once — under StrictMode every save fired twice.
 */
function useSyncedList({ storageKey, seed, subscribe, sync, label }) {
  const [items, setItems] = useState(() => getLocalStorage(storageKey, seed));

  // Kept in a ref so `subscribe` never needs to be re-run when items change.
  const subscribeRef = useRef(subscribe);
  subscribeRef.current = subscribe;

  useEffect(() => {
    const unsubscribe = subscribeRef.current((remote) => {
      // null means the document does not exist yet — keep the seed data.
      // An empty array is a real value and must be applied, otherwise deleting
      // the last item never propagates to other browsers.
      if (!Array.isArray(remote)) return;
      setItems(remote);
      setLocalStorage(storageKey, remote);
    });
    return () => unsubscribe();
  }, [storageKey]);

  const commit = useCallback(
    (next) => {
      setItems(next);
      setLocalStorage(storageKey, next);
      Promise.resolve(sync(next)).catch((error) => {
        console.error(`Failed to sync ${label}:`, error);
        toast.error(`Saved on this device, but syncing ${label} to the cloud failed`);
      });
      return next;
    },
    [storageKey, sync, label]
  );

  return [items, commit];
}

/** Same contract as useSyncedList, for the single-object documents. */
function useSyncedObject({ storageKey, seed, subscribe, sync, label }) {
  const [value, setValue] = useState(() => getLocalStorage(storageKey, seed));

  const subscribeRef = useRef(subscribe);
  subscribeRef.current = subscribe;

  useEffect(() => {
    const unsubscribe = subscribeRef.current((remote) => {
      if (!remote || typeof remote !== "object") return;
      setValue(remote);
      setLocalStorage(storageKey, remote);
    });
    return () => unsubscribe();
  }, [storageKey]);

  const commit = useCallback(
    (next) => {
      setValue(next);
      setLocalStorage(storageKey, next);
      Promise.resolve(sync(next)).catch((error) => {
        console.error(`Failed to sync ${label}:`, error);
        toast.error(`Saved on this device, but syncing ${label} to the cloud failed`);
      });
      return next;
    },
    [storageKey, sync, label]
  );

  return [value, commit];
}

export const DataProvider = ({ children }) => {
  const { userRole, isLoading: authLoading } = useAuth();
  const isAdmin = userRole === "admin";

  const [products, commitProducts] = useSyncedList({
    storageKey: LOCAL_STORAGE_KEYS.PRODUCTS,
    seed: initialProducts,
    subscribe: subscribeToProducts,
    sync: syncProductsToFirebase,
    label: "products",
  });

  const [categories, commitCategories] = useSyncedList({
    storageKey: LOCAL_STORAGE_KEYS.CATEGORIES,
    seed: initialCategories,
    subscribe: subscribeToCategories,
    sync: syncCategoriesToFirebase,
    label: "categories",
  });

  const [brands, commitBrands] = useSyncedList({
    storageKey: LOCAL_STORAGE_KEYS.BRANDS,
    seed: initialBrands,
    subscribe: subscribeToBrands,
    sync: syncBrandsToFirebase,
    label: "brands",
  });

  const [banners, commitBanners] = useSyncedList({
    storageKey: LOCAL_STORAGE_KEYS.BANNERS,
    seed: initialBanners,
    subscribe: subscribeToBanners,
    sync: syncBannersToFirebase,
    label: "banners",
  });

  const [offers, commitOffers] = useSyncedList({
    storageKey: LOCAL_STORAGE_KEYS.OFFERS,
    seed: initialOffers,
    subscribe: subscribeToOffers,
    sync: syncOffersToFirebase,
    label: "offers",
  });

  const [testimonials, commitTestimonials] = useSyncedList({
    storageKey: LOCAL_STORAGE_KEYS.TESTIMONIALS,
    seed: initialTestimonials,
    subscribe: subscribeToTestimonials,
    sync: syncTestimonialsToFirebase,
    label: "testimonials",
  });

  const [settings, commitSettings] = useSyncedObject({
    storageKey: LOCAL_STORAGE_KEYS.SETTINGS,
    seed: initialSettings,
    subscribe: subscribeToSettings,
    sync: syncSettingsToFirebase,
    label: "settings",
  });

  const [homepage, commitHomepage] = useSyncedObject({
    storageKey: LOCAL_STORAGE_KEYS.HOMEPAGE,
    seed: initialHomepage,
    subscribe: subscribeToHomepage,
    sync: syncHomepageToFirebase,
    label: "homepage",
  });

  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  // ========== ORDERS ==========
  // Only the admin reads orders. There are no customer accounts, so there is
  // nobody else with a legitimate reason to hold the collection open -- and
  // firestore.rules denies it anyway.
  useEffect(() => {
    if (authLoading) return undefined;

    if (!isAdmin) {
      setOrders([]);
      setOrdersLoading(false);
      return undefined;
    }

    setOrdersLoading(true);

    const unsubscribe = subscribeToOrders(
      (incoming) => {
        const valid = (incoming || []).filter(
          (order) => order != null && typeof order === "object" && order.id != null
        );
        valid.sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? "")));
        setOrders(valid);
        setOrdersLoading(false);
      },
      () => {
        setOrders([]);
        setOrdersLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isAdmin, authLoading]);

  // ========== PRODUCTS ==========
  const addProduct = useCallback(
    (product) => {
      const newProduct = { ...product, id: generateId(), createdAt: new Date().toISOString() };
      commitProducts([...products, newProduct]);
      toast.success("Product added successfully");
      return newProduct;
    },
    [products, commitProducts]
  );

  const updateProduct = useCallback(
    (id, updates) => {
      const previous = products.find((p) => p.id === id);
      commitProducts(products.map((p) => (p.id === id ? { ...p, ...updates } : p)));
      toast.success("Product updated successfully");

      // Coming back into stock: surface anyone waiting on a "notify me".
      if (previous?.availability === false && updates.availability === true) {
        getPendingStockNotifications(id).then((pending) => {
          if (pending.length > 0) {
            toast.success(
              `${pending.length} customer${pending.length > 1 ? "s are" : " is"} waiting for this product — check "Notify Requests" to reach them.`,
              { duration: 6000 }
            );
          }
        });
      }
    },
    [products, commitProducts]
  );

  const deleteProduct = useCallback(
    (id) => {
      commitProducts(products.filter((p) => p.id !== id));
      toast.success("Product deleted successfully");
    },
    [products, commitProducts]
  );

  const duplicateProduct = useCallback(
    (product) => {
      const copy = {
        ...product,
        id: generateId(),
        createdAt: new Date().toISOString(),
        nameAr: `${product.nameAr} (نسخة)`,
        nameEn: `${product.nameEn} (Copy)`,
        sku: `${product.sku}-COPY`,
      };
      commitProducts([...products, copy]);
      toast.success("Product duplicated");
      return copy;
    },
    [products, commitProducts]
  );

  // ========== CATEGORIES ==========
  const addCategory = useCallback(
    (category) => {
      const newCategory = { ...category, id: category.id || generateId() };
      commitCategories([...categories, newCategory]);
      toast.success("Category added");
      return newCategory;
    },
    [categories, commitCategories]
  );

  const updateCategory = useCallback(
    (id, updates) => {
      commitCategories(categories.map((c) => (c.id === id ? { ...c, ...updates } : c)));
      toast.success("Category updated");
    },
    [categories, commitCategories]
  );

  const deleteCategory = useCallback(
    (id) => {
      const inUse = products.filter((p) => p.category === id);
      if (inUse.length > 0) {
        toast.error(`Cannot delete: ${inUse.length} products use this category`);
        return false;
      }
      commitCategories(categories.filter((c) => c.id !== id));
      toast.success("Category deleted");
      return true;
    },
    [products, categories, commitCategories]
  );

  // ========== BRANDS ==========
  const addBrand = useCallback(
    (brand) => {
      const newBrand = { ...brand, id: brand.id || generateId() };
      commitBrands([...brands, newBrand]);
      toast.success("Brand added");
      return newBrand;
    },
    [brands, commitBrands]
  );

  const updateBrand = useCallback(
    (id, updates) => {
      commitBrands(brands.map((b) => (b.id === id ? { ...b, ...updates } : b)));
      toast.success("Brand updated");
    },
    [brands, commitBrands]
  );

  const deleteBrand = useCallback(
    (id) => {
      // Products have historically stored the brand *name* rather than its id,
      // and seed data has id === name. Match either so the guard actually fires.
      const brand = brands.find((b) => b.id === id);
      const inUse = products.filter((p) => p.brand === id || (brand && p.brand === brand.name));
      if (inUse.length > 0) {
        toast.error(`Cannot delete: ${inUse.length} products use this brand`);
        return false;
      }
      commitBrands(brands.filter((b) => b.id !== id));
      toast.success("Brand deleted");
      return true;
    },
    [products, brands, commitBrands]
  );

  // ========== BANNERS ==========
  const addBanner = useCallback(
    (banner) => {
      const newBanner = { ...banner, id: generateId() };
      commitBanners([...banners, newBanner]);
      toast.success("Banner added");
      return newBanner;
    },
    [banners, commitBanners]
  );

  const updateBanner = useCallback(
    (id, updates) => {
      commitBanners(banners.map((b) => (b.id === id ? { ...b, ...updates } : b)));
      toast.success("Banner updated");
    },
    [banners, commitBanners]
  );

  const deleteBanner = useCallback(
    (id) => {
      commitBanners(banners.filter((b) => b.id !== id));
      toast.success("Banner deleted");
    },
    [banners, commitBanners]
  );

  // ========== OFFERS ==========
  const addOffer = useCallback(
    (offer) => {
      const newOffer = { ...offer, id: generateId() };
      commitOffers([...offers, newOffer]);
      toast.success("Offer created");
      return newOffer;
    },
    [offers, commitOffers]
  );

  const updateOffer = useCallback(
    (id, updates) => {
      commitOffers(offers.map((o) => (o.id === id ? { ...o, ...updates } : o)));
      toast.success("Offer updated");
    },
    [offers, commitOffers]
  );

  const deleteOffer = useCallback(
    (id) => {
      commitOffers(offers.filter((o) => o.id !== id));
      toast.success("Offer deleted");
    },
    [offers, commitOffers]
  );

  // ========== TESTIMONIALS ==========
  const addTestimonial = useCallback(
    (testimonial) => {
      const newTestimonial = { ...testimonial, id: generateId() };
      commitTestimonials([...testimonials, newTestimonial]);
      toast.success("Testimonial added");
      return newTestimonial;
    },
    [testimonials, commitTestimonials]
  );

  const updateTestimonial = useCallback(
    (id, updates) => {
      commitTestimonials(testimonials.map((t) => (t.id === id ? { ...t, ...updates } : t)));
      toast.success("Testimonial updated");
    },
    [testimonials, commitTestimonials]
  );

  const deleteTestimonial = useCallback(
    (id) => {
      commitTestimonials(testimonials.filter((t) => t.id !== id));
      toast.success("Testimonial deleted");
    },
    [testimonials, commitTestimonials]
  );

  // ========== ORDER MUTATIONS ==========
  const updateOrderStatus = useCallback(
    async (orderId, status) => {
      const order = orders.find((o) => o.id === orderId);
      if (!order) {
        toast.error("Order not found");
        return;
      }
      if (!order.firebaseDocId) {
        toast.error("Cannot update: order is not synced with the cloud");
        return;
      }
      try {
        await updateOrderStatusInFirebase(order.firebaseDocId, status);
        toast.success("Order status updated");
      } catch (error) {
        console.error("Failed to update order status:", error);
        toast.error("Failed to update status");
      }
    },
    [orders]
  );

  /**
   * Persist an order. Returns the stored order so checkout can reference it.
   *
   * The local `setOrders` matters: the Firebase snapshot can lag by a moment,
   * and without it a customer briefly saw no order at all after paying.
   */
  const addOrder = useCallback(
    async (order) => {
      if (!order || !order.id) {
        toast.error("Invalid order data");
        return null;
      }

      try {
        const saved = await addOrderToFirebase(order);
        // Only the admin's own session holds an orders list; a guest placing an
        // order has nothing to update locally.
        setOrders((prev) => [saved, ...prev.filter((o) => o.id !== saved.id)]);
        return saved;
      } catch (error) {
        console.error("Failed to save order to Firebase:", error);
        toast.error("Order saved on this device only — please contact us to confirm it");
        return order;
      }
    },
    []
  );

  const deleteOrder = useCallback(
    async (orderId) => {
      const order = orders.find((o) => o.id === orderId);
      if (!order) {
        toast.error("Order not found");
        return false;
      }
      // A local-only order has nothing to delete remotely; drop it from state
      // rather than reporting a success that never happened.
      if (!order.firebaseDocId) {
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
        toast.success("Local order removed");
        return true;
      }
      try {
        await deleteOrderFromFirebase(order.firebaseDocId);
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
        toast.success("Order deleted");
        return true;
      } catch (error) {
        console.error("Failed to delete order:", error);
        toast.error("Failed to delete order");
        return false;
      }
    },
    [orders]
  );

  // ========== STOCK NOTIFICATIONS ==========
  const requestStockNotification = useCallback(async (productId, contact) => {
    try {
      await addStockNotificationRequest(productId, contact);
      toast.success("We'll let you know as soon as it's back!");
      return true;
    } catch (error) {
      console.error("Notification error:", error);
      toast.error("Something went wrong, please try again");
      return false;
    }
  }, []);

  const fetchStockAlerts = useCallback((productId) => getPendingStockNotifications(productId), []);

  const resolveStockAlerts = useCallback((docIds) => markStockNotificationsSent(docIds), []);

  // ========== SETTINGS & HOMEPAGE ==========
  const updateSettings = useCallback(
    (updates) => {
      commitSettings({ ...settings, ...updates });
      toast.success("Settings saved");
    },
    [settings, commitSettings]
  );

  const updateHomepage = useCallback(
    (updates) => {
      commitHomepage({ ...homepage, ...updates });
      toast.success("Homepage updated");
    },
    [homepage, commitHomepage]
  );

  // ========== STATS ==========
  const stats = useMemo(() => {
    const today = todayLocalISO();
    const currentMonth = today.slice(0, 7);
    const valid = (orders || []).filter((o) => o != null && o.total != null);
    const counts = (o) => o.status !== "cancelled";

    return {
      totalProducts: products.length,
      totalCategories: categories.length,
      totalBrands: brands.length,
      totalOrders: valid.length,
      monthlyRevenue: valid
        .filter((o) => (o.date?.substring(0, 7) || "") === currentMonth && counts(o))
        .reduce((sum, o) => sum + (Number(o.total) || 0), 0),
      dailyRevenue: valid
        .filter((o) => o.date === today && counts(o))
        .reduce((sum, o) => sum + (Number(o.total) || 0), 0),
      activeOffers: offers.filter((o) => o.active).length,
      outOfStock: products.filter((p) => !p.availability).length,
    };
  }, [products, categories, brands, orders, offers]);

  return (
    <DataContext.Provider
      value={{
        products,
        categories,
        brands,
        banners,
        offers,
        testimonials,
        orders,
        ordersLoading,
        settings,
        homepage,
        stats,
        addProduct,
        updateProduct,
        deleteProduct,
        duplicateProduct,
        addCategory,
        updateCategory,
        deleteCategory,
        addBrand,
        updateBrand,
        deleteBrand,
        addBanner,
        updateBanner,
        deleteBanner,
        addOffer,
        updateOffer,
        deleteOffer,
        addTestimonial,
        updateTestimonial,
        deleteTestimonial,
        updateOrderStatus,
        addOrder,
        deleteOrder,
        requestStockNotification,
        fetchStockAlerts,
        resolveStockAlerts,
        updateSettings,
        updateHomepage,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export default DataContext;
