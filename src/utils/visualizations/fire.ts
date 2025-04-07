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
  }
  
  // Calculate animation time for consistency
  const animTime = timestamp - startTime;
  
  // Create a settings signature to detect changes
  const currentSettings = `${settings.sensitivity}|${settings.smoothing}|${settings.color}`;
  
  // Reset particle system on settings change to avoid speed issues
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
  
  // Clear the canvas - less trail for more defined flames
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; // Slightly more clearing to prevent buildup
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  
  // More reliable way to detect if we're in encoding mode
  const isEncoding = canvas.width >= 1280; // Most common encoding resolution starts at 720p (1280×720)
  
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
  
  // 1. Draw the main flame body
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
  
  // 2. Draw inner flame
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
  
  // 3. Add central glow for intensity
  if (intensity > 0.6) {
    ctx.shadowBlur = 20 * intensity;
    ctx.shadowColor = `rgba(${baseColor.r}, ${baseColor.g * 0.7}, ${baseColor.b * 0.3}, ${intensity * 0.8})`;
    ctx.beginPath();
    ctx.arc(canvasWidth / 2, canvasHeight - flameHeight * 0.6, flameHeight * 0.3, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  
  // 4. Draw randomized particles like in the preview instead of the circular pattern
  const particleCount = 150 + Math.floor(intensity * 150); // Increase particle count
  
  for (let i = 0; i < particleCount; i++) {
    // Sample audio data for particle properties
    const freqIndex = Math.floor(Math.random() * bufferLength * 0.8);
    const freqValue = dataArray[freqIndex] / 255.0;
    const scaledValue = freqValue * settings.sensitivity;
    
    // Create a distribution similar to the preview
    // Wider at the top, narrower at the bottom
    const yPosition = Math.random();
    const xSpread = yPosition * 1.8 + 0.2; // More spread at the top
    
    // Position calculation
    const x = canvasWidth / 2 + (Math.random() - 0.5) * canvasWidth * xSpread;
    
    // Y position: more particles higher up
    let y;
    if (Math.random() > 0.3) {
      // 70% of particles in upper area
      y = canvasHeight - flameHeight * (0.3 + Math.random() * 1.7);
    } else {
      // 30% of particles in the flame body
      y = canvasHeight - flameHeight * Math.random() * 0.7;
    }
    
    // Particle size - match preview
    const baseSize = 1 + Math.random() * 3.5;
    const size = baseSize * (0.5 + scaledValue * 0.8);
    
    // Match preview colors - more blue tones
    let particleColor;
    const blueChance = 0.6; // 60% of particles are blueish
    
    if (Math.random() < blueChance) {
      // Blue to cyan spectrum
      const blue = 180 + Math.random() * 75;
      const green = 100 + Math.random() * 155;
      particleColor = `rgba(${50 + Math.random() * 50}, ${green}, ${blue}, ${0.7 + scaledValue * 0.3})`;
    } else if (scaledValue > 0.7) {
      // Bright white-yellow hot particles
      particleColor = `rgba(255, ${220 + Math.random() * 35}, ${180 + Math.random() * 75}, ${0.8 + scaledValue * 0.2})`;
    } else {
      // Flame color particles
      particleColor = `rgba(${baseColor.r}, ${baseColor.g * 0.7 + 50}, ${baseColor.b * 0.3 + 30}, ${0.6 + scaledValue * 0.4})`;
    }
    
    // Draw the particle with glow
    ctx.beginPath();
    ctx.fillStyle = particleColor;
    ctx.shadowColor = particleColor;
    ctx.shadowBlur = size * 2;
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // 5. Add subtle ember trails to integrate particles with flame
  const trailCount = 25;
  for (let i = 0; i < trailCount; i++) {
    const startY = canvasHeight - Math.random() * flameHeight * 1.2;
    const startX = canvasWidth / 2 + (Math.random() - 0.5) * flameWidth * 1.0;
    
    const length = 20 + Math.random() * 120;
    // More varied angles for natural look
    const angle = -Math.PI/2 + (Math.random() - 0.5) * 1.5;
    
    const endX = startX + Math.cos(angle) * length;
    const endY = startY + Math.sin(angle) * length;
    
    // Use blue tones for some trails
    let trailColor;
    if (Math.random() > 0.5) {
      trailColor = {
        r: 50 + Math.random() * 50,
        g: 100 + Math.random() * 100,
        b: 200 + Math.random() * 55
      };
    } else {
      trailColor = {
        r: baseColor.r,
        g: baseColor.g * 0.7,
        b: baseColor.b * 0.3
      };
    }
    
    // Create a gradient for the ember path
    const gradient = ctx.createLinearGradient(startX, startY, endX, endY);
    gradient.addColorStop(0, `rgba(${trailColor.r}, ${trailColor.g}, ${trailColor.b}, 0.7)`);
    gradient.addColorStop(1, `rgba(${trailColor.r}, ${trailColor.g}, ${trailColor.b}, 0)`);
    
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 0.5 + Math.random() * 2;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    
    // Create curved ember path for more natural look
    const controlX = startX + (endX - startX) * 0.5 + (Math.random() - 0.5) * 50;
    const controlY = startY + (endY - startY) * 0.3;
    
    ctx.quadraticCurveTo(controlX, controlY, endX, endY);
    ctx.stroke();
  }
  
  // 6. Add peak bursts
  if (isPeak) {
    // Add more prominent burst on audio peaks
    const burstRadius = flameHeight * 0.3;
    const gradient = ctx.createRadialGradient(
      canvasWidth / 2, canvasHeight - flameHeight * 0.5,
      0,
      canvasWidth / 2, canvasHeight - flameHeight * 0.5,
      burstRadius
    );
    
    gradient.addColorStop(0, `rgba(255, 255, 255, ${0.3 * intensity})`);
    gradient.addColorStop(0.4, `rgba(100, 180, 255, ${0.2 * intensity})`); // Add blue tone
    gradient.addColorStop(0.7, `rgba(${baseColor.r}, ${baseColor.g * 0.8}, ${baseColor.b * 0.3}, ${0.1 * intensity})`);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(canvasWidth / 2, canvasHeight - flameHeight * 0.5, burstRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // Add additional particle burst on peaks
    const burstParticles = 30 + Math.floor(intensity * 40);
    for (let i = 0; i < burstParticles; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * flameHeight * 0.7;
      
      const x = canvasWidth / 2 + Math.cos(angle) * distance;
      const y = canvasHeight - flameHeight * 0.5 + Math.sin(angle) * distance * 0.5;
      
      const size = 1 + Math.random() * 3 * intensity;
      
      // More blue burst particles
      const blueAmount = 150 + Math.random() * 105;
      const particleColor = `rgba(${50 + Math.random() * 50}, ${100 + Math.random() * 120}, ${blueAmount}, ${0.7 + Math.random() * 0.3})`;
      
      ctx.beginPath();
      ctx.fillStyle = particleColor;
      ctx.shadowColor = particleColor;
      ctx.shadowBlur = size * 3;
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  // Reset blend mode
  ctx.globalCompositeOperation = 'source-over';
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
    particle.velocity.y -= (0.05 + (0.1 * intensity * (1 - lifePerc))) * fixedDelta * 60;
    
    // Add swirl effect - particles move toward center as they rise
    const centerPull = (canvasWidth / 2 - particle.x) * 0.003 * lifePerc;
    particle.velocity.x += (centerPull + (Math.random() - 0.5) * 0.05 * (1 - lifePerc)) * fixedDelta * 60;
    
    // Update alpha for fade-out effect - keep flames visible longer
    particle.alpha = particle.audio * (1 - Math.pow(lifePerc, 3));
    
    // Update radius - fire particles get smaller as they rise but not too small
    particle.radius *= 0.995;
    
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
  
  // Flame width responds to mid frequencies
  const flameWidth = canvasWidth * 0.65 * (0.6 + midReactivity * 0.6);
  
  // Flame height responds to bass frequencies
  const flameHeight = canvasHeight * 0.45 * (0.6 + intensity * 0.8);
  
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
  
  // Make the flame color more vibrant with better opacity for encoding
  const baseOpacity = isEncoding ? 0.95 : 0.9;
  const midOpacity = isEncoding ? 0.6 : 0.5;
  
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
  
  // Inner flame is more yellow/white with higher opacity for encoding
  const innerBaseOpacity = isEncoding ? 0.98 : 0.95;
  const innerMidOpacity = isEncoding ? 0.7 : 0.5;
  
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
  
  // Even tighter spread in encoding mode
  const spreadFactor = isEncoding ? 
    0.2 + midReactivity * 0.2 : // Tighter for encoding 
    0.3 + midReactivity * 0.3;  // Normal for preview
  
  // Center particles more closely around the center
  const x = canvasWidth / 2 + (Math.random() - 0.5) * canvasWidth * spreadFactor;
  
  // Start particles higher in the flame in encoding mode
  const yOffset = isEncoding ? 
    Math.random() * 80 : // Higher start in encoding
    Math.random() * 40;  // Normal in preview
  
  const y = canvasHeight - yOffset;
  
  // Much slower particle velocity in encoding
  const velocityScaleFactor = isEncoding ? 0.7 : 1.0;
  const velocityFactor = (0.6 + intensity * 1.0) * velocityScaleFactor;
  const velocityX = (Math.random() - 0.5) * 1.0 * velocityFactor;
  const velocityY = (-0.8 - Math.random() * 2.5) * velocityFactor;
  
  // Slightly larger particles in encoding for better visibility
  const radiusScale = isEncoding ? 1.4 : 1.0;
  const radius = (1 + Math.random() * 3.0 * (0.8 + intensity * 0.6)) * radiusScale;
  
  // Color variants with more realistic flame colors
  const colorVariant = Math.random();
  let particleColor;
  
  // Higher opacity in encoding mode
  const particleOpacity = isEncoding ? 0.95 : 0.9;
  const darkOpacity = isEncoding ? 0.9 : 0.85;
  
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
  
  // Shorter lifespan in encoding mode for quicker refresh
  const lifespanScale = isEncoding ? 0.8 : 1.0;
  const maxLife = (25 + Math.random() * 40 + intensity * 30) * lifespanScale;
  
  // Less turbulence in encoding mode
  const turbulenceScale = isEncoding ? 0.7 : 1.0;
  const turbulence = Math.random() * 0.4 * midReactivity * turbulenceScale;
  
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
  
  // Create particle in the main flame area but higher up in encoding mode
  const heightVarianceMax = isEncoding ? 0.5 : 0.7; // Less height variation in encoding
  const heightVariance = Math.random() * heightVarianceMax;
  
  // More centered in encoding mode
  const spreadFactor = isEncoding ? 0.3 : 0.5;
  const x = canvasWidth / 2 + (Math.random() - 0.5) * canvasWidth * spreadFactor;
  const y = canvasHeight - (canvasHeight * 0.4 * heightVariance); 
  
  // Slower, more controlled velocity in encoding mode
  const velocityScale = isEncoding ? 0.7 : 1.0;
  const angle = Math.random() * Math.PI * 2;
  const speed = (0.8 + Math.random() * 3 * intensity) * velocityScale;
  const velocityX = Math.cos(angle) * speed;
  const velocityY = Math.sin(angle) * speed - 2 * velocityScale; // Upward bias
  
  // Slightly larger particles in encoding
  const radiusScale = isEncoding ? 1.3 : 1.0;
  const radius = (0.5 + Math.random() * 2) * radiusScale;
  
  // Brighter colors for the burst with higher opacity in encoding
  const particleOpacity = isEncoding ? 0.95 : 0.9;
  const colorVariant = Math.random();
  let particleColor;
  
  if (colorVariant < 0.3) {
    // Main bright color
    particleColor = `rgba(${baseColor.r}, ${baseColor.g * 0.8 + 50}, ${baseColor.b * 0.5 + 50}, ${particleOpacity})`;
  } else if (colorVariant < 0.8) {
    // Yellow/white hot spark
    particleColor = `rgba(255, ${220 + Math.random() * 35}, ${170 + Math.random() * 85}, ${particleOpacity})`;
  } else {
    // Pure white spark
    particleColor = `rgba(255, 255, 255, 1)`;
  }
  
  // Shorter lifespan for burst particles in encoding
  const lifespanScale = isEncoding ? 0.8 : 1.0;
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
    turbulence: Math.random() * 0.3 * (isEncoding ? 0.7 : 1.0),
    audio: intensity
  };
  
  particles.push(particle);
}

function drawFireParticle(ctx: CanvasRenderingContext2D, particle: Particle) {
  // Set global alpha for fading effect
  ctx.globalAlpha = particle.alpha;
  
  // Add glow to particles based on color and life stage
  if (particle.radius > 2 || particle.color.includes('255, 255')) {
    ctx.shadowBlur = particle.radius * 2 * particle.alpha;
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
