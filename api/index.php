<?php
/**
 * Nomany Store API — single front controller.
 *
 * Mirrors the route shape of the reference project. Everything the storefront
 * and dashboard need lives here; there is no Firebase anywhere in the stack.
 *
 * Routing: api/.htaccess sends every unmatched path to this file.
 */

require_once __DIR__ . '/lib/bootstrap.php';
require_once __DIR__ . '/lib/db.php';
require_once __DIR__ . '/lib/auth.php';
require_once __DIR__ . '/lib/payments.php';

api_cors();

db_init();
ensure_first_admin();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// Strip the mount point and any query string, leaving e.g. "products/12".
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$path = preg_replace('#^.*/api/?#', '', $path);
$path = trim($path, '/');
$segments = $path === '' ? [] : explode('/', $path);

$resource = $segments[0] ?? '';
$id       = $segments[1] ?? null;
$action   = $segments[2] ?? null;

$body = api_body();

// ---------------------------------------------------------------------------
// Shaping helpers — the database uses snake_case, the React app camelCase.
// ---------------------------------------------------------------------------

function shape_product($row)
{
    return [
        'id'            => (int) $row['id'],
        'nameEn'        => $row['name_en'],
        'nameAr'        => $row['name_ar'],
        'descriptionEn' => $row['description_en'],
        'descriptionAr' => $row['description_ar'],
        'category'      => $row['category_id'] === null ? null : (int) $row['category_id'],
        'brand'         => $row['brand_id'] === null ? null : (int) $row['brand_id'],
        'sku'           => $row['sku'],
        'price'         => (float) $row['price'],
        'discountPrice' => $row['discount_price'] === null ? null : (float) $row['discount_price'],
        'images'        => json_decode($row['images'] ?? '[]', true) ?: [],
        'availability'  => (bool) $row['is_available'],
        'featured'      => (bool) $row['featured'],
        'bestSeller'    => (bool) $row['best_seller'],
        'newArrival'    => (bool) $row['new_arrival'],
        'offer'         => (bool) $row['on_offer'],
        'createdAt'     => $row['created_at'],
    ];
}

function shape_category($row)
{
    return [
        'id'     => (int) $row['id'],
        'nameEn' => $row['name_en'],
        'nameAr' => $row['name_ar'],
        'image'  => $row['image_url'],
        'order'  => (int) $row['sort_order'],
    ];
}

function shape_brand($row)
{
    return ['id' => (int) $row['id'], 'name' => $row['name']];
}

function shape_offer($row)
{
    return [
        'id'                 => (int) $row['id'],
        'titleEn'            => $row['title_en'],
        'titleAr'            => $row['title_ar'],
        'descriptionEn'      => $row['description_en'],
        'descriptionAr'      => $row['description_ar'],
        'discountPercentage' => (float) $row['discount_percentage'],
        'startDate'          => $row['start_date'],
        'endDate'            => $row['end_date'],
        'active'             => (bool) $row['active'],
        'products'           => json_decode($row['product_ids'] ?? '[]', true) ?: [],
    ];
}

function shape_banner($row)
{
    return [
        'id'            => (int) $row['id'],
        'titleEn'       => $row['title_en'],
        'titleAr'       => $row['title_ar'],
        'subtitleEn'    => $row['subtitle_en'],
        'subtitleAr'    => $row['subtitle_ar'],
        'image'         => $row['image_url'],
        // Field names match what HeroSlider reads.
        'buttonTextEn'  => $row['button_text_en'],
        'buttonTextAr'  => $row['button_text_ar'],
        'buttonLink'    => $row['link'],
        'order'         => (int) $row['sort_order'],
        'active'        => (bool) $row['active'],
    ];
}

function shape_order($row)
{
    return [
        'id'             => $row['order_number'],
        'dbId'           => (int) $row['id'],
        'customerName'   => $row['customer_name'],
        'phone'          => $row['phone'],
        'email'          => $row['email'],
        'address'        => $row['address'],
        'city'           => $row['city'],
        'notes'          => $row['notes'],
        'products'       => json_decode($row['items'] ?? '[]', true) ?: [],
        'subtotal'       => (float) $row['subtotal'],
        'shippingCost'   => (float) $row['shipping_fee'],
        'total'          => (float) $row['total'],
        'status'         => $row['status'],
        'paymentMethod'  => $row['payment_method'],
        'paymentStatus'  => $row['payment_status'],
        'date'           => $row['business_date'],
        'time'           => date('H:i:s', strtotime($row['created_at'])),
        'createdAt'      => $row['created_at'],
    ];
}

/** Settings come back camelCased so the React app can use them directly. */
function shape_settings($map)
{
    $out = [];
    foreach ($map as $key => $value) {
        $camel = lcfirst(str_replace(' ', '', ucwords(str_replace('_', ' ', $key))));
        $out[$camel] = $value;
    }
    $out['shippingCost'] = (float) ($map['shipping_cost'] ?? 0);
    return $out;
}

function bool_int($value)
{
    return !empty($value) && $value !== 'false' ? 1 : 0;
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

try {
    // -- Auth ---------------------------------------------------------------
    if ($resource === 'admin' && $id === 'login' && $method === 'POST') {
        api_rate_limit('login', 10, 300);

        $username = strtolower(trim($body['username'] ?? ''));
        $password = (string) ($body['password'] ?? '');

        $user = db_one('SELECT * FROM admin_users WHERE username = ?', [$username]);

        // Same message and roughly the same work either way, so the response
        // does not reveal whether the username exists.
        if (!$user || !check_password($password, $user['password_hash'])) {
            api_fail(401, 'Wrong username or password');
        }

        api_json([
            'success' => true,
            'token'   => jwt_issue(['sub' => (int) $user['id'], 'username' => $user['username']]),
            'user'    => ['id' => (int) $user['id'], 'username' => $user['username']],
        ]);
    }

    if ($resource === 'admin' && $id === 'me' && $method === 'GET') {
        $admin = require_admin();
        api_json(['success' => true, 'user' => $admin]);
    }

    if ($resource === 'admin' && $id === 'password' && $method === 'PUT') {
        $admin = require_admin();
        $current = (string) ($body['currentPassword'] ?? '');
        $next    = (string) ($body['newPassword'] ?? '');

        if (strlen($next) < 8) {
            api_fail(400, 'The new password must be at least 8 characters');
        }

        $row = db_one('SELECT password_hash FROM admin_users WHERE id = ?', [$admin['id']]);
        if (!check_password($current, $row['password_hash'])) {
            api_fail(403, 'Current password is incorrect');
        }

        db_run('UPDATE admin_users SET password_hash = ? WHERE id = ?', [hash_password($next), $admin['id']]);
        api_json(['success' => true]);
    }

    if ($resource === 'admin' && $id === 'username' && $method === 'PUT') {
        $admin = require_admin();
        $current  = (string) ($body['currentPassword'] ?? '');
        $username = strtolower(trim($body['username'] ?? ''));

        if (!preg_match('/^[a-z0-9._-]{3,32}$/', $username)) {
            api_fail(400, 'Username must be 3-32 characters: letters, numbers, dot, dash or underscore');
        }

        $row = db_one('SELECT password_hash FROM admin_users WHERE id = ?', [$admin['id']]);
        if (!check_password($current, $row['password_hash'])) {
            api_fail(403, 'Current password is incorrect');
        }

        $taken = db_one('SELECT id FROM admin_users WHERE username = ? AND id <> ?', [$username, $admin['id']]);
        if ($taken) {
            api_fail(409, 'That username is taken');
        }

        db_run('UPDATE admin_users SET username = ? WHERE id = ?', [$username, $admin['id']]);
        api_json(['success' => true, 'username' => $username]);
    }

    // -- Catalogue (public read, admin write) --------------------------------
    if ($resource === 'products') {
        if ($method === 'GET' && $id === null) {
            api_json(array_map('shape_product', db_all('SELECT * FROM products ORDER BY created_at DESC, id DESC')));
        }
        if ($method === 'GET') {
            $row = db_one('SELECT * FROM products WHERE id = ?', [(int) $id]);
            if (!$row) api_fail(404, 'Product not found');
            api_json(shape_product($row));
        }

        require_admin();

        $fields = [
            $body['nameEn'] ?? '', $body['nameAr'] ?? '',
            $body['descriptionEn'] ?? null, $body['descriptionAr'] ?? null,
            isset($body['category']) ? (int) $body['category'] : null,
            isset($body['brand']) ? (int) $body['brand'] : null,
            $body['sku'] ?? null,
            (float) ($body['price'] ?? 0),
            isset($body['discountPrice']) && $body['discountPrice'] !== '' ? (float) $body['discountPrice'] : null,
            json_encode(array_values(array_filter((array) ($body['images'] ?? []))), JSON_UNESCAPED_SLASHES),
            bool_int($body['availability'] ?? true),
            bool_int($body['featured'] ?? false),
            bool_int($body['bestSeller'] ?? false),
            bool_int($body['newArrival'] ?? false),
            bool_int($body['offer'] ?? false),
        ];

        if ($method === 'POST') {
            db_run('INSERT INTO products
                (name_en, name_ar, description_en, description_ar, category_id, brand_id, sku,
                 price, discount_price, images, is_available, featured, best_seller, new_arrival, on_offer)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', $fields);
            api_json(shape_product(db_one('SELECT * FROM products WHERE id = ?', [db_insert_id()])), 201);
        }
        if ($method === 'PUT') {
            $fields[] = (int) $id;
            db_run('UPDATE products SET
                name_en=?, name_ar=?, description_en=?, description_ar=?, category_id=?, brand_id=?, sku=?,
                price=?, discount_price=?, images=?, is_available=?, featured=?, best_seller=?, new_arrival=?, on_offer=?
                WHERE id=?', $fields);
            api_json(shape_product(db_one('SELECT * FROM products WHERE id = ?', [(int) $id])));
        }
        if ($method === 'DELETE') {
            db_run('DELETE FROM products WHERE id = ?', [(int) $id]);
            api_json(['success' => true]);
        }
    }

    if ($resource === 'categories') {
        if ($method === 'GET') {
            api_json(array_map('shape_category', db_all('SELECT * FROM categories ORDER BY sort_order, id')));
        }
        require_admin();

        $fields = [
            $body['nameEn'] ?? '', $body['nameAr'] ?? '',
            $body['image'] ?? null, (int) ($body['order'] ?? 0),
        ];

        if ($method === 'POST') {
            db_run('INSERT INTO categories (name_en, name_ar, image_url, sort_order) VALUES (?,?,?,?)', $fields);
            api_json(shape_category(db_one('SELECT * FROM categories WHERE id = ?', [db_insert_id()])), 201);
        }
        if ($method === 'PUT') {
            $fields[] = (int) $id;
            db_run('UPDATE categories SET name_en=?, name_ar=?, image_url=?, sort_order=? WHERE id=?', $fields);
            api_json(shape_category(db_one('SELECT * FROM categories WHERE id = ?', [(int) $id])));
        }
        if ($method === 'DELETE') {
            // Refuse rather than silently orphaning products into a category
            // that no longer exists.
            $inUse = db_one('SELECT COUNT(*) AS c FROM products WHERE category_id = ?', [(int) $id]);
            if ((int) $inUse['c'] > 0) {
                api_fail(409, 'Cannot delete: ' . $inUse['c'] . ' products use this category');
            }
            db_run('DELETE FROM categories WHERE id = ?', [(int) $id]);
            api_json(['success' => true]);
        }
    }

    if ($resource === 'brands') {
        if ($method === 'GET') {
            api_json(array_map('shape_brand', db_all('SELECT * FROM brands ORDER BY name')));
        }
        require_admin();

        if ($method === 'POST') {
            db_run('INSERT INTO brands (name) VALUES (?)', [$body['name'] ?? '']);
            api_json(shape_brand(db_one('SELECT * FROM brands WHERE id = ?', [db_insert_id()])), 201);
        }
        if ($method === 'PUT') {
            db_run('UPDATE brands SET name = ? WHERE id = ?', [$body['name'] ?? '', (int) $id]);
            api_json(shape_brand(db_one('SELECT * FROM brands WHERE id = ?', [(int) $id])));
        }
        if ($method === 'DELETE') {
            $inUse = db_one('SELECT COUNT(*) AS c FROM products WHERE brand_id = ?', [(int) $id]);
            if ((int) $inUse['c'] > 0) {
                api_fail(409, 'Cannot delete: ' . $inUse['c'] . ' products use this brand');
            }
            db_run('DELETE FROM brands WHERE id = ?', [(int) $id]);
            api_json(['success' => true]);
        }
    }

    if ($resource === 'offers') {
        if ($method === 'GET') {
            api_json(array_map('shape_offer', db_all('SELECT * FROM offers ORDER BY id DESC')));
        }
        require_admin();

        $fields = [
            $body['titleEn'] ?? '', $body['titleAr'] ?? '',
            $body['descriptionEn'] ?? null, $body['descriptionAr'] ?? null,
            (float) ($body['discountPercentage'] ?? 0),
            $body['startDate'] ?: null, $body['endDate'] ?: null,
            bool_int($body['active'] ?? true),
            json_encode(array_map('intval', (array) ($body['products'] ?? []))),
        ];

        if ($method === 'POST') {
            db_run('INSERT INTO offers
                (title_en, title_ar, description_en, description_ar, discount_percentage,
                 start_date, end_date, active, product_ids) VALUES (?,?,?,?,?,?,?,?,?)', $fields);
            api_json(shape_offer(db_one('SELECT * FROM offers WHERE id = ?', [db_insert_id()])), 201);
        }
        if ($method === 'PUT') {
            $fields[] = (int) $id;
            db_run('UPDATE offers SET title_en=?, title_ar=?, description_en=?, description_ar=?,
                discount_percentage=?, start_date=?, end_date=?, active=?, product_ids=? WHERE id=?', $fields);
            api_json(shape_offer(db_one('SELECT * FROM offers WHERE id = ?', [(int) $id])));
        }
        if ($method === 'DELETE') {
            db_run('DELETE FROM offers WHERE id = ?', [(int) $id]);
            api_json(['success' => true]);
        }
    }

    if ($resource === 'banners') {
        if ($method === 'GET') {
            api_json(array_map('shape_banner', db_all('SELECT * FROM banners ORDER BY sort_order, id')));
        }
        require_admin();

        $fields = [
            $body['titleEn'] ?? null, $body['titleAr'] ?? null,
            $body['subtitleEn'] ?? null, $body['subtitleAr'] ?? null,
            $body['image'] ?? null,
            $body['buttonTextEn'] ?? null, $body['buttonTextAr'] ?? null,
            $body['buttonLink'] ?? null,
            (int) ($body['order'] ?? 0), bool_int($body['active'] ?? true),
        ];

        if ($method === 'POST') {
            db_run('INSERT INTO banners (title_en, title_ar, subtitle_en, subtitle_ar, image_url,
                    button_text_en, button_text_ar, link, sort_order, active)
                    VALUES (?,?,?,?,?,?,?,?,?,?)', $fields);
            api_json(shape_banner(db_one('SELECT * FROM banners WHERE id = ?', [db_insert_id()])), 201);
        }
        if ($method === 'PUT') {
            $fields[] = (int) $id;
            db_run('UPDATE banners SET title_en=?, title_ar=?, subtitle_en=?, subtitle_ar=?, image_url=?,
                    button_text_en=?, button_text_ar=?, link=?, sort_order=?, active=? WHERE id=?', $fields);
            api_json(shape_banner(db_one('SELECT * FROM banners WHERE id = ?', [(int) $id])));
        }
        if ($method === 'DELETE') {
            db_run('DELETE FROM banners WHERE id = ?', [(int) $id]);
            api_json(['success' => true]);
        }
    }

    // -- Settings ------------------------------------------------------------
    if ($resource === 'settings') {
        if ($method === 'GET') {
            api_json(shape_settings(settings_all()));
        }
        require_admin();

        if ($method === 'PUT') {
            $map = [];
            foreach ($body as $key => $value) {
                // camelCase back to snake_case for storage.
                $snake = strtolower(preg_replace('/([a-z0-9])([A-Z])/', '$1_$2', $key));
                $map[$snake] = $value;
            }
            settings_put($map);
            api_json(shape_settings(settings_all()));
        }
    }

    // -- Payment methods the storefront may show -----------------------------
    if ($resource === 'payment-methods' && $method === 'GET') {
        api_json([
            'provider' => payment_provider_name(),
            'methods'  => payment_supported_methods(),
        ]);
    }

    // -- Orders --------------------------------------------------------------
    if ($resource === 'orders') {
        if ($method === 'POST') {
            api_rate_limit('order', 20, 600);

            $items = $body['items'] ?? [];
            if (!is_array($items) || count($items) === 0) {
                api_fail(400, 'Your cart is empty');
            }

            $name  = trim((string) ($body['customerName'] ?? ''));
            $phone = trim((string) ($body['phone'] ?? ''));
            if ($name === '' || !preg_match('/^01[0125][0-9]{8}$/', preg_replace('/\s/', '', $phone))) {
                api_fail(400, 'Name and a valid Egyptian mobile number are required');
            }

            // Price from the database, never from the request. This is the
            // whole reason ordering goes through the server at all.
            $subtotal = 0.0;
            $lines = [];

            foreach ($items as $line) {
                $productId = (int) ($line['productId'] ?? 0);
                $qty = max(1, min(99, (int) ($line['quantity'] ?? 1)));

                $product = db_one('SELECT * FROM products WHERE id = ?', [$productId]);
                if (!$product) {
                    api_fail(409, 'A product in your cart is no longer available');
                }
                if (!$product['is_available']) {
                    api_fail(409, 'A product in your cart is out of stock');
                }

                $price = (float) $product['price'];
                $discount = $product['discount_price'] === null ? 0.0 : (float) $product['discount_price'];
                $unit = ($discount > 0 && $discount < $price) ? $discount : $price;

                $subtotal += $unit * $qty;
                $lines[] = [
                    'productId' => $productId,
                    'nameEn'    => $product['name_en'],
                    'nameAr'    => $product['name_ar'],
                    'price'     => $unit,
                    'quantity'  => $qty,
                    'image'     => (json_decode($product['images'] ?? '[]', true) ?: [null])[0] ?? null,
                ];
            }

            $shipping = (float) settings_get('shipping_cost', 0);
            $total = $subtotal + $shipping;

            $paymentMethod = in_array($body['paymentMethod'] ?? 'cod', payment_supported_methods(), true)
                ? $body['paymentMethod'] : 'cod';

            $orderNumber = next_order_number();

            db_run('INSERT INTO orders
                (order_number, customer_name, phone, email, address, city, notes, items,
                 subtotal, shipping_fee, total, status, payment_method, payment_status, business_date)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [
                $orderNumber, $name, $phone,
                $body['email'] ?? null, $body['address'] ?? null, $body['city'] ?? null, $body['notes'] ?? null,
                json_encode($lines, JSON_UNESCAPED_UNICODE),
                $subtotal, $shipping, $total,
                $paymentMethod === 'cod' ? 'pending' : 'awaiting_payment',
                $paymentMethod, 'unpaid', business_date(),
            ]);

            $order = db_one('SELECT * FROM orders WHERE id = ?', [db_insert_id()]);
            $payment = payment_create($order, $paymentMethod, ['phone' => $phone]);

            if (($payment['status'] ?? '') === 'failed') {
                api_fail(503, $payment['error'] ?? 'Payment could not be started');
            }

            db_run('UPDATE orders SET payment_reference = ? WHERE id = ?', [$payment['reference'] ?? null, $order['id']]);

            api_json([
                'success'     => true,
                'order'       => shape_order(db_one('SELECT * FROM orders WHERE id = ?', [$order['id']])),
                'payment'     => $payment,
            ], 201);
        }

        require_admin();

        if ($method === 'GET' && $id === null) {
            $date = $_GET['date'] ?? null;
            if ($date === 'all') {
                $rows = db_all('SELECT * FROM orders ORDER BY created_at DESC LIMIT 500');
            } else {
                $rows = db_all(
                    'SELECT * FROM orders WHERE business_date = ? ORDER BY created_at DESC',
                    [$date ?: business_date()]
                );
            }
            api_json(array_map('shape_order', $rows));
        }

        if ($method === 'PUT' && $action === 'status') {
            db_run('UPDATE orders SET status = ? WHERE id = ?', [$body['status'] ?? 'pending', (int) $id]);
            api_json(['success' => true]);
        }

        if ($method === 'DELETE') {
            db_run('DELETE FROM orders WHERE id = ?', [(int) $id]);
            api_json(['success' => true]);
        }
    }

    // -- Payment webhook -----------------------------------------------------
    if ($resource === 'payments' && $id === 'webhook' && $method === 'POST') {
        $headers = function_exists('getallheaders') ? getallheaders() : [];
        $result = payment_verify_webhook($body, $headers);

        if (!$result['valid']) {
            api_fail(401, 'Invalid signature', 'Webhook signature mismatch');
        }

        if ($result['paid'] && $result['reference']) {
            db_run(
                "UPDATE orders SET payment_status = 'paid', status = 'paid' WHERE payment_reference = ?",
                [$result['reference']]
            );
        }

        api_json(['success' => true]);
    }

    // -- "Notify me when back in stock" --------------------------------------
    if ($resource === 'stock-notifications') {
        if ($method === 'POST') {
            api_rate_limit('notify', 10, 600);
            db_run(
                'INSERT INTO stock_notifications (product_id, contact) VALUES (?, ?)',
                [(int) ($body['productId'] ?? 0), trim((string) ($body['contact'] ?? ''))]
            );
            api_json(['success' => true], 201);
        }

        require_admin();

        if ($method === 'GET') {
            $productId = $_GET['productId'] ?? null;
            $rows = $productId
                ? db_all('SELECT * FROM stock_notifications WHERE product_id = ? AND notified = 0', [(int) $productId])
                : db_all('SELECT * FROM stock_notifications WHERE notified = 0 ORDER BY created_at DESC');
            api_json($rows);
        }
        if ($method === 'PUT') {
            db_run('UPDATE stock_notifications SET notified = 1 WHERE id = ?', [(int) $id]);
            api_json(['success' => true]);
        }
    }

    // -- Analytics -----------------------------------------------------------
    if ($resource === 'analytics' && $method === 'GET') {
        require_admin();

        $today = business_date();
        $monthStart = date('Y-m-01', strtotime($today));

        $counted = "status <> 'cancelled'";

        api_json([
            'today' => [
                'orders'  => (int) db_one("SELECT COUNT(*) c FROM orders WHERE business_date = ?", [$today])['c'],
                'revenue' => (float) (db_one("SELECT COALESCE(SUM(total),0) s FROM orders WHERE business_date = ? AND {$counted}", [$today])['s']),
            ],
            'month' => [
                'orders'  => (int) db_one("SELECT COUNT(*) c FROM orders WHERE business_date >= ?", [$monthStart])['c'],
                'revenue' => (float) (db_one("SELECT COALESCE(SUM(total),0) s FROM orders WHERE business_date >= ? AND {$counted}", [$monthStart])['s']),
            ],
            'totals' => [
                'orders'     => (int) db_one('SELECT COUNT(*) c FROM orders')['c'],
                'products'   => (int) db_one('SELECT COUNT(*) c FROM products')['c'],
                'outOfStock' => (int) db_one('SELECT COUNT(*) c FROM products WHERE is_available = 0')['c'],
                'categories' => (int) db_one('SELECT COUNT(*) c FROM categories')['c'],
                'brands'     => (int) db_one('SELECT COUNT(*) c FROM brands')['c'],
            ],
            'dailyRevenue' => db_all(
                "SELECT business_date AS date, COUNT(*) AS orders, COALESCE(SUM(total),0) AS revenue
                 FROM orders WHERE {$counted} AND business_date >= DATE_SUB(?, INTERVAL 29 DAY)
                 GROUP BY business_date ORDER BY business_date",
                [$today]
            ),
            'statusBreakdown' => db_all('SELECT status, COUNT(*) AS count FROM orders GROUP BY status'),
            'topProducts' => db_all(
                'SELECT p.id, p.name_en AS nameEn, p.name_ar AS nameAr, COUNT(*) AS timesOrdered
                 FROM orders o
                 JOIN JSON_TABLE(o.items, \'$[*]\' COLUMNS (pid INT PATH \'$.productId\')) j
                 JOIN products p ON p.id = j.pid
                 GROUP BY p.id ORDER BY timesOrdered DESC LIMIT 5'
            ),
        ]);
    }

    api_fail(404, 'Unknown endpoint: ' . ($path ?: '/'));

} catch (PDOException $e) {
    api_fail(500, 'Database error', $e->getMessage());
} catch (Throwable $e) {
    api_fail(500, 'Something went wrong', $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
}
