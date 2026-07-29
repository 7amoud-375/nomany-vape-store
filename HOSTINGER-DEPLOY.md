# Deploying to nomany-vape-store.com (Hostinger)

Upload package: `nomany-deploy.zip` — 55 files, 387 KB.
It contains the built site **and** the PHP API, laid out exactly as the server
expects. It deliberately contains **no `.env` file**; you create that on the
server in step 3 so your Paymob key is never sent through a browser upload.

---

## 1. Upload and extract

hPanel → **Files → File Manager** → open `public_html`.

If there is a default `index.html` or a Hostinger placeholder page in there,
delete it first.

Upload `nomany-deploy.zip`, then right-click it → **Extract** → into
`public_html`. Delete the zip afterwards.

You should end up with:

```
public_html/
├── .htaccess
├── index.html
├── assets/
└── api/
    ├── .htaccess
    ├── callback.php
    ├── paymob.php
    ├── verify.php
    ├── vodafone.php
    ├── lib/
    └── data/
```

> File Manager hides dotfiles by default. Turn on **Settings → Show hidden
> files** or you will think `.htaccess` failed to extract.

---

## 2. Permissions

Right-click `api/data` → **Permissions** → set to `700`.

PHP writes payment records, rate-limit counters and its token cache there. If it
is not writable, payments cannot be recorded.

---

## 3. Create `api/.env`

In File Manager, inside `api/`, click **New File**, name it `.env`, and paste
the block below. Fill in the four blanks from the Paymob dashboard.

```ini
PAYMOB_API_KEY = "PASTE_FROM_YOUR_LOCAL_api/.env"
PAYMOB_IFRAME_ID = "PASTE_FROM_YOUR_LOCAL_api/.env"

PAYMOB_INTEGRATION_ID_CARD = ""
PAYMOB_INTEGRATION_ID_VODAFONE = ""
PAYMOB_HMAC_SECRET = ""

FIREBASE_PROJECT_ID = "nomany-vape-store"
FIREBASE_SERVICE_ACCOUNT = ""

APP_ALLOWED_ORIGINS = "https://nomany-vape-store.com,https://www.nomany-vape-store.com"
```

The first two values are already in your local `api/.env` — copy them across.

**The three Paymob blanks are why card payments will not work yet.** Your local
config still has `YOUR_CARD_INTEGRATION_ID` as a placeholder and no HMAC secret
at all. Get all three from Paymob → **Developers → Payment Integrations**.

---

## 4. Verify the secrets are not public

Do this **before** announcing the site. In a browser:

```
https://nomany-vape-store.com/api/.env
```

You need a **403 Forbidden**. If it shows the file contents, stop — your Paymob
key is public. That means Hostinger is not honouring `.htaccess`; contact
support and ask for `AllowOverride All` on the domain.

Also check:

```
https://nomany-vape-store.com/products/1
```

If that 404s instead of loading the product, the root `.htaccess` did not
extract (see the hidden-files note in step 1).

---

## 5. Firebase

Two things, both from your own machine — neither can be done from hPanel.

**Deploy the security rules.** Until you do, the database is wide open and
anyone can promote themselves to admin:

```bash
npx firebase login
npx firebase deploy --only firestore:rules
```

**Make yourself admin.** Firebase console → Firestore → `users` → your document
→ set `role` to `admin`. The new rules block doing this from the app, on
purpose.

---

## 6. Service account (only needed for card/wallet payments)

Firebase console → Project settings → Service accounts → **Generate new private
key**.

Upload the JSON **outside** `public_html` — e.g. create `/home/uXXXXXXX/secrets/`
and put it there. Then set `FIREBASE_SERVICE_ACCOUNT` in `api/.env` to that
absolute path.

If it sits inside `public_html`, anyone can download full admin access to your
database.

---

## 7. Paymob callback

Paymob dashboard → Developers → Payment Integrations → set **Transaction
processed callback** to:

```
https://nomany-vape-store.com/api/callback.php
```

Copy the **HMAC secret** from that screen into `PAYMOB_HMAC_SECRET`.

Without it, no payment is ever confirmed. That is deliberate — it is what stops
someone marking their own order paid.

---

## 8. Seed the catalogue

Sign in as admin, then save one product from **Dashboard → Products** and hit
save once on **Dashboard → Settings**.

That writes `store/products` and `store/settings` to Firestore.
`api/paymob.php` prices every cart from those two documents, so **card payments
fail until both exist**.

---

## Order of operations

1. Steps 1–4 → **the shop is live and COD works**
2. Step 5 → the database is secured *(do not skip)*
3. Steps 6–8 → card and Vodafone Cash start working

---

## Redeploying later

```bash
npm run build
```

Then re-upload the contents of `dist/` to `public_html`. The `api/` folder and
`api/.env` stay as they are unless the PHP changed.
