
import { VisualizerSettings } from '@/hooks/useAudioVisualization';
import { getYPositionForPlacement, getXPositionForPlacement } from './utils';

export const drawLightningAnimation = (
  ctx: CanvasRenderingContext2D,
  dataArray: Uint8Array,
  canvas: HTMLCanvasElement,
  bufferLength: number,
  timestamp: number,
  settings: VisualizerSettings
) => {
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  
  // For lightning, use a nice color that looks like electricity
  const primaryColor = settings.color;
  const glowColor = settings.color + "99";
  
  // Draw horizontal lightning
  if (settings.horizontalOrientation) {
    settings.barPlacement.forEach(placement => {
      const baseY = getYPositionForPlacement(canvasHeight, placement, canvasHeight / 2);
      
      settings.animationStart.forEach(animationStart => {
        // Set up based on animation start position
        let startX: number;
        let endX: number;
        let direction: number;
        
        if (animationStart === 'beginning') {
          startX = 0;
          endX = canvasWidth;
          direction = 1;
        } else if (animationStart === 'end') {
          startX = canvasWidth;
          endX = 0;
          direction = -1;
        } else { // 'middle'
          const halfPoint = Math.floor(bufferLength / 2);
          
          // Draw from middle to right
          drawLightningBolt(
            ctx, 
            dataArray.slice(0, halfPoint), 
            canvasWidth / 2, 
            baseY, 
            canvasWidth, 
            timestamp, 
            1, 
            placement,
            settings
          );
          
          // Draw from middle to left
          drawLightningBolt(
            ctx, 
            dataArray.slice(halfPoint), 
            canvasWidth / 2, 
            baseY, 
            0, 
            timestamp, 
            -1, 
            placement,
            settings
          );
          
          continue; // Skip the regular drawing as we've handled middle specially
        }
        
        drawLightningBolt(
          ctx, 
          dataArray, 
          startX, 
          baseY, 
          endX, 
          timestamp, 
          direction, 
          placement,
          settings
        );
      });
    });
  }
  
  // Draw vertical lightning
  if (settings.verticalOrientation) {
    settings.barPlacement.forEach(placement => {
      const baseX = getXPositionForPlacement(canvasWidth, placement, canvasWidth / 2);
      
      settings.animationStart.forEach(animationStart => {
        // Set up based on animation start position
        let startY: number;
        let endY: number;
        let direction: number;
        
        if (animationStart === 'beginning') {
          startY = 0;
          endY = canvasHeight;
          direction = 1;
        } else if (animationStart === 'end') {
          startY = canvasHeight;
          endY = 0;
          direction = -1;
        } else { // 'middle'
          const halfPoint = Math.floor(bufferLength / 2);
          
          // Draw from middle to bottom
          drawVerticalLightningBolt(
            ctx, 
            dataArray.slice(0, halfPoint), 
            baseX, 
            canvasHeight / 2, 
            canvasHeight, 
            timestamp, 
            1, 
            placement,
            settings
          );
          
          // Draw from middle to top
          drawVerticalLightningBolt(
            ctx, 
            dataArray.slice(halfPoint), 
            baseX, 
            canvasHeight / 2, 
            0, 
            timestamp, 
            -1, 
            placement,
            settings
          );
          
          continue; // Skip the regular drawing as we've handled middle specially
        }
        
        drawVerticalLightningBolt(
          ctx, 
          dataArray, 
          baseX, 
          startY, 
          endY, 
          timestamp, 
          direction, 
          placement,
          settings
        );
      });
    });
  }
  
  // Helper function to draw a horizontal lightning bolt
  function drawLightningBolt(
    ctx: CanvasRenderingContext2D, 
    data: Uint8Array, 
    startX: number, 
    startY: number, 
    endX: number, 
    timestamp: number, 
    direction: number, 
    placement: string,
    settings: VisualizerSettings
  ) {
    const segmentCount = data.length;
    const totalDistance = Math.abs(endX - startX);
    const segmentLength = totalDistance / segmentCount;
    
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'bevel';
    
    // Add glow effect
    ctx.shadowBlur = 10;
    ctx.shadowColor = glowColor;
    
    // Start drawing the main bolt
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    
    let currentX = startX;
    const variance = 40 * settings.sensitivity; // How much the bolt can deviate vertically
    const timeVariance = Math.sin(timestamp / 500) * 15; // Add some time-based movement
    
    // Draw each segment of the lightning bolt
    for (let i = 0; i < segmentCount; i++) {
      const value = data[i] / 255.0;
      const jitter = (Math.random() - 0.5) * variance * value; // Vertical jitter based on audio data
      
      currentX += segmentLength * direction;
      
      let newY;
      if (placement === 'bottom') {
        newY = startY - jitter - timeVariance * value;
      } else if (placement === 'top') {
        newY = startY + jitter + timeVariance * value;
      } else { // middle
        newY = startY + jitter + timeVariance * value;
      }
      
      // Add some branching occasionally
      if (Math.random() > 0.85 && value > 0.5) {
        const branchLength = Math.random() * 30 * value * settings.sensitivity;
        const branchAngle = Math.random() * Math.PI / 2 - Math.PI / 4;
        
        const branchEndX = currentX + Math.cos(branchAngle) * branchLength * direction;
        const branchEndY = newY + Math.sin(branchAngle) * branchLength;
        
        // Draw a small branch
        ctx.moveTo(currentX, newY);
        
        // Create a jagged branch with a few segments
        let branchX = currentX;
        let branchY = newY;
        const branchSegments = 3;
        const branchSegmentLength = (branchEndX - currentX) / branchSegments;
        
        for (let j = 0; j < branchSegments; j++) {
          branchX += branchSegmentLength;
          branchY = newY + (branchEndY - newY) * (j + 1) / branchSegments + (Math.random() - 0.5) * 10;
          ctx.lineTo(branchX, branchY);
        }
        
        // Move back to main bolt
        ctx.moveTo(currentX, newY);
      }
      
      ctx.lineTo(currentX, newY);
    }
    
    ctx.stroke();
    
    // Reset shadow for other drawings
    ctx.shadowBlur = 0;
    
    // If mirror effect is enabled, draw a mirrored version of the lightning
    if (settings.showMirror) {
      ctx.strokeStyle = glowColor;
      ctx.beginPath();
      ctx.moveTo(startX, 2 * startY - startY);
      
      currentX = startX;
      
      for (let i = 0; i < segmentCount; i++) {
        const value = data[i] / 255.0;
        const jitter = (Math.random() - 0.5) * variance * value;
        
        currentX += segmentLength * direction;
        
        let mirrorY;
        if (placement === 'bottom') {
          mirrorY = 2 * startY - (startY - jitter - timeVariance * value);
        } else if (placement === 'top') {
          mirrorY = 2 * startY - (startY + jitter + timeVariance * value);
        } else { // middle
          mirrorY = 2 * startY - (startY + jitter + timeVariance * value);
        }
        
        ctx.lineTo(currentX, mirrorY);
      }
      
      ctx.stroke();
    }
  }
  
  // Helper function to draw a vertical lightning bolt
  function drawVerticalLightningBolt(
    ctx: CanvasRenderingContext2D, 
    data: Uint8Array, 
    startX: number, 
    startY: number, 
    endY: number, 
    timestamp: number, 
    direction: number, 
    placement: string,
    settings: VisualizerSettings
  ) {
    const segmentCount = data.length;
    const totalDistance = Math.abs(endY - startY);
    const segmentLength = totalDistance / segmentCount;
    
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'bevel';
    
    // Add glow effect
    ctx.shadowBlur = 10;
    ctx.shadowColor = glowColor;
    
    // Start drawing the main bolt
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    
    let currentY = startY;
    const variance = 40 * settings.sensitivity; // How much the bolt can deviate horizontally
    const timeVariance = Math.sin(timestamp / 500) * 15; // Add some time-based movement
    
    // Draw each segment of the lightning bolt
    for (let i = 0; i < segmentCount; i++) {
      const value = data[i] / 255.0;
      const jitter = (Math.random() - 0.5) * variance * value; // Horizontal jitter based on audio data
      
      currentY += segmentLength * direction;
      
      let newX;
      if (placement === 'bottom') { // left in vertical
        newX = startX + jitter + timeVariance * value;
      } else if (placement === 'top') { // right in vertical
        newX = startX - jitter - timeVariance * value;
      } else { // middle
        newX = startX + jitter + timeVariance * value;
      }
      
      // Add some branching occasionally
      if (Math.random() > 0.85 && value > 0.5) {
        const branchLength = Math.random() * 30 * value * settings.sensitivity;
        const branchAngle = Math.random() * Math.PI / 2 - Math.PI / 4;
        
        const branchEndX = newX + Math.sin(branchAngle) * branchLength;
        const branchEndY = currentY + Math.cos(branchAngle) * branchLength * direction;
        
        // Draw a small branch
        ctx.moveTo(newX, currentY);
        
        // Create a jagged branch with a few segments
        let branchX = newX;
        let branchY = currentY;
        const branchSegments = 3;
        const branchSegmentLength = (branchEndY - currentY) / branchSegments;
        
        for (let j = 0; j < branchSegments; j++) {
          branchY += branchSegmentLength;
          branchX = newX + (branchEndX - newX) * (j + 1) / branchSegments + (Math.random() - 0.5) * 10;
          ctx.lineTo(branchX, branchY);
        }
        
        // Move back to main bolt
        ctx.moveTo(newX, currentY);
      }
      
      ctx.lineTo(newX, currentY);
    }
    
    ctx.stroke();
    
    // Reset shadow for other drawings
    ctx.shadowBlur = 0;
    
    // If mirror effect is enabled, draw a mirrored version of the lightning
    if (settings.showMirror) {
      ctx.strokeStyle = glowColor;
      ctx.beginPath();
      ctx.moveTo(2 * startX - startX, startY);
      
      currentY = startY;
      
      for (let i = 0; i < segmentCount; i++) {
        const value = data[i] / 255.0;
        const jitter = (Math.random() - 0.5) * variance * value;
        
        currentY += segmentLength * direction;
        
        let mirrorX;
        if (placement === 'bottom') { // left in vertical
          mirrorX = 2 * startX - (startX + jitter + timeVariance * value);
        } else if (placement === 'top') { // right in vertical
          mirrorX = 2 * startX - (startX - jitter - timeVariance * value);
        } else { // middle
          mirrorX = 2 * startX - (startX + jitter + timeVariance * value);
        }
        
        ctx.lineTo(mirrorX, currentY);
      }
      
      ctx.stroke();
    }
  }
};
