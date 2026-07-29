// CHANGE THIS TO YOUR REAL DOMAIN WHEN DEPLOYED
// Example: 'https://nomanyvapes.com/api'
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export const initiateCardPayment = async (orderData) => {
  // Validate amount before sending
  const calculatedTotal = orderData.products.reduce((sum, item) => 
    sum + ((item.price || 0) * (item.quantity || 1)), 0
  );
  
  // Ensure total matches (client-side pre-check)
  if (Math.abs(calculatedTotal - orderData.total) > 0.01) {
    throw new Error('Price calculation mismatch. Please refresh and try again.');
  }
  
  const amountCents = Math.round(orderData.total * 100);
  
  const shippingData = {
    apartment: "NA",
    email: orderData.email || "customer@example.com",
    floor: "NA",
    first_name: orderData.firstName || orderData.customerName?.split(" ")[0] || "Customer",
    street: orderData.address || "NA",
    building: "NA",
    phone_number: orderData.phone || "NA",
    postal_code: "NA",
    city: orderData.city || "NA",
    country: "EG",
    last_name: orderData.lastName || orderData.customerName?.split(" ").slice(1).join(" ") || "NA",
    state: orderData.city || "NA",
  };

  const items = orderData.products.map(item => ({
    name: item.nameEn || item.nameAr || "Product",
    amount_cents: Math.round((item.price || 0) * 100),
    description: item.nameEn || item.nameAr || "Product",
    quantity: item.quantity || 1,
  }));

  const response = await fetch(`${API_BASE}/paymob.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount_cents: amountCents,
      items,
      shipping_data: shippingData,
      billing_data: shippingData,
      integration_id: orderData.integrationId,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create payment');
  }
  
  return await response.json();
};

export const initiateVodafoneCash = async (orderData, phoneNumber) => {
  const cardResult = await initiateCardPayment({
    ...orderData,
    integrationId: orderData.vodafoneIntegrationId,
  });

  const url = new URL(cardResult.iframeUrl);
  const paymentToken = url.searchParams.get('payment_token');

  const response = await fetch(`${API_BASE}/vodafone.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      payment_token: paymentToken,
      phone_number: phoneNumber,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Vodafone payment failed');
  }
  
  const data = await response.json();
  
  return {
    success: data.pending || data.success,
    pending: data.pending,
    redirectUrl: data.redirect_url,
    paymobOrderId: cardResult.orderId,
  };
};