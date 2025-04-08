import { VisualizerSettings } from '@/hooks/useAudioVisualization';
import { formatColorWithOpacity } from './utils';

export const drawBubblesAnimation = (
  ctx: CanvasRenderingContext2D,
  dataArray: Uint8Array,
  canvas: HTMLCanvasElement,
  bufferLength: number,
  timestamp: number,
  settings: VisualizerSettings
) => {
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  const currentRainbowSpeed = settings.rainbowSpeed || 1.0;
  const dotCount = 128; // Number of dots to display
  
  // If Round Effect is enabled, draw a circular base instead of bars
  if (settings.showMirror) {
    // Draw circular base with bubbles
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    const baseRadius = Math.min(canvasWidth, canvasHeight) * 0.2;
    
    // Draw base circle (respect rainbow setting)
    let baseCircleHue = null;
    let baseCircleStyle: string;
    if (settings.showRainbow) {
        baseCircleHue = (timestamp / 40 * currentRainbowSpeed) % 360; // Slightly different speed for base
        if (isNaN(baseCircleHue)) baseCircleHue = 0;
        baseCircleStyle = `hsla(${baseCircleHue}, 80%, 50%, 0.5)`;
    } else {
        baseCircleStyle = formatColorWithOpacity(settings.color, 0.5);
    }
    ctx.beginPath();
    ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2);
    ctx.strokeStyle = baseCircleStyle;
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Add bubbles emanating from the circle
    const bubbleCount = 48; // Fewer bubbles for cleaner look
    
    for (let i = 0; i < bubbleCount; i++) {
      // Get data for this bubble
      const index = Math.floor(i * (bufferLength / bubbleCount));
      const value = dataArray[index] * settings.sensitivity;
      const normalizedValue = value / 255;
      
      // Calculate angle around the circle
      const angle = (i / bubbleCount) * Math.PI * 2;
      
      // Calculate distance from center 
      const oscFactor = Math.sin((timestamp / 500) + i * 0.2) * 0.5 + 0.5;
      
      let distance;
      if (settings.showReversed) {
        // If Invert Effect is enabled, bubbles move inward
        // Higher values move bubbles closer to center
        distance = baseRadius - (normalizedValue * 50 * oscFactor);
        // Ensure a minimum distance to prevent bubbles from crossing center
        distance = Math.max(10, distance);
      } else {
        // Default behavior - bubbles move outward
        distance = baseRadius + (normalizedValue * 150 * oscFactor);
      }
      
      // Calculate bubble position
      const x = centerX + Math.cos(angle) * distance;
      const y = centerY + Math.sin(angle) * distance;
      
      // Calculate the bubble size based on the frequency value
      const bubbleSize = Math.max(2, normalizedValue * 15);
      
      // Determine bubble color
      let bubbleFillStyle: string;
      if (settings.showRainbow) {
          const hue = (normalizedValue * 120) + ((timestamp / 50 * currentRainbowSpeed) % 360);
          bubbleFillStyle = `hsl(${hue}, 80%, 60%)`;
      } else {
          bubbleFillStyle = settings.color;
      }

      // Draw the bubble
      ctx.beginPath();
      ctx.arc(x, y, bubbleSize, 0, Math.PI * 2);
      ctx.fillStyle = bubbleFillStyle;
      ctx.fill();
      
      // Add glow effect for larger bubbles (using the determined fill style)
      if (bubbleSize > 5) {
        ctx.shadowBlur = bubbleSize;
        ctx.shadowColor = bubbleFillStyle; // Use calculated color
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }
    
    return; // Skip the rest of the rendering
  }
  
  // Original bar-based bubbles visualization
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
          
          // Apply inversion effect if enabled
          const direction = settings.showReversed ? -1 : 1;
          const y = baseY + (direction * oscillation * normalizedValue);
          
          // Determine bubble color
          let bubbleFillStyle: string;
          if (settings.showRainbow) {
              const hue = (normalizedValue * 120) + ((timestamp / 50 * currentRainbowSpeed) % 360);
              bubbleFillStyle = `hsl(${hue}, 80%, 60%)`;
          } else {
              bubbleFillStyle = settings.color;
          }
          
          // Draw the dot
          ctx.beginPath();
          ctx.arc(x, y, dotSize, 0, Math.PI * 2);
          ctx.fillStyle = bubbleFillStyle;
          ctx.fill();
          
          // Add glow effect for larger dots (using determined fill style)
          if (dotSize > 5) {
            ctx.shadowBlur = dotSize;
            ctx.shadowColor = bubbleFillStyle; // Use calculated color
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
          
          // Apply inversion effect if enabled
          const direction = settings.showReversed ? -1 : 1;
          const x = baseX + (direction * oscillation * normalizedValue);
          
          // Determine bubble color
          let bubbleFillStyle: string;
          if (settings.showRainbow) {
              const hue = (normalizedValue * 120) + ((timestamp / 50 * currentRainbowSpeed) % 360);
              bubbleFillStyle = `hsl(${hue}, 80%, 60%)`;
          } else {
              bubbleFillStyle = settings.color;
          }
          
          // Draw the dot
          ctx.beginPath();
          ctx.arc(x, y, dotSize, 0, Math.PI * 2);
          ctx.fillStyle = bubbleFillStyle;
          ctx.fill();
          
          // Add glow effect for larger dots (using determined fill style)
          if (dotSize > 5) {
            ctx.shadowBlur = dotSize;
            ctx.shadowColor = bubbleFillStyle; // Use calculated color
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }
      });
    }
  });
}; 