// --------------------------
// Drone Race Futuristic Game
// --------------------------

// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const currentLapElem = document.getElementById('current-lap');
const totalLapsElem = document.getElementById('total-laps');
const timerElem = document.getElementById('timer');
const targetGateElem = document.getElementById('target-gate-indicator');
const lapTimesList = document.getElementById('lap-times-list');
const messageOverlay = document.getElementById('message-overlay');
const startScreen = document.getElementById('start-screen');
const pauseScreen = document.getElementById('pause-screen');
const startBtn = document.getElementById('start-btn');
const resumeBtn = document.getElementById('resume-btn');
const restartBtn = document.getElementById('restart-btn');

// Game settings
const TOTAL_LAPS = 3;
totalLapsElem.textContent = TOTAL_LAPS;
const GATE_SIZE = { width: 80, height: 10 };
const DRONE_SIZE = 20;

// Game variables
let gameRunning = false;
let gamePaused = false;
let currentLap = 1;
let lapTimes = [];
let lapStartTime = null;
let gameStartTime = null;
let animationFrameId = null;
let keysPressed = {};

// Audio (enhanced crisp beep)
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playBeep(duration = 0.1, frequency = 600, type = "sine") {
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  oscillator.frequency.value = frequency;
  oscillator.type = type;
  oscillator.start();
  gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + duration);
  oscillator.stop(audioCtx.currentTime + duration);
}

// Drone Class with a gradient effect and rounded corners
class Drone {
  constructor() {
    this.x = canvas.width / 2;
    this.y = canvas.height - 50;
    this.size = DRONE_SIZE;
    this.vx = 0;
    this.vy = 0;
    this.maxSpeed = 3;
    this.acceleration = 0.25;
    this.friction = 0.93;
    this.pulse = 0;
  }

  update() {
    if (keysPressed['w'] || keysPressed['arrowup']) this.vy -= this.acceleration;
    if (keysPressed['s'] || keysPressed['arrowdown']) this.vy += this.acceleration;
    if (keysPressed['a'] || keysPressed['arrowleft']) this.vx -= this.acceleration;
    if (keysPressed['d'] || keysPressed['arrowright']) this.vx += this.acceleration;
    
    // Apply friction and update position
    this.vx *= this.friction;
    this.vy *= this.friction;
    this.vx = Math.max(Math.min(this.vx, this.maxSpeed), -this.maxSpeed);
    this.vy = Math.max(Math.min(this.vy, this.maxSpeed), -this.maxSpeed);
    this.x += this.vx;
    this.y += this.vy;
    
    // Keep drone inside canvas bounds
    this.x = Math.max(0, Math.min(canvas.width - this.size, this.x));
    this.y = Math.max(0, Math.min(canvas.height - this.size, this.y));
    
    // Update pulse for visual effect (reset upon gate pass)
    this.pulse = Math.max(0, this.pulse - 0.05);
  }

  draw() {
    // Create a gradient for the drone fill
    let grad = ctx.createLinearGradient(this.x, this.y, this.x + this.size, this.y + this.size);
    grad.addColorStop(0, "#00bcd4");
    grad.addColorStop(1, "#ff4081");

    ctx.save();
    ctx.translate(this.x, this.y);
    // Apply pulse effect scale
    let scale = 1 + this.pulse;
    ctx.scale(scale, scale);
    ctx.fillStyle = grad;
    // Draw rounded rectangle
    roundRect(ctx, 0, 0, this.size, this.size, 4, true);
    ctx.restore();
  }
}

// Helper function: Draw rounded rectangle
function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

// Gate Class with neon glow effects
class Gate {
  constructor(x, y, order) {
    this.x = x;
    this.y = y;
    this.width = GATE_SIZE.width;
    this.height = GATE_SIZE.height;
    this.order = order;
    this.passed = false;
  }

  draw(isTarget) {
    ctx.save();
    // Apply glow effect if target
    if (isTarget) {
      ctx.shadowColor = "#ff4081";
      ctx.shadowBlur = 15;
    } else {
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
    }
    ctx.fillStyle = this.passed ? "#5cb85c" : "#f0ad4e";
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.restore();
  }
}

// Game Object
const Game = {
  drone: new Drone(),
  gates: [],
  currentGateIndex: 0,
  init() {
    // Setup gates in a zig-zag pattern
    this.gates = [];
    const gap = 100;
    for (let i = 0; i < 5; i++) {
      let x = 50 + i * gap;
      let y = i % 2 === 0 ? 120 : 320;
      this.gates.push(new Gate(x, y, i + 1));
    }
    this.currentGateIndex = 0;
    currentLap = 1;
    lapTimes = [];
    lapStartTime = performance.now();
    gameStartTime = lapStartTime;
    currentLapElem.textContent = currentLap;
    targetGateElem.textContent = this.gates[this.currentGateIndex].order;
    lapTimesList.innerHTML = "";
  },
  update() {
    this.drone.update();
    const targetGate = this.gates[this.currentGateIndex];
    if (this.collides(this.drone, targetGate)) {
      // Trigger pulse and play sound
      this.drone.pulse = 0.3;
      playBeep();
      targetGate.passed = true;
      this.currentGateIndex++;
      if (this.currentGateIndex >= this.gates.length) {
        const now = performance.now();
        const lapTime = now - lapStartTime;
        lapTimes.push(lapTime);
        this.displayLapTime(currentLap, lapTime);
        currentLap++;
        if (currentLap > TOTAL_LAPS) {
          this.endGame();
          return;
        } else {
          lapStartTime = now;
          this.gates.forEach(gate => gate.passed = false);
          this.currentGateIndex = 0;
        }
      }
      if (this.gates[this.currentGateIndex]) {
        targetGateElem.textContent = this.gates[this.currentGateIndex].order;
      }
    }
  },
  draw() {
    // Clear and draw background with a subtle gradient
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bgGrad.addColorStop(0, "#121212");
    bgGrad.addColorStop(1, "#1e1e1e");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw gates
    this.gates.forEach((gate, index) => {
      gate.draw(index === this.currentGateIndex);
    });
    // Draw drone
    this.drone.draw();
  },
  collides(drone, gate) {
    return (
      drone.x < gate.x + gate.width &&
      drone.x + drone.size > gate.x &&
      drone.y < gate.y + gate.height &&
      drone.y + drone.size > gate.y
    );
  },
  displayLapTime(lapNumber, timeMs) {
    const li = document.createElement("li");
    li.innerHTML = `<span class="lap-number">Lap ${lapNumber}:</span> ${formatTime(timeMs)}`;
    lapTimesList.appendChild(li);
  },
  endGame() {
    gameRunning = false;
    cancelAnimationFrame(animationFrameId);
    showMessage("Race Finished!", "Total Time: " + formatTime(performance.now() - gameStartTime));
    saveHighScore(performance.now() - gameStartTime);
  }
};

// Utility: Format time
function formatTime(ms) {
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(3);
  return `${minutes < 10 ? "0" : ""}${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
}

// Message overlay utility
function showMessage(text, subtext = "") {
  messageOverlay.innerHTML = text + (subtext ? `<br><span style="font-size:0.6em;">${subtext}</span>` : "");
  messageOverlay.classList.add("visible");
  setTimeout(() => {
    messageOverlay.classList.remove("visible");
  }, 2500);
}

// High Score via localStorage
function saveHighScore(time) {
  let best = localStorage.getItem("droneRaceBest");
  if (!best || time < best) {
    localStorage.setItem("droneRaceBest", time);
    alert("New High Score: " + formatTime(time));
  }
}

// Main Game Loop
function gameLoop() {
  if (!gamePaused && gameRunning) {
    Game.update();
    Game.draw();
    const now = performance.now();
    timerElem.textContent = formatTime(now - lapStartTime);
    animationFrameId = requestAnimationFrame(gameLoop);
  }
}

// Input Event Listeners
window.addEventListener("keydown", (e) => {
  keysPressed[e.key.toLowerCase()] = true;
  if (e.key === "Escape") {
    gameRunning && !gamePaused ? pauseGame() : resumeGame();
  }
});
window.addEventListener("keyup", (e) => {
  keysPressed[e.key.toLowerCase()] = false;
});

// Pause & Resume Functions
function pauseGame() {
  gamePaused = true;
  pauseScreen.classList.add("visible");
  cancelAnimationFrame(animationFrameId);
}

function resumeGame() {
  gamePaused = false;
  pauseScreen.classList.remove("visible");
  animationFrameId = requestAnimationFrame(gameLoop);
}

// Start/Restart Functions
function startGame() {
  startScreen.classList.remove("visible");
  pauseScreen.classList.remove("visible");
  gameRunning = true;
  gamePaused = false;
  Game.drone = new Drone(); // Reset drone
  Game.init();
  animationFrameId = requestAnimationFrame(gameLoop);
}

function restartGame() {
  cancelAnimationFrame(animationFrameId);
  gameRunning = false;
  startGame();
}

// Button Event Listeners
startBtn.addEventListener("click", startGame);
resumeBtn.addEventListener("click", resumeGame);
restartBtn.addEventListener("click", restartGame);
document.getElementById("settings-btn").addEventListener("click", () => {
  alert("Settings menu coming soon!");
});
