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
  
  // For non-mirror mode, keep original animation
  if (!settings.showMirror) {
    // Draw a single animated line in the center that reacts to music
    const centerY = canvasHeight / 2;
    const amplitude = canvasHeight * 0.4;
    
    ctx.strokeStyle = settings.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    const sliceWidth = canvasWidth / (bufferLength / 4);
    
    // Animation phase based on time
    const phase = (timestamp % 10000) / 10000 * Math.PI * 2;
    
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
    // Centered version for mirror mode
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    const amplitude = canvasHeight * 0.3;
    
    ctx.strokeStyle = settings.color;
    ctx.lineWidth = 3;
    
    // Animation phase based on time
    const phase = (timestamp % 10000) / 10000 * Math.PI * 2;
    
    // Draw expanding waves from the center
    for (let waveIndex = 0; waveIndex < 3; waveIndex++) {
      const wavePhase = phase - waveIndex * 0.5;
      ctx.beginPath();
      
      // Draw the wave
      for (let angle = 0; angle < Math.PI * 2; angle += 0.05) {
        // Sample data from different frequency ranges
        const dataIndex = Math.floor((angle / (Math.PI * 2)) * bufferLength);
        const value = dataArray[dataIndex] * settings.sensitivity;
        const normalizedValue = value / 255;
        
        // Calculate radius based on frequency and wave index
        const radius = (50 + waveIndex * 30) * normalizedValue + 
                     Math.sin(angle * 6 + wavePhase) * 20 * normalizedValue;
        
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        
        if (angle === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.closePath();
      
      // Add glow effect
      ctx.shadowBlur = 15;
      ctx.shadowColor = settings.color;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }
};
