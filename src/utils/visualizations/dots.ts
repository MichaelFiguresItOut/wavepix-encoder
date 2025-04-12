import { VisualizerSettings } from '@/hooks/useAudioVisualization';
import { formatColorWithOpacity } from './utils';

export const drawDotsAnimation = (
  ctx: CanvasRenderingContext2D,
  dataArray: Uint8Array,
  canvas: HTMLCanvasElement,
  bufferLength: number,
  timestamp: number,
  settings: VisualizerSettings
) => {
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  const centerX = canvasWidth / 2;
  const currentRainbowSpeed = settings.rainbowSpeed || 1.0; // Read speed

  // Calculate base hue for the frame for dots (faster base cycle)
  let baseDotHue = null;
  if (settings.showRainbow) {
      baseDotHue = (timestamp / 10 * currentRainbowSpeed) % 360;
      if (isNaN(baseDotHue)) baseDotHue = 0;
  }

  // Animation phase
  const phase = (timestamp % 8000) / 8000 * Math.PI * 2;
  
  if (settings.showMirror) {
    // Mirrored mode - dots emanating from center in circular pattern
    const maxRings = 5;
    const dotsPerRing = 24;
    
    // Draw connecting lines between rings
    // Determine connecting line color (use speed, slowed down)
    let connectingLineHue = null;
    if (settings.showRainbow) {
        // Slow down the speed factor by 10x
        connectingLineHue = (timestamp / 20 * (currentRainbowSpeed / 10)) % 360;
        if (isNaN(connectingLineHue)) connectingLineHue = 0;
    }
    const connectingLineColor = connectingLineHue !== null 
      ? `hsla(${connectingLineHue}, 80%, 50%, 0.8)`
      : formatColorWithOpacity(settings.color, 0.8);

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
          radius = ringRadius - normalizedValue * 30;
          radius = Math.max(10, radius);
        } else {
          radius = ringRadius + normalizedValue * 30;
        }
        
        // Calculate dot position
        const x = centerX + Math.cos(angle) * radius;
        const y = canvasHeight / 2 + Math.sin(angle) * radius;
        
        if (i === 0) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); }
      }
      
      ctx.closePath();
      ctx.strokeStyle = connectingLineColor; // Use determined color
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    
    // Draw dots at intersections
    for (let ring = 0; ring < maxRings; ring++) {
      const baseRadius = 40 + ring * 40;
      
      for (let i = 0; i < dotsPerRing; i++) {
        // Calculate hue for EACH dot based on base hue and index offset
        const dotHue = baseDotHue !== null ? (baseDotHue + (ring * dotsPerRing + i) * 5) % 360 : null;

        const angle = (i / dotsPerRing) * Math.PI * 2 + phase + (ring * 0.1);
        const dataIndex = Math.floor((ring * dotsPerRing + i) % bufferLength);
        const value = dataArray[dataIndex] * settings.sensitivity;
        const normalizedValue = value / 255;
        
        // Calculate radius with audio reactivity
        let radius;
        if (settings.showReversed) {
          radius = baseRadius - normalizedValue * 30;
          radius = Math.max(10, radius);
        } else {
          radius = baseRadius + normalizedValue * 30;
        }
        
        // Calculate dot position
        const x = centerX + Math.cos(angle) * radius;
        const y = canvasHeight / 2 + Math.sin(angle) * radius;
        
        // Dot size based on frequency data
        const dotSize = 2 + normalizedValue * 6;
        
        // Determine dot color and shadow color
        const dotFillColor = dotHue !== null ? `hsla(${dotHue}, 90%, 60%, 1.0)` : settings.color;
        const shadowColor = dotHue !== null ? dotFillColor : settings.color;

        // Draw glow/shadow
        ctx.shadowBlur = 10;
        ctx.shadowColor = shadowColor;
        
        // Draw dot
        ctx.beginPath();
        ctx.arc(x, y, dotSize, 0, Math.PI * 2);
        ctx.fillStyle = dotFillColor;
        ctx.fill();
        
        // Reset shadow
        ctx.shadowBlur = 0;
      }
    }
  } else {
    // Non-mirrored mode - we'll use orientation settings here
    // Determine connecting line color (use speed, slowed down)
    let connectingLineHue = null;
    if (settings.showRainbow) {
        // Slow down the speed factor by 10x
        connectingLineHue = (timestamp / 20 * (currentRainbowSpeed / 10)) % 360;
        if (isNaN(connectingLineHue)) connectingLineHue = 0;
    }
    const connectingLineColor = connectingLineHue !== null 
      ? `hsla(${connectingLineHue}, 80%, 50%, 0.8)`
      : `${settings.color}CC`;

    settings.barPlacement.forEach(placement => {
      if (settings.horizontalOrientation) {
        const dotCount = Math.min(bufferLength, 100);
        let centerY;
        if (placement === 'top') { centerY = canvasHeight * 0.2; }
        else if (placement === 'middle') { centerY = canvasHeight / 2; }
        else { centerY = canvasHeight * 0.8; }
        
        settings.animationStart.forEach(animationStart => {
          let startX = 0;
          let endX = canvasWidth;
          let directionMultiplier = 1;
          
          if (animationStart === 'beginning') { /* default */ }
          else if (animationStart === 'end') { startX = canvasWidth; endX = 0; directionMultiplier = -1; }
          else if (animationStart === 'middle') {
            const halfDotCount = Math.floor(dotCount / 2);
            const dotSpacing = (canvasWidth / 2) / halfDotCount;
            
            // --- Draw first half (center to right) --- 
            // Connecting line
            ctx.beginPath();
            for (let i = 0; i <= halfDotCount; i++) {
              const x = centerX + i * dotSpacing;
              const dataIndex = Math.floor(i * (bufferLength / dotCount));
              const value = dataArray[dataIndex] * settings.sensitivity;
              const normalizedValue = value / 255;
              const waveY = Math.sin(i * 0.15 + phase) * 20;
              const direction = settings.showReversed ? 1 : -1;
              const y = centerY + (direction * normalizedValue * canvasHeight * 0.4) + waveY;
              if (i === 0) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); }
            }
            ctx.strokeStyle = connectingLineColor;
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Dots
            for (let i = 0; i <= halfDotCount; i++) {
              // Calculate hue for EACH dot based on base hue and index offset
              const dotHue = baseDotHue !== null ? (baseDotHue + i * 10) % 360 : null;
              const x = centerX + i * dotSpacing;
              const dataIndex = Math.floor(i * (bufferLength / dotCount));
              const value = dataArray[dataIndex] * settings.sensitivity;
              const normalizedValue = value / 255;
              const waveY = Math.sin(i * 0.15 + phase) * 20;
              const direction = settings.showReversed ? 1 : -1;
              const y = centerY + (direction * normalizedValue * canvasHeight * 0.4) + waveY;
              const dotSize = 2 + normalizedValue * 8;
              const dotFillColor = dotHue !== null ? `hsla(${dotHue}, 90%, 60%, 1.0)` : settings.color;
              const shadowColor = dotHue !== null ? dotFillColor : settings.color;
              ctx.shadowBlur = 15;
              ctx.shadowColor = shadowColor;
              ctx.beginPath();
              ctx.arc(x, y, dotSize, 0, Math.PI * 2);
              ctx.fillStyle = dotFillColor;
              ctx.fill();
              ctx.shadowBlur = 0;
              
              // Draw mirrored dot if showInvert is enabled
              if (settings.showInvert) {
                const mirroredY = 2 * centerY - y; // Mirror across centerY
                ctx.beginPath();
                ctx.arc(x, mirroredY, dotSize, 0, Math.PI * 2);
                ctx.fillStyle = dotFillColor;
                ctx.shadowBlur = 15;
                ctx.shadowColor = shadowColor;
                ctx.fill();
                ctx.shadowBlur = 0;
              }
            }
            
             // --- Draw second half (center to left) --- 
            // Connecting line
            ctx.beginPath();
            for (let i = 0; i <= halfDotCount; i++) {
              const x = centerX - i * dotSpacing;
              const dataIndex = Math.floor((halfDotCount + i) * (bufferLength / dotCount));
              const value = dataArray[dataIndex] * settings.sensitivity;
              const normalizedValue = value / 255;
              const waveY = Math.sin(i * 0.15 + phase) * 20;
              const direction = settings.showReversed ? 1 : -1;
              const y = centerY + (direction * normalizedValue * canvasHeight * 0.4) + waveY;
              if (i === 0) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); }
            }
            ctx.strokeStyle = connectingLineColor;
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Dots
            for (let i = 0; i <= halfDotCount; i++) {
              // Calculate hue for EACH dot based on base hue and index offset
              const dotHue = baseDotHue !== null ? (baseDotHue + (halfDotCount + i) * 10) % 360 : null;
              const x = centerX - i * dotSpacing;
              const dataIndex = Math.floor((halfDotCount + i) * (bufferLength / dotCount));
              const value = dataArray[dataIndex] * settings.sensitivity;
              const normalizedValue = value / 255;
              const waveY = Math.sin(i * 0.15 + phase) * 20;
              const direction = settings.showReversed ? 1 : -1;
              const y = centerY + (direction * normalizedValue * canvasHeight * 0.4) + waveY;
              const dotSize = 2 + normalizedValue * 8;
              const dotFillColor = dotHue !== null ? `hsla(${dotHue}, 90%, 60%, 1.0)` : settings.color;
              const shadowColor = dotHue !== null ? dotFillColor : settings.color;
              ctx.shadowBlur = 15;
              ctx.shadowColor = shadowColor;
              ctx.beginPath();
              ctx.arc(x, y, dotSize, 0, Math.PI * 2);
              ctx.fillStyle = dotFillColor;
              ctx.fill();
              ctx.shadowBlur = 0;
              
              // Draw mirrored dot if showInvert is enabled
              if (settings.showInvert) {
                const mirroredY = 2 * centerY - y; // Mirror across centerY
                ctx.beginPath();
                ctx.arc(x, mirroredY, dotSize, 0, Math.PI * 2);
                ctx.fillStyle = dotFillColor;
                ctx.shadowBlur = 15;
                ctx.shadowColor = shadowColor;
                ctx.fill();
                ctx.shadowBlur = 0;
              }
            }
            
            return; // Skip the rest for middle animation
          }
          
          // --- Beginning or End animation --- 
          const dotSpacing = Math.abs(endX - startX) / dotCount;
          
          // Connecting line
          ctx.beginPath();
          for (let i = 0; i < dotCount; i++) {
            const x = startX + i * dotSpacing * directionMultiplier;
            const dataIndex = Math.floor(i * (bufferLength / dotCount));
            const value = dataArray[dataIndex] * settings.sensitivity;
            const normalizedValue = value / 255;
            const waveY = Math.sin(i * 0.15 + phase) * 20;
            const direction = settings.showReversed ? 1 : -1;
            const y = centerY + (direction * normalizedValue * canvasHeight * 0.4) + waveY;
            if (i === 0) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); }
          }
          ctx.strokeStyle = connectingLineColor;
          ctx.lineWidth = 2;
          ctx.stroke();
          
          // Dots
          for (let i = 0; i < dotCount; i++) {
            // Calculate hue for EACH dot based on base hue and index offset
            const dotHue = baseDotHue !== null ? (baseDotHue + i * 10) % 360 : null;
            const x = startX + i * dotSpacing * directionMultiplier;
            const dataIndex = Math.floor(i * (bufferLength / dotCount));
            const value = dataArray[dataIndex] * settings.sensitivity;
            const normalizedValue = value / 255;
            const waveY = Math.sin(i * 0.15 + phase) * 20;
            const direction = settings.showReversed ? 1 : -1;
            const y = centerY + (direction * normalizedValue * canvasHeight * 0.4) + waveY;
            const dotSize = 2 + normalizedValue * 8;
            const dotFillColor = dotHue !== null ? `hsla(${dotHue}, 90%, 60%, 1.0)` : settings.color;
            const shadowColor = dotHue !== null ? dotFillColor : settings.color;
            ctx.shadowBlur = 15;
            ctx.shadowColor = shadowColor;
            ctx.beginPath();
            ctx.arc(x, y, dotSize, 0, Math.PI * 2);
            ctx.fillStyle = dotFillColor;
            ctx.fill();
            ctx.shadowBlur = 0;
            
            // Draw mirrored dot if showInvert is enabled
            if (settings.showInvert) {
              const mirroredY = 2 * centerY - y; // Mirror across centerY
              ctx.beginPath();
              ctx.arc(x, mirroredY, dotSize, 0, Math.PI * 2);
              ctx.fillStyle = dotFillColor;
              ctx.shadowBlur = 15;
              ctx.shadowColor = shadowColor;
              ctx.fill();
              ctx.shadowBlur = 0;
            }
          }
        });
      }
      
      if (settings.verticalOrientation) {
        const dotCount = Math.min(bufferLength, 100);
        let centerX;
        if (placement === 'bottom') { centerX = canvasWidth * 0.8; } // Right
        else if (placement === 'middle') { centerX = canvasWidth / 2; }
        else { centerX = canvasWidth * 0.2; } // Left
        
        settings.animationStart.forEach(animationStart => {
          let startY = 0;
          let endY = canvasHeight;
          let directionMultiplier = 1;

          if (animationStart === 'beginning') { /* default */ }
          else if (animationStart === 'end') { startY = canvasHeight; endY = 0; directionMultiplier = -1; }
          else if (animationStart === 'middle') {
            const halfDotCount = Math.floor(dotCount / 2);
            const dotSpacing = (canvasHeight / 2) / halfDotCount;

            // --- Draw first half (center to bottom) --- 
            // Connecting line
            ctx.beginPath();
            for (let i = 0; i <= halfDotCount; i++) {
              const y = canvasHeight / 2 + i * dotSpacing;
              const dataIndex = Math.floor(i * (bufferLength / dotCount));
              const value = dataArray[dataIndex] * settings.sensitivity;
              const normalizedValue = value / 255;
              const waveX = Math.sin(i * 0.15 + phase) * 20;
              const direction = settings.showReversed ? 1 : -1;
              const x = centerX - (direction * normalizedValue * canvasWidth * 0.4) + waveX;
              if (i === 0) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); }
            }
            ctx.strokeStyle = connectingLineColor;
            ctx.lineWidth = 2;
            ctx.stroke();

            // Dots
            for (let i = 0; i <= halfDotCount; i++) {
              // Calculate hue for EACH dot based on base hue and index offset
              const dotHue = baseDotHue !== null ? (baseDotHue + i * 10) % 360 : null;
              const y = canvasHeight / 2 + i * dotSpacing;
              const dataIndex = Math.floor(i * (bufferLength / dotCount));
              const value = dataArray[dataIndex] * settings.sensitivity;
              const normalizedValue = value / 255;
              const waveX = Math.sin(i * 0.15 + phase) * 20;
              const direction = settings.showReversed ? 1 : -1;
              const x = centerX - (direction * normalizedValue * canvasWidth * 0.4) + waveX;
              const dotSize = 2 + normalizedValue * 8;
              const dotFillColor = dotHue !== null ? `hsla(${dotHue}, 90%, 60%, 1.0)` : settings.color;
              const shadowColor = dotHue !== null ? dotFillColor : settings.color;
              ctx.shadowBlur = 15;
              ctx.shadowColor = shadowColor;
              ctx.beginPath();
              ctx.arc(x, y, dotSize, 0, Math.PI * 2);
              ctx.fillStyle = dotFillColor;
              ctx.fill();
              ctx.shadowBlur = 0;
              
              // Draw mirrored dot if showInvert is enabled
              if (settings.showInvert) {
                const mirroredX = 2 * centerX - x; // Mirror across centerX
                ctx.beginPath();
                ctx.arc(mirroredX, y, dotSize, 0, Math.PI * 2);
                ctx.fillStyle = dotFillColor;
                ctx.shadowBlur = 15;
                ctx.shadowColor = shadowColor;
                ctx.fill();
                ctx.shadowBlur = 0;
              }
            }

            // --- Draw second half (center to top) --- 
             // Connecting line
            ctx.beginPath();
            for (let i = 0; i <= halfDotCount; i++) {
              const y = canvasHeight / 2 - i * dotSpacing;
              const dataIndex = Math.floor((halfDotCount + i) * (bufferLength / dotCount));
              const value = dataArray[dataIndex] * settings.sensitivity;
              const normalizedValue = value / 255;
              const waveX = Math.sin(i * 0.15 + phase) * 20;
              const direction = settings.showReversed ? 1 : -1;
              const x = centerX - (direction * normalizedValue * canvasWidth * 0.4) + waveX;
              if (i === 0) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); }
            }
            ctx.strokeStyle = connectingLineColor;
            ctx.lineWidth = 2;
            ctx.stroke();

            // Dots
            for (let i = 0; i <= halfDotCount; i++) {
              // Calculate hue for EACH dot based on base hue and index offset
              const dotHue = baseDotHue !== null ? (baseDotHue + (halfDotCount + i) * 10) % 360 : null;
              const y = canvasHeight / 2 - i * dotSpacing;
              const dataIndex = Math.floor((halfDotCount + i) * (bufferLength / dotCount));
              const value = dataArray[dataIndex] * settings.sensitivity;
              const normalizedValue = value / 255;
              const waveX = Math.sin(i * 0.15 + phase) * 20;
              const direction = settings.showReversed ? 1 : -1;
              const x = centerX - (direction * normalizedValue * canvasWidth * 0.4) + waveX;
              const dotSize = 2 + normalizedValue * 8;
              const dotFillColor = dotHue !== null ? `hsla(${dotHue}, 90%, 60%, 1.0)` : settings.color;
              const shadowColor = dotHue !== null ? dotFillColor : settings.color;
              ctx.shadowBlur = 15;
              ctx.shadowColor = shadowColor;
              ctx.beginPath();
              ctx.arc(x, y, dotSize, 0, Math.PI * 2);
              ctx.fillStyle = dotFillColor;
              ctx.fill();
              ctx.shadowBlur = 0;
              
              // Draw mirrored dot if showInvert is enabled
              if (settings.showInvert) {
                const mirroredX = 2 * centerX - x; // Mirror across centerX
                ctx.beginPath();
                ctx.arc(mirroredX, y, dotSize, 0, Math.PI * 2);
                ctx.fillStyle = dotFillColor;
                ctx.shadowBlur = 15;
                ctx.shadowColor = shadowColor;
                ctx.fill();
                ctx.shadowBlur = 0;
              }
            }
            
            return; // Skip the rest for middle animation
          }
          
          // --- Beginning or End animation --- 
          const dotSpacing = Math.abs(endY - startY) / dotCount;
          
          // Connecting line
          ctx.beginPath();
          for (let i = 0; i < dotCount; i++) {
            const y = startY + i * dotSpacing * directionMultiplier;
            const dataIndex = Math.floor(i * (bufferLength / dotCount));
            const value = dataArray[dataIndex] * settings.sensitivity;
            const normalizedValue = value / 255;
            const waveX = Math.sin(i * 0.15 + phase) * 20;
            const direction = settings.showReversed ? 1 : -1;
            const x = centerX - (direction * normalizedValue * canvasWidth * 0.4) + waveX;
            if (i === 0) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); }
          }
          ctx.strokeStyle = connectingLineColor;
          ctx.lineWidth = 2;
          ctx.stroke();
          
          // Dots
          for (let i = 0; i < dotCount; i++) {
            // Calculate hue for EACH dot based on base hue and index offset
            const dotHue = baseDotHue !== null ? (baseDotHue + i * 10) % 360 : null;
            const y = startY + i * dotSpacing * directionMultiplier;
            const dataIndex = Math.floor(i * (bufferLength / dotCount));
            const value = dataArray[dataIndex] * settings.sensitivity;
            const normalizedValue = value / 255;
            const waveX = Math.sin(i * 0.15 + phase) * 20;
            const direction = settings.showReversed ? 1 : -1;
            const x = centerX - (direction * normalizedValue * canvasWidth * 0.4) + waveX;
            const dotSize = 2 + normalizedValue * 8;
            const dotFillColor = dotHue !== null ? `hsla(${dotHue}, 90%, 60%, 1.0)` : settings.color;
            const shadowColor = dotHue !== null ? dotFillColor : settings.color;
            ctx.shadowBlur = 15;
            ctx.shadowColor = shadowColor;
            ctx.beginPath();
            ctx.arc(x, y, dotSize, 0, Math.PI * 2);
            ctx.fillStyle = dotFillColor;
            ctx.fill();
            ctx.shadowBlur = 0;
            
            // Draw mirrored dot if showInvert is enabled
            if (settings.showInvert) {
              const mirroredX = 2 * centerX - x; // Mirror across centerX
              ctx.beginPath();
              ctx.arc(mirroredX, y, dotSize, 0, Math.PI * 2);
              ctx.fillStyle = dotFillColor;
              ctx.shadowBlur = 15;
              ctx.shadowColor = shadowColor;
              ctx.fill();
              ctx.shadowBlur = 0;
            }
          }
        });
      }
    });
  }
};
