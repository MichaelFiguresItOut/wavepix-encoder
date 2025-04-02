
import { VisualizationSettings, formatColorWithOpacity } from './utils';

export const drawMultilineAnimation = (
  ctx: CanvasRenderingContext2D,
  dataArray: Uint8Array,
  canvas: HTMLCanvasElement,
  bufferLength: number,
  timestamp: number,
  settings: VisualizationSettings
) => {
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  
  // Extract base color components
  const baseColor = settings.color.startsWith('#') ? settings.color.slice(1) : settings.color; // Remove # from hex if present
  const r = settings.color.startsWith('#') ? parseInt(baseColor.slice(0, 2), 16) : 59; // Default to blue if not hex
  const g = settings.color.startsWith('#') ? parseInt(baseColor.slice(2, 4), 16) : 130;
  const b = settings.color.startsWith('#') ? parseInt(baseColor.slice(4, 6), 16) : 246;
  
  if (settings.showMirror) {
    // Center-origin multiline animation
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    
    // Number of lines radiating from center
    const lineCount = 8;
    
    // Animation phase
    const phase = (timestamp % 6000) / 6000 * Math.PI * 2;
    
    // Line colors (base color and variations)
    const lineColors = [
      `rgb(${r}, ${g}, ${b})`,
      `rgb(${Math.min(r + 30, 255)}, ${Math.min(g + 30, 255)}, ${b})`,
      `rgb(${r}, ${Math.min(g + 40, 255)}, ${Math.min(b + 40, 255)})`,
      `rgb(${Math.min(r + 50, 255)}, ${g}, ${Math.min(b + 50, 255)})`,
      `rgb(${Math.min(r + 20, 255)}, ${Math.min(g + 60, 255)}, ${b})`,
      `rgb(${r}, ${g}, ${Math.min(b + 70, 255)})`,
      `rgb(${Math.min(r + 40, 255)}, ${g}, ${Math.min(b + 20, 255)})`,
      `rgb(${r}, ${Math.min(g + 50, 255)}, ${b})`
    ];
    
    // Draw lines emanating from center
    for (let lineIndex = 0; lineIndex < lineCount; lineIndex++) {
      const lineAngle = (lineIndex / lineCount) * Math.PI * 2;
      
      // Sample frequency range for this line
      const rangeStart = (lineIndex / lineCount) * bufferLength;
      const rangeEnd = ((lineIndex + 1) / lineCount) * bufferLength;
      
      // Line style
      ctx.strokeStyle = lineColors[lineIndex % lineColors.length];
      ctx.lineWidth = 3;
      ctx.shadowBlur = 5;
      ctx.shadowColor = lineColors[lineIndex % lineColors.length];
      
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      
      // Calculate outer point
      const segmentLength = Math.min(canvasWidth, canvasHeight) * 0.45;
      const pointCount = 10;
      
      // Draw curved line from center
      for (let i = 1; i <= pointCount; i++) {
        const t = i / pointCount;
        const segmentProgress = Math.pow(t, 0.8); // Non-linear to make it more dynamic
        
        // Sample data from frequency range
        const dataIndex = Math.floor(rangeStart + segmentProgress * (rangeEnd - rangeStart));
        const value = dataArray[dataIndex % bufferLength] * settings.sensitivity;
        const normalizedValue = value / 255;
        
        // Calculate point position with wave effect
        const segmentDistance = segmentLength * segmentProgress;
        const waveAmplitude = 30 * normalizedValue;
        const wavePhase = phase + (lineIndex * Math.PI / 4);
        const waveOffset = Math.sin(segmentProgress * 5 + wavePhase) * waveAmplitude;
        
        // Calculate direction with wave distortion
        const distortedAngle = lineAngle + Math.sin(segmentProgress * 3 + phase) * 0.2 * normalizedValue;
        
        // Calculate point with distortion
        const x = centerX + Math.cos(distortedAngle) * segmentDistance + Math.cos(distortedAngle + Math.PI/2) * waveOffset;
        const y = centerY + Math.sin(distortedAngle) * segmentDistance + Math.sin(distortedAngle + Math.PI/2) * waveOffset;
        
        if (i === 1) {
          ctx.lineTo(x, y);
        } else {
          const prevSegmentProgress = Math.pow((i-1) / pointCount, 0.8);
          const prevDataIndex = Math.floor(rangeStart + prevSegmentProgress * (rangeEnd - rangeStart));
          const prevValue = dataArray[prevDataIndex % bufferLength] * settings.sensitivity;
          const prevNormalizedValue = prevValue / 255;
          
          const prevSegmentDistance = segmentLength * prevSegmentProgress;
          const prevWaveOffset = Math.sin(prevSegmentProgress * 5 + wavePhase) * 30 * prevNormalizedValue;
          const prevDistortedAngle = lineAngle + Math.sin(prevSegmentProgress * 3 + phase) * 0.2 * prevNormalizedValue;
          
          const prevX = centerX + Math.cos(prevDistortedAngle) * prevSegmentDistance + 
                       Math.cos(prevDistortedAngle + Math.PI/2) * prevWaveOffset;
          const prevY = centerY + Math.sin(prevDistortedAngle) * prevSegmentDistance + 
                       Math.sin(prevDistortedAngle + Math.PI/2) * prevWaveOffset;
          
          const cpX = (prevX + x) / 2 + Math.cos(distortedAngle + Math.PI/4) * waveOffset / 2;
          const cpY = (prevY + y) / 2 + Math.sin(distortedAngle + Math.PI/4) * waveOffset / 2;
          
          ctx.quadraticCurveTo(cpX, cpY, x, y);
        }
      }
      
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    
    // Add connecting arcs between adjacent lines
    ctx.lineWidth = 1;
    
    for (let i = 0; i < lineCount; i++) {
      const currentAngle = (i / lineCount) * Math.PI * 2;
      const nextAngle = ((i + 1) / lineCount) * Math.PI * 2;
      
      // Sample ranges
      const currentStart = (i / lineCount) * bufferLength;
      const currentEnd = ((i + 1) / lineCount) * bufferLength;
      const nextStart = ((i + 1) / lineCount) * bufferLength;
      const nextEnd = ((i + 2) / lineCount) * bufferLength;
      
      // Draw 3 connecting arcs at different distances from center
      for (let arcIndex = 1; arcIndex <= 3; arcIndex++) {
        const arcDistance = Math.min(canvasWidth, canvasHeight) * 0.15 * arcIndex;
        
        // Sample data for current and next position
        const currentDataIndex = Math.floor(currentStart + (arcIndex/3) * (currentEnd - currentStart));
        const nextDataIndex = Math.floor(nextStart + (arcIndex/3) * (nextEnd - nextStart));
        
        const currentValue = dataArray[currentDataIndex % bufferLength] * settings.sensitivity;
        const nextValue = dataArray[nextDataIndex % bufferLength] * settings.sensitivity;
        
        const currentNormalized = currentValue / 255;
        const nextNormalized = nextValue / 255;
        
        // Calculate points with distortion
        const wavePhase = phase + (i * Math.PI / 4);
        const currentDistortedAngle = currentAngle + Math.sin(arcIndex/3 * 3 + wavePhase) * 0.1 * currentNormalized;
        const nextDistortedAngle = nextAngle + Math.sin(arcIndex/3 * 3 + wavePhase) * 0.1 * nextNormalized;
        
        const currentDistance = arcDistance * (1 + currentNormalized * 0.2);
        const nextDistance = arcDistance * (1 + nextNormalized * 0.2);
        
        const x1 = centerX + Math.cos(currentDistortedAngle) * currentDistance;
        const y1 = centerY + Math.sin(currentDistortedAngle) * currentDistance;
        
        const x2 = centerX + Math.cos(nextDistortedAngle) * nextDistance;
        const y2 = centerY + Math.sin(nextDistortedAngle) * nextDistance;
        
        // Draw arc
        ctx.beginPath();
        
        // Calculate middle point for control point
        const middleAngle = (currentDistortedAngle + nextDistortedAngle) / 2;
        const middleDistance = (currentDistance + nextDistance) / 2 * 1.3; // Bow out slightly
        
        const cpX = centerX + Math.cos(middleAngle) * middleDistance;
        const cpY = centerY + Math.sin(middleAngle) * middleDistance;
        
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(cpX, cpY, x2, y2);
        
        // Draw with gradient
        const arcColor = formatColorWithOpacity(lineColors[i % lineColors.length], 0.3 - (arcIndex * 0.05));
        ctx.strokeStyle = arcColor;
        ctx.stroke();
      }
    }
  } else {
    // Apply orientation settings for non-mirrored mode
    if (settings.orientation === "horizontal" || settings.orientation === "both") {
      // Horizontal lines
      const lineCount = 5;
      const lineHeight = canvasHeight / (lineCount + 1);
      
      // Animation phase
      const phase = (timestamp % 6000) / 6000 * Math.PI * 2;
      
      // Frequency ranges for each line
      const ranges = [
        [0, 0.2],          // Bass
        [0.2, 0.4],        // Low-mid
        [0.4, 0.6],        // Mid
        [0.6, 0.8],        // High-mid
        [0.8, 1.0]         // Treble
      ];
      
      // Line colors (base color and variations)
      const lineColors = [
        `rgb(${r}, ${g}, ${b})`,
        `rgb(${Math.min(r + 40, 255)}, ${g}, ${b})`,
        `rgb(${r}, ${Math.min(g + 40, 255)}, ${b})`,
        `rgb(${r}, ${g}, ${Math.min(b + 40, 255)})`,
        `rgb(${Math.min(r + 20, 255)}, ${Math.min(g + 20, 255)}, ${b})`
      ];
      
      // Draw each line
      for (let lineIndex = 0; lineIndex < lineCount; lineIndex++) {
        const y = (lineIndex + 1) * lineHeight;
        const [rangeStart, rangeEnd] = ranges[lineIndex];
        
        const startFreq = Math.floor(bufferLength * rangeStart);
        const endFreq = Math.floor(bufferLength * rangeEnd);
        
        const pointCount = 100; // Number of points per line
        const pointSpacing = canvasWidth / (pointCount - 1);
        
        // Line style
        ctx.strokeStyle = lineColors[lineIndex];
        ctx.lineWidth = 3;
        ctx.shadowBlur = 5;
        ctx.shadowColor = lineColors[lineIndex];
        
        ctx.beginPath();
        
        for (let i = 0; i < pointCount; i++) {
          const x = i * pointSpacing;
          
          // Map data point to frequency range for this line
          const dataIndex = startFreq + Math.floor((i / pointCount) * (endFreq - startFreq));
          const value = dataArray[dataIndex] * settings.sensitivity;
          const normalizedValue = value / 255;
          
          // Add wave effect with phase offset for each line
          const linePhase = phase + (lineIndex * Math.PI / 5);
          const amplitude = lineHeight * 0.8 * normalizedValue;
          const waveY = Math.sin(i * 0.12 + linePhase) * amplitude;
          
          const pointY = y + waveY;
          
          if (i === 0) {
            ctx.moveTo(x, pointY);
          } else {
            // Use curves for smoother lines
            const prevX = (i - 1) * pointSpacing;
            const cpX = (prevX + x) / 2;
            ctx.quadraticCurveTo(cpX, pointY, x, pointY);
          }
        }
        
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
      
      // Add subtle vertical connecting lines
      ctx.lineWidth = 1;
      
      for (let i = 0; i < 20; i++) {
        const x = (canvasWidth / 20) * i;
        ctx.beginPath();
        ctx.moveTo(x, lineHeight);
        ctx.lineTo(x, lineHeight * lineCount);
        
        // Gradient for vertical lines
        const gradient = ctx.createLinearGradient(0, lineHeight, 0, lineHeight * lineCount);
        for (let j = 0; j < lineCount; j++) {
          gradient.addColorStop(j / (lineCount - 1), formatColorWithOpacity(lineColors[j], 0.27));
        }
        
        ctx.strokeStyle = gradient;
        ctx.stroke();
      }
    }
    
    if (settings.orientation === "vertical" || settings.orientation === "both") {
      // Vertical lines
      const lineCount = 5;
      const lineWidth = canvasWidth / (lineCount + 1);
      
      // Animation phase
      const phase = (timestamp % 6000) / 6000 * Math.PI * 2;
      
      // Frequency ranges for each line
      const ranges = [
        [0, 0.2],          // Bass
        [0.2, 0.4],        // Low-mid
        [0.4, 0.6],        // Mid
        [0.6, 0.8],        // High-mid
        [0.8, 1.0]         // Treble
      ];
      
      // Line colors (base color and variations)
      const lineColors = [
        `rgb(${r}, ${g}, ${b})`,
        `rgb(${Math.min(r + 40, 255)}, ${g}, ${b})`,
        `rgb(${r}, ${Math.min(g + 40, 255)}, ${b})`,
        `rgb(${r}, ${g}, ${Math.min(b + 40, 255)})`,
        `rgb(${Math.min(r + 20, 255)}, ${Math.min(g + 20, 255)}, ${b})`
      ];
      
      // Draw each line
      for (let lineIndex = 0; lineIndex < lineCount; lineIndex++) {
        const x = (lineIndex + 1) * lineWidth;
        const [rangeStart, rangeEnd] = ranges[lineIndex];
        
        const startFreq = Math.floor(bufferLength * rangeStart);
        const endFreq = Math.floor(bufferLength * rangeEnd);
        
        const pointCount = 100; // Number of points per line
        const pointSpacing = canvasHeight / (pointCount - 1);
        
        // Line style
        ctx.strokeStyle = lineColors[lineIndex];
        ctx.lineWidth = 3;
        ctx.shadowBlur = 5;
        ctx.shadowColor = lineColors[lineIndex];
        
        ctx.beginPath();
        
        for (let i = 0; i < pointCount; i++) {
          const y = i * pointSpacing;
          
          // Map data point to frequency range for this line
          const dataIndex = startFreq + Math.floor((i / pointCount) * (endFreq - startFreq));
          const value = dataArray[dataIndex] * settings.sensitivity;
          const normalizedValue = value / 255;
          
          // Add wave effect with phase offset for each line
          const linePhase = phase + (lineIndex * Math.PI / 5);
          const amplitude = lineWidth * 0.8 * normalizedValue;
          const waveX = Math.sin(i * 0.12 + linePhase) * amplitude;
          
          const pointX = x + waveX;
          
          if (i === 0) {
            ctx.moveTo(pointX, y);
          } else {
            // Use curves for smoother lines
            const prevY = (i - 1) * pointSpacing;
            const cpY = (prevY + y) / 2;
            ctx.quadraticCurveTo(pointX, cpY, pointX, y);
          }
        }
        
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
      
      // Add subtle horizontal connecting lines
      ctx.lineWidth = 1;
      
      for (let i = 0; i < 20; i++) {
        const y = (canvasHeight / 20) * i;
        ctx.beginPath();
        ctx.moveTo(lineWidth, y);
        ctx.lineTo(lineWidth * lineCount, y);
        
        // Gradient for horizontal lines
        const gradient = ctx.createLinearGradient(lineWidth, 0, lineWidth * lineCount, 0);
        for (let j = 0; j < lineCount; j++) {
          gradient.addColorStop(j / (lineCount - 1), formatColorWithOpacity(lineColors[j], 0.27));
        }
        
        ctx.strokeStyle = gradient;
        ctx.stroke();
      }
    }
  }
};
