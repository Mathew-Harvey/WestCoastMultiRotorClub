/*
 * champs-hero.js — choreography for the State Championships hero.
 *
 * Four jobs:
 *   1. Play the State Champs track, flown on WebFPV, while the hero is on screen, and
 *      never under reduced motion.
 *   2. Keep the fixed header legible while it sits over the dark hero.
 *   3. Loop the supporter strip seamlessly.
 *   4. Count down to the first gate, and stand down gracefully once the event is past.
 *
 * Every step degrades on its own: no JS, a refused play() or reduced motion each leave
 * a hero that is still the finished flyer, with the track's poster frame standing still.
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

    /* ------------------------------------------------------ the champs track */

    /*
     * The State Champs track, flown on WebFPV, in the slot the quad used to land in.
     * The markup carries no autoplay attribute, so this is the only thing that
     * starts it: with no JS the poster frame shows, which is the right way to fail.
     * It plays only while the hero is on screen, and never under reduced motion,
     * where the poster is the whole picture. A play() the browser refuses (iOS Low
     * Power Mode, a data saver) also leaves the poster, so the refusal is ignored.
     */
    (function champsTrack() {
        const video = stage.querySelector('.champs-track-video');
        if (!video) return;
        video.muted = true;
        let onScreen = false;

        const apply = () => {
            if (onScreen && !reduceMotionQuery.matches) {
                const playing = video.play();
                if (playing && playing.catch) playing.catch(() => {});
            } else {
                video.pause();
            }
        };

        if ('IntersectionObserver' in window) {
            new IntersectionObserver((entries) => {
                onScreen = entries.some((e) => e.isIntersecting);
                apply();
            }, { rootMargin: '120px' }).observe(video);
        } else {
            onScreen = true;
            apply();
        }

        if (reduceMotionQuery.addEventListener) {
            reduceMotionQuery.addEventListener('change', apply);
        }
    })();
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
