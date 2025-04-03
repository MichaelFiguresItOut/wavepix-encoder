
import { VisualizationSettings, getAverageFrequency } from './utils';

export const drawSiriAnimation = (
  ctx: CanvasRenderingContext2D,
  dataArray: Uint8Array,
  canvas: HTMLCanvasElement,
  bufferLength: number,
  timestamp: number,
  settings: VisualizationSettings
) => {
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  
  if (settings.horizontalOrientation) {
    // Horizontal orientation (left to right)
    const centerY = canvasHeight / 2;
    
    // Apple Siri-inspired animation (colorful waveform that moves)
    const waveCount = 3; // Number of waves
    const waveColors = [
      `${settings.color}`, 
      settings.color === '#3B82F6' ? '#9333EA' : '#3B82F6', 
      settings.color === '#3B82F6' ? '#EC4899' : '#10B981'
    ];
    
    // Take a subset of the data for a cleaner look
    const usableLength = Math.min(bufferLength, 64);
    
    // Time-based phase shift
    const basePhase = (timestamp % 5000) / 5000 * Math.PI * 2;
    
    settings.animationStart.forEach(animationStart => {
      // Draw multiple waves with phase offset
      for (let wave = 0; wave < waveCount; wave++) {
        const wavePhase = basePhase + (wave * Math.PI * 0.5);
        const waveAmplitude = canvasHeight * 0.15 * (1 - wave * 0.2);
        
        ctx.strokeStyle = waveColors[wave];
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
            
            // Y position based on sine wave + audio data
            const y = centerY + 
                    Math.sin(i * 0.3 + wavePhase) * waveAmplitude * normalizedValue;
            
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
            
            // Y position based on sine wave + audio data
            const y = centerY + 
                    Math.sin(i * 0.3 + wavePhase) * waveAmplitude * normalizedValue;
            
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
            
            // Y position based on sine wave + audio data
            const y = centerY + 
                    Math.sin(i * 0.3 + wavePhase) * waveAmplitude * normalizedValue;
            
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
          ctx.moveTo(centerX, centerY); // Reset to center
          
          for (let i = 0; i < usableLength / 2; i++) {
            const value = dataArray[Math.floor((usableLength / 2 + i) * (bufferLength / usableLength))] * settings.sensitivity;
            const normalizedValue = value / 255;
            
            // X position from center to left
            const x = centerX - (i * sliceWidth);
            
            // Y position based on sine wave + audio data
            const y = centerY + 
                    Math.sin(i * 0.3 + wavePhase) * waveAmplitude * normalizedValue;
            
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
        ctx.shadowColor = waveColors[wave];
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    });
  }
  
  if (settings.verticalOrientation) {
    // Vertical orientation (top to bottom)
    const centerX = canvasWidth / 2;
    
    // Vertical Siri-inspired waves
    const waveCount = 3;
    const waveColors = [
      `${settings.color}`, 
      settings.color === '#3B82F6' ? '#9333EA' : '#3B82F6', 
      settings.color === '#3B82F6' ? '#EC4899' : '#10B981'
    ];
    
    // Time-based phase shift
    const basePhase = (timestamp % 5000) / 5000 * Math.PI * 2;
    
    // Take a subset of the data for a cleaner look
    const usableLength = Math.min(bufferLength, 64);
    
    settings.animationStart.forEach(animationStart => {
      // Draw multiple waves with phase offset
      for (let wave = 0; wave < waveCount; wave++) {
        const wavePhase = basePhase + (wave * Math.PI * 0.5);
        const waveAmplitude = canvasWidth * 0.15 * (1 - wave * 0.2);
        
        ctx.strokeStyle = waveColors[wave];
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
            
            // X position based on sine wave + audio data
            const x = centerX + 
                    Math.sin(i * 0.3 + wavePhase) * waveAmplitude * normalizedValue;
            
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
            
            // X position based on sine wave + audio data
            const x = centerX + 
                    Math.sin(i * 0.3 + wavePhase) * waveAmplitude * normalizedValue;
            
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
            
            // X position based on sine wave + audio data
            const x = centerX + 
                    Math.sin(i * 0.3 + wavePhase) * waveAmplitude * normalizedValue;
            
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
          ctx.moveTo(centerX, centerY); // Reset to center
          
          for (let i = 0; i < usableLength / 2; i++) {
            const value = dataArray[Math.floor((usableLength / 2 + i) * (bufferLength / usableLength))] * settings.sensitivity;
            const normalizedValue = value / 255;
            
            // Y position from center to top
            const y = centerY - (i * sliceHeight);
            
            // X position based on sine wave + audio data
            const x = centerX + 
                    Math.sin(i * 0.3 + wavePhase) * waveAmplitude * normalizedValue;
            
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
        ctx.shadowColor = waveColors[wave];
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    });
  }
  
  // Mirror mode for both orientations is handled through the circular animation
  if (settings.showMirror) {
    // Mirror mode: concentric circles that emanate from center
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    
    // Circular siri-inspired waves
    const waveCount = 3;
    const waveColors = [
      `${settings.color}`, 
      settings.color === '#3B82F6' ? '#9333EA' : '#3B82F6', 
      settings.color === '#3B82F6' ? '#EC4899' : '#10B981'
    ];
    
    // Time-based animation
    const basePhase = (timestamp % 5000) / 5000 * Math.PI * 2;
    
    // Sample data from different frequency ranges for each wave
    const bassValue = getAverageFrequency(dataArray, 0, bufferLength * 0.1) * settings.sensitivity;
    const midValue = getAverageFrequency(dataArray, bufferLength * 0.1, bufferLength * 0.5) * settings.sensitivity;
    const highValue = getAverageFrequency(dataArray, bufferLength * 0.5, bufferLength) * settings.sensitivity;
    const freqValues = [bassValue, midValue, highValue];
    
    // Draw waves from inside out
    for (let wave = 0; wave < waveCount; wave++) {
      const wavePhase = basePhase - (wave * Math.PI * 0.5);
      const baseRadius = 50 + wave * 50;
      const maxDistortion = 40 * freqValues[wave];
      
      ctx.strokeStyle = waveColors[wave];
      ctx.lineWidth = 4 - wave;
      ctx.beginPath();
      
      // Draw circular wave
      for (let angle = 0; angle <= Math.PI * 2; angle += 0.05) {
        // Distort radius based on frequency data
        const radiusDistortion = Math.sin(angle * 6 + wavePhase) * maxDistortion;
        const radius = baseRadius + radiusDistortion;
        
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        
        if (angle === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.closePath();
      
      // Add glow effect
      ctx.shadowBlur = 10;
      ctx.shadowColor = waveColors[wave];
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }
  
  // Add subtle background glow
  const gradientRadius = Math.min(canvasWidth, canvasHeight) * 0.5;
  const glow = ctx.createRadialGradient(
    canvasWidth/2, canvasHeight/2, 0,
    canvasWidth/2, canvasHeight/2, gradientRadius
  );
  glow.addColorStop(0, `${settings.color}22`);
  glow.addColorStop(1, 'transparent');
  
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
};
