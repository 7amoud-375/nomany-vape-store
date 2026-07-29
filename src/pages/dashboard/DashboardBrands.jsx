import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useData } from "../../context/DataContext";
import { useTranslations } from "../../hooks/useTranslations";
import DataTable from "../../components/dashboard/DataTable";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import ImageUploader from "../../components/dashboard/ImageUploader";

const BrandForm = ({ formData, setFormData, language, handleSave, onCancel, t }) => (
  <form onSubmit={handleSave} className="space-y-4">
    <div>
      <label className="block text-sm font-medium mb-1">ID</label>
      <input required value={formData.id} onChange={(e) => setFormData(p => ({ ...p, id: e.target.value }))} className="input-field" placeholder="SMOK, Voopoo, etc." />
    </div>
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
  const { brands, addBrand, updateBrand, deleteBrand } = useData();
  const { t } = useTranslations();

  const [deleteModal, setDeleteModal] = useState({ open: false, brand: null });
  const [editModal, setEditModal] = useState({ open: false, brand: null });
  const [addModal, setAddModal] = useState(false);

  const emptyBrand = { id: "", name: "", logo: "" };
  const [formData, setFormData] = useState(emptyBrand);

  const handleSave = (e) => {
    e.preventDefault();
    if (addModal) {
      addBrand({ ...formData, id: formData.id || Date.now().toString() });
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

  const columns = [
    {
      key: "logo",
      label: "",
      render: (item) => {
        const initial = item?.name?.charAt(0)?.toUpperCase() || "B";
        return (
          <div className="w-10 h-10 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
            <span className="text-lg font-bold text-primary">{initial}</span>
          </div>
        );
      },
    },
    { key: "name", label: t("brand") },
  ];

  const actions = (row) => (
    <>
      <button onClick={() => { setFormData({ ...row }); setEditModal({ open: true, brand: row }); }} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-blue-500">
        <Pencil className="w-4 h-4" />
      </button>
      <button onClick={() => setDeleteModal({ open: true, brand: row })} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500">
        <Trash2 className="w-4 h-4" />
      </button>
    </>
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("brands")}</h1>
        <Button onClick={() => { setFormData(emptyBrand); setAddModal(true); }}>
          <Plus className="w-4 h-4" />
          {language === "ar" ? "إضافة ماركة" : "Add Brand"}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card p-5">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">{language === "ar" ? "إجمالي الماركات" : "Total Brands"}</div>
          <div className="text-3xl font-bold text-primary">{brands?.length || 0}</div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <DataTable columns={columns} data={brands} actions={actions} />
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