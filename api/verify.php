<?php
/**
 * Report the server-verified state of a payment.
 *
 * The browser asks "is NOM-260729-A1B2C3 actually paid?" and only this answer
 * -- derived from the HMAC-checked callback -- is trusted by the UI. A URL
 * parameter saying success=true is not evidence of anything.
 */

require_once __DIR__ . '/lib/bootstrap.php';

api_cors();
api_require_method('GET');
api_rate_limit('verify', 60, 60);

$merchantOrderId = (string) ($_GET['merchantOrderId'] ?? '');
if ($merchantOrderId === '') {
    api_fail(400, 'Missing order reference');
}

$record = api_payment_read($merchantOrderId);
if (!$record) {
    api_json(['success' => true, 'status' => 'unknown', 'paid' => false]);
}

$status = $record['status'] ?? 'awaiting_payment';

api_json([
    'success'    => true,
    'status'     => $status,
    'paid'       => $status === 'paid',
    'totalCents' => (int) ($record['expected_cents'] ?? 0),
]);
