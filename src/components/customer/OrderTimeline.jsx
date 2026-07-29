import { Check, X, Clock } from "lucide-react";

const STEPS = [
  { key: "pending", labelAr: "معلق", labelEn: "Pending" },
  { key: "confirmed", labelAr: "مؤكد", labelEn: "Confirmed" },
  { key: "preparing", labelAr: "قيد التحضير", labelEn: "Preparing" },
  { key: "shipped", labelAr: "تم الشحن", labelEn: "Shipped" },
  { key: "delivered", labelAr: "تم التوصيل", labelEn: "Delivered" },
];

// A verified payment means the order is confirmed as far as the customer's
// timeline is concerned.
const STATUS_ALIASES = { paid: "confirmed" };

const OrderTimeline = ({ status, isRtl }) => {
  if (status === "cancelled") {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
        <X className="w-5 h-5 shrink-0" />
        <span className="text-sm font-medium">{isRtl ? "تم إلغاء هذا الطلب" : "This order was cancelled"}</span>
      </div>
    );
  }

  // Don't show a progress bar for something that hasn't been paid for yet —
  // starting the timeline would imply the order is already being processed.
  if (status === "awaiting_payment") {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400">
        <Clock className="w-5 h-5 shrink-0" />
        <span className="text-sm font-medium">
          {isRtl ? "بانتظار تأكيد الدفع" : "Waiting for payment confirmation"}
        </span>
      </div>
    );
  }

  const effectiveStatus = STATUS_ALIASES[status] || status;
  const currentIndex = STEPS.findIndex((s) => s.key === effectiveStatus);
  const activeIndex = currentIndex === -1 ? 0 : currentIndex;

  return (
    <div className="flex items-start w-full overflow-x-auto py-2">
      {STEPS.map((step, index) => {
        const isDone = index < activeIndex;
        const isCurrent = index === activeIndex;
        const isLast = index === STEPS.length - 1;

        return (
          <div key={step.key} className="flex items-center flex-1 min-w-[70px] last:flex-none last:min-w-0">
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                  isDone
                    ? "bg-green-500 text-white"
                    : isCurrent
                    ? "bg-primary text-white"
                    : "bg-gray-200 dark:bg-slate-700 text-gray-400"
                }`}
              >
                {isDone ? <Check className="w-4 h-4" /> : index + 1}
              </div>
              <span
                className={`text-[11px] text-center whitespace-nowrap ${
                  isDone || isCurrent ? "text-gray-900 dark:text-white font-medium" : "text-gray-400"
                }`}
              >
                {isRtl ? step.labelAr : step.labelEn}
              </span>
            </div>
            {!isLast && (
              <div
                className={`h-0.5 flex-1 mx-1 mb-4 transition-colors ${
                  isDone ? "bg-green-500" : "bg-gray-200 dark:bg-slate-700"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default OrderTimeline;