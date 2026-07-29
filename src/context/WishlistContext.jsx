import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getLocalStorage, setLocalStorage } from "../utils";
import { LOCAL_STORAGE_KEYS } from "../constants";
import toast from "react-hot-toast";

const WishlistContext = createContext();

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
};

export const WishlistProvider = ({ children }) => {
  const [wishlist, setWishlist] = useState(() => {
    return getLocalStorage(LOCAL_STORAGE_KEYS.WISHLIST, []);
  });

  useEffect(() => {
    setLocalStorage(LOCAL_STORAGE_KEYS.WISHLIST, wishlist);
  }, [wishlist]);

  const addToWishlist = useCallback((product) => {
    setWishlist((prev) => {
      if (prev.some((item) => item.id === product.id)) {
        return prev;
      }
      return [...prev, product];
    });
    toast.success("Added to wishlist!");
  }, []);

  const removeFromWishlist = useCallback((productId) => {
    setWishlist((prev) => prev.filter((item) => item.id !== productId));
    toast.success("Removed from wishlist");
  }, []);

  const isInWishlist = useCallback(
    (productId) => wishlist.some((item) => item.id === productId),
    [wishlist]
  );

  const toggleWishlist = useCallback(
    (product) => {
      if (isInWishlist(product.id)) {
        removeFromWishlist(product.id);
      } else {
        addToWishlist(product);
      }
    },
    [isInWishlist, addToWishlist, removeFromWishlist]
  );

  return (
    <WishlistContext.Provider
      value={{ wishlist, addToWishlist, removeFromWishlist, isInWishlist, toggleWishlist }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export default WishlistContext;
