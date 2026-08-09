# Remaining components. Next FPV is an Australian Shopify store and carries the exact
# JHEMCU AIO and Tattu R-Line V5 1050mAh 6S. The last three have no AU stockist, so the
# photo comes from the overseas retailer the buy button points at.

$ErrorActionPreference = 'Continue'
$UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
$dest = Join-Path (Split-Path -Parent $PSScriptRoot) 'assets\builds'

$targets = [ordered]@{
  'jhemcu-f405-aio'    = 'https://www.nextfpv.com/products/jhemcu-updated-ghf405-hd-aio-f4-osd-flight-controller-and-built-in-40a-bluejay-2-6s-4in1-esc'
  'tattu-v5-1050-6s'   = 'https://www.nextfpv.com/products/tattu-r-line-version-5-0-1050mah-6s-22-2v-150c-lipo-battery-pack-with-xt60-plug'
  'xilo-stealth-2207'  = 'https://www.racedayquads.com/products/xilo-stealth-2207-motor-1800kv-2450kv'
  'lumenier-qav-s2-jb' = 'https://www.racedayquads.com/products/lumenier-qav-s-2-joshua-bardwell-se-5-frame-kit'
  'skystars-koko-1404' = 'https://pyrodrone.com/products/skystars-1404-brushless-motor-for-2-5-inch-to-4-inch-lighweight-drones-4s-3800kv-2-pcs'
}

foreach ($name in $targets.Keys) {
  $page = $targets[$name]
  $parts = $page -split '/products/'
  $j = (& curl.exe -s -L --max-time 25 -A $UA "$($parts[0])/products/$($parts[1]).js") -join "`n"
  $img = ''
  if ($j -match '"featured_image":"(.*?)"') { $img = $matches[1] -replace '\\/', '/' }
  if (-not $img) {
    $h = (& curl.exe -s -L --max-time 25 -A $UA $page) -join "`n"
    $img = [regex]::Match($h, 'property="og:image"[^>]*content="([^"]+)"').Groups[1].Value
  }
  if (-not $img) { Write-Host "  NO IMAGE $name"; continue }
  if ($img -like '//*') { $img = 'https:' + $img }
  $img = ($img -split '\?')[0]

  $ext = [System.IO.Path]::GetExtension($img)
  if ($ext -notmatch '^\.(jpg|jpeg|png|webp|avif)$') { $ext = '.jpg' }
  $file = Join-Path $dest ($name + $ext)
  & curl.exe -s -L --max-time 40 -A $UA -e $parts[0] -o $file $img 2>$null
  if ((Test-Path $file) -and (Get-Item $file).Length -gt 3000) {
    Write-Host ("  ok  {0,-20} {1,8} bytes  {2}" -f $name, (Get-Item $file).Length, (Split-Path $file -Leaf))
  }
  else {
    if (Test-Path $file) { Remove-Item $file -Force }
    Write-Host "  FAIL $name  <- $img"
  }
  Start-Sleep -Milliseconds 400
}
