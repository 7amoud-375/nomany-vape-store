import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { SlidersHorizontal, Grid3X3, LayoutList, X } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useData } from "../../context/DataContext";
import { useTranslations } from "../../hooks/useTranslations";
import { filterProducts, sortProducts } from "../../utils";
import { SORT_OPTIONS } from "../../constants";
import SectionTitle from "../../components/common/SectionTitle";
import ProductGrid from "../../components/product/ProductGrid";
import Button from "../../components/ui/Button";

// ========== FILTER CONTENT COMPONENT (OUTSIDE main component) ==========
const FilterContent = ({ 
  filters, 
  setFilters, 
  language, 
  t, 
  categories, 
  brands, 
  filteredProductsCount, 
  onApply, 
  isMobile 
}) => (
  <div className="space-y-6">
    {/* Category */}
    <div>
      <h4 className="font-semibold text-gray-900 dark:text-white mb-3">{t("category")}</h4>
      <div className="space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="category"
            checked={filters.category === "all"}
            onChange={() => setFilters((p) => ({ ...p, category: "all" }))}
            className="text-primary"
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">{t("all")}</span>
        </label>
        {categories.map((cat) => (
          <label key={cat.id} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="category"
              checked={filters.category === cat.id}
              onChange={() => setFilters((p) => ({ ...p, category: cat.id }))}
              className="text-primary"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {language === "ar" ? cat.nameAr : cat.nameEn}
            </span>
          </label>
        ))}
      </div>
    </div>

    {/* Brand */}
    <div>
      <h4 className="font-semibold text-gray-900 dark:text-white mb-3">{t("brand")}</h4>
      <select
        value={filters.brand}
        onChange={(e) => setFilters((p) => ({ ...p, brand: e.target.value }))}
        className="input-field text-sm"
      >
        <option value="all">{t("all")}</option>
        {brands.map((b) => (
          <option key={b.id} value={b.id}>{b.name}</option>
        ))}
      </select>
    </div>

    {/* Price */}
    <div>
      <h4 className="font-semibold text-gray-900 dark:text-white mb-3">{t("price")}</h4>
      <div className="flex items-center gap-2">
        <input
          type="number"
          placeholder={t("from")}
          value={filters.minPrice}
          onChange={(e) => setFilters((p) => ({ ...p, minPrice: e.target.value }))}
          className="input-field text-sm py-2"
        />
        <span className="text-gray-400">-</span>
        <input
          type="number"
          placeholder={t("to")}
          value={filters.maxPrice}
          onChange={(e) => setFilters((p) => ({ ...p, maxPrice: e.target.value }))}
          className="input-field text-sm py-2"
        />
      </div>
    </div>

    {/* Offers */}
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={filters.offer}
        onChange={(e) => setFilters((p) => ({ ...p, offer: e.target.checked }))}
        className="rounded text-primary"
      />
      <span className="text-sm text-gray-600 dark:text-gray-400">{t("offer")}</span>
    </label>

    {/* Mobile: Apply button */}
    {isMobile && (
      <div className="pt-4 border-t border-gray-100 dark:border-slate-700">
        <Button onClick={onApply} className="w-full">
          {language === "ar" ? "عرض النتائج" : "Show Results"} ({filteredProductsCount})
        </Button>
      </div>
    )}
  </div>
);

const ProductsPage = () => {
  const { language } = useLanguage();
  const { products, categories, brands } = useData();
  const { t } = useTranslations();
  const [searchParams, setSearchParams] = useSearchParams();

  const [filters, setFilters] = useState({
    category: searchParams.get("category") || "all",
    brand: "all",
    minPrice: "",
    maxPrice: "",
    offer: false,
  });
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const filteredProducts = useMemo(() => {
    let result = filterProducts(products, {
      category: filters.category === "all" ? undefined : filters.category,
      brand: filters.brand === "all" ? undefined : filters.brand,
      minPrice: filters.minPrice ? Number(filters.minPrice) : undefined,
      maxPrice: filters.maxPrice ? Number(filters.maxPrice) : undefined,
      offer: filters.offer || undefined,
    });
    return sortProducts(result, sortBy);
  }, [products, filters, sortBy]);

  const clearFilters = () => {
    setFilters({
      category: "all",
      brand: "all",
      minPrice: "",
      maxPrice: "",
      offer: false,
    });
  };

  const hasActiveFilters =
    filters.category !== "all" ||
    filters.brand !== "all" ||
    filters.minPrice ||
    filters.maxPrice ||
    filters.offer;

  return (
    <div className="pt-24 pb-20">
      <div className="container-custom">
        <SectionTitle
          title={t("products")}
          subtitle={language === "ar" ? "اكتشف تشكيلتنا الواسعة من المنتجات" : "Discover our wide range of products"}
        />

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            {/* Desktop filter toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={`hidden lg:flex ${showFilters ? "bg-primary/10 text-primary" : ""}`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              {t("filter")}
            </Button>

            {/* Mobile filter button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMobileFilters(true)}
              className="lg:hidden"
            >
              <SlidersHorizontal className="w-4 h-4" />
              {t("filter")}
              {hasActiveFilters && (
                <span className="ml-1.5 w-2 h-2 bg-primary rounded-full" />
              )}
            </Button>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-red-500 hover:text-red-600 flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                {t("clear")}
              </button>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="input-field py-2 text-sm w-48"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {language === "ar" ? opt.labelAr : opt.labelEn}
                </option>
              ))}
            </select>

            {/* View Mode */}
            <div className="hidden sm:flex items-center border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 ${viewMode === "grid" ? "bg-primary text-white" : "text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800"}`}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 ${viewMode === "list" ? "bg-primary text-white" : "text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800"}`}
              >
                <LayoutList className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile: Active filter chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mb-4 lg:hidden">
            {filters.category !== "all" && (
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center gap-1">
                {language === "ar" 
                  ? categories.find(c => c.id === filters.category)?.nameAr 
                  : categories.find(c => c.id === filters.category)?.nameEn}
                <button onClick={() => setFilters(p => ({ ...p, category: "all" }))}><X className="w-3 h-3" /></button>
              </span>
            )}
            {filters.brand !== "all" && (
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center gap-1">
                {brands.find(b => b.id === filters.brand)?.name}
                <button onClick={() => setFilters(p => ({ ...p, brand: "all" }))}><X className="w-3 h-3" /></button>
              </span>
            )}
            {filters.offer && (
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center gap-1">
                {t("offer")}
                <button onClick={() => setFilters(p => ({ ...p, offer: false }))}><X className="w-3 h-3" /></button>
              </span>
            )}
          </div>
        )}

        <div className="flex gap-8">
          {/* Desktop Filters Sidebar */}
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="w-64 flex-shrink-0 hidden lg:block"
            >
              <div className="card p-6">
                <FilterContent
                  filters={filters}
                  setFilters={setFilters}
                  language={language}
                  t={t}
                  categories={categories}
                  brands={brands}
                  filteredProductsCount={filteredProducts.length}
                  isMobile={false}
                />
              </div>
            </motion.div>
          )}

          {/* Products */}
          <div className="flex-1">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {filteredProducts.length} {t("products")}
            </p>
            <ProductGrid products={filteredProducts} emptyMessage={t("noProducts")} />
          </div>
        </div>
      </div>

      {/* Mobile Filter Bottom Sheet */}
      <AnimatePresence>
        {showMobileFilters && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMobileFilters(false)}
              className="fixed inset-0 bg-black/50 z-50 lg:hidden"
            />
            {/* Sheet */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 rounded-t-2xl z-50 lg:hidden max-h-[80vh] overflow-hidden flex flex-col"
            >
              {/* Handle */}
              <div className="flex items-center justify-center pt-3 pb-1">
                <div className="w-12 h-1.5 rounded-full bg-gray-300 dark:bg-slate-600" />
              </div>
              
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-slate-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {language === "ar" ? "الفلاتر" : "Filters"}
                </h3>
                <button 
                  onClick={() => setShowMobileFilters(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto p-5">
                <FilterContent
                  filters={filters}
                  setFilters={setFilters}
                  language={language}
                  t={t}
                  categories={categories}
                  brands={brands}
                  filteredProductsCount={filteredProducts.length}
                  onApply={() => setShowMobileFilters(false)}
                  isMobile={true}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProductsPage;