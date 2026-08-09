# Lists candidate AU-store products (title + url + image) for each component so matches can be verified.
param([string]$Batch = 'all')

$ErrorActionPreference = 'Continue'
$UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

# Shopify-powered AU stores expose a predictive-search JSON endpoint
$shops = @(
  @{ name = 'phaser'; base = 'https://phaserfpv.com.au' },
  @{ name = 'buzz';   base = 'https://buzzfpv.com.au' }
)

function Get-Text([string]$url) {
  try { return ((& curl.exe -s -L --max-time 20 -A $UA $url 2>$null) -join "`n") } catch { return $null }
}

function Search-Shopify([string]$base, [string]$q) {
  $url = "$base/search/suggest.json?q=" + [uri]::EscapeDataString($q) + "&resources[type]=product&resources[limit]=4"
  $raw = Get-Text $url
  if (-not $raw) { return @() }
  try { $j = $raw | ConvertFrom-Json } catch { return @() }
  $out = @()
  foreach ($p in $j.resources.results.products) {
    $out += [pscustomobject]@{
      title = $p.title
      url   = $base + $p.url
      image = $p.image
      avail = $p.available
    }
  }
  return $out
}

function Search-Mantis([string]$q) {
  $h = Get-Text ("https://www.mantisfpv.com.au/?post_type=product&s=" + [uri]::EscapeDataString($q))
  if (-not $h) { return @() }
  $out = @()
  # product cards carry a title attribute alongside the permalink
  $ms = [regex]::Matches($h, '(?is)<h2[^>]*class="[^"]*woocommerce-loop-product__title[^"]*"[^>]*>(.*?)</h2>')
  $links = [regex]::Matches($h, '(?i)<a href="(https://www\.mantisfpv\.com\.au/[a-z0-9\-]{6,}/)"[^>]*class="[^"]*woocommerce-LoopProduct-link')
  for ($i = 0; $i -lt [Math]::Min(4, $ms.Count); $i++) {
    $title = ($ms[$i].Groups[1].Value -replace '<[^>]+>', '').Trim()
    $u = if ($i -lt $links.Count) { $links[$i].Groups[1].Value } else { '' }
    $out += [pscustomobject]@{ title = $title; url = $u; image = ''; avail = '' }
  }
  if ($out.Count -eq 0) {
    # fall back to raw permalinks when markup differs
    $cands = [regex]::Matches($h, 'https://www\.mantisfpv\.com\.au/([a-z0-9\-]{10,})/') | ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique
    foreach ($c in ($cands | Select-Object -First 6)) {
      $out += [pscustomobject]@{ title = "(slug) $c"; url = "https://www.mantisfpv.com.au/$c/"; image = ''; avail = '' }
    }
  }
  return $out
}

$batch1 = @(
  @{ id = 'jhemcu-f405';     q = 'JHEMCU F405 AIO' },
  @{ id = 'tmotor-mini-f7';  q = 'T-Motor Mini F7' },
  @{ id = 'bms-js2';         q = 'BMS Racing JS-2' },
  @{ id = 'matrix-ii-aio';   q = 'BetaFPV Matrix AIO' },
  @{ id = 'hdzero-goggles';  q = 'HDZero Goggle' },
  @{ id = 'qav-s2';          q = 'QAV-S frame' },
  @{ id = 'frame-3inch';     q = '3 inch racing frame' },
  @{ id = 'sequre-blueson';  q = 'Sequre Blueson ESC' },
  @{ id = 'foxeer-h7-mini';  q = 'Foxeer H7 Mini' }
)

$batch2 = @(
  @{ id = 'supernova-1404';  q = 'Supernova 1404' },
  @{ id = 'skystars-koko';   q = 'Skystars KOKO 1404' },
  @{ id = 'xilo-stealth';    q = 'Xilo Stealth 2207' },
  @{ id = 'tmotor-f40';      q = 'F40 Pro 2306' },
  @{ id = 'kd2207';          q = 'KD 2207 LT' },
  @{ id = 'rcinpower-evo';   q = 'RCinPower EVO 1102' },
  @{ id = 'hq-3030';         q = 'HQProp 3x3x3' },
  @{ id = 'gemfan-5127';     q = 'Gemfan Hurricane 51277' },
  @{ id = 'dinogy';          q = 'Dinogy graphene 6S 1300' },
  @{ id = 'tattu-v5';        q = 'Tattu R-Line 1050' },
  @{ id = 'cnhl-6s';         q = 'CNHL 6S 1300' },
  @{ id = 'matchstick';      q = 'Matchstick antenna RHCP' },
  @{ id = 'truerc-xair';     q = 'X-Air MK II RHCP' },
  @{ id = 'foxeer-lollipop'; q = 'Foxeer Micro Lollipop' },
  @{ id = 'lava-1s';         q = 'Lava 1S 550mah' }
)

$targets = switch ($Batch) {
  '1' { $batch1 }
  '2' { $batch2 }
  default { $batch1 + $batch2 }
}

foreach ($t in $targets) {
  Write-Host "`n### $($t.id)  <-- '$($t.q)'"
  foreach ($s in $shops) {
    foreach ($r in (Search-Shopify $s.base $t.q)) {
      $flag = if ($r.avail -eq $false) { ' [OOS]' } else { '' }
      Write-Host ("  {0,-7} {1}{2}" -f $s.name, $r.title, $flag)
      Write-Host ("          {0}" -f $r.url)
      if ($r.image) { Write-Host ("          IMG {0}" -f $r.image) }
    }
    Start-Sleep -Milliseconds 250
  }
  foreach ($r in (Search-Mantis $t.q)) {
    Write-Host ("  {0,-7} {1}" -f 'mantis', $r.title)
    Write-Host ("          {0}" -f $r.url)
  }
  Start-Sleep -Milliseconds 400
}
