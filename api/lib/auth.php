<?php
/**
 * Admin authentication: bcrypt password hashing and HS256 JWTs.
 *
 * Replaces Firebase Auth. Dependency-free — PHP ships password_hash() and
 * hash_hmac(), which is all a signed token needs.
 *
 * Requires JWT_SECRET in api/.env. The API refuses to start without it rather
 * than falling back to a default, because a predictable secret means anyone can
 * mint themselves an admin token.
 */

if (!defined('NOMANY_API')) {
    http_response_code(403);
    exit('Direct access denied');
}

const JWT_TTL_SECONDS = 86400; // 24h, matching the reference project.

function jwt_secret()
{
    $secret = api_env()['JWT_SECRET'] ?? '';
    if (strlen($secret) < 32) {
        api_fail(
            500,
            'The server is not configured',
            'JWT_SECRET missing or shorter than 32 characters'
        );
    }
    return $secret;
}

function b64url_encode($data)
{
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function b64url_decode($data)
{
    return base64_decode(strtr($data, '-_', '+/') . str_repeat('=', (4 - strlen($data) % 4) % 4));
}

function jwt_issue(array $claims)
{
    $now = time();
    $payload = array_merge($claims, ['iat' => $now, 'exp' => $now + JWT_TTL_SECONDS]);

    $header = b64url_encode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $body   = b64url_encode(json_encode($payload));
    $sig    = b64url_encode(hash_hmac('sha256', "{$header}.{$body}", jwt_secret(), true));

    return "{$header}.{$body}.{$sig}";
}

/** Returns the claims, or null for anything malformed, mis-signed or expired. */
function jwt_verify($token)
{
    $parts = explode('.', (string) $token);
    if (count($parts) !== 3) {
        return null;
    }

    [$header, $body, $sig] = $parts;

    $expected = b64url_encode(hash_hmac('sha256', "{$header}.{$body}", jwt_secret(), true));
    // hash_equals, not ===, so a wrong signature takes the same time to reject.
    if (!hash_equals($expected, $sig)) {
        return null;
    }

    $claims = json_decode(b64url_decode($body), true);
    if (!is_array($claims) || ($claims['exp'] ?? 0) < time()) {
        return null;
    }

    return $claims;
}

function bearer_token()
{
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';

    // Apache with mod_php does not always populate HTTP_AUTHORIZATION; the
    // .htaccess rewrite passes it through as REDIRECT_HTTP_AUTHORIZATION.
    if (!$header && isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $header = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    }
    if (!$header && function_exists('getallheaders')) {
        foreach (getallheaders() as $key => $value) {
            if (strtolower($key) === 'authorization') {
                $header = $value;
                break;
            }
        }
    }

    return preg_match('/^Bearer\s+(.+)$/i', trim($header), $m) ? $m[1] : null;
}

/** The signed-in admin, or null. */
function current_admin()
{
    static $cached = false;
    static $admin = null;

    if ($cached) {
        return $admin;
    }
    $cached = true;

    $claims = jwt_verify(bearer_token());
    if (!$claims || empty($claims['sub'])) {
        return $admin = null;
    }

    // Re-read the row rather than trusting the token's copy: a deleted or
    // renamed account should stop working immediately, not in 24 hours.
    $admin = db_one('SELECT id, username FROM admin_users WHERE id = ?', [(int) $claims['sub']]);
    return $admin;
}

/** Halts with 401 unless a valid admin token is present. */
function require_admin()
{
    $admin = current_admin();
    if (!$admin) {
        api_fail(401, 'Please sign in again');
    }
    return $admin;
}

function hash_password($plain)
{
    return password_hash($plain, PASSWORD_BCRYPT);
}

function check_password($plain, $hash)
{
    return password_verify($plain, $hash);
}

/**
 * Create the first admin from api/.env on first boot, so a fresh install has a
 * way in without running SQL by hand.
 */
function ensure_first_admin()
{
    $existing = db_one('SELECT COUNT(*) AS c FROM admin_users');
    if ((int) ($existing['c'] ?? 0) > 0) {
        return;
    }

    $env = api_env();
    $username = trim($env['ADMIN_USERNAME'] ?? '');
    $password = (string) ($env['ADMIN_PASSWORD'] ?? '');

    if ($username === '' || strlen($password) < 8) {
        return; // Nothing to seed; /api/admin/login will simply reject everything.
    }

    db_run(
        'INSERT INTO admin_users (username, password_hash) VALUES (?, ?)',
        [strtolower($username), hash_password($password)]
    );
}
