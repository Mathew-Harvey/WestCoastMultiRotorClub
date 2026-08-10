# Process a folder of photos into a web-ready gallery album.
# Usage: .\scripts\process-gallery-album.ps1 -SourceDir "path\to\photos" -AlbumId "summer-round-2-2026" -Title "Summer Series Round 2" -Date "June 2026"
#
# Albums are prepended to the manifest, and the gallery renders manifest order
# as newest first, so the album added last leads the rail.

param(
    [Parameter(Mandatory = $true)][string]$SourceDir,
    [Parameter(Mandatory = $true)][string]$AlbumId,
    [Parameter(Mandatory = $true)][string]$Title,
    [Parameter(Mandatory = $true)][string]$Date,
    [string]$Description = "",
    # Race day this album covers, as YYYY-MM-DD, matched against the events calendar.
    [ValidatePattern('^(\d{4}-\d{2}-\d{2})?$')][string]$EventDate = "",
    # YouTube id of that day's stream, so the album can link to the replay.
    [string]$VideoId = ""
)

. (Join-Path $PSScriptRoot 'gallery-manifest.ps1')

$GalleryRoot = Join-Path $PSScriptRoot "..\assets\gallery"
$AlbumDir = Join-Path $GalleryRoot $AlbumId
$ThumbsDir = Join-Path $AlbumDir "thumbs"
$FullDir = Join-Path $AlbumDir "full"
$ManifestPath = [System.IO.Path]::GetFullPath((Join-Path $GalleryRoot "manifest.json"))

New-Item -ItemType Directory -Force -Path $ThumbsDir, $FullDir | Out-Null

$photos = @()
Get-ChildItem $SourceDir -Include *.jpg, *.jpeg, *.png -Recurse | Sort-Object Name | ForEach-Object {
    $name = [System.IO.Path]::ChangeExtension($_.Name, '.jpg')

    ffmpeg -y -hide_banner -loglevel error -i $_.FullName -vf "scale=800:-2" -q:v 5 (Join-Path $ThumbsDir $name)
    ffmpeg -y -hide_banner -loglevel error -i $_.FullName -vf "scale=1920:-2" -q:v 4 (Join-Path $FullDir $name)
    $photos += [pscustomobject]@{ file = $name; caption = "" }
    Write-Host "Processed: $name"
}

if (-not $photos.Count) { throw "No photos found in $SourceDir" }

$manifest = Get-GalleryManifest -Path $ManifestPath
$newAlbum = [pscustomobject]@{
    id          = $AlbumId
    title       = $Title
    date        = $Date
    description = $Description
    cover       = "$AlbumId/thumbs/$($photos[0].file)"
    eventDate   = $EventDate
    videoId     = $VideoId
    photos      = $photos
}

$manifest.albums = @($newAlbum) + @($manifest.albums | Where-Object { $_.id -ne $AlbumId })
Write-GalleryManifest -Manifest $manifest -Path $ManifestPath

Write-Host "`nAlbum '$Title' added with $($photos.Count) photos."
