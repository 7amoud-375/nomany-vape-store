<?php
/**
 * Minimal Firestore REST client.
 *
 * Deliberately dependency-free (no Composer) so it drops onto plain cPanel
 * hosting. Two access levels:
 *
 *   - Public reads for `store/*`, which firestore.rules exposes to everyone.
 *     No credentials needed.
 *   - Authenticated writes via a service account, used by callback.php to mark
 *     an order paid. The browser can never do this -- that is the whole point.
 *
 * Requires in api/.env:
 *   FIREBASE_PROJECT_ID
 *   FIREBASE_SERVICE_ACCOUNT   (path to the service-account JSON, writes only)
 */

if (!defined('NOMANY_API')) {
    http_response_code(403);
    exit('Direct access denied');
}

/** Perform an HTTP request and return [status, decodedBody]. */
function fs_http($method, $url, $payload = null, $headers = [])
{
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 20);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);

    if ($payload !== null) {
        if (is_string($payload)) {
            // Already-encoded body; the caller supplies its own Content-Type
            // (the OAuth token request is form-encoded, not JSON).
            curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        } else {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
            $headers[] = 'Content-Type: application/json';
        }
    }
    if ($headers) {
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    }

    $response = curl_exec($ch);
    if (curl_errno($ch)) {
        $err = curl_error($ch);
        curl_close($ch);
        throw new Exception('Network error talking to Firestore: ' . $err);
    }
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    return [$status, json_decode($response, true)];
}

/** Convert Firestore's typed JSON into ordinary PHP values. */
function fs_decode($value)
{
    if (!is_array($value)) {
        return null;
    }
    if (array_key_exists('nullValue', $value))    return null;
    if (array_key_exists('booleanValue', $value)) return (bool) $value['booleanValue'];
    if (array_key_exists('integerValue', $value)) return (int) $value['integerValue'];
    if (array_key_exists('doubleValue', $value))  return (float) $value['doubleValue'];
    if (array_key_exists('stringValue', $value))  return (string) $value['stringValue'];
    if (array_key_exists('timestampValue', $value)) return (string) $value['timestampValue'];

    if (isset($value['arrayValue'])) {
        $out = [];
        foreach ($value['arrayValue']['values'] ?? [] as $item) {
            $out[] = fs_decode($item);
        }
        return $out;
    }
    if (isset($value['mapValue'])) {
        $out = [];
        foreach ($value['mapValue']['fields'] ?? [] as $key => $item) {
            $out[$key] = fs_decode($item);
        }
        return $out;
    }
    return null;
}

/** Convert a PHP value into Firestore's typed JSON. */
function fs_encode($value)
{
    if ($value === null)   return ['nullValue' => null];
    if (is_bool($value))   return ['booleanValue' => $value];
    if (is_int($value))    return ['integerValue' => (string) $value];
    if (is_float($value))  return ['doubleValue' => $value];
    if (is_string($value)) return ['stringValue' => $value];

    if (is_array($value)) {
        $isList = array_keys($value) === range(0, count($value) - 1);
        if ($isList) {
            return ['arrayValue' => ['values' => array_map('fs_encode', $value)]];
        }
        $fields = [];
        foreach ($value as $key => $item) {
            $fields[$key] = fs_encode($item);
        }
        return ['mapValue' => ['fields' => $fields]];
    }
    return ['nullValue' => null];
}

function fs_base_url($env)
{
    $projectId = $env['FIREBASE_PROJECT_ID'] ?? '';
    if (!$projectId) {
        throw new Exception('FIREBASE_PROJECT_ID is not configured');
    }
    return "https://firestore.googleapis.com/v1/projects/{$projectId}/databases/(default)/documents";
}

/**
 * Read a publicly readable document, e.g. fs_get_public($env, 'store/products').
 * Returns the decoded `fields` map, or null when the document is missing.
 */
function fs_get_public($env, $path)
{
    [$status, $body] = fs_http('GET', fs_base_url($env) . '/' . $path);

    if ($status === 404) {
        return null;
    }
    if ($status >= 400) {
        throw new Exception('Firestore read failed (' . $status . ') for ' . $path);
    }

    $out = [];
    foreach ($body['fields'] ?? [] as $key => $value) {
        $out[$key] = fs_decode($value);
    }
    return $out;
}

function fs_base64url($data)
{
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

/**
 * Exchange the service-account key for an OAuth access token, cached on disk
 * until shortly before it expires.
 */
function fs_access_token($env)
{
    $keyPath = $env['FIREBASE_SERVICE_ACCOUNT'] ?? '';
    if (!$keyPath) {
        throw new Exception('FIREBASE_SERVICE_ACCOUNT is not configured');
    }
    if (!is_readable($keyPath)) {
        throw new Exception('Service-account key not readable at ' . $keyPath);
    }

    $cacheFile = __DIR__ . '/../data/.token-cache.json';
    if (is_readable($cacheFile)) {
        $cached = json_decode(file_get_contents($cacheFile), true);
        if (!empty($cached['expires_at']) && $cached['expires_at'] > time() + 60) {
            return $cached['access_token'];
        }
    }

    $sa = json_decode(file_get_contents($keyPath), true);
    if (empty($sa['client_email']) || empty($sa['private_key'])) {
        throw new Exception('Service-account key is malformed');
    }

    $now = time();
    $header = fs_base64url(json_encode(['alg' => 'RS256', 'typ' => 'JWT']));
    $claims = fs_base64url(json_encode([
        'iss'   => $sa['client_email'],
        'scope' => 'https://www.googleapis.com/auth/datastore',
        'aud'   => 'https://oauth2.googleapis.com/token',
        'iat'   => $now,
        'exp'   => $now + 3600,
    ]));

    $signature = '';
    if (!openssl_sign("{$header}.{$claims}", $signature, $sa['private_key'], 'sha256WithRSAEncryption')) {
        throw new Exception('Failed to sign service-account assertion');
    }
    $jwt = "{$header}.{$claims}." . fs_base64url($signature);

    [$status, $body] = fs_http(
        'POST',
        'https://oauth2.googleapis.com/token',
        http_build_query([
            'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            'assertion'  => $jwt,
        ]),
        ['Content-Type: application/x-www-form-urlencoded']
    );

    if ($status >= 400 || empty($body['access_token'])) {
        throw new Exception('Could not obtain Google access token (' . $status . ')');
    }

    @mkdir(dirname($cacheFile), 0700, true);
    file_put_contents($cacheFile, json_encode([
        'access_token' => $body['access_token'],
        'expires_at'   => $now + (int) ($body['expires_in'] ?? 3600),
    ]), LOCK_EX);

    return $body['access_token'];
}

/** Find the single order document whose `id` field matches $orderNumber. */
function fs_find_order($env, $orderNumber)
{
    $token = fs_access_token($env);
    $url = preg_replace('#/documents$#', '/documents:runQuery', fs_base_url($env));

    [$status, $body] = fs_http('POST', $url, [
        'structuredQuery' => [
            'from'  => [['collectionId' => 'orders']],
            'where' => [
                'fieldFilter' => [
                    'field' => ['fieldPath' => 'id'],
                    'op'    => 'EQUAL',
                    'value' => ['stringValue' => $orderNumber],
                ],
            ],
            'limit' => 1,
        ],
    ], ['Authorization: Bearer ' . $token]);

    if ($status >= 400) {
        throw new Exception('Firestore query failed (' . $status . ')');
    }
    foreach ($body as $row) {
        if (!empty($row['document']['name'])) {
            return $row['document']['name']; // full resource path
        }
    }
    return null;
}

/**
 * Patch specific fields on a document. $documentName is the full resource path
 * returned by fs_find_order().
 */
function fs_patch($env, $documentName, array $fields)
{
    $token = fs_access_token($env);

    $query = [];
    foreach (array_keys($fields) as $key) {
        $query[] = 'updateMask.fieldPaths=' . urlencode($key);
    }
    $url = 'https://firestore.googleapis.com/v1/' . $documentName . '?' . implode('&', $query);

    $encoded = [];
    foreach ($fields as $key => $value) {
        $encoded[$key] = fs_encode($value);
    }

    [$status, $body] = fs_http('PATCH', $url, ['fields' => $encoded], [
        'Authorization: Bearer ' . $token,
    ]);

    if ($status >= 400) {
        throw new Exception('Firestore write failed (' . $status . ')');
    }
    return $body;
}
