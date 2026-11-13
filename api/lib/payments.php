<?php
/**
 * Payment methods.
 *
 * No gateway, no API keys, nothing to sign or verify. Every method here is
 * "collect the money outside the API" — cash in hand, or a bank/wallet
 * transfer the customer sends themselves — so create_payment() never talks
 * to a third party and there is no webhook to receive.
 *
 *   supported_methods()             → ['cod', 'instapay', 'vodafone_cash']
 *   create_payment($order, $method) → ['status' => ..., 'reference' => ...]
 *
 * status is one of:
 *   'pending_cash'   — collect on delivery, nothing to confirm upfront
 *   'pending_manual' — customer transfers themselves; an admin marks the
 *                      order paid by hand once the money is actually in
 */

if (!defined('NOMANY_API')) {
    http_response_code(403);
    exit('Direct access denied');
}

/** Methods the storefront should offer. All three need zero configuration. */
function payment_supported_methods()
{
    return ['cod', 'instapay', 'vodafone_cash'];
}

function payment_create($order, $method)
{
    if ($method === 'cod') {
        return [
            'status'    => 'pending_cash',
            'reference' => 'COD-' . $order['order_number'],
            'amount'    => $order['total'],
        ];
    }

    // instapay / vodafone_cash: the transfer number/link lives in Settings and
    // is shown to the customer client-side. Nothing to start server-side —
    // the order just waits for an admin to see the money and mark it paid.
    return [
        'status'    => 'pending_manual',
        'reference' => 'MANUAL-' . $order['order_number'],
        'amount'    => $order['total'],
    ];
}
