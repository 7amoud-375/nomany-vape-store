import { useState, useMemo } from "react";
import { Search, Check, X, Percent, Calculator } from "lucide-react";
import { formatPrice, effectivePrice, toNumber, productImage } from "../../utils";

/**
 * Offer editor.
 *
 * The product picker is searchable rather than one long checkbox list, and the
 * totals panel recalculates live as products are added or the percentage
 * changes — so the admin can see what the offer actually costs before saving
 * it, instead of finding out from the orders.
 */
const OfferForm = ({ formData, setFormData, language, handleSave, onCancel, t, products }) => {
  const isRtl = language === "ar";
  const [search, setSearch] = useState("");
  const [onlySelected, setOnlySelected] = useState(false);

  const selected = Array.isArray(formData.products) ? formData.products : [];
  const percent = Math.min(100, Math.max(0, toNumber(formData.discountPercentage)));

  const toggle = (productId) =>
    setFormData((p) => {
      const list = Array.isArray(p.products) ? p.products : [];
      const id = String(productId);
      return {
        ...p,
        products: list.map(String).includes(id)
          ? list.filter((x) => String(x) !== id)
          : [...list, productId],
      };
    });

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return products.filter((p) => {
      if (onlySelected && !selected.map(String).includes(String(p.id))) return false;
      if (!needle) return true;
      return [p.nameAr, p.nameEn, p.sku, p.brand]
        .some((v) => String(v ?? "").toLowerCase().includes(needle));
    });
  }, [products, search, onlySelected, selected]);

  /** Live maths over whatever is currently selected. */
  const maths = useMemo(() => {
    const chosen = products.filter((p) => selected.map(String).includes(String(p.id)));
    const before = chosen.reduce((sum, p) => sum + effectivePrice(p), 0);
    const discount = before * (percent / 100);
    return {
      count: chosen.length,
      before,
      discount,
      after: before - discount,
      // What the customer saves on one of each — the number worth sanity
      // checking before you publish the offer.
      averageAfter: chosen.length ? (before - discount) / chosen.length : 0,
    };
  }, [products, selected, percent]);

  return (
    <form onSubmit={handleSave} className="flex flex-col max-h-[75vh]">
      <div className="flex-1 overflow-y-auto space-y-4 pe-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">{isRtl ? "العنوان (عربي)" : "Title (Arabic)"}</label>
            <input required value={formData.titleAr || ""} onChange={(e) => setFormData((p) => ({ ...p, titleAr: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{isRtl ? "العنوان (English)" : "Title (English)"}</label>
            <input required value={formData.titleEn || ""} onChange={(e) => setFormData((p) => ({ ...p, titleEn: e.target.value }))} className="input-field" dir="ltr" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">{isRtl ? "الوصف (عربي)" : "Description (Arabic)"}</label>
            <input value={formData.descriptionAr || ""} onChange={(e) => setFormData((p) => ({ ...p, descriptionAr: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{isRtl ? "الوصف (English)" : "Description (English)"}</label>
            <input value={formData.descriptionEn || ""} onChange={(e) => setFormData((p) => ({ ...p, descriptionEn: e.target.value }))} className="input-field" dir="ltr" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">{isRtl ? "نسبة الخصم %" : "Discount %"}</label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                required
                value={formData.discountPercentage ?? ""}
                onChange={(e) => setFormData((p) => ({ ...p, discountPercentage: e.target.value }))}
                className="input-field pe-9"
                dir="ltr"
              />
              <Percent className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{isRtl ? "تاريخ البدء" : "Start date"}</label>
            <input type="date" value={formData.startDate || ""} onChange={(e) => setFormData((p) => ({ ...p, startDate: e.target.value }))} className="input-field" dir="ltr" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{isRtl ? "تاريخ الانتهاء" : "End date"}</label>
            <input type="date" value={formData.endDate || ""} onChange={(e) => setFormData((p) => ({ ...p, endDate: e.target.value }))} className="input-field" dir="ltr" />
          </div>
        </div>

        {/* -- Live maths ---------------------------------------------------- */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 dark:bg-primary/10 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calculator className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              {isRtl ? "حساب العرض" : "Offer maths"}
            </h4>
          </div>

          {maths.count === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isRtl ? "اختار منتجات عشان تشوف الحساب." : "Pick products to see the maths."}
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              {[
                { label: isRtl ? "عدد المنتجات" : "Products", value: maths.count, plain: true },
                { label: isRtl ? "قبل الخصم" : "Before", value: formatPrice(maths.before, language) },
                { label: isRtl ? "قيمة الخصم" : "Discount", value: `− ${formatPrice(maths.discount, language)}`, tone: "text-red-500" },
                { label: isRtl ? "بعد الخصم" : "After", value: formatPrice(maths.after, language), tone: "text-green-600 dark:text-green-400" },
              ].map((cell) => (
                <div key={cell.label} className="rounded-lg bg-white dark:bg-slate-900 p-2.5">
                  <p className="text-[11px] text-gray-400 mb-1">{cell.label}</p>
                  <p className={`text-sm font-bold ${cell.tone || "text-gray-900 dark:text-white"}`}>
                    {cell.plain ? cell.value : cell.value}
                  </p>
                </div>
              ))}
            </div>
          )}

          {maths.count > 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
              {isRtl
                ? `متوسط سعر المنتج بعد الخصم: ${formatPrice(maths.averageAfter, language)}`
                : `Average price per product after discount: ${formatPrice(maths.averageAfter, language)}`}
            </p>
          )}

          {percent >= 70 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
              {isRtl
                ? "خصم كبير جدًا — اتأكد إن ده مقصود قبل ما تحفظ."
                : "That is a very large discount — double-check before saving."}
            </p>
          )}
        </div>

        {/* -- Product picker ------------------------------------------------ */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <label className="text-sm font-medium">{isRtl ? "المنتجات المشمولة" : "Included products"}</label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">{selected.length} {isRtl ? "مختار" : "selected"}</span>
              {selected.length > 0 && (
                <button
                  type="button"
                  onClick={() => setFormData((p) => ({ ...p, products: [] }))}
                  className="text-xs text-red-500 hover:underline"
                >
                  {isRtl ? "مسح الكل" : "Clear"}
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-2 mb-2">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isRtl ? "دوّر بالاسم أو الماركة أو SKU..." : "Search by name, brand or SKU..."}
                className="input-field ps-9 py-2 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={() => setOnlySelected((v) => !v)}
              className={`px-3 py-2 rounded-xl text-sm whitespace-nowrap transition-colors ${
                onlySelected
                  ? "bg-primary text-on-primary"
                  : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400"
              }`}
            >
              {isRtl ? "المختار فقط" : "Selected only"}
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto rounded-xl border border-gray-200 dark:border-slate-700 divide-y divide-gray-100 dark:divide-slate-800">
            {visible.length === 0 ? (
              <p className="p-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                {isRtl ? "مفيش منتجات مطابقة" : "No matching products"}
              </p>
            ) : (
              visible.map((p) => {
                const isOn = selected.map(String).includes(String(p.id));
                const price = effectivePrice(p);
                const after = price * (1 - percent / 100);

                return (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => toggle(p.id)}
                    className={`w-full flex items-center gap-3 p-2.5 text-start transition-colors ${
                      isOn ? "bg-primary/5 dark:bg-primary/10" : "hover:bg-gray-50 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${
                      isOn ? "bg-primary border-primary text-on-primary" : "border-gray-300 dark:border-slate-600"
                    }`}>
                      {isOn && <Check className="w-3 h-3" />}
                    </span>

                    <img
                      src={productImage(p) || "https://placehold.co/60x60/004741/FFFFFF?text=%20"}
                      alt=""
                      className="w-9 h-9 rounded-lg object-cover bg-gray-100 dark:bg-slate-700 shrink-0"
                      loading="lazy"
                    />

                    <span className="flex-1 min-w-0">
                      <span className="block text-sm text-gray-900 dark:text-white truncate">
                        {isRtl ? p.nameAr : p.nameEn}
                      </span>
                      <span className="block text-xs text-gray-400 truncate">{p.sku || p.brand}</span>
                    </span>

                    <span className="text-end shrink-0">
                      <span className={`block text-sm ${isOn ? "text-gray-400 line-through" : "text-gray-900 dark:text-white"}`}>
                        {formatPrice(price, language)}
                      </span>
                      {isOn && percent > 0 && (
                        <span className="block text-xs font-semibold text-green-600 dark:text-green-400">
                          {formatPrice(after, language)}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!formData.active}
            onChange={(e) => setFormData((p) => ({ ...p, active: e.target.checked }))}
            className="rounded text-primary w-4 h-4"
          />
          <span className="text-sm">{isRtl ? "العرض فعّال" : "Offer is active"}</span>
        </label>
      </div>

      <div className="flex gap-3 pt-4 mt-2 border-t border-gray-100 dark:border-slate-800">
        <button type="submit" className="btn-primary flex-1">{t("save")}</button>
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

export default OfferForm;
