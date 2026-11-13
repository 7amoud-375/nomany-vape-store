/**
 * Printable order records.
 *
 * Opens a standalone window with its own stylesheet rather than printing the
 * dashboard: the console's layout, sidebar and dark theme are all wrong on
 * paper, and print-only CSS to undo them would have to track every change to
 * the page.
 *
 * Returns false if the browser blocked the pop-up, so the caller can say so.
 */

const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[character]));

const money = (value) => `${Number(value || 0).toFixed(2)} EGP`;

export function printOrders({ orders, rangeLabel, isRtl = false, storeName = "" }) {
  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) return false;

  const label = (ar, en) => (isRtl ? ar : en);

  const totals = orders.reduce(
    (accumulator, order) => {
      const items = (order.products || []).reduce(
        (sum, line) => sum + (Number(line.quantity) || 1),
        0
      );
      return {
        count: accumulator.count + 1,
        items: accumulator.items + items,
        revenue: accumulator.revenue + (Number(order.total) || 0),
      };
    },
    { count: 0, items: 0, revenue: 0 }
  );

  const rows = orders
    .map((order) => {
      const lines = (order.products || [])
        .map((line) => {
          const quantity = Number(line.quantity) || 1;
          const flavor = line.flavor
            ? ` (${escapeHtml(isRtl ? line.flavor.nameAr || line.flavor.nameEn : line.flavor.nameEn || line.flavor.nameAr)})`
            : "";
          const name = escapeHtml(isRtl ? line.nameAr || line.nameEn : line.nameEn || line.nameAr) + flavor;
          return `<li>${name} <span class="qty">×${quantity}</span> <span class="amt">${money(
            (Number(line.price) || 0) * quantity
          )}</span></li>`;
        })
        .join("");

      const destination = [order.address, order.city].filter(Boolean).join(", ");

      return `
        <article class="order">
          <header>
            <span class="num">#${escapeHtml(order.id)}</span>
            <span class="when">${escapeHtml(order.date)} ${escapeHtml(order.time || "")}</span>
          </header>
          <div class="who">
            <strong>${escapeHtml(order.customerName)}</strong>
            <span dir="ltr">${escapeHtml(order.phone)}</span>
          </div>
          ${
            destination
              ? `<p class="addr">${escapeHtml(destination)}</p>`
              : `<p class="addr muted">${label("استلام من المحل", "Pickup — no address")}</p>`
          }
          ${order.notes ? `<p class="notes">${escapeHtml(order.notes)}</p>` : ""}
          <ul class="items">${lines || `<li class="muted">${label("لا توجد أصناف", "No items")}</li>`}</ul>
          <table class="sums">
            <tr><td>${label("المجموع", "Subtotal")}</td><td>${money(order.subtotal)}</td></tr>
            <tr><td>${label("الشحن", "Shipping")}</td><td>${money(order.shippingCost)}</td></tr>
            <tr class="grand"><td>${label("الإجمالي", "Total")}</td><td>${money(order.total)}</td></tr>
          </table>
        </article>`;
    })
    .join("");

  printWindow.document.write(`<!doctype html>
<html lang="${isRtl ? "ar" : "en"}" dir="${isRtl ? "rtl" : "ltr"}">
<head>
<meta charset="utf-8">
<title>${escapeHtml(label("سجل الطلبات", "Order records"))} — ${escapeHtml(rangeLabel)}</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: ${isRtl ? "'Cairo', 'Segoe UI'" : "'Inter', 'Segoe UI'"}, system-ui, sans-serif;
    margin: 24px; color: #1c1b1b; font-size: 12px; line-height: 1.5;
  }
  h1 { font-size: 20px; margin: 0 0 2px; color: #004741; }
  .range { color: #5f5f58; margin: 0 0 4px; }
  .summary { display: flex; gap: 24px; padding: 10px 0; border-block: 1px solid #e0ddd5; margin-bottom: 16px; }
  .summary div { font-size: 11px; color: #5f5f58; }
  .summary strong { display: block; font-size: 16px; color: #004741; }
  .order { border: 1px solid #e0ddd5; border-radius: 6px; padding: 12px; margin-bottom: 10px; break-inside: avoid; }
  .order header { display: flex; justify-content: space-between; font-size: 11px; color: #5f5f58; margin-bottom: 6px; }
  .num { font-weight: 700; color: #004741; font-family: ui-monospace, monospace; }
  .who { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 4px; }
  .addr { margin: 0 0 6px; color: #404947; }
  .notes { margin: 0 0 6px; padding: 4px 8px; background: #f6f3f2; border-radius: 4px; font-style: italic; }
  .muted { color: #909997; }
  ul.items { list-style: none; margin: 0 0 8px; padding: 0; }
  ul.items li { display: flex; gap: 8px; padding: 2px 0; border-bottom: 1px dotted #e5e2e1; }
  ul.items li .qty { margin-inline-start: auto; font-weight: 600; }
  ul.items li .amt { min-width: 80px; text-align: end; }
  table.sums { width: 100%; max-width: 240px; margin-inline-start: auto; border-collapse: collapse; }
  table.sums td { padding: 1px 0; color: #5f5f58; }
  table.sums td:last-child { text-align: end; }
  table.sums tr.grand td { font-weight: 700; font-size: 13px; color: #004741; border-top: 1px solid #e0ddd5; padding-top: 4px; }
  @media print { body { margin: 0; } .order { break-inside: avoid; } }
</style>
</head>
<body>
  <h1>${escapeHtml(storeName || label("سجل الطلبات", "Order records"))}</h1>
  <p class="range">${escapeHtml(rangeLabel)}</p>
  <div class="summary">
    <div>${label("عدد الطلبات", "Orders")}<strong>${totals.count}</strong></div>
    <div>${label("الأصناف المباعة", "Items sold")}<strong>${totals.items}</strong></div>
    <div>${label("الإيرادات", "Revenue")}<strong>${money(totals.revenue)}</strong></div>
  </div>
  ${rows || `<p class="muted">${label("لا توجد طلبات", "No orders in this period")}</p>`}
</body>
</html>`);

  printWindow.document.close();
  printWindow.focus();
  // Give the document a tick to lay out before the print dialog measures it.
  setTimeout(() => printWindow.print(), 250);
  return true;
}

export default printOrders;
