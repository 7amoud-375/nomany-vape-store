import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Lock, User, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import Logo from "../../components/common/Logo";
import toast from "react-hot-toast";

/**
 * Dashboard sign-in, reachable only at ADMIN_LOGIN_PATH.
 *
 * There is no sign-up: the store has no customer accounts, and the single admin
 * account is seeded from api/.env on first boot.
 */
const AdminLoginPage = () => {
  const { login, isAuthenticated, isLoading } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isRtl = language === "ar";

  const [form, setForm] = useState({ username: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Held on the form rather than only in a toast: a toast disappears after a
  // few seconds, and "did it even try?" is the worst thing a login can leave
  // you wondering.
  const [error, setError] = useState("");

  // Already signed in? Skip the form.
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  /**
   * The API answers in English. Map the cases worth distinguishing to the
   * visitor's language, and fall back to whatever the server said rather than
   * swallowing an unexpected error behind a generic string.
   */
  const localiseError = (message) => {
    const text = String(message || "");

    if (/wrong username or password/i.test(text)) {
      return isRtl
        ? "اسم المستخدم أو كلمة المرور غير صحيحة"
        : "Wrong username or password";
    }
    if (/too many requests/i.test(text)) {
      return isRtl
        ? "محاولات كتير. استنى شوية وجرّب تاني."
        : "Too many attempts. Wait a moment and try again.";
    }
    if (/not configured|server is not/i.test(text)) {
      return isRtl
        ? "السيرفر مش متظبط. راجع ملف api/.env."
        : "The server is not configured. Check api/.env.";
    }
    if (/could not reach|unexpected response/i.test(text)) {
      return isRtl
        ? "تعذر الوصول للسيرفر. اتأكد من الاتصال."
        : "Could not reach the server. Check your connection.";
    }
    return text || (isRtl ? "تعذر تسجيل الدخول" : "Could not sign in");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const result = await login(form.username, form.password);

    if (result.success) {
      toast.success(isRtl ? "أهلاً بيك" : "Welcome back");
      navigate("/dashboard", { replace: true });
    } else {
      const message = localiseError(result.error);
      setError(message);
      toast.error(message);
      // Clear only the password — retyping the username every attempt is
      // needless friction when the username is usually the part that is right.
      setForm((prev) => ({ ...prev, password: "" }));
    }

    setSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-secondary-light via-white to-secondary-light dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo />
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            {isRtl ? "لوحة التحكم" : "Dashboard"}
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-800 p-8 space-y-5"
        >
          {/* role="alert" so a screen reader announces the failure instead of
              the form silently resetting the password field. */}
          <AnimatePresence>
            {error && (
              <motion.p
                key={error}
                role="alert"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm
                           text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </motion.p>
            )}
          </AnimatePresence>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {isRtl ? "اسم المستخدم" : "Username"}
            </label>
            <div className="relative">
              <User className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 ${isRtl ? "right-3" : "left-3"}`} />
              <input
                type="text"
                required
                autoFocus
                autoComplete="username"
                value={form.username}
                onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
                className={`input-field ${isRtl ? "pr-10" : "pl-10"}`}
                placeholder={isRtl ? "اسم المستخدم" : "username"}
                dir="ltr"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {isRtl ? "كلمة المرور" : "Password"}
            </label>
            <div className="relative">
              <Lock className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 ${isRtl ? "right-3" : "left-3"}`} />
              <input
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                className={`input-field ${isRtl ? "pr-10 pl-10" : "pl-10 pr-10"}`}
                placeholder="••••••••"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className={`absolute top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 ${isRtl ? "left-3" : "right-3"}`}
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={submitting} className="btn-primary w-full flex items-center justify-center gap-2">
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {isRtl ? "جاري الدخول..." : "Signing in..."}
              </>
            ) : (
              isRtl ? "دخول" : "Sign in"
            )}
          </button>
        </form>

        <div className="text-center mt-6">
          <Link to="/" className="text-sm text-gray-500 hover:text-primary transition-colors">
            {isRtl ? "العودة للمتجر" : "Back to the store"}
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminLoginPage;
