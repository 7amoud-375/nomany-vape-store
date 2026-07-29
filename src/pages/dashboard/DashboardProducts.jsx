import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, Copy, Eye, ImageIcon, Bell, Search } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useData } from "../../context/DataContext";
import { useTranslations } from "../../hooks/useTranslations";
import { formatPrice } from "../../utils";
import DataTable from "../../components/dashboard/DataTable";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import ImageUploader from "../../components/dashboard/ImageUploader";
import GalleryPicker from "../../components/dashboard/GalleryPicker";

// 1. ProductForm stays outside
const ProductForm = ({ formData, setFormData, language, t, brands, categories, handleSave, onCancel, openGallery }) => (
  <form onSubmit={handleSave} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
    <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-800">
      <div>
        <span className="text-sm font-bold text-gray-800 dark:text-white">
          {language === "ar" ? "حالة التوفر" : "Availability"}
        </span>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {formData.availability 
            ? (language === "ar" ? "المنتج متاح للبيع" : "Product is available for sale") 
            : (language === "ar" ? "المنتج غير متاح" : "Product is unavailable")}
        </p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
        <input 
          type="checkbox" 
          checked={formData.availability} 
          onChange={(e) => setFormData((p) => ({ ...p, availability: e.target.checked }))} 
          className="sr-only peer" 
        />
        <div className="w-12 h-7 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-500 peer-checked:bg-green-500"></div>
      </label>
    </div>

    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {language === "ar" ? "صورة المنتج" : "Product Image"}
      </label>
      <ImageUploader
        value={formData.images[0]}
        onChange={(src) => setFormData((p) => ({ ...p, images: [src] }))}
        language={language}
      />
      <button
        type="button"
        onClick={openGallery}
        className="flex items-center gap-2 text-sm text-primary hover:underline"
      >
        <ImageIcon className="w-4 h-4" />
        {language === "ar" ? "اختيار من المعرض" : "Choose from Gallery"}
      </button>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium mb-1">
          {language === "ar" ? "الاسم (عربي)" : "Name (Arabic)"}
        </label>
        <input
          required
          value={formData.nameAr}
          onChange={(e) => setFormData((p) => ({ ...p, nameAr: e.target.value }))}
          className="input-field"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">
          {language === "ar" ? "الاسم (English)" : "Name (English)"}
        </label>
        <input
          required
          value={formData.nameEn}
          onChange={(e) => setFormData((p) => ({ ...p, nameEn: e.target.value }))}
          className="input-field"
        />
      </div>
    </div>

    <div>
      <label className="block text-sm font-medium mb-1">
        {language === "ar" ? "الوصف (عربي)" : "Description (Arabic)"}
      </label>
      <textarea
        value={formData.descriptionAr}
        onChange={(e) => setFormData((p) => ({ ...p, descriptionAr: e.target.value }))}
        className="input-field resize-none"
        rows={2}
      />
    </div>
    <div>
      <label className="block text-sm font-medium mb-1">
        {language === "ar" ? "الوصف (English)" : "Description (English)"}
      </label>
      <textarea
        value={formData.descriptionEn}
        onChange={(e) => setFormData((p) => ({ ...p, descriptionEn: e.target.value }))}
        className="input-field resize-none"
        rows={2}
      />
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label className="block text-sm font-medium mb-1">{t("brand")}</label>
        <select
          value={formData.brand}
          onChange={(e) => setFormData((p) => ({ ...p, brand: e.target.value }))}
          className="input-field"
        >
          {brands.map((b) => (
            <option key={b.id} value={b.name}>
              {b.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">{t("category")}</label>
        <select
          value={formData.category}
          onChange={(e) => setFormData((p) => ({ ...p, category: e.target.value }))}
          className="input-field"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {language === "ar" ? c.nameAr : c.nameEn}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">SKU</label>
        <input
          value={formData.sku}
          onChange={(e) => setFormData((p) => ({ ...p, sku: e.target.value }))}
          className="input-field"
        />
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label className="block text-sm font-medium mb-1">{t("price")}</label>
        <input
          type="number"
          required
          value={formData.price}
          onChange={(e) => setFormData((p) => ({ ...p, price: e.target.value }))}
          className="input-field"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">{t("discountPrice")}</label>
        <input
          type="number"
          value={formData.discountPrice || ""}
          onChange={(e) => setFormData((p) => ({ ...p, discountPrice: e.target.value }))}
          className="input-field"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">{t("rating")}</label>
        <input
          type="number"
          step="0.1"
          min="0"
          max="5"
          value={formData.rating}
          onChange={(e) => setFormData((p) => ({ ...p, rating: e.target.value }))}
          className="input-field"
        />
      </div>
    </div>

    <div className="grid grid-cols-2 gap-4">
      {[
        { key: "featured", label: language === "ar" ? "مميز" : "Featured" },
        { key: "bestSeller", label: language === "ar" ? "الأكثر مبيعاً" : "Best Seller" },
        { key: "offer", label: language === "ar" ? "عرض" : "Offer" },
        { key: "newArrival", label: language === "ar" ? "جديد" : "New Arrival" },
      ].map(({ key, label }) => (
        <label key={key} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800">
          <input
            type="checkbox"
            checked={formData[key]}
            onChange={(e) => setFormData((p) => ({ ...p, [key]: e.target.checked }))}
            className="rounded text-primary w-4 h-4"
          />
          <span className="text-sm">{label}</span>
        </label>
      ))}
    </div>

    <div className="flex gap-3 pt-4">
      <Button type="submit" className="flex-1">
        {t("save")}
      </Button>
      <Button
        type="button"
        variant="ghost"
        onClick={onCancel}
      >
        {t("cancel")}
      </Button>
    </div>
  </form>
);

// 2. Main Dashboard Component
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
    brand: brands[0]?.name || "",
    category: categories[0]?.id || "",
    price: "",
    discountPrice: "",
    sku: "",
    images: [""],
    rating: 0,
    reviewsCount: 0,
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
      rating: Number(formData.rating) || 0,
      reviewsCount: Number(formData.reviewsCount) || 0,
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
    setFormData((p) => ({ ...p, images: [imageSrc] }));
  };

  const openAlertsModal = async (product) => {
    setAlertsModal({ open: true, product, loading: true, alerts: [] });
    const alerts = await fetchStockAlerts(product.id);
    setAlertsModal({ open: true, product, loading: false, alerts });
  };

  const handleMarkAlertsSent = async () => {
    const ids = alertsModal.alerts.map((a) => a.firebaseDocId);
    await resolveStockAlerts(ids);
    setAlertsModal({ open: false, product: null, loading: false, alerts: [] });
  };

  const isPhoneContact = (contact) => /^[+\d\s-]+$/.test(contact);

  const columns = [
    {
      key: "images",
      header: "",  
      render: (product) => (
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-slate-700">
          <img
            src={product?.images?.[0] || "https://placehold.co/100x100/004741/FFFFFF?text=P"}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.src = "https://placehold.co/100x100/004741/FFFFFF?text=P";
            }}
          />
        </div>
      ),
    },
    {
      key: "name",
      header: t("productName"),  
      render: (product) => (
        <span>{language === "ar" ? product?.nameAr : product?.nameEn}</span>
      ),
    },
    {
      key: "brand",
      header: t("brand"),
      render: (product) => <span>{product?.brand || "-"}</span>,
    },
    {
      key: "price",
      header: t("price"),
      render: (product) => (
        <div>
          {formatPrice(product?.discountPrice || product?.price || 0, language)}
          {product?.discountPrice && (
            <span className="text-xs text-gray-400 line-through ml-2">
              {formatPrice(product?.price, language)}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "category",
      header: t("category"),
      render: (product) => {
        const cat = categories.find((c) => c.id === product?.category);
        return <span>{cat ? (language === "ar" ? cat.nameAr : cat.nameEn) : product?.category || "-"}</span>;
      },
    },
    {
      key: "availability",
      header: t("availability"),
      render: (product) => (
        <span
          className={`px-2 py-1 rounded-lg text-xs font-medium ${
            product?.availability ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}
        >
          {product?.availability ? t("inStock") : t("outOfStock")}
        </span>
      ),
    },
    {
      key: "actions",
      header: t("actions") || "Actions",
      render: (product) => (
        <div className="flex items-center gap-1">
          <Link
            to={`/products/${product?.id}`}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500"
          >
            <Eye className="w-4 h-4" />
          </Link>
          <button
            onClick={() => handleEdit(product)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-blue-500"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => duplicateProduct(product)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500"
          >
            <Copy className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => openAlertsModal(product)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-amber-500"
            title={language === "ar" ? "طلبات التنبيه" : "Notify Requests"}
          >
            <Bell className="w-4 h-4" />
          </button>

          <button
            onClick={() => setDeleteModal({ open: true, product })}
            className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("products")}</h1>
        <Button onClick={handleAdd}>
          <Plus className="w-4 h-4" />
          {t("addProduct")}
        </Button>
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

      <div className="card overflow-hidden">
        {/* CHANGED: Pass filteredProducts to DataTable */}
        <DataTable columns={columns} data={filteredProducts} />
      </div>

      <Modal isOpen={addModal} onClose={() => setAddModal(false)} title={t("addProduct")} size="lg">
        <ProductForm 
          formData={formData} 
          setFormData={setFormData} 
          language={language} 
          t={t} 
          brands={brands} 
          categories={categories} 
          handleSave={handleSave} 
          onCancel={() => setAddModal(false)} 
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
          onCancel={() => setEditModal({ open: false, product: null })} 
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
                <div key={alert.firebaseDocId} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
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