
import { VisualizationSettings } from './utils';

export const drawWave = (
  ctx: CanvasRenderingContext2D,
  dataArray: Uint8Array,
  canvas: HTMLCanvasElement,
  bufferLength: number,
  settings: VisualizationSettings
) => {
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  
  // Draw a more prominent wave
  ctx.strokeStyle = settings.color;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  ctx.beginPath();
  
  const sliceWidth = canvasWidth / bufferLength;
  let x = 0;
  
  for (let i = 0; i < bufferLength; i++) {
    const value = dataArray[i] * settings.sensitivity;
    const y = (value / 255) * canvasHeight * 0.8;
    
    if (i === 0) {
      ctx.moveTo(x, canvasHeight - y);
    } else {
      ctx.lineTo(x, canvasHeight - y);
    }
    
    x += sliceWidth;
  }
  
  ctx.stroke();
  
  // Add glow effect
  ctx.shadowBlur = 15;
  ctx.shadowColor = settings.color;
  ctx.stroke();
  ctx.shadowBlur = 0;
  
  // Draw mirrored wave if enabled
  if (settings.showMirror) {
    ctx.strokeStyle = `${settings.color}66`;
    ctx.beginPath();
    x = 0;
    
    for (let i = 0; i < bufferLength; i++) {
      const value = dataArray[i] * settings.sensitivity;
      const y = (value / 255) * canvasHeight * 0.8;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      
      x += sliceWidth;
    }
    
    ctx.stroke();
  }
};
