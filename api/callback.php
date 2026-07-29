<?php
/**
 * Paymob transaction callback.
 *
 * This is the only place an order may become "paid". Paymob signs every
 * callback with HMAC-SHA512; we recompute that signature from the transaction
 * fields and reject anything that does not match. A forged request -- including
 * one from the customer's own browser -- fails the check and changes nothing.
 *
 * Configure the URL in the Paymob dashboard (Developers -> Payment Integrations):
 *   Transaction processed callback: https://YOURDOMAIN/api/callback.php
 *
 * Note there is no CORS call here on purpose: this is a server-to-server
 * request from Paymob, not a browser fetch.
 */

require_once __DIR__ . '/lib/bootstrap.php';

api_require_method('POST');

$env        = api_env();
$hmacSecret = $env['PAYMOB_HMAC_SECRET'] ?? '';
if (!$hmacSecret) {
    api_fail(500, 'Not configured', 'PAYMOB_HMAC_SECRET missing');
}

$payload     = api_body();
$transaction = $payload['obj'] ?? null;
if (!is_array($transaction)) {
    api_fail(400, 'Malformed callback');
}

/** Pluck a possibly nested value using Paymob's dotted field names. */
function cb_field($source, $path)
{
    $cursor = $source;
    foreach (explode('.', $path) as $segment) {
        if (!is_array($cursor) || !array_key_exists($segment, $cursor)) {
            return '';
        }
        $cursor = $cursor[$segment];
    }
    if (is_bool($cursor)) {
        return $cursor ? 'true' : 'false';
    }
    if ($cursor === null) {
        return '';
    }
    return (string) $cursor;
}

// Exactly this order, per Paymob's HMAC specification. Do not sort or reorder.
$hmacFields = [
    'amount_cents',
    'created_at',
    'currency',
    'error_occured',
    'has_parent_transaction',
    'id',
    'integration_id',
    'is_3d_secure',
    'is_auth',
    'is_capture',
    'is_refunded',
    'is_standalone_payment',
    'is_voided',
    'order.id',
    'owner',
    'pending',
    'source_data.pan',
    'source_data.sub_type',
    'source_data.type',
    'success',
];

$concatenated = '';
foreach ($hmacFields as $field) {
    $concatenated .= cb_field($transaction, $field);
}

$expectedHmac = hash_hmac('sha512', $concatenated, $hmacSecret);
$providedHmac = (string) ($_GET['hmac'] ?? $payload['hmac'] ?? '');

if (!hash_equals($expectedHmac, $providedHmac)) {
    api_fail(401, 'Invalid signature', 'HMAC mismatch for transaction ' . cb_field($transaction, 'id'));
}

// -- Signature is valid. Now check it says what we need it to say. ----------
$merchantOrderId = cb_field($transaction, 'order.merchant_order_id');
if ($merchantOrderId === '') {
    api_fail(400, 'Missing merchant order reference');
}

$record = api_payment_read($merchantOrderId);
if (!$record) {
    api_fail(404, 'Unknown order reference', 'No pending payment for ' . $merchantOrderId);
}

$paidCents = (int) cb_field($transaction, 'amount_cents');
$succeeded = cb_field($transaction, 'success') === 'true';
$refunded  = cb_field($transaction, 'is_refunded') === 'true';
$voided    = cb_field($transaction, 'is_voided') === 'true';
$pending   = cb_field($transaction, 'pending') === 'true';

$isPaid = $succeeded && !$refunded && !$voided && !$pending
    && $paidCents === (int) $record['expected_cents'];

if ($succeeded && $paidCents !== (int) $record['expected_cents']) {
    error_log(sprintf(
        '[nomany-api] Amount mismatch on %s: charged %d, expected %d',
        $merchantOrderId,
        $paidCents,
        (int) $record['expected_cents']
    ));
}

$record['status']         = $isPaid ? 'paid' : ($pending ? 'pending' : 'failed');
$record['transaction_id'] = cb_field($transaction, 'id');
$record['paid_cents']     = $paidCents;
$record['verified_at']    = gmdate('c');
api_payment_write($merchantOrderId, $record);

// Reflect the verified status onto the order document. This uses the service
// account, which is why firestore.rules can forbid the browser from ever
// writing `status` itself.
if ($isPaid) {
    try {
        $documentName = fs_find_order($env, $merchantOrderId);
        if ($documentName) {
            fs_patch($env, $documentName, [
                'status'        => 'paid',
                'paidAt'        => gmdate('c'),
                'transactionId' => cb_field($transaction, 'id'),
                'paidCents'     => $paidCents,
            ]);
        } else {
            error_log('[nomany-api] Paid but no order doc yet for ' . $merchantOrderId);
        }
    } catch (Exception $e) {
        // The payment is still recorded locally and verify.php will report it,
        // so a Firestore hiccup must not make us return an error to Paymob --
        // that would trigger pointless retries.
        error_log('[nomany-api] Firestore update failed for ' . $merchantOrderId . ': ' . $e->getMessage());
    }
}

api_json(['success' => true]);
