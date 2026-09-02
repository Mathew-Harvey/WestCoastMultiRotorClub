# WCMRC sponsor logos, web ready

Open `index.html` in a browser to see everything on both light and dark grounds.

## Folders

    on-light/    colour or dark ink, transparent. For the main site.
    on-dark/     reversed, transparent. For dark sections and the footer.
    row-light/   optically balanced on a uniform 600x220 canvas.
    row-dark/    the same, reversed.

All PNG with real transparency, up to 800 px on the long edge, which is 2x for
a mark displayed around 400 px.

## Which set to use

For a sponsor strip, use the **row** sets. Every mark in them is scaled to the
same optical ink area, so a wide thin wordmark and a solid block read at the
same weight. Drop them into a CSS grid with a fixed cell and they line up with
no per-logo tweaking:

    .sponsors { display:grid; grid-template-columns:repeat(auto-fill,minmax(180px,1fr)); gap:12px; }
    .sponsors img { width:100%; height:auto; }

For a single logo somewhere in a page, use `on-light` or `on-dark` and size it
yourself.

## Three marks needed making

VCI, Radiomaster and T-Motor were only ever supplied as white artwork, which is
invisible on a light page. Their ink has been set to near-black (#111111) for
the light sets. If those brands have their own dark or full-colour master, use
it instead.

## DIWA Group

Two versions. `diwa-group` is the full lockup with the DRONE INSPECTIONS WA and
FlyIQ - DRONE TRAINING descriptors. `diwa-group-primary-mark` is DIWA GROUP
only, for small or busy placements where the descriptor text would not be
legible. The dark-background file the brand supplied leaves its navy elements
invisible on dark, so the on-dark version here was built from the light file.

## Not a sponsor

`wcmrc-club-logo` is included for convenience. It is the club's own mark, not a
sponsor, so keep it out of sponsor strips.
