# Searches AU stores for components and prints title / stock / product URL / full-size image URL
# so each candidate can be eyeballed before anything is downloaded or linked.

$ErrorActionPreference = 'Continue'
$UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

function Get-Html([string]$url) {
  try { return (& curl.exe -s -L --max-time 25 -A $UA $url 2>$null) -join "`n" } catch { return '' }
}

function Search-Mantis([string]$q) {
  $h = Get-Html ('https://www.mantisfpv.com.au/?post_type=product&s=' + [uri]::EscapeDataString($q))
  $out = @()
  foreach ($m in [regex]::Matches($h, '(?s)<li class="product type-product post-\d+.{0,2500}?</li>')) {
    $b = $m.Value
    $link = [regex]::Match($b, 'href="(https://www\.mantisfpv\.com\.au/[^"?]+/)"').Groups[1].Value
    $title = [regex]::Match($b, 'woocommerce-loop-product_?_?title">([^<]+)<').Groups[1].Value
    $img = [regex]::Match($b, 'data-src="(https://[^"]+wp-content/uploads/[^"?]+)').Groups[1].Value
    if ($img) { $img = $img -replace '-\d+x\d+(\.(?:jpg|jpeg|png|webp))$', '$1' }
    $stock = if ($b -match 'outofstock') { 'OUT' } else { 'in ' }
    if ($link -and $title) {
      $out += [pscustomobject]@{ Store = 'mantis'; Stock = $stock; Title = $title.Trim(); Url = $link; Img = $img }
    }
  }
  return $out
}

function Search-Shopify([string]$domain, [string]$q) {
  $h = Get-Html ("https://$domain/search?q=" + [uri]::EscapeDataString($q) + '&type=product')
  $out = @()
  $handles = [regex]::Matches($h, 'href="/products/([a-z0-9\-]+)"') | ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique
  foreach ($hd in ($handles | Select-Object -First 8)) {
    $j = Get-Html "https://$domain/products/$hd.js"
    $title = ''; $img = ''; $avail = '?'
    if ($j -match '"title":"(.*?)","handle"') { $title = $matches[1] }
    if ($j -match '"featured_image":"(.*?)"') { $img = $matches[1] }
    if (-not $img -and $j -match '"images":\["(.*?)"') { $img = $matches[1] }
    if ($j -match '"available":(true|false)') { $avail = if ($matches[1] -eq 'true') { 'in ' } else { 'OUT' } }
    if ($img -like '//*') { $img = 'https:' + $img }
    $img = ($img -replace '\\/', '/') -split '\?' | Select-Object -First 1
    if (-not $title) { $title = $hd }
    $out += [pscustomobject]@{ Store = $domain; Stock = $avail; Title = ($title -replace '\\u0022', '"'); Url = "https://$domain/products/$hd"; Img = $img }
    Start-Sleep -Milliseconds 250
  }
  return $out
}

$queries = @(
  'jhemcu f405',
  'supernova 1404',
  'skystars 1404',
  'hq 3x3x3 prop',
  'lumenier qav',
  'xilo 2207',
  'cnhl 1300 6s',
  'dinogy 1300 6s',
  'rcinpower 1102',
  'bms racing',
  'f40 pro 2306',
  'hdzero goggles',
  'kd 2207',
  'tattu 1050 6s'
)

foreach ($q in $queries) {
  Write-Host "`n########## $q ##########"
  $rows = @()
  $rows += Search-Mantis $q
  foreach ($d in @('phaserfpv.com.au', 'buzzfpv.com.au')) { $rows += Search-Shopify $d $q }
  if ($rows.Count -eq 0) { Write-Host '  (no results)' }
  foreach ($r in $rows) {
    Write-Host ("  {0} [{1}] {2}" -f $r.Stock, $r.Store, $r.Title)
    Write-Host ("        {0}" -f $r.Url)
    Write-Host ("        {0}" -f $r.Img)
  }
}
