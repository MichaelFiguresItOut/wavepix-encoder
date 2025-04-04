
import { VisualizerSettings } from '@/hooks/useAudioVisualization';

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
  const pulseSpeed = 0.5; // Controls how fast the hexagons pulse
  
  // Create a linearGradient for the honeycomb
  const gradient = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
  gradient.addColorStop(0, settings.color);
  gradient.addColorStop(1, adjustColor(settings.color, 30)); // Slightly different shade
  
  // Draw the honeycomb pattern
  for (let row = -2; row < numRows; row++) {
    for (let col = -2; col < numCols; col++) {
      // Calculate the position of each hexagon
      const x = col * hexWidth * 1.5;
      const y = row * hexHeight * 0.75 + (col % 2 === 0 ? 0 : hexHeight / 2);
      
      // Get a data value for this hexagon
      // Map the position to an index in the dataArray
      const dataIndex = Math.floor(((row * numCols + col) % bufferLength + bufferLength) % bufferLength);
      const value = dataArray[dataIndex] / 255.0;
      
      // Calculate distance from center
      const distX = x - centerX;
      const distY = y - centerY;
      const distance = Math.sqrt(distX * distX + distY * distY);
      
      // Calculate a size and opacity based on the audio data and time
      // Add a wave effect that radiates from the center
      const waveOffset = distance / (Math.min(canvasWidth, canvasHeight) / 2);
      const waveValue = Math.sin(time * pulseSpeed - waveOffset * 5) * 0.5 + 0.5;
      
      // Combine audio data with wave effect
      const combinedValue = value * 0.7 + waveValue * 0.3;
      
      // Size of the hexagon (varies with the data)
      const size = hexRadius * (0.5 + combinedValue * settings.sensitivity * 0.5);
      
      // Opacity also varies with the data
      const opacity = 0.3 + combinedValue * 0.7;
      
      // Draw the hexagon
      drawHexagon(ctx, x, y, size, gradient, opacity, settings);
    }
  }
  
  // Draw a few larger, pulsing hexagons in the center
  const centralDataIndex = Math.floor(time * 10) % bufferLength;
  const centralValue = dataArray[centralDataIndex] / 255.0;
  
  ctx.strokeStyle = settings.color;
  ctx.lineWidth = 2;
  
  // Draw 3 concentric hexagons in the center
  for (let i = 0; i < 3; i++) {
    const pulseValue = Math.sin(time * pulseSpeed * (i + 1) * 0.5) * 0.5 + 0.5;
    const combinedValue = centralValue * 0.7 + pulseValue * 0.3;
    const size = (hexRadius * 2 + i * hexRadius * 2) * (0.8 + combinedValue * settings.sensitivity * 0.3);
    
    drawHexagon(
      ctx, 
      centerX, 
      centerY, 
      size, 
      settings.color, 
      0.7 - i * 0.2, 
      settings,
      true
    );
  }
  
  // Function to draw a hexagon
  function drawHexagon(
    ctx: CanvasRenderingContext2D, 
    x: number, 
    y: number, 
    radius: number, 
    color: string | CanvasGradient, 
    opacity: number,
    settings: VisualizerSettings,
    stroke = false
  ) {
    const sides = 6;
    const angle = (2 * Math.PI) / sides;
    
    ctx.globalAlpha = opacity;
    
    if (stroke) {
      ctx.strokeStyle = typeof color === 'string' ? color : settings.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
    } else {
      ctx.fillStyle = color;
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
    
    // Add a subtle glow effect
    if (opacity > 0.5) {
      ctx.shadowBlur = 10;
      ctx.shadowColor = typeof color === 'string' ? color : settings.color;
      
      if (stroke) {
        ctx.stroke();
      } else {
        ctx.fill();
      }
      
      ctx.shadowBlur = 0;
    }
    
    ctx.globalAlpha = 1.0;
  }
  
  // Function to adjust a color's brightness
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
};
