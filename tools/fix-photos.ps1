# Replaces placeholder/logo images with real product photos.

$ErrorActionPreference = 'Continue'
$UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
$root = Split-Path -Parent $PSScriptRoot
$imgDir = Join-Path $root 'assets\builds'
$inspect = Join-Path $PSScriptRoot 'inspect'

# Real Foxeer H743 Mini board photo replaces the H743 30x30 stand-in
Copy-Item (Join-Path $inspect 'foxeer-h7-mini-01.jpg') (Join-Path $imgDir 'foxeer-h7-mini.jpg') -Force
Write-Host "replaced foxeer-h7-mini.jpg with the real H743 Mini board photo"

Remove-Item (Join-Path $imgDir 'sequre-h743.jpg') -Force -EA SilentlyContinue
Remove-Item (Join-Path $imgDir 'ovonic.jpg') -Force -EA SilentlyContinue
Write-Host "removed logo/banner stand-ins: sequre-h743.jpg, ovonic.jpg"

function Get-Text([string]$url) {
  try { return ((& curl.exe -s -L --max-time 25 -A $UA $url 2>$null) -join "`n") } catch { return $null }
}
function Get-Og([string]$html) {
  $m = [regex]::Match($html, '(?i)property="og:image"[^>]*content="([^"]+)"')
  if (-not $m.Success) { $m = [regex]::Match($html, '(?i)content="([^"]+)"[^>]*property="og:image"') }
  if (-not $m.Success) { return $null }
  $u = $m.Groups[1].Value -replace '\\/', '/'
  if ($u -notmatch '^https?:') { $u = 'https:' + $u }
  return $u
}
function Get-OgTitle([string]$html) {
  $m = [regex]::Match($html, '(?i)property="og:title"[^>]*content="([^"]+)"')
  if ($m.Success) { return $m.Groups[1].Value }
  return ''
}
function Save-Image([string]$imgUrl, [string]$id) {
  if (-not $imgUrl) { return $null }
  $ext = 'jpg'
  $m = [regex]::Match($imgUrl, '(?i)\.(jpe?g|png|webp)(\?|$)')
  if ($m.Success) { $ext = $m.Groups[1].Value.ToLower() -replace 'jpeg', 'jpg' }
  $tries = @($imgUrl)
  if ($imgUrl -match 'cdn\d?\.mantisfpv\.com\.au') { $tries += ($imgUrl -replace 'cdn\d?\.mantisfpv\.com\.au', 'www.mantisfpv.com.au') }
  $out = Join-Path $imgDir "$id.$ext"
  foreach ($t in $tries) {
    & curl.exe -s -L --max-time 30 -A $UA -o $out $t 2>$null
    if ((Test-Path $out) -and (Get-Item $out).Length -gt 5000) { return (Split-Path $out -Leaf) }
    if (Test-Path $out) { Remove-Item $out -Force }
  }
  return $null
}

$targets = @(
  @{ id = 'sequre-h743'; urls = @(
      'https://www.mantisfpv.com.au/?post_type=product&s=sequre+h743',
      'https://sequremall.com/products/sequre-h743-v2-flight-controller'
    )
  },
  @{ id = 'ovonic'; urls = @(
      'https://www.ovonicshop.com/collections/ovonic-batteries-australia-warehouse',
      'https://www.ovonicshop.com/collections/6s-lipo-battery'
    )
  }
)

foreach ($t in $targets) {
  $done = $false
  foreach ($u in $t.urls) {
    Start-Sleep -Seconds 2
    $h = Get-Text $u
    if (-not $h) { Write-Host "  unreachable: $u"; continue }

    # a Mantis search page needs a product permalink resolved first
    if ($u -match 'post_type=product') {
      $cands = [regex]::Matches($h, 'https://www\.mantisfpv\.com\.au/([a-z0-9\-]{10,})/') |
      ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique |
      Where-Object { $_ -match 'sequre|h743' }
      if (-not $cands) { Write-Host "  no product match on $u"; continue }
      $u = "https://www.mantisfpv.com.au/$($cands[0])/"
      Start-Sleep -Seconds 1
      $h = Get-Text $u
      if (-not $h) { continue }
    }

    $img = Get-Og $h
    $saved = Save-Image $img $t.id
    if ($saved) {
      Write-Host ("  {0,-14} {1,-20} {2}" -f $t.id, $saved, (Get-OgTitle $h))
      Write-Host ("                 {0}" -f $u)
      $done = $true
      break
    }
  }
  if (-not $done) { Write-Host ("  {0,-14} STILL MISSING" -f $t.id) }
}
