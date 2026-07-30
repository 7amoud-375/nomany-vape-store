import { useState } from "react";
import { ImageIcon, ChevronDown, Image as ImageIco, Type, Tags, Wallet, Sparkles } from "lucide-react";
import MultiImageUploader from "./MultiImageUploader";
import { toNumber, calculateDiscount } from "../../utils";

/**
 * Add/edit product form.
 *
 * Grouped into collapsible sections rather than one long scroll: the flat
 * version put twelve unrelated fields in a row, so finding the price meant
 * scrolling past both descriptions every time.
 */

const Section = ({ icon: Icon, title, children, defaultOpen = false, badge }) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 p-4 bg-gray-50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
      >
        <Icon className="w-4 h-4 text-primary shrink-0" />
        <span className="font-medium text-sm text-gray-900 dark:text-white flex-1 text-start">
          {title}
        </span>
        {badge && <span className="text-xs text-gray-400">{badge}</span>}
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="p-4 space-y-4">{children}</div>}
    </div>
  );
};

const Field = ({ label, children }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
      {label}
    </label>
    {children}
  </div>
);

const ProductForm = ({
  formData,
  setFormData,
  language,
  t,
  brands,
  categories,
  handleSave,
  onCancel,
  openGallery,
  isEdit,
}) => {
  const isRtl = language === "ar";
  const set = (key) => (e) => setFormData((p) => ({ ...p, [key]: e.target.value }));
  const toggle = (key) => (e) => setFormData((p) => ({ ...p, [key]: e.target.checked }));

  const imageCount = (formData.images || []).filter(Boolean).length;
  const discount = calculateDiscount(formData.price, formData.discountPrice);

  return (
    <form onSubmit={handleSave} className="flex flex-col max-h-[75vh]">
      <div className="flex-1 overflow-y-auto space-y-3 pe-1">
        {/* Availability reads as a status, so it stays at the top and outside
            the collapsible sections. */}
        <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
          <div className="min-w-0">
            <span className="text-sm font-bold text-gray-800 dark:text-white">
              {isRtl ? "حالة التوفر" : "Availability"}
            </span>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {formData.availability
                ? isRtl ? "المنتج متاح للبيع" : "Available for sale"
                : isRtl ? "المنتج غير متاح" : "Not available"}
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={!!formData.availability}
              onChange={toggle("availability")}
              className="sr-only peer"
            />
            <div className="w-12 h-7 bg-gray-300 rounded-full peer dark:bg-gray-600 peer-checked:bg-green-500
                            peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full
                            after:content-[''] after:absolute after:top-[2px] after:start-[2px]
                            after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all" />
          </label>
        </div>

        <Section
          icon={ImageIco}
          title={isRtl ? "الصور" : "Images"}
          badge={imageCount > 0 ? `${imageCount}` : isRtl ? "مفيش صور" : "none"}
          defaultOpen
        >
          <MultiImageUploader
            images={formData.images}
            onChange={(images) => setFormData((p) => ({ ...p, images }))}
            language={language}
          />
          <button
            type="button"
            onClick={openGallery}
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <ImageIcon className="w-4 h-4" />
            {isRtl ? "اختيار من المعرض" : "Choose from gallery"}
          </button>
        </Section>

        <Section icon={Type} title={isRtl ? "الاسم والوصف" : "Name & description"} defaultOpen>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label={isRtl ? "الاسم (عربي)" : "Name (Arabic)"}>
              <input required value={formData.nameAr || ""} onChange={set("nameAr")} className="input-field" />
            </Field>
            <Field label={isRtl ? "الاسم (English)" : "Name (English)"}>
              <input required value={formData.nameEn || ""} onChange={set("nameEn")} className="input-field" dir="ltr" />
            </Field>
          </div>
          <Field label={isRtl ? "الوصف (عربي)" : "Description (Arabic)"}>
            <textarea rows={3} value={formData.descriptionAr || ""} onChange={set("descriptionAr")} className="input-field resize-y" />
          </Field>
          <Field label={isRtl ? "الوصف (English)" : "Description (English)"}>
            <textarea rows={3} value={formData.descriptionEn || ""} onChange={set("descriptionEn")} className="input-field resize-y" dir="ltr" />
          </Field>
        </Section>

        <Section icon={Wallet} title={isRtl ? "السعر" : "Pricing"} defaultOpen badge={discount > 0 ? `-${discount}%` : undefined}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={`${t("price")} (${isRtl ? "ج.م" : "EGP"})`}>
              <input type="number" min="0" step="0.01" required value={formData.price ?? ""} onChange={set("price")} className="input-field" dir="ltr" />
            </Field>
            <Field label={`${t("discountPrice")} (${isRtl ? "اختياري" : "optional"})`}>
              <input type="number" min="0" step="0.01" value={formData.discountPrice ?? ""} onChange={set("discountPrice")} className="input-field" dir="ltr" />
            </Field>
          </div>

          {/* Catching this here beats letting it reach the storefront, where a
              "discount" above the price silently shows no discount at all. */}
          {toNumber(formData.discountPrice) > 0 &&
            toNumber(formData.discountPrice) >= toNumber(formData.price) && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                {isRtl
                  ? "سعر الخصم لازم يكون أقل من السعر الأصلي، وإلا مش هيظهر خصم."
                  : "The discount price must be lower than the price, otherwise no discount shows."}
              </p>
            )}
        </Section>

        <Section icon={Tags} title={isRtl ? "التصنيف" : "Classification"}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={t("brand")}>
              <select value={formData.brand || ""} onChange={set("brand")} className="input-field">
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </Field>
            <Field label={t("category")}>
              <select value={formData.category || ""} onChange={set("category")} className="input-field">
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{isRtl ? c.nameAr : c.nameEn}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="SKU">
            <input value={formData.sku || ""} onChange={set("sku")} className="input-field" dir="ltr" />
          </Field>
        </Section>

        <Section icon={Sparkles} title={isRtl ? "الظهور في الموقع" : "Placement on the site"}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { key: "featured", ar: "مميز", en: "Featured", hintAr: "يظهر في قسم المنتجات المميزة", hintEn: "Shows in Featured Products" },
              { key: "bestSeller", ar: "الأكثر مبيعاً", en: "Best seller", hintAr: "يظهر في قسم الأكثر مبيعاً", hintEn: "Shows in Best Sellers" },
              { key: "newArrival", ar: "جديد", en: "New arrival", hintAr: "شارة «جديد» على المنتج", hintEn: "Adds a 'New' badge" },
              { key: "offer", ar: "عرض", en: "On offer", hintAr: "يظهر في صفحة العروض", hintEn: "Shows on the Offers page" },
            ].map(({ key, ar, en, hintAr, hintEn }) => (
              <label
                key={key}
                className="flex items-start gap-3 cursor-pointer p-3 rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={!!formData[key]}
                  onChange={toggle(key)}
                  className="rounded text-primary w-4 h-4 mt-0.5 shrink-0"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-gray-900 dark:text-white">
                    {isRtl ? ar : en}
                  </span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">
                    {isRtl ? hintAr : hintEn}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </Section>
      </div>

      {/* Sticky so Save is reachable without scrolling to the bottom. */}
      <div className="flex gap-3 pt-4 mt-2 border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900">
        <button type="submit" className="btn-primary flex-1">
          {isEdit ? (isRtl ? "حفظ التعديلات" : "Save changes") : (isRtl ? "إضافة المنتج" : "Add product")}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
        >
          {t("cancel")}
        </button>
      </div>
    </form>
  );
};

export default ProductForm;
