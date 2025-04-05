import { VisualizationSettings, formatColorWithOpacity } from './utils';

export const drawBubblesAnimation = (
  ctx: CanvasRenderingContext2D,
  dataArray: Uint8Array,
  canvas: HTMLCanvasElement,
  bufferLength: number,
  timestamp: number,
  settings: VisualizationSettings
) => {
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  const dotCount = 128; // Number of dots to display
  
  // Process each bar placement option
  settings.barPlacement.forEach(placement => {
    if (settings.horizontalOrientation) {
      // Calculate the base Y position based on placement
      let baseY;
      if (placement === 'top') {
        baseY = canvasHeight * 0.2; // Near the top
      } else if (placement === 'middle') {
        baseY = canvasHeight / 2; // Middle of the screen
      } else { // bottom
        baseY = canvasHeight * 0.8; // Near the bottom
      }
      
      settings.animationStart.forEach(animationStart => {
        const sliceWidth = canvasWidth / dotCount;
        
        for (let i = 0; i < dotCount; i++) {
          // Get data for this dot
          const index = Math.floor(i * (bufferLength / dotCount));
          const value = dataArray[index] * settings.sensitivity;
          const normalizedValue = value / 255;
          
          // Calculate the dot size based on the frequency value
          const dotSize = Math.max(1, normalizedValue * 15);
          
          // Calculate X position based on animation start
          let x;
          if (animationStart === 'beginning') {
            x = i * sliceWidth;
          } else if (animationStart === 'end') {
            x = canvasWidth - (i * sliceWidth);
          } else { // middle
            const middleIndex = dotCount / 2;
            const distanceFromMiddle = Math.abs(i - middleIndex);
            if (i < middleIndex) {
              x = (canvasWidth / 2) - (distanceFromMiddle * sliceWidth);
            } else {
              x = (canvasWidth / 2) + ((i - middleIndex) * sliceWidth);
            }
          }
          
          // Calculate Y position with some oscillation
          const oscillation = Math.sin((i / 10) + (timestamp / 500)) * 20;
          const y = baseY + (oscillation * normalizedValue);
          
          // Color based on frequency value
          const hue = (normalizedValue * 120) + ((timestamp / 50) % 360);
          ctx.fillStyle = settings.color !== '#3B82F6' 
            ? settings.color 
            : `hsl(${hue}, 80%, 60%)`;
          
          // Draw the dot
          ctx.beginPath();
          ctx.arc(x, y, dotSize, 0, Math.PI * 2);
          ctx.fill();
          
          // Add glow effect for larger dots
          if (dotSize > 5) {
            ctx.shadowBlur = dotSize;
            ctx.shadowColor = ctx.fillStyle;
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }
      });
    }
    
    if (settings.verticalOrientation) {
      // Calculate the base X position based on placement
      let baseX;
      if (placement === 'bottom') { // Left in vertical orientation
        baseX = canvasWidth * 0.2; // Near the left
      } else if (placement === 'middle') {
        baseX = canvasWidth / 2; // Middle of the screen
      } else { // top (Right in vertical orientation)
        baseX = canvasWidth * 0.8; // Near the right
      }
      
      settings.animationStart.forEach(animationStart => {
        const sliceHeight = canvasHeight / dotCount;
        
        for (let i = 0; i < dotCount; i++) {
          // Get data for this dot
          const index = Math.floor(i * (bufferLength / dotCount));
          const value = dataArray[index] * settings.sensitivity;
          const normalizedValue = value / 255;
          
          // Calculate the dot size based on the frequency value
          const dotSize = Math.max(1, normalizedValue * 15);
          
          // Calculate Y position based on animation start
          let y;
          if (animationStart === 'beginning') {
            y = i * sliceHeight;
          } else if (animationStart === 'end') {
            y = canvasHeight - (i * sliceHeight);
          } else { // middle
            const middleIndex = dotCount / 2;
            const distanceFromMiddle = Math.abs(i - middleIndex);
            if (i < middleIndex) {
              y = (canvasHeight / 2) - (distanceFromMiddle * sliceHeight);
            } else {
              y = (canvasHeight / 2) + ((i - middleIndex) * sliceHeight);
            }
          }
          
          // Calculate X position with some oscillation
          const oscillation = Math.sin((i / 10) + (timestamp / 500)) * 20;
          const x = baseX + (oscillation * normalizedValue);
          
          // Color based on frequency value
          const hue = (normalizedValue * 120) + ((timestamp / 50) % 360);
          ctx.fillStyle = settings.color !== '#3B82F6' 
            ? settings.color 
            : `hsl(${hue}, 80%, 60%)`;
          
          // Draw the dot
          ctx.beginPath();
          ctx.arc(x, y, dotSize, 0, Math.PI * 2);
          ctx.fill();
          
          // Add glow effect for larger dots
          if (dotSize > 5) {
            ctx.shadowBlur = dotSize;
            ctx.shadowColor = ctx.fillStyle;
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }
      });
    }
  });
}; 