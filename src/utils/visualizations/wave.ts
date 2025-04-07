import { VisualizationSettings, getYPositionForPlacement, getXPositionForPlacement } from './utils';

export const drawWave = (
  ctx: CanvasRenderingContext2D,
  dataArray: Uint8Array,
  canvas: HTMLCanvasElement,
  bufferLength: number,
  settings: VisualizationSettings
) => {
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  
  // Horizontal wave
  if (settings.horizontalOrientation) {
    // Draw a more prominent wave
    ctx.strokeStyle = settings.color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Process each bar placement option
    settings.barPlacement.forEach(placement => {
      // Calculate base y position based on placement
      const baseY = getYPositionForPlacement(canvasHeight, placement, canvasHeight * 0.4);
      
      // Process each animation start option
      settings.animationStart.forEach(animationStart => {
        if (animationStart === 'beginning') {
          // Left to right
          ctx.beginPath();
          
          const sliceWidth = canvasWidth / bufferLength;
          let x = 0;
          
          for (let i = 0; i < bufferLength; i++) {
            const value = dataArray[i] * settings.sensitivity;
            const amplitude = (value / 255) * canvasHeight * 0.4;
            let y;
            
            // Adjust y position based on placement
            if (placement === 'bottom') {
              y = canvasHeight - amplitude;
            } else if (placement === 'top') {
              y = amplitude;
            } else { // middle
              y = (canvasHeight / 2) - (amplitude / 2); // Fix: Properly center the wave
            }
            
            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
            
            x += sliceWidth;
          }
          
          ctx.stroke();
          
          // Add glow effect
          ctx.shadowBlur = 15;
          ctx.shadowColor = settings.color;
          ctx.stroke();
          ctx.shadowBlur = 0;
        } 
        else if (animationStart === 'end') {
          // Right to left
          ctx.beginPath();
          
          const sliceWidth = canvasWidth / bufferLength;
          let x = canvasWidth;
          
          for (let i = 0; i < bufferLength; i++) {
            const value = dataArray[i] * settings.sensitivity;
            const amplitude = (value / 255) * canvasHeight * 0.4;
            let y;
            
            // Adjust y position based on placement
            if (placement === 'bottom') {
              y = canvasHeight - amplitude;
            } else if (placement === 'top') {
              y = amplitude;
            } else { // middle
              y = (canvasHeight / 2) - (amplitude / 2); // Fix: Properly center the wave
            }
            
            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
            
            x -= sliceWidth;
          }
          
          ctx.stroke();
          
          // Add glow effect
          ctx.shadowBlur = 15;
          ctx.shadowColor = settings.color;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
        else if (animationStart === 'middle') {
          // From middle outward
          const centerX = canvasWidth / 2;
          const sliceWidth = (canvasWidth / 2) / (bufferLength / 2);
          
          // Right half
          ctx.beginPath();
          let x = centerX;
          
          for (let i = 0; i < bufferLength / 2; i++) {
            const value = dataArray[i] * settings.sensitivity;
            const amplitude = (value / 255) * canvasHeight * 0.4;
            let y;
            
            // Adjust y position based on placement
            if (placement === 'bottom') {
              y = canvasHeight - amplitude;
            } else if (placement === 'top') {
              y = amplitude;
            } else { // middle
              y = (canvasHeight / 2) - (amplitude / 2); // Fix: Properly center the wave
            }
            
            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
            
            x += sliceWidth;
          }
          
          ctx.stroke();
          
          // Left half
          ctx.beginPath();
          x = centerX;
          
          for (let i = 0; i < bufferLength / 2; i++) {
            const value = dataArray[bufferLength / 2 + i] * settings.sensitivity;
            const amplitude = (value / 255) * canvasHeight * 0.4;
            let y;
            
            // Adjust y position based on placement
            if (placement === 'bottom') {
              y = canvasHeight - amplitude;
            } else if (placement === 'top') {
              y = amplitude;
            } else { // middle
              y = (canvasHeight / 2) - (amplitude / 2); // Fix: Properly center the wave
            }
            
            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
            
            x -= sliceWidth;
          }
          
          ctx.stroke();
          
          // Add glow effect
          ctx.shadowBlur = 15;
          ctx.shadowColor = settings.color;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      });
      
      // Draw mirrored wave if enabled
      if (settings.showMirror) {
        ctx.strokeStyle = `${settings.color}66`;
        
        settings.animationStart.forEach(animationStart => {
          if (animationStart === 'beginning') {
            // Left to right mirrored
            ctx.beginPath();
            let x = 0;
            const sliceWidth = canvasWidth / bufferLength;
            
            for (let i = 0; i < bufferLength; i++) {
              const value = dataArray[i] * settings.sensitivity;
              const amplitude = (value / 255) * canvasHeight * 0.4;
              let y;
              
              // For mirror, invert the y position
              if (placement === 'bottom') {
                y = amplitude;
              } else if (placement === 'top') {
                y = canvasHeight - amplitude;
              } else { // middle
                y = (canvasHeight / 2) + (amplitude / 2); // Fix: Properly center the mirrored wave
              }
              
              if (i === 0) {
                ctx.moveTo(x, y);
              } else {
                ctx.lineTo(x, y);
              }
              
              x += sliceWidth;
            }
            
            ctx.stroke();
          }
          else if (animationStart === 'end') {
            // Right to left mirrored
            ctx.beginPath();
            let x = canvasWidth;
            const sliceWidth = canvasWidth / bufferLength;
            
            for (let i = 0; i < bufferLength; i++) {
              const value = dataArray[i] * settings.sensitivity;
              const amplitude = (value / 255) * canvasHeight * 0.4;
              let y;
              
              // For mirror, invert the y position
              if (placement === 'bottom') {
                y = amplitude;
              } else if (placement === 'top') {
                y = canvasHeight - amplitude;
              } else { // middle
                y = (canvasHeight / 2) + (amplitude / 2); // Fix: Properly center the mirrored wave
              }
              
              if (i === 0) {
                ctx.moveTo(x, y);
              } else {
                ctx.lineTo(x, y);
              }
              
              x -= sliceWidth;
            }
            
            ctx.stroke();
          }
          else if (animationStart === 'middle') {
            // From middle outward mirrored
            const centerX = canvasWidth / 2;
            const sliceWidth = (canvasWidth / 2) / (bufferLength / 2);
            
            // Right half
            ctx.beginPath();
            let x = centerX;
            
            for (let i = 0; i < bufferLength / 2; i++) {
              const value = dataArray[i] * settings.sensitivity;
              const amplitude = (value / 255) * canvasHeight * 0.4;
              let y;
              
              // For mirror, invert the y position
              if (placement === 'bottom') {
                y = amplitude;
              } else if (placement === 'top') {
                y = canvasHeight - amplitude;
              } else { // middle
                y = (canvasHeight / 2) + (amplitude / 2); // Fix: Properly center the mirrored wave
              }
              
              if (i === 0) {
                ctx.moveTo(x, y);
              } else {
                ctx.lineTo(x, y);
              }
              
              x += sliceWidth;
            }
            
            ctx.stroke();
            
            // Left half
            ctx.beginPath();
            x = centerX;
            
            for (let i = 0; i < bufferLength / 2; i++) {
              const value = dataArray[bufferLength / 2 + i] * settings.sensitivity;
              const amplitude = (value / 255) * canvasHeight * 0.4;
              let y;
              
              // For mirror, invert the y position
              if (placement === 'bottom') {
                y = amplitude;
              } else if (placement === 'top') {
                y = canvasHeight - amplitude;
              } else { // middle
                y = (canvasHeight / 2) + (amplitude / 2); // Fix: Properly center the mirrored wave
              }
              
              if (i === 0) {
                ctx.moveTo(x, y);
              } else {
                ctx.lineTo(x, y);
              }
              
              x -= sliceWidth;
            }
            
            ctx.stroke();
          }
        });
      }
    });
  }
  
  // Vertical wave
  if (settings.verticalOrientation) {
    // Draw a more prominent wave
    ctx.strokeStyle = settings.color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Process each bar placement option
    settings.barPlacement.forEach(placement => {
      // Calculate base x position based on placement - properly center when 'middle' is selected
      const baseX = getXPositionForPlacement(canvasWidth, placement, canvasWidth * 0.4);
      
      // Process each animation start option
      settings.animationStart.forEach(animationStart => {
        if (animationStart === 'beginning') {
          // Top to bottom
          ctx.beginPath();
          
          const sliceHeight = canvasHeight / bufferLength;
          let y = 0;
          
          for (let i = 0; i < bufferLength; i++) {
            const value = dataArray[i] * settings.sensitivity;
            const amplitude = (value / 255) * canvasWidth * 0.4;
            let x;
            
            // Adjust x position based on placement
            if (placement === 'bottom') {
              x = amplitude;
            } else if (placement === 'top') {
              x = canvasWidth - amplitude;
            } else { // middle
              x = (canvasWidth / 2) - (amplitude / 2); // Fix: Properly center the wave
            }
            
            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
            
            y += sliceHeight;
          }
          
          ctx.stroke();
          
          // Add glow effect
          ctx.shadowBlur = 15;
          ctx.shadowColor = settings.color;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
        else if (animationStart === 'end') {
          // Bottom to top
          ctx.beginPath();
          
          const sliceHeight = canvasHeight / bufferLength;
          let y = canvasHeight;
          
          for (let i = 0; i < bufferLength; i++) {
            const value = dataArray[i] * settings.sensitivity;
            const amplitude = (value / 255) * canvasWidth * 0.4;
            let x;
            
            // Adjust x position based on placement
            if (placement === 'bottom') {
              x = amplitude;
            } else if (placement === 'top') {
              x = canvasWidth - amplitude;
            } else { // middle
              x = (canvasWidth / 2) - (amplitude / 2); // Fix: Properly center the wave
            }
            
            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
            
            y -= sliceHeight;
          }
          
          ctx.stroke();
          
          // Add glow effect
          ctx.shadowBlur = 15;
          ctx.shadowColor = settings.color;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
        else if (animationStart === 'middle') {
          // From middle outward
          const centerY = canvasHeight / 2;
          const sliceHeight = (canvasHeight / 2) / (bufferLength / 2);
          
          // Bottom half
          ctx.beginPath();
          let y = centerY;
          
          for (let i = 0; i < bufferLength / 2; i++) {
            const value = dataArray[i] * settings.sensitivity;
            const amplitude = (value / 255) * canvasWidth * 0.4;
            let x;
            
            // Adjust x position based on placement
            if (placement === 'bottom') {
              x = amplitude;
            } else if (placement === 'top') {
              x = canvasWidth - amplitude;
            } else { // middle
              x = (canvasWidth / 2) - (amplitude / 2); // Fix: Properly center the wave
            }
            
            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
            
            y += sliceHeight;
          }
          
          ctx.stroke();
          
          // Top half
          ctx.beginPath();
          y = centerY;
          
          for (let i = 0; i < bufferLength / 2; i++) {
            const value = dataArray[bufferLength / 2 + i] * settings.sensitivity;
            const amplitude = (value / 255) * canvasWidth * 0.4;
            let x;
            
            // Adjust x position based on placement
            if (placement === 'bottom') {
              x = amplitude;
            } else if (placement === 'top') {
              x = canvasWidth - amplitude;
            } else { // middle
              x = (canvasWidth / 2) - (amplitude / 2); // Fix: Properly center the wave
            }
            
            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
            
            y -= sliceHeight;
          }
          
          ctx.stroke();
          
          // Add glow effect
          ctx.shadowBlur = 15;
          ctx.shadowColor = settings.color;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      });
      
      // Draw mirrored wave if enabled
      if (settings.showMirror) {
        ctx.strokeStyle = `${settings.color}66`;
        
        settings.animationStart.forEach(animationStart => {
          if (animationStart === 'beginning') {
            // Top to bottom mirrored
            ctx.beginPath();
            let y = 0;
            const sliceHeight = canvasHeight / bufferLength;
            
            for (let i = 0; i < bufferLength; i++) {
              const value = dataArray[i] * settings.sensitivity;
              const amplitude = (value / 255) * canvasWidth * 0.4;
              let x;
              
              // For mirror, invert the x position
              if (placement === 'bottom') {
                x = canvasWidth - amplitude;
              } else if (placement === 'top') {
                x = amplitude;
              } else { // middle
                x = (canvasWidth / 2) + (amplitude / 2); // Fix: Properly center the mirrored wave
              }
              
              if (i === 0) {
                ctx.moveTo(x, y);
              } else {
                ctx.lineTo(x, y);
              }
              
              y += sliceHeight;
            }
            
            ctx.stroke();
          }
          else if (animationStart === 'end') {
            // Bottom to top mirrored
            ctx.beginPath();
            let y = canvasHeight;
            const sliceHeight = canvasHeight / bufferLength;
            
            for (let i = 0; i < bufferLength; i++) {
              const value = dataArray[i] * settings.sensitivity;
              const amplitude = (value / 255) * canvasWidth * 0.4;
              let x;
              
              // For mirror, invert the x position
              if (placement === 'bottom') {
                x = canvasWidth - amplitude;
              } else if (placement === 'top') {
                x = amplitude;
              } else { // middle
                x = (canvasWidth / 2) + (amplitude / 2); // Fix: Properly center the mirrored wave
              }
              
              if (i === 0) {
                ctx.moveTo(x, y);
              } else {
                ctx.lineTo(x, y);
              }
              
              y -= sliceHeight;
            }
            
            ctx.stroke();
          }
          else if (animationStart === 'middle') {
            // From middle outward mirrored
            const centerY = canvasHeight / 2;
            const sliceHeight = (canvasHeight / 2) / (bufferLength / 2);
            
            // Bottom half
            ctx.beginPath();
            let y = centerY;
            
            for (let i = 0; i < bufferLength / 2; i++) {
              const value = dataArray[i] * settings.sensitivity;
              const amplitude = (value / 255) * canvasWidth * 0.4;
              let x;
              
              // For mirror, invert the x position
              if (placement === 'bottom') {
                x = canvasWidth - amplitude;
              } else if (placement === 'top') {
                x = amplitude;
              } else { // middle
                x = (canvasWidth / 2) + (amplitude / 2); // Fix: Properly center the mirrored wave
              }
              
              if (i === 0) {
                ctx.moveTo(x, y);
              } else {
                ctx.lineTo(x, y);
              }
              
              y += sliceHeight;
            }
            
            ctx.stroke();
            
            // Top half
            ctx.beginPath();
            y = centerY;
            
            for (let i = 0; i < bufferLength / 2; i++) {
              const value = dataArray[bufferLength / 2 + i] * settings.sensitivity;
              const amplitude = (value / 255) * canvasWidth * 0.4;
              let x;
              
              // For mirror, invert the x position
              if (placement === 'bottom') {
                x = canvasWidth - amplitude;
              } else if (placement === 'top') {
                x = amplitude;
              } else { // middle
                x = (canvasWidth / 2) + (amplitude / 2); // Fix: Properly center the mirrored wave
              }
              
              if (i === 0) {
                ctx.moveTo(x, y);
              } else {
                ctx.lineTo(x, y);
              }
              
              y -= sliceHeight;
            }
            
            ctx.stroke();
          }
        });
      }
    });
  }
};
