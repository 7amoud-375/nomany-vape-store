<?php
/**
 * Create a Paymob payment session.
 *
 * The client sends product IDs and quantities only -- never prices. Every
 * amount is looked up from the Firestore catalogue here, so tampering with the
 * request body cannot change what the customer is charged.
 */

require_once __DIR__ . '/lib/bootstrap.php';

api_cors();
api_require_method('POST');
api_rate_limit('paymob', 15, 60);

$env   = api_env();
$input = api_body();

$apiKey   = $env['PAYMOB_API_KEY']   ?? '';
$iframeId = $env['PAYMOB_IFRAME_ID'] ?? '';
if (!$apiKey || !$iframeId) {
    api_fail(500, 'Payment is not configured', 'PAYMOB_API_KEY or PAYMOB_IFRAME_ID missing');
}

// -- Choose the integration server-side ------------------------------------
// Letting the client pass an integration_id would let it route payments
// through an integration of its choosing.
$method = ($input['method'] ?? 'card') === 'vodafone' ? 'vodafone' : 'card';
$integrationId = $method === 'vodafone'
    ? (int) ($env['PAYMOB_INTEGRATION_ID_VODAFONE'] ?? 0)
    : (int) ($env['PAYMOB_INTEGRATION_ID_CARD'] ?? 0);

if (!$integrationId) {
    api_fail(500, 'Payment is not configured', 'Missing integration id for ' . $method);
}

// -- Price the cart from authoritative data --------------------------------
$requested = $input['items'] ?? [];
if (!is_array($requested) || count($requested) === 0) {
    api_fail(400, 'Your cart is empty');
}
if (count($requested) > 100) {
    api_fail(400, 'Too many items in one order');
}

try {
    $catalogue = fs_get_public($env, 'store/products');
    $settings  = fs_get_public($env, 'store/settings');
} catch (Exception $e) {
    api_fail(503, 'Could not verify prices, please try again', $e->getMessage());
}

$products = $catalogue['data'] ?? null;
if (!is_array($products) || count($products) === 0) {
    api_fail(503, 'Could not verify prices, please try again', 'store/products is empty or missing');
}

// Index the catalogue by id for lookup. Ids are compared as strings because the
// dashboard has historically written both numbers and strings.
$byId = [];
foreach ($products as $product) {
    if (isset($product['id'])) {
        $byId[(string) $product['id']] = $product;
    }
}

$items          = [];
$subtotalCents  = 0;

foreach ($requested as $line) {
    $productId = (string) ($line['productId'] ?? '');
    $quantity  = (int) ($line['quantity'] ?? 0);

    if ($productId === '' || $quantity < 1 || $quantity > 99) {
        api_fail(400, 'Invalid cart contents');
    }
    if (!isset($byId[$productId])) {
        api_fail(409, 'A product in your cart is no longer available');
    }

    $product = $byId[$productId];

    if (array_key_exists('availability', $product) && !$product['availability']) {
        api_fail(409, 'A product in your cart is out of stock');
    }

    // discountPrice wins when it is a real, lower price.
    $price    = (float) ($product['price'] ?? 0);
    $discount = (float) ($product['discountPrice'] ?? 0);
    $unit     = ($discount > 0 && $discount < $price) ? $discount : $price;

    if ($unit <= 0) {
        api_fail(409, 'A product in your cart is mispriced', 'Product ' . $productId . ' has no usable price');
    }

    $unitCents      = (int) round($unit * 100);
    $lineCents      = $unitCents * $quantity;
    $subtotalCents += $lineCents;

    $items[] = [
        'name'         => (string) ($product['nameEn'] ?? $product['nameAr'] ?? 'Product'),
        'amount_cents' => (string) $unitCents,
        'description'  => (string) ($product['sku'] ?? $productId),
        'quantity'     => (string) $quantity,
    ];
}

// Shipping is a real line item so the totals reconcile on Paymob's side.
$shippingCents = (int) round(((float) ($settings['data']['shippingCost'] ?? 0)) * 100);
if ($shippingCents > 0) {
    $items[] = [
        'name'         => 'Shipping',
        'amount_cents' => (string) $shippingCents,
        'description'  => 'Delivery fee',
        'quantity'     => '1',
    ];
}

$totalCents = $subtotalCents + $shippingCents;
if ($totalCents < 100) {
    api_fail(400, 'Order total is too low');
}

// -- Customer details ------------------------------------------------------
$customer = $input['customer'] ?? [];
$fullName = trim((string) ($customer['name'] ?? ''));
$phone    = trim((string) ($customer['phone'] ?? ''));

if ($fullName === '' || $phone === '') {
    api_fail(400, 'Name and phone are required');
}

$nameParts = preg_split('/\s+/', $fullName, 2);
$billing = [
    'first_name'   => $nameParts[0] ?: 'Customer',
    'last_name'    => $nameParts[1] ?? 'NA',
    'phone_number' => $phone,
    'email'        => filter_var($customer['email'] ?? '', FILTER_VALIDATE_EMAIL) ?: 'orders@nomanystore.com',
    'street'       => trim((string) ($customer['address'] ?? '')) ?: 'NA',
    'city'         => trim((string) ($customer['city'] ?? '')) ?: 'NA',
    'state'        => trim((string) ($customer['city'] ?? '')) ?: 'NA',
    'country'      => 'EG',
    'apartment'    => 'NA',
    'floor'        => 'NA',
    'building'     => 'NA',
    'postal_code'  => 'NA',
];

// Our own reference, echoed back by Paymob in the callback so we can match the
// transaction to the order.
$merchantOrderId = 'NOM-' . date('ymd') . '-' . strtoupper(bin2hex(random_bytes(3)));

function paymob_request($url, $data)
{
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);

    $response = curl_exec($ch);
    if (curl_errno($ch)) {
        $err = curl_error($ch);
        curl_close($ch);
        throw new Exception('cURL error: ' . $err);
    }
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($code >= 400) {
        throw new Exception('Paymob API ' . $code . ': ' . $response);
    }
    return json_decode($response, true);
}

try {
    $auth = paymob_request('https://accept.paymob.com/api/auth/tokens', ['api_key' => $apiKey]);
    if (empty($auth['token'])) {
        throw new Exception('Auth returned no token');
    }
    $token = $auth['token'];

    $order = paymob_request('https://accept.paymob.com/api/ecommerce/orders', [
        'auth_token'        => $token,
        'delivery_needed'   => false,
        'amount_cents'      => $totalCents,
        'currency'          => 'EGP',
        'merchant_order_id' => $merchantOrderId,
        'items'             => $items,
    ]);
    if (empty($order['id'])) {
        throw new Exception('Order creation returned no id');
    }

    $key = paymob_request('https://accept.paymob.com/api/acceptance/payment_keys', [
        'auth_token'           => $token,
        'amount_cents'         => $totalCents,
        'expiration'           => 3600,
        'order_id'             => $order['id'],
        'billing_data'         => $billing,
        'currency'             => 'EGP',
        'integration_id'       => $integrationId,
        'lock_order_when_paid' => true,
    ]);
    if (empty($key['token'])) {
        throw new Exception('Payment key request returned no token');
    }
} catch (Exception $e) {
    api_fail(502, 'Could not start the payment, please try again', $e->getMessage());
}

// Record what we expect to be paid. callback.php compares the transaction
// against this before anything is marked paid.
// The payment token stays server-side; vodafone.php looks it up by reference so
// it never has to travel back through the browser.
api_payment_write($merchantOrderId, [
    'merchant_order_id' => $merchantOrderId,
    'paymob_order_id'   => $order['id'],
    'payment_token'     => $key['token'],
    'expected_cents'    => $totalCents,
    'method'            => $method,
    'status'            => 'awaiting_payment',
    'created_at'        => gmdate('c'),
]);

api_json([
    'success'         => true,
    'merchantOrderId' => $merchantOrderId,
    'totalCents'      => $totalCents,
    'iframeUrl'       => 'https://accept.paymob.com/api/acceptance/iframes/' . $iframeId
                         . '?payment_token=' . urlencode($key['token']),
]);
