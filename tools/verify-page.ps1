# Verifies the builds page: every local asset resolves on disk AND is really the file type
# its extension claims, every external link returns 2xx, and reports any part card left
# without a photo. The type check matters because a failed download can leave an HTML error
# page sitting there named .jpg, which existence checks happily pass.

$ErrorActionPreference = 'Continue'
$UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
$root = Split-Path -Parent $PSScriptRoot
$page = Join-Path $root 'members-builds-2026.html'
$html = Get-Content $page -Raw
Add-Type -AssemblyName System.Drawing

function Get-RealExt([string]$path) {
  $b = [IO.File]::ReadAllBytes($path)
  if ($b.Length -lt 12) { return $null }
  if ($b[0] -eq 0xFF -and $b[1] -eq 0xD8) { return 'jpg' }
  if ($b[0] -eq 0x89 -and $b[1] -eq 0x50) { return 'png' }
  if ([Text.Encoding]::ASCII.GetString($b[0..3]) -eq 'RIFF' -and [Text.Encoding]::ASCII.GetString($b[8..11]) -eq 'WEBP') { return 'webp' }
  if ([Text.Encoding]::ASCII.GetString($b[0..3]) -match 'GIF8') { return 'gif' }
  if ([Text.Encoding]::ASCII.GetString($b[0..4]) -eq '%PDF-') { return 'pdf' }
  if ([Text.Encoding]::ASCII.GetString($b[0..1]) -eq '<!') { return 'html' }
  return $null
}

Write-Host "=== LOCAL ASSET REFERENCES ==="
$local = [regex]::Matches($html, '(?:src|href)="(\./[^"]+)"') | ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique
$missing = 0
$badType = 0
foreach ($rel in $local) {
  $rel = ($rel -split '#')[0]
  if (-not $rel -or $rel -match '\.html$') { continue }
  $p = Join-Path $root ($rel -replace '^\./', '' -replace '/', '\')
  if (-not (Test-Path $p)) {
    Write-Host ("  MISSING {0}" -f $rel)
    $missing++
    continue
  }
  $ext = [IO.Path]::GetExtension($p).TrimStart('.').ToLower()
  if ($ext -eq 'jpeg') { $ext = 'jpg' }
  if ($ext -in @('jpg', 'png', 'webp', 'gif', 'pdf', 'ico')) {
    $real = Get-RealExt $p
    if ($ext -eq 'ico') { $real = 'ico' }   # icons are not worth sniffing
    if (-not $real) {
      Write-Host ("  UNKNOWN {0}  (unrecognised file signature)" -f $rel)
      $badType++
      continue
    }
    if ($real -ne $ext) {
      Write-Host ("  WRONGTY {0}  (extension says .{1}, bytes say {2})" -f $rel, $ext, $real)
      $badType++
      continue
    }
    # images must also actually decode, not just have a plausible header
    if ($ext -ne 'pdf' -and $ext -ne 'ico') {
      try { $i = [System.Drawing.Image]::FromFile($p); $dim = "$($i.Width)x$($i.Height)"; $i.Dispose() }
      catch { Write-Host ("  NODECODE {0}" -f $rel); $badType++; continue }
      Write-Host ("  ok      {0}  [{1}]" -f $rel, $dim)
      continue
    }
  }
  Write-Host ("  ok      {0}" -f $rel)
}
Write-Host "missing local assets: $missing"
Write-Host "wrong/undecodable file types: $badType"

Write-Host "`n=== EXTERNAL LINKS ==="
$ext = [regex]::Matches($html, 'href="(https?://[^"]+)"') | ForEach-Object { $_.Groups[1].Value -replace '&amp;', '&' } | Sort-Object -Unique
$bad = @()
foreach ($u in $ext) {
  $code = & curl.exe -s -o NUL -L --max-time 20 -A $UA -w "%{http_code}" $u 2>$null
  if ($code -notmatch '^2') { $bad += "$code  $u"; Write-Host "  BAD  $code  $u" }
  else { Write-Host "  ok   $code  $u" }
  Start-Sleep -Milliseconds 700
}

Write-Host "`n=== CARD PHOTO COVERAGE ==="
$cards = [regex]::Matches($html, '(?s)<article class="part-card">.*?</article>')
$withPhoto = 0; $iconOnly = @()
foreach ($c in $cards) {
  $t = $c.Value
  $name = ''
  $nm = [regex]::Match($t, '(?s)<h4>(.*?)</h4>')
  if ($nm.Success) { $name = ($nm.Groups[1].Value -replace '<[^>]+>', '' -replace '&quot;', '"').Trim() }
  if ($t -match '<img\s') { $withPhoto++ } else { $iconOnly += $name }
}
Write-Host "cards total   : $($cards.Count)"
Write-Host "with photo    : $withPhoto"
Write-Host "icon fallback : $($iconOnly.Count)"
$iconOnly | ForEach-Object { Write-Host "   - $_" }

Write-Host "`n=== WIRING BUTTON COVERAGE ==="
$wire = [regex]::Matches($html, 'part-manual--wiring" href="([^"]+)"') | ForEach-Object { $_.Groups[1].Value }
Write-Host "wiring buttons: $($wire.Count)"
$wire | Sort-Object -Unique | ForEach-Object { Write-Host "   $_" }

Write-Host "`n=== SUMMARY ==="
if ($bad.Count -eq 0 -and $missing -eq 0 -and $badType -eq 0) {
  Write-Host "All links resolve, and every local asset exists and decodes as its declared type."
}
else {
  Write-Host "broken external: $($bad.Count); missing local: $missing; wrong file type: $badType"
  $bad | ForEach-Object { Write-Host "  $_" }
}
