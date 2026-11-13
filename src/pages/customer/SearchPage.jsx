import { useState, useMemo, useEffect } from "react";
import SectionDecoration from "../../components/common/SectionDecoration";
import { useSearchParams, Link } from "react-router-dom";
import { Search, X, PackageSearch, Layers } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useData } from "../../context/DataContext";
import { useTranslations } from "../../hooks/useTranslations";
import { searchProducts } from "../../utils";
import SectionTitle from "../../components/common/SectionTitle";
import ProductGrid from "../../components/product/ProductGrid";

const SearchPage = () => {
  const { language } = useLanguage();
  const { products, categories, brands } = useData();
  const { t } = useTranslations();
  const [searchParams, setSearchParams] = useSearchParams();

  const query = searchParams.get("q") || "";
  const [searchInput, setSearchInput] = useState(query);

  /*
   * Keep the box in step with the URL.
   *
   * useState only reads its initial value on mount, and searching from the
   * navbar while already on this page does not remount it — so the results
   * changed while the box still showed the previous term.
   */
  useEffect(() => {
    setSearchInput(query);
  }, [query]);

  const lowerQuery = query.toLowerCase().trim();

  const productResults = useMemo(() => {
    return searchProducts(products, query, language, { categories, brands });
  }, [products, query, language, categories, brands]);

  /**
   * Every field is coerced with String() before matching.
   *
   * `c.id.toLowerCase()` used to throw here: category ids are integers now that
   * they come from MySQL, and Number has no toLowerCase. The exception escaped
   * the render and blanked the whole search page the moment anything was typed.
   */
  const categoryResults = useMemo(() => {
    if (!lowerQuery) return [];
    const has = (value) => String(value ?? "").toLowerCase().includes(lowerQuery);

    return categories.filter(
      (c) =>
        has(c.nameAr) ||
        has(c.nameEn) ||
        has(c.descriptionAr) ||
        has(c.descriptionEn)
    );
  }, [categories, lowerQuery]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setSearchParams({ q: searchInput.trim() });
    }
  };

  const totalResults = productResults.length + categoryResults.length;

  return (
    <div className="relative overflow-hidden pt-24 pb-20">
      <SectionDecoration variant="hatch" position="top-end" size="w-64 h-64" tone="text-primary" />
      <div className="container-custom">
        <SectionTitle
          title={t("search")}
          subtitle={query ? `${totalResults} ${t("results")}` : t("searchPlaceholder")}
        />

        {/*
          Sticky, so a new search is always one click away no matter how far
          down the results you have scrolled. The backdrop blur keeps the
          results legible as they pass underneath.
        */}
        <form
          onSubmit={handleSearch}
          role="search"
          className="sticky top-20 z-30 mx-auto mb-12 max-w-2xl rounded-2xl
                     bg-surface/80 py-2 backdrop-blur-md"
        >
          <div className="relative">
            <Search className="absolute start-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            <label htmlFor="search-again" className="sr-only">
              {t("searchPlaceholder")}
            </label>
            <input
              id="search-again"
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-full ps-12 pe-12 py-4 rounded-2xl input-field text-lg"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => { setSearchInput(""); setSearchParams({}); }}
                aria-label={language === "ar" ? "مسح البحث" : "Clear search"}
                className="absolute end-4 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            )}
          </div>
        </form>

        {/* No Results State */}
        {query && totalResults === 0 && (
          <div className="text-center py-20">
            <PackageSearch className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-xl font-medium text-gray-600 dark:text-gray-300 mb-2">{t("noSearchResults")}</p>
            <p className="text-gray-400">
              {language === "ar" ? `لم نجد أي نتائج لـ "${query}"` : `No results found for "${query}"`}
            </p>
          </div>
        )}

        {/* Results */}
        {query && totalResults > 0 && (
          <div className="space-y-12">
            
            {/* Categories Section */}
            {categoryResults.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <Layers className="w-6 h-6 text-primary" />
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {language === "ar" ? "الأقسام" : "Categories"} 
                    <span className="text-base font-normal text-gray-500 ms-2">({categoryResults.length})</span>
                  </h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {categoryResults.map((category) => (
                    <Link 
                      key={category.id} 
                      to={`/categories/${category.id}`}
                      className="group block relative aspect-square rounded-2xl overflow-hidden bg-gray-100 dark:bg-slate-700"
                    >
                      <img
                        src={category.image}
                        alt={language === "ar" ? category.nameAr : category.nameEn}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        onError={(e) => {
                          e.target.src = `https://placehold.co/400x400/004741/FFFFFF?text=${encodeURIComponent(language === "ar" ? category.nameAr : category.nameEn)}`;
                        }}
                      />
                      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors flex items-end p-4">
                        <h3 className="text-lg font-bold text-white">
                          {language === "ar" ? category.nameAr : category.nameEn}
                        </h3>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Products Section */}
            {productResults.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <PackageSearch className="w-6 h-6 text-primary" />
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {language === "ar" ? "المنتجات" : "Products"}
                    <span className="text-base font-normal text-gray-500 ms-2">({productResults.length})</span>
                  </h2>
                </div>
                <ProductGrid products={productResults} />
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;