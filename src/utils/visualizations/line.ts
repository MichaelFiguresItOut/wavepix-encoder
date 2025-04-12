import { VisualizerSettings } from '@/hooks/useAudioVisualization';
import { getYPositionForPlacement, getXPositionForPlacement } from './utils';

// Consistent animation timing variables - similar to fire.ts
let startTime = 0;
let hasInitialized = false;
let lastSettings: string = ''; // Track settings changes

export const drawLineAnimation = (
  ctx: CanvasRenderingContext2D,
  dataArray: Uint8Array,
  canvas: HTMLCanvasElement,
  bufferLength: number,
  timestamp: number,
  settings: VisualizerSettings
) => {
  try {
    // More reliable way to detect if we're in encoding mode
    const isEncoding = canvas.width >= 1280; // Most common encoding resolution starts at 720p (1280×720)
    
    // Create a settings signature to detect changes
    const currentSettings = `${settings.horizontalOrientation}|${settings.verticalOrientation}|${settings.animationStart.join(',')}|${settings.barPlacement.join(',')}|${settings.sensitivity}|${settings.showRainbow}`;
    
    // Reset animation on settings change to avoid visual glitches
    if (currentSettings !== lastSettings) {
      hasInitialized = false;
      lastSettings = currentSettings;
    }
    
    // Initialize on first render
    if (!hasInitialized) {
      startTime = timestamp;
      hasInitialized = true;
    }
    
    // Calculate animation time for consistency
    let animTime = timestamp - startTime;
    
    // For encoding mode, we need more stable animation timing to avoid choppiness
    if (isEncoding) {
      // Ensure the animation time is always consistently incrementing
      // This helps prevent drops and stutters in the encoded file
      animTime = timestamp;
      
      // Adjust speed to make it slightly slower and smoother in encoding mode
      animTime *= 0.8;
    }
    
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const currentRainbowSpeed = settings.rainbowSpeed || 1.0;

    // Base hue for the frame if rainbow is ON
    let baseHue = null;
    if (settings.showRainbow) {
        baseHue = (animTime / 15 * currentRainbowSpeed) % 360; // Use animTime instead of timestamp
        if (isNaN(baseHue)) baseHue = 0;
    }
    
    // Calculate phase for animation using animTime for consistency
    const basePhase = (animTime % 10000) / 10000;
    
    // Adjust segment count based on encoding mode for better performance during encoding
    const segmentCount = isEncoding ? 60 : 100; // Reduced for encoding to improve performance
    
    // Ensure settings arrays are valid to prevent errors
    const barPlacements = Array.isArray(settings.barPlacement) && settings.barPlacement.length > 0 
      ? settings.barPlacement 
      : ['bottom'];
      
    const animationStarts = Array.isArray(settings.animationStart) && settings.animationStart.length > 0 
      ? settings.animationStart 
      : ['beginning'];
    
    if (settings.horizontalOrientation) {
      // Process each bar placement option
      barPlacements.forEach(placement => {
        const baseY = getYPositionForPlacement(canvasHeight, placement, canvasHeight * 0.5);
        
        // Draw horizontal line animations
        animationStarts.forEach(animationStart => {
          let startPoint, endPoint, direction;
          
          // Determine start and end points based on animation direction
          if (animationStart === 'beginning') {
            startPoint = 0;
            endPoint = canvasWidth;
            direction = 1;
          } else if (animationStart === 'end') {
            startPoint = canvasWidth;
            endPoint = 0;
            direction = -1;
          } else { // middle
            // For middle, we'll draw two separate lines in opposite directions
            
            // First half (center to right)
            drawHalfLine(
              ctx, dataArray, bufferLength, basePhase, 
              canvasWidth / 2, canvasWidth, 
              canvasHeight, baseY, placement, settings, 1, baseHue, segmentCount
            );
            
            // Second half (center to left)
            drawHalfLine(
              ctx, dataArray, bufferLength, basePhase, 
              canvasWidth / 2, 0, 
              canvasHeight, baseY, placement, settings, -1, baseHue, segmentCount
            );
            
            // Skip the rest of the code for middle animation
            return;
          }
          
          // Draw the line for beginning or end animation start
          drawFullLine(
            ctx, dataArray, bufferLength, basePhase,
            startPoint, endPoint,
            canvasHeight, baseY, placement, settings, direction, baseHue, segmentCount
          );
        });
      });
    }
    
    if (settings.verticalOrientation) {
      // Process each bar placement option
      barPlacements.forEach(placement => {
        // For vertical orientation, use a smaller bar width (20% of canvas width) for better positioning
        const barWidth = canvasWidth * 0.2; // Smaller bar width for vertical orientation
        // For vertical orientation, "top" means left, "bottom" means right
        const baseX = getXPositionForPlacement(canvasWidth, placement, barWidth);
        
        // Draw vertical line animations
        animationStarts.forEach(animationStart => {
          let startPoint, endPoint, direction;
          
          // Determine start and end points based on animation direction
          if (animationStart === 'beginning') {
            startPoint = 0;
            endPoint = canvasHeight;
            direction = 1;
          } else if (animationStart === 'end') {
            startPoint = canvasHeight;
            endPoint = 0;
            direction = -1;
          } else { // middle
            // For middle, we'll draw two separate lines in opposite directions
            
            // First half (center to bottom)
            drawVerticalHalfLine(
              ctx, dataArray, bufferLength, basePhase, 
              canvasHeight / 2, canvasHeight, 
              canvasWidth, baseX, placement, settings, 1, baseHue, segmentCount
            );
            
            // Second half (center to top)
            drawVerticalHalfLine(
              ctx, dataArray, bufferLength, basePhase, 
              canvasHeight / 2, 0, 
              canvasWidth, baseX, placement, settings, -1, baseHue, segmentCount
            );
            
            // Skip the rest of the code for middle animation
            return;
          }
          
          // Draw the line for beginning or end animation start
          drawVerticalFullLine(
            ctx, dataArray, bufferLength, basePhase,
            startPoint, endPoint,
            canvasWidth, baseX, placement, settings, direction, baseHue, segmentCount
          );
        });
      });
    }
  } catch (error) {
    // Fallback rendering in case of errors - simple bar visualization 
    console.error("Error in line animation, using fallback:", error);
    
    try {
      const width = canvas.width;
      const height = canvas.height;
      
      // Clear the canvas
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
      ctx.fillRect(0, 0, width, height);
      
      // Draw simple bars as fallback
      const barWidth = 5;
      const barCount = Math.min(Math.floor(width / barWidth), bufferLength);
      
      ctx.fillStyle = settings.color;
      for (let i = 0; i < barCount; i++) {
        const barIndex = Math.floor(i * (bufferLength / barCount));
        const value = dataArray[barIndex] * settings.sensitivity;
        const barHeight = (value / 255) * height * 0.7;
        ctx.fillRect(
          i * barWidth, 
          height - barHeight, 
          barWidth - 1, 
          barHeight
        );
      }
    } catch (fallbackError) {
      console.error("Even fallback rendering failed:", fallbackError);
    }
  }
};

// Helper function to draw a full horizontal line
const drawFullLine = (
  ctx: CanvasRenderingContext2D,
  dataArray: Uint8Array,
  bufferLength: number,
  basePhase: number,
  startX: number,
  endX: number,
  canvasHeight: number,
  baseY: number,
  placement: string,
  settings: VisualizerSettings,
  direction: number,
  baseHue: number | null,
  segmentCount: number = 100 // Default to 100 segments
) => {
  const length = Math.abs(endX - startX);
  const segmentWidth = length / segmentCount;
  
  // Reduce shadow blur in encoding mode for better performance
  const isEncoding = canvasHeight >= 720;
  const shadowBlur = isEncoding ? 5 : 10;
  
  // Use thinner lines in encoding mode for better performance
  ctx.lineWidth = isEncoding ? 2 : 3;
  ctx.beginPath();
  
  // Pre-calculate the data samples for consistent rendering
  const dataPoints = [];
  for (let i = 0; i <= segmentCount; i++) {
    const dataIndex = Math.floor(i * (bufferLength / segmentCount));
    const value = dataArray[dataIndex] * settings.sensitivity;
    dataPoints.push(value / 255);
  }
  
  for (let i = 0; i <= segmentCount; i++) {
    const x = startX + (i * segmentWidth * direction);
    
    // Use the pre-calculated normalized values
    const normalizedValue = dataPoints[i];
    
    // Calculate wave effect
    const phase = basePhase * Math.PI * 4;
    const amplitude = canvasHeight * 0.3 * normalizedValue;
    // Calculate wave effect
    const waveY = Math.sin(i * 0.1 + phase) * amplitude;
    
    // Calculate y position based on placement and wave
    let y;
    if (placement === 'bottom') {
      y = (canvasHeight - amplitude) + waveY;
    } else if (placement === 'top') {
      y = amplitude + waveY;
    } else { // middle
      y = (canvasHeight / 2) + waveY;
    }
    
    if (i > 0) {
        // Determine segment color for main line
        let mainStrokeColor: string;
        let mainShadowColor: string;
        if (baseHue !== null) {
            const offsetHue = (baseHue + i * 2) % 360; // Offset hue along the line
            mainStrokeColor = `hsla(${offsetHue}, 90%, 65%, 1.0)`;
            mainShadowColor = mainStrokeColor;
        } else {
            mainStrokeColor = settings.color;
            mainShadowColor = settings.color;
        }
        // Set stroke and shadow just before drawing the segment
        ctx.strokeStyle = mainStrokeColor;
        ctx.shadowBlur = shadowBlur;
        ctx.shadowColor = mainShadowColor;
    }
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      // Use curves for smoother animation
      const prevX = startX + ((i - 1) * segmentWidth * direction);
      const controlX = (prevX + x) / 2;
      
      // Use pre-calculated data for previous point
      const prevNormalizedValue = dataPoints[i-1];
      const prevAmplitude = canvasHeight * 0.3 * prevNormalizedValue;
      
      // Previous y based on placement
      let prevY;
      if (placement === 'bottom') {
        prevY = (canvasHeight - prevAmplitude) + Math.sin((i - 1) * 0.1 + phase) * prevAmplitude;
      } else if (placement === 'top') {
        prevY = prevAmplitude + Math.sin((i - 1) * 0.1 + phase) * prevAmplitude;
      } else { // middle
        prevY = (canvasHeight / 2) + Math.sin((i - 1) * 0.1 + phase) * prevAmplitude;
      }
      
      ctx.quadraticCurveTo(controlX, prevY, x, y);
      
      // For encoding mode, reduce the number of stroke calls for better performance
      if (!isEncoding || i % 5 === 0) {
        // Stroke each segment individually for color change
        ctx.stroke(); 
        // Begin new path segment for next color
        ctx.beginPath(); 
        ctx.moveTo(x, y);
      }
    }
  }
  // Stroke the last segment if any points were added
  if (segmentCount > 0) {
      ctx.stroke();
  }
  ctx.shadowBlur = 0;
};

// Helper function to draw half of a horizontal line (for middle animation start)
const drawHalfLine = (
  ctx: CanvasRenderingContext2D,
  dataArray: Uint8Array,
  bufferLength: number,
  basePhase: number,
  startX: number,
  endX: number,
  canvasHeight: number,
  baseY: number,
  placement: string,
  settings: VisualizerSettings,
  direction: number,
  baseHue: number | null,
  segmentCount: number = 100 // Default to 100 segments
) => {
  const length = Math.abs(endX - startX);
  const segmentWidth = length / segmentCount;
  
  // Reduce shadow blur in encoding mode for better performance
  const isEncoding = canvasHeight >= 720;
  const shadowBlur = isEncoding ? 5 : 10;
  
  ctx.lineWidth = 3;
  ctx.beginPath();
  
  // Pre-calculate the data samples for consistent rendering
  const dataPoints = [];
  for (let i = 0; i <= segmentCount; i++) {
    const dataIndex = Math.floor(i * (bufferLength / segmentCount));
    const value = dataArray[dataIndex] * settings.sensitivity;
    dataPoints.push(value / 255);
  }
  
  for (let i = 0; i <= segmentCount; i++) {
    const x = startX + (i * segmentWidth * direction);
    
    // Use the pre-calculated normalized values
    const normalizedValue = dataPoints[i];
    
    // Calculate wave effect
    const phase = basePhase * Math.PI * 4;
    const amplitude = canvasHeight * 0.3 * normalizedValue;
    // Calculate wave effect
    const waveY = Math.sin(i * 0.1 + phase) * amplitude;
    
    // Calculate y position based on placement and wave
    let y;
    if (placement === 'bottom') {
      y = (canvasHeight - amplitude) + waveY;
    } else if (placement === 'top') {
      y = amplitude + waveY;
    } else { // middle
      y = (canvasHeight / 2) + waveY;
    }
    
    if (i > 0) {
        // Determine segment color for main line
        let mainStrokeColor: string;
        let mainShadowColor: string;
        if (baseHue !== null) {
            const offsetHue = (baseHue + i * 2) % 360; // Offset hue along the line
            mainStrokeColor = `hsla(${offsetHue}, 90%, 65%, 1.0)`;
            mainShadowColor = mainStrokeColor;
        } else {
            mainStrokeColor = settings.color;
            mainShadowColor = settings.color;
        }
        // Set stroke and shadow just before drawing the segment
        ctx.strokeStyle = mainStrokeColor;
        ctx.shadowBlur = shadowBlur;
        ctx.shadowColor = mainShadowColor;
    }
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      // Use curves for smoother animation
      const prevX = startX + ((i - 1) * segmentWidth * direction);
      const controlX = (prevX + x) / 2;
      
      // Use pre-calculated data for previous point
      const prevNormalizedValue = dataPoints[i-1];
      const prevAmplitude = canvasHeight * 0.3 * prevNormalizedValue;
      
      // Previous y based on placement
      let prevY;
      if (placement === 'bottom') {
        prevY = (canvasHeight - prevAmplitude) + Math.sin((i - 1) * 0.1 + phase) * prevAmplitude;
      } else if (placement === 'top') {
        prevY = prevAmplitude + Math.sin((i - 1) * 0.1 + phase) * prevAmplitude;
      } else { // middle
        prevY = (canvasHeight / 2) + Math.sin((i - 1) * 0.1 + phase) * prevAmplitude;
      }
      
      ctx.quadraticCurveTo(controlX, prevY, x, y);
      // Stroke each segment individually for color change
      ctx.stroke(); 
      // Begin new path segment for next color
      ctx.beginPath(); 
      ctx.moveTo(x, y); 
    }
  }
  // Stroke the last segment if any points were added
  if (segmentCount > 0) {
      ctx.stroke();
  }
  ctx.shadowBlur = 0;
};

// Helper function to draw a full vertical line
const drawVerticalFullLine = (
  ctx: CanvasRenderingContext2D,
  dataArray: Uint8Array,
  bufferLength: number,
  basePhase: number,
  startY: number,
  endY: number,
  canvasWidth: number,
  baseX: number,
  placement: string,
  settings: VisualizerSettings,
  direction: number,
  baseHue: number | null,
  segmentCount: number = 100 // Default to 100 segments
) => {
  const length = Math.abs(endY - startY);
  const segmentHeight = length / segmentCount;
  
  // Reduce shadow blur in encoding mode for better performance
  const isEncoding = canvasWidth >= 1280;
  const shadowBlur = isEncoding ? 5 : 10;
  
  // Thinner lines in encoding mode
  ctx.lineWidth = isEncoding ? 2 : 3;
  ctx.beginPath();
  
  // Pre-calculate the data samples for consistent rendering
  const dataPoints = [];
  for (let i = 0; i <= segmentCount; i++) {
    const dataIndex = Math.floor(i * (bufferLength / segmentCount));
    const value = dataArray[dataIndex] * settings.sensitivity;
    dataPoints.push(value / 255);
  }
  
  for (let i = 0; i <= segmentCount; i++) {
    const y = startY + (i * segmentHeight * direction);
    
    // Use the pre-calculated normalized values
    const normalizedValue = dataPoints[i];
    
    // Calculate wave effect
    const phase = basePhase * Math.PI * 4;
    const amplitude = canvasWidth * 0.3 * normalizedValue;
    // Calculate wave effect
    const waveX = Math.sin(i * 0.1 + phase) * amplitude;
    
    // Calculate x position based on placement and wave
    let x;
    if (placement === 'bottom') { // right
      x = (canvasWidth - amplitude) + waveX;
    } else if (placement === 'top') { // left
      x = amplitude + waveX;
    } else { // middle
      // For middle placement, use the canvas center as the base position
      x = (canvasWidth / 2) + waveX;
    }
    
    if (i > 0) {
        // Determine segment color for main line
        let mainStrokeColor: string;
        let mainShadowColor: string;
        if (baseHue !== null) {
            const offsetHue = (baseHue + i * 2) % 360; // Offset hue along the line
            mainStrokeColor = `hsla(${offsetHue}, 90%, 65%, 1.0)`;
            mainShadowColor = mainStrokeColor;
        } else {
            mainStrokeColor = settings.color;
            mainShadowColor = settings.color;
        }
        // Set stroke and shadow just before drawing the segment
        ctx.strokeStyle = mainStrokeColor;
        ctx.shadowBlur = shadowBlur;
        ctx.shadowColor = mainShadowColor;
    }
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      // Use curves for smoother animation
      const prevY = startY + ((i - 1) * segmentHeight * direction);
      const controlY = (prevY + y) / 2;
      
      // Use pre-calculated data for previous point
      const prevNormalizedValue = dataPoints[i-1];
      const prevAmplitude = canvasWidth * 0.3 * prevNormalizedValue;
      
      // Previous x based on placement
      let prevX;
      if (placement === 'bottom') { // right
        prevX = (canvasWidth - prevAmplitude) + Math.sin((i - 1) * 0.1 + phase) * prevAmplitude;
      } else if (placement === 'top') { // left
        prevX = prevAmplitude + Math.sin((i - 1) * 0.1 + phase) * prevAmplitude;
      } else { // middle
        // For middle placement, use the canvas center as the base position
        prevX = (canvasWidth / 2) + Math.sin((i - 1) * 0.1 + phase) * prevAmplitude;
      }
      
      ctx.quadraticCurveTo(prevX, controlY, x, y);
      
      // For encoding mode, reduce the number of stroke calls for better performance
      if (!isEncoding || i % 5 === 0) {
        // Stroke each segment individually for color change
        ctx.stroke(); 
        // Begin new path segment for next color
        ctx.beginPath(); 
        ctx.moveTo(x, y); 
      }
    }
  }
  // Stroke the last segment if any points were added
  if (segmentCount > 0) {
      ctx.stroke();
  }
  ctx.shadowBlur = 0;
};

// Helper function to draw half of a vertical line (for middle animation start)
const drawVerticalHalfLine = (
  ctx: CanvasRenderingContext2D,
  dataArray: Uint8Array,
  bufferLength: number,
  basePhase: number,
  startY: number,
  endY: number,
  canvasWidth: number,
  baseX: number,
  placement: string,
  settings: VisualizerSettings,
  direction: number,
  baseHue: number | null,
  segmentCount: number = 50 // Default to 50 segments for half lines
) => {
  const length = Math.abs(endY - startY);
  const segmentHeight = length / segmentCount;
  
  // Reduce shadow blur in encoding mode for better performance
  const isEncoding = canvasWidth >= 1280;
  const shadowBlur = isEncoding ? 5 : 10;
  
  ctx.lineWidth = 3;
  ctx.beginPath();
  
  // Pre-calculate the data samples for consistent rendering
  const dataPoints = [];
  for (let i = 0; i <= segmentCount; i++) {
    const dataIndex = Math.floor(i * (bufferLength / segmentCount));
    const value = dataArray[dataIndex] * settings.sensitivity;
    dataPoints.push(value / 255);
  }
  
  for (let i = 0; i <= segmentCount; i++) {
    const y = startY + (i * segmentHeight * direction);
    
    // Use the pre-calculated normalized values
    const normalizedValue = dataPoints[i];
    
    // Calculate wave effect
    const phase = basePhase * Math.PI * 4;
    const amplitude = canvasWidth * 0.3 * normalizedValue;
    // Calculate wave effect
    const waveX = Math.sin(i * 0.1 + phase) * amplitude;
    
    // Calculate x position based on placement and wave
    let x;
    if (placement === 'bottom') { // right
      x = (canvasWidth - amplitude) + waveX;
    } else if (placement === 'top') { // left
      x = amplitude + waveX;
    } else { // middle
      // For middle placement, use the canvas center as the base position
      x = (canvasWidth / 2) + waveX;
    }
    
    if (i > 0) {
        // Determine segment color for main line
        let mainStrokeColor: string;
        let mainShadowColor: string;
        if (baseHue !== null) {
            const offsetHue = (baseHue + i * 2) % 360; // Offset hue along the line
            mainStrokeColor = `hsla(${offsetHue}, 90%, 65%, 1.0)`;
            mainShadowColor = mainStrokeColor;
        } else {
            mainStrokeColor = settings.color;
            mainShadowColor = settings.color;
        }
        // Set stroke and shadow just before drawing the segment
        ctx.strokeStyle = mainStrokeColor;
        ctx.shadowBlur = shadowBlur;
        ctx.shadowColor = mainShadowColor;
    }
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      // Use curves for smoother animation
      const prevY = startY + ((i - 1) * segmentHeight * direction);
      const controlY = (prevY + y) / 2;
      
      // Use pre-calculated data for previous point
      const prevNormalizedValue = dataPoints[i-1];
      const prevAmplitude = canvasWidth * 0.3 * prevNormalizedValue;
      
      // Previous x based on placement
      let prevX;
      if (placement === 'bottom') { // right
        prevX = (canvasWidth - prevAmplitude) + Math.sin((i - 1) * 0.1 + phase) * prevAmplitude;
      } else if (placement === 'top') { // left
        prevX = prevAmplitude + Math.sin((i - 1) * 0.1 + phase) * prevAmplitude;
      } else { // middle
        // For middle placement, use the canvas center as the base position
        prevX = (canvasWidth / 2) + Math.sin((i - 1) * 0.1 + phase) * prevAmplitude;
      }
      
      ctx.quadraticCurveTo(prevX, controlY, x, y);
      // Stroke each segment individually for color change
      ctx.stroke(); 
      // Begin new path segment for next color
      ctx.beginPath(); 
      ctx.moveTo(x, y); 
    }
  }
  // Stroke the last segment if any points were added
  if (segmentCount > 0) {
      ctx.stroke();
  }
  ctx.shadowBlur = 0;
};



