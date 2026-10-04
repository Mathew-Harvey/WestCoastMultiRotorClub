# WebFPV assets

For the WebFPV partnership: the State Champs track flythrough in the hero, and
the partnership band under the event details.

## Files

    champs-track.mp4          the flythrough. H.264, 1024x1024, 25 fps, a 24 s loop, no audio.
    champs-track.webm         the same in VP9, for browsers without H.264.
    champs-track-poster.jpg   the frame at 22 s. The video's poster, and the whole
                              picture under prefers-reduced-motion or with no JS.
    webfpv-wordmark.png       the WEBFPV wordmark, transparent. Reads on dark and light.
    champs-track-card.jpg     the track's share card from Tracks and Times, 1200x630.

## Where they came from

The flythrough is the WebFPV track builder's Export animation of
**WA State Champs 2026** (`trk-d16e93ac`, built by andAgainFPV), with the race
field on: the track on grass with the sponsors' logos painted on it. It was
rendered on 2026-10-04 by the simulator's own exporter
(`src/trackbuilder/animate.js`, `exportTrackGif` with `field: true`) at 1024 by
1024, which is the code the builder's button runs, so it is the same GIF the
button writes: 600 frames at 4 cs, 4.2 MB.

The page plays video rather than the GIF because the video is a tenth of the
size for the same picture. To remake all three files from a new export:

    ffmpeg -i track.gif -an -vf "scale=1024:1024:flags=lanczos,format=yuv420p" \
      -c:v libx264 -preset slow -crf 24 -profile:v high -movflags +faststart champs-track.mp4
    ffmpeg -i track.gif -an -vf "scale=1024:1024:flags=lanczos,format=yuv420p" \
      -c:v libvpx-vp9 -b:v 0 -crf 30 -row-mt 1 -deadline good -cpu-used 1 champs-track.webm
    ffmpeg -ss 22 -i track.gif -vframes 1 poster.png
    convert poster.png -strip -quality 82 -interlace JPEG champs-track-poster.jpg

Keep the poster on a frame where the quad's ribbon is in the middle of the
field: it is the only picture a visitor with reduced motion gets.

The wordmark was lettered by the simulator's `src/ui/lettering.js`
(`paintTitle`, WEB in cream `#f3ead4` and FPV in sakura `#e8a8b8`, the same
runs the WebFPV front page letters), then trimmed. Do not recolour it.

The share card is the board's own picture of the track:
https://webfpv.org/board/api/tracks/trk-d16e93ac/card

## Whose marks these are

The WEBFPV wordmark is WebFPV's. The logos painted on the field in the video,
the poster and the card (FlyIQ, Mantis FPV, T.M Ceilings and the club's own)
belong to their owners, and are there because they back the 2026 State
Championships.
