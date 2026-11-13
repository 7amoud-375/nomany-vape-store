import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import {
  getLocalStorage,
  setLocalStorage,
  effectivePrice,
  toNumber,
  hasFlavors,
  normaliseFlavor,
  cartLineKey,
} from "../utils";
import { LOCAL_STORAGE_KEYS } from "../constants";
import { useData } from "./DataContext";
import toast from "react-hot-toast";

const CartContext = createContext();

/** Matches the per-line cap enforced by the orders endpoint in api/index.php. */
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

  // Carts saved before flavours were selectable have no lineKey; derive one so
  // every line can still be updated and removed.
  const [cartItems, setCartItems] = useState(() =>
    getLocalStorage(LOCAL_STORAGE_KEYS.CART, []).map((item) => ({
      ...item,
      lineKey: item.lineKey ?? cartLineKey(item.id, item.selectedFlavor),
    }))
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
          refreshed.push({
            ...current,
            quantity: item.quantity,
            selectedFlavor: item.selectedFlavor,
            lineKey: item.lineKey,
          });
        } else {
          refreshed.push(item);
        }
      }

      return changed ? refreshed : prev;
    });
  }, [products]);

  /**
   * Returns false when nothing was added, so callers can react — a product
   * with flavours needs one chosen, which only the product page offers.
   */
  const addToCart = useCallback((product, quantity = 1, flavor = null) => {
    if (!product?.id) return false;

    if (product.availability === false) {
      toast.error("This product is out of stock");
      return false;
    }

    if (hasFlavors(product) && !flavor) {
      return false;
    }

    const selectedFlavor = flavor ? normaliseFlavor(flavor) : null;
    const lineKey = cartLineKey(product.id, selectedFlavor);
    let capped = false;

    setCartItems((prev) => {
      const existing = prev.find((item) => item.lineKey === lineKey);

      if (existing) {
        const wanted = existing.quantity + quantity;
        const next = Math.min(wanted, MAX_QUANTITY_PER_ITEM);
        capped = wanted > next;
        return prev.map((item) =>
          item.lineKey === lineKey ? { ...item, quantity: next } : item
        );
      }

      const next = Math.min(Math.max(1, quantity), MAX_QUANTITY_PER_ITEM);
      capped = quantity > next;
      return [...prev, { ...product, quantity: next, selectedFlavor, lineKey }];
    });

    if (capped) {
      toast.error(`Maximum ${MAX_QUANTITY_PER_ITEM} per product`);
    } else {
      toast.success("Added to cart!");
    }
    return true;
  }, []);

  const removeFromCart = useCallback((lineKey) => {
    setCartItems((prev) => prev.filter((item) => item.lineKey !== lineKey));
    toast.success("Removed from cart");
  }, []);

  const updateQuantity = useCallback(
    (lineKey, quantity) => {
      const wanted = toNumber(quantity, 0);

      if (wanted < 1) {
        removeFromCart(lineKey);
        return;
      }
      if (wanted > MAX_QUANTITY_PER_ITEM) {
        toast.error(`Maximum ${MAX_QUANTITY_PER_ITEM} per product`);
      }

      const next = Math.min(wanted, MAX_QUANTITY_PER_ITEM);
      setCartItems((prev) =>
        prev.map((item) => (item.lineKey === lineKey ? { ...item, quantity: next } : item))
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
