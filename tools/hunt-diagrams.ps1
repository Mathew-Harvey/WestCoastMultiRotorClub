# Scans a list of candidate pages for any image or PDF whose URL hints at a wiring
# diagram / pinout / manual, and prints them grouped by component so each can be checked.

$ErrorActionPreference = 'Continue'
$UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
$kw = 'wiring|diagram|pinout|pin-?out|manual|connection|instruction|schematic|guide|specs?heet|datasheet|接线'

$targets = [ordered]@{
  'tmotor-mini-f7' = @(
    'https://tmotorhobby.com/goods-1019-T-Motor+20x20+MINI+F7+(HD+OSD+VTX+SWITCH)+FC.html',
    'https://store.tmotor.com/product/mini-f7-fc.html',
    'https://www.hobbyrc.co.uk/t-motor-mini-f7-hd-flight-controller-mpu6000-20mm',
    'https://www.unmannedtechshop.co.uk/product/t-motor-mini-f7-hd-flight-controller/'
  )
  'tmotor-f66a'    = @(
    'https://store.tmotor.com/product/f66a-mini-esc.html',
    'https://www.hobbyrc.co.uk/t-motor-f66a-mini-4in1-esc',
    'https://pyrodrone.com/products/t-motor-f66a-mini-3-6s-blheli_32-4in1-esc-20x20mm'
  )
  'betafpv-matrix' = @(
    'https://betafpv.com/products/matrix-v2-aio-brushless-flight-controller',
    'https://support.betafpv.com/hc/en-us/articles/25239419855385',
    'https://betafpv.com/products/air75-ii-brushless-whoop-quadcopter'
  )
  'sequre-blueson' = @(
    'https://sequremall.com/products/sequre-blueson-a1-4in1-esc',
    'https://sequremall.com/products/blueson-a1-70a-4in1-esc',
    'https://www.mantisfpv.com.au/sequre-blueson-a1-8s-70a-am32-4in1-esc-20x20/'
  )
  'foxeer-predator' = @(
    'https://www.foxeer.com/foxeer-predator-nano-v5-camera-g-457',
    'https://www.mantisfpv.com.au/foxeer-predator-nano-v5-m8-1000tvl-1-7mm-fpv-camera-hs1250/'
  )
  'betafpv-c03'    = @(
    'https://betafpv.com/products/c03-fpv-micro-camera',
    'https://support.betafpv.com/hc/en-us/articles/900004866583'
  )
  'hdzero-nano90'  = @(
    'https://docs.hd-zero.com/',
    'https://www.hd-zero.com/product-page/hdzero-nano-90-camera'
  )
}

foreach ($name in $targets.Keys) {
  Write-Host "`n########## $name ##########"
  foreach ($p in $targets[$name]) {
    $h = (& curl.exe -s -L --max-time 30 -A $UA $p) -join "`n"
    if (-not $h) { Write-Host ("  [dead] {0}" -f $p); continue }
    Write-Host ("  [{0,7} bytes] {1}" -f $h.Length, $p)
    $hits = [regex]::Matches($h, '(?i)(?:https?:)?//[^"''\s\\)]+\.(?:png|jpe?g|webp|pdf)') |
    ForEach-Object { $_.Value } |
    Where-Object { $_ -match "(?i)$kw" } | Sort-Object -Unique
    foreach ($u in $hits) { Write-Host ("      {0}" -f $u) }
    if (-not $hits) { Write-Host '      (no keyword asset)' }
  }
}
