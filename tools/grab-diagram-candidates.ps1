# Downloads every full-size image from pages that are likely to contain wiring/pinout diagrams,
# into tools/inspect/ so each can be visually checked before being used on the site.

$ErrorActionPreference = 'Continue'
$UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
$inspect = Join-Path $PSScriptRoot 'inspect'
New-Item -ItemType Directory -Force -Path $inspect | Out-Null

function Get-Text([string]$url) {
  try { return ((& curl.exe -s -L --max-time 25 -A $UA $url 2>$null) -join "`n") } catch { return $null }
}

$sources = @(
  @{ id = 'foxeer-h7-mini'; url = 'https://www.foxeer.com/foxeer-h7-mini-mpu6000-fc-8s-dual-bec-barometer-g-504' },
  @{ id = 'foxeer-reaper';  url = 'https://www.foxeer.com/foxeer-mini-reaper-128k-45a-bl32-4in1-esc-20-20-m3-mounting-holes-g-382' },
  @{ id = 'tmotor-f66a';    url = 'https://www.mantisfpv.com.au/t-motor-f66a-mini-3-6s-bl32-4in1-esc-20x20mm/' },
  @{ id = 'iflight-borg';   url = 'https://www.mantisfpv.com.au/iflight-borg-5s-rx-flight-controller/' },
  @{ id = 'speedybee-aio';  url = 'https://www.mantisfpv.com.au/speedybee-f405-aio-40a-bluejay-25-5x25-5-3-6s-flight-controller/' },
  @{ id = 'mamba-f722';     url = 'https://www.mantisfpv.com.au/?post_type=product&s=mamba+f722+mini' }
)

foreach ($s in $sources) {
  $h = Get-Text $s.url
  if (-not $h) { Write-Host "FAIL page $($s.id)"; continue }
  $imgs = [regex]::Matches($h, '(?i)https?://[^"''\s\\)]+\.(?:jpg|jpeg|png|webp)') | ForEach-Object { $_.Value -replace '(?<!:)//upload', '/upload' } | Sort-Object -Unique
  # drop obvious thumbnails, logos, icons and site chrome
  $full = $imgs | Where-Object {
    $_ -notmatch '(?i)\d{2,3}x\d{2,3}\.' -and
    $_ -notmatch '(?i)logo|icon|favicon|banner|map-of-mantisfpv|placeholder|avatar|flag|payment|badge'
  }
  Write-Host "`n### $($s.id): $($full.Count) full-size candidates"
  $i = 0
  foreach ($u in $full) {
    $i++
    if ($i -gt 12) { break }
    $ext = 'jpg'
    $m = [regex]::Match($u, '(?i)\.(jpe?g|png|webp)(\?|$)')
    if ($m.Success) { $ext = $m.Groups[1].Value.ToLower() -replace 'jpeg', 'jpg' }
    $out = Join-Path $inspect ("{0}-{1:d2}.{2}" -f $s.id, $i, $ext)
    & curl.exe -s -L --max-time 25 -A $UA -o $out $u 2>$null
    if ((Test-Path $out) -and (Get-Item $out).Length -gt 8000) {
      Write-Host ("  {0}  {1} KB  {2}" -f (Split-Path $out -Leaf), [int]((Get-Item $out).Length / 1KB), $u)
    }
    elseif (Test-Path $out) { Remove-Item $out -Force }
  }
}

# HDZero docs host diagrams as /media/imageNN.png
Write-Host "`n### hdzero docs media"
foreach ($d in @(
    @{ id = 'hdzero-race-v3'; nums = @(14, 15) },
    @{ id = 'hdzero-freestyle-v2'; nums = @(16, 17, 18, 19, 20) })) {
  foreach ($n in $d.nums) {
    $u = "https://docs.hd-zero.com/media/image$n.png"
    $out = Join-Path $inspect ("{0}-media{1}.png" -f $d.id, $n)
    & curl.exe -s -L --max-time 25 -A $UA -o $out $u 2>$null
    if ((Test-Path $out) -and (Get-Item $out).Length -gt 8000) {
      Write-Host ("  {0}  {1} KB" -f (Split-Path $out -Leaf), [int]((Get-Item $out).Length / 1KB))
    }
    elseif (Test-Path $out) { Remove-Item $out -Force; Write-Host "  (too small) image$n" }
  }
}

# Retry the HDZero Race V3 diagram that failed earlier
$u = 'https://cdn2.mantisfpv.com.au/wp-content/uploads/2023/07/hdzero-race-v3-digital-video-transmitter-mantisfpv-australia-product-showcase-diagram.jpg'
$out = Join-Path $inspect 'racev3-mantis-diagram.jpg'
& curl.exe -s -L --max-time 25 -A $UA -o $out $u 2>$null
if (Test-Path $out) { Write-Host ("`n  racev3-mantis-diagram.jpg {0} KB" -f [int]((Get-Item $out).Length / 1KB)) }
