import { useState } from "react";
import { Plus, Pencil, Trash2, Star } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useData } from "../../context/DataContext";
import { useTranslations } from "../../hooks/useTranslations";
import DataTable from "../../components/dashboard/DataTable";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";

const DashboardTestimonials = () => {
  const { language } = useLanguage();
  const { testimonials } = useData();
  const { t } = useTranslations();
  const [deleteModal, setDeleteModal] = useState({ open: false, testimonial: null });

  const columns = [
    { key: language === "ar" ? "nameAr" : "nameEn", label: language === "ar" ? "الاسم" : "Name" },
    {
      key: "rating",
      label: language === "ar" ? "التقييم" : "Rating",
      render: (v) => (
        <div className="flex items-center gap-1">
          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
          <span>{v}</span>
        </div>
      ),
    },
    { key: language === "ar" ? "contentAr" : "contentEn", label: language === "ar" ? "المحتوى" : "Content", render: (v) => <span className="line-clamp-1">{v}</span> },
  ];

  const actions = (row) => (
    <>
      <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-blue-500">
        <Pencil className="w-4 h-4" />
      </button>
      <button
        onClick={() => setDeleteModal({ open: true, testimonial: row })}
        className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("testimonials")}</h1>
        <Button>
          <Plus className="w-4 h-4" />
          {language === "ar" ? "إضافة رأي" : "Add Testimonial"}
        </Button>
      </div>

      <div className="card overflow-hidden">
        <DataTable columns={columns} data={testimonials} actions={actions} />
      </div>

      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, testimonial: null })}
        title={language === "ar" ? "حذف الرأي" : "Delete Testimonial"}
        size="sm"
      >
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          {language === "ar" ? "هل أنت متأكد من حذف هذا الرأي؟" : "Are you sure you want to delete this testimonial?"}
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={() => setDeleteModal({ open: false, testimonial: null })}>
            {t("cancel")}
          </Button>
          <Button variant="danger" onClick={() => setDeleteModal({ open: false, testimonial: null })}>
            {t("delete")}
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default DashboardTestimonials;
