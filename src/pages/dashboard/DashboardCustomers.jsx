import { useState } from "react";
import { useData } from "../../context/DataContext";
import { useLanguage } from "../../context/LanguageContext";
import { Search, Phone, MapPin, Mail, ShoppingBag, User } from "lucide-react";
import DataTable from "../../components/dashboard/DataTable";

const DashboardCustomers = () => {
  const { orders } = useData();
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const [searchQuery, setSearchQuery] = useState("");

  // Extract unique customers from orders
  const customersMap = new Map();
  (orders || []).forEach(order => {
    if (!order?.phone) return;
    
    const key = order.phone;
    if (!customersMap.has(key)) {
      customersMap.set(key, {
        name: order.customerName || "Unknown",
        phone: order.phone,
        email: order.email || "-",
        address: order.address || "-",
        city: order.city || "-",
        orderCount: 0,
        totalSpent: 0,
        lastOrder: order.date,
      });
    }
    
    const customer = customersMap.get(key);
    customer.orderCount += 1;
    customer.totalSpent += order.total || 0;
    if (order.date > customer.lastOrder) {
      customer.lastOrder = order.date;
    }
  });

  const customers = Array.from(customersMap.values());

  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery) ||
    c.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const columns = [
    {
      key: "name",
      label: isRtl ? "العميل" : "Customer",
      render: (item) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Phone className="w-3 h-3" /> {item.phone}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "city",
      label: isRtl ? "المدينة" : "City",
      render: (item) => (
        <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
          <MapPin className="w-4 h-4" />
          <span>{item.city}</span>
        </div>
      ),
    },
    {
      key: "orderCount",
      label: isRtl ? "الطلبات" : "Orders",
      render: (item) => (
        <div className="flex items-center gap-1">
          <ShoppingBag className="w-4 h-4 text-primary" />
          <span className="font-medium">{item.orderCount}</span>
        </div>
      ),
    },
    {
      key: "totalSpent",
      label: isRtl ? "إجمالي المشتريات" : "Total Spent",
      render: (item) => (
        <span className="font-bold text-gray-900 dark:text-white">
          {item.totalSpent.toFixed(2)} EGP
        </span>
      ),
    },
    {
      key: "lastOrder",
      label: isRtl ? "آخر طلب" : "Last Order",
      render: (item) => (
        <span className="text-sm text-gray-500">{item.lastOrder}</span>
      ),
    },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {isRtl ? "العملاء" : "Customers"}
          <span className="ml-2 text-sm font-normal text-gray-500">({customers.length})</span>
        </h1>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder={isRtl ? "بحث بالاسم أو الهاتف..." : "Search by name or phone..."}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input-field pl-10 w-full"
        />
      </div>

      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{isRtl ? "لا يوجد عملاء" : "No customers found"}</p>
          </div>
        ) : (
          <DataTable columns={columns} data={filtered} />
        )}
      </div>
    </div>
  );
};

export default DashboardCustomers;