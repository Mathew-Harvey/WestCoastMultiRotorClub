// Pilot Profiles Section Functionality

document.addEventListener('DOMContentLoaded', function () {
    // Get all pilot cards
    const pilotCards = document.querySelectorAll('.pilot-card');
    const carousel = document.querySelector('.pilot-carousel');

    // Toggle flip animation on click
    pilotCards.forEach(card => {
        card.addEventListener('click', function () {
            this.classList.toggle('flipped');
        });
    });

    // Pause animation when hovering over carousel
    carousel.addEventListener('mouseenter', function () {
        this.style.animationPlayState = 'paused';
    });

    // Resume animation when mouse leaves carousel
    carousel.addEventListener('mouseleave', function () {
        this.style.animationPlayState = 'running';

        // Also unflip all cards when mouse leaves carousel
        pilotCards.forEach(card => {
            card.classList.remove('flipped');
        });
    });

    // Advanced touch controls for mobile
    let startX;
    let isDragging = false;
    let initialOffset = 0;
    let currentTranslate = 0;

    carousel.addEventListener('touchstart', function (e) {
        startX = e.touches[0].clientX;
        isDragging = true;
        initialOffset = getCurrentTranslate();

        // Pause the animation while dragging
        carousel.style.animationPlayState = 'paused';
    });

    carousel.addEventListener('touchmove', function (e) {
        if (!isDragging) return;
        const currentX = e.touches[0].clientX;
        const diff = currentX - startX;
        currentTranslate = initialOffset + diff;
        carousel.style.transform = `translateX(${currentTranslate}px)`;
    });

    carousel.addEventListener('touchend', function () {
        isDragging = false;
        // Resume the animation after a brief pause
        setTimeout(() => {
            carousel.style.transform = '';
            carousel.style.animationPlayState = 'running';
        }, 1000);
    });

    // Helper function to get current translate value
    function getCurrentTranslate() {
        const style = window.getComputedStyle(carousel);
        const matrix = new WebKitCSSMatrix(style.transform);
        return matrix.m41;
    }

    // Add dynamic shine effect on mousemove
    pilotCards.forEach(card => {
        const shine = card.querySelector('.pilot-card-shine');

        card.addEventListener('mousemove', function (e) {
            if (card.classList.contains('flipped')) return;

            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Calculate positions as percentages
            const xPercent = x / rect.width * 100;
            const yPercent = y / rect.height * 100;

            // Set dynamic gradient position
            shine.style.opacity = '1';
            shine.style.background = `
          radial-gradient(
            circle at ${xPercent}% ${yPercent}%, 
            rgba(255, 255, 255, 0.3) 0%, 
            rgba(255, 255, 255, 0.1) 40%, 
            rgba(255, 255, 255, 0) 70%
          )
        `;
        });

        card.addEventListener('mouseleave', function () {
            shine.style.opacity = '0';
        });
    });

    // Dynamic card colors based on position in the carousel
    function updateCardColors() {
        const positions = ['PRO', 'TECH', 'ROOKIE', 'VETERAN', 'MICRO'];
        const colors = {
            'PRO': '#29a7df',
            'TECH': '#5d6b77',
            'ROOKIE': '#4caf50',
            'VETERAN': '#ff9800',
            'MICRO': '#e91e63'
        };

        const cyberpunkColors = {
            'PRO': '#ff00ff',
            'TECH': '#00ffff',
            'ROOKIE': '#ffff00',
            'VETERAN': '#ff8800',
            'MICRO': '#00ff88'
        };

        pilotCards.forEach(card => {
            const position = card.querySelector('.pilot-card-position').textContent;
            const banner = card.querySelector('.pilot-card-banner');
            const image = card.querySelector('.pilot-card-image');

            // Base theme
            if (position in colors) {
                image.style.borderBottomColor = colors[position];
                banner.style.background = `linear-gradient(135deg, ${colors[position]}80 0%, ${colors[position]}00 60%)`;

                // Special style for cyberpunk theme
                if (document.body.classList.contains('theme-cyberpunk')) {
                    image.style.borderBottomColor = cyberpunkColors[position];
                    image.style.boxShadow = `0 0 15px ${cyberpunkColors[position]}`;
                    banner.style.background = `linear-gradient(135deg, ${cyberpunkColors[position]}80 0%, ${cyberpunkColors[position]}00 60%)`;
                }
            }
        });
    }

    // Update colors on theme change
    const themeButtons = document.querySelectorAll('.theme-btn');
    themeButtons.forEach(button => {
        button.addEventListener('click', updateCardColors);
    });

    // Initial color update
    updateCardColors();
});


// Mobile Navigation Toggle
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');

hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    hamburger.querySelector('i').classList.toggle('fa-bars');
    hamburger.querySelector('i').classList.toggle('fa-times');
});

// Theme Switcher Toggle
const themeToggle = document.querySelector('.theme-toggle');
const themeSwitcher = document.getElementById('theme-switcher');

themeToggle.addEventListener('click', () => {
    themeSwitcher.classList.toggle('active');
});

// Theme Switcher
const themeButtons = document.querySelectorAll('.theme-btn');

themeButtons.forEach(button => {
    button.addEventListener('click', () => {
        const theme = button.dataset.theme;
        // Remove all theme classes
        document.body.classList.remove('theme-cyberpunk', 'theme-minimalist');
        // Add selected theme class if not default
        if (theme !== 'default') {
            document.body.classList.add(`theme-${theme}`);
        }
        // Update active button
        themeButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        // Close theme switcher
        themeSwitcher.classList.remove('active');
    });
});

// Drone Animation Handler - FIXED VERSION
document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const heroLogoContainer = document.querySelector('.hero-logo-container');
    const heroDrone = document.getElementById('heroDrone');
    const heroLogoNoDrone = document.getElementById('heroLogoNoDrone');
    const heroLogoWithDrone = document.getElementById('heroLogoWithDrone');

    // Check if elements exist before trying to use them
    if (!heroLogoContainer || !heroDrone || !heroLogoNoDrone || !heroLogoWithDrone) {
        console.warn('Hero section elements not found');
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

    // Release drone on scroll
    window.addEventListener('scroll', function() {
        if (window.scrollY > 100 && !isChasing && heroLogoWithDrone.style.opacity === '1') {
            // Make the drone "fly out" by showing the version without drone
            heroLogoNoDrone.style.opacity = '1';
            heroLogoWithDrone.style.opacity = '0';
            heroDrone.style.opacity = '1';
            isChasing = true;
            
            // Set initial position
            const parentRect = heroLogoContainer.getBoundingClientRect();
            homeLeft = parentRect.width / 2;
            homeTop = parentRect.height / 2;
            droneLeft = homeLeft;
            droneTop = homeTop;
        }
    });

    // Track mouse position
    document.addEventListener('mousemove', (e) => {
        mouseX = e.pageX;
        mouseY = e.pageY;
    });

    // Initialize drone position at the center of the logo container
    function initDrone() {
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
    }

    // Animation loop
    function animateDrone() {
        // Get parent container's position for coordinate conversion
        const parentRect = heroLogoContainer.getBoundingClientRect();
        const parentLeft = parentRect.left + window.scrollX;
        const parentTop = parentRect.top + window.scrollY;

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
                if (heroDrone.style.opacity !== '0') {
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

        // Apply position and rotation, with hover in transform
        const hover = Math.sin(Date.now() / 300) * 2;
        heroDrone.style.left = `${droneLeft}px`;
        heroDrone.style.top = `${droneTop}px`;
        heroDrone.style.transform = `translate(-50%, -50%) translateY(${hover}px) rotate(${droneAngle}deg)`;

        requestAnimationFrame(animateDrone);
    }

    // Start the animation
    initDrone();
    requestAnimationFrame(animateDrone);
    
    // Make sure scroll indicator disappears when drone is released
    window.addEventListener('scroll', function() {
        const scrollIndicator = document.querySelector('.scroll-indicator');
        if (scrollIndicator && window.scrollY > 100) {
            scrollIndicator.style.opacity = '0';
            setTimeout(() => {
                scrollIndicator.style.display = 'none';
            }, 500);
        }
    });
});

// Custom cursor with floating circles
const cursor = document.querySelector('.cursor');
const circles = [];
for (let i = 0; i < 5; i++) {
    const circle = document.createElement('div');
    circle.className = 'circle';
    if (i === 4) circle.classList.add('center-circle');
    cursor.appendChild(circle);
    circles.push(circle);
}

if (window.matchMedia('(hover: hover)').matches) {
    document.body.style.cursor = 'none';
    let isHovering = false;
    const hoverPositions = [
        { x: -8, y: -8 },
        { x: 8, y: -8 },
        { x: -8, y: 8 },
        { x: 8, y: 8 },
        { x: 0, y: 0 }
    ];
    const offsets = [
        { x: -5, y: -5, speed: 0.03 },
        { x: 5, y: -5, speed: 0.04 },
        { x: -5, y: 5, speed: 0.05 },
        { x: 5, y: 5, speed: 0.06 },
        { x: 0, y: 0, speed: 0.02 }
    ];
    document.addEventListener('mousemove', e => {
        cursor.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate3d(-50%, -50%, 0)`;
    });
    let time = 0;
    function updateCircles() {
        time += 0.01;
        circles.forEach((circle, i) => {
            if (isHovering) {
                const pos = hoverPositions[i];
                circle.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
                if (!circle.classList.contains('glow')) {
                    circle.classList.add('glow');
                }
            } else {
                const offset = offsets[i];
                const x = Math.sin(time * offset.speed * 10) * offset.x;
                const y = Math.cos(time * offset.speed * 10) * offset.y;
                circle.style.transform = `translate3d(${x}px, ${y}px, 0)`;
                if (circle.classList.contains('glow')) {
                    circle.classList.remove('glow');
                }
            }
        });
        requestAnimationFrame(updateCircles);
    }
    const interactiveElements = document.querySelectorAll('a, button, .btn, input, textarea, select, .hamburger, .logo, .nav-links a, .theme-btn, .theme-toggle, .back-to-top');
    interactiveElements.forEach(el => {
        el.addEventListener('mouseenter', () => {
            isHovering = true;
        });
        el.addEventListener('mouseleave', () => {
            isHovering = false;
        });
    });
    updateCircles();
}

// Smooth Scroll for Navigation Links - FIXED VERSION
document.addEventListener('DOMContentLoaded', function() {
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
            }
        });
    });
});

// Scroll Animation for fade-in elements
const fadeElements = document.querySelectorAll('.fade-in');
const fadeInOnScroll = () => {
    const triggerBottom = window.innerHeight * 0.85;
    fadeElements.forEach(element => {
        const elementTop = element.getBoundingClientRect().top;
        if (elementTop < triggerBottom) {
            element.classList.add('active');
        }
    });
};

// Back to top button
const backToTopButton = document.querySelector('.back-to-top');
const toggleBackToTopButton = () => {
    if (window.scrollY > 300) {
        backToTopButton.classList.add('active');
    } else {
        backToTopButton.classList.remove('active');
    }
};

backToTopButton.addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

window.addEventListener('scroll', fadeInOnScroll);
window.addEventListener('scroll', toggleBackToTopButton);
fadeInOnScroll();
toggleBackToTopButton();

// Initialize Facebook SDK with improved error handling - FIXED VERSION
function initFacebookSDK() {
    // Check if the script is already being loaded
    if (document.getElementById('facebook-jssdk')) {
        return;
    }
    
    // Load the Facebook SDK asynchronously
    (function(d, s, id) {
        var js, fjs = d.getElementsByTagName(s)[0];
        if (d.getElementById(id)) return;
        js = d.createElement(s); js.id = id;
        js.src = "https://connect.facebook.net/en_US/sdk.js";
        js.onerror = function() {
            console.error("Failed to load Facebook SDK");
            const loadingElement = document.getElementById('events-loading');
            if (loadingElement) loadingElement.style.display = 'none';
            loadFacebookEvents(); // This will use fallback events
        };
        fjs.parentNode.insertBefore(js, fjs);
    }(document, 'script', 'facebook-jssdk'));
    
    // Initialize the SDK once loaded
    window.fbAsyncInit = function() {
        try {
            FB.init({
                appId: '1001307304711772',
                xfbml: true,
                version: 'v18.0'
            });
            
            // After initialization, load events
            loadFacebookEvents();
        } catch (error) {
            console.error("Error initializing Facebook SDK:", error);
            loadFacebookEvents(); // This will use fallback events
        }
    };
}

// Load Facebook Events - FIXED VERSION
function loadFacebookEvents() {
    // Make sure our containers exist
    const loadingElement = document.getElementById('events-loading');
    const eventsContainer = document.getElementById('events-container');
    const errorElement = document.getElementById('events-error');

    // If elements don't exist, don't proceed
    if (!loadingElement || !eventsContainer || !errorElement) {
        console.error("Required DOM elements for Facebook events not found");
        return;
    }

    // Try to fetch events with a page access token
    const attemptFacebookFetch = () => {
        // First check if FB is loaded
        if (typeof FB === 'undefined') {
            console.warn("Facebook SDK not yet loaded");
            showFallbackEvents();
            return;
        }

        FB.api(
            '/657768627690432/events',
            'GET',
            {
                fields: "name,start_time,end_time,description,cover", 
                limit: "3",
                access_token: '1001307304711772|' + 'EAABZC' // This is just a public app ID marker
            },
            function(response) {
                // Hide loading indicator
                loadingElement.style.display = 'none';

                if (response && !response.error && response.data && response.data.length > 0) {
                    displayEvents(response.data);
                } else {
                    console.error("Facebook events error:", response ? response.error : "No response");
                    showFallbackEvents();
                }
            }
        );
    };

    // Display events in the container
    const displayEvents = (events) => {
        // Display events container
        eventsContainer.style.display = 'grid';
        
        // Clear previous content
        eventsContainer.innerHTML = '';
        
        // Process each event
        events.forEach(function(event) {
            // Format dates
            const startDate = new Date(event.start_time);
            const formattedDate = startDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long', 
                day: 'numeric'
            });
            
            // Create event card HTML
            const eventCard = document.createElement('div');
            eventCard.className = 'event-card fade-in';
            
            // Set card content
            eventCard.innerHTML = `
                <div class="event-img" style="background-image: url('${event.cover ? event.cover.source : './assets/default-event.jpg'}')">
                    <!-- Image from Facebook -->
                </div>
                <div class="event-details">
                    <span class="event-date">${formattedDate}</span>
                    <h3>${event.name}</h3>
                    <p>${event.description ? event.description.substring(0, 120) + '...' : 'No description available.'}</p>
                    <a href="https://www.facebook.com/events/${event.id}" target="_blank" class="btn">
                        <i class="fab fa-facebook"></i> View Event
                    </a>
                </div>
            `;
            
            // Add card to container
            eventsContainer.appendChild(eventCard);
        });
    };

    // Show hard-coded fallback events when API fails
    const showFallbackEvents = () => {
        // Create some fallback events with upcoming dates
        const today = new Date();
        const fallbackEvents = [
            {
                id: "facebook-event-placeholder-1",
                name: "Monthly Race Day",
                start_time: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 10).toISOString(),
                description: "Join us for our monthly race competition! All skill levels welcome. Registration starts at 9 AM.",
                cover: { source: './assets/drone5.jpg' }
            },
            {
                id: "facebook-event-placeholder-2",
                name: "Beginner Drone Workshop",
                start_time: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 17).toISOString(),
                description: "Learn the basics of drone flying in our hands-on workshop. Perfect for newcomers to the hobby!",
                cover: { source: './assets/drone6.jpg' }
            },
            {
                id: "facebook-event-placeholder-3",
                name: "FPV Night Racing",
                start_time: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 24).toISOString(),
                description: "Experience the thrill of night racing with LED-equipped drones! Spectators welcome.",
                cover: { source: './assets/champaign.jpg' }
            }
        ];
        
        // Display the fallback events
        displayEvents(fallbackEvents);
        
        // Add a note that these are placeholder events
        const disclaimerElement = document.createElement('div');
        disclaimerElement.className = 'events-disclaimer';
        disclaimerElement.innerHTML = `
            <p>* Preview events shown. Visit our <a href="https://www.facebook.com/groups/657768627690432/events" 
            target="_blank">Facebook page</a> for the latest official events.</p>
        `;
        eventsContainer.appendChild(disclaimerElement);
    };
    
    // Try to get events from Facebook, with fallback for failures
    try {
        // Set a timeout in case the Facebook API takes too long
        const timeoutId = setTimeout(() => {
            console.warn("Facebook events request timed out");
            loadingElement.style.display = 'none';
            showFallbackEvents();
        }, 5000);
        
        // Attempt to get events
        attemptFacebookFetch();
        
        // Clear the timeout if we get a response
        clearTimeout(timeoutId);
    } catch (error) {
        console.error("Error fetching Facebook events:", error);
        loadingElement.style.display = 'none';
        showFallbackEvents();
    }
}

// Start the process when the document is ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Facebook SDK which will in turn load events
    initFacebookSDK();
});

// Sponsors Carousel Initialization
document.addEventListener('DOMContentLoaded', function() {
    const sponsorsCarousel = document.querySelector('.sponsors-carousel');
    
    if (sponsorsCarousel) {
      // Get all original sponsor items (non-clones)
      const sponsorItems = Array.from(sponsorsCarousel.querySelectorAll('.sponsor-item:not(.clone)'));
      
      // Clear existing clones
      const existingClones = sponsorsCarousel.querySelectorAll('.sponsor-item.clone');
      existingClones.forEach(clone => clone.remove());
      
      // Create clones for seamless looping
      sponsorItems.forEach(item => {
        const clone = item.cloneNode(true);
        clone.classList.add('clone');
        sponsorsCarousel.appendChild(clone);
      });
      
      // Calculate animation duration based on number of sponsors
      const scrollDuration = Math.max(30, sponsorItems.length * 5); // Min 30s, 5s per sponsor
      sponsorsCarousel.style.animationDuration = `${scrollDuration}s`;
      
      // Adjust the animation end position based on the content width
      const totalWidth = sponsorItems.reduce((width, item) => {
        const itemWidth = item.offsetWidth;
        const itemStyle = window.getComputedStyle(item);
        const itemMargin = parseInt(itemStyle.marginLeft) + parseInt(itemStyle.marginRight);
        return width + itemWidth + itemMargin;
      }, 0);
      
      // Update the keyframes for the animation
      document.styleSheets[0].insertRule(
        `@keyframes sponsorsScroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-${totalWidth}px); }
        }`,
        document.styleSheets[0].cssRules.length
      );
    }
    
    // Add hover effect to sponsor tier logos
    const sponsorTierLogos = document.querySelectorAll('.sponsor-tier-logo');
    sponsorTierLogos.forEach(logo => {
      logo.addEventListener('mouseenter', function() {
        const img = this.querySelector('img');
        if (img) {
          img.style.filter = 'grayscale(0%)';
          img.style.opacity = '1';
        }
      });
      
      logo.addEventListener('mouseleave', function() {
        const img = this.querySelector('img');
        if (img) {
          img.style.filter = 'grayscale(100%)';
          img.style.opacity = '0.8';
        }
      });
    });
  });