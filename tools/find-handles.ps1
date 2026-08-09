# Walk a Shopify store's sitemap index and print product URLs matching a pattern.
param(
  [string[]]$Domains = @('phaserfpv.com.au', 'buzzfpv.com.au', 'www.racedayquads.com', 'pyrodrone.com'),
  [string[]]$Patterns = @('xing-e', '1614')
)
$UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

foreach ($dm in $Domains) {
  $idx = (& curl.exe -s -L --max-time 25 -A $UA "https://$dm/sitemap.xml") -join "`n"
  $maps = [regex]::Matches($idx, '<loc>([^<]*sitemap_products[^<]*)</loc>') |
    ForEach-Object { $_.Groups[1].Value -replace '&amp;', '&' }
  $urls = @()
  foreach ($m in $maps) {
    $x = (& curl.exe -s -L --max-time 30 -A $UA $m) -join "`n"
    $urls += [regex]::Matches($x, '<loc>([^<]*/products/[^<]*)</loc>') | ForEach-Object { $_.Groups[1].Value }
  }
  Write-Host ("== {0}  ({1} products)" -f $dm, $urls.Count) -ForegroundColor Cyan
  foreach ($p in $Patterns) {
    $hit = $urls | Where-Object { $_ -match $p } | Sort-Object -Unique
    Write-Host ("   [{0}] {1} match(es)" -f $p, $hit.Count)
    $hit | Select-Object -First 10 | ForEach-Object { Write-Host "      $_" -ForegroundColor Green }
  }
}
