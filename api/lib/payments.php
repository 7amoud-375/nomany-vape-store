<?php
/**
 * Payment providers.
 *
 * Same contract as the reference project, so swapping gateway is a config
 * change rather than a rewrite:
 *
 *   supported_methods()                    → ['cod', 'card', 'wallet']
 *   is_configured()                        → credentials present
 *   create_payment($order, $method, $cust) → ['status' => ..., 'reference' => ...]
 *   verify_webhook($payload, $headers)     → ['valid' =>, 'reference' =>, 'paid' =>]
 *
 * status is one of:
 *   'pending_cash' — collect on delivery, nothing to do online
 *   'redirect'     — send the customer to redirectUrl
 *   'failed'       — provider refused
 */

if (!defined('NOMANY_API')) {
    http_response_code(403);
    exit('Direct access denied');
}

function payment_config()
{
    $env = api_env();
    return [
        'provider'   => strtolower($env['PAYMENT_PROVIDER'] ?? 'cod'),
        'currency'   => $env['PAYMENT_CURRENCY'] ?? 'EGP',
        'returnUrl'  => $env['PAYMENT_RETURN_URL'] ?? '',
        'webhookUrl' => $env['PAYMENT_WEBHOOK_URL'] ?? '',
        'kashier'    => [
            'merchantId' => $env['KASHIER_MERCHANT_ID'] ?? '',
            'apiKey'     => $env['KASHIER_API_KEY'] ?? '',
            'secretKey'  => $env['KASHIER_SECRET_KEY'] ?? '',
            'mode'       => $env['KASHIER_MODE'] ?? 'test',
        ],
    ];
}

function payment_provider_name()
{
    return payment_config()['provider'];
}

function payment_is_configured()
{
    $config = payment_config();
    if ($config['provider'] === 'kashier') {
        return $config['kashier']['merchantId'] !== '' && $config['kashier']['apiKey'] !== '';
    }
    return true; // cod needs nothing
}

/** Methods the storefront should offer right now. */
function payment_supported_methods()
{
    if (payment_provider_name() === 'kashier' && payment_is_configured()) {
        return ['cod', 'card', 'wallet'];
    }
    // Falling back to cash-only is deliberate: better a working shop than a
    // card button that dead-ends because credentials are missing.
    return ['cod'];
}

/**
 * Kashier signs `/?payment=<merchantId>.<orderId>.<amount>.<currency>`
 * with HMAC-SHA256 using the merchant's API key.
 */
function kashier_signature($orderId, $amount, $config)
{
    $path = '/?payment=' . $config['kashier']['merchantId']
          . '.' . $orderId
          . '.' . $amount
          . '.' . $config['currency'];

    return hash_hmac('sha256', $path, $config['kashier']['apiKey']);
}

function payment_create($order, $method, $customer)
{
    $config = payment_config();

    if ($method === 'cod') {
        return [
            'status'    => 'pending_cash',
            'reference' => 'COD-' . $order['order_number'],
            'amount'    => $order['total'],
        ];
    }

    if ($config['provider'] !== 'kashier' || !payment_is_configured()) {
        return [
            'status' => 'failed',
            'error'  => 'Online payment is not available right now',
        ];
    }

    $orderId = $order['id'] . '-' . time();
    $amount  = number_format((float) $order['total'], 2, '.', '');

    $params = [
        'merchantId'        => $config['kashier']['merchantId'],
        'orderId'           => $orderId,
        'amount'            => $amount,
        'currency'          => $config['currency'],
        'hash'              => kashier_signature($orderId, $amount, $config),
        'mode'              => $config['kashier']['mode'],
        // Kashier calls card payments 'card' and mobile wallets 'wallet'.
        'allowedMethods'    => $method === 'wallet' ? 'wallet' : 'card',
        'merchantRedirect'  => $config['returnUrl'],
        'serverWebhook'     => $config['webhookUrl'],
        'customerReference' => (string) ($customer['phone'] ?? $order['id']),
        'display'           => 'ar',
    ];

    return [
        'status'      => 'redirect',
        'reference'   => $orderId,
        'redirectUrl' => 'https://checkout.kashier.io?' . http_build_query($params),
        'amount'      => $order['total'],
    ];
}

/**
 * Validate a gateway callback. Nothing is marked paid without this returning
 * valid AND paid — a request that merely claims success proves nothing.
 */
function payment_verify_webhook($payload, $headers)
{
    $config = payment_config();

    if ($config['provider'] !== 'kashier') {
        return ['valid' => false, 'reference' => null, 'paid' => false];
    }

    $secret = $config['kashier']['secretKey'];
    $received = '';
    foreach ($headers as $key => $value) {
        if (strtolower($key) === 'x-kashier-signature') {
            $received = $value;
            break;
        }
    }

    $data = $payload['data'] ?? null;
    if (!$secret || !$received || !is_array($data)) {
        return ['valid' => false, 'reference' => null, 'paid' => false];
    }

    // Kashier signs the query-string form of the fields it lists in signatureKeys.
    $pairs = [];
    foreach (($data['signatureKeys'] ?? []) as $key) {
        $pairs[] = $key . '=' . ($data[$key] ?? '');
    }
    $expected = hash_hmac('sha256', implode('&', $pairs), $secret);

    $valid = hash_equals($expected, (string) $received);

    return [
        'valid'     => $valid,
        'reference' => $data['merchantOrderId'] ?? $data['orderId'] ?? null,
        'paid'      => $valid && strtoupper((string) ($data['status'] ?? '')) === 'SUCCESS',
    ];
}
