import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, Copy, Bell, Search } from "lucide-react";
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
  const { products, categories, brands, addProduct, updateProduct, deleteProduct, duplicateProduct, fetchStockAlerts, resolveStockAlerts } = useData();
  const { t } = useTranslations();

  const [deleteModal, setDeleteModal] = useState({ open: false, product: null });
  const [editModal, setEditModal] = useState({ open: false, product: null });
  const [addModal, setAddModal] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  
  // ADDED: Search state
  const [searchQuery, setSearchQuery] = useState("");

  // State for Notify Alerts Modal
  const [alertsModal, setAlertsModal] = useState({ open: false, product: null, loading: false, alerts: [] });

  const emptyProduct = {
    nameAr: "",
    nameEn: "",
    descriptionAr: "",
    descriptionEn: "",
    brand: brands[0]?.id || "",
    category: categories[0]?.id || "",
    price: "",
    discountPrice: "",
    sku: "",
    images: [],
    availability: true,
    featured: false,
    bestSeller: false,
    offer: false,
    newArrival: false,
    tags: [],
  };

  const [formData, setFormData] = useState(emptyProduct);

  // ADDED: Filter products based on search query
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const lowerQuery = searchQuery.toLowerCase().trim();
    return products.filter(p => 
      p.nameAr?.toLowerCase().includes(lowerQuery) ||
      p.nameEn?.toLowerCase().includes(lowerQuery) ||
      p.brand?.toLowerCase().includes(lowerQuery) ||
      p.sku?.toLowerCase().includes(lowerQuery)
    );
  }, [products, searchQuery]);

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

  const openAlertsModal = async (product) => {
    setAlertsModal({ open: true, product, loading: true, alerts: [] });
    const alerts = await fetchStockAlerts(product.id);
    setAlertsModal({ open: true, product, loading: false, alerts });
  };

  const handleMarkAlertsSent = async () => {
    const ids = alertsModal.alerts.map((a) => a.id);
    await resolveStockAlerts(ids);
    setAlertsModal({ open: false, product: null, loading: false, alerts: [] });
  };

  const isPhoneContact = (contact) => /^[+\d\s-]+$/.test(contact);


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

      <CardGrid
        isEmpty={filteredProducts.length === 0}
        empty={
          searchQuery
            ? language === "ar" ? "مفيش نتائج للبحث ده" : "No products match that search"
            : language === "ar" ? "لسه مفيش منتجات — ابدأ بإضافة واحد" : "No products yet — add your first one"
        }
      >
        {filteredProducts.map((product, index) => {
          const brand = brands.find((b) => b.id === product?.brand);
          const category = categories.find((c) => c.id === product?.category);
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
                { icon: Bell, label: "Notify requests", onClick: () => openAlertsModal(product) },
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

      <Modal
        isOpen={alertsModal.open}
        onClose={() => setAlertsModal({ open: false, product: null, loading: false, alerts: [] })}
        title={language === "ar" ? "طلبات التنبيه عند التوفر" : "Notify Requests"}
        size="md"
      >
        {alertsModal.loading ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm">{language === "ar" ? "جاري التحميل..." : "Loading..."}</p>
        ) : alertsModal.alerts.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {language === "ar" ? "لا يوجد أحد مسجل لهذا المنتج حاليًا" : "No one is waiting on this product right now."}
          </p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {alertsModal.alerts.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{alert.contact}</span>
                  {isPhoneContact(alert.contact) ? (
                    <a
                      href={`https://wa.me/${alert.contact.replace(/\D/g, "")}?text=${encodeURIComponent(
                        language === "ar"
                          ? `منتج "${alertsModal.product?.nameAr}" بقى متوفر تاني!`
                          : `"${alertsModal.product?.nameEn}" is back in stock!`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-green-600 hover:underline"
                    >
                      WhatsApp
                    </a>
                  ) : (
                    <a
                      href={`mailto:${alert.contact}?subject=${encodeURIComponent(
                        language === "ar" ? "المنتج بقى متوفر!" : "Back in stock!"
                      )}`}
                      className="text-xs font-medium text-blue-600 hover:underline"
                    >
                      Email
                    </a>
                  )}
                </div>
              ))}
            </div>
            <Button className="w-full" onClick={handleMarkAlertsSent}>
              {language === "ar" ? "تم التبليغ - إغلاق القائمة" : "Mark all as notified"}
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DashboardProducts;