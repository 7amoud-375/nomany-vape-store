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
 * Create every table if missing. Safe to call on each request — MySQL parses
 * these quickly and it means a fresh deploy needs no manual SQL step.
 */
function db_init()
{
    $pdo = db();

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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // `images` is a JSON array of URLs. Storing the paths rather than the bytes
    // is the whole point of moving off the old base64-into-the-document setup.
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

    // Older databases predate the button columns.
    foreach (['button_text_en VARCHAR(120)', 'button_text_ar VARCHAR(120)'] as $column) {
        try {
            $pdo->exec("ALTER TABLE banners ADD COLUMN {$column}");
        } catch (PDOException $e) {
            // Column already exists — nothing to do.
        }
    }

    // payment_status is separate from status on purpose: an order can be
    // confirmed and unpaid (cash on delivery) or paid and still preparing.
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
        status VARCHAR(30) NOT NULL DEFAULT 'pending',
        payment_method VARCHAR(30) NOT NULL DEFAULT 'cod',
        payment_status VARCHAR(30) NOT NULL DEFAULT 'unpaid',
        payment_reference VARCHAR(190),
        business_date DATE NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_business_date (business_date),
        INDEX idx_status (status),
        INDEX idx_order_number (order_number),
        INDEX idx_reference (payment_reference)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

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
        'shipping_cost'     => '80',
        'phone'             => '+20 10 1234 5678',
        'whatsapp'          => '+20 10 1234 5678',
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
