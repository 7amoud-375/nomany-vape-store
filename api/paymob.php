<?php
// Get the actual origin
$allowedOrigins = [
    'https://yourdomain.com',      // <-- REPLACE WITH YOUR REAL DOMAIN
    'https://www.yourdomain.com',  // <-- REPLACE WITH YOUR REAL DOMAIN
    'http://localhost:5173',       // Vite dev server
    'http://localhost:3000',       // React dev server
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    header("Access-Control-Allow-Origin: https://yourdomain.com"); // fallback
}

header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Load env vars
$envFile = __DIR__ . '/.env';
if (!file_exists($envFile)) {
    http_response_code(500);
    echo json_encode(['error' => 'Config file not found']);
    exit;
}

$env = parse_ini_file($envFile);
$api_key = $env['PAYMOB_API_KEY'];
$iframe_id = $env['PAYMOB_IFRAME_ID'];

if (!$api_key || !$iframe_id) {
    http_response_code(500);
    echo json_encode(['error' => 'Missing API credentials']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

// ========== SERVER-SIDE AMOUNT VERIFICATION ==========
// Recalculate total from actual product prices, don't trust client
$serverTotalCents = 0;
if (!empty($input['items']) && is_array($input['items'])) {
    foreach ($input['items'] as $item) {
        $qty = intval($item['quantity'] ?? 1);
        $price = intval($item['amount_cents'] ?? 0);
        $serverTotalCents += ($qty * $price);
    }
}

// Allow small rounding difference (1 cent)
$clientTotal = intval($input['amount_cents'] ?? 0);
if (abs($serverTotalCents - $clientTotal) > 1) {
    http_response_code(400);
    echo json_encode([
        'error' => 'Amount mismatch detected',
        'expected' => $serverTotalCents,
        'received' => $clientTotal
    ]);
    exit;
}

$paymob_base = 'https://accept.paymob.com/api';

function paymobRequest($url, $data) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    
    if (curl_errno($ch)) {
        throw new Exception('cURL error: ' . curl_error($ch));
    }
    
    curl_close($ch);
    
    if ($httpCode >= 400) {
        throw new Exception('Paymob API error: ' . $response);
    }
    
    return json_decode($response, true);
}

try {
    // Step 1: Auth
    $authData = paymobRequest($paymob_base . '/auth/tokens', [
        'api_key' => $api_key
    ]);
    
    if (empty($authData['token'])) {
        throw new Exception('Auth failed: ' . json_encode($authData));
    }
    
    $token = $authData['token'];

    // Step 2: Create Order
    $orderData = paymobRequest($paymob_base . '/ecommerce/orders', [
        'auth_token' => $token,
        'delivery_needed' => false,
        'amount_cents' => $serverTotalCents, // Use server-calculated amount
        'currency' => 'EGP',
        'items' => $input['items'],
        'shipping_data' => $input['shipping_data']
    ]);
    
    if (empty($orderData['id'])) {
        throw new Exception('Order creation failed: ' . json_encode($orderData));
    }
    
    $order_id = $orderData['id'];

    // Step 3: Payment Key
    $keyData = paymobRequest($paymob_base . '/acceptance/payment_keys', [
        'auth_token' => $token,
        'amount_cents' => $serverTotalCents, // Use server-calculated amount
        'expiration' => 3600,
        'order_id' => $order_id,
        'billing_data' => $input['billing_data'],
        'currency' => 'EGP',
        'integration_id' => $input['integration_id'],
        'lock_order_when_paid' => false
    ]);
    
    if (empty($keyData['token'])) {
        throw new Exception('Payment key failed: ' . json_encode($keyData));
    }

    echo json_encode([
        'success' => true,
        'iframeUrl' => $paymob_base . '/acceptance/iframes/' . $iframe_id . '?payment_token=' . $keyData['token'],
        'orderId' => $order_id
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>