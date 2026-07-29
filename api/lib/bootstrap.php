<?php
/**
 * Shared setup for every endpoint: env loading, CORS, JSON helpers.
 *
 * Allowed origins come from api/.env (APP_ALLOWED_ORIGINS) rather than being
 * hardcoded, so there is no placeholder domain to forget before launch.
 */

define('NOMANY_API', true);

// Never render PHP warnings into a JSON response body.
ini_set('display_errors', '0');
error_reporting(E_ALL);

require_once __DIR__ . '/firestore.php';

function api_env()
{
    static $env = null;
    if ($env !== null) {
        return $env;
    }

    $envFile = __DIR__ . '/../.env';
    if (!is_readable($envFile)) {
        api_fail(500, 'Server is not configured');
    }
    $env = parse_ini_file($envFile);
    if ($env === false) {
        api_fail(500, 'Server configuration is invalid');
    }
    return $env;
}

function api_json($data, $status = 200)
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data);
    exit;
}

/**
 * Return an error to the client. $internal is logged but never sent back --
 * Paymob responses and stack traces must not leak to the browser.
 */
function api_fail($status, $publicMessage, $internal = null)
{
    if ($internal !== null) {
        error_log('[nomany-api] ' . $internal);
    }
    api_json(['success' => false, 'error' => $publicMessage], $status);
}

function api_cors()
{
    $env = api_env();
    $allowed = array_filter(array_map('trim', explode(',', $env['APP_ALLOWED_ORIGINS'] ?? '')));
    $origin  = $_SERVER['HTTP_ORIGIN'] ?? '';

    if ($origin && in_array($origin, $allowed, true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
    }

    header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');

    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(204);
        exit;
    }

    // A browser request from an origin we do not recognise gets nothing. Server
    // to server callbacks (Paymob) send no Origin header, so they pass through.
    if ($origin && !in_array($origin, $allowed, true)) {
        api_fail(403, 'Origin not allowed');
    }
}

function api_require_method($method)
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== $method) {
        api_fail(405, 'Method not allowed');
    }
}

function api_body()
{
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

/**
 * Crude per-IP throttle backed by the filesystem. Enough to stop someone
 * hammering the payment endpoint and burning Paymob quota.
 */
function api_rate_limit($bucket, $maxRequests = 20, $windowSeconds = 60)
{
    $dir = __DIR__ . '/../data/ratelimit';
    if (!is_dir($dir)) {
        @mkdir($dir, 0700, true);
    }

    $ip   = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $file = $dir . '/' . $bucket . '-' . sha1($ip) . '.json';
    $now  = time();

    $hits = [];
    if (is_readable($file)) {
        $hits = json_decode(file_get_contents($file), true) ?: [];
    }
    $hits = array_values(array_filter($hits, function ($t) use ($now, $windowSeconds) {
        return $t > $now - $windowSeconds;
    }));

    if (count($hits) >= $maxRequests) {
        api_fail(429, 'Too many requests, please slow down');
    }

    $hits[] = $now;
    file_put_contents($file, json_encode($hits), LOCK_EX);
}

/** Where server-side payment state lives. Denied to the web by .htaccess. */
function api_payment_dir()
{
    $dir = __DIR__ . '/../data/payments';
    if (!is_dir($dir)) {
        @mkdir($dir, 0700, true);
    }
    return $dir;
}

function api_payment_path($merchantOrderId)
{
    // Constrain the filename: this value reaches us from the network.
    $safe = preg_replace('/[^A-Za-z0-9_-]/', '', (string) $merchantOrderId);
    if ($safe === '') {
        api_fail(400, 'Invalid order reference');
    }
    return api_payment_dir() . '/' . $safe . '.json';
}

function api_payment_read($merchantOrderId)
{
    $path = api_payment_path($merchantOrderId);
    if (!is_readable($path)) {
        return null;
    }
    return json_decode(file_get_contents($path), true);
}

function api_payment_write($merchantOrderId, array $record)
{
    file_put_contents(api_payment_path($merchantOrderId), json_encode($record), LOCK_EX);
}
