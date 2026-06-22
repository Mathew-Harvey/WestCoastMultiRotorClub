# Process a folder of photos into a web-ready gallery album.
# Usage: .\scripts\process-gallery-album.ps1 -SourceDir "path\to\photos" -AlbumId "summer-round-2-2026" -Title "Summer Series Round 2" -Date "June 2026"

param(
    [Parameter(Mandatory = $true)][string]$SourceDir,
    [Parameter(Mandatory = $true)][string]$AlbumId,
    [Parameter(Mandatory = $true)][string]$Title,
    [Parameter(Mandatory = $true)][string]$Date,
    [string]$Description = "",
    [switch]$Featured
)

$GalleryRoot = Join-Path $PSScriptRoot "..\assets\gallery"
$AlbumDir = Join-Path $GalleryRoot $AlbumId
$ThumbsDir = Join-Path $AlbumDir "thumbs"
$FullDir = Join-Path $AlbumDir "full"
$ManifestPath = Join-Path $GalleryRoot "manifest.json"

New-Item -ItemType Directory -Force -Path $ThumbsDir, $FullDir | Out-Null

$photos = @()
Get-ChildItem $SourceDir -Include *.jpg,*.jpeg,*.png -Recurse | Sort-Object Name | ForEach-Object {
    $name = $_.Name -replace '\.(jpeg|png)$', '.jpg'
    if ($_.Extension -ne '.jpg') { $name = [System.IO.Path]::ChangeExtension($_.Name, '.jpg') }

    ffmpeg -y -hide_banner -loglevel error -i $_.FullName -vf "scale=800:-2" -q:v 5 (Join-Path $ThumbsDir $name)
    ffmpeg -y -hide_banner -loglevel error -i $_.FullName -vf "scale=1920:-2" -q:v 4 (Join-Path $FullDir $name)
    $photos += @{ file = $name; caption = "" }
    Write-Host "Processed: $name"
}

$manifest = Get-Content $ManifestPath -Raw | ConvertFrom-Json
$coverFile = $photos[0].file
$newAlbum = @{
    id = $AlbumId
    title = $Title
    date = $Date
    description = $Description
    cover = "$AlbumId/thumbs/$coverFile"
    featured = [bool]$Featured
    photos = $photos
}

if ($Featured) {
    $manifest.albums | ForEach-Object { $_.featured = $false }
}

$manifest.albums = @($newAlbum) + @($manifest.albums)
$manifest | ConvertTo-Json -Depth 10 | Set-Content $ManifestPath -Encoding UTF8

Write-Host "`nAlbum '$Title' added with $($photos.Count) photos."
