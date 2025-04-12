import { VisualizerSettings } from '@/hooks/useAudioVisualization';

// Helper function to adjust color brightness (example)
function adjustColor(color: string, amount: number): string {
  // Convert hex to RGB
  let r = parseInt(color.substring(1, 3), 16);
  let g = parseInt(color.substring(3, 5), 16);
  let b = parseInt(color.substring(5, 7), 16);
  
  // Adjust the color
  r = Math.min(255, Math.max(0, r + amount));
  g = Math.min(255, Math.max(0, g + amount));
  b = Math.min(255, Math.max(0, b + amount));
  
  // Convert back to hex
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Helper function to calculate average frequency (example)
function getAverageFrequency(dataArray: Uint8Array, bufferLength: number): number {
  let sum = 0;
  for (let i = 0; i < bufferLength; i++) {
    sum += dataArray[i];
  }
  return sum / bufferLength;
}

export const drawHoneycombAnimation = (
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

  // Base hue for the frame if rainbow is ON
  let baseHue = null;
  if (settings.showRainbow) {
      baseHue = (timestamp / 10 * currentRainbowSpeed) % 360; // Faster base cycle (divisor 10)
      if (isNaN(baseHue)) baseHue = 0;
  }

  // Clear canvas with a semi-transparent black
  ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  
  // Calculate the center of the canvas
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;
  
  // Determine the size of the hexagons based on canvas dimensions
  const hexRadius = Math.min(canvasWidth, canvasHeight) / 16;
  
  // Calculate the horizontal and vertical spacing between hexagons
  const hexWidth = hexRadius * Math.sqrt(3);
  const hexHeight = hexRadius * 2;
  
  // Define how many hexagons to draw (limit to prevent overdrawing)
  const numCols = Math.ceil(canvasWidth / (hexWidth * 1.5)) + 2;
  const numRows = Math.ceil(canvasHeight / (hexHeight * 0.75)) + 2;
  
  // Animation parameters
  const time = timestamp / 1000;
  const pulseSpeed = 0.5;
  
  // Determine which areas of the canvas to draw hexagons
  // based on orientation and bar placement settings
  const drawHorizontal = settings.horizontalOrientation;
  const drawVertical = settings.verticalOrientation;
  
  // Get placement settings (top, middle, bottom)
  const placements = settings.barPlacement;
  
  // Get animation start settings (beginning, middle, end)
  const animationStarts = settings.animationStart;
  
  // Loop through grid to draw hexagons
  for (let row = -1; row < numRows + 1; row++) {
    for (let col = -1; col < numCols + 1; col++) {
      // Calculate hexagon position
      const x = col * hexWidth * 1.5;
      const y = row * hexHeight * 0.75 + (col % 2 === 0 ? 0 : hexHeight / 2);

      // Calculate distance from center for effects
      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // Apply orientation filter
      let shouldDraw = false;
      
      // Calculate normalized position relative to center
      const normalizedX = x / canvasWidth;
      const normalizedY = y / canvasHeight;
      
      // Check if we should draw based on orientation
      const isHorizontalPoint = Math.abs(dx) > Math.abs(dy);
      const isVerticalPoint = Math.abs(dy) >= Math.abs(dx);
      
      if ((drawHorizontal && isHorizontalPoint) || 
          (drawVertical && isVerticalPoint) || 
          (!drawHorizontal && !drawVertical)) {
        
        // Apply placement filters (top/left, middle, bottom/right)
        let placementMatch = false;
        
        // Check top/left placement
        if (placements.includes("top")) {
          if ((drawHorizontal && !drawVertical && y < centerY) || 
              (drawVertical && !drawHorizontal && x < centerX) ||
              (drawHorizontal && drawVertical && ((isHorizontalPoint && y < centerY) || (isVerticalPoint && x < centerX)))) {
            placementMatch = true;
          }
        }
        
        // Check middle placement
        if (placements.includes("middle")) {
          if ((drawHorizontal && !drawVertical && y >= centerY * 0.4 && y <= centerY * 1.6) || 
              (drawVertical && !drawHorizontal && x >= centerX * 0.4 && x <= centerX * 1.6) ||
              (drawHorizontal && drawVertical && 
                ((isHorizontalPoint && y >= centerY * 0.4 && y <= centerY * 1.6) || 
                (isVerticalPoint && x >= centerX * 0.4 && x <= centerX * 1.6)))) {
            placementMatch = true;
          }
        }
        
        // Check bottom/right placement
        if (placements.includes("bottom")) {
          if ((drawHorizontal && !drawVertical && y > centerY) || 
              (drawVertical && !drawHorizontal && x > centerX) ||
              (drawHorizontal && drawVertical && ((isHorizontalPoint && y > centerY) || (isVerticalPoint && x > centerX)))) {
            placementMatch = true;
          }
        }
        
        if (placementMatch) {
          shouldDraw = true;
        }
        
        // Apply animation start filter
        if (shouldDraw) {
          let animationOrigin = false;
          
          // Check beginning animation start
          if (animationStarts.includes("beginning")) {
            if ((isHorizontalPoint && drawHorizontal && x < centerX) || 
                (isVerticalPoint && drawVertical && y < centerY) ||
                (drawHorizontal && drawVertical && 
                 ((isHorizontalPoint && x < centerX) || (isVerticalPoint && y < centerY)))) {
              animationOrigin = true;
            }
          }
          
          // Check middle animation start
          if (animationStarts.includes("middle")) {
            if ((isHorizontalPoint && drawHorizontal && x >= centerX * 0.4 && x <= centerX * 1.6) || 
                (isVerticalPoint && drawVertical && y >= centerY * 0.4 && y <= centerY * 1.6) ||
                (drawHorizontal && drawVertical && 
                 ((isHorizontalPoint && x >= centerX * 0.4 && x <= centerX * 1.6) || 
                  (isVerticalPoint && y >= centerY * 0.4 && y <= centerY * 1.6)))) {
              animationOrigin = true;
            }
          }
          
          // Check end animation start
          if (animationStarts.includes("end")) {
            if ((isHorizontalPoint && drawHorizontal && x > centerX) || 
                (isVerticalPoint && drawVertical && y > centerY) ||
                (drawHorizontal && drawVertical && 
                 ((isHorizontalPoint && x > centerX) || (isVerticalPoint && y > centerY)))) {
              animationOrigin = true;
            }
          }
          
          if (!animationOrigin) {
            shouldDraw = false;
          }
        }
      }
      
      if (!shouldDraw) {
        continue;
      }

      // Map audio data to this hexagon (simplified example)
      const dataIndex = Math.floor((row * numCols + col) * (bufferLength / (numRows * numCols))) % bufferLength;
      const value = dataArray[dataIndex] * settings.sensitivity;
      const normalizedValue = value / 255;

      // Pulse effect based on distance and time
      const pulse = Math.sin(dist * 0.05 - time * pulseSpeed) * 0.5 + 0.5;
      // Modify combinedValue: base is audio, pulse adds variation scaled by audio level
      const combinedValue = normalizedValue + pulse * 0.2 * normalizedValue;

      // Determine opacity based on combined value
      const opacity = Math.max(0.1, Math.min(1.0, combinedValue * 1.2)); // Ensure opacity is within bounds

      // Determine fill color
      let fillColor: string | CanvasGradient;
      let shadowColor = 'transparent';
      let strokeColor = 'transparent';

      if (baseHue !== null) {
          // Rainbow ON
          const offsetHue = (baseHue + dist * 0.5 + normalizedValue * 30) % 360;
          fillColor = `hsla(${offsetHue}, 90%, ${60 + normalizedValue * 15}%, ${opacity * 0.8})`; // Fill with varying lightness and opacity
          shadowColor = `hsla(${offsetHue}, 90%, 70%, ${opacity * 0.5})`; // Fainter shadow
          strokeColor = `hsla(${offsetHue}, 90%, 80%, ${opacity * 0.6})`; // Slightly brighter stroke
      } else {
          // Rainbow OFF
          fillColor = adjustColor(settings.color, normalizedValue * 50 - 20); // Adjust brightness based on audio
          shadowColor = settings.color;
          strokeColor = adjustColor(settings.color, 30); // Slightly lighter stroke
      }

      // Draw the hexagon using combinedValue for size calculation
      drawHexagon(
        ctx,
        x,
        y,
        hexRadius * (0.8 + combinedValue * 0.4), // Size reacts to modified combinedValue
        fillColor,
        shadowColor, 
        strokeColor, 
        opacity, 
        settings,
        true 
      );
    }
  }

  // Updated Function to draw a hexagon (accepts shadow/stroke colors)
  function drawHexagon(
    ctx: CanvasRenderingContext2D, 
    x: number, 
    y: number, 
    radius: number, 
    fillColor: string | CanvasGradient, 
    shadowColor: string, // New param
    strokeColor: string, // New param
    opacity: number, // Use calculated opacity
    settings: VisualizerSettings,
    stroke = false
  ) {
    const sides = 6;
    const angle = (2 * Math.PI) / sides;
    
    ctx.globalAlpha = opacity;
    
    if (stroke) {
      ctx.strokeStyle = typeof strokeColor === 'string' ? strokeColor : settings.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
    } else {
      ctx.fillStyle = fillColor;
      ctx.beginPath();
    }
    
    for (let i = 0; i < sides; i++) {
      const pointAngle = angle * i - Math.PI / 2;
      const pointX = x + radius * Math.cos(pointAngle);
      const pointY = y + radius * Math.sin(pointAngle);
      
      if (i === 0) {
        ctx.moveTo(pointX, pointY);
      } else {
        ctx.lineTo(pointX, pointY);
      }
    }
    
    ctx.closePath();
    
    if (stroke) {
      ctx.stroke();
    } else {
      ctx.fill();
    }
    
    // Add a subtle glow effect using the shadow color
    if (opacity > 0.3) { // Glow threshold
      ctx.shadowBlur = 8;
      ctx.shadowColor = shadowColor;
      
      // Re-fill to apply shadow
      ctx.fill(); 
      // Re-stroke to apply shadow (optional, can be noisy)
      // if (stroke && radius > 1) { ctx.stroke(); }
      
      ctx.shadowBlur = 0;
    }
    
    ctx.globalAlpha = 1.0;
  }
};
