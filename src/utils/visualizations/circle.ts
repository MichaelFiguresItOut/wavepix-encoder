import { VisualizationSettings } from './utils';

export const drawCircle = (
  ctx: CanvasRenderingContext2D,
  dataArray: Uint8Array,
  canvas: HTMLCanvasElement,
  bufferLength: number,
  timestamp: number,
  settings: VisualizationSettings
) => {
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;
  
  // Calculate scale factor based on canvas size
  const previewWidth = 800;
  const scaleFactor = Math.max(1, canvasWidth / previewWidth);
  
  // Use most of the canvas
  const radius = Math.min(centerX, centerY) * 0.8;
  
  // Calculate rotation
  const rotationSpeed = (settings as any).rotationSpeed || 0;
  const rotationAngle = (timestamp / 1000) * rotationSpeed * Math.PI;
  
  // Center point
  ctx.beginPath();
  ctx.arc(centerX, centerY, 5 * scaleFactor, 0, 2 * Math.PI);
  ctx.fillStyle = settings.color;
  ctx.fill();
  
  // Parse the base color
  const hexColor = settings.color.replace("#", "");
  const r = parseInt(hexColor.substring(0, 2), 16);
  const g = parseInt(hexColor.substring(2, 4), 16);
  const b = parseInt(hexColor.substring(4, 6), 16);
  
  // Draw circular visualizer with rotation
  for (let i = 0; i < bufferLength; i++) {
    const angle = (i / bufferLength) * 2 * Math.PI + rotationAngle;
    const value = dataArray[i] * settings.sensitivity;
    const barHeight = (value / 255) * radius * 0.5;
    
    // Skip drawing lines with no height
    if (barHeight < 0.01) continue;
    
    // Calculate inner and outer points
    let innerRadius = radius;
    let outerRadius = radius + barHeight;
    
    if (settings.showMirror) {
      innerRadius = radius / 2;
      outerRadius = innerRadius + barHeight;
    }
    
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
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
      ctx.lineWidth = 3 * scaleFactor;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  }
  
  // Draw connecting circle
  ctx.beginPath();
  if (settings.showMirror) {
    ctx.arc(centerX, centerY, radius / 2, 0, 2 * Math.PI);
  } else {
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
  }
  
  ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.5)`;
  ctx.lineWidth = 1 * scaleFactor;
  ctx.stroke();
};
