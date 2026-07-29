import { useState } from "react";
import { Plus, Pencil, Trash2, ImageIcon, Type, Link2, LayoutList, Eye, EyeOff } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useData } from "../../context/DataContext";
import { useTranslations } from "../../hooks/useTranslations";
import DataTable from "../../components/dashboard/DataTable";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import ImageUploader from "../../components/dashboard/ImageUploader";

const BannerForm = ({ formData, setFormData, language, handleSave, onCancel, t, isAdd }) => (
  <form onSubmit={handleSave} className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
    
    {/* Live Preview Card */}
    <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-slate-600 bg-gray-900 shrink-0">
      {formData.image ? (
        <img 
          src={formData.image} 
          alt="Preview" 
          className="w-full h-32 object-cover"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      ) : (
        <div className="w-full h-32 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
          <div className="text-center">
            <ImageIcon className="w-8 h-8 text-gray-600 mx-auto mb-1" />
            <span className="text-xs text-gray-500">{language === "ar" ? "معاينة الصورة" : "Image Preview"}</span>
          </div>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-3">
        <h4 className="text-white font-bold text-base leading-tight truncate">
          {formData.titleEn || formData.titleAr || (language === "ar" ? "عنوان البنر" : "Banner Title")}
        </h4>
        <p className="text-white/70 text-xs mt-0.5 truncate">
          {formData.subtitleEn || formData.subtitleAr || (language === "ar" ? "عنوان فرعي" : "Subtitle")}
        </p>
        {(formData.buttonTextEn || formData.buttonTextAr) ? (
          <span className="inline-block mt-1.5 px-2.5 py-0.5 bg-primary text-white text-xs font-medium rounded-full w-fit">
            {language === "ar" ? formData.buttonTextAr : formData.buttonTextEn}
          </span>
        ) : null}
      </div>
      <div className="absolute top-2 right-2">
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${formData.active ? "bg-green-500 text-white" : "bg-gray-500 text-white"}`}>
          {formData.active ? (language === "ar" ? "نشط" : "Active") : (language === "ar" ? "غير نشط" : "Inactive")}
        </span>
      </div>
    </div>

    {/* Section: Titles */}
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        <Type className="w-3.5 h-3.5 text-primary" />
        {language === "ar" ? "المحتوى" : "Content"}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
            {language === "ar" ? "العنوان (عربي)" : "Title (Arabic)"} <span className="text-red-500">*</span>
          </label>
          <input 
            required 
            value={formData.titleAr} 
            onChange={(e) => setFormData(p => ({ ...p, titleAr: e.target.value }))} 
            className="input-field w-full text-sm py-2" 
            placeholder={language === "ar" ? "أدخل العنوان بالعربي" : "Enter Arabic title"}
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
            {language === "ar" ? "العنوان (English)" : "Title (English)"} <span className="text-red-500">*</span>
          </label>
          <input 
            required 
            value={formData.titleEn} 
            onChange={(e) => setFormData(p => ({ ...p, titleEn: e.target.value }))} 
            className="input-field w-full text-sm py-2" 
            placeholder={language === "ar" ? "أدخل العنوان بالإنجليزي" : "Enter English title"}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
            {language === "ar" ? "العنوان الفرعي (عربي)" : "Subtitle (Arabic)"}
          </label>
          <input 
            value={formData.subtitleAr} 
            onChange={(e) => setFormData(p => ({ ...p, subtitleAr: e.target.value }))} 
            className="input-field w-full text-sm py-2" 
            placeholder={language === "ar" ? "أدخل العنوان الفرعي بالعربي" : "Enter Arabic subtitle"}
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
            {language === "ar" ? "العنوان الفرعي (English)" : "Subtitle (English)"}
          </label>
          <input 
            value={formData.subtitleEn} 
            onChange={(e) => setFormData(p => ({ ...p, subtitleEn: e.target.value }))} 
            className="input-field w-full text-sm py-2" 
            placeholder={language === "ar" ? "أدخل العنوان الفرعي بالإنجليزي" : "Enter English subtitle"}
          />
        </div>
      </div>
    </div>

    {/* Section: Button */}
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        <Link2 className="w-3.5 h-3.5 text-primary" />
        {language === "ar" ? "زر التنقل" : "Call to Action"}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
            {language === "ar" ? "نص الزر (عربي)" : "Button Text (Arabic)"}
          </label>
          <input 
            value={formData.buttonTextAr} 
            onChange={(e) => setFormData(p => ({ ...p, buttonTextAr: e.target.value }))} 
            className="input-field w-full text-sm py-2" 
            placeholder={language === "ar" ? "تسوق الآن" : "Shop Now"}
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
            {language === "ar" ? "نص الزر (English)" : "Button Text (English)"}
          </label>
          <input 
            value={formData.buttonTextEn} 
            onChange={(e) => setFormData(p => ({ ...p, buttonTextEn: e.target.value }))} 
            className="input-field w-full text-sm py-2" 
            placeholder="Shop Now"
          />
        </div>
      </div>
      <div className="space-y-1">
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
          {language === "ar" ? "رابط الزر" : "Button Link"}
        </label>
        <div className="relative">
          <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            value={formData.buttonLink} 
            onChange={(e) => setFormData(p => ({ ...p, buttonLink: e.target.value }))} 
            className="input-field w-full pl-9 text-sm py-2" 
            placeholder="/products"
          />
        </div>
      </div>
    </div>

    {/* Section: Image */}
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        <ImageIcon className="w-3.5 h-3.5 text-primary" />
        {language === "ar" ? "الصورة" : "Image"}
      </div>
      <ImageUploader
        value={formData.image}
        onChange={(img) => setFormData(p => ({ ...p, image: img }))}
        label={language === "ar" ? "صورة البنر" : "Banner Image"}
      />
    </div>

    {/* Section: Settings */}
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        <LayoutList className="w-3.5 h-3.5 text-primary" />
        {language === "ar" ? "الإعدادات" : "Settings"}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
            {language === "ar" ? "الترتيب" : "Display Order"}
          </label>
          <input 
            type="number" 
            min="1"
            value={formData.order} 
            onChange={(e) => setFormData(p => ({ ...p, order: Number(e.target.value) }))} 
            className="input-field w-full text-sm py-2" 
          />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-3 cursor-pointer p-2.5 rounded-xl border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors w-full">
            <div className="relative">
              <input 
                type="checkbox" 
                checked={formData.active} 
                onChange={(e) => setFormData(p => ({ ...p, active: e.target.checked }))} 
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-500 peer-checked:bg-primary"></div>
            </div>
            <div className="flex items-center gap-1.5">
              {formData.active ? <Eye className="w-3.5 h-3.5 text-green-500" /> : <EyeOff className="w-3.5 h-3.5 text-gray-400" />}
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {formData.active ? (language === "ar" ? "نشط" : "Active") : (language === "ar" ? "غير نشط" : "Inactive")}
              </span>
            </div>
          </label>
        </div>
      </div>
    </div>

    {/* Footer Buttons */}
    <div className="flex gap-3 pt-2 sticky bottom-0 bg-white dark:bg-slate-800 pb-1">
      <Button type="submit" className="flex-1">
        {isAdd ? (language === "ar" ? "إضافة البنر" : "Add Banner") : (language === "ar" ? "حفظ التغييرات" : "Save Changes")}
      </Button>
      <Button type="button" variant="ghost" onClick={onCancel}>
        {t("cancel")}
      </Button>
    </div>
  </form>
);

const DashboardBanners = () => {
  const { language } = useLanguage();
  const { banners, addBanner, updateBanner, deleteBanner } = useData();
  const { t } = useTranslations();

  const [deleteModal, setDeleteModal] = useState({ open: false, banner: null });
  const [editModal, setEditModal] = useState({ open: false, banner: null });
  const [addModal, setAddModal] = useState(false);

  const emptyBanner = {
    titleAr: "",
    titleEn: "",
    subtitleAr: "",
    subtitleEn: "",
    image: "",
    buttonTextAr: "",
    buttonTextEn: "",
    buttonLink: "/products",
    order: 1,
    active: true,
  };

  const [formData, setFormData] = useState(emptyBanner);

  const handleSave = (e) => {
    e.preventDefault();
    if (addModal) {
      addBanner({ ...formData, id: Date.now() });
      setAddModal(false);
    } else {
      updateBanner(editModal.banner.id, formData);
      setEditModal({ open: false, banner: null });
    }
    setFormData(emptyBanner);
  };

  const handleClose = () => {
    setAddModal(false);
    setEditModal({ open: false, banner: null });
    setFormData(emptyBanner);
  };

  const columns = [
    {
      key: "image",
      label: "",
      render: (item) => (
        <div className="w-16 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-slate-700">
          <img src={item?.image} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.src = "https://placehold.co/160x100/004741/FFFFFF?text=B"; }} />
        </div>
      ),
    },
    { key: language === "ar" ? "titleAr" : "titleEn", label: language === "ar" ? "العنوان" : "Title" },
    { key: "order", label: language === "ar" ? "الترتيب" : "Order" },
    {
      key: "active",
      label: language === "ar" ? "الحالة" : "Status",
      render: (item) => (
        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${item?.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
          {item?.active ? (language === "ar" ? "نشط" : "Active") : (language === "ar" ? "غير نشط" : "Inactive")}
        </span>
      ),
    },
  ];

  const actions = (row) => (
    <>
      <button onClick={() => { setFormData({ ...row }); setEditModal({ open: true, banner: row }); }} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-blue-500 transition-colors">
        <Pencil className="w-4 h-4" />
      </button>
      <button onClick={() => setDeleteModal({ open: true, banner: row })} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors">
        <Trash2 className="w-4 h-4" />
      </button>
    </>
  );

  const activeBanners = banners?.filter(b => b.active).length || 0;

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("banners")}</h1>
        <Button onClick={() => { setFormData(emptyBanner); setAddModal(true); }}>
          <Plus className="w-4 h-4" />
          {language === "ar" ? "إضافة بنر" : "Add Banner"}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card p-5">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">{language === "ar" ? "إجمالي البنرات" : "Total Banners"}</div>
          <div className="text-3xl font-bold text-primary">{banners?.length || 0}</div>
        </div>
        <div className="card p-5">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">{language === "ar" ? "البنرات النشطة" : "Active Banners"}</div>
          <div className="text-3xl font-bold text-green-600">{activeBanners}</div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <DataTable columns={columns} data={banners} actions={actions} />
      </div>

      <Modal isOpen={addModal} onClose={handleClose} title={language === "ar" ? "إضافة بنر جديد" : "Add New Banner"} size="md">
        <BannerForm formData={formData} setFormData={setFormData} language={language} handleSave={handleSave} onCancel={handleClose} t={t} isAdd={true} />
      </Modal>

      <Modal isOpen={editModal.open} onClose={handleClose} title={language === "ar" ? "تعديل البنر" : "Edit Banner"} size="md">
        <BannerForm formData={formData} setFormData={setFormData} language={language} handleSave={handleSave} onCancel={handleClose} t={t} isAdd={false} />
      </Modal>

      <Modal isOpen={deleteModal.open} onClose={() => setDeleteModal({ open: false, banner: null })} title={language === "ar" ? "حذف البنر" : "Delete Banner"} size="sm">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
            <Trash2 className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <p className="text-gray-900 dark:text-white font-medium">
              {language === "ar" ? `هل أنت متأكد من حذف "${deleteModal.banner?.titleAr}"؟` : `Delete "${deleteModal.banner?.titleEn}"?`}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {language === "ar" ? "لا يمكن التراجع عن هذا الإجراء" : "This action cannot be undone"}
            </p>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={() => setDeleteModal({ open: false, banner: null })}>{t("cancel")}</Button>
          <Button variant="danger" onClick={() => { deleteBanner(deleteModal.banner.id); setDeleteModal({ open: false, banner: null }); }}>{t("delete")}</Button>
        </div>
      </Modal>
    </div>
  );
};

export default DashboardBanners;