param(
    [Parameter(Mandatory = $true)][string]$Page,
    [int]$Y = 0,
    [string]$Out = '.preview.html',
    [string]$Extra = '',
    [string]$Only = '',
    [string]$Js = ''
)

# Builds a throwaway copy of a real page in the repo root so relative asset paths
# still resolve, with scroll-reveal animations forced on. Used only for headless
# design screenshots.

if ($Only) {
    $Extra = "body > section, body > footer { display: none !important; } body > $Only { display: block !important; } $Extra"
}

$html = [System.IO.File]::ReadAllText([System.IO.Path]::GetFullPath((Join-Path (Get-Location) $Page)), [System.Text.Encoding]::UTF8)

$inject = @"
<style id="__preview_overrides">
  .fade-in, .gallery-item, .event-card, .pilot-card, .sponsor-item { opacity: 1 !important; transform: none !important; }
  html { scroll-behavior: auto !important; }
  .cursor, .cursor-follower { display: none !important; }
  $Extra
</style>
<script>
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.fade-in').forEach(function (el) { el.classList.add('active'); });
  });
  window.addEventListener('load', function () {
    document.querySelectorAll('.fade-in').forEach(function (el) { el.classList.add('active'); });
    if ($Y) { window.scrollTo(0, $Y); }
    setTimeout(function () {
      document.querySelectorAll('.fade-in').forEach(function (el) { el.classList.add('active'); });
      try { $Js } catch (e) { console.error(e); }
    }, 300);
  });
</script>
"@

$html = $html -replace '(?i)</head>', "$inject`n</head>"
[System.IO.File]::WriteAllText([System.IO.Path]::GetFullPath((Join-Path (Get-Location) $Out)), $html, (New-Object System.Text.UTF8Encoding $false))
Write-Output "wrote $Out (from $Page)"
