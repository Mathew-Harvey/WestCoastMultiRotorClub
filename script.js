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

    // Try to recover key animations if needed
    try {
        // Check if drone animation needs recovery
        const heroDrone = document.getElementById('heroDrone');
        if (heroDrone && heroDrone.style.transform.includes('NaN')) {
            // Reset drone position
            heroDrone.style.transform = 'translate(-50%, -50%)';
        }
    } catch (recoveryError) {
        // Silent recovery
    }

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

// Drone Animation Handler
document.addEventListener('DOMContentLoaded', function () {
    // Elements
    const heroLogoContainer = document.querySelector('.hero-logo-container');
    const heroDrone = document.getElementById('heroDrone');
    const heroLogoNoDrone = document.getElementById('heroLogoNoDrone');
    const heroLogoWithDrone = document.getElementById('heroLogoWithDrone');

    // Check if elements exist before trying to use them
    if (!heroLogoContainer || !heroDrone || !heroLogoNoDrone || !heroLogoWithDrone) {
        return;
    }

    // Initial setup
    heroDrone.style.opacity = '0'; // Hidden by default
    heroDrone.style.position = 'absolute';
    heroLogoNoDrone.style.opacity = '0'; // Initially hidden
    heroLogoWithDrone.style.opacity = '1'; // Initially visible

    // State variables
    let mouseX = 0;
    let mouseY = 0;
    let droneLeft = 0;
    let droneTop = 0;
    let homeLeft = 0;
    let homeTop = 0;
    let isChasing = false;
    let isOrbiting = false;
    let orbitAngle = 0;
    const orbitRadius = 150;
    const chaseSpeed = 0.1;
    const orbitSpeed = 0.05;
    let droneAngle = 0;
    let lastScrollTime = 0;
    let scrollThrottleDelay = 100; // ms

    // Throttle function to limit how often a function is called
    function throttle(callback, delay) {
        const now = Date.now();
        if (now - lastScrollTime >= delay) {
            lastScrollTime = now;
            callback();
        }
    }

    // Safe scroll handler with error protection
    function handleScroll() {
        try {
            if (!heroLogoContainer || !heroDrone || !heroLogoNoDrone || !heroLogoWithDrone) return;

            if (window.scrollY > 100 && !isChasing &&
                heroLogoWithDrone.style.opacity === '1' &&
                heroLogoContainer.getBoundingClientRect) {

                // Make the drone "fly out" by showing the version without drone
                heroLogoNoDrone.style.opacity = '1';
                heroLogoWithDrone.style.opacity = '0';
                heroDrone.style.opacity = '1';
                isChasing = true;

                // Set initial position - with safety checks
                try {
                    const parentRect = heroLogoContainer.getBoundingClientRect();
                    homeLeft = parentRect.width / 2;
                    homeTop = parentRect.height / 2;
                    droneLeft = homeLeft;
                    droneTop = homeTop;
                } catch (positionError) {
                    // Use default values if there's an error
                    homeLeft = homeTop = droneLeft = droneTop = 50;
                }
            }

            // Handle scroll indicator
            const scrollIndicator = document.querySelector('.scroll-indicator');
            if (scrollIndicator && window.scrollY > 100) {
                scrollIndicator.style.opacity = '0';
                setTimeout(() => {
                    if (scrollIndicator.style) {
                        scrollIndicator.style.display = 'none';
                    }
                }, 500);
            }
        } catch (err) {
            // Silent error handling
        }
    }

    // Set up throttled scroll handler
    window.addEventListener('scroll', function () {
        throttle(handleScroll, scrollThrottleDelay);
    }, { passive: true });

    // Track mouse position
    document.addEventListener('mousemove', (e) => {
        mouseX = e.pageX;
        mouseY = e.pageY;
    });

    // Initialize drone position at the center of the logo container
    function initDrone() {
        try {
            if (!heroLogoContainer) return;

            const parentRect = heroLogoContainer.getBoundingClientRect();
            homeLeft = parentRect.width / 2;
            homeTop = parentRect.height / 2;
            droneLeft = homeLeft;
            droneTop = homeTop;

            // Event listeners
            heroLogoContainer.addEventListener('mouseleave', () => {
                if (heroLogoWithDrone.style.opacity === '0') { // Only if drone is already released
                    isChasing = true;
                    isOrbiting = false;
                }
            });

            heroLogoContainer.addEventListener('click', () => {
                if (isOrbiting) {
                    isChasing = false;
                    isOrbiting = false;
                }
            });
        } catch (error) {
            // Silent error handling
        }
    }

    // Animation loop
    function animateDrone() {
        try {
            if (!heroLogoContainer || !heroDrone) {
                requestAnimationFrame(animateDrone);
                return;
            }

            // Get parent container's position for coordinate conversion
            // Wrap position calculations in try-catch to handle fast scrolling issues
            let parentRect;
            let parentLeft = 0;
            let parentTop = 0;

            try {
                parentRect = heroLogoContainer.getBoundingClientRect();
                if (parentRect) {
                    parentLeft = parentRect.left + window.scrollX;
                    parentTop = parentRect.top + window.scrollY;
                }
            } catch (rectError) {
                // Continue with default values
            }

            // Convert mouse position to parent coordinates
            const mouseLeft = mouseX - parentLeft;
            const mouseTop = mouseY - parentTop;

            if (isChasing) {
                const dx = mouseLeft - droneLeft;
                const dy = mouseTop - droneTop;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 15 && !isOrbiting) {
                    isOrbiting = true;
                    orbitAngle = Math.atan2(dy, dx);
                }

                if (isOrbiting) {
                    orbitAngle += orbitSpeed;
                    // Set position directly to eliminate offset
                    droneLeft = mouseLeft + Math.cos(orbitAngle) * orbitRadius;
                    droneTop = mouseTop + Math.sin(orbitAngle) * orbitRadius;
                    droneAngle = (orbitAngle + Math.PI / 2) * (180 / Math.PI);
                } else {
                    droneLeft += dx * chaseSpeed;
                    droneTop += dy * chaseSpeed;
                    droneAngle = Math.atan2(dy, dx) * (180 / Math.PI);
                }
            } else {
                // Return to home
                const dx = homeLeft - droneLeft;
                const dy = homeTop - droneTop;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < 1) {
                    droneLeft = homeLeft;
                    droneTop = homeTop;

                    // Restore original state when drone returns home
                    // Check if elements exist before accessing
                    if (heroDrone && heroDrone.style && heroLogoNoDrone && heroLogoWithDrone) {
                        heroDrone.style.opacity = '0';
                        heroLogoNoDrone.style.opacity = '0';
                        heroLogoWithDrone.style.opacity = '1';
                    }
                } else {
                    droneLeft += dx * 0.1;
                    droneTop += dy * 0.1;
                    droneAngle = Math.atan2(dy, dx) * (180 / Math.PI);
                }
            }

            // Apply position and rotation with error handling
            if (heroDrone && heroDrone.style) {
                // Apply position and rotation, with hover in transform
                const hover = Math.sin(Date.now() / 300) * 2;
                heroDrone.style.left = `${droneLeft}px`;
                heroDrone.style.top = `${droneTop}px`;
                heroDrone.style.transform = `translate(-50%, -50%) translateY(${hover}px) rotate(${droneAngle}deg)`;
            }
        } catch (error) {
            // Don't stop animation loop on error, just continue
        }

        // Continue animation regardless of errors - use setTimeout to limit
        // animation updates during fast scrolling on mobile devices
        if (window.navigator.userAgent.includes('Mobile')) {
            setTimeout(() => requestAnimationFrame(animateDrone), 16); // Limit to ~60fps on mobile
        } else {
            requestAnimationFrame(animateDrone);
        }
    }

    // Start the animation
    try {
        initDrone();
        requestAnimationFrame(animateDrone);
    } catch (error) {
        // Silent error handling
    }
});

// Ultra-simplified cursor for maximum performance
document.addEventListener('DOMContentLoaded', function () {
    const cursor = document.querySelector('.cursor');
    if (!cursor) return;

    // Remove existing circles if any
    cursor.innerHTML = '';

    // Create just one center circle
    const centerCircle = document.createElement('div');
    centerCircle.className = 'circle center-circle';
    cursor.appendChild(centerCircle);

    // Add option to disable custom cursor
    const cursorToggle = document.createElement('div');
    cursorToggle.className = 'cursor-toggle';
    cursorToggle.innerHTML = '<i class="fas fa-mouse-pointer"></i>';
    cursorToggle.title = "Toggle custom cursor";
    document.body.appendChild(cursorToggle);

    let cursorEnabled = true;

    cursorToggle.addEventListener('click', () => {
        cursorEnabled = !cursorEnabled;
        if (cursorEnabled) {
            document.body.style.cursor = 'none';
            cursor.style.display = 'block';
        } else {
            document.body.style.cursor = 'auto';
            cursor.style.display = 'none';
        }
        cursorToggle.classList.toggle('cursor-disabled');
    });

    if (window.matchMedia('(hover: hover)').matches) {
        document.body.style.cursor = 'none';

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

        // Interactive elements hover state - simplified
        const interactiveElements = document.querySelectorAll('a, button, .btn, input, textarea, select, .hamburger, .logo, .nav-links a, .theme-btn, .theme-toggle, .back-to-top');
        interactiveElements.forEach(el => {
            el.addEventListener('mouseenter', () => {
                if (cursorEnabled) centerCircle.classList.add('active');
            });

            el.addEventListener('mouseleave', () => {
                if (cursorEnabled) centerCircle.classList.remove('active');
            });
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
            title: "Global Drone Solutions Summer Series round 8",
            date: new Date(2025, 2, 23, 8, 0), // March 23, 2025
            link: "https://www.facebook.com/groups/westcoastmultirotorclub/events",
            image: "./assets/drone5.jpg"
        },
        {
            title: "Global Drone Solutions Summer Series Grand Final",
            date: new Date(2025, 3, 12, 8, 0), // April 12, 2025
            link: "https://www.facebook.com/groups/westcoastmultirotorclub/events",
            image: "./assets/drone6.jpg"
        },
        {
            title: "Global Drone Solutions Winter series round 1",
            date: new Date(2025, 4, 10, 8, 0), // May 10, 2025
            link: "https://www.facebook.com/groups/westcoastmultirotorclub/events",
            image: "./assets/drone5.jpg"
        },
        {
            title: "Global Drone Solutions Winter series round 2",
            date: new Date(2025, 4, 24, 8, 0), // May 24, 2025
            link: "https://www.facebook.com/groups/westcoastmultirotorclub/events",
            image: "./assets/drone6.jpg"
        },
        {
            title: "Global Drone Solutions Winter series round 3",
            date: new Date(2025, 5, 7, 8, 0), // June 7, 2025
            link: "https://www.facebook.com/groups/westcoastmultirotorclub/events",
            image: "./assets/drone5.jpg"
        },
        {
            title: "Global Drone Solutions Winter series round 4",
            date: new Date(2025, 5, 21, 8, 0), // June 21, 2025
            link: "https://www.facebook.com/groups/westcoastmultirotorclub/events",
            image: "./assets/drone6.jpg"
        },
        {
            title: "Global Drone Solutions Winter series round 5",
            date: new Date(2025, 6, 5, 8, 0), // July 5, 2025
            link: "https://www.facebook.com/groups/westcoastmultirotorclub/events",
            image: "./assets/drone5.jpg"
        },
        {
            title: "Global Drone Solutions Winter series round 6",
            date: new Date(2025, 6, 19, 8, 0), // July 19, 2025
            link: "https://www.facebook.com/groups/westcoastmultirotorclub/events",
            image: "./assets/drone6.jpg"
        },
        {
            title: "Global Drone Solutions Winter series round 7",
            date: new Date(2025, 7, 2, 8, 0), // August 2, 2025
            link: "https://www.facebook.com/groups/westcoastmultirotorclub/events",
            image: "./assets/drone5.jpg"
        },
        {
            title: "Global Drone Solutions Winter series round 8",
            date: new Date(2025, 7, 16, 8, 0), // August 16, 2025
            link: "https://www.facebook.com/groups/westcoastmultirotorclub/events",
            image: "./assets/drone6.jpg"
        },
        {
            title: "Global Drone Solutions Winter series Grand final",
            date: new Date(2025, 7, 30, 8, 0), // August 30, 2025
            link: "https://www.facebook.com/groups/westcoastmultirotorclub/events",
            image: "./assets/drone5.jpg"
        },
        {
            title: "Freestyle day",
            date: new Date(2025, 8, 13, 9, 0), // September 13, 2025
            link: "https://www.facebook.com/groups/westcoastmultirotorclub/events",
            image: "./assets/drone6.jpg"
        },
        {
            title: "Open day",
            date: new Date(2025, 9, 4, 9, 0), // October 4, 2025
            link: "https://www.facebook.com/groups/westcoastmultirotorclub/events",
            image: "./assets/drone5.jpg"
        },
        {
            title: "The Global Drone Solutions WA State Championships",
            date: new Date(2025, 9, 11, 9, 0), // October 11, 2025
            endDate: new Date(2025, 9, 12, 17, 0), // October 12, 2025
            link: "https://www.facebook.com/groups/westcoastmultirotorclub/events",
            image: "./assets/drone6.jpg"
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

            // Pause drone animation if active
            const heroDrone = document.getElementById('heroDrone');
            if (heroDrone && heroDrone.style) {
                heroDrone.style.animationPlayState = 'paused';
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

            // Resume drone animation if active
            const heroDrone = document.getElementById('heroDrone');
            if (heroDrone && heroDrone.style) {
                heroDrone.style.animationPlayState = 'running';
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

// Video Modal Functionality for Past Live Streams
document.addEventListener('DOMContentLoaded', function () {
    // Modal elements
    const videoModalOverlay = document.getElementById('videoModalOverlay');
    const videoModalContainer = document.getElementById('videoModalContainer');
    const videoModalTitle = document.getElementById('videoModalTitle');
    const videoModalDate = document.getElementById('videoModalDate');
    const videoModalIframe = document.getElementById('videoModalIframe');
    const videoModalClose = document.getElementById('videoModalClose');

    // Exit early if modal elements are not found
    if (!videoModalOverlay || !videoModalContainer || !videoModalIframe) {
        return;
    }

    // Video metadata mapping
    const videoMetadata = {

        'lm3tOaEIhWs': {
            title: 'Global Drone Solutions - 2025 Winter Grand Final',
            date: 'August 31, 2025'
        },

        'lF8Ly45rlJI': {
            title: 'Global Drone Solutions - 2025 Winter Round 8',
            date: 'August 16, 2025'
        },
        'dq6_mui1MwA': {
            title: 'Global Drone Solutions - 2025 Winter Round 6',
            date: 'July 19, 2025'
        },
        'M9kyPWRqRDo': {
            title: 'Global Drone Solutions - 2025 Winter Round 5',
            date: 'July 5, 2025'
        },
        'Z0TYGtJkNYc': {
            title: 'Global Drone Solutions - 2025 Winter Round 3',
            date: 'June 7, 2025'
        },
        'qbF6hs6pkcI': {
            title: 'Global Drone Solutions - 2025 Winter Round 2',
            date: 'May 24, 2025'
        },
        'q5riSjhoO6Y': {
            title: 'Global Drone Solutions - 2025 Winter Round 1',
            date: 'May 10, 2025'
        },
        'EQtrL84xII8': {
            title: 'Global Drone Solutions - 2024 Summer Grand Final',
            date: 'April 12, 2025'
        }
    };

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

            // Set YouTube embed URL with autoplay
            const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;
            if (videoModalIframe) videoModalIframe.src = embedUrl;

            // Reset modal position to center (remove any previous drag positioning)
            videoModalContainer.style.transform = '';
            videoModalContainer.style.left = '';
            videoModalContainer.style.top = '';
            videoModalContainer.style.position = '';

            // Show modal
            videoModalOverlay.classList.add('visible');

            // Pause any site animations temporarily
            pauseSiteAnimations();
        } catch (error) {
            console.error('Error opening video modal:', error);
        }
    }

    // Function to close video modal
    function closeVideoModal() {
        try {
            // Hide modal
            videoModalOverlay.classList.remove('visible');

            // Stop video by clearing iframe src
            if (videoModalIframe) {
                setTimeout(() => {
                    videoModalIframe.src = '';
                }, 400); // Wait for transition to complete
            }

            // Resume site animations
            resumeSiteAnimations();
        } catch (error) {
            console.error('Error closing video modal:', error);
        }
    }

    // Drag functionality
    function startDrag(e) {
        if (!videoModalContainer) return;

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
        // Remove the transform and set explicit left/top to prevent jumping
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

    // Event listeners for past stream items
    const pastStreamItems = document.querySelectorAll('.past-stream-item');
    pastStreamItems.forEach(item => {
        item.addEventListener('click', function() {
            const videoId = this.getAttribute('data-video-id');
            if (videoId) {
                openVideoModal(videoId);
            }
        });
    });

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

    // Keyboard event listener for ESC key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && videoModalOverlay && videoModalOverlay.classList.contains('visible')) {
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
});