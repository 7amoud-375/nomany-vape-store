# Deploying to nomany-vape-store.com (Hostinger)

Upload package: `nomany-deploy.zip` — the built site **and** the PHP API, laid
out exactly as the server expects.

It deliberately contains **no `api/.env`**: that file holds the database
password and the JWT secret, and it is created once on the server, never sent
through a browser upload.

Two situations, and they are not the same:

- **[Updating the live site](#updating-the-live-site)** — the shop is already
  running and the admin has entered products. This is the normal case.
- **[First install](#first-install)** — an empty `public_html`.

---

## Updating the live site

**Nothing here touches your data.** Products, categories, orders and settings
live in MySQL, not in files. The package does not contain a `.sql` file and the
API never drops or empties a table — on boot it only creates missing tables and
adds missing columns.

### What must survive the update

| On the server | Holds | In the zip? |
| --- | --- | --- |
| The MySQL database | Products, orders, settings, the admin account | No — never touched |
| `public_html/uploads/` | Every product image the admin uploaded | No — must be left alone |
| `public_html/api/.env` | DB password, JWT secret | No — must be left alone |

> **Do not "empty `public_html` and re-upload".** That deletes `uploads/` and
> `api/.env`: every product keeps its database row but loses its image, and the
> API stops answering until the `.env` is rebuilt. Overwrite in place instead,
> exactly as below.

> **The folder-rename trap.** Hostinger's File Manager does not merge a
> extracted folder into an existing one of the same name — it extracts
> alongside it under a new name (`api.5050`, `assets.8755`). The site keeps
> running the old folder and you think you deployed when you did not. Avoid it
> by never extracting a folder that already exists: delete `assets` first, and
> upload changed PHP as individual files rather than as an `api/` folder.

### Steps

1. **Back up the database first.** hPanel → **Databases → phpMyAdmin** → select
   the database → **Export** → Go. Keep the `.sql` file. It takes a minute and
   it is the difference between a bad deploy and a lost catalogue.

2. hPanel → **Files → File Manager** → open `public_html`.

3. Delete the **`assets` folder only** — and any stray `assets.NNNN` /
   `api.NNNN` left by an earlier extract. Asset filenames carry a content hash,
   so old bundles are never overwritten; they just accumulate and eat the disk
   quota. Leave `uploads/`, `api/` and `api/.env` alone.

4. **The site:** upload `nomany-site-only.zip` (`npm run package -- --site-only`)
   into `public_html`, right-click → **Extract** → into `public_html`, confirm
   **Overwrite**, then delete the zip. It contains no `api/` folder, so it
   cannot collide with the live API.

   Overwritten: `index.html`, `.htaccess`, `favicon.svg`, `robots.txt`, and a
   freshly created `assets/`.
   Untouched: `uploads/`, `api/`, the database.

   > File Manager hides dotfiles by default. Turn on **Settings → Show hidden
   > files**, or you will think `.htaccess` failed to extract.

5. **The API, only if the PHP changed.** Check `git diff` against the last
   deploy and upload just the files that differ, straight into
   `public_html/api/` (or `api/lib/`), overwriting them. Individual *files*
   overwrite cleanly — it is only *folders* that get renamed.

   Use the full `nomany-deploy.zip` only for a first install, or extract it
   somewhere else and move the PHP files across by hand.

6. **Check it, with a hard refresh** (`Ctrl+Shift+R` — your browser caches the
   old bundle):

   - The homepage loads and shows the admin's products — count them against
     `https://nomany-vape-store.com/api/products` before and after.
   - No new `assets.NNNN` or `api.NNNN` folder appeared. If one did, the
     extractor renamed rather than overwrote, and the site is still serving the
     old files — delete the stray folder and redo step 3.
   - A liquid's page shows its flavours as buttons, and adding to the cart
     without choosing one is refused.
   - `https://nomany-vape-store.com/api/.env` returns **403 Forbidden**.
     If it shows the file, stop — the database password is public, and
     Hostinger is not honouring `.htaccess`. Ask support for `AllowOverride All`.
   - A product image still loads (proves `uploads/` survived).
   - Dashboard → Orders still lists the existing orders.

### If something looks wrong

The previous version is one rebuild away: `git checkout` the last deployed
commit, `npm run build`, `npm run package`, and extract that zip the same way.
Because the data lives in MySQL and `uploads/`, rolling the files back does not
cost you a single product or order.

---

## First install

Only for an empty `public_html`.

1. **Create the database.** hPanel → **Databases → MySQL Databases** → create a
   database and a user, and note the name, user and password.

2. **Upload.** Extract `nomany-deploy.zip` into `public_html` (see step 4
   above). You should end up with:

   ```
   public_html/
   ├── .htaccess
   ├── index.html
   ├── assets/
   └── api/
       ├── .htaccess
       ├── .env.example
       ├── index.php
       ├── upload.php
       ├── sitemap.php
       ├── lib/
       └── data/
   ```

3. **Permissions.** Right-click `api/data` → **Permissions** → `700`. PHP writes
   its rate-limit counters there.

4. **Create `api/.env`.** In File Manager, inside `api/`, **New File** named
   `.env`, then paste `api/.env.example` and fill it in. Keep every value in
   double quotes.

   - `DB_NAME` / `DB_USER` / `DB_PASS` — from step 1.
   - `JWT_SECRET` — at least 32 characters. The API refuses to start without
     it rather than falling back to something guessable.
     Generate one: `php -r "echo bin2hex(random_bytes(32));"`
   - `ADMIN_USERNAME` / `ADMIN_PASSWORD` — the first admin, created on first
     boot. **Delete these two lines once you have signed in**, then upload the
     edited `.env` again.

   The tables are created automatically on the first request. There is no
   install script to run.

5. **Verify** `https://nomany-vape-store.com/api/.env` returns **403**, and that
   `https://nomany-vape-store.com/products/1` loads the product instead of a 404
   (a 404 means the root `.htaccess` did not extract — check hidden files).

6. **Sign in** at the admin path (`ADMIN_LOGIN_PATH` in
   `src/constants/index.js` — deliberately not a guessable `/admin`) and add the
   catalogue from the dashboard.

---

## Payments

There is no payment gateway and no keys in `.env`. The shop takes cash on
delivery plus manual InstaPay and Vodafone Cash transfers: the customer
transfers the money themselves and sends the receipt over WhatsApp, and the
admin marks the order paid from **Dashboard → Orders**.

The transfer number for each method is edited in **Dashboard → Settings →
Payment**, not in any file.

---

## Rebuilding the package

```bash
npm run build
npm run package
```

`npm run package` writes `nomany-deploy.zip` and refuses to produce one that
contains a `.env` or that would extract without folders on Linux.

## Deploying over FTP instead

```bash
npm run deploy -- --api
```

Reads `.env.deploy` (gitignored). It replaces `assets/`, `index.html`,
`.htaccess` and — with `--api` — the PHP files, and never touches `api/.env`,
`uploads/` or the database. Drop `--api` when only the site changed.
