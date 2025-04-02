
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
  
  // Horizontal wave (original implementation)
  if (settings.orientation === "horizontal" || settings.orientation === "both") {
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
  }
  
  // Vertical wave
  if (settings.orientation === "vertical" || settings.orientation === "both") {
    // Draw a more prominent wave
    ctx.strokeStyle = settings.color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    
    const sliceHeight = canvasHeight / bufferLength;
    let y = 0;
    
    for (let i = 0; i < bufferLength; i++) {
      const value = dataArray[i] * settings.sensitivity;
      const x = (value / 255) * canvasWidth * 0.8;
      
      if (i === 0) {
        ctx.moveTo(canvasWidth - x, y);
      } else {
        ctx.lineTo(canvasWidth - x, y);
      }
      
      y += sliceHeight;
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
      y = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        const value = dataArray[i] * settings.sensitivity;
        const x = (value / 255) * canvasWidth * 0.8;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        
        y += sliceHeight;
      }
      
      ctx.stroke();
    }
  }
};
