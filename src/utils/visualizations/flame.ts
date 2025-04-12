import { VisualizerSettings } from '@/hooks/useAudioVisualization';

interface Particle {
  x: number;
  y: number;
  radius: number;
  color: string;
  velocity: {
    x: number;
    y: number;
  };
  alpha: number;
  life: number;
  maxLife: number;
  turbulence: number; // Added for flame wobble effect
  audio: number; // Added to store audio influence
}

// Pool of particles for reuse - Reset this when settings change
let particles: Particle[] = [];
const maxParticles = 400; // Reduced for better performance and less chaos

// Audio history for flame response - Reset this when settings change
let audioHistory: number[] = Array(10).fill(0);
let lastAudioPeak = 0;
let lastSettings: string = ''; // Track settings changes
let lastTimestamp = 0; // Used to normalize particle movement across encoding/preview

// Consistent animation timing
let startTime = 0;
let hasInitialized = false;

export const drawFireAnimation = (
  ctx: CanvasRenderingContext2D,
  dataArray: Uint8Array,
  canvas: HTMLCanvasElement,
  bufferLength: number,
  timestamp: number,
  settings: VisualizerSettings
) => {
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  
  // Initialize on first render
  if (!hasInitialized) {
    startTime = timestamp;
    hasInitialized = true;
    particles = [];
    audioHistory = Array(10).fill(0);
    lastAudioPeak = 0;
  }
  
  // Calculate animation time for consistency
  const animTime = timestamp - startTime;
  
  // Create a settings signature to detect changes
  const currentSettings = `${settings.sensitivity}|${settings.smoothing}|${settings.color}|${canvasWidth}`;
  
  // Reset particle system on settings change or canvas size change to avoid speed issues
  if (currentSettings !== lastSettings) {
    particles = [];
    audioHistory = Array(10).fill(0);
    lastAudioPeak = 0;
    lastSettings = currentSettings;
    // Don't return/skip frames - that breaks the animation
  }
  
  // Calculate audio intensity with focus on bass frequencies
  let bassIntensity = 0;
  let midIntensity = 0;
  const bassRange = Math.min(bufferLength / 4, 32); // First quarter are bass frequencies
  
  // Calculate bass frequencies (better for flame height)
  for (let i = 0; i < bassRange; i++) {
    bassIntensity += dataArray[i] / 255.0;
  }
  bassIntensity /= bassRange;
  
  // Calculate mid frequencies (better for flame width and turbulence)
  for (let i = Math.floor(bassRange); i < Math.min(bufferLength / 2, 64); i++) {
    midIntensity += dataArray[i] / 255.0;
  }
  midIntensity /= Math.min(bufferLength / 2, 64) - bassRange;
  
  // Update audio history
  audioHistory.shift();
  audioHistory.push(bassIntensity);
  
  // Check for audio peaks
  const currentAvg = audioHistory.reduce((sum, val) => sum + val, 0) / audioHistory.length;
  const isPeak = bassIntensity > currentAvg * 1.5 && animTime - lastAudioPeak > 300;
  
  if (isPeak) {
    lastAudioPeak = animTime;
  }
  
  // Apply sensitivity setting properly - scale between 0.5-3x for natural feel
  const sensitivity = Math.max(0.5, Math.min(3, settings.sensitivity));
  const intensity = bassIntensity * sensitivity;
  const midReactivity = midIntensity * sensitivity;
  
  // More reliable way to detect if we're in encoding mode
  const isEncoding = canvas.width >= 1280;
  
  // Use consistent background clearing for both preview and encoding
  // Adjust opacity based on encoding vs preview
  const clearOpacity = isEncoding ? 0.18 : 0.15; 
  ctx.fillStyle = `rgba(0, 0, 0, ${clearOpacity})`;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  
  // ** KEY CHANGE: Draw both the base and particles in the same pass for the encoded version **
  if (isEncoding) {
    drawIntegratedFire(ctx, canvasWidth, canvasHeight, dataArray, bufferLength, animTime, 
                       intensity, midReactivity, settings, isPeak);
  } else {
    // For preview, use the original approach which works well
    
    // Create a base number of particles per frame
    const baseParticles = 6; 
    const particlesToCreate = Math.floor(baseParticles + intensity * 15);
    
    // Draw flame base first
    drawFlameBase(ctx, canvasWidth, canvasHeight, intensity, midReactivity, animTime, settings, false);
    
    // Set blend mode for particles
    ctx.globalCompositeOperation = 'lighter';
    
    for (let i = 0; i < particlesToCreate; i++) {
      createFireParticle(canvasWidth, canvasHeight, intensity, midReactivity, settings, false);
    }
    
    // Add a burst on audio peaks
    if (isPeak) {
      const burstAmount = Math.floor(12 + 18 * intensity);
      for (let i = 0; i < burstAmount; i++) {
        createFireBurst(canvasWidth, canvasHeight, intensity, settings, false);
      }
    }
    
    // Update and draw particles with fixed timestep for consistency
    updateAndDrawParticles(ctx, canvasWidth, canvasHeight, intensity, animTime);
    
    // Reset blend mode
    ctx.globalCompositeOperation = 'source-over';
  }
  
  // Store timestamp for next frame
  lastTimestamp = timestamp;
};

// New function to handle integrated fire rendering for encoding
function drawIntegratedFire(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  dataArray: Uint8Array,
  bufferLength: number,
  timestamp: number,
  intensity: number,
  midReactivity: number,
  settings: VisualizerSettings,
  isPeak: boolean
) {
  const baseColor = hexToRgb(settings.color) || { r: 255, g: 120, b: 50 };
  
  // Use lighter blend mode for vibrant look
  ctx.globalCompositeOperation = 'lighter';
  
  // Draw flame base using same function as preview for consistency
  drawFlameBase(ctx, canvasWidth, canvasHeight, intensity, midReactivity, timestamp, settings, true);
  
  // Create more particles in encoding mode to ensure good coverage at higher rise
  const baseParticles = 10; 
  const particlesToCreate = Math.floor(baseParticles + intensity * 18);
  
  for (let i = 0; i < particlesToCreate; i++) {
    createFireParticle(canvasWidth, canvasHeight, intensity, midReactivity, settings, true);
  }
  
  // Add more bursts on audio peaks for encoding
  if (isPeak) {
    const burstAmount = Math.floor(20 + 25 * intensity);
    for (let i = 0; i < burstAmount; i++) {
      createFireBurst(canvasWidth, canvasHeight, intensity, settings, true);
    }
  }
  
  // Update and draw particles
  updateAndDrawParticles(ctx, canvasWidth, canvasHeight, intensity, timestamp);
  
  // Match preview by not adding the embers to encoded output
}

// Draw the main outer flame shape
function drawMainFlame(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  baseColor: { r: number, g: number, b: number },
  timestamp: number,
  intensity: number,
  midReactivity: number
) {
  // Flame dimensions
  const flameWidth = canvasWidth * 0.65 * (0.6 + midReactivity * 0.6);
  const flameHeight = canvasHeight * 0.45 * (0.6 + intensity * 0.8);
  
  // Main flame gradient
  const gradient = ctx.createRadialGradient(
    canvasWidth / 2,
    canvasHeight,
    0,
    canvasWidth / 2,
    canvasHeight - flameHeight * 0.3,
    flameHeight
  );
  
  gradient.addColorStop(0, `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, 0.95)`);
  gradient.addColorStop(0.5, `rgba(${baseColor.r * 0.8}, ${baseColor.g * 0.4}, ${baseColor.b * 0.1}, 0.6)`);
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  
  // Flame wobble
  const wobble = Math.sin(timestamp / 300) * 20 * midReactivity;
  
  // Draw main flame shape
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(canvasWidth / 2 - flameWidth / 2, canvasHeight);
  ctx.bezierCurveTo(
    canvasWidth / 2 - flameWidth / 2 + wobble, canvasHeight - flameHeight * 0.3,
    canvasWidth / 2 - flameWidth * 0.3 - wobble, canvasHeight - flameHeight * 0.7,
    canvasWidth / 2 - flameWidth * 0.1 + wobble * 0.5, canvasHeight - flameHeight
  );
  ctx.bezierCurveTo(
    canvasWidth / 2, canvasHeight - flameHeight - 20 * intensity,
    canvasWidth / 2, canvasHeight - flameHeight - 20 * intensity,
    canvasWidth / 2 + flameWidth * 0.1 - wobble * 0.5, canvasHeight - flameHeight
  );
  ctx.bezierCurveTo(
    canvasWidth / 2 + flameWidth * 0.3 + wobble, canvasHeight - flameHeight * 0.7,
    canvasWidth / 2 + flameWidth / 2 - wobble, canvasHeight - flameHeight * 0.3,
    canvasWidth / 2 + flameWidth / 2, canvasHeight
  );
  ctx.closePath();
  ctx.fill();
}

// Draw the inner brighter flame core
function drawInnerFlame(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number, 
  canvasHeight: number,
  baseColor: { r: number, g: number, b: number },
  timestamp: number,
  intensity: number,
  midReactivity: number
) {
  // Inner flame is narrower and taller
  const flameWidth = canvasWidth * 0.3 * (0.6 + midReactivity * 0.5);
  const flameHeight = canvasHeight * 0.55 * (0.5 + intensity * 0.9);
  
  // Brighter inner gradient
  const gradient = ctx.createRadialGradient(
    canvasWidth / 2,
    canvasHeight,
    0,
    canvasWidth / 2,
    canvasHeight - flameHeight * 0.4,
    flameHeight * 0.7
  );
  
  gradient.addColorStop(0, `rgba(255, 255, ${baseColor.b * 0.7}, 0.95)`);
  gradient.addColorStop(0.5, `rgba(${baseColor.r}, ${baseColor.g * 0.7}, ${baseColor.b * 0.2}, 0.7)`);
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  
  // Opposing wobble for interesting movement
  const wobble = Math.sin(timestamp / 200 + 1) * 15 * midReactivity;
  
  // Draw inner flame
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(canvasWidth / 2 - flameWidth / 2, canvasHeight);
  ctx.bezierCurveTo(
    canvasWidth / 2 - flameWidth / 2 - wobble, canvasHeight - flameHeight * 0.3,
    canvasWidth / 2 - flameWidth * 0.3 + wobble, canvasHeight - flameHeight * 0.7,
    canvasWidth / 2 - flameWidth * 0.1 - wobble * 0.3, canvasHeight - flameHeight
  );
  ctx.bezierCurveTo(
    canvasWidth / 2, canvasHeight - flameHeight - 15 * intensity,
    canvasWidth / 2, canvasHeight - flameHeight - 15 * intensity,
    canvasWidth / 2 + flameWidth * 0.1 + wobble * 0.3, canvasHeight - flameHeight
  );
  ctx.bezierCurveTo(
    canvasWidth / 2 + flameWidth * 0.3 - wobble, canvasHeight - flameHeight * 0.7,
    canvasWidth / 2 + flameWidth / 2 + wobble, canvasHeight - flameHeight * 0.3,
    canvasWidth / 2 + flameWidth / 2, canvasHeight
  );
  ctx.closePath();
  ctx.fill();
}

// Draw a central glow at the base
function drawCentralGlow(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  baseColor: { r: number, g: number, b: number },
  intensity: number
) {
  // Create a radial gradient for the central glow
  const gradient = ctx.createRadialGradient(
    canvasWidth / 2,
    canvasHeight,
    0,
    canvasWidth / 2,
    canvasHeight,
    canvasWidth * 0.3 * (0.6 + intensity * 0.7)
  );
  
  // Brighter center with color adjustments
  gradient.addColorStop(0, `rgba(255, 255, ${Math.min(200, baseColor.b * 2)}, 0.7)`);
  gradient.addColorStop(0.3, `rgba(${baseColor.r}, ${baseColor.g * 0.6}, ${baseColor.b * 0.2}, 0.3)`);
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  
  // Draw the glow circle
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(
    canvasWidth / 2, 
    canvasHeight + canvasHeight * 0.1, 
    canvasWidth * 0.3 * (0.6 + intensity * 0.7),
    0, 
    Math.PI * 2
  );
  ctx.fill();
}

// Draw ember particles floating up from the flame
function drawEmbers(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  baseColor: { r: number, g: number, b: number },
  timestamp: number,
  intensity: number,
  midReactivity: number
) {
  // Ember settings
  const emberCount = Math.floor(5 + intensity * 30);
  const emberSize = Math.max(1, canvasWidth / 600);
  
  // Only show embers when there's enough audio intensity
  if (intensity < 0.2) return;
  
  // Create random embers
  for (let i = 0; i < emberCount; i++) {
    // Ember position - more concentrated in flame area
    const xOffset = (Math.random() - 0.5) * canvasWidth * 0.6 * (0.5 + midReactivity * 0.7);
    const yBase = canvasHeight - Math.random() * canvasHeight * 0.6 * (0.5 + intensity * 0.8);
    
    // Ember movement - drifting and rising
    const wobbleX = Math.sin((timestamp / 1000) + i) * 5;
    const emberX = canvasWidth / 2 + xOffset + wobbleX;
    const emberY = yBase - (timestamp % 10000) * (0.01 + Math.random() * 0.03);
    
    // Only draw if in viewport
    if (emberY > 0 && emberY < canvasHeight) {
      // Ember color and opacity based on position
      const emberOpacity = 0.3 + Math.random() * 0.7;
      const emberHue = Math.random() > 0.7 ? 'rgb(255, 255, 180)' : `rgba(${baseColor.r}, ${baseColor.g * 0.5}, 0, ${emberOpacity})`;
      
      // Draw ember
      ctx.fillStyle = emberHue;
      ctx.beginPath();
      ctx.arc(emberX, emberY, emberSize + Math.random() * emberSize * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// Updates and draws all active particles
function updateAndDrawParticles(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  intensity: number,
  timestamp: number
) {
  // Process each particle
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    
    // Update particle life
    p.life -= 1;
    
    // Remove dead particles
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }
    
    // Calculate life ratio for fading
    const lifeRatio = p.life / p.maxLife;
    
    // Update position with turbulence and audio reactivity
    const turbulenceX = Math.sin(timestamp / 300 + p.turbulence) * 1.5;
    const audioBoost = Math.max(0, p.audio - 0.3) * 2;
    p.x += p.velocity.x + turbulenceX;
    p.y += p.velocity.y * (1 + audioBoost);
    
    // Update alpha based on life
    p.alpha = lifeRatio * (0.7 + p.audio * 0.3);
    
    // Draw the particle
    drawFireParticle(ctx, p);
  }
  
  // Cap the max particles to avoid memory issues
  if (particles.length > maxParticles) {
    particles.splice(0, particles.length - maxParticles);
  }
}

// Draws the complete flame base with all components
function drawFlameBase(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  intensity: number,
  midReactivity: number,
  timestamp: number,
  settings: VisualizerSettings,
  isEncoding: boolean
) {
  // Get color from settings and convert to RGB
  const baseColor = hexToRgb(settings.color) || { r: 255, g: 120, b: 50 };
  
  // For encoding, use a different blend mode for more vibrant effects
  if (!isEncoding) {
    ctx.globalCompositeOperation = 'source-over';
  }
  
  // Draw all the flame components in order from back to front
  
  // 1. Draw glow at the base
  drawCentralGlow(ctx, canvasWidth, canvasHeight, baseColor, intensity);
  
  // 2. Draw main outer flame shape
  drawMainFlame(ctx, canvasWidth, canvasHeight, baseColor, timestamp, intensity, midReactivity);
  
  // 3. Draw inner brighter flame core
  drawInnerFlame(ctx, canvasWidth, canvasHeight, baseColor, timestamp, intensity, midReactivity);
  
  // 4. Add small ember particles in preview mode only
  if (!isEncoding) {
    drawEmbers(ctx, canvasWidth, canvasHeight, baseColor, timestamp, intensity, midReactivity);
  }
}

// Creates a fire particle with properties based on input parameters
function createFireParticle(
  canvasWidth: number,
  canvasHeight: number,
  intensity: number,
  midReactivity: number,
  settings: VisualizerSettings,
  isEncoding: boolean
) {
  // Skip if we're already at max particles
  if (particles.length >= maxParticles) return;
  
  // Create a base color from the settings
  const baseColor = hexToRgb(settings.color) || { r: 255, g: 120, b: 50 };
  
  // Particle spawn area - wider when there's more audio in mid frequencies
  const spawnWidth = canvasWidth * 0.35 * (0.6 + midReactivity * 0.8);
  
  // Spawn position - at the bottom center with randomized width
  const x = canvasWidth / 2 + (Math.random() - 0.5) * spawnWidth;
  const y = canvasHeight;
  
  // Velocity - faster upward movement with more intensity
  // More horizontal spread for particles on the sides
  const distanceFromCenter = Math.abs(x - canvasWidth / 2) / (spawnWidth / 2);
  const xVelocity = (Math.random() - 0.5) * 2 * (0.3 + distanceFromCenter * 0.7);
  
  // Faster rise for particles in encoding mode
  const baseYVelocity = isEncoding ? -2.5 : -1.5;
  const yVelocity = baseYVelocity - Math.random() * 2 * (0.5 + intensity * 0.8);
  
  // Particle size - larger for encoding
  const baseRadius = isEncoding ? 
    Math.max(2, canvasWidth / 300) : 
    Math.max(1, canvasWidth / 400);
  const radius = baseRadius * (0.5 + Math.random() * 1.5);
  
  // Color variation - select randomly between yellows and the theme color
  const useYellow = Math.random() > 0.4;
  let color;
  
  if (useYellow) {
    // Create a yellow-orange particle
    const yellowIntensity = Math.floor(200 + Math.random() * 55);
    color = `rgba(255, ${yellowIntensity}, ${Math.floor(yellowIntensity/3)}, 0.8)`;
  } else {
    // Create a particle using the theme color
    const r = baseColor.r;
    const g = Math.floor(baseColor.g * (0.3 + Math.random() * 0.7));
    const b = Math.floor(baseColor.b * Math.random() * 0.3);
    color = `rgba(${r}, ${g}, ${b}, 0.8)`;
  }
  
  // Life of the particle - longer for encoding
  const lifeBase = isEncoding ? 40 : 30;
  const life = lifeBase + Math.floor(Math.random() * 30);
  
  // Create the particle
  const particle: Particle = {
    x,
    y,
    radius,
    color,
    velocity: { x: xVelocity, y: yVelocity },
    alpha: 0.8,
    life,
    maxLife: life,
    turbulence: Math.random() * 10, // Random starting phase for varied movement
    audio: intensity // Store audio intensity for reactivity
  };
  
  // Add to particles array
  particles.push(particle);
}

// Create a burst of particles on audio peaks
function createFireBurst(
  canvasWidth: number,
  canvasHeight: number,
  intensity: number,
  settings: VisualizerSettings,
  isEncoding: boolean
) {
  // Skip if we're already at max particles
  if (particles.length >= maxParticles) return;
  
  // Base color from settings
  const baseColor = hexToRgb(settings.color) || { r: 255, g: 120, b: 50 };
  
  // Burst position - somewhere in the lower half of the flame
  const burstHeight = canvasHeight * (0.6 + Math.random() * 0.3);
  const burstWidth = canvasWidth * 0.4 * (0.5 + Math.random() * 0.5);
  
  const x = canvasWidth / 2 + (Math.random() - 0.5) * burstWidth;
  const y = canvasHeight - burstHeight * (0.1 + Math.random() * 0.4);
  
  // Velocity - burst in all directions
  const angle = Math.random() * Math.PI * 2;
  const speed = 0.5 + Math.random() * 2 * (0.5 + intensity * 0.8);
  
  const xVelocity = Math.cos(angle) * speed;
  const yVelocity = Math.sin(angle) * speed - 2; // Bias upward
  
  // Particle size - varies with speed
  const baseRadius = isEncoding ? 
    Math.max(2, canvasWidth / 300) : 
    Math.max(1, canvasWidth / 400);
  const radius = baseRadius * (0.5 + Math.random() * (0.8 + intensity * 0.7));
  
  // Brighter colors for bursts - more whites and yellows
  const colorRoll = Math.random();
  let color;
  
  if (colorRoll > 0.7) {
    // White hot center
    color = `rgba(255, 255, ${180 + Math.floor(Math.random() * 75)}, 0.9)`;
  } else if (colorRoll > 0.3) {
    // Yellow-orange
    const yellowIntensity = Math.floor(220 + Math.random() * 35);
    color = `rgba(255, ${yellowIntensity}, ${Math.floor(yellowIntensity/4)}, 0.85)`;
  } else {
    // Theme color based
    const r = baseColor.r;
    const g = Math.floor(baseColor.g * (0.5 + Math.random() * 0.5));
    const b = Math.floor(baseColor.b * (Math.random() * 0.2));
    color = `rgba(${r}, ${g}, ${b}, 0.8)`;
  }
  
  // Shorter life for burst particles
  const life = 20 + Math.floor(Math.random() * 25);
  
  // Create the burst particle
  const particle: Particle = {
    x,
    y,
    radius,
    color,
    velocity: { x: xVelocity, y: yVelocity },
    alpha: 0.9,
    life,
    maxLife: life,
    turbulence: Math.random() * 10,
    audio: intensity
  };
  
  // Add to particles array
  particles.push(particle);
}

// Helper to draw a single fire particle
function drawFireParticle(ctx: CanvasRenderingContext2D, particle: Particle) {
  // Create a radial gradient for the particle
  const gradient = ctx.createRadialGradient(
    particle.x, particle.y, 0,
    particle.x, particle.y, particle.radius
  );
  
  // Use the particle's color with a gradient fade
  gradient.addColorStop(0, particle.color.replace(/[\d.]+\)$/g, `${particle.alpha})`));
  gradient.addColorStop(1, particle.color.replace(/[\d.]+\)$/g, '0)'));
  
  // Draw the particle
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
  ctx.fill();
}

// Helper function to convert hex color to RGB
function hexToRgb(hex: string): { r: number, g: number, b: number } | null {
  // Default color if invalid
  if (!hex || typeof hex !== 'string') {
    return { r: 255, g: 120, b: 50 };
  }
  
  // Remove # if present
  hex = hex.replace(/^#/, '');
  
  // Parse hex values
  const bigint = parseInt(hex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  
  return { r, g, b };
} 