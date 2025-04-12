import { VisualizerSettings } from '@/hooks/useAudioVisualization';
import { getAverageFrequency } from './utils';

export const drawSiriAnimation = (
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

  // Base hue for the frame if rainbow is ON
  let baseHue = null;
  if (settings.showRainbow) {
      baseHue = (timestamp / 15 * currentRainbowSpeed) % 360; // Adjust speed as needed
      if (isNaN(baseHue)) baseHue = 0;
  }
  
  // Apple Siri-inspired animation (colorful waveform that moves)
  const waveCount = 3; // Number of waves
  
  // Define original wave colors for non-rainbow mode
  const originalWaveColors = [
    `${settings.color}`,
    settings.color === '#3B82F6' ? '#9333EA' : '#3B82F6',
    settings.color === '#3B82F6' ? '#EC4899' : '#10B981'
  ];
  
  // Take a subset of the data for a cleaner look
  const usableLength = Math.min(bufferLength, 64);
  
  // Time-based phase shift
  const basePhase = (timestamp % 5000) / 5000 * Math.PI * 2;
  
  // If Round Effect is enabled, show circles instead of lines
  if (settings.showMirror) {
    // Circular mode with centered display
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    
    // Draw multiple waves in different colors
    for (let wave = 0; wave < waveCount; wave++) {
      const wavePhase = basePhase + (wave * Math.PI * 0.5);
      
      // Determine color: Rainbow or Original
      let currentFillColor: string;
      let currentShadowColor: string;
      if (baseHue !== null) {
          // Rainbow ON
          const offsetHue = (baseHue + wave * 40) % 360; // Offset hue per wave
          currentFillColor = `hsla(${offsetHue}, 85%, 65%, 0.54)`; // ~88 hex alpha
          currentShadowColor = `hsla(${offsetHue}, 85%, 65%, 1.0)`;
      } else {
          // Rainbow OFF - use original predefined colors
          currentFillColor = originalWaveColors[wave] + "88"; // Add original alpha
          currentShadowColor = originalWaveColors[wave];
      }
      
      ctx.fillStyle = currentFillColor;
      
      // Create a pattern of circles around the center
      const circleCount = 24; // Number of circles per wave
      
      // Determine if we should animate outward (default) or inward (when inverted)
      const isInverted = settings.showInvert;
      
      // Different radius for each wave with invert effect consideration
      let baseRadius;
      if (isInverted) {
        // When inverted, larger waves have smaller radius (radiating inward)
        baseRadius = 170 - wave * 40;
      } else {
        // Default behavior - waves radiate outward
        baseRadius = 50 + wave * 40;
      }
      
      for (let i = 0; i < circleCount; i++) {
        // Calculate position around a circle
        const angle = (i / circleCount) * Math.PI * 2 + wavePhase;
        
        // Get audio data for this position
        const dataIndex = Math.floor(i * (bufferLength / circleCount));
        const value = dataArray[dataIndex] * settings.sensitivity;
        const normalizedValue = value / 255;
        
        // Calculate radius with audio reactivity, considering invert effect
        let circleRadius;
        if (isInverted) {
          // Inward radiation - audio makes circles move inward
          circleRadius = baseRadius - normalizedValue * 50;
        } else {
          // Outward radiation - audio makes circles move outward
          circleRadius = baseRadius + normalizedValue * 50;
        }
        
        // Calculate position
        const x = centerX + Math.cos(angle) * circleRadius;
        const y = centerY + Math.sin(angle) * circleRadius;
        
        // Draw pulsing circle - size based on audio and wave
        const pulseSize = 3 + normalizedValue * 12 * (1 - wave * 0.3);
        ctx.beginPath();
        ctx.arc(x, y, pulseSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Add glow for larger circles
        if (pulseSize > 7) {
          ctx.shadowBlur = pulseSize;
          ctx.shadowColor = currentShadowColor; // Use calculated shadow color
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
    }
    
    return; // Skip the standard animation when in round mode
  }
  
  // Standard Siri line animation
  if (settings.horizontalOrientation) {
    // Process each bar placement option
    settings.barPlacement.forEach(placement => {
      // Calculate the base Y position based on placement
      let baseY;
      if (placement === 'top') {
        baseY = canvasHeight * 0.2; // Near the top
      } else if (placement === 'middle') {
        baseY = canvasHeight / 2; // Middle of the screen
      } else { // bottom
        baseY = canvasHeight * 0.8; // Near the bottom
      }
      
      // Process each animation start option
      settings.animationStart.forEach(animationStart => {
        // Draw multiple waves with phase offset
        for (let wave = 0; wave < waveCount; wave++) {
          const wavePhase = basePhase + (wave * Math.PI * 0.5);
          const waveAmplitude = canvasHeight * 0.15 * (1 - wave * 0.2);
          
          // Determine color: Rainbow or Original
          let currentStrokeColor: string;
          if (baseHue !== null) {
              // Rainbow ON
              const offsetHue = (baseHue + wave * 40) % 360; // Offset hue per wave
              currentStrokeColor = `hsla(${offsetHue}, 85%, 65%, 1.0)`;
          } else {
              // Rainbow OFF - use original predefined colors
              currentStrokeColor = originalWaveColors[wave];
          }

          ctx.strokeStyle = currentStrokeColor;
          ctx.lineWidth = 5 - wave;
          ctx.beginPath();
          
          if (animationStart === 'beginning') {
            // Left to right
            const sliceWidth = canvasWidth / usableLength;
            
            for (let i = 0; i < usableLength; i++) {
              const value = dataArray[Math.floor(i * (bufferLength / usableLength))] * settings.sensitivity;
              const normalizedValue = value / 255;
              
              // X position across the screen
              const x = i * sliceWidth;
              
              // Y position based on sine wave + audio data and placement
              const y = baseY + Math.sin(i * 0.3 + wavePhase) * waveAmplitude * normalizedValue;
              
              if (i === 0) {
                ctx.moveTo(x, y);
              } else {
                // Use quadratic curves for smoother wave
                const prevX = (i - 1) * sliceWidth;
                const cpX = (prevX + x) / 2;
                ctx.quadraticCurveTo(cpX, y, x, y);
              }
            }
          }
          else if (animationStart === 'end') {
            // Right to left
            const sliceWidth = canvasWidth / usableLength;
            
            for (let i = 0; i < usableLength; i++) {
              const value = dataArray[Math.floor(i * (bufferLength / usableLength))] * settings.sensitivity;
              const normalizedValue = value / 255;
              
              // X position across the screen (reversed)
              const x = canvasWidth - (i * sliceWidth);
              
              // Y position based on sine wave + audio data and placement
              const y = baseY + Math.sin(i * 0.3 + wavePhase) * waveAmplitude * normalizedValue;
              
              if (i === 0) {
                ctx.moveTo(x, y);
              } else {
                // Use quadratic curves for smoother wave
                const prevX = canvasWidth - ((i - 1) * sliceWidth);
                const cpX = (prevX + x) / 2;
                ctx.quadraticCurveTo(cpX, y, x, y);
              }
            }
          }
          else if (animationStart === 'middle') {
            // From middle outward
            const centerX = canvasWidth / 2;
            const sliceWidth = (canvasWidth / 2) / (usableLength / 2);
            
            // Right half
            for (let i = 0; i < usableLength / 2; i++) {
              const value = dataArray[Math.floor(i * (bufferLength / usableLength))] * settings.sensitivity;
              const normalizedValue = value / 255;
              
              // X position from center to right
              const x = centerX + (i * sliceWidth);
              
              // Y position based on sine wave + audio data and placement
              const y = baseY + Math.sin(i * 0.3 + wavePhase) * waveAmplitude * normalizedValue;
              
              if (i === 0) {
                ctx.moveTo(centerX, y);
              } else {
                // Use quadratic curves for smoother wave
                const prevX = centerX + ((i - 1) * sliceWidth);
                const cpX = (prevX + x) / 2;
                ctx.quadraticCurveTo(cpX, y, x, y);
              }
            }
            
            // Left half
            ctx.moveTo(centerX, baseY); // Reset to center with proper Y position
            
            for (let i = 0; i < usableLength / 2; i++) {
              const value = dataArray[Math.floor((usableLength / 2 + i) * (bufferLength / usableLength))] * settings.sensitivity;
              const normalizedValue = value / 255;
              
              // X position from center to left
              const x = centerX - (i * sliceWidth);
              
              // Y position based on sine wave + audio data and placement
              const y = baseY + Math.sin(i * 0.3 + wavePhase) * waveAmplitude * normalizedValue;
              
              if (i === 0) {
                ctx.moveTo(centerX, y);
              } else {
                // Use quadratic curves for smoother wave
                const prevX = centerX - ((i - 1) * sliceWidth);
                const cpX = (prevX + x) / 2;
                ctx.quadraticCurveTo(cpX, y, x, y);
              }
            }
          }
          
          // Add glow effect
          ctx.shadowBlur = 10;
          ctx.shadowColor = currentStrokeColor; // Use calculated color for shadow
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      });
    });
  }
  
  if (settings.verticalOrientation) {
    // Process each bar placement option
    settings.barPlacement.forEach(placement => {
      // Calculate the base X position based on placement
      let baseX;
      if (placement === 'bottom') { // Right in vertical orientation
        baseX = canvasWidth * 0.8; // Near the right
      } else if (placement === 'middle') {
        baseX = canvasWidth / 2; // Middle of the screen
      } else { // top (Left in vertical orientation)
        baseX = canvasWidth * 0.2; // Near the left
      }
      
      // Process each animation start option
      settings.animationStart.forEach(animationStart => {
        // Draw multiple waves with phase offset
        for (let wave = 0; wave < waveCount; wave++) {
          const wavePhase = basePhase + (wave * Math.PI * 0.5);
          const waveAmplitude = canvasWidth * 0.15 * (1 - wave * 0.2);
          
          // Determine color: Rainbow or Original
          let currentStrokeColor: string;
          if (baseHue !== null) {
              // Rainbow ON
              const offsetHue = (baseHue + wave * 40) % 360; // Offset hue per wave
              currentStrokeColor = `hsla(${offsetHue}, 85%, 65%, 1.0)`;
          } else {
              // Rainbow OFF - use original predefined colors
              currentStrokeColor = originalWaveColors[wave];
          }

          ctx.strokeStyle = currentStrokeColor;
          ctx.lineWidth = 5 - wave;
          ctx.beginPath();
          
          if (animationStart === 'beginning') {
            // Top to bottom
            const sliceHeight = canvasHeight / usableLength;
            
            for (let i = 0; i < usableLength; i++) {
              const value = dataArray[Math.floor(i * (bufferLength / usableLength))] * settings.sensitivity;
              const normalizedValue = value / 255;
              
              // Y position down the screen
              const y = i * sliceHeight;
              
              // X position based on sine wave + audio data and placement
              const x = baseX + Math.sin(i * 0.3 + wavePhase) * waveAmplitude * normalizedValue;
              
              if (i === 0) {
                ctx.moveTo(x, y);
              } else {
                // Use quadratic curves for smoother wave
                const prevY = (i - 1) * sliceHeight;
                const cpY = (prevY + y) / 2;
                ctx.quadraticCurveTo(x, cpY, x, y);
              }
            }
          }
          else if (animationStart === 'end') {
            // Bottom to top
            const sliceHeight = canvasHeight / usableLength;
            
            for (let i = 0; i < usableLength; i++) {
              const value = dataArray[Math.floor(i * (bufferLength / usableLength))] * settings.sensitivity;
              const normalizedValue = value / 255;
              
              // Y position up the screen (reversed)
              const y = canvasHeight - (i * sliceHeight);
              
              // X position based on sine wave + audio data and placement
              const x = baseX + Math.sin(i * 0.3 + wavePhase) * waveAmplitude * normalizedValue;
              
              if (i === 0) {
                ctx.moveTo(x, y);
              } else {
                // Use quadratic curves for smoother wave
                const prevY = canvasHeight - ((i - 1) * sliceHeight);
                const cpY = (prevY + y) / 2;
                ctx.quadraticCurveTo(x, cpY, x, y);
              }
            }
          }
          else if (animationStart === 'middle') {
            // From middle outward
            const centerY = canvasHeight / 2;
            const sliceHeight = (canvasHeight / 2) / (usableLength / 2);
            
            // Bottom half
            for (let i = 0; i < usableLength / 2; i++) {
              const value = dataArray[Math.floor(i * (bufferLength / usableLength))] * settings.sensitivity;
              const normalizedValue = value / 255;
              
              // Y position from center to bottom
              const y = centerY + (i * sliceHeight);
              
              // X position based on sine wave + audio data and placement
              const x = baseX + Math.sin(i * 0.3 + wavePhase) * waveAmplitude * normalizedValue;
              
              if (i === 0) {
                ctx.moveTo(x, centerY);
              } else {
                // Use quadratic curves for smoother wave
                const prevY = centerY + ((i - 1) * sliceHeight);
                const cpY = (prevY + y) / 2;
                ctx.quadraticCurveTo(x, cpY, x, y);
              }
            }
            
            // Top half
            ctx.moveTo(baseX, centerY); // Reset to center with proper X position
            
            for (let i = 0; i < usableLength / 2; i++) {
              const value = dataArray[Math.floor((usableLength / 2 + i) * (bufferLength / usableLength))] * settings.sensitivity;
              const normalizedValue = value / 255;
              
              // Y position from center to top
              const y = centerY - (i * sliceHeight);
              
              // X position based on sine wave + audio data and placement
              const x = baseX + Math.sin(i * 0.3 + wavePhase) * waveAmplitude * normalizedValue;
              
              if (i === 0) {
                ctx.moveTo(x, centerY);
              } else {
                // Use quadratic curves for smoother wave
                const prevY = centerY - ((i - 1) * sliceHeight);
                const cpY = (prevY + y) / 2;
                ctx.quadraticCurveTo(x, cpY, x, y);
              }
            }
          }
          
          // Add glow effect
          ctx.shadowBlur = 10;
          ctx.shadowColor = currentStrokeColor; // Use calculated color for shadow
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      });
    });
  }
  
  // Add subtle background glow
  const gradientRadius = Math.min(canvasWidth, canvasHeight) * 0.5;
  const glow = ctx.createRadialGradient(
    canvasWidth/2, canvasHeight/2, 0,
    canvasWidth/2, canvasHeight/2, gradientRadius
  );
  
  // Determine glow start color based on rainbow setting
  let glowStartColor: string;
  if (baseHue !== null) {
      // Rainbow ON: Use base hue with low alpha
      glowStartColor = `hsla(${baseHue}, 85%, 65%, 0.13)`; // ~22 hex alpha
  } else {
      // Rainbow OFF: Use selected color with low alpha
      glowStartColor = `${settings.color}22`;
  }

  glow.addColorStop(0, glowStartColor);
  glow.addColorStop(1, 'transparent');
  
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
};
