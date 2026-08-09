# Card photos were saved with a .webp extension but hold JPEG/PNG data. Browsers
# sniff the bytes so they render, but the names lie. Rename to the real format and
# update every HTML reference.
$dirs = @('assets\builds', 'assets\builds\wiring')
$htmlFiles = Get-ChildItem -Filter *.html

function Get-RealExt([string]$path) {
  $b = [IO.File]::ReadAllBytes($path)[0..11]
  if ($b[0] -eq 0xFF -and $b[1] -eq 0xD8) { return 'jpg' }
  if ($b[0] -eq 0x89 -and $b[1] -eq 0x50) { return 'png' }
  if ([Text.Encoding]::ASCII.GetString($b[0..3]) -eq 'RIFF' -and [Text.Encoding]::ASCII.GetString($b[8..11]) -eq 'WEBP') { return 'webp' }
  if ([Text.Encoding]::ASCII.GetString($b[0..3]) -match 'GIF8') { return 'gif' }
  if ([Text.Encoding]::ASCII.GetString($b[0..4]) -eq '%PDF-') { return 'pdf' }
  return $null
}

$renames = @()
foreach ($dir in $dirs) {
  foreach ($f in Get-ChildItem $dir -File) {
    $real = Get-RealExt $f.FullName
    if (-not $real) { Write-Host "  ?? unknown format: $($f.Name)" -ForegroundColor Yellow; continue }
    $ext = $f.Extension.TrimStart('.').ToLower()
    if ($ext -eq 'jpeg') { $ext = 'jpg' }
    if ($ext -eq $real) { continue }
    $newName = [IO.Path]::GetFileNameWithoutExtension($f.Name) + '.' + $real
    if (Test-Path (Join-Path $dir $newName)) {
      Write-Host "  !! target exists, skipping: $($f.Name) -> $newName" -ForegroundColor Yellow
      continue
    }
    $renames += [pscustomobject]@{ Dir = $dir; Old = $f.Name; New = $newName }
  }
}

if (-not $renames) { Write-Host 'nothing to rename'; return }

foreach ($r in $renames) {
  Rename-Item (Join-Path $r.Dir $r.Old) $r.New
  Write-Host ("  {0}\{1}  ->  {2}" -f $r.Dir, $r.Old, $r.New) -ForegroundColor Green
}

foreach ($h in $htmlFiles) {
  $txt = Get-Content $h.FullName -Raw
  $orig = $txt
  foreach ($r in $renames) { $txt = $txt.Replace($r.Old, $r.New) }
  if ($txt -ne $orig) {
    Set-Content $h.FullName $txt -NoNewline
    Write-Host ("  updated refs in {0}" -f $h.Name) -ForegroundColor Cyan
  }
}
