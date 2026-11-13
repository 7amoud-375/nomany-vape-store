import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BadgeCheck, CalendarClock, ChevronDown, CircleDollarSign, Landmark, MapPin, Pencil, Phone,
  Printer, Search, ShoppingBag, StickyNote, Trash2, Truck, Wallet,
} from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useData } from "../../context/DataContext";
import { useRealtime, useRealtimeEvent } from "../../context/RealtimeContext";
import {
  fetchOrdersInRange, updateOrderDetails, deleteOrderApi, setOrderPaymentStatus,
} from "../../services/apiClient";
import { formatPrice, todayLocalISO, flavorLabel } from "../../utils";
import {
  Card, EmptyState, Field, ModalShell, PageHeader, PrimaryButton, SecondaryButton,
} from "../../components/dashboard/ui";
import { printOrders } from "./orderPrint";
import toast from "react-hot-toast";

/**
 * Orders console.
 *
 * Structured after the patchi-cafe admin: a day/week/month range picker driving
 * both the list and the printed sheet, one self-contained expandable row per
 * order carrying its full detail, and a period summary underneath.
 *
 * There is deliberately no fulfilment-status column or filter — that field
 * was removed outright (see api/lib/db.php). Fulfilment here is a phone call
 * and a delivery, not a workflow, and a status nobody maintained was worse
 * than none at all.
 *
 * The one order state this shop does track is payment: cash on delivery
 * starts unpaid and is marked paid once collected; instapay/vodafone_cash
 * are manual transfers the customer sends themselves, so an admin marks the
 * order paid by hand once the money is actually seen. That's the toggle
 * below, not a status workflow.
 */

/**
 * Local calendar date. toISOString() would convert to UTC first, rolling the
 * day over for anyone east of Greenwich and filing orders under the wrong date.
 */
const iso = (date) => {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};

const MODES = [
  { id: "day", labelAr: "يوم", labelEn: "Day" },
  { id: "week", labelAr: "أسبوع", labelEn: "Week" },
  { id: "month", labelAr: "شهر", labelEn: "Month" },
];

const PAYMENT_META = {
  cod: { icon: Truck, labelAr: "عند الاستلام", labelEn: "Cash on delivery" },
  instapay: { icon: Landmark, labelAr: "انستا باي", labelEn: "InstaPay" },
  vodafone_cash: { icon: Wallet, labelAr: "فودافون كاش", labelEn: "Vodafone Cash" },
};

/** Turns the chosen mode + anchor date into the inclusive range sent to the API. */
function resolveRange(mode, anchor, locale) {
  const date = new Date(`${anchor}T00:00:00`);
  if (!anchor || Number.isNaN(date.getTime())) {
    const today = todayLocalISO();
    return { from: today, to: today, label: today };
  }

  if (mode === "day") {
    return { from: anchor, to: anchor, label: date.toLocaleDateString(locale, { dateStyle: "full" }) };
  }

  if (mode === "week") {
    // Weeks run Saturday to Friday, which is the Egyptian working week.
    const start = new Date(date);
    start.setDate(start.getDate() - ((start.getDay() + 1) % 7));
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    const short = { day: "numeric", month: "short" };
    return {
      from: iso(start),
      to: iso(end),
      label: `${start.toLocaleDateString(locale, short)} – ${end.toLocaleDateString(locale, {
        ...short,
        year: "numeric",
      })}`,
    };
  }

  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return {
    from: iso(start),
    to: iso(end),
    label: start.toLocaleDateString(locale, { month: "long", year: "numeric" }),
  };
}

const countItems = (order) =>
  (order.products || []).reduce((sum, line) => sum + (Number(line.quantity) || 1), 0);

const DashboardOrders = () => {
  const { language } = useLanguage();
  const { settings } = useData();
  const { readyCount } = useRealtime();
  const isRtl = language === "ar";
  const locale = isRtl ? "ar-EG" : "en-GB";

  const [today, setToday] = useState(() => todayLocalISO());
  const [mode, setMode] = useState("day");
  const [anchor, setAnchor] = useState(today);
  // Stays on today — following the midnight rollover — until the admin picks
  // another date, at which point the view stops moving under them.
  const [followToday, setFollowToday] = useState(true);
  const [query, setQuery] = useState("");

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({
    customerName: "", phone: "", address: "", city: "", notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [freshIds, setFreshIds] = useState(() => new Set());
  // dbIds with a payment-status toggle in flight, so the button can't be
  // double-clicked into two conflicting requests.
  const [payingIds, setPayingIds] = useState(() => new Set());

  // If the tab is left open overnight, roll "today" forward rather than
  // silently continuing to show yesterday.
  useEffect(() => {
    const tick = setInterval(() => {
      const now = todayLocalISO();
      setToday((prev) => (prev === now ? prev : now));
    }, 60_000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (followToday && anchor !== today) setAnchor(today);
  }, [today, followToday, anchor]);

  const selectDate = (value) => {
    setAnchor(value || today);
    setFollowToday(!value || value === today);
  };

  const range = useMemo(() => resolveRange(mode, anchor, locale), [mode, anchor, locale]);
  const viewingToday = anchor === today;

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchOrdersInRange(range.from, range.to);
      setOrders(Array.isArray(rows) ? rows : []);
    } catch (error) {
      toast.error(error.message || (isRtl ? "تعذر تحميل الطلبات" : "Could not load orders"));
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to, isRtl]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  /**
   * A new order re-runs the same query rather than being spliced in: the list is
   * date-filtered and every total below is derived from it, so appending an
   * order that falls outside the selected range would quietly corrupt them.
   */
  useRealtimeEvent("order:new", (order) => {
    if (order?.id) setFreshIds((prev) => new Set(prev).add(order.id));
    loadOrders();
  });

  // Reconnecting after a drop: pick up whatever landed while polling was down.
  useEffect(() => {
    if (readyCount > 1) loadOrders();
  }, [readyCount, loadOrders]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return orders;
    return orders.filter((order) =>
      [order.id, order.customerName, order.phone, order.city, order.address].some((field) =>
        String(field ?? "").toLowerCase().includes(needle)
      )
    );
  }, [orders, query]);

  const openOrder = (order) => {
    const next = expanded === order.id ? null : order.id;
    setExpanded(next);
    // Opening a highlighted order is what marks it seen.
    if (next && freshIds.has(order.id)) {
      setFreshIds((prev) => {
        const copy = new Set(prev);
        copy.delete(order.id);
        return copy;
      });
    }
  };

  const startEdit = (order, event) => {
    event.stopPropagation();
    setEditing(order);
    setEditForm({
      customerName: order.customerName || "",
      phone: order.phone || "",
      address: order.address || "",
      city: order.city || "",
      notes: order.notes || "",
    });
  };

  const saveEdit = async (event) => {
    event.preventDefault();

    const phone = editForm.phone.replace(/\s/g, "");
    if (!editForm.customerName.trim() || !/^01[0125][0-9]{8}$/.test(phone)) {
      toast.error(
        isRtl ? "الاسم ورقم موبايل صحيح مطلوبين" : "A name and a valid mobile number are required"
      );
      return;
    }

    setSaving(true);
    try {
      await updateOrderDetails(editing.dbId, { ...editForm, phone });
      setEditing(null);
      await loadOrders();
      toast.success(isRtl ? "تم حفظ التعديلات" : "Order updated");
    } catch (error) {
      toast.error(error.message || (isRtl ? "تعذر الحفظ" : "Could not save the order"));
    } finally {
      setSaving(false);
    }
  };

  const togglePaid = async (order, event) => {
    event.stopPropagation();
    const nextPaid = order.paymentStatus !== "paid";

    setPayingIds((prev) => new Set(prev).add(order.dbId));
    try {
      await setOrderPaymentStatus(order.dbId, nextPaid);
      setOrders((prev) =>
        prev.map((o) =>
          o.dbId === order.dbId ? { ...o, paymentStatus: nextPaid ? "paid" : "unpaid" } : o
        )
      );
      toast.success(
        nextPaid
          ? isRtl ? "اتحدد كمدفوع" : "Marked as paid"
          : isRtl ? "اتحدد كغير مدفوع" : "Marked as unpaid"
      );
    } catch (error) {
      toast.error(error.message || (isRtl ? "تعذر تحديث حالة الدفع" : "Could not update payment status"));
    } finally {
      setPayingIds((prev) => {
        const copy = new Set(prev);
        copy.delete(order.dbId);
        return copy;
      });
    }
  };

  const doDelete = async () => {
    const order = confirmDelete;
    setConfirmDelete(null);
    try {
      await deleteOrderApi(order.dbId);
      setOrders((prev) => prev.filter((o) => o.id !== order.id));
      setExpanded((prev) => (prev === order.id ? null : prev));
      toast.success(isRtl ? `تم حذف الطلب ${order.id}` : `Order ${order.id} deleted`);
      await loadOrders();
    } catch (error) {
      toast.error(error.message || (isRtl ? "تعذر الحذف" : "Could not delete the order"));
      loadOrders();
    }
  };

  const handlePrint = () => {
    if (visible.length === 0) {
      toast(isRtl ? "لا توجد طلبات للطباعة" : "There are no orders to print");
      return;
    }
    const opened = printOrders({
      orders: visible,
      rangeLabel: range.label,
      isRtl,
      storeName: isRtl ? settings?.storeNameAr : settings?.storeNameEn,
    });
    if (!opened) {
      toast.error(
        isRtl
          ? "المتصفح منع نافذة الطباعة. اسمح بالنوافذ المنبثقة وحاول تاني."
          : "Your browser blocked the print window. Allow pop-ups and try again."
      );
    }
  };

  const totals = useMemo(
    () => ({
      count: visible.length,
      items: visible.reduce((sum, order) => sum + countItems(order), 0),
      revenue: visible.reduce((sum, order) => sum + (Number(order.total) || 0), 0),
    }),
    [visible]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={range.label}
        title={isRtl ? "الطلبات" : "Orders"}
        subtitle={
          isRtl
            ? `${totals.count} طلب في الفترة المختارة`
            : `${totals.count} order${totals.count === 1 ? "" : "s"} in the selected period`
        }
      >
        <PrimaryButton onClick={handlePrint}>
          <Printer size={16} />
          {isRtl ? "طباعة السجل" : "Print records"}
        </PrimaryButton>
      </PageHeader>

      {/* One range drives the list, the totals and the printed sheet. */}
      <Card className="flex flex-wrap items-end justify-between gap-4 p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {isRtl ? "الفترة" : "Period"}
            </span>
            <div
              role="tablist"
              aria-label={isRtl ? "الفترة" : "Period"}
              className="flex select-none rounded-lg bg-secondary-light p-1 text-xs font-semibold dark:bg-slate-800"
            >
              {MODES.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="tab"
                  aria-selected={mode === option.id}
                  onClick={() => setMode(option.id)}
                  className={`rounded-md px-3 py-1.5 transition-all ${
                    mode === option.id
                      ? "bg-primary text-on-primary shadow-sm"
                      : "text-gray-600 dark:text-gray-300"
                  }`}
                >
                  {isRtl ? option.labelAr : option.labelEn}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="orders-anchor"
              className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400"
            >
              {mode === "day"
                ? isRtl ? "التاريخ" : "Date"
                : mode === "week"
                ? isRtl ? "أي يوم في الأسبوع" : "Any day in the week"
                : isRtl ? "أي يوم في الشهر" : "Any day in the month"}
            </label>
            <input
              id="orders-anchor"
              type="date"
              value={anchor}
              max={today}
              onChange={(e) => selectDate(e.target.value)}
              className="input-field w-48 py-2 text-xs"
              dir="ltr"
            />
          </div>

          <div className="relative">
            <label htmlFor="orders-search" className="sr-only">
              {isRtl ? "بحث" : "Search"}
            </label>
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              id="orders-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={isRtl ? "رقم، اسم، تليفون…" : "Number, name, phone…"}
              className="input-field w-56 py-2 ps-9 text-xs"
            />
          </div>
        </div>

        {!viewingToday && (
          <SecondaryButton onClick={() => selectDate(today)} className="px-4 py-2 text-xs">
            <CalendarClock size={14} />
            {isRtl ? "اليوم" : "Today"}
          </SecondaryButton>
        )}
      </Card>

      {viewingToday && mode === "day" && (
        <p className="-mt-3 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <CalendarClock size={13} className="text-accent" />
          {isRtl
            ? "بيعرض اليوم، وبيتنقل لليوم الجديد لوحده بعد منتصف الليل."
            : "Showing today. This moves to the new day automatically at midnight."}
        </p>
      )}

      {/* Every row carries the full order detail. No status column. */}
      <Card className="overflow-hidden">
        {loading && (
          <div className="divide-y divide-secondary-dark/30 dark:divide-slate-800" aria-busy="true">
            {[0, 1, 2].map((n) => (
              <div key={n} className="h-[72px] animate-pulse bg-secondary-dark/20 dark:bg-slate-800/60" />
            ))}
          </div>
        )}

        {!loading && visible.length === 0 && (
          <EmptyState
            icon={ShoppingBag}
            message={
              query.trim()
                ? isRtl ? "مفيش طلبات مطابقة للبحث" : "No orders match that search"
                : isRtl ? "لا توجد طلبات في هذه الفترة" : "No orders in this period"
            }
          />
        )}

        {!loading &&
          visible.map((order) => {
            const items = order.products || [];
            const isOpen = expanded === order.id;
            const itemCount = countItems(order);
            const isFresh = freshIds.has(order.id);
            const payment = PAYMENT_META[order.paymentMethod];
            const PaymentIcon = payment?.icon ?? Truck;

            return (
              <div
                key={order.id}
                className={`border-b border-secondary-dark/30 last:border-0 dark:border-slate-800 ${
                  isFresh ? "bg-accent/10" : ""
                }`}
              >
                <button
                  type="button"
                  onClick={() => openOrder(order)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center gap-3 p-4 text-start transition-colors hover:bg-secondary-light/60 dark:hover:bg-slate-800/50 sm:gap-4"
                >
                  {/* The full order number, exactly as the customer sees it on
                      the confirmation screen — that is the reference they quote
                      on the phone, so an abbreviated one was no use. */}
                  <span
                    className="hidden shrink-0 rounded-md border border-accent/25 bg-accent/10 px-2.5 py-1
                               font-mono text-[11px] font-bold text-accent sm:inline-block"
                    dir="ltr"
                  >
                    {order.id}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-semibold text-primary dark:text-white">
                        {order.customerName}
                      </span>
                      {isFresh && (
                        <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-primary-dark">
                          {isRtl ? "جديد" : "New"}
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400">
                      {/* Same reference again for small screens, where the
                          badge above is hidden for width. */}
                      <span className="font-mono font-semibold text-accent sm:hidden" dir="ltr">
                        {order.id}
                      </span>
                      <span className="flex items-center gap-1" dir="ltr">
                        <Phone size={11} /> {order.phone}
                      </span>
                      <span className="flex items-center gap-1">
                        <ShoppingBag size={11} /> {itemCount}
                        {isRtl ? " صنف" : ` item${itemCount === 1 ? "" : "s"}`}
                      </span>
                      <span>{order.time?.slice(0, 5)}</span>
                      <span
                        className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          order.paymentStatus === "paid"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        }`}
                      >
                        <CircleDollarSign size={11} />
                        {order.paymentStatus === "paid"
                          ? isRtl ? "مدفوع" : "Paid"
                          : isRtl ? "غير مدفوع" : "Unpaid"}
                      </span>
                    </span>
                  </span>

                  <span className="shrink-0 text-end">
                    <span className="block font-display text-base font-bold text-primary dark:text-white">
                      {formatPrice(order.total, language)}
                    </span>
                    <span className="flex items-center justify-end gap-1 text-[10px] font-medium text-gray-500 dark:text-gray-400">
                      <PaymentIcon size={10} />
                      {payment ? (isRtl ? payment.labelAr : payment.labelEn) : order.paymentMethod}
                    </span>
                  </span>

                  <ChevronDown
                    size={18}
                    className={`shrink-0 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22 }}
                      className="overflow-hidden bg-secondary-light/50 dark:bg-slate-800/30"
                    >
                      <div className="grid gap-5 border-t border-secondary-dark/30 p-5 dark:border-slate-800 md:grid-cols-2">
                        <div className="space-y-4">
                          <div>
                            <h4 className="mb-1 text-[10px] font-bold uppercase tracking-wider text-accent">
                              {isRtl ? "التواصل" : "Contact"}
                            </h4>
                            <a
                              href={`tel:${order.phone}`}
                              dir="ltr"
                              className="flex w-fit items-center gap-2 text-sm font-medium text-primary hover:text-accent dark:text-white"
                            >
                              <Phone size={14} className="text-gray-400" />
                              {order.phone}
                            </a>
                            {order.email && (
                              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400" dir="ltr">
                                {order.email}
                              </p>
                            )}
                          </div>

                          <div>
                            <h4 className="mb-1 text-[10px] font-bold uppercase tracking-wider text-accent">
                              {isRtl ? "عنوان التوصيل" : "Delivery address"}
                            </h4>
                            <p className="flex items-start gap-2 text-sm text-primary dark:text-gray-200">
                              <MapPin size={14} className="mt-0.5 shrink-0 text-gray-400" />
                              {[order.address, order.city].filter(Boolean).join("، ") || (
                                <span className="italic text-gray-500">
                                  {isRtl ? "لا يوجد عنوان" : "No address given"}
                                </span>
                              )}
                            </p>
                          </div>

                          {order.notes && (
                            <div>
                              <h4 className="mb-1 text-[10px] font-bold uppercase tracking-wider text-accent">
                                {isRtl ? "ملاحظات العميل" : "Customer notes"}
                              </h4>
                              <p className="flex items-start gap-2 rounded-lg bg-secondary-dark/20 p-2 text-sm italic text-primary dark:bg-slate-800 dark:text-gray-200">
                                <StickyNote size={14} className="mt-0.5 shrink-0 text-gray-400" />
                                {order.notes}
                              </p>
                            </div>
                          )}

                          <div className="flex flex-wrap gap-2 pt-1">
                            <button
                              type="button"
                              onClick={(e) => togglePaid(order, e)}
                              disabled={payingIds.has(order.dbId)}
                              className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                                order.paymentStatus === "paid"
                                  ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/30"
                                  : "border-green-200 bg-green-50 text-green-700 hover:bg-green-100 dark:border-green-900/50 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30"
                              }`}
                            >
                              <BadgeCheck size={13} />
                              {payingIds.has(order.dbId)
                                ? isRtl ? "جاري الحفظ…" : "Saving…"
                                : order.paymentStatus === "paid"
                                ? isRtl ? "إلغاء تحديد الدفع" : "Mark as unpaid"
                                : isRtl ? "علّم كمدفوع" : "Mark as paid"}
                            </button>
                            <SecondaryButton
                              onClick={(e) => startEdit(order, e)}
                              className="px-3 py-2 text-xs"
                            >
                              <Pencil size={13} />
                              {isRtl ? "تعديل البيانات" : "Edit details"}
                            </SecondaryButton>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDelete(order);
                              }}
                              className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
                            >
                              <Trash2 size={13} />
                              {isRtl ? "حذف الطلب" : "Delete order"}
                            </button>
                          </div>
                        </div>

                        <div>
                          <h4 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-accent">
                            {isRtl ? "الأصناف المطلوبة" : "Ordered items"}
                          </h4>
                          <ul className="divide-y divide-secondary-dark/30 overflow-hidden rounded-xl border border-secondary-dark/40 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
                            {items.map((line, index) => {
                              const quantity = Number(line.quantity) || 1;
                              const unit = Number(line.price) || 0;
                              return (
                                <li
                                  key={`${line.productId}-${index}`}
                                  className="flex items-center justify-between gap-3 px-3 py-2"
                                >
                                  <span className="min-w-0 text-sm font-medium text-primary dark:text-white">
                                    <span className="block truncate">
                                      {isRtl ? line.nameAr || line.nameEn : line.nameEn || line.nameAr}
                                    </span>
                                    {line.flavor && (
                                      <span className="block truncate text-xs font-normal text-accent">
                                        {isRtl ? "الطعم: " : "Flavour: "}
                                        {flavorLabel(line.flavor, language)}
                                      </span>
                                    )}
                                  </span>
                                  <span className="shrink-0 text-end">
                                    <span className="block text-sm font-semibold text-primary dark:text-white">
                                      ×{quantity}
                                    </span>
                                    <span className="block text-[11px] text-gray-500 dark:text-gray-400">
                                      {formatPrice(unit * quantity, language)}
                                    </span>
                                  </span>
                                </li>
                              );
                            })}
                            {items.length === 0 && (
                              <li className="px-3 py-4 text-center text-sm text-gray-500">
                                {isRtl ? "لا توجد أصناف" : "No items recorded"}
                              </li>
                            )}
                          </ul>

                          <div className="mt-3 space-y-1 rounded-xl bg-secondary-dark/20 p-3 text-sm dark:bg-slate-800">
                            <div className="flex justify-between text-gray-600 dark:text-gray-400">
                              <span>{isRtl ? "المجموع" : "Subtotal"}</span>
                              <span>{formatPrice(order.subtotal, language)}</span>
                            </div>
                            <div className="flex justify-between text-gray-600 dark:text-gray-400">
                              <span>{isRtl ? "الشحن" : "Shipping"}</span>
                              <span>{formatPrice(order.shippingCost, language)}</span>
                            </div>
                            <div className="flex justify-between border-t border-secondary-dark/40 pt-1.5 font-bold text-primary dark:border-slate-700 dark:text-white">
                              <span>{isRtl ? "الإجمالي" : "Total"}</span>
                              <span className="text-accent">{formatPrice(order.total, language)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
      </Card>

      {/* Period summary */}
      {!loading && visible.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { key: "count", labelAr: "طلبات الفترة", labelEn: "Orders in period", value: totals.count },
            { key: "items", labelAr: "الأصناف المباعة", labelEn: "Items sold", value: totals.items },
            {
              key: "revenue",
              labelAr: "إيرادات الفترة",
              labelEn: "Revenue in period",
              value: formatPrice(totals.revenue, language),
            },
          ].map((stat) => (
            <Card key={stat.key} className="p-5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {isRtl ? stat.labelAr : stat.labelEn}
              </p>
              <p className="mt-1 font-display text-2xl font-bold text-primary dark:text-white">
                {stat.value}
              </p>
            </Card>
          ))}
        </div>
      )}

      {/* Edit customer details. Contact fields only — items and totals are
          priced by the server and must never become editable from the browser. */}
      <ModalShell
        open={!!editing}
        onClose={() => setEditing(null)}
        onSubmit={saveEdit}
        icon={Pencil}
        title={isRtl ? "تعديل بيانات الطلب" : "Edit order details"}
        subtitle={editing?.id}
        footer={
          <>
            <PrimaryButton type="submit" disabled={saving} className="flex-1">
              {saving ? (isRtl ? "جاري الحفظ…" : "Saving…") : isRtl ? "حفظ التعديلات" : "Save changes"}
            </PrimaryButton>
            <SecondaryButton type="button" onClick={() => setEditing(null)}>
              {isRtl ? "إلغاء" : "Cancel"}
            </SecondaryButton>
          </>
        }
      >
        <div className="space-y-4">
          <Field label={isRtl ? "اسم العميل" : "Customer name"}>
            <input
              required
              value={editForm.customerName}
              onChange={(e) => setEditForm((p) => ({ ...p, customerName: e.target.value }))}
              className="input-field"
            />
          </Field>
          <Field label={isRtl ? "رقم الموبايل" : "Phone"}>
            <input
              required
              dir="ltr"
              inputMode="numeric"
              maxLength={11}
              value={editForm.phone}
              onChange={(e) =>
                setEditForm((p) => ({ ...p, phone: e.target.value.replace(/\D/g, "").slice(0, 11) }))
              }
              className="input-field"
              placeholder="01XXXXXXXXX"
            />
          </Field>
          <Field label={isRtl ? "العنوان" : "Address"}>
            <input
              value={editForm.address}
              onChange={(e) => setEditForm((p) => ({ ...p, address: e.target.value }))}
              className="input-field"
            />
          </Field>
          <Field label={isRtl ? "المدينة" : "City"}>
            <input
              value={editForm.city}
              onChange={(e) => setEditForm((p) => ({ ...p, city: e.target.value }))}
              className="input-field"
            />
          </Field>
          <Field label={isRtl ? "ملاحظات" : "Notes"}>
            <textarea
              rows={2}
              value={editForm.notes}
              onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))}
              className="input-field resize-y"
            />
          </Field>
        </div>
      </ModalShell>

      {/* Delete confirmation */}
      <ModalShell
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onSubmit={(e) => {
          e.preventDefault();
          doDelete();
        }}
        icon={Trash2}
        title={isRtl ? "حذف الطلب؟" : "Delete this order?"}
        subtitle={confirmDelete?.id}
        maxWidth="max-w-md"
        footer={
          <>
            <button
              type="submit"
              className="flex-1 rounded-xl bg-red-500 px-5 py-2.5 text-sm font-medium text-white shadow transition-all hover:bg-red-600 active:scale-95"
            >
              {isRtl ? "حذف نهائي" : "Delete order"}
            </button>
            <SecondaryButton type="button" onClick={() => setConfirmDelete(null)}>
              {isRtl ? "إلغاء" : "Cancel"}
            </SecondaryButton>
          </>
        }
      >
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {isRtl
            ? `هيتم حذف طلب ${confirmDelete?.customerName} نهائيًا، ومش هينفع تتراجع.`
            : `This permanently removes ${confirmDelete?.customerName}'s order. It cannot be undone.`}
        </p>
      </ModalShell>
    </div>
  );
};

export default DashboardOrders;
