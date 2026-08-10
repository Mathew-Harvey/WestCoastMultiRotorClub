# Shared read/write helpers for assets/gallery/manifest.json.
# PowerShell 5.1's ConvertTo-Json pads output so heavily that hand-editing
# captions is painful, so albums are serialised here with a fixed key order.

function Get-GalleryManifest {
    param([Parameter(Mandatory = $true)][string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        return [pscustomobject]@{ albums = @() }
    }
    return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
}

function ConvertTo-GalleryJsonString {
    param([AllowNull()][string]$Value)

    $text = if ($null -eq $Value) { '' } else { [string]$Value }
    $text = $text.Replace('\', '\\').Replace('"', '\"').Replace("`r", '\r').Replace("`n", '\n').Replace("`t", '\t')
    return '"' + $text + '"'
}

function Write-GalleryManifest {
    param(
        [Parameter(Mandatory = $true)]$Manifest,
        [Parameter(Mandatory = $true)][string]$Path
    )

    $lines = New-Object System.Collections.Generic.List[string]
    $lines.Add('{')
    $lines.Add('  "albums": [')

    $albums = @($Manifest.albums)
    for ($i = 0; $i -lt $albums.Count; $i++) {
        $album = $albums[$i]
        $photos = @($album.photos)

        $lines.Add('    {')
        $lines.Add('      "id": ' + (ConvertTo-GalleryJsonString $album.id) + ',')
        $lines.Add('      "title": ' + (ConvertTo-GalleryJsonString $album.title) + ',')
        $lines.Add('      "date": ' + (ConvertTo-GalleryJsonString $album.date) + ',')
        $lines.Add('      "description": ' + (ConvertTo-GalleryJsonString $album.description) + ',')
        $lines.Add('      "cover": ' + (ConvertTo-GalleryJsonString $album.cover) + ',')
        # Cross-links: eventDate is the race day (YYYY-MM-DD) matched against the
        # calendar, videoId is the YouTube id of that day's stream. Blank = no link.
        $lines.Add('      "eventDate": ' + (ConvertTo-GalleryJsonString $album.eventDate) + ',')
        $lines.Add('      "videoId": ' + (ConvertTo-GalleryJsonString $album.videoId) + ',')
        $lines.Add('      "photos": [')

        for ($p = 0; $p -lt $photos.Count; $p++) {
            $trailing = if ($p -lt $photos.Count - 1) { ',' } else { '' }
            $lines.Add('        { "file": ' + (ConvertTo-GalleryJsonString $photos[$p].file) +
                ', "caption": ' + (ConvertTo-GalleryJsonString $photos[$p].caption) + ' }' + $trailing)
        }

        $lines.Add('      ]')
        $lines.Add('    }' + $(if ($i -lt $albums.Count - 1) { ',' } else { '' }))
    }

    $lines.Add('  ]')
    $lines.Add('}')

    [System.IO.File]::WriteAllText($Path, ($lines -join "`r`n") + "`r`n", (New-Object System.Text.UTF8Encoding $false))
}
