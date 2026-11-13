import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, Copy, Search, AlertTriangle } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useData } from "../../context/DataContext";
import { useTranslations } from "../../hooks/useTranslations";
import { formatPrice, effectivePrice, productImage } from "../../utils";
import { CardGrid, AdminCard } from "../../components/dashboard/AdminCardGrid";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import ProductForm from "../../components/dashboard/ProductForm";
import GalleryPicker from "../../components/dashboard/GalleryPicker";
import { PageHeader } from "../../components/dashboard/ui";

const DashboardProducts = () => {
  const { language } = useLanguage();
  const { products, categories, brands, addProduct, updateProduct, deleteProduct, duplicateProduct } = useData();
  const { t } = useTranslations();

  const [deleteModal, setDeleteModal] = useState({ open: false, product: null });
  const [editModal, setEditModal] = useState({ open: false, product: null });
  const [addModal, setAddModal] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  
  // ADDED: Search state
  const [searchQuery, setSearchQuery] = useState("");

  const emptyProduct = {
    nameAr: "",
    nameEn: "",
    descriptionAr: "",
    descriptionEn: "",
    // Left unset, not defaulted to the first brand/category: ProductForm's
    // <select> only shows an unset state when the value is "", and defaulting
    // here to brands[0]/categories[0] silently assigned every new product to
    // whichever happened to be first, without the admin ever touching the
    // dropdown — the exact bug the empty placeholder option was added to
    // prevent, just from the opposite direction.
    brand: "",
    category: "",
    price: "",
    discountPrice: "",
    sku: "",
    images: [],
    flavors: [],
    availability: true,
    featured: false,
    bestSeller: false,
    offer: false,
    newArrival: false,
  };

  const [formData, setFormData] = useState(emptyProduct);

  /*
   * `p.brand?.toLowerCase()` used to throw here. Optional chaining only guards
   * null and undefined — brand is a number now, and Number has no toLowerCase,
   * so searching crashed the page as soon as any product had a brand. Every
   * field is coerced, and brand/category match on their names rather than the
   * numeric id nobody types.
   */
  const filteredProducts = useMemo(() => {
    const needle = searchQuery.toLowerCase().trim();
    if (!needle) return products;

    const has = (value) => String(value ?? "").toLowerCase().includes(needle);
    const nameOf = (collection, id, ...fields) => {
      const row = collection.find((item) => String(item.id) === String(id));
      return row ? fields.map((f) => row[f]).filter(Boolean).join(" ") : "";
    };

    return products.filter(
      (p) =>
        has(p?.nameAr) ||
        has(p?.nameEn) ||
        has(p?.sku) ||
        has(nameOf(brands, p?.brand, "name")) ||
        has(nameOf(categories, p?.category, "nameAr", "nameEn"))
    );
  }, [products, searchQuery, brands, categories]);

  const handleAdd = () => {
    setFormData(emptyProduct);
    setAddModal(true);
  };

  const handleEdit = (product) => {
    setFormData({ ...product });
    setEditModal({ open: true, product });
  };

  const handleSave = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      price: Number(formData.price),
      discountPrice: formData.discountPrice ? Number(formData.discountPrice) : null,
      // Blank slots would render as broken thumbnails on the storefront.
      images: (formData.images || []).filter((src) => typeof src === "string" && src.trim() !== ""),
      // Optional, bilingual, trimmed the same way — a name typed then deleted
      // down to whitespace should not survive as an empty chip, and a legacy
      // single-string flavour (from before this carried two names) is folded
      // into the same {nameAr, nameEn} shape rather than left inconsistent.
      flavors: (formData.flavors || [])
        .map((flavor) => {
          const shape = typeof flavor === "string" ? { nameAr: flavor, nameEn: "" } : flavor || {};
          return {
            nameAr: String(shape.nameAr ?? "").trim(),
            nameEn: String(shape.nameEn ?? "").trim(),
          };
        })
        .filter((flavor) => flavor.nameAr || flavor.nameEn),
    };
    if (addModal) {
      addProduct(data);
      setAddModal(false);
    } else {
      updateProduct(editModal.product.id, data);
      setEditModal({ open: false, product: null });
    }
    setFormData(emptyProduct);
  };

  const openGallery = () => {
    setGalleryOpen(true);
  };

  const handleGallerySelect = (imageSrc) => {
    setFormData((p) => ({ ...p, images: [...(p.images || []).filter(Boolean), imageSrc] }));
  };

  /*
   * Products with no category are invisible on every category page, so the
   * shop looks empty even when the catalogue is full. The old product form
   * saved an empty category whenever the admin never opened the dropdown, so
   * there can be a lot of them — fixing that one product at a time before
   * launch is busywork. This assigns a category to all of them at once.
   */
  const uncategorised = useMemo(
    () =>
      products.filter(
        (p) => p?.category === null || p?.category === undefined || p?.category === "" || Number(p.category) === 0
      ),
    [products]
  );

  const [bulkCategory, setBulkCategory] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);

  const assignCategoryToAll = async () => {
    const categoryId = Number(bulkCategory);
    if (!categoryId) return;

    setBulkBusy(true);
    try {
      // Sequential on purpose: shared hosting would rather have a short queue
      // than fifty simultaneous writes.
      for (const product of uncategorised) {
        await updateProduct(product.id, { ...product, category: categoryId });
      }
    } finally {
      setBulkBusy(false);
      setBulkCategory("");
    }
  };

  return (
    <div>
      <div className="mb-8">
        <PageHeader title={t("products")} subtitle={language === "ar" ? "إدارة الكتالوج والأسعار" : "Manage your catalogue and pricing"}>
        <Button onClick={handleAdd}>
          <Plus className="w-4 h-4" />
          {t("addProduct")}
        </Button>
        </PageHeader>
      </div>

      {/* SEARCH INPUT - This is the one that works */}
      <div className="mb-6 relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder={language === "ar" ? "ابحث باسم المنتج، الماركة، أو SKU..." : "Search by name, brand, or SKU..."}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input-field ps-10 pe-4 w-full max-w-md"
        />
      </div>

      {/* Only appears while there is something to fix. */}
      {uncategorised.length > 0 && categories.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4
                        dark:border-amber-900/50 dark:bg-amber-900/20">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="min-w-0 flex-1 text-sm text-amber-900 dark:text-amber-200">
            {language === "ar"
              ? `${uncategorised.length} منتج من غير قسم — مش هيظهروا في أي صفحة قسم على الموقع.`
              : `${uncategorised.length} product${uncategorised.length === 1 ? "" : "s"} have no category — they will not appear on any category page.`}
          </p>

          <select
            value={bulkCategory}
            onChange={(e) => setBulkCategory(e.target.value)}
            className="input-field w-auto py-2 text-sm"
            aria-label={language === "ar" ? "اختر القسم" : "Choose a category"}
          >
            <option value="">{language === "ar" ? "اختر القسم…" : "Choose a category…"}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {language === "ar" ? c.nameAr : c.nameEn}
              </option>
            ))}
          </select>

          <Button onClick={assignCategoryToAll} disabled={!bulkCategory || bulkBusy}>
            {bulkBusy
              ? language === "ar" ? "جاري الحفظ…" : "Saving…"
              : language === "ar"
              ? `عيّن للكل (${uncategorised.length})`
              : `Assign to all (${uncategorised.length})`}
          </Button>
        </div>
      )}

      <CardGrid
        isEmpty={filteredProducts.length === 0}
        empty={
          searchQuery
            ? language === "ar" ? "مفيش نتائج للبحث ده" : "No products match that search"
            : language === "ar" ? "لسه مفيش منتجات — ابدأ بإضافة واحد" : "No products yet — add your first one"
        }
      >
        {filteredProducts.map((product, index) => {
          // Compared as strings: a freshly-saved product carries whatever the
          // form produced until the next reload replaces it from the server.
          const brand = brands.find((b) => String(b.id) === String(product?.brand));
          const category = categories.find((c) => String(c.id) === String(product?.category));
          const discounted = effectivePrice(product) < Number(product?.price);

          return (
            <AdminCard
              key={product.id}
              index={index}
              image={productImage(product)}
              title={language === "ar" ? product?.nameAr : product?.nameEn}
              subtitle={[brand?.name, category && (language === "ar" ? category.nameAr : category.nameEn)]
                .filter(Boolean)
                .join(" · ")}
              badges={[
                product?.availability
                  ? { label: language === "ar" ? "متوفر" : "In stock", className: "bg-green-500/90 text-white" }
                  : { label: language === "ar" ? "نافد" : "Out", className: "bg-red-500/90 text-white" },
                ...(category
                  ? []
                  : [{ label: language === "ar" ? "بدون قسم" : "No category", className: "bg-amber-500/90 text-white" }]),
                ...(product?.featured ? [{ label: language === "ar" ? "مميز" : "Featured", className: "bg-primary/90 text-white" }] : []),
                ...((product?.images?.length ?? 0) > 1
                  ? [{ label: `${product.images.length} 🖼`, className: "bg-black/60 text-white" }]
                  : []),
              ]}
              meta={
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-primary">{formatPrice(effectivePrice(product), language)}</span>
                  {discounted && (
                    <span className="text-xs text-gray-400 line-through">
                      {formatPrice(product.price, language)}
                    </span>
                  )}
                </div>
              }
              actions={[
                { icon: Pencil, label: t("edit") || "Edit", tone: "primary", onClick: () => handleEdit(product) },
                { icon: Copy, label: "Duplicate", onClick: () => duplicateProduct(product) },
                // The bell that used to sit here opened a per-product alerts
                // modal. Dashboard -> Stock alerts now owns that, grouped by
                // product and updating in real time.
                { icon: Trash2, label: t("delete") || "Delete", tone: "danger", onClick: () => setDeleteModal({ open: true, product }) },
              ]}
            />
          );
        })}
      </CardGrid>

      <Modal isOpen={addModal} onClose={() => setAddModal(false)} title={t("addProduct")} size="lg">
        <ProductForm 
          formData={formData} 
          setFormData={setFormData} 
          language={language} 
          t={t} 
          brands={brands} 
          categories={categories} 
          handleSave={handleSave} 
          onCancel={() => setAddModal(false)} isEdit={false} 
          openGallery={openGallery} 
        />
      </Modal>

      <Modal isOpen={editModal.open} onClose={() => setEditModal({ open: false, product: null })} title={t("editProduct")} size="lg">
        <ProductForm 
          formData={formData} 
          setFormData={setFormData} 
          language={language} 
          t={t} 
          brands={brands} 
          categories={categories} 
          handleSave={handleSave} 
          onCancel={() => setEditModal({ open: false, product: null })} isEdit 
          openGallery={openGallery} 
        />
      </Modal>

      <Modal isOpen={deleteModal.open} onClose={() => setDeleteModal({ open: false, product: null })} title={t("deleteProduct")} size="sm">
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          {language === "ar"
            ? `هل أنت متأكد من حذف "${deleteModal.product?.nameAr}"؟`
            : `Are you sure you want to delete "${deleteModal.product?.nameEn}"?`}
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={() => setDeleteModal({ open: false, product: null })}>
            {t("cancel")}
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              deleteProduct(deleteModal.product.id);
              setDeleteModal({ open: false, product: null });
            }}
          >
            {t("delete")}
          </Button>
        </div>
      </Modal>

      <GalleryPicker
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        onSelect={handleGallerySelect}
        language={language}
      />

    </div>
  );
};

export default DashboardProducts;