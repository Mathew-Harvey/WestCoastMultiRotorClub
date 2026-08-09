# cdn2.mantisfpv.com.au rejects direct image requests; the same path served from the
# main www host does not. Tries the CDN first, then falls back to www.

$ErrorActionPreference = 'Continue'
$UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
$dest = Join-Path (Split-Path -Parent $PSScriptRoot) 'assets\builds'

$targets = [ordered]@{
  'hdzero-goggles-2' = 'https://www.mantisfpv.com.au/hdzero-fpv-goggles-v2-hdz3520/'
  'bms-js3-tiger'    = 'https://www.mantisfpv.com.au/bms-racing-js-3-tiger-5-racing-frame-kit/'
  'vci-2207lt'       = 'https://www.mantisfpv.com.au/vci-lt-racing-motor-2207-2160kv-fire/'
}

foreach ($name in $targets.Keys) {
  $page = $targets[$name]
  $h = (& curl.exe -s -L --max-time 25 -A $UA $page) -join "`n"
  $img = [regex]::Match($h, 'property="og:image"[^>]*content="([^"]+)"').Groups[1].Value
  if (-not $img) { $img = [regex]::Match($h, 'content="([^"]+)"[^>]*property="og:image"').Groups[1].Value }
  if (-not $img) { Write-Host "  NO IMAGE $name"; continue }
  $img = ($img -split '\?')[0]

  $ext = [System.IO.Path]::GetExtension($img)
  if ($ext -notmatch '^\.(jpg|jpeg|png|webp|avif)$') { $ext = '.jpg' }
  $file = Join-Path $dest ($name + $ext)

  foreach ($candidate in @($img, ($img -replace 'cdn\d*\.mantisfpv\.com\.au', 'www.mantisfpv.com.au'))) {
    & curl.exe -s -L --max-time 40 -A $UA -e $page -o $file $candidate 2>$null
    if ((Test-Path $file) -and (Get-Item $file).Length -gt 3000) {
      Write-Host ("  ok  {0,-18} {1,8} bytes  from {2}" -f $name, (Get-Item $file).Length, ([uri]$candidate).Host)
      break
    }
    if (Test-Path $file) { Remove-Item $file -Force }
  }
  if (-not (Test-Path $file)) { Write-Host "  FAIL $name  <- $img" }
  Start-Sleep -Milliseconds 400
}
