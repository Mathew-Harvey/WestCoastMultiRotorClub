param(
    [Parameter(Mandatory = $true)][string]$Url,
    [Parameter(Mandatory = $true)][string]$Out,
    [int]$Width = 1440,
    [int]$Height = 900,
    [int]$Scale = 2,
    [int]$Budget = 6000,
    [int[]]$Crop # x,y,w,h in CSS pixels
)

$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$full = [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $Out))

& $edge --headless=new --disable-gpu --hide-scrollbars --run-all-compositor-stages-before-draw `
    --allow-file-access-from-files --window-size="$Width,$Height" --force-device-scale-factor=$Scale `
    --virtual-time-budget=$Budget --screenshot="$full" $Url 2>&1 | Out-Null

if (-not (Test-Path $full)) { throw "screenshot failed: $full" }

Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile($full)
Write-Output "$($img.Width)x$($img.Height) -> $Out"

if ($Crop -and $Crop.Count -eq 4) {
    $rect = New-Object System.Drawing.Rectangle ($Crop[0] * $Scale), ($Crop[1] * $Scale), ($Crop[2] * $Scale), ($Crop[3] * $Scale)
    $bmp = New-Object System.Drawing.Bitmap $img
    $cropped = $bmp.Clone($rect, $bmp.PixelFormat)
    $img.Dispose()
    $bmp.Dispose()
    $cropped.Save($full, [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Output "cropped to $($cropped.Width)x$($cropped.Height)"
    $cropped.Dispose()
}
else {
    $img.Dispose()
}
