import { PAYMOB_CONFIG } from "../constants";

const { API_KEY, BASE_URL, INTEGRATION_ID_CARD, INTEGRATION_ID_VODAFONE, IFRAME_ID } = PAYMOB_CONFIG;

// Step 1: Get authentication token
export const getAuthToken = async () => {
  try {
    const response = await fetch(`${BASE_URL}/auth/tokens`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: API_KEY }),
    });
    const data = await response.json();
    return data.token;
  } catch (error) {
    console.error("Paymob Auth Error:", error);
    throw new Error("Failed to authenticate with payment gateway");
  }
};

// Step 2: Create order
export const createPaymobOrder = async (authToken, amountCents, items, shippingData) => {
  try {
    const response = await fetch(`${BASE_URL}/ecommerce/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auth_token: authToken,
        delivery_needed: false,
        amount_cents: amountCents,
        currency: "EGP",
        items: items.map(item => ({
          name: item.nameEn,
          amount_cents: item.price * 100,
          description: item.nameEn,
          quantity: item.quantity,
        })),
        shipping_data: shippingData,
      }),
    });
    const data = await response.json();
    return data.id; // Paymob order ID
  } catch (error) {
    console.error("Paymob Order Error:", error);
    throw new Error("Failed to create payment order");
  }
};

// Step 3: Generate payment key (for cards)
export const generatePaymentKey = async (authToken, amountCents, orderId, billingData, integrationId) => {
  try {
    const response = await fetch(`${BASE_URL}/acceptance/payment_keys`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auth_token: authToken,
        amount_cents: amountCents,
        expiration: 3600,
        order_id: orderId,
        billing_data: billingData,
        currency: "EGP",
        integration_id: integrationId,
        lock_order_when_paid: false,
      }),
    });
    const data = await response.json();
    return data.token; // Payment key token
  } catch (error) {
    console.error("Paymob Payment Key Error:", error);
    throw new Error("Failed to generate payment key");
  }
};

// Full card payment flow
export const initiateCardPayment = async (orderData) => {
  const authToken = await getAuthToken();
  const amountCents = Math.round(orderData.total * 100);
  
  const shippingData = {
    apartment: "NA",
    email: orderData.email || "customer@example.com",
    floor: "NA",
    first_name: orderData.firstName || orderData.customerName.split(" ")[0] || "Customer",
    street: orderData.address,
    building: "NA",
    phone_number: orderData.phone,
    postal_code: "NA",
    city: orderData.city,
    country: "EG",
    last_name: orderData.lastName || orderData.customerName.split(" ").slice(1).join(" ") || "NA",
    state: orderData.city,
  };

  const paymobOrderId = await createPaymobOrder(authToken, amountCents, orderData.products, shippingData);
  
  const paymentToken = await generatePaymentKey(
    authToken,
    amountCents,
    paymobOrderId,
    shippingData,
    INTEGRATION_ID_CARD
  );

  // Return iframe URL
  return {
    iframeUrl: `https://accept.paymob.com/api/acceptance/iframes/${IFRAME_ID}?payment_token=${paymentToken}`,
    paymobOrderId,
  };
};

// Vodafone Cash payment flow
export const initiateVodafoneCash = async (orderData, phoneNumber) => {
  const authToken = await getAuthToken();
  const amountCents = Math.round(orderData.total * 100);
  
  const shippingData = {
    apartment: "NA",
    email: orderData.email || "customer@example.com",
    floor: "NA",
    first_name: orderData.firstName || orderData.customerName.split(" ")[0] || "Customer",
    street: orderData.address,
    building: "NA",
    phone_number: orderData.phone,
    postal_code: "NA",
    city: orderData.city,
    country: "EG",
    last_name: orderData.lastName || orderData.customerName.split(" ").slice(1).join(" ") || "NA",
    state: orderData.city,
  };

  const paymobOrderId = await createPaymobOrder(authToken, amountCents, orderData.products, shippingData);
  
  const paymentToken = await generatePaymentKey(
    authToken,
    amountCents,
    paymobOrderId,
    shippingData,
    INTEGRATION_ID_VODAFONE
  );

  // For Vodafone Cash, we need to make a separate request
  try {
    const response = await fetch(`${BASE_URL}/acceptance/payments/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: {
          identifier: phoneNumber, // Vodafone Cash number
          subtype: "WALLET",
        },
        payment_token: paymentToken,
      }),
    });
    const data = await response.json();
    return {
      success: data.pending || data.success,
      redirectUrl: data.redirect_url,
      paymobOrderId,
    };
  } catch (error) {
    console.error("Vodafone Cash Error:", error);
    throw new Error("Failed to process Vodafone Cash payment");
  }
};