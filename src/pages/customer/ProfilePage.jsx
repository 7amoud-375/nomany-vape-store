import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { User, Package, LogOut, Mail, RotateCcw } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { useCart } from "../../context/CartContext";
import { useLanguage } from "../../context/LanguageContext";
import { formatPrice } from "../../utils";
import OrderTimeline from "../../components/customer/OrderTimeline";
import toast from "react-hot-toast";

const ProfilePage = () => {
  const { user, logout } = useAuth();
  const { orders, products } = useData();
  const { addToCart } = useCart();
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const navigate = useNavigate();

  const [myOrders, setMyOrders] = useState([]);
  const [reorderingId, setReorderingId] = useState(null);

  useEffect(() => {
    if (user?.email) {
      const filtered = orders.filter(o => o.email === user.email || o.userId === user.uid);
      setMyOrders(filtered);
    }
  }, [orders, user]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const handleReorder = (order) => {
    setReorderingId(order.id);
    let added = 0;
    let unavailable = 0;

    (order.products || []).forEach((item) => {
      const liveProduct = products.find((p) => p.id === item.productId);
      if (liveProduct && liveProduct.availability) {
        addToCart(liveProduct, item.quantity || 1);
        added += 1;
      } else {
        unavailable += 1;
      }
    });

    setReorderingId(null);

    if (added > 0) {
      toast.success(
        isRtl
          ? `تمت إضافة ${added} منتج لسلتك${unavailable > 0 ? ` (${unavailable} غير متوفر حاليًا)` : ""}`
          : `Added ${added} item${added > 1 ? "s" : ""} to your cart${unavailable > 0 ? ` (${unavailable} unavailable)` : ""}`
      );
      navigate("/cart");
    } else {
      toast.error(isRtl ? "للأسف المنتجات دي مش متوفرة حاليًا" : "Sorry, none of these items are available right now");
    }
  };

  if (!user) {
    return (
      <div className="pt-32 pb-20 text-center">
        <h2 className="text-2xl font-bold mb-4">{isRtl ? "يرجى تسجيل الدخول" : "Please login"}</h2>
        <Link to="/login" className="btn-primary">{isRtl ? "تسجيل الدخول" : "Login"}</Link>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-20">
      <div className="container-custom max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-8 mb-8"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {user.displayName || (isRtl ? "عميل" : "Customer")}
                </h1>
                <p className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-sm mt-1">
                  <Mail className="w-4 h-4" />
                  {user.email}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="btn-secondary text-red-600 border-red-200 hover:bg-red-50 flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              {isRtl ? "تسجيل الخروج" : "Logout"}
            </button>
          </div>
        </motion.div>

        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          {isRtl ? "طلباتي" : "My Orders"} ({myOrders.length})
        </h2>

        {myOrders.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">{isRtl ? "لا توجد طلبات بعد" : "No orders yet"}</p>
            <Link to="/products" className="btn-primary">{isRtl ? "تسوق الآن" : "Shop Now"}</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {myOrders.map((order) => (
              <div key={order.id} className="card p-6 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <p className="font-mono font-bold text-primary mb-1">#{order.id}</p>
                    <p className="text-sm text-gray-500">{order.date} {order.time}</p>
                    <p className="text-sm text-gray-500">{order.products?.length} {isRtl ? "منتجات" : "items"}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{formatPrice(order.total, language)}</p>
                  </div>
                </div>

                <OrderTimeline status={order.status} isRtl={isRtl} />

                <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-slate-700">
                  <button
                    onClick={() => handleReorder(order)}
                    disabled={reorderingId === order.id}
                    className="btn-secondary flex items-center gap-2 text-sm disabled:opacity-50"
                  >
                    <RotateCcw className="w-4 h-4" />
                    {isRtl ? "إعادة الطلب" : "Reorder"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;