
import { VisualizationSettings } from './utils';

export const drawCircle = (
  ctx: CanvasRenderingContext2D,
  dataArray: Uint8Array,
  canvas: HTMLCanvasElement,
  bufferLength: number,
  rotationAngle: number,
  settings: VisualizationSettings
) => {
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;
  
  // Use most of the canvas
  const radius = Math.min(centerX, centerY) * 0.8;
  
  // Center point
  ctx.beginPath();
  ctx.arc(centerX, centerY, 5, 0, 2 * Math.PI);
  ctx.fillStyle = settings.color;
  ctx.fill();
  
  // Draw circular visualizer with rotation
  for (let i = 0; i < bufferLength; i++) {
    const angle = (i / bufferLength) * 2 * Math.PI + rotationAngle;
    const value = dataArray[i] * settings.sensitivity;
    const barHeight = (value / 255) * radius * 0.5;
    
    // Calculate inner and outer points
    let innerRadius = radius;
    let outerRadius = radius + barHeight;
    
    // If mirror effect is enabled, make visualization start from center
    if (settings.showMirror) {
      innerRadius = radius / 2;
      outerRadius = innerRadius + barHeight;
    }
    
    const innerX = centerX + Math.cos(angle) * innerRadius;
    const innerY = centerY + Math.sin(angle) * innerRadius;
    
    const outerX = centerX + Math.cos(angle) * outerRadius;
    const outerY = centerY + Math.sin(angle) * outerRadius;
    
    // Draw line with gradient
    const gradient = ctx.createLinearGradient(innerX, innerY, outerX, outerY);
    gradient.addColorStop(0, `${settings.color}33`);
    gradient.addColorStop(1, `${settings.color}FF`);
    
    ctx.beginPath();
    ctx.moveTo(innerX, innerY);
    ctx.lineTo(outerX, outerY);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();
    
    // Add connecting arc between points for a more fluid look
    if (i > 0) {
      const prevAngle = ((i - 1) / bufferLength) * 2 * Math.PI + rotationAngle;
      const prevValue = dataArray[i - 1] * settings.sensitivity;
      const prevBarHeight = (prevValue / 255) * radius * 0.5;
      
      // Calculate previous point with mirror effect if enabled
      let prevInnerRadius = radius;
      let prevOuterRadius = radius + prevBarHeight;
      
      if (settings.showMirror) {
        prevInnerRadius = radius / 2;
        prevOuterRadius = prevInnerRadius + prevBarHeight;
      }
      
      const prevOuterX = centerX + Math.cos(prevAngle) * prevOuterRadius;
      const prevOuterY = centerY + Math.sin(prevAngle) * prevOuterRadius;
      
      ctx.beginPath();
      ctx.moveTo(prevOuterX, prevOuterY);
      ctx.lineTo(outerX, outerY);
      ctx.strokeStyle = `${settings.color}44`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  
  // Draw connecting circle
  ctx.beginPath();
  
  // Draw the appropriate connecting circle based on mirror effect
  if (settings.showMirror) {
    ctx.arc(centerX, centerY, radius / 2, 0, 2 * Math.PI);
  } else {
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
  }
  
  ctx.strokeStyle = `${settings.color}44`;
  ctx.lineWidth = 1;
  ctx.stroke();
};
