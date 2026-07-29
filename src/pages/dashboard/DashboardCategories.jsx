import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useData } from "../../context/DataContext";
import { useTranslations } from "../../hooks/useTranslations";
import DataTable from "../../components/dashboard/DataTable";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import ImageUploader from "../../components/dashboard/ImageUploader";

const CategoryForm = ({ formData, setFormData, language, handleSave, onCancel, t, isAdd }) => (
  <form onSubmit={handleSave} className="space-y-4">
    <div>
      <label className="block text-sm font-medium mb-1">ID</label>
      <input required value={formData.id} onChange={(e) => setFormData(p => ({ ...p, id: e.target.value }))} className="input-field" placeholder="vapes, pods, etc." />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium mb-1">{language === "ar" ? "الاسم (عربي)" : "Name (Arabic)"}</label>
        <input required value={formData.nameAr} onChange={(e) => setFormData(p => ({ ...p, nameAr: e.target.value }))} className="input-field" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">{language === "ar" ? "الاسم (English)" : "Name (English)"}</label>
        <input required value={formData.nameEn} onChange={(e) => setFormData(p => ({ ...p, nameEn: e.target.value }))} className="input-field" />
      </div>
    </div>
    
    <ImageUploader
      value={formData.image}
      onChange={(img) => setFormData(p => ({ ...p, image: img }))}
      label={language === "ar" ? "صورة القسم" : "Category Image"}
    />

    <div className="flex gap-3 pt-4">
      <Button type="submit" className="flex-1">{t("save")}</Button>
      <Button type="button" variant="ghost" onClick={onCancel}>{t("cancel")}</Button>
    </div>
  </form>
);

const DashboardCategories = () => {
  const { language } = useLanguage();
  const { categories, addCategory, updateCategory, deleteCategory } = useData();
  const { t } = useTranslations();

  const [deleteModal, setDeleteModal] = useState({ open: false, category: null });
  const [editModal, setEditModal] = useState({ open: false, category: null });
  const [addModal, setAddModal] = useState(false);

  const emptyCategory = { id: "", nameAr: "", nameEn: "", descriptionAr: "", descriptionEn: "", image: "", order: 1, productCount: 0 };
  const [formData, setFormData] = useState(emptyCategory);

  const handleSave = (e) => {
    e.preventDefault();
    if (addModal) {
      addCategory({ ...formData, id: formData.id || Date.now().toString() });
      setAddModal(false);
    } else {
      updateCategory(editModal.category.id, formData);
      setEditModal({ open: false, category: null });
    }
    setFormData(emptyCategory);
  };

  const handleClose = () => {
    setAddModal(false);
    setEditModal({ open: false, category: null });
    setFormData(emptyCategory);
  };

  const columns = [
    {
      key: "image",
      label: "",
      render: (item) => (
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-slate-700">
          <img src={item?.image} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.src = "https://placehold.co/100x100/004741/FFFFFF?text=C"; }} />
        </div>
      ),
    },
    { key: language === "ar" ? "nameAr" : "nameEn", label: t("category") },
    { key: "productCount", label: language === "ar" ? "عدد المنتجات" : "Products" },
    { key: "order", label: language === "ar" ? "الترتيب" : "Order" },
  ];

  const actions = (row) => (
    <>
      <button onClick={() => { setFormData({ ...row }); setEditModal({ open: true, category: row }); }} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-blue-500">
        <Pencil className="w-4 h-4" />
      </button>
      <button onClick={() => setDeleteModal({ open: true, category: row })} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500">
        <Trash2 className="w-4 h-4" />
      </button>
    </>
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("categories")}</h1>
        <Button onClick={() => { setFormData(emptyCategory); setAddModal(true); }}>
          <Plus className="w-4 h-4" />
          {language === "ar" ? "إضافة قسم" : "Add Category"}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card p-5">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">{language === "ar" ? "إجمالي الأقسام" : "Total Categories"}</div>
          <div className="text-3xl font-bold text-primary">{categories?.length || 0}</div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <DataTable columns={columns} data={categories} actions={actions} />
      </div>

      <Modal isOpen={addModal} onClose={handleClose} title={language === "ar" ? "إضافة قسم" : "Add Category"} size="md">
        <CategoryForm formData={formData} setFormData={setFormData} language={language} handleSave={handleSave} onCancel={handleClose} t={t} isAdd={true} />
      </Modal>

      <Modal isOpen={editModal.open} onClose={handleClose} title={t("edit")} size="md">
        <CategoryForm formData={formData} setFormData={setFormData} language={language} handleSave={handleSave} onCancel={handleClose} t={t} isAdd={false} />
      </Modal>

      <Modal isOpen={deleteModal.open} onClose={() => setDeleteModal({ open: false, category: null })} title={language === "ar" ? "حذف القسم" : "Delete Category"} size="sm">
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          {language === "ar" ? `هل أنت متأكد من حذف "${deleteModal.category?.nameAr}"؟` : `Delete "${deleteModal.category?.nameEn}"?`}
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={() => setDeleteModal({ open: false, category: null })}>{t("cancel")}</Button>
          <Button variant="danger" onClick={() => { deleteCategory(deleteModal.category.id); setDeleteModal({ open: false, category: null }); }}>{t("delete")}</Button>
        </div>
      </Modal>
    </div>
  );
};

export default DashboardCategories;