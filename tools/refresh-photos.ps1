# Replace broken / low-resolution card photos with a clean product shot from the
# linked retailer page. Prefers near-square images (product shots) over the long
# description panels and lab-plot screenshots vendors put in the same gallery.
Add-Type -AssemblyName System.Drawing
$UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
$outDir = 'assets\builds'
$tmpDir = 'assets\builds\inspect\refresh'
New-Item -ItemType Directory -Force -Path $tmpDir | Out-Null

function Get-Dim([string]$p) {
  try { $i = [System.Drawing.Image]::FromFile((Resolve-Path $p)); $d = @($i.Width, $i.Height); $i.Dispose(); return $d }
  catch { return @(-1, -1) }
}

function Save-Valid([string]$url, [string]$dest, [string]$referer) {
  # percent-encode any non-ASCII in the path (some Mantis filenames contain e.g. superscript 2)
  $enc = ($url -split '/' | ForEach-Object {
    if ($_ -match '^[\x00-\x7F]*$') { $_ } else { [uri]::EscapeDataString($_) }
  }) -join '/'
  $tries = @($enc)
  if ($enc -match 'cdn\d*\.mantisfpv\.com\.au') { $tries += ($enc -replace 'cdn\d*\.mantisfpv\.com\.au', 'www.mantisfpv.com.au') }
  foreach ($u in $tries) {
    & curl.exe -s -L --max-time 45 -A $UA -e $referer -o $dest $u 2>$null
    if (-not (Test-Path $dest)) { continue }
    $d = Get-Dim $dest
    if ($d[0] -gt 0) { return @{ ok = $true; w = $d[0]; h = $d[1] } }
  }
  if (Test-Path $dest) { Remove-Item $dest -Force }
  return @{ ok = $false }
}

$targets = [ordered]@{
  'foxeer-lollipop.jpg' = @{ page = 'https://www.mantisfpv.com.au/foxeer-5-8g-lollipop-4-stubby-omni-2-6dbi-fpv-antenna-2pcs-lhcp-rhcp/'; match = 'lollipop' }
  'volador-vx3.jpg'     = @{ page = 'https://www.mantisfpv.com.au/flyfishrc-volador-vx3-fpv-3-t700-frame-kit/'; match = 'volador-vx3' }
  'elrs-ep2.jpeg'       = @{ page = 'https://www.mantisfpv.com.au/happymodel-2-4-elrs-ep2-tcxo-receiver/'; match = 'ep2' }
  'gemfan-1614.webp'    = @{ page = 'https://www.mantisfpv.com.au/gemfan-1614-40mm-micro-whoop-3-blade-propeller-1mm-set-of-8/'; match = '1614' }
}

foreach ($file in $targets.Keys) {
  $t = $targets[$file]
  Write-Host "=== $file" -ForegroundColor Cyan
  $cur = Join-Path $outDir $file
  $cd = Get-Dim $cur
  Write-Host ("   current: {0}x{1}" -f $cd[0], $cd[1])

  $html = (& curl.exe -s -L --max-time 30 -A $UA $t.page) -join "`n"
  $cands = [regex]::Matches($html, '(?i)https?://[^"''\s\\)<>]+\.(?:jpe?g|png|webp)') |
    ForEach-Object { ($_.Value -split '\?')[0] } |
    Where-Object { $_ -match $t.match } |
    Where-Object { $_ -notmatch '(?i)-\d{2,3}x\d{2,3}\.' } |
    Where-Object { $_ -notmatch '(?i)description|banner|logo|promotion' } |
    Sort-Object -Unique

  $best = $null
  foreach ($c in $cands) {
    $tmp = Join-Path $tmpDir ((Get-Random).ToString() + [IO.Path]::GetExtension($c))
    $r = Save-Valid $c $tmp $t.page
    if (-not $r.ok) { Write-Host "   [bad ] $c"; continue }
    $ar = [math]::Round($r.w / $r.h, 2)
    $square = ($ar -ge 0.8 -and $ar -le 1.25)
    Write-Host ("   [{0}x{1} ar={2}{3}] {4}" -f $r.w, $r.h, $ar, $(if ($square) { '' } else { ' SKIP' }), $c)
    if (-not $square) { continue }
    if (-not $best -or ($r.w * $r.h) -gt ($best.w * $best.h)) { $best = @{ w = $r.w; h = $r.h; path = $tmp } }
  }
  if (-not $best) { Write-Host '   no square product shot found' -ForegroundColor Yellow; continue }

  if ($cd[0] -lt 0 -or ($best.w * $best.h) -gt ($cd[0] * $cd[1])) {
    Copy-Item $best.path $cur -Force
    Write-Host ("   -> replaced with {0}x{1}" -f $best.w, $best.h) -ForegroundColor Green
  } else {
    Write-Host '   -> kept existing (already larger)'
  }
}
