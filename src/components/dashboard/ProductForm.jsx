import { useState } from "react";
import { ImageIcon, ChevronDown, Image as ImageIco, Type, Tags, Wallet, Sparkles, Droplet, X } from "lucide-react";
import MultiImageUploader from "./MultiImageUploader";
import { toNumber, calculateDiscount } from "../../utils";

const MAX_FLAVORS = 30;

/**
 * A legacy flavour could be a plain string, from before this field carried
 * two names. Normalised the same way everywhere it is read, so the rest of
 * the form only ever deals with the {nameAr, nameEn} shape.
 */
const asFlavorObject = (flavor) =>
  typeof flavor === "string" ? { nameAr: flavor, nameEn: "" } : flavor || { nameAr: "", nameEn: "" };

/**
 * Optional flavour names for an e-liquid or disposable — "مانجو آيس" /
 * "Mango Ice". Both languages are captured, the same as a product's own name,
 * so the flavour reads correctly regardless of which language a visitor is
 * browsing in.
 *
 * Entirely opt-in: a device or an accessory has none, and an empty list is a
 * complete, valid product. Typed one at a time into their own fields rather
 * than a single comma-separated box, so a name that itself contains a comma
 * is never split apart and the two languages can never be transposed.
 */
const FlavorInput = ({ flavors, onChange, isRtl }) => {
  const [draftAr, setDraftAr] = useState("");
  const [draftEn, setDraftEn] = useState("");
  const list = (Array.isArray(flavors) ? flavors : []).map(asFlavorObject);

  const add = () => {
    const nameAr = draftAr.trim();
    const nameEn = draftEn.trim();
    if (!nameAr && !nameEn) return;

    if (list.length >= MAX_FLAVORS) {
      setDraftAr("");
      setDraftEn("");
      return;
    }
    // Case-insensitive dedupe against either language: "Mint" typed twice, or
    // typed once in Arabic and once as "mint", is one flavour either way.
    const clashes = (existing) =>
      (nameAr && existing.nameAr.toLowerCase() === nameAr.toLowerCase()) ||
      (nameEn && existing.nameEn.toLowerCase() === nameEn.toLowerCase());
    if (list.some(clashes)) {
      setDraftAr("");
      setDraftEn("");
      return;
    }

    onChange([...list, { nameAr, nameEn }]);
    setDraftAr("");
    setDraftEn("");
  };

  const removeAt = (index) => onChange(list.filter((_, i) => i !== index));

  const onEnter = (e) => {
    // Enter adds without submitting the surrounding product form.
    if (e.key === "Enter") {
      e.preventDefault();
      add();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={draftAr}
          onChange={(e) => setDraftAr(e.target.value)}
          onKeyDown={onEnter}
          placeholder={isRtl ? "اسم النكهة (عربي)، مثلاً مانجو آيس" : "Flavour name (Arabic)"}
          className="input-field flex-1"
        />
        <input
          type="text"
          value={draftEn}
          onChange={(e) => setDraftEn(e.target.value)}
          onKeyDown={onEnter}
          placeholder={isRtl ? "اسم النكهة (English)" : "Flavour name (English), e.g. Mango Ice"}
          className="input-field flex-1"
          dir="ltr"
        />
        <button
          type="button"
          onClick={add}
          disabled={(!draftAr.trim() && !draftEn.trim()) || list.length >= MAX_FLAVORS}
          className="shrink-0 rounded-xl bg-primary/10 px-4 py-2.5 text-sm font-medium text-primary
                     transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isRtl ? "إضافة" : "Add"}
        </button>
      </div>

      {list.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {list.map((flavor, index) => {
            // Both names shown together regardless of the dashboard's own
            // language, so the admin can always confirm both were actually
            // entered rather than one being silently blank.
            const label = [flavor.nameAr, flavor.nameEn].filter(Boolean).join(" / ") || "—";
            return (
              <span
                key={`${flavor.nameAr}-${flavor.nameEn}-${index}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 dark:bg-slate-800
                           py-1 ps-3 pe-1.5 text-sm text-gray-700 dark:text-gray-200"
              >
                {label}
                <button
                  type="button"
                  onClick={() => removeAt(index)}
                  aria-label={isRtl ? `حذف ${label}` : `Remove ${label}`}
                  className="rounded-full p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600
                             dark:hover:bg-slate-700 dark:hover:text-gray-300"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-gray-400">
          {isRtl
            ? "اختياري — لو المنتج ليكويد أو ديسبوزابل بأكتر من طعم، ضيفهم هنا بالعربي والإنجليزي."
            : "Optional — if this is an e-liquid or disposable with more than one flavour, add them here in both languages."}
        </p>
      )}
    </div>
  );
};

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

  /**
   * Foreign keys, stored as numbers.
   *
   * A <select> value is always a string, but the API returns category and brand
   * as integers. Keeping the string meant `product.category === category` was
   * false everywhere it is compared strictly — related products, the dashboard's
   * category column — until the next reload replaced the value from the server.
   */
  const setId = (key) => (e) =>
    setFormData((p) => ({ ...p, [key]: e.target.value === "" ? null : Number(e.target.value) }));

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
            {/*
              Both selects previously had no placeholder option. With
              formData.category still "", no <option> matched, so the browser
              displayed the first category while the form value stayed empty —
              the admin saw "Vapes" selected, saved, and the product landed with
              no category at all. An explicit empty option makes the unset state
              visible, and `required` stops it being saved by accident.
            */}
            <Field label={t("brand")}>
              <select value={formData.brand ?? ""} onChange={setId("brand")} className="input-field">
                <option value="">{isRtl ? "بدون ماركة" : "No brand"}</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </Field>
            <Field label={t("category")}>
              <select
                required
                value={formData.category ?? ""}
                onChange={setId("category")}
                className="input-field"
              >
                <option value="">{isRtl ? "اختر القسم…" : "Choose a category…"}</option>
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

        <Section
          icon={Droplet}
          title={isRtl ? "النكهات (اختياري)" : "Flavours (optional)"}
          badge={(formData.flavors?.length ?? 0) > 0 ? `${formData.flavors.length}` : undefined}
        >
          <FlavorInput
            flavors={formData.flavors}
            onChange={(flavors) => setFormData((p) => ({ ...p, flavors }))}
            isRtl={isRtl}
          />
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

      {/*
        Sticky so Save is reachable without scrolling to the bottom.

        Matches the modal shell's own background (Modal.jsx: dark:bg-slate-800)
        exactly. This was one shade darker (slate-900), which on a dark modal
        card reads as a separate black box stuck to the bottom rather than part
        of the same panel.
      */}
      <div className="flex gap-3 pt-4 mt-2 border-t border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800">
        <button type="submit" className="btn-primary flex-1 active:scale-[0.98]">
          {isEdit ? (isRtl ? "حفظ التعديلات" : "Save changes") : (isRtl ? "إضافة المنتج" : "Add product")}
        </button>
        {/*
          The panel's own background is dark:bg-slate-800 (matched to the
          modal shell above). Cancel's hover used to target that same shade,
          so hovering in dark mode changed nothing visible — a border plus a
          lighter hover fill gives it a real, visible state in both themes.
        */}
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 rounded-xl text-sm font-medium border border-gray-200 dark:border-slate-600
                     text-gray-600 dark:text-gray-300 hover:bg-gray-100 hover:border-gray-300
                     dark:hover:bg-slate-700 dark:hover:border-slate-500
                     active:scale-[0.98] transition-all duration-150"
        >
          {t("cancel")}
        </button>
      </div>
    </form>
  );
};

export default ProductForm;
