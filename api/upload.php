<?php
/**
 * Product image upload.
 *
 * Stores files under public_html/uploads and returns their public URL, the same
 * shape as the reference project's multer setup. Authenticated with the API's
 * own JWT — no Firebase anywhere.
 */

require_once __DIR__ . '/lib/bootstrap.php';
require_once __DIR__ . '/lib/db.php';
require_once __DIR__ . '/lib/auth.php';

api_cors();
api_require_method('POST');
api_rate_limit('upload', 60, 300);

require_admin();

// -- Validate ---------------------------------------------------------------
if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
    $messages = [
        UPLOAD_ERR_INI_SIZE   => 'The image is larger than the server allows',
        UPLOAD_ERR_FORM_SIZE  => 'The image is too large',
        UPLOAD_ERR_PARTIAL    => 'The upload was interrupted, try again',
        UPLOAD_ERR_NO_FILE    => 'No image was sent',
        UPLOAD_ERR_NO_TMP_DIR => 'Server has no temp directory',
        UPLOAD_ERR_CANT_WRITE => 'Server could not write the file',
    ];
    $code = $_FILES['image']['error'] ?? UPLOAD_ERR_NO_FILE;
    api_fail(400, $messages[$code] ?? 'Upload failed');
}

$tmpPath = $_FILES['image']['tmp_name'];

if ((int) $_FILES['image']['size'] > 4 * 1024 * 1024) {
    api_fail(413, 'The image is larger than 4 MB');
}

// Trust the bytes, not the filename or the client's content-type.
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
if (!isset($allowed[$info[2]])) {
    api_fail(400, 'Only JPG, PNG, WEBP and GIF images are allowed');
}

// -- Store ------------------------------------------------------------------
$uploadDir = dirname(__DIR__) . '/uploads';
if (!is_dir($uploadDir) && !@mkdir($uploadDir, 0755, true)) {
    api_fail(500, 'Could not create the uploads folder', 'mkdir failed for ' . $uploadDir);
}

$used = 0;
foreach (glob($uploadDir . '/*') ?: [] as $file) {
    if (is_file($file)) $used += filesize($file);
}
if ($used > 2 * 1024 * 1024 * 1024) {
    api_fail(507, 'Image storage is full', 'uploads/ exceeded 2 GB');
}

$name = date('Ymd') . '-' . bin2hex(random_bytes(8)) . '.' . $allowed[$info[2]];
$target = $uploadDir . '/' . $name;

if (!move_uploaded_file($tmpPath, $target)) {
    api_fail(500, 'Could not save the image');
}
@chmod($target, 0644);

$base = rtrim(api_env()['UPLOAD_PUBLIC_URL'] ?? '', '/');
if ($base === '') {
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $base = $scheme . '://' . ($_SERVER['HTTP_HOST'] ?? '') . '/uploads';
}

api_json([
    'success' => true,
    'url'     => $base . '/' . $name,
    'bytes'   => filesize($target),
]);
