# Discovers AU-store product pages for build components and downloads product photos.
# Emits a JSON report mapping component id -> product URL + saved image file.

$ErrorActionPreference = 'Continue'
$UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
$root = Split-Path -Parent $PSScriptRoot
$imgDir = Join-Path $root 'assets\builds'
New-Item -ItemType Directory -Force -Path $imgDir | Out-Null

# Mantis slugs that are pages/categories rather than products
$mantisBlock = @(
  'antennas','backpacks','batteries-chargers','behind-the-scenes','brand-pack','electronics',
  'feedback','fpv-repair-and-build-service','fpv-tools-accessories','get-me-something-fpv',
  'getting-started-with-fpv','join-the-team','loyalty-program','pre-built-drones',
  'purchase-consideration','spot-a-mistake','register-for-deals','price-match','shipping-returns',
  'terms-conditions','privacy-policy','contact-us','about-us','frames','radios','video','motors',
  'propellers','batteries','flight-controllers','stacks','cameras','goggles','wishlist','my-account',
  'cart','checkout','shop','blog','news','reviews','trade-program','gift-card','clearance'
)

function Get-Html([string]$url) {
  try { return (& curl.exe -s -L --max-time 25 -A $UA $url 2>$null) } catch { return $null }
}

function Get-OgImage([string]$url) {
  $h = Get-Html $url
  if (-not $h) { return $null }
  foreach ($pat in @(
      '(?i)property="og:image"[^>]*content="([^"]+)"',
      '(?i)content="([^"]+)"[^>]*property="og:image"',
      '(?i)"og:image"\s*:\s*"([^"]+)"')) {
    $m = [regex]::Match($h, $pat)
    if ($m.Success) {
      $u = $m.Groups[1].Value -replace '\\/', '/'
      if ($u -notmatch '^https?:') { $u = 'https:' + $u }
      return $u
    }
  }
  return $null
}

function Score-Slug([string]$slug, [string[]]$tokens) {
  $s = 0
  foreach ($t in $tokens) { if ($slug -match [regex]::Escape($t)) { $s++ } }
  return $s
}

function Find-Product([string]$query, [string]$store) {
  $tokens = ($query.ToLower() -replace '[^a-z0-9 ]', ' ') -split '\s+' | Where-Object { $_.Length -ge 2 }
  if ($store -eq 'phaser') {
    $h = Get-Html ("https://phaserfpv.com.au/search?q=" + [uri]::EscapeDataString($query))
    if (-not $h) { return $null }
    $cands = [regex]::Matches($h, '/products/([a-z0-9\-]{6,})') | ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique
    $best = $null; $bestScore = 0
    foreach ($c in $cands) {
      $sc = Score-Slug $c $tokens
      if ($sc -gt $bestScore) { $bestScore = $sc; $best = $c }
    }
    if ($best -and $bestScore -ge 2) { return "https://phaserfpv.com.au/products/$best" }
    return $null
  }
  else {
    $h = Get-Html ("https://www.mantisfpv.com.au/?post_type=product&s=" + [uri]::EscapeDataString($query))
    if (-not $h) { return $null }
    $cands = [regex]::Matches($h, 'https://www\.mantisfpv\.com\.au/([a-z0-9\-]{6,})/') | ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique
    $best = $null; $bestScore = 0
    foreach ($c in $cands) {
      if ($mantisBlock -contains $c) { continue }
      $sc = Score-Slug $c $tokens
      if ($sc -gt $bestScore) { $bestScore = $sc; $best = $c }
    }
    if ($best -and $bestScore -ge 2) { return "https://www.mantisfpv.com.au/$best/" }
    return $null
  }
}

function Save-Image([string]$imgUrl, [string]$id) {
  if (-not $imgUrl) { return $null }
  $ext = 'jpg'
  $m = [regex]::Match($imgUrl, '(?i)\.(jpe?g|png|webp)(\?|$)')
  if ($m.Success) { $ext = $m.Groups[1].Value.ToLower() -replace 'jpeg', 'jpg' }
  $out = Join-Path $imgDir "$id.$ext"
  & curl.exe -s -L --max-time 30 -A $UA -o $out $imgUrl 2>$null
  if ((Test-Path $out) -and (Get-Item $out).Length -gt 4000) { return (Split-Path $out -Leaf) }
  if (Test-Path $out) { Remove-Item $out -Force }
  return $null
}

# id, search query, preferred store order
$targets = @(
  @{ id = 'xing-e-pro';       q = 'Xing-E Pro 2207';                     stores = @('phaser', 'mantis') },
  @{ id = 'jhemcu-f405';      q = 'JHEMCU F405 AIO';                     stores = @('phaser', 'mantis') },
  @{ id = 'supernova-1404';   q = 'Supernova 1404';                      stores = @('phaser', 'mantis') },
  @{ id = 'skystars-koko';    q = 'Skystars KOKO 1404';                  stores = @('phaser', 'mantis') },
  @{ id = 'hq-3030';          q = 'HQProp 3x3x3 propeller';              stores = @('phaser', 'mantis') },
  @{ id = 'qav-s2';           q = 'Lumenier QAV-S 2 freestyle frame';    stores = @('phaser', 'mantis') },
  @{ id = 'xilo-stealth';     q = 'Xilo Stealth 2207 motor';             stores = @('phaser', 'mantis') },
  @{ id = 'gemfan-5127';      q = 'Gemfan Hurricane 51277 propeller';    stores = @('phaser', 'mantis') },
  @{ id = 'air75';            q = 'BetaFPV Air75 whoop';                 stores = @('phaser', 'mantis') },
  @{ id = 'matrix-ii-aio';    q = 'BetaFPV Matrix II AIO';               stores = @('phaser', 'mantis') },
  @{ id = 'rcinpower-evo';    q = 'RCinPower EVO 1102 motor';            stores = @('phaser', 'mantis') },
  @{ id = 'c03-camera';       q = 'BetaFPV C03 camera';                  stores = @('phaser', 'mantis') },
  @{ id = 'lava-1s';          q = 'BetaFPV Lava 1S battery';             stores = @('phaser', 'mantis') },
  @{ id = 'gemfan-1614';      q = 'Gemfan 1614 propeller';               stores = @('phaser', 'mantis') },
  @{ id = 'bms-js2';          q = 'BMS Racing JS-2 frame';               stores = @('phaser', 'mantis') },
  @{ id = 'tmotor-mini-f7';   q = 'T-Motor Mini F7 flight controller';   stores = @('phaser', 'mantis') },
  @{ id = 'tmotor-f66a';      q = 'T-Motor F66A ESC';                    stores = @('phaser', 'mantis') },
  @{ id = 'tmotor-f40';       q = 'T-Motor F40 Pro 2306 motor';          stores = @('phaser', 'mantis') },
  @{ id = 'gemfan-5-racing';  q = 'Gemfan 51433 propeller';              stores = @('phaser', 'mantis') },
  @{ id = 'dinogy';           q = 'Dinogy graphene 1300mah 6S';          stores = @('phaser', 'mantis') },
  @{ id = 'matchstick';       q = 'TrueRC Matchstick antenna';           stores = @('phaser', 'mantis') },
  @{ id = 'truerc-xair';      q = 'TrueRC X-Air 5.8 antenna';            stores = @('phaser', 'mantis') },
  @{ id = 'hdzero-goggles';   q = 'HDZero Goggle 2';                     stores = @('phaser', 'mantis') },
  @{ id = 'foxeer-predator';  q = 'Foxeer Predator nano camera';         stores = @('mantis', 'phaser') },
  @{ id = 'foxeer-caesar';    q = 'Foxeer Caesar frame';                 stores = @('phaser', 'mantis') },
  @{ id = 'iflight-borg';     q = 'iFlight Borg flight controller';      stores = @('phaser', 'mantis') },
  @{ id = 'tattu-v5';         q = 'Tattu R-Line 1050mah 6S';             stores = @('phaser', 'mantis') },
  @{ id = 'foxeer-lollipop';  q = 'Foxeer Lollipop antenna';             stores = @('mantis', 'phaser') },
  @{ id = 'kd2207';           q = 'KD 2207 motor';                       stores = @('phaser', 'mantis') },
  @{ id = 'cnhl-6s';          q = 'CNHL 1300mah 6S battery';             stores = @('phaser', 'mantis') },
  @{ id = 'ovonic-6s';        q = 'Ovonic 6S lipo battery';              stores = @('phaser', 'mantis') },
  @{ id = 'frame-3inch';      q = '3 inch racing frame';                 stores = @('phaser', 'mantis') }
)

$report = @()
foreach ($t in $targets) {
  $page = $null
  foreach ($store in $t.stores) {
    $page = Find-Product $t.q $store
    if ($page) { break }
    Start-Sleep -Milliseconds 600
  }
  if (-not $page) {
    Write-Host ("MISS  {0,-18} no product page found" -f $t.id)
    $report += [pscustomobject]@{ id = $t.id; page = ''; image = ''; status = 'no-page' }
    continue
  }
  $img = Get-OgImage $page
  $saved = Save-Image $img $t.id
  if ($saved) {
    Write-Host ("OK    {0,-18} {1}" -f $t.id, $page)
    $report += [pscustomobject]@{ id = $t.id; page = $page; image = $saved; status = 'ok' }
  }
  else {
    Write-Host ("PAGE  {0,-18} {1}  (no image)" -f $t.id, $page)
    $report += [pscustomobject]@{ id = $t.id; page = $page; image = ''; status = 'page-only' }
  }
  Start-Sleep -Milliseconds 700
}

$report | ConvertTo-Json -Depth 4 | Set-Content (Join-Path $PSScriptRoot 'asset-report.json')
Write-Host "`n=== SUMMARY ==="
$report | Group-Object status | ForEach-Object { Write-Host "$($_.Name): $($_.Count)" }
