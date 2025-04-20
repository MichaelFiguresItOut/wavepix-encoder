import { VisualizerSettings } from '@/hooks/useAudioVisualization';
import { formatColorWithOpacity } from './utils';

// Create a cache to remember previous audio values for both preview and encoding
const previousAudioValues: number[] = [];

export const drawBubblesAnimation = (
  ctx: CanvasRenderingContext2D,
  dataArray: Uint8Array,
  canvas: HTMLCanvasElement,
  bufferLength: number,
  timestamp: number,
  settings: VisualizerSettings
) => {
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  const currentRainbowSpeed = settings.rainbowSpeed || 1.0;
  const dotCount = 128; // Number of dots to display // Default/Horizontal
  
  // Detect if we're in encoding mode based on canvas dimensions
  const isEncoding = canvas.width >= 1280; // Most encoding resolutions start at 1280x720
  
  // Debug logging to verify encoding detection
  console.log('Canvas dimensions:', canvasWidth, 'x', canvasHeight, 'isEncoding:', isEncoding);
  
  // Adjust base parameters based on encoding mode
  const baseScale = isEncoding ? (canvas.width / 472) : 1; // Scale based on preview width ratio
  const dotScale = baseScale * (isEncoding ? 1.2 : 1); // Increased to make base dots bigger

  // If Round Effect is enabled, draw a circular base instead of bars
  if (settings.showMirror) {
    // Draw circular base with bubbles
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    const baseRadius = Math.min(canvasWidth, canvasHeight) * (isEncoding ? 0.22 : 0.2);
    
    // Debug logging for circle parameters - update to match actual values
    console.log('Circle parameters:', {
      circleDotSize: (isEncoding ? 2.2 : 2.2) * dotScale,
      outwardMultiplier: isEncoding ? 90 * baseScale : 80,
      inwardMultiplier: isEncoding ? 70 * baseScale : 60,
      reversedMultiplier: isEncoding ? 50 * baseScale : 40,
      oscSpeed: isEncoding ? 350 : 500,
      baseScale,
      dotScale
    });
    
    // Draw base circle (respect rainbow setting)
    let baseCircleHue = null;
    let baseCircleStyle: string;
    if (settings.showRainbow) {
        baseCircleHue = (timestamp / 40 * currentRainbowSpeed) % 360; // Slightly different speed for base
        if (isNaN(baseCircleHue)) baseCircleHue = 0;
        baseCircleStyle = `hsla(${baseCircleHue}, 80%, 50%, 0.5)`;
    } else {
        baseCircleStyle = formatColorWithOpacity(settings.color, 0.5);
    }
    
    // Draw circle as individual dots instead of a single stroke
    const circleDotCount = 48;
    const circleDotSize = (isEncoding ? 2.2 : 2.2) * dotScale;
    
    // Don't pre-draw all dots for preview - we'll draw dots individually based on audio activity
    // for both preview and encoding modes
    
    // Add bubbles emanating from the circle
    const bubbleCount = 48;
    
    // Initialize audio cache if needed (for both preview and encoding)
    if (previousAudioValues.length === 0) {
      for (let i = 0; i < bubbleCount; i++) {
        previousAudioValues[i] = 0;
      }
    }
    
    // For encoding, use lower multipliers to keep dots closer to circle
    const outwardMultiplier = isEncoding ? 90 * baseScale : 80;
    const inwardMultiplier = isEncoding ? 70 * baseScale : 60;
    const reversedMultiplier = isEncoding ? 50 * baseScale : 40;
    
    // Make oscillation smoother and less pronounced
    const oscSpeed = isEncoding ? 350 : 500;
    const oscAmplitude = isEncoding ? 20 * baseScale : 20;

    for (let i = 0; i < bubbleCount; i++) {
      // Get data for this bubble
      const index = Math.floor(i * (bufferLength / bubbleCount));
      const value = dataArray[index] * settings.sensitivity;
      const normalizedValue = value / 255;
      
      // Store current value for next frame comparison (for both preview and encoding)
      const previousValue = previousAudioValues[i] || 0;
      previousAudioValues[i] = normalizedValue;
      
      // Calculate angle around the circle
      const angle = (i / bubbleCount) * Math.PI * 2;
      
      // Calculate distance from center with consistent oscillation
      const oscFactor = Math.sin((timestamp / oscSpeed) + i * 0.2) * 0.5 + 0.5;
      
      let distance;
      
      if (settings.showInvert) {
        distance = baseRadius - (normalizedValue * inwardMultiplier * oscFactor);
        distance = Math.max(10, distance);
      } else if (settings.showReversed) {
        distance = baseRadius - (normalizedValue * reversedMultiplier * oscFactor);
        distance = Math.max(10, distance);
      } else {
        distance = baseRadius + (normalizedValue * outwardMultiplier * oscFactor);
      }
      
      // Apply dot behavior for both preview and encoding modes
      const baseDotX = centerX + Math.cos(angle) * baseRadius;
      const baseDotY = centerY + Math.sin(angle) * baseRadius;
      
      // Detect if audio has "jumped off" this position
      const hasJumpedOff = previousValue > 0.2 && normalizedValue < 0.1;
      const isAudioActive = normalizedValue > 0.15;
      
      if (isAudioActive) {
        // Audio is active - don't draw a base dot if audio is active
      } else if (hasJumpedOff) {
        // Audio just jumped off - don't draw any dot (complete removal)
      } else {
        // No audio activity - draw normal base dot
        ctx.beginPath();
        ctx.arc(baseDotX, baseDotY, circleDotSize, 0, Math.PI * 2);
        if (isEncoding) {
          if (settings.showRainbow) {
              ctx.fillStyle = `hsla(${baseCircleHue}, 80%, 50%, 0.85)`;
          } else {
              ctx.fillStyle = formatColorWithOpacity(settings.color, 0.85);
          }
        } else {
          ctx.fillStyle = baseCircleStyle;
        }
        ctx.fill();
      }
      
      // RESTORE ORIGINAL BEHAVIOR: For preview mode, always draw all moving dots
      // For encoding mode, only draw when there's enough audio activity
      if (!isEncoding || normalizedValue > 0.05) {
        // Calculate bubble position for the moving dot
        const x = centerX + Math.cos(angle) * distance;
        const y = centerY + Math.sin(angle) * distance;
        
        // Adjust bubble size for encoding - make moving dots proportional
        const baseSizeMultiplier = Math.min(canvasWidth, canvasHeight) * (isEncoding ? 0.018 : 0.018);
        const amplifiedValue = Math.pow(normalizedValue, 0.8) * (1 + settings.sensitivity * 0.5);
        const bubbleSize = Math.max(3, amplifiedValue * baseSizeMultiplier);
        
        // Determine bubble color
        let bubbleFillStyle: string;
        if (settings.showRainbow) {
            const hue = (normalizedValue * 120) + ((timestamp / 50 * currentRainbowSpeed) % 360);
            bubbleFillStyle = `hsl(${hue}, 80%, 60%)`;
        } else {
            bubbleFillStyle = settings.color;
        }

        // Draw the bubble with reduced glow
        ctx.beginPath();
        ctx.arc(x, y, bubbleSize, 0, Math.PI * 2);
        ctx.fillStyle = bubbleFillStyle;
        ctx.fill();
        
        // Adjust glow effect - make it more subtle
        if (bubbleSize > baseSizeMultiplier * 0.3) {
          ctx.shadowBlur = isEncoding ? bubbleSize * 0.6 : bubbleSize * 1.2; // Reduced glow for moving dots
          ctx.shadowColor = bubbleFillStyle;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
    }
    
    return; // Skip the rest of the rendering
  }
  
  // Original bar-based bubbles visualization
  // Process each bar placement option
  settings.barPlacement.forEach(placement => {
    // --- Define constants used by both orientations ---
    const baselineDotCountHorizontal = 128;
    const targetSpacing = canvasWidth / baselineDotCountHorizontal; // Use horizontal spacing as the target
    
    if (settings.horizontalOrientation) {
      // Calculate the base Y position based on placement
      let baseY;
      if (placement === 'top') {
        baseY = canvasHeight * 0.2;
      } else if (placement === 'middle') {
        baseY = canvasHeight / 2;
      } else {
        baseY = canvasHeight * 0.8;
      }

      // Draw baseline dots for each animation start
      const baselineDotCount = baselineDotCountHorizontal; // Use specific name
      const baselineDotSize = isEncoding ? 6.0 : 2.5;
      const baselineSpacing = targetSpacing; // Use calculated targetSpacing

      // Create a map to track which positions should have dots and their audio activity
      const dotPositions = new Map();

      // First pass: calculate positions and audio activity for each animation start
      settings.animationStart.forEach(animationStart => {
        for (let i = 0; i < baselineDotCount; i++) {
          let x;
          let dataIndex;

          if (animationStart === 'beginning') {
            x = i * baselineSpacing;
            dataIndex = i;
          } else if (animationStart === 'end') {
            x = canvasWidth - (i * baselineSpacing);
            dataIndex = i;
          } else { // middle
            const middleIndex = baselineDotCount / 2;
            const distanceFromMiddle = Math.abs(i - middleIndex);
            x = (canvasWidth / 2) + (i < middleIndex ? -distanceFromMiddle : distanceFromMiddle) * baselineSpacing;
            // For middle, use the distance from center for audio data
            dataIndex = distanceFromMiddle;
          }
          
          // Round x to avoid floating point precision issues
          x = Math.round(x * 100) / 100;
          
          // Get audio data for this position
          const nearestDataIndex = Math.floor((dataIndex / baselineDotCount) * bufferLength);
          const audioValue = dataArray[nearestDataIndex] * settings.sensitivity;
          const normalizedValue = audioValue / 255;

          // If this position already exists in the map, update its visibility
          if (dotPositions.has(x)) {
            const currentAudioActivity = dotPositions.get(x);
            // Only keep the dot visible if both animation starts have low audio activity
            dotPositions.set(x, currentAudioActivity && normalizedValue < 0.15);
          } else {
            // For new positions, set initial visibility based on audio activity
            dotPositions.set(x, normalizedValue < 0.15);
          }
        }
      });

      // Draw dots at all calculated positions
      for (const [x, shouldShow] of dotPositions) {
        if (shouldShow) {
          ctx.beginPath();
          ctx.arc(x, baseY, baselineDotSize, 0, Math.PI * 2);
          ctx.fillStyle = formatColorWithOpacity(settings.color, 0.7);
          ctx.fill();
        }
      }
      
      // Draw animated bubbles for each animation start
      settings.animationStart.forEach(animationStart => {
        const sliceWidth = targetSpacing; // Use targetSpacing
        const currentDotCount = baselineDotCountHorizontal; // Use specific name
        
        for (let i = 0; i < currentDotCount; i++) {
          let index;
          if (animationStart === 'middle') {
            const middleIndex = Math.floor(currentDotCount / 2);
            const distanceFromMiddle = Math.abs(i - middleIndex);
            index = Math.floor(distanceFromMiddle * (bufferLength / currentDotCount));
          } else {
            index = Math.floor(i * (bufferLength / currentDotCount));
          }
          const value = dataArray[index] * settings.sensitivity;
          const normalizedValue = value / 255;

          // Only draw bubbles when there's significant audio activity
          if (normalizedValue >= 0.15) {
            let x;
            if (animationStart === 'beginning') {
              x = i * sliceWidth;
            } else if (animationStart === 'end') {
              x = canvasWidth - (i * sliceWidth);
            } else { // middle
              const middleIndex = currentDotCount / 2;
              if (i < middleIndex) {
                x = (canvasWidth / 2) - ((middleIndex - i) * sliceWidth);
              } else {
                x = (canvasWidth / 2) + ((i - middleIndex) * sliceWidth);
              }
            }

            // Calculate Y position with oscillation
            const oscSpeed = isEncoding ? 400 : 500;
            const oscillationAmplitude = isEncoding ? 40 : 20;
            const oscillationPhase = animationStart === 'middle' 
              ? ((Math.abs(x - canvasWidth / 2) / (canvasWidth / 2)) * Math.PI + (timestamp / oscSpeed))
              : ((i / 10) + (timestamp / oscSpeed));
            const oscillation = Math.sin(oscillationPhase) * oscillationAmplitude;
            
            const direction = settings.showReversed ? -1 : 1;
            const audioOffset = isEncoding ? (normalizedValue * 50) : 0;
            const y = baseY + (direction * (oscillation + audioOffset) * normalizedValue);

            // Calculate bubble size
            const baseSizeMultiplier = Math.min(canvasWidth, canvasHeight) * (isEncoding ? 0.018 : 0.018);
            const amplifiedValue = Math.pow(normalizedValue, 0.8) * (1 + settings.sensitivity * 0.5);
            const bubbleSize = Math.max(3, amplifiedValue * baseSizeMultiplier);

            // Determine bubble color
            let bubbleFillStyle;
            if (settings.showRainbow) {
                const hue = (normalizedValue * 120) + ((timestamp / 50 * currentRainbowSpeed) % 360);
                bubbleFillStyle = `hsl(${hue}, 80%, 60%)`;
            } else {
                bubbleFillStyle = settings.color;
            }

            // Draw the bubble
            ctx.beginPath();
            ctx.arc(x, y, bubbleSize, 0, Math.PI * 2);
            ctx.fillStyle = bubbleFillStyle;
            ctx.fill();

            // Add glow effect
            if (bubbleSize > baseSizeMultiplier * 0.3) {
              ctx.shadowBlur = isEncoding ? bubbleSize * 1.2 : bubbleSize * 1.2;
              ctx.shadowColor = bubbleFillStyle;
              ctx.fill();
              ctx.shadowBlur = 0;
            }
            
            // Update dot visibility for this position
            if (dotPositions.has(x)) {
              dotPositions.set(x, false);
            }
          }
        }
      });
      
      // Redraw dots after bubble processing
      for (const [x, shouldShow] of dotPositions) {
        if (shouldShow) {
          ctx.beginPath();
          ctx.arc(x, baseY, baselineDotSize, 0, Math.PI * 2);
          ctx.fillStyle = formatColorWithOpacity(settings.color, 0.7);
          ctx.fill();
        }
      }
    }
    
    if (settings.verticalOrientation) {
      // Calculate the base X position based on placement
      let baseX;
      if (placement === 'bottom') {
        baseX = canvasWidth * 0.8;
      } else if (placement === 'middle') {
        baseX = canvasWidth / 2;
      } else { // top
        baseX = canvasWidth * 0.2;
      }

      // --- START REFACTOR for consistent visual spacing and bug fix ---
      
      // 1. Calculate Vertical Dot Count based on fitting targetSpacing within canvasHeight
      const baselineDotCountVertical = Math.max(1, Math.floor(canvasHeight / targetSpacing));
      const baselineDotSize = isEncoding ? 6.0 : 2.5; // Match horizontal size

      // 2. Determine vertical center based on placement
      let centerY;
      if (placement === 'bottom') {
        centerY = canvasHeight * 0.8;
      } else if (placement === 'middle') {
        centerY = canvasHeight / 2;
      } else { // top
        centerY = canvasHeight * 0.2;
      }
      
      // 3. Calculate total visual length and starting Y coordinate using VERTICAL count
      const totalVisualLength = baselineDotCountVertical * targetSpacing; 
      const startY = centerY - totalVisualLength / 2;

      // 4. Use logical index (0 to baselineDotCountVertical-1) as key in the map
      const dotPositions = new Map<number, boolean>(); // Key: logicalIndex, Value: isVisible

      // 5. First pass: Calculate visibility based on logical index
      settings.animationStart.forEach(animationStart => {
        for (let i = 0; i < baselineDotCountVertical; i++) { // Use vertical count
          let logicalIndex: number;
          let dataIndex: number;
          const middleIndexFloat = (baselineDotCountVertical - 1) / 2; // Use vertical count

          if (animationStart === 'beginning') {
            logicalIndex = i;
            dataIndex = i;
          } else if (animationStart === 'end') {
            logicalIndex = baselineDotCountVertical - 1 - i; // Use vertical count
            dataIndex = i; // Data still read from 0..i for 'end'
          } else { // middle
             const distanceFromMiddle = Math.abs(i - middleIndexFloat);
             // Map i to logicalIndex based on distance from center point
             logicalIndex = Math.floor(middleIndexFloat + (i < middleIndexFloat ? -distanceFromMiddle : distanceFromMiddle));
             // Ensure logicalIndex stays within bounds [0, baselineDotCountVertical-1]
             logicalIndex = Math.max(0, Math.min(baselineDotCountVertical - 1, logicalIndex)); // Use vertical count
             dataIndex = Math.floor(distanceFromMiddle); // Audio data based on distance
          }
          
          // Ensure logicalIndex is an integer
          logicalIndex = Math.round(logicalIndex);
          if (logicalIndex < 0 || logicalIndex >= baselineDotCountVertical) continue; // Skip if index is out of bounds (use vertical count)

          // Get audio data for this position
          // Ensure dataIndex is within valid range for dataArray access
          const safeDataIndex = Math.max(0, Math.min(bufferLength - 1, Math.floor((dataIndex / baselineDotCountVertical) * bufferLength))); // Use vertical count
          const audioValue = dataArray[safeDataIndex] * settings.sensitivity;
          const normalizedValue = audioValue / 255;

          // Update visibility map using logicalIndex as key
          if (dotPositions.has(logicalIndex)) {
            const currentVisibility = dotPositions.get(logicalIndex);
            dotPositions.set(logicalIndex, currentVisibility && normalizedValue < 0.15);
          } else {
            dotPositions.set(logicalIndex, normalizedValue < 0.15);
          }
        }
      });

      // 6. Initial Draw: Draw baseline dots based on logical index and target spacing
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';
      ctx.globalAlpha = 1.0;

      for (const [logicalIndex, shouldShow] of dotPositions) {
        if (shouldShow) {
          const y = startY + logicalIndex * targetSpacing; // Calculate Y based on index and target spacing
          ctx.beginPath();
          ctx.arc(baseX, y, baselineDotSize, 0, Math.PI * 2);
          ctx.fillStyle = formatColorWithOpacity(settings.color, 0.7);
          ctx.fill();
        }
      }
      
      // --- END REFACTOR ---
      
      // Draw animated bubbles for each animation start
      settings.animationStart.forEach(animationStart => {
        // Use targetSpacing for sliceHeight equivalent
        const sliceHeight = targetSpacing; 
        const currentDotCount = baselineDotCountVertical; // Use vertical count for bubbles too
        
        for (let i = 0; i < currentDotCount; i++) { 
          let logicalIndex: number;
          let dataIndex: number;
          const middleIndexFloat = (currentDotCount - 1) / 2; 

          // Determine logicalIndex and dataIndex for the bubble based on animationStart
          if (animationStart === 'beginning') {
            logicalIndex = i;
            dataIndex = i;
          } else if (animationStart === 'end') {
             logicalIndex = currentDotCount - 1 - i;
             dataIndex = i;
          } else { // middle
             const distanceFromMiddle = Math.abs(i - middleIndexFloat);
             logicalIndex = Math.floor(middleIndexFloat + (i < middleIndexFloat ? -distanceFromMiddle : distanceFromMiddle));
             logicalIndex = Math.max(0, Math.min(currentDotCount - 1, logicalIndex));
             dataIndex = Math.floor(distanceFromMiddle);
          }
          logicalIndex = Math.round(logicalIndex);
          if (logicalIndex < 0 || logicalIndex >= currentDotCount) continue;

          // Use dataIndex to get audio value
          const safeDataIndex = Math.max(0, Math.min(bufferLength - 1, Math.floor((dataIndex / currentDotCount) * bufferLength)));
          const value = dataArray[safeDataIndex] * settings.sensitivity;
          const normalizedValue = value / 255;

          // Only draw bubbles when there's significant audio activity
          if (normalizedValue >= 0.15) {
            // Calculate bubble's base Y position using logicalIndex and targetSpacing
            const baseY = startY + logicalIndex * sliceHeight; // Use sliceHeight (== targetSpacing)

            // Calculate X position with oscillation (same as before, but using baseY)
            const oscSpeed = isEncoding ? 400 : 500;
            const oscillationAmplitude = isEncoding ? 40 : 20;
             // Oscillation phase calculation might need review based on logicalIndex? Let's keep original for now.
            const oscillationPhase = animationStart === 'middle' 
              ? ((Math.abs(baseY - centerY) / (totalVisualLength / 2)) * Math.PI + (timestamp / oscSpeed)) 
              : ((i / 10) + (timestamp / oscSpeed)); // Original phase used 'i' directly, might need adjustment
            const oscillation = Math.sin(oscillationPhase) * oscillationAmplitude;
            
            const direction = settings.showReversed ? -1 : 1;
            const audioOffset = isEncoding ? (normalizedValue * 50) : 0;
            // Bubble X position calculation remains relative to baseX
            const bubbleX = baseX + (direction * (oscillation + audioOffset) * normalizedValue); 
            // Bubble Y position is the calculated baseY (no Y oscillation needed for vertical bubbles off line)
            const bubbleY = baseY; 

            // Calculate bubble size (same as before)
            const baseSizeMultiplier = Math.min(canvasWidth, canvasHeight) * (isEncoding ? 0.018 : 0.018);
            const amplifiedValue = Math.pow(normalizedValue, 0.8) * (1 + settings.sensitivity * 0.5);
            const bubbleSize = Math.max(3, amplifiedValue * baseSizeMultiplier);

            // Determine bubble color (same as before)
            let bubbleFillStyle;
            if (settings.showRainbow) {
                const hue = (normalizedValue * 120) + ((timestamp / 50 * currentRainbowSpeed) % 360);
                bubbleFillStyle = `hsl(${hue}, 80%, 60%)`;
            } else {
                bubbleFillStyle = settings.color;
            }

            // Reset context state before drawing bubble
            ctx.shadowBlur = 0;
            ctx.shadowColor = 'transparent';
            ctx.globalAlpha = 1.0;
            
            // Draw the bubble at (bubbleX, bubbleY)
            ctx.beginPath();
            ctx.arc(bubbleX, bubbleY, bubbleSize, 0, Math.PI * 2);
            ctx.fillStyle = bubbleFillStyle;
            ctx.fill();

            // Add glow effect (same as before)
            if (bubbleSize > baseSizeMultiplier * 0.3) {
              ctx.shadowBlur = isEncoding ? bubbleSize * 1.2 : bubbleSize * 1.2;
              ctx.shadowColor = bubbleFillStyle;
              ctx.fill();
              ctx.shadowBlur = 0;
              ctx.shadowColor = 'transparent';
            }

            // Update visibility map using the bubble's logicalIndex
             if (dotPositions.has(logicalIndex)) {
               dotPositions.set(logicalIndex, false); // Hide dot if bubble is drawn
             }
          }
        }
        
        // --- REFACTOR: Final redraw of remaining baseline dots ---
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
        ctx.globalAlpha = 1.0;
        
        // Redraw dots that weren't covered by bubbles using logicalIndex
        for (const [logicalIndex, shouldShow] of dotPositions) {
          if (shouldShow) {
             const y = startY + logicalIndex * targetSpacing; // Calculate Y coordinate
            ctx.beginPath();
            ctx.arc(baseX, y, baselineDotSize, 0, Math.PI * 2);
            ctx.fillStyle = formatColorWithOpacity(settings.color, 0.7);
            ctx.fill();
          }
        }
        // --- END REFACTOR ---
      }); // End of settings.animationStart.forEach for bubbles
    }
  });
};