import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, User, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import Logo from "../../components/common/Logo";
import toast from "react-hot-toast";

/**
 * Dashboard sign-in, reachable only at ADMIN_LOGIN_PATH.
 *
 * There is no sign-up: the store has no customer accounts, and the single admin
 * account is created in the Firebase console.
 */
const AdminLoginPage = () => {
  const { login, isAuthenticated, isLoading } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isRtl = language === "ar";

  const [form, setForm] = useState({ username: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Already signed in? Skip the form.
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const result = await login(form.username, form.password);

    if (result.success) {
      toast.success(isRtl ? "أهلاً بيك" : "Welcome back");
      navigate("/dashboard", { replace: true });
    } else {
      toast.error(result.error);
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
