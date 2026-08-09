# Collects wiring/pinout diagrams: downloads known direct image URLs and scrapes
# vendor pages for images whose filenames indicate a wiring diagram.

$ErrorActionPreference = 'Continue'
$UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
$root = Split-Path -Parent $PSScriptRoot
$wireDir = Join-Path $root 'assets\builds\wiring'
New-Item -ItemType Directory -Force -Path $wireDir | Out-Null

function Get-Text([string]$url) {
  try { return ((& curl.exe -s -L --max-time 25 -A $UA $url 2>$null) -join "`n") } catch { return $null }
}

function Save-Url([string]$url, [string]$name, [int]$minBytes = 8000) {
  if (-not $url) { return $false }
  $ext = 'jpg'
  $m = [regex]::Match($url, '(?i)\.(jpe?g|png|webp|pdf)(\?|$)')
  if ($m.Success) { $ext = $m.Groups[1].Value.ToLower() -replace 'jpeg', 'jpg' }
  $out = Join-Path $wireDir "$name.$ext"
  & curl.exe -s -L --max-time 40 -A $UA -e 'https://www.google.com/' -o $out $url 2>$null
  if ((Test-Path $out) -and (Get-Item $out).Length -gt $minBytes) {
    Write-Host ("  SAVED {0}  {1} KB" -f (Split-Path $out -Leaf), [int]((Get-Item $out).Length / 1KB))
    return $true
  }
  if (Test-Path $out) { Remove-Item $out -Force }
  Write-Host ("  fail  {0}  <- {1}" -f $name, $url)
  return $false
}

Write-Host "=== KNOWN DIRECT DIAGRAM URLS ==="
$direct = @(
  @{ name = 'speedybee-f405-aio-wiring'; url = 'https://ardupilot.org/copter/_images/SpeedyBeeF405AIO_Pinout.png' },
  @{ name = 'speedybee-f405-aio-manual'; url = 'https://spcdn.speedybee.cn/cdn/58507926851031040.pdf' },
  @{ name = 'iflight-borg-wiring';       url = 'https://www.rotorama.cz/assets/docs/48e151f056ef27050de81d9c1da6bb13/26554-1/be17428-iflight-borg-5s-rx-fc-wiring-diagram-20250429.pdf' },
  @{ name = 'hdzero-vtx-manual';         url = 'https://m.xcopter.com/download/HDZero_VTX_UserManual_v0.7.pdf' }
)
foreach ($d in $direct) { Save-Url $d.url $d.name | Out-Null }

Write-Host "`n=== SCRAPE PAGES FOR WIRING IMAGES ==="
$scrape = @(
  @{ name = 'iflight-borg';   url = 'https://shop.iflight.com/Borg-5S-RX-Flight-Controller-Pro2267' },
  @{ name = 'air75';          url = 'https://betafpv.com/products/air75-ii-brushless-whoop-quadcopter' },
  @{ name = 'matrix-aio';     url = 'https://betafpv.com/products/matrix-aio-brushless-flight-controller' },
  @{ name = 'hdzero-install'; url = 'https://docs.hd-zero.com/vtx-installation' },
  @{ name = 'hdzero-nano90';  url = 'https://docs.hd-zero.com/nano-90' },
  @{ name = 'diatone-help';   url = 'https://www.diatone.us/apps/help-center' },
  @{ name = 'tmotor-f66a';    url = 'https://store.tmotor.com/product/f66a-mini-esc-fpv.html' },
  @{ name = 'sequre-h743';    url = 'https://sequremall.com/products/sequre-h743-v2-flight-controller' }
)
foreach ($s in $scrape) {
  Write-Host "`n--- $($s.name)  $($s.url)"
  $h = Get-Text $s.url
  if (-not $h) { Write-Host "   page unreachable"; continue }
  Write-Host "   page len $($h.Length)"
  $hits = [regex]::Matches($h, '(?i)(?:https?:)?//[^"''\s\\)]+(?:wir|pinout|pin-out|diagram|connect|schema)[^"''\s\\)]*\.(?:jpg|jpeg|png|webp|pdf)') |
  ForEach-Object { $_.Value } | Sort-Object -Unique
  $rel = [regex]::Matches($h, '(?i)"(/[^"]*(?:wir|pinout|diagram|connect|schema)[^"]*\.(?:jpg|jpeg|png|webp|pdf))"') |
  ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique
  if ($hits.Count -eq 0 -and $rel.Count -eq 0) { Write-Host "   no wiring-named assets"; continue }
  foreach ($u in $hits) { Write-Host "   HIT $u" }
  foreach ($u in $rel) { Write-Host "   REL $u" }
}
