<?php
/**
 * Charge a Vodafone Cash wallet for a session created by paymob.php.
 *
 * The client sends only its order reference and the wallet number -- the
 * payment token is looked up server-side, so the amount cannot be altered.
 * As with cards, the order is not "paid" until callback.php verifies the HMAC.
 */

require_once __DIR__ . '/lib/bootstrap.php';

api_cors();
api_require_method('POST');
api_rate_limit('vodafone', 10, 60);

$input = api_body();

$merchantOrderId = (string) ($input['merchantOrderId'] ?? '');
$phone           = preg_replace('/\s+/', '', (string) ($input['phoneNumber'] ?? ''));

if ($merchantOrderId === '') {
    api_fail(400, 'Missing order reference');
}

// Egyptian mobile numbers: 01 followed by 0/1/2/5 and eight more digits.
if (!preg_match('/^01[0125][0-9]{8}$/', $phone)) {
    api_fail(400, 'Please enter a valid Egyptian mobile number');
}

$record = api_payment_read($merchantOrderId);
if (!$record || empty($record['payment_token'])) {
    api_fail(404, 'Payment session not found, please start again');
}
if (($record['status'] ?? '') === 'paid') {
    api_json(['success' => true, 'alreadyPaid' => true]);
}

$ch = curl_init('https://accept.paymob.com/api/acceptance/payments/pay');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'source' => [
        'identifier' => $phone,
        'subtype'    => 'WALLET',
    ],
    'payment_token' => $record['payment_token'],
]));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);

$response = curl_exec($ch);
if (curl_errno($ch)) {
    $err = curl_error($ch);
    curl_close($ch);
    api_fail(502, 'Could not reach the payment provider, please try again', 'cURL error: ' . $err);
}
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($code >= 400) {
    api_fail(502, 'The wallet payment was declined, please try again', 'Paymob ' . $code . ': ' . $response);
}

$data = json_decode($response, true) ?: [];

api_json([
    'success'     => true,
    'pending'     => !empty($data['pending']),
    'redirectUrl' => $data['redirect_url'] ?? null,
]);
