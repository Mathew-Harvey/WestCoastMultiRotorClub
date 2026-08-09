# Round 2: probe specific candidate URLs, report status + any pdf/diagram assets found.
$UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

$targets = [ordered]@{
  'happymodel-ep1'   = @('https://www.happymodel.cn/index.php/2022/03/17/happymodel-2-4g-expresslrs-elrs-diversity-receiver-ep1-dual/','http://www.happymodel.cn/index.php/2021/06/07/happymodel-2-4g-expresslrs-elrs-nano-receiver-ep1-ep2/')
  'hdzero-goggle2'   = @('https://docs.hd-zero.com/goggle2.html','https://docs.hd-zero.com/goggle-2.html','https://www.hd-zero.com/product-page/hdzero-goggle-2')
  'hglrc-wind5'      = @('https://www.hglrc.com/pages/download','https://www.hglrc.com/pages/downloads','https://www.hglrc.com/search?q=wind5+manual')
  'tmotor-velox'     = @('https://store.tmotor.com/goods-1055-VELOX+V2207+V3.html','https://tmotorhobby.com/goods-1055-VELOX+V2207+V3.html','https://tmotorhobby.com/index.php?route=product/search&search=velox+v2207')
  'iflight-xinge'    = @('https://shop.iflight.com/motors-cat43/xing-e-pro-2207-fpv-nextgen-motor-pro1988','https://shop.iflight.com/index.php?route=product/search&search=xing-e+pro+2207')
  'rcinpower-evo'    = @('https://www.rcinpower.com/','https://rcinpower.com/products.html')
  'betafpv-air75ii'  = @('https://support.betafpv.com/hc/en-us/articles/air75-ii','https://betafpv.com/pages/manuals','https://betafpv.com/search?q=air75+ii+manual')
  'truerc-xair'      = @('https://www.truerc.ca/collections/5-8ghz-antennas','https://www.truerc.ca/search?q=x-air+5.8+mk+ii')
  'foxeer-lollipop'  = @('https://www.foxeer.com/foxeer-lollipop-micro-5-8g-antenna-g-201','https://www.foxeer.com/index.php?route=product/search&search=micro+lollipop')
  'lumenier-qavs2'   = @('https://www.lumenier.com/products/qav-s-2','https://www.getfpv.com/lumenier-qav-s-2-joshua-bardwell-signature-edition-freestyle-frame.html')
  'ovonic-safety'    = @('https://www.ovonicshop.com/pages/faq','https://www.ovonicshop.com/pages/lipo-battery-guide','https://www.ovonicshop.com/blogs/news')
}

foreach ($k in $targets.Keys) {
  Write-Host "=== $k" -ForegroundColor Cyan
  foreach ($url in $targets[$k]) {
    $code = (& curl.exe -s -o NUL -w '%{http_code}' -L --max-time 20 -A $UA $url)
    Write-Host ("   [$code] $url")
    if ($code -ne '200') { continue }
    $html = (& curl.exe -s -L --max-time 25 -A $UA $url) -join "`n"
    [regex]::Matches($html, '(?i)(?:https?:)?//[^"''\s\\)<>]+\.(?:pdf|png|jpe?g|webp)') |
      ForEach-Object { ($_.Value -split '\?')[0] } |
      Where-Object { $_ -match '(?i)manual|wiring|diagram|pinout|instruct|guide|assembl|spec' } |
      Sort-Object -Unique | ForEach-Object { Write-Host "      $_" -ForegroundColor Green }
  }
}
