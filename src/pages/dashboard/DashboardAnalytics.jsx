import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle, BarChart3, CreditCard, DollarSign, Package,
  Receipt, RefreshCw, ShoppingCart, Truck, Wallet,
} from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useTranslations } from "../../hooks/useTranslations";
import { fetchAnalytics } from "../../services/apiClient";
import { formatPrice } from "../../utils";
import { PAYMENT_STATUS_LABELS } from "../../constants";
import { Card, EmptyState, MetricCard, PageHeader, SecondaryButton } from "../../components/dashboard/ui";

/**
 * Store analytics.
 *
 * Everything here comes from GET /api/analytics, which aggregates real orders
 * in SQL for an explicit date range. The previous version derived its figures
 * from DataContext's `orders`, which only ever holds a single business date —
 * so "monthly revenue" and the seven-day chart were both silently reporting
 * today. Nothing on this page is a placeholder: where there is no data, it says
 * so rather than drawing a zero.
 */

const PERIODS = [
  { id: "today", labelAr: "اليوم", labelEn: "Today" },
  { id: "7d", labelAr: "٧ أيام", labelEn: "7 days" },
  { id: "30d", labelAr: "٣٠ يوم", labelEn: "30 days" },
  { id: "90d", labelAr: "٩٠ يوم", labelEn: "90 days" },
  { id: "all", labelAr: "كل الوقت", labelEn: "All time" },
];

const PAYMENT_META = {
  cod:    { icon: Truck,      labelAr: "عند الاستلام", labelEn: "Cash on delivery" },
  card:   { icon: CreditCard, labelAr: "بطاقة",         labelEn: "Card" },
  wallet: { icon: Wallet,     labelAr: "محفظة",         labelEn: "Wallet" },
};

/**
 * Format a YYYY-MM-DD string from the server without going through Date's
 * timezone handling — the server works in the store's timezone, and parsing
 * these as UTC shifts every label back a day for anyone east of Greenwich.
 */
const shortDate = (iso, language) => {
  const [, month, day] = String(iso).split("-");
  return language === "ar" ? `${Number(day)}/${Number(month)}` : `${Number(month)}/${Number(day)}`;
};

/** Horizontal bar row — readable at any width, and never encodes by colour alone. */
const BarRow = ({ label, value, display, max, tint = "bg-primary" }) => (
  <div className="space-y-1.5">
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="min-w-0 truncate text-gray-700 dark:text-gray-300">{label}</span>
      <span className="shrink-0 font-semibold text-primary dark:text-white">{display}</span>
    </div>
    <div className="h-2 overflow-hidden rounded-full bg-secondary-dark/40 dark:bg-slate-800">
      <div
        className={`h-full rounded-full ${tint} transition-[width] duration-500`}
        style={{ width: `${max > 0 ? Math.max(2, (value / max) * 100) : 0}%` }}
      />
    </div>
  </div>
);

/** Panel wrapper that owns its own "nothing here" copy. */
const Panel = ({ title, caption, isEmpty, emptyMessage, children }) => (
  <Card className="p-5 sm:p-6">
    <div className="mb-4">
      <h3 className="font-display text-lg font-semibold text-primary dark:text-white">{title}</h3>
      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{caption}</p>
    </div>
    {isEmpty ? (
      <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">{emptyMessage}</p>
    ) : (
      children
    )}
  </Card>
);

/** Revenue and order volume per day, drawn as a single SVG. */
const TrendChart = ({ series, title, caption, language, emptyMessage }) => {
  const peak = Math.max(...series.map((point) => point.revenue), 0);
  const hasData = series.some((point) => point.orders > 0);

  const width = 640;
  const height = 200;
  const pad = { top: 16, right: 12, bottom: 28, left: 12 };
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;

  const x = (index) =>
    pad.left + (series.length > 1 ? (index / (series.length - 1)) * plotWidth : plotWidth / 2);
  const y = (value) => pad.top + plotHeight - (peak > 0 ? (value / peak) * plotHeight : 0);

  const line = series.map((point, index) => `${x(index)},${y(point.revenue)}`).join(" ");
  const area = `${pad.left},${pad.top + plotHeight} ${line} ${pad.left + plotWidth},${pad.top + plotHeight}`;

  // At 30 or 90 days every label will not fit; thin them out evenly.
  const labelEvery = Math.ceil(series.length / 10);

  return (
    <Panel title={title} caption={caption} isEmpty={!hasData} emptyMessage={emptyMessage}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full overflow-visible"
        role="img"
        aria-label={title}
      >
        {[0, 1, 2, 3].map((step) => (
          <line
            key={step}
            x1={pad.left}
            x2={width - pad.right}
            y1={pad.top + (step / 3) * plotHeight}
            y2={pad.top + (step / 3) * plotHeight}
            className="stroke-secondary-dark/50 dark:stroke-slate-800"
            strokeWidth="1"
          />
        ))}

        <polygon points={area} className="fill-primary/10" />
        <polyline
          points={line}
          fill="none"
          className="stroke-primary"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {series.map((point, index) => (
          <g key={point.date}>
            {point.orders > 0 && (
              <circle cx={x(index)} cy={y(point.revenue)} r="3.5" className="fill-primary" />
            )}
            {index % labelEvery === 0 && (
              <text
                x={x(index)}
                y={height - 8}
                textAnchor="middle"
                className="fill-gray-500 text-[11px] dark:fill-gray-400"
              >
                {shortDate(point.date, language)}
              </text>
            )}
            <title>{`${point.date} — ${point.orders}`}</title>
          </g>
        ))}
      </svg>
    </Panel>
  );
};

const DashboardAnalytics = () => {
  const { language } = useLanguage();
  const { t } = useTranslations();
  const isRtl = language === "ar";

  const [period, setPeriod] = useState("30d");
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  // One request per period change, and never a stale response overwriting a
  // newer one when the admin clicks through the tabs quickly.
  const requestRef = useRef(0);

  const load = useCallback(async (which) => {
    const ticket = ++requestRef.current;
    setStatus((previous) => (previous === "ready" ? "refreshing" : "loading"));
    setError("");

    try {
      const result = await fetchAnalytics(which);
      if (ticket !== requestRef.current) return;
      setData(result);
      setStatus("ready");
    } catch (caught) {
      if (ticket !== requestRef.current) return;
      setError(caught.message || (isRtl ? "تعذر تحميل الأرقام" : "Could not load the numbers"));
      setStatus("error");
    }
  }, [isRtl]);

  useEffect(() => {
    load(period);
  }, [load, period]);

  const periodLabel = useMemo(() => {
    const match = PERIODS.find((p) => p.id === period);
    return isRtl ? match?.labelAr : match?.labelEn;
  }, [period, isRtl]);

  const rangeCaption = useMemo(() => {
    if (!data?.period) return periodLabel;
    if (data.period.id === "all") return isRtl ? "كل الطلبات" : "All orders to date";
    if (data.period.id === "today") return `${periodLabel} · ${data.period.endDate}`;
    return `${data.period.startDate} → ${data.period.endDate}`;
  }, [data, periodLabel, isRtl]);

  const derived = useMemo(() => {
    if (!data) return null;

    const maxOf = (rows, key) => Math.max(...rows.map((row) => row[key] ?? 0), 0);

    return {
      topProducts: { rows: data.topProducts ?? [], max: maxOf(data.topProducts ?? [], "quantity") },
      topCategories: { rows: data.topCategories ?? [], max: maxOf(data.topCategories ?? [], "quantity") },
      paymentStatusBreakdown: {
        rows: data.paymentStatusBreakdown ?? [],
        max: maxOf(data.paymentStatusBreakdown ?? [], "count"),
      },
      paymentSplit: { rows: data.paymentSplit ?? [], max: maxOf(data.paymentSplit ?? [], "count") },
    };
  }, [data]);

  const noOrders = isRtl ? "لا توجد طلبات في هذه الفترة" : "No orders in this period";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={rangeCaption}
        title={t("analytics")}
        subtitle={isRtl ? "أرقام محسوبة من الطلبات الفعلية" : "Computed from real order data"}
      >
        <SecondaryButton
          onClick={() => load(period)}
          disabled={status === "loading" || status === "refreshing"}
          aria-label={isRtl ? "تحديث" : "Refresh"}
        >
          <RefreshCw size={16} className={status === "refreshing" ? "animate-spin" : ""} />
          {isRtl ? "تحديث" : "Refresh"}
        </SecondaryButton>
      </PageHeader>

      {/* Period selector */}
      <div
        role="tablist"
        aria-label={isRtl ? "الفترة الزمنية" : "Reporting period"}
        className="flex flex-wrap gap-2"
      >
        {PERIODS.map((option) => {
          const active = option.id === period;
          return (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setPeriod(option.id)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-primary text-on-primary shadow-sm"
                  : "border border-secondary-dark text-primary hover:bg-secondary-light dark:border-slate-700 dark:text-gray-200 dark:hover:bg-slate-800"
              }`}
            >
              {isRtl ? option.labelAr : option.labelEn}
            </button>
          );
        })}
      </div>

      {status === "loading" && (
        <div className="space-y-6" aria-busy="true">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((n) => (
              <Card key={n} className="h-28 animate-pulse bg-secondary-dark/30 dark:bg-slate-800" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {[0, 1].map((n) => (
              <Card key={n} className="h-64 animate-pulse bg-secondary-dark/30 dark:bg-slate-800" />
            ))}
          </div>
        </div>
      )}

      {status === "error" && (
        <Card>
          <EmptyState
            icon={AlertTriangle}
            message={error}
            action={
              <SecondaryButton onClick={() => load(period)}>
                {isRtl ? "إعادة المحاولة" : "Try again"}
              </SecondaryButton>
            }
          />
        </Card>
      )}

      {data && derived && (status === "ready" || status === "refreshing") && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label={isRtl ? "الإيرادات" : "Revenue"}
              value={formatPrice(data.revenue.total, language)}
              icon={DollarSign}
              iconClass="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
            >
              <p className="text-xs text-gray-500 dark:text-gray-400">{rangeCaption}</p>
            </MetricCard>

            <MetricCard
              label={isRtl ? "الطلبات" : "Orders"}
              value={data.revenue.orderCount}
              icon={ShoppingCart}
              iconClass="bg-primary/10 text-primary dark:bg-primary/20"
            >
              <p className="text-xs text-gray-500 dark:text-gray-400">{rangeCaption}</p>
            </MetricCard>

            <MetricCard
              label={isRtl ? "متوسط الطلب" : "Average order"}
              value={formatPrice(data.revenue.averageOrderValue, language)}
              icon={Receipt}
              iconClass="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
            >
              <p className="text-xs text-gray-500 dark:text-gray-400">{rangeCaption}</p>
            </MetricCard>

            <MetricCard
              label={isRtl ? "الشحن المحصّل" : "Shipping collected"}
              value={formatPrice(data.revenue.shipping, language)}
              icon={Truck}
              iconClass="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
            >
              <p className="text-xs text-gray-500 dark:text-gray-400">{rangeCaption}</p>
            </MetricCard>
          </div>

          <TrendChart
            series={data.series ?? []}
            title={isRtl ? "الإيرادات عبر الوقت" : "Revenue over time"}
            caption={rangeCaption}
            language={language}
            emptyMessage={noOrders}
          />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Panel
              title={isRtl ? "الأكثر مبيعاً" : "Top selling products"}
              caption={`${isRtl ? "بالكمية" : "By quantity"} · ${rangeCaption}`}
              isEmpty={derived.topProducts.rows.length === 0}
              emptyMessage={noOrders}
            >
              <div className="space-y-4">
                {derived.topProducts.rows.map((row) => (
                  <BarRow
                    key={row.id}
                    label={isRtl ? row.nameAr : row.nameEn}
                    value={row.quantity}
                    max={derived.topProducts.max}
                    display={`${row.quantity} · ${formatPrice(row.revenue, language)}`}
                  />
                ))}
              </div>
            </Panel>

            <Panel
              title={isRtl ? "الأقسام الأكثر مبيعاً" : "Top categories"}
              caption={`${isRtl ? "بالكمية المباعة" : "By units sold"} · ${rangeCaption}`}
              isEmpty={derived.topCategories.rows.length === 0}
              emptyMessage={noOrders}
            >
              <div className="space-y-4">
                {derived.topCategories.rows.map((row) => (
                  <BarRow
                    key={row.id ?? "none"}
                    label={isRtl ? row.nameAr : row.nameEn}
                    value={row.quantity}
                    max={derived.topCategories.max}
                    tint="bg-accent"
                    display={`${row.quantity} · ${formatPrice(row.revenue, language)}`}
                  />
                ))}
              </div>
            </Panel>

            <Panel
              title={isRtl ? "حالة الدفع" : "Payment status"}
              caption={rangeCaption}
              isEmpty={derived.paymentStatusBreakdown.rows.length === 0}
              emptyMessage={noOrders}
            >
              <div className="space-y-4">
                {derived.paymentStatusBreakdown.rows.map((row) => (
                  <BarRow
                    key={row.status}
                    label={PAYMENT_STATUS_LABELS[row.status]?.[isRtl ? "ar" : "en"] ?? row.status}
                    value={row.count}
                    max={derived.paymentStatusBreakdown.max}
                    display={row.count}
                    tint={row.status === "paid" ? "bg-green-500" : "bg-amber-500"}
                  />
                ))}
              </div>
            </Panel>

            <Panel
              title={isRtl ? "طرق الدفع" : "Payment methods"}
              caption={rangeCaption}
              isEmpty={derived.paymentSplit.rows.length === 0}
              emptyMessage={noOrders}
            >
              <div className="space-y-4">
                {derived.paymentSplit.rows.map((row) => {
                  const meta = PAYMENT_META[row.method];
                  return (
                    <BarRow
                      key={row.method}
                      label={meta ? (isRtl ? meta.labelAr : meta.labelEn) : row.method}
                      value={row.count}
                      max={derived.paymentSplit.max}
                      tint="bg-accent"
                      display={`${row.count} · ${formatPrice(row.revenue, language)}`}
                    />
                  );
                })}
              </div>
            </Panel>
          </div>

          {/* Catalogue counts are a snapshot of the shop right now, not of the
              selected window — labelled so the two are never read as one. */}
          <Card className="p-5 sm:p-6">
            <div className="mb-4">
              <h3 className="font-display text-lg font-semibold text-primary dark:text-white">
                {isRtl ? "الكتالوج" : "Catalogue"}
              </h3>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {isRtl ? "الوضع الحالي، وليس فترة التقرير" : "Current state, not the reporting period"}
              </p>
            </div>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {[
                { key: "products", icon: Package, labelAr: "المنتجات", labelEn: "Products" },
                { key: "outOfStock", icon: AlertTriangle, labelAr: "غير متوفر", labelEn: "Out of stock" },
                { key: "categories", icon: BarChart3, labelAr: "الأقسام", labelEn: "Categories" },
                { key: "brands", icon: BarChart3, labelAr: "الماركات", labelEn: "Brands" },
                { key: "activeOffers", icon: BarChart3, labelAr: "عروض نشطة", labelEn: "Active offers" },
              ].map(({ key, icon: Icon, labelAr, labelEn }) => (
                <div key={key} className="rounded-xl bg-secondary-light/70 p-4 dark:bg-slate-800/60">
                  <dt className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                    <Icon size={14} />
                    {isRtl ? labelAr : labelEn}
                  </dt>
                  <dd className="mt-1 text-2xl font-bold text-primary dark:text-white">
                    {data.catalogue?.[key] ?? 0}
                  </dd>
                </div>
              ))}
            </dl>
          </Card>
        </>
      )}
    </div>
  );
};

export default DashboardAnalytics;
