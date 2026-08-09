# Downloads product photos for build components from MantisFPV.
# Works from either a known product URL or a search query, and reports the matched title
# so every match can be verified rather than trusted.

$ErrorActionPreference = 'Continue'
$UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
$root = Split-Path -Parent $PSScriptRoot
$imgDir = Join-Path $root 'assets\builds'
New-Item -ItemType Directory -Force -Path $imgDir | Out-Null

$mantisBlock = @(
  'antennas', 'backpacks', 'batteries-chargers', 'behind-the-scenes', 'brand-pack', 'electronics',
  'feedback', 'fpv-repair-and-build-service', 'fpv-tools-accessories', 'get-me-something-fpv',
  'getting-started-with-fpv', 'join-the-team', 'loyalty-program', 'pre-built-drones',
  'purchase-consideration', 'spot-a-mistake', 'register-for-deals', 'price-match'
)

function Get-Text([string]$url) {
  try { return ((& curl.exe -s -L --max-time 25 -A $UA $url 2>$null) -join "`n") } catch { return $null }
}

function Get-Title([string]$html) {
  $m = [regex]::Match($html, '(?i)property="og:title"[^>]*content="([^"]+)"')
  if ($m.Success) { return ($m.Groups[1].Value -replace '&quot;', '"' -replace ' - MantisFPV', '') }
  return ''
}

function Get-ProductImage([string]$html, [string]$pageUrl) {
  foreach ($pat in @(
      '(?i)property="og:image"[^>]*content="([^"]+)"',
      '(?i)content="([^"]+)"[^>]*property="og:image"',
      '(?i)<meta[^>]*itemprop="image"[^>]*content="([^"]+)"')) {
    $m = [regex]::Match($html, $pat)
    if ($m.Success) {
      $u = $m.Groups[1].Value -replace '\\/', '/'
      if ($u -notmatch '^https?:') { $u = 'https:' + $u }
      if ($u -match '(?i)\.(jpe?g|png|webp)') { return $u }
    }
  }
  # fall back to the largest gallery upload whose filename echoes the product slug
  $slug = ''
  $sm = [regex]::Match($pageUrl, '(?i)mantisfpv\.com\.au/([a-z0-9\-]+)/?$')
  if ($sm.Success) { $slug = $sm.Groups[1].Value }
  $tokens = ($slug -split '-') | Where-Object { $_.Length -ge 4 }
  $imgs = [regex]::Matches($html, '(?i)https://cdn\d?\.mantisfpv\.com\.au/wp-content/uploads/[^"''\s]+\.(?:jpg|jpeg|png|webp)') |
  ForEach-Object { $_.Value } | Sort-Object -Unique
  $imgs = $imgs | Where-Object { $_ -notmatch '(?i)map-of-mantisfpv|logo|icon|badge' -and $_ -notmatch '(?i)-\d{2,3}x\d{2,3}\.' }
  $best = $null; $bestScore = -1
  foreach ($i in $imgs) {
    $sc = 0
    foreach ($t in $tokens) { if ($i -match [regex]::Escape($t)) { $sc++ } }
    if ($sc -gt $bestScore) { $bestScore = $sc; $best = $i }
  }
  if ($bestScore -ge 2) { return $best }
  return $null
}

function Save-Image([string]$imgUrl, [string]$id) {
  if (-not $imgUrl) { return $null }
  $ext = 'jpg'
  $m = [regex]::Match($imgUrl, '(?i)\.(jpe?g|png|webp)(\?|$)')
  if ($m.Success) { $ext = $m.Groups[1].Value.ToLower() -replace 'jpeg', 'jpg' }
  Get-ChildItem $imgDir -Filter "$id.*" -File -EA SilentlyContinue | Remove-Item -Force -EA SilentlyContinue
  $out = Join-Path $imgDir "$id.$ext"

  # the cdn2 host rejects jpeg requests, the www host serves the same paths
  $tries = @($imgUrl)
  if ($imgUrl -match 'cdn\d?\.mantisfpv\.com\.au') {
    $tries += ($imgUrl -replace 'cdn\d?\.mantisfpv\.com\.au', 'www.mantisfpv.com.au')
  }
  foreach ($t in $tries) {
    & curl.exe -s -L --max-time 30 -A $UA -e 'https://www.mantisfpv.com.au/' -o $out $t 2>$null
    if ((Test-Path $out) -and (Get-Item $out).Length -gt 5000) { return (Split-Path $out -Leaf) }
    if (Test-Path $out) { Remove-Item $out -Force }
  }
  return $null
}

function Find-MantisProduct([string]$query) {
  $h = Get-Text ("https://www.mantisfpv.com.au/?post_type=product&s=" + [uri]::EscapeDataString($query))
  if (-not $h) { return $null }
  $tokens = ($query.ToLower() -replace '[^a-z0-9 ]', ' ') -split '\s+' | Where-Object { $_.Length -ge 3 }
  $cands = [regex]::Matches($h, 'https://www\.mantisfpv\.com\.au/([a-z0-9\-]{10,})/') |
  ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique
  $best = $null; $bestScore = 1
  foreach ($c in $cands) {
    if ($mantisBlock -contains $c) { continue }
    $sc = 0
    foreach ($t in $tokens) { if ($c -match [regex]::Escape($t)) { $sc++ } }
    if ($sc -gt $bestScore) { $bestScore = $sc; $best = $c }
  }
  if ($best) { return "https://www.mantisfpv.com.au/$best/" }
  return $null
}

# Known product pages that still need a photo
$known = @(
  @{ id = 'iflight-borg';    url = 'https://www.mantisfpv.com.au/iflight-borg-5s-rx-flight-controller/' },
  @{ id = 'foxeer-caesar';   url = 'https://www.mantisfpv.com.au/foxeer-caesar-v2-pro-5-t700-racing-frame-hdzero/' },
  @{ id = 'gemfan-5-racing'; url = 'https://www.mantisfpv.com.au/gemfan-hurricane-51433-durable-3-blade-set-of-4/' },
  @{ id = 'xing-e-pro';      url = 'https://www.mantisfpv.com.au/iflight-xing-e-pro-2207-1800kv-motor/' },
  @{ id = 'foxeer-predator'; url = 'https://www.mantisfpv.com.au/foxeer-predator-nano-v5-m8-1000tvl-1-7mm-fpv-camera-hs1250/' },
  @{ id = 'foxeer-lollipop'; url = 'https://www.mantisfpv.com.au/foxeer-5-8g-lollipop-4-stubby-omni-2-6dbi-fpv-antenna-2pcs-lhcp-rhcp/' },
  @{ id = 'matchstick';      url = 'https://www.mantisfpv.com.au/truerc-matchstick-5-8-carbon-antenna-lhcp-rp-sma-extra-long-200mm/' },
  @{ id = 'truerc-xair';     url = 'https://www.mantisfpv.com.au/truerc-x-air-5-8-mk-ii-combo-stubby-antenna-for-hdzero-goggles-lhcp/' },
  @{ id = 'bms-js3';         url = 'https://www.mantisfpv.com.au/bms-racing-js-3-tiger-5-racing-frame-kit/' }
)

# Components still needing a product page + photo
$queries = @(
  @{ id = 'hdzero-goggles';  q = 'HDZero Goggle 2 digital' },
  @{ id = 'gemfan-5127';     q = 'Gemfan Hurricane 51477' },
  @{ id = 'hq-3030';         q = 'HQProp 3 inch propeller' },
  @{ id = 'tattu-v5';        q = 'Tattu R-Line 1050mAh 6S' },
  @{ id = 'dinogy';          q = 'Dinogy 1300mAh 6S graphene' },
  @{ id = 'cnhl-6s';         q = 'CNHL 1300mAh 6S' },
  @{ id = 'supernova-1404';  q = 'RCinPower Supernova 1404' },
  @{ id = 'xilo-stealth';    q = 'Xilo Stealth 2207 motor' },
  @{ id = 'tmotor-f40';      q = 'T-Motor F40 Pro 2306' },
  @{ id = 'tmotor-mini-f7';  q = 'T-Motor Mini F7 flight controller' },
  @{ id = 'jhemcu-f405';     q = 'JHEMCU F405 AIO flight controller' },
  @{ id = 'rcinpower-evo';   q = 'RCinPower 1102 motor' },
  @{ id = 'ovonic-6s';       q = 'Ovonic 6S lipo' },
  @{ id = 'skystars-koko';   q = 'Skystars 1404 motor' },
  @{ id = 'sequre-blueson';  q = 'Sequre Blueson ESC' },
  @{ id = 'frame-3inch';     q = '3 inch racing frame kit' }
)

Write-Host "=== KNOWN PAGES ==="
foreach ($k in $known) {
  $h = Get-Text $k.url
  if (-not $h) { Write-Host ("FAIL {0}" -f $k.id); continue }
  $img = Get-ProductImage $h $k.url
  $saved = Save-Image $img $k.id
  Write-Host ("{0,-16} {1,-22} {2}" -f $k.id, $(if ($saved) { $saved } else { 'NO IMAGE' }), (Get-Title $h))
  Start-Sleep -Milliseconds 400
}

Write-Host "`n=== SEARCH QUERIES ==="
foreach ($q in $queries) {
  $page = Find-MantisProduct $q.q
  if (-not $page) { Write-Host ("{0,-16} NO PAGE" -f $q.id); Start-Sleep -Milliseconds 400; continue }
  $h = Get-Text $page
  if (-not $h) { Write-Host ("{0,-16} PAGE UNREACHABLE {1}" -f $q.id, $page); continue }
  $img = Get-ProductImage $h $page
  $saved = Save-Image $img $q.id
  Write-Host ("{0,-16} {1,-22} {2}" -f $q.id, $(if ($saved) { $saved } else { 'NO IMAGE' }), (Get-Title $h))
  Write-Host ("                 {0}" -f $page)
  Start-Sleep -Milliseconds 500
}
