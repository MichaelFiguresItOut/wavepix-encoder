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
  progress: number; // Progress along the path (0-1)
  targetX: number; // Target endpoint X
  targetY: number; // Target endpoint Y
  audioReactivity: number; // How much this bolt reacts to audio
  isSheetLightning?: boolean; // Whether this is a sheet lightning pattern
  sheetOpacity?: number; // Opacity of sheet lightning effect
  sheetColor?: string; // Color of sheet lightning
  fadeOut?: number; // Fade out speed when audio stops (0-1)
}

interface LightningBranch {
  startIndex: number;
  angle: number;
  length: number;
  segments: number[];
  width: number;
  progress?: number; // Progress of branch growth (0-1)
  complete?: boolean; // Whether branch has fully formed
  color?: string; // Optional custom color
  sheetBrightness?: number; // Brightness for sheet lightning effect
}

// Pool of lightning bolts for reuse
const lightningBolts: LightningBolt[] = [];
const maxBolts = 8; // Increased for more sheet lightning effect

// Audio reactivity
const audioHistory: number[] = Array(10).fill(0); // Increased history for better rhythm detection
let lastStrike = 0;
let lastAudioPeak = 0;
let noAudioFrames = 0; // Count frames with low audio to detect when audio stops
let prevAverageIntensity = 0; // Used to track changes in intensity

// Sheet lightning effect
let hasSheetLightning = false;
let sheetLightningTimer = 0;
let rhythmDetection: number[] = []; // Store time between peaks to detect rhythm

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
  
  // Calculate audio intensity with different frequency ranges
  // Low frequencies for thunder effect
  let bassIntensity = 0;
  for (let i = 0; i < Math.min(bufferLength / 4, 32); i++) {
    bassIntensity += dataArray[i] / 255.0;
  }
  bassIntensity /= Math.min(bufferLength / 4, 32);
  
  // Mid frequencies for rhythm detection
  let midIntensity = 0;
  const midStart = Math.floor(bufferLength * 0.25);
  const midEnd = Math.floor(bufferLength * 0.6);
  for (let i = midStart; i < midEnd; i++) {
    midIntensity += dataArray[i] / 255.0;
  }
  midIntensity /= (midEnd - midStart);
  
  // High frequencies for crackling effect
  let highIntensity = 0;
  const highStart = Math.floor(bufferLength * 0.6);
  for (let i = highStart; i < bufferLength; i++) {
    highIntensity += dataArray[i] / 255.0;
  }
  highIntensity /= (bufferLength - highStart);
  
  // Update audio history and detect peaks
  audioHistory.shift();
  audioHistory.push(bassIntensity);
  
  const averageAudio = audioHistory.reduce((sum, val) => sum + val, 0) / audioHistory.length;
  const isPeak = bassIntensity > averageAudio * 1.5 && midIntensity > 0.45 && timestamp - lastAudioPeak > 200;
  
  // Detect rhythm patterns
  if (isPeak) {
    if (lastAudioPeak > 0) {
      const peakInterval = timestamp - lastAudioPeak;
      rhythmDetection.push(peakInterval);
      
      // Keep only last 8 intervals for rhythm detection
      if (rhythmDetection.length > 8) {
        rhythmDetection.shift();
      }
    }
    
    lastAudioPeak = timestamp;
  }
  
  // Detect if we have a consistent rhythm
  let hasRhythm = false;
  if (rhythmDetection.length >= 3) {
    const avgInterval = rhythmDetection.reduce((sum, val) => sum + val, 0) / rhythmDetection.length;
    // Calculate variance to detect consistency
    const variance = rhythmDetection.reduce((sum, val) => sum + Math.abs(val - avgInterval), 0) / rhythmDetection.length;
    
    // If variance is low enough, we have a consistent rhythm
    hasRhythm = variance < avgInterval * 0.3;
  }
  
  // Average audio intensity for this frame
  const averageIntensity = (bassIntensity * 0.5 + midIntensity * 0.3 + highIntensity * 0.2) * settings.sensitivity;
  
  // Detect significant changes in audio intensity (for dramatic lightning)
  const intensityChange = Math.abs(averageIntensity - prevAverageIntensity);
  const dramaticChange = intensityChange > 0.25;
  prevAverageIntensity = averageIntensity;
  
  // Check for no audio to fade out lightning
  if (averageIntensity < 0.15) {
    noAudioFrames++;
  } else {
    noAudioFrames = 0;
  }
  const audioStopped = noAudioFrames > 30; // About 0.5 seconds of low audio
  
  // Initialize lightning bolts based on audio characteristics
  // More bolts on peaks, rhythm points, or dramatic changes
  if ((lightningBolts.length < 2 && averageIntensity > 0.4) || 
      (isPeak && timestamp - lastStrike > 250) || 
      (dramaticChange && timestamp - lastStrike > 500)) {
    
    // Create more bolts during intense audio
    const boltCount = dramaticChange ? 
      Math.floor(2 + Math.random() * 2) : 
      Math.floor(1 + Math.random() * 2);
    
    // Create bolts with sheet lightning effect during peaks with good rhythm
    const useSheetLightning = isPeak && hasRhythm && Math.random() < 0.7;
    
    for (let i = 0; i < boltCount; i++) {
      const newBolt = createLightningBolt(canvasWidth, canvasHeight, dataArray, settings, averageIntensity);
      
      // Configure sheet lightning for rhythm-synced bolts
      if (useSheetLightning && i === 0) {
        newBolt.isSheetLightning = true;
        newBolt.sheetOpacity = 0.2 + Math.random() * 0.3;
        hasSheetLightning = true;
        sheetLightningTimer = timestamp;
      }
    }
    
    lastStrike = timestamp;
  }
  
  // Clear the canvas with a transparent dark background
  // More transparency with higher intensity for flash effect
  const fadeAlpha = audioStopped ? 0.3 : (0.15 + 0.1 * (1 - averageIntensity));
  ctx.fillStyle = `rgba(0, 0, 0, ${fadeAlpha})`;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  
  // Add sheet lightning background glow on rhythm peaks
  if (hasSheetLightning && (timestamp - sheetLightningTimer < 300)) {
    const fadeRatio = 1 - ((timestamp - sheetLightningTimer) / 300);
    const flashColor = settings.color === '#ffffff' ? '#aaddff' : settings.color;
    
    // Parse color components for glow
    const r = parseInt(flashColor.slice(1, 3), 16);
    const g = parseInt(flashColor.slice(3, 5), 16);
    const b = parseInt(flashColor.slice(5, 7), 16);
    
    // Create a radial gradient for sheet lightning effect
    const centerX = canvasWidth * (0.3 + Math.random() * 0.4);
    const centerY = canvasHeight * (0.2 + Math.random() * 0.3);
    const radius = Math.max(canvasWidth, canvasHeight) * 0.8;
    
    const grd = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    grd.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${0.15 * fadeRatio})`);
    grd.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, ${0.05 * fadeRatio})`);
    grd.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  } else {
    hasSheetLightning = false;
  }
  
  // Add flash effect on audio peaks or dramatic changes
  if ((isPeak && bassIntensity > 0.65) || dramaticChange) {
    const flashIntensity = dramaticChange ? 0.18 : 0.12;
    const flashColor = settings.color === '#ffffff' ? '#aaddff' : settings.color;
    
    ctx.fillStyle = `rgba(${parseInt(flashColor.slice(1, 3), 16)}, 
                          ${parseInt(flashColor.slice(3, 5), 16)}, 
                          ${parseInt(flashColor.slice(5, 7), 16)}, 
                          ${flashIntensity})`;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  }
  
  // Update and draw each lightning bolt
  for (let i = lightningBolts.length - 1; i >= 0; i--) {
    const bolt = lightningBolts[i];
    
    // Increase age
    bolt.age += 1;
    
    // Adjust behavior based on audio presence
    if (audioStopped && !bolt.fadeOut) {
      bolt.fadeOut = 0.05 + Math.random() * 0.15; // Start fade out
    }
    
    // Progress the lightning along its path
    if (bolt.progress < 1) {
      // Lightning progresses faster with higher audio intensity and during peaks
      const speedFactor = isPeak ? 1.5 : 1.0;
      bolt.progress += (0.03 + 0.1 * bolt.audioReactivity * averageIntensity) * speedFactor;
    }
    
    // Move the bolt across the screen after it's fully formed
    if (bolt.progress >= 1) {
      // Move faster during high intensity, slower when audio stops
      const moveFactor = audioStopped ? 0.5 : (1.0 + averageIntensity * 0.5);
      bolt.x += Math.cos(bolt.angle) * bolt.speed * moveFactor;
      bolt.y += Math.sin(bolt.angle) * bolt.speed * moveFactor;
      
      // Move target point as well
      bolt.targetX += Math.cos(bolt.angle) * bolt.speed * moveFactor;
      bolt.targetY += Math.sin(bolt.angle) * bolt.speed * moveFactor;
      
      // Occasionally change direction for more chaotic movement during high intensity
      if (!audioStopped && highIntensity > 0.6 && Math.random() < 0.03) {
        bolt.angle += (Math.random() - 0.5) * 0.4;
      }
    }
    
    // Create new branches randomly as lightning progresses, influenced by high frequencies
    if (bolt.progress > 0.2 && bolt.progress < 0.9 && 
        bolt.branches.length < 8 && 
        Math.random() < 0.05 + highIntensity * 0.25) {
      
      // Find the current segment
      const segmentIndex = Math.floor(bolt.progress * bolt.segments.length);
      if (segmentIndex > 1 && segmentIndex < bolt.segments.length - 2) {
        createLightningBranch(bolt, segmentIndex, primaryColor, highIntensity);
      }
    }
    
    // Update branches progress
    for (const branch of bolt.branches) {
      if (!branch.progress) branch.progress = 0;
      if (!branch.complete && branch.progress < 1) {
        // Branches grow faster during peaks
        const branchSpeedFactor = isPeak ? 1.3 : 1.0;
        branch.progress += (0.08 + 0.12 * averageIntensity) * branchSpeedFactor;
        if (branch.progress >= 1) {
          branch.complete = true;
        }
      }
    }
    
    // Handle fade out when audio stops
    if (bolt.fadeOut) {
      bolt.intensity *= (1 - bolt.fadeOut);
      if (bolt.intensity < 0.1) {
        // Remove when almost invisible
        lightningBolts.splice(i, 1);
        continue;
      }
    }
    
    // Remove bolt if it moved off screen or reached max age
    if (bolt.x < -canvasWidth * 0.5 || bolt.x > canvasWidth * 1.5 || 
        bolt.y < -canvasHeight * 0.5 || bolt.y > canvasHeight * 1.5 ||
        bolt.age > bolt.maxAge) {
      lightningBolts.splice(i, 1);
      continue;
    }
    
    // Draw the lightning bolt with flicker based on high frequencies
    const flickerIntensity = audioStopped ? 0.5 : (0.7 + 0.3 * highIntensity);
    drawDynamicLightningBolt(
      ctx, 
      bolt, 
      primaryColor, 
      glowColor, 
      averageIntensity * flickerIntensity, 
      timestamp,
      isPeak
    );
  }
  
  // Add distant lightning flash effects randomly or on rhythm
  const randomFlashChance = hasRhythm ? 
    0.01 + bassIntensity * 0.08 : 
    0.005 + bassIntensity * 0.03;
    
  if (Math.random() < randomFlashChance) {
    // Brighter flashes when synced with rhythm
    const flashIntensity = hasRhythm ? 
      0.08 + Math.random() * 0.12 : 
      0.03 + Math.random() * 0.06;
      
    const flashColor = settings.color === '#ffffff' ? '#aaddff' : settings.color;
    ctx.fillStyle = `rgba(${parseInt(flashColor.slice(1, 3), 16)}, 
                          ${parseInt(flashColor.slice(3, 5), 16)}, 
                          ${parseInt(flashColor.slice(5, 7), 16)}, 
                          ${flashIntensity})`;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  }
};

function createLightningBolt(
  canvasWidth: number,
  canvasHeight: number,
  dataArray: Uint8Array,
  settings: VisualizerSettings,
  audioIntensity: number
): LightningBolt {
  // Calculate average audio intensity for initial properties
  let avgIntensity = audioIntensity || 0.5;
  
  // Lightning primarily moves horizontally across the sky
  // Determine start and end points for more natural lightning path
  let startX, startY, targetX, targetY;
  
  // Start position based on audio intensity - higher intensity means more dramatic lightning
  const startPosition = Math.random() < 0.7 ? 0 : // top (most common)
                        (Math.random() < 0.5 ? 1 : 3); // sides
  
  // More chaotic starting positions during high intensity
  const randomOffset = avgIntensity > 0.7 ? 
                       (Math.random() - 0.5) * canvasWidth * 0.4 : 
                       (Math.random() - 0.5) * canvasWidth * 0.2;
  
  switch (startPosition) {
    case 0: // top (most common for sheet lightning)
      startX = (canvasWidth * 0.5) + randomOffset;
      startY = -20 - Math.random() * 40; // Slightly randomized start height
      break;
    case 1: // right
      startX = canvasWidth + 20;
      startY = Math.random() * (canvasHeight * 0.4);
      break;
    case 3: // left
      startX = -20;
      startY = Math.random() * (canvasHeight * 0.4);
      break;
    default: // top again as fallback
      startX = (canvasWidth * 0.5) + randomOffset;
      startY = -20;
  }
  
  // For sheet lightning, target point spreads wider and doesn't go as deep
  // More horizontal spread for sheet lightning effect
  const isSheetPattern = Math.random() < 0.6 && startPosition === 0;
  
  // Target point varies based on intensity and pattern
  if (isSheetPattern) {
    // Sheet lightning spreads more horizontally and not as deep
    targetX = startX + (Math.random() - 0.5) * canvasWidth * (1.0 + avgIntensity);
    targetY = Math.min(canvasHeight * 0.6, startY + canvasHeight * (0.3 + Math.random() * 0.3));
  } else {
    // Regular lightning can go deeper
    targetX = startX + (Math.random() - 0.5) * canvasWidth * 1.2;
    targetY = Math.min(canvasHeight * 0.8, startY + canvasHeight * (0.5 + Math.random() * 0.3));
  }
  
  // Calculate initial angle toward target with randomness
  const angleBasis = Math.atan2(targetY - startY, targetX - startX);
  // More deviation for higher intensity
  const angleDeviation = (Math.random() - 0.5) * (0.2 + avgIntensity * 0.2);
  const angle = angleBasis + angleDeviation;
  
  // Create segments with more jagged angles for realism
  // More segments = more detailed lightning
  // Higher intensity = more segments
  const segmentCount = 12 + Math.floor(Math.random() * 10 + avgIntensity * 10);
  const segments = [];
  
  // Previous segment angle helps create continuous but jagged path
  let prevAngle = 0;
  
  for (let i = 0; i < segmentCount; i++) {
    // Position along bolt (0-1)
    const position = i / segmentCount;
    
    // Create more jagged deviations in the middle, straighter at start/end
    // Sheet lightning has less jaggedness overall
    const jaggerFactor = isSheetPattern ?
      Math.sin(position * Math.PI) * 1.0 :
      Math.sin(position * Math.PI) * (1.5 + avgIntensity * 0.5);
    
    // Each segment deviates from main path, but maintains some continuity with previous segment
    const deviation = (Math.random() - 0.5) * jaggerFactor;
    
    // Weight between previous angle and random deviation
    // Sheet lightning has more continuity
    const continuity = isSheetPattern ? 
      0.4 + 0.3 * Math.random() : 
      0.2 + 0.4 * Math.random();
      
    const newAngle = prevAngle * continuity + deviation * (1 - continuity);
    
    segments.push(newAngle);
    prevAngle = newAngle;
  }
  
  // Create initial branches at different points
  // Better lightning bolts have more branches
  const maxInitialBranches = isSheetPattern ? 5 : 3;
  const initialBranchCount = Math.floor(1 + Math.random() * maxInitialBranches * (0.5 + avgIntensity * 0.7));
  const branches = [];
  
  // Custom color for sheet lightning - slightly bluer than main color
  const boltColor = settings.color;
  let sheetColor = boltColor;
  
  // Make sheet lightning slightly bluer if not already blue
  if (isSheetPattern && boltColor !== '#ffffff') {
    const r = Math.max(0, parseInt(boltColor.slice(1, 3), 16) - 20);
    const g = Math.min(255, parseInt(boltColor.slice(3, 5), 16) + 20);
    const b = Math.min(255, parseInt(boltColor.slice(5, 7), 16) + 40);
    sheetColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
  
  // Add initial branches
  for (let i = 0; i < initialBranchCount; i++) {
    // Branches start from different segments, more toward the middle for sheet lightning
    const branchPos = isSheetPattern ? 
      0.2 + Math.random() * 0.6 : // More evenly distributed for sheet lightning
      0.3 + Math.random() * 0.5;  // Regular lightning branches
      
    const startIndex = Math.floor(segmentCount * branchPos);
    
    if (startIndex >= 2 && startIndex < segmentCount - 2) {
      createBranchAndAdd(branches, startIndex, isSheetPattern, boltColor);
    }
  }
  
  // Determine max age based on audio intensity and pattern
  const baseMaxAge = isSheetPattern ? 35 : 25;
  const maxAgeVariance = isSheetPattern ? 20 : 15;
  const maxAge = baseMaxAge + Math.floor(Math.random() * maxAgeVariance * (1 + avgIntensity * 0.5));
  
  // Create and add the bolt
  const bolt: LightningBolt = {
    x: startX,
    y: startY,
    angle,
    speed: 2 + Math.random() * 5 * settings.sensitivity * (isSheetPattern ? 0.8 : 1.2),
    intensity: 0.6 + Math.random() * 0.4,
    segments,
    width: isSheetPattern ? 
      3 + Math.random() * 4 * avgIntensity : // Wider for sheet lightning
      2 + Math.random() * 3 * avgIntensity,
    color: boltColor,
    branches,
    age: 0,
    maxAge,
    progress: 0, // Starts at 0, will animate to 1
    targetX,
    targetY,
    audioReactivity: 0.7 + Math.random() * 0.5, // How responsive this bolt is to audio
    isSheetLightning: isSheetPattern,
    sheetOpacity: isSheetPattern ? 0.1 + Math.random() * 0.2 : undefined,
    sheetColor: isSheetPattern ? sheetColor : undefined
  };
  
  lightningBolts.push(bolt);
  return bolt;
}

function createBranchAndAdd(
  branches: LightningBranch[], 
  startIndex: number,
  isSheetLightning: boolean = false,
  parentColor: string = '#ffffff'
): LightningBranch {
  // Create branch segments with similar jaggedness to main bolt
  const branchSegmentCount = isSheetLightning ?
    3 + Math.floor(Math.random() * 5) : // More segments for sheet lightning
    2 + Math.floor(Math.random() * 3);
    
  const branchSegments = [];
  
  let prevAngle = 0;
  for (let j = 0; j < branchSegmentCount; j++) {
    const position = j / branchSegmentCount;
    
    // Sheet lightning branches have less jaggedness
    const jaggerFactor = isSheetLightning ?
      Math.sin(position * Math.PI) * 0.9 :
      Math.sin(position * Math.PI) * 1.2;
      
    const deviation = (Math.random() - 0.5) * jaggerFactor;
    
    // More continuity for sheet lightning
    const continuity = isSheetLightning ?
      0.4 + 0.3 * Math.random() :
      0.2 + 0.4 * Math.random();
      
    const newAngle = prevAngle * continuity + deviation * (1 - continuity);
    branchSegments.push(newAngle);
    prevAngle = newAngle;
  }
  
  // Generate a slightly different color for the branch
  let branchColor = parentColor;
  if (Math.random() < 0.4) {
    // Slightly vary the color for visual interest
    const r = Math.min(255, parseInt(parentColor.slice(1, 3), 16) + Math.floor((Math.random() - 0.3) * 30));
    const g = Math.min(255, parseInt(parentColor.slice(3, 5), 16) + Math.floor((Math.random() - 0.3) * 30));
    const b = Math.min(255, parseInt(parentColor.slice(5, 7), 16) + Math.floor((Math.random() - 0.3) * 30));
    branchColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
  
  // Sheet lightning has wider angle distribution and longer branches
  const branch: LightningBranch = {
    startIndex,
    angle: (Math.random() - 0.5) * Math.PI * (isSheetLightning ? 1.0 : 0.7), // Wider angle for sheet lightning
    length: isSheetLightning ?
      30 + Math.random() * 90 : // Longer for sheet lightning
      20 + Math.random() * 50,
    segments: branchSegments,
    width: isSheetLightning ?
      1.0 + Math.random() * 2.0 : // Wider for sheet lightning
      0.8 + Math.random() * 1.5,
    progress: 0,
    complete: false,
    color: branchColor,
    sheetBrightness: isSheetLightning ? 0.4 + Math.random() * 0.6 : undefined
  };
  
  branches.push(branch);
  return branch;
}

function createLightningBranch(
  bolt: LightningBolt, 
  segmentIndex: number, 
  color: string = '#ffffff',
  audioIntensity: number = 0.5
) {
  // Only add branch if not too many at this segment already
  const existingBranchesAtSegment = bolt.branches.filter(b => b.startIndex === segmentIndex).length;
  if (existingBranchesAtSegment > 1) return;
  
  // Create branch with dynamic properties
  const branch = createBranchAndAdd(
    bolt.branches, 
    segmentIndex, 
    bolt.isSheetLightning,
    bolt.color
  );
  
  // Audio intensity affects branch size
  const intensityFactor = 0.7 + audioIntensity * 0.6;
  
  // Branches that form later are generally smaller
  branch.length *= intensityFactor * 0.7;
  branch.width *= intensityFactor * 0.8;
}

function drawDynamicLightningBolt(
  ctx: CanvasRenderingContext2D,
  bolt: LightningBolt,
  primaryColor: string,
  glowColor: string,
  intensity: number,
  timestamp: number,
  isPeak: boolean = false
) {
  const { x, y, segments, width, branches, progress } = bolt;
  
  // For sheet lightning, use slightly different color
  const boltColor = bolt.isSheetLightning && bolt.sheetColor ? bolt.sheetColor : primaryColor;
  
  // Set up for drawing
  ctx.strokeStyle = boltColor;
  ctx.lineWidth = width;
  ctx.lineJoin = 'miter';
  ctx.lineCap = 'round';
  
  // Add glow effect - stronger for sheet lightning and during peaks
  const glowMultiplier = (bolt.isSheetLightning ? 1.5 : 1.0) * (isPeak ? 1.3 : 1.0);
  ctx.shadowBlur = 15 * intensity * glowMultiplier;
  
  // Customize glow color for sheet lightning
  if (bolt.isSheetLightning) {
    // Parse color components
    const r = parseInt(boltColor.slice(1, 3), 16);
    const g = parseInt(boltColor.slice(3, 5), 16);
    const b = parseInt(boltColor.slice(5, 7), 16);
    
    // Add more blue tint to glow for sheet lightning
    const glowR = Math.max(0, r - 20);
    const glowG = Math.min(255, g + 20);
    const glowB = Math.min(255, b + 40);
    
    ctx.shadowColor = `rgba(${glowR}, ${glowG}, ${glowB}, 0.8)`;
  } else {
    ctx.shadowColor = glowColor;
  }
  
  // Calculate full path length for progress calculation
  const segmentLength = (bolt.targetX && bolt.targetY) ? 
    Math.sqrt(Math.pow(bolt.targetX - x, 2) + Math.pow(bolt.targetY - y, 2)) / segments.length :
    200 / segments.length;
  
  // Start drawing the main bolt
  ctx.beginPath();
  ctx.moveTo(x, y);
  
  // Variables to keep track of current position
  let currentX = x;
  let currentY = y;
  
  // Randomize based on time for flickering effect
  // Sheet lightning has more subtle flickering
  const flickerSpeed = bolt.isSheetLightning ? 120 : 80;
  const flickerAmount = Math.sin(timestamp / flickerSpeed) * (bolt.isSheetLightning ? 1.5 : 2.5);
  
  // More complex time variance for realistic flicker
  const timeVariance = (
    Math.sin(timestamp / 80) + 
    Math.sin(timestamp / 73) * 0.7 + 
    Math.sin(timestamp / 37) * 0.3
  ) * 3 * intensity;
  
  // Calculate how many segments to draw based on progress
  const segmentsToRender = Math.ceil(segments.length * progress);
  
  // For fade out effect when audio stops
  const fadeRatio = bolt.fadeOut ? bolt.intensity : 1.0;
  
  // Sheet lightning specific pre-rendering: add a background glow
  if (bolt.isSheetLightning && bolt.sheetOpacity && bolt.sheetOpacity > 0) {
    // Save context to restore later
    ctx.save();
    
    // Draw a wider path with low opacity to create sheet effect
    ctx.shadowBlur = 30 * intensity;
    ctx.strokeStyle = `rgba(${parseInt(boltColor.slice(1, 3), 16)}, 
                           ${parseInt(boltColor.slice(3, 5), 16)}, 
                           ${parseInt(boltColor.slice(5, 7), 16)}, 
                           ${bolt.sheetOpacity * fadeRatio})`;
    ctx.lineWidth = width * 3;
    
    // Redraw the path
    ctx.beginPath();
    ctx.moveTo(x, y);
    
    let sheetX = x;
    let sheetY = y;
    
    // Draw with less jitter for the background sheet effect
    for (let i = 0; i < segmentsToRender; i++) {
      const segmentProgress = (i === segmentsToRender - 1 && progress < 1) ?
        (progress * segments.length) % 1 : 1;
      
      const baseAngle = i < segments.length - 1 ? 
        Math.atan2(bolt.targetY - y, bolt.targetX - x) : 0;
      const segmentAngle = baseAngle + segments[i] * 0.5; // Less jagged for sheet effect
      
      const positionFactor = 1 + Math.sin((i / segments.length) * Math.PI) * 0.3;
      const currentSegmentLength = segmentLength * positionFactor * segmentProgress;
      
      const nextX = sheetX + Math.cos(segmentAngle) * currentSegmentLength;
      const nextY = sheetY + Math.sin(segmentAngle) * currentSegmentLength;
      
      // Lower jitter for sheet effect background
      const jitterScale = Math.min(1, i / 5) * intensity * 0.5;
      const jitterX = (Math.random() - 0.5) * 3 * jitterScale;
      const jitterY = (Math.random() - 0.5) * 3 * jitterScale;
      
      ctx.lineTo(nextX + jitterX, nextY + jitterY);
      sheetX = nextX;
      sheetY = nextY;
    }
    
    ctx.stroke();
    ctx.restore();
    
    // Reset for main lightning drawing
    ctx.strokeStyle = boltColor;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x, y);
    currentX = x;
    currentY = y;
  }
  
  // Draw each segment of the lightning bolt
  for (let i = 0; i < segmentsToRender; i++) {
    // For last segment when still progressing, use partial length
    const segmentProgress = (i === segmentsToRender - 1 && progress < 1) ?
      (progress * segments.length) % 1 : 1;
    
    // Calculate new position with segment angle
    // Base angle points toward target, segment angles add deviation
    const baseAngle = i < segments.length - 1 ? 
      Math.atan2(bolt.targetY - y, bolt.targetX - x) : 0;
      
    // Adjust jaggedness based on bolt type
    const jaggedness = bolt.isSheetLightning ? 0.6 : 0.8;
    const segmentAngle = baseAngle + segments[i] * jaggedness;
    
    // Adjust segment length based on position (longer in middle)
    const positionFactor = 1 + Math.sin((i / segments.length) * Math.PI) * 0.3;
    const currentSegmentLength = segmentLength * positionFactor * segmentProgress;
    
    const nextX = currentX + Math.cos(segmentAngle) * currentSegmentLength;
    const nextY = currentY + Math.sin(segmentAngle) * currentSegmentLength;
    
    // Add flicker effect - more pronounced for later segments
    // Less flicker for sheet lightning for a smoother look
    const flickerScale = bolt.isSheetLightning ?
      Math.min(0.7, i / 5) * intensity :
      Math.min(1.0, i / 3) * intensity;
      
    const jitterX = (Math.random() - 0.5) * 6 * flickerScale + timeVariance;
    const jitterY = (Math.random() - 0.5) * 6 * flickerScale + flickerAmount;
    
    // Draw line to next point with added jitter
    ctx.lineTo(nextX + jitterX, nextY + jitterY);
    
    // Track segment endpoints for branches
    const segmentEndX = nextX + jitterX;
    const segmentEndY = nextY + jitterY;
    
    // Draw branches at their starting points
    for (const branch of branches) {
      if (branch.startIndex === i && branch.progress && branch.progress > 0) {
        drawLightningBranch(
          ctx, 
          currentX, 
          currentY, 
          segmentEndX, 
          segmentEndY,
          branch, 
          intensity,
          timeVariance,
          branch.progress,
          isPeak,
          fadeRatio
        );
      }
    }
    
    // Update current position
    currentX = nextX;
    currentY = nextY;
  }
  
  // Finish drawing the main bolt
  ctx.stroke();
  
  // Add additional glow for sheet lightning during peaks
  if (bolt.isSheetLightning && isPeak && progress >= 0.8) {
    ctx.save();
    ctx.strokeStyle = `rgba(${parseInt(boltColor.slice(1, 3), 16)}, 
                          ${parseInt(boltColor.slice(3, 5), 16)}, 
                          ${parseInt(boltColor.slice(5, 7), 16)}, 
                          ${0.3 * fadeRatio})`;
    ctx.lineWidth = width * 2;
    ctx.shadowBlur = 25 * intensity;
    ctx.beginPath();
    ctx.moveTo(x, y);
    
    // Simplified path with less segments for the glow effect
    const skipFactor = 2; // Draw every other point
    let glowX = x;
    let glowY = y;
    
    for (let i = 0; i < segmentsToRender; i += skipFactor) {
      const baseAngle = i < segments.length - 1 ? 
        Math.atan2(bolt.targetY - y, bolt.targetX - x) : 0;
      const segmentAngle = baseAngle + segments[i] * 0.4; // Even less jagged
      
      // Calculate longer segments to reduce jaggedness
      const glowSegmentLength = segmentLength * skipFactor;
      
      const nextX = glowX + Math.cos(segmentAngle) * glowSegmentLength;
      const nextY = glowY + Math.sin(segmentAngle) * glowSegmentLength;
      
      // Much less jitter
      const jitterX = (Math.random() - 0.5) * 2;
      const jitterY = (Math.random() - 0.5) * 2;
      
      ctx.lineTo(nextX + jitterX, nextY + jitterY);
      glowX = nextX;
      glowY = nextY;
    }
    
    ctx.stroke();
    ctx.restore();
  }
  
  // Reset shadow for other drawings
  ctx.shadowBlur = 0;
}

function drawLightningBranch(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  branch: LightningBranch,
  intensity: number,
  timeVariance: number,
  branchProgress: number = 1,
  isPeak: boolean = false,
  fadeRatio: number = 1.0
) {
  // Adjust line width for branch
  const originalLineWidth = ctx.lineWidth;
  ctx.lineWidth = branch.width;
  
  // Use custom color if provided
  if (branch.color) {
    ctx.strokeStyle = branch.color;
  }
  
  // Stronger glow for sheet lightning branches
  if (branch.sheetBrightness) {
    const originalBlur = ctx.shadowBlur;
    ctx.shadowBlur *= branch.sheetBrightness * (isPeak ? 1.3 : 1.0);
  }
  
  // Calculate branch direction from main bolt segment
  const mainSegmentAngle = Math.atan2(endY - startY, endX - startX);
  const branchAngle = mainSegmentAngle + branch.angle;
  
  // Calculate branch base positioning (start slightly along the branch angle)
  const branchStartOffset = 2; 
  const branchStartX = startX + Math.cos(branchAngle) * branchStartOffset;
  const branchStartY = startY + Math.sin(branchAngle) * branchStartOffset;
  
  // Begin drawing the branch
  ctx.beginPath();
  ctx.moveTo(branchStartX, branchStartY);
  
  // Calculate the actual branch length based on progress
  const actualLength = branch.length * branchProgress;
  const segmentLength = actualLength / branch.segments.length;
  
  // Calculate how many segments to render based on progress
  const segmentsToRender = Math.ceil(branch.segments.length * branchProgress);
  
  // Variables to track current position
  let currentX = branchStartX;
  let currentY = branchStartY;
  
  // Draw each branch segment
  for (let i = 0; i < segmentsToRender; i++) {
    // For the last segment, calculate partial length if needed
    const segmentProgress = (i === segmentsToRender - 1 && branchProgress < 1) ? 
      (branchProgress * branch.segments.length) % 1 : 1;
    
    // Calculate segment angle with deviation
    const segmentAngle = branchAngle + branch.segments[i];
    
    // Calculate next position
    const nextX = currentX + Math.cos(segmentAngle) * segmentLength * segmentProgress;
    const nextY = currentY + Math.sin(segmentAngle) * segmentLength * segmentProgress;
    
    // Add jitter for flickering effect - scaled by intensity
    // More during peaks, less for sheet lightning branches
    const jitterAmount = intensity * (isPeak ? 4 : 3) * (branch.sheetBrightness ? 0.7 : 1.0);
    const jitterX = (Math.random() - 0.5) * jitterAmount + timeVariance * 0.5;
    const jitterY = (Math.random() - 0.5) * jitterAmount;
    
    // Draw line to next point
    ctx.lineTo(nextX + jitterX, nextY + jitterY);
    
    // Update current position
    currentX = nextX;
    currentY = nextY;
  }
  
  // Add glow for sheet lightning branches
  if (branch.sheetBrightness && branch.sheetBrightness > 0.7 && branchProgress > 0.8) {
    // Add a secondary glow stroke
    ctx.stroke();
    
    // Save settings to restore later
    const originalStroke = ctx.strokeStyle;
    const originalWidth = ctx.lineWidth;
    
    // Draw a wider, more transparent path
    const color = originalStroke.toString();
    if (color.startsWith('#') || color.startsWith('rgb')) {
      let r, g, b;
      if (color.startsWith('#')) {
        r = parseInt(color.slice(1, 3), 16);
        g = parseInt(color.slice(3, 5), 16);
        b = parseInt(color.slice(5, 7), 16);
      } else {
        const match = color.match(/\d+/g);
        if (match && match.length >= 3) {
          r = parseInt(match[0]);
          g = parseInt(match[1]);
          b = parseInt(match[2]);
        } else {
          r = 255; g = 255; b = 255; // Fallback to white
        }
      }
      
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${0.2 * fadeRatio})`;
      ctx.lineWidth = originalWidth * 2;
      
      // Redraw the same path for the glow
      ctx.stroke();
      
      // Restore original settings
      ctx.strokeStyle = originalStroke;
      ctx.lineWidth = originalWidth;
    }
  } else {
    // Normal stroke for regular branches
    ctx.stroke();
  }
  
  // Restore original line width
  ctx.lineWidth = originalLineWidth;
}
