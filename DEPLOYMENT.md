# Deployment

The site is a static Vite build plus a small PHP API. It expects Apache with
PHP 7.4+ (`curl`, `openssl`, `json`) — standard cPanel hosting is fine.

---

## 1. Firebase

### Deploy the security rules

`firestore.rules` is the real access boundary — the admin check in React is only
a convenience and can be bypassed with devtools.

```bash
firebase deploy --only firestore:rules
```

What the rules enforce:

- A customer can create their own `users/{uid}` document but cannot set or later
  change `role`. **Promote yourself to admin by hand** in the Firebase console:
  Firestore → `users` → your document → set `role` to `admin`.
- `store/*` (products, categories, brands, offers, banners, testimonials,
  settings, homepage) is world-readable and admin-writable.
- An order is readable by the customer who placed it or by an admin. Only an
  admin can change one, so nobody can mark their own order paid.

### Service account (for verified payments)

`api/callback.php` writes the verified `paid` status, which requires admin
credentials.

1. Firebase console → Project settings → Service accounts → **Generate new
   private key**.
2. Upload the JSON **outside the web root**, e.g. `/home/USER/secrets/firebase-sa.json`.
3. Point `FIREBASE_SERVICE_ACCOUNT` at that absolute path in `api/.env`.

---

## 2. The API

Copy `api/.env.example` to `api/.env` and fill in every value.

```bash
cp api/.env.example api/.env
```

Upload the whole `api/` directory. Then confirm the secrets are not served:

```bash
curl -i https://yourdomain.com/api/.env
```

You want **403**. If you get the file contents, stop and fix it before going
live — `.htaccess` needs `AllowOverride All` on the vhost to take effect.

`api/data/` must be writable by PHP (it holds payment records, rate-limit
counters and the token cache):

```bash
chmod 700 api/data
```

### Paymob dashboard

Set the **Transaction processed callback** to:

```
https://yourdomain.com/api/callback.php
```

Copy the **HMAC secret** from the same screen into `PAYMOB_HMAC_SECRET`.
Without it no payment can ever be confirmed — this is deliberate; the old code
trusted a `?success=true` URL parameter instead.

---

## 3. The front end

`.env` in the project root:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_API_BASE_URL=https://yourdomain.com/api
```

Everything prefixed `VITE_` is embedded in the JavaScript bundle and is public
by design. Never put the Paymob API key or the HMAC secret here — they belong in
`api/.env` only.

```bash
npm ci
npm run build
```

Upload the contents of `dist/` to the web root. Because the app uses client-side
routing, add this to the root `.htaccess` so deep links like `/products/3` do not
404:

```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /
    RewriteRule ^index\.html$ - [L]
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteCond %{REQUEST_URI} !^/api/
    RewriteRule . /index.html [L]
</IfModule>
```

---

## 4. Seed the catalogue

The app ships with demo products in `src/data/`. They are only a fallback for a
browser that has never seen the store. Once signed in as admin, save any product
from the dashboard — that writes `store/products` to Firestore and every visitor
reads from there.

`api/paymob.php` prices carts from `store/products` and reads shipping from
`store/settings`, so **both documents must exist before card payments work**.
Saving once from Dashboard → Products and once from Dashboard → Settings is
enough to create them.

---

## Go-live checklist

- [ ] `firebase deploy --only firestore:rules`
- [ ] Your user's `role` is `admin` in Firestore
- [ ] `curl -i https://yourdomain.com/api/.env` returns 403
- [ ] `api/data/` is writable (chmod 700)
- [ ] Paymob callback URL set, HMAC secret in `api/.env`
- [ ] `APP_ALLOWED_ORIGINS` lists your real domain
- [ ] `store/products` and `store/settings` exist in Firestore
- [ ] One live test order per method: COD, card, Vodafone Cash
- [ ] Confirm the test card order flips to `paid` in the dashboard on its own
