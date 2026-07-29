// Set VITE_API_BASE_URL to where the PHP endpoints live, e.g.
// https://yourdomain.com/api
const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

async function postJson(path, body) {
  const response = await fetch(`${API_BASE}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    throw new Error(data.error || "Payment request failed");
  }
  return data;
}

/**
 * Open a payment session.
 *
 * Only product ids and quantities are sent — the server prices the cart from
 * the live catalogue. Nothing the browser says about money is trusted, so a
 * tampered request cannot change the amount charged.
 */
export const createPaymentSession = async ({ cartItems, customer, method }) => {
  const items = cartItems.map((item) => ({
    productId: String(item.id),
    quantity: item.quantity,
  }));

  return postJson("paymob.php", { items, customer, method });
};

/** Trigger the wallet push notification for an existing session. */
export const payWithVodafone = async (merchantOrderId, phoneNumber) =>
  postJson("vodafone.php", { merchantOrderId, phoneNumber });

/** Ask the server whether a payment actually cleared. */
export const verifyPayment = async (merchantOrderId) => {
  const response = await fetch(
    `${API_BASE}/verify.php?merchantOrderId=${encodeURIComponent(merchantOrderId)}`
  );
  if (!response.ok) {
    throw new Error("Could not check payment status");
  }
  return response.json();
};

/**
 * Poll until the HMAC-verified callback lands, or we give up.
 *
 * Paymob's callback is server-to-server and usually arrives within a couple of
 * seconds, but the customer's redirect can beat it — hence the wait rather than
 * trusting the redirect itself.
 */
export const waitForPaymentConfirmation = async (
  merchantOrderId,
  { attempts = 10, intervalMs = 2000 } = {}
) => {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const result = await verifyPayment(merchantOrderId);
      if (result.paid) return { paid: true, status: "paid" };
      if (result.status === "failed") return { paid: false, status: "failed" };
    } catch {
      // Network blip — keep trying until the attempt budget runs out.
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return { paid: false, status: "timeout" };
};
