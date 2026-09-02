/*
 * champs-hero.js — choreography for the State Championships hero.
 *
 * Four jobs:
 *   1. Fly the quad in from the back of the scene and land it, exactly, in the box
 *      the CSS reserved for it (.champs-quad-slot). Because the target comes from
 *      real layout, the landing is correct at every viewport without magic numbers.
 *   2. Keep the fixed header legible while it sits over the dark hero.
 *   3. Loop the supporter strip seamlessly.
 *   4. Count down to the first gate, and stand down gracefully once the event is past.
 *
 * Every step degrades on its own: no WebGL, no sticky, or reduced motion each leave a
 * hero that is still the finished flyer, just without the flight.
 */
(function () {
    'use strict';

    const stage = document.querySelector('.champs');
    if (!stage) return;

    const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    /* ------------------------------------------------------- supporter strip */

    /*
     * A seamless marquee needs the track to hold exactly two copies of the set, so
     * translating it by -50% lands back on an identical frame. The duplicate is
     * built here rather than in the HTML: it is decorative repetition, and screen
     * readers should only ever meet the list once.
     */
    (function buildMarquee() {
        const track = document.querySelector('.champs-marquee-track');
        const set = track && track.querySelector('.champs-marquee-set');
        if (!track || !set) return;

        const clone = set.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        track.appendChild(clone);

        /* Hold a steady scroll speed whatever the strip ends up measuring. */
        const retime = () => {
            const width = set.getBoundingClientRect().width;
            if (!width) return;
            const seconds = Math.max(28, Math.round(width / 46));
            track.style.setProperty('--champs-marquee-duration', seconds + 's');
        };
        retime();
        window.addEventListener('load', retime);
        window.addEventListener('resize', retime, { passive: true });
    })();

    /* ------------------------------------------------------------- countdown */

    (function countdown() {
        const el = document.getElementById('champsCountdown');
        if (!el) return;
        const clock = el.querySelector('.champs-countdown-clock');
        const state = el.querySelector('.champs-countdown-state');
        const cells = {};
        el.querySelectorAll('[data-unit]').forEach(c => { cells[c.dataset.unit] = c; });
        const start = new Date(el.dataset.eventStart);
        const end = new Date(el.dataset.eventEnd);
        if (isNaN(start) || isNaN(end)) return;

        const pad = n => (n < 10 ? '0' : '') + n;

        const show = (text) => {
            clock.hidden = true;
            state.hidden = false;
            state.textContent = text;
        };

        let timer = null;
        const tick = () => {
            const left = start.getTime() - Date.now();
            if (left <= 0) {
                window.clearInterval(timer);
                show(Date.now() < end.getTime()
                    ? 'Racing now at Thomas Kelly Pavilion.'
                    : 'The 2026 state champs are done.');
                return;
            }
            const s = Math.floor(left / 1000);
            cells.days.textContent = Math.floor(s / 86400);
            cells.hours.textContent = pad(Math.floor(s / 3600) % 24);
            cells.minutes.textContent = pad(Math.floor(s / 60) % 60);
            cells.seconds.textContent = pad(s % 60);
        };

        if (Date.now() >= start.getTime()) {
            tick();
            return;
        }
        tick();
        timer = window.setInterval(tick, 1000);
    })();

    /* ----------------------------------------------------------- header state */

    /*
     * The header is an opaque slate bar built for a light page. Over the navy hero
     * that reads as a slab, so it goes transparent (with a scrim, to keep the links
     * legible) until the hero has scrolled past.
     */
    (function headerState() {
        const header = document.querySelector('header');
        if (!header) return;
        let ticking = false;

        const apply = () => {
            ticking = false;
            const overHero = window.scrollY < stage.offsetHeight - 120;
            header.classList.toggle('is-over-hero', overHero);
            /* Keep the back-to-top button clear of the hero's supporter band. */
            document.body.classList.toggle('champs-in-view', overHero);
        };
        apply();
        window.addEventListener('scroll', () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(apply);
        }, { passive: true });
        window.addEventListener('resize', apply, { passive: true });
    })();

    /* --------------------------------------------------------------- the quad */

    const canvas = document.getElementById('champsQuad');
    const pin = stage.querySelector('.champs-pin');
    const slot = stage.querySelector('.champs-quad-slot');
    const bloom = stage.querySelector('.champs-bloom');
    const streaks = stage.querySelector('.champs-streaks');
    const numeral = stage.querySelector('.champs-numeral');
    if (!canvas || !pin || !slot) return;

    const quad = window.WCMRCQuad ? window.WCMRCQuad.create(canvas) : null;
    if (!quad) {
        /*
         * No WebGL. Swap in the pre-rendered still of the same quad in the same pose
         * and size it into the same slot, so the flyer composition is intact — it just
         * does not fly.
         */
        canvas.style.display = 'none';
        stage.classList.add('is-static', 'no-quad');
        const placeStill = () => {
            const rect = pin.getBoundingClientRect();
            const slotRect = slot.getBoundingClientRect();
            if (!rect.width || !rect.height) return;
            stage.style.setProperty('--champs-fallback-x',
                (((slotRect.left - rect.left + slotRect.width / 2) / rect.width) * 100).toFixed(2) + '%');
            stage.style.setProperty('--champs-fallback-y',
                (((slotRect.top - rect.top + slotRect.height / 2) / rect.height) * 100).toFixed(2) + '%');
            stage.style.setProperty('--champs-fallback-w',
                ((Math.min(slotRect.width, slotRect.height) / rect.width) * 100).toFixed(2) + '%');
        };
        placeStill();
        window.addEventListener('resize', placeStill, { passive: true });
        window.addEventListener('load', placeStill);
        return;
    }

    /*
     * Ask the pin itself whether it is pinning. That single question covers both
     * cases at once: an engine that does not support position:sticky, and the short
     * viewport media query that deliberately turns the pin off. No scroll probing —
     * nudging the scroll position to test it would fight the user's finger on iOS.
     */
    function stickyWorks() {
        return getComputedStyle(pin).position === 'sticky';
    }

    const LOCKED = { tilt: -0.30, yaw: 0.22, roll: 0.05 };
    /*
     * The quad starts deep in the scene and only slightly off its mark: it should read
     * as approaching from the background rather than swooping in from off-frame, and it
     * must never cross the headline on its way in.
     */
    const ENTRY = { tilt: -0.72, yaw: 1.68, roll: 0.34, depth: 255, dx: 0.28, dy: 0.32 };
    /* How much of the reserved slot the quad's painted span should fill. */
    const SLOT_FILL = 0.96;

    let framing = { x: 0, y: 0, span: 0.5 };
    let stageWidth = 0;
    let stageHeight = 0;
    let pinHeight = 0;
    let travel = 1;
    let progress = 0;
    let target = 0;
    let running = false;
    let spin = 0;
    let lastTime = 0;
    let staticMode = false;
    let frozen = false;

    function measure() {
        const rect = pin.getBoundingClientRect();
        const slotRect = slot.getBoundingClientRect();
        const w = rect.width, h = rect.height;
        if (!w || !h) return;

        quad.resize(w, h, window.innerWidth < 700 ? 1.75 : 2);

        /*
         * Convert the slot into the renderer's framing: a centre in normalised device
         * coordinates and a painted span measured as a fraction of the stage height.
         */
        const cx = slotRect.left - rect.left + slotRect.width / 2;
        const cy = slotRect.top - rect.top + slotRect.height / 2;
        framing.x = (cx / w) * 2 - 1;
        framing.y = 1 - (cy / h) * 2;
        framing.span = (Math.min(slotRect.width, slotRect.height) * SLOT_FILL) / h;

        stageWidth = w;
        pinHeight = h;
        stageHeight = stage.offsetHeight;
        travel = Math.max(1, stageHeight - h);
    }

    function readProgress() {
        if (staticMode) return 1;
        const top = stage.getBoundingClientRect().top;
        /* 0 when the stage's top reaches the viewport top, 1 once it has run out. */
        return Math.min(1, Math.max(0, -top / travel));
    }

    /* Slow-in, slow-out. Deliberately not a spring: the landing has to be exact. */
    function easeInOut(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function easeOut(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    function frame(now) {
        const dt = lastTime ? Math.min(0.05, (now - lastTime) / 1000) : 0.016;
        lastTime = now;

        /*
         * Chase the scroll position rather than snapping to it. One exponential
         * smoother is enough to take the stutter out of coarse wheel steps without
         * ever overshooting the landing.
         */
        progress += (target - progress) * Math.min(1, dt * 9);
        if (Math.abs(target - progress) < 0.0005) progress = target;

        /* The flight is done well before the stage releases, so the finished
           composition gets a beat of screen time on its own. */
        const flight = easeInOut(Math.min(1, progress / 0.78));
        /* Depth rides the same curve as the pose: apparent size then grows the way a
           real approach does — slowly at distance, quickly in the last stretch. */
        const arrival = flight;

        const blur = Math.pow(1 - flight, 1.35);
        /* Hard spin on approach, easing to a slow, crisp idle once it has landed. */
        const rpm = 46 * blur + 0.55;
        spin += dt * rpm;

        /* A small hover once parked, so the quad reads as flying, not pasted on. */
        const settle = Math.max(0, flight - 0.82) / 0.18;
        const bob = Math.sin(now / 1400) * 0.012 * settle;
        const sway = Math.sin(now / 2100) * 0.018 * settle;

        const f = {
            x: framing.x + (1 - flight) * ENTRY.dx,
            y: framing.y + (1 - flight) * ENTRY.dy + bob,
            span: framing.span,
            depth: ENTRY.depth * (1 - arrival),
            tilt: ENTRY.tilt + (LOCKED.tilt - ENTRY.tilt) * flight,
            yaw: ENTRY.yaw + (LOCKED.yaw - ENTRY.yaw) * flight + sway,
            roll: ENTRY.roll + (LOCKED.roll - ENTRY.roll) * flight,
            spin: spin,
            blur: blur,
            rim: [0.16, 0.52, 0.95],
        };
        quad.draw({ progress: progress, time: now, framing: f });

        /* Keep the bloom under the quad, growing as it closes on the camera. */
        if (bloom) {
            const bx = ((f.x + 1) / 2 - 0.5) * stageWidth;
            const by = (0.5 - (f.y + 1) / 2) * pinHeight;
            const scale = 0.40 + 0.60 * arrival;
            bloom.style.transform = 'translate3d(' + bx.toFixed(1) + 'px,' + by.toFixed(1) + 'px,0) scale(' + scale.toFixed(3) + ')';
            bloom.style.opacity = (0.55 + 0.45 * arrival).toFixed(3);
        }
        if (streaks) streaks.style.opacity = (0.45 + 0.75 * blur).toFixed(3);
        if (numeral) {
            numeral.style.transform = 'translate3d(0,' + (progress * -34).toFixed(2) + 'px,0)';
        }

        /*
         * Idle on once landed — but only while the hero is on screen, and never under
         * prefers-reduced-motion, where a single settled frame is the whole animation.
         */
        if (running && !frozen) requestAnimationFrame(frame);
    }

    function start() {
        if (frozen) { drawOnce(); return; }
        if (running) return;
        running = true;
        lastTime = 0;
        requestAnimationFrame(frame);
    }

    /* One settled frame, for the reduced-motion path. */
    function drawOnce() {
        lastTime = 0;
        const wasRunning = running;
        running = false;
        frame(performance.now());
        running = wasRunning;
    }

    function stop() {
        running = false;
    }

    function onScroll() {
        target = readProgress();
        if (staticMode) target = 1;
    }

    /* Only render while the hero is in view — a hero animation has no business
       burning a phone's battery halfway down the gallery. */
    if ('IntersectionObserver' in window) {
        new IntersectionObserver((entries) => {
            for (const e of entries) {
                if (e.isIntersecting) start(); else stop();
            }
        }, { rootMargin: '120px' }).observe(stage);
    } else {
        start();
    }

    function applyMotionMode() {
        frozen = reduceMotionQuery.matches;
        /*
         * Without a working pin there is nothing to choreograph against, so the hero
         * collapses to one viewport with the quad already landed.
         */
        staticMode = frozen || !stickyWorks();
        stage.classList.toggle('is-static', staticMode);
        measure();
        onScroll();
        if (staticMode) {
            progress = 1;
            target = 1;
            spin = 0.42;
        }
        if (frozen) {
            running = false;
            drawOnce();
        } else {
            start();
        }
    }

    applyMotionMode();
    if (reduceMotionQuery.addEventListener) {
        reduceMotionQuery.addEventListener('change', applyMotionMode);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    /* A resize can cross the short-viewport breakpoint, which changes whether the
       hero pins at all — so re-decide the mode rather than only re-measuring. */
    window.addEventListener('resize', applyMotionMode, { passive: true });
    window.addEventListener('orientationchange', () => {
        window.setTimeout(() => { measure(); onScroll(); }, 250);
    });
    /* Fonts land after first paint and can change the slot's height. */
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => { measure(); onScroll(); });
    }
    window.addEventListener('load', () => { measure(); onScroll(); });
})();

/*
 * Contact intents. The jersey section has two audiences and one form, so the CTAs
 * pre-set the subject line and open the message with the right first sentence.
 * The site's own smooth-scroll handler does the travelling; this only fills in.
 */
(function contactIntents() {
    'use strict';
    const triggers = document.querySelectorAll('[data-contact-intent]');
    if (!triggers.length) return;

    const COPY = {
        kit: {
            subject: 'Club jersey enquiry — 2026/27 kit',
            message: "I'd like to order the 2026/27 club jersey. My call sign is ",
        },
        'jersey-sponsor': {
            subject: 'Jersey sponsorship — 2026/27 season',
            message: "We're interested in a placement on the 2026/27 club jersey. ",
        },
    };

    triggers.forEach((el) => {
        el.addEventListener('click', () => {
            const copy = COPY[el.dataset.contactIntent];
            const subject = document.querySelector('#sponsorshipEnquiryForm input[name="_subject"]');
            const message = document.getElementById('enquiryMessage');
            if (!copy || !subject || !message) return;
            subject.value = copy.subject;
            /* Never clobber something the visitor has already typed. */
            if (!message.value) message.value = copy.message;
            /* Wait out the in-flight smooth scroll, and do not fight it for position. */
            window.setTimeout(() => {
                const first = document.getElementById('enquiryFirstName');
                if (first) first.focus({ preventScroll: true });
            }, 700);
        }, { passive: true });
    });
})();
