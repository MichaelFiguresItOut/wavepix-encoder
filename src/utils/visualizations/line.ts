import { VisualizationSettings, getYPositionForPlacement, getXPositionForPlacement } from './utils';

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
  
  // Calculate phase for animation
  const basePhase = (timestamp % 10000) / 10000;
  
  if (settings.horizontalOrientation) {
    // Process each bar placement option
    settings.barPlacement.forEach(placement => {
      const baseY = getYPositionForPlacement(canvasHeight, placement, canvasHeight * 0.5);
      
      // Draw horizontal line animations
      settings.animationStart.forEach(animationStart => {
        let startPoint, endPoint, direction;
        
        // Determine start and end points based on animation direction
        if (animationStart === 'beginning') {
          startPoint = 0;
          endPoint = canvasWidth;
          direction = 1;
        } else if (animationStart === 'end') {
          startPoint = canvasWidth;
          endPoint = 0;
          direction = -1;
        } else { // middle
          // For middle, we'll draw two separate lines in opposite directions
          
          // First half (center to right)
          drawHalfLine(
            ctx, dataArray, bufferLength, basePhase, 
            canvasWidth / 2, canvasWidth, 
            canvasHeight, baseY, placement, settings, 1
          );
          
          // Second half (center to left)
          drawHalfLine(
            ctx, dataArray, bufferLength, basePhase, 
            canvasWidth / 2, 0, 
            canvasHeight, baseY, placement, settings, -1
          );
          
          // Skip the rest of the code for middle animation
          return;
        }
        
        // Draw the line for beginning or end animation start
        drawFullLine(
          ctx, dataArray, bufferLength, basePhase,
          startPoint, endPoint,
          canvasHeight, baseY, placement, settings, direction
        );
      });
    });
  }
  
  if (settings.verticalOrientation) {
    // Process each bar placement option
    settings.barPlacement.forEach(placement => {
      // For vertical orientation, use a smaller bar width (20% of canvas width) for better positioning
      const barWidth = canvasWidth * 0.2; // Smaller bar width for vertical orientation
      // For vertical orientation, "bottom" means left, "top" means right
      const baseX = getXPositionForPlacement(canvasWidth, placement, barWidth);
      
      // Draw vertical line animations
      settings.animationStart.forEach(animationStart => {
        let startPoint, endPoint, direction;
        
        // Determine start and end points based on animation direction
        if (animationStart === 'beginning') {
          startPoint = 0;
          endPoint = canvasHeight;
          direction = 1;
        } else if (animationStart === 'end') {
          startPoint = canvasHeight;
          endPoint = 0;
          direction = -1;
        } else { // middle
          // For middle, we'll draw two separate lines in opposite directions
          
          // First half (center to bottom)
          drawVerticalHalfLine(
            ctx, dataArray, bufferLength, basePhase, 
            canvasHeight / 2, canvasHeight, 
            canvasWidth, baseX, placement, settings, 1
          );
          
          // Second half (center to top)
          drawVerticalHalfLine(
            ctx, dataArray, bufferLength, basePhase, 
            canvasHeight / 2, 0, 
            canvasWidth, baseX, placement, settings, -1
          );
          
          // Skip the rest of the code for middle animation
          return;
        }
        
        // Draw the line for beginning or end animation start
        drawVerticalFullLine(
          ctx, dataArray, bufferLength, basePhase,
          startPoint, endPoint,
          canvasWidth, baseX, placement, settings, direction
        );
      });
    });
  }
};

// Helper function to draw a full horizontal line
const drawFullLine = (
  ctx: CanvasRenderingContext2D,
  dataArray: Uint8Array,
  bufferLength: number,
  basePhase: number,
  startX: number,
  endX: number,
  canvasHeight: number,
  baseY: number,
  placement: string,
  settings: VisualizationSettings,
  direction: number
) => {
  const length = Math.abs(endX - startX);
  const segmentCount = 100; // Number of line segments
  const segmentWidth = length / segmentCount;
  
  ctx.strokeStyle = settings.color;
  ctx.lineWidth = 3;
  ctx.shadowBlur = 10;
  ctx.shadowColor = settings.color;
  
  ctx.beginPath();
  
  for (let i = 0; i <= segmentCount; i++) {
    const x = startX + (i * segmentWidth * direction);
    
    // Sample data from frequency array
    const dataIndex = Math.floor(i * (bufferLength / segmentCount));
    const value = dataArray[dataIndex] * settings.sensitivity;
    const normalizedValue = value / 255;
    
    // Calculate wave effect
    const phase = basePhase * Math.PI * 4;
    const amplitude = canvasHeight * 0.3 * normalizedValue;
    // Apply invert effect if enabled
    const waveY = Math.sin(i * 0.1 + phase) * amplitude * (settings.showInvert ? -1 : 1);
    
    // Calculate y position based on placement and wave
    let y;
    if (placement === 'bottom') {
      y = (canvasHeight - amplitude) + waveY;
    } else if (placement === 'top') {
      y = amplitude + waveY;
    } else { // middle
      y = (canvasHeight / 2) + waveY;
    }
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      // Use curves for smoother animation
      const prevX = startX + ((i - 1) * segmentWidth * direction);
      const controlX = (prevX + x) / 2;
      
      const prevDataIndex = Math.floor((i - 1) * (bufferLength / segmentCount));
      const prevValue = dataArray[prevDataIndex] * settings.sensitivity;
      const prevNormalizedValue = prevValue / 255;
      const prevAmplitude = canvasHeight * 0.3 * prevNormalizedValue;
      // Apply invert effect if enabled
      const prevWaveY = Math.sin((i - 1) * 0.1 + phase) * prevAmplitude * (settings.showInvert ? -1 : 1);
      
      // Previous y based on placement
      let prevY;
      if (placement === 'bottom') {
        prevY = (canvasHeight - prevAmplitude) + prevWaveY;
      } else if (placement === 'top') {
        prevY = prevAmplitude + prevWaveY;
      } else { // middle
        prevY = (canvasHeight / 2) + prevWaveY;
      }
      
      ctx.quadraticCurveTo(controlX, prevY, x, y);
    }
  }
  
  ctx.stroke();
  ctx.shadowBlur = 0;
  
  // Draw mirror if enabled
  if (settings.showMirror) {
    ctx.strokeStyle = `${settings.color}44`;
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    
    for (let i = 0; i <= segmentCount; i++) {
      const x = startX + (i * segmentWidth * direction);
      
      // Sample data from frequency array
      const dataIndex = Math.floor(i * (bufferLength / segmentCount));
      const value = dataArray[dataIndex] * settings.sensitivity;
      const normalizedValue = value / 255;
      
      // Calculate wave effect
      const phase = basePhase * Math.PI * 4;
      const amplitude = canvasHeight * 0.3 * normalizedValue;
      // Apply invert effect if enabled (for mirror, we use the same direction as the main wave)
      const waveY = Math.sin(i * 0.1 + phase) * amplitude * (settings.showInvert ? -1 : 1);
      
      // Calculate mirrored y position
      let y;
      if (placement === 'bottom') {
        y = amplitude - waveY;
      } else if (placement === 'top') {
        y = (canvasHeight - amplitude) - waveY;
      } else { // middle
        y = (canvasHeight / 2) - waveY;
      }
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        // Use curves for smoother animation
        const prevX = startX + ((i - 1) * segmentWidth * direction);
        const controlX = (prevX + x) / 2;
        
        const prevDataIndex = Math.floor((i - 1) * (bufferLength / segmentCount));
        const prevValue = dataArray[prevDataIndex] * settings.sensitivity;
        const prevNormalizedValue = prevValue / 255;
        const prevAmplitude = canvasHeight * 0.3 * prevNormalizedValue;
        // Apply invert effect if enabled
        const prevWaveY = Math.sin((i - 1) * 0.1 + phase) * prevAmplitude * (settings.showInvert ? -1 : 1);
        
        // Previous mirrored y
        let prevY;
        if (placement === 'bottom') {
          prevY = prevAmplitude - prevWaveY;
        } else if (placement === 'top') {
          prevY = (canvasHeight - prevAmplitude) - prevWaveY;
        } else { // middle
          prevY = (canvasHeight / 2) - prevWaveY;
        }
        
        ctx.quadraticCurveTo(controlX, prevY, x, y);
      }
    }
    
    ctx.stroke();
  }
};

// Helper function to draw half of a horizontal line (for middle animation start)
const drawHalfLine = (
  ctx: CanvasRenderingContext2D,
  dataArray: Uint8Array,
  bufferLength: number,
  basePhase: number,
  startX: number,
  endX: number,
  canvasHeight: number,
  baseY: number,
  placement: string,
  settings: VisualizationSettings,
  direction: number
) => {
  const length = Math.abs(endX - startX);
  const segmentCount = 50; // Number of line segments for half line
  const segmentWidth = length / segmentCount;
  
  ctx.strokeStyle = settings.color;
  ctx.lineWidth = 3;
  ctx.shadowBlur = 10;
  ctx.shadowColor = settings.color;
  
  ctx.beginPath();
  
  for (let i = 0; i <= segmentCount; i++) {
    const x = startX + (i * segmentWidth * direction);
    
    // Sample data from frequency array
    const dataIndex = Math.floor(i * (bufferLength / segmentCount));
    const value = dataArray[dataIndex] * settings.sensitivity;
    const normalizedValue = value / 255;
    
    // Calculate wave effect
    const phase = basePhase * Math.PI * 4;
    const amplitude = canvasHeight * 0.3 * normalizedValue;
    // Apply invert effect if enabled
    const waveY = Math.sin(i * 0.1 + phase) * amplitude * (settings.showInvert ? -1 : 1);
    
    // Calculate y position based on placement and wave
    let y;
    if (placement === 'bottom') {
      y = (canvasHeight - amplitude) + waveY;
    } else if (placement === 'top') {
      y = amplitude + waveY;
    } else { // middle
      y = (canvasHeight / 2) + waveY;
    }
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      // Use curves for smoother animation
      const prevX = startX + ((i - 1) * segmentWidth * direction);
      const controlX = (prevX + x) / 2;
      
      const prevDataIndex = Math.floor((i - 1) * (bufferLength / segmentCount));
      const prevValue = dataArray[prevDataIndex] * settings.sensitivity;
      const prevNormalizedValue = prevValue / 255;
      const prevAmplitude = canvasHeight * 0.3 * prevNormalizedValue;
      // Apply invert effect if enabled
      const prevWaveY = Math.sin((i - 1) * 0.1 + phase) * prevAmplitude * (settings.showInvert ? -1 : 1);
      
      // Previous y based on placement
      let prevY;
      if (placement === 'bottom') {
        prevY = (canvasHeight - prevAmplitude) + prevWaveY;
      } else if (placement === 'top') {
        prevY = prevAmplitude + prevWaveY;
      } else { // middle
        prevY = (canvasHeight / 2) + prevWaveY;
      }
      
      ctx.quadraticCurveTo(controlX, prevY, x, y);
    }
  }
  
  ctx.stroke();
  ctx.shadowBlur = 0;
  
  // Draw mirror if enabled
  if (settings.showMirror) {
    ctx.strokeStyle = `${settings.color}44`;
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    
    for (let i = 0; i <= segmentCount; i++) {
      const x = startX + (i * segmentWidth * direction);
      
      // Sample data from frequency array
      const dataIndex = Math.floor(i * (bufferLength / segmentCount));
      const value = dataArray[dataIndex] * settings.sensitivity;
      const normalizedValue = value / 255;
      
      // Calculate wave effect
      const phase = basePhase * Math.PI * 4;
      const amplitude = canvasHeight * 0.3 * normalizedValue;
      // Apply invert effect if enabled
      const waveY = Math.sin(i * 0.1 + phase) * amplitude * (settings.showInvert ? -1 : 1);
      
      // Calculate mirrored y position
      let y;
      if (placement === 'bottom') {
        y = amplitude - waveY;
      } else if (placement === 'top') {
        y = (canvasHeight - amplitude) - waveY;
      } else { // middle
        y = (canvasHeight / 2) - waveY;
      }
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        // Use curves for smoother animation
        const prevX = startX + ((i - 1) * segmentWidth * direction);
        const controlX = (prevX + x) / 2;
        
        const prevDataIndex = Math.floor((i - 1) * (bufferLength / segmentCount));
        const prevValue = dataArray[prevDataIndex] * settings.sensitivity;
        const prevNormalizedValue = prevValue / 255;
        const prevAmplitude = canvasHeight * 0.3 * prevNormalizedValue;
        // Apply invert effect if enabled
        const prevWaveY = Math.sin((i - 1) * 0.1 + phase) * prevAmplitude * (settings.showInvert ? -1 : 1);
        
        // Previous mirrored y
        let prevY;
        if (placement === 'bottom') {
          prevY = prevAmplitude - prevWaveY;
        } else if (placement === 'top') {
          prevY = (canvasHeight - prevAmplitude) - prevWaveY;
        } else { // middle
          prevY = (canvasHeight / 2) - prevWaveY;
        }
        
        ctx.quadraticCurveTo(controlX, prevY, x, y);
      }
    }
    
    ctx.stroke();
  }
};

// Helper function to draw a full vertical line
const drawVerticalFullLine = (
  ctx: CanvasRenderingContext2D,
  dataArray: Uint8Array,
  bufferLength: number,
  basePhase: number,
  startY: number,
  endY: number,
  canvasWidth: number,
  baseX: number,
  placement: string,
  settings: VisualizationSettings,
  direction: number
) => {
  const length = Math.abs(endY - startY);
  const segmentCount = 100; // Number of line segments
  const segmentHeight = length / segmentCount;
  
  ctx.strokeStyle = settings.color;
  ctx.lineWidth = 3;
  ctx.shadowBlur = 10;
  ctx.shadowColor = settings.color;
  
  ctx.beginPath();
  
  for (let i = 0; i <= segmentCount; i++) {
    const y = startY + (i * segmentHeight * direction);
    
    // Sample data from frequency array
    const dataIndex = Math.floor(i * (bufferLength / segmentCount));
    const value = dataArray[dataIndex] * settings.sensitivity;
    const normalizedValue = value / 255;
    
    // Calculate wave effect
    const phase = basePhase * Math.PI * 4;
    const amplitude = canvasWidth * 0.3 * normalizedValue;
    // Apply invert effect if enabled
    const waveX = Math.sin(i * 0.1 + phase) * amplitude * (settings.showInvert ? -1 : 1);
    
    // Calculate x position based on placement and wave
    let x;
    if (placement === 'bottom') { // left
      x = amplitude + waveX;
    } else if (placement === 'top') { // right
      x = (canvasWidth - amplitude) + waveX;
    } else { // middle
      // For middle placement, use the canvas center as the base position
      x = (canvasWidth / 2) + waveX;
    }
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      // Use curves for smoother animation
      const prevY = startY + ((i - 1) * segmentHeight * direction);
      const controlY = (prevY + y) / 2;
      
      const prevDataIndex = Math.floor((i - 1) * (bufferLength / segmentCount));
      const prevValue = dataArray[prevDataIndex] * settings.sensitivity;
      const prevNormalizedValue = prevValue / 255;
      const prevAmplitude = canvasWidth * 0.3 * prevNormalizedValue;
      // Apply invert effect if enabled
      const prevWaveX = Math.sin((i - 1) * 0.1 + phase) * prevAmplitude * (settings.showInvert ? -1 : 1);
      
      // Previous x based on placement
      let prevX;
      if (placement === 'bottom') { // left
        prevX = prevAmplitude + prevWaveX;
      } else if (placement === 'top') { // right
        prevX = (canvasWidth - prevAmplitude) + prevWaveX;
      } else { // middle
        // For middle placement, use the canvas center as the base position
        prevX = (canvasWidth / 2) + prevWaveX;
      }
      
      ctx.quadraticCurveTo(prevX, controlY, x, y);
    }
  }
  
  ctx.stroke();
  ctx.shadowBlur = 0;
  
  // Draw mirror if enabled
  if (settings.showMirror) {
    ctx.strokeStyle = `${settings.color}44`;
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    
    for (let i = 0; i <= segmentCount; i++) {
      const y = startY + (i * segmentHeight * direction);
      
      // Sample data from frequency array
      const dataIndex = Math.floor(i * (bufferLength / segmentCount));
      const value = dataArray[dataIndex] * settings.sensitivity;
      const normalizedValue = value / 255;
      
      // Calculate wave effect
      const phase = basePhase * Math.PI * 4;
      const amplitude = canvasWidth * 0.3 * normalizedValue;
      // Apply invert effect if enabled
      const waveX = Math.sin(i * 0.1 + phase) * amplitude * (settings.showInvert ? -1 : 1);
      
      // Calculate mirrored x position
      let x;
      if (placement === 'bottom') { // left
        x = (canvasWidth - amplitude) - waveX;
      } else if (placement === 'top') { // right
        x = amplitude - waveX;
      } else { // middle
        // For middle placement, use the canvas center as the base position for mirroring
        x = (canvasWidth / 2) - waveX;
      }
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        // Use curves for smoother animation
        const prevY = startY + ((i - 1) * segmentHeight * direction);
        const controlY = (prevY + y) / 2;
        
        const prevDataIndex = Math.floor((i - 1) * (bufferLength / segmentCount));
        const prevValue = dataArray[prevDataIndex] * settings.sensitivity;
        const prevNormalizedValue = prevValue / 255;
        const prevAmplitude = canvasWidth * 0.3 * prevNormalizedValue;
        // Apply invert effect if enabled
        const prevWaveX = Math.sin((i - 1) * 0.1 + phase) * prevAmplitude * (settings.showInvert ? -1 : 1);
        
        // Previous mirrored x
        let prevX;
        if (placement === 'bottom') { // left
          prevX = (canvasWidth - prevAmplitude) - prevWaveX;
        } else if (placement === 'top') { // right
          prevX = prevAmplitude - prevWaveX;
        } else { // middle
          // For middle placement, use the canvas center as the base position for mirroring
          prevX = (canvasWidth / 2) - prevWaveX;
        }
        
        ctx.quadraticCurveTo(prevX, controlY, x, y);
      }
    }
    
    ctx.stroke();
  }
};

// Helper function to draw half of a vertical line (for middle animation start)
const drawVerticalHalfLine = (
  ctx: CanvasRenderingContext2D,
  dataArray: Uint8Array,
  bufferLength: number,
  basePhase: number,
  startY: number,
  endY: number,
  canvasWidth: number,
  baseX: number,
  placement: string,
  settings: VisualizationSettings,
  direction: number
) => {
  const length = Math.abs(endY - startY);
  const segmentCount = 50; // Number of line segments for half line
  const segmentHeight = length / segmentCount;
  
  ctx.strokeStyle = settings.color;
  ctx.lineWidth = 3;
  ctx.shadowBlur = 10;
  ctx.shadowColor = settings.color;
  
  ctx.beginPath();
  
  for (let i = 0; i <= segmentCount; i++) {
    const y = startY + (i * segmentHeight * direction);
    
    // Sample data from frequency array
    const dataIndex = Math.floor(i * (bufferLength / segmentCount));
    const value = dataArray[dataIndex] * settings.sensitivity;
    const normalizedValue = value / 255;
    
    // Calculate wave effect
    const phase = basePhase * Math.PI * 4;
    const amplitude = canvasWidth * 0.3 * normalizedValue;
    // Apply invert effect if enabled
    const waveX = Math.sin(i * 0.1 + phase) * amplitude * (settings.showInvert ? -1 : 1);
    
    // Calculate x position based on placement and wave
    let x;
    if (placement === 'bottom') { // left
      x = amplitude + waveX;
    } else if (placement === 'top') { // right
      x = (canvasWidth - amplitude) + waveX;
    } else { // middle
      // For middle placement, use the canvas center as the base position
      x = (canvasWidth / 2) + waveX;
    }
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      // Use curves for smoother animation
      const prevY = startY + ((i - 1) * segmentHeight * direction);
      const controlY = (prevY + y) / 2;
      
      const prevDataIndex = Math.floor((i - 1) * (bufferLength / segmentCount));
      const prevValue = dataArray[prevDataIndex] * settings.sensitivity;
      const prevNormalizedValue = prevValue / 255;
      const prevAmplitude = canvasWidth * 0.3 * prevNormalizedValue;
      // Apply invert effect if enabled
      const prevWaveX = Math.sin((i - 1) * 0.1 + phase) * prevAmplitude * (settings.showInvert ? -1 : 1);
      
      // Previous x based on placement
      let prevX;
      if (placement === 'bottom') { // left
        prevX = prevAmplitude + prevWaveX;
      } else if (placement === 'top') { // right
        prevX = (canvasWidth - prevAmplitude) + prevWaveX;
      } else { // middle
        // For middle placement, use the canvas center as the base position
        prevX = (canvasWidth / 2) + prevWaveX;
      }
      
      ctx.quadraticCurveTo(prevX, controlY, x, y);
    }
  }
  
  ctx.stroke();
  ctx.shadowBlur = 0;
  
  // Draw mirror if enabled
  if (settings.showMirror) {
    ctx.strokeStyle = `${settings.color}44`;
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    
    for (let i = 0; i <= segmentCount; i++) {
      const y = startY + (i * segmentHeight * direction);
      
      // Sample data from frequency array
      const dataIndex = Math.floor(i * (bufferLength / segmentCount));
      const value = dataArray[dataIndex] * settings.sensitivity;
      const normalizedValue = value / 255;
      
      // Calculate wave effect
      const phase = basePhase * Math.PI * 4;
      const amplitude = canvasWidth * 0.3 * normalizedValue;
      // Apply invert effect if enabled
      const waveX = Math.sin(i * 0.1 + phase) * amplitude * (settings.showInvert ? -1 : 1);
      
      // Calculate mirrored x position
      let x;
      if (placement === 'bottom') { // left
        x = (canvasWidth - amplitude) - waveX;
      } else if (placement === 'top') { // right
        x = amplitude - waveX;
      } else { // middle
        // For middle placement, use the canvas center as the base position for mirroring
        x = (canvasWidth / 2) - waveX;
      }
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        // Use curves for smoother animation
        const prevY = startY + ((i - 1) * segmentHeight * direction);
        const controlY = (prevY + y) / 2;
        
        const prevDataIndex = Math.floor((i - 1) * (bufferLength / segmentCount));
        const prevValue = dataArray[prevDataIndex] * settings.sensitivity;
        const prevNormalizedValue = prevValue / 255;
        const prevAmplitude = canvasWidth * 0.3 * prevNormalizedValue;
        // Apply invert effect if enabled
        const prevWaveX = Math.sin((i - 1) * 0.1 + phase) * prevAmplitude * (settings.showInvert ? -1 : 1);
        
        // Previous mirrored x
        let prevX;
        if (placement === 'bottom') { // left
          prevX = (canvasWidth - prevAmplitude) - prevWaveX;
        } else if (placement === 'top') { // right
          prevX = prevAmplitude - prevWaveX;
        } else { // middle
          // For middle placement, use the canvas center as the base position for mirroring
          prevX = (canvasWidth / 2) - prevWaveX;
        }
        
        ctx.quadraticCurveTo(prevX, controlY, x, y);
      }
    }
    
    ctx.stroke();
  }
};
