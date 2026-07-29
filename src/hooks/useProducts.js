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

  const getProductById = (id) => products.find((p) => p.id === Number(id));

  const getRelatedProducts = (productId, category, limit = 4) => {
    return products
      .filter((p) => p.id !== productId && p.category === category)
      .slice(0, limit);
  };

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
