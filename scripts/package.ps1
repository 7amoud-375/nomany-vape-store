# Builds the upload package for Hostinger.
#
#   npm run package
#
# Why this exists instead of Compress-Archive / CreateFromDirectory: both write
# ZIP entry names using the platform separator, so on Windows you get
# "assets\index.js" instead of "assets/index.js". The ZIP spec requires forward
# slashes, and Linux extractors treat the backslash as part of the FILENAME --
# you end up with ~50 flat files literally called "assets\index.js" and no
# folders at all. This script writes the entry names explicitly.
#
# The package deliberately excludes api/.env: secrets are created directly on
# the server, never shipped through a browser upload.

$ErrorActionPreference = "Stop"

$root    = Split-Path -Parent $PSScriptRoot
$dist    = Join-Path $root "dist"
$api     = Join-Path $root "api"
$staging = Join-Path $root "build-package"
$zipPath = Join-Path $root "nomany-deploy.zip"

if (-not (Test-Path $dist)) {
    throw "dist/ not found. Run 'npm run build' first."
}

# --- Stage the exact tree the server should have ---------------------------
if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
New-Item -ItemType Directory -Path $staging | Out-Null

Copy-Item -Path (Join-Path $dist "*") -Destination $staging -Recurse -Force

$apiDest = Join-Path $staging "api"
New-Item -ItemType Directory -Path (Join-Path $apiDest "lib")  -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $apiDest "data") -Force | Out-Null

foreach ($f in @(".htaccess", ".env.example", "paymob.php", "callback.php", "verify.php", "vodafone.php")) {
    Copy-Item (Join-Path $api $f) $apiDest -Force
}
Copy-Item (Join-Path $api "lib\bootstrap.php") (Join-Path $apiDest "lib") -Force
Copy-Item (Join-Path $api "lib\firestore.php") (Join-Path $apiDest "lib") -Force
Copy-Item (Join-Path $api "data\.htaccess")    (Join-Path $apiDest "data") -Force

# --- Zip it with POSIX separators -----------------------------------------
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

$zip = [System.IO.Compression.ZipFile]::Open($zipPath, 'Create')
try {
    $count = 0
    Get-ChildItem -Path $staging -Recurse -File -Force | ForEach-Object {
        $rel = $_.FullName.Substring($staging.Length + 1).Replace('\', '/')
        $entry = $zip.CreateEntry($rel, [System.IO.Compression.CompressionLevel]::Optimal)
        $out = $entry.Open()
        $in  = [System.IO.File]::OpenRead($_.FullName)
        $in.CopyTo($out)
        $in.Dispose()
        $out.Dispose()
        $count++
    }
} finally {
    $zip.Dispose()
}

Remove-Item $staging -Recurse -Force

# --- Verify before handing it over ----------------------------------------
$zip = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
try {
    $backslashes = @($zip.Entries | Where-Object { $_.FullName -like '*\*' }).Count
    $htaccess    = @($zip.Entries | Where-Object { $_.FullName -like '*.htaccess' }).Count
    $envLeak     = @($zip.Entries | Where-Object { $_.FullName -like '*.env' }).Count

    if ($backslashes -gt 0) { throw "$backslashes entries contain a backslash - Linux will not create folders." }
    if ($htaccess -ne 3)    { throw "Expected 3 .htaccess files, found $htaccess." }
    if ($envLeak -gt 0)     { throw "A .env file got into the package - remove it." }

    Write-Output "OK  $($zip.Entries.Count) entries, $htaccess .htaccess files, no .env, POSIX separators"
    Write-Output "    $zipPath"
} finally {
    $zip.Dispose()
}
