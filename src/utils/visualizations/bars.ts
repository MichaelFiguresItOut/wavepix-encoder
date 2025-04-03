
import { BarVisualizationSettings, getYPositionForPlacement } from './utils';

export const drawBars = (
  ctx: CanvasRenderingContext2D,
  dataArray: Uint8Array,
  canvas: HTMLCanvasElement,
  bufferLength: number,
  settings: BarVisualizationSettings
) => {
  const barWidth = settings.barWidth;
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  
  if (settings.horizontalOrientation) {
    // Horizontal bars visualization
    const totalBars = Math.min(Math.floor(canvasWidth / (barWidth + 1)), bufferLength);
    const barSpacing = 1;
    
    // Use full canvas space
    const maxBarHeight = canvasHeight * 0.9;
    
    for (let i = 0; i < totalBars; i++) {
      const index = Math.floor(i * (bufferLength / totalBars));
      const value = dataArray[index] * settings.sensitivity;
      const barHeight = (value / 255) * maxBarHeight;
      
      const x = i * (barWidth + barSpacing);
      
      // Draw bars for each selected placement
      settings.barPlacement.forEach(placement => {
        const y = getYPositionForPlacement(canvasHeight, placement, barHeight);
        
        // Create gradient for each bar
        const gradient = ctx.createLinearGradient(x, canvasHeight, x, y);
        gradient.addColorStop(0, `${settings.color}FF`);
        gradient.addColorStop(1, `${settings.color}22`);
        
        ctx.fillStyle = gradient;
        
        // Rounded top for bars
        const radius = barWidth / 2;
        ctx.beginPath();
        
        if (placement === 'bottom') {
          ctx.moveTo(x, canvasHeight);
          ctx.lineTo(x, y + radius);
          ctx.quadraticCurveTo(x, y, x + radius, y);
          ctx.lineTo(x + barWidth - radius, y);
          ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
          ctx.lineTo(x + barWidth, canvasHeight);
        } else if (placement === 'top') {
          ctx.moveTo(x, 0);
          ctx.lineTo(x, y + barHeight - radius);
          ctx.quadraticCurveTo(x, y + barHeight, x + radius, y + barHeight);
          ctx.lineTo(x + barWidth - radius, y + barHeight);
          ctx.quadraticCurveTo(x + barWidth, y + barHeight, x + barWidth, y + barHeight - radius);
          ctx.lineTo(x + barWidth, 0);
        } else { // middle
          ctx.moveTo(x, y);
          ctx.lineTo(x + barWidth, y);
          ctx.lineTo(x + barWidth, y + barHeight);
          ctx.lineTo(x, y + barHeight);
          ctx.closePath();
        }
        
        ctx.fill();
        
        // Draw mirrored bars if enabled
        if (settings.showMirror && placement === 'bottom') {
          ctx.fillStyle = `${settings.color}66`;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, barHeight - radius);
          ctx.quadraticCurveTo(x, barHeight, x + radius, barHeight);
          ctx.lineTo(x + barWidth - radius, barHeight);
          ctx.quadraticCurveTo(x + barWidth, barHeight, x + barWidth, barHeight - radius);
          ctx.lineTo(x + barWidth, 0);
          ctx.fill();
        }
      });
    }
  }
  
  if (settings.verticalOrientation) {
    // Vertical bars visualization
    const totalBars = Math.min(Math.floor(canvasHeight / (barWidth + 1)), bufferLength);
    const barSpacing = 1;
    
    // Use full canvas space
    const maxBarWidth = canvasWidth * 0.9;
    
    for (let i = 0; i < totalBars; i++) {
      const index = Math.floor(i * (bufferLength / totalBars));
      const value = dataArray[index] * settings.sensitivity;
      const barWidth = (value / 255) * maxBarWidth;
      
      const y = i * (settings.barWidth + barSpacing);
      const x = 0;
      
      // Create gradient for each bar
      const gradient = ctx.createLinearGradient(x, y, barWidth, y);
      gradient.addColorStop(0, `${settings.color}FF`);
      gradient.addColorStop(1, `${settings.color}22`);
      
      ctx.fillStyle = gradient;
      
      // Rounded end for bars
      const radius = settings.barWidth / 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(barWidth - radius, y);
      ctx.quadraticCurveTo(barWidth, y, barWidth, y + radius);
      ctx.lineTo(barWidth, y + settings.barWidth - radius);
      ctx.quadraticCurveTo(barWidth, y + settings.barWidth, barWidth - radius, y + settings.barWidth);
      ctx.lineTo(x, y + settings.barWidth);
      ctx.fill();
      
      // Draw mirrored bars if enabled
      if (settings.showMirror) {
        ctx.fillStyle = `${settings.color}66`;
        ctx.beginPath();
        ctx.moveTo(canvasWidth, y);
        ctx.lineTo(canvasWidth - barWidth + radius, y);
        ctx.quadraticCurveTo(canvasWidth - barWidth, y, canvasWidth - barWidth, y + radius);
        ctx.lineTo(canvasWidth - barWidth, y + settings.barWidth - radius);
        ctx.quadraticCurveTo(canvasWidth - barWidth, y + settings.barWidth, canvasWidth - barWidth + radius, y + settings.barWidth);
        ctx.lineTo(canvasWidth, y + settings.barWidth);
        ctx.fill();
      }
    }
  }
};
