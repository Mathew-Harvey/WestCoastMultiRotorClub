# Builds a local catalogue of Shopify handles from each store's product sitemap (search endpoints
# are bot-gated), then keyword-filters. Mantis is queried with single tokens because its search
# uses AND semantics and multi-word queries return nothing.

$ErrorActionPreference = 'Continue'
$UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

function Get-Text([string]$url) {
  try { return (& curl.exe -s -L --max-time 30 -A $UA $url 2>$null) -join "`n" } catch { return '' }
}

function Get-ShopifyHandles([string]$domain) {
  $handles = @()
  $idx = Get-Text "https://$domain/sitemap.xml"
  $maps = [regex]::Matches($idx, '<loc>([^<]*sitemap_products[^<]*)</loc>') | ForEach-Object { $_.Groups[1].Value }
  if (-not $maps) { $maps = @("https://$domain/sitemap_products_1.xml") }
  foreach ($m in $maps) {
    $x = Get-Text ($m -replace '&amp;', '&')
    $handles += [regex]::Matches($x, '/products/([a-z0-9\-]+)') | ForEach-Object { $_.Groups[1].Value }
  }
  return ($handles | Sort-Object -Unique)
}

Write-Host 'Building Shopify catalogues...'
$catalog = @{}
foreach ($d in @('phaserfpv.com.au', 'buzzfpv.com.au')) {
  $catalog[$d] = Get-ShopifyHandles $d
  Write-Host ("  {0}: {1} handles" -f $d, $catalog[$d].Count)
}

function Search-Mantis([string]$q) {
  $h = Get-Text ('https://www.mantisfpv.com.au/?post_type=product&s=' + [uri]::EscapeDataString($q))
  $out = @()
  foreach ($m in [regex]::Matches($h, '(?s)<li class="product type-product post-\d+.{0,2500}?</li>')) {
    $b = $m.Value
    $link = [regex]::Match($b, 'href="(https://www\.mantisfpv\.com\.au/[^"?]+/)"').Groups[1].Value
    $title = [regex]::Match($b, 'woocommerce-loop-product_?_?title">([^<]+)<').Groups[1].Value
    $img = [regex]::Match($b, 'data-src="(https://[^"]+wp-content/uploads/[^"?]+)').Groups[1].Value
    if ($img) { $img = $img -replace '-\d+x\d+(\.(?:jpg|jpeg|png|webp|avif))$', '$1' }
    $stock = if ($b -match 'outofstock') { 'OUT' } else { 'in ' }
    if ($link -and $title) { $out += [pscustomobject]@{ Stock = $stock; Title = $title.Trim(); Url = $link; Img = $img } }
  }
  return $out
}

# term => regex used to filter shopify handles
$jobs = [ordered]@{
  'jhemcu'    = 'jhemcu'
  'supernova' = 'supernova'
  'skystars'  = 'skystars|koko'
  'hqprop'    = 'hq-?prop|hq-3'
  'lumenier'  = 'lumenier|qav'
  'xilo'      = 'xilo'
  'cnhl'      = 'cnhl|speedy-?pizza|ministar'
  'dinogy'    = 'dinogy'
  'rcinpower' = 'rcinpower|rcin'
  'tattu'     = 'tattu'
  'f40'       = 'f40|t-?motor-f40'
  'goggles'   = 'hdzero-goggle|hdzero-fpv-goggle'
  'kd2207'    = 'kd-?2207|kd-?motor'
}

foreach ($k in $jobs.Keys) {
  Write-Host "`n########## $k ##########"
  Write-Host '--- mantis ---'
  $rows = Search-Mantis $k
  if (-not $rows) { Write-Host '  (none)' }
  foreach ($r in $rows) {
    Write-Host ("  {0} {1}" -f $r.Stock, $r.Title)
    Write-Host ("        {0}" -f $r.Url)
    Write-Host ("        {0}" -f $r.Img)
  }
  foreach ($d in $catalog.Keys) {
    $hit = $catalog[$d] | Where-Object { $_ -match $jobs[$k] }
    if ($hit) {
      Write-Host "--- $d ---"
      foreach ($hd in $hit) { Write-Host "  https://$d/products/$hd" }
    }
  }
}
