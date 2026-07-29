import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { getLocalStorage, setLocalStorage, effectivePrice, toNumber } from "../utils";
import { LOCAL_STORAGE_KEYS } from "../constants";
import { useData } from "./DataContext";
import toast from "react-hot-toast";

const CartContext = createContext();

/** Matches the per-line cap enforced by api/paymob.php. */
const MAX_QUANTITY_PER_ITEM = 99;

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const { products } = useData();

  const [cartItems, setCartItems] = useState(() =>
    getLocalStorage(LOCAL_STORAGE_KEYS.CART, [])
  );
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    setLocalStorage(LOCAL_STORAGE_KEYS.CART, cartItems);
  }, [cartItems]);

  /**
   * Re-read prices and availability from the live catalogue.
   *
   * A cart is a snapshot that can sit in localStorage for days. Since the
   * payment server prices from the catalogue, a stale snapshot would show the
   * customer one total and charge them another.
   */
  useEffect(() => {
    if (!products || products.length === 0) return;

    setCartItems((prev) => {
      if (prev.length === 0) return prev;

      let changed = false;
      const refreshed = [];

      for (const item of prev) {
        const current = products.find((p) => String(p.id) === String(item.id));
        if (!current) {
          changed = true; // no longer in the catalogue
          continue;
        }
        if (
          current.price !== item.price ||
          current.discountPrice !== item.discountPrice ||
          current.availability !== item.availability
        ) {
          changed = true;
          refreshed.push({ ...current, quantity: item.quantity });
        } else {
          refreshed.push(item);
        }
      }

      return changed ? refreshed : prev;
    });
  }, [products]);

  const addToCart = useCallback((product, quantity = 1) => {
    if (!product?.id) return;

    if (product.availability === false) {
      toast.error("This product is out of stock");
      return;
    }

    let capped = false;

    setCartItems((prev) => {
      const existing = prev.find((item) => item.id === product.id);

      if (existing) {
        const wanted = existing.quantity + quantity;
        const next = Math.min(wanted, MAX_QUANTITY_PER_ITEM);
        capped = wanted > next;
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: next } : item
        );
      }

      const next = Math.min(Math.max(1, quantity), MAX_QUANTITY_PER_ITEM);
      capped = quantity > next;
      return [...prev, { ...product, quantity: next }];
    });

    if (capped) {
      toast.error(`Maximum ${MAX_QUANTITY_PER_ITEM} per product`);
    } else {
      toast.success("Added to cart!");
    }
  }, []);

  const removeFromCart = useCallback((productId) => {
    setCartItems((prev) => prev.filter((item) => item.id !== productId));
    toast.success("Removed from cart");
  }, []);

  const updateQuantity = useCallback(
    (productId, quantity) => {
      const wanted = toNumber(quantity, 0);

      if (wanted < 1) {
        removeFromCart(productId);
        return;
      }
      if (wanted > MAX_QUANTITY_PER_ITEM) {
        toast.error(`Maximum ${MAX_QUANTITY_PER_ITEM} per product`);
      }

      const next = Math.min(wanted, MAX_QUANTITY_PER_ITEM);
      setCartItems((prev) =>
        prev.map((item) => (item.id === productId ? { ...item, quantity: next } : item))
      );
    },
    [removeFromCart]
  );

  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  const cartTotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + effectivePrice(item) * toNumber(item.quantity, 0), 0),
    [cartItems]
  );

  const cartCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + toNumber(item.quantity, 0), 0),
    [cartItems]
  );

  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);
  const toggleCart = useCallback(() => setIsCartOpen((prev) => !prev), []);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartTotal,
        cartCount,
        isCartOpen,
        openCart,
        closeCart,
        toggleCart,
        maxQuantityPerItem: MAX_QUANTITY_PER_ITEM,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export default CartContext;
