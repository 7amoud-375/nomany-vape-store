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
 * database errors and stack traces must not leak to the browser.
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

    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');

    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(204);
        exit;
    }

    // A browser request from an origin we do not recognise gets nothing.
    // Server-to-server callbacks send no Origin header, so they pass through.
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
 * hammering login or the order endpoint.
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

    api_rate_limit_prune($dir, $now);
}

/**
 * Delete counter files nobody has touched in a day.
 *
 * One file is created per bucket per client IP and nothing ever removed them,
 * so the directory grew by a file per visitor forever. Shared hosting bills
 * inodes, not just bytes, and a few hundred thousand dead 20-byte files is a
 * genuine way to fill a plan's quota.
 *
 * Runs on roughly one request in fifty so the sweep costs nothing on the rest.
 */
function api_rate_limit_prune($dir, $now)
{
    if (random_int(1, 50) !== 1) {
        return;
    }

    foreach (glob($dir . '/*.json') ?: [] as $file) {
        if (@filemtime($file) < $now - 86400) {
            @unlink($file);
        }
    }
}
