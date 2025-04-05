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

// Pool of particles for reuse
const particles: Particle[] = [];
const maxParticles = 600; // Increased for more density

// Audio history for flame response
const audioHistory: number[] = Array(10).fill(0);
let lastAudioPeak = 0;

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
  const isPeak = bassIntensity > currentAvg * 1.5 && timestamp - lastAudioPeak > 300;
  
  if (isPeak) {
    lastAudioPeak = timestamp;
  }
  
  // Amplify with sensitivity setting
  const intensity = bassIntensity * settings.sensitivity;
  const midReactivity = midIntensity * settings.sensitivity;
  
  // Clear the canvas - less trail for more defined flames
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  
  // Create new particles based on audio intensity
  const baseParticles = 8; // Minimum particles per frame
  const particlesToCreate = Math.floor(baseParticles + intensity * 25);
  
  for (let i = 0; i < particlesToCreate; i++) {
    createFireParticle(canvasWidth, canvasHeight, intensity, midReactivity, settings);
  }
  
  // Add a burst on audio peaks
  if (isPeak) {
    const burstAmount = Math.floor(20 + 30 * intensity);
    for (let i = 0; i < burstAmount; i++) {
      createFireBurst(canvasWidth, canvasHeight, intensity, settings);
    }
  }
  
  // Update and draw particles
  ctx.globalCompositeOperation = 'lighter'; // Makes flames more vibrant and layered
  
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
    
    // Update position with turbulence
    const turbulence = particle.turbulence * Math.sin(timestamp / 200 + particle.x / 50) * (1 - lifePerc);
    particle.x += particle.velocity.x + turbulence;
    particle.y += particle.velocity.y;
    
    // Update velocity (simulate rising fire with acceleration)
    particle.velocity.y -= 0.05 + (0.1 * intensity * (1 - lifePerc));
    
    // Add swirl effect - particles move toward center as they rise
    const centerPull = (canvasWidth / 2 - particle.x) * 0.003 * lifePerc;
    particle.velocity.x += centerPull + (Math.random() - 0.5) * 0.1 * (1 - lifePerc);
    
    // Update alpha for fade-out effect - keep flames visible longer
    particle.alpha = particle.audio * (1 - Math.pow(lifePerc, 3));
    
    // Update radius - fire particles get smaller as they rise but not too small
    particle.radius *= 0.99;
    
    // Draw particle
    drawFireParticle(ctx, particle);
  }
  
  // Reset blend mode
  ctx.globalCompositeOperation = 'source-over';
  
  // Draw flame base - more detailed base flames
  drawFlameBase(ctx, canvasWidth, canvasHeight, intensity, midReactivity, timestamp, settings);
};

function drawFlameBase(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  intensity: number,
  midReactivity: number,
  timestamp: number,
  settings: VisualizerSettings
) {
  const baseColor = hexToRgb(settings.color) || { r: 255, g: 120, b: 50 };
  
  // Flame width responds to mid frequencies
  const flameWidth = canvasWidth * 0.6 * (0.6 + midReactivity * 0.6);
  
  // Flame height responds to bass frequencies
  const flameHeight = canvasHeight * 0.45 * (0.6 + intensity * 0.8);
  
  // Create a gradient for the main flame
  const gradient = ctx.createRadialGradient(
    canvasWidth / 2,
    canvasHeight,
    0,
    canvasWidth / 2,
    canvasHeight - flameHeight * 0.3,
    flameHeight
  );
  
  // Make the flame color more vibrant
  gradient.addColorStop(0, `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, 0.9)`);
  gradient.addColorStop(0.5, `rgba(${baseColor.r * 0.8}, ${baseColor.g * 0.4}, ${baseColor.b * 0.1}, 0.5)`);
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
  
  // Inner flame is more yellow/white
  innerGradient.addColorStop(0, `rgba(255, ${180 + baseColor.g * 0.2}, ${100 + baseColor.b * 0.1}, 0.95)`);
  innerGradient.addColorStop(0.5, `rgba(${baseColor.r}, ${baseColor.g * 0.7}, ${baseColor.b * 0.2}, 0.5)`);
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
  if (intensity > 0.7) {
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
  settings: VisualizerSettings
) {
  const baseColor = hexToRgb(settings.color) || { r: 255, g: 120, b: 50 };
  
  // Base at bottom center with distribution based on audio intensity
  const spreadFactor = 0.4 + midReactivity * 0.4; // Wider spread with higher mid frequencies
  const x = canvasWidth / 2 + (Math.random() - 0.5) * canvasWidth * spreadFactor;
  const y = canvasHeight - Math.random() * 20; // Start slightly varied at bottom
  
  // Velocity influenced by audio intensity
  const velocityFactor = 0.8 + intensity * 1.5;
  const velocityX = (Math.random() - 0.5) * 2 * velocityFactor;
  const velocityY = -1 - Math.random() * 4 * velocityFactor;
  
  // Size varies with audio intensity
  const radius = 1 + Math.random() * 4 * (0.8 + intensity * 0.6);
  
  // Color variants with more realistic flame colors
  const colorVariant = Math.random();
  let particleColor;
  
  if (colorVariant < 0.5) {
    // Main flame color based on settings
    particleColor = `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, 0.9)`;
  } else if (colorVariant < 0.8) {
    // Darker color for depth
    particleColor = `rgba(${baseColor.r * 0.7}, ${baseColor.g * 0.3}, ${baseColor.b * 0.1}, 0.85)`;
  } else if (colorVariant < 0.95) {
    // Yellow/white hot center
    particleColor = `rgba(255, ${200 + Math.random() * 55}, ${100 + Math.random() * 155}, 0.9)`;
  } else {
    // Occasional spark
    particleColor = `rgba(255, 255, 255, 0.95)`;
  }
  
  // Lifespan varies with intensity
  const maxLife = 30 + Math.random() * 50 + intensity * 40;
  
  // Turbulence factor - more turbulent with higher mid frequencies
  const turbulence = Math.random() * 0.6 * midReactivity;
  
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
  settings: VisualizerSettings
) {
  const baseColor = hexToRgb(settings.color) || { r: 255, g: 120, b: 50 };
  
  // Create particle in the main flame area
  const heightVariance = Math.random() * 0.7; // How high in the flame
  const x = canvasWidth / 2 + (Math.random() - 0.5) * canvasWidth * 0.5;
  const y = canvasHeight - (canvasHeight * 0.4 * heightVariance); 
  
  // Velocity explodes outward
  const angle = Math.random() * Math.PI * 2;
  const speed = 1 + Math.random() * 4 * intensity;
  const velocityX = Math.cos(angle) * speed;
  const velocityY = Math.sin(angle) * speed - 2; // Upward bias
  
  // Sparks are smaller
  const radius = 0.5 + Math.random() * 2;
  
  // Brighter colors for the burst
  const colorVariant = Math.random();
  let particleColor;
  
  if (colorVariant < 0.3) {
    // Main bright color
    particleColor = `rgba(${baseColor.r}, ${baseColor.g * 0.8 + 50}, ${baseColor.b * 0.5 + 50}, 0.9)`;
  } else if (colorVariant < 0.8) {
    // Yellow/white hot spark
    particleColor = `rgba(255, ${220 + Math.random() * 35}, ${170 + Math.random() * 85}, 0.95)`;
  } else {
    // Pure white spark
    particleColor = `rgba(255, 255, 255, 1)`;
  }
  
  // Shorter lifespan for burst particles
  const maxLife = 15 + Math.random() * 25;
  
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
