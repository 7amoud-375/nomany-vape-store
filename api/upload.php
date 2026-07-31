<?php
/**
 * Product image upload.
 *
 * Replaces Firebase Storage, which was never enabled on the project — the
 * bucket 404s, so the uploader hung and then failed with nothing to show for
 * it. Images now live on this server's disk, which is already paid for.
 *
 * The endpoint is not open: the caller must present a Firebase ID token that
 * verifies against Google's public keys AND belongs to the admin uid. Without
 * that, anyone who found the URL could fill the disk.
 *
 * Requires in api/.env:
 *   FIREBASE_PROJECT_ID
 *   ADMIN_UID          (the admin's Firebase uid)
 *   UPLOAD_PUBLIC_URL  (e.g. https://nomany-vape-store.com/uploads)
 */

require_once __DIR__ . '/lib/bootstrap.php';

api_cors();
api_require_method('POST');
api_rate_limit('upload', 40, 300);

$env = api_env();

// -- Authenticate -----------------------------------------------------------
$headers = function_exists('getallheaders') ? getallheaders() : [];
$authHeader = '';
foreach ($headers as $key => $value) {
    if (strtolower($key) === 'authorization') {
        $authHeader = $value;
        break;
    }
}
if (!$authHeader && isset($_SERVER['HTTP_AUTHORIZATION'])) {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
}

if (!preg_match('/^Bearer\s+(.+)$/i', trim($authHeader), $m)) {
    api_fail(401, 'Not signed in');
}

$claims = verify_firebase_token($m[1], $env);
$adminUid = $env['ADMIN_UID'] ?? '';

if (!$adminUid) {
    api_fail(500, 'Uploads are not configured', 'ADMIN_UID missing from api/.env');
}
if (($claims['sub'] ?? '') !== $adminUid) {
    api_fail(403, 'Not allowed');
}

// -- Validate the file ------------------------------------------------------
if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
    $phpErrors = [
        UPLOAD_ERR_INI_SIZE   => 'The image is larger than the server allows',
        UPLOAD_ERR_FORM_SIZE  => 'The image is too large',
        UPLOAD_ERR_PARTIAL    => 'The upload was interrupted, try again',
        UPLOAD_ERR_NO_FILE    => 'No image was sent',
        UPLOAD_ERR_NO_TMP_DIR => 'Server has no temp directory',
        UPLOAD_ERR_CANT_WRITE => 'Server could not write the file',
    ];
    $code = $_FILES['image']['error'] ?? UPLOAD_ERR_NO_FILE;
    api_fail(400, $phpErrors[$code] ?? 'Upload failed');
}

$tmpPath = $_FILES['image']['tmp_name'];
$size    = (int) $_FILES['image']['size'];

if ($size > 4 * 1024 * 1024) {
    api_fail(413, 'The image is larger than 4 MB');
}

// Trust the actual bytes, never the client-supplied MIME type or extension.
$info = @getimagesize($tmpPath);
if ($info === false) {
    api_fail(400, 'That file is not a valid image');
}

$allowed = [
    IMAGETYPE_JPEG => 'jpg',
    IMAGETYPE_PNG  => 'png',
    IMAGETYPE_WEBP => 'webp',
    IMAGETYPE_GIF  => 'gif',
];
$type = $info[2];
if (!isset($allowed[$type])) {
    api_fail(400, 'Only JPG, PNG, WEBP and GIF images are allowed');
}

// -- Store it ---------------------------------------------------------------
// One level above api/, i.e. the web root, so the file is publicly reachable.
$uploadDir = dirname(__DIR__) . '/uploads';
if (!is_dir($uploadDir) && !@mkdir($uploadDir, 0755, true)) {
    api_fail(500, 'Could not create the uploads folder', 'mkdir failed for ' . $uploadDir);
}

// Refuse to become a free file host if something slips past the auth check.
$used = directory_size($uploadDir);
if ($used > 2 * 1024 * 1024 * 1024) {
    api_fail(507, 'Image storage is full, please contact support', 'uploads/ exceeded 2 GB');
}

$extension = $allowed[$type];
$name      = date('Ymd') . '-' . bin2hex(random_bytes(8)) . '.' . $extension;
$target    = $uploadDir . '/' . $name;

if (!move_uploaded_file($tmpPath, $target)) {
    api_fail(500, 'Could not save the image');
}
@chmod($target, 0644);

$base = rtrim($env['UPLOAD_PUBLIC_URL'] ?? '', '/');
if ($base === '') {
    // Fall back to deriving it from the request rather than failing outright.
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $base = $scheme . '://' . ($_SERVER['HTTP_HOST'] ?? '') . '/uploads';
}

api_json([
    'success' => true,
    'url'     => $base . '/' . $name,
    'bytes'   => filesize($target),
]);

// ---------------------------------------------------------------------------

function directory_size($dir)
{
    $total = 0;
    foreach (glob($dir . '/*') ?: [] as $file) {
        if (is_file($file)) {
            $total += filesize($file);
        }
    }
    return $total;
}

/**
 * Verify a Firebase ID token: RS256 signature against Google's published
 * certificates, plus issuer, audience and expiry.
 */
function verify_firebase_token($jwt, $env)
{
    $projectId = $env['FIREBASE_PROJECT_ID'] ?? '';
    if (!$projectId) {
        api_fail(500, 'Uploads are not configured', 'FIREBASE_PROJECT_ID missing');
    }

    $parts = explode('.', $jwt);
    if (count($parts) !== 3) {
        api_fail(401, 'Invalid session');
    }

    $decode = function ($segment) {
        $padded = strtr($segment, '-_', '+/');
        $padded .= str_repeat('=', (4 - strlen($padded) % 4) % 4);
        return json_decode(base64_decode($padded), true);
    };

    $header = $decode($parts[0]);
    $claims = $decode($parts[1]);

    if (!is_array($header) || !is_array($claims) || ($header['alg'] ?? '') !== 'RS256') {
        api_fail(401, 'Invalid session');
    }
    if (($claims['iss'] ?? '') !== 'https://securetoken.google.com/' . $projectId) {
        api_fail(401, 'Invalid session');
    }
    if (($claims['aud'] ?? '') !== $projectId) {
        api_fail(401, 'Invalid session');
    }
    if (($claims['exp'] ?? 0) < time()) {
        api_fail(401, 'Session expired, sign in again');
    }

    $certs = google_signing_certs();
    $kid   = $header['kid'] ?? '';
    if (!isset($certs[$kid])) {
        api_fail(401, 'Invalid session');
    }

    $publicKey = openssl_pkey_get_public($certs[$kid]);
    if (!$publicKey) {
        api_fail(500, 'Could not verify the session');
    }

    $signature = base64_decode(strtr($parts[2], '-_', '+/') . str_repeat('=', (4 - strlen($parts[2]) % 4) % 4));
    $verified  = openssl_verify("{$parts[0]}.{$parts[1]}", $signature, $publicKey, OPENSSL_ALGO_SHA256);

    if ($verified !== 1) {
        api_fail(401, 'Invalid session');
    }

    return $claims;
}

/** Google's certs rotate; cache them for an hour rather than per request. */
function google_signing_certs()
{
    $cacheFile = __DIR__ . '/data/.google-certs.json';

    if (is_readable($cacheFile)) {
        $cached = json_decode(file_get_contents($cacheFile), true);
        if (!empty($cached['expires_at']) && $cached['expires_at'] > time()) {
            return $cached['certs'];
        }
    }

    [$status, $certs] = fs_http(
        'GET',
        'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
    );

    if ($status >= 400 || !is_array($certs)) {
        api_fail(503, 'Could not verify the session, try again');
    }

    @mkdir(dirname($cacheFile), 0700, true);
    file_put_contents($cacheFile, json_encode([
        'certs'      => $certs,
        'expires_at' => time() + 3600,
    ]), LOCK_EX);

    return $certs;
}
