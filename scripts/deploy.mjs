/**
 * Deploy the built site to Hostinger over FTP.
 *
 *   npm run deploy         -> uploads dist/ (the site)
 *   npm run deploy -- --api -> also uploads api/ (only when the PHP changed)
 *
 * Credentials come from .env.deploy, which is gitignored. This script never
 * prints the password and never touches api/.env on the server -- that file
 * holds your live payment secrets and is created by hand on the server.
 */

import { Client } from "basic-ftp";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const envPath = join(root, ".env.deploy");

if (!existsSync(envPath)) {
  console.error(`
Missing .env.deploy

Copy the example and fill it in with the FTP details from hPanel
(Files -> FTP Accounts):

  cp .env.deploy.example .env.deploy
`);
  process.exit(1);
}

// Minimal parser -- avoids a dotenv dependency for four values.
const env = {};
for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const match = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, "");
}

for (const key of ["FTP_HOST", "FTP_USER", "FTP_PASSWORD"]) {
  if (!env[key]) {
    console.error(`${key} is missing from .env.deploy`);
    process.exit(1);
  }
}

const remoteRoot = env.FTP_REMOTE_ROOT || "/public_html";
const uploadApi = process.argv.includes("--api");
const distDir = join(root, "dist");

if (!existsSync(join(distDir, "index.html"))) {
  console.error("dist/ is empty or missing. Run `npm run build` first.");
  process.exit(1);
}
if (!existsSync(join(distDir, ".htaccess"))) {
  console.error("dist/.htaccess is missing -- deep links would 404. Aborting.");
  process.exit(1);
}

const client = new Client(30_000);
client.ftp.verbose = false;

try {
  await client.access({
    host: env.FTP_HOST,
    user: env.FTP_USER,
    password: env.FTP_PASSWORD,
    port: Number(env.FTP_PORT || 21),
    secure: false, // Hostinger shared hosting speaks plain FTP on 21.
  });

  console.log(`Connected to ${env.FTP_HOST} as ${env.FTP_USER}`);

  await client.ensureDir(remoteRoot);
  await client.cd(remoteRoot);

  // Replace assets/ wholesale: filenames are content-hashed, so stale bundles
  // would otherwise pile up forever and eat the disk quota.
  console.log("Uploading assets/ ...");
  try {
    await client.removeDir(`${remoteRoot}/assets`);
  } catch {
    // First deploy -- nothing to remove.
  }
  await client.uploadFromDir(join(distDir, "assets"), `${remoteRoot}/assets`);

  console.log("Uploading index.html and .htaccess ...");
  await client.uploadFrom(join(distDir, "index.html"), `${remoteRoot}/index.html`);
  await client.uploadFrom(join(distDir, ".htaccess"), `${remoteRoot}/.htaccess`);

  if (uploadApi) {
    console.log("Uploading api/ (excluding .env) ...");
    const apiFiles = [
      ['.htaccess', 'api/.htaccess'],
      ['.env.example', 'api/.env.example'],
      ['index.php', 'api/index.php'],
      ['upload.php', 'api/upload.php'],
      ['migrate-from-firestore.php', 'api/migrate-from-firestore.php'],
      ['lib/bootstrap.php', 'api/lib/bootstrap.php'],
      ['lib/db.php', 'api/lib/db.php'],
      ['lib/auth.php', 'api/lib/auth.php'],
      ['lib/payments.php', 'api/lib/payments.php'],
      ['data/.htaccess', 'api/data/.htaccess'],
    ];

    await client.ensureDir(`${remoteRoot}/api/lib`);
    await client.ensureDir(`${remoteRoot}/api/data`);
    await client.cd(remoteRoot);

    for (const [remote, local] of apiFiles) {
      const localPath = join(root, local);
      if (!existsSync(localPath)) continue;
      await client.uploadFrom(localPath, `${remoteRoot}/api/${remote}`);
    }
    console.log("  api/.env left untouched on the server (as intended)");
  }

  console.log("\nDone. Live at https://nomany-vape-store.com");
  console.log("Hard-refresh with Ctrl+Shift+R to bypass your own cache.");
} catch (error) {
  console.error("\nDeploy failed:", error.message);
  process.exitCode = 1;
} finally {
  client.close();
}
