import { VisualizerSettings } from '@/hooks/useAudioVisualization';
import { getYPositionForPlacement, getXPositionForPlacement } from './utils';

interface LightningBolt {
  x: number;
  y: number;
  angle: number;
  speed: number;
  intensity: number;
  segments: number[];
  width: number;
  color: string;
  branches: LightningBranch[];
  age: number;
  maxAge: number;
}

interface LightningBranch {
  startIndex: number;
  angle: number;
  length: number;
  segments: number[];
  width: number;
}

// Pool of lightning bolts for reuse
const lightningBolts: LightningBolt[] = [];
const maxBolts = 8;

export const drawLightningAnimation = (
  ctx: CanvasRenderingContext2D,
  dataArray: Uint8Array,
  canvas: HTMLCanvasElement,
  bufferLength: number,
  timestamp: number,
  settings: VisualizerSettings
) => {
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  
  // For lightning, use a nice color that looks like electricity
  const primaryColor = settings.color;
  const glowColor = settings.color + "99";
  
  // Initialize lightning bolts if needed
  if (lightningBolts.length === 0) {
    for (let i = 0; i < maxBolts; i++) {
      createLightningBolt(canvasWidth, canvasHeight, dataArray, settings);
    }
  }
  
  // Calculate average audio intensity for this frame
  let averageIntensity = 0;
  for (let i = 0; i < bufferLength; i++) {
    averageIntensity += dataArray[i] / 255.0;
  }
  averageIntensity /= bufferLength;
  
  // Clear the canvas with a dark background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  
  // Update and draw each lightning bolt
  for (let i = 0; i < lightningBolts.length; i++) {
    const bolt = lightningBolts[i];
    
    // Update bolt position based on its angle and speed
    bolt.x += Math.cos(bolt.angle) * bolt.speed;
    bolt.y += Math.sin(bolt.angle) * bolt.speed;
    
    // Increase age
    bolt.age += 1;
    
    // Reset bolt if it moved off screen or reached max age
    if (bolt.x < -100 || bolt.x > canvasWidth + 100 || 
        bolt.y < -100 || bolt.y > canvasHeight + 100 ||
        bolt.age > bolt.maxAge) {
      // Reposition on the opposite side of the canvas
      resetLightningBolt(bolt, canvasWidth, canvasHeight, dataArray, settings);
    }
    
    // Draw the lightning bolt
    drawDynamicLightningBolt(ctx, bolt, primaryColor, glowColor, averageIntensity * settings.sensitivity, timestamp);
  }
};

function createLightningBolt(
  canvasWidth: number,
  canvasHeight: number,
  dataArray: Uint8Array,
  settings: VisualizerSettings
): LightningBolt {
  // Calculate average audio intensity
  let avgIntensity = 0;
  for (let i = 0; i < Math.min(dataArray.length, 32); i++) {
    avgIntensity += dataArray[i] / 255.0;
  }
  avgIntensity = Math.max(0.3, avgIntensity / 32);
  
  // Generate random position, usually starting from edges
  const startEdge = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
  let x, y;
  
  switch (startEdge) {
    case 0: // top
      x = Math.random() * canvasWidth;
      y = -20;
      break;
    case 1: // right
      x = canvasWidth + 20;
      y = Math.random() * canvasHeight;
      break;
    case 2: // bottom
      x = Math.random() * canvasWidth;
      y = canvasHeight + 20;
      break;
    default: // left
      x = -20;
      y = Math.random() * canvasHeight;
      break;
  }
  
  // Create random angle (slightly biased toward the center of the canvas)
  const centerAngle = Math.atan2(canvasHeight/2 - y, canvasWidth/2 - x);
  let angle = centerAngle + (Math.random() - 0.5) * Math.PI / 2;
  
  // Create segments array with random values
  const segmentCount = 10 + Math.floor(Math.random() * 15);
  const segments = [];
  for (let i = 0; i < segmentCount; i++) {
    segments.push(Math.random() * 2 - 1);
  }
  
  // Create branches
  const branchCount = Math.floor(Math.random() * 3) + 1;
  const branches = [];
  
  for (let i = 0; i < branchCount; i++) {
    const startIndex = Math.floor(Math.random() * (segmentCount - 4)) + 2;
    const branchSegments = [];
    const branchSegmentCount = 3 + Math.floor(Math.random() * 5);
    
    for (let j = 0; j < branchSegmentCount; j++) {
      branchSegments.push(Math.random() * 2 - 1);
    }
    
    branches.push({
      startIndex,
      angle: (Math.random() - 0.5) * Math.PI / 2,
      length: 10 + Math.random() * 40,
      segments: branchSegments,
      width: 1 + Math.random()
    });
  }
  
  // Create and add the bolt
  const bolt: LightningBolt = {
    x,
    y,
    angle,
    speed: 2 + Math.random() * 5 * settings.sensitivity,
    intensity: 0.5 + Math.random() * 0.5,
    segments,
    width: 2 + Math.random() * 3,
    color: settings.color,
    branches,
    age: 0,
    maxAge: 30 + Math.floor(Math.random() * 30)
  };
  
  lightningBolts.push(bolt);
  return bolt;
}

function resetLightningBolt(
  bolt: LightningBolt,
  canvasWidth: number,
  canvasHeight: number,
  dataArray: Uint8Array,
  settings: VisualizerSettings
) {
  // Position on an edge based on previous direction
  // This creates the effect of appearing on the opposite side
  if (bolt.x < 0) {
    bolt.x = canvasWidth + 20;
    bolt.y = Math.random() * canvasHeight;
  } else if (bolt.x > canvasWidth) {
    bolt.x = -20;
    bolt.y = Math.random() * canvasHeight;
  } else if (bolt.y < 0) {
    bolt.x = Math.random() * canvasWidth;
    bolt.y = canvasHeight + 20;
  } else {
    bolt.x = Math.random() * canvasWidth;
    bolt.y = -20;
  }
  
  // New random angle (slightly biased toward the center)
  const centerAngle = Math.atan2(canvasHeight/2 - bolt.y, canvasWidth/2 - bolt.x);
  bolt.angle = centerAngle + (Math.random() - 0.5) * Math.PI / 2;
  
  // Update other properties
  bolt.speed = 2 + Math.random() * 5 * settings.sensitivity;
  bolt.intensity = 0.5 + Math.random() * 0.5;
  bolt.width = 2 + Math.random() * 3;
  bolt.age = 0;
  bolt.maxAge = 30 + Math.floor(Math.random() * 30);
  
  // Regenerate segments
  const segmentCount = 10 + Math.floor(Math.random() * 15);
  bolt.segments = [];
  for (let i = 0; i < segmentCount; i++) {
    bolt.segments.push(Math.random() * 2 - 1);
  }
  
  // Regenerate branches
  const branchCount = Math.floor(Math.random() * 3) + 1;
  bolt.branches = [];
  
  for (let i = 0; i < branchCount; i++) {
    const startIndex = Math.floor(Math.random() * (segmentCount - 4)) + 2;
    const branchSegments = [];
    const branchSegmentCount = 3 + Math.floor(Math.random() * 5);
    
    for (let j = 0; j < branchSegmentCount; j++) {
      branchSegments.push(Math.random() * 2 - 1);
    }
    
    bolt.branches.push({
      startIndex,
      angle: (Math.random() - 0.5) * Math.PI / 2,
      length: 10 + Math.random() * 40,
      segments: branchSegments,
      width: 1 + Math.random()
    });
  }
}

function drawDynamicLightningBolt(
  ctx: CanvasRenderingContext2D,
  bolt: LightningBolt,
  primaryColor: string,
  glowColor: string,
  intensity: number,
  timestamp: number
) {
  const { x, y, segments, width, branches } = bolt;
  
  // Set up for drawing
  ctx.strokeStyle = primaryColor;
  ctx.lineWidth = width;
  ctx.lineJoin = 'miter';
  ctx.lineCap = 'round';
  
  // Add glow effect
  ctx.shadowBlur = 15;
  ctx.shadowColor = glowColor;
  
  // Calculate segment length
  const mainLength = 200 * (0.5 + intensity);
  const segmentLength = mainLength / segments.length;
  
  // Start drawing the main bolt
  ctx.beginPath();
  ctx.moveTo(x, y);
  
  // Variables to keep track of current position
  let currentX = x;
  let currentY = y;
  
  // Randomize based on time for flickering effect
  const timeVariance = Math.sin(timestamp / 200) * 5;
  
  // Draw each segment of the lightning bolt
  for (let i = 0; i < segments.length; i++) {
    // Calculate new position
    const segmentAngle = bolt.angle + segments[i] * 0.5;
    const nextX = currentX + Math.cos(segmentAngle) * segmentLength;
    const nextY = currentY + Math.sin(segmentAngle) * segmentLength;
    
    // Add slight jitter based on time
    const jitterX = (Math.random() - 0.5) * 4 * intensity + timeVariance;
    const jitterY = (Math.random() - 0.5) * 4 * intensity + timeVariance;
    
    // Draw line to next point
    ctx.lineTo(nextX + jitterX, nextY + jitterY);
    
    // Draw branches at their starting points
    branches.forEach(branch => {
      if (branch.startIndex === i) {
        drawBranch(
          ctx, 
          currentX, 
          currentY, 
          bolt.angle + branch.angle, 
          branch.length * intensity, 
          branch.segments, 
          branch.width, 
          intensity,
          timeVariance
        );
      }
    });
    
    // Update current position
    currentX = nextX;
    currentY = nextY;
  }
  
  // Finish drawing the main bolt
  ctx.stroke();
  
  // Reset shadow for other drawings
  ctx.shadowBlur = 0;
}

function drawBranch(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  angle: number,
  length: number,
  segments: number[],
  width: number,
  intensity: number,
  timeVariance: number
) {
  // Set width for branch
  const origWidth = ctx.lineWidth;
  ctx.lineWidth = width;
  
  // Start drawing the branch
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  
  // Variables to keep track of current position
  let currentX = startX;
  let currentY = startY;
  
  // Calculate segment length
  const segmentLength = length / segments.length;
  
  // Draw each segment of the branch
  for (let i = 0; i < segments.length; i++) {
    // Calculate new position
    const segmentAngle = angle + segments[i] * 0.7;
    const nextX = currentX + Math.cos(segmentAngle) * segmentLength;
    const nextY = currentY + Math.sin(segmentAngle) * segmentLength;
    
    // Add slight jitter based on time
    const jitterX = (Math.random() - 0.5) * 3 * intensity + timeVariance;
    const jitterY = (Math.random() - 0.5) * 3 * intensity + timeVariance;
    
    // Draw line to next point
    ctx.lineTo(nextX + jitterX, nextY + jitterY);
    
    // Update current position
    currentX = nextX;
    currentY = nextY;
  }
  
  // Finish drawing the branch
  ctx.stroke();
  
  // Restore original line width
  ctx.lineWidth = origWidth;
}
