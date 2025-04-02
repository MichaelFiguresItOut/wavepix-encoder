import { VisualizationSettings } from './utils';

export const drawLineAnimation = (
  ctx: CanvasRenderingContext2D,
  dataArray: Uint8Array,
  canvas: HTMLCanvasElement,
  bufferLength: number,
  timestamp: number,
  settings: VisualizationSettings
) => {
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  
  // Animation phase based on time
  const phase = (timestamp % 10000) / 10000 * Math.PI * 2;
  
  // Horizontal animation mode
  if (settings.orientation === "horizontal" || settings.orientation === "both") {
    // For non-mirror mode, keep original animation
    if (!settings.showMirror) {
      // Draw a single animated line in the center that reacts to music
      const centerY = canvasHeight / 2;
      const amplitude = canvasHeight * 0.4;
      
      ctx.strokeStyle = settings.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      
      const sliceWidth = canvasWidth / (bufferLength / 4);
      
      for (let i = 0; i < bufferLength / 4; i++) {
        const value = dataArray[i] * settings.sensitivity;
        const normalizedValue = value / 255;
        
        // Calculate y position based on frequency data and phase
        const x = i * sliceWidth;
        const y = centerY + Math.sin(i * 0.2 + phase) * amplitude * normalizedValue;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.bezierCurveTo(
            x - sliceWidth / 2, 
            centerY + Math.sin((i - 0.5) * 0.2 + phase) * amplitude * (normalizedValue + dataArray[i-1]/255*settings.sensitivity)/2,
            x - sliceWidth / 2, 
            y,
            x, 
            y
          );
        }
      }
      
      // Add glow effect
      ctx.shadowBlur = 15;
      ctx.shadowColor = settings.color;
      ctx.stroke();
      ctx.shadowBlur = 0;
      
      // Add subtle echo effect
      for (let echo = 1; echo <= 3; echo++) {
        ctx.strokeStyle = `${settings.color}${Math.floor(30 - echo * 10).toString(16)}`;
        ctx.lineWidth = 2 - echo * 0.5;
        ctx.beginPath();
        
        const echoPhase = phase - echo * 0.5;
        
        for (let i = 0; i < bufferLength / 4; i++) {
          const value = dataArray[i] * settings.sensitivity;
          const normalizedValue = value / 255;
          
          const x = i * sliceWidth;
          const y = centerY + Math.sin(i * 0.2 + echoPhase) * amplitude * normalizedValue * 0.8;
          
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.bezierCurveTo(
              x - sliceWidth / 2, 
              centerY + Math.sin((i - 0.5) * 0.2 + echoPhase) * amplitude * (normalizedValue + dataArray[i-1]/255*settings.sensitivity)/2 * 0.8,
              x - sliceWidth / 2, 
              y,
              x, 
              y
            );
          }
        }
        
        ctx.stroke();
      }
    } else {
      // Center-origin animation for mirror mode
      const centerX = canvasWidth / 2;
      const centerY = canvasHeight / 2;
      const maxWidth = canvasWidth / 2;
      
      // Draw from center to right
      ctx.strokeStyle = settings.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      
      const sliceWidth = maxWidth / (bufferLength / 8);
      
      for (let i = 0; i < bufferLength / 8; i++) {
        const value = dataArray[i] * settings.sensitivity;
        const normalizedValue = value / 255;
        const amplitude = canvasHeight * 0.4;
        
        const x = centerX + i * sliceWidth;
        const y = centerY + Math.sin(i * 0.2 + phase) * amplitude * normalizedValue;
        
        if (i === 0) {
          ctx.moveTo(centerX, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      // Draw from center to left (mirrored)
      for (let i = 0; i < bufferLength / 8; i++) {
        const value = dataArray[i] * settings.sensitivity;
        const normalizedValue = value / 255;
        const amplitude = canvasHeight * 0.4;
        
        const x = centerX - i * sliceWidth;
        const y = centerY + Math.sin(i * 0.2 + phase) * amplitude * normalizedValue;
        
        if (i === 0) {
          // Already moved to center
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      // Add glow effect
      ctx.shadowBlur = 15;
      ctx.shadowColor = settings.color;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }
  
  // Vertical animation mode
  if (settings.orientation === "vertical" || settings.orientation === "both") {
    if (!settings.showMirror) {
      // Draw a single animated line in the center that reacts to music
      const centerX = canvasWidth / 2;
      const amplitude = canvasWidth * 0.4;
      
      ctx.strokeStyle = settings.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      
      const sliceHeight = canvasHeight / (bufferLength / 4);
      
      for (let i = 0; i < bufferLength / 4; i++) {
        const value = dataArray[i] * settings.sensitivity;
        const normalizedValue = value / 255;
        
        // Calculate x position based on frequency data and phase
        const y = i * sliceHeight;
        const x = centerX + Math.sin(i * 0.2 + phase) * amplitude * normalizedValue;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.bezierCurveTo(
            x,
            y - sliceHeight / 2,
            x,
            y - sliceHeight / 2,
            x, 
            y
          );
        }
      }
      
      // Add glow effect
      ctx.shadowBlur = 15;
      ctx.shadowColor = settings.color;
      ctx.stroke();
      ctx.shadowBlur = 0;
      
      // Add subtle echo effect
      for (let echo = 1; echo <= 3; echo++) {
        ctx.strokeStyle = `${settings.color}${Math.floor(30 - echo * 10).toString(16)}`;
        ctx.lineWidth = 2 - echo * 0.5;
        ctx.beginPath();
        
        const echoPhase = phase - echo * 0.5;
        
        for (let i = 0; i < bufferLength / 4; i++) {
          const value = dataArray[i] * settings.sensitivity;
          const normalizedValue = value / 255;
          
          const y = i * sliceHeight;
          const x = centerX + Math.sin(i * 0.2 + echoPhase) * amplitude * normalizedValue * 0.8;
          
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.bezierCurveTo(
              x,
              y - sliceHeight / 2,
              x,
              y - sliceHeight / 2,
              x, 
              y
            );
          }
        }
        
        ctx.stroke();
      }
    } else {
      // Center-origin animation for mirror mode
      const centerX = canvasWidth / 2;
      const centerY = canvasHeight / 2;
      const maxHeight = canvasHeight / 2;
      
      // Draw from center to bottom
      ctx.strokeStyle = settings.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      
      const sliceHeight = maxHeight / (bufferLength / 8);
      
      for (let i = 0; i < bufferLength / 8; i++) {
        const value = dataArray[i] * settings.sensitivity;
        const normalizedValue = value / 255;
        const amplitude = canvasWidth * 0.4;
        
        const y = centerY + i * sliceHeight;
        const x = centerX + Math.sin(i * 0.2 + phase) * amplitude * normalizedValue;
        
        if (i === 0) {
          ctx.moveTo(x, centerY);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      // Draw from center to top (mirrored)
      for (let i = 0; i < bufferLength / 8; i++) {
        const value = dataArray[i] * settings.sensitivity;
        const normalizedValue = value / 255;
        const amplitude = canvasWidth * 0.4;
        
        const y = centerY - i * sliceHeight;
        const x = centerX + Math.sin(i * 0.2 + phase) * amplitude * normalizedValue;
        
        if (i === 0) {
          // Already moved to center
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      // Add glow effect
      ctx.shadowBlur = 15;
      ctx.shadowColor = settings.color;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }
};
