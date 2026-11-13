import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useData } from "../../context/DataContext";
import { useTranslations } from "../../hooks/useTranslations";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import ImageUploader from "../../components/dashboard/ImageUploader";
import { PageHeader } from "../../components/dashboard/ui";

const BrandForm = ({ formData, setFormData, language, handleSave, onCancel, t }) => (
  <form onSubmit={handleSave} className="space-y-4">
    {/* The manual ID box that used to sit here was a leftover from the
        Firestore era. Ids are AUTO_INCREMENT now and the API ignores anything
        the client sends, so the field only ever misled. */}
    <div>
      <label className="block text-sm font-medium mb-1">{t("brand")}</label>
      <input required value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} className="input-field" />
    </div>
    
    <ImageUploader
      value={formData.logo}
      onChange={(img) => setFormData(p => ({ ...p, logo: img }))}
      label={language === "ar" ? "شعار الماركة" : "Brand Logo"}
    />

    <div className="flex gap-3 pt-4">
      <Button type="submit" className="flex-1">{t("save")}</Button>
      <Button type="button" variant="ghost" onClick={onCancel}>{t("cancel")}</Button>
    </div>
  </form>
);

const DashboardBrands = () => {
  const { language } = useLanguage();
  const { brands, products, addBrand, updateBrand, deleteBrand } = useData();
  const { t } = useTranslations();

  const [deleteModal, setDeleteModal] = useState({ open: false, brand: null });
  const [editModal, setEditModal] = useState({ open: false, brand: null });
  const [addModal, setAddModal] = useState(false);

  const emptyBrand = { name: "", logo: "" };
  const [formData, setFormData] = useState(emptyBrand);

  const handleSave = (e) => {
    e.preventDefault();
    if (addModal) {
      // No client-side id: the database assigns it. The old Date.now() string
      // was discarded by the API anyway.
      addBrand(formData);
      setAddModal(false);
    } else {
      updateBrand(editModal.brand.id, formData);
      setEditModal({ open: false, brand: null });
    }
    setFormData(emptyBrand);
  };

  const handleClose = () => {
    setAddModal(false);
    setEditModal({ open: false, brand: null });
    setFormData(emptyBrand);
  };

  return (
    <div>
      <div className="mb-8">
        <PageHeader title={t("brands")} subtitle={language === "ar" ? "الماركات المتاحة" : "Brands available in the store"}>
        <Button onClick={() => { setFormData(emptyBrand); setAddModal(true); }}>
          <Plus className="w-4 h-4" />
          {language === "ar" ? "إضافة ماركة" : "Add Brand"}
        </Button>
        </PageHeader>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card p-5">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">{language === "ar" ? "إجمالي الماركات" : "Total Brands"}</div>
          <div className="text-3xl font-bold text-primary">{brands?.length || 0}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {(brands || []).length === 0 ? (
          <p className="col-span-full card p-12 text-center text-gray-500 dark:text-gray-400">
            {language === "ar" ? "لسه مفيش ماركات" : "No brands yet"}
          </p>
        ) : (
          (brands || []).map((brand) => (
            <div key={brand.id} className="card p-4 flex flex-col items-center text-center gap-3">
              {/* Now that the logo actually persists, show it — falling back to
                  the initial when a brand has none. */}
              <div className="w-12 h-12 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center shrink-0 overflow-hidden">
                {brand.logo ? (
                  <img
                    src={brand.logo}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <span className="text-lg font-bold text-primary">
                    {brand?.name?.charAt(0)?.toUpperCase() || "B"}
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate w-full">
                {brand.name}
              </p>
              <p className="text-xs text-gray-400">
                {products.filter((p) => String(p.brand) === String(brand.id)).length}{" "}
                {language === "ar" ? "منتج" : "products"}
              </p>
              <div className="flex items-center gap-1 w-full pt-2 border-t border-gray-100 dark:border-slate-800">
                <button
                  onClick={() => { setFormData({ ...brand }); setEditModal({ open: true, brand }); }}
                  className="flex-1 py-1.5 rounded-lg text-primary hover:bg-primary/5 transition-colors flex items-center justify-center"
                  title={language === "ar" ? "تعديل" : "Edit"}
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteModal({ open: true, brand })}
                  className="flex-1 py-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center justify-center"
                  title={language === "ar" ? "حذف" : "Delete"}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal isOpen={addModal} onClose={handleClose} title={language === "ar" ? "إضافة ماركة" : "Add Brand"} size="md">
        <BrandForm formData={formData} setFormData={setFormData} language={language} handleSave={handleSave} onCancel={handleClose} t={t} />
      </Modal>

      <Modal isOpen={editModal.open} onClose={handleClose} title={t("edit")} size="md">
        <BrandForm formData={formData} setFormData={setFormData} language={language} handleSave={handleSave} onCancel={handleClose} t={t} />
      </Modal>

      <Modal isOpen={deleteModal.open} onClose={() => setDeleteModal({ open: false, brand: null })} title={language === "ar" ? "حذف الماركة" : "Delete Brand"} size="sm">
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          {language === "ar" ? `هل أنت متأكد من حذف "${deleteModal.brand?.name}"؟` : `Delete "${deleteModal.brand?.name}"?`}
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={() => setDeleteModal({ open: false, brand: null })}>{t("cancel")}</Button>
          <Button variant="danger" onClick={() => { deleteBrand(deleteModal.brand.id); setDeleteModal({ open: false, brand: null }); }}>{t("delete")}</Button>
        </div>
      </Modal>
    </div>
  );
};

export default DashboardBrands;