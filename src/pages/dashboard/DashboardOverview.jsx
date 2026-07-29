import { useState, useMemo } from "react";
import {
  Package,
  Grid3X3,
  ShoppingCart,
  DollarSign,
  Percent,
  AlertTriangle,
  Users,
  Clock,
  Filter,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useData } from "../../context/DataContext";
import { useTranslations } from "../../hooks/useTranslations";
import { formatPrice } from "../../utils";
import StatsCard from "../../components/dashboard/StatsCard";
import DataTable from "../../components/dashboard/DataTable";

const DashboardOverview = () => {
  const { language } = useLanguage();
  const { stats, orders, products, offers, categories } = useData();
  const { t } = useTranslations();
  const [selectedMonth, setSelectedMonth] = useState("all");

  // Generate month options from orders
  const monthOptions = useMemo(() => {
    const months = new Map();
    months.set("all", language === "ar" ? "كل الأوقات" : "All Time");

    const sortedOrders = [...orders].sort((a, b) => new Date(b.date) - new Date(a.date));

    sortedOrders.forEach((order) => {
      if (!order || !order.date) return;
      
      const date = new Date(order.date);
      const year = date.getFullYear();
      const month = date.getMonth();
      const key = `${year}-${String(month + 1).padStart(2, "0")}`;

      const arabicMonths = [
        "يناير", "فبراير", "مارس", "إبريل", "مايو", "يونيو",
        "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
      ];
      const englishMonths = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];

      const label = language === "ar"
        ? `${arabicMonths[month]} ${year}`
        : `${englishMonths[month]} ${year}`;

      if (!months.has(key)) {
        months.set(key, label);
      }
    });

    return Array.from(months.entries());
  }, [orders, language]);

  // Filter orders by selected month
  const filteredOrders = useMemo(() => {
    if (selectedMonth === "all") return orders;
    return orders.filter((order) => order && order.date && order.date.substring(0, 7) === selectedMonth);
  }, [orders, selectedMonth]);

  // Calculate real stats for selected period
  const periodStats = useMemo(() => {
    const validOrders = filteredOrders.filter(o => o != null && o.total != null);
    
    const totalRevenue = validOrders
      .filter((o) => o.status !== "cancelled")
      .reduce((sum, o) => sum + (o.total || 0), 0);

    const totalOrders = validOrders.length;
    const pendingOrders = validOrders.filter((o) => o.status === "pending").length;
    const deliveredOrders = validOrders.filter((o) => o.status === "delivered").length;

    // Unique customers by phone
    const uniqueCustomers = [...new Set(validOrders.map((o) => o.phone).filter(Boolean))].length;

    return {
      totalRevenue,
      totalOrders,
      pendingOrders,
      deliveredOrders,
      uniqueCustomers,
    };
  }, [filteredOrders]);

  // Calculate trends (compare with previous month)
  const trends = useMemo(() => {
    if (selectedMonth === "all" || !selectedMonth.includes("-")) {
      return null;
    }

    const [year, month] = selectedMonth.split("-").map(Number);
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevMonthKey = `${prevYear}-${String(prevMonth).padStart(2, "0")}`;

    const prevOrders = orders.filter((o) => o && o.date && o.date.substring(0, 7) === prevMonthKey);
    const prevRevenue = prevOrders
      .filter((o) => o.status !== "cancelled")
      .reduce((sum, o) => sum + (o.total || 0), 0);

    const currentRevenue = periodStats.totalRevenue;
    const currentOrders = periodStats.totalOrders;

    const revenueTrend = prevRevenue > 0
      ? Math.round(((currentRevenue - prevRevenue) / prevRevenue) * 100)
      : currentRevenue > 0 ? 100 : 0;

    const ordersTrend = prevOrders.length > 0
      ? Math.round(((currentOrders - prevOrders.length) / prevOrders.length) * 100)
      : currentOrders > 0 ? 100 : 0;

    return {
      revenue: { value: revenueTrend, up: revenueTrend >= 0 },
      orders: { value: ordersTrend, up: ordersTrend >= 0 },
    };
  }, [orders, selectedMonth, periodStats]);

  // Recent orders (last 5 from filtered)
  const recentOrders = useMemo(() => {
    return [...filteredOrders]
      .filter(o => o != null && o.date)
      .sort((a, b) => new Date(b.date + "T" + (b.time || "00:00:00")) - new Date(a.date + "T" + (a.time || "00:00:00")))
      .slice(0, 5);
  }, [filteredOrders]);

  // FIXED: DataTable columns with render receiving the FULL ROW OBJECT
  const orderColumns = [
    {
      key: "id",
      header: language === "ar" ? "رقم الطلب" : "Order #",
      render: (order) => <span className="font-mono font-medium text-primary">{order.id || "N/A"}</span>,
    },
    {
      key: "customerName",
      header: language === "ar" ? "العميل" : "Customer",
      render: (order) => <span className="font-medium">{order.customerName || "Unknown"}</span>,
    },
    {
      key: "phone",
      header: language === "ar" ? "الهاتف" : "Phone",
      render: (order) => <span dir="ltr">{order.phone || "N/A"}</span>,
    },
    {
      key: "total",
      header: language === "ar" ? "المجموع" : "Total",
      render: (order) => <span className="font-bold">{formatPrice(order.total || 0, language)}</span>,
    },
    {
      key: "status",
      header: language === "ar" ? "الحالة" : "Status",
      render: (order) => (
        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
          order.status === "delivered" ? "bg-green-100 text-green-700" :
          order.status === "pending" ? "bg-yellow-100 text-yellow-700" :
          order.status === "shipped" ? "bg-blue-100 text-blue-700" :
          order.status === "confirmed" ? "bg-blue-100 text-blue-700" :
          order.status === "preparing" ? "bg-purple-100 text-purple-700" :
          "bg-gray-100 text-gray-700"
        }`}>
          {t(order.status) || order.status || "pending"}
        </span>
      ),
    },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("overview")}</h1>

        {/* Month Filter */}
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="input-field py-2 px-3 text-sm"
          >
            {monthOptions.map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title={language === "ar" ? "إجمالي الطلبات" : "Total Orders"}
          value={periodStats.totalOrders}
          icon={ShoppingCart}
          color="blue"
          trend={trends ? `${trends.orders.value > 0 ? "+" : ""}${trends.orders.value}%` : null}
          trendUp={trends ? trends.orders.up : null}
        />
        <StatsCard
          title={language === "ar" ? "الإيرادات" : "Revenue"}
          value={formatPrice(periodStats.totalRevenue, language)}
          icon={DollarSign}
          color="green"
          trend={trends ? `${trends.revenue.value > 0 ? "+" : ""}${trends.revenue.value}%` : null}
          trendUp={trends ? trends.revenue.up : null}
        />
        <StatsCard
          title={language === "ar" ? "العملاء" : "Customers"}
          value={periodStats.uniqueCustomers}
          icon={Users}
          color="purple"
        />
        <StatsCard
          title={language === "ar" ? "تم التوصيل" : "Delivered"}
          value={periodStats.deliveredOrders}
          icon={Package}
          color="primary"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <StatsCard
          title={language === "ar" ? "المنتجات" : "Products"}
          value={stats.totalProducts}
          icon={Package}
          color="orange"
        />
        <StatsCard
          title={language === "ar" ? "طلبات معلقة" : "Pending Orders"}
          value={periodStats.pendingOrders}
          icon={AlertTriangle}
          color="red"
        />
        <StatsCard
          title={language === "ar" ? "عروض نشطة" : "Active Offers"}
          value={stats.activeOffers}
          icon={Percent}
          color="primary"
        />
      </div>

      {/* Recent Orders */}
      <div className="card">
        <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {language === "ar" ? "أحدث الطلبات" : "Recent Orders"}
          </h2>
          <span className="text-sm text-gray-500">
            {filteredOrders.length} {language === "ar" ? "طلب" : "orders"}
            {selectedMonth !== "all" && ` • ${monthOptions.find(([k]) => k === selectedMonth)?.[1]}`}
          </span>
        </div>
        {recentOrders.length > 0 ? (
          <DataTable columns={orderColumns} data={recentOrders} />
        ) : (
          <div className="text-center py-12">
            <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">{language === "ar" ? "لا توجد طلبات" : "No orders yet"}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardOverview;