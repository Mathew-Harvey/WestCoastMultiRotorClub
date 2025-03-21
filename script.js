
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

// Drone Animation Handler

// Complete Drone Animation Fix - Replace all drone code

document.addEventListener('DOMContentLoaded', function () {
    // Elements
    const heroLogoContainer = document.querySelector('.hero-logo-container');
    const heroDrone = document.getElementById('heroDrone');

    // Initial setup
    heroDrone.style.opacity = '0'; // Hidden by default
    heroDrone.style.position = 'absolute';

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
            isChasing = true;
            isOrbiting = false;
            heroDrone.style.opacity = '1';
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
                heroDrone.style.opacity = '0';
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

// Smooth Scroll for Navigation Links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        if (navLinks.classList.contains('active')) {
            navLinks.classList.remove('active');
            hamburger.querySelector('i').classList.toggle('fa-bars');
            hamburger.querySelector('i').classList.toggle('fa-times');
        }
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            window.scrollTo({
                top: target.offsetTop - 80,
                behavior: 'smooth'
            });
        }
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


// Load the Facebook SDK
(function(d, s, id) {
    var js, fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) return;
    js = d.createElement(s); js.id = id;
    js.src = "https://connect.facebook.net/en_US/sdk.js";
    fjs.parentNode.insertBefore(js, fjs);
  }(document, 'script', 'facebook-jssdk'));
  
  // Initialize the SDK once loaded
  window.fbAsyncInit = function() {
    FB.init({
      appId: '1001307304711772', // Replace with your actual App ID
      xfbml: true,
      version: 'v18.0'
    });
    
    // After initialization, load events
    loadFacebookEvents();
  };
// Function to load events from Facebook
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

    // Get an access token through Facebook Login
    FB.getLoginStatus(function(response) {
        if (response.status === 'connected') {
            // User is logged in and has authorized your app
            getEvents(response.authResponse.accessToken);
        } else {
            // Prompt user to login and authorize
            FB.login(function(loginResponse) {
                if (loginResponse.authResponse) {
                    getEvents(loginResponse.authResponse.accessToken);
                } else {
                    // User cancelled login or did not authorize
                    errorElement.style.display = 'block';
                    loadingElement.style.display = 'none';
                    console.error("User cancelled login or did not authorize app");
                }
            }, {scope: 'public_profile'});
        }
    });
    
    function getEvents(accessToken) {
        // Request events with the access token
        FB.api(
            '/657768627690432/events',
            'GET',
            { 
                "access_token": accessToken,
                "fields": "name,start_time,end_time,description,cover", 
                "limit": "3" 
            },
            function(response) {
                // Hide loading indicator
                loadingElement.style.display = 'none';

                if (response && !response.error && response.data && response.data.length > 0) {
                    // Display events container
                    eventsContainer.style.display = 'grid';
                    
                    // Clear previous content
                    eventsContainer.innerHTML = '';
                    
                    // Process each event
                    response.data.forEach(function(event) {
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
                } else {
                    // Show error message
                    errorElement.style.display = 'block';
                    console.error("Facebook events error:", response ? response.error : "No response");
                }
            }
        );
    }
}