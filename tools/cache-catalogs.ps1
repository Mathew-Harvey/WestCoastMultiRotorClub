$ErrorActionPreference = 'Continue'
$UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
$out = Join-Path $PSScriptRoot 'catalog'
New-Item -ItemType Directory -Force -Path $out | Out-Null

foreach ($d in @('phaserfpv.com.au', 'buzzfpv.com.au')) {
  $idx = (& curl.exe -s -L --max-time 30 -A $UA "https://$d/sitemap.xml") -join "`n"
  $maps = [regex]::Matches($idx, '<loc>([^<]*sitemap_products[^<]*)</loc>') | ForEach-Object { $_.Groups[1].Value -replace '&amp;', '&' }
  $handles = @()
  foreach ($m in $maps) {
    $x = (& curl.exe -s -L --max-time 30 -A $UA $m) -join "`n"
    $handles += [regex]::Matches($x, '/products/([a-z0-9\-]+)') | ForEach-Object { $_.Groups[1].Value }
  }
  $handles = $handles | Sort-Object -Unique
  $handles | Set-Content (Join-Path $out "$d.txt")
  Write-Host ("{0}: {1}" -f $d, $handles.Count)
}
