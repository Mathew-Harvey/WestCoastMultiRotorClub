param(
    [Parameter(Mandatory = $true)][string]$In,
    [Parameter(Mandatory = $true)][string]$Out,
    [Parameter(Mandatory = $true)][int]$X,
    [Parameter(Mandatory = $true)][int]$Y,
    [Parameter(Mandatory = $true)][int]$W,
    [Parameter(Mandatory = $true)][int]$H
)

Add-Type -AssemblyName System.Drawing
$src = [System.Drawing.Image]::FromFile([System.IO.Path]::GetFullPath((Join-Path (Get-Location) $In)))
$bmp = New-Object System.Drawing.Bitmap $src
$w = [Math]::Min($W, $bmp.Width - $X)
$h = [Math]::Min($H, $bmp.Height - $Y)
$rect = New-Object System.Drawing.Rectangle $X, $Y, $w, $h
$crop = $bmp.Clone($rect, $bmp.PixelFormat)
$crop.Save([System.IO.Path]::GetFullPath((Join-Path (Get-Location) $Out)), [System.Drawing.Imaging.ImageFormat]::Png)
Write-Output "$($crop.Width)x$($crop.Height) -> $Out (source $($bmp.Width)x$($bmp.Height))"
$crop.Dispose(); $bmp.Dispose(); $src.Dispose()
