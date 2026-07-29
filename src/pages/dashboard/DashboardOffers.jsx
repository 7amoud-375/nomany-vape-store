import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useData } from "../../context/DataContext";
import { useTranslations } from "../../hooks/useTranslations";
import { formatDate } from "../../utils";
import DataTable from "../../components/dashboard/DataTable";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import ImageUploader from "../../components/dashboard/ImageUploader";

const OfferForm = ({ formData, setFormData, language, handleSave, onCancel, t, products }) => {
  const toggleProduct = (productId) => {
    setFormData(p => ({
      ...p,
      products: p.products.includes(productId)
        ? p.products.filter(id => id !== productId)
        : [...p.products, productId]
    }));
  };

  return (
    <form onSubmit={handleSave} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">{language === "ar" ? "العنوان (عربي)" : "Title (Arabic)"}</label>
          <input required value={formData.titleAr} onChange={(e) => setFormData(p => ({ ...p, titleAr: e.target.value }))} className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{language === "ar" ? "العنوان (English)" : "Title (English)"}</label>
          <input required value={formData.titleEn} onChange={(e) => setFormData(p => ({ ...p, titleEn: e.target.value }))} className="input-field" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">{language === "ar" ? "الوصف (عربي)" : "Description (Arabic)"}</label>
        <input value={formData.descriptionAr} onChange={(e) => setFormData(p => ({ ...p, descriptionAr: e.target.value }))} className="input-field" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">{language === "ar" ? "الوصف (English)" : "Description (English)"}</label>
        <input value={formData.descriptionEn} onChange={(e) => setFormData(p => ({ ...p, descriptionEn: e.target.value }))} className="input-field" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">{language === "ar" ? "نسبة الخصم" : "Discount %"}</label>
          <input type="number" required value={formData.discountPercentage} onChange={(e) => setFormData(p => ({ ...p, discountPercentage: e.target.value }))} className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{language === "ar" ? "تاريخ البدء" : "Start Date"}</label>
          <input type="date" value={formData.startDate} onChange={(e) => setFormData(p => ({ ...p, startDate: e.target.value }))} className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{language === "ar" ? "تاريخ الانتهاء" : "End Date"}</label>
          <input type="date" value={formData.endDate} onChange={(e) => setFormData(p => ({ ...p, endDate: e.target.value }))} className="input-field" />
        </div>
      </div>

      <ImageUploader
        value={formData.image}
        onChange={(img) => setFormData(p => ({ ...p, image: img }))}
        label={language === "ar" ? "صورة العرض" : "Offer Image"}
      />

      <div>
        <label className="block text-sm font-medium mb-2">{language === "ar" ? "المنتجات المشمولة" : "Included Products"}</label>
        <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-slate-600 rounded-xl p-3 space-y-2">
          {products.map(p => (
            <label key={p.id} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={formData.products.includes(p.id)} onChange={() => toggleProduct(p.id)} className="rounded text-primary" />
              <span className="text-sm">{language === "ar" ? p.nameAr : p.nameEn}</span>
            </label>
          ))}
        </div>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={formData.active} onChange={(e) => setFormData(p => ({ ...p, active: e.target.checked }))} className="rounded text-primary" />
        <span className="text-sm">{language === "ar" ? "نشط" : "Active"}</span>
      </label>
      <div className="flex gap-3 pt-4">
        <Button type="submit" className="flex-1">{t("save")}</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>{t("cancel")}</Button>
      </div>
    </form>
  );
};

const DashboardOffers = () => {
  const { language } = useLanguage();
  const { offers, products, addOffer, updateOffer, deleteOffer } = useData();
  const { t } = useTranslations();

  const [deleteModal, setDeleteModal] = useState({ open: false, offer: null });
  const [editModal, setEditModal] = useState({ open: false, offer: null });
  const [addModal, setAddModal] = useState(false);

  const emptyOffer = {
    titleAr: "",
    titleEn: "",
    descriptionAr: "",
    descriptionEn: "",
    discountPercentage: "",
    image: "",
    products: [],
    active: true,
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
  };

  const [formData, setFormData] = useState(emptyOffer);

  const handleSave = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      discountPercentage: Number(formData.discountPercentage) || 0,
    };
    if (addModal) {
      addOffer(data);
      setAddModal(false);
    } else {
      updateOffer(editModal.offer.id, data);
      setEditModal({ open: false, offer: null });
    }
    setFormData(emptyOffer);
  };

  const handleClose = () => {
    setAddModal(false);
    setEditModal({ open: false, offer: null });
    setFormData(emptyOffer);
  };

  const columns = [
    {
      key: "image",
      label: "",
      render: (item) => {
        const discount = item?.discountPercentage ?? 0;
        return (
          <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
            <span className="text-sm font-bold text-red-500">-{discount}%</span>
          </div>
        );
      },
    },
    { key: language === "ar" ? "titleAr" : "titleEn", label: language === "ar" ? "العنوان" : "Title" },
    { 
      key: "discountPercentage", 
      label: language === "ar" ? "الخصم" : "Discount", 
      render: (item) => {
        const discount = item?.discountPercentage ?? 0;
        return `-${discount}%`;
      } 
    },
    {
      key: "active",
      label: language === "ar" ? "الحالة" : "Status",
      render: (item) => (
        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${item?.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
          {item?.active ? (language === "ar" ? "نشط" : "Active") : (language === "ar" ? "غير نشط" : "Inactive")}
        </span>
      ),
    },
    { key: "endDate", label: language === "ar" ? "تاريخ الانتهاء" : "End Date", render: (item) => formatDate(item?.endDate, language) },
  ];

  const actions = (row) => (
    <>
      <button onClick={() => { setFormData({ ...row, products: [...row.products] }); setEditModal({ open: true, offer: row }); }} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-blue-500">
        <Pencil className="w-4 h-4" />
      </button>
      <button onClick={() => setDeleteModal({ open: true, offer: row })} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500">
        <Trash2 className="w-4 h-4" />
      </button>
    </>
  );

  const activeOffers = offers?.filter(o => o.active).length || 0;
  const expiredOffers = offers?.filter(o => o.endDate && new Date(o.endDate) < new Date()).length || 0;

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("offers")}</h1>
        <Button onClick={() => { setFormData(emptyOffer); setAddModal(true); }}>
          <Plus className="w-4 h-4" />
          {language === "ar" ? "إضافة عرض" : "Add Offer"}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card p-5">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">{language === "ar" ? "إجمالي العروض" : "Total Offers"}</div>
          <div className="text-3xl font-bold text-primary">{offers?.length || 0}</div>
        </div>
        <div className="card p-5">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">{language === "ar" ? "العروض النشطة" : "Active Offers"}</div>
          <div className="text-3xl font-bold text-green-600">{activeOffers}</div>
        </div>
        <div className="card p-5">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">{language === "ar" ? "العروض المنتهية" : "Expired Offers"}</div>
          <div className="text-3xl font-bold text-red-500">{expiredOffers}</div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <DataTable columns={columns} data={offers} actions={actions} />
      </div>

      <Modal isOpen={addModal} onClose={handleClose} title={language === "ar" ? "إضافة عرض" : "Add Offer"} size="lg">
        <OfferForm formData={formData} setFormData={setFormData} language={language} handleSave={handleSave} onCancel={handleClose} t={t} products={products} />
      </Modal>

      <Modal isOpen={editModal.open} onClose={handleClose} title={t("edit")} size="lg">
        <OfferForm formData={formData} setFormData={setFormData} language={language} handleSave={handleSave} onCancel={handleClose} t={t} products={products} />
      </Modal>

      <Modal isOpen={deleteModal.open} onClose={() => setDeleteModal({ open: false, offer: null })} title={language === "ar" ? "حذف العرض" : "Delete Offer"} size="sm">
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          {language === "ar" ? `هل أنت متأكد من حذف "${deleteModal.offer?.titleAr}"؟` : `Delete "${deleteModal.offer?.titleEn}"?`}
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={() => setDeleteModal({ open: false, offer: null })}>{t("cancel")}</Button>
          <Button variant="danger" onClick={() => { deleteOffer(deleteModal.offer.id); setDeleteModal({ open: false, offer: null }); }}>{t("delete")}</Button>
        </div>
      </Modal>
    </div>
  );
};

export default DashboardOffers;