import { VisualizerSettings } from '@/hooks/useAudioVisualization'; // Use hook type
import { BarVisualizationSettings, getYPositionForPlacement, getXPositionForPlacement, getAnimationStartPosition, getHorizontalDirection, getVerticalDirection, generateRainbowColor } from './utils';

// Store the last color change time and current rainbow color
let lastColorChangeTime = 0;
let currentRainbowColor = '#3B82F6';

export const drawBars = (
  ctx: CanvasRenderingContext2D,
  dataArray: Uint8Array,
  canvas: HTMLCanvasElement,
  bufferLength: number,
  settings: VisualizerSettings & BarVisualizationSettings, // Combine types if needed, or ensure VisualizerSettings includes Bar specific ones
  timestamp: number
) => {
  const barWidth = settings.barWidth;
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  
  // Get current speed, default to 1.0 (used if rainbow is on)
  const currentRainbowSpeed = settings.rainbowSpeed || 1.0; 

  // Helper to get CYCLING hue if Rainbow is ON
  const getCurrentHue = () => {
    if (settings.showRainbow) { 
      // Base the hue on time and speed (faster base speed)
      return (timestamp / 10 * currentRainbowSpeed) % 360; 
    }
    return null; 
  };

  // Base hue for this frame (if rainbow is on)
  const baseHue = getCurrentHue();

  if (settings.horizontalOrientation) {
    // Horizontal bars visualization
    const totalBars = Math.min(Math.floor(canvasWidth / (barWidth + 1)), bufferLength);
    const barSpacing = 1;
    
    // Use full canvas space
    const maxBarHeight = canvasHeight * 0.9;
    
    // Process each animation start option
    settings.animationStart.forEach(animationStart => {
      const startPosition = getAnimationStartPosition(canvasWidth, animationStart);
      const direction = getHorizontalDirection(animationStart);
      
      // For beginning, use standard left-to-right
      if (animationStart === 'beginning') {
        for (let i = 0; i < totalBars; i++) {
          const index = Math.floor(i * (bufferLength / totalBars));
          const value = dataArray[index] * settings.sensitivity;
          const barHeight = (value / 255) * maxBarHeight;
          
          const x = i * (barWidth + barSpacing);
          
          // Determine bar hue/color based on rainbow state
          const offsetHue = baseHue !== null ? (baseHue + i * 15) % 360 : null;
          const baseColor = settings.color; // Used if rainbow is OFF
          
          // Draw bars for each selected placement
          settings.barPlacement.forEach(placement => {
            const y = getYPositionForPlacement(canvasHeight, placement, barHeight);
            
            // Create gradient for each bar
            const gradient = ctx.createLinearGradient(x, canvasHeight, x, y);
            
            // CORRECT Gradient color logic for HSL/Hex
            if (offsetHue !== null) {
              // Rainbow ON: Use HSLA
              gradient.addColorStop(0, `hsla(${offsetHue}, 90%, 60%, 1.0)`); 
              gradient.addColorStop(1, `hsla(${offsetHue}, 90%, 60%, 0.13)`); // ~22 hex alpha
            } else {
              // Rainbow OFF: Use Hex + Hex Alpha
              gradient.addColorStop(0, `${baseColor}FF`); 
              gradient.addColorStop(1, `${baseColor}22`);
            }
            
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
              // CORRECT Mirror color logic for HSL/Hex
              if (offsetHue !== null) {
                  ctx.fillStyle = `hsla(${offsetHue}, 90%, 60%, 0.4)`; // HSLA for mirror (~66 hex alpha)
              } else {
                  ctx.fillStyle = `${baseColor}66`; // Hex + Hex Alpha for mirror
              }
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
      // For end, we draw right to left
      else if (animationStart === 'end') {
        for (let i = 0; i < totalBars; i++) {
          const index = Math.floor(i * (bufferLength / totalBars));
          const value = dataArray[index] * settings.sensitivity;
          const barHeight = (value / 255) * maxBarHeight;
          
          // Start from the right side
          const x = canvasWidth - (i * (barWidth + barSpacing)) - barWidth;
          
          // Determine bar hue/color based on rainbow state
          const offsetHue = baseHue !== null ? (baseHue + i * 15) % 360 : null;
          const baseColor = settings.color; // Used if rainbow is OFF
          
          // Draw bars for each selected placement
          settings.barPlacement.forEach(placement => {
            const y = getYPositionForPlacement(canvasHeight, placement, barHeight);
            
            // Create gradient for each bar
            const gradient = ctx.createLinearGradient(x, canvasHeight, x, y);
            
            // CORRECT Gradient color logic for HSL/Hex
            if (offsetHue !== null) {
              // Rainbow ON: Use HSLA
              gradient.addColorStop(0, `hsla(${offsetHue}, 90%, 60%, 1.0)`); 
              gradient.addColorStop(1, `hsla(${offsetHue}, 90%, 60%, 0.13)`); // ~22 hex alpha
            } else {
              // Rainbow OFF: Use Hex + Hex Alpha
              gradient.addColorStop(0, `${baseColor}FF`); 
              gradient.addColorStop(1, `${baseColor}22`);
            }
            
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
              // CORRECT Mirror color logic for HSL/Hex
              if (offsetHue !== null) {
                  ctx.fillStyle = `hsla(${offsetHue}, 90%, 60%, 0.4)`; // HSLA for mirror (~66 hex alpha)
              } else {
                  ctx.fillStyle = `${baseColor}66`; // Hex + Hex Alpha for mirror
              }
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
      // For middle, we draw from center outward
      else if (animationStart === 'middle') {
        const centerX = canvasWidth / 2;
        const halfTotalBars = Math.floor(totalBars / 2);
        
        // Draw bars from center to right
        for (let i = 0; i < halfTotalBars; i++) {
          const index = Math.floor(i * (bufferLength / totalBars));
          const value = dataArray[index] * settings.sensitivity;
          const barHeight = (value / 255) * maxBarHeight;
          
          const x = centerX + i * (barWidth + barSpacing);
          
          // Determine bar hue/color based on rainbow state
          const offsetHue = baseHue !== null ? (baseHue + i * 15) % 360 : null;
          const baseColor = settings.color; // Used if rainbow is OFF
          
          // Draw bars for each selected placement
          settings.barPlacement.forEach(placement => {
            const y = getYPositionForPlacement(canvasHeight, placement, barHeight);
            
            // Create gradient for each bar
            const gradient = ctx.createLinearGradient(x, canvasHeight, x, y);
            
            // CORRECT Gradient color logic for HSL/Hex
            if (offsetHue !== null) {
              // Rainbow ON: Use HSLA
              gradient.addColorStop(0, `hsla(${offsetHue}, 90%, 60%, 1.0)`); 
              gradient.addColorStop(1, `hsla(${offsetHue}, 90%, 60%, 0.13)`); // ~22 hex alpha
            } else {
              // Rainbow OFF: Use Hex + Hex Alpha
              gradient.addColorStop(0, `${baseColor}FF`); 
              gradient.addColorStop(1, `${baseColor}22`);
            }
            
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
          });
        }
        
        // Draw bars from center to left
        for (let i = 0; i < halfTotalBars; i++) {
          const index = Math.floor((halfTotalBars + i) * (bufferLength / totalBars));
          const value = dataArray[index] * settings.sensitivity;
          const barHeight = (value / 255) * maxBarHeight;
          
          const x = centerX - (i + 1) * (barWidth + barSpacing);
          
          // Determine bar hue/color based on rainbow state
          const offsetHue = baseHue !== null ? (baseHue + i * 15) % 360 : null;
          const baseColor = settings.color; // Used if rainbow is OFF
          
          // Draw bars for each selected placement
          settings.barPlacement.forEach(placement => {
            const y = getYPositionForPlacement(canvasHeight, placement, barHeight);
            
            // Create gradient for each bar
            const gradient = ctx.createLinearGradient(x, canvasHeight, x, y);
            
            // CORRECT Gradient color logic for HSL/Hex
            if (offsetHue !== null) {
              // Rainbow ON: Use HSLA
              gradient.addColorStop(0, `hsla(${offsetHue}, 90%, 60%, 1.0)`); 
              gradient.addColorStop(1, `hsla(${offsetHue}, 90%, 60%, 0.13)`); // ~22 hex alpha
            } else {
              // Rainbow OFF: Use Hex + Hex Alpha
              gradient.addColorStop(0, `${baseColor}FF`); 
              gradient.addColorStop(1, `${baseColor}22`);
            }
            
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
          });
        }
      }
    });
  }
  
  if (settings.verticalOrientation) {
    // Vertical bars visualization
    const totalBars = Math.min(Math.floor(canvasHeight / (barWidth + 1)), bufferLength);
    const barSpacing = 1;
    
    // Use full canvas space
    const maxBarWidth = canvasWidth * 0.9;
    
    // Process each animation start option
    settings.animationStart.forEach(animationStart => {
      const startPosition = getAnimationStartPosition(canvasHeight, animationStart);
      const direction = getVerticalDirection(animationStart);
      
      // For beginning (top to bottom)
      if (animationStart === 'beginning') {
        for (let i = 0; i < totalBars; i++) {
          const index = Math.floor(i * (bufferLength / totalBars));
          const value = dataArray[index] * settings.sensitivity;
          const barWidth = (value / 255) * maxBarWidth;
          
          const y = i * (settings.barWidth + barSpacing);
          
          // Determine bar hue/color based on rainbow state
          const offsetHue = baseHue !== null ? (baseHue + i * 15) % 360 : null;
          const baseColor = settings.color; // Used if rainbow is OFF
          
          // Draw bars for each selected placement
          settings.barPlacement.forEach(placement => {
            // For vertical mode, we map placement differently
            const x = getXPositionForPlacement(canvasWidth, placement, barWidth);
            
            // Create gradient for each bar
            const gradient = ctx.createLinearGradient(x, y, x + barWidth, y);
            
            // CORRECT Gradient color logic for HSL/Hex
            if (offsetHue !== null) {
              // Rainbow ON: Use HSLA
              gradient.addColorStop(0, `hsla(${offsetHue}, 90%, 60%, 1.0)`); 
              gradient.addColorStop(1, `hsla(${offsetHue}, 90%, 60%, 0.13)`);
            } else {
              // Rainbow OFF: Use Hex + Hex Alpha
              gradient.addColorStop(0, `${baseColor}FF`); 
              gradient.addColorStop(1, `${baseColor}22`);
            }
            
            ctx.fillStyle = gradient;
            
            // Rounded end for bars
            const radius = settings.barWidth / 2;
            ctx.beginPath();
            
            if (placement === 'bottom') { // Left in vertical mode
              ctx.moveTo(0, y);
              ctx.lineTo(barWidth - radius, y);
              ctx.quadraticCurveTo(barWidth, y, barWidth, y + radius);
              ctx.lineTo(barWidth, y + settings.barWidth - radius);
              ctx.quadraticCurveTo(barWidth, y + settings.barWidth, barWidth - radius, y + settings.barWidth);
              ctx.lineTo(0, y + settings.barWidth);
            } else if (placement === 'top') { // Right in vertical mode
              ctx.moveTo(canvasWidth, y);
              ctx.lineTo(canvasWidth - barWidth + radius, y);
              ctx.quadraticCurveTo(canvasWidth - barWidth, y, canvasWidth - barWidth, y + radius);
              ctx.lineTo(canvasWidth - barWidth, y + settings.barWidth - radius);
              ctx.quadraticCurveTo(canvasWidth - barWidth, y + settings.barWidth, canvasWidth - barWidth + radius, y + settings.barWidth);
              ctx.lineTo(canvasWidth, y + settings.barWidth);
            } else { // middle
              const centerX = (canvasWidth - barWidth) / 2;
              ctx.moveTo(centerX, y);
              ctx.lineTo(centerX + barWidth, y);
              ctx.lineTo(centerX + barWidth, y + settings.barWidth);
              ctx.lineTo(centerX, y + settings.barWidth);
              ctx.closePath();
            }
            
            ctx.fill();
          });
        }
      }
      // For end (bottom to top)
      else if (animationStart === 'end') {
        for (let i = 0; i < totalBars; i++) {
          const index = Math.floor(i * (bufferLength / totalBars));
          const value = dataArray[index] * settings.sensitivity;
          const barWidth = (value / 255) * maxBarWidth;
          
          // Start from the bottom
          const y = canvasHeight - (i * (settings.barWidth + barSpacing)) - settings.barWidth;
          
          // Determine bar hue/color based on rainbow state
          const offsetHue = baseHue !== null ? (baseHue + i * 15) % 360 : null;
          const baseColor = settings.color; // Used if rainbow is OFF
          
          // Draw bars for each selected placement
          settings.barPlacement.forEach(placement => {
            // For vertical mode, we map placement differently
            const x = getXPositionForPlacement(canvasWidth, placement, barWidth);
            
            // Create gradient for each bar
            const gradient = ctx.createLinearGradient(x, y, x + barWidth, y);
            
            // CORRECT Gradient color logic for HSL/Hex
            if (offsetHue !== null) {
              // Rainbow ON: Use HSLA
              gradient.addColorStop(0, `hsla(${offsetHue}, 90%, 60%, 1.0)`); 
              gradient.addColorStop(1, `hsla(${offsetHue}, 90%, 60%, 0.13)`);
            } else {
              // Rainbow OFF: Use Hex + Hex Alpha
              gradient.addColorStop(0, `${baseColor}FF`); 
              gradient.addColorStop(1, `${baseColor}22`);
            }
            
            ctx.fillStyle = gradient;
            
            // Rounded end for bars
            const radius = settings.barWidth / 2;
            ctx.beginPath();
            
            if (placement === 'bottom') { // Left in vertical mode
              ctx.moveTo(0, y);
              ctx.lineTo(barWidth - radius, y);
              ctx.quadraticCurveTo(barWidth, y, barWidth, y + radius);
              ctx.lineTo(barWidth, y + settings.barWidth - radius);
              ctx.quadraticCurveTo(barWidth, y + settings.barWidth, barWidth - radius, y + settings.barWidth);
              ctx.lineTo(0, y + settings.barWidth);
            } else if (placement === 'top') { // Right in vertical mode
              ctx.moveTo(canvasWidth, y);
              ctx.lineTo(canvasWidth - barWidth + radius, y);
              ctx.quadraticCurveTo(canvasWidth - barWidth, y, canvasWidth - barWidth, y + radius);
              ctx.lineTo(canvasWidth - barWidth, y + settings.barWidth - radius);
              ctx.quadraticCurveTo(canvasWidth - barWidth, y + settings.barWidth, canvasWidth - barWidth + radius, y + settings.barWidth);
              ctx.lineTo(canvasWidth, y + settings.barWidth);
            } else { // middle
              const centerX = (canvasWidth - barWidth) / 2;
              ctx.moveTo(centerX, y);
              ctx.lineTo(centerX + barWidth, y);
              ctx.lineTo(centerX + barWidth, y + settings.barWidth);
              ctx.lineTo(centerX, y + settings.barWidth);
              ctx.closePath();
            }
            
            ctx.fill();
          });
        }
      }
      // For middle (center outward)
      else if (animationStart === 'middle') {
        const centerY = canvasHeight / 2;
        const halfTotalBars = Math.floor(totalBars / 2);
        
        // Draw bars from center down
        for (let i = 0; i < halfTotalBars; i++) {
          const index = Math.floor(i * (bufferLength / totalBars));
          const value = dataArray[index] * settings.sensitivity;
          const barWidth = (value / 255) * maxBarWidth;
          
          const y = centerY + i * (settings.barWidth + barSpacing);
          
          // Determine bar hue/color based on rainbow state
          const offsetHue = baseHue !== null ? (baseHue + i * 15) % 360 : null;
          const baseColor = settings.color; // Used if rainbow is OFF
          
          // Draw bars for each selected placement
          settings.barPlacement.forEach(placement => {
            // For vertical mode, we map placement differently
            const x = getXPositionForPlacement(canvasWidth, placement, barWidth);
            
            // Create gradient for each bar
            const gradient = ctx.createLinearGradient(x, y, x + barWidth, y);
            
            // CORRECT Gradient color logic for HSL/Hex
            if (offsetHue !== null) {
              // Rainbow ON: Use HSLA
              gradient.addColorStop(0, `hsla(${offsetHue}, 90%, 60%, 1.0)`); 
              gradient.addColorStop(1, `hsla(${offsetHue}, 90%, 60%, 0.13)`);
            } else {
              // Rainbow OFF: Use Hex + Hex Alpha
              gradient.addColorStop(0, `${baseColor}FF`); 
              gradient.addColorStop(1, `${baseColor}22`);
            }
            
            ctx.fillStyle = gradient;
            
            // Rounded end for bars
            const radius = settings.barWidth / 2;
            ctx.beginPath();
            
            if (placement === 'bottom') { // Left in vertical mode
              ctx.moveTo(0, y);
              ctx.lineTo(barWidth - radius, y);
              ctx.quadraticCurveTo(barWidth, y, barWidth, y + radius);
              ctx.lineTo(barWidth, y + settings.barWidth - radius);
              ctx.quadraticCurveTo(barWidth, y + settings.barWidth, barWidth - radius, y + settings.barWidth);
              ctx.lineTo(0, y + settings.barWidth);
            } else if (placement === 'top') { // Right in vertical mode
              ctx.moveTo(canvasWidth, y);
              ctx.lineTo(canvasWidth - barWidth + radius, y);
              ctx.quadraticCurveTo(canvasWidth - barWidth, y, canvasWidth - barWidth, y + radius);
              ctx.lineTo(canvasWidth - barWidth, y + settings.barWidth - radius);
              ctx.quadraticCurveTo(canvasWidth - barWidth, y + settings.barWidth, canvasWidth - barWidth + radius, y + settings.barWidth);
              ctx.lineTo(canvasWidth, y + settings.barWidth);
            } else { // middle
              const centerX = (canvasWidth - barWidth) / 2;
              ctx.moveTo(centerX, y);
              ctx.lineTo(centerX + barWidth, y);
              ctx.lineTo(centerX + barWidth, y + settings.barWidth);
              ctx.lineTo(centerX, y + settings.barWidth);
              ctx.closePath();
            }
            
            ctx.fill();
          });
        }
        
        // Draw bars from center up
        for (let i = 0; i < halfTotalBars; i++) {
          const index = Math.floor((halfTotalBars + i) * (bufferLength / totalBars));
          const value = dataArray[index] * settings.sensitivity;
          const barWidth = (value / 255) * maxBarWidth;
          
          const y = centerY - (i + 1) * (settings.barWidth + barSpacing);
          
          // Determine bar color
          let barColor;
          if (baseHue !== null) {
            // Rainbow ON: Use cycling hue with offset per bar
            const offsetHue = (baseHue + i * 15) % 360; // Add offset based on bar index 'i'
            barColor = `hsl(${offsetHue}, 90%, 60%)`;
          } else {
            // Rainbow OFF: Use the setting color
            barColor = settings.color;
          }
          
          // Draw bars for each selected placement
          settings.barPlacement.forEach(placement => {
            // For vertical mode, we map placement differently
            const x = getXPositionForPlacement(canvasWidth, placement, barWidth);
            
            // Create gradient for each bar
            const gradient = ctx.createLinearGradient(x, y, x + barWidth, y);
            
            // Apply gradient colors based on barColor (which handles rainbow state)
            gradient.addColorStop(0, `${barColor}FF`); 
            gradient.addColorStop(1, `${barColor}22`); // Note: This hex alpha append might fail for HSL. Needs correction.
            
            ctx.fillStyle = gradient;
            
            // Rounded end for bars
            const radius = settings.barWidth / 2;
            ctx.beginPath();
            
            if (placement === 'bottom') { // Left in vertical mode
              ctx.moveTo(0, y);
              ctx.lineTo(barWidth - radius, y);
              ctx.quadraticCurveTo(barWidth, y, barWidth, y + radius);
              ctx.lineTo(barWidth, y + settings.barWidth - radius);
              ctx.quadraticCurveTo(barWidth, y + settings.barWidth, barWidth - radius, y + settings.barWidth);
              ctx.lineTo(0, y + settings.barWidth);
            } else if (placement === 'top') { // Right in vertical mode
              ctx.moveTo(canvasWidth, y);
              ctx.lineTo(canvasWidth - barWidth + radius, y);
              ctx.quadraticCurveTo(canvasWidth - barWidth, y, canvasWidth - barWidth, y + radius);
              ctx.lineTo(canvasWidth - barWidth, y + settings.barWidth - radius);
              ctx.quadraticCurveTo(canvasWidth - barWidth, y + settings.barWidth, canvasWidth - barWidth + radius, y + settings.barWidth);
              ctx.lineTo(canvasWidth, y + settings.barWidth);
            } else { // middle
              const centerX = (canvasWidth - barWidth) / 2;
              ctx.moveTo(centerX, y);
              ctx.lineTo(centerX + barWidth, y);
              ctx.lineTo(centerX + barWidth, y + settings.barWidth);
              ctx.lineTo(centerX, y + settings.barWidth);
              ctx.closePath();
            }
            
            ctx.fill();
          });
        }
      }
    });
  }
};
