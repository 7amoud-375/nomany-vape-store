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
} from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useData } from "../../context/DataContext";
import { useAuth } from "../../context/AuthContext";
import { useTranslations } from "../../hooks/useTranslations";
import { toNumber } from "../../utils";
import Button from "../../components/ui/Button";
import toast from "react-hot-toast";

// Store name, hashtag, address and footer text were removed at the owner's
// request — they are set once and never change, so they only added noise. The
// values still live in src/data/settings.js and still render on the site.
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

const DashboardSettings = () => {
  const { language } = useLanguage();
  const { settings, updateSettings } = useData();
  const { changePassword, changeUsername, username } = useAuth();
  const { t } = useTranslations();
  const isRtl = language === "ar";

  const [tab, setTab] = useState("contact");
  const [formData, setFormData] = useState(settings);
  const [saving, setSaving] = useState(false);

  // settings arrives from Firebase after the first render, so seeding state
  // once would leave the form showing stale values until a manual reload.
  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSaving(true);
    updateSettings({ ...formData, shippingCost: toNumber(formData.shippingCost) });
    setSaving(false);
  };

  const field = (key) => ({
    value: formData?.[key] ?? "",
    onChange: (e) => setFormData((p) => ({ ...p, [key]: e.target.value })),
  });

  const tabs = [
    { id: "contact", icon: Share2, labelAr: "التواصل", labelEn: "Contact" },
    { id: "shipping", icon: Truck, labelAr: "الشحن", labelEn: "Shipping" },
    { id: "returns", icon: RotateCcw, labelAr: "سياسة الاسترجاع", labelEn: "Returns" },
    { id: "account", icon: KeyRound, labelAr: "حسابي", labelEn: "Account" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{t("settings")}</h1>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 -mx-1 px-1">
        {tabs.map(({ id, icon: Icon, labelAr, labelEn }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
              tab === id
                ? "bg-primary text-white shadow-sm"
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
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {isRtl ? "تكلفة الشحن (ج.م)" : "Shipping Cost (EGP)"}
              </label>
              <input
                type="number"
                min="0"
                step="1"
                {...field("shippingCost")}
                className="input-field"
                placeholder="80"
              />
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                {isRtl
                  ? "بيتضاف تلقائيًا لإجمالي كل طلب. سيرفر الدفع بيقرأ الرقم ده كمان، فلازم تحفظ الصفحة دي مرة على الأقل عشان الدفع الإلكتروني يحسب الشحن صح."
                  : "Added automatically to every order total. The payment server reads this value too, so save this page at least once or card payments will bill without shipping."}
              </p>
            </div>
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

/** Password and username changes. Kept apart because these hit Firebase Auth. */
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
