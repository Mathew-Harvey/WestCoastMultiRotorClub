/*
 * hero.js: the top of the page, after the 2026 State Championships.
 *
 * Five jobs:
 *   1. Keep the fixed header legible while it sits over the hero.
 *   2. Point the hero's "Next race" at whatever is next on the events calendar.
 *   3. Open the replay tiles in the site's own video player.
 *   4. Open the photo tiles in the gallery's own viewer, inside their album.
 *   5. Fill this week's WebFPV track with live numbers from WebFPV's board.
 *
 * Every job degrades on its own. With no JS the replays are YouTube links, the
 * photos are links to the full-size files, the next race is the one written in
 * the markup, and the track card shows its name and facts without a best lap.
 */
(function () {
    'use strict';

    const hero = document.getElementById('hero');

    /* ----------------------------------------------------------- header state */

    /*
     * The header is an opaque slate bar built for a light page. Over the hero that
     * reads as a slab across the photo, so it goes transparent (with a scrim, to
     * keep the links legible) until the hero has scrolled past.
     */
    (function headerState() {
        const header = document.querySelector('header');
        if (!header || !hero) return;
        let ticking = false;

        const apply = () => {
            ticking = false;
            header.classList.toggle('is-over-hero', window.scrollY < hero.offsetHeight - 120);
        };
        apply();
        window.addEventListener('scroll', () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(apply);
        }, { passive: true });
        window.addEventListener('resize', apply, { passive: true });
    })();

    /* A plain left click only: a new tab, a new window or a download stays the browser's. */
    const isPlainClick = (event) =>
        event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

    /*
     * script.js builds the calendar, the video player and the gallery on
     * DOMContentLoaded (the gallery after a fetch), and this file loads after it,
     * so everything below waits for that and then asks for each one at click time.
     */
    const ready = (fn) => {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fn);
        } else {
            fn();
        }
    };

    ready(function () {
        /* ------------------------------------------------------------ next race */

        (function nextRace() {
            const link = document.getElementById('wrapNext');
            const calendar = window.WCMRCEvents;
            if (!link || !calendar || !Array.isArray(calendar.events)) return;

            const now = Date.now();
            const next = calendar.events
                .filter((event) => event.date instanceof Date && event.date.getTime() > now)
                .sort((a, b) => a.date - b.date)[0];

            if (!next) {
                link.hidden = true;
                return;
            }

            const day = next.date.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })
                .replace(',', '');
            const time = next.date.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' });
            link.querySelector('[data-next="title"]').textContent = next.title;
            link.querySelector('[data-next="date"]').textContent = `${day}, ${time}`;
        })();

        /* ------------------------------------------------------------- replays */

        document.querySelectorAll('[data-video-modal]').forEach((link) => {
            link.addEventListener('click', (event) => {
                if (!isPlainClick(event)) return;
                const manager = window.WCMRCVideoManager;
                const id = link.getAttribute('data-video-modal');
                const known = manager && Array.isArray(manager.videoDatabase) &&
                    manager.videoDatabase.some((video) => video.id === id);
                if (!known || typeof manager.openVideo !== 'function') return;
                event.preventDefault();
                manager.openVideo(id);
            });
        });

        /* -------------------------------------------------------------- photos */

        document.querySelectorAll('[data-gallery-album]').forEach((link) => {
            link.addEventListener('click', (event) => {
                const gallery = window.WCMRCGallery;
                if (!gallery || !isPlainClick(event)) return;
                const album = link.getAttribute('data-gallery-album');
                const photo = link.getAttribute('data-gallery-photo');

                if (photo) {
                    if (typeof gallery.openPhoto === 'function' && gallery.openPhoto(album, photo)) {
                        event.preventDefault();
                    }
                    return;
                }
                /* The album button: pick the album, and let the link scroll to the gallery. */
                if (typeof gallery.selectAlbum === 'function') gallery.selectAlbum(album);
            });
        });

        /* ---------------------------------------------------- this week's track */

        (function webfpvTrack() {
            const section = document.getElementById('webfpv');
            const id = section && section.dataset.trackId;
            if (!id || !/^trk-[a-z0-9]+$/i.test(id) || !window.fetch) return;

            const field = (name) => section.querySelector(`[data-track="${name}"]`);
            const CLASS_NAMES = { full: 'five inch', micro: 'whoop' };

            const controller = 'AbortController' in window ? new AbortController() : null;
            const timer = controller ? window.setTimeout(() => controller.abort(), 8000) : null;

            fetch(`https://webfpv.org/board/api/tracks/${encodeURIComponent(id)}`, {
                signal: controller ? controller.signal : undefined,
                credentials: 'omit'
            })
                .then((response) => {
                    if (!response.ok) throw new Error(`WebFPV board responded ${response.status}`);
                    return response.json();
                })
                .then((track) => {
                    if (!track || track.id !== id) return;

                    if (track.name) field('name').textContent = track.name;

                    const facts = [];
                    if (track.gates) facts.push(`${track.gates} gates`);
                    if (track.plan && track.plan.width && track.plan.depth) {
                        facts.push(`${track.plan.width} × ${track.plan.depth} m`);
                    }
                    if (CLASS_NAMES[track.trackClass]) facts.push(CLASS_NAMES[track.trackClass]);
                    if (facts.length) field('facts').textContent = facts.join(' · ');

                    const times = Array.isArray(track.times) ? track.times.filter((t) => t && t.lapMs > 0) : [];
                    const best = times.reduce((a, b) => (!a || b.lapMs < a.lapMs ? b : a), null);
                    if (best) {
                        field('time').textContent = `${(best.lapMs / 1000).toFixed(2)} s`;
                        field('pilot').textContent =
                            `${best.name} · ${times.length} ${times.length === 1 ? 'lap' : 'laps'} posted`;
                    } else {
                        field('time').textContent = '--.-- s';
                        field('pilot').textContent = 'No laps yet. Post the first.';
                    }
                    field('best').hidden = false;
                })
                .catch(() => {
                    /* The board is someone else's server: if it is slow or down, the
                       card keeps the name and facts written in the markup. */
                })
                .finally(() => {
                    if (timer) window.clearTimeout(timer);
                });
        })();
    });
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
