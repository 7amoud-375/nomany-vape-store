import { useData } from "../context/DataContext";
import { useMemo } from "react";

export const useProducts = () => {
  const { products } = useData();

  const featuredProducts = useMemo(
    () => products.filter((p) => p.featured),
    [products]
  );

  const bestSellers = useMemo(
    () => products.filter((p) => p.bestSeller),
    [products]
  );

  const newArrivals = useMemo(
    () => products.filter((p) => p.newArrival),
    [products]
  );

  const offers = useMemo(
    () => products.filter((p) => p.offer || p.discountPrice),
    [products]
  );

  /**
   * Ids are compared as strings on both sides.
   *
   * This used to coerce with Number(), which worked only for the original seed
   * products (1..16). Anything added from the dashboard gets a generated id
   * like "m4x8z2ka9f", and Number() turns that into NaN — so every new product
   * opened to "No products found".
   */
  const getProductById = (id) =>
    products.find((p) => String(p.id) === String(id));

  const getRelatedProducts = (productId, category, limit = 4) =>
    products
      .filter(
        (p) => String(p.id) !== String(productId) && String(p.category) === String(category)
      )
      .slice(0, limit);

  return {
    products,
    featuredProducts,
    bestSellers,
    newArrivals,
    offers,
    getProductById,
    getRelatedProducts,
  };
};

export default useProducts;
