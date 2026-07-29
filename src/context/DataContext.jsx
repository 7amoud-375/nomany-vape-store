import { createContext, useContext, useState, useCallback, useEffect, useMemo } from "react";
import { products as initialProducts } from "../data/products";
import { categories as initialCategories } from "../data/categories";
import { brands as initialBrands } from "../data/brands";
import { banners as initialBanners } from "../data/banners";
import { offers as initialOffers } from "../data/offers";
import { testimonials as initialTestimonials } from "../data/testimonials";
import { settings as initialSettings } from "../data/settings";
import { homepage as initialHomepage } from "../data/homepage";
import { getLocalStorage, setLocalStorage } from "../utils";
import { LOCAL_STORAGE_KEYS } from "../constants";
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

export const DataProvider = ({ children }) => {
  const [products, setProducts] = useState(() => 
    getLocalStorage(LOCAL_STORAGE_KEYS.PRODUCTS, initialProducts)
  );
  const [categories, setCategories] = useState(() => 
    getLocalStorage(LOCAL_STORAGE_KEYS.CATEGORIES, initialCategories)
  );
  const [brands, setBrands] = useState(() => 
    getLocalStorage(LOCAL_STORAGE_KEYS.BRANDS, initialBrands)
  );
  const [banners, setBanners] = useState(() => 
    getLocalStorage(LOCAL_STORAGE_KEYS.BANNERS, initialBanners)
  );
  const [offers, setOffers] = useState(() => 
    getLocalStorage(LOCAL_STORAGE_KEYS.OFFERS, initialOffers)
  );
  const [testimonials, setTestimonials] = useState(() => 
    getLocalStorage(LOCAL_STORAGE_KEYS.TESTIMONIALS, initialTestimonials)
  );
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [settings, setSettings] = useState(() => 
    getLocalStorage(LOCAL_STORAGE_KEYS.SETTINGS, initialSettings)
  );
  const [homepage, setHomepage] = useState(() => 
    getLocalStorage(LOCAL_STORAGE_KEYS.HOMEPAGE, initialHomepage)
  );

  // ========== FIREBASE SUBSCRIPTIONS ==========
  useEffect(() => {
    const unsubscribe = subscribeToProducts((firebaseProducts) => {
      if (firebaseProducts && firebaseProducts.length > 0) {
        setProducts(firebaseProducts);
        setLocalStorage(LOCAL_STORAGE_KEYS.PRODUCTS, firebaseProducts);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToCategories((firebaseCategories) => {
      if (firebaseCategories && firebaseCategories.length > 0) {
        setCategories(firebaseCategories);
        setLocalStorage(LOCAL_STORAGE_KEYS.CATEGORIES, firebaseCategories);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToBrands((firebaseBrands) => {
      if (firebaseBrands && firebaseBrands.length > 0) {
        setBrands(firebaseBrands);
        setLocalStorage(LOCAL_STORAGE_KEYS.BRANDS, firebaseBrands);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToOffers((firebaseOffers) => {
      if (firebaseOffers && firebaseOffers.length > 0) {
        setOffers(firebaseOffers);
        setLocalStorage(LOCAL_STORAGE_KEYS.OFFERS, firebaseOffers);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToBanners((firebaseBanners) => {
      if (firebaseBanners && firebaseBanners.length > 0) {
        setBanners(firebaseBanners);
        setLocalStorage(LOCAL_STORAGE_KEYS.BANNERS, firebaseBanners);
      }
    });
    return () => unsubscribe();
  }, []);

  // ========== ORDERS ==========
  useEffect(() => {
    setOrdersLoading(true);
    const localOrders = getLocalStorage(LOCAL_STORAGE_KEYS.ORDERS, []);
    if (localOrders.length > 0) {
      const validLocalOrders = localOrders.filter(order => order != null && order.id);
      setOrders(validLocalOrders);
    }

    const unsubscribe = subscribeToOrders((firebaseOrders) => {
      const validOrders = (firebaseOrders || []).filter(order => 
        order != null && typeof order === 'object' && order.id != null
      );
      setOrders(validOrders);
      setLocalStorage(LOCAL_STORAGE_KEYS.ORDERS, validOrders);
      setOrdersLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ========== PRODUCTS CRUD ==========
  const addProduct = useCallback((product) => {
    const newProduct = { ...product, id: Date.now() };
    setProducts((prev) => {
      const updated = [...prev, newProduct];
      syncProductsToFirebase(updated);
      setLocalStorage(LOCAL_STORAGE_KEYS.PRODUCTS, updated);
      return updated;
    });
    toast.success("Product added successfully");
    return newProduct;
  }, []);

  const updateProduct = useCallback((id, updates) => {
    const previousProduct = products.find((p) => p.id === id);
    setProducts((prev) => {
      const updated = prev.map((p) => (p.id === id ? { ...p, ...updates } : p));
      syncProductsToFirebase(updated);
      setLocalStorage(LOCAL_STORAGE_KEYS.PRODUCTS, updated);
      return updated;
    });
    toast.success("Product updated successfully");

    const wasOutOfStock = previousProduct && previousProduct.availability === false;
    const isNowInStock = updates.availability === true;
    if (wasOutOfStock && isNowInStock) {
      getPendingStockNotifications(id).then((pending) => {
        if (pending.length > 0) {
          toast.success(
            `${pending.length} customer${pending.length > 1 ? "s are" : " is"} waiting for this product — check "Notify Requests" to reach them.`,
            { duration: 6000 }
          );
        }
      });
    }
  }, [products]);

  const deleteProduct = useCallback((id) => {
    setProducts((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      syncProductsToFirebase(updated);
      setLocalStorage(LOCAL_STORAGE_KEYS.PRODUCTS, updated);
      return updated;
    });
    toast.success("Product deleted successfully");
  }, []);

  const duplicateProduct = useCallback((product) => {
    const newProduct = { 
      ...product, 
      id: Date.now(), 
      nameAr: `${product.nameAr} (نسخة)`,
      nameEn: `${product.nameEn} (Copy)`,
      sku: `${product.sku}-COPY`
    };
    setProducts((prev) => {
      const updated = [...prev, newProduct];
      syncProductsToFirebase(updated);
      setLocalStorage(LOCAL_STORAGE_KEYS.PRODUCTS, updated);
      return updated;
    });
    toast.success("Product duplicated");
    return newProduct;
  }, []);

  // ========== CATEGORIES CRUD ==========
  const addCategory = useCallback((category) => {
    const newCategory = { ...category, id: category.id || Date.now().toString() };
    setCategories((prev) => {
      const updated = [...prev, newCategory];
      syncCategoriesToFirebase(updated);
      setLocalStorage(LOCAL_STORAGE_KEYS.CATEGORIES, updated);
      return updated;
    });
    toast.success("Category added");
    return newCategory;
  }, []);

  const updateCategory = useCallback((id, updates) => {
    setCategories((prev) => {
      const updated = prev.map((c) => (c.id === id ? { ...c, ...updates } : c));
      syncCategoriesToFirebase(updated);
      setLocalStorage(LOCAL_STORAGE_KEYS.CATEGORIES, updated);
      return updated;
    });
    toast.success("Category updated");
  }, []);

  const deleteCategory = useCallback((id) => {
    const productsInCategory = products.filter((p) => p.category === id);
    if (productsInCategory.length > 0) {
      toast.error(`Cannot delete: ${productsInCategory.length} products use this category`);
      return false;
    }
    setCategories((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      syncCategoriesToFirebase(updated);
      setLocalStorage(LOCAL_STORAGE_KEYS.CATEGORIES, updated);
      return updated;
    });
    toast.success("Category deleted");
    return true;
  }, [products]);

  // ========== BRANDS CRUD ==========
  const addBrand = useCallback((brand) => {
    const newBrand = { ...brand, id: brand.id || Date.now().toString() };
    setBrands((prev) => {
      const updated = [...prev, newBrand];
      syncBrandsToFirebase(updated);
      setLocalStorage(LOCAL_STORAGE_KEYS.BRANDS, updated);
      return updated;
    });
    toast.success("Brand added");
    return newBrand;
  }, []);

  const updateBrand = useCallback((id, updates) => {
    setBrands((prev) => {
      const updated = prev.map((b) => (b.id === id ? { ...b, ...updates } : b));
      syncBrandsToFirebase(updated);
      setLocalStorage(LOCAL_STORAGE_KEYS.BRANDS, updated);
      return updated;
    });
    toast.success("Brand updated");
  }, []);

  const deleteBrand = useCallback((id) => {
    const productsWithBrand = products.filter((p) => p.brand === id);
    if (productsWithBrand.length > 0) {
      toast.error(`Cannot delete: ${productsWithBrand.length} products use this brand`);
      return false;
    }
    setBrands((prev) => {
      const updated = prev.filter((b) => b.id !== id);
      syncBrandsToFirebase(updated);
      setLocalStorage(LOCAL_STORAGE_KEYS.BRANDS, updated);
      return updated;
    });
    toast.success("Brand deleted");
    return true;
  }, [products]);

  // ========== BANNERS CRUD ==========
  const addBanner = useCallback((banner) => {
    const newBanner = { ...banner, id: Date.now() };
    setBanners((prev) => {
      const updated = [...prev, newBanner];
      syncBannersToFirebase(updated);
      setLocalStorage(LOCAL_STORAGE_KEYS.BANNERS, updated);
      return updated;
    });
    toast.success("Banner added");
    return newBanner;
  }, []);

  const updateBanner = useCallback((id, updates) => {
    setBanners((prev) => {
      const updated = prev.map((b) => (b.id === id ? { ...b, ...updates } : b));
      syncBannersToFirebase(updated);
      setLocalStorage(LOCAL_STORAGE_KEYS.BANNERS, updated);
      return updated;
    });
    toast.success("Banner updated");
  }, []);

  const deleteBanner = useCallback((id) => {
    setBanners((prev) => {
      const updated = prev.filter((b) => b.id !== id);
      syncBannersToFirebase(updated);
      setLocalStorage(LOCAL_STORAGE_KEYS.BANNERS, updated);
      return updated;
    });
    toast.success("Banner deleted");
  }, []);

  // ========== OFFERS CRUD ==========
  const addOffer = useCallback((offer) => {
    const newOffer = { ...offer, id: Date.now() };
    setOffers((prev) => {
      const updated = [...prev, newOffer];
      syncOffersToFirebase(updated);
      setLocalStorage(LOCAL_STORAGE_KEYS.OFFERS, updated);
      return updated;
    });
    toast.success("Offer created");
    return newOffer;
  }, []);

  const updateOffer = useCallback((id, updates) => {
    setOffers((prev) => {
      const updated = prev.map((o) => (o.id === id ? { ...o, ...updates } : o));
      syncOffersToFirebase(updated);
      setLocalStorage(LOCAL_STORAGE_KEYS.OFFERS, updated);
      return updated;
    });
    toast.success("Offer updated");
  }, []);

  const deleteOffer = useCallback((id) => {
    setOffers((prev) => {
      const updated = prev.filter((o) => o.id !== id);
      syncOffersToFirebase(updated);
      setLocalStorage(LOCAL_STORAGE_KEYS.OFFERS, updated);
      return updated;
    });
    toast.success("Offer deleted");
  }, []);

  // ========== TESTIMONIALS CRUD ==========
  const addTestimonial = useCallback((testimonial) => {
    const newTestimonial = { ...testimonial, id: Date.now() };
    setTestimonials((prev) => {
      const updated = [...prev, newTestimonial];
      setLocalStorage(LOCAL_STORAGE_KEYS.TESTIMONIALS, updated);
      return updated;
    });
    toast.success("Testimonial added");
    return newTestimonial;
  }, []);

  const updateTestimonial = useCallback((id, updates) => {
    setTestimonials((prev) => {
      const updated = prev.map((t) => (t.id === id ? { ...t, ...updates } : t));
      setLocalStorage(LOCAL_STORAGE_KEYS.TESTIMONIALS, updated);
      return updated;
    });
    toast.success("Testimonial updated");
  }, []);

  const deleteTestimonial = useCallback((id) => {
    setTestimonials((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      setLocalStorage(LOCAL_STORAGE_KEYS.TESTIMONIALS, updated);
      return updated;
    });
    toast.success("Testimonial deleted");
  }, []);

  // ========== ORDERS (FIREBASE) ==========
  const updateOrderStatus = useCallback(async (orderId, status) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) {
      toast.error("Order not found");
      return;
    }
    if (!order.firebaseDocId) {
      toast.error("Cannot update: Order not synced with cloud");
      return;
    }
    try {
      await updateOrderStatusInFirebase(order.firebaseDocId, status);
      toast.success("Order status updated");
    } catch (error) {
      toast.error("Failed to update status");
    }
  }, [orders]);

  const addOrder = useCallback(async (order) => {
    if (!order || !order.id) {
      toast.error("Invalid order data");
      return;
    }
    try {
      const result = await addOrderToFirebase(order);
      const orderWithFirebaseId = { ...order, firebaseDocId: result.firebaseDocId };
      const currentOrders = getLocalStorage(LOCAL_STORAGE_KEYS.ORDERS, []);
      const updatedOrders = [orderWithFirebaseId, ...currentOrders];
      setLocalStorage(LOCAL_STORAGE_KEYS.ORDERS, updatedOrders);
      toast.success("Order placed successfully!");
      return orderWithFirebaseId;
    } catch (error) {
      setOrders((prev) => {
        const newOrders = [order, ...prev];
        setLocalStorage(LOCAL_STORAGE_KEYS.ORDERS, newOrders);
        return newOrders;
      });
      toast.success("Order saved locally (offline mode)");
      return order;
    }
  }, []);

  const deleteOrder = useCallback(async (orderId) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) {
      toast.error("Order not found");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this order?")) return;
    try {
      if (order.firebaseDocId) {
        await deleteOrderFromFirebase(order.firebaseDocId);
      }
      toast.success("Order deleted");
    } catch (error) {
      toast.error("Failed to delete order");
    }
  }, [orders]);

  // ========== STOCK NOTIFICATIONS ("Notify Me") ==========
  const requestStockNotification = useCallback(async (productId, contact) => {
    try {
      await addStockNotificationRequest(productId, contact);
      toast.success("We'll let you know as soon as it's back!");
      return true;
    } catch (error) {
      toast.error("Something went wrong, please try again");
      console.error("Notification error:", error);
      return false;
    }
  }, []);

  const fetchStockAlerts = useCallback(async (productId) => {
    return getPendingStockNotifications(productId);
  }, []);

  const resolveStockAlerts = useCallback(async (docIds) => {
    await markStockNotificationsSent(docIds);
  }, []);

  // ========== SETTINGS & HOMEPAGE ==========
  const updateSettings = useCallback((updates) => {
    setSettings((prev) => {
      const updated = { ...prev, ...updates };
      setLocalStorage(LOCAL_STORAGE_KEYS.SETTINGS, updated);
      return updated;
    });
    toast.success("Settings saved");
  }, []);

  const updateHomepage = useCallback((updates) => {
    setHomepage((prev) => {
      const updated = { ...prev, ...updates };
      setLocalStorage(LOCAL_STORAGE_KEYS.HOMEPAGE, updated);
      return updated;
    });
    toast.success("Homepage updated");
  }, []);

  // ========== STATS ==========
  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const validOrders = (orders || []).filter(o => o != null && o.total != null);

    return {
      totalProducts: products.length,
      totalCategories: categories.length,
      totalBrands: brands.length,
      totalOrders: validOrders.length,
      monthlyRevenue: validOrders
        .filter((o) => {
          const orderMonth = o.date?.substring(0, 7) || '';
          return orderMonth === currentMonth && o.status !== "cancelled";
        })
        .reduce((sum, o) => sum + (o.total || 0), 0),
      dailyRevenue: validOrders
        .filter((o) => o.date === now.toISOString().split("T")[0] && o.status !== "cancelled")
        .reduce((sum, o) => sum + (o.total || 0), 0),
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