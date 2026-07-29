<?php
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

$input = json_decode(file_get_contents('php://input'), true);
$paymob_base = 'https://accept.paymob.com/api';

try {
    $ch = curl_init($paymob_base . '/acceptance/payments/pay');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
        'source' => [
            'identifier' => $input['phone_number'],
            'subtype' => 'WALLET'
        ],
        'payment_token' => $input['payment_token']
    ]));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    
    if (curl_errno($ch)) {
        throw new Exception('cURL error: ' . curl_error($ch));
    }
    
    curl_close($ch);
    
    if ($httpCode >= 400) {
        throw new Exception('Paymob API error: ' . $response);
    }
    
    $data = json_decode($response, true);
    echo json_encode($data);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>