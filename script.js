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

// Ultra-simplified cursor for maximum performance
const cursor = document.querySelector('.cursor');

// Remove existing circles if any
cursor.innerHTML = '';

// Create just one center circle and one outer circle (for hover effect only)
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

// Event Calendar Functionality
document.addEventListener('DOMContentLoaded', function() {
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

    // Current date tracking
    let currentDate = new Date();
    let currentMonth = currentDate.getMonth();
    let currentYear = currentDate.getFullYear();

    // Month navigation
    prevMonthBtn.addEventListener('click', () => {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        renderCalendar();
    });

    nextMonthBtn.addEventListener('click', () => {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        renderCalendar();
    });

    function renderCalendar() {
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
                    const eventTime = event.date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
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

    // This is the updated showEventsForDate function
    function showEventsForDate(date) {
        const dayEvents = eventData.filter(event => {
            const eventDate = new Date(event.date);
            return eventDate.getDate() === date.getDate() && 
                   eventDate.getMonth() === date.getMonth() && 
                   eventDate.getFullYear() === date.getFullYear();
        });
        
        const upcomingEventsListElement = document.getElementById('upcomingEventsList');
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

    // This is the updated showUpcomingEvents function
    function showUpcomingEvents() {
        const upcomingEventsListElement = document.getElementById('upcomingEventsList');
        if (!upcomingEventsListElement) {
            console.error('Could not find upcomingEventsList element');
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

    // Add this to your existing calendar day click handler
    function addDayClickHandlers() {
        const calendarDays = document.querySelectorAll('.calendar-day');
        calendarDays.forEach(day => {
            if (day.classList.contains('has-events')) {
                day.addEventListener('click', function() {
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
    renderCalendar();
});