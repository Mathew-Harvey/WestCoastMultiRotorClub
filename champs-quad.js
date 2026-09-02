/*
 * champs-quad.js — the orange racing quad that flies into the State Championships hero.
 *
 * A self-contained WebGL renderer. No library: the whole thing is procedural geometry,
 * one shader, and about four hundred lines of matrix maths, which is a fraction of the
 * weight of pulling a 3D engine off a CDN for a single hero animation.
 *
 * Public surface:
 *   const quad = WCMRCQuad.create(canvas);        // null when WebGL is unavailable
 *   quad.resize(cssWidth, cssHeight, dprCap);
 *   quad.draw({ progress, time, framing });       // progress 0 = far away, 1 = locked in place
 *   quad.dispose();
 */
(function (global) {
    'use strict';

    /* ---------------------------------------------------------------- maths */

    const M = {
        identity() {
            return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
        },
        multiply(out, a, b) {
            for (let c = 0; c < 4; c++) {
                const b0 = b[c * 4], b1 = b[c * 4 + 1], b2 = b[c * 4 + 2], b3 = b[c * 4 + 3];
                out[c * 4] = a[0] * b0 + a[4] * b1 + a[8] * b2 + a[12] * b3;
                out[c * 4 + 1] = a[1] * b0 + a[5] * b1 + a[9] * b2 + a[13] * b3;
                out[c * 4 + 2] = a[2] * b0 + a[6] * b1 + a[10] * b2 + a[14] * b3;
                out[c * 4 + 3] = a[3] * b0 + a[7] * b1 + a[11] * b2 + a[15] * b3;
            }
            return out;
        },
        perspective(out, fovy, aspect, near, far) {
            const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
            out.fill(0);
            out[0] = f / aspect; out[5] = f; out[10] = (far + near) * nf;
            out[11] = -1; out[14] = 2 * far * near * nf;
            return out;
        },
        translation(out, x, y, z) {
            out.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]);
            return out;
        },
        scaling(out, s) {
            out.set([s, 0, 0, 0, 0, s, 0, 0, 0, 0, s, 0, 0, 0, 0, 1]);
            return out;
        },
        rotationX(out, r) {
            const c = Math.cos(r), s = Math.sin(r);
            out.set([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]);
            return out;
        },
        rotationY(out, r) {
            const c = Math.cos(r), s = Math.sin(r);
            out.set([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]);
            return out;
        },
        rotationZ(out, r) {
            const c = Math.cos(r), s = Math.sin(r);
            out.set([c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
            return out;
        },
        /* Normal matrix: the inverse transpose of the upper-left 3x3, written into a mat3. */
        normalFromMat4(out, m) {
            const a00 = m[0], a01 = m[1], a02 = m[2];
            const a10 = m[4], a11 = m[5], a12 = m[6];
            const a20 = m[8], a21 = m[9], a22 = m[10];
            const b01 = a22 * a11 - a12 * a21;
            const b11 = -a22 * a10 + a12 * a20;
            const b21 = a21 * a10 - a11 * a20;
            let det = a00 * b01 + a01 * b11 + a02 * b21;
            if (!det) { out.set([1, 0, 0, 0, 1, 0, 0, 0, 1]); return out; }
            det = 1 / det;
            out[0] = b01 * det;
            out[1] = (-a22 * a01 + a02 * a21) * det;
            out[2] = (a12 * a01 - a02 * a11) * det;
            out[3] = b11 * det;
            out[4] = (a22 * a00 - a02 * a20) * det;
            out[5] = (-a12 * a00 + a02 * a10) * det;
            out[6] = b21 * det;
            out[7] = (-a21 * a00 + a01 * a20) * det;
            out[8] = (a11 * a00 - a01 * a10) * det;
            return out;
        },
    };

    /* ------------------------------------------------------- mesh scratchpad */

    /*
     * A tiny mesh builder. Everything is pushed into one growing pair of arrays in
     * object space, then transformed once on the way in, so the GPU only ever sees
     * a handful of buffers.
     */
    function Mesh() {
        this.pos = [];
        this.nrm = [];
        this.idx = [];
    }

    Mesh.prototype.vertex = function (x, y, z, nx, ny, nz) {
        const i = this.pos.length / 3;
        this.pos.push(x, y, z);
        this.nrm.push(nx, ny, nz);
        return i;
    };

    Mesh.prototype.quad = function (a, b, c, d) {
        this.idx.push(a, b, c, a, c, d);
    };

    Mesh.prototype.tri = function (a, b, c) {
        this.idx.push(a, b, c);
    };

    /* A grid of vertices stitched into quads. rows/cols are counts, not spans. */
    Mesh.prototype.stitch = function (base, rows, cols, wrapCols) {
        const lastCol = wrapCols ? cols : cols - 1;
        for (let r = 0; r < rows - 1; r++) {
            for (let c = 0; c < lastCol; c++) {
                const c1 = (c + 1) % cols;
                this.quad(
                    base + r * cols + c,
                    base + (r + 1) * cols + c,
                    base + (r + 1) * cols + c1,
                    base + r * cols + c1
                );
            }
        }
    };

    function normalize(v) {
        const l = Math.hypot(v[0], v[1], v[2]) || 1;
        return [v[0] / l, v[1] / l, v[2] / l];
    }

    function cross(a, b) {
        return [
            a[1] * b[2] - a[2] * b[1],
            a[2] * b[0] - a[0] * b[2],
            a[0] * b[1] - a[1] * b[0],
        ];
    }

    /* --------------------------------------------------------- part builders */

    /*
     * Extrudes a closed 2D outline (given in the XY plane) into a slab of the given
     * thickness centred on z0. Used for every carbon plate on the airframe.
     */
    function extrudePolygon(mesh, rawOutline, z0, thickness, transform) {
        /* Normals and winding both depend on the outline running anticlockwise, so
         * measure the signed area and flip the ones that were written the other way. */
        let area = 0;
        for (let i = 0; i < rawOutline.length; i++) {
            const a = rawOutline[i], b = rawOutline[(i + 1) % rawOutline.length];
            area += a[0] * b[1] - b[0] * a[1];
        }
        const outline = area < 0 ? rawOutline.slice().reverse() : rawOutline;
        const n = outline.length;
        const zTop = z0 + thickness / 2;
        const zBot = z0 - thickness / 2;
        const put = (x, y, z, nx, ny, nz) => {
            if (transform) {
                const p = transform([x, y, z]);
                const nd = transform([x + nx, y + ny, z + nz]);
                return mesh.vertex(p[0], p[1], p[2], ...normalize([nd[0] - p[0], nd[1] - p[1], nd[2] - p[2]]));
            }
            return mesh.vertex(x, y, z, nx, ny, nz);
        };

        /* Caps: a triangle fan from the outline centroid keeps convex-ish plates clean. */
        let cx = 0, cy = 0;
        for (const p of outline) { cx += p[0]; cy += p[1]; }
        cx /= n; cy /= n;

        const topCentre = put(cx, cy, zTop, 0, 0, 1);
        const topRing = [];
        for (const p of outline) topRing.push(put(p[0], p[1], zTop, 0, 0, 1));
        for (let i = 0; i < n; i++) mesh.tri(topCentre, topRing[i], topRing[(i + 1) % n]);

        const botCentre = put(cx, cy, zBot, 0, 0, -1);
        const botRing = [];
        for (const p of outline) botRing.push(put(p[0], p[1], zBot, 0, 0, -1));
        for (let i = 0; i < n; i++) mesh.tri(botCentre, botRing[(i + 1) % n], botRing[i]);

        /* Wall: one quad per outline edge, with the edge normal so the rim catches light. */
        for (let i = 0; i < n; i++) {
            const a = outline[i], b = outline[(i + 1) % n];
            const ex = b[0] - a[0], ey = b[1] - a[1];
            const nl = Math.hypot(ex, ey) || 1;
            const nx = ey / nl, ny = -ex / nl;
            const v0 = put(a[0], a[1], zTop, nx, ny, 0);
            const v1 = put(b[0], b[1], zTop, nx, ny, 0);
            const v2 = put(b[0], b[1], zBot, nx, ny, 0);
            const v3 = put(a[0], a[1], zBot, nx, ny, 0);
            mesh.quad(v0, v1, v2, v3);
        }
    }

    /* A cylinder / truncated cone around the Z axis, from z0 to z1. */
    function cylinder(mesh, r0, r1, z0, z1, segs, capTop, capBottom, transform) {
        const put = (x, y, z, nx, ny, nz) => {
            if (transform) {
                const p = transform([x, y, z]);
                const nd = transform([x + nx, y + ny, z + nz]);
                return mesh.vertex(p[0], p[1], p[2], ...normalize([nd[0] - p[0], nd[1] - p[1], nd[2] - p[2]]));
            }
            return mesh.vertex(x, y, z, nx, ny, nz);
        };
        const slope = (r0 - r1) / (z1 - z0);
        const base = mesh.pos.length / 3;
        for (let ring = 0; ring < 2; ring++) {
            const z = ring ? z1 : z0;
            const r = ring ? r1 : r0;
            for (let s = 0; s < segs; s++) {
                const a = (s / segs) * Math.PI * 2;
                const cx = Math.cos(a), cy = Math.sin(a);
                put(cx * r, cy * r, z, ...normalize([cx, cy, slope]));
            }
        }
        mesh.stitch(base, 2, segs, true);

        if (capTop) {
            const c = put(0, 0, z1, 0, 0, 1);
            const ring = [];
            for (let s = 0; s < segs; s++) {
                const a = (s / segs) * Math.PI * 2;
                ring.push(put(Math.cos(a) * r1, Math.sin(a) * r1, z1, 0, 0, 1));
            }
            for (let s = 0; s < segs; s++) mesh.tri(c, ring[s], ring[(s + 1) % segs]);
        }
        if (capBottom) {
            const c = put(0, 0, z0, 0, 0, -1);
            const ring = [];
            for (let s = 0; s < segs; s++) {
                const a = (s / segs) * Math.PI * 2;
                ring.push(put(Math.cos(a) * r0, Math.sin(a) * r0, z0, 0, 0, -1));
            }
            for (let s = 0; s < segs; s++) mesh.tri(c, ring[(s + 1) % segs], ring[s]);
        }
    }

    /* A rounded box, built as a lofted stack so the silhouette never shows a hard corner. */
    function roundedBox(mesh, w, d, h, r, transform) {
        const outline = [];
        const corners = [[w / 2 - r, d / 2 - r], [-w / 2 + r, d / 2 - r], [-w / 2 + r, -d / 2 + r], [w / 2 - r, -d / 2 + r]];
        const startAngle = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
        for (let c = 0; c < 4; c++) {
            for (let s = 0; s <= 4; s++) {
                const a = startAngle[c] + (s / 4) * (Math.PI / 2);
                outline.push([corners[c][0] + Math.cos(a) * r, corners[c][1] + Math.sin(a) * r]);
            }
        }
        extrudePolygon(mesh, outline, 0, h, transform);
    }

    /*
     * One propeller blade, lofted from an aerofoil section that twists, tapers and
     * rakes back toward the tip. This is what makes the props read as real props
     * rather than as three flat paddles.
     */
    function propBlade(mesh, opts) {
        const rRoot = opts.rRoot, rTip = opts.rTip;
        const spanSteps = opts.spanSteps || 16;
        const chordSteps = 12;
        const base = mesh.pos.length / 3;

        /* Chord swells just outboard of the root, then tapers to a rounded tip. */
        const chordAt = (s) => {
            const swell = Math.sin(Math.pow(s, 0.62) * Math.PI);
            return opts.chord * (0.42 + 0.58 * swell) * (1 - 0.24 * s * s);
        };
        /* High pitch at the root washing out toward the tip, as on any race prop. */
        const twistAt = (s) => (opts.twistRoot + (opts.twistTip - opts.twistRoot) * Math.pow(s, 0.8));
        /* Blade rake: the tip trails the root, which is where the club's hem motif comes from. */
        const rakeAt = (s) => opts.rake * s * s;
        const thickAt = (s) => opts.thickness * (1 - 0.55 * s);

        const rows = [];
        for (let i = 0; i < spanSteps; i++) {
            const s = i / (spanSteps - 1);
            const r = rRoot + (rTip - rRoot) * s;
            const c = chordAt(s);
            const tw = twistAt(s);
            const rake = rakeAt(s);
            const th = thickAt(s);
            const ct = Math.cos(tw), st = Math.sin(tw);
            const camber = opts.camber * (1 - 0.4 * s);

            const section = [];
            /* Walk the upper surface out to the trailing edge, then the lower surface back. */
            for (let j = 0; j < chordSteps; j++) {
                const t = j / (chordSteps - 1);
                section.push([t, 1]);
            }
            for (let j = chordSteps - 2; j > 0; j--) {
                const t = j / (chordSteps - 1);
                section.push([t, -1]);
            }

            const pts = section.map(([t, side]) => {
                /* Parabolic camber line plus a NACA-ish thickness distribution. */
                const yc = camber * 4 * t * (1 - t);
                const yt = th * 5 * (0.2969 * Math.sqrt(Math.max(t, 0)) - 0.126 * t - 0.3516 * t * t + 0.2843 * t * t * t - 0.1015 * t * t * t * t);
                const off = yc + side * yt * 0.5;
                /* Local chordwise position, quarter-chord referenced. */
                const cw = (t - 0.28) * c;
                const y = cw * ct - off * c * st;
                const z = cw * st + off * c * ct;
                /* Rake sweeps the whole section around the hub axis. */
                const ca = Math.cos(rake), sa = Math.sin(rake);
                return [r * ca - y * sa, r * sa + y * ca, z];
            });
            rows.push(pts);
        }

        const cols = rows[0].length;
        for (let i = 0; i < rows.length; i++) {
            for (let j = 0; j < cols; j++) {
                const p = rows[i][j];
                /* Normals from the loft's own tangents keeps the aerofoil shading honest. */
                const pi = rows[Math.min(i + 1, rows.length - 1)][j];
                const pm = rows[Math.max(i - 1, 0)][j];
                const pj = rows[i][(j + 1) % cols];
                const pk = rows[i][(j - 1 + cols) % cols];
                const du = [pi[0] - pm[0], pi[1] - pm[1], pi[2] - pm[2]];
                const dv = [pj[0] - pk[0], pj[1] - pk[1], pj[2] - pk[2]];
                const n = normalize(cross(du, dv));
                mesh.vertex(p[0], p[1], p[2], n[0], n[1], n[2]);
            }
        }
        mesh.stitch(base, rows.length, cols, true);

        /* Close the root and the tip so the blade is a solid. */
        const capRing = (rowIndex, flip) => {
            const row = rows[rowIndex];
            let cx = 0, cy = 0, cz = 0;
            for (const p of row) { cx += p[0]; cy += p[1]; cz += p[2]; }
            cx /= row.length; cy /= row.length; cz /= row.length;
            const nrm = flip ? [-1, 0, 0] : [1, 0, 0];
            const centre = mesh.vertex(cx, cy, cz, ...nrm);
            const ring = row.map(p => mesh.vertex(p[0], p[1], p[2], ...nrm));
            for (let j = 0; j < ring.length; j++) {
                const a = ring[j], b = ring[(j + 1) % ring.length];
                if (flip) mesh.tri(centre, b, a); else mesh.tri(centre, a, b);
            }
        };
        capRing(0, true);
        capRing(rows.length - 1, false);
    }

    /* --------------------------------------------------------------- shaders */

    const VERT = `#version 300 es
    precision highp float;
    layout(location = 0) in vec3 aPos;
    layout(location = 1) in vec3 aNormal;
    uniform mat4 uProj;
    uniform mat4 uModel;
    uniform mat3 uNormalMat;
    out vec3 vNormal;
    out vec3 vView;
    out vec3 vLocal;
    void main() {
      vec4 world = uModel * vec4(aPos, 1.0);
      vNormal = normalize(uNormalMat * aNormal);
      vView = -world.xyz;
      vLocal = aPos;
      gl_Position = uProj * world;
    }`;

    const FRAG = `#version 300 es
    precision highp float;
    in vec3 vNormal;
    in vec3 vView;
    in vec3 vLocal;
    uniform vec3 uAlbedo;
    uniform float uRough;
    uniform float uMetal;
    uniform float uWeave;      // carbon-fibre twill strength
    uniform float uAlpha;
    uniform float uGlow;       // emissive lift, used for the status LEDs
    uniform vec3 uRimColor;
    out vec4 outColor;

    // Three lights, chosen to echo the flyer: a warm key from above-front, a cool
    // fill from below, and a hard electric-blue rim that separates the quad from
    // the navy behind it. All light maths happens in linear space.
    const vec3 KEY_DIR   = vec3(-0.30,  0.55,  0.78);
    const vec3 KEY_COL   = vec3(1.00,  0.95,  0.88);
    const vec3 FILL_DIR  = vec3( 0.68, -0.50,  0.28);
    const vec3 FILL_COL  = vec3(0.16,  0.34,  0.60);
    const vec3 RIM_DIR   = vec3( 0.28,  0.16, -0.94);
    const vec3 SKY_COL   = vec3(0.10,  0.22,  0.38);
    const vec3 GROUND_COL= vec3(0.01,  0.02,  0.04);

    vec3 toLinear(vec3 c) { return pow(c, vec3(2.2)); }
    vec3 toSRGB(vec3 c)   { return pow(max(c, vec3(0.0)), vec3(1.0 / 2.2)); }

    float spec(vec3 n, vec3 v, vec3 l, float rough) {
      vec3 h = normalize(l + v);
      float shin = mix(340.0, 8.0, clamp(rough, 0.0, 1.0));
      return pow(max(dot(n, h), 0.0), shin) * mix(1.0, 0.05, rough);
    }

    // Narkowicz's ACES approximation: keeps highlights from going chalky and,
    // more importantly here, keeps the orange orange as it rolls off.
    vec3 tonemap(vec3 x) {
      return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
    }

    void main() {
      vec3 n = normalize(vNormal);
      vec3 v = normalize(vView);
      if (!gl_FrontFacing) n = -n;

      vec3 albedo = toLinear(uAlbedo);
      float rough = uRough;

      // Procedural twill. Two out-of-phase square waves in the part's own space give
      // the over-under weave without a texture fetch or an image download.
      if (uWeave > 0.0) {
        vec2 w = vLocal.xy * 2.6;
        float a = step(0.5, fract(w.x));
        float b = step(0.5, fract(w.y));
        float weave = abs(a - b);
        albedo *= mix(1.0, mix(0.72, 1.45, weave), uWeave);
        rough = clamp(rough + (0.5 - weave) * 0.22 * uWeave, 0.04, 1.0);
      }

      float ndl = max(dot(n, normalize(KEY_DIR)), 0.0);
      float ndf = max(dot(n, normalize(FILL_DIR)), 0.0);
      vec3 hemi = mix(GROUND_COL, SKY_COL, n.z * 0.5 + 0.5);

      vec3 diffuse = albedo * (KEY_COL * ndl * 1.42 + FILL_COL * ndf * 0.70 + hemi * 0.95);

      vec3 specTint = mix(vec3(0.32), albedo, uMetal);
      vec3 specular = specTint * (
        KEY_COL * spec(n, v, normalize(KEY_DIR), rough) * 1.9 +
        FILL_COL * spec(n, v, normalize(FILL_DIR), rough) * 1.2
      );

      // Rim light. Tight fresnel gated by the back light's direction, so it draws a
      // line along the silhouette instead of washing a blue veil over everything.
      float fres = pow(1.0 - max(dot(n, v), 0.0), 5.0);
      float rimGeo = max(dot(n, normalize(RIM_DIR)), 0.0);
      vec3 rim = toLinear(uRimColor) * (fres * rimGeo * 0.85 + pow(rimGeo, 5.0) * 0.12);

      vec3 color = diffuse + specular + rim + albedo * uGlow;
      outColor = vec4(toSRGB(tonemap(color * 1.18)), uAlpha);
    }`;

    /* ---------------------------------------------------------- the airframe */

    /* Everything below is in centimetres: a true 5" race quad, 220 mm motor to motor. */
    const MOTOR_R = 11.0;          // motor centre from the middle of the frame
    const PROP_TIP = 6.35;         // 5 inch propeller
    const SPAN = MOTOR_R * Math.SQRT1_2 + PROP_TIP; // furthest painted pixel from centre
    const ARM_ANGLES = [Math.PI / 4, Math.PI * 3 / 4, Math.PI * 5 / 4, Math.PI * 7 / 4];

    const PALETTE = {
        carbon: { albedo: [0.052, 0.058, 0.068], rough: 0.34, metal: 0.15, weave: 1.0 },
        carbonEdge: { albedo: [0.085, 0.092, 0.105], rough: 0.5, metal: 0.1, weave: 0.0 },
        alloy: { albedo: [0.17, 0.185, 0.21], rough: 0.36, metal: 0.90, weave: 0.0 },
        motorDark: { albedo: [0.075, 0.080, 0.090], rough: 0.30, metal: 0.6, weave: 0.0 },
        orange: { albedo: [0.95, 0.295, 0.030], rough: 0.46, metal: 0.05, weave: 0.0 },
        orangeDeep: { albedo: [0.72, 0.195, 0.015], rough: 0.40, metal: 0.05, weave: 0.0 },
        prop: { albedo: [1.00, 0.325, 0.020], rough: 0.26, metal: 0.02, weave: 0.0 },
        lens: { albedo: [0.02, 0.03, 0.05], rough: 0.06, metal: 0.4, weave: 0.0 },
        led: { albedo: [0.30, 0.72, 1.00], rough: 0.2, metal: 0.0, weave: 0.0, glow: 0.85 },
    };

    function buildAirframe() {
        /* Each entry becomes one draw call: a mesh plus the material it is painted with. */
        const groups = {};
        const get = (name) => (groups[name] || (groups[name] = new Mesh()));

        const carbon = get('carbon');
        const alloy = get('alloy');
        const motorDark = get('motorDark');
        const orange = get('orange');
        const orangeDeep = get('orangeDeep');
        const lens = get('lens');
        const led = get('led');

        /*
         * Arms: one swept carbon arm per corner. Wide at the root where the load is,
         * waisted through the middle, then flaring into a round motor pad — the shape
         * every 5" race frame has settled on.
         */
        for (const a of ARM_ANGLES) {
            const ca = Math.cos(a), sa = Math.sin(a);
            const rot = (p) => [p[0] * ca - p[1] * sa, p[0] * sa + p[1] * ca, p[2]];
            const outline = [[1.2, 1.28], [3.6, 1.02], [6.4, 0.82], [8.9, 0.80]];
            /* Motor pad: a semicircle of radius 1.62 wrapped around the motor axis. */
            for (let i = 0; i <= 12; i++) {
                const t = Math.PI / 2 - (i / 12) * Math.PI;
                outline.push([MOTOR_R + Math.cos(t) * 1.62, Math.sin(t) * 1.62]);
            }
            outline.push([8.9, -0.80], [6.4, -0.82], [3.6, -1.02], [1.2, -1.28], [0.9, 0]);
            extrudePolygon(carbon, outline, 0.0, 0.58, rot);
        }

        /* --- bottom plate: the frame's spine, an elongated hexagon under the stack */
        extrudePolygon(carbon, [
            [4.4, 1.0], [3.2, 2.5], [-3.2, 2.5], [-4.4, 1.0],
            [-4.4, -1.0], [-3.2, -2.5], [3.2, -2.5], [4.4, -1.0],
        ], -0.55, 0.42);

        /* --- top plate: narrower, floating on standoffs above the electronics */
        extrudePolygon(carbon, [
            [4.0, 0.9], [2.6, 2.15], [-2.9, 2.15], [-4.0, 0.9],
            [-4.0, -0.9], [-2.9, -2.15], [2.6, -2.15], [4.0, -0.9],
        ], 3.15, 0.36);

        /* --- standoffs between the plates */
        for (const [sx, sy] of [[3.15, 1.72], [-3.15, 1.72], [-3.15, -1.72], [3.15, -1.72]]) {
            cylinder(alloy, 0.30, 0.30, -0.34, 3.0, 12, false, false,
                (p) => [p[0] + sx, p[1] + sy, p[2]]);
        }

        /* --- flight-controller stack, glimpsed between the plates */
        const stackBoard = [[1.75, 1.75], [-1.75, 1.75], [-1.75, -1.75], [1.75, -1.75]];
        extrudePolygon(get('carbonEdge'), stackBoard, 0.85, 0.55);
        extrudePolygon(get('carbonEdge'), stackBoard, 1.95, 0.55);

        /* --- motors: a machined base, a bell with cooling flutes, and an orange nut */
        for (const a of ARM_ANGLES) {
            const mx = Math.cos(a) * MOTOR_R, my = Math.sin(a) * MOTOR_R;
            const at = (p) => [p[0] + mx, p[1] + my, p[2]];
            cylinder(motorDark, 1.22, 1.34, 0.31, 0.62, 20, false, false, at);   // base
            cylinder(motorDark, 1.42, 1.42, 0.62, 1.72, 20, false, false, at);   // bell wall
            cylinder(alloy, 1.42, 1.05, 1.72, 2.02, 20, true, false, at);        // bell top
            /* Flutes: twelve shallow ribs so the bell catches the rim light. */
            for (let f = 0; f < 12; f++) {
                const fa = (f / 12) * Math.PI * 2;
                const fx = Math.cos(fa) * 1.30, fy = Math.sin(fa) * 1.30;
                cylinder(alloy, 0.14, 0.14, 0.70, 1.68, 6, false, false,
                    (p) => at([p[0] + fx, p[1] + fy, p[2]]));
            }
            cylinder(orangeDeep, 0.52, 0.46, 2.02, 2.52, 12, true, false, at);   // prop nut
        }

        /* --- canopy: the orange printed pod, swept back over the camera */
        const canopy = orange;
        const canopyRows = [
            { x: 2.55, w: 1.05, z0: 0.95, z1: 2.15 },
            { x: 1.70, w: 1.72, z0: 0.90, z1: 3.35 },
            { x: 0.55, w: 1.95, z0: 0.90, z1: 4.05 },
            { x: -0.85, w: 1.92, z0: 0.90, z1: 4.15 },
            { x: -2.20, w: 1.70, z0: 0.90, z1: 3.60 },
            { x: -3.15, w: 1.30, z0: 0.90, z1: 2.55 },
        ];
        buildShell(canopy, canopyRows);

        /*
         * Camera. The block sits inside the canopy nose and the lens points forward and
         * slightly up, the way a race quad is actually tilted. camAt() rotates the whole
         * assembly about Y (pitch) and drops it at the nose.
         */
        const camTilt = 0.42;
        const camAt = (p) => {
            const c = Math.cos(camTilt), s = Math.sin(camTilt);
            return [p[0] * c + p[2] * s + 2.35, p[1], -p[0] * s + p[2] * c + 2.30];
        };
        /* Body: a rounded slab lying in the camera's own frame (X forward, Z up). */
        roundedBox(motorDark, 1.55, 1.5, 1.45, 0.26,
            (p) => camAt([p[2] - 0.35, p[1], p[0]]));
        /* Lens barrel: a short cone along the camera's forward axis. */
        cylinder(lens, 0.60, 0.50, 0.30, 1.05, 18, true, false,
            (p) => camAt([p[2], p[1], p[0]]));

        /* --- rear stack cover and the status LEDs that read as two blue dots */
        extrudePolygon(orangeDeep, [
            [-3.05, 1.35], [-4.05, 0.75], [-4.05, -0.75], [-3.05, -1.35],
        ], 1.9, 1.9);
        for (const sy of [0.62, -0.62]) {
            cylinder(led, 0.22, 0.16, 3.42, 3.60, 10, true, false,
                (p) => [p[0] - 3.45, p[1] + sy, p[2]]);
        }

        /* --- antennas: two short whips raked back and up off the rear corners */
        for (const sy of [1, -1]) {
            const dir = normalize([-0.72, sy * 0.34, 0.60]);
            cylinder(get('carbonEdge'), 0.11, 0.09, 0, 3.1, 8, true, false,
                orientAlong(dir, [-3.35, sy * 0.9, 2.1]));
        }

        return groups;
    }

    /*
     * Builds a transform that stands a Z-aligned primitive up along an arbitrary
     * direction and drops it at an origin. Saves hand-rolling a rotation per part.
     */
    function orientAlong(dir, origin) {
        const w = normalize(dir);
        const helper = Math.abs(w[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1];
        const u = normalize(cross(helper, w));
        const v = cross(w, u);
        return (p) => [
            origin[0] + u[0] * p[0] + v[0] * p[1] + w[0] * p[2],
            origin[1] + u[1] * p[0] + v[1] * p[1] + w[1] * p[2],
            origin[2] + u[2] * p[0] + v[2] * p[1] + w[2] * p[2],
        ];
    }

    /*
     * Lofts a closed shell from a list of cross-sections defined along X. Used for the
     * canopy: each row is a rounded rectangle in the YZ plane, and the rows are stitched
     * front to back, then capped.
     */
    function buildShell(mesh, rows) {
        const SEG = 14;
        const base = mesh.pos.length / 3;
        const ring = (row) => {
            const pts = [];
            const cz = (row.z0 + row.z1) / 2;
            const hz = (row.z1 - row.z0) / 2;
            for (let s = 0; s < SEG; s++) {
                const a = (s / SEG) * Math.PI * 2;
                /* Squircle: rounder on top, flatter underneath, like a printed canopy. */
                const c = Math.cos(a), si = Math.sin(a);
                const p = 2.4;
                const kx = Math.sign(c) * Math.pow(Math.abs(c), 2 / p);
                const ky = Math.sign(si) * Math.pow(Math.abs(si), 2 / p);
                pts.push([row.x, kx * row.w, cz + ky * hz * (si > 0 ? 1 : 0.55)]);
            }
            return pts;
        };
        const built = rows.map(ring);
        for (let i = 0; i < built.length; i++) {
            for (let s = 0; s < SEG; s++) {
                const p = built[i][s];
                const pi = built[Math.min(i + 1, built.length - 1)][s];
                const pm = built[Math.max(i - 1, 0)][s];
                const pj = built[i][(s + 1) % SEG];
                const pk = built[i][(s - 1 + SEG) % SEG];
                const du = [pi[0] - pm[0], pi[1] - pm[1], pi[2] - pm[2]];
                const dv = [pj[0] - pk[0], pj[1] - pk[1], pj[2] - pk[2]];
                const n = normalize(cross(du, dv));
                mesh.vertex(p[0], p[1], p[2], n[0], n[1], n[2]);
            }
        }
        mesh.stitch(base, built.length, SEG, true);

        const cap = (rowIdx, flip) => {
            const row = built[rowIdx];
            let cx = 0, cy = 0, cz = 0;
            for (const p of row) { cx += p[0]; cy += p[1]; cz += p[2]; }
            cx /= row.length; cy /= row.length; cz /= row.length;
            const n = flip ? [-1, 0, 0] : [1, 0, 0];
            const c = mesh.vertex(cx, cy, cz, ...n);
            const ids = row.map(p => mesh.vertex(p[0], p[1], p[2], ...n));
            for (let s = 0; s < ids.length; s++) {
                const a = ids[s], b = ids[(s + 1) % ids.length];
                if (flip) mesh.tri(c, b, a); else mesh.tri(c, a, b);
            }
        };
        cap(0, false);
        cap(built.length - 1, true);
    }

    function buildPropeller(quality) {
        const mesh = new Mesh();
        cylinder(mesh, 0.78, 0.62, 0.0, 0.52, 16, true, false);
        for (let b = 0; b < 3; b++) {
            const a = (b / 3) * Math.PI * 2;
            const rot = new Mesh();
            propBlade(rot, {
                rRoot: 0.62, rTip: PROP_TIP,
                chord: 1.62, twistRoot: 0.40, twistTip: 0.13,
                rake: 0.30, thickness: 0.052, camber: 0.030,
                spanSteps: quality === 'low' ? 9 : 15,
            });
            /* Fold the blade into the hub mesh, rotated into place. */
            const ca = Math.cos(a), sa = Math.sin(a);
            const offset = mesh.pos.length / 3;
            for (let i = 0; i < rot.pos.length; i += 3) {
                const x = rot.pos[i], y = rot.pos[i + 1], z = rot.pos[i + 2];
                const nx = rot.nrm[i], ny = rot.nrm[i + 1], nz = rot.nrm[i + 2];
                mesh.pos.push(x * ca - y * sa, x * sa + y * ca, z + 0.30);
                mesh.nrm.push(nx * ca - ny * sa, nx * sa + ny * ca, nz);
            }
            for (const idx of rot.idx) mesh.idx.push(idx + offset);
        }
        return mesh;
    }

    /* ------------------------------------------------------------- renderer */

    function compile(gl, type, src) {
        const sh = gl.createShader(type);
        gl.shaderSource(sh, src);
        gl.compileShader(sh);
        if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
            const log = gl.getShaderInfoLog(sh);
            gl.deleteShader(sh);
            throw new Error('shader: ' + log);
        }
        return sh;
    }

    function uploadMesh(gl, mesh) {
        const vao = gl.createVertexArray();
        gl.bindVertexArray(vao);
        const vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        const count = mesh.pos.length / 3;
        const interleaved = new Float32Array(count * 6);
        for (let i = 0; i < count; i++) {
            interleaved[i * 6] = mesh.pos[i * 3];
            interleaved[i * 6 + 1] = mesh.pos[i * 3 + 1];
            interleaved[i * 6 + 2] = mesh.pos[i * 3 + 2];
            interleaved[i * 6 + 3] = mesh.nrm[i * 3];
            interleaved[i * 6 + 4] = mesh.nrm[i * 3 + 1];
            interleaved[i * 6 + 5] = mesh.nrm[i * 3 + 2];
        }
        gl.bufferData(gl.ARRAY_BUFFER, interleaved, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
        const ibo = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
        const use32 = count > 65535;
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
            use32 ? new Uint32Array(mesh.idx) : new Uint16Array(mesh.idx), gl.STATIC_DRAW);
        gl.bindVertexArray(null);
        return { vao, vbo, ibo, count: mesh.idx.length, type: use32 ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT };
    }

    function create(canvas, options) {
        options = options || {};
        let gl;
        try {
            gl = canvas.getContext('webgl2', {
                alpha: true, antialias: true, premultipliedAlpha: true,
                depth: true, powerPreference: 'high-performance', failIfMajorPerformanceCaveat: false,
            });
        } catch (e) { gl = null; }
        if (!gl) return null;

        let program;
        try {
            program = gl.createProgram();
            gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
            gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG));
            gl.linkProgram(program);
            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
                throw new Error('link: ' + gl.getProgramInfoLog(program));
            }
        } catch (e) {
            if (options.onError) options.onError(e);
            return null;
        }

        const U = {};
        for (const name of ['uProj', 'uModel', 'uNormalMat', 'uAlbedo', 'uRough', 'uMetal',
            'uWeave', 'uAlpha', 'uGlow', 'uRimColor']) {
            U[name] = gl.getUniformLocation(program, name);
        }

        const quality = options.quality || 'high';
        const airframe = buildAirframe();
        const parts = Object.keys(airframe).map(name => ({
            material: PALETTE[name] || PALETTE.carbon,
            gpu: uploadMesh(gl, airframe[name]),
        }));
        const propGpu = uploadMesh(gl, buildPropeller(quality));

        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        const proj = M.identity();
        const model = M.identity();
        const tmpA = M.identity(), tmpB = M.identity(), tmpC = M.identity();
        const nrmMat = new Float32Array(9);

        let vw = 1, vh = 1, dpr = 1;
        const FOV = 26 * Math.PI / 180;
        const CAM_D = 120;

        function resize(cssW, cssH, dprCap) {
            dpr = Math.min(global.devicePixelRatio || 1, dprCap || 2);
            vw = Math.max(1, Math.round(cssW));
            vh = Math.max(1, Math.round(cssH));
            canvas.width = Math.max(1, Math.round(vw * dpr));
            canvas.height = Math.max(1, Math.round(vh * dpr));
            gl.viewport(0, 0, canvas.width, canvas.height);
            M.perspective(proj, FOV, vw / vh, 1, 900);
        }

        function drawPart(gpu, material, matrix, alpha) {
            gl.uniformMatrix4fv(U.uModel, false, matrix);
            M.normalFromMat4(nrmMat, matrix);
            gl.uniformMatrix3fv(U.uNormalMat, false, nrmMat);
            gl.uniform3fv(U.uAlbedo, material.albedo);
            gl.uniform1f(U.uRough, material.rough);
            gl.uniform1f(U.uMetal, material.metal);
            gl.uniform1f(U.uWeave, material.weave || 0);
            gl.uniform1f(U.uGlow, material.glow || 0);
            gl.uniform1f(U.uAlpha, alpha);
            gl.bindVertexArray(gpu.vao);
            gl.drawElements(gl.TRIANGLES, gpu.count, gpu.type, 0);
        }

        /*
         * framing = { x, y, span, tilt, yaw, roll, spin, blur }
         *   x, y   normalised device position of the quad's centre (-1..1)
         *   span   the quad's painted diameter as a fraction of the viewport height
         */
        function draw(state) {
            const f = state.framing;
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            gl.useProgram(program);
            gl.uniformMatrix4fv(U.uProj, false, proj);
            gl.uniform3fv(U.uRimColor, f.rim || [0.16, 0.52, 0.95]);

            /* Place the quad on the z = -CAM_D plane, then push it back by f.depth. */
            const halfH = CAM_D * Math.tan(FOV / 2);
            const halfW = halfH * (vw / vh);
            const scale = (f.span * halfH) / SPAN;
            const worldX = f.x * halfW;
            const worldY = f.y * halfH;

            M.translation(tmpA, worldX, worldY, -CAM_D - (f.depth || 0));
            M.rotationZ(tmpB, f.yaw || 0);
            M.multiply(model, tmpA, tmpB);
            M.rotationY(tmpB, f.roll || 0);
            M.multiply(tmpC, model, tmpB);
            M.rotationX(tmpB, f.tilt || 0);
            M.multiply(model, tmpC, tmpB);
            M.scaling(tmpB, scale);
            M.multiply(tmpC, model, tmpB);
            model.set(tmpC);

            gl.depthMask(true);
            for (const p of parts) drawPart(p.gpu, p.material, model, 1);

            /*
             * Propellers. When they are spinning hard we lay down a few ghosted copies
             * behind the leading one: cheap, and far more convincing than a spin so fast
             * it strobes at 60 fps.
             */
            const blur = Math.max(0, Math.min(1, f.blur || 0));
            const ghosts = blur > 0.02 ? (quality === 'low' ? 2 : 4) : 0;
            for (let i = 0; i < 4; i++) {
                const a = ARM_ANGLES[i];
                const px = Math.cos(a) * MOTOR_R, py = Math.sin(a) * MOTOR_R;
                const dir = (i % 2 === 0) ? 1 : -1;
                const baseSpin = (f.spin || 0) * dir + i * 1.1;

                for (let g = ghosts; g >= 0; g--) {
                    const lag = (g / (ghosts + 1)) * blur * 1.15;
                    const alpha = g === 0 ? 1 : (0.34 * (1 - g / (ghosts + 1)) * blur);
                    if (alpha < 0.02) continue;
                    M.translation(tmpA, px, py, 2.45);
                    M.rotationZ(tmpB, baseSpin - dir * lag);
                    M.multiply(tmpC, tmpA, tmpB);
                    M.multiply(tmpA, model, tmpC);
                    gl.depthMask(g === 0);
                    drawPart(propGpu, PALETTE.prop, tmpA, alpha);
                }
            }
            gl.depthMask(true);
        }

        function dispose() {
            for (const p of parts) {
                gl.deleteVertexArray(p.gpu.vao);
                gl.deleteBuffer(p.gpu.vbo);
                gl.deleteBuffer(p.gpu.ibo);
            }
            gl.deleteVertexArray(propGpu.vao);
            gl.deleteBuffer(propGpu.vbo);
            gl.deleteBuffer(propGpu.ibo);
            gl.deleteProgram(program);
            const lose = gl.getExtension('WEBGL_lose_context');
            if (lose) lose.loseContext();
        }

        return { resize, draw, dispose, gl, SPAN };
    }

    global.WCMRCQuad = { create, SPAN };
})(window);
