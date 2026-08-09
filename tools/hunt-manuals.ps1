# Scan candidate pages for direct PDF / manual / diagram file links.
$UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

$targets = [ordered]@{
  'radiomaster-gx12'  = @('https://www.radiomasterrc.com/products/gx12-radio-controller','https://www.radiomasterrc.com/pages/download')
  'radiomaster-tx15'  = @('https://www.radiomasterrc.com/products/tx15-radio-controller','https://www.radiomasterrc.com/collections/manuals')
  'hdzero-goggles2'   = @('https://docs.hd-zero.com/','https://docs.hd-zero.com/goggle2.html','https://www.hd-zero.com/')
  'hglrc-wind5-v2'    = @('https://www.hglrc.com/products/hglrc-wind5-lite-v2-frame-kit-for-racing')
  'tmotor-velox-2207' = @('https://store.tmotor.com/product/velox-veloce-series-v2207-v3-fpv-motor.html','https://uav-en.tmotor.com/')
  'iflight-xing-e'    = @('https://shop.iflight.com/xing-e-pro-2207-fpv-nextgen-motor-pro1988')
  'rcinpower-evo'     = @('https://www.rcinpower.com/products/gts-v4-evo-1102','https://rcinpower.com/')
  'betafpv-air75ii'   = @('https://betafpv.com/products/air75-ii-freestyle-brushless-whoop-quadcopter','https://support.betafpv.com/hc/en-us')
  'lumenier-qavs2'    = @('https://www.getfpv.com/lumenier-qav-s-2-freestyle-quadcopter-frame-joshua-bardwell-edition.html')
  'bms-js2'           = @('https://bmsracingfpv.com/','https://www.mantisfpv.com.au/?post_type=product&s=bms+racing')
  'truerc-xair'       = @('https://www.truerc.ca/products/x-air-5-8-mk-ii')
  'foxeer-lollipop'   = @('https://www.foxeer.com/foxeer-lollipop-4-plus-5-8g-antenna-g-378')
}

foreach ($k in $targets.Keys) {
  Write-Host "=== $k" -ForegroundColor Cyan
  foreach ($url in $targets[$k]) {
    $html = $null
    try { $html = (& curl.exe -s -L --max-time 25 -A $UA $url) -join "`n" } catch {}
    if (-not $html) { Write-Host "   [dead] $url"; continue }
    Write-Host ("   [{0} bytes] {1}" -f $html.Length, $url)
    $hits = [regex]::Matches($html, '(?i)(?:https?:)?//[^"''\s\\)<>]+\.(?:pdf|png|jpe?g|webp)') |
      ForEach-Object { ($_.Value -split '\?')[0] } |
      Where-Object { $_ -match '(?i)manual|wiring|diagram|pinout|instruction|guide|assembl|spec|datasheet|user' } |
      Sort-Object -Unique
    foreach ($h in $hits) { Write-Host "      $h" -ForegroundColor Green }
  }
}
