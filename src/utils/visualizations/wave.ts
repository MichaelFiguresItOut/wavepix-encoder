import { getYPositionForPlacement, getXPositionForPlacement } from './utils';
import { VisualizerSettings } from '@/hooks/useAudioVisualization';

export const drawWave = (
  ctx: CanvasRenderingContext2D,
  dataArray: Uint8Array,
  canvas: HTMLCanvasElement,
  bufferLength: number,
  settings: VisualizerSettings,
  timestamp: number
) => {
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  const currentRainbowSpeed = settings.rainbowSpeed || 1.0;

  // Helper to calculate dynamic hue based on value and timestamp if Rainbow is ON
  const getDynamicHue = (value: number) => {
    if (settings.showRainbow) {
      // Normalize value (0-255) to 0-1
      const normalizedValue = value / 255;
      // Combine timestamp and value for hue calculation
      let hue = (timestamp / 10 * currentRainbowSpeed + normalizedValue * 360) % 360;
      
      // Ensure hue is a valid number, default to 0 (red) if NaN
      if (isNaN(hue)) {
        console.warn("Hue calculation resulted in NaN. Inputs:", { timestamp, currentRainbowSpeed, normalizedValue });
        hue = 0;
      }
      return hue;
    }
    return null; // Return null if rainbow is off
  };

  // Get the color string based on hue or default color
  const getColorStyle = (hue: number | null, alpha: number = 1.0) => {
    if (hue !== null) {
      // Use HSL for vibrant colors, similar to bubbles
      return `hsla(${Math.floor(hue)}, 90%, 60%, ${alpha})`;
    }
    // Apply alpha to the default color if needed
    const defaultColor = settings.color;
    if (alpha < 1.0) {
      // Basic way to add alpha - might need a helper for hex/rgb conversion for better alpha handling
       // Assuming hex #RRGGBB format for simplicity here
      if (defaultColor.startsWith('#') && defaultColor.length === 7) {
        const alphaHex = Math.round(alpha * 255).toString(16).padStart(2, '0');
        return `${defaultColor}${alphaHex}`;
      }
       // Fallback if not hex or complex color format
      return `rgba(${parseInt(defaultColor.slice(1, 3), 16)}, ${parseInt(defaultColor.slice(3, 5), 16)}, ${parseInt(defaultColor.slice(5, 7), 16)}, ${alpha})`;
    }
    return defaultColor;
  };

  // Horizontal wave
  if (settings.horizontalOrientation) {
    // Common wave style settings
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Process each bar placement option
    settings.barPlacement.forEach(placement => {
      const baseY = getYPositionForPlacement(canvasHeight, placement, canvasHeight * 0.4);
      
      // Process each animation start option
      settings.animationStart.forEach(animationStart => {
        // Removed single color/hue calculation from here

        if (animationStart === 'beginning') {
          // Left to right
          ctx.beginPath();
          const sliceWidth = canvasWidth / bufferLength;
          let x = 0;
          for (let i = 0; i < bufferLength; i++) {
            const value = dataArray[i] * settings.sensitivity;
            const amplitude = (value / 255) * canvasHeight * 0.4;
            let y;
            if (placement === 'bottom') { y = canvasHeight - amplitude; }
            else if (placement === 'top') { y = amplitude; }
            else { y = (canvasHeight / 2) - (amplitude / 2); } // Centered calculation

            // Set strokeStyle dynamically for each segment if rainbow is on
            const dynamicHue = getDynamicHue(dataArray[i]); // Use raw dataArray value for hue
            ctx.strokeStyle = getColorStyle(dynamicHue);
            ctx.shadowColor = getColorStyle(dynamicHue); // Apply same color logic to shadow

            if (i === 0) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); }
            x += sliceWidth;
            // Stroke segment by segment if rainbow is on to apply color changes
            if (settings.showRainbow && i > 0) {
               ctx.stroke(); // Stroke the segment
               ctx.beginPath(); // Start a new path for the next segment
               ctx.moveTo(x - sliceWidth, y); // Move to the end of the last segment
            }
          }
           // Final stroke for non-rainbow or the last segment
          ctx.stroke();
          ctx.shadowBlur = 15;
          // ctx.shadowColor = glowColor; // Shadow color now set inside loop
          ctx.stroke(); // Apply glow
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
            if (placement === 'bottom') { y = canvasHeight - amplitude; }
            else if (placement === 'top') { y = amplitude; }
            else { y = (canvasHeight / 2) - (amplitude / 2); } // Centered calculation

            const dynamicHue = getDynamicHue(dataArray[i]);
            ctx.strokeStyle = getColorStyle(dynamicHue);
            ctx.shadowColor = getColorStyle(dynamicHue);

            if (i === 0) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); }
            x -= sliceWidth;
             if (settings.showRainbow && i > 0) {
               ctx.stroke();
               ctx.beginPath();
               ctx.moveTo(x + sliceWidth, y);
             }
          }
           ctx.stroke();
          ctx.shadowBlur = 15;
          // ctx.shadowColor = glowColor;
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
            if (placement === 'bottom') { y = canvasHeight - amplitude; }
            else if (placement === 'top') { y = amplitude; }
            else { y = (canvasHeight / 2) - (amplitude / 2); } // Centered calculation

            const dynamicHue = getDynamicHue(dataArray[i]);
            ctx.strokeStyle = getColorStyle(dynamicHue);
            ctx.shadowColor = getColorStyle(dynamicHue);

            if (i === 0) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); }
            x += sliceWidth;
             if (settings.showRainbow && i > 0) {
               ctx.stroke();
               ctx.beginPath();
               ctx.moveTo(x - sliceWidth, y);
             }
          }
          ctx.stroke(); // Stroke last segment of right half
          
          // Left half
          ctx.beginPath();
          x = centerX;
          // Use data from the second half of the array for the left visual part
          const leftBufferStartIndex = Math.floor(bufferLength / 2);
          for (let i = 0; i < bufferLength / 2; i++) {
             const dataIndex = leftBufferStartIndex + i;
            const value = dataArray[dataIndex] * settings.sensitivity;
            const amplitude = (value / 255) * canvasHeight * 0.4;
            let y;
            if (placement === 'bottom') { y = canvasHeight - amplitude; }
            else if (placement === 'top') { y = amplitude; }
            else { y = (canvasHeight / 2) - (amplitude / 2); } // Centered calculation

            const dynamicHue = getDynamicHue(dataArray[dataIndex]);
            ctx.strokeStyle = getColorStyle(dynamicHue);
            ctx.shadowColor = getColorStyle(dynamicHue);

            if (i === 0) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); }
            x -= sliceWidth;
             if (settings.showRainbow && i > 0) {
               ctx.stroke();
               ctx.beginPath();
               ctx.moveTo(x + sliceWidth, y);
             }
          }
          ctx.stroke(); // Stroke last segment of left half
          
          // Add glow effect (applied after both halves are stroked)
          ctx.shadowBlur = 15;
          // ctx.shadowColor = glowColor; // Set dynamically now
          // Re-stroke the last segment of the left half to apply glow
          // Need a better way to apply glow to the whole path efficiently when colors change dynamically
          // For now, just apply to the last drawn segment
           ctx.stroke(); 
          ctx.shadowBlur = 0;
        }
      });
      
      // Draw mirrored wave if enabled
      if (settings.showMirror) {
         // Mirror uses dynamic colors as well if rainbow is on
         // Removed single mirrorStrokeColor calculation

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
              // Mirrored Y calculation based on placement
              if (placement === 'bottom') { y = amplitude; }
              else if (placement === 'top') { y = canvasHeight - amplitude; }
              else { y = (canvasHeight / 2) + (amplitude / 2); } // Centered calculation mirrored

              // Use dynamic hue with reduced alpha for mirror
              const dynamicHue = getDynamicHue(dataArray[i]);
              ctx.strokeStyle = getColorStyle(dynamicHue, 0.4); // Mirror has alpha

              if (i === 0) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); }
              x += sliceWidth;
               if (settings.showRainbow && i > 0) {
                 ctx.stroke();
                 ctx.beginPath();
                 ctx.moveTo(x - sliceWidth, y);
               }
            }
            ctx.stroke(); // Final stroke
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
               if (placement === 'bottom') { y = amplitude; }
               else if (placement === 'top') { y = canvasHeight - amplitude; }
               else { y = (canvasHeight / 2) + (amplitude / 2); } // Centered calculation mirrored

              const dynamicHue = getDynamicHue(dataArray[i]);
              ctx.strokeStyle = getColorStyle(dynamicHue, 0.4); // Restore alpha for mirror

              if (i === 0) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); }
              x -= sliceWidth;
               if (settings.showRainbow && i > 0) {
                 ctx.stroke();
                 ctx.beginPath();
                 ctx.moveTo(x + sliceWidth, y);
               }
            }
            ctx.stroke();
          }
          else if (animationStart === 'middle') {
            // From middle outward mirrored
            const centerX = canvasWidth / 2;
            const sliceWidth = (canvasWidth / 2) / (bufferLength / 2);
            
            // Right half mirrored
            ctx.beginPath();
            let x = centerX;
            for (let i = 0; i < bufferLength / 2; i++) {
              const value = dataArray[i] * settings.sensitivity;
              const amplitude = (value / 255) * canvasHeight * 0.4;
              let y;
               if (placement === 'bottom') { y = amplitude; }
               else if (placement === 'top') { y = canvasHeight - amplitude; }
               else { y = (canvasHeight / 2) + (amplitude / 2); } // Centered calculation mirrored

              const dynamicHue = getDynamicHue(dataArray[i]);
              ctx.strokeStyle = getColorStyle(dynamicHue, 0.4);

              if (i === 0) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); }
              x += sliceWidth;
               if (settings.showRainbow && i > 0) {
                 ctx.stroke();
                 ctx.beginPath();
                 ctx.moveTo(x - sliceWidth, y);
               }
            }
            ctx.stroke(); // Stroke last segment right half
            
            // Left half mirrored
            ctx.beginPath();
            x = centerX;
            const leftBufferStartIndex = Math.floor(bufferLength / 2);
            for (let i = 0; i < bufferLength / 2; i++) {
              const dataIndex = leftBufferStartIndex + i;
              const value = dataArray[dataIndex] * settings.sensitivity;
              const amplitude = (value / 255) * canvasHeight * 0.4;
              let y;
               if (placement === 'bottom') { y = amplitude; }
               else if (placement === 'top') { y = canvasHeight - amplitude; }
               else { y = (canvasHeight / 2) + (amplitude / 2); } // Centered calculation mirrored

              const dynamicHue = getDynamicHue(dataArray[dataIndex]);
              ctx.strokeStyle = getColorStyle(dynamicHue, 0.4); // Restore alpha for mirror

              if (i === 0) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); }
              x -= sliceWidth;
               if (settings.showRainbow && i > 0) {
                 ctx.stroke();
                 ctx.beginPath();
                 ctx.moveTo(x + sliceWidth, y);
               }
            }
            ctx.stroke(); // Stroke last segment left half
          }
        });
      }
    });
  }
  
  // Vertical wave
  if (settings.verticalOrientation) {
    // Common wave style settings
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    settings.barPlacement.forEach(placement => {
      // For vertical, placement affects X position
      const baseX = getXPositionForPlacement(canvasWidth, placement, canvasWidth * 0.4); // Use placement for X

      settings.animationStart.forEach(animationStart => {
        // Removed single color/hue calculation

        if (animationStart === 'beginning') {
          // Top to bottom
          ctx.beginPath();
          const sliceHeight = canvasHeight / bufferLength;
          let y = 0;
          for (let i = 0; i < bufferLength; i++) {
            const value = dataArray[i] * settings.sensitivity;
            const amplitude = (value / 255) * canvasWidth * 0.4; // Amplitude affects X in vertical
            let x;
             // Vertical placement adjustment - Corrected
             if (placement === 'bottom') { x = amplitude; } // Bottom corresponds to Left
             else if (placement === 'top') { x = canvasWidth - amplitude; } // Top corresponds to Right
             else { x = (canvasWidth / 2) - (amplitude / 2); } // Middle remains Middle

            const dynamicHue = getDynamicHue(dataArray[i]);
            ctx.strokeStyle = getColorStyle(dynamicHue);
            ctx.shadowColor = getColorStyle(dynamicHue);

            if (i === 0) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); }
            y += sliceHeight;
             if (settings.showRainbow && i > 0) {
               ctx.stroke();
               ctx.beginPath();
               ctx.moveTo(x, y - sliceHeight);
             }
          }
          ctx.stroke();
          ctx.shadowBlur = 15;
          // ctx.shadowColor = glowColor;
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
             // Corrected
             if (placement === 'bottom') { x = amplitude; }
             else if (placement === 'top') { x = canvasWidth - amplitude; }
             else { x = (canvasWidth / 2) - (amplitude / 2); } // Centered calculation

            const dynamicHue = getDynamicHue(dataArray[i]);
            ctx.strokeStyle = getColorStyle(dynamicHue);
            ctx.shadowColor = getColorStyle(dynamicHue);

            if (i === 0) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); }
            y -= sliceHeight;
             if (settings.showRainbow && i > 0) {
               ctx.stroke();
               ctx.beginPath();
               ctx.moveTo(x, y + sliceHeight);
             }
          }
          ctx.stroke();
          ctx.shadowBlur = 15;
          // ctx.shadowColor = glowColor;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
        else if (animationStart === 'middle') {
           // From middle outward (vertical)
           const centerY = canvasHeight / 2;
           const sliceHeight = (canvasHeight / 2) / (bufferLength / 2);

           // Bottom half (middle to bottom)
           ctx.beginPath();
           let y = centerY;
           for (let i = 0; i < bufferLength / 2; i++) {
             const value = dataArray[i] * settings.sensitivity;
             const amplitude = (value / 255) * canvasWidth * 0.4;
             let x;
              // Corrected
              if (placement === 'bottom') { x = amplitude; }
              else if (placement === 'top') { x = canvasWidth - amplitude; }
              else { x = (canvasWidth / 2) - (amplitude / 2); } // Centered calculation

             const dynamicHue = getDynamicHue(dataArray[i]);
             ctx.strokeStyle = getColorStyle(dynamicHue);
             ctx.shadowColor = getColorStyle(dynamicHue);

             if (i === 0) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); }
             y += sliceHeight;
              if (settings.showRainbow && i > 0) {
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(x, y - sliceHeight);
              }
           }
           ctx.stroke(); // Stroke last segment bottom half

           // Top half (middle to top)
           ctx.beginPath();
           y = centerY;
           const topBufferStartIndex = Math.floor(bufferLength / 2);
           for (let i = 0; i < bufferLength / 2; i++) {
              const dataIndex = topBufferStartIndex + i;
             const value = dataArray[dataIndex] * settings.sensitivity;
             const amplitude = (value / 255) * canvasWidth * 0.4;
             let x;
              // Corrected
              if (placement === 'bottom') { x = amplitude; }
              else if (placement === 'top') { x = canvasWidth - amplitude; }
              else { x = (canvasWidth / 2) - (amplitude / 2); } // Centered calculation

             const dynamicHue = getDynamicHue(dataArray[dataIndex]);
             ctx.strokeStyle = getColorStyle(dynamicHue);
             ctx.shadowColor = getColorStyle(dynamicHue);

             if (i === 0) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); }
             y -= sliceHeight;
              if (settings.showRainbow && i > 0) {
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(x, y + sliceHeight);
              }
           }
           ctx.stroke(); // Stroke last segment top half

           // Apply glow (similar issue as horizontal middle)
           ctx.shadowBlur = 15;
           // ctx.shadowColor = glowColor;
            ctx.stroke(); 
           ctx.shadowBlur = 0;
        }
      });

      // Draw mirrored vertical wave if enabled
      if (settings.showMirror) {
        // Mirror uses dynamic colors with alpha
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
              // Mirrored X calculation - Corrected
               if (placement === 'bottom') { x = canvasWidth - amplitude; } // Mirror bottom (left) is right
               else if (placement === 'top') { x = amplitude; } // Mirror top (right) is left
               else { x = (canvasWidth / 2) + (amplitude / 2); } // Centered mirrored

              const dynamicHue = getDynamicHue(dataArray[i]);
              ctx.strokeStyle = getColorStyle(dynamicHue, 0.4); // Restore alpha for mirror

              if (i === 0) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); }
              y += sliceHeight;
               if (settings.showRainbow && i > 0) {
                 ctx.stroke();
                 ctx.beginPath();
                 ctx.moveTo(x, y - sliceHeight);
               }
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
               // Corrected
               if (placement === 'bottom') { x = canvasWidth - amplitude; }
               else if (placement === 'top') { x = amplitude; }
               else { x = (canvasWidth / 2) + (amplitude / 2); } // Centered mirrored

              const dynamicHue = getDynamicHue(dataArray[i]);
              ctx.strokeStyle = getColorStyle(dynamicHue, 0.4); // Restore alpha for mirror

              if (i === 0) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); }
              y -= sliceHeight;
               if (settings.showRainbow && i > 0) {
                 ctx.stroke();
                 ctx.beginPath();
                 ctx.moveTo(x, y + sliceHeight);
               }
            }
            ctx.stroke();
          }
           else if (animationStart === 'middle') {
             // From middle outward mirrored (vertical)
             const centerY = canvasHeight / 2;
             const sliceHeight = (canvasHeight / 2) / (bufferLength / 2);

             // Bottom half mirrored
             ctx.beginPath();
             let y = centerY;
             for (let i = 0; i < bufferLength / 2; i++) {
               const value = dataArray[i] * settings.sensitivity;
               const amplitude = (value / 255) * canvasWidth * 0.4;
               let x;
                // Corrected
                if (placement === 'bottom') { x = canvasWidth - amplitude; }
                else if (placement === 'top') { x = amplitude; }
                else { x = (canvasWidth / 2) + (amplitude / 2); } // Centered mirrored

               const dynamicHue = getDynamicHue(dataArray[i]);
               ctx.strokeStyle = getColorStyle(dynamicHue, 0.4); // Restore alpha for mirror

               if (i === 0) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); }
               y += sliceHeight;
                if (settings.showRainbow && i > 0) {
                  ctx.stroke();
                  ctx.beginPath();
                  ctx.moveTo(x, y - sliceHeight);
                }
             }
             ctx.stroke(); // Stroke last segment bottom half mirrored

             // Top half mirrored
             ctx.beginPath();
             y = centerY;
             const topBufferStartIndex = Math.floor(bufferLength / 2);
             for (let i = 0; i < bufferLength / 2; i++) {
               const dataIndex = topBufferStartIndex + i;
               const value = dataArray[dataIndex] * settings.sensitivity;
               const amplitude = (value / 255) * canvasWidth * 0.4;
               let x;
                // Corrected
                if (placement === 'bottom') { x = canvasWidth - amplitude; }
                else if (placement === 'top') { x = amplitude; }
                else { x = (canvasWidth / 2) + (amplitude / 2); } // Centered mirrored

               const dynamicHue = getDynamicHue(dataArray[dataIndex]);
               ctx.strokeStyle = getColorStyle(dynamicHue, 0.4); // Restore alpha for mirror

               if (i === 0) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); }
               y -= sliceHeight;
                if (settings.showRainbow && i > 0) {
                  ctx.stroke();
                  ctx.beginPath();
                  ctx.moveTo(x, y + sliceHeight);
                }
             }
             ctx.stroke(); // Stroke last segment top half mirrored
           }
        });
      }
    });
  }
};
