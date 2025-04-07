import { VisualizerSettings } from '@/hooks/useAudioVisualization';

// --- Interfaces ---
interface LightningPoint {
  x: number;
  y: number;
}

interface LightningSegment {
  start: LightningPoint;
  end: LightningPoint;
  width: number;
  intensity: number; // Controls brightness/glow
  angle: number; // Angle of this segment relative to parent or initial direction
  length: number;
  children: LightningSegment[]; // Sub-branches
  depth: number; // Recursion depth
}

interface LightningBolt {
  id: number; // Unique ID for tracking
  rootSegment: LightningSegment; // Starting point of the fractal structure
  creationTime: number;
  maxAge: number;
  currentAge: number;
  audioIntensitySnapshot: number; // Intensity at creation, for fading reference
  isFadingOut: boolean;
  currentX: number;
  currentY: number;
  speedX: number;
  speedY: number;
}

// --- Global State ---
let currentBolt: LightningBolt | null = null;
let nextBoltId = 0;
const MAX_RECURSION_DEPTH = 4;

// Audio processing state
const audioHistory: number[] = Array(10).fill(0);
let lastAudioPeakTime = 0;
let noAudioFrames = 0;
let rhythmDetection: number[] = []; // Store time between peaks

// --- Constants ---
const BASE_MAX_AGE = 300; // Longer lifespan for continuous bolt (frames)
const PEAK_MAX_AGE_BONUS = 100;
const BASE_SPEED_X = 6; // Changed to X for horizontal lightning movement
const BASE_SPEED_Y = 2; // Reduced Y speed for diagonal movement
const AUDIO_SPEED_FACTOR = 10;
const FADE_OUT_RATE = 0.95; // Multiplier per frame when fading
const MAX_BRANCH_INTENSITY = 0.7; // How bright branches can be relative to trunk

// --- Main Drawing Function ---
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
  const primaryColor = settings.color;
  const glowColor = settings.color + "99"; // Base glow

  // --- Audio Analysis ---
  let bassIntensity = 0;
  for (let i = 0; i < Math.min(bufferLength / 4, 32); i++) bassIntensity += dataArray[i];
  bassIntensity = (bassIntensity / Math.min(bufferLength / 4, 32)) / 255.0;

  let midIntensity = 0;
  const midStart = Math.floor(bufferLength * 0.25);
  const midEnd = Math.floor(bufferLength * 0.6);
  for (let i = midStart; i < midEnd; i++) midIntensity += dataArray[i];
  midIntensity = midIntensity / (midEnd - midStart) / 255.0;

  let highIntensity = 0;
  const highStart = Math.floor(bufferLength * 0.6);
  for (let i = highStart; i < bufferLength; i++) highIntensity += dataArray[i];
  highIntensity = highIntensity / (bufferLength - highStart) / 255.0;

  const overallIntensity = (bassIntensity * 0.4 + midIntensity * 0.4 + highIntensity * 0.2);
  const reactiveIntensity = overallIntensity * settings.sensitivity;

  // Peak Detection
  audioHistory.shift();
  audioHistory.push(overallIntensity);
  const averageAudio = audioHistory.reduce((sum, val) => sum + val, 0) / audioHistory.length;
  const isPeak = overallIntensity > averageAudio * 1.6 && overallIntensity > 0.15 && timestamp - lastAudioPeakTime > 150; // More sensitive peak detection

  // Rhythm Detection
  if (isPeak) {
    if (lastAudioPeakTime > 0) {
      const peakInterval = timestamp - lastAudioPeakTime;
      rhythmDetection.push(peakInterval);
      if (rhythmDetection.length > 5) rhythmDetection.shift();
    }
    lastAudioPeakTime = timestamp;
  }
  let hasRhythm = false;
  if (rhythmDetection.length >= 3) {
    const avgInterval = rhythmDetection.reduce((sum, val) => sum + val, 0) / rhythmDetection.length;
    const variance = rhythmDetection.reduce((sum, val) => sum + Math.pow(val - avgInterval, 2), 0) / rhythmDetection.length;
    hasRhythm = Math.sqrt(variance) < avgInterval * 0.3;
  }

  // Audio Stop Detection
  if (reactiveIntensity < 0.05) {
    noAudioFrames++;
  } else {
    noAudioFrames = 0;
  }
  const audioStopped = noAudioFrames > 60; // 1 second of quiet

  // --- Bolt Creation/Management ---
  // If no bolt exists and audio is playing, create one
  if (!currentBolt && !audioStopped) {
    createFractalLightningBolt(canvasWidth, canvasHeight, reactiveIntensity, highIntensity, isPeak, timestamp, settings);
  }

  // --- Canvas Clearing ---
  // More dramatic fade with flash
  const fadeAlpha = audioStopped ? 0.2 : Math.max(0.08, 0.15 - reactiveIntensity * 0.12);
  ctx.fillStyle = `rgba(0, 0, 0, ${fadeAlpha})`;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Background Flash on Peaks - more dramatic
  if (isPeak) {
    const flashIntensity = 0.15 + bassIntensity * 0.2;
    const r = parseInt(primaryColor.slice(1, 3), 16);
    const g = parseInt(primaryColor.slice(3, 5), 16);
    const b = parseInt(primaryColor.slice(5, 7), 16);
    // Add radial gradient for more realistic flash
    const gradRadius = Math.max(canvasWidth, canvasHeight) * 0.7;
    const gradX = canvasWidth * (0.3 + Math.random() * 0.4); // Random position
    const gradY = canvasHeight * 0.1; // Near top
    
    const flash = ctx.createRadialGradient(gradX, gradY, 0, gradX, gradY, gradRadius);
    flash.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${flashIntensity * 1.5})`);
    flash.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, ${flashIntensity * 0.3})`);
    flash.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    
    ctx.fillStyle = flash;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  }

  // --- Update and Draw Bolt ---
  if (currentBolt) {
    currentBolt.currentAge++;

    // Handle fade out when audio stops
    if (audioStopped && !currentBolt.isFadingOut) {
        currentBolt.isFadingOut = true;
    } else if (!audioStopped && currentBolt.isFadingOut) {
        currentBolt.isFadingOut = false; // Resume if audio comes back
    }

    // Update position - now moving horizontally with slight downward angle
    const speedMultiplier = isPeak ? 1.8 : 1.0;
    currentBolt.currentX += currentBolt.speedX * speedMultiplier * (0.6 + reactiveIntensity * 1.5);
    currentBolt.currentY += currentBolt.speedY * speedMultiplier * (0.4 + reactiveIntensity);

    // Check for wrapping - now when it's off the right side or bottom
    if (currentBolt.currentX > canvasWidth + 50 || currentBolt.currentY > canvasHeight + 50) {
        // Reset to top left
        currentBolt.currentX = -30;
        currentBolt.currentY = canvasHeight * (0.05 + Math.random() * 0.2); // Start from upper portion of screen

        // Regenerate bolt structure for dynamic path evolution
        currentBolt.rootSegment.children = []; // Clear old branches
        
        // Re-calculate root properties - more horizontal angle
        const angleVariation = Math.PI * 0.1;
        const baseAngle = Math.PI * 0.1; // Base angle is mostly horizontal with slight downward
        currentBolt.rootSegment.angle = baseAngle + (Math.random() - 0.5) * angleVariation;
        
        // Make trunk longer but thinner
        currentBolt.rootSegment.length = 70 + reactiveIntensity * 150;
        currentBolt.rootSegment.end = {
             x: currentBolt.rootSegment.start.x + Math.cos(currentBolt.rootSegment.angle) * currentBolt.rootSegment.length,
             y: currentBolt.rootSegment.start.y + Math.sin(currentBolt.rootSegment.angle) * currentBolt.rootSegment.length
        };
        
        // Thinner trunk
        currentBolt.rootSegment.width = 1.5 + reactiveIntensity * 2.0 + (isPeak ? 1.0 : 0);
        currentBolt.rootSegment.intensity = 0.9 + reactiveIntensity * 0.5;

        // Rebuild branches
        buildFractalBranches(currentBolt.rootSegment, reactiveIntensity, highIntensity, isPeak, settings);
        currentBolt.currentAge = 0;
        currentBolt.audioIntensitySnapshot = 0.5 + reactiveIntensity * 0.7;
        currentBolt.speedX = BASE_SPEED_X + reactiveIntensity * AUDIO_SPEED_FACTOR;
        currentBolt.speedY = BASE_SPEED_Y + reactiveIntensity * AUDIO_SPEED_FACTOR * 0.3; // Less vertical speed
    }

    // Calculate current draw intensity based on fade/audio
    const drawIntensity = currentBolt.isFadingOut
        ? currentBolt.audioIntensitySnapshot * Math.pow(FADE_OUT_RATE, currentBolt.currentAge - (currentBolt.maxAge - 40))
        : currentBolt.audioIntensitySnapshot * (0.5 + reactiveIntensity * 0.8);

    // Check for removal conditions (age or fully faded)
    let boltShouldBeRemoved = currentBolt.currentAge > currentBolt.maxAge || (currentBolt.isFadingOut && drawIntensity < 0.01);

    if (boltShouldBeRemoved) {
        currentBolt = null;
    } else {
        // Apply translation and draw
        ctx.save();
        ctx.translate(currentBolt.currentX, currentBolt.currentY);

        // Draw with enhanced intensity
        drawFractalSegment(
            ctx,
            currentBolt.rootSegment,
            drawIntensity * (0.9 + Math.random() * 0.4),
            highIntensity,
            primaryColor,
            glowColor,
            settings,
            isPeak,
            audioStopped,
            reactiveIntensity
        );

        ctx.restore();
    }
  }
};

// --- Bolt Generation Logic ---
function createFractalLightningBolt(
  canvasWidth: number,
  canvasHeight: number,
  audioIntensity: number,
  highIntensity: number,
  isPeak: boolean,
  timestamp: number,
  settings: VisualizerSettings
) {
    const id = nextBoltId++;

    // Start position: top-left, with randomness
    const startX = 0;
    const startY = 0;
    const currentX = -30; // Start off-screen left
    const currentY = canvasHeight * (0.05 + Math.random() * 0.2); // Start in top part of screen

    // Initial direction: Mostly horizontal with slight downward angle
    const angleVariation = Math.PI * 0.1;
    const baseAngle = Math.PI * 0.1; // Slight downward angle from horizontal
    const initialAngle = baseAngle + (Math.random() - 0.5) * angleVariation;

    // Define root segment properties - thinner and longer
    const rootLength = 70 + audioIntensity * 150;
    const rootWidth = 1.5 + audioIntensity * 2.0 + (isPeak ? 1.0 : 0); // Thinner trunk
    const rootIntensity = 0.9 + audioIntensity * 0.5;

    const rootSegment: LightningSegment = {
        start: { x: startX, y: startY },
        end: {
            x: startX + Math.cos(initialAngle) * rootLength,
            y: startY + Math.sin(initialAngle) * rootLength
        },
        width: rootWidth,
        intensity: rootIntensity,
        angle: initialAngle,
        length: rootLength,
        children: [],
        depth: 0
    };

    // Recursively build branches
    buildFractalBranches(rootSegment, audioIntensity, highIntensity, isPeak, settings);

    // Create the main bolt object
    const maxAge = BASE_MAX_AGE + (isPeak ? PEAK_MAX_AGE_BONUS : 0) + Math.random() * 50;
    const speedX = BASE_SPEED_X + audioIntensity * AUDIO_SPEED_FACTOR;
    const speedY = BASE_SPEED_Y + audioIntensity * AUDIO_SPEED_FACTOR * 0.3; // Less vertical speed

    const bolt: LightningBolt = {
        id,
        rootSegment,
        creationTime: timestamp,
        maxAge,
        currentAge: 0,
        audioIntensitySnapshot: 0.5 + audioIntensity * 0.7,
        isFadingOut: false,
        currentX: currentX,
        currentY: currentY,
        speedX: speedX,
        speedY: speedY
    };

    // Assign to the single global variable
    currentBolt = bolt;
}

function buildFractalBranches(
    parentSegment: LightningSegment,
    audioIntensity: number,
    highIntensity: number,
    isPeak: boolean,
    settings: VisualizerSettings
) {
    if (parentSegment.depth >= MAX_RECURSION_DEPTH) return;

    // Branching probability calibrated to create natural tree structure
    // Higher at depth 0, lower at deeper levels
    let baseBranchProbability;
    if (parentSegment.depth === 0) {
        // Main trunk should have fewer branches
        baseBranchProbability = 0.8 + audioIntensity * 0.1;
        
        // Fewer branches from main trunk
        const numInitialBranches = 1 + Math.floor(audioIntensity * 1.5);
        const branchAngles = [];
        
        // Pre-calculate branch angles to ensure good distribution
        // More vertical branching from horizontally-moving main trunk
        for (let i = 0; i < numInitialBranches; i++) {
            // Bias toward downward for main trunk
            const side = (i % 2 === 0) ? 1 : -1; // Mostly downward (positive Y)
            // More vertical angle for main branches
            const angleRange = Math.PI * (0.15 + highIntensity * 0.2);
            // Calculate base deviation angle - branches come out more vertically
            const baseDeviation = (Math.PI / 4) * side;
            // Add randomness to the angle
            const angleNoise = (Math.random() * 0.5 + 0.5) * angleRange * side;
            branchAngles.push(baseDeviation + angleNoise);
        }
        
        // Create the pre-calculated branches
        for (let i = 0; i < numInitialBranches; i++) {
            createBranch(
                parentSegment,
                branchAngles[i],
                audioIntensity,
                highIntensity,
                isPeak,
                i === 0, // First branch gets special treatment as a sub-trunk
                settings
            );
        }
    } else {
        // Reduced branching for deeper levels
        baseBranchProbability = 0.2 + audioIntensity * 0.3; // Lower probability
        const depthFactor = Math.pow(0.6, parentSegment.depth); // Faster decay with depth
        const branchProbability = baseBranchProbability * depthFactor * (isPeak ? 1.5 : 1.0);
        
        // Number of branches from this segment
        if (Math.random() < branchProbability) {
            // Fewer deeper branches
            const numBranches = 1 + Math.floor(Math.random() * audioIntensity);
            
            for (let i = 0; i < numBranches; i++) {
                // Calculate a more random angle for secondary branches
                const angleDeviationRange = Math.PI * (0.2 + highIntensity * 0.3);
                const sideBias = (Math.random() < 0.5) ? -1 : 1;
                const randomAngleFactor = (Math.random() - 0.5) * sideBias;
                
                // Angles for deeper branches
                const childAngle = parentSegment.angle + 
                    randomAngleFactor * angleDeviationRange * 
                    (Math.random() < 0.2 ? 2.5 : 1.2);
                
                createBranch(
                    parentSegment,
                    childAngle,
                    audioIntensity,
                    highIntensity,
                    isPeak,
                    false,
                    settings
                );
            }
        }
    }
}

function createBranch(
    parentSegment: LightningSegment,
    branchAngle: number,
    audioIntensity: number,
    highIntensity: number,
    isPeak: boolean,
    isMainSubTrunk: boolean,
    settings: VisualizerSettings
) {
    // Calculate length based on depth
    let lengthFactor;
    if (isMainSubTrunk) {
        // Main sub-trunk slightly longer
        lengthFactor = 0.6 + Math.random() * 0.2;
    } else {
        // Regular branches get shorter more quickly with depth
        lengthFactor = (0.3 + Math.random() * 0.2) * Math.pow(0.7, parentSegment.depth);
    }
    
    // Length is related to parent, with audio reactivity
    const childLength = Math.max(5, parentSegment.length * lengthFactor * (0.6 + audioIntensity * 0.3));
    
    // Much thinner branches
    let widthFactor;
    if (isMainSubTrunk) {
        widthFactor = 0.4 + Math.random() * 0.1;
    } else {
        widthFactor = (0.25 + Math.random() * 0.1) * Math.pow(0.5, parentSegment.depth);
    }
    
    // Ensure min width
    const childWidth = Math.max(0.1, parentSegment.width * widthFactor);
    
    // Intensity decreases more rapidly
    let intensityFactor;
    if (isMainSubTrunk) {
        intensityFactor = 0.7 + Math.random() * 0.1;
    } else {
        intensityFactor = (0.4 + Math.random() * 0.2) * Math.pow(0.6, parentSegment.depth);
    }
    
    // Cap branch intensity
    const childIntensity = Math.min(
        parentSegment.intensity * intensityFactor,
        parentSegment.intensity * MAX_BRANCH_INTENSITY
    );
    
    // Create the branch segment
    const childStart = parentSegment.end;
    const childEnd = {
        x: childStart.x + Math.cos(branchAngle) * childLength,
        y: childStart.y + Math.sin(branchAngle) * childLength
    };
    
    const childSegment: LightningSegment = {
        start: childStart,
        end: childEnd,
        width: childWidth,
        intensity: childIntensity,
        angle: branchAngle,
        length: childLength,
        children: [],
        depth: parentSegment.depth + 1
    };
    
    parentSegment.children.push(childSegment);
    
    // Recursively build sub-branches with reduced sensitivity
    const modifiedSettings = {
        ...settings,
        sensitivity: settings.sensitivity * 0.85
    };
    buildFractalBranches(childSegment, audioIntensity, highIntensity, isPeak, modifiedSettings);
}

function drawFractalSegment(
    ctx: CanvasRenderingContext2D,
    segment: LightningSegment,
    drawIntensity: number,
    highFrequencyIntensity: number,
    baseColor: string,
    glowColorBase: string,
    settings: VisualizerSettings,
    isPeak: boolean,
    audioStopped: boolean,
    currentAudioIntensity: number
) {
    if (drawIntensity <= 0.005) return;

    // Points are relative to the translated origin
    const drawEndX = segment.end.x;
    const drawEndY = segment.end.y;

    // --- Apply Effects Based on Audio & Depth ---
    // Reduced core boost, more even appearance
    const coreBoost = segment.depth === 0 ? 1.8 : 
                    (segment.depth === 1 ? 1.2 : 
                    (segment.depth === 2 ? 1.1 : 1.0));
    
    // Rapid decrease with depth but less extreme
    const depthMultiplier = Math.pow(0.7, segment.depth);

    // Thinner trunk and branches
    let baseEffectiveWidth = segment.width * coreBoost * 0.7; // Overall width reduction
    let effectiveWidth = baseEffectiveWidth * (0.4 + drawIntensity * 1.4) * depthMultiplier;

    // Less extreme glow
    let baseGlowAmount = (15 + drawIntensity * 30 + (isPeak ? 25 : 0)) * coreBoost;
    let glowAmount = baseGlowAmount * depthMultiplier;

    // Slightly reduced brightness
    let baseAlpha = Math.min(1, 0.5 + drawIntensity * 0.8 + (isPeak ? 0.2 : 0)) * coreBoost;
    let alpha = Math.min(1, baseAlpha * (0.6 + depthMultiplier * 0.4));

    // Shrinking effect during low audio / fade out
    if (audioStopped || drawIntensity < 0.2) {
         effectiveWidth *= Math.max(0.15, drawIntensity * 2.0); // More dramatic shrinking
         glowAmount *= Math.max(0.1, drawIntensity * 1.5);
         alpha *= Math.max(0.2, drawIntensity * 1.8);
    }

    // Min width check
    effectiveWidth = Math.max(0.1, effectiveWidth);

    // Customize glow color based on segment depth
    let glowR = parseInt(baseColor.slice(1, 3), 16);
    let glowG = parseInt(baseColor.slice(3, 5), 16);
    let glowB = parseInt(baseColor.slice(5, 7), 16);
    
    // Add slight color variation based on depth
    // Main trunk keeps original color, branches shift slightly
    if (segment.depth > 0) {
        // Shift color slightly based on depth
        const boost = Math.min(255 - glowB, 40); // Prevent overflow
        glowB = Math.min(255, glowB + boost * (segment.depth / MAX_RECURSION_DEPTH));
    }
    
    const glowIntensityFactor = Math.min(1, 0.6 + drawIntensity * 0.8);
    const glowColor = `rgba(${glowR}, ${glowG}, ${glowB}, ${glowIntensityFactor * 0.8})`;

    // --- Drawing ---
    ctx.save();

    ctx.lineCap = 'round';
    ctx.lineJoin = 'miter'; // Sharp corners

    // Glow effect
    ctx.shadowBlur = glowAmount;
    ctx.shadowColor = glowColor;

    // Main line
    ctx.strokeStyle = `rgba(${glowR}, ${glowG}, ${glowB}, ${alpha})`;
    ctx.lineWidth = effectiveWidth;

    ctx.beginPath();
    ctx.moveTo(segment.start.x, segment.start.y);

    // VERY aggressive jitter for natural lightning look
    // Higher frequency for main trunk, lower for branches
    const baseJitterPerLength = 1.0 / Math.max(1.0, (3.0 - highFrequencyIntensity * 2.0));
    // More jitter points for more chaos
    const numJitters = Math.max(4, Math.floor(segment.length * baseJitterPerLength));
    const segmentDx = (drawEndX - segment.start.x) / numJitters;
    const segmentDy = (drawEndY - segment.start.y) / numJitters;
    const perpAngle = segment.angle + Math.PI / 2;
    
    // Extremely large jitter magnitude for main trunk
    const jitterBaseMagnitude = segment.depth === 0 ? 5.0 : 3.0;
    const jitterMagnitude = (jitterBaseMagnitude + effectiveWidth * 0.5 + 
                            highFrequencyIntensity * 10.0) * 
                            (isPeak ? 2.0 : 1.0) * 
                            (0.6 + Math.random() * 1.0);
    
    // Add dynamic time-based wiggle - lightning is alive!
    const wiggleFactor = segment.depth < 2 ? 0.25 : 0.15;
    const timeBasedWiggle = Math.sin(segment.angle * 3 + performance.now() / 100) * 
                          effectiveWidth * wiggleFactor;

    // Generate jittered path - with increasing chaos toward the end
    for (let i = 1; i <= numJitters; i++) {
        const currentX = segment.start.x + segmentDx * i;
        const currentY = segment.start.y + segmentDy * i;
        
        // Position along the segment (0-1)
        const position = i / numJitters;
        
        if (i < numJitters) { // Don't jitter the final endpoint
             // More chaos in the middle of segments
             const positionFactor = Math.sin(position * Math.PI);
             
             // Randomize jitter - occasional extreme displacements
             const extremeJitterChance = segment.depth === 0 ? 0.25 : 0.15;
             const jitterMultiplier = Math.random() < extremeJitterChance ? 3.5 : 1.2;
             
             const jitterOffset = (Math.random() - 0.5) * 
                                jitterMagnitude * 
                                jitterMultiplier * 
                                positionFactor;
             
             // Apply the jitter with time-based wiggle
             const jitterX = Math.cos(perpAngle) * jitterOffset + 
                           Math.cos(segment.angle) * timeBasedWiggle;
             const jitterY = Math.sin(perpAngle) * jitterOffset + 
                           Math.sin(segment.angle) * timeBasedWiggle;
             
             ctx.lineTo(currentX + jitterX, currentY + jitterY);
        } else {
            ctx.lineTo(currentX, currentY); // End point
        }
    }

    ctx.stroke();

    // Add sparks at junction points and endpoints during peaks
    if (isPeak && segment.depth < 2 && Math.random() < 0.3 + highFrequencyIntensity * 0.6) {
        const sparkSize = 0.5 + Math.random() * effectiveWidth * 0.6;
        // Slightly yellow-white sparks for realism
        ctx.fillStyle = `rgba(255, 255, 220, ${0.8 + Math.random() * 0.2})`;
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(drawEndX, drawEndY, sparkSize, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();

    // Recursively draw children with correct depth inheritance
    segment.children.forEach(child => {
        drawFractalSegment(
            ctx,
            child,
            // Pass intensity down with depth factor
            drawIntensity * (0.6 + Math.random() * 0.2) * Math.pow(0.7, 1), // Only reduce by one level
            highFrequencyIntensity,
            baseColor,
            glowColorBase,
            settings,
            isPeak,
            audioStopped,
            currentAudioIntensity
        );
    });
}
