import { useState, useEffect, useMemo } from "react";
import { useData } from "../../context/DataContext";
import { useLanguage } from "../../context/LanguageContext";
import { ORDER_STATUS, ORDER_STATUS_COLORS } from "../../constants";
import { Search, Filter, Eye, Trash2, Package, CheckCircle, XCircle, Loader2, Calendar } from "lucide-react";
import DataTable from "../../components/dashboard/DataTable";
import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";

const DashboardOrders = () => {
  const { orders, ordersLoading, updateOrderStatus, deleteOrder } = useData();
  const { language } = useLanguage();
  const isRtl = language === "ar";

  // Get current month in YYYY-MM format
  const currentMonthStr = new Date().toISOString().substring(0, 7);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  // FIX: default to "all" so the admin sees every order on first load,
  // instead of only this month's (which could look like "no orders" if empty).
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const statusOptions = [
    { value: "all", labelAr: "الكل", labelEn: "All" },
    // Card and wallet orders sit here until callback.php verifies the payment.
    { value: "awaiting_payment", labelAr: "بانتظار الدفع", labelEn: "Awaiting payment" },
    { value: "paid", labelAr: "مدفوع", labelEn: "Paid" },
    { value: "pending", labelAr: "معلق", labelEn: "Pending" },
    { value: "confirmed", labelAr: "مؤكد", labelEn: "Confirmed" },
    { value: "preparing", labelAr: "قيد التحضير", labelEn: "Preparing" },
    { value: "shipped", labelAr: "تم الشحن", labelEn: "Shipped" },
    { value: "delivered", labelAr: "تم التوصيل", labelEn: "Delivered" },
    { value: "cancelled", labelAr: "ملغي", labelEn: "Cancelled" },
  ];

  const safeOrders = (orders || []).filter(order => order != null);

  // Mark orders as seen for notifications
  useEffect(() => {
    const seenKey = "nomany_seen_orders";
    const seen = new Set(JSON.parse(localStorage.getItem(seenKey) || "[]"));
    (orders || []).filter(o => o != null).forEach(order => {
      if (order?.id) seen.add(order.id);
    });
    localStorage.setItem(seenKey, JSON.stringify([...seen]));
  }, [orders]);
  
  // Generate Month/Year options dynamically from orders
  const monthOptions = useMemo(() => {
    const months = new Map();
    months.set("all", isRtl ? "كل الفترات" : "All Time");
    
    // Add current month to the list even if there are no orders yet
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonthIndex = currentDate.getMonth();
    
    const arabicMonths = [
      "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
      "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
    ];
    const englishMonths = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    months.set(
      currentMonthStr, 
      `${isRtl ? arabicMonths[currentMonthIndex] : englishMonths[currentMonthIndex]} ${currentYear} (${isRtl ? "الحالي" : "Current"})`
    );

    // Sort orders by date descending to get recent months first
    const sortedOrders = [...safeOrders].sort((a, b) => new Date(b.date) - new Date(a.date));

    sortedOrders.forEach((order) => {
      if (!order || !order.date) return;
      
      const orderMonth = order.date.substring(0, 7); // Extracts YYYY-MM
      
      if (!months.has(orderMonth)) {
        // FIX: derive year/month from the string directly instead of `new Date(order.date)`,
        // which parses as UTC midnight and can shift a day (and therefore the month)
        // depending on the viewer's local timezone.
        const [yearStr, monthStr] = orderMonth.split("-");
        const year = Number(yearStr);
        const monthIndex = Number(monthStr) - 1;

        const label = isRtl 
          ? `${arabicMonths[monthIndex]} ${year}` 
          : `${englishMonths[monthIndex]} ${year}`;

        months.set(orderMonth, label);
      }
    });

    return Array.from(months.entries());
  }, [safeOrders, isRtl, currentMonthStr]);

  // Filter orders by Search, Status, and Month
  const filteredOrders = useMemo(() => {
    return safeOrders.filter((order) => {
      if (!order) return false;
      
      const matchesSearch =
        (order.id || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (order.customerName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (order.phone || "").includes(searchQuery);
        
      const matchesStatus = statusFilter === "all" || order.status === statusFilter;
      
      // Month filter logic
      const matchesMonth = selectedMonth === "all" || (order.date && order.date.substring(0, 7) === selectedMonth);
      
      return matchesSearch && matchesStatus && matchesMonth;
    });
  }, [safeOrders, searchQuery, statusFilter, selectedMonth]);

  const handleStatusChange = async (orderId, newStatus) => {
    if (!orderId) return;
    await updateOrderStatus(orderId, newStatus);
  };

  const handleDelete = async (orderId) => {
    if (!orderId) return;
    if (!window.confirm(isRtl ? "هل أنت متأكد من حذف هذا الطلب؟" : "Are you sure you want to delete this order?")) {
      return;
    }
    setDeletingId(orderId);
    await deleteOrder(orderId);
    setDeletingId(null);
  };

  const openDetail = (order) => {
    if (!order) return;
    setSelectedOrder(order);
    setIsDetailOpen(true);
  };

  const columns = [
    {
      key: "id",
      header: isRtl ? "رقم الطلب" : "Order ID",
      render: (order) => (
        <span className="font-mono font-medium text-primary">{order.id || "N/A"}</span>
      ),
    },
    {
      key: "customerName",
      header: isRtl ? "العميل" : "Customer",
      render: (order) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-white">{order.customerName || "Unknown"}</p>
          <p className="text-sm text-gray-500">{order.phone || "No phone"}</p>
        </div>
      ),
    },
    {
      key: "total",
      header: isRtl ? "المبلغ" : "Total",
      render: (order) => (
        <span className="font-bold text-gray-900 dark:text-white">
          {(order.total || 0).toFixed(2)} EGP
        </span>
      ),
    },
    {
      key: "paymentMethod",
      header: isRtl ? "الدفع" : "Payment",
      render: (order) => {
        const methods = {
          cod: isRtl ? "الدفع عند الاستلام" : "Cash on Delivery",
          card: isRtl ? "بطاقة" : "Card",
          vodafone: "Vodafone Cash",
        };
        return (
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {methods[order.paymentMethod] || order.paymentMethod || "Unknown"}
          </span>
        );
      },
    },
    {
      key: "status",
      header: isRtl ? "الحالة" : "Status",
      render: (order) => (
        <select
          value={order.status || "pending"}
          onChange={(e) => handleStatusChange(order.id, e.target.value)}
          className={`px-3 py-1 rounded-full text-xs font-medium border-0 cursor-pointer ${ORDER_STATUS_COLORS[order.status] || ORDER_STATUS_COLORS.pending}`}
        >
          {Object.entries(ORDER_STATUS).map(([key, value]) => (
            <option key={value} value={value}>
              {isRtl
                ? statusOptions.find((s) => s.value === value)?.labelAr
                : statusOptions.find((s) => s.value === value)?.labelEn}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: "date",
      header: isRtl ? "التاريخ" : "Date",
      render: (order) => (
        <span className="text-sm text-gray-500 whitespace-nowrap">
          {order.date || "N/A"} {order.time || ""}
        </span>
      ),
    },
    {
      key: "actions",
      header: isRtl ? "إجراءات" : "Actions",
      render: (order) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => openDetail(order)}
            className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 transition-colors"
            title={isRtl ? "عرض التفاصيل" : "View Details"}
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(order.id)}
            disabled={deletingId === order.id}
            className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 transition-colors disabled:opacity-50"
            title={isRtl ? "حذف" : "Delete"}
          >
            {deletingId === order.id ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </button>
        </div>
      ),
    },
  ];

  if (ordersLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-gray-600 dark:text-gray-400">
          {isRtl ? "جاري تحميل الطلبات..." : "Loading orders..."}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {isRtl ? "الطلبات" : "Orders"}
          <span className="ml-2 text-sm font-normal text-gray-500">
            ({filteredOrders.length})
          </span>
        </h1>
      </div>

      {/* Filters - Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder={isRtl ? "بحث برقم الطلب أو العميل..." : "Search by order ID or customer..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field ps-10 pe-4 w-full"
          />
        </div>

        {/* Month/Year Filter */}
        <div className="relative">
          <Calendar className="absolute start-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="input-field ps-10 pe-8 w-full cursor-pointer appearance-none"
          >
            {monthOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="relative">
          <Filter className="absolute start-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field ps-10 pe-8 w-full cursor-pointer appearance-none"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {isRtl ? option.labelAr : option.labelEn}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Orders Table */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>{isRtl ? "لا توجد طلبات في هذه الفترة" : "No orders found for this period"}</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <DataTable
            columns={columns}
            data={filteredOrders}
            emptyMessage={isRtl ? "لا توجد طلبات" : "No orders found"}
          />
        </div>
      )}

      {/* Order Detail Modal */}
      <Modal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title={isRtl ? "تفاصيل الطلب" : "Order Details"}>
        {selectedOrder && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
              <div>
                <p className="text-sm text-gray-500">{isRtl ? "رقم الطلب" : "Order ID"}</p>
                <p className="font-mono font-bold text-lg">{selectedOrder.id || "N/A"}</p>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${ORDER_STATUS_COLORS[selectedOrder.status] || ORDER_STATUS_COLORS.pending}`}>
                {selectedOrder.status || "pending"}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                <p className="text-sm text-gray-500">{isRtl ? "العميل" : "Customer"}</p>
                <p className="font-medium">{selectedOrder.customerName || "Unknown"}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                <p className="text-sm text-gray-500">{isRtl ? "الهاتف" : "Phone"}</p>
                <p className="font-medium">{selectedOrder.phone || "N/A"}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                <p className="text-sm text-gray-500">{isRtl ? "العنوان" : "Address"}</p>
                <p className="font-medium">{selectedOrder.address || "N/A"}, {selectedOrder.city || "N/A"}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                <p className="text-sm text-gray-500">{isRtl ? "طريقة الدفع" : "Payment Method"}</p>
                <p className="font-medium">{selectedOrder.paymentMethod || "N/A"}</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {isRtl ? "المنتجات" : "Products"}
              </p>
              <div className="space-y-2">
                {(selectedOrder.products || []).map((product, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                    <img
                      src={product?.image || `https://placehold.co/60x60/004741/FFFFFF?text=X`}
                      alt={product?.nameEn || "Product"}
                      className="w-12 h-12 rounded-lg object-cover shrink-0"
                      onError={(e) => {
                        e.target.src = `https://placehold.co/60x60/004741/FFFFFF?text=X`;
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{isRtl ? (product?.nameAr || product?.nameEn) : (product?.nameEn || product?.nameAr)}</p>
                      <p className="text-xs text-gray-500">x{product?.quantity || 1}</p>
                    </div>
                    <p className="font-medium whitespace-nowrap">{(product?.price || 0).toFixed(2)} EGP</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center p-4 bg-primary/5 dark:bg-primary/10 rounded-lg">
              <span className="font-bold text-lg">{isRtl ? "الإجمالي" : "Total"}</span>
              <span className="font-bold text-lg text-primary">{(selectedOrder.total || 0).toFixed(2)} EGP</span>
            </div>

            {selectedOrder.notes && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  <span className="font-medium">{isRtl ? "ملاحظات: " : "Notes: "}</span>
                  {selectedOrder.notes}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => {
                  handleStatusChange(selectedOrder.id, "confirmed");
                  setIsDetailOpen(false);
                }}
                className="flex-1 w-full sm:w-auto"
                disabled={selectedOrder.status !== "pending"}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {isRtl ? "تأكيد الطلب" : "Confirm Order"}
              </Button>
              <Button
                onClick={() => {
                  handleStatusChange(selectedOrder.id, "cancelled");
                  setIsDetailOpen(false);
                }}
                variant="outline"
                className="flex-1 w-full sm:w-auto text-red-600 border-red-200 hover:bg-red-50"
                disabled={selectedOrder.status === "delivered" || selectedOrder.status === "cancelled"}
              >
                <XCircle className="w-4 h-4 mr-2" />
                {isRtl ? "إلغاء" : "Cancel"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DashboardOrders;