# Pulls the full product gallery from Shopify's /products/<handle>.js (which includes the
# description/spec images that the rendered page loads lazily) and reports dimensions,
# because wiring diagrams are almost always the tall, text-heavy images in the set.

$ErrorActionPreference = 'Continue'
Add-Type -AssemblyName System.Drawing
$UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
$inspect = Join-Path (Split-Path -Parent $PSScriptRoot) 'assets\builds\inspect'

$handles = [ordered]@{
  'matrix-v2-gal'   = 'https://betafpv.com/products/matrix-v2-aio-brushless-flight-controller'
  'air75ii-gal'     = 'https://betafpv.com/products/air75-ii-brushless-whoop-quadcopter'
  'c03-gal'         = 'https://betafpv.com/products/c03-fpv-micro-camera'
  'blueson-gal'     = 'https://sequremall.com/products/sequre-blueson-a1-4in1-esc'
  'f66a-pyro-gal'   = 'https://pyrodrone.com/products/t-motor-f66a-mini-3-6s-blheli_32-4in1-esc-20x20mm'
  'minif7-pyro-gal' = 'https://pyrodrone.com/products/t-motor-f7-mini-hd-osd-vtx-switch-f722-3-6s-20x20mm'
  'nano90-gal'      = 'https://pyrodrone.com/products/hdzero-nano-90-fpv-camera'
  'predator-gal'    = 'https://pyrodrone.com/products/foxeer-predator-6-micro-fpv-camera'
}

foreach ($name in $handles.Keys) {
  $page = $handles[$name]
  $parts = $page -split '/products/'
  $j = (& curl.exe -s -L --max-time 30 -A $UA "$($parts[0])/products/$($parts[1]).js") -join "`n"
  if ($j -notmatch '"images"') { Write-Host ("`n########## {0}  -> no product json ({1})" -f $name, $page); continue }
  $imgs = [regex]::Matches(([regex]::Match($j, '"images":\[(.*?)\]')).Groups[1].Value, '"(.*?)"') |
  ForEach-Object { $u = $_.Groups[1].Value -replace '\\/', '/'; if ($u -like '//*') { $u = 'https:' + $u }; ($u -split '\?')[0] }
  $dir = Join-Path $inspect $name
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
  Write-Host ("`n########## {0}  ({1} gallery images)" -f $name, $imgs.Count)
  $i = 0
  foreach ($u in $imgs) {
    $i++
    $ext = [System.IO.Path]::GetExtension($u); if ($ext -notmatch '^\.(jpg|jpeg|png|webp)$') { $ext = '.jpg' }
    $file = Join-Path $dir ("{0:d2}{1}" -f $i, $ext)
    & curl.exe -s -L --max-time 30 -A $UA -e $parts[0] -o $file $u 2>$null
    if (-not (Test-Path $file)) { continue }
    $dim = '?'; $ratio = 0
    try { $im = [System.Drawing.Image]::FromFile($file); $dim = "$($im.Width)x$($im.Height)"; $ratio = [math]::Round($im.Height / $im.Width, 2); $im.Dispose() } catch {}
    Write-Host ("   {0}  {1,9}  {2,-12} ratio {3,-5}  {4}" -f (Split-Path $file -Leaf), (Get-Item $file).Length, $dim, $ratio, (Split-Path $u -Leaf))
  }
}
