# Dumps every gallery image from the given product pages into assets/builds/inspect/<name>/
# so each can be viewed and the genuine wiring/pinout diagrams picked out by eye.
# Shopify exposes the whole gallery via /products/<handle>.js; WooCommerce needs page scraping.

$ErrorActionPreference = 'Continue'
$UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
$root = Split-Path -Parent $PSScriptRoot
$inspect = Join-Path $root 'assets\builds\inspect'

$pages = [ordered]@{
  'mamba-f722-mini'   = 'https://buzzfpv.com.au/products/diatone-mamba-stack-mk4-f722-mini-f7-flight-controller-f40-128k-3-6s-40a-esc-20x20mm'
  'tmotor-mini-f7'    = 'https://buzzfpv.com.au/products/tmotor-mini-f7-mpu6000'
  'tmotor-f66a'       = 'https://www.mantisfpv.com.au/t-motor-f66a-mini-3-6s-bl32-4in1-esc-20x20mm/'
  'sequre-blueson-a1' = 'https://www.mantisfpv.com.au/sequre-blueson-a1-8s-70a-am32-4in1-esc-20x20/'
  'betafpv-c03'       = 'https://www.mantisfpv.com.au/betafpv-c03-fpv-camera/'
  'foxeer-predator'   = 'https://www.mantisfpv.com.au/foxeer-predator-nano-v5-m8-1000tvl-1-7mm-fpv-camera-hs1250/'
  'betafpv-air75-ii'  = 'https://www.mantisfpv.com.au/betafpv-air75-ii-racing-brushless-whoop-quadcopter-elrs-analog/'
}

function Get-Gallery([string]$page) {
  if ($page -match '/products/') {
    $parts = $page -split '/products/'
    $j = (& curl.exe -s -L --max-time 25 -A $UA "$($parts[0])/products/$($parts[1]).js") -join "`n"
    $m = [regex]::Match($j, '"images":\[(.*?)\]')
    if ($m.Success) {
      return [regex]::Matches($m.Groups[1].Value, '"(.*?)"') | ForEach-Object {
        $u = $_.Groups[1].Value -replace '\\/', '/'
        if ($u -like '//*') { $u = 'https:' + $u }
        ($u -split '\?')[0]
      }
    }
  }
  $h = (& curl.exe -s -L --max-time 25 -A $UA $page) -join "`n"
  return [regex]::Matches($h, '(?:data-src|data-large_image|src)="(https://[^"]+wp-content/uploads/[^"?]+\.(?:jpg|jpeg|png|webp))"') |
  ForEach-Object { $_.Groups[1].Value -replace '-\d+x\d+(\.(?:jpg|jpeg|png|webp))$', '$1' } |
  Sort-Object -Unique
}

foreach ($name in $pages.Keys) {
  $page = $pages[$name]
  $dir = Join-Path $inspect $name
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
  $imgs = @(Get-Gallery $page)
  Write-Host ("`n{0}: {1} images" -f $name, $imgs.Count)
  $i = 0
  foreach ($u in $imgs) {
    $i++
    $ext = [System.IO.Path]::GetExtension($u); if ($ext -notmatch '^\.(jpg|jpeg|png|webp)$') { $ext = '.jpg' }
    $file = Join-Path $dir ("{0:d2}{1}" -f $i, $ext)
    foreach ($cand in @($u, ($u -replace 'cdn\d*\.mantisfpv\.com\.au', 'www.mantisfpv.com.au'))) {
      & curl.exe -s -L --max-time 30 -A $UA -e $page -o $file $cand 2>$null
      if ((Test-Path $file) -and (Get-Item $file).Length -gt 5000) { break }
      if (Test-Path $file) { Remove-Item $file -Force }
    }
    if (Test-Path $file) { Write-Host ("   {0}  {1,8}  {2}" -f (Split-Path $file -Leaf), (Get-Item $file).Length, (Split-Path $u -Leaf)) }
  }
}
