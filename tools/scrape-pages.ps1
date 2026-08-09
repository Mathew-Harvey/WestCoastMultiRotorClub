# Scrapes known product pages for (a) the product photo and (b) any wiring/pinout diagram image.
# Product photos -> assets/builds/<id>.<ext>
# Diagrams       -> assets/builds/wiring/<id>-wiring.<ext>

$ErrorActionPreference = 'Continue'
$UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
$root = Split-Path -Parent $PSScriptRoot
$imgDir = Join-Path $root 'assets\builds'
$wireDir = Join-Path $imgDir 'wiring'
New-Item -ItemType Directory -Force -Path $imgDir, $wireDir | Out-Null

function Get-Text([string]$url) {
  try { return ((& curl.exe -s -L --max-time 25 -A $UA $url 2>$null) -join "`n") } catch { return $null }
}

function Save-Url([string]$url, [string]$dir, [string]$name) {
  if (-not $url) { return $null }
  $ext = 'jpg'
  $m = [regex]::Match($url, '(?i)\.(jpe?g|png|webp)(\?|$)')
  if ($m.Success) { $ext = $m.Groups[1].Value.ToLower() -replace 'jpeg', 'jpg' }
  $out = Join-Path $dir "$name.$ext"
  & curl.exe -s -L --max-time 30 -A $UA -o $out $url 2>$null
  if ((Test-Path $out) -and (Get-Item $out).Length -gt 4000) { return (Split-Path $out -Leaf) }
  if (Test-Path $out) { Remove-Item $out -Force }
  return $null
}

# id -> product page (verified reachable earlier)
$pages = @(
  @{ id = 'speedybee-f405-aio'; url = 'https://www.mantisfpv.com.au/speedybee-f405-aio-40a-bluejay-25-5x25-5-3-6s-flight-controller/' },
  @{ id = 'hdzero-race-v3';     url = 'https://www.mantisfpv.com.au/hdzero-race-v3-digital-video-transmitter/' },
  @{ id = 'hdzero-nano90';      url = 'https://www.mantisfpv.com.au/hdzero-runcam-nano-90-camera-v2-hdz3292/' },
  @{ id = 'elrs-ep2';           url = 'https://www.mantisfpv.com.au/happymodel-2-4-elrs-ep2-tcxo-receiver/' },
  @{ id = 'elrs-ep1';           url = 'https://www.mantisfpv.com.au/happymodel-2-4-elrs-ep1-diversity-tcxo-receiver/' },
  @{ id = 'tmotor-f66a';        url = 'https://www.mantisfpv.com.au/t-motor-f66a-mini-3-6s-bl32-4in1-esc-20x20mm/' },
  @{ id = 'iflight-borg';       url = 'https://www.mantisfpv.com.au/iflight-borg-5s-rx-flight-controller/' },
  @{ id = 'foxeer-caesar';      url = 'https://www.mantisfpv.com.au/foxeer-caesar-v2-pro-5-t700-racing-frame-hdzero/' },
  @{ id = 'air75';              url = 'https://www.mantisfpv.com.au/betafpv-air75-ii-racing-brushless-whoop-quadcopter-elrs-analog/' },
  @{ id = 'c03-camera';         url = 'https://www.mantisfpv.com.au/betafpv-c03-fpv-camera/' },
  @{ id = 'lava-1s';            url = 'https://www.mantisfpv.com.au/betafpv-lava-series-ii-1s-280mah-95c-bt2-0-a30-battery-5-pack/' },
  @{ id = 'gemfan-1614';        url = 'https://www.mantisfpv.com.au/gemfan-1614-40mm-micro-whoop-3-blade-propeller-1mm-set-of-8/' },
  @{ id = 'gemfan-5-racing';    url = 'https://www.mantisfpv.com.au/gemfan-hurricane-51433-durable-3-blade-set-of-4/' },
  @{ id = 'xing-e-pro';         url = 'https://www.mantisfpv.com.au/iflight-xing-e-pro-2207-1800kv-motor/' },
  @{ id = 'foxeer-predator';    url = 'https://www.mantisfpv.com.au/foxeer-predator-nano-v5-m8-1000tvl-1-7mm-fpv-camera-hs1250/' },
  @{ id = 'foxeer-lollipop';    url = 'https://www.mantisfpv.com.au/foxeer-5-8g-lollipop-4-stubby-omni-2-6dbi-fpv-antenna-2pcs-lhcp-rhcp/' },
  @{ id = 'matchstick';         url = 'https://www.mantisfpv.com.au/truerc-matchstick-5-8-carbon-antenna-lhcp-rp-sma-extra-long-200mm/' },
  @{ id = 'truerc-xair';        url = 'https://www.mantisfpv.com.au/truerc-x-air-5-8-mk-ii-combo-stubby-antenna-for-hdzero-goggles-lhcp/' },
  @{ id = 'bms-js3';            url = 'https://www.mantisfpv.com.au/bms-racing-js-3-tiger-5-racing-frame-kit/' },
  @{ id = 'foxeer-reaper';      url = 'https://phaserfpv.com.au/products/foxeer-mini-reaper-128k-45a-bl32-4in1-esc-20x20' },
  @{ id = 'hdzero-freestyle-v2'; url = 'https://phaserfpv.com.au/products/hdzero-freestyle-v2-vtx' },
  @{ id = 'hdzero-echo';        url = 'https://phaserfpv.com.au/products/hdzero-echo-antenna-kit' },
  @{ id = 'wind5-v2';           url = 'https://buzzfpv.com.au/products/hglrc-wind5-lite-v2-frame-kit-for-racing' },
  @{ id = 'mamba-f722';         url = 'https://buzzfpv.com.au/products/diatone-mamba-stack-mk4-f722-mini-f7-flight-controller-f40-128k-3-6s-40a-esc-20x20mm' }
)

foreach ($p in $pages) {
  $h = Get-Text $p.url
  if (-not $h) { Write-Host ("FAIL  {0,-20} page unreachable" -f $p.id); continue }

  $title = ''
  $tm = [regex]::Match($h, '(?i)property="og:title"[^>]*content="([^"]+)"')
  if ($tm.Success) { $title = $tm.Groups[1].Value }

  # product photo
  $og = ''
  $om = [regex]::Match($h, '(?i)property="og:image"[^>]*content="([^"]+)"')
  if (-not $om.Success) { $om = [regex]::Match($h, '(?i)content="([^"]+)"[^>]*property="og:image"') }
  if ($om.Success) { $og = $om.Groups[1].Value -replace '\\/', '/'; if ($og -notmatch '^https?:') { $og = 'https:' + $og } }

  $existing = Get-ChildItem $imgDir -Filter "$($p.id).*" -File -EA SilentlyContinue | Select-Object -First 1
  $photo = if ($existing) { "(kept) $($existing.Name)" } else { Save-Url $og $imgDir $p.id }

  # diagram candidates: filename keywords, excluding the site's store-location map
  $imgs = [regex]::Matches($h, '(?i)https?://[^"''\s\\)]+\.(?:jpg|jpeg|png|webp)') | ForEach-Object { $_.Value } | Sort-Object -Unique
  $diag = $imgs | Where-Object {
    $_ -match '(?i)wir|pinout|pin-out|diagram|connect|schema|layout|instruction' -and
    $_ -notmatch '(?i)map-of-mantisfpv' -and
    $_ -notmatch '(?i)-\d{2,3}x\d{2,3}\.'
  } | Select-Object -First 1

  $wire = if ($diag) { Save-Url $diag $wireDir "$($p.id)-wiring" } else { $null }

  if (-not $photo) { $photo = 'NONE' }
  if (-not $wire) { $wire = 'none' }
  Write-Host ("{0,-20} photo={1,-28} wiring={2}" -f $p.id, $photo, $wire)
  if ($title) { Write-Host ("   title: {0}" -f $title) }
  if ($diag) { Write-Host ("   diag : {0}" -f $diag) }
  Start-Sleep -Milliseconds 500
}
