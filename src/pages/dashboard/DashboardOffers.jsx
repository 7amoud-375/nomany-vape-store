import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useData } from "../../context/DataContext";
import { useTranslations } from "../../hooks/useTranslations";
import { formatDate } from "../../utils";
import { CardGrid, AdminCard } from "../../components/dashboard/AdminCardGrid";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import OfferForm from "../../components/dashboard/OfferForm";

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

      <CardGrid
        isEmpty={(offers || []).length === 0}
        empty={language === "ar" ? "لسه مفيش عروض" : "No offers yet"}
      >
        {(offers || []).map((offer, index) => {
          const discount = offer?.discountPercentage ?? 0;
          const expired = offer?.endDate && new Date(offer.endDate) < new Date();
          const count = (offer?.products || []).length;

          return (
            <AdminCard
              key={offer.id}
              index={index}
              title={language === "ar" ? offer?.titleAr : offer?.titleEn}
              subtitle={
                count
                  ? `${count} ${language === "ar" ? "منتج" : "products"}`
                  : language === "ar" ? "كل المنتجات" : "All products"
              }
              meta={
                <div className="flex items-center justify-between gap-2">
                  <span className="text-lg font-bold text-red-500">-{discount}%</span>
                  <span className={`px-2 py-1 rounded-lg text-[11px] font-medium ${
                    expired
                      ? "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-400"
                      : offer?.active
                      ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                      : "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-400"
                  }`}>
                    {expired
                      ? language === "ar" ? "منتهي" : "Expired"
                      : offer?.active
                      ? language === "ar" ? "نشط" : "Active"
                      : language === "ar" ? "متوقف" : "Paused"}
                  </span>
                </div>
              }
              actions={[
                {
                  icon: Pencil,
                  label: t("edit") || "Edit",
                  tone: "primary",
                  onClick: () => {
                    setFormData({ ...offer, products: [...(offer.products || [])] });
                    setEditModal({ open: true, offer });
                  },
                },
                {
                  icon: Trash2,
                  label: t("delete") || "Delete",
                  tone: "danger",
                  onClick: () => setDeleteModal({ open: true, offer }),
                },
              ]}
            />
          );
        })}
      </CardGrid>

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