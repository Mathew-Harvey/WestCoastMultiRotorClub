import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as CANNON from 'cannon-es';

const DRONE_MODEL_URL = './assets/models/drone.gltf';
const TRACK_MODEL_URL = './assets/models/scene.gltf';

// Physics constants adjusted for realistic quadcopter behavior
const PHYSICS_TIMESTEP = 1 / 120; // Higher frequency for more accurate simulation
const GRAVITY = -9.81;

// Drone physical properties
const DRONE_MASS = 0.5; // kg - typical FPV drone weight
const DRONE_SIZE = { x: 0.25, y: 0.08, z: 0.25 }; // meters
const DRAG_COEFFICIENT = 0.3; // Air resistance coefficient
const MOMENT_OF_INERTIA = { // Moment of inertia for each axis
    x: 0.01, // kg*m² - pitch
    y: 0.012, // kg*m² - yaw
    z: 0.01  // kg*m² - roll
};

// Quadcopter rotor configuration
const ROTOR_CONFIG = {
    // Positions relative to center of mass (clockwise from front-right)
    positions: [
        new CANNON.Vec3(DRONE_SIZE.x/2, 0, DRONE_SIZE.z/2),  // Front-right
        new CANNON.Vec3(-DRONE_SIZE.x/2, 0, DRONE_SIZE.z/2), // Front-left
        new CANNON.Vec3(-DRONE_SIZE.x/2, 0, -DRONE_SIZE.z/2), // Rear-left
        new CANNON.Vec3(DRONE_SIZE.x/2, 0, -DRONE_SIZE.z/2)   // Rear-right
    ],
    // Direction of rotation (1 for CCW, -1 for CW)
    directions: [1, -1, 1, -1], // Standard quadcopter layout
    // Physical properties
    maxThrust: 5.0, // Maximum thrust per rotor in Newtons
    thrustCoefficient: 1.5e-5, // Coefficient relating (rotation speed)² to thrust
    torqueCoefficient: 0.05, // Coefficient relating thrust to torque
    maxRotationSpeed: 1200, // Maximum rotation speed in rad/s
    // Response dynamics
    responseTime: 0.05 // Motor response time in seconds
};

// Control parameters
const CONTROL_PARAMS = {
    maxRollRate: 6.0, // rad/s
    maxPitchRate: 6.0, // rad/s
    maxYawRate: 3.5, // rad/s
    pitchExpo: 0.7, // Exponential curve for pitch control (higher = more sensitive near center)
    rollExpo: 0.7, // Exponential curve for roll control
    yawExpo: 0.5, // Exponential curve for yaw control
    throttleExpo: 0.3 // Exponential curve for throttle control
};

let scene, camera, renderer, clock, gltfLoader;
let world, droneBody, trackBody, droneMaterial, trackMaterial;
let droneMesh, trackMesh;

// Variables for flight dynamics
let rotors = [
    { speed: 0, targetSpeed: 0, thrust: 0, torque: 0 },
    { speed: 0, targetSpeed: 0, thrust: 0, torque: 0 },
    { speed: 0, targetSpeed: 0, thrust: 0, torque: 0 },
    { speed: 0, targetSpeed: 0, thrust: 0, torque: 0 }
];
let currentThrottle = 0;

// Control inputs (-1 to 1 range)
let controlInputs = {
    throttle: 0,
    pitch: 0,
    roll: 0,
    yaw: 0
};

// UI state tracking
let keysPressed = {};
let mouseDelta = { x: 0, y: 0 };
let isPointerLocked = false;

// Race tracking
let startTime = null;
let raceActive = false;
let raceFinished = false;
let finishLinePosition = new THREE.Vector3(0, 1, -50);
let finishLineSize = new THREE.Vector3(20, 10, 2);

// Debug visualization
let debugLines = [];
let showDebug = false;

// Helper function to apply an exponential curve to control inputs
// This provides finer control near the center position
function applyExpo(input, expo) {
    return input * (Math.pow(Math.abs(input), expo) * (1 - expo) + expo);
}

function init() {
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.FogExp2(0x87CEEB, 0.005);
    
    // Camera setup
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    // Renderer setup
    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gameCanvas'), antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    
    // Utilities
    clock = new THREE.Clock();
    gltfLoader = new GLTFLoader();
    
    // Display control instructions
    const instructionsEl = document.getElementById('instructions');
    if (instructionsEl) {
        instructionsEl.innerHTML = `
            <h2>FPV Drone Racing Controls:</h2>
            <p><strong>W/S</strong> - Throttle up/down</p>
            <p><strong>A/D</strong> - Yaw left/right</p>
            <p><strong>Up/Down</strong> or <strong>I/K</strong> - Pitch forward/backward</p>
            <p><strong>Left/Right</strong> or <strong>J/L</strong> - Roll left/right</p>
            <p>Click to start flying!</p>
        `;
    }
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(10, 20, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    scene.add(directionalLight);
    
    // Physics world setup
    world = new CANNON.World({
        gravity: new CANNON.Vec3(0, GRAVITY, 0)
    });
    world.broadphase = new CANNON.SAPBroadphase(world);
    world.allowSleep = true;
    
    // Materials
    droneMaterial = new CANNON.Material('droneMaterial');
    trackMaterial = new CANNON.Material('trackMaterial');
    
    const droneTrackContactMaterial = new CANNON.ContactMaterial(
        droneMaterial,
        trackMaterial,
        {
            friction: 0.1,
            restitution: 0.3,
        }
    );
    world.addContactMaterial(droneTrackContactMaterial);
    
    // Load models and setup game
    loadAssets();
    setupControls();
    
    // Event listeners
    window.addEventListener('resize', onWindowResize);
    
    // Start animation loop
    animate();
}

function loadAssets() {
    let assetsLoaded = 0;
    const totalAssets = 2;

    const checkAllAssetsLoaded = () => {
        assetsLoaded++;
        if (assetsLoaded === totalAssets) {
            console.log("All assets loaded");
            setupGameElements();
            document.getElementById('instructions').style.display = 'block';
        }
    };

    // Load drone model
    gltfLoader.load(DRONE_MODEL_URL, (gltf) => {
        console.log("Drone loaded");
        droneMesh = gltf.scene;
        droneMesh.scale.set(0.5, 0.5, 0.5);
        droneMesh.traverse((node) => {
            if (node.isMesh) {
                node.castShadow = true;
            }
        });

        // Create a more accurate physics shape - a compound shape with box body and spheres at rotor positions
        const bodyShape = new CANNON.Box(new CANNON.Vec3(DRONE_SIZE.x, DRONE_SIZE.y, DRONE_SIZE.z));
        
        droneBody = new CANNON.Body({
            mass: DRONE_MASS,
            material: droneMaterial,
            angularDamping: 0.2, // Lower damping for more realistic inertia
            linearDamping: 0.05  // Lower damping for better momentum preservation
        });
        
        // Add the main body shape
        droneBody.addShape(bodyShape);
        
        // Set custom inertia for more accurate rotation behavior
        droneBody.updateMassProperties();
        droneBody.invInertia.x = 1 / MOMENT_OF_INERTIA.x;
        droneBody.invInertia.y = 1 / MOMENT_OF_INERTIA.y;
        droneBody.invInertia.z = 1 / MOMENT_OF_INERTIA.z;
        
        // Initial position
        droneBody.position.set(0, 5, 0);
        droneBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), Math.PI);
        
        // Add collision events
        droneBody.addEventListener("collide", handleCollision);

        world.addBody(droneBody);
        scene.add(droneMesh);

        // Add camera as child of drone mesh
        droneMesh.add(camera);
        
        // Position camera for FPV view with slight offset for better visibility
        camera.position.set(0, 0.15, 0);
        camera.rotation.set(0, Math.PI, 0);

        // Create debug visualizations for rotors
        if (showDebug) {
            createRotorVisualizations();
        }

        checkAllAssetsLoaded();

    }, undefined, (error) => {
        console.error('Error loading drone model:', error);
        alert('Failed to load drone model. See console for details.');
        checkAllAssetsLoaded();
    });

    // Create track with gates (same as original code)
    console.log("Creating track with gates");
    
    // Ground plane physics
    const groundShape = new CANNON.Plane();
    trackBody = new CANNON.Body({ 
        mass: 0, 
        material: trackMaterial
    });
    trackBody.addShape(groundShape);
    trackBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    world.addBody(trackBody);
    
    // Ground plane visual
    const floorGeometry = new THREE.PlaneGeometry(200, 200);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x228B22,
        roughness: 0.8,
        metalness: 0.1
    });
    const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);
    
    // Create gates
    const createGate = (position, rotation = 0) => {
        const gateFrameGeometry = new THREE.TorusGeometry(5, 0.5, 16, 32);
        const gateMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xFFA500,
            roughness: 0.5,
            metalness: 0.3
        });
        const gate = new THREE.Mesh(gateFrameGeometry, gateMaterial);
        gate.position.set(position.x, position.y, position.z);
        gate.rotation.y = rotation;
        gate.castShadow = true;
        scene.add(gate);
        
        // Gate physics trigger
        const gateShape = new CANNON.Sphere(0.1);
        const gateBody = new CANNON.Body({
            mass: 0,
            isTrigger: true,
            position: new CANNON.Vec3(position.x, position.y, position.z)
        });
        gateBody.addShape(gateShape);
        gateBody.collisionResponse = false;
        gateBody.userData = { isGate: true, gateId: position.x + "-" + position.z };
        world.addBody(gateBody);
        
        return { mesh: gate, body: gateBody };
    };
    
    // Course layout
    const gates = [
        createGate(new THREE.Vector3(0, 5, -20), 0),
        createGate(new THREE.Vector3(15, 7, -40), Math.PI/4),
        createGate(new THREE.Vector3(-15, 9, -60), -Math.PI/4),
        createGate(new THREE.Vector3(0, 11, -80), 0),
        createGate(new THREE.Vector3(20, 8, -100), Math.PI/3),
        createGate(new THREE.Vector3(-10, 6, -120), -Math.PI/6),
        createGate(new THREE.Vector3(0, 5, -140), 0)
    ];
    
    // Finish line
    finishLinePosition = new THREE.Vector3(0, 5, -160);
    
    const finishLineGeometry = new THREE.BoxGeometry(20, 10, 1);
    const finishLineMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xFF0000,
        emissive: 0x550000,
    });
    const finishLineMesh = new THREE.Mesh(finishLineGeometry, finishLineMaterial);
    finishLineMesh.position.copy(finishLinePosition);
    scene.add(finishLineMesh);
    
    // Add decorative trees
    for (let i = 0; i < 30; i++) {
        const treeHeight = 5 + Math.random() * 8;
        const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.7, treeHeight, 8);
        const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        
        const topGeometry = new THREE.ConeGeometry(3, 7, 8);
        const topMaterial = new THREE.MeshStandardMaterial({ color: 0x006400 });
        const top = new THREE.Mesh(topGeometry, topMaterial);
        top.position.y = treeHeight / 2 + 2;
        
        const tree = new THREE.Group();
        tree.add(trunk);
        tree.add(top);
        
        const side = Math.random() > 0.5 ? 1 : -1;
        const distance = 25 + Math.random() * 50;
        const zPos = -20 - Math.random() * 140;
        
        tree.position.set(side * distance, 0, zPos);
        tree.castShadow = true;
        scene.add(tree);
    }
    
    // Try to load track model
    try {
        gltfLoader.load(TRACK_MODEL_URL, 
            (gltf) => {
                console.log("Track visuals loaded successfully");
                trackMesh = gltf.scene;
                trackMesh.traverse((node) => {
                    if (node.isMesh) {
                        node.receiveShadow = true;
                    }
                });
                scene.add(trackMesh);
            },
            undefined,
            (error) => {
                console.log("Track model load failed, using fallback track only:", error);
            }
        );
    } catch (e) {
        console.error("Exception during track load:", e);
    }
    
    checkAllAssetsLoaded();
}

function setupGameElements() {
    startTime = null;
    raceActive = false;
    raceFinished = false;
    document.getElementById('timer').innerText = 'Time: 0.00s';
    document.getElementById('instructions').innerText = 'Get Ready! Fly through the finish line!';
    
    // Add telemetry display
    const telemetryDiv = document.createElement('div');
    telemetryDiv.id = 'telemetry';
    telemetryDiv.style.position = 'absolute';
    telemetryDiv.style.bottom = '10px';
    telemetryDiv.style.right = '10px';
    telemetryDiv.style.background = 'rgba(0,0,0,0.5)';
    telemetryDiv.style.color = 'white';
    telemetryDiv.style.padding = '10px';
    telemetryDiv.style.fontFamily = 'monospace';
    telemetryDiv.style.display = 'none'; // Hidden by default
    document.body.appendChild(telemetryDiv);
    
    // Add debug toggle button
    const debugButton = document.createElement('button');
    debugButton.innerText = 'Toggle Debug';
    debugButton.style.position = 'absolute';
    debugButton.style.top = '10px';
    debugButton.style.right = '10px';
    debugButton.addEventListener('click', () => {
        showDebug = !showDebug;
        telemetryDiv.style.display = showDebug ? 'block' : 'none';
        if (showDebug && debugLines.length === 0) {
            createRotorVisualizations();
        }
        for (const line of debugLines) {
            line.visible = showDebug;
        }
    });
    document.body.appendChild(debugButton);
}

function createRotorVisualizations() {
    if (!droneMesh) return;
    
    // Clear existing visualizations
    for (const line of debugLines) {
        scene.remove(line);
    }
    debugLines = [];
    
    // Create a visualization for each rotor
    const rotorColors = [0xFF0000, 0x00FF00, 0x0000FF, 0xFFFF00];
    
    for (let i = 0; i < 4; i++) {
        const material = new THREE.LineBasicMaterial({ color: rotorColors[i] });
        const geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0.5, 0) // Initial height proportional to zero thrust
        ]);
        
        const line = new THREE.Line(geometry, material);
        
        // Convert rotor position from physics (Cannon) to rendering (Three.js) space
        const pos = ROTOR_CONFIG.positions[i];
        line.position.set(pos.x, pos.y, pos.z);
        
        droneMesh.add(line);
        debugLines.push(line);
        line.visible = showDebug;
    }
}

function updateRotorVisualizations() {
    if (!showDebug || debugLines.length !== 4) return;
    
    for (let i = 0; i < 4; i++) {
        const line = debugLines[i];
        const thrust = rotors[i].thrust;
        const thrustVisualization = Math.sqrt(thrust / ROTOR_CONFIG.maxThrust) * 2.0; // Non-linear scaling for better visualization
        
        // Update the height of the line to represent thrust
        const geometry = line.geometry;
        const positions = geometry.attributes.position.array;
        positions[4] = thrustVisualization; // y-coordinate of the second point
        geometry.attributes.position.needsUpdate = true;
    }
}

function updateTelemetry() {
    if (!showDebug || !droneBody) return;
    
    const telemetryDiv = document.getElementById('telemetry');
    if (!telemetryDiv) return;
    
    const velocity = droneBody.velocity;
    const angularVelocity = droneBody.angularVelocity;
    const speed = velocity.length();
    
    telemetryDiv.innerHTML = `
        <div>Throttle: ${(currentThrottle * 100).toFixed(1)}%</div>
        <div>Speed: ${speed.toFixed(2)} m/s</div>
        <div>Altitude: ${droneBody.position.y.toFixed(2)} m</div>
        <div>Rotor Speeds:</div>
        <div>FR: ${(rotors[0].speed / ROTOR_CONFIG.maxRotationSpeed * 100).toFixed(1)}%</div>
        <div>FL: ${(rotors[1].speed / ROTOR_CONFIG.maxRotationSpeed * 100).toFixed(1)}%</div>
        <div>RL: ${(rotors[2].speed / ROTOR_CONFIG.maxRotationSpeed * 100).toFixed(1)}%</div>
        <div>RR: ${(rotors[3].speed / ROTOR_CONFIG.maxRotationSpeed * 100).toFixed(1)}%</div>
        <div>Rotation Rates:</div>
        <div>Pitch: ${(angularVelocity.x).toFixed(2)} rad/s</div>
        <div>Yaw: ${(angularVelocity.y).toFixed(2)} rad/s</div>
        <div>Roll: ${(angularVelocity.z).toFixed(2)} rad/s</div>
    `;
}

function setupControls() {
    document.addEventListener('keydown', (event) => {
        const key = event.key.toLowerCase();
        keysPressed[key] = true;
        
        // Handle arrow keys
        if (event.key === 'ArrowUp') keysPressed['arrowup'] = true;
        if (event.key === 'ArrowDown') keysPressed['arrowdown'] = true;
        if (event.key === 'ArrowLeft') keysPressed['arrowleft'] = true;
        if (event.key === 'ArrowRight') keysPressed['arrowright'] = true;
    });
    
    document.addEventListener('keyup', (event) => {
        const key = event.key.toLowerCase();
        keysPressed[key] = false;
        
        // Handle arrow keys
        if (event.key === 'ArrowUp') keysPressed['arrowup'] = false;
        if (event.key === 'ArrowDown') keysPressed['arrowdown'] = false;
        if (event.key === 'ArrowLeft') keysPressed['arrowleft'] = false;
        if (event.key === 'ArrowRight') keysPressed['arrowright'] = false;
    });

    document.addEventListener('click', () => {
        if (!isPointerLocked) {
            renderer.domElement.requestPointerLock();
        }
    });

    document.addEventListener('pointerlockchange', () => {
        isPointerLocked = document.pointerLockElement === renderer.domElement;
        if(isPointerLocked) {
            document.getElementById('info').style.display = 'none';
        } else {
            document.getElementById('info').style.display = 'block';
            // Reset inputs when focus is lost
            keysPressed = {};
            controlInputs = { throttle: 0, pitch: 0, roll: 0, yaw: 0 };
        }
    });
    
    // Mouse movement for additional control if needed
    document.addEventListener('mousemove', (event) => {
        if (isPointerLocked) {
            mouseDelta.x += event.movementX || 0;
            mouseDelta.y += event.movementY || 0;
        }
    });
}

function handleControls(deltaTime) {
    // Default inputs (no input = neutral)
    let throttleInput = 0;
    let pitchInput = 0;
    let rollInput = 0;
    let yawInput = 0;
    
    // Throttle control with gradual adjustment
    if (keysPressed['w']) throttleInput += 1.5 * deltaTime;
    if (keysPressed['s']) throttleInput -= 1.5 * deltaTime;
    
    // Calculate new throttle but clamp between 0 and 1
    currentThrottle = Math.max(0, Math.min(1, currentThrottle + throttleInput));
    
    // Rotation rate inputs (pitch, roll, yaw)
    // Front/back
    if (keysPressed['arrowup'] || keysPressed['i']) pitchInput = -1.0;  // Pitch forward
    if (keysPressed['arrowdown'] || keysPressed['k']) pitchInput = 1.0;  // Pitch backward
    
    // Left/right
    if (keysPressed['arrowleft'] || keysPressed['j']) rollInput = -1.0;  // Roll left
    if (keysPressed['arrowright'] || keysPressed['l']) rollInput = 1.0;  // Roll right
    
    // Yaw control
    if (keysPressed['a']) yawInput = 1.0;  // Yaw left
    if (keysPressed['d']) yawInput = -1.0;  // Yaw right
    
    // Apply exponential curves for better control precision
    pitchInput = applyExpo(pitchInput, CONTROL_PARAMS.pitchExpo);
    rollInput = applyExpo(rollInput, CONTROL_PARAMS.rollExpo);
    yawInput = applyExpo(yawInput, CONTROL_PARAMS.yawExpo);
    
    // Store the final normalized control inputs (-1 to 1 range)
    controlInputs.throttle = currentThrottle;
    controlInputs.pitch = pitchInput;
    controlInputs.roll = rollInput;
    controlInputs.yaw = yawInput;
}

function updateRotorTargets() {
    // Safety check
    if (!controlInputs) return;
    
    // Extract control inputs
    const { throttle, pitch, roll, yaw } = controlInputs;
    
    // Calculate base thrust from throttle
    const baseSpeed = throttle * ROTOR_CONFIG.maxRotationSpeed;
    
    // Calculate speed differentials based on desired rotation rates
    // For a standard X quadcopter configuration
    const pitchDiff = pitch * CONTROL_PARAMS.maxPitchRate * ROTOR_CONFIG.maxRotationSpeed * 0.2;
    const rollDiff = roll * CONTROL_PARAMS.maxRollRate * ROTOR_CONFIG.maxRotationSpeed * 0.2;
    const yawDiff = yaw * CONTROL_PARAMS.maxYawRate * ROTOR_CONFIG.maxRotationSpeed * 0.1;
    
    // Set target speeds for each rotor
    // In standard configuration, the motors are indexed in this order:
    // 0: Front Right (CW), 1: Front Left (CCW), 2: Rear Left (CW), 3: Rear Right (CCW)
    
    // Calculate target speeds with differential adjustments
    rotors[0].targetSpeed = baseSpeed - pitchDiff + rollDiff + yawDiff * ROTOR_CONFIG.directions[0];
    rotors[1].targetSpeed = baseSpeed - pitchDiff - rollDiff + yawDiff * ROTOR_CONFIG.directions[1];
    rotors[2].targetSpeed = baseSpeed + pitchDiff - rollDiff + yawDiff * ROTOR_CONFIG.directions[2];
    rotors[3].targetSpeed = baseSpeed + pitchDiff + rollDiff + yawDiff * ROTOR_CONFIG.directions[3];
    
    // Ensure targets are within limits (0 to maxRotationSpeed)
    for (let i = 0; i < 4; i++) {
        rotors[i].targetSpeed = Math.max(0, Math.min(ROTOR_CONFIG.maxRotationSpeed, rotors[i].targetSpeed));
    }
}

function updateRotorSpeeds(deltaTime) {
    // Motor response dynamics simulation
    for (let i = 0; i < 4; i++) {
        // First-order response dynamics (motors don't respond instantly)
        const responseRate = 1.0 / ROTOR_CONFIG.responseTime;
        const speedDifference = rotors[i].targetSpeed - rotors[i].speed;
        
        // Update speed based on response rate and time step
        rotors[i].speed += speedDifference * Math.min(deltaTime * responseRate, 1.0);
        
        // Calculate thrust from rotation speed (force is proportional to square of rotation speed)
        rotors[i].thrust = ROTOR_CONFIG.thrustCoefficient * Math.pow(rotors[i].speed, 2);
        
        // Calculate torque (proportional to thrust)
        rotors[i].torque = ROTOR_CONFIG.torqueCoefficient * rotors[i].thrust * ROTOR_CONFIG.directions[i];
    }
}

function applyRotorForcesAndTorques() {
    if (!droneBody) return;
    
    // Reset forces and torques (they accumulate each step in Cannon.js)
    droneBody.force.set(0, 0, 0);
    droneBody.torque.set(0, 0, 0);
    
    // Calculate weight (mass * gravity)
    const weight = new CANNON.Vec3(0, GRAVITY * droneBody.mass, 0);
    droneBody.force.copy(weight);
    
    // Calculate aerodynamic drag force 
    // F_drag = -k_drag * v * |v|
    const velocity = droneBody.velocity;
    const velocityMag = velocity.length();
    if (velocityMag > 0) {
        const dragForce = new CANNON.Vec3();
        velocity.scale(-DRAG_COEFFICIENT * velocityMag / droneBody.mass, dragForce);
        droneBody.force.vadd(dragForce, droneBody.force);
    }
    
    // Apply angular drag (dampens rotation)
    const angularVelocity = droneBody.angularVelocity;
    const angularDrag = new CANNON.Vec3();
    angularVelocity.scale(-0.1 * angularVelocity.length(), angularDrag);
    droneBody.torque.vadd(angularDrag, droneBody.torque);
    
    // Apply forces and torques from each rotor
    let totalThrust = 0;
    
    for (let i = 0; i < 4; i++) {
        const rotor = rotors[i];
        const position = ROTOR_CONFIG.positions[i];
        totalThrust += rotor.thrust;
        
        // Thrust force direction is always along local Y-axis in drone's reference frame
        const thrustVector = new CANNON.Vec3(0, rotor.thrust, 0);
        const worldThrustVector = droneBody.quaternion.vmult(thrustVector);
        
        // Add thrust force
        droneBody.force.vadd(worldThrustVector, droneBody.force);
        
        // Calculate torque due to thrust offset from center of mass
        const relativePosition = new CANNON.Vec3().copy(position);
        const thrustTorque = new CANNON.Vec3();
        relativePosition.cross(worldThrustVector, thrustTorque);
        droneBody.torque.vadd(thrustTorque, droneBody.torque);
        
        // Add reactive torque from motor rotation (around Y axis in local frame)
        const rotorTorqueVector = new CANNON.Vec3(0, rotor.torque, 0);
        const worldRotorTorqueVector = droneBody.quaternion.vmult(rotorTorqueVector);
        droneBody.torque.vadd(worldRotorTorqueVector, droneBody.torque);
    }
}

function handleCollision(event) {
    if (!droneBody || raceFinished) return;
    
    // Add a small impulse in the opposite direction of collision
    const impactVelocity = event.contact.getImpactVelocityAlongNormal();
    
    // Only respond to significant collisions
    if (Math.abs(impactVelocity) > 1) {
        // Add some rotational "kick" to simulate realistic collision response
        const randomTorque = new CANNON.Vec3(
            (Math.random() - 0.5) * 0.5,
            (Math.random() - 0.5) * 0.5,
            (Math.random() - 0.5) * 0.5
        );
        droneBody.angularVelocity.vadd(randomTorque, droneBody.angularVelocity);
        
        // Provide feedback about collision
        if (Math.abs(impactVelocity) > 5) {
            // Hard collision
            console.log("Hard collision detected!");
            // Optional: add screen shake or other visual feedback
        }
    }
}

function update(deltaTime) {
    if (!droneBody || !droneMesh) return;
    
    // Process user inputs
    handleControls(deltaTime);
    
    // Update motor targets based on control inputs
    updateRotorTargets();
    
    // Update rotor speeds and calculate resulting thrusts and torques
    updateRotorSpeeds(deltaTime);
    
    // Apply forces and torques to the drone's physics body
    applyRotorForcesAndTorques();
    
    // Step the physics simulation
    world.step(PHYSICS_TIMESTEP, deltaTime);
    
    // Sync the visual mesh with the physics body
    droneMesh.position.copy(droneBody.position);
    droneMesh.quaternion.copy(droneBody.quaternion);
    
    // Update debug visualizations and telemetry
    updateRotorVisualizations();
    updateTelemetry();
    
    // Game logic
    updateTimer();
    checkFinishLine();
}

function updateTimer() {
    const timerElement = document.getElementById('timer');
    if (raceActive && !raceFinished) {
        const elapsedTime = clock.getElapsedTime() - startTime;
        timerElement.innerText = `Time: ${elapsedTime.toFixed(2)}s`;
    } else if (raceFinished) {
        const finalTime = clock.getElapsedTime() - startTime;
        timerElement.innerText = `Finished! Time: ${finalTime.toFixed(2)}s`;
    } else {
        const speed = droneBody.velocity.length();
        if (speed > 0.5 && startTime === null) {
            console.log("Race Started!");
            startTime = clock.getElapsedTime();
            raceActive = true;
            document.getElementById('instructions').innerText = 'Go Go Go!';
        }
    }
}

function checkFinishLine() {
    if (!droneBody) return;

    const dronePos = droneBody.position;
    const finishMin = new THREE.Vector3().copy(finishLinePosition).sub(finishLineSize.clone().multiplyScalar(0.5));
    const finishMax = new THREE.Vector3().copy(finishLinePosition).add(finishLineSize.clone().multiplyScalar(0.5));

    // Check if drone crosses finish line
    if (dronePos.x > finishMin.x && dronePos.x < finishMax.x &&
        dronePos.y > finishMin.y && dronePos.y < finishMax.y &&
        dronePos.z > finishMin.z && dronePos.z < finishMax.z)
    {
        if (raceActive && !raceFinished) {
            console.log("Crossed Finish Line!");
            raceFinished = true;
            raceActive = false;
            
            // Display finish message and time
            const finalTime = clock.getElapsedTime() - startTime;
            document.getElementById('instructions').innerHTML = `
                <h2>You Finished!</h2>
                <p>Time: ${finalTime.toFixed(2)}s</p>
                <p>Reload the page to play again.</p>
            `;
            
            // Visual effect
            scene.background = new THREE.Color(0xFFD700); // Gold flash
            setTimeout(() => {
                scene.background = new THREE.Color(0x87CEEB); // Back to blue
            }, 500);
        }
    }
    
    // Start race when movement detected
    if (!raceActive && !raceFinished && droneBody) {
        const speed = droneBody.velocity.length();
        if (speed > 0.5 && startTime === null) {
            console.log("Race Started!");
            startTime = clock.getElapsedTime();
            raceActive = true;
            document.getElementById('timer').style.display = 'block';
            document.getElementById('instructions').innerHTML = `<h2>Go! Go! Go!</h2>`;
        }
    }
}

function animate() {
    requestAnimationFrame(animate);
    const deltaTime = Math.min(clock.getDelta(), 0.1); // Cap delta time to avoid physics issues
    update(deltaTime);
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Initialize everything
init();