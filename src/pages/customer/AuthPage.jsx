import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Eye, EyeOff, LogIn, Mail, User, UserPlus } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";

const AuthPage = () => {
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim() || (!isLogin && !name.trim())) {
      setError(isRtl ? "يرجى ملء جميع الحقول" : "Please fill all fields");
      return;
    }

    setIsSubmitting(true);

    try {
      if (isLogin) {
        const result = await login(email, password);
        if (result.success) {
          // If Admin -> go to Dashboard. If Customer -> go to Profile.
          if (result.role === 'admin') {
            navigate("/dashboard");
          } else {
            navigate(location.state?.from || "/profile");
          }
        } else {
          setError(result.error);
        }
      } else {
        // Sign Up flow (Customers only)
        const result = await signup(email, password, name);
        if (result.success) {
          navigate("/profile");
        } else {
          setError(result.error);
        }
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pt-24 pb-20 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="card p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
              {isLogin ? <Lock className="w-8 h-8 text-primary" /> : <UserPlus className="w-8 h-8 text-primary" />}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {isLogin ? (isRtl ? "تسجيل الدخول" : "Login") : (isRtl ? "إنشاء حساب" : "Sign Up")}
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium mb-2">{isRtl ? "الاسم" : "Name"}</label>
                <div className="relative">
                  <User className="absolute start-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input-field w-full ps-10 pe-4"
                    placeholder={isRtl ? "اسمك الكامل" : "Your full name"}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">{isRtl ? "البريد الإلكتروني" : "Email"}</label>
              <div className="relative">
                <Mail className="absolute start-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field w-full ps-10 pe-4"
                  placeholder="example@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">{isRtl ? "كلمة المرور" : "Password"}</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field w-full ps-4 pe-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200">
                <p className="text-sm text-red-600 text-center font-medium">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <LogIn className="w-5 h-5" />
              {isSubmitting ? (isRtl ? "جاري المعالجة..." : "Processing...") : (isLogin ? (isRtl ? "دخول" : "Login") : (isRtl ? "تسجيل" : "Sign Up"))}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => { setIsLogin(!isLogin); setError(""); }}
              className="text-sm text-primary hover:underline font-medium"
            >
              {isLogin 
                ? (isRtl ? "ليس لديك حساب؟ إنشاء حساب جديد" : "Don't have an account? Sign up") 
                : (isRtl ? "لديك حساب بالفعل؟ تسجيل الدخول" : "Already have an account? Login")}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthPage;