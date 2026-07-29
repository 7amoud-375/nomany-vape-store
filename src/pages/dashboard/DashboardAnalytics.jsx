import { useMemo } from "react";
import { useLanguage } from "../../context/LanguageContext";
import { useData } from "../../context/DataContext";
import { useTranslations } from "../../hooks/useTranslations";
import { formatPrice } from "../../utils";
import StatsCard from "../../components/dashboard/StatsCard";
import { BarChart3, TrendingUp, DollarSign, ShoppingCart, Package, Users, Tag, Activity } from "lucide-react";

// Simple SVG Bar Chart Component
const SimpleBarChart = ({ data, title, color = "#004741", language }) => {
  if (!data || data.length === 0) return null;
  
  const maxValue = Math.max(...data.map(d => d.value || 0));
  const chartHeight = 200;
  const barWidth = Math.max(30, 600 / data.length - 10);
  const gap = 10;
  
  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
      <div className="overflow-x-auto">
        <div className="flex items-end justify-around" style={{ minHeight: chartHeight + 40 }}>
          {data.map((item, index) => {
            const height = maxValue > 0 ? (item.value / maxValue) * chartHeight : 0;
            return (
              <div key={index} className="flex flex-col items-center gap-2">
                <div className="relative group">
                  <div
                    className="rounded-t-lg transition-all duration-500 hover:opacity-80"
                    style={{
                      width: barWidth,
                      height: `${height}px`,
                      backgroundColor: color,
                      minHeight: item.value > 0 ? "4px" : "0",
                    }}
                  />
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {formatPrice(item.value, language)}
                  </div>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 text-center max-w-[80px] truncate">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Simple SVG Line Chart Component
const SimpleLineChart = ({ data, title, color = "#004741", language }) => {
  if (!data || data.length === 0) return null;
  
  const values = data.map(d => d.value || 0);
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  const range = maxValue - minValue || 1;
  
  const width = 600;
  const height = 200;
  const padding = { top: 20, right: 20, bottom: 40, left: 20 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  const points = data.map((item, index) => {
    const x = padding.left + (index / (data.length - 1 || 1)) * chartWidth;
    const y = padding.top + chartHeight - ((item.value - minValue) / range) * chartHeight;
    return `${x},${y}`;
  }).join(" ");
  
  const areaPoints = `${padding.left},${padding.top + chartHeight} ${points} ${padding.left + chartWidth},${padding.top + chartHeight}`;
  
  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ minWidth: 300 }}>
          {/* Grid lines */}
          {[0, 1, 2, 3, 4].map(i => {
            const y = padding.top + (i / 4) * chartHeight;
            return (
              <line key={i} x1={padding.left} y1={y} x2={width - padding.right} y2={y} 
                stroke="currentColor" strokeOpacity="0.1" className="text-gray-400" strokeDasharray="4 4" />
            );
          })}
          
          {/* Area fill */}
          <polygon points={areaPoints} fill={color} opacity="0.1" />
          
          {/* Line */}
          <polyline points={points} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          
          {/* Data points */}
          {data.map((item, index) => {
            const x = padding.left + (index / (data.length - 1 || 1)) * chartWidth;
            const y = padding.top + chartHeight - ((item.value - minValue) / range) * chartHeight;
            return (
              <g key={index}>
                <circle cx={x} cy={y} r="5" fill={color} className="hover:r-6 transition-all" />
                <text x={x} y={height - 10} textAnchor="middle" className="text-xs fill-gray-500 dark:fill-gray-400">
                  {item.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

// Simple Pie/Donut Chart
const SimpleDonutChart = ({ data, title }) => {
  if (!data || data.length === 0) return null;
  
  const total = data.reduce((sum, d) => sum + (d.value || 0), 0);
  const colors = ["#004741", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];
  
  let currentAngle = 0;
  const radius = 80;
  const center = 100;
  
  const getCoordinates = (angle) => ({
    x: center + radius * Math.cos((angle - 90) * Math.PI / 180),
    y: center + radius * Math.sin((angle - 90) * Math.PI / 180),
  });
  
  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <svg viewBox="0 0 200 200" className="w-48 h-48 shrink-0">
          {data.map((item, index) => {
            const sliceAngle = total > 0 ? (item.value / total) * 360 : 0;
            const startAngle = currentAngle;
            const endAngle = currentAngle + sliceAngle;
            currentAngle += sliceAngle;
            
            const start = getCoordinates(startAngle);
            const end = getCoordinates(endAngle);
            const largeArc = sliceAngle > 180 ? 1 : 0;
            
            const pathData = [
              `M ${center} ${center}`,
              `L ${start.x} ${start.y}`,
              `A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`,
              "Z",
            ].join(" ");
            
            return (
              <path
                key={index}
                d={pathData}
                fill={colors[index % colors.length]}
                stroke="white"
                strokeWidth="2"
                className="dark:stroke-slate-800 hover:opacity-80 transition-opacity"
              />
            );
          })}
          <circle cx={center} cy={center} r="45" fill="white" className="dark:fill-slate-800" />
          <text x={center} y={center - 5} textAnchor="middle" className="text-lg font-bold fill-gray-900 dark:fill-white">
            {total}
          </text>
          <text x={center} y={center + 12} textAnchor="middle" className="text-xs fill-gray-500 dark:fill-gray-400">
            Total
          </text>
        </svg>
        
        <div className="space-y-2 w-full">
          {data.map((item, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
                <span className="text-gray-700 dark:text-gray-300">{item.label}</span>
              </div>
              <span className="font-medium text-gray-900 dark:text-white">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const DashboardAnalytics = () => {
  const { language } = useLanguage();
  const { stats, orders, products, categories } = useData();
  const { t } = useTranslations();
  const isRtl = language === "ar";

  // Generate dynamic chart data from orders
  const revenueByDay = useMemo(() => {
    const days = {};
    const now = new Date();
    // Last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dayName = d.toLocaleDateString(isRtl ? "ar-EG" : "en-US", { weekday: "short" });
      days[dateStr] = { label: dayName, value: 0 };
    }
    
    (orders || []).forEach(order => {
      if (order?.date && days[order.date] && order.status !== "cancelled") {
        days[order.date].value += order.total || 0;
      }
    });
    
    return Object.values(days);
  }, [orders, isRtl]);

  const ordersByStatus = useMemo(() => {
    const counts = { pending: 0, confirmed: 0, preparing: 0, shipped: 0, delivered: 0, cancelled: 0 };
    (orders || []).forEach(order => {
      if (order?.status && counts[order.status] !== undefined) {
        counts[order.status]++;
      }
    });
    return Object.entries(counts)
      .filter(([_, count]) => count > 0)
      .map(([status, count]) => ({
        label: isRtl 
          ? { pending: "معلق", confirmed: "مؤكد", preparing: "قيد التحضير", shipped: "تم الشحن", delivered: "تم التوصيل", cancelled: "ملغي" }[status]
          : status.charAt(0).toUpperCase() + status.slice(1),
        value: count,
      }));
  }, [orders, isRtl]);

  const topCategories = useMemo(() => {
    const catCounts = {};
    (products || []).forEach(product => {
      const catId = product?.category;
      if (catId) {
        catCounts[catId] = (catCounts[catId] || 0) + 1;
      }
    });
    
    return Object.entries(catCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([catId, count]) => {
        const cat = (categories || []).find(c => c.id === catId);
        return {
          label: isRtl ? (cat?.nameAr || catId) : (cat?.nameEn || catId),
          value: count,
        };
      });
  }, [products, categories, isRtl]);

  const monthlyRevenue = useMemo(() => {
    const months = {};
    const monthNames = isRtl 
      ? ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"]
      : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    (orders || []).forEach(order => {
      if (order?.date && order.status !== "cancelled") {
        const month = parseInt(order.date.split("-")[1]) - 1;
        months[month] = (months[month] || 0) + (order.total || 0);
      }
    });
    
    return Object.entries(months)
      .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
      .map(([month, value]) => ({
        label: monthNames[parseInt(month)],
        value,
      }));
  }, [orders, isRtl]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("analytics")}</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title={isRtl ? "الإيرادات الشهرية" : "Monthly Revenue"} value={formatPrice(stats.monthlyRevenue, language)} icon={DollarSign} color="green" />
        <StatsCard title={isRtl ? "الإيرادات اليومية" : "Daily Revenue"} value={formatPrice(stats.dailyRevenue, language)} icon={TrendingUp} color="blue" />
        <StatsCard title={isRtl ? "إجمالي الطلبات" : "Total Orders"} value={stats.totalOrders} icon={ShoppingCart} color="primary" />
        <StatsCard title={isRtl ? "إجمالي المنتجات" : "Total Products"} value={stats.totalProducts} icon={Package} color="purple" />
      </div>

      {/* Second Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title={isRtl ? "الأقسام" : "Categories"} value={stats.totalCategories} icon={Tag} color="orange" />
        <StatsCard title={isRtl ? "المنتجات غير المتوفرة" : "Out of Stock"} value={stats.outOfStock} icon={Package} color="red" />
        <StatsCard title={isRtl ? "العروض النشطة" : "Active Offers"} value={stats.activeOffers} icon={Activity} color="teal" />
        <StatsCard title={isRtl ? "الماركات" : "Brands"} value={stats.totalBrands} icon={Users} color="indigo" />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SimpleLineChart 
          data={revenueByDay} 
          title={isRtl ? "الإيرادات (آخر 7 أيام)" : "Revenue (Last 7 Days)"} 
          color="#004741" 
          language={language}
        />
        <SimpleBarChart 
          data={monthlyRevenue} 
          title={isRtl ? "الإيرادات الشهرية" : "Monthly Revenue"} 
          color="#10b981" 
          language={language}
        />
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SimpleDonutChart 
          data={ordersByStatus} 
          title={isRtl ? "حالات الطلبات" : "Order Statuses"} 
        />
        <SimpleBarChart 
          data={topCategories} 
          title={isRtl ? "أكثر الأقسام منتجات" : "Top Categories by Products"} 
          color="#8b5cf6" 
          language={language}
        />
      </div>
    </div>
  );
};

export default DashboardAnalytics;