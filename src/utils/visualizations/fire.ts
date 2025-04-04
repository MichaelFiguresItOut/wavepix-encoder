
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
}

// Pool of particles for reuse
const particles: Particle[] = [];
const maxParticles = 400;

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
  
  // Calculate audio intensity
  let averageIntensity = 0;
  for (let i = 0; i < bufferLength; i++) {
    averageIntensity += dataArray[i] / 255.0;
  }
  averageIntensity /= bufferLength;
  
  // Amplify with sensitivity setting
  const intensity = averageIntensity * settings.sensitivity;
  
  // Clear the canvas with a transparent black background for trail effect
  ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  
  // Create new particles based on audio intensity
  const particlesToCreate = Math.floor(5 + intensity * 15);
  
  for (let i = 0; i < particlesToCreate; i++) {
    createFireParticle(canvasWidth, canvasHeight, intensity, settings);
  }
  
  // Update and draw particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const particle = particles[i];
    
    // Update particle
    particle.life += 1;
    
    // Remove dead particles
    if (particle.life >= particle.maxLife) {
      particles.splice(i, 1);
      continue;
    }
    
    // Update position
    particle.x += particle.velocity.x;
    particle.y += particle.velocity.y;
    
    // Update velocity (simulate rising fire)
    particle.velocity.y -= 0.05 + Math.random() * 0.05;
    particle.velocity.x += (Math.random() - 0.5) * 0.1;
    
    // Update alpha for fade-out effect
    particle.alpha = 1 - (particle.life / particle.maxLife);
    
    // Update radius - fire particles get smaller as they rise
    particle.radius *= 0.99;
    
    // Draw particle
    drawFireParticle(ctx, particle);
  }
  
  // Draw intense flames when audio peaks
  if (intensity > 0.8) {
    const flameWidth = canvasWidth * 0.7 * (0.5 + intensity * 0.5);
    const flameHeight = canvasHeight * 0.4 * intensity;
    
    // Create a gradient for the main flame
    const gradient = ctx.createRadialGradient(
      canvasWidth / 2,
      canvasHeight,
      0,
      canvasWidth / 2,
      canvasHeight,
      flameHeight
    );
    
    const baseColor = hexToRgb(settings.color) || { r: 255, g: 120, b: 50 };
    
    gradient.addColorStop(0, `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, 0.7)`);
    gradient.addColorStop(0.6, `rgba(${baseColor.r * 0.8}, ${baseColor.g * 0.4}, ${baseColor.b * 0.1}, 0.3)`);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(canvasWidth / 2 - flameWidth / 2, canvasHeight);
    
    // Draw flame shape
    ctx.bezierCurveTo(
      canvasWidth / 2 - flameWidth / 4, canvasHeight - flameHeight / 2,
      canvasWidth / 2 - flameWidth / 6, canvasHeight - flameHeight,
      canvasWidth / 2, canvasHeight - flameHeight
    );
    
    ctx.bezierCurveTo(
      canvasWidth / 2 + flameWidth / 6, canvasHeight - flameHeight,
      canvasWidth / 2 + flameWidth / 4, canvasHeight - flameHeight / 2,
      canvasWidth / 2 + flameWidth / 2, canvasHeight
    );
    
    ctx.closePath();
    ctx.fill();
  }
};

function createFireParticle(
  canvasWidth: number,
  canvasHeight: number,
  intensity: number,
  settings: VisualizerSettings
) {
  const baseColor = hexToRgb(settings.color) || { r: 255, g: 120, b: 50 };
  
  // Create particle at the bottom of the screen with random horizontal position
  const x = canvasWidth / 2 + (Math.random() - 0.5) * canvasWidth * 0.6;
  const y = canvasHeight;
  
  // Random velocity, mainly upward
  const velocityX = (Math.random() - 0.5) * 2;
  const velocityY = -1 - Math.random() * 3 * intensity;
  
  // Random size
  const radius = 1 + Math.random() * 3 * intensity;
  
  // Random color variants
  const colorVariant = Math.random();
  let particleColor;
  
  if (colorVariant < 0.6) {
    // Main flame color based on settings
    particleColor = `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, 0.8)`;
  } else if (colorVariant < 0.8) {
    // Darker color
    particleColor = `rgba(${baseColor.r * 0.7}, ${baseColor.g * 0.3}, ${baseColor.b * 0.1}, 0.8)`;
  } else {
    // Yellow/white hot center
    particleColor = `rgba(255, 255, ${150 + Math.random() * 105}, 0.8)`;
  }
  
  // Lifespan
  const maxLife = 30 + Math.random() * 40 + intensity * 30;
  
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
    maxLife
  };
  
  particles.push(particle);
  
  // Limit number of particles
  if (particles.length > maxParticles) {
    particles.shift();
  }
}

function drawFireParticle(ctx: CanvasRenderingContext2D, particle: Particle) {
  // Set global alpha for fading effect
  ctx.globalAlpha = particle.alpha;
  
  // Draw the particle
  ctx.beginPath();
  ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
  ctx.fillStyle = particle.color;
  ctx.fill();
  
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
