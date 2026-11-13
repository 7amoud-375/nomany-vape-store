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

/**
 * Normalise a stored image URL to a root-relative path.
 *
 * Uploads used to be saved with an absolute URL built from UPLOAD_PUBLIC_URL,
 * which broke the moment the site was viewed on any other host — localhost,
 * www vs non-www, or http before the certificate was issued. Anything pointing
 * at our own /uploads is collapsed to a path so it resolves against whatever
 * origin is actually serving the page. External URLs are left untouched.
 */
function normalise_image_url($url)
{
    if (!is_string($url) || $url === '') {
        return $url;
    }
    if (preg_match('#^https?://[^/]+(/uploads/.+)$#i', $url, $m)) {
        return $m[1];
    }
    return $url;
}

/**
 * Normalise one stored flavour entry to {nameAr, nameEn}.
 *
 * An entry could still be a plain string, from before flavours carried two
 * names. Folded into Arabic here — the site's default language — rather than
 * dropped, so nothing typed by the admin is silently lost on the next save.
 */
function normalise_flavor($flavor)
{
    if (is_string($flavor)) {
        return ['nameAr' => $flavor, 'nameEn' => ''];
    }
    if (is_array($flavor)) {
        return [
            'nameAr' => (string) ($flavor['nameAr'] ?? ''),
            'nameEn' => (string) ($flavor['nameEn'] ?? ''),
        ];
    }
    return ['nameAr' => '', 'nameEn' => ''];
}

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
        'images'        => array_values(array_map(
            'normalise_image_url',
            json_decode($row['images'] ?? '[]', true) ?: []
        )),
        // Optional flavour names, each {nameAr, nameEn} — [] when the admin
        // never set any, same as an empty images array. Never null, so the
        // client can always .map() it.
        'flavors'       => array_values(array_map(
            'normalise_flavor',
            json_decode($row['flavors'] ?? '[]', true) ?: []
        )),
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
        'image'  => normalise_image_url($row['image_url']),
        'order'  => (int) $row['sort_order'],
        // Counted in SQL. The storefront renders `category.productCount` on the
        // categories grid and in the featured strip; nothing ever produced the
        // field, so every category read "0 products" no matter how many were
        // assigned to it.
        'productCount' => isset($row['product_count']) ? (int) $row['product_count'] : 0,
    ];
}

function shape_brand($row)
{
    return [
        'id'   => (int) $row['id'],
        'name' => $row['name'],
        // The dashboard has always had a logo picker for brands; there was no
        // column behind it, so every upload was accepted and thrown away.
        'logo' => normalise_image_url($row['logo_url'] ?? null),
    ];
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
        'image'         => normalise_image_url($row['image_url']),
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
        'paymentMethod'  => $row['payment_method'],
        'paymentStatus'  => $row['payment_status'],
        'date'           => $row['business_date'],
        'time'           => date('H:i:s', strtotime($row['created_at'])),
        'createdAt'      => $row['created_at'],
    ];
}

/**
 * A back-in-stock request, joined to the product it is waiting on.
 *
 * `available` tells the dashboard which requests are actually actionable now:
 * the product has come back and these people are still waiting to hear.
 */
function shape_stock_notification($row)
{
    return [
        'id'           => (int) $row['id'],
        'productId'    => (int) $row['product_id'],
        'phone'        => $row['contact'],
        'notified'     => (bool) $row['notified'],
        'createdAt'    => $row['created_at'],
        'productNameEn' => $row['name_en'] ?? null,
        'productNameAr' => $row['name_ar'] ?? null,
        'productImage' => isset($row['images'])
            ? normalise_image_url((json_decode($row['images'] ?? '[]', true) ?: [null])[0] ?? null)
            : null,
        'available'    => isset($row['is_available']) ? (bool) $row['is_available'] : null,
    ];
}

/** Settings come back camelCased so the React app can use them directly. */
function shape_settings($map)
{
    // Bookkeeping for db_init(), not a store setting. Leaving it in would put
    // it on the settings form and let a save write it back.
    unset($map['schema_version']);

    $out = [];
    foreach ($map as $key => $value) {
        $camel = lcfirst(str_replace(' ', '', ucwords(str_replace('_', ' ', $key))));
        $out[$camel] = $value;
    }
    // Decoded to an array, like every other JSON-in-a-column field the API
    // returns (images, offer product ids) — the client never has to know this
    // one happens to live in the settings table instead of its own column.
    $out['deliveryCities'] = delivery_cities();
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

        /*
         * A foreign key of 0 is not "no category", it is a category that cannot
         * exist — and it is what `(int) ""` produces. The product form used to
         * submit an empty string whenever the admin never opened the dropdown,
         * so those products matched no category and the category page showed
         * "No products found" while the catalogue was full. Normalise to NULL.
         */
        $foreignKey = function ($value) {
            if ($value === null || $value === '' || $value === false) return null;
            $id = (int) $value;
            return $id > 0 ? $id : null;
        };

        /*
         * Flavours are entirely optional — a bilingual pair of names, such as
         * "مانجو آيس" / "Mango Ice", for an e-liquid or disposable that comes
         * in more than one. Kept as long as at least one language is filled
         * in, so a name typed in only Arabic (or only English) is not thrown
         * away. Capped the same way images are: a form field, not a feed.
         */
        $flavors = array_map(
            function ($flavor) {
                return [
                    'nameAr' => trim((string) (is_array($flavor) ? ($flavor['nameAr'] ?? '') : $flavor)),
                    'nameEn' => trim((string) (is_array($flavor) ? ($flavor['nameEn'] ?? '') : '')),
                ];
            },
            (array) ($body['flavors'] ?? [])
        );
        $flavors = array_values(array_filter(
            $flavors,
            function ($flavor) {
                return $flavor['nameAr'] !== '' || $flavor['nameEn'] !== '';
            }
        ));
        $flavors = array_slice($flavors, 0, 30);

        $fields = [
            $body['nameEn'] ?? '', $body['nameAr'] ?? '',
            $body['descriptionEn'] ?? null, $body['descriptionAr'] ?? null,
            $foreignKey($body['category'] ?? null),
            $foreignKey($body['brand'] ?? null),
            $body['sku'] ?? null,
            (float) ($body['price'] ?? 0),
            isset($body['discountPrice']) && $body['discountPrice'] !== '' ? (float) $body['discountPrice'] : null,
            json_encode(array_values(array_filter((array) ($body['images'] ?? []))), JSON_UNESCAPED_SLASHES),
            json_encode($flavors, JSON_UNESCAPED_UNICODE),
            bool_int($body['availability'] ?? true),
            bool_int($body['featured'] ?? false),
            bool_int($body['bestSeller'] ?? false),
            bool_int($body['newArrival'] ?? false),
            bool_int($body['offer'] ?? false),
        ];

        if ($method === 'POST') {
            db_run('INSERT INTO products
                (name_en, name_ar, description_en, description_ar, category_id, brand_id, sku,
                 price, discount_price, images, flavors, is_available, featured, best_seller, new_arrival, on_offer)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', $fields);
            api_json(shape_product(db_one('SELECT * FROM products WHERE id = ?', [db_insert_id()])), 201);
        }
        if ($method === 'PUT') {
            $fields[] = (int) $id;
            db_run('UPDATE products SET
                name_en=?, name_ar=?, description_en=?, description_ar=?, category_id=?, brand_id=?, sku=?,
                price=?, discount_price=?, images=?, flavors=?, is_available=?, featured=?, best_seller=?, new_arrival=?, on_offer=?
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
            api_json(array_map('shape_category', db_all(
                'SELECT c.*, COUNT(p.id) AS product_count
                 FROM categories c
                 LEFT JOIN products p ON p.category_id = c.id
                 GROUP BY c.id
                 ORDER BY c.sort_order, c.id'
            )));
        }
        require_admin();

        $fields = [
            $body['nameEn'] ?? '', $body['nameAr'] ?? '',
            $body['image'] ?? null, (int) ($body['order'] ?? 0),
        ];

        // Re-read with the same count the list query produces, so an edited
        // category does not come back reporting zero products.
        $readCategory = function ($categoryId) {
            return db_one(
                'SELECT c.*, COUNT(p.id) AS product_count
                 FROM categories c
                 LEFT JOIN products p ON p.category_id = c.id
                 WHERE c.id = ? GROUP BY c.id',
                [$categoryId]
            );
        };

        if ($method === 'POST') {
            db_run('INSERT INTO categories (name_en, name_ar, image_url, sort_order) VALUES (?,?,?,?)', $fields);
            api_json(shape_category($readCategory(db_insert_id())), 201);
        }
        if ($method === 'PUT') {
            $fields[] = (int) $id;
            db_run('UPDATE categories SET name_en=?, name_ar=?, image_url=?, sort_order=? WHERE id=?', $fields);
            api_json(shape_category($readCategory((int) $id)));
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
            db_run('INSERT INTO brands (name, logo_url) VALUES (?,?)', [$body['name'] ?? '', $body['logo'] ?? null]);
            api_json(shape_brand(db_one('SELECT * FROM brands WHERE id = ?', [db_insert_id()])), 201);
        }
        if ($method === 'PUT') {
            db_run(
                'UPDATE brands SET name = ?, logo_url = ? WHERE id = ?',
                [$body['name'] ?? '', $body['logo'] ?? null, (int) $id]
            );
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
        api_json(['methods' => payment_supported_methods()]);
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

            // The delivery area decides the fee, so it is resolved here from the
            // stored list rather than taken from the request. A browser that
            // sends its own fee, or a city that is not on the list, gets nothing
            // it asked for — matches either language, since the storefront can
            // be browsed in Arabic or English.
            $cityMatch = match_delivery_city($body['city'] ?? '');
            if (!$cityMatch) {
                $typed = trim((string) ($body['city'] ?? ''));
                api_fail(400, $typed === ''
                    ? 'Please choose your delivery area'
                    : "We do not deliver to \"{$typed}\" yet");
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

                // A product with flavours is sold one flavour per line, and the
                // flavour must be one the product actually lists — matched here
                // so a stale or edited cart cannot order something we don't stock.
                $offered = array_values(array_filter(
                    array_map('normalise_flavor', json_decode($product['flavors'] ?? '[]', true) ?: []),
                    function ($f) {
                        return $f['nameAr'] !== '' || $f['nameEn'] !== '';
                    }
                ));
                $flavor = null;
                if ($offered !== []) {
                    $wanted = normalise_flavor($line['flavor'] ?? null);
                    foreach ($offered as $candidate) {
                        if ($candidate['nameAr'] === $wanted['nameAr'] && $candidate['nameEn'] === $wanted['nameEn']) {
                            $flavor = $candidate;
                            break;
                        }
                    }
                    if ($flavor === null) {
                        api_fail(409, "Please choose an available flavour for \"{$product['name_en']}\"");
                    }
                }

                $price = (float) $product['price'];
                $discount = $product['discount_price'] === null ? 0.0 : (float) $product['discount_price'];
                $unit = ($discount > 0 && $discount < $price) ? $discount : $price;

                $subtotal += $unit * $qty;
                $lines[] = [
                    'productId' => $productId,
                    'nameEn'    => $product['name_en'],
                    'nameAr'    => $product['name_ar'],
                    'flavor'    => $flavor,
                    'price'     => $unit,
                    'quantity'  => $qty,
                    'image'     => (json_decode($product['images'] ?? '[]', true) ?: [null])[0] ?? null,
                ];
            }

            $shipping = $cityMatch['fee'];
            $total = $subtotal + $shipping;

            $paymentMethod = in_array($body['paymentMethod'] ?? 'cod', payment_supported_methods(), true)
                ? $body['paymentMethod'] : 'cod';

            $orderNumber = next_order_number();

            db_run('INSERT INTO orders
                (order_number, customer_name, phone, email, address, city, notes, items,
                 subtotal, shipping_fee, total, payment_method, payment_status, business_date)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [
                // Stored as the matched entry's Arabic name — the one canonical
                // identity for the area — regardless of which language the
                // customer's browser sent, so every order's city reads
                // consistently in the dashboard no matter how it was placed.
                $orderNumber, $name, $phone,
                $body['email'] ?? null, $body['address'] ?? null, $cityMatch['nameAr'] ?: $cityMatch['nameEn'], $body['notes'] ?? null,
                json_encode($lines, JSON_UNESCAPED_UNICODE),
                $subtotal, $shipping, $total,
                // Every order starts unpaid, cash or manual transfer alike — the
                // admin marks it paid from the dashboard once the money is
                // actually in hand (Orders -> Mark as paid).
                $paymentMethod, 'unpaid', business_date(),
            ]);

            $order = db_one('SELECT * FROM orders WHERE id = ?', [db_insert_id()]);
            $payment = payment_create($order, $paymentMethod);

            db_run('UPDATE orders SET payment_reference = ? WHERE id = ?', [$payment['reference'] ?? null, $order['id']]);

            api_json([
                'success'     => true,
                'order'       => shape_order(db_one('SELECT * FROM orders WHERE id = ?', [$order['id']])),
                'payment'     => $payment,
            ], 201);
        }

        require_admin();

        if ($method === 'GET' && $id === null) {
            // A `from`/`to` pair drives the day/week/month picker. `date` is kept
            // for anything still asking for a single business date.
            $from = $_GET['from'] ?? null;
            $to   = $_GET['to'] ?? null;
            $date = $_GET['date'] ?? null;

            $isDate = function ($value) {
                return is_string($value) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $value);
            };

            if ($isDate($from) && $isDate($to)) {
                $rows = db_all(
                    'SELECT * FROM orders WHERE business_date BETWEEN ? AND ? ORDER BY created_at DESC LIMIT 500',
                    [$from, $to]
                );
            } elseif ($date === 'all' || $from === 'all') {
                $rows = db_all('SELECT * FROM orders ORDER BY created_at DESC LIMIT 500');
            } else {
                $rows = db_all(
                    'SELECT * FROM orders WHERE business_date = ? ORDER BY created_at DESC',
                    [$isDate($date) ? $date : business_date()]
                );
            }
            api_json(array_map('shape_order', $rows));
        }

        // Whether the money has actually arrived — the one thing worth tracking
        // for a shop that fulfils by phone call rather than a shipping
        // workflow. Admin-set only: cash on delivery starts unpaid and is
        // marked paid once collected, instapay/vodafone_cash once the admin
        // sees the transfer land.
        if ($method === 'PUT' && $action === 'payment-status') {
            $paid = !empty($body['paid']);
            db_run('UPDATE orders SET payment_status = ? WHERE id = ?', [$paid ? 'paid' : 'unpaid', (int) $id]);
            api_json(['success' => true, 'paymentStatus' => $paid ? 'paid' : 'unpaid']);
        }

        // Correcting the delivery details after a phone call. Deliberately
        // limited to contact fields — items and totals are priced by the server
        // and must never become editable from the browser.
        if ($method === 'PUT' && $action === null) {
            $name  = trim((string) ($body['customerName'] ?? ''));
            $phone = preg_replace('/\s/', '', (string) ($body['phone'] ?? ''));

            if ($name === '' || !preg_match('/^01[0125][0-9]{8}$/', $phone)) {
                api_fail(400, 'A name and a valid Egyptian mobile number are required');
            }

            db_run(
                'UPDATE orders SET customer_name = ?, phone = ?, address = ?, city = ?, notes = ? WHERE id = ?',
                [
                    $name,
                    $phone,
                    $body['address'] ?? null,
                    $body['city'] ?? null,
                    $body['notes'] ?? null,
                    (int) $id,
                ]
            );

            $row = db_one('SELECT * FROM orders WHERE id = ?', [(int) $id]);
            if (!$row) api_fail(404, 'Order not found');
            api_json(shape_order($row));
        }

        if ($method === 'DELETE') {
            db_run('DELETE FROM orders WHERE id = ?', [(int) $id]);
            api_json(['success' => true]);
        }
    }

    // -- "Notify me when back in stock" --------------------------------------
    if ($resource === 'stock-notifications') {
        if ($method === 'POST') {
            api_rate_limit('notify', 10, 600);

            // Phone only — the alert goes out over WhatsApp, so anything that
            // is not a reachable Egyptian mobile is a row we can never action.
            $phone = preg_replace('/\D/', '', (string) ($body['contact'] ?? ''));
            if (!preg_match('/^01[0125][0-9]{8}$/', $phone)) {
                api_fail(400, 'A valid Egyptian mobile number is required');
            }

            $productId = (int) ($body['productId'] ?? 0);
            if (!db_one('SELECT id FROM products WHERE id = ?', [$productId])) {
                api_fail(404, 'Product not found');
            }

            // Asking twice for the same product should not queue two messages.
            $existing = db_one(
                'SELECT id FROM stock_notifications WHERE product_id = ? AND contact = ? AND notified = 0',
                [$productId, $phone]
            );
            if (!$existing) {
                db_run(
                    'INSERT INTO stock_notifications (product_id, contact) VALUES (?, ?)',
                    [$productId, $phone]
                );
            }

            api_json(['success' => true], 201);
        }

        require_admin();

        if ($method === 'GET') {
            $productId = $_GET['productId'] ?? null;
            $includeDone = ($_GET['include'] ?? '') === 'all';

            // Joined so the dashboard can show what each person is waiting for,
            // and whether it is back in stock, without a request per row.
            $sql = 'SELECT s.*, p.name_en, p.name_ar, p.images, p.is_available
                    FROM stock_notifications s
                    LEFT JOIN products p ON p.id = s.product_id';
            $where = [];
            $params = [];

            if ($productId !== null) {
                $where[] = 's.product_id = ?';
                $params[] = (int) $productId;
            }
            if (!$includeDone) {
                $where[] = 's.notified = 0';
            }
            if ($where) {
                $sql .= ' WHERE ' . implode(' AND ', $where);
            }
            $sql .= ' ORDER BY s.notified, s.created_at DESC LIMIT 500';

            api_json(array_map('shape_stock_notification', db_all($sql, $params)));
        }

        if ($method === 'PUT') {
            db_run('UPDATE stock_notifications SET notified = 1 WHERE id = ?', [(int) $id]);
            api_json(['success' => true]);
        }

        if ($method === 'DELETE') {
            db_run('DELETE FROM stock_notifications WHERE id = ?', [(int) $id]);
            api_json(['success' => true]);
        }
    }

    // -- Live updates --------------------------------------------------------
    //
    // The dashboard's push channel. Shared hosting cannot hold a Server-Sent
    // Events connection open — PHP's max_execution_time cuts it, and each held
    // connection occupies a worker until it does — so the console asks
    // "anything newer than id N?" on a short interval instead.
    //
    // Both queries are a primary-key range scan against an indexed column, so
    // an idle poll is about as cheap as a request gets.
    if ($resource === 'updates' && $method === 'GET') {
        require_admin();

        $sinceOrder        = max(0, (int) ($_GET['since_order'] ?? 0));
        $sinceNotification = max(0, (int) ($_GET['since_notification'] ?? 0));

        $orders = db_all(
            'SELECT * FROM orders WHERE id > ? ORDER BY id LIMIT 50',
            [$sinceOrder]
        );
        $notifications = db_all(
            'SELECT * FROM stock_notifications WHERE id > ? ORDER BY id LIMIT 50',
            [$sinceNotification]
        );

        // The high-water marks come from the table, not from the rows returned:
        // they advance even on an empty poll, which is what stops a row being
        // replayed forever if it ever gets filtered out.
        $maxOrder = db_one('SELECT COALESCE(MAX(id),0) AS m FROM orders')['m'];
        $maxNote  = db_one('SELECT COALESCE(MAX(id),0) AS m FROM stock_notifications')['m'];

        api_json([
            'cursor' => [
                'order'        => (int) $maxOrder,
                'notification' => (int) $maxNote,
            ],
            'orders'        => array_map('shape_order', $orders),
            'notifications' => array_map('shape_stock_notification', $notifications),
        ]);
    }

    // -- Analytics -----------------------------------------------------------
    //
    // Every figure is scoped to an explicit period and computed from real
    // orders. There is no fulfilment status to exclude by any more (see
    // shape_order()) — every order in the window counts.
    if ($resource === 'analytics' && $method === 'GET') {
        require_admin();

        $today = business_date();

        // Inclusive date range for the requested window. 'all' has no lower
        // bound; the epoch stands in so the same query serves every case.
        $periods = [
            'today' => 0,
            '7d'    => 6,
            '30d'   => 29,
            '90d'   => 89,
        ];
        $period = $_GET['period'] ?? '30d';
        if ($period !== 'all' && !isset($periods[$period])) {
            $period = '30d';
        }

        $start = $period === 'all'
            ? '1970-01-01'
            : date('Y-m-d', strtotime($today . ' -' . $periods[$period] . ' day'));

        $range = [$start, $today];
        $window = 'business_date BETWEEN ? AND ?';
        // $earning used to exclude cancelled orders; nothing sets that status
        // any more (see shape_order()), so it is just the window now. Kept as
        // its own name rather than replaced everywhere it's used below, so a
        // future "exclude these" rule has one place to land again.
        $earning = $window;

        $totals = db_one(
            "SELECT COUNT(*) AS orders, COALESCE(SUM(total),0) AS revenue,
                    COALESCE(SUM(subtotal),0) AS subtotal, COALESCE(SUM(shipping_fee),0) AS shipping
             FROM orders WHERE {$earning}",
            $range
        );
        $orderCount = (int) $totals['orders'];

        // Per-day series, gap-filled in PHP so a day with no orders still plots
        // as a zero instead of the chart silently closing the gap.
        $byDate = [];
        foreach (db_all(
            "SELECT business_date AS date, COUNT(*) AS orders, COALESCE(SUM(total),0) AS revenue
             FROM orders WHERE {$earning} GROUP BY business_date",
            $range
        ) as $row) {
            $byDate[$row['date']] = [
                'orders'  => (int) $row['orders'],
                'revenue' => (float) $row['revenue'],
            ];
        }

        $series = [];
        if ($period === 'all') {
            ksort($byDate);
            foreach ($byDate as $date => $point) {
                $series[] = ['date' => $date] + $point;
            }
        } else {
            for ($day = $periods[$period]; $day >= 0; $day--) {
                $date = date('Y-m-d', strtotime($today . ' -' . $day . ' day'));
                $series[] = ['date' => $date] + ($byDate[$date] ?? ['orders' => 0, 'revenue' => 0.0]);
            }
        }

        // Line items live in a JSON column. MySQL 8 could unroll them with
        // JSON_TABLE, but MariaDB — which is what shared hosting actually runs —
        // has no such function, so the rows are decoded in PHP instead. The
        // window is bounded by date, so this reads a working set, not the table.
        $productTally = [];
        foreach (db_all("SELECT items FROM orders WHERE {$earning}", $range) as $row) {
            foreach (json_decode($row['items'] ?? '[]', true) ?: [] as $line) {
                $pid = (int) ($line['productId'] ?? 0);
                if ($pid === 0) {
                    continue;
                }
                $quantity = max(0, (int) ($line['quantity'] ?? 0));
                if (!isset($productTally[$pid])) {
                    $productTally[$pid] = ['quantity' => 0, 'revenue' => 0.0];
                }
                $productTally[$pid]['quantity'] += $quantity;
                $productTally[$pid]['revenue']  += ((float) ($line['price'] ?? 0)) * $quantity;
            }
        }

        // Resolve names and categories in one pass rather than per product.
        $catalogue = [];
        if ($productTally !== []) {
            $ids = array_keys($productTally);
            $slots = implode(',', array_fill(0, count($ids), '?'));
            foreach (db_all(
                "SELECT p.id, p.name_en, p.name_ar, p.category_id, c.name_en AS cat_en, c.name_ar AS cat_ar
                 FROM products p LEFT JOIN categories c ON c.id = p.category_id
                 WHERE p.id IN ({$slots})",
                $ids
            ) as $row) {
                $catalogue[(int) $row['id']] = $row;
            }
        }

        $topProducts = [];
        $categoryTally = [];
        foreach ($productTally as $pid => $tally) {
            $row = $catalogue[$pid] ?? null;

            $topProducts[] = [
                'id'       => $pid,
                // A product sold and later deleted still belongs in the history.
                'nameEn'   => $row['name_en'] ?? 'Deleted product',
                'nameAr'   => $row['name_ar'] ?? 'منتج محذوف',
                'quantity' => $tally['quantity'],
                'revenue'  => round($tally['revenue'], 2),
            ];

            $key = $row && $row['category_id'] !== null ? (int) $row['category_id'] : 0;
            if (!isset($categoryTally[$key])) {
                $categoryTally[$key] = [
                    'id'       => $key ?: null,
                    'nameEn'   => $row['cat_en'] ?? 'Uncategorised',
                    'nameAr'   => $row['cat_ar'] ?? 'بدون قسم',
                    'quantity' => 0,
                    'revenue'  => 0.0,
                ];
            }
            $categoryTally[$key]['quantity'] += $tally['quantity'];
            $categoryTally[$key]['revenue']  += $tally['revenue'];
        }

        $bySales = function ($a, $b) {
            return $b['quantity'] <=> $a['quantity'];
        };
        usort($topProducts, $bySales);
        $topCategories = array_values($categoryTally);
        usort($topCategories, $bySales);
        foreach ($topCategories as &$category) {
            $category['revenue'] = round($category['revenue'], 2);
        }
        unset($category);

        api_json([
            'period' => [
                'id'        => $period,
                'startDate' => $period === 'all' ? null : $start,
                'endDate'   => $today,
                'timezone'  => api_env()['STORE_TIMEZONE'] ?? 'Africa/Cairo',
            ],
            'revenue' => [
                'total'             => (float) $totals['revenue'],
                'subtotal'          => (float) $totals['subtotal'],
                'shipping'          => (float) $totals['shipping'],
                'orderCount'        => $orderCount,
                'averageOrderValue' => $orderCount > 0
                    ? round((float) $totals['revenue'] / $orderCount, 2)
                    : 0.0,
            ],
            // Replaces the old fulfilment-status breakdown, which nothing has
            // written to since Orders dropped its status column — every order
            // sat in one bucket forever. Paid vs unpaid is the one order state
            // this shop actually tracks now (see PUT /orders/{id}/payment-status).
            'paymentStatusBreakdown' => array_map(
                function ($row) {
                    return ['status' => $row['payment_status'], 'count' => (int) $row['count']];
                },
                db_all("SELECT payment_status, COUNT(*) AS `count` FROM orders WHERE {$window} GROUP BY payment_status", $range)
            ),
            'paymentSplit' => array_map(
                function ($row) {
                    return [
                        'method'  => $row['payment_method'],
                        'count'   => (int) $row['count'],
                        'revenue' => (float) $row['revenue'],
                    ];
                },
                db_all(
                    "SELECT payment_method, COUNT(*) AS `count`, COALESCE(SUM(total),0) AS revenue
                     FROM orders WHERE {$earning} GROUP BY payment_method",
                    $range
                )
            ),
            'series'        => $series,
            'topProducts'   => array_slice($topProducts, 0, 8),
            'topCategories' => array_slice($topCategories, 0, 6),
            // Catalogue counts are a snapshot of right now, not of the period —
            // the client labels them that way so the two are never conflated.
            'catalogue' => [
                'products'   => (int) db_one('SELECT COUNT(*) c FROM products')['c'],
                'categories' => (int) db_one('SELECT COUNT(*) c FROM categories')['c'],
                'brands'     => (int) db_one('SELECT COUNT(*) c FROM brands')['c'],
                'outOfStock' => (int) db_one('SELECT COUNT(*) c FROM products WHERE is_available = 0')['c'],
                'activeOffers' => (int) db_one('SELECT COUNT(*) c FROM offers WHERE active = 1')['c'],
            ],
        ]);
    }

    api_fail(404, 'Unknown endpoint: ' . ($path ?: '/'));

} catch (PDOException $e) {
    api_fail(500, 'Database error', $e->getMessage());
} catch (Throwable $e) {
    api_fail(500, 'Something went wrong', $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
}
