# RaceDayQuads product pages carry a "Wiring Diagram" block whose images live under
# /s/files/ (rather than /s/products/). Pull those for visual review.

$ErrorActionPreference = 'Continue'
$UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
$inspect = Join-Path (Split-Path -Parent $PSScriptRoot) 'assets\builds\inspect'

$pages = [ordered]@{
  'tmotor-mini-f7'  = 'https://www.racedayquads.com/products/t-motor-mini-f7-hd-20x20-flight-controller-w-vtx-switch-mpu6000'
  'tmotor-f66a'     = 'https://www.racedayquads.com/products/t-motor-f66a-32bit-66a-3-6s-20x20-4in1-esc'
  'betafpv-matrix'  = 'https://www.racedayquads.com/products/betafpv-matrix-v2-aio-g4-fc-12a-1s-esc-400mw-vtx-elrs-solder-required'
  'foxeer-predator' = 'https://www.racedayquads.com/products/foxeer-predator-6-micro-fpv-camera-1000tvl-super-wdr'
}

foreach ($name in $pages.Keys) {
  $page = $pages[$name]
  $h = (& curl.exe -s -L --max-time 30 -A $UA $page) -join "`n"
  $urls = [regex]::Matches($h, 'cdn\.shopify\.com/s/files/[^"''\\ )]+\.(?:png|jpg|jpeg|webp)') |
  ForEach-Object { 'https://' + ($_.Value -split '\?')[0] } | Sort-Object -Unique
  $dir = Join-Path $inspect $name
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
  Write-Host ("`n{0}  (page {1} bytes, {2} file images)" -f $name, $h.Length, $urls.Count)
  $i = 0
  foreach ($u in $urls) {
    $i++
    $ext = [System.IO.Path]::GetExtension(($u -split '\?')[0]); if ($ext -notmatch '^\.(jpg|jpeg|png|webp)$') { $ext = '.jpg' }
    $file = Join-Path $dir ("{0:d2}{1}" -f $i, $ext)
    & curl.exe -s -L --max-time 30 -A $UA -e 'https://www.racedayquads.com/' -o $file $u 2>$null
    if ((Test-Path $file) -and (Get-Item $file).Length -gt 8000) {
      Write-Host ("   {0}  {1,8}  {2}" -f (Split-Path $file -Leaf), (Get-Item $file).Length, (Split-Path $u -Leaf))
    }
    elseif (Test-Path $file) { Remove-Item $file -Force }
  }
}
