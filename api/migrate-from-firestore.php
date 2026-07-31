<?php
/**
 * One-off import: Firestore → MySQL.
 *
 * Reads the `store/*` documents over Firestore's public REST API (they are
 * world-readable, so no credentials are needed) and writes them into the new
 * tables. Base64 images embedded in the old documents are extracted to real
 * files under uploads/ and replaced with their URL.
 *
 * Run once, signed in as admin:
 *   POST /api/migrate-from-firestore.php   with the admin Bearer token
 *
 * Safe to re-run: it skips a table that already has rows rather than
 * duplicating everything.
 */

require_once __DIR__ . '/lib/bootstrap.php';
require_once __DIR__ . '/lib/db.php';
require_once __DIR__ . '/lib/auth.php';

api_cors();
api_require_method('POST');

db_init();
ensure_first_admin();
require_admin();

$projectId = api_env()['FIREBASE_PROJECT_ID'] ?? '';
if ($projectId === '') {
    api_fail(400, 'FIREBASE_PROJECT_ID is not set — nothing to import from');
}

$base = "https://firestore.googleapis.com/v1/projects/{$projectId}/databases/(default)/documents";
$log = [];

/** Decode Firestore's typed JSON into ordinary PHP values. */
function fx($value)
{
    if (!is_array($value)) return null;
    if (array_key_exists('nullValue', $value))    return null;
    if (array_key_exists('booleanValue', $value)) return (bool) $value['booleanValue'];
    if (array_key_exists('integerValue', $value)) return (int) $value['integerValue'];
    if (array_key_exists('doubleValue', $value))  return (float) $value['doubleValue'];
    if (array_key_exists('stringValue', $value))  return (string) $value['stringValue'];
    if (isset($value['arrayValue'])) {
        return array_map('fx', $value['arrayValue']['values'] ?? []);
    }
    if (isset($value['mapValue'])) {
        $out = [];
        foreach ($value['mapValue']['fields'] ?? [] as $k => $v) $out[$k] = fx($v);
        return $out;
    }
    return null;
}

function fetch_doc($base, $name)
{
    $ch = curl_init("{$base}/store/{$name}");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    $raw = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($code !== 200) return null;
    $body = json_decode($raw, true);
    return isset($body['fields']['data']) ? fx($body['fields']['data']) : null;
}

/**
 * Old records embedded images as base64 data URLs. Write them out as real files
 * so the catalogue stores a short URL instead of megabytes of text.
 */
function externalise_image($src, &$log)
{
    if (!is_string($src) || $src === '') return null;
    if (!str_starts_with($src, 'data:image/')) return $src;

    if (!preg_match('#^data:image/([a-z]+);base64,(.+)$#is', $src, $m)) return null;

    $ext = strtolower($m[1]) === 'jpeg' ? 'jpg' : strtolower($m[1]);
    $bytes = base64_decode($m[2], true);
    if ($bytes === false) return null;

    $dir = dirname(__DIR__) . '/uploads';
    if (!is_dir($dir)) @mkdir($dir, 0755, true);

    $name = 'migrated-' . bin2hex(random_bytes(6)) . '.' . $ext;
    file_put_contents($dir . '/' . $name, $bytes);
    @chmod($dir . '/' . $name, 0644);

    $base = rtrim(api_env()['UPLOAD_PUBLIC_URL'] ?? '', '/');
    if ($base === '') {
        $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $base = $scheme . '://' . ($_SERVER['HTTP_HOST'] ?? '') . '/uploads';
    }

    $log[] = 'extracted embedded image → ' . $name . ' (' . round(strlen($bytes) / 1024) . ' KB)';
    return $base . '/' . $name;
}

function table_is_empty($table)
{
    $row = db_one("SELECT COUNT(*) c FROM {$table}");
    return (int) $row['c'] === 0;
}

// -- Categories -------------------------------------------------------------
$categoryMap = []; // old Firestore id => new MySQL id

$categories = fetch_doc($base, 'categories') ?: [];
if (table_is_empty('categories')) {
    foreach ($categories as $c) {
        db_run(
            'INSERT INTO categories (name_en, name_ar, image_url, sort_order) VALUES (?,?,?,?)',
            [$c['nameEn'] ?? '', $c['nameAr'] ?? '', externalise_image($c['image'] ?? null, $log), (int) ($c['order'] ?? 0)]
        );
        $categoryMap[(string) ($c['id'] ?? '')] = db_insert_id();
    }
    $log[] = 'categories: imported ' . count($categories);
} else {
    foreach (db_all('SELECT id, name_en FROM categories') as $row) {
        foreach ($categories as $c) {
            if (($c['nameEn'] ?? '') === $row['name_en']) $categoryMap[(string) $c['id']] = (int) $row['id'];
        }
    }
    $log[] = 'categories: already populated, skipped';
}

// -- Brands -----------------------------------------------------------------
$brandMap = [];

$brands = fetch_doc($base, 'brands') ?: [];
if (table_is_empty('brands')) {
    foreach ($brands as $b) {
        db_run('INSERT INTO brands (name) VALUES (?)', [$b['name'] ?? ($b['id'] ?? '')]);
        $brandMap[(string) ($b['id'] ?? '')] = db_insert_id();
    }
    $log[] = 'brands: imported ' . count($brands);
} else {
    foreach (db_all('SELECT id, name FROM brands') as $row) {
        foreach ($brands as $b) {
            if (($b['name'] ?? '') === $row['name']) $brandMap[(string) $b['id']] = (int) $row['id'];
        }
    }
    $log[] = 'brands: already populated, skipped';
}

// -- Products ---------------------------------------------------------------
$productMap = [];

$products = fetch_doc($base, 'products') ?: [];
if (table_is_empty('products')) {
    foreach ($products as $p) {
        $images = [];
        foreach ((array) ($p['images'] ?? []) as $src) {
            $url = externalise_image($src, $log);
            if ($url) $images[] = $url;
        }

        db_run('INSERT INTO products
            (name_en, name_ar, description_en, description_ar, category_id, brand_id, sku,
             price, discount_price, images, is_available, featured, best_seller, new_arrival, on_offer)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [
            $p['nameEn'] ?? '', $p['nameAr'] ?? '',
            $p['descriptionEn'] ?? null, $p['descriptionAr'] ?? null,
            $categoryMap[(string) ($p['category'] ?? '')] ?? null,
            $brandMap[(string) ($p['brand'] ?? '')] ?? null,
            $p['sku'] ?? null,
            (float) ($p['price'] ?? 0),
            !empty($p['discountPrice']) ? (float) $p['discountPrice'] : null,
            json_encode($images, JSON_UNESCAPED_SLASHES),
            !empty($p['availability']) ? 1 : 0,
            !empty($p['featured']) ? 1 : 0,
            !empty($p['bestSeller']) ? 1 : 0,
            !empty($p['newArrival']) ? 1 : 0,
            !empty($p['offer']) ? 1 : 0,
        ]);
        $productMap[(string) ($p['id'] ?? '')] = db_insert_id();
    }
    $log[] = 'products: imported ' . count($products);
} else {
    $log[] = 'products: already populated, skipped';
}

// -- Offers -----------------------------------------------------------------
$offers = fetch_doc($base, 'offers') ?: [];
if (table_is_empty('offers')) {
    foreach ($offers as $o) {
        $ids = [];
        foreach ((array) ($o['products'] ?? []) as $oldId) {
            if (isset($productMap[(string) $oldId])) $ids[] = $productMap[(string) $oldId];
        }
        db_run('INSERT INTO offers
            (title_en, title_ar, description_en, description_ar, discount_percentage, start_date, end_date, active, product_ids)
            VALUES (?,?,?,?,?,?,?,?,?)', [
            $o['titleEn'] ?? '', $o['titleAr'] ?? '',
            $o['descriptionEn'] ?? null, $o['descriptionAr'] ?? null,
            (float) ($o['discountPercentage'] ?? 0),
            !empty($o['startDate']) ? $o['startDate'] : null,
            !empty($o['endDate']) ? $o['endDate'] : null,
            !empty($o['active']) ? 1 : 0,
            json_encode($ids),
        ]);
    }
    $log[] = 'offers: imported ' . count($offers);
} else {
    $log[] = 'offers: already populated, skipped';
}

// -- Banners ----------------------------------------------------------------
$banners = fetch_doc($base, 'banners') ?: [];
if (table_is_empty('banners')) {
    foreach ($banners as $b) {
        db_run('INSERT INTO banners (title_en, title_ar, subtitle_en, subtitle_ar, image_url, link, sort_order, active)
                VALUES (?,?,?,?,?,?,?,?)', [
            $b['titleEn'] ?? null, $b['titleAr'] ?? null,
            $b['subtitleEn'] ?? null, $b['subtitleAr'] ?? null,
            externalise_image($b['image'] ?? null, $log),
            $b['link'] ?? null, (int) ($b['order'] ?? 0),
            !empty($b['active']) ? 1 : 0,
        ]);
    }
    $log[] = 'banners: imported ' . count($banners);
} else {
    $log[] = 'banners: already populated, skipped';
}

// -- Settings ---------------------------------------------------------------
$settings = fetch_doc($base, 'settings');
if (is_array($settings)) {
    $map = [];
    foreach ($settings as $key => $value) {
        if (!is_scalar($value)) continue;
        $snake = strtolower(preg_replace('/([a-z0-9])([A-Z])/', '$1_$2', $key));
        $map[$snake] = (string) $value;
    }
    if ($map) {
        settings_put($map);
        $log[] = 'settings: imported ' . count($map) . ' keys';
    }
} else {
    $log[] = 'settings: nothing in Firestore, defaults kept';
}

api_json([
    'success' => true,
    'log'     => $log,
    'counts'  => [
        'categories' => (int) db_one('SELECT COUNT(*) c FROM categories')['c'],
        'brands'     => (int) db_one('SELECT COUNT(*) c FROM brands')['c'],
        'products'   => (int) db_one('SELECT COUNT(*) c FROM products')['c'],
        'offers'     => (int) db_one('SELECT COUNT(*) c FROM offers')['c'],
        'banners'    => (int) db_one('SELECT COUNT(*) c FROM banners')['c'],
    ],
]);
