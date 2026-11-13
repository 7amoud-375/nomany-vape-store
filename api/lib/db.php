<?php
/**
 * MySQL connection and schema.
 *
 * Mirrors the SQLite layer from the reference project: one place that owns the
 * schema, runs idempotently on every boot, and seeds default settings so a
 * database created before a key existed still gets it.
 *
 * Requires in api/.env:
 *   DB_HOST, DB_NAME, DB_USER, DB_PASS
 */

if (!defined('NOMANY_API')) {
    http_response_code(403);
    exit('Direct access denied');
}

function db()
{
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    $env = api_env();
    $host = $env['DB_HOST'] ?? 'localhost';
    $name = $env['DB_NAME'] ?? '';
    $user = $env['DB_USER'] ?? '';
    $pass = $env['DB_PASS'] ?? '';

    if ($name === '' || $user === '') {
        api_fail(500, 'The database is not configured', 'DB_NAME or DB_USER missing from api/.env');
    }

    try {
        $pdo = new PDO(
            "mysql:host={$host};dbname={$name};charset=utf8mb4",
            $user,
            $pass,
            [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]
        );
    } catch (PDOException $e) {
        api_fail(503, 'Could not reach the database', $e->getMessage());
    }

    return $pdo;
}

/** Run a statement and return the PDOStatement. */
function db_run($sql, $params = [])
{
    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    return $stmt;
}

function db_all($sql, $params = [])
{
    return db_run($sql, $params)->fetchAll();
}

function db_one($sql, $params = [])
{
    $row = db_run($sql, $params)->fetch();
    return $row === false ? null : $row;
}

function db_insert_id()
{
    return (int) db()->lastInsertId();
}

/**
 * The schema revision this build expects. Bump it whenever a table or a
 * default setting changes, and the next request migrates the database.
 */
const SCHEMA_VERSION = 6;

/**
 * Create every table if missing, then record that we did.
 *
 * This used to run unconditionally on every single request: eight CREATE TABLE
 * statements, two ALTERs and nineteen INSERT IGNOREs before the endpoint did
 * any of its own work. That is roughly thirty wasted round-trips per API call,
 * which on a shared plan with a per-user connection and CPU quota is the most
 * expensive thing the API does.
 *
 * Now the work happens once per SCHEMA_VERSION. The marker lives in the
 * settings table, so the check costs one indexed primary-key lookup; if the
 * table does not exist yet the query throws and we fall through to the full
 * build, which is exactly the first-boot path.
 */
function db_init()
{
    $pdo = db();

    try {
        $row = $pdo->query("SELECT `value` FROM settings WHERE `key` = 'schema_version'")->fetch();
        if ($row && (int) $row['value'] >= SCHEMA_VERSION) {
            return;
        }
    } catch (PDOException $e) {
        // No settings table yet — first boot. Fall through and build it.
    }

    db_build_schema($pdo);
}

/** The actual DDL. Idempotent, but only called when the version marker is stale. */
function db_build_schema($pdo)
{
    $pdo->exec("CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name_en VARCHAR(190) NOT NULL,
        name_ar VARCHAR(190) NOT NULL,
        image_url TEXT,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS brands (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(190) NOT NULL,
        logo_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // `images` is a JSON array of URLs. Storing the paths rather than the bytes
    // is the whole point of moving off the old base64-into-the-document setup.
    // `flavors` is the same idea, optional: a plain JSON array of names such as
    // ["Mango Ice", "Mint"] for an e-liquid or disposable. NULL/empty means the
    // admin never set any, which is a normal, complete product.
    $pdo->exec("CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name_en VARCHAR(190) NOT NULL,
        name_ar VARCHAR(190) NOT NULL,
        description_en TEXT,
        description_ar TEXT,
        category_id INT NULL,
        brand_id INT NULL,
        sku VARCHAR(120),
        price DECIMAL(10,2) NOT NULL DEFAULT 0,
        discount_price DECIMAL(10,2) NULL,
        images JSON NULL,
        flavors JSON NULL,
        is_available TINYINT(1) NOT NULL DEFAULT 1,
        featured TINYINT(1) NOT NULL DEFAULT 0,
        best_seller TINYINT(1) NOT NULL DEFAULT 0,
        new_arrival TINYINT(1) NOT NULL DEFAULT 0,
        on_offer TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_category (category_id),
        INDEX idx_brand (brand_id),
        INDEX idx_available (is_available)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS offers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title_en VARCHAR(190) NOT NULL,
        title_ar VARCHAR(190) NOT NULL,
        description_en TEXT,
        description_ar TEXT,
        discount_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
        start_date DATE NULL,
        end_date DATE NULL,
        active TINYINT(1) NOT NULL DEFAULT 1,
        product_ids JSON NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // button_text_* and link feed the hero slider's call to action; without
    // them the slide renders with an unlabelled button.
    $pdo->exec("CREATE TABLE IF NOT EXISTS banners (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title_en VARCHAR(190),
        title_ar VARCHAR(190),
        subtitle_en TEXT,
        subtitle_ar TEXT,
        image_url TEXT,
        button_text_en VARCHAR(120),
        button_text_ar VARCHAR(120),
        link VARCHAR(255),
        sort_order INT DEFAULT 0,
        active TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // Columns added after a database may already have been created. CREATE
    // TABLE IF NOT EXISTS does nothing for an existing table, so each new
    // column needs its own ALTER; a duplicate-column error just means an
    // up-to-date database.
    foreach ([
        'banners'  => ['button_text_en VARCHAR(120)', 'button_text_ar VARCHAR(120)'],
        'brands'   => ['logo_url TEXT'],
        'products' => ['flavors JSON NULL'],
    ] as $table => $columns) {
        foreach ($columns as $column) {
            try {
                $pdo->exec("ALTER TABLE {$table} ADD COLUMN {$column}");
            } catch (PDOException $e) {
                // Column already exists — nothing to do.
            }
        }
    }

    // There used to be a separate fulfilment `status` (pending/confirmed/
    // preparing/shipped/delivered/cancelled) alongside payment_status. Nobody
    // drove it from the dashboard any more — Orders dropped that workflow on
    // purpose — so every order sat at its creation value forever while other
    // pages kept reading it as if it were live. Dropped below for existing
    // databases; payment_status (unpaid/paid, set by the admin from Orders)
    // is the one order state this shop actually tracks.
    $pdo->exec("CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_number VARCHAR(40) NOT NULL,
        customer_name VARCHAR(190) NOT NULL,
        phone VARCHAR(40) NOT NULL,
        email VARCHAR(190),
        address TEXT,
        city VARCHAR(120),
        notes TEXT,
        items JSON NOT NULL,
        subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
        shipping_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
        total DECIMAL(10,2) NOT NULL DEFAULT 0,
        payment_method VARCHAR(30) NOT NULL DEFAULT 'cod',
        payment_status VARCHAR(30) NOT NULL DEFAULT 'unpaid',
        payment_reference VARCHAR(190),
        business_date DATE NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_business_date (business_date),
        INDEX idx_order_number (order_number),
        INDEX idx_reference (payment_reference)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // The dropped fulfilment-status column, for a database created before
    // SCHEMA_VERSION 6. CREATE TABLE IF NOT EXISTS above did nothing on such
    // a database, so it still has `status` and its index; both statements
    // are no-ops (caught and ignored) on a fresh install, which never had
    // them to begin with.
    try {
        $pdo->exec('ALTER TABLE orders DROP INDEX idx_status');
    } catch (PDOException $e) {
        // Index already gone, or never existed.
    }
    try {
        $pdo->exec('ALTER TABLE orders DROP COLUMN status');
    } catch (PDOException $e) {
        // Column already gone, or never existed.
    }

    $pdo->exec("CREATE TABLE IF NOT EXISTS settings (
        `key` VARCHAR(100) PRIMARY KEY,
        `value` TEXT NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS admin_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(64) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS stock_notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        contact VARCHAR(190) NOT NULL,
        notified TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_product (product_id, notified)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    db_seed_settings();

    /*
     * Repair products orphaned by the old product form, which submitted an
     * empty category as "" and stored it as 0. Zero matches no category row, so
     * those products were invisible on every category page. NULL is the honest
     * value — the admin still has to pick a category, but now the dashboard
     * shows the field as empty instead of pointing at a category that isn't
     * there.
     */
    $pdo->exec('UPDATE products SET category_id = NULL WHERE category_id = 0');
    $pdo->exec('UPDATE products SET brand_id = NULL WHERE brand_id = 0');

    // Written last: if anything above threw, the marker stays stale and the
    // next request retries the whole build rather than skipping it.
    settings_put(['schema_version' => SCHEMA_VERSION]);
}

/**
 * Every key the frontend reads, with its starting value. INSERT IGNORE so a
 * value already edited in the dashboard is never overwritten.
 */
function db_default_settings()
{
    return [
        'store_name_en'     => 'Nomany Store',
        'store_name_ar'     => 'النعماني ستور',
        // Per-area delivery, the same idea as the reference café project: a
        // short list of {nameAr, nameEn, fee} the admin edits from Settings.
        // Checkout will not accept an order whose city is not on this list, and
        // the fee always comes from here — never from anything the browser
        // sends. Seeded with the store's own city so a fresh shop can already
        // take an order before the admin configures anything.
        'delivery_cities'   => json_encode([
            ['nameAr' => 'المنزلة', 'nameEn' => 'Manzala', 'fee' => 80],
        ], JSON_UNESCAPED_UNICODE),
        'phone'             => '+20 10 1234 5678',
        'whatsapp'          => '+20 10 1234 5678',
        // Manual transfer details shown at checkout for the instapay/
        // vodafone_cash payment methods (see api/lib/payments.php). Blank
        // until the admin fills them in from Dashboard -> Settings -> Payment.
        'instapay_number'      => '',
        'vodafone_cash_number' => '',
        'email'             => 'info@nomanystore.com',
        'address_en'        => 'Manzala, Dakahlia, Egypt',
        'address_ar'        => 'المنزلة، الدقهلية, مصر',
        'business_hours_en' => 'Sat - Thu: 12 AM - 12 PM',
        'business_hours_ar' => 'السبت - الخميس: 12 ص - 12 م',
        'facebook'          => '',
        'instagram'         => '',
        'tiktok'            => '',
        'hashtag_en'        => '#Nomany_Bta3_Elvape',
        'hashtag_ar'        => '#النعماني_بتاع_الفيب',
        'footer_text_en'    => 'Nomany Store - your first destination for vape devices and liquids',
        'footer_text_ar'    => 'النعماني ستور - وجهتك الأولى لأجهزة الفيب والليكويد',
        'return_policy_en'  => '',
        'return_policy_ar'  => '',
        'ordering_enabled'  => 'true',
    ];
}

function db_seed_settings()
{
    $stmt = db()->prepare('INSERT IGNORE INTO settings (`key`, `value`) VALUES (?, ?)');
    foreach (db_default_settings() as $key => $value) {
        $stmt->execute([$key, $value]);
    }
}

/** All settings as a plain key => value map. */
function settings_all()
{
    $out = [];
    foreach (db_all('SELECT `key`, `value` FROM settings') as $row) {
        $out[$row['key']] = $row['value'];
    }
    return $out;
}

function settings_get($key, $fallback = null)
{
    $row = db_one('SELECT `value` FROM settings WHERE `key` = ?', [$key]);
    return $row ? $row['value'] : $fallback;
}

function settings_put(array $pairs)
{
    $stmt = db()->prepare(
        'INSERT INTO settings (`key`, `value`) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)'
    );
    foreach ($pairs as $key => $value) {
        $stmt->execute([$key, is_scalar($value) ? (string) $value : json_encode($value)]);
    }
}

/**
 * The delivery areas and their fees, validated and ready to use.
 *
 * Stored as one JSON setting rather than its own table — it is a short list
 * the admin edits by hand, and checkout needs the whole thing at once anyway.
 * Malformed or partial rows are dropped rather than surfaced, so one bad edit
 * in the settings JSON cannot break every other area's delivery.
 */
function delivery_cities()
{
    $raw = settings_get('delivery_cities', '[]');
    $list = json_decode($raw, true);
    if (!is_array($list)) {
        return [];
    }

    $out = [];
    foreach ($list as $row) {
        $nameAr = trim((string) ($row['nameAr'] ?? ''));
        $nameEn = trim((string) ($row['nameEn'] ?? ''));
        $fee = isset($row['fee']) ? (float) $row['fee'] : null;

        if (($nameAr === '' && $nameEn === '') || $fee === null || $fee < 0) {
            continue;
        }
        $out[] = ['nameAr' => $nameAr, 'nameEn' => $nameEn, 'fee' => $fee];
    }
    return $out;
}

/**
 * Match a customer-typed city against the delivery list, by either language.
 *
 * The storefront may be in Arabic or English, so the value submitted could be
 * either name — matching both, case-insensitively, is what lets the same
 * dropdown work regardless of which language the visitor is browsing in.
 */
function match_delivery_city($typed)
{
    $needle = mb_strtolower(trim((string) $typed));
    if ($needle === '') {
        return null;
    }
    foreach (delivery_cities() as $city) {
        if (mb_strtolower($city['nameAr']) === $needle || mb_strtolower($city['nameEn']) === $needle) {
            return $city;
        }
    }
    return null;
}

/**
 * Today's date in the store's timezone.
 *
 * Not UTC: Egypt is UTC+2/+3, so a UTC date rolls over while the shop is still
 * taking orders and puts them on the wrong day.
 */
function business_date($timestamp = null)
{
    $tz = new DateTimeZone(api_env()['STORE_TIMEZONE'] ?? 'Africa/Cairo');
    $dt = new DateTime('@' . ($timestamp ?? time()));
    $dt->setTimezone($tz);
    return $dt->format('Y-m-d');
}

/** Sequential per-day order number, e.g. NOM-260731-004. */
function next_order_number()
{
    $date = business_date();
    $count = db_one('SELECT COUNT(*) AS c FROM orders WHERE business_date = ?', [$date]);
    $sequence = ((int) ($count['c'] ?? 0)) + 1;
    return 'NOM-' . date('ymd', strtotime($date)) . '-' . str_pad($sequence, 3, '0', STR_PAD_LEFT);
}
