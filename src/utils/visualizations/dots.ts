
import { VisualizationSettings, formatColorWithOpacity } from './utils';

export const drawDotsAnimation = (
  ctx: CanvasRenderingContext2D,
  dataArray: Uint8Array,
  canvas: HTMLCanvasElement,
  bufferLength: number,
  timestamp: number,
  settings: VisualizationSettings
) => {
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  const centerY = canvasHeight / 2;
  const centerX = canvasWidth / 2;
  
  // Animation phase
  const phase = (timestamp % 8000) / 8000 * Math.PI * 2;
  
  if (!settings.showMirror) {
    // Original animation - dots in a wave pattern
    const dotCount = Math.min(bufferLength, 100);
    const dotSpacing = canvasWidth / (dotCount - 1);
    
    // Draw connecting line first (behind dots)
    ctx.beginPath();
    for (let i = 0; i < dotCount; i++) {
      const x = i * dotSpacing;
      const dataIndex = Math.floor(i * (bufferLength / dotCount));
      const value = dataArray[dataIndex] * settings.sensitivity;
      const normalizedValue = value / 255;
      
      // Calculate dot position with subtle wave motion
      const waveY = Math.sin(i * 0.15 + phase) * 20;
      const y = centerY - (normalizedValue * canvasHeight * 0.4) + waveY;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    
    // Style the connecting line
    ctx.strokeStyle = `${settings.color}44`;
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw dots with shadow/glow
    for (let i = 0; i < dotCount; i++) {
      const x = i * dotSpacing;
      const dataIndex = Math.floor(i * (bufferLength / dotCount));
      const value = dataArray[dataIndex] * settings.sensitivity;
      const normalizedValue = value / 255;
      
      // Calculate dot position with subtle wave motion
      const waveY = Math.sin(i * 0.15 + phase) * 20;
      const y = centerY - (normalizedValue * canvasHeight * 0.4) + waveY;
      
      // Dot size based on frequency data
      const dotSize = 2 + normalizedValue * 8;
      
      // Draw glow/shadow
      ctx.shadowBlur = 15;
      ctx.shadowColor = settings.color;
      
      // Draw dot
      ctx.beginPath();
      ctx.arc(x, y, dotSize, 0, Math.PI * 2);
      ctx.fillStyle = settings.color;
      ctx.fill();
      
      // Reset shadow
      ctx.shadowBlur = 0;
    }
  } else {
    // Mirrored mode - dots emanating from center in circular pattern
    const maxRings = 5;
    const dotsPerRing = 24;
    
    // Draw connecting lines between rings
    for (let ring = 0; ring < maxRings; ring++) {
      const ringRadius = 40 + ring * 40;
      
      ctx.beginPath();
      for (let i = 0; i < dotsPerRing; i++) {
        const angle = (i / dotsPerRing) * Math.PI * 2 + phase + (ring * 0.1);
        const dataIndex = Math.floor((ring * dotsPerRing + i) % bufferLength);
        const value = dataArray[dataIndex] * settings.sensitivity;
        const normalizedValue = value / 255;
        
        // Calculate radius with audio reactivity
        const radius = ringRadius + normalizedValue * 30;
        
        // Calculate dot position
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.closePath();
      ctx.strokeStyle = formatColorWithOpacity(settings.color, 0.3);
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    
    // Draw dots at intersections
    for (let ring = 0; ring < maxRings; ring++) {
      const baseRadius = 40 + ring * 40;
      
      for (let i = 0; i < dotsPerRing; i++) {
        const angle = (i / dotsPerRing) * Math.PI * 2 + phase + (ring * 0.1);
        const dataIndex = Math.floor((ring * dotsPerRing + i) % bufferLength);
        const value = dataArray[dataIndex] * settings.sensitivity;
        const normalizedValue = value / 255;
        
        // Calculate radius with audio reactivity
        const radius = baseRadius + normalizedValue * 30;
        
        // Calculate dot position
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        
        // Dot size based on frequency data
        const dotSize = 2 + normalizedValue * 6;
        
        // Draw glow/shadow
        ctx.shadowBlur = 10;
        ctx.shadowColor = settings.color;
        
        // Draw dot
        ctx.beginPath();
        ctx.arc(x, y, dotSize, 0, Math.PI * 2);
        ctx.fillStyle = settings.color;
        ctx.fill();
        
        // Reset shadow
        ctx.shadowBlur = 0;
      }
    }
  }
};
