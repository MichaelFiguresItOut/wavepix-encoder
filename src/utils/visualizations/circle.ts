import { VisualizerSettings } from '@/hooks/useAudioVisualization';

export const drawCircle = (
  ctx: CanvasRenderingContext2D,
  dataArray: Uint8Array,
  canvas: HTMLCanvasElement,
  bufferLength: number,
  timestamp: number,
  settings: VisualizerSettings
) => {
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;
  const currentRainbowSpeed = settings.rainbowSpeed || 1.0;

  // Helper to get RANDOM hue if Rainbow is ON
  const getCurrentHue = () => {
    if (settings.showRainbow) { 
      // Return random hue
      return Math.random() * 360;
    }
    return null; 
  };

  // Calculate scale factor based on canvas size
  const previewWidth = 800;
  const scaleFactor = Math.max(1, canvasWidth / previewWidth);
  
  // Use most of the canvas
  const radius = Math.min(centerX, centerY) * 0.8;
  
  // Calculate rotation
  const rotationSpeed = settings.rotationSpeed || 0;
  const rotationAngle = (timestamp / 1000) * rotationSpeed * Math.PI;
  
  // Parse the base color (only needed if rainbow is off)
  let r = 0, g = 0, b = 0;
  if (!settings.showRainbow) {
    const hexColor = settings.color.replace("#", "");
    r = parseInt(hexColor.substring(0, 2), 16);
    g = parseInt(hexColor.substring(2, 4), 16);
    b = parseInt(hexColor.substring(4, 6), 16);
  }
  
  // Draw circular visualizer with rotation
  for (let i = 0; i < bufferLength; i++) {
    // Get a random hue for EACH line if rainbow is on
    const lineHue = getCurrentHue(); 

    const angle = (i / bufferLength) * 2 * Math.PI + rotationAngle;
    const value = dataArray[i] * settings.sensitivity;
    const barHeight = (value / 255) * radius * 0.5;
    
    // Skip drawing lines with no height
    if (barHeight < 0.01) continue;
    
    // Calculate inner and outer points based on Invert (showMirror) setting
    let innerRadius: number;
    let outerRadius: number;
    
    if (settings.showMirror) { // Treat showMirror as Invert for Circle
      outerRadius = radius;
      innerRadius = radius - barHeight;
    } else {
      innerRadius = radius;
      outerRadius = radius + barHeight;
    }
    
    // Prevent innerRadius from becoming negative or zero
    innerRadius = Math.max(1, innerRadius);

    // Create a stepped gradient effect with multiple segments
    const STEPS = 5; // Number of segments to create the gradient effect
    
    for (let step = 0; step < STEPS; step++) {
      // Calculate position along the line for this segment
      const t = step / (STEPS - 1);
      const segmentRadius = innerRadius + (outerRadius - innerRadius) * t;
      
      // Calculate end points for this line segment
      const x = centerX + Math.cos(angle) * segmentRadius;
      const y = centerY + Math.sin(angle) * segmentRadius;
      
      // Next point (or outer end if last segment)
      const nextT = (step + 1) / (STEPS - 1);
      const nextRadius = innerRadius + (outerRadius - innerRadius) * nextT;
      
      const nextX = centerX + Math.cos(angle) * nextRadius;
      const nextY = centerY + Math.sin(angle) * nextRadius;
      
      // Calculate opacity for this segment - higher opacity toward the outer end
      const opacity = 0.3 + (t * 0.7); // 30% to 100% opacity
      
      // Draw the segment
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(nextX, nextY);
      
      // Set stroke style based on rainbow setting
      if (lineHue !== null) {
        // Rainbow ON: Use HSLA with the line's hue and calculated opacity
        ctx.strokeStyle = `hsla(${lineHue}, 90%, 60%, ${opacity})`;
      } else {
        // Rainbow OFF: Use RGBA with base color and calculated opacity
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
      }

      ctx.lineWidth = 3 * scaleFactor;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  }
};
