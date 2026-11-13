<?php
/**
 * sitemap.xml, generated from the database.
 *
 * The web root's .htaccess rewrites /sitemap.xml here, so the sitemap lists
 * every live product and category instead of going stale the moment the
 * catalogue changes — which is what a checked-in static file would do.
 *
 * The admin sign-in path is never emitted. It is unlinked everywhere, and a
 * sitemap is the most reliable way to get a URL crawled.
 */

require_once __DIR__ . '/lib/bootstrap.php';
require_once __DIR__ . '/lib/db.php';

api_require_method('GET');

/** First allowed origin, which is the canonical https://domain for this site. */
function sitemap_base_url()
{
    $origins = array_filter(array_map('trim', explode(',', api_env()['APP_ALLOWED_ORIGINS'] ?? '')));
    foreach ($origins as $origin) {
        if (strpos($origin, 'https://') === 0 && strpos($origin, '//www.') === false) {
            return rtrim($origin, '/');
        }
    }
    return 'https://' . ($_SERVER['HTTP_HOST'] ?? 'nomany-vape-store.com');
}

$base = sitemap_base_url();

// Static pages, with how often each is worth re-crawling.
$urls = [
    ['/',              '1.0', 'daily'],
    ['/products',      '0.9', 'daily'],
    ['/categories',    '0.8', 'weekly'],
    ['/offers',        '0.8', 'daily'],
    ['/about',         '0.4', 'monthly'],
    ['/contact',       '0.4', 'monthly'],
    ['/return-policy', '0.3', 'yearly'],
];

// A failure here must not take the whole sitemap down — static pages are still
// worth serving if the database is briefly unreachable.
try {
    db_init();

    foreach (db_all('SELECT id FROM categories ORDER BY sort_order, id') as $row) {
        $urls[] = ['/categories/' . (int) $row['id'], '0.7', 'weekly'];
    }

    // Unavailable products stay listed: they are still real pages with a
    // "notify me" form, and dropping them on every stock-out churns the index.
    foreach (db_all('SELECT id FROM products ORDER BY id') as $row) {
        $urls[] = ['/products/' . (int) $row['id'], '0.6', 'weekly'];
    }
} catch (Throwable $e) {
    error_log('[nomany-api] sitemap fell back to static pages: ' . $e->getMessage());
}

header('Content-Type: application/xml; charset=utf-8');
header('Cache-Control: public, max-age=3600');

echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";

foreach ($urls as [$path, $priority, $frequency]) {
    echo "  <url>\n";
    echo '    <loc>' . htmlspecialchars($base . $path, ENT_XML1) . "</loc>\n";
    echo '    <changefreq>' . $frequency . "</changefreq>\n";
    echo '    <priority>' . $priority . "</priority>\n";
    echo "  </url>\n";
}

echo '</urlset>' . "\n";
