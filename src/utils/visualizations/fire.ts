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
  const flameHeight = canvasHeight * 0.45 * (0.6 + intensity * 0.8);
  const flameWidth = canvasWidth * 0.65 * (0.6 + midReactivity * 0.6);
  
  const innerGradient = ctx.createRadialGradient(
    canvasWidth / 2,
    canvasHeight,
    0,
    canvasWidth / 2,
    canvasHeight - flameHeight * 0.2,
    flameHeight * 0.7
  );
  
  innerGradient.addColorStop(0, `rgba(255, ${180 + baseColor.g * 0.2}, ${100 + baseColor.b * 0.1}, 0.98)`);
  innerGradient.addColorStop(0.5, `rgba(${baseColor.r}, ${baseColor.g * 0.7}, ${baseColor.b * 0.2}, 0.7)`);
  innerGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  
  const pulseScale = 0.9 + 0.2 * Math.sin(timestamp / 100) * intensity;
  const innerWidth = flameWidth * 0.5 * pulseScale;
  const innerHeight = flameHeight * 0.7 * pulseScale;
  
  const wobble = Math.sin(timestamp / 300) * 20 * midReactivity;
  
  ctx.fillStyle = innerGradient;
  ctx.beginPath();
  ctx.moveTo(canvasWidth / 2 - innerWidth / 2, canvasHeight);
  ctx.bezierCurveTo(
    canvasWidth / 2 - innerWidth / 2 + wobble * 0.5, canvasHeight - innerHeight * 0.3,
    canvasWidth / 2 - innerWidth * 0.3 - wobble * 0.3, canvasHeight - innerHeight * 0.7,
    canvasWidth / 2 - innerWidth * 0.1 + wobble * 0.2, canvasHeight - innerHeight
  );
  ctx.bezierCurveTo(
    canvasWidth / 2, canvasHeight - innerHeight - 10 * intensity,
    canvasWidth / 2, canvasHeight - innerHeight - 10 * intensity,
    canvasWidth / 2 + innerWidth * 0.1 - wobble * 0.2, canvasHeight - innerHeight
  );
  ctx.bezierCurveTo(
    canvasWidth / 2 + innerWidth * 0.3 + wobble * 0.3, canvasHeight - innerHeight * 0.7,
    canvasWidth / 2 + innerWidth / 2 - wobble * 0.5, canvasHeight - innerHeight * 0.3,
    canvasWidth / 2 + innerWidth / 2, canvasHeight
  );
  ctx.closePath();
  ctx.fill();
}

// Add central glow effect
function drawCentralGlow(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  baseColor: { r: number, g: number, b: number },
  intensity: number
) {
  if (intensity > 0.6) {
    const flameHeight = canvasHeight * 0.45 * (0.6 + intensity * 0.8);
    
    ctx.shadowBlur = 20 * intensity;
    ctx.shadowColor = `rgba(${baseColor.r}, ${baseColor.g * 0.7}, ${baseColor.b * 0.3}, ${intensity * 0.8})`;
    ctx.beginPath();
    ctx.arc(canvasWidth / 2, canvasHeight - flameHeight * 0.6, flameHeight * 0.3, 0, Math.PI * 2);
    ctx.closePath();
    
    const glowGradient = ctx.createRadialGradient(
      canvasWidth / 2,
      canvasHeight - flameHeight * 0.6,
      0,
      canvasWidth / 2,
      canvasHeight - flameHeight * 0.6,
      flameHeight * 0.3
    );
    
    glowGradient.addColorStop(0, `rgba(255, ${220 + baseColor.g * 0.1}, ${150 + baseColor.b * 0.1}, ${intensity * 0.8})`);
    glowGradient.addColorStop(1, `rgba(${baseColor.r}, ${baseColor.g * 0.7}, ${baseColor.b * 0.3}, 0)`);
    
    ctx.fillStyle = glowGradient;
    ctx.fill();
    
    // Reset shadow
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
  }
}

// Draw flying ember particles
function drawEmbers(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  baseColor: { r: number, g: number, b: number },
  timestamp: number,
  intensity: number,
  midReactivity: number
) {
  const flameHeight = canvasHeight * 0.45 * (0.6 + intensity * 0.8);
  const emberCount = Math.floor(5 + intensity * 20);
  
  // Create pseudo-random embers that are consistent for the timestamp
  for (let i = 0; i < emberCount; i++) {
    const seed = (timestamp / 1000 + i * 0.1) % 100;
    
    // Use sin/cos with the seed to get "random" but consistent placement
    const xOffset = Math.sin(seed * 7.5) * canvasWidth * 0.3;
    const yPosition = canvasHeight - flameHeight * (0.2 + Math.abs(Math.cos(seed * 3.2)) * 1.4);
    const size = 1 + Math.abs(Math.sin(seed * 9.3)) * 2 * intensity;
    
    // Ember movement based on time
    const xMovement = Math.sin(timestamp / 400 + i) * 10 * midReactivity;
    const yMovement = -Math.abs(Math.sin(timestamp / 300 + i * 2) * 5) * intensity;
    
    const alpha = 0.3 + Math.abs(Math.sin(seed * 5.2)) * 0.7 * intensity;
    
    ctx.beginPath();
    ctx.arc(
      canvasWidth / 2 + xOffset + xMovement, 
      yPosition + yMovement,
      size,
      0,
      Math.PI * 2
    );
    ctx.closePath();
    
    const emberGradient = ctx.createRadialGradient(
      canvasWidth / 2 + xOffset + xMovement,
      yPosition + yMovement,
      0,
      canvasWidth / 2 + xOffset + xMovement,
      yPosition + yMovement,
      size
    );
    
    emberGradient.addColorStop(0, `rgba(255, 255, ${180 + baseColor.b * 0.3}, ${alpha})`);
    emberGradient.addColorStop(0.5, `rgba(${baseColor.r}, ${150 + baseColor.g * 0.2}, 50, ${alpha * 0.6})`);
    emberGradient.addColorStop(1, `rgba(${baseColor.r * 0.5}, ${baseColor.g * 0.3}, ${baseColor.b * 0.1}, 0)`);
    
    ctx.fillStyle = emberGradient;
    ctx.fill();
  }
}

// Update and draw existing particles
function updateAndDrawParticles(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  intensity: number,
  timestamp: number
) {
  const fixedDelta = 16 / 1000; // 60fps in seconds
  const isEncoding = canvasWidth >= 1280;
  
  // Properly set blend mode for consistent appearance
  ctx.globalCompositeOperation = 'lighter';
  
  for (let i = particles.length - 1; i >= 0; i--) {
    const particle = particles[i];
    
    // Update particle
    particle.life += 1;
    
    // Remove dead particles
    if (particle.life >= particle.maxLife) {
      particles.splice(i, 1);
      continue;
    }
    
    // Calculate life percentage for effects
    const lifePerc = particle.life / particle.maxLife;
    
    // Update position with consistent timing
    const turbulence = particle.turbulence * Math.sin(timestamp / 200 + particle.x / 50) * (1 - lifePerc);
    particle.x += (particle.velocity.x + turbulence) * fixedDelta * 60;
    particle.y += particle.velocity.y * fixedDelta * 60;
    
    // Update velocity (simulate rising fire with acceleration)
    // Apply much stronger acceleration in encoding mode
    const riseAcceleration = isEncoding ? 0.35 : 0.1;
    particle.velocity.y -= (0.05 + (riseAcceleration * intensity * (1 - lifePerc))) * fixedDelta * 60;
    
    // Add swirl effect - particles move toward center as they rise
    const centerPull = (canvasWidth / 2 - particle.x) * 0.003 * lifePerc;
    particle.velocity.x += (centerPull + (Math.random() - 0.5) * 0.05 * (1 - lifePerc)) * fixedDelta * 60;
    
    // Update alpha for fade-out effect - keep flames visible longer at height
    const fadeExponent = isEncoding ? 2.0 : 3;
    particle.alpha = particle.audio * (1 - Math.pow(lifePerc, fadeExponent));
    
    // Update radius - fire particles get smaller as they rise but not too small
    // Make particles shrink much slower in encoding
    const shrinkRate = isEncoding ? 0.998 : 0.995;
    particle.radius *= shrinkRate;
    
    // Draw particle
    drawFireParticle(ctx, particle);
  }
}

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
  const baseColor = hexToRgb(settings.color) || { r: 255, g: 120, b: 50 };
  
  // Adjust flame width for encoding to match preview
  const widthMultiplier = isEncoding ? 0.55 : 0.65;
  const flameWidth = canvasWidth * widthMultiplier * (0.6 + midReactivity * 0.6);
  
  // Adjust flame height for encoding to match preview
  const heightMultiplier = isEncoding ? 0.4 : 0.45;
  const flameHeight = canvasHeight * heightMultiplier * (0.6 + intensity * 0.8);
  
  // Use additive blending for base flame too for better integration with particles
  ctx.globalCompositeOperation = 'lighter';
  
  // Create a gradient for the main flame
  const gradient = ctx.createRadialGradient(
    canvasWidth / 2,
    canvasHeight,
    0,
    canvasWidth / 2,
    canvasHeight - flameHeight * 0.3,
    flameHeight
  );
  
  // Use consistent flame color opacity for both modes
  const baseOpacity = 0.92;
  const midOpacity = 0.55;
  
  gradient.addColorStop(0, `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, ${baseOpacity})`);
  gradient.addColorStop(0.5, `rgba(${baseColor.r * 0.8}, ${baseColor.g * 0.4}, ${baseColor.b * 0.1}, ${midOpacity})`);
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  
  // Time-based wobble for the flame
  const wobble = Math.sin(timestamp / 300) * 20 * midReactivity;
  
  // Draw main flame shape
  ctx.fillStyle = gradient;
  ctx.beginPath();
  
  // Start at the bottom corners
  ctx.moveTo(canvasWidth / 2 - flameWidth / 2, canvasHeight);
  
  // Left curve with wobble
  ctx.bezierCurveTo(
    canvasWidth / 2 - flameWidth / 2 + wobble, canvasHeight - flameHeight * 0.3,
    canvasWidth / 2 - flameWidth * 0.3 - wobble, canvasHeight - flameHeight * 0.7,
    canvasWidth / 2 - flameWidth * 0.1 + wobble * 0.5, canvasHeight - flameHeight
  );
  
  // Top of the flame
  ctx.bezierCurveTo(
    canvasWidth / 2, canvasHeight - flameHeight - 20 * intensity,
    canvasWidth / 2, canvasHeight - flameHeight - 20 * intensity,
    canvasWidth / 2 + flameWidth * 0.1 - wobble * 0.5, canvasHeight - flameHeight
  );
  
  // Right curve with opposite wobble
  ctx.bezierCurveTo(
    canvasWidth / 2 + flameWidth * 0.3 + wobble, canvasHeight - flameHeight * 0.7,
    canvasWidth / 2 + flameWidth / 2 - wobble, canvasHeight - flameHeight * 0.3,
    canvasWidth / 2 + flameWidth / 2, canvasHeight
  );
  
  ctx.closePath();
  ctx.fill();
  
  // Draw inner flame (hotter part)
  const innerGradient = ctx.createRadialGradient(
    canvasWidth / 2,
    canvasHeight,
    0,
    canvasWidth / 2,
    canvasHeight - flameHeight * 0.2,
    flameHeight * 0.7
  );
  
  // Use consistent inner flame color opacity for both modes
  const innerBaseOpacity = 0.96;
  const innerMidOpacity = 0.6;
  
  innerGradient.addColorStop(0, `rgba(255, ${180 + baseColor.g * 0.2}, ${100 + baseColor.b * 0.1}, ${innerBaseOpacity})`);
  innerGradient.addColorStop(0.5, `rgba(${baseColor.r}, ${baseColor.g * 0.7}, ${baseColor.b * 0.2}, ${innerMidOpacity})`);
  innerGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  
  // Draw inner flame with pulsing based on audio
  const pulseScale = 0.9 + 0.2 * Math.sin(timestamp / 100) * intensity;
  const innerWidth = flameWidth * 0.5 * pulseScale;
  const innerHeight = flameHeight * 0.7 * pulseScale;
  
  ctx.fillStyle = innerGradient;
  ctx.beginPath();
  
  // Start at the bottom with narrower base
  ctx.moveTo(canvasWidth / 2 - innerWidth / 2, canvasHeight);
  
  // Left curve with less wobble
  ctx.bezierCurveTo(
    canvasWidth / 2 - innerWidth / 2 + wobble * 0.5, canvasHeight - innerHeight * 0.3,
    canvasWidth / 2 - innerWidth * 0.3 - wobble * 0.3, canvasHeight - innerHeight * 0.7,
    canvasWidth / 2 - innerWidth * 0.1 + wobble * 0.2, canvasHeight - innerHeight
  );
  
  // Top of the inner flame
  ctx.bezierCurveTo(
    canvasWidth / 2, canvasHeight - innerHeight - 10 * intensity,
    canvasWidth / 2, canvasHeight - innerHeight - 10 * intensity,
    canvasWidth / 2 + innerWidth * 0.1 - wobble * 0.2, canvasHeight - innerHeight
  );
  
  // Right curve
  ctx.bezierCurveTo(
    canvasWidth / 2 + innerWidth * 0.3 + wobble * 0.3, canvasHeight - innerHeight * 0.7,
    canvasWidth / 2 + innerWidth / 2 - wobble * 0.5, canvasHeight - innerHeight * 0.3,
    canvasWidth / 2 + innerWidth / 2, canvasHeight
  );
  
  ctx.closePath();
  ctx.fill();
  
  // Add glow effect for intense flames
  if (intensity > 0.6) {
    ctx.shadowBlur = 20 * intensity;
    ctx.shadowColor = `rgba(${baseColor.r}, ${baseColor.g * 0.7}, ${baseColor.b * 0.3}, ${intensity * 0.8})`;
    
    // Draw a subtle glow shape
    ctx.beginPath();
    ctx.arc(canvasWidth / 2, canvasHeight - flameHeight * 0.6, flameHeight * 0.3, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
    
    ctx.shadowBlur = 0;
  }
}

function createFireParticle(
  canvasWidth: number,
  canvasHeight: number,
  intensity: number,
  midReactivity: number,
  settings: VisualizerSettings,
  isEncoding: boolean
) {
  const baseColor = hexToRgb(settings.color) || { r: 255, g: 120, b: 50 };
  
  // Slightly reduce spread in encoding mode
  const spreadFactor = isEncoding ? 
    0.22 + midReactivity * 0.22 : // Tighter for encoding 
    0.25 + midReactivity * 0.25;  // Normal for preview
  
  // Center particles more closely around the center
  const x = canvasWidth / 2 + (Math.random() - 0.5) * canvasWidth * spreadFactor;
  
  // Start particles from slightly higher in encoding mode
  const yOffset = isEncoding ? 
    Math.random() * 60 : // Higher start in encoding
    Math.random() * 50;  // Normal in preview
  
  const y = canvasHeight - yOffset;
  
  // Apply much stronger upward velocity for encoded mode to make particles rise higher
  const velocityScale = isEncoding ? 0.9 : 1.0;
  const velocityFactor = (0.6 + intensity * 1.0) * velocityScale;
  const velocityX = (Math.random() - 0.5) * 1.0 * velocityFactor;
  
  // Apply extreme initial upward velocity for encoding 
  // Normal particles are (-0.8 to -3.3) but encoding needs to be much stronger
  const velocityYBase = isEncoding ? (-4.0 - Math.random() * 6.0) : (-0.8 - Math.random() * 2.5);
  const velocityY = velocityYBase * velocityFactor;
  
  // Make particles larger in the encoding mode to match preview
  const radiusScale = isEncoding ? 2.2 : 1.0;
  const radius = (1 + Math.random() * 3.0 * (0.8 + intensity * 0.6)) * radiusScale;
  
  // Color variants with more realistic flame colors
  const colorVariant = Math.random();
  let particleColor;
  
  // Use consistent opacity for both modes
  const particleOpacity = 0.92;
  const darkOpacity = 0.87;
  
  if (colorVariant < 0.5) {
    // Main flame color based on settings
    particleColor = `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, ${particleOpacity})`;
  } else if (colorVariant < 0.8) {
    // Darker color for depth
    particleColor = `rgba(${baseColor.r * 0.7}, ${baseColor.g * 0.3}, ${baseColor.b * 0.1}, ${darkOpacity})`;
  } else if (colorVariant < 0.95) {
    // Yellow/white hot center
    particleColor = `rgba(255, ${200 + Math.random() * 55}, ${100 + Math.random() * 155}, ${particleOpacity})`;
  } else {
    // Occasional spark
    particleColor = `rgba(255, 255, 255, 0.98)`;
  }
  
  // Much longer lifespan for encoding to ensure particles rise high enough
  const lifespanScale = isEncoding ? 2.5 : 1.0;
  const maxLife = (25 + Math.random() * 40 + intensity * 30) * lifespanScale;
  
  // Use consistent turbulence for both modes
  const turbulence = Math.random() * 0.4 * midReactivity;
  
  const particle: Particle = {
    x,
    y,
    radius,
    color: particleColor,
    velocity: {
      x: velocityX,
      y: velocityY
    },
    alpha: 0.9,
    life: 0,
    maxLife,
    turbulence,
    audio: 0.7 + intensity * 0.6 // Store audio influence for later use
  };
  
  particles.push(particle);
  
  // Limit number of particles
  while (particles.length > maxParticles) {
    particles.shift();
  }
}

function createFireBurst(
  canvasWidth: number,
  canvasHeight: number,
  intensity: number,
  settings: VisualizerSettings,
  isEncoding: boolean
) {
  const baseColor = hexToRgb(settings.color) || { r: 255, g: 120, b: 50 };
  
  // Use consistent height variance
  const heightVariance = Math.random() * 0.6;
  
  // Use consistent spread
  const spreadFactor = 0.4;
  const x = canvasWidth / 2 + (Math.random() - 0.5) * canvasWidth * spreadFactor;
  const y = canvasHeight - (canvasHeight * 0.4 * heightVariance); 
  
  // Use consistent velocity but greatly increase upward boost for encoded mode
  const angle = Math.random() * Math.PI * 2;
  const speed = (0.8 + Math.random() * 3 * intensity);
  const velocityX = Math.cos(angle) * speed;
  // Apply extreme upward velocity for bursts in encoded mode
  const upwardBoost = isEncoding ? 6.0 : 2.0;
  const velocityY = Math.sin(angle) * speed - upwardBoost; // Upward bias
  
  // Make burst particles larger in encoding mode
  const radiusScale = isEncoding ? 2.0 : 1.0; 
  const radius = (0.5 + Math.random() * 2) * radiusScale;
  
  // Use higher opacity for encoding
  const particleOpacity = isEncoding ? 1.0 : 0.92;
  const colorVariant = Math.random();
  let particleColor;
  
  if (colorVariant < 0.3) {
    // Main bright color - brighter for encoding
    particleColor = `rgba(${baseColor.r}, ${baseColor.g * 0.8 + (isEncoding ? 70 : 50)}, ${baseColor.b * 0.5 + (isEncoding ? 70 : 50)}, ${particleOpacity})`;
  } else if (colorVariant < 0.8) {
    // Yellow/white hot spark - brighter for encoding
    particleColor = `rgba(255, ${220 + Math.random() * 35}, ${170 + Math.random() * 85}, ${particleOpacity})`;
  } else {
    // Pure white spark
    particleColor = `rgba(255, 255, 255, 1)`;
  }
  
  // Much longer lifespan for encoding to ensure particles rise high enough
  const lifespanScale = isEncoding ? 2.5 : 1.0;
  const maxLife = (15 + Math.random() * 25) * lifespanScale;
  
  const particle: Particle = {
    x,
    y,
    radius,
    color: particleColor,
    velocity: {
      x: velocityX,
      y: velocityY
    },
    alpha: 1,
    life: 0,
    maxLife,
    turbulence: Math.random() * 0.3,
    audio: intensity
  };
  
  particles.push(particle);
}

function drawFireParticle(ctx: CanvasRenderingContext2D, particle: Particle) {
  // Set global alpha for fading effect
  ctx.globalAlpha = particle.alpha;
  
  const isLargeResolution = ctx.canvas.width >= 1280;
  
  // Add glow to particles based on color and life stage
  // Increase glow in encoding mode to match preview
  if (particle.radius > 2 || particle.color.includes('255, 255')) {
    const glowScale = isLargeResolution ? 3.0 : 2.0;
    ctx.shadowBlur = particle.radius * glowScale * particle.alpha;
    ctx.shadowColor = particle.color;
  }
  
  // Draw the particle
  ctx.beginPath();
  ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
  ctx.fillStyle = particle.color;
  ctx.fill();
  
  // Reset shadow
  ctx.shadowBlur = 0;
  
  // Reset global alpha
  ctx.globalAlpha = 1;
}

// Helper function to convert hex color to rgb
function hexToRgb(hex: string): { r: number, g: number, b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}
