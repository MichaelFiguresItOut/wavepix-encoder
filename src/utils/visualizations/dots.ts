import { VisualizationSettings, formatColorWithOpacity } from './utils';

export const drawDotsAnimation = (
  ctx: CanvasRenderingContext2D,
  dataArray: Uint8Array,
  canvas: HTMLCanvasElement,
  bufferLength: number,
  timestamp: number,
  settings: VisualizationSettings
) => {
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  const centerX = canvasWidth / 2;
  
  // Animation phase
  const phase = (timestamp % 8000) / 8000 * Math.PI * 2;
  
  if (settings.showMirror) {
    // Mirrored mode - dots emanating from center in circular pattern
    const maxRings = 5;
    const dotsPerRing = 24;
    
    // Draw connecting lines between rings
    for (let ring = 0; ring < maxRings; ring++) {
      const ringRadius = 40 + ring * 40;
      
      ctx.beginPath();
      for (let i = 0; i < dotsPerRing; i++) {
        const angle = (i / dotsPerRing) * Math.PI * 2 + phase + (ring * 0.1);
        const dataIndex = Math.floor((ring * dotsPerRing + i) % bufferLength);
        const value = dataArray[dataIndex] * settings.sensitivity;
        const normalizedValue = value / 255;
        
        // Calculate radius with audio reactivity
        let radius;
        if (settings.showReversed) {
          // If Invert Effect is enabled, radiate inward (smaller radius for higher values)
          radius = ringRadius - normalizedValue * 30;
          // Ensure radius doesn't go below a minimum value
          radius = Math.max(10, radius);
        } else {
          // Default behavior - radiate outward
          radius = ringRadius + normalizedValue * 30;
        }
        
        // Calculate dot position
        const x = centerX + Math.cos(angle) * radius;
        const y = canvasHeight / 2 + Math.sin(angle) * radius;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.closePath();
      ctx.strokeStyle = formatColorWithOpacity(settings.color, 0.3);
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    
    // Draw dots at intersections
    for (let ring = 0; ring < maxRings; ring++) {
      const baseRadius = 40 + ring * 40;
      
      for (let i = 0; i < dotsPerRing; i++) {
        const angle = (i / dotsPerRing) * Math.PI * 2 + phase + (ring * 0.1);
        const dataIndex = Math.floor((ring * dotsPerRing + i) % bufferLength);
        const value = dataArray[dataIndex] * settings.sensitivity;
        const normalizedValue = value / 255;
        
        // Calculate radius with audio reactivity
        let radius;
        if (settings.showReversed) {
          // If Invert Effect is enabled, radiate inward (smaller radius for higher values)
          radius = baseRadius - normalizedValue * 30;
          // Ensure radius doesn't go below a minimum value
          radius = Math.max(10, radius);
        } else {
          // Default behavior - radiate outward
          radius = baseRadius + normalizedValue * 30;
        }
        
        // Calculate dot position
        const x = centerX + Math.cos(angle) * radius;
        const y = canvasHeight / 2 + Math.sin(angle) * radius;
        
        // Dot size based on frequency data
        const dotSize = 2 + normalizedValue * 6;
        
        // Draw glow/shadow
        ctx.shadowBlur = 10;
        ctx.shadowColor = settings.color;
        
        // Draw dot
        ctx.beginPath();
        ctx.arc(x, y, dotSize, 0, Math.PI * 2);
        ctx.fillStyle = settings.color;
        ctx.fill();
        
        // Reset shadow
        ctx.shadowBlur = 0;
      }
    }
  } else {
    // Non-mirrored mode - we'll use orientation settings here
    // Process each bar placement option
    settings.barPlacement.forEach(placement => {
      if (settings.horizontalOrientation) {
        // Horizontal dots in a wave pattern
        const dotCount = Math.min(bufferLength, 100);
        
        // Calculate centerY based on placement
        let centerY;
        if (placement === 'top') {
          centerY = canvasHeight * 0.2; // Near the top
        } else if (placement === 'middle') {
          centerY = canvasHeight / 2; // Middle of the screen
        } else { // bottom
          centerY = canvasHeight * 0.8; // Near the bottom
        }
        
        settings.animationStart.forEach(animationStart => {
          // Determine drawing direction based on animation start
          let startX = 0;
          let endX = canvasWidth;
          let directionMultiplier = 1;
          
          if (animationStart === 'beginning') {
            startX = 0;
            endX = canvasWidth;
            directionMultiplier = 1;
          } else if (animationStart === 'end') {
            startX = canvasWidth;
            endX = 0;
            directionMultiplier = -1;
          } else if (animationStart === 'middle') {
            // For middle, we'll draw from center outward
            const halfDotCount = Math.floor(dotCount / 2);
            
            // Draw first half (center to right)
            const dotSpacing = (canvasWidth / 2) / halfDotCount;
            
            // Draw connecting line first (behind dots)
            ctx.beginPath();
            for (let i = 0; i <= halfDotCount; i++) {
              const x = centerX + i * dotSpacing;
              const dataIndex = Math.floor(i * (bufferLength / dotCount));
              const value = dataArray[dataIndex] * settings.sensitivity;
              const normalizedValue = value / 255;
              
              // Calculate dot position with subtle wave motion
              const waveY = Math.sin(i * 0.15 + phase) * 20;
              
              // Apply the reversed direction if showReversed is enabled
              const direction = settings.showReversed ? 1 : -1;
              const y = centerY + (direction * normalizedValue * canvasHeight * 0.4) + waveY;
              
              if (i === 0) {
                ctx.moveTo(x, y);
              } else {
                ctx.lineTo(x, y);
              }
            }
            
            // Style the connecting line
            ctx.strokeStyle = `${settings.color}44`;
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Draw dots with shadow/glow
            for (let i = 0; i <= halfDotCount; i++) {
              const x = centerX + i * dotSpacing;
              const dataIndex = Math.floor(i * (bufferLength / dotCount));
              const value = dataArray[dataIndex] * settings.sensitivity;
              const normalizedValue = value / 255;
              
              // Calculate dot position with subtle wave motion
              const waveY = Math.sin(i * 0.15 + phase) * 20;
              
              // Apply the reversed direction if showReversed is enabled
              const direction = settings.showReversed ? 1 : -1;
              const y = centerY + (direction * normalizedValue * canvasHeight * 0.4) + waveY;
              
              // Dot size based on frequency data
              const dotSize = 2 + normalizedValue * 8;
              
              // Draw glow/shadow
              ctx.shadowBlur = 15;
              ctx.shadowColor = settings.color;
              
              // Draw dot
              ctx.beginPath();
              ctx.arc(x, y, dotSize, 0, Math.PI * 2);
              ctx.fillStyle = settings.color;
              ctx.fill();
              
              // Reset shadow
              ctx.shadowBlur = 0;
            }
            
            // Draw second half (center to left)
            // Draw connecting line first (behind dots)
            ctx.beginPath();
            for (let i = 0; i <= halfDotCount; i++) {
              const x = centerX - i * dotSpacing;
              const dataIndex = Math.floor((halfDotCount + i) * (bufferLength / dotCount));
              const value = dataArray[dataIndex] * settings.sensitivity;
              const normalizedValue = value / 255;
              
              // Calculate dot position with subtle wave motion
              const waveY = Math.sin(i * 0.15 + phase) * 20;
              
              // Apply the reversed direction if showReversed is enabled
              const direction = settings.showReversed ? 1 : -1;
              const y = centerY + (direction * normalizedValue * canvasHeight * 0.4) + waveY;
              
              if (i === 0) {
                ctx.moveTo(x, y);
              } else {
                ctx.lineTo(x, y);
              }
            }
            
            // Style the connecting line
            ctx.strokeStyle = `${settings.color}44`;
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Draw dots with shadow/glow
            for (let i = 0; i <= halfDotCount; i++) {
              const x = centerX - i * dotSpacing;
              const dataIndex = Math.floor((halfDotCount + i) * (bufferLength / dotCount));
              const value = dataArray[dataIndex] * settings.sensitivity;
              const normalizedValue = value / 255;
              
              // Calculate dot position with subtle wave motion
              const waveY = Math.sin(i * 0.15 + phase) * 20;
              
              // Apply the reversed direction if showReversed is enabled
              const direction = settings.showReversed ? 1 : -1;
              const y = centerY + (direction * normalizedValue * canvasHeight * 0.4) + waveY;
              
              // Dot size based on frequency data
              const dotSize = 2 + normalizedValue * 8;
              
              // Draw glow/shadow
              ctx.shadowBlur = 15;
              ctx.shadowColor = settings.color;
              
              // Draw dot
              ctx.beginPath();
              ctx.arc(x, y, dotSize, 0, Math.PI * 2);
              ctx.fillStyle = settings.color;
              ctx.fill();
              
              // Reset shadow
              ctx.shadowBlur = 0;
            }
            
            return; // Skip the rest of the code for middle animation start
          }
          
          const dotSpacing = Math.abs(endX - startX) / dotCount;
          
          // Draw connecting line first (behind dots)
          ctx.beginPath();
          for (let i = 0; i < dotCount; i++) {
            const x = startX + i * dotSpacing * directionMultiplier;
            const dataIndex = Math.floor(i * (bufferLength / dotCount));
            const value = dataArray[dataIndex] * settings.sensitivity;
            const normalizedValue = value / 255;
            
            // Calculate dot position with subtle wave motion
            const waveY = Math.sin(i * 0.15 + phase) * 20;
            
            // Apply the reversed direction if showReversed is enabled
            const direction = settings.showReversed ? 1 : -1;
            const y = centerY + (direction * normalizedValue * canvasHeight * 0.4) + waveY;
            
            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
          
          // Style the connecting line
          ctx.strokeStyle = `${settings.color}44`;
          ctx.lineWidth = 2;
          ctx.stroke();
          
          // Draw dots with shadow/glow
          for (let i = 0; i < dotCount; i++) {
            const x = startX + i * dotSpacing * directionMultiplier;
            const dataIndex = Math.floor(i * (bufferLength / dotCount));
            const value = dataArray[dataIndex] * settings.sensitivity;
            const normalizedValue = value / 255;
            
            // Calculate dot position with subtle wave motion
            const waveY = Math.sin(i * 0.15 + phase) * 20;
            
            // Apply the reversed direction if showReversed is enabled
            const direction = settings.showReversed ? 1 : -1;
            const y = centerY + (direction * normalizedValue * canvasHeight * 0.4) + waveY;
            
            // Dot size based on frequency data
            const dotSize = 2 + normalizedValue * 8;
            
            // Draw glow/shadow
            ctx.shadowBlur = 15;
            ctx.shadowColor = settings.color;
            
            // Draw dot
            ctx.beginPath();
            ctx.arc(x, y, dotSize, 0, Math.PI * 2);
            ctx.fillStyle = settings.color;
            ctx.fill();
            
            // Reset shadow
            ctx.shadowBlur = 0;
          }
        });
      }
      
      if (settings.verticalOrientation) {
        // Vertical dots in a wave pattern
        const dotCount = Math.min(bufferLength, 100);
        
        // Calculate centerX based on placement
        let centerX;
        if (placement === 'bottom') { // Left in vertical orientation
          centerX = canvasWidth * 0.2; // Near the left
        } else if (placement === 'middle') {
          centerX = canvasWidth / 2; // Middle of the screen
        } else { // top (Right in vertical orientation)
          centerX = canvasWidth * 0.8; // Near the right
        }
        
        settings.animationStart.forEach(animationStart => {
          // Determine drawing direction based on animation start
          let startY = 0;
          let endY = canvasHeight;
          let directionMultiplier = 1;
          
          if (animationStart === 'beginning') {
            startY = 0;
            endY = canvasHeight;
            directionMultiplier = 1;
          } else if (animationStart === 'end') {
            startY = canvasHeight;
            endY = 0;
            directionMultiplier = -1;
          } else if (animationStart === 'middle') {
            // For middle, we'll draw from center outward
            const halfDotCount = Math.floor(dotCount / 2);
            
            // Draw first half (center to bottom)
            const dotSpacing = (canvasHeight / 2) / halfDotCount;
            
            // Draw connecting line first (behind dots)
            ctx.beginPath();
            for (let i = 0; i <= halfDotCount; i++) {
              const y = canvasHeight / 2 + i * dotSpacing;
              const dataIndex = Math.floor(i * (bufferLength / dotCount));
              const value = dataArray[dataIndex] * settings.sensitivity;
              const normalizedValue = value / 255;
              
              // Calculate dot position with subtle wave motion
              const waveX = Math.sin(i * 0.15 + phase) * 20;
              
              // Apply the reversed direction if showReversed is enabled
              const direction = settings.showReversed ? 1 : -1;
              const x = centerX - (direction * normalizedValue * canvasWidth * 0.4) + waveX;
              
              if (i === 0) {
                ctx.moveTo(x, y);
              } else {
                ctx.lineTo(x, y);
              }
            }
            
            // Style the connecting line
            ctx.strokeStyle = `${settings.color}44`;
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Draw dots with shadow/glow
            for (let i = 0; i <= halfDotCount; i++) {
              const y = canvasHeight / 2 + i * dotSpacing;
              const dataIndex = Math.floor(i * (bufferLength / dotCount));
              const value = dataArray[dataIndex] * settings.sensitivity;
              const normalizedValue = value / 255;
              
              // Calculate dot position with subtle wave motion
              const waveX = Math.sin(i * 0.15 + phase) * 20;
              
              // Apply the reversed direction if showReversed is enabled
              const direction = settings.showReversed ? 1 : -1;
              const x = centerX - (direction * normalizedValue * canvasWidth * 0.4) + waveX;
              
              // Dot size based on frequency data
              const dotSize = 2 + normalizedValue * 8;
              
              // Draw glow/shadow
              ctx.shadowBlur = 15;
              ctx.shadowColor = settings.color;
              
              // Draw dot
              ctx.beginPath();
              ctx.arc(x, y, dotSize, 0, Math.PI * 2);
              ctx.fillStyle = settings.color;
              ctx.fill();
              
              // Reset shadow
              ctx.shadowBlur = 0;
            }
            
            // Draw second half (center to top)
            // Draw connecting line first (behind dots)
            ctx.beginPath();
            for (let i = 0; i <= halfDotCount; i++) {
              const y = canvasHeight / 2 - i * dotSpacing;
              const dataIndex = Math.floor((halfDotCount + i) * (bufferLength / dotCount));
              const value = dataArray[dataIndex] * settings.sensitivity;
              const normalizedValue = value / 255;
              
              // Calculate dot position with subtle wave motion
              const waveX = Math.sin(i * 0.15 + phase) * 20;
              
              // Apply the reversed direction if showReversed is enabled
              const direction = settings.showReversed ? 1 : -1;
              const x = centerX - (direction * normalizedValue * canvasWidth * 0.4) + waveX;
              
              if (i === 0) {
                ctx.moveTo(x, y);
              } else {
                ctx.lineTo(x, y);
              }
            }
            
            // Style the connecting line
            ctx.strokeStyle = `${settings.color}44`;
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Draw dots with shadow/glow
            for (let i = 0; i <= halfDotCount; i++) {
              const y = canvasHeight / 2 - i * dotSpacing;
              const dataIndex = Math.floor((halfDotCount + i) * (bufferLength / dotCount));
              const value = dataArray[dataIndex] * settings.sensitivity;
              const normalizedValue = value / 255;
              
              // Calculate dot position with subtle wave motion
              const waveX = Math.sin(i * 0.15 + phase) * 20;
              
              // Apply the reversed direction if showReversed is enabled
              const direction = settings.showReversed ? 1 : -1;
              const x = centerX - (direction * normalizedValue * canvasWidth * 0.4) + waveX;
              
              // Dot size based on frequency data
              const dotSize = 2 + normalizedValue * 8;
              
              // Draw glow/shadow
              ctx.shadowBlur = 15;
              ctx.shadowColor = settings.color;
              
              // Draw dot
              ctx.beginPath();
              ctx.arc(x, y, dotSize, 0, Math.PI * 2);
              ctx.fillStyle = settings.color;
              ctx.fill();
              
              // Reset shadow
              ctx.shadowBlur = 0;
            }
            
            return; // Skip the rest of the code for middle animation start
          }
          
          const dotSpacing = Math.abs(endY - startY) / dotCount;
          
          // Draw connecting line first (behind dots)
          ctx.beginPath();
          for (let i = 0; i < dotCount; i++) {
            const y = startY + i * dotSpacing * directionMultiplier;
            const dataIndex = Math.floor(i * (bufferLength / dotCount));
            const value = dataArray[dataIndex] * settings.sensitivity;
            const normalizedValue = value / 255;
            
            // Calculate dot position with subtle wave motion
            const waveX = Math.sin(i * 0.15 + phase) * 20;
            
            // Apply the reversed direction if showReversed is enabled
            const direction = settings.showReversed ? 1 : -1;
            const x = centerX - (direction * normalizedValue * canvasWidth * 0.4) + waveX;
            
            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
          
          // Style the connecting line
          ctx.strokeStyle = `${settings.color}44`;
          ctx.lineWidth = 2;
          ctx.stroke();
          
          // Draw dots with shadow/glow
          for (let i = 0; i < dotCount; i++) {
            const y = startY + i * dotSpacing * directionMultiplier;
            const dataIndex = Math.floor(i * (bufferLength / dotCount));
            const value = dataArray[dataIndex] * settings.sensitivity;
            const normalizedValue = value / 255;
            
            // Calculate dot position with subtle wave motion
            const waveX = Math.sin(i * 0.15 + phase) * 20;
            
            // Apply the reversed direction if showReversed is enabled
            const direction = settings.showReversed ? 1 : -1;
            const x = centerX - (direction * normalizedValue * canvasWidth * 0.4) + waveX;
            
            // Dot size based on frequency data
            const dotSize = 2 + normalizedValue * 8;
            
            // Draw glow/shadow
            ctx.shadowBlur = 15;
            ctx.shadowColor = settings.color;
            
            // Draw dot
            ctx.beginPath();
            ctx.arc(x, y, dotSize, 0, Math.PI * 2);
            ctx.fillStyle = settings.color;
            ctx.fill();
            
            // Reset shadow
            ctx.shadowBlur = 0;
          }
        });
      }
    });
  }
};
