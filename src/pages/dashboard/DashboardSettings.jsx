import { useState, useEffect } from "react";
import {
  Share2,
  Truck,
  RotateCcw,
  KeyRound,
  Save,
  Loader2,
  Eye,
  EyeOff,
  MapPin,
  Plus,
  Trash2,
  Wallet,
} from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useData } from "../../context/DataContext";
import { useAuth } from "../../context/AuthContext";
import { useTranslations } from "../../hooks/useTranslations";
import { toNumber } from "../../utils";
import Button from "../../components/ui/Button";
import { PageHeader } from "../../components/dashboard/ui";
import toast from "react-hot-toast";

// Store name, hashtag, address and footer text were removed at the owner's
// request — they are set once and never change, so they only added noise. The
// values still live in src/data/settings.js and still render on the site.
// Manual transfer details, shown to the customer at checkout when they pick
// instapay/vodafone_cash. Free text on purpose — a phone number, an InstaPay
// link, or an InstaPay Business QR link all just get displayed as-is.
const PAYMENT_FIELDS = [
  {
    key: "instapayNumber",
    labelAr: "رقم / رابط انستا باي",
    labelEn: "InstaPay number / link",
    dir: "ltr",
    placeholder: "01xxxxxxxxx or instapay.me/...",
  },
  {
    key: "vodafoneCashNumber",
    labelAr: "رقم فودافون كاش",
    labelEn: "Vodafone Cash number",
    dir: "ltr",
    placeholder: "01xxxxxxxxx",
  },
];

const CONTACT_FIELDS = [
  { key: "businessHoursAr", labelAr: "ساعات العمل (عربي)", labelEn: "Business Hours (Arabic)" },
  { key: "businessHoursEn", labelAr: "ساعات العمل (English)", labelEn: "Business Hours (English)" },
  { key: "phone", labelAr: "الهاتف", labelEn: "Phone", dir: "ltr" },
  { key: "whatsapp", labelAr: "واتساب", labelEn: "WhatsApp", dir: "ltr" },
  { key: "email", labelAr: "البريد الإلكتروني", labelEn: "Email", dir: "ltr" },
  { key: "facebook", labelAr: "فيسبوك", labelEn: "Facebook", dir: "ltr", placeholder: "https://facebook.com/..." },
  { key: "instagram", labelAr: "انستغرام", labelEn: "Instagram", dir: "ltr", placeholder: "https://instagram.com/..." },
  { key: "tiktok", labelAr: "تيك توك", labelEn: "TikTok", dir: "ltr", placeholder: "https://tiktok.com/@..." },
];

/**
 * The areas the shop delivers to, each with its own fee — the same idea as
 * the reference café project, extended to carry both an Arabic and an
 * English name since the storefront itself is bilingual.
 *
 * Editing here is local to the form; nothing is sent until the page's own
 * Save button is pressed, and DashboardSettings validates the whole list
 * (duplicate names, negative fees) before that save goes out.
 */
/**
 * Delivery areas: a small "add one" form, and a distinct list of the areas
 * already added below it — the same add-then-list shape as the product
 * form's flavour field, rather than an undifferentiated stack of always-
 * editable rows where a blank "new" row looked identical to a saved one.
 *
 * Adding still only changes local state; nothing reaches the server until
 * the page's own Save button is pressed, same as every other settings tab.
 */
const DeliveryAreasEditor = ({ isRtl, cities, onChange }) => {
  const rows = Array.isArray(cities) ? cities : [];
  const [draftAr, setDraftAr] = useState("");
  const [draftEn, setDraftEn] = useState("");
  const [draftFee, setDraftFee] = useState("");

  const addRow = () => {
    const nameAr = draftAr.trim();
    const nameEn = draftEn.trim();
    const fee = toNumber(draftFee);

    if (!nameAr && !nameEn) {
      toast.error(isRtl ? "اكتب اسم المنطقة بلغة واحدة على الأقل" : "Enter the area's name in at least one language");
      return;
    }
    if (!Number.isFinite(fee) || fee < 0) {
      toast.error(isRtl ? "سعر التوصيل لازم يكون صفر أو أكتر" : "The delivery fee must be zero or more");
      return;
    }
    const clashes = (existing) =>
      (nameAr && (existing.nameAr || "").toLowerCase() === nameAr.toLowerCase()) ||
      (nameEn && (existing.nameEn || "").toLowerCase() === nameEn.toLowerCase());
    if (rows.some(clashes)) {
      toast.error(
        isRtl ? `في منطقة بنفس الاسم متسجلة خلاص: "${nameAr || nameEn}"` : `An area named "${nameAr || nameEn}" is already added`
      );
      return;
    }

    onChange([...rows, { nameAr, nameEn, fee }]);
    setDraftAr("");
    setDraftEn("");
    setDraftFee("");
  };

  const removeRow = (index) => onChange(rows.filter((_, i) => i !== index));

  const onEnter = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addRow();
    }
  };

  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <MapPin className="h-4 w-4 text-primary" />
        <h3 className="font-bold text-gray-900 dark:text-white">
          {isRtl ? "مناطق التوصيل" : "Delivery areas"}
        </h3>
      </div>
      <p className="mb-5 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
        {isRtl
          ? "العميل بيختار واحدة من المناطق دي في صفحة الدفع، وسعرها بيتضاف على الإجمالي تلقائيًا. الطلب متقدرش يتأكد من غير ما يتختار منطقة."
          : "The customer picks one of these at checkout, and its fee is added to the total automatically. An order cannot be placed without choosing an area."}
      </p>

      {/* Add one area at a time. */}
      <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-gray-50/60 p-3 dark:border-slate-700 dark:bg-slate-800/40 sm:flex-row sm:items-center">
        <input
          value={draftAr}
          onChange={(e) => setDraftAr(e.target.value)}
          onKeyDown={onEnter}
          placeholder={isRtl ? "اسم المنطقة (عربي)" : "Area name (Arabic)"}
          className="input-field flex-1 text-sm"
        />
        <input
          value={draftEn}
          onChange={(e) => setDraftEn(e.target.value)}
          onKeyDown={onEnter}
          placeholder={isRtl ? "اسم المنطقة (English)" : "Area name (English)"}
          className="input-field flex-1 text-sm"
          dir="ltr"
        />
        <div className="flex shrink-0 items-center gap-2">
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min="0"
              step="1"
              value={draftFee}
              onChange={(e) => setDraftFee(e.target.value)}
              onKeyDown={onEnter}
              placeholder="0"
              className="input-field w-20 text-sm"
              dir="ltr"
            />
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              {isRtl ? "ج.م" : "EGP"}
            </span>
          </div>
          <button
            type="button"
            onClick={addRow}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-primary/10 px-4 py-2.5
                       text-sm font-medium text-primary transition-colors hover:bg-primary/20"
          >
            <Plus className="h-4 w-4" />
            {isRtl ? "إضافة" : "Add"}
          </button>
        </div>
      </div>

      {/* The areas already added — what checkout will actually offer once saved. */}
      <div className="mt-5">
        <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {isRtl ? `المناطق المضافة (${rows.length})` : `Added areas (${rows.length})`}
        </h4>

        {rows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-300 dark:border-slate-700 px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
            {isRtl
              ? "لسه مفيش مناطق توصيل. العملاء متقدرش يكملوا الطلب لحد ما تضيف واحدة وتحفظ."
              : "No delivery areas yet. Customers cannot check out until you add one and save."}
          </p>
        ) : (
          <div className="space-y-2">
            {rows.map((row, index) => (
              <div
                key={`${row.nameAr}-${row.nameEn}-${index}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-4 py-2.5 dark:border-slate-700"
              >
                <span className="min-w-0 truncate text-sm font-medium text-gray-900 dark:text-white">
                  {[row.nameAr, row.nameEn].filter(Boolean).join(" / ") || "—"}
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-semibold text-primary" dir="ltr">
                    {toNumber(row.fee)} {isRtl ? "ج.م" : "EGP"}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeRow(index)}
                    aria-label={isRtl ? "حذف المنطقة" : "Remove area"}
                    className="rounded-lg p-1.5 text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const DashboardSettings = () => {
  const { language } = useLanguage();
  const { settings, updateSettings } = useData();
  const { changePassword, changeUsername, username } = useAuth();
  const { t } = useTranslations();
  const isRtl = language === "ar";

  const [tab, setTab] = useState("contact");
  const [formData, setFormData] = useState(settings);
  const [saving, setSaving] = useState(false);

  // settings arrives from the API after the first render, so seeding state once
  // would leave the form showing stale values until a manual reload.
  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const handleSubmit = (e) => {
    e.preventDefault();

    // Every tab shares one save, so the delivery list is always validated here
    // regardless of which tab is on screen — the same way the contact and
    // return-policy fields already are.
    const cleanedCities = (formData.deliveryCities || [])
      .map((c) => ({
        nameAr: String(c?.nameAr ?? "").trim(),
        nameEn: String(c?.nameEn ?? "").trim(),
        fee: toNumber(c?.fee),
      }))
      .filter((c) => c.nameAr || c.nameEn);

    if (cleanedCities.some((c) => !Number.isFinite(c.fee) || c.fee < 0)) {
      toast.error(
        isRtl ? "كل منطقة لازم يكون ليها سعر توصيل صفر أو أكتر" : "Every area needs a delivery fee of zero or more"
      );
      return;
    }
    const seen = new Set();
    for (const c of cleanedCities) {
      const key = (c.nameAr || c.nameEn).toLowerCase();
      if (seen.has(key)) {
        toast.error(
          isRtl
            ? `في أكتر من منطقة بنفس الاسم: "${c.nameAr || c.nameEn}"`
            : `More than one area is named "${c.nameAr || c.nameEn}"`
        );
        return;
      }
      seen.add(key);
    }

    setSaving(true);
    updateSettings({ ...formData, deliveryCities: cleanedCities });
    setSaving(false);
  };

  const field = (key) => ({
    value: formData?.[key] ?? "",
    onChange: (e) => setFormData((p) => ({ ...p, [key]: e.target.value })),
  });

  const tabs = [
    { id: "contact", icon: Share2, labelAr: "التواصل", labelEn: "Contact" },
    { id: "shipping", icon: Truck, labelAr: "مناطق التوصيل", labelEn: "Delivery areas" },
    { id: "payment", icon: Wallet, labelAr: "الدفع", labelEn: "Payment" },
    { id: "returns", icon: RotateCcw, labelAr: "سياسة الاسترجاع", labelEn: "Returns" },
    { id: "account", icon: KeyRound, labelAr: "حسابي", labelEn: "Account" },
  ];

  return (
    <div>
      <div className="mb-6"><PageHeader title={t("settings")} subtitle={language === "ar" ? "إعدادات المتجر والحساب" : "Store and account settings"} /></div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 -mx-1 px-1">
        {tabs.map(({ id, icon: Icon, labelAr, labelEn }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
              tab === id
                ? "bg-primary text-on-primary shadow-sm"
                : "bg-white dark:bg-slate-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800 border border-gray-100 dark:border-slate-800"
            }`}
          >
            <Icon className="w-4 h-4" />
            {isRtl ? labelAr : labelEn}
          </button>
        ))}
      </div>

      {tab === "account" ? (
        <AccountPanel
          isRtl={isRtl}
          username={username}
          changePassword={changePassword}
          changeUsername={changeUsername}
        />
      ) : (
        <form onSubmit={handleSubmit} className="card p-6 md:p-8 space-y-6 max-w-2xl">
                    {tab === "contact" &&
            CONTACT_FIELDS.map((f) => (
              <div key={f.key}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {isRtl ? f.labelAr : f.labelEn}
                </label>
                <input
                  type="text"
                  dir={f.dir}
                  placeholder={f.placeholder}
                  {...field(f.key)}
                  className="input-field"
                />
                {f.key === "tiktok" && (
                  <p className="text-xs text-gray-500 mt-2">
                    {isRtl
                      ? "الأيقونة هتظهر في الفوتر بس لما تحط لينك هنا."
                      : "The footer icon only appears once a link is saved here."}
                  </p>
                )}
              </div>
            ))}

          {tab === "shipping" && (
            <DeliveryAreasEditor
              isRtl={isRtl}
              cities={formData?.deliveryCities}
              onChange={(deliveryCities) => setFormData((p) => ({ ...p, deliveryCities }))}
            />
          )}

          {tab === "payment" && (
            <>
              <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">
                {isRtl
                  ? "الرقم/الرابط ده بيظهر للعميل في صفحة الدفع لما يختار الطريقة دي، عشان يحول بنفسه ويبعتلك الإيصال."
                  : "This is shown to the customer at checkout when they pick this method, so they can transfer themselves and send you the receipt."}
              </p>
              {PAYMENT_FIELDS.map((f) => (
                <div key={f.key}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {isRtl ? f.labelAr : f.labelEn}
                  </label>
                  <input
                    type="text"
                    dir={f.dir}
                    placeholder={f.placeholder}
                    {...field(f.key)}
                    className="input-field"
                  />
                </div>
              ))}
            </>
          )}

          {tab === "returns" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {isRtl ? "سياسة الاسترجاع (عربي)" : "Return Policy (Arabic)"}
                </label>
                <textarea rows={10} {...field("returnPolicyAr")} className="input-field resize-y leading-relaxed" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {isRtl ? "سياسة الاسترجاع (English)" : "Return Policy (English)"}
                </label>
                <textarea rows={10} dir="ltr" {...field("returnPolicyEn")} className="input-field resize-y leading-relaxed" />
              </div>
              <p className="text-xs text-gray-500">
                {isRtl
                  ? "سيب سطر فاضي بين كل فقرة والتانية عشان تظهر مفصولة في الصفحة."
                  : "Leave a blank line between paragraphs so they render separately on the page."}
              </p>
            </>
          )}

          <Button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isRtl ? "حفظ الإعدادات" : "Save settings"}
          </Button>
        </form>
      )}
    </div>
  );
};

/** Password and username changes. Kept apart because these hit the auth API. */
const AccountPanel = ({ isRtl, username, changePassword, changeUsername }) => {
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [un, setUn] = useState({ current: "", next: "" });
  const [busy, setBusy] = useState(null);
  const [show, setShow] = useState(false);

  const submitPassword = async (e) => {
    e.preventDefault();
    if (pw.next !== pw.confirm) {
      toast.error(isRtl ? "كلمتا المرور غير متطابقتين" : "The two passwords do not match");
      return;
    }
    setBusy("password");
    const result = await changePassword(pw.current, pw.next);
    setBusy(null);

    if (result.success) {
      toast.success(isRtl ? "تم تغيير كلمة المرور" : "Password changed");
      setPw({ current: "", next: "", confirm: "" });
    } else {
      toast.error(result.error);
    }
  };

  const submitUsername = async (e) => {
    e.preventDefault();
    setBusy("username");
    const result = await changeUsername(un.current, un.next);
    setBusy(null);

    if (result.success) {
      toast.success(isRtl ? "تم تغيير اسم المستخدم" : "Username changed");
      setUn({ current: "", next: "" });
    } else {
      toast.error(result.error, { duration: 7000 });
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="card p-6 md:p-8">
        <h2 className="font-bold text-gray-900 dark:text-white mb-1">
          {isRtl ? "تغيير كلمة المرور" : "Change password"}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          {isRtl
            ? "لازم تدخل كلمة المرور الحالية عشان نتأكد إنك إنت."
            : "Your current password is required to confirm it is you."}
        </p>

        <form onSubmit={submitPassword} className="space-y-4">
          <div className="relative">
            <input
              type={show ? "text" : "password"}
              required
              autoComplete="current-password"
              placeholder={isRtl ? "كلمة المرور الحالية" : "Current password"}
              value={pw.current}
              onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))}
              className="input-field pe-10"
              dir="ltr"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              tabIndex={-1}
            >
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <input
            type={show ? "text" : "password"}
            required
            minLength={8}
            autoComplete="new-password"
            placeholder={isRtl ? "كلمة المرور الجديدة (8 أحرف على الأقل)" : "New password (min 8 characters)"}
            value={pw.next}
            onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))}
            className="input-field"
            dir="ltr"
          />
          <input
            type={show ? "text" : "password"}
            required
            autoComplete="new-password"
            placeholder={isRtl ? "تأكيد كلمة المرور الجديدة" : "Confirm new password"}
            value={pw.confirm}
            onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
            className="input-field"
            dir="ltr"
          />

          <Button type="submit" disabled={busy === "password"} className="w-full flex items-center justify-center gap-2">
            {busy === "password" && <Loader2 className="w-4 h-4 animate-spin" />}
            {isRtl ? "تغيير كلمة المرور" : "Change password"}
          </Button>
        </form>
      </div>

      <div className="card p-6 md:p-8">
        <h2 className="font-bold text-gray-900 dark:text-white mb-1">
          {isRtl ? "تغيير اسم المستخدم" : "Change username"}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          {isRtl ? "اسم المستخدم الحالي: " : "Current username: "}
          <span className="font-mono font-medium text-gray-900 dark:text-white" dir="ltr">
            {username || "—"}
          </span>
        </p>

        <form onSubmit={submitUsername} className="space-y-4">
          <input
            type="password"
            required
            autoComplete="current-password"
            placeholder={isRtl ? "كلمة المرور الحالية" : "Current password"}
            value={un.current}
            onChange={(e) => setUn((p) => ({ ...p, current: e.target.value }))}
            className="input-field"
            dir="ltr"
          />
          <input
            type="text"
            required
            placeholder={isRtl ? "اسم المستخدم الجديد" : "New username"}
            value={un.next}
            onChange={(e) => setUn((p) => ({ ...p, next: e.target.value }))}
            className="input-field"
            dir="ltr"
          />
          <p className="text-xs text-gray-500">
            {isRtl
              ? "حروف إنجليزية وأرقام و . _ - فقط، من 3 لـ 32 حرف."
              : "Latin letters, numbers, dot, dash or underscore. 3-32 characters."}
          </p>

          <Button type="submit" disabled={busy === "username"} variant="outline" className="w-full flex items-center justify-center gap-2">
            {busy === "username" && <Loader2 className="w-4 h-4 animate-spin" />}
            {isRtl ? "تغيير اسم المستخدم" : "Change username"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default DashboardSettings;
