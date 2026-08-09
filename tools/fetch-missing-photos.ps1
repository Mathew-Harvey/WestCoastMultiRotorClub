# Downloads one product photo per named component from its store page.
# Shopify: uses /products/<handle>.js featured_image. WooCommerce: uses og:image.
# Sends a Referer matching the store because several CDNs reject bare image requests.

$ErrorActionPreference = 'Continue'
$UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
$dest = Join-Path (Split-Path -Parent $PSScriptRoot) 'assets\builds'

$targets = [ordered]@{
  'supernova-1404'    = 'https://phaserfpv.com.au/products/rcinpower-aos-supernova-1404-4000kv-motor'
  'hqprop-3x3x3'      = 'https://phaserfpv.com.au/products/hq-prop-t3x3x3-propellers'
  'rcinpower-evo'     = 'https://phaserfpv.com.au/products/rcinpower-evo-0702-motors'
  'tmotor-f40-pro-v'  = 'https://buzzfpv.com.au/products/t-motor-f40-pro-v-2306-1950kv-2150kv-motor'
  'dinogy-1300-6s'    = 'https://buzzfpv.com.au/products/dinogy-platinum-graphene-2-0-6s-1300mah-130c-version-2'
  'cnhl-speedypizza'  = 'https://buzzfpv.com.au/products/cnhl-speedy-pizza-drones-1200mah-22-2v-6s-100c-lipo-battery-xt60'
  'tattu-rline-v5'    = 'https://buzzfpv.com.au/products/tattu-r-line-version-5-0-1200mah-22-2v-150c-6s1p-lipo-battery-pack-with-xt60-plug'
  'hdzero-goggles-2'  = 'https://www.mantisfpv.com.au/hdzero-fpv-goggles-v2-hdz3520/'
  'bms-js3-tiger'     = 'https://www.mantisfpv.com.au/bms-racing-js-3-tiger-5-racing-frame-kit/'
  'vci-2207lt'        = 'https://www.mantisfpv.com.au/vci-lt-racing-motor-2207-2160kv-fire/'
  'racing-x-3inch'    = 'https://www.mantisfpv.com.au/five33-tinytrainer-3-frame-kit-v1-with-canopy/'
}

function Get-ImageUrl([string]$page) {
  if ($page -match '^https://([^/]+)/products/([a-z0-9\-]+)$') {
    $j = (& curl.exe -s -L --max-time 25 -A $UA "https://$($matches[1])/products/$($matches[2]).js") -join "`n"
    if ($j -match '"featured_image":"(.*?)"') {
      $u = $matches[1] -replace '\\/', '/'
      if ($u -like '//*') { $u = 'https:' + $u }
      return ($u -split '\?')[0]
    }
  }
  $h = (& curl.exe -s -L --max-time 25 -A $UA $page) -join "`n"
  $m = [regex]::Match($h, 'property="og:image"[^>]*content="([^"]+)"')
  if (-not $m.Success) { $m = [regex]::Match($h, 'content="([^"]+)"[^>]*property="og:image"') }
  if ($m.Success) { return ($m.Groups[1].Value -split '\?')[0] }
  return ''
}

foreach ($name in $targets.Keys) {
  $page = $targets[$name]
  $img = Get-ImageUrl $page
  if (-not $img) { Write-Host "  NO IMAGE  $name"; continue }
  $ext = [System.IO.Path]::GetExtension(($img -split '\?')[0])
  if ($ext -notmatch '^\.(jpg|jpeg|png|webp|avif)$') { $ext = '.jpg' }
  $file = Join-Path $dest ($name + $ext)
  $referer = ($page -split '/products/')[0]
  & curl.exe -s -L --max-time 40 -A $UA -e $referer -o $file $img 2>$null
  if (Test-Path $file) {
    $len = (Get-Item $file).Length
    if ($len -lt 3000) { Remove-Item $file -Force; Write-Host ("  TOO SMALL {0}  <- {1}" -f $name, $img) }
    else { Write-Host ("  ok  {0,-18} {1,8} bytes  {2}" -f $name, $len, (Split-Path $file -Leaf)) }
  }
  else { Write-Host "  FAIL      $name  <- $img" }
  Start-Sleep -Milliseconds 400
}
