#!/usr/bin/env python3
"""
Generates the inline SVG for the club-kit section of index.html.

The garment is drawn once as a single closed path that doubles as the clip for
everything printed on it, so the blade rake and the quad are cut off exactly at
the side seams — which is how the quad "wraps the wearer's left side" on the real
jersey. Run this and paste the output between the CLUB KIT SVG markers.
"""

W, H = 460, 420
CX = W / 2

# ---------------------------------------------------------------- silhouette
# Right half authored explicitly; the left half is the numeric mirror (x -> W-x)
# so the whole outline stays one path and can be reused as a clipPath.
BODY = " ".join([
    "M264,26",
    "L328,58",
    "Q392,118 442,264",
    "L400,286",
    "Q372,214 310,178",
    "C318,244 314,318 310,386",
    "Q230,396 150,386",
    "C146,318 142,244 150,178",
    "Q88,214 60,286",
    "L18,264",
    "Q68,118 132,58",
    "L196,26",
    "C210,46 250,46 264,26",
    "Z",
])

# The raglan seam runs neck -> underarm. It is the single detail that stops the
# drawing reading as a t-shirt, so it gets both a panel tone and a stitch line.
SEAM_R = "M264,28 C296,74 302,124 310,178"
SEAM_L = "M196,28 C164,74 158,124 150,178"

SLEEVE_R = "M264,28 C296,74 302,124 310,178 Q372,214 400,286 L442,264 Q392,118 328,58 Z"
SLEEVE_L = "M196,28 C164,74 158,124 150,178 Q88,214 60,286 L18,264 Q68,118 132,58 Z"

CUFF_R = "M442,264 L400,286 L393.7,271.3 L435.7,249.3 Z"
CUFF_L = "M18,264 L60,286 L66.3,271.3 L24.3,249.3 Z"

COLLAR = "M196,26 C210,46 250,46 264,26"


def rake():
    """The hem blade rake: raked bars at pseudo-random heights.

    Emitted as three concatenated paths (one per fill) rather than 55 elements,
    and generated from a fixed LCG so the field is identical on every build.
    """
    seed = 20261017
    groups = {"a": [], "b": [], "c": []}
    x = -60
    i = 0
    base = 402
    while x < 545:
        seed = (1103515245 * seed + 12345) % (2 ** 31)
        h = 26 + ((seed >> 16) % 95)          # 26..120
        d = 0.105 * h                          # 6 degrees of rake
        key = "c" if i % 7 == 6 else ("a" if i % 2 == 0 else "b")
        groups[key].append(
            f"M{x},{base} L{x + 6},{base} L{x + 6 + d:.1f},{base - h} L{x + d:.1f},{base - h} Z"
        )
        x += 7.6
        i += 1
    return groups


def img(href, x, y, w, h, cls=""):
    c = f' class="{cls}"' if cls else ""
    return (f'<image{c} href="./assets/sponsors/champs/{href}" x="{x}" y="{y}" '
            f'width="{w}" height="{h}" preserveAspectRatio="xMidYMid meet" />')


QUAD = "./assets/champs-quad-flat.png"
QW, QH = 150, 152
QY = 262


def defs():
    g = rake()
    parts = [
        '<svg class="jersey-defs" aria-hidden="true" focusable="false">',
        "<defs>",
        f'<clipPath id="jerseyClip" clipPathUnits="userSpaceOnUse"><path d="{BODY}" /></clipPath>',
        '<linearGradient id="jerseyFabric" x1="0" y1="0" x2="0" y2="1">',
        '<stop offset="0" stop-color="#12222f" /><stop offset="0.55" stop-color="#0b1620" />',
        '<stop offset="1" stop-color="#080f18" /></linearGradient>',
        '<g id="jerseyRake">',
        f'<path class="rk-a" d="{" ".join(g["a"])}" />',
        f'<path class="rk-b" d="{" ".join(g["b"])}" />',
        f'<path class="rk-c" d="{" ".join(g["c"])}" />',
        "</g>",
        "</defs>",
        "</svg>",
    ]
    return "\n      ".join(parts)


def garment(inner, title, desc):
    return "\n".join([
        f'<svg class="jersey-svg" viewBox="0 0 {W} {H}" role="img" aria-labelledby="{title[0]} {desc[0]}">',
        f'  <title id="{title[0]}">{title[1]}</title>',
        f'  <desc id="{desc[0]}">{desc[1]}</desc>',
        f'  <path class="jsy-fill" d="{BODY}" />',
        f'  <path class="jsy-panel" d="{SLEEVE_L}" />',
        f'  <path class="jsy-panel" d="{SLEEVE_R}" />',
        '  <g clip-path="url(#jerseyClip)">',
        "    " + inner.replace("\n", "\n    "),
        "  </g>",
        f'  <path class="jsy-seam" d="{SEAM_L}" />',
        f'  <path class="jsy-seam" d="{SEAM_R}" />',
        f'  <path class="jsy-cuff" d="{CUFF_L}" />',
        f'  <path class="jsy-cuff" d="{CUFF_R}" />',
        f'  <path class="jsy-collar" d="{COLLAR}" />',
        f'  <path class="jsy-edge" d="{BODY}" />',
        "</svg>",
    ])


def front():
    grid = [
        ("row-dark/tm-ceilings.png", 168, 184),
        ("row-dark/mantis-fpv.png", 232, 184),
        ("row-dark/bigfella.png", 168, 208),
        ("row-dark/rox-rotorcross.png", 232, 208),
        ("row-dark/mandurah-drone-services.png", 168, 232),
        ("row-dark/bms-racing.png", 232, 232),
    ]
    body = [
        '<rect x="0" y="0" width="460" height="420" fill="url(#jerseyFabric)" />',
        '<use href="#jerseyRake" x="0" />',
        f'<image href="{QUAD}" x="95" y="{QY}" width="{QW}" height="{QH}" preserveAspectRatio="xMidYMid meet" />',
        img("on-dark/wcmrc-club-logo.png", 180, 50, 100, 34),
        img("on-dark/diwa-group.png", 168, 94, 124, 24),
        '<rect class="jsy-rule" x="170" y="134" width="120" height="1.4" />',
        img("row-dark/energy-matrix-group.png", 184, 142, 92, 32),
    ] + [img(h, x, y, 60, 20) for h, x, y in grid]

    sleeves = [
        '<g class="jsy-sleeve-type" transform="rotate(-66.8 86 166)">',
        '  <text x="86" y="162" text-anchor="middle">West Coast</text>',
        '  <text x="86" y="178" text-anchor="middle" class="jsy-sleeve-type--alt">Multirotor Club</text>',
        "</g>",
        '<g class="jsy-sleeve-type jsy-sleeve-type--alt" transform="rotate(66.8 374 166)">',
        '  <text x="374" y="171" text-anchor="middle">FPV Pilot</text>',
        "</g>",
    ]
    return garment("\n".join(body + sleeves),
                   ("jerseyFrontTitle", "Front of the 2026/27 West Coast Multirotor Club race jersey"),
                   ("jerseyFrontDesc",
                    "Race navy raglan long sleeve. The club mark and the DIWA Group primary sponsor "
                    "lockup sit centre chest above a rule, with Energy Matrix Group and six club "
                    "supporters below. A blade-rake graphic and the club quad run across the hem."))


def back():
    panel = [
        ("row-light/ovonic.png", 157, 204),
        ("row-light/betafpv.png", 207, 204),
        ("row-light/gemfan.png", 257, 204),
        ("row-light/vci.png", 157, 226),
        ("row-light/radiomaster.png", 207, 226),
        ("row-light/t-motor.png", 257, 226),
    ]
    body = [
        '<rect x="0" y="0" width="460" height="420" fill="url(#jerseyFabric)" />',
        '<use href="#jerseyRake" x="-139" />',
        f'<image href="{QUAD}" x="-365" y="{QY}" width="{QW}" height="{QH}" '
        'preserveAspectRatio="xMidYMid meet" transform="scale(-1 1)" />',
        '<text class="jsy-yoke" x="230" y="64" text-anchor="middle" textLength="118" '
        'lengthAdjust="spacingAndGlyphs">WCMRC</text>',
        '<rect class="jsy-rule" x="175" y="74" width="110" height="1.4" />',
        '<text class="jsy-micro" x="230" y="94" text-anchor="middle">Primary sponsor</text>',
        img("on-dark/diwa-group.png", 164, 100, 132, 25),
        '<text class="jsy-name" x="230" y="160" text-anchor="middle">Your call sign</text>',
        '<rect class="jsy-name-rule" x="180" y="170" width="100" height="1.4" />',
        '<text class="jsy-micro" x="230" y="190" text-anchor="middle">Prize partners</text>',
        '<rect class="jsy-panel-plate" x="150" y="196" width="160" height="60" rx="5" />',
    ] + [img(h, x, y, 46, 20) for h, x, y in panel]

    sleeves = [
        '<g class="jsy-sleeve-type" transform="rotate(-66.8 86 166)">',
        '  <text x="86" y="171" text-anchor="middle">webfpv.org</text>',
        "</g>",
        '<g class="jsy-sleeve-type jsy-sleeve-type--alt" transform="rotate(66.8 374 166)">',
        '  <text x="374" y="171" text-anchor="middle">FPV Pilot</text>',
        "</g>",
    ]
    return garment("\n".join(body + sleeves),
                   ("jerseyBackTitle", "Back of the 2026/27 West Coast Multirotor Club race jersey"),
                   ("jerseyBackDesc",
                    "The club name across the yoke, the DIWA Group primary sponsor lockup, then the "
                    "pilot's call sign in large type. Six prize partners sit on a white panel below, "
                    "and the blade-rake hem carries the quad in from the side seam."))


print(defs())
print("<!--FRONT-->")
print(front())
print("<!--BACK-->")
print(back())
