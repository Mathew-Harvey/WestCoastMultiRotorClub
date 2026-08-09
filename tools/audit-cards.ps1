# Lists which part cards still lack a photo and which lack a direct wiring-image button.

$root = Split-Path -Parent $PSScriptRoot
$html = Get-Content (Join-Path $root 'members-builds-2026.html') -Raw
$cards = [regex]::Matches($html, '(?s)<article class="part-card">.*?</article>')

function Get-Name($t) {
  $nm = [regex]::Match($t, '(?s)<h4>(.*?)</h4>')
  if ($nm.Success) { return ($nm.Groups[1].Value -replace '<[^>]+>', '' -replace '&quot;', '"').Trim() }
  return '(unnamed)'
}

Write-Host '=== CARDS WITHOUT PHOTO ==='
$n = 0
foreach ($c in $cards) { if ($c.Value -notmatch '<img\s') { $n++; Write-Host ('  - ' + (Get-Name $c.Value)) } }
Write-Host ("total cards: {0}   no-photo: {1}" -f $cards.Count, $n)

Write-Host "`n=== CARDS WITHOUT DIRECT WIRING BUTTON ==="
$m = 0
foreach ($c in $cards) { if ($c.Value -notmatch 'part-manual--wiring') { $m++; Write-Host ('  - ' + (Get-Name $c.Value)) } }
Write-Host ("no-wiring: {0}" -f $m)

Write-Host "`n=== EXISTING WIRING TARGETS ==="
[regex]::Matches($html, 'part-manual--wiring" href="([^"]+)"') | ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique | ForEach-Object { Write-Host "   $_" }
