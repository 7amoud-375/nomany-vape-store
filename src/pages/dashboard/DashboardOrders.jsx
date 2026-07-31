import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Search, Trash2, Eye, Calendar, CalendarDays, Phone, MapPin,
  StickyNote, CreditCard, Package, X, ChevronDown, Loader2, ShoppingBag,
} from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useData } from "../../context/DataContext";
import { useTranslations } from "../../hooks/useTranslations";
import { formatPrice, todayLocalISO, toNumber, productImage } from "../../utils";
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from "../../constants";
import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import { PageHeader } from "../../components/dashboard/ui";

const STATUS_FLOW = [
  "awaiting_payment", "paid", "pending", "confirmed",
  "preparing", "shipped", "delivered", "cancelled",
];

const DashboardOrders = () => {
  const { language } = useLanguage();
  const { orders, ordersLoading, updateOrderStatus, deleteOrder, settings } = useData();
  const { t } = useTranslations();
  const isRtl = language === "ar";

  /**
   * Defaults to today and re-evaluates on mount, so opening the dashboard on a
   * new morning shows that morning's orders without touching the filter.
   */
  const [selectedDate, setSelectedDate] = useState(() => todayLocalISO());
  const [dateMode, setDateMode] = useState("today"); // today | pick | all
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [detailsOrder, setDetailsOrder] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busyId, setBusyId] = useState(null);

  // If the tab is left open overnight, roll "today" forward rather than
  // silently showing yesterday.
  useEffect(() => {
    if (dateMode !== "today") return undefined;
    const tick = setInterval(() => {
      const now = todayLocalISO();
      setSelectedDate((prev) => (prev === now ? prev : now));
    }, 60_000);
    return () => clearInterval(tick);
  }, [dateMode]);

  const effectiveDate = dateMode === "today" ? todayLocalISO() : selectedDate;

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return (orders || []).filter((order) => {
      if (!order) return false;

      if (dateMode !== "all" && order.date !== effectiveDate) return false;
      if (statusFilter !== "all" && (order.status || "pending") !== statusFilter) return false;

      if (!needle) return true;
      return [order.id, order.customerName, order.phone, order.city]
        .some((v) => String(v ?? "").toLowerCase().includes(needle));
    });
  }, [orders, dateMode, effectiveDate, statusFilter, query]);

  const dayTotal = useMemo(
    () => filtered
      .filter((o) => o.status !== "cancelled")
      .reduce((sum, o) => sum + toNumber(o.total), 0),
    [filtered]
  );

  const label = (status) =>
    ORDER_STATUS_LABELS[status]?.[isRtl ? "ar" : "en"] || status || "—";

  const handleStatus = async (order, status) => {
    setBusyId(order.id);
    await updateOrderStatus(order.id, status);
    setBusyId(null);
    setDetailsOrder((prev) => (prev && prev.id === order.id ? { ...prev, status } : prev));
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="mb-6"><PageHeader title={t("orders")} subtitle={language === "ar" ? "متابعة الطلبات وحالتها" : "Track orders and their status"} /></div>
        <div className="flex items-center gap-2 text-sm">
          <span className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-medium">
            {filtered.length} {isRtl ? "طلب" : "orders"}
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400 font-medium">
            {formatPrice(dayTotal, language)}
          </span>
        </div>
      </div>

      {/* Filters — stack on mobile, row from sm up. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isRtl ? "رقم الطلب، الاسم، التليفون..." : "Order no, name, phone..."}
            className="input-field ps-9 py-2.5 text-sm"
          />
        </div>

        <select
          value={dateMode}
          onChange={(e) => {
            setDateMode(e.target.value);
            if (e.target.value === "pick" && !selectedDate) setSelectedDate(todayLocalISO());
          }}
          className="input-field py-2.5 text-sm"
        >
          <option value="today">{isRtl ? "طلبات النهاردة" : "Today's orders"}</option>
          <option value="pick">{isRtl ? "تاريخ محدد" : "Pick a date"}</option>
          <option value="all">{isRtl ? "كل الطلبات" : "All orders"}</option>
        </select>

        <input
          type="date"
          value={effectiveDate}
          max={todayLocalISO()}
          disabled={dateMode === "all"}
          onChange={(e) => {
            setSelectedDate(e.target.value);
            setDateMode("pick");
          }}
          className="input-field py-2.5 text-sm disabled:opacity-40"
          dir="ltr"
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-field py-2.5 text-sm"
        >
          <option value="all">{isRtl ? "كل الحالات" : "All statuses"}</option>
          {STATUS_FLOW.map((s) => (
            <option key={s} value={s}>{label(s)}</option>
          ))}
        </select>
      </div>

      {ordersLoading ? (
        <div className="card p-12 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <ShoppingBag className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-slate-700" />
          <p className="text-gray-500 dark:text-gray-400">
            {dateMode === "today"
              ? isRtl ? "مفيش طلبات النهاردة لسه" : "No orders today yet"
              : isRtl ? "مفيش طلبات بالفلاتر دي" : "No orders match these filters"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((order, index) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.3) }}
              className="card p-4 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-mono text-sm font-bold text-primary truncate">{order.id}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{order.date} · {order.time}</p>
                </div>
                <span className={`px-2 py-1 rounded-lg text-[11px] font-medium shrink-0 ${ORDER_STATUS_COLORS[order.status] || ORDER_STATUS_COLORS.pending}`}>
                  {label(order.status)}
                </span>
              </div>

              <div className="min-w-0">
                <p className="font-medium text-gray-900 dark:text-white truncate">{order.customerName || "—"}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate" dir="ltr">{order.phone || "—"}</p>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {order.products?.length || 0} {isRtl ? "صنف" : "items"}
                </span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {formatPrice(order.total, language)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={order.status || "pending"}
                  disabled={busyId === order.id}
                  onChange={(e) => handleStatus(order, e.target.value)}
                  className="input-field py-1.5 text-xs flex-1 min-w-0"
                >
                  {STATUS_FLOW.map((s) => (
                    <option key={s} value={s}>{label(s)}</option>
                  ))}
                </select>
                <button
                  onClick={() => setDetailsOrder(order)}
                  title={isRtl ? "التفاصيل" : "Details"}
                  className="p-2 rounded-lg text-primary hover:bg-primary/5 transition-colors shrink-0"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteTarget(order)}
                  title={t("delete")}
                  className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <OrderDetails
        order={detailsOrder}
        onClose={() => setDetailsOrder(null)}
        isRtl={isRtl}
        language={language}
        label={label}
        settings={settings}
        onStatus={handleStatus}
        busy={busyId === detailsOrder?.id}
      />

      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={isRtl ? "حذف الطلب" : "Delete order"}
        size="sm"
      >
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          {isRtl
            ? `متأكد إنك عايز تمسح الطلب ${deleteTarget?.id}؟ مش هينفع ترجعه.`
            : `Delete order ${deleteTarget?.id}? This cannot be undone.`}
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={() => setDeleteTarget(null)}>{t("cancel")}</Button>
          <Button
            variant="danger"
            onClick={async () => {
              const target = deleteTarget;
              setDeleteTarget(null);
              await deleteOrder(target.id);
            }}
          >
            {t("delete")}
          </Button>
        </div>
      </Modal>
    </div>
  );
};

/** Full order breakdown: customer, line items, and a reconciled total. */
const OrderDetails = ({ order, onClose, isRtl, language, label, settings, onStatus, busy }) => {
  if (!order) return null;

  const items = order.products || [];
  const subtotal = items.reduce((sum, i) => sum + toNumber(i.price) * toNumber(i.quantity, 1), 0);
  const shipping = toNumber(order.shippingCost ?? settings?.shippingCost);
  const computed = subtotal + shipping;
  const stored = toNumber(order.total);
  // Surfaced rather than hidden: a mismatch means the order predates a price
  // change, and you want to know before refunding against the wrong number.
  const mismatch = Math.abs(computed - stored) > 0.5;

  const whatsapp = String(order.phone ?? "").replace(/\D/g, "");

  const Row = ({ icon: Icon, label: rowLabel, value, dir }) =>
    value ? (
      <div className="flex gap-3">
        <Icon className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="text-[11px] text-gray-400 uppercase tracking-wide">{rowLabel}</p>
          <p className="text-sm text-gray-900 dark:text-white break-words" dir={dir}>{value}</p>
        </div>
      </div>
    ) : null;

  return (
    <Modal isOpen={!!order} onClose={onClose} title={isRtl ? "تفاصيل الطلب" : "Order details"} size="lg">
      <div className="space-y-5 max-h-[70vh] overflow-y-auto pe-1">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-gray-100 dark:border-slate-800">
          <div>
            <p className="font-mono font-bold text-primary text-lg">{order.id}</p>
            <p className="text-xs text-gray-400 mt-0.5">{order.date} · {order.time}</p>
          </div>
          <select
            value={order.status || "pending"}
            disabled={busy}
            onChange={(e) => onStatus(order, e.target.value)}
            className="input-field py-2 text-sm w-auto"
          >
            {STATUS_FLOW.map((s) => (
              <option key={s} value={s}>{label(s)}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Row icon={Phone} label={isRtl ? "التليفون" : "Phone"} value={order.phone} dir="ltr" />
          <Row icon={CreditCard} label={isRtl ? "طريقة الدفع" : "Payment"} value={order.paymentMethod} />
          <Row
            icon={MapPin}
            label={isRtl ? "العنوان" : "Address"}
            value={[order.address, order.city].filter(Boolean).join("، ")}
          />
          <Row icon={StickyNote} label={isRtl ? "ملاحظات" : "Notes"} value={order.notes} />
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-4 h-4 text-gray-400" />
            <h4 className="font-semibold text-sm text-gray-900 dark:text-white">
              {isRtl ? "المنتجات" : "Items"} ({items.length})
            </h4>
          </div>

          <div className="space-y-2">
            {items.map((item, i) => (
              <div
                key={`${item.productId}-${i}`}
                className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-slate-800/60"
              >
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-slate-700 shrink-0">
                  <img
                    src={item.image || productImage(item) || "https://placehold.co/100x100/004741/FFFFFF?text=%20"}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.src = "https://placehold.co/100x100/004741/FFFFFF?text=%20"; }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {isRtl ? item.nameAr : item.nameEn}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatPrice(item.price, language)} × {item.quantity}
                  </p>
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white shrink-0">
                  {formatPrice(toNumber(item.price) * toNumber(item.quantity, 1), language)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2 pt-4 border-t border-gray-100 dark:border-slate-800">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">{isRtl ? "المجموع" : "Subtotal"}</span>
            <span className="text-gray-900 dark:text-white">{formatPrice(subtotal, language)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">{isRtl ? "التوصيل" : "Shipping"}</span>
            <span className="text-gray-900 dark:text-white">{formatPrice(shipping, language)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-100 dark:border-slate-800">
            <span className="text-gray-900 dark:text-white">{isRtl ? "الإجمالي" : "Total"}</span>
            <span className="text-primary">{formatPrice(stored, language)}</span>
          </div>

          {mismatch && (
            <p className="text-xs text-amber-600 dark:text-amber-400 pt-1">
              {isRtl
                ? `ملحوظة: مجموع الأصناف + الشحن = ${formatPrice(computed, language)}، مختلف عن الإجمالي المحفوظ. غالبًا الأسعار اتغيرت بعد الطلب.`
                : `Note: items + shipping = ${formatPrice(computed, language)}, which differs from the stored total. Prices likely changed after the order was placed.`}
            </p>
          )}
        </div>

        {whatsapp && (
          <a
            href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(
              isRtl ? `مرحبًا ${order.customerName}، بخصوص طلبك ${order.id}` : `Hi ${order.customerName}, about your order ${order.id}`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white"
          >
            {isRtl ? "تواصل مع العميل على واتساب" : "Message customer on WhatsApp"}
          </a>
        )}
      </div>
    </Modal>
  );
};

export default DashboardOrders;
