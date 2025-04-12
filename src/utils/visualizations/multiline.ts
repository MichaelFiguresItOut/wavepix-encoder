import { VisualizerSettings } from '@/hooks/useAudioVisualization';
import { formatColorWithOpacity } from './utils';

export const drawMultilineAnimation = (
  ctx: CanvasRenderingContext2D,
  dataArray: Uint8Array,
  canvas: HTMLCanvasElement,
  bufferLength: number,
  timestamp: number,
  settings: VisualizerSettings
) => {
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  
  // Get current speed, default to 1.0 (used if rainbow is on)
  const currentRainbowSpeed = settings.rainbowSpeed || 1.0;

  // Helper to get CYCLING hue if Rainbow is ON
  const getCurrentHue = () => {
    if (settings.showRainbow) { 
      // Increase base speed further
      return (timestamp / 10 * currentRainbowSpeed) % 360; // Changed 50 to 10
    }
    return null; 
  };

  // Extract base color components (needed if rainbow is OFF)
  let r = 59, g = 130, b = 246; // Default blue
  if (!settings.showRainbow) {
    const baseColor = settings.color.startsWith('#') ? settings.color.slice(1) : settings.color;
    if (settings.color.startsWith('#') && baseColor.length === 6) {
        r = parseInt(baseColor.slice(0, 2), 16);
        g = parseInt(baseColor.slice(2, 4), 16);
        b = parseInt(baseColor.slice(4, 6), 16);
    }
  }

  if (settings.showMirror) {
    // Center-origin multiline animation
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    const lineCount = 8;
    const phase = (timestamp % 6000) / 6000 * Math.PI * 2;

    // Define lineColors array (used only if rainbow is OFF)
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
      const baseHue = getCurrentHue(); // Gets CYCLING hue if showRainbow is true
      // Add a slight offset per line for variation
      const offsetHue = baseHue !== null ? (baseHue + lineIndex * 30) % 360 : null; 
      const currentStrokeColor = offsetHue !== null ? `hsla(${offsetHue}, 90%, 60%, 1.0)` : lineColors[lineIndex % lineColors.length];
      const currentShadowColor = offsetHue !== null ? currentStrokeColor : lineColors[lineIndex % lineColors.length];
      
      const lineAngle = (lineIndex / lineCount) * Math.PI * 2;
      const rangeStart = (lineIndex / lineCount) * bufferLength;
      const rangeEnd = ((lineIndex + 1) / lineCount) * bufferLength;
      
      // Set line style based on rainbow state
      ctx.strokeStyle = currentStrokeColor;
      ctx.lineWidth = 3;
      ctx.shadowBlur = 5;
      ctx.shadowColor = currentShadowColor;
      
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      
      const segmentLength = Math.min(canvasWidth, canvasHeight) * 0.45;
      const pointCount = 10;
      
      // Draw curved line from center (logic remains same)
      for (let i = 1; i <= pointCount; i++) {
        const t = i / pointCount;
        const segmentProgress = Math.pow(t, 0.8);
        const dataIndex = Math.floor(rangeStart + segmentProgress * (rangeEnd - rangeStart));
        const value = dataArray[dataIndex % bufferLength] * settings.sensitivity;
        const normalizedValue = value / 255;
        const segmentDistance = segmentLength * segmentProgress;
        const waveAmplitude = 30 * normalizedValue;
        const wavePhase = phase + (lineIndex * Math.PI / 4);
        const waveOffset = Math.sin(segmentProgress * 5 + wavePhase) * waveAmplitude;
        const distortedAngle = lineAngle + Math.sin(segmentProgress * 3 + phase) * 0.2 * normalizedValue;
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
          const prevX = centerX + Math.cos(prevDistortedAngle) * prevSegmentDistance + Math.cos(prevDistortedAngle + Math.PI/2) * prevWaveOffset;
          const prevY = centerY + Math.sin(prevDistortedAngle) * prevSegmentDistance + Math.sin(prevDistortedAngle + Math.PI/2) * prevWaveOffset;
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
      const currentStart = (i / lineCount) * bufferLength;
      const currentEnd = ((i + 1) / lineCount) * bufferLength;
      const nextStart = ((i + 1) / lineCount) * bufferLength;
      const nextEnd = ((i + 2) / lineCount) * bufferLength;
      
      for (let arcIndex = 1; arcIndex <= 3; arcIndex++) {
        const arcDistance = Math.min(canvasWidth, canvasHeight) * 0.15 * arcIndex;
        const currentDataIndex = Math.floor(currentStart + (arcIndex/3) * (currentEnd - currentStart));
        const nextDataIndex = Math.floor(nextStart + (arcIndex/3) * (nextEnd - nextStart));
        const currentValue = dataArray[currentDataIndex % bufferLength] * settings.sensitivity;
        const nextValue = dataArray[nextDataIndex % bufferLength] * settings.sensitivity;
        const currentNormalized = currentValue / 255;
        const nextNormalized = nextValue / 255;
        const wavePhase = phase + (i * Math.PI / 4);
        const currentDistortedAngle = currentAngle + Math.sin(arcIndex/3 * 3 + wavePhase) * 0.1 * currentNormalized;
        const nextDistortedAngle = nextAngle + Math.sin(arcIndex/3 * 3 + wavePhase) * 0.1 * nextNormalized;
        const currentDistance = arcDistance * (1 + currentNormalized * 0.2);
        const nextDistance = arcDistance * (1 + nextNormalized * 0.2);
        const x1 = centerX + Math.cos(currentDistortedAngle) * currentDistance;
        const y1 = centerY + Math.sin(currentDistortedAngle) * currentDistance;
        const x2 = centerX + Math.cos(nextDistortedAngle) * nextDistance;
        const y2 = centerY + Math.sin(nextDistortedAngle) * nextDistance;
        const middleAngle = (currentDistortedAngle + nextDistortedAngle) / 2;
        const middleDistance = (currentDistance + nextDistance) / 2 * 1.3;
        const cpX = centerX + Math.cos(middleAngle) * middleDistance;
        const cpY = centerY + Math.sin(middleAngle) * middleDistance;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(cpX, cpY, x2, y2);
        
        // Set arc color based on rainbow state
        const arcOpacity = 0.3 - (arcIndex * 0.05);
        let arcColor;
        if (settings.showRainbow) {
           // Increase base speed further
           const arcHue = (timestamp / 10 * currentRainbowSpeed + i * 10 + arcIndex * 5) % 360; // Changed 50 to 10
           arcColor = `hsla(${arcHue}, 80%, 50%, ${arcOpacity})`;
        } else {
            arcColor = formatColorWithOpacity(lineColors[i % lineColors.length], arcOpacity);
        }
        ctx.strokeStyle = arcColor;
        ctx.stroke();
      }
    }
  } else {
    // Non-mirrored mode (Horizontal/Vertical Lines)
    const lineCount = 5;
    const phase = (timestamp % 6000) / 6000 * Math.PI * 2;
    const ranges = [[0, 0.2], [0.2, 0.4], [0.4, 0.6], [0.6, 0.8], [0.8, 1.0]];
    
    // Define lineColors array (used only if rainbow is OFF)
    const lineColors = [
        `rgb(${r}, ${g}, ${b})`,
        `rgb(${Math.min(r + 40, 255)}, ${g}, ${b})`,
        `rgb(${r}, ${Math.min(g + 40, 255)}, ${b})`,
        `rgb(${r}, ${g}, ${Math.min(b + 40, 255)})`,
        `rgb(${Math.min(r + 20, 255)}, ${Math.min(g + 20, 255)}, ${b})`
    ];

    if (settings.horizontalOrientation) {
      const lineHeight = canvasHeight / (lineCount + 1);
      const animStart = settings.animationStart[0] || "beginning";
      let startX = 0, endX = canvasWidth, direction = 1;
      if (animStart === "end") { startX = canvasWidth; endX = 0; direction = -1; }
      else if (animStart === "middle") { startX = canvasWidth / 2; endX = canvasWidth; direction = 0; }
      
      // Draw each horizontal line
      for (let lineIndex = 0; lineIndex < lineCount; lineIndex++) {
        const baseHue = getCurrentHue(); // Gets CYCLING hue if showRainbow is true
         // Add a slight offset per line for variation
        const offsetHue = baseHue !== null ? (baseHue + lineIndex * 30) % 360 : null; 
        const currentStrokeColor = offsetHue !== null ? `hsla(${offsetHue}, 90%, 60%, 1.0)` : lineColors[lineIndex];
        const currentShadowColor = offsetHue !== null ? currentStrokeColor : lineColors[lineIndex];
        
        const y = (lineIndex + 1) * lineHeight;
        const [rangeStart, rangeEnd] = ranges[lineIndex];
        const startFreq = Math.floor(bufferLength * rangeStart);
        const endFreq = Math.floor(bufferLength * rangeEnd);
        const pointCount = 100;
        
        ctx.lineWidth = 3;
        ctx.shadowBlur = 5;
        // Set style BEFORE pathing for middle animation start
        ctx.strokeStyle = currentStrokeColor;
        ctx.shadowColor = currentShadowColor;

        if (animStart === "middle") {
          const halfPointCount = Math.floor(pointCount / 2);
          const pointSpacing = (canvasWidth / 2) / halfPointCount;
          const centerX = canvasWidth / 2;
          
          // First half (center to right)
          ctx.beginPath();
          for (let i = 0; i <= halfPointCount; i++) {
             // ... (calculations for x, pointY) ...
            const x = centerX + i * pointSpacing;
            const dataIndex = startFreq + Math.floor((i / halfPointCount) * (endFreq - startFreq));
            const value = dataArray[dataIndex] * settings.sensitivity;
            const normalizedValue = value / 255;
            const linePhase = phase + (lineIndex * Math.PI / 5);
            const amplitude = lineHeight * 0.8 * normalizedValue;
            const waveY = Math.sin(i * 0.12 + linePhase) * amplitude;
            const pointY = y + waveY;
            if (i === 0) { ctx.moveTo(x, pointY); } else { const prevX = centerX + (i - 1) * pointSpacing; const cpX = (prevX + x) / 2; ctx.quadraticCurveTo(cpX, pointY, x, pointY); }
          }
          ctx.stroke();
          ctx.shadowBlur = 0; // Reset shadow after first half
          
          // Second half (center to left)
          ctx.shadowBlur = 5; // Re-apply shadow for second half if needed
          ctx.beginPath();
          for (let i = 0; i <= halfPointCount; i++) {
             // ... (calculations for x, pointY) ...
            const x = centerX - i * pointSpacing;
            const dataIndex = startFreq + Math.floor(((halfPointCount + i) / pointCount) * (endFreq - startFreq));
            const value = dataArray[dataIndex] * settings.sensitivity;
            const normalizedValue = value / 255;
            const linePhase = phase + (lineIndex * Math.PI / 5);
            const amplitude = lineHeight * 0.8 * normalizedValue;
            const waveY = Math.sin((halfPointCount + i) * 0.12 + linePhase) * amplitude;
            const pointY = y + waveY;
            if (i === 0) { ctx.moveTo(x, pointY); } else { const prevX = centerX - (i - 1) * pointSpacing; const cpX = (prevX + x) / 2; ctx.quadraticCurveTo(cpX, pointY, x, pointY); }
          }
          ctx.stroke();
          ctx.shadowBlur = 0;

        } else { // Beginning or End
          const pointSpacing = Math.abs(endX - startX) / pointCount;
          ctx.beginPath();
          for (let i = 0; i < pointCount; i++) {
             // ... (calculations for x, pointY) ...
            const x = startX + i * pointSpacing * direction;
            const dataIndex = startFreq + Math.floor((i / pointCount) * (endFreq - startFreq));
            const value = dataArray[dataIndex] * settings.sensitivity;
            const normalizedValue = value / 255;
            const linePhase = phase + (lineIndex * Math.PI / 5);
            const amplitude = lineHeight * 0.8 * normalizedValue;
            const waveY = Math.sin(i * 0.12 + linePhase) * amplitude;
            const pointY = y + waveY;
            if (i === 0) { ctx.moveTo(x, pointY); } else { const prevX = startX + (i - 1) * pointSpacing * direction; const cpX = (prevX + x) / 2; ctx.quadraticCurveTo(cpX, pointY, x, pointY); }
          }
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      }
      
      // Add subtle vertical connecting lines
      ctx.lineWidth = 1;
      for (let i = 0; i < 20; i++) {
        const x = (canvasWidth / 20) * i;
        ctx.beginPath();
        ctx.moveTo(x, lineHeight);
        ctx.lineTo(x, lineHeight * lineCount);
        
        // Set gradient based on rainbow state
        const gradient = ctx.createLinearGradient(0, lineHeight, 0, lineHeight * lineCount);
        for (let j = 0; j < lineCount; j++) {
          let stopColor;
          if (settings.showRainbow) {
             // Increase base speed further
            const hue = (timestamp / 10 * currentRainbowSpeed + j * 10) % 360; // Changed 50 to 10
            stopColor = `hsla(${hue}, 80%, 50%, 0.27)`;
          } else {
            stopColor = formatColorWithOpacity(lineColors[j], 0.27);
          }
          gradient.addColorStop(j / (lineCount - 1), stopColor);
        }
        ctx.strokeStyle = gradient;
        ctx.stroke();
      }
    }
    
    if (settings.verticalOrientation) {
      const lineWidth = canvasWidth / (lineCount + 1);
      const animStart = settings.animationStart[0] || "beginning";
      let startY = 0, endY = canvasHeight, direction = 1;
      if (animStart === "end") { startY = canvasHeight; endY = 0; direction = -1; }
      else if (animStart === "middle") { startY = canvasHeight / 2; endY = canvasHeight; direction = 0; }
      
      // Draw each vertical line
      for (let lineIndex = 0; lineIndex < lineCount; lineIndex++) {
         const baseHue = getCurrentHue(); // Gets CYCLING hue if showRainbow is true
         // Add a slight offset per line for variation
        const offsetHue = baseHue !== null ? (baseHue + lineIndex * 30) % 360 : null; 
        const currentStrokeColor = offsetHue !== null ? `hsla(${offsetHue}, 90%, 60%, 1.0)` : lineColors[lineIndex];
        const currentShadowColor = offsetHue !== null ? currentStrokeColor : lineColors[lineIndex];

        const x = (lineIndex + 1) * lineWidth;
        const [rangeStart, rangeEnd] = ranges[lineIndex];
        const startFreq = Math.floor(bufferLength * rangeStart);
        const endFreq = Math.floor(bufferLength * rangeEnd);
        const pointCount = 100;
        
        ctx.lineWidth = 3;
        ctx.shadowBlur = 5;
        // Set style BEFORE pathing for middle animation start
        ctx.strokeStyle = currentStrokeColor;
        ctx.shadowColor = currentShadowColor;

        if (animStart === "middle") {
          const halfPointCount = Math.floor(pointCount / 2);
          const pointSpacing = (canvasHeight / 2) / halfPointCount;
          const centerY = canvasHeight / 2;
          
          // First half (center to bottom)
          ctx.beginPath();
          for (let i = 0; i <= halfPointCount; i++) {
            const y = centerY + i * pointSpacing;
            const dataIndex = startFreq + Math.floor((i / halfPointCount) * (endFreq - startFreq));
            const value = dataArray[dataIndex] * settings.sensitivity;
            const normalizedValue = value / 255;
            const linePhase = phase + (lineIndex * Math.PI / 5);
            const amplitude = lineWidth * 0.8 * normalizedValue;
            const waveX = Math.sin(i * 0.12 + linePhase) * amplitude;
            const pointX = x + waveX;
            if (i === 0) { ctx.moveTo(pointX, y); } else { const prevY = centerY + (i - 1) * pointSpacing; const cpY = (prevY + y) / 2; ctx.quadraticCurveTo(pointX, cpY, pointX, y); }
          }
          ctx.stroke();
          ctx.shadowBlur = 0; // Reset shadow after first half
          
          // Second half (center to top)
          ctx.shadowBlur = 5; // Re-apply shadow for second half if needed
          ctx.beginPath();
          for (let i = 0; i <= halfPointCount; i++) {
            const y = centerY - i * pointSpacing;
            const dataIndex = startFreq + Math.floor(((halfPointCount + i) / pointCount) * (endFreq - startFreq));
            const value = dataArray[dataIndex] * settings.sensitivity;
            const normalizedValue = value / 255;
            const linePhase = phase + (lineIndex * Math.PI / 5);
            const amplitude = lineWidth * 0.8 * normalizedValue;
            const waveX = Math.sin((halfPointCount + i) * 0.12 + linePhase) * amplitude;
            const pointX = x + waveX;
            if (i === 0) { ctx.moveTo(pointX, y); } else { const prevY = centerY - (i - 1) * pointSpacing; const cpY = (prevY + y) / 2; ctx.quadraticCurveTo(pointX, cpY, pointX, y); }
          }
          ctx.stroke();
          ctx.shadowBlur = 0;
        } else { // Beginning or End
          const pointSpacing = Math.abs(endY - startY) / pointCount;
          ctx.beginPath();
          for (let i = 0; i < pointCount; i++) {
            const y = startY + i * pointSpacing * direction;
            const dataIndex = startFreq + Math.floor((i / pointCount) * (endFreq - startFreq));
            const value = dataArray[dataIndex] * settings.sensitivity;
            const normalizedValue = value / 255;
            const linePhase = phase + (lineIndex * Math.PI / 5);
            const amplitude = lineWidth * 0.8 * normalizedValue;
            const waveX = Math.sin(i * 0.12 + linePhase) * amplitude;
            const pointX = x + waveX;
            if (i === 0) { ctx.moveTo(pointX, y); } else { const prevY = startY + (i - 1) * pointSpacing * direction; const cpY = (prevY + y) / 2; ctx.quadraticCurveTo(pointX, cpY, pointX, y); }
          }
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      }
      
      // Add subtle horizontal connecting lines
      ctx.lineWidth = 1;
      for (let i = 0; i < 20; i++) {
        const y = (canvasHeight / 20) * i;
        ctx.beginPath();
        ctx.moveTo(lineWidth, y);
        ctx.lineTo(lineWidth * lineCount, y);
        
        // Set gradient based on rainbow state
        const gradient = ctx.createLinearGradient(lineWidth, 0, lineWidth * lineCount, 0);
        for (let j = 0; j < lineCount; j++) {
          let stopColor;
          if (settings.showRainbow) {
             // Increase base speed further
            const hue = (timestamp / 10 * currentRainbowSpeed + j * 10) % 360; // Changed 50 to 10
            stopColor = `hsla(${hue}, 80%, 50%, 0.27)`;
          } else {
            stopColor = formatColorWithOpacity(lineColors[j], 0.27);
          }
           gradient.addColorStop(j / (lineCount - 1), stopColor);
        }
        ctx.strokeStyle = gradient;
        ctx.stroke();
      }
    }
  }
};
