
import { BarVisualizationSettings } from './utils';

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
  
  if (settings.orientation === "horizontal" || settings.orientation === "both") {
    // Horizontal bars visualization (original)
    const totalBars = Math.min(Math.floor(canvasWidth / (barWidth + 1)), bufferLength);
    const barSpacing = 1;
    
    // Use full canvas space
    const maxBarHeight = canvasHeight * 0.9;
    
    for (let i = 0; i < totalBars; i++) {
      const index = Math.floor(i * (bufferLength / totalBars));
      const value = dataArray[index] * settings.sensitivity;
      const barHeight = (value / 255) * maxBarHeight;
      
      const x = i * (barWidth + barSpacing);
      const y = canvasHeight - barHeight;
      
      // Create gradient for each bar
      const gradient = ctx.createLinearGradient(x, canvasHeight, x, y);
      gradient.addColorStop(0, `${settings.color}FF`);
      gradient.addColorStop(1, `${settings.color}22`);
      
      ctx.fillStyle = gradient;
      
      // Rounded top for bars
      const radius = barWidth / 2;
      ctx.beginPath();
      ctx.moveTo(x, canvasHeight);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.lineTo(x + barWidth - radius, y);
      ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
      ctx.lineTo(x + barWidth, canvasHeight);
      ctx.fill();
      
      // Draw mirrored bars if enabled
      if (settings.showMirror) {
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
    }
  }
  
  if (settings.orientation === "vertical" || settings.orientation === "both") {
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
