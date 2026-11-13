import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, BellRing, Check, Loader2, MessageCircle, Package, Phone, Trash2,
} from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useData } from "../../context/DataContext";
import { useRealtime, useRealtimeEvent } from "../../context/RealtimeContext";
import {
  Card, EmptyState, PageHeader, PrimaryButton, SecondaryButton,
} from "../../components/dashboard/ui";
import toast from "react-hot-toast";

/**
 * Back-in-stock requests.
 *
 * Customers leave a mobile number on an out-of-stock product; this is where the
 * admin sees who is waiting and messages them once it returns. Requests are
 * grouped by product, because the useful action is "this came back — tell all
 * fourteen people", not "handle one row".
 */

const waitingLabel = (count, isRtl) => {
  if (isRtl) return count === 1 ? "شخص واحد مستني" : `${count} أشخاص مستنيين`;
  return `${count} ${count === 1 ? "person" : "people"} waiting`;
};

const DashboardStockAlerts = () => {
  const { language } = useLanguage();
  const { fetchStockAlerts, resolveStockAlerts, deleteStockAlert, settings } = useData();
  const { readyCount, connected } = useRealtime();
  const isRtl = language === "ar";

  const [alerts, setAlerts] = useState([]);
  const [status, setStatus] = useState("loading");
  const [showResolved, setShowResolved] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(
    async (withSpinner = true) => {
      if (withSpinner) setStatus((s) => (s === "ready" ? "refreshing" : "loading"));
      try {
        setAlerts(await fetchStockAlerts(null, showResolved));
        setStatus("ready");
      } catch {
        setStatus("error");
      }
    },
    [fetchStockAlerts, showResolved]
  );

  useEffect(() => {
    load();
  }, [load]);

  // A request submitted on the storefront appears here without a refresh.
  useRealtimeEvent("notification:new", () => load(false));
  useEffect(() => {
    if (readyCount > 1) load(false);
  }, [readyCount, load]);

  /** Grouped by product, unresolved first, most-waited-for at the top. */
  const groups = useMemo(() => {
    const byProduct = new Map();

    for (const alert of alerts) {
      const key = alert.productId;
      if (!byProduct.has(key)) {
        byProduct.set(key, {
          productId: key,
          nameEn: alert.productNameEn,
          nameAr: alert.productNameAr,
          image: alert.productImage,
          available: alert.available,
          rows: [],
        });
      }
      byProduct.get(key).rows.push(alert);
    }

    return [...byProduct.values()]
      .map((group) => ({
        ...group,
        pending: group.rows.filter((r) => !r.notified),
      }))
      .sort((a, b) => {
        // Products that are back in stock and still have people waiting are the
        // whole point of the page, so they sort first.
        const actionable = (g) => (g.available && g.pending.length > 0 ? 0 : 1);
        return actionable(a) - actionable(b) || b.pending.length - a.pending.length;
      });
  }, [alerts]);

  const totalPending = useMemo(
    () => alerts.filter((a) => !a.notified).length,
    [alerts]
  );

  const markGroupNotified = async (group) => {
    const ids = group.pending.map((r) => r.id);
    if (ids.length === 0) return;

    setBusyId(group.productId);
    try {
      await resolveStockAlerts(ids);
      toast.success(
        isRtl ? `تم تعليم ${ids.length} كمُبلَّغ` : `Marked ${ids.length} as notified`
      );
      await load(false);
    } catch (error) {
      toast.error(error.message || (isRtl ? "حصل خطأ" : "Something went wrong"));
    } finally {
      setBusyId(null);
    }
  };

  const removeOne = async (alert) => {
    setBusyId(alert.id);
    try {
      await deleteStockAlert(alert.id);
      setAlerts((prev) => prev.filter((a) => a.id !== alert.id));
    } catch (error) {
      toast.error(error.message || (isRtl ? "حصل خطأ" : "Something went wrong"));
    } finally {
      setBusyId(null);
    }
  };

  /** Pre-filled WhatsApp message, so telling someone is one tap. */
  const whatsappLink = (phone, group) => {
    const name = isRtl ? group.nameAr : group.nameEn;
    const store = isRtl ? settings?.storeNameAr : settings?.storeNameEn;
    const text = isRtl
      ? `مرحباً! المنتج "${name}" رجع متوفر في ${store || "المتجر"}. تحب تطلبه؟`
      : `Hi! "${name}" is back in stock at ${store || "our store"}. Would you like to order it?`;
    // Egyptian mobiles are stored as 01…; WhatsApp needs the country code.
    const international = phone.replace(/^0/, "20");
    return `https://wa.me/${international}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          totalPending > 0
            ? isRtl ? `${totalPending} طلب تنبيه` : `${totalPending} pending`
            : undefined
        }
        title={isRtl ? "تنبيهات التوفر" : "Back-in-stock alerts"}
        subtitle={
          isRtl
            ? "أرقام العملاء اللي مستنيين منتجات ترجع للمخزون"
            : "Customers waiting to hear when a product returns"
        }
      >
        {/* No refresh button: the list is driven by RealtimeContext, so a new
            request from the storefront lands here on its own. A manual button
            would only ever repeat what already happened. */}
        <span
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${
            connected
              ? "bg-green-100 text-green-700 dark:bg-green-900/25 dark:text-green-400"
              : "bg-secondary-dark/30 text-gray-600 dark:bg-slate-800 dark:text-gray-400"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              connected ? "bg-green-500 motion-safe:animate-pulse" : "bg-gray-400"
            }`}
            aria-hidden="true"
          />
          {connected
            ? isRtl ? "مباشر" : "Live"
            : isRtl ? "غير متصل" : "Offline"}
        </span>
      </PageHeader>

      <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <input
          type="checkbox"
          checked={showResolved}
          onChange={(e) => setShowResolved(e.target.checked)}
          className="h-4 w-4 rounded text-primary"
        />
        {isRtl ? "إظهار اللي تم إبلاغهم" : "Show already notified"}
      </label>

      {status === "loading" && (
        <div className="space-y-4" aria-busy="true">
          {[0, 1, 2].map((n) => (
            <Card key={n} className="h-32 animate-pulse bg-secondary-dark/30 dark:bg-slate-800" />
          ))}
        </div>
      )}

      {status === "error" && (
        <Card>
          <EmptyState
            icon={AlertTriangle}
            message={isRtl ? "تعذر تحميل التنبيهات" : "Could not load the alerts"}
            action={
              <SecondaryButton onClick={() => load()}>
                {isRtl ? "إعادة المحاولة" : "Try again"}
              </SecondaryButton>
            }
          />
        </Card>
      )}

      {(status === "ready" || status === "refreshing") && groups.length === 0 && (
        <Card>
          <EmptyState
            icon={BellRing}
            message={
              isRtl
                ? "مفيش حد مستني منتج دلوقتي"
                : "Nobody is waiting on a product right now"
            }
          />
        </Card>
      )}

      {(status === "ready" || status === "refreshing") &&
        groups.map((group) => {
          const backInStock = group.available && group.pending.length > 0;

          return (
            <Card key={group.productId} className="overflow-hidden">
              <div
                className={`flex flex-wrap items-center gap-4 border-b p-4 sm:p-5 ${
                  backInStock
                    ? "border-green-200 bg-green-50 dark:border-green-900/40 dark:bg-green-900/15"
                    : "border-secondary-dark/40 dark:border-slate-800"
                }`}
              >
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-secondary-light dark:bg-slate-800">
                  {group.image ? (
                    <img
                      src={group.image}
                      alt=""
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-gray-400">
                      <Package size={20} />
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-primary dark:text-white">
                    {(isRtl ? group.nameAr : group.nameEn) ||
                      (isRtl ? "منتج محذوف" : "Deleted product")}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
                    {waitingLabel(group.pending.length, isRtl)}
                    {group.available === false && (
                      <span className="ms-2 text-amber-600 dark:text-amber-400">
                        · {isRtl ? "لسه غير متوفر" : "still out of stock"}
                      </span>
                    )}
                    {backInStock && (
                      <span className="ms-2 font-semibold text-green-700 dark:text-green-400">
                        · {isRtl ? "رجع متوفر!" : "back in stock!"}
                      </span>
                    )}
                  </p>
                </div>

                {group.pending.length > 0 && (
                  <PrimaryButton
                    onClick={() => markGroupNotified(group)}
                    disabled={busyId === group.productId}
                    className="shrink-0"
                  >
                    {busyId === group.productId ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Check size={16} />
                    )}
                    {isRtl ? "تم إبلاغ الكل" : "Mark all notified"}
                  </PrimaryButton>
                )}
              </div>

              <ul className="divide-y divide-secondary-dark/30 dark:divide-slate-800">
                {group.rows.map((alert) => (
                  <li
                    key={alert.id}
                    className={`flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5 ${
                      alert.notified ? "opacity-55" : ""
                    }`}
                  >
                    <Phone size={14} className="shrink-0 text-gray-400" />
                    <a
                      href={`tel:${alert.phone}`}
                      dir="ltr"
                      className="font-mono text-sm font-medium text-primary hover:underline dark:text-white"
                    >
                      {alert.phone}
                    </a>

                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {String(alert.createdAt || "").slice(0, 10)}
                    </span>

                    {alert.notified && (
                      <span className="rounded-full bg-secondary-dark/40 px-2 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-slate-800 dark:text-gray-300">
                        {isRtl ? "تم الإبلاغ" : "Notified"}
                      </span>
                    )}

                    <div className="ms-auto flex shrink-0 items-center gap-1">
                      <a
                        href={whatsappLink(alert.phone, group)}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={isRtl ? "مراسلة على واتساب" : "Message on WhatsApp"}
                        className="rounded-lg p-2 text-green-600 transition-colors hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
                      >
                        <MessageCircle size={16} />
                      </a>
                      <button
                        type="button"
                        onClick={() => removeOne(alert)}
                        disabled={busyId === alert.id}
                        aria-label={isRtl ? "حذف الطلب" : "Delete request"}
                        className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
    </div>
  );
};

export default DashboardStockAlerts;
