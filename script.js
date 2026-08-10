// Helper function to safely add CSS animations
function safelyAddKeyframeAnimation(animationName, keyframes) {
    try {
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            @keyframes ${animationName} {
                ${keyframes}
            }
        `;
        document.head.appendChild(styleElement);
        return styleElement;
    } catch (error) {
        return null;
    }
}

// Global error handler for unexpected errors
window.addEventListener('error', function (event) {
    // Prevent the error from crashing the page
    event.preventDefault();

    return true;
}, { passive: true });

// Mobile detected flag for optimizations
const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Set a flag for optimized performance on mobile
if (isMobileDevice) {
    document.body.classList.add('mobile-device');
}

// Mobile Navigation Toggle
document.addEventListener('DOMContentLoaded', function () {
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');

    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            hamburger.querySelector('i').classList.toggle('fa-bars');
            hamburger.querySelector('i').classList.toggle('fa-times');
        });
    }
});

// Complete Pilot Carousel functionality - Reverting Drag Logic to Working Example
document.addEventListener('DOMContentLoaded', function () {
    // iOS detection function
    function isIOSDevice() {
        return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    }

    // Utility function to check passive event support
    function supportsPassiveEvents() {
        let passiveSupported = false;
        try {
            const options = {
                get passive() {
                    passiveSupported = true;
                    return false;
                }
            };
            window.addEventListener("test", null, options);
            window.removeEventListener("test", null, options);
        } catch (err) {
            passiveSupported = false;
        }
        return passiveSupported;
    }

    // Use passive if supported, otherwise fallback
    const passiveOptions = supportsPassiveEvents() ? { passive: false } : false;
    const passiveTrue = supportsPassiveEvents() ? { passive: true } : false;

    // Elements
    const pilotCarouselContainer = document.querySelector('.pilot-carousel-container');
    const pilotCarousel = document.querySelector('.pilot-carousel');
    const dukegodFlipSound = document.getElementById('dukegod-flip-sound');

    // Initial check for elements
    if (!pilotCarouselContainer || !pilotCarousel) {
        return;
    }
    let pilotCards = pilotCarousel.querySelectorAll('.pilot-card'); // Initial list

    // State variables
    let isDragging = false;
    let startPosition = 0;
    let currentTranslate = 0;
    let prevTranslate = 0;
    let animationID = null;
    let isFlipping = false;
    let dragDistance = 0;
    let autoScrollID = null;
    let autoScrollSpeed = 1.5; // Match working example's speed initially
    const dragThreshold = 5; // Match working example's threshold
    const postDragPauseDuration = 300; // Match working example's timeout

    // Initial setup
    pilotCarousel.style.animation = ''; // Remove CSS animation if any
    pilotCarousel.style.transition = 'none'; // Start with no transition
    pilotCarousel.style.position = 'relative';
    pilotCarousel.style.userSelect = 'none';
    pilotCarousel.style.cursor = 'grab';
    pilotCarouselContainer.style.overflow = 'hidden';
    pilotCarousel.style.willChange = 'transform'; // Performance hint

    // --- Measurements (From robust version) ---
    let cardWidth = 0;
    let cardGap = 30;
    let originalContentWidth = 0; // Width of only the original cards + gaps
    let totalWidth = 0;
    let initialOffset = 0; // Offset caused by prepended clones
    let originalCardsCount = 0;

    function calculateDimensions() {
        const originalCards = Array.from(pilotCarousel.querySelectorAll('.pilot-card:not(.clone)'));
        originalCardsCount = originalCards.length;
        if (originalCardsCount === 0) {
            return false;
        }
        // Add check for cardWidth calculation
        if (!originalCards[0]) {
            return false;
        }
        cardWidth = originalCards[0].offsetWidth;
        if (cardWidth === 0) { }

        const computedGap = window.getComputedStyle(pilotCarousel).gap;
        cardGap = computedGap === 'normal' ? 30 : parseInt(computedGap) || 30;
        const cardTotalWidth = cardWidth + cardGap;
        originalContentWidth = originalCardsCount * cardTotalWidth;
        totalWidth = pilotCarousel.scrollWidth;
        const prependedClones = pilotCarousel.querySelectorAll('.clone-prepend');
        initialOffset = prependedClones.length * cardTotalWidth;
        return true;
    }

    // --- Cloning (From robust version) ---
    // Updated setupCarouselClones function with iOS optimization
    function setupCarouselClones() {
        const currentOriginalCards = Array.from(pilotCarousel.querySelectorAll('.pilot-card:not(.clone)'));
        originalCardsCount = currentOriginalCards.length;
        if (originalCardsCount === 0) return false;

        pilotCarousel.querySelectorAll('.pilot-card.clone').forEach(clone => clone.remove());
        const clonesToPrepend = []; const clonesToAppend = [];

        // Use fewer clones on iOS to reduce memory pressure
        const isIOS = isIOSDevice();
        const bufferClonesCount = isIOS ?
            Math.max(2, Math.ceil(originalCardsCount / 4)) : // Fewer clones for iOS
            Math.max(6, Math.ceil(originalCardsCount / 2));  // Original logic

        for (let i = 0; i < (isIOS ? originalCardsCount : originalCardsCount + bufferClonesCount); i++) {
            const index = (originalCardsCount - 1 - (i % originalCardsCount));
            if (index < 0 || index >= originalCardsCount) continue;
            const clone = currentOriginalCards[index].cloneNode(true);
            clone.classList.add('clone', 'clone-prepend');
            clonesToPrepend.push(clone);
        }

        for (let i = 0; i < (isIOS ? originalCardsCount : originalCardsCount + bufferClonesCount); i++) {
            const index = i % originalCardsCount;
            if (index < 0 || index >= originalCardsCount) continue;
            const clone = currentOriginalCards[index].cloneNode(true);
            clone.classList.add('clone', 'clone-append');
            clonesToAppend.push(clone);
        }

        pilotCarousel.prepend(...clonesToPrepend.reverse());
        pilotCarousel.append(...clonesToAppend);
        pilotCards = pilotCarousel.querySelectorAll('.pilot-card');

        if (!calculateDimensions()) return false;
        currentTranslate = -initialOffset;
        prevTranslate = currentTranslate;
        setCarouselPosition(false);
        return true;
    }

    // --- Auto Scrolling (Use logic compatible with simpler dragEnd) ---
    // Updated startAutoScroll with iOS optimization
    function startAutoScroll() {
        if (autoScrollID) {
            if (isIOSDevice()) {
                clearTimeout(autoScrollID);
            } else {
                cancelAnimationFrame(autoScrollID);
            }
        }

        if (isDragging || isFlipping) return;

        pilotCarousel.classList.add('js-controlled');

        // Use a slower scroll speed on iOS
        const isIOS = isIOSDevice();
        autoScrollSpeed = isIOS ? 0.7 : 1.5; // Slower for iOS

        function scroll() {
            if (isDragging || isFlipping) {
                stopAutoScroll();
                return;
            }

            currentTranslate -= autoScrollSpeed;

            const resetPoint = -(initialOffset + originalContentWidth);
            if (currentTranslate <= resetPoint) {
                const jumpAmount = originalContentWidth;
                currentTranslate += jumpAmount;
                setCarouselPosition(false);
            }

            setCarouselPosition(false);

            // Use setTimeout for iOS to reduce GPU pressure
            if (isIOS) {
                autoScrollID = setTimeout(() => {
                    requestAnimationFrame(scroll);
                }, 32); // ~30fps instead of 60fps
            } else {
                autoScrollID = requestAnimationFrame(scroll);
            }
        }

        pilotCarousel.style.transition = 'none';
        autoScrollID = requestAnimationFrame(scroll);
    }

    // Updated stopAutoScroll function to handle both RAF and setTimeout
    function stopAutoScroll() {
        if (autoScrollID) {
            if (isIOSDevice()) {
                clearTimeout(autoScrollID);
            } else {
                cancelAnimationFrame(autoScrollID);
            }
            autoScrollID = null;
            pilotCarousel.classList.add('js-controlled');
        }
    }

    // --- Positioning (Use simple translateX) ---
    function setCarouselPosition(useTransition = false) { // Default to NO transition for drag/scroll
        const finalTranslate = currentTranslate;
        pilotCarousel.style.transition = useTransition ? 'transform 0.3s ease-out' : 'none';
        pilotCarousel.style.transform = `translateX(${finalTranslate}px)`;
    }

    // --- Drag Handlers & Animation - Directly from "Working Example" ---
    // Updated drag handlers with iOS-specific optimizations
    function dragStart(e) {
        try {
            if (isFlipping) return;

            const isIOS = isIOSDevice();

            // Only prevent default on non-iOS to avoid interfering with Safari's scroll
            if (!isIOS) {
                try {
                    e.preventDefault();
                } catch (preventError) {
                    // Some browsers don't allow preventDefault
                }
            }

            pilotCarousel.classList.add('js-controlled');
            startPosition = getPositionX(e);
            isDragging = true;
            dragDistance = 0;
            stopAutoScroll();
            prevTranslate = currentTranslate;
            pilotCarousel.style.cursor = 'grabbing';
            pilotCarousel.style.transition = 'none';
            cancelAnimationFrame(animationID);
            animationID = requestAnimationFrame(animation);
        } catch (error) {
            isDragging = false;
            pilotCarousel.style.cursor = 'grab';
        }
    }

    function drag(e) {
        try {
            if (!isDragging) return;

            const isIOS = isIOSDevice();

            // Only prevent default on non-iOS or when we know it's a horizontal drag
            if (!isIOS) {
                try {
                    e.preventDefault();
                    e.stopPropagation();
                } catch (preventError) {}
            } else if (Math.abs(getPositionX(e) - startPosition) > 10 && e.cancelable) {
                try {
                    e.preventDefault();
                } catch (preventError) {}
            }

            const currentPosition = getPositionX(e);
            const moveDistance = currentPosition - startPosition;
            dragDistance = Math.abs(moveDistance);
            currentTranslate = prevTranslate + moveDistance;
        } catch (error) {
            // Don't end dragging here
        }
    }

    function animation() {
        try {
            if (isDragging) {
                // Apply position update without transition for smooth dragging
                setCarouselPosition(false);

                // Continue animation as long as dragging is active
                animationID = requestAnimationFrame(animation);
            }
        } catch (error) {
            // Try to restore normal state
            isDragging = false;
            pilotCarousel.style.cursor = 'grab';
        }
    }

    function dragEnd() {
        try {
            // Exit if we're not in dragging state
            if (!isDragging) return;

            // Update state
            isDragging = false;

            // Stop animation loop
            cancelAnimationFrame(animationID);

            // Reset cursor style
            pilotCarousel.style.cursor = 'grab';

            // Add transition for smooth settling
            pilotCarousel.style.transition = 'transform 0.3s ease-out';

            // Get dimensions for boundary checks
            const checkOriginalCards = Array.from(pilotCarousel.querySelectorAll('.pilot-card:not(.clone)'));
            const checkOriginalCardsWidth = checkOriginalCards.length * (cardWidth + cardGap);

            // Prevent overscrolling beyond the start
            if (currentTranslate > 0) {
                currentTranslate = 0;
            }

            // Prevent overscrolling beyond the end
            const endThreshold = -(initialOffset + originalContentWidth + cardWidth);
            if (currentTranslate < endThreshold) {
                // Reset to a sensible position to prevent getting stuck
                currentTranslate = -initialOffset;
            }

            // Apply final position with transition
            setCarouselPosition(true);

            // Restart auto-scroll after a brief pause
            clearTimeout(window.restartScrollTimeout);
            window.restartScrollTimeout = setTimeout(() => {
                // Make sure we're not in the middle of another interaction
                if (!isDragging && !isFlipping) {
                    // Remove transition before auto-scroll for smooth animation
                    pilotCarousel.style.transition = 'none';
                    startAutoScroll();
                }
            }, postDragPauseDuration);
        } catch (error) {
            // Try to recover
            isDragging = false;
            pilotCarousel.style.cursor = 'grab';
            try {
                // Attempt to restart auto-scroll
                setTimeout(() => startAutoScroll(), 1000);
            } catch (recoveryError) {
                // Silent recovery
            }
        }
    }

    function getPositionX(e) {
        try {
            // Use pageX for mouse, clientX for touch
            return e.type.includes('mouse') ? e.pageX : e.touches[0].clientX;
        } catch (error) {
            // Return last known position as fallback
            return startPosition || 0;
        }
    }
    // --- End Drag Handlers & Animation ---

    // --- Card Flip (Use delegation - From robust version) ---
    // Updated setupCardFlip function with iOS-specific handling
    function setupCardFlip() {
        pilotCarousel.removeEventListener('click', handleFlipEvent);
        pilotCarousel.removeEventListener('touchend', handleTouchEndFlipEvent);

        const isIOS = isIOSDevice();

        // If on iOS, we'll handle card flips differently
        if (isIOS) {
            pilotCarousel.addEventListener('click', handleIOSFlipEvent);
            pilotCarousel.addEventListener('touchend', handleIOSTouchEndFlipEvent);
        } else {
            pilotCarousel.addEventListener('click', handleFlipEvent);
            pilotCarousel.addEventListener('touchend', handleTouchEndFlipEvent);
        }
    }

    // Original card flip functions
    function executeFlip(targetCard, event) {
        if (dragDistance >= dragThreshold) { dragDistance = 0; return; }
        if (isFlipping) return;
        isFlipping = true;
        stopAutoScroll();
        const wasFlipped = targetCard.classList.contains('flipped');
        targetCard.classList.toggle('flipped');
        const pilotNameElement = targetCard.querySelector('.pilot-card-name');
        const isDukeGod = pilotNameElement && pilotNameElement.textContent.trim() === 'DukeGod';
        if (isDukeGod && !wasFlipped && dukegodFlipSound) {
            dukegodFlipSound.currentTime = 0;
            dukegodFlipSound.play().catch(err => { });
        }
        setTimeout(() => {
            isFlipping = false;
            clearTimeout(window.restartScrollTimeout);
            window.restartScrollTimeout = setTimeout(() => {
                if (!isDragging && !isFlipping) {
                    pilotCarousel.style.transition = 'none';
                    startAutoScroll();
                }
            }, postDragPauseDuration);
        }, 800); // Match CSS duration
        event.stopPropagation();
        dragDistance = 0;
    }

    function handleFlipEvent(e) {
        const targetCard = e.target.closest('.pilot-card');
        if (targetCard) {
            executeFlip(targetCard, e);
        }
    }

    let lastTap = 0; let tapTimeout;

    function handleTouchEndFlipEvent(e) {
        const targetCard = e.target.closest('.pilot-card');
        if (!targetCard) return;
        if (dragDistance < dragThreshold) { e.preventDefault(); }
        else { dragDistance = 0; return; }
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTap;
        clearTimeout(tapTimeout);
        if (tapLength < 300 && tapLength > 0) {
            executeFlip(targetCard, e);
            lastTap = 0;
        }
        else {
            lastTap = currentTime;
            tapTimeout = setTimeout(() => { lastTap = 0; }, 300);
        }
        dragDistance = 0;
    }

    // New iOS-specific card flip handlers
    function handleIOSFlipEvent(e) {
        const targetCard = e.target.closest('.pilot-card');
        if (targetCard) {
            executeIOSFlip(targetCard, e);
        }
    }

    function handleIOSTouchEndFlipEvent(e) {
        const targetCard = e.target.closest('.pilot-card');
        if (!targetCard) return;

        if (dragDistance < dragThreshold) {
            // On iOS we're more careful with preventDefault
            if (e.cancelable) {
                e.preventDefault();
            }
        } else {
            dragDistance = 0;
            return;
        }

        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTap;
        clearTimeout(tapTimeout);

        if (tapLength < 300 && tapLength > 0) {
            executeIOSFlip(targetCard, e);
            lastTap = 0;
        } else {
            lastTap = currentTime;
            tapTimeout = setTimeout(() => {
                lastTap = 0;
            }, 300);
        }

        dragDistance = 0;
    }

    // New iOS-friendly card flip implementation without 3D transforms
    function executeIOSFlip(targetCard, event) {
        if (dragDistance >= dragThreshold) {
            dragDistance = 0;
            return;
        }

        if (isFlipping) return;
        isFlipping = true;
        stopAutoScroll();

        const wasFlipped = targetCard.classList.contains('flipped');

        // For iOS, instead of 3D transform, we simply toggle visibility of front/back
        const frontSide = targetCard.querySelector('.pilot-card-front');
        const backSide = targetCard.querySelector('.pilot-card-back');

        if (frontSide && backSide) {
            if (!wasFlipped) {
                // Transition from front to back
                frontSide.style.opacity = '0';
                setTimeout(() => {
                    frontSide.style.display = 'none';
                    backSide.style.display = 'flex';
                    setTimeout(() => {
                        backSide.style.opacity = '1';
                        targetCard.classList.add('flipped');
                    }, 50);
                }, 200);
            } else {
                // Transition from back to front
                backSide.style.opacity = '0';
                setTimeout(() => {
                    backSide.style.display = 'none';
                    frontSide.style.display = 'flex';
                    setTimeout(() => {
                        frontSide.style.opacity = '1';
                        targetCard.classList.remove('flipped');
                    }, 50);
                }, 200);
            }
        }

        // Sound effect for DukeGod card (keep original functionality)
        const pilotNameElement = targetCard.querySelector('.pilot-card-name');
        const isDukeGod = pilotNameElement && pilotNameElement.textContent.trim() === 'DukeGod';
        if (isDukeGod && !wasFlipped && dukegodFlipSound) {
            dukegodFlipSound.currentTime = 0;
            dukegodFlipSound.play().catch(err => {});
        }

        setTimeout(() => {
            isFlipping = false;
            clearTimeout(window.restartScrollTimeout);
            window.restartScrollTimeout = setTimeout(() => {
                if (!isDragging && !isFlipping) {
                    pilotCarousel.style.transition = 'none';
                    startAutoScroll();
                }
            }, postDragPauseDuration);
        }, 800);

        event.stopPropagation();
        dragDistance = 0;
    }

    // --- Shine Effect (Use delegation - From robust version) ---
    function setupShineEffect() {
        pilotCarousel.removeEventListener('mousemove', handleShineMove);
        pilotCarousel.removeEventListener('mouseout', handleShineOut);
        pilotCarousel.addEventListener('mousemove', handleShineMove);
        pilotCarousel.addEventListener('mouseout', handleShineOut);
    }

    function handleShineMove(e) {
        if (isDragging) { handleShineOut(e); return; }
        const targetCard = e.target.closest('.pilot-card:not(.flipped)');
        if (targetCard) {
            pilotCarousel.querySelectorAll('.pilot-card-shine').forEach(shineEl => {
                if (!targetCard.contains(shineEl)) {
                    shineEl.style.opacity = '0';
                }
            });
            const shine = targetCard.querySelector('.pilot-card-shine');
            if (!shine) return;
            const rect = targetCard.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const xPercent = (x / rect.width) * 100;
            const yPercent = (y / rect.height) * 100;
            shine.style.opacity = '1';
            shine.style.background = `radial-gradient(circle at ${xPercent}% ${yPercent}%, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.1) 40%, rgba(255, 255, 255, 0) 70%)`;
        } else {
            handleShineOut(e);
        }
    }

    function handleShineOut(e) {
        const relatedTarget = e.relatedTarget;
        if (!relatedTarget || !pilotCarousel.contains(relatedTarget)) {
            pilotCarousel.querySelectorAll('.pilot-card').forEach(card => {
                const shine = card.querySelector('.pilot-card-shine');
                if (shine) { shine.style.opacity = '0'; }
            });
        }
    }

    // --- Dynamic Card Colors (Keep existing) ---
    function updateCardColors() { /* ... Keep existing ... */ }

    // --- Event Listeners Setup (Ensure document listeners are correct) ---
    function addEventListeners() {
        // Remove any existing event listeners first
        pilotCarousel.removeEventListener('mousedown', dragStart);
        document.removeEventListener('mousemove', drag);
        document.removeEventListener('mouseup', dragEnd);
        pilotCarousel.removeEventListener('touchstart', dragStart);
        pilotCarousel.removeEventListener('touchmove', drag);
        pilotCarousel.removeEventListener('touchend', dragEnd);
        pilotCarousel.removeEventListener('touchcancel', dragEnd);

        // Mouse events
        pilotCarousel.addEventListener('mousedown', dragStart, passiveOptions);
        document.addEventListener('mousemove', drag, passiveOptions);
        document.addEventListener('mouseup', dragEnd, passiveTrue);

        // Touch events - important to prevent default on touchmove
        pilotCarousel.addEventListener('touchstart', dragStart, passiveOptions);
        pilotCarousel.addEventListener('touchmove', drag, passiveOptions);
        pilotCarousel.addEventListener('touchend', dragEnd, passiveTrue);
        pilotCarousel.addEventListener('touchcancel', dragEnd, passiveTrue);

        // Other events
        pilotCarousel.addEventListener('contextmenu', e => e.preventDefault());
        document.querySelectorAll('.theme-btn').forEach(button => {
            button.addEventListener('click', () => setTimeout(updateCardColors, 50));
        });

        // Add resize handler
        window.addEventListener('resize', handleResize);
    }

    // --- Resize Handling ---
    let resizeTimeout;
    function handleResize() {
        stopAutoScroll();
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            // Re-initialize using robust functions
            if (setupCarouselClones()) {
                updateCardColors();
                setupCardFlip();
                setupShineEffect();
                startAutoScroll();
            }
        }, 300);
    }

    // Updated initializeCarousel function to apply iOS-specific styles
    function initializeCarousel() {
        pilotCarousel.classList.add('js-controlled');
        void pilotCarousel.offsetWidth;

        const isIOS = isIOSDevice();

        if (isIOS) {
            // Apply iOS-specific styles to all cards
            document.querySelectorAll('.pilot-card').forEach(card => {
                // Disable 3D transforms which cause problems on iOS
                const cardInner = card.querySelector('.pilot-card-inner');
                if (cardInner) {
                    cardInner.style.transformStyle = 'flat';
                    cardInner.style.transform = 'none';
                }

                // Set initial states for front/back sides
                const frontSide = card.querySelector('.pilot-card-front');
                const backSide = card.querySelector('.pilot-card-back');

                if (frontSide) {
                    frontSide.style.opacity = '1';
                    frontSide.style.display = 'flex';
                    frontSide.style.position = 'absolute';
                    frontSide.style.backfaceVisibility = 'visible';
                    frontSide.style.transform = 'none';
                    frontSide.style.transition = 'opacity 0.3s ease';
                }

                if (backSide) {
                    backSide.style.opacity = '0';
                    backSide.style.display = 'none';
                    backSide.style.position = 'absolute';
                    backSide.style.backfaceVisibility = 'visible';
                    backSide.style.transform = 'none';
                    backSide.style.transition = 'opacity 0.3s ease';
                }
            });

            // Use simpler touch action for iOS
            pilotCarousel.style.touchAction = 'pan-y';
        } else {
            pilotCarousel.style.touchAction = 'pan-y pinch-zoom';
        }

        pilotCarouselContainer.style.overscrollBehaviorX = 'none';

        if (setupCarouselClones()) {
            updateCardColors();
            setupCardFlip();
            setupShineEffect();
            addEventListeners();
            setCarouselPosition(false);
            startAutoScroll();
        }
    }

    // Start the carousel - Added this line to call the initialization
    initializeCarousel();

}); // End of Pilot Carousel functionality

// Hide the hero scroll indicator once the visitor starts scrolling
document.addEventListener('DOMContentLoaded', function () {
    const scrollIndicator = document.querySelector('.scroll-indicator');
    if (!scrollIndicator) return;

    let hidden = false;

    window.addEventListener('scroll', function () {
        if (hidden || window.scrollY <= 100) return;
        hidden = true;

        scrollIndicator.style.opacity = '0';
        setTimeout(() => {
            scrollIndicator.style.display = 'none';
        }, 500);
    }, { passive: true });
});

// Custom cursor: a slowly spinning three-blade propeller
document.addEventListener('DOMContentLoaded', function () {
    const cursor = document.querySelector('.cursor');
    if (!cursor) return;

    // A single blade, drawn pointing "up" from the hub at 60,60: narrow root,
    // widest around mid span, swept back toward a blunt tip. The three blades
    // are the same geometry rotated 120 degrees apart.
    function bladeMarkup(rotation) {
        const body = 'M62.5 52C64.6 45 65.6 36 65.25 30C65 24 62.6 17 59 12' +
            'C56 7.6 54 5.6 51 5.4C49.6 5.3 48.7 6.2 48.6 8' +
            'C48.5 13 49 16.5 50 20C51.4 29 54 42 57.5 52Z';
        const leadingEdge = 'M62.5 52C64.6 45 65.6 36 65.25 30C65 24 62.6 17 59 12C56 7.6 54 5.6 51 5.4';
        const glint = 'M61.2 49C63.1 43 63.6 36 63.2 30.5C62.9 25 61 19.5 58.2 15.6';
        const trailingEdge = 'M57.5 52C54 42 51.4 29 50 20C49 16.5 48.5 13 48.6 8';

        return `
            <g transform="rotate(${rotation} 60 60)">
                <path d="${body}" fill="url(#propBladeFace)" />
                <path d="${trailingEdge}" fill="none" stroke="#000" stroke-opacity="0.4"
                    stroke-width="1" stroke-linecap="round" />
                <path d="${leadingEdge}" fill="none" stroke="url(#propBladeEdge)"
                    stroke-width="1" stroke-linecap="round" />
                <path d="${glint}" fill="none" stroke="#fff" stroke-opacity="0.09"
                    stroke-width="2.6" stroke-linecap="round" />
            </g>`;
    }

    cursor.innerHTML = `
        <div class="prop-cursor">
            <svg class="prop-cursor-blades" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
                <defs>
                    <linearGradient id="propBladeFace" x1="1" y1="0.28" x2="0" y2="0.6">
                        <stop offset="0" stop-color="#8e9aa6" />
                        <stop offset="0.22" stop-color="#4c5762" />
                        <stop offset="0.5" stop-color="#262d35" />
                        <stop offset="0.8" stop-color="#141920" />
                        <stop offset="1" stop-color="#0a0d11" />
                    </linearGradient>
                    <linearGradient id="propBladeEdge" x1="0" y1="1" x2="0" y2="0">
                        <stop offset="0" stop-color="#fff" stop-opacity="0" />
                        <stop offset="0.25" stop-color="#e6eef5" stop-opacity="0.6" />
                        <stop offset="0.7" stop-color="#b9cbd8" stop-opacity="0.55" />
                        <stop offset="1" stop-color="var(--primary-color)" stop-opacity="0.55" />
                    </linearGradient>
                    <radialGradient id="propHubBase" cx="0.34" cy="0.3" r="0.8">
                        <stop offset="0" stop-color="#5a656f" />
                        <stop offset="0.55" stop-color="#20262d" />
                        <stop offset="1" stop-color="#0b0e12" />
                    </radialGradient>
                    <radialGradient id="propHubCap" cx="0.32" cy="0.28" r="0.85">
                        <stop offset="0" stop-color="#828d99" />
                        <stop offset="0.6" stop-color="#2c333b" />
                        <stop offset="1" stop-color="#161b21" />
                    </radialGradient>
                    <radialGradient id="propShaft" cx="0.35" cy="0.3" r="0.8">
                        <stop offset="0" stop-color="#6b7683" />
                        <stop offset="1" stop-color="#20262d" />
                    </radialGradient>
                </defs>

                ${bladeMarkup(0)}${bladeMarkup(120)}${bladeMarkup(240)}

                <g>
                    <circle cx="60" cy="60" r="10.5" fill="url(#propHubBase)" />
                    <circle cx="60" cy="60" r="10.5" fill="none" stroke="#04070a"
                        stroke-opacity="0.85" stroke-width="0.9" />
                    <circle cx="60" cy="60" r="8.8" fill="none" stroke="var(--primary-color)"
                        stroke-opacity="0.35" stroke-width="0.8" />
                    <circle cx="60" cy="60" r="7" fill="url(#propHubCap)" />
                    <circle cx="60" cy="60" r="7" fill="none" stroke="#fff"
                        stroke-opacity="0.16" stroke-width="0.7" />
                    <path d="M54.64 55.5A7 7 0 0 1 61.81 53.24" fill="none" stroke="#fff"
                        stroke-opacity="0.3" stroke-width="1.1" stroke-linecap="round" />
                    <circle cx="60" cy="60" r="3.2" fill="#05080b" />
                    <circle cx="60" cy="60" r="3.2" fill="none" stroke="#fff"
                        stroke-opacity="0.22" stroke-width="0.7" />
                    <circle cx="60" cy="60" r="1.5" fill="url(#propShaft)" />
                </g>
            </svg>
        </div>`;

    // Add option to disable custom cursor
    const cursorToggle = document.createElement('div');
    cursorToggle.className = 'cursor-toggle';
    cursorToggle.innerHTML = '<i class="fas fa-mouse-pointer"></i>';
    cursorToggle.title = "Toggle custom cursor";
    document.body.appendChild(cursorToggle);

    let cursorEnabled = true;

    cursorToggle.addEventListener('click', () => {
        cursorEnabled = !cursorEnabled;
        document.body.classList.toggle('propeller-cursor-active', cursorEnabled);
        cursor.style.display = cursorEnabled ? 'block' : 'none';
        cursorToggle.classList.toggle('cursor-disabled');
    });

    if (window.matchMedia('(hover: hover)').matches) {
        document.body.classList.add('propeller-cursor-active');

        // Use requestAnimationFrame for optimal performance
        let mouseX = 0;
        let mouseY = 0;

        document.addEventListener('mousemove', e => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        });

        // Separate the render from the event for better performance
        function updateCursor() {
            if (cursorEnabled) {
                cursor.style.transform = `translate(${mouseX}px, ${mouseY}px)`;
            }
            requestAnimationFrame(updateCursor);
        }
        requestAnimationFrame(updateCursor);

        // Delegated so dynamically rendered cards and buttons are covered too
        const interactiveSelector = 'a, button, .btn, input, textarea, select, .hamburger, .logo, .nav-links a, .theme-btn, .theme-toggle, .back-to-top, [role="button"]';

        document.addEventListener('mouseover', e => {
            if (e.target.closest && e.target.closest(interactiveSelector)) {
                cursor.classList.add('cursor-hot');
            }
        });

        document.addEventListener('mouseout', e => {
            if (e.target.closest && e.target.closest(interactiveSelector)) {
                cursor.classList.remove('cursor-hot');
            }
        });
    }
});

// Smooth Scroll for Navigation Links
document.addEventListener('DOMContentLoaded', function () {
    const navLinks = document.querySelector('.nav-links');

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();

            // Close mobile menu if open
            if (navLinks && navLinks.classList.contains('active')) {
                navLinks.classList.remove('active');

                const hamburger = document.querySelector('.hamburger');
                if (hamburger) {
                    const hamburgerIcon = hamburger.querySelector('i');
                    if (hamburgerIcon) {
                        hamburgerIcon.classList.add('fa-bars');
                        hamburgerIcon.classList.remove('fa-times');
                    }
                }
            }

            const targetId = this.getAttribute('href');
            const target = document.querySelector(targetId);

            if (target) {
                window.scrollTo({
                    top: target.offsetTop - 80,
                    behavior: 'smooth'
                });

                // Trigger fade-in check after smooth scroll completes
                setTimeout(() => {
                    triggerFadeInCheck();
                }, 500); // Wait for smooth scroll to complete
            }
        });
    });
});

// Scroll Animation for fade-in elements
document.addEventListener('DOMContentLoaded', function () {
    const fadeElements = document.querySelectorAll('.fade-in');
    let ticking = false;
    let lastFadeScrollTime = 0;
    const fadeScrollThrottle = 150; // Increased throttle time for mobile

    const fadeInOnScroll = () => {
        try {
            const now = Date.now();
            // Add additional throttling for better performance on mobile
            if (now - lastFadeScrollTime < fadeScrollThrottle) {
                ticking = false;
                return;
            }

            lastFadeScrollTime = now;
            const triggerBottom = window.innerHeight * 0.85;

            // Process elements in batches for better performance
            let i = 0;
            const processNextBatch = () => {
                const endIndex = Math.min(i + 10, fadeElements.length);
                for (; i < endIndex; i++) {
                    const element = fadeElements[i];
                    if (!element) continue;

                    try {
                        const elementTop = element.getBoundingClientRect().top;
                        if (elementTop < triggerBottom) {
                            element.classList.add('active');
                        }
                    } catch (rectError) {
                        // Silent error handling
                    }
                }

                if (i < fadeElements.length) {
                    // Process next batch in next frame for smoother scrolling
                    setTimeout(processNextBatch, 0);
                } else {
                    ticking = false;
                }
            };

            processNextBatch();
        } catch (error) {
            ticking = false;
        }
    };

    // Make fadeInOnScroll available globally for navigation triggers
    window.triggerFadeInCheck = () => {
        window.requestAnimationFrame(fadeInOnScroll);
    };

    // Use passive event listener with throttling for better performance
    window.addEventListener('scroll', function () {
        if (!ticking) {
            ticking = true;
            window.requestAnimationFrame(fadeInOnScroll);
        }
    }, { passive: true });

    // Initial check with delay to allow page to settle
    setTimeout(() => {
        window.requestAnimationFrame(fadeInOnScroll);
    }, 100);

    // Additional check for when page loads with elements already in view
    setTimeout(() => {
        window.requestAnimationFrame(fadeInOnScroll);
    }, 500);
});

// Back to top button
document.addEventListener('DOMContentLoaded', function () {
    const backToTopButton = document.querySelector('.back-to-top');
    if (!backToTopButton) return;

    let isScrolling = false;
    let lastBackToTopScrollTime = 0;
    const backToTopThrottle = 150; // Throttle time for better performance

    const toggleBackToTopButton = () => {
        try {
            const now = Date.now();
            // Add throttling for better performance
            if (now - lastBackToTopScrollTime < backToTopThrottle) {
                isScrolling = false;
                return;
            }

            lastBackToTopScrollTime = now;

            if (window.scrollY > 300) {
                backToTopButton.classList.add('active');
            } else {
                backToTopButton.classList.remove('active');
            }
            isScrolling = false;
        } catch (error) {
            isScrolling = false;
        }
    };

    backToTopButton.addEventListener('click', () => {
        try {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        } catch (error) {
            // Fallback for browsers that don't support smooth scrolling
            window.scrollTo(0, 0);
        }
    });

    // Use passive listener for better performance
    window.addEventListener('scroll', function () {
        if (!isScrolling) {
            isScrolling = true;
            window.requestAnimationFrame(toggleBackToTopButton);
        }
    }, { passive: true });

    // Initial check
    toggleBackToTopButton();
});

// Fixed Sponsors Carousel Initialization
document.addEventListener('DOMContentLoaded', function () {
    const sponsorsCarousel = document.querySelector('.sponsors-carousel');

    if (sponsorsCarousel) {
        // Get all original sponsor items (non-clones)
        const sponsorItems = Array.from(sponsorsCarousel.querySelectorAll('.sponsor-item:not(.clone)'));

        if (sponsorItems.length === 0) return;

        // Clear existing clones
        const existingClones = sponsorsCarousel.querySelectorAll('.sponsor-item.clone');
        existingClones.forEach(clone => clone.remove());

        // Fix the backslash typo if present in any sponsor item
        sponsorItems.forEach(item => {
            if (item.outerHTML.includes('<div class="sponsor-item">\\')) {
                item.outerHTML = item.outerHTML.replace('\\', '');
            }
        });

        // Temporarily stop animation to take measurements
        sponsorsCarousel.style.animation = 'none';
        // Force reflow
        void sponsorsCarousel.offsetWidth;

        // Ensure carousel has the correct CSS properties
        sponsorsCarousel.style.display = 'flex';
        sponsorsCarousel.style.width = 'max-content';

        // Get the gap size
        const computedStyle = window.getComputedStyle(sponsorsCarousel);
        const gapSize = computedStyle.gap === 'normal' ? 80 : parseInt(computedStyle.gap) || 80;

        // Create clones for seamless looping - one full set of sponsors
        sponsorItems.forEach(item => {
            const clone = item.cloneNode(true);
            clone.classList.add('clone');
            sponsorsCarousel.appendChild(clone);
        });

        // Add a second set for safety
        sponsorItems.forEach(item => {
            const clone = item.cloneNode(true);
            clone.classList.add('clone');
            sponsorsCarousel.appendChild(clone);
        });

        // Calculate the total width of all original sponsors
        let totalWidth = 0;

        // Measure each sponsor item
        sponsorItems.forEach((item, index) => {
            const itemWidth = item.offsetWidth;
            totalWidth += itemWidth;

            // Add gap for all but the last item
            if (index < sponsorItems.length - 1) {
                totalWidth += gapSize;
            }
        });

        // If measurements failed, use fallback width
        if (totalWidth <= 0) {
            const itemWidth = 200; // From CSS max-width
            totalWidth = (itemWidth * sponsorItems.length) + (gapSize * (sponsorItems.length - 1));
        }

        // Create an animation that moves exactly one set width
        safelyAddKeyframeAnimation('sponsorsScroll', `
            0% { transform: translateX(0); }
            100% { transform: translateX(-${totalWidth}px); }
        `);

        // Set animation duration and apply
        const scrollDuration = Math.max(30, sponsorItems.length * 5);
        sponsorsCarousel.style.animation = `sponsorsScroll ${scrollDuration}s linear infinite`;
    }
});

// Event Calendar Functionality
document.addEventListener('DOMContentLoaded', function () {
    // Define event data (make sure this is at the top level of your events code)
    const eventData = [
        {
            title: "Open Day",
            date: new Date(2025, 10, 9, 8, 0), // November 9, 2025
            link: "https://www.facebook.com/groups/westcoastmultirotorclub/events", // placeholder - to be updated with specific event link
            image: "./assets/drone5.jpg"
        },
        {
            title: "Global Drone Solutions Summer Series Round 1",
            date: new Date(2025, 10, 30, 8, 0), // November 30, 2025
            link: "https://www.facebook.com/groups/westcoastmultirotorclub/events", // placeholder - to be updated with specific event link
            image: "./assets/drone6.jpg"
        },
        {
            title: "Global Drone Solutions Summer Series Round 2",
            date: new Date(2025, 11, 14, 8, 0), // December 14, 2025
            link: "https://www.facebook.com/groups/westcoastmultirotorclub/events", // placeholder - to be updated with specific event link
            image: "./assets/drone5.jpg"
        },
        {
            title: "Open Day",
            date: new Date(2026, 0, 11, 8, 0), // January 11, 2026
            link: "https://www.facebook.com/groups/westcoastmultirotorclub/events", // placeholder - to be updated with specific event link
            image: "./assets/drone6.jpg"
        },
        {
            title: "Global Drone Solutions Summer Series Round 3",
            date: new Date(2026, 0, 18, 8, 0), // January 18, 2026
            link: "https://www.facebook.com/groups/westcoastmultirotorclub/events", // placeholder - to be updated with specific event link
            image: "./assets/drone5.jpg"
        },
        {
            title: "Global Drone Solutions Summer Series Round 4",
            date: new Date(2026, 1, 1, 8, 0), // February 1, 2026
            link: "https://www.facebook.com/groups/westcoastmultirotorclub/events", // placeholder - to be updated with specific event link
            image: "./assets/drone6.jpg"
        },
        {
            title: "Global Drone Solutions Summer Series Round 5",
            date: new Date(2026, 1, 15, 8, 0), // February 15, 2026
            link: "https://www.facebook.com/groups/westcoastmultirotorclub/events", // placeholder - to be updated with specific event link
            image: "./assets/drone5.jpg"
        },
        {
            title: "Open Day",
            date: new Date(2026, 2, 8, 8, 0), // March 8, 2026
            link: "https://www.facebook.com/groups/westcoastmultirotorclub/events", // placeholder - to be updated with specific event link
            image: "./assets/drone6.jpg"
        },
        {
            title: "Global Drone Solutions Summer Series Round 6",
            date: new Date(2026, 2, 22, 8, 0), // March 22, 2026
            link: "https://www.facebook.com/groups/westcoastmultirotorclub/events", // placeholder - to be updated with specific event link
            image: "./assets/drone5.jpg"
        },
        {
            title: "Global Drone Solutions Summer Series Round 7",
            date: new Date(2026, 3, 12, 8, 0), // April 12, 2026
            link: "https://www.facebook.com/groups/westcoastmultirotorclub/events", // placeholder - to be updated with specific event link
            image: "./assets/drone6.jpg"
        },
        {
            title: "Global Drone Solutions Summer Series Round 8",
            date: new Date(2026, 4, 2, 8, 0), // May 2, 2026
            link: "https://www.facebook.com/groups/westcoastmultirotorclub/events", // placeholder - to be updated with specific event link
            image: "./assets/drone5.jpg"
        },
        {
            title: "Global Drone Solutions Summer Series Grand Final",
            date: new Date(2026, 4, 9, 8, 0), // May 9, 2026
            link: "https://www.facebook.com/groups/westcoastmultirotorclub/events", // placeholder - to be updated with specific event link
            image: "./assets/drone6.jpg"
        },
        {
            title: "Free Open Day Beginners Day",
            date: new Date(2026, 4, 30, 9, 0), // May 30, 2026
            link: "https://www.facebook.com/groups/westcoastmultirotorclub/events", // placeholder - to be updated with specific event link
            image: "./assets/drone5.jpg"
        },
        {
            title: "Global Drone Solutions Winter Series Round 1",
            date: new Date(2026, 5, 13, 8, 0), // June 13, 2026
            link: "https://www.facebook.com/groups/westcoastmultirotorclub/events", // placeholder - to be updated with specific event link
            image: "./assets/drone6.jpg"
        },
        {
            title: "Global Drone Solutions Winter Series Round 2",
            date: new Date(2026, 5, 27, 8, 0), // June 27, 2026
            link: "https://www.facebook.com/groups/westcoastmultirotorclub/events", // placeholder - to be updated with specific event link
            image: "./assets/drone5.jpg"
        },
        {
            title: "Global Drone Solutions Winter Series Round 3",
            date: new Date(2026, 6, 11, 8, 0), // July 11, 2026
            link: "https://www.facebook.com/groups/westcoastmultirotorclub/events", // placeholder - to be updated with specific event link
            image: "./assets/drone6.jpg"
        },
        {
            title: "Global Drone Solutions Winter Series Round 4",
            date: new Date(2026, 6, 25, 8, 0), // July 25, 2026
            link: "https://www.facebook.com/groups/westcoastmultirotorclub/events", // placeholder - to be updated with specific event link
            image: "./assets/drone5.jpg"
        },
        {
            title: "Global Drone Solutions Winter Series Round 5",
            date: new Date(2026, 7, 8, 8, 0), // August 8, 2026
            link: "https://www.facebook.com/groups/westcoastmultirotorclub/events", // placeholder - to be updated with specific event link
            image: "./assets/drone6.jpg"
        },
        {
            title: "Global Drone Solutions Winter Series Round 6",
            date: new Date(2026, 7, 22, 8, 0), // August 22, 2026
            link: "https://www.facebook.com/groups/westcoastmultirotorclub/events", // placeholder - to be updated with specific event link
            image: "./assets/drone5.jpg"
        },
        {
            title: "Global Drone Solutions Winter Series Round 7",
            date: new Date(2026, 8, 5, 8, 0), // September 5, 2026
            link: "https://www.facebook.com/groups/westcoastmultirotorclub/events", // placeholder - to be updated with specific event link
            image: "./assets/drone6.jpg"
        },
        {
            title: "Global Drone Solutions Winter Series Round 8",
            date: new Date(2026, 8, 19, 8, 0), // September 19, 2026
            link: "https://www.facebook.com/groups/westcoastmultirotorclub/events", // placeholder - to be updated with specific event link
            image: "./assets/drone5.jpg"
        },
        {
            title: "Global Drone Solutions Winter Series Grand Final",
            date: new Date(2026, 9, 3, 8, 0), // October 3, 2026
            link: "https://www.facebook.com/groups/westcoastmultirotorclub/events", // placeholder - to be updated with specific event link
            image: "./assets/drone6.jpg"
        },
        {
            title: "2026 AWA WA State Drone Racing Championships",
            date: new Date(2026, 9, 17, 8, 0), // October 17-18, 2026
            link: "https://www.facebook.com/groups/westcoastmultirotorclub/events", // placeholder - to be updated with specific event link
            image: "./assets/drone5.jpg"
        }
    ];

    // Calendar elements
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    const currentMonthYearElement = document.getElementById('currentMonthYear');
    const calendarDaysElement = document.getElementById('calendarDays');
    const upcomingEventsListElement = document.getElementById('upcomingEventsList');

    if (!calendarDaysElement) {
        return;
    }

    // Current date tracking
    let currentDate = new Date();
    let currentMonth = currentDate.getMonth();
    let currentYear = currentDate.getFullYear();

    // Month navigation
    if (prevMonthBtn) {
        prevMonthBtn.addEventListener('click', () => {
            currentMonth--;
            if (currentMonth < 0) {
                currentMonth = 11;
                currentYear--;
            }
            renderCalendar();
        });
    }

    if (nextMonthBtn) {
        nextMonthBtn.addEventListener('click', () => {
            currentMonth++;
            if (currentMonth > 11) {
                currentMonth = 0;
                currentYear++;
            }
            renderCalendar();
        });
    }

    function renderCalendar() {
        if (!calendarDaysElement || !currentMonthYearElement) {
            return;
        }

        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];

        // Update month/year display
        currentMonthYearElement.textContent = `${monthNames[currentMonth]} ${currentYear}`;

        // Clear existing calendar
        calendarDaysElement.innerHTML = '';

        // Calculate first day and days in month
        const firstDay = new Date(currentYear, currentMonth, 1).getDay();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

        // Add empty cells for days before first of month
        for (let i = 0; i < firstDay; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-day empty';
            calendarDaysElement.appendChild(emptyDay);
        }

        // Create calendar days
        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';

            // Create day number element
            const dayNumber = document.createElement('span');
            dayNumber.className = 'day-number';
            dayNumber.textContent = day;
            dayElement.appendChild(dayNumber);

            // Check for events on this day
            const checkDate = new Date(currentYear, currentMonth, day);
            const dayEvents = eventData.filter(event => {
                const eventDate = new Date(event.date);
                return eventDate.getDate() === day &&
                    eventDate.getMonth() === currentMonth &&
                    eventDate.getFullYear() === currentYear;
            });

            // Add event indicators and handlers
            if (dayEvents.length > 0) {
                dayElement.classList.add('has-events');

                // Create tooltip
                const tooltip = document.createElement('div');
                tooltip.className = 'event-tooltip';
                dayEvents.forEach(event => {
                    const eventTime = event.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    tooltip.innerHTML += `
                        <div class="tooltip-event">
                            <span class="tooltip-time">${eventTime}</span>
                            ${event.title}
                        </div>
                    `;
                });
                dayElement.appendChild(tooltip);

                // Add click handler
                dayElement.addEventListener('click', () => {
                    showEventsForDate(checkDate);
                });
            }

            // Highlight today
            const today = new Date();
            if (day === today.getDate() &&
                currentMonth === today.getMonth() &&
                currentYear === today.getFullYear()) {
                dayElement.classList.add('today');
            }

            calendarDaysElement.appendChild(dayElement);
        }

        // Add click handlers to days with events
        addDayClickHandlers();

        // Show upcoming events by default
        showUpcomingEvents();
    }

    // Function to show events for a specific date
    function showEventsForDate(date) {
        if (!upcomingEventsListElement) {
            return;
        }

        const dayEvents = eventData.filter(event => {
            const eventDate = new Date(event.date);
            return eventDate.getDate() === date.getDate() &&
                eventDate.getMonth() === date.getMonth() &&
                eventDate.getFullYear() === date.getFullYear();
        });

        upcomingEventsListElement.innerHTML = '';

        // Update the section title to show selected date
        const eventsTitle = document.getElementById('eventsTitle');
        if (eventsTitle) {
            const formattedDate = date.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric'
            });
            eventsTitle.textContent = `Events for ${formattedDate}`;
        }

        if (dayEvents.length === 0) {
            upcomingEventsListElement.innerHTML = '<div class="no-events">No events scheduled for this date</div>';
            return;
        }

        const facebookEventsPage = "https://www.facebook.com/groups/westcoastmultirotorclub/events";

        dayEvents.forEach(event => {
            const eventCard = document.createElement('div');
            eventCard.className = 'event-card fade-in active';

            const eventImgDiv = document.createElement('div');
            eventImgDiv.className = 'event-img';
            eventImgDiv.style.backgroundImage = `url('${event.image}')`;

            const eventDetailsDiv = document.createElement('div');
            eventDetailsDiv.className = 'event-details';

            const eventDate = new Date(event.date);
            const formattedDate = eventDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric'
            });

            const formattedTime = eventDate.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
            });

            const eventDateSpan = document.createElement('span');
            eventDateSpan.className = 'event-date';
            eventDateSpan.textContent = `${formattedDate} at ${formattedTime}`;

            const eventTitle = document.createElement('h3');
            eventTitle.textContent = event.title;

            const buttonContainer = document.createElement('div');
            buttonContainer.style.marginTop = 'auto';

            const eventLink = document.createElement('a');
            eventLink.href = facebookEventsPage;
            eventLink.target = '_blank';
            eventLink.className = 'btn';
            eventLink.textContent = 'VIEW DETAILS';

            buttonContainer.appendChild(eventLink);

            eventDetailsDiv.appendChild(eventDateSpan);
            eventDetailsDiv.appendChild(eventTitle);
            eventDetailsDiv.appendChild(buttonContainer);

            eventCard.appendChild(eventImgDiv);
            eventCard.appendChild(eventDetailsDiv);

            upcomingEventsListElement.appendChild(eventCard);
        });
    }

    // Function to show upcoming events
    function showUpcomingEvents() {
        if (!upcomingEventsListElement) {
            return;
        }

        // Reset the section title
        const eventsTitle = document.getElementById('eventsTitle');
        if (eventsTitle) {
            eventsTitle.textContent = 'Upcoming Races';
        }

        const today = new Date();
        upcomingEventsListElement.innerHTML = '';

        const upcomingEvents = eventData
            .filter(event => event.date > today)
            .sort((a, b) => a.date - b.date)
            .slice(0, 5);

        if (upcomingEvents.length === 0) {
            upcomingEventsListElement.innerHTML = '<div class="no-events">No upcoming events scheduled</div>';
            return;
        }

        const facebookEventsPage = "https://www.facebook.com/groups/westcoastmultirotorclub/events";

        upcomingEvents.forEach(event => {
            const eventCard = document.createElement('div');
            eventCard.className = 'event-card fade-in active';

            const eventImgDiv = document.createElement('div');
            eventImgDiv.className = 'event-img';
            eventImgDiv.style.backgroundImage = `url('${event.image}')`;

            const eventDetailsDiv = document.createElement('div');
            eventDetailsDiv.className = 'event-details';

            const eventDate = new Date(event.date);
            const formattedDate = eventDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric'
            });

            const formattedTime = eventDate.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
            });

            const eventDateSpan = document.createElement('span');
            eventDateSpan.className = 'event-date';
            eventDateSpan.textContent = `${formattedDate} at ${formattedTime}`;

            const eventTitle = document.createElement('h3');
            eventTitle.textContent = event.title;

            const buttonContainer = document.createElement('div');
            buttonContainer.style.marginTop = 'auto';

            const eventLink = document.createElement('a');
            eventLink.href = facebookEventsPage;
            eventLink.target = '_blank';
            eventLink.className = 'btn';
            eventLink.textContent = 'VIEW DETAILS';

            buttonContainer.appendChild(eventLink);

            eventDetailsDiv.appendChild(eventDateSpan);
            eventDetailsDiv.appendChild(eventTitle);
            eventDetailsDiv.appendChild(buttonContainer);

            eventCard.appendChild(eventImgDiv);
            eventCard.appendChild(eventDetailsDiv);

            upcomingEventsListElement.appendChild(eventCard);
        });
    }

    // This is the function to add day click handlers
    function addDayClickHandlers() {
        const calendarDays = document.querySelectorAll('.calendar-day');
        calendarDays.forEach(day => {
            if (day.classList.contains('has-events')) {
                day.addEventListener('click', function () {
                    const dayNumber = this.querySelector('.day-number').textContent;
                    const selectedDate = new Date(currentYear, currentMonth, parseInt(dayNumber));
                    showEventsForDate(selectedDate);
                });
            }
        });
    }

    // FIXED: Update the VIEW ALL EVENTS button to link to the correct page
    const viewAllEventsBtn = document.querySelector('.events-cta .btn');
    if (viewAllEventsBtn) {
        viewAllEventsBtn.href = "https://www.facebook.com/groups/westcoastmultirotorclub/events";
        viewAllEventsBtn.target = "_blank";
    }

    /** Parse "YYYY-MM-DD" as a local date, so no timezone shifts the race day. */
    function toLocalDate(value) {
        if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

        const isoParts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value).trim());
        if (isoParts) {
            return new Date(Number(isoParts[1]), Number(isoParts[2]) - 1, Number(isoParts[3]));
        }

        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    // Exposed so other sections (currently the photo gallery) can tie content
    // back to the race day it came from.
    window.WCMRCEvents = {
        events: eventData,

        findByDate(value) {
            const target = toLocalDate(value);
            if (!target) return null;

            return eventData.find(event =>
                event.date.getDate() === target.getDate() &&
                event.date.getMonth() === target.getMonth() &&
                event.date.getFullYear() === target.getFullYear()
            ) || null;
        },

        focusDate(value) {
            const target = toLocalDate(value);
            if (!target || !calendarDaysElement) return false;

            currentMonth = target.getMonth();
            currentYear = target.getFullYear();
            renderCalendar();
            showEventsForDate(target);

            const section = document.getElementById('events');
            if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return true;
        }
    };

    // Initialize calendar when the page loads
    if (calendarDaysElement) {
        renderCalendar();
    }
});

// Video Integration for West Coast Multirotor Club
document.addEventListener('DOMContentLoaded', function () {
    // Elements
    const videoOverlay = document.getElementById('videoOverlay');
    const showcaseVideo = document.getElementById('showcaseVideo');

    // Exit early if essential elements are not found
    if (!videoOverlay || !showcaseVideo) {
        return;
    }

    const videoCloseBtn = document.querySelector('.video-close');
    const playPauseBtn = document.querySelector('.play-pause');
    const muteUnmuteBtn = document.querySelector('.mute-unmute');
    const fullscreenBtn = document.querySelector('.fullscreen');
    const progressBar = document.querySelector('.video-progress-bar');
    const progressContainer = document.querySelector('.video-progress-container');

    // Add watch button to the hero buttons section
    const heroBtns = document.querySelector('.hero-btns');
    if (heroBtns) {
        const watchVideoBtn = document.createElement('button');
        watchVideoBtn.className = 'watch-video-btn';
        watchVideoBtn.innerHTML = '<i class="fas fa-play"></i> Watch Video';
        heroBtns.appendChild(watchVideoBtn);

        // Watch button click event
        watchVideoBtn.addEventListener('click', showVideo);
    }

    // Helper function to check if user has watched the video
    function hasWatchedVideo() {
        return localStorage.getItem('wcmrc_video_watched') === 'true';
    }

    // Helper function to mark video as watched
    function markVideoAsWatched() {
        try {
            localStorage.setItem('wcmrc_video_watched', 'true');
        } catch (storageError) {
            // LocalStorage not available
        }
    }

    // Show video function
    function showVideo() {
        try {
            // Pause any site animations temporarily
            pauseSiteAnimations();

            // Show video overlay with animation
            if (videoOverlay) videoOverlay.classList.add('visible');

            // Auto-play video (muted by default for better UX and browser compliance)
            if (showcaseVideo) {
                showcaseVideo.muted = true;
                showcaseVideo.play().catch(e => {
                    // Update UI to show play button instead
                    if (playPauseBtn) {
                        const playIcon = playPauseBtn.querySelector('i');
                        if (playIcon) playIcon.className = 'fas fa-play';
                    }
                });
            }

            // Mark as watched
            markVideoAsWatched();
        } catch (error) {
            // Silent error handling
        }
    }

    // Hide video function
    function hideVideo() {
        try {
            // Pause the video
            if (showcaseVideo) showcaseVideo.pause();

            // Hide overlay with animation
            if (videoOverlay) videoOverlay.classList.remove('visible');

            // Reset progress after overlay is hidden
            setTimeout(() => {
                if (showcaseVideo) {
                    showcaseVideo.currentTime = 0;
                    if (progressBar) progressBar.style.width = '0%';
                }
            }, 600); // Match transition time

            // Resume site animations
            resumeSiteAnimations();
        } catch (error) {
            // Silent error handling
        }
    }

    // Toggle play/pause
    function togglePlayPause() {
        if (!showcaseVideo) return;

        try {
            if (showcaseVideo.paused) {
                showcaseVideo.play();
                if (playPauseBtn) {
                    const playIcon = playPauseBtn.querySelector('i');
                    if (playIcon) playIcon.className = 'fas fa-pause';
                }
            } else {
                showcaseVideo.pause();
                if (playPauseBtn) {
                    const playIcon = playPauseBtn.querySelector('i');
                    if (playIcon) playIcon.className = 'fas fa-play';
                }
            }
        } catch (error) {
            // Silent error handling
        }
    }

    // Toggle mute/unmute
    function toggleMuteUnmute() {
        if (!showcaseVideo || !muteUnmuteBtn) return;

        try {
            showcaseVideo.muted = !showcaseVideo.muted;
            const muteIcon = muteUnmuteBtn.querySelector('i');
            if (muteIcon) {
                muteIcon.className = showcaseVideo.muted ?
                    'fas fa-volume-mute' : 'fas fa-volume-up';
            }
        } catch (error) {
            // Silent error handling
        }
    }

    // Toggle fullscreen
    function toggleFullscreen() {
        if (!showcaseVideo || !fullscreenBtn) return;

        try {
            if (!document.fullscreenElement) {
                if (showcaseVideo.requestFullscreen) {
                    showcaseVideo.requestFullscreen();
                } else if (showcaseVideo.webkitRequestFullscreen) {
                    showcaseVideo.webkitRequestFullscreen();
                } else if (showcaseVideo.msRequestFullscreen) {
                    showcaseVideo.msRequestFullscreen();
                }
                const fullscreenIcon = fullscreenBtn.querySelector('i');
                if (fullscreenIcon) fullscreenIcon.className = 'fas fa-compress';
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                } else if (document.msExitFullscreen) {
                    document.msExitFullscreen();
                }
                const fullscreenIcon = fullscreenBtn.querySelector('i');
                if (fullscreenIcon) fullscreenIcon.className = 'fas fa-expand';
            }
        } catch (error) {
            // Silent error handling
        }
    }

    // Update progress bar during playback
    function updateProgress() {
        if (!showcaseVideo || !progressBar) return;

        try {
            if (showcaseVideo.duration) {
                const percentage = (showcaseVideo.currentTime / showcaseVideo.duration) * 100;
                progressBar.style.width = `${percentage}%`;
            }
        } catch (error) {
            // Silent error handling
        }
    }

    // Skip to position in video when clicking progress bar
    function skipTo(e) {
        if (!showcaseVideo || !progressContainer) return;

        try {
            const rect = progressContainer.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            showcaseVideo.currentTime = pos * showcaseVideo.duration;
        } catch (error) {
            // Silent error handling
        }
    }

    // Handle video ended
    function handleVideoEnded() {
        try {
            // Reset play button icon
            if (playPauseBtn) {
                const playIcon = playPauseBtn.querySelector('i');
                if (playIcon) playIcon.className = 'fas fa-play';
            }

            // Auto close after a brief delay
            setTimeout(hideVideo, 1500);
        } catch (error) {
            // Silent error handling
        }
    }

    // Pause site animations to improve performance during video playback
    function pauseSiteAnimations() {
        try {
            // Pause pilot carousel
            const pilotCarousel = document.querySelector('.pilot-carousel');
            if (pilotCarousel && pilotCarousel.style) {
                pilotCarousel.style.animationPlayState = 'paused';
            }

            // Pause sponsors carousel
            const sponsorsCarousel = document.querySelector('.sponsors-carousel');
            if (sponsorsCarousel && sponsorsCarousel.style) {
                sponsorsCarousel.style.animationPlayState = 'paused';
            }
        } catch (error) {
            // Silent error handling
        }
    }

    // Resume site animations
    function resumeSiteAnimations() {
        try {
            // Resume pilot carousel
            const pilotCarousel = document.querySelector('.pilot-carousel');
            if (pilotCarousel && pilotCarousel.style) {
                pilotCarousel.style.animationPlayState = 'running';
            }

            // Resume sponsors carousel
            const sponsorsCarousel = document.querySelector('.sponsors-carousel');
            if (sponsorsCarousel && sponsorsCarousel.style) {
                sponsorsCarousel.style.animationPlayState = 'running';
            }
        } catch (error) {
            // Silent error handling
        }
    }

    // Show video automatically after a delay if not seen before
    // This creates a better first-time experience without annoying returning visitors
    function initializeVideoFeature() {
        if (!hasWatchedVideo()) {
            // Show video after a slight delay to let the site load first
            setTimeout(showVideo, 2000);
        }
    }

    // Create video poster from the first frame if not provided
    function generateVideoPoster() {
        // Only generate if no poster is specified
        if (!showcaseVideo.hasAttribute('poster')) {
            // Create a temporary canvas to capture the first frame
            showcaseVideo.addEventListener('loadeddata', function () {
                if (showcaseVideo.readyState >= 2) { // HAVE_CURRENT_DATA or better
                    // Seek to 0.5 seconds in for a better first frame
                    showcaseVideo.currentTime = 0.5;

                    // Attach event for after seeking completes
                    showcaseVideo.addEventListener('seeked', function onSeeked() {
                        // Remove this event to prevent multiple triggers
                        showcaseVideo.removeEventListener('seeked', onSeeked);

                        // Create canvas and draw video frame
                        const canvas = document.createElement('canvas');
                        canvas.width = showcaseVideo.videoWidth;
                        canvas.height = showcaseVideo.videoHeight;

                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(showcaseVideo, 0, 0, canvas.width, canvas.height);

                        try {
                            // Set the poster to the canvas data
                            const dataURL = canvas.toDataURL('image/jpeg');
                            showcaseVideo.setAttribute('poster', dataURL);

                            // Reset video position to start
                            showcaseVideo.currentTime = 0;
                        } catch (e) {
                            // Silent error handling
                        }
                    });
                }
            });
        }
    }

    // Event Listeners
    if (videoCloseBtn) videoCloseBtn.addEventListener('click', hideVideo);
    if (playPauseBtn) playPauseBtn.addEventListener('click', togglePlayPause);
    if (muteUnmuteBtn) muteUnmuteBtn.addEventListener('click', toggleMuteUnmute);
    if (fullscreenBtn) fullscreenBtn.addEventListener('click', toggleFullscreen);
    if (progressContainer) progressContainer.addEventListener('click', skipTo);
    if (showcaseVideo) {
        showcaseVideo.addEventListener('timeupdate', updateProgress);
        showcaseVideo.addEventListener('ended', handleVideoEnded);
    }

    // Handle fullscreen change
    document.addEventListener('fullscreenchange', function () {
        if (fullscreenBtn && fullscreenBtn.querySelector('i')) {
            fullscreenBtn.querySelector('i').className = document.fullscreenElement ?
                'fas fa-compress' : 'fas fa-expand';
        }
    });

    // Handle play state change for UI updates
    if (showcaseVideo && playPauseBtn) {
        showcaseVideo.addEventListener('play', function () {
            const playIcon = playPauseBtn.querySelector('i');
            if (playIcon) playIcon.className = 'fas fa-pause';
        });

        showcaseVideo.addEventListener('pause', function () {
            const playIcon = playPauseBtn.querySelector('i');
            if (playIcon) playIcon.className = 'fas fa-play';
        });
    }

    // Initialize video features
    generateVideoPoster();
    // initializeVideoFeature(); // Commented out to prevent auto-play on page load

    // Add keyboard support
    document.addEventListener('keydown', function (e) {
        // Only respond if video overlay is visible
        if (!videoOverlay || !videoOverlay.classList.contains('visible')) return;

        switch (e.key) {
            case "Escape":
                hideVideo();
                break;
            case " ":
                togglePlayPause();
                e.preventDefault(); // Prevent page scrolling on spacebar
                break;
            case "m":
                toggleMuteUnmute();
                break;
            case "f":
                toggleFullscreen();
                break;
        }
    });

    // Create video poster image if needed
    function createVideoPoster() {
        // Create and add video poster element to head
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = './assets/drone.mp4';
        link.as = 'video';
        document.head.appendChild(link);
    }

    // Call the function to create the poster
    createVideoPoster();
});

// Centralized Video Management System
document.addEventListener('DOMContentLoaded', function () {
    // Modal elements
    const videoModalOverlay = document.getElementById('videoModalOverlay');
    const videoModalContainer = document.getElementById('videoModalContainer');
    const videoModalTitle = document.getElementById('videoModalTitle');
    const videoModalDate = document.getElementById('videoModalDate');
    const videoModalIframe = document.getElementById('videoModalIframe');
    const videoModalClose = document.getElementById('videoModalClose');
    const videoModalYouTube = document.getElementById('videoModalYouTube');
    let lastFocusedBeforeModal = null;

    // Exit early if modal elements are not found
    if (!videoModalOverlay || !videoModalContainer || !videoModalIframe) {
        return;
    }

    // ============================================================================
    // CENTRALIZED VIDEO DATA - Add new videos to the TOP of this array
    // The first video will automatically become the main showcase
    // All others will be historic videos
    // ============================================================================
    const SERIES_LABELS = {
        '2026-winter': '2026 Winter Series',
        '2026-summer': '2026 Summer Series',
        '2025-summer': '2025/26 Summer Series',
        'state-champs-2025': 'WA State Championships 2025',
        '2025-winter': '2025 Winter Series',
        '2024-summer': '2024 Summer Series'
    };

    const SERIES_FILTER_LABELS = {
        '2026-winter': '2026 Winter',
        '2026-summer': '2026 Summer',
        '2025-summer': '2025/26 Summer',
        'state-champs-2025': 'State Champs',
        '2025-winter': '2025 Winter',
        '2024-summer': '2024 Summer'
    };

    const SERIES_ORDER = [
        '2026-winter',
        '2026-summer',
        '2025-summer',
        'state-champs-2025',
        '2025-winter',
        '2024-summer'
    ];

    const videoDatabase = [
        {
            id: 'dqAay6lHK7s',
            title: 'Global Drone Solutions 2026 Winter Heat 5 Highlights',
            date: 'August 8, 2026',
            description: 'Highlights from Round 5 of the 2026 Winter Series — tight, fast racing squeezed in between the rain!',
            series: '2026-winter'
        },
        {
            id: 'D9TiQJqB6AM',
            title: 'Global Drone Solutions 2026 Winter Heat 4 Highlights',
            date: 'July 25, 2026',
            description: 'Highlights from Round 4 of the 2026 Winter Series — mid-season racing at its best!',
            series: '2026-winter'
        },
        {
            id: 'H7eQZIEOpbI',
            title: 'Global Drone Solutions - 2026 Winter Round 3',
            date: 'July 11, 2026',
            description: 'Round 3 of the 2026 Winter Series — Round 2 was washed out by rain, so the racing came back hot!',
            series: '2026-winter'
        },
        {
            id: 'ZZeIoFfyDZU',
            title: 'Global Drone Solutions 2026 Winter Heat 1 (HD Highlights Edition)',
            date: 'June 13, 2026',
            description: 'Season opener for the 2026 Winter Series — HD highlights from an action-packed first heat!',
            series: '2026-winter'
        },
        {
            id: 'KHAsRnM1vHE',
            title: 'Global Drone Solutions - 2026 Summer Round 7',
            date: 'April 12, 2026',
            description: 'Round 7 of the 2025/26 Summer Series!',
            series: '2026-summer'
        },
        {
            id: 'SkEbct9AzPI',
            title: 'Global Drone Solutions - 2026 Summer Round 6',
            date: 'March 8, 2026',
            description: 'Round 6 on the Australian Nationals Qualifier track — 14 pilots, high pace, and a tight season ladder!',
            series: '2026-summer'
        },
        {
            id: 'JpKggqmL_L4',
            title: 'Global Drone Solutions - 2026 Summer Round 5',
            date: 'February 15, 2026',
            description: 'Round 5 with a tighter track than usual — 5 laps of survival racing!',
            series: '2026-summer'
        },
        {
            id: 'IV26L2GFXtg',
            title: 'Global Drone Solutions - 2026 Summer Round 4',
            date: 'February 1, 2026',
            description: 'Summer Heat 4 — thrilling racing action from the 2025/26 Summer Series!',
            series: '2026-summer'
        },
        {
            id: 'JQZf6poeUo8',
            title: 'Global Drone Solutions - 2025 Summer Round 3',
            date: 'January 18, 2026',
            description: 'Round 3 of the 2025/26 Summer Series!',
            series: '2025-summer'
        },
        {
            id: '2ufT9mS4Mig',
            title: 'Global Drone Solutions - 2025 Summer Round 2',
            date: 'December 14, 2025',
            description: 'Racing action from Round 2 of the 2025/26 Summer Series!',
            series: '2025-summer'
        },
        {
            id: 'tdHy1c-RWxM',
            title: 'Global Drone Solutions - 2025 Summer Round 1',
            date: 'November 30, 2025',
            description: 'Season opener - Summer Series 2025/26 Round 1!',
            series: '2025-summer'
        },
        {
            id: 'qgY-r-NAYZ0',
            title: 'WA State Championships Racing',
            date: 'October 12, 2025',
            description: 'High-speed 5" racing action from day 2 of the WA State Championships!',
            series: 'state-champs-2025'
        },
        {
            id: 'QLVPLPC_jK8',
            title: 'WA State Championships Freestyle',
            date: 'October 11, 2025',
            description: 'Amazing freestyle performances from the WA State Championships',
            series: 'state-champs-2025'
        },
        {
            id: 'JrUmRHmvzeo',
            title: 'WA State Championships Whoop Racing',
            date: 'October 11, 2025',
            description: 'Exciting tiny whoop racing competition from the State Championships',
            series: 'state-champs-2025'
        },
        {
            id: 'l8AzqAO1eus',
            title: 'WA State Championships Time Trials',
            date: 'October 11, 2025',
            description: 'Time trial sessions to set qualifying positions for the WA State Championships',
            series: 'state-champs-2025'
        },
        {
            id: 'lm3tOaEIhWs',
            title: 'Global Drone Solutions - 2025 Winter Grand Final',
            date: 'August 31, 2025',
            description: 'The thrilling conclusion to our 2025 Winter series!',
            series: '2025-winter'
        },
        {
            id: 'lF8Ly45rlJI',
            title: 'Global Drone Solutions - 2025 Winter Round 8',
            date: 'August 16, 2025',
            description: 'Intense racing action from round 8',
            series: '2025-winter'
        },
        {
            id: 'dq6_mui1MwA',
            title: 'Global Drone Solutions - 2025 Winter Round 6',
            date: 'July 19, 2025',
            description: 'High-speed competition and amazing pilots',
            series: '2025-winter'
        },
        {
            id: 'M9kyPWRqRDo',
            title: 'Global Drone Solutions - 2025 Winter Round 5',
            date: 'July 5, 2025',
            description: 'Mid-season excitement and close finishes',
            series: '2025-winter'
        },
        {
            id: 'Z0TYGtJkNYc',
            title: 'Global Drone Solutions - 2025 Winter Round 3',
            date: 'June 7, 2025',
            description: 'Early season momentum building',
            series: '2025-winter'
        },
        {
            id: 'qbF6hs6pkcI',
            title: 'Global Drone Solutions - 2025 Winter Round 2',
            date: 'May 24, 2025',
            description: 'Second round of winter racing',
            series: '2025-winter'
        },
        {
            id: 'q5riSjhoO6Y',
            title: 'Global Drone Solutions - 2025 Winter Round 1',
            date: 'May 10, 2025',
            description: 'Season opener with fantastic racing',
            series: '2025-winter'
        },
        {
            id: 'EQtrL84xII8',
            title: 'Global Drone Solutions - 2024 Summer Grand Final',
            date: 'April 12, 2025',
            description: 'Epic finale of our summer racing series',
            series: '2024-summer'
        }
    ];

    let activeSeriesFilter = 'all';
    let librarySearchTerm = '';
    let libraryListenersAttached = false;

    // ============================================================================
    // VIDEO MANAGEMENT FUNCTIONS
    // ============================================================================
    
    // Get the current showcase video (first in array)
    function getCurrentShowcaseVideo() {
        return videoDatabase[0];
    }
    
    // Get all historic videos (all except first)
    function getHistoricVideos() {
        return videoDatabase.slice(1);
    }
    
    // Function to add a new video (call this when you have a new video to showcase)
    function addNewVideo(videoData) {
        // Add new video to the beginning of the array
        videoDatabase.unshift(videoData);
        // Refresh the display
        updateVideoDisplay();
    }
    
    // Function to get YouTube thumbnail URL
    function getYouTubeThumbnail(videoId, quality = 'hqdefault') {
        return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
    }

    // ============================================================================
    // VIDEO SHARING - links point back to the club site, not to YouTube
    // ============================================================================
    const CANONICAL_SITE_URL = 'https://westcoastmultirotors.com.au/';
    const SHARE_PARAM = 'video';

    let shareMenu = null;
    let shareMenuAnchor = null;
    let shareToastTimer = null;

    function getVideoById(videoId) {
        return videoDatabase.find(video => video.id === videoId) || null;
    }

    function buildVideoShareUrl(videoId) {
        const servedOverWeb = location.protocol === 'http:' || location.protocol === 'https:';
        const url = new URL(servedOverWeb ? `${location.origin}${location.pathname}` : CANONICAL_SITE_URL);
        url.searchParams.set(SHARE_PARAM, videoId);
        url.hash = 'live-streams';
        return url.toString();
    }

    // Keep the address bar in sync so copying it also shares the open video
    function syncShareUrlInAddressBar(videoId) {
        if (!window.history || typeof history.replaceState !== 'function') return;

        try {
            const url = new URL(window.location.href);
            if (videoId) {
                url.searchParams.set(SHARE_PARAM, videoId);
            } else {
                url.searchParams.delete(SHARE_PARAM);
            }
            history.replaceState(history.state, '', url.toString());
        } catch (error) {
            // Silent error handling
        }
    }

    function copyTextToClipboard(text) {
        if (navigator.clipboard && window.isSecureContext) {
            return navigator.clipboard.writeText(text);
        }

        return new Promise((resolve, reject) => {
            const helper = document.createElement('textarea');
            helper.value = text;
            helper.setAttribute('readonly', '');
            helper.style.position = 'fixed';
            helper.style.top = '-1000px';
            helper.style.opacity = '0';
            document.body.appendChild(helper);
            helper.select();

            try {
                if (document.execCommand('copy')) {
                    resolve();
                } else {
                    reject(new Error('Copy command rejected'));
                }
            } catch (error) {
                reject(error);
            } finally {
                document.body.removeChild(helper);
            }
        });
    }

    function showShareToast(message, variant = 'success') {
        let toast = document.getElementById('videoShareToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'videoShareToast';
            toast.setAttribute('role', 'status');
            toast.setAttribute('aria-live', 'polite');
            document.body.appendChild(toast);
        }

        const icon = variant === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation';
        toast.className = `share-toast share-toast-${variant}`;
        toast.innerHTML = `<i class="fas ${icon}" aria-hidden="true"></i><span></span>`;
        toast.querySelector('span').textContent = message;

        requestAnimationFrame(() => toast.classList.add('visible'));

        clearTimeout(shareToastTimer);
        shareToastTimer = setTimeout(() => toast.classList.remove('visible'), 3600);
    }

    function closeShareMenu() {
        if (!shareMenu) return;

        shareMenu.remove();
        shareMenu = null;
        if (shareMenuAnchor) shareMenuAnchor.classList.remove('share-active');
        shareMenuAnchor = null;
        document.removeEventListener('click', handleShareMenuOutsideClick, true);
        window.removeEventListener('resize', closeShareMenu);
        window.removeEventListener('scroll', closeShareMenu, true);
    }

    function handleShareMenuOutsideClick(event) {
        if (!shareMenu) return;
        if (shareMenu.contains(event.target) || event.target.closest('.video-share-btn')) return;
        closeShareMenu();
    }

    function positionShareMenu(anchor) {
        if (!shareMenu || !anchor) return;

        const margin = 12;
        const anchorRect = anchor.getBoundingClientRect();
        const menuRect = shareMenu.getBoundingClientRect();

        const left = Math.max(margin, Math.min(anchorRect.right - menuRect.width, window.innerWidth - menuRect.width - margin));
        let top = anchorRect.bottom + 8;
        if (top + menuRect.height > window.innerHeight - margin) {
            top = Math.max(margin, anchorRect.top - menuRect.height - 8);
        }

        shareMenu.style.left = `${left}px`;
        shareMenu.style.top = `${top}px`;
    }

    function openShareMenu(anchor, videoId) {
        const video = getVideoById(videoId);
        if (!video) return;

        closeShareMenu();

        const shareUrl = buildVideoShareUrl(videoId);
        const shareText = `${video.title} — West Coast Multirotor Club`;
        const encodedUrl = encodeURIComponent(shareUrl);
        const encodedText = encodeURIComponent(shareText);
        const canUseNativeShare = typeof navigator.share === 'function';

        shareMenu = document.createElement('div');
        shareMenu.className = 'video-share-menu';
        shareMenu.setAttribute('role', 'dialog');
        shareMenu.setAttribute('aria-label', `Share ${video.title}`);
        shareMenu.innerHTML = `
            <p class="video-share-menu-title">Share this replay</p>
            <p class="video-share-menu-note">This link plays the video on our website.</p>
            <div class="video-share-link">
                <input type="text" class="video-share-url" value="${shareUrl}" readonly aria-label="Shareable link">
                <button type="button" class="video-share-copy" data-share-action="copy">
                    <i class="fas fa-copy" aria-hidden="true"></i> Copy
                </button>
            </div>
            <div class="video-share-targets">
                ${canUseNativeShare ? `
                    <button type="button" class="video-share-target" data-share-action="native">
                        <i class="fas fa-share-nodes" aria-hidden="true"></i> Share
                    </button>
                ` : ''}
                <a class="video-share-target" href="https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}"
                    target="_blank" rel="noopener">
                    <i class="fab fa-facebook-f" aria-hidden="true"></i> Facebook
                </a>
                <a class="video-share-target" href="https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}"
                    target="_blank" rel="noopener">
                    <i class="fab fa-whatsapp" aria-hidden="true"></i> WhatsApp
                </a>
                <a class="video-share-target" href="https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}"
                    target="_blank" rel="noopener">
                    <i class="fab fa-twitter" aria-hidden="true"></i> X
                </a>
                <a class="video-share-target" href="mailto:?subject=${encodedText}&body=${encodedText}%0A%0A${encodedUrl}">
                    <i class="fas fa-envelope" aria-hidden="true"></i> Email
                </a>
            </div>
        `;

        shareMenu.addEventListener('click', function (event) {
            const target = event.target.closest('[data-share-action], a');
            if (!target) return;

            const action = target.getAttribute('data-share-action');

            if (action === 'copy') {
                copyTextToClipboard(shareUrl)
                    .then(() => showShareToast('Link copied — it opens the video on our website'))
                    .catch(() => showShareToast('Could not copy the link. Select it and copy manually.', 'error'));
            } else if (action === 'native') {
                navigator.share({ title: video.title, text: shareText, url: shareUrl }).catch(() => { });
            }

            closeShareMenu();
        });

        document.body.appendChild(shareMenu);
        shareMenuAnchor = anchor;
        anchor.classList.add('share-active');
        positionShareMenu(anchor);

        const copyButton = shareMenu.querySelector('.video-share-copy');
        if (copyButton) copyButton.focus();

        document.addEventListener('click', handleShareMenuOutsideClick, true);
        window.addEventListener('resize', closeShareMenu);
        window.addEventListener('scroll', closeShareMenu, true);
    }

    // Capture phase so a share click never reaches the card's "open video" handler
    document.addEventListener('click', function (event) {
        const trigger = event.target.closest('.video-share-btn');
        if (!trigger) return;

        event.preventDefault();
        event.stopPropagation();

        if (shareMenuAnchor === trigger) {
            closeShareMenu();
            return;
        }

        openShareMenu(trigger, trigger.getAttribute('data-share-video-id'));
    }, true);

    function generateShareButtonHTML(video, extraClass = '') {
        return `
            <button type="button" class="video-share-btn ${extraClass}" data-share-video-id="${video.id}"
                aria-label="Share ${video.title}" title="Share this video">
                <i class="fas fa-share-nodes" aria-hidden="true"></i>
            </button>
        `;
    }

    // Open the video a shared link points at
    function openSharedVideoFromUrl() {
        const params = new URLSearchParams(window.location.search);
        const videoId = params.get(SHARE_PARAM);
        if (!videoId || !getVideoById(videoId)) return;

        const liveStreamsSection = document.getElementById('live-streams');
        if (liveStreamsSection) {
            liveStreamsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        setTimeout(() => openVideoModal(videoId), 700);
    }
    
    // Function to update the main showcase video
    function updateShowcaseVideo() {
        const showcaseVideo = getCurrentShowcaseVideo();
        const showcaseContainer = document.querySelector('.live-stream-main iframe');
        
        if (showcaseContainer && showcaseVideo) {
            const embedUrl = `https://www.youtube.com/embed/${showcaseVideo.id}`;
            showcaseContainer.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
            showcaseContainer.src = embedUrl;
            showcaseContainer.title = showcaseVideo.title;

            const showcaseShareBtn = document.getElementById('featuredVideoShare');
            if (showcaseShareBtn) {
                showcaseShareBtn.setAttribute('data-share-video-id', showcaseVideo.id);
                showcaseShareBtn.setAttribute('aria-label', `Share ${showcaseVideo.title}`);
            }
            
            // Update the section title if needed
            const sectionTitle = document.querySelector('#live-streams h2');
            if (sectionTitle) {
                sectionTitle.textContent = 'Latest Live Stream';
            }
            
            // Update the description
            const sectionDescription = document.querySelector('#live-streams p');
            if (sectionDescription) {
                sectionDescription.textContent = showcaseVideo.description || 'Catch the replay of our most recent race day action!';
            }
        }
    }
    
    // Function to generate a single video card
    function generateVideoCardHTML(video) {
        return `
            <article class="replay-card" data-video-id="${video.id}" tabindex="0" role="button"
                aria-label="Play ${video.title}">
                <div class="replay-card-media">
                    <img src="${getYouTubeThumbnail(video.id, 'mqdefault')}" alt="" loading="lazy">
                    <span class="replay-card-play" aria-hidden="true"><i class="fas fa-play"></i></span>
                    <span class="replay-card-date">${video.date}</span>
                    ${generateShareButtonHTML(video, 'replay-card-share')}
                </div>
                <h4 class="replay-card-title">${video.title}</h4>
            </article>
        `;
    }

    function shouldUseShelfLayout() {
        return activeSeriesFilter === 'all' && !librarySearchTerm.trim();
    }

    function getFilteredHistoricVideos() {
        const search = librarySearchTerm.trim().toLowerCase();

        return getHistoricVideos().filter(video => {
            const matchesSeries = activeSeriesFilter === 'all' || video.series === activeSeriesFilter;
            if (!matchesSeries) return false;

            if (!search) return true;

            const haystack = `${video.title} ${video.date} ${video.description || ''} ${SERIES_LABELS[video.series] || ''}`.toLowerCase();
            return haystack.includes(search);
        });
    }

    function groupVideosBySeries(videos) {
        const groups = new Map();

        videos.forEach(video => {
            const seriesKey = video.series || 'other';
            if (!groups.has(seriesKey)) {
                groups.set(seriesKey, []);
            }
            groups.get(seriesKey).push(video);
        });

        return SERIES_ORDER
            .filter(seriesKey => groups.has(seriesKey))
            .map(seriesKey => ({
                seriesKey,
                label: SERIES_LABELS[seriesKey] || seriesKey,
                videos: groups.get(seriesKey)
            }));
    }

    function renderVideoLibraryFilters() {
        const filtersContainer = document.getElementById('videoLibraryFilters');
        if (!filtersContainer) return;

        const availableSeries = [...new Set(getHistoricVideos().map(video => video.series))];
        const orderedSeries = SERIES_ORDER.filter(series => availableSeries.includes(series));

        let html = `
            <button type="button" class="video-filter-chip${activeSeriesFilter === 'all' ? ' active' : ''}"
                data-series="all" role="tab" aria-selected="${activeSeriesFilter === 'all'}">
                All
            </button>
        `;

        orderedSeries.forEach(seriesKey => {
            const isActive = activeSeriesFilter === seriesKey;
            html += `
                <button type="button" class="video-filter-chip${isActive ? ' active' : ''}"
                    data-series="${seriesKey}" role="tab" aria-selected="${isActive}">
                    ${SERIES_FILTER_LABELS[seriesKey] || SERIES_LABELS[seriesKey]}
                </button>
            `;
        });

        filtersContainer.innerHTML = html;
    }

    function renderVideoLibraryGroups() {
        const groupsContainer = document.getElementById('videoLibraryGroups');
        const emptyState = document.getElementById('videoLibraryEmpty');
        const meta = document.getElementById('videoLibraryMeta');
        if (!groupsContainer) return;

        const filteredVideos = getFilteredHistoricVideos();
        const groupedVideos = groupVideosBySeries(filteredVideos);
        const totalHistoric = getHistoricVideos().length;
        const useShelfLayout = shouldUseShelfLayout();

        if (meta) {
            if (filteredVideos.length === totalHistoric && useShelfLayout) {
                meta.textContent = `${totalHistoric} replays across ${groupedVideos.length} series`;
            } else if (filteredVideos.length === totalHistoric) {
                meta.textContent = `${totalHistoric} replays in the library`;
            } else {
                meta.textContent = `Showing ${filteredVideos.length} of ${totalHistoric} replays`;
            }
        }

        if (filteredVideos.length === 0) {
            groupsContainer.innerHTML = '';
            if (emptyState) emptyState.hidden = false;
            return;
        }

        if (emptyState) emptyState.hidden = true;

        if (useShelfLayout) {
            let html = '<div class="video-library-shelves">';
            groupedVideos.forEach(group => {
                html += `
                    <div class="video-shelf" data-series-group="${group.seriesKey}">
                        <div class="video-shelf-header">
                            <div class="video-shelf-heading">
                                <h4 class="video-shelf-title">${group.label}</h4>
                                <span class="video-shelf-count">${group.videos.length} replay${group.videos.length === 1 ? '' : 's'}</span>
                            </div>
                            ${group.videos.length > 3 ? `
                                <button type="button" class="video-shelf-view-all" data-series="${group.seriesKey}">
                                    View all <i class="fas fa-arrow-right" aria-hidden="true"></i>
                                </button>
                            ` : ''}
                        </div>
                        <div class="video-shelf-track" tabindex="0" aria-label="${group.label} replays">
                            ${group.videos.map(video => generateVideoCardHTML(video)).join('')}
                        </div>
                    </div>
                `;
            });
            html += '</div>';
            groupsContainer.innerHTML = html;
            return;
        }

        const activeLabel = activeSeriesFilter !== 'all'
            ? (SERIES_LABELS[activeSeriesFilter] || 'Filtered replays')
            : 'Search results';

        groupsContainer.innerHTML = `
            <div class="video-library-results">
                <div class="video-library-results-header">
                    <h4 class="video-library-results-title">${activeLabel}</h4>
                    <button type="button" class="video-library-clear" id="videoLibraryClear">
                        <i class="fas fa-times" aria-hidden="true"></i> Show all series
                    </button>
                </div>
                <div class="video-library-grid">
                    ${filteredVideos.map(video => generateVideoCardHTML(video)).join('')}
                </div>
            </div>
        `;
    }

    function renderVideoLibrary() {
        renderVideoLibraryFilters();
        renderVideoLibraryGroups();
        attachVideoClickListeners();
    }

    function handleLibrarySearch(event) {
        librarySearchTerm = event.target.value;
        renderVideoLibraryGroups();
        attachVideoClickListeners();
    }

    function handleLibraryFilterClick(event) {
        const chip = event.target.closest('.video-filter-chip');
        if (!chip) return;

        activeSeriesFilter = chip.getAttribute('data-series') || 'all';
        renderVideoLibrary();
    }

    function handleLibraryShelfActions(event) {
        const viewAllBtn = event.target.closest('.video-shelf-view-all');
        if (viewAllBtn) {
            activeSeriesFilter = viewAllBtn.getAttribute('data-series') || 'all';
            renderVideoLibrary();
            return;
        }

        const clearBtn = event.target.closest('.video-library-clear');
        if (clearBtn) {
            activeSeriesFilter = 'all';
            librarySearchTerm = '';
            const searchInput = document.getElementById('videoLibrarySearch');
            if (searchInput) searchInput.value = '';
            renderVideoLibrary();
        }
    }

    function handleVideoCardKeydown(event) {
        if (event.target.closest('.video-share-btn')) return;

        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleVideoClick(event);
        }
    }

    function attachVideoLibraryListeners() {
        if (libraryListenersAttached) return;

        const searchInput = document.getElementById('videoLibrarySearch');
        const filtersContainer = document.getElementById('videoLibraryFilters');
        const groupsContainer = document.getElementById('videoLibraryGroups');

        if (searchInput) {
            searchInput.addEventListener('input', handleLibrarySearch);
        }

        if (filtersContainer) {
            filtersContainer.addEventListener('click', handleLibraryFilterClick);
        }

        if (groupsContainer) {
            groupsContainer.addEventListener('click', handleLibraryShelfActions);
        }

        libraryListenersAttached = true;
    }
    
    // Function to update the entire video display
    function updateVideoDisplay() {
        updateShowcaseVideo();
        renderVideoLibrary();
        attachVideoLibraryListeners();
    }
    
    // Function to attach click listeners to video items
    function attachVideoClickListeners() {
        const videoCards = document.querySelectorAll('.replay-card');
        videoCards.forEach(item => {
            item.removeEventListener('click', handleVideoClick);
            item.removeEventListener('keydown', handleVideoCardKeydown);
            item.addEventListener('click', handleVideoClick);
            item.addEventListener('keydown', handleVideoCardKeydown);
        });
    }
    
    // Handle video click
    function handleVideoClick(event) {
        const videoId = event.currentTarget.getAttribute('data-video-id');
        if (videoId) {
            openVideoModal(videoId);
        }
    }
    
    // Convert old metadata format for backward compatibility
    const videoMetadata = {};
    videoDatabase.forEach(video => {
        videoMetadata[video.id] = {
            title: video.title,
            date: video.date
        };
    });

    // Drag functionality variables
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;

    // Function to open video modal
    function openVideoModal(videoId) {
        try {
            const metadata = videoMetadata[videoId];
            if (!metadata) return;

            // Set modal content
            if (videoModalTitle) videoModalTitle.textContent = metadata.title;
            if (videoModalDate) videoModalDate.textContent = metadata.date;

            const videoModalShare = document.getElementById('videoModalShare');
            if (videoModalShare) {
                videoModalShare.setAttribute('data-share-video-id', videoId);
                videoModalShare.setAttribute('aria-label', `Share ${metadata.title}`);
            }

            if (videoModalYouTube) {
                videoModalYouTube.href = `https://www.youtube.com/watch?v=${videoId}`;
                videoModalYouTube.setAttribute('aria-label', `Watch ${metadata.title} on YouTube`);
            }

            if (videoModalIframe) {
                videoModalIframe.title = metadata.title;
            }

            syncShareUrlInAddressBar(videoId);

            // Set YouTube embed URL with autoplay
            const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;
            if (videoModalIframe) {
                videoModalIframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
                videoModalIframe.src = embedUrl;
            }

            // Reset modal position to center (remove any previous drag positioning)
            videoModalContainer.style.transform = '';
            videoModalContainer.style.left = '';
            videoModalContainer.style.top = '';
            videoModalContainer.style.position = '';
            videoModalContainer.style.width = '';

            // Show modal
            lastFocusedBeforeModal = document.activeElement;
            videoModalOverlay.classList.add('visible');
            videoModalOverlay.setAttribute('aria-hidden', 'false');
            document.body.classList.add('video-modal-open');

            if (videoModalClose) {
                requestAnimationFrame(() => videoModalClose.focus({ preventScroll: true }));
            }

            // Pause any site animations temporarily
            pauseSiteAnimations();
        } catch (error) {
            console.error('Error opening video modal:', error);
        }
    }

    // Function to close video modal
    function closeVideoModal() {
        try {
            closeShareMenu();
            syncShareUrlInAddressBar(null);

            // Hide modal
            const wasVisible = videoModalOverlay.classList.contains('visible');
            videoModalOverlay.classList.remove('visible');
            videoModalOverlay.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('video-modal-open');

            // Stop video by clearing iframe src
            if (videoModalIframe) {
                setTimeout(() => {
                    videoModalIframe.src = '';
                }, 400); // Wait for transition to complete
            }

            if (wasVisible && lastFocusedBeforeModal && document.contains(lastFocusedBeforeModal)) {
                lastFocusedBeforeModal.focus({ preventScroll: true });
            }
            lastFocusedBeforeModal = null;

            // Resume site animations
            resumeSiteAnimations();
        } catch (error) {
            console.error('Error closing video modal:', error);
        }
    }

    // Drag functionality
    function startDrag(e) {
        if (!videoModalContainer) return;
        if (e.target.closest('button')) return;

        isDragging = true;
        videoModalContainer.classList.add('dragging');

        const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;

        // Get the current visual position of the modal BEFORE removing transforms
        const rect = videoModalContainer.getBoundingClientRect();

        // Calculate the offset between mouse position and modal's top-left corner
        dragStartX = clientX - rect.left;
        dragStartY = clientY - rect.top;

        // Switch to absolute positioning while maintaining the same visual position
        // Remove the transform and set explicit left/top/width to prevent jumping
        videoModalContainer.style.width = `${rect.width}px`;
        videoModalContainer.style.transform = 'none';
        videoModalContainer.style.left = `${rect.left}px`;
        videoModalContainer.style.top = `${rect.top}px`;
        videoModalContainer.style.position = 'fixed';

        e.preventDefault();
    }

    function doDrag(e) {
        if (!isDragging || !videoModalContainer) return;

        const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;

        // Calculate new position accounting for the initial click offset
        const newX = clientX - dragStartX;
        const newY = clientY - dragStartY;

        // Constrain to viewport
        const maxX = window.innerWidth - videoModalContainer.offsetWidth;
        const maxY = window.innerHeight - videoModalContainer.offsetHeight;

        const constrainedX = Math.max(0, Math.min(newX, maxX));
        const constrainedY = Math.max(0, Math.min(newY, maxY));

        // Apply position (transform is already set to 'none' in startDrag)
        videoModalContainer.style.left = `${constrainedX}px`;
        videoModalContainer.style.top = `${constrainedY}px`;

        e.preventDefault();
    }

    function endDrag() {
        if (!videoModalContainer) return;

        isDragging = false;
        videoModalContainer.classList.remove('dragging');

        // Keep the modal in its current dragged position
        // (don't reset to center unless user closes and reopens modal)
    }

    // Event listeners for past stream items are attached dynamically via attachVideoClickListeners

    // Modal close event listeners
    if (videoModalClose) {
        videoModalClose.addEventListener('click', closeVideoModal);
    }

    if (videoModalOverlay) {
        videoModalOverlay.addEventListener('click', function(e) {
            if (e.target === videoModalOverlay) {
                closeVideoModal();
            }
        });
    }

    // Drag event listeners for modal header
    const videoModalHeader = document.querySelector('.video-modal-header');
    if (videoModalHeader) {
        // Mouse events
        videoModalHeader.addEventListener('mousedown', startDrag);
        document.addEventListener('mousemove', doDrag);
        document.addEventListener('mouseup', endDrag);

        // Touch events
        videoModalHeader.addEventListener('touchstart', startDrag, { passive: false });
        document.addEventListener('touchmove', doDrag, { passive: false });
        document.addEventListener('touchend', endDrag);
    }

    // Keep keyboard focus inside the modal while it is open
    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Tab') return;
        if (!videoModalOverlay || !videoModalOverlay.classList.contains('visible')) return;
        if (shareMenu) return;

        const focusables = Array.from(
            videoModalContainer.querySelectorAll('button, a[href], iframe, [tabindex]:not([tabindex="-1"])')
        ).filter(el => !el.hasAttribute('disabled'));
        if (!focusables.length) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    });

    // Keyboard event listener for ESC key
    document.addEventListener('keydown', function(e) {
        if (e.key !== 'Escape') return;

        if (shareMenu) {
            const anchor = shareMenuAnchor;
            closeShareMenu();
            if (anchor) anchor.focus();
            return;
        }

        if (videoModalOverlay && videoModalOverlay.classList.contains('visible')) {
            closeVideoModal();
        }
    });

    // Helper functions for pausing/resuming animations
    function pauseSiteAnimations() {
        try {
            // Pause pilot carousel
            const pilotCarousel = document.querySelector('.pilot-carousel');
            if (pilotCarousel && pilotCarousel.style) {
                pilotCarousel.style.animationPlayState = 'paused';
            }

            // Pause sponsors carousel
            const sponsorsCarousel = document.querySelector('.sponsors-carousel');
            if (sponsorsCarousel && sponsorsCarousel.style) {
                sponsorsCarousel.style.animationPlayState = 'paused';
            }
        } catch (error) {
            // Silent error handling
        }
    }

    function resumeSiteAnimations() {
        try {
            // Resume pilot carousel
            const pilotCarousel = document.querySelector('.pilot-carousel');
            if (pilotCarousel && pilotCarousel.style) {
                pilotCarousel.style.animationPlayState = 'running';
            }

            // Resume sponsors carousel
            const sponsorsCarousel = document.querySelector('.sponsors-carousel');
            if (sponsorsCarousel && sponsorsCarousel.style) {
                sponsorsCarousel.style.animationPlayState = 'running';
            }
        } catch (error) {
            // Silent error handling
        }
    }

    // Handle window resize to reposition modal if needed
    window.addEventListener('resize', function() {
        if (videoModalOverlay && videoModalOverlay.classList.contains('visible') && videoModalContainer) {
            // Check if modal is outside viewport after resize
            const rect = videoModalContainer.getBoundingClientRect();
            const isOutsideViewport = rect.right > window.innerWidth ||
                                    rect.bottom > window.innerHeight ||
                                    rect.left < 0 ||
                                    rect.top < 0;

            if (isOutsideViewport) {
                // Only reset to center if modal is completely outside viewport
                if (rect.left >= window.innerWidth || rect.top >= window.innerHeight ||
                    rect.right <= 0 || rect.bottom <= 0) {
                    // Reset to center
                    videoModalContainer.style.transform = '';
                    videoModalContainer.style.left = '';
                    videoModalContainer.style.top = '';
                    videoModalContainer.style.position = '';
                    videoModalContainer.style.width = '';
                } else {
                    // Just constrain to viewport bounds
                    const maxX = window.innerWidth - videoModalContainer.offsetWidth;
                    const maxY = window.innerHeight - videoModalContainer.offsetHeight;

                    const constrainedX = Math.max(0, Math.min(rect.left, maxX));
                    const constrainedY = Math.max(0, Math.min(rect.top, maxY));

                    videoModalContainer.style.transform = 'none';
                    videoModalContainer.style.left = `${constrainedX}px`;
                    videoModalContainer.style.top = `${constrainedY}px`;
                    videoModalContainer.style.position = 'fixed';
                }
            }
        }
    });

    // ============================================================================
    // INITIALIZATION
    // ============================================================================
    
    // Initialize the video system when page loads
    function initializeVideoSystem() {
        updateVideoDisplay();
        openSharedVideoFromUrl();
        
        // Make functions available globally for easy video management
        window.WCMRCVideoManager = {
            addNewVideo: addNewVideo,
            getCurrentShowcase: getCurrentShowcaseVideo,
            getHistoricVideos: getHistoricVideos,
            refreshDisplay: updateVideoDisplay,
            openVideo: openVideoModal,
            videoDatabase: videoDatabase
        };
        
        console.log('🎥 WCMRC Video System Initialized');
        console.log('📝 To add a new video, use: WCMRCVideoManager.addNewVideo({id: "VIDEO_ID", title: "Title", date: "Date", description: "Description"})');
        console.log('📺 Current showcase:', getCurrentShowcaseVideo().title);
    }
    
    // ============================================================================
    // EASY VIDEO MANAGEMENT EXAMPLES
    // ============================================================================
    /*
    
    Example: Adding a new video (this will automatically move current showcase to historic)
    
    WCMRCVideoManager.addNewVideo({
        id: 'NEW_VIDEO_ID_HERE',
        title: 'Global Drone Solutions - 2025 Spring Round 1',
        date: 'September 15, 2025',
        description: 'Exciting season opener with new pilots and amazing competition!'
    });
    
    Example: View current system state
    
    console.log('Current showcase:', WCMRCVideoManager.getCurrentShowcase());
    console.log('Historic videos:', WCMRCVideoManager.getHistoricVideos());
    
    Example: Refresh display after manual changes
    
    WCMRCVideoManager.refreshDisplay();
    
    */
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeVideoSystem);
    } else {
        initializeVideoSystem();
    }
});

// ============================================================================
// PHOTO GALLERY SYSTEM
// Renders assets/gallery/manifest.json as three linked views: an album rail,
// a paged mosaic grid, and a lightbox viewer. Adding an album to the manifest
// is all that is needed for it to appear here.
// ============================================================================
(function () {
    'use strict';

    const GALLERY_BASE = './assets/gallery/';
    const PAGE_SIZE = 12;
    const COMBINED_ALBUM_ID = 'all';
    const SWIPE_THRESHOLD = 50;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const els = {};
    let albums = [];
    let activeAlbum = null;
    let visibleCount = PAGE_SIZE;
    let lightboxIndex = 0;
    let lastFocused = null;
    let swipeStartX = 0;
    let swipeEnabled = false;

    function cacheElements() {
        els.albums = document.getElementById('galleryAlbums');
        els.header = document.getElementById('galleryAlbumHeader');
        els.grid = document.getElementById('galleryGrid');
        els.loadMore = document.getElementById('galleryLoadMore');
        els.lightbox = document.getElementById('galleryLightbox');
        els.filmstrip = document.getElementById('galleryFilmstrip');
        if (els.lightbox) {
            els.figure = els.lightbox.querySelector('.gallery-lightbox-figure');
            els.image = els.lightbox.querySelector('.gallery-lightbox-img');
            els.caption = els.lightbox.querySelector('.gallery-lightbox-caption');
            els.counter = els.lightbox.querySelector('.gallery-lightbox-counter');
            els.albumLabel = els.lightbox.querySelector('.gallery-lightbox-album');
            els.close = els.lightbox.querySelector('.gallery-lightbox-close');
            els.prev = els.lightbox.querySelector('.gallery-lightbox-prev');
            els.next = els.lightbox.querySelector('.gallery-lightbox-next');
        }
    }

    function escapeHtml(value) {
        return String(value).replace(/[&<>"']/g, char => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[char]));
    }

    function photoPath(photo, size) {
        return `${GALLERY_BASE}${photo.albumId}/${size}/${encodeURIComponent(photo.file)}`;
    }

    /** Tag every photo with its album so any list of photos is self-describing. */
    function normalizeAlbums(rawAlbums) {
        return (Array.isArray(rawAlbums) ? rawAlbums : [])
            .filter(album => album && album.id && Array.isArray(album.photos) && album.photos.length)
            .map(album => ({
                id: album.id,
                title: album.title || album.id,
                date: album.date || '',
                description: album.description || '',
                cover: album.cover || '',
                eventDate: album.eventDate || '',
                videoId: album.videoId || '',
                photos: album.photos.map(photo => ({
                    file: photo.file,
                    caption: photo.caption || '',
                    albumId: album.id,
                    albumTitle: album.title || album.id
                }))
            }));
    }

    /** A virtual album spanning every real album, in manifest order. */
    function buildCombinedAlbum(realAlbums) {
        return {
            id: COMBINED_ALBUM_ID,
            title: 'All Photos',
            date: 'Every album',
            description: `The full archive across ${realAlbums.length} albums, newest first.`,
            covers: realAlbums.map(album => album.cover).filter(Boolean),
            photos: realAlbums.flatMap(album => album.photos)
        };
    }

    /** Real albums show their cover; the combined album gets a 2x2 collage. */
    function coverStyle(album) {
        const covers = album.id === COMBINED_ALBUM_ID
            ? collageCovers(album.covers)
            : [album.cover].filter(Boolean);

        const layers = covers.map(cover => `url('${GALLERY_BASE}${encodeURI(cover)}')`);
        if (!layers.length) return '';
        if (layers.length < 4) return `background-image: ${layers[0]};`;

        return `background-image: ${layers.join(', ')}; background-size: 50% 50%; ` +
            'background-position: 0 0, 100% 0, 0 100%, 100% 100%; background-repeat: no-repeat;';
    }

    function collageCovers(covers) {
        const available = (covers || []).filter(Boolean);
        if (available.length < 2) return available;
        return [0, 1, 2, 3].map(slot => available[slot % available.length]);
    }

    function albumMeta(album) {
        const count = `${album.photos.length} photo${album.photos.length === 1 ? '' : 's'}`;
        return album.date ? `${album.date} · ${count}` : count;
    }

    function renderRail() {
        els.albums.innerHTML = albums.map(album => {
            const selected = album.id === activeAlbum.id;
            return `
            <button type="button"
                    class="gallery-album-card${selected ? ' is-selected' : ''}"
                    role="tab"
                    aria-selected="${selected}"
                    tabindex="${selected ? '0' : '-1'}"
                    data-album-id="${escapeHtml(album.id)}"
                    style="${coverStyle(album)}">
                <span class="gallery-album-info">
                    <span class="gallery-album-title">${escapeHtml(album.title)}</span>
                    <span class="gallery-album-meta">${escapeHtml(albumMeta(album))}</span>
                </span>
            </button>
        `;
        }).join('');
    }

    /** Parse "YYYY-MM-DD" as a local date so no timezone shifts the race day. */
    function parseAlbumDate(value) {
        const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value).trim());
        if (!parts) return null;
        return new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]));
    }

    function linkMarkup({ modifier, icon, title, detail, dataset }) {
        return `
            <button type="button" class="gallery-album-link${modifier}" ${dataset}>
                <i class="${icon}" aria-hidden="true"></i>
                <span class="gallery-album-link-text">
                    <span class="gallery-album-link-title">${escapeHtml(title)}</span>
                    <span class="gallery-album-link-detail">${escapeHtml(detail)}</span>
                </span>
            </button>
        `;
    }

    /**
     * Albums point at a race day and a stream by reference, so titles and dates
     * are resolved from the live events/video data instead of being duplicated.
     */
    function eventLink(album) {
        const date = parseAlbumDate(album.eventDate);
        if (!date) return '';

        const events = window.WCMRCEvents;
        const match = events && typeof events.findByDate === 'function'
            ? events.findByDate(date)
            : null;

        return linkMarkup({
            modifier: '',
            icon: 'fas fa-calendar-day',
            title: match ? match.title : 'See this race day',
            detail: date.toLocaleDateString('en-AU', {
                weekday: 'short', day: 'numeric', month: 'long', year: 'numeric'
            }),
            dataset: `data-event-date="${escapeHtml(album.eventDate)}"`
        });
    }

    function replayLink(album) {
        if (!album.videoId) return '';

        const manager = window.WCMRCVideoManager;
        const video = manager && Array.isArray(manager.videoDatabase)
            ? manager.videoDatabase.find(item => item.id === album.videoId)
            : null;

        return linkMarkup({
            modifier: ' is-replay',
            icon: 'fas fa-circle-play',
            title: 'Watch the replay',
            detail: video ? video.title : 'Race day livestream',
            dataset: `data-video-id="${escapeHtml(album.videoId)}"`
        });
    }

    function renderHeader() {
        const links = eventLink(activeAlbum) + replayLink(activeAlbum);

        els.header.innerHTML = `
            <div class="gallery-album-header-text">
                <h3>${escapeHtml(activeAlbum.title)}</h3>
                <p>${escapeHtml(activeAlbum.description)}</p>
                ${links ? `<div class="gallery-album-links">${links}</div>` : ''}
            </div>
            <span class="gallery-album-count">
                <i class="fas fa-camera" aria-hidden="true"></i>
                ${activeAlbum.photos.length} photos
            </span>
        `;
    }

    function openEventDay(isoDate) {
        const events = window.WCMRCEvents;
        if (events && typeof events.focusDate === 'function' && events.focusDate(isoDate)) return;

        const section = document.getElementById('events');
        if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function openReplay(videoId) {
        const manager = window.WCMRCVideoManager;
        if (manager && typeof manager.openVideo === 'function') {
            manager.openVideo(videoId);
            return;
        }
        // The video system picks this up on load and opens the player itself.
        window.location.href = `?video=${encodeURIComponent(videoId)}#live-streams`;
    }

    function tileMarkup(photo, index) {
        const showAlbum = activeAlbum.id === COMBINED_ALBUM_ID;
        const label = photo.caption || `${photo.albumTitle}, photo ${index + 1}`;
        return `
            <button type="button"
                    class="gallery-item${index === 0 ? ' is-hero' : ''}"
                    data-index="${index}"
                    aria-label="${escapeHtml(label)} — open larger view">
                <img src="${photoPath(photo, 'thumbs')}" alt="${escapeHtml(label)}" loading="lazy" decoding="async" />
                <span class="gallery-item-zoom" aria-hidden="true"><i class="fas fa-expand"></i></span>
                <span class="gallery-item-overlay">
                    ${showAlbum ? `<span class="gallery-item-album">${escapeHtml(photo.albumTitle)}</span>` : ''}
                    ${photo.caption ? `<span class="gallery-item-caption">${escapeHtml(photo.caption)}</span>` : ''}
                </span>
            </button>
        `;
    }

    /** Appending keeps already-loaded tiles untouched when paging through an album. */
    function renderGrid({ append = false } = {}) {
        const start = append ? els.grid.children.length : 0;
        const markup = activeAlbum.photos
            .slice(start, visibleCount)
            .map((photo, offset) => tileMarkup(photo, start + offset))
            .join('');

        els.grid.classList.remove('is-message');
        if (append) {
            els.grid.insertAdjacentHTML('beforeend', markup);
        } else {
            els.grid.innerHTML = markup;
        }

        revealTiles(start);
        renderLoadMore();
    }

    function revealTiles(from) {
        const tiles = Array.from(els.grid.children).slice(from);
        if (reduceMotion) {
            tiles.forEach(tile => tile.classList.add('is-revealed'));
            return;
        }
        requestAnimationFrame(() => {
            tiles.forEach((tile, offset) => {
                setTimeout(() => tile.classList.add('is-revealed'), Math.min(offset * 45, 400));
            });
        });
    }

    function renderSkeletons(count = 8) {
        els.grid.classList.remove('is-message');
        els.grid.innerHTML = Array.from({ length: count }, (_, index) =>
            `<span class="gallery-skeleton${index === 0 ? ' is-hero' : ''}" aria-hidden="true"></span>`
        ).join('');
    }

    function renderLoadMore() {
        const remaining = activeAlbum.photos.length - visibleCount;
        if (remaining <= 0) {
            els.loadMore.innerHTML = '';
            return;
        }
        els.loadMore.innerHTML = `
            <button type="button" class="btn gallery-load-more-btn">
                Load ${Math.min(remaining, PAGE_SIZE)} more
                <span class="gallery-load-more-count">${remaining} left</span>
            </button>
            <button type="button" class="gallery-show-all">Show all ${activeAlbum.photos.length} photos</button>
        `;
    }

    function selectAlbum(albumId, { focusRail = false } = {}) {
        const album = albums.find(candidate => candidate.id === albumId);
        if (!album) return;

        activeAlbum = album;
        visibleCount = PAGE_SIZE;
        renderRail();
        renderHeader();
        renderGrid();
        renderFilmstrip();

        if (focusRail) {
            const selected = els.albums.querySelector('.gallery-album-card.is-selected');
            if (selected) selected.focus();
        }
    }

    function renderFilmstrip() {
        if (!els.filmstrip) return;
        els.filmstrip.innerHTML = activeAlbum.photos.map((photo, index) => `
            <button type="button" class="gallery-film-thumb" data-index="${index}" tabindex="-1"
                    aria-label="Show photo ${index + 1}">
                <img src="${photoPath(photo, 'thumbs')}" alt="" loading="lazy" decoding="async" />
            </button>
        `).join('');
    }

    function highlightFilmstrip() {
        if (!els.filmstrip) return;
        els.filmstrip.querySelectorAll('.gallery-film-thumb').forEach(thumb => {
            const isActive = Number(thumb.dataset.index) === lightboxIndex;
            thumb.classList.toggle('is-active', isActive);
            if (isActive) {
                thumb.scrollIntoView({
                    inline: 'center',
                    block: 'nearest',
                    behavior: reduceMotion ? 'auto' : 'smooth'
                });
            }
        });
    }

    function openLightbox(index) {
        lastFocused = document.activeElement;
        lightboxIndex = index;
        showPhoto();
        els.lightbox.classList.add('active');
        els.lightbox.setAttribute('aria-hidden', 'false');
        document.body.classList.add('gallery-lightbox-open');
        els.close.focus();
    }

    function closeLightbox() {
        els.lightbox.classList.remove('active');
        els.lightbox.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('gallery-lightbox-open');
        els.image.removeAttribute('src');
        if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
    }

    function showPhoto() {
        const photo = activeAlbum.photos[lightboxIndex];
        if (!photo) return;

        const done = () => els.figure.classList.remove('is-loading');
        els.figure.classList.add('is-loading');
        els.image.onload = done;
        els.image.onerror = done;
        els.image.src = photoPath(photo, 'full');
        els.image.alt = photo.caption || `${photo.albumTitle}, photo ${lightboxIndex + 1}`;

        els.albumLabel.textContent = photo.albumTitle;
        els.counter.textContent = `${lightboxIndex + 1} of ${activeAlbum.photos.length}`;
        els.caption.textContent = photo.caption;
        els.caption.hidden = !photo.caption;

        highlightFilmstrip();
        preloadNeighbours();
    }

    /** Warm the next and previous photo so arrow navigation feels instant. */
    function preloadNeighbours() {
        const total = activeAlbum.photos.length;
        if (total < 2) return;
        [-1, 1].forEach(offset => {
            const neighbour = activeAlbum.photos[(lightboxIndex + offset + total) % total];
            const warm = new Image();
            warm.src = photoPath(neighbour, 'full');
        });
    }

    function step(direction) {
        const total = activeAlbum.photos.length;
        lightboxIndex = (lightboxIndex + direction + total) % total;
        showPhoto();
    }

    function jumpTo(index) {
        lightboxIndex = index;
        showPhoto();
    }

    /** Keep Tab cycling inside the viewer while it is open. */
    function trapFocus(event) {
        const stops = els.lightbox.querySelectorAll('button:not([tabindex="-1"])');
        if (!stops.length) return;

        const first = stops[0];
        const last = stops[stops.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }

    function bindRailEvents() {
        els.albums.addEventListener('click', event => {
            const card = event.target.closest('.gallery-album-card');
            if (card) selectAlbum(card.dataset.albumId);
        });

        els.albums.addEventListener('keydown', event => {
            const current = albums.findIndex(album => album.id === activeAlbum.id);
            let target = null;

            if (event.key === 'ArrowRight') target = (current + 1) % albums.length;
            else if (event.key === 'ArrowLeft') target = (current - 1 + albums.length) % albums.length;
            else if (event.key === 'Home') target = 0;
            else if (event.key === 'End') target = albums.length - 1;
            else return;

            event.preventDefault();
            selectAlbum(albums[target].id, { focusRail: true });
        });
    }

    function bindHeaderEvents() {
        els.header.addEventListener('click', event => {
            const link = event.target.closest('.gallery-album-link');
            if (!link) return;

            if (link.dataset.videoId) openReplay(link.dataset.videoId);
            else if (link.dataset.eventDate) openEventDay(link.dataset.eventDate);
        });
    }

    function bindGridEvents() {
        els.grid.addEventListener('click', event => {
            const tile = event.target.closest('.gallery-item');
            if (tile) openLightbox(Number(tile.dataset.index));
        });

        els.loadMore.addEventListener('click', event => {
            if (event.target.closest('.gallery-load-more-btn')) {
                visibleCount += PAGE_SIZE;
            } else if (event.target.closest('.gallery-show-all')) {
                visibleCount = activeAlbum.photos.length;
            } else {
                return;
            }
            renderGrid({ append: true });
        });
    }

    function bindLightboxEvents() {
        els.close.addEventListener('click', closeLightbox);
        els.prev.addEventListener('click', () => step(-1));
        els.next.addEventListener('click', () => step(1));

        if (els.filmstrip) {
            els.filmstrip.addEventListener('click', event => {
                const thumb = event.target.closest('.gallery-film-thumb');
                if (thumb) jumpTo(Number(thumb.dataset.index));
            });
        }

        // Clicking empty space around the photo dismisses the viewer.
        els.lightbox.addEventListener('click', event => {
            const backdrop = ['gallery-lightbox', 'gallery-lightbox-stage', 'gallery-lightbox-figure']
                .some(name => event.target.classList.contains(name));
            if (backdrop) closeLightbox();
        });

        document.addEventListener('keydown', event => {
            if (!els.lightbox.classList.contains('active')) return;

            if (event.key === 'Tab') {
                trapFocus(event);
                return;
            }

            if (event.key === 'Escape') closeLightbox();
            else if (event.key === 'ArrowLeft') step(-1);
            else if (event.key === 'ArrowRight') step(1);
            else if (event.key === 'Home') jumpTo(0);
            else if (event.key === 'End') jumpTo(activeAlbum.photos.length - 1);
            else return;

            event.preventDefault();
        });

        els.lightbox.addEventListener('touchstart', event => {
            swipeEnabled = !event.target.closest('.gallery-lightbox-filmstrip');
            swipeStartX = event.changedTouches[0].screenX;
        }, { passive: true });

        els.lightbox.addEventListener('touchend', event => {
            if (!swipeEnabled) return;
            const distance = event.changedTouches[0].screenX - swipeStartX;
            if (Math.abs(distance) > SWIPE_THRESHOLD) step(distance > 0 ? -1 : 1);
        }, { passive: true });
    }

    function showFallback() {
        els.grid.classList.add('is-message');
        els.grid.innerHTML = '<p class="gallery-empty">Gallery photos are loading soon. Check back after the next race day!</p>';
        els.loadMore.innerHTML = '';
    }

    async function initializeGallery() {
        cacheElements();
        if (!els.grid || !els.albums || !els.lightbox) return;

        renderSkeletons();

        try {
            const response = await fetch(`${GALLERY_BASE}manifest.json`);
            if (!response.ok) throw new Error(`manifest responded ${response.status}`);

            const realAlbums = normalizeAlbums((await response.json()).albums);
            if (!realAlbums.length) throw new Error('manifest contains no photos');

            // With more than one album, the combined view leads and the rest filter it.
            albums = realAlbums.length > 1
                ? [buildCombinedAlbum(realAlbums), ...realAlbums]
                : realAlbums;
            activeAlbum = albums[0];

            renderRail();
            renderHeader();
            renderGrid();
            renderFilmstrip();
            bindRailEvents();
            bindHeaderEvents();
            bindGridEvents();
            bindLightboxEvents();

            window.WCMRCGallery = {
                get albums() { return albums; },
                get activeAlbum() { return activeAlbum; },
                selectAlbum,
                refresh: () => selectAlbum(activeAlbum.id)
            };
        } catch (error) {
            showFallback();
            console.warn('Gallery init failed:', error);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeGallery);
    } else {
        initializeGallery();
    }
})();

/* ============================================
   Resource Card Scroll Previews
   ============================================ */
(function () {
    'use strict';

    function initResourcePreviews() {
        const cards = document.querySelectorAll('.resource-card');
        if (!cards.length) return;

        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const canHover = window.matchMedia('(hover: hover)').matches;

        cards.forEach(card => {
            const preview = card.querySelector('.resource-preview');
            const video = card.querySelector('.resource-preview-media');
            const link = card.querySelector('.resource-details .btn');

            if (preview && link) {
                preview.addEventListener('click', () => link.click());
            }

            if (!video || !canHover || reduceMotion) return;

            let resetTimer;

            const start = () => {
                clearTimeout(resetTimer);
                video.preload = 'auto';
                const playback = video.play();
                if (playback) playback.catch(() => { });
            };

            // Let the video fade back to the poster before rewinding it
            const stop = () => {
                resetTimer = setTimeout(() => {
                    video.pause();
                    video.currentTime = 0;
                }, 500);
            };

            card.addEventListener('mouseenter', start);
            card.addEventListener('mouseleave', stop);
            card.addEventListener('focusin', start);
            card.addEventListener('focusout', stop);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initResourcePreviews);
    } else {
        initResourcePreviews();
    }
})();