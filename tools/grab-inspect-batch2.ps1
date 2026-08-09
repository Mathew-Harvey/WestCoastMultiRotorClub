# Downloads the largest images from vendor pages that use generic CDN filenames,
# so wiring diagrams can be identified by eye.

$ErrorActionPreference = 'Continue'
$UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
$inspect = Join-Path $PSScriptRoot 'inspect'
New-Item -ItemType Directory -Force -Path $inspect | Out-Null

function Get-Text([string]$url) {
  try { return ((& curl.exe -s -L --max-time 25 -A $UA $url 2>$null) -join "`n") } catch { return $null }
}

$sources = @(
  @{ id = 'borg';        url = 'https://shop.iflight.com/Borg-5S-RX-Flight-Controller-Pro2267' },
  @{ id = 'matrixaio';   url = 'https://betafpv.com/products/matrix-aio-brushless-flight-controller' },
  @{ id = 'sequreh743';  url = 'https://sequremall.com/products/sequre-h743-v2-flight-controller' },
  @{ id = 'nano90';      url = 'https://www.mantisfpv.com.au/hdzero-runcam-nano-90-camera-v2-hdz3292/' },
  @{ id = 'freestyle2';  url = 'https://phaserfpv.com.au/products/hdzero-freestyle-v2-vtx' }
)

foreach ($s in $sources) {
  $h = Get-Text $s.url
  if (-not $h) { Write-Host "FAIL $($s.id)"; continue }
  $imgs = [regex]::Matches($h, '(?i)(?:https?:)?//[^"''\s\\)]+\.(?:jpg|jpeg|png|webp)') |
  ForEach-Object {
    $u = $_.Value
    if ($u -notmatch '^https?:') { $u = 'https:' + $u }
    $u -replace '(?<!:)//upload', '/upload'
  } | Sort-Object -Unique

  $full = $imgs | Where-Object {
    $_ -notmatch '(?i)logo|icon|favicon|placeholder|avatar|flag|payment|badge|sprite|loading|map-of-mantisfpv' -and
    $_ -notmatch '(?i)_(?:32|48|64|80|100|120|160|200)x' -and
    $_ -notmatch '(?i)\b(?:50|60|75|100|120|150)x(?:50|60|75|100|120|150)\b'
  }
  Write-Host "`n### $($s.id): $($full.Count) candidates"
  $i = 0
  foreach ($u in $full) {
    $i++
    if ($i -gt 16) { break }
    $ext = 'jpg'
    $m = [regex]::Match($u, '(?i)\.(jpe?g|png|webp)(\?|$)')
    if ($m.Success) { $ext = $m.Groups[1].Value.ToLower() -replace 'jpeg', 'jpg' }
    $out = Join-Path $inspect ("{0}-{1:d2}.{2}" -f $s.id, $i, $ext)
    & curl.exe -s -L --max-time 30 -A $UA -e $s.url -o $out $u 2>$null
    if ((Test-Path $out) -and (Get-Item $out).Length -gt 20000) {
      Write-Host ("  {0}  {1} KB" -f (Split-Path $out -Leaf), [int]((Get-Item $out).Length / 1KB))
    }
    elseif (Test-Path $out) { Remove-Item $out -Force }
  }
}
