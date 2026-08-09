# Downloads every reasonably large image from the given pages into
# assets/builds/inspect/<name>/ and reports pixel dimensions, so tall/wide
# infographic-shaped images (the usual shape of a wiring diagram) stand out.

$ErrorActionPreference = 'Continue'
Add-Type -AssemblyName System.Drawing
$UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
$inspect = Join-Path (Split-Path -Parent $PSScriptRoot) 'assets\builds\inspect'

$pages = [ordered]@{
  'matrix-v2'       = 'https://betafpv.com/products/matrix-v2-aio-brushless-flight-controller'
  'air75ii'         = 'https://betafpv.com/products/air75-ii-brushless-whoop-quadcopter'
  'blueson-a1'      = 'https://sequremall.com/products/sequre-blueson-a1-4in1-esc'
  'predator-mantis' = 'https://www.mantisfpv.com.au/foxeer-predator-nano-v5-m8-1000tvl-1-7mm-fpv-camera-hs1250/'
  'f66a-pyro'       = 'https://pyrodrone.com/products/t-motor-f66a-mini-3-6s-blheli_32-4in1-esc-20x20mm'
  'f7-tmotorhobby'  = 'https://tmotorhobby.com/goods-1019-T-Motor+20x20+MINI+F7+(HD+OSD+VTX+SWITCH)+FC.html'
}

foreach ($name in $pages.Keys) {
  $page = $pages[$name]
  $h = (& curl.exe -s -L --max-time 35 -A $UA $page) -join "`n"
  $base = ([uri]$page).Scheme + '://' + ([uri]$page).Host
  $urls = [regex]::Matches($h, '(?i)(?:https?:)?//[^"''\s\\)]+?\.(?:png|jpe?g|webp)') |
  ForEach-Object { $u = ($_.Value -split '\?')[0]; if ($u -like '//*') { 'https:' + $u } else { $u } } |
  Where-Object { $_ -notmatch '(?i)logo|icon|favicon|payment|badge|flag|avatar|sprite|placeholder' } |
  ForEach-Object { $_ -replace '_(\d+)x(\d+)?(_crop_center)?(\.(?:png|jpe?g|webp))$', '$4' } |
  Sort-Object -Unique
  $dir = Join-Path $inspect $name
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
  Write-Host ("`n########## {0}  ({1} candidates)" -f $name, $urls.Count)
  $i = 0
  foreach ($u in $urls) {
    $i++
    $ext = [System.IO.Path]::GetExtension($u); if ($ext -notmatch '^\.(jpg|jpeg|png|webp)$') { $ext = '.jpg' }
    $file = Join-Path $dir ("{0:d3}{1}" -f $i, $ext)
    foreach ($cand in @($u, ($u -replace 'cdn\d*\.mantisfpv\.com\.au', 'www.mantisfpv.com.au'))) {
      & curl.exe -s -L --max-time 25 -A $UA -e $base -o $file $cand 2>$null
      if ((Test-Path $file) -and (Get-Item $file).Length -gt 25000) { break }
      if (Test-Path $file) { Remove-Item $file -Force }
    }
    if (-not (Test-Path $file)) { continue }
    $dim = ''
    try { $im = [System.Drawing.Image]::FromFile($file); $dim = "$($im.Width)x$($im.Height)"; $ratio = [math]::Round($im.Height / $im.Width, 2); $im.Dispose() }
    catch { $dim = '?'; $ratio = 0 }
    Write-Host ("   {0}  {1,10}  {2,-12} ratio {3,-5}  {4}" -f (Split-Path $file -Leaf), (Get-Item $file).Length, $dim, $ratio, (Split-Path $u -Leaf))
  }
}
