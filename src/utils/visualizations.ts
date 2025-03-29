
// Utility functions for different audio visualizations

export interface VisualizationPoint {
  x: number;
  y: number;
}

// Helper function to calculate average frequency in a range
export const getAverageFrequency = (dataArray: Uint8Array, start: number, end: number): number => {
  let sum = 0;
  const startIndex = Math.floor(start);
  const endIndex = Math.floor(end);
  
  for (let i = startIndex; i < endIndex; i++) {
    sum += dataArray[i];
  }
  
  return sum / (endIndex - startIndex) / 255;
};

export const drawBars = (
  ctx: CanvasRenderingContext2D,
  dataArray: Uint8Array,
  canvas: HTMLCanvasElement,
  bufferLength: number,
  settings: {
    barWidth: number;
    color: string;
    sensitivity: number;
    showMirror: boolean;
  }
) => {
  const barWidth = settings.barWidth;
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  
  const totalBars = Math.min(Math.floor(canvasWidth / (barWidth + 1)), bufferLength);
  const barSpacing = 1;
  
  // Use full canvas space
  const maxBarHeight = canvasHeight * 0.9;
  
  for (let i = 0; i < totalBars; i++) {
    const index = Math.floor(i * (bufferLength / totalBars));
    const value = dataArray[index] * settings.sensitivity;
    const barHeight = (value / 255) * maxBarHeight;
    
    const x = i * (barWidth + barSpacing);
    const y = canvasHeight - barHeight;
    
    // Create gradient for each bar
    const gradient = ctx.createLinearGradient(x, canvasHeight, x, y);
    gradient.addColorStop(0, `${settings.color}FF`);
    gradient.addColorStop(1, `${settings.color}22`);
    
    ctx.fillStyle = gradient;
    
    // Rounded top for bars
    const radius = barWidth / 2;
    ctx.beginPath();
    ctx.moveTo(x, canvasHeight);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.lineTo(x + barWidth - radius, y);
    ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
    ctx.lineTo(x + barWidth, canvasHeight);
    ctx.fill();
    
    // Draw mirrored bars if enabled
    if (settings.showMirror) {
      ctx.fillStyle = `${settings.color}66`;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, barHeight - radius);
      ctx.quadraticCurveTo(x, barHeight, x + radius, barHeight);
      ctx.lineTo(x + barWidth - radius, barHeight);
      ctx.quadraticCurveTo(x + barWidth, barHeight, x + barWidth, barHeight - radius);
      ctx.lineTo(x + barWidth, 0);
      ctx.fill();
    }
  }
};

export const drawWave = (
  ctx: CanvasRenderingContext2D,
  dataArray: Uint8Array,
  canvas: HTMLCanvasElement,
  bufferLength: number,
  settings: {
    color: string;
    sensitivity: number;
    showMirror: boolean;
  }
) => {
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  
  // Draw a more prominent wave
  ctx.strokeStyle = settings.color;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  ctx.beginPath();
  
  const sliceWidth = canvasWidth / bufferLength;
  let x = 0;
  
  for (let i = 0; i < bufferLength; i++) {
    const value = dataArray[i] * settings.sensitivity;
    const y = (value / 255) * canvasHeight * 0.8;
    
    if (i === 0) {
      ctx.moveTo(x, canvasHeight - y);
    } else {
      ctx.lineTo(x, canvasHeight - y);
    }
    
    x += sliceWidth;
  }
  
  ctx.stroke();
  
  // Add glow effect
  ctx.shadowBlur = 15;
  ctx.shadowColor = settings.color;
  ctx.stroke();
  ctx.shadowBlur = 0;
  
  // Draw mirrored wave if enabled
  if (settings.showMirror) {
    ctx.strokeStyle = `${settings.color}66`;
    ctx.beginPath();
    x = 0;
    
    for (let i = 0; i < bufferLength; i++) {
      const value = dataArray[i] * settings.sensitivity;
      const y = (value / 255) * canvasHeight * 0.8;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      
      x += sliceWidth;
    }
    
    ctx.stroke();
  }
};

export const drawCircle = (
  ctx: CanvasRenderingContext2D,
  dataArray: Uint8Array,
  canvas: HTMLCanvasElement,
  bufferLength: number,
  rotationAngle: number,
  settings: {
    color: string;
    sensitivity: number;
  }
) => {
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;
  
  // Use most of the canvas
  const radius = Math.min(centerX, centerY) * 0.8;
  
  // Center point
  ctx.beginPath();
  ctx.arc(centerX, centerY, 5, 0, 2 * Math.PI);
  ctx.fillStyle = settings.color;
  ctx.fill();
  
  // Draw circular visualizer with rotation
  for (let i = 0; i < bufferLength; i++) {
    const angle = (i / bufferLength) * 2 * Math.PI + rotationAngle;
    const value = dataArray[i] * settings.sensitivity;
    const barHeight = (value / 255) * radius * 0.5;
    
    const innerX = centerX + Math.cos(angle) * radius;
    const innerY = centerY + Math.sin(angle) * radius;
    
    const outerX = centerX + Math.cos(angle) * (radius + barHeight);
    const outerY = centerY + Math.sin(angle) * (radius + barHeight);
    
    // Draw line with gradient
    const gradient = ctx.createLinearGradient(innerX, innerY, outerX, outerY);
    gradient.addColorStop(0, `${settings.color}33`);
    gradient.addColorStop(1, `${settings.color}FF`);
    
    ctx.beginPath();
    ctx.moveTo(innerX, innerY);
    ctx.lineTo(outerX, outerY);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();
    
    // Add connecting arc between points for a more fluid look
    if (i > 0) {
      const prevAngle = ((i - 1) / bufferLength) * 2 * Math.PI + rotationAngle;
      const prevValue = dataArray[i - 1] * settings.sensitivity;
      const prevBarHeight = (prevValue / 255) * radius * 0.5;
      
      const prevOuterX = centerX + Math.cos(prevAngle) * (radius + prevBarHeight);
      const prevOuterY = centerY + Math.sin(prevAngle) * (radius + prevBarHeight);
      
      ctx.beginPath();
      ctx.moveTo(prevOuterX, prevOuterY);
      ctx.lineTo(outerX, outerY);
      ctx.strokeStyle = `${settings.color}44`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  
  // Draw connecting circle
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
  ctx.strokeStyle = `${settings.color}44`;
  ctx.lineWidth = 1;
  ctx.stroke();
};

export const drawLineAnimation = (
  ctx: CanvasRenderingContext2D,
  dataArray: Uint8Array,
  canvas: HTMLCanvasElement,
  bufferLength: number,
  timestamp: number,
  settings: {
    color: string;
    sensitivity: number;
  }
) => {
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  
  // Draw a single animated line in the center that reacts to music
  const centerY = canvasHeight / 2;
  const amplitude = canvasHeight * 0.4;
  
  ctx.strokeStyle = settings.color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  
  const sliceWidth = canvasWidth / (bufferLength / 4);
  
  // Animation phase based on time
  const phase = (timestamp % 10000) / 10000 * Math.PI * 2;
  
  for (let i = 0; i < bufferLength / 4; i++) {
    const value = dataArray[i] * settings.sensitivity;
    const normalizedValue = value / 255;
    
    // Calculate y position based on frequency data and phase
    const x = i * sliceWidth;
    const y = centerY + Math.sin(i * 0.2 + phase) * amplitude * normalizedValue;
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.bezierCurveTo(
        x - sliceWidth / 2, 
        centerY + Math.sin((i - 0.5) * 0.2 + phase) * amplitude * (normalizedValue + dataArray[i-1]/255*settings.sensitivity)/2,
        x - sliceWidth / 2, 
        y,
        x, 
        y
      );
    }
  }
  
  // Add glow effect
  ctx.shadowBlur = 15;
  ctx.shadowColor = settings.color;
  ctx.stroke();
  ctx.shadowBlur = 0;
  
  // Add subtle echo effect
  for (let echo = 1; echo <= 3; echo++) {
    ctx.strokeStyle = `${settings.color}${Math.floor(30 - echo * 10).toString(16)}`;
    ctx.lineWidth = 2 - echo * 0.5;
    ctx.beginPath();
    
    const echoPhase = phase - echo * 0.5;
    
    for (let i = 0; i < bufferLength / 4; i++) {
      const value = dataArray[i] * settings.sensitivity;
      const normalizedValue = value / 255;
      
      const x = i * sliceWidth;
      const y = centerY + Math.sin(i * 0.2 + echoPhase) * amplitude * normalizedValue * 0.8;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.bezierCurveTo(
          x - sliceWidth / 2, 
          centerY + Math.sin((i - 0.5) * 0.2 + echoPhase) * amplitude * (normalizedValue + dataArray[i-1]/255*settings.sensitivity)/2 * 0.8,
          x - sliceWidth / 2, 
          y,
          x, 
          y
        );
      }
    }
    
    ctx.stroke();
  }
};

export const drawSiriAnimation = (
  ctx: CanvasRenderingContext2D,
  dataArray: Uint8Array,
  canvas: HTMLCanvasElement,
  bufferLength: number,
  timestamp: number,
  settings: {
    color: string;
    sensitivity: number;
  }
) => {
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
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
  const sliceWidth = canvasWidth / usableLength;
  
  // Time-based phase shift
  const basePhase = (timestamp % 5000) / 5000 * Math.PI * 2;
  
  // Draw multiple waves with phase offset
  for (let wave = 0; wave < waveCount; wave++) {
    const wavePhase = basePhase + (wave * Math.PI * 0.5);
    const waveAmplitude = canvasHeight * 0.15 * (1 - wave * 0.2);
    
    ctx.strokeStyle = waveColors[wave];
    ctx.lineWidth = 5 - wave;
    ctx.beginPath();
    
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
    
    // Add glow effect
    ctx.shadowBlur = 10;
    ctx.shadowColor = waveColors[wave];
    ctx.stroke();
    ctx.shadowBlur = 0;
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

export const drawDotsAnimation = (
  ctx: CanvasRenderingContext2D,
  dataArray: Uint8Array,
  canvas: HTMLCanvasElement,
  bufferLength: number,
  timestamp: number,
  settings: {
    color: string;
    sensitivity: number;
  }
) => {
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  const centerY = canvasHeight / 2;
  
  // Calculate how many dots to render
  const dotCount = Math.min(bufferLength, 100);
  const dotSpacing = canvasWidth / (dotCount - 1);
  
  // Animation phase
  const phase = (timestamp % 8000) / 8000 * Math.PI * 2;
  
  // Draw connecting line first (behind dots)
  ctx.beginPath();
  for (let i = 0; i < dotCount; i++) {
    const x = i * dotSpacing;
    const dataIndex = Math.floor(i * (bufferLength / dotCount));
    const value = dataArray[dataIndex] * settings.sensitivity;
    const normalizedValue = value / 255;
    
    // Calculate dot position with subtle wave motion
    const waveY = Math.sin(i * 0.15 + phase) * 20;
    const y = centerY - (normalizedValue * canvasHeight * 0.4) + waveY;
    
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
    const x = i * dotSpacing;
    const dataIndex = Math.floor(i * (bufferLength / dotCount));
    const value = dataArray[dataIndex] * settings.sensitivity;
    const normalizedValue = value / 255;
    
    // Calculate dot position with subtle wave motion
    const waveY = Math.sin(i * 0.15 + phase) * 20;
    const y = centerY - (normalizedValue * canvasHeight * 0.4) + waveY;
    
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
};

export const drawFormationAnimation = (
  ctx: CanvasRenderingContext2D,
  dataArray: Uint8Array,
  canvas: HTMLCanvasElement,
  bufferLength: number,
  timestamp: number,
  settings: {
    color: string;
    sensitivity: number;
  }
) => {
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;
  
  // Form a geometric pattern that transforms with music
  const time = (timestamp % 10000) / 10000;
  const particles = 12;
  const radius = Math.min(canvasWidth, canvasHeight) * 0.35;
  
  // Split the frequency data into ranges for different effects
  const bassLevel = getAverageFrequency(dataArray, 0, bufferLength * 0.1);
  const midLevel = getAverageFrequency(dataArray, bufferLength * 0.1, bufferLength * 0.5);
  const highLevel = getAverageFrequency(dataArray, bufferLength * 0.5, bufferLength);
  
  // Morph between shapes based on frequency ranges
  const morphValue = 0.5 + bassLevel * 0.5; // 0.5-1.0 range
  
  // Draw the shape
  ctx.lineWidth = 2;
  ctx.strokeStyle = settings.color;
  
  // Dynamic inner radius based on mid frequencies
  const innerRadius = radius * 0.3 * (1 + midLevel * 0.7);
  
  // Draw outer connecting shape
  ctx.beginPath();
  for (let i = 0; i <= particles; i++) {
    // Base angle for shape
    const angle = (i / particles) * Math.PI * 2;
    
    // Add frequency-based distortion to angle
    const distortedAngle = angle + Math.sin(time * Math.PI * 2) * 0.2 * highLevel;
    
    // Calculate vertex position
    const x = centerX + Math.cos(distortedAngle) * radius * (1 + bassLevel * 0.2);
    const y = centerY + Math.sin(distortedAngle) * radius * (1 + bassLevel * 0.2);
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      // Use Bezier curves for organic look
      const prevAngle = ((i - 1) / particles) * Math.PI * 2;
      const distortedPrevAngle = prevAngle + Math.sin(time * Math.PI * 2) * 0.2 * highLevel;
      
      const prevX = centerX + Math.cos(distortedPrevAngle) * radius * (1 + bassLevel * 0.2);
      const prevY = centerY + Math.sin(distortedPrevAngle) * radius * (1 + bassLevel * 0.2);
      
      // Control points
      const cpX1 = prevX + (x - prevX) * morphValue;
      const cpY1 = prevY + (y - prevY) * (1 - morphValue);
      
      ctx.bezierCurveTo(cpX1, cpY1, cpX1, cpY1, x, y);
    }
  }
  ctx.closePath();
  
  // Add glow based on high frequencies
  ctx.shadowBlur = 15 * highLevel;
  ctx.shadowColor = settings.color;
  ctx.stroke();
  ctx.shadowBlur = 0;
  
  // Draw inner shape responding to mid frequencies
  ctx.beginPath();
  for (let i = 0; i <= particles; i++) {
    const angle = (i / particles) * Math.PI * 2;
    // Reverse rotation for inner shape
    const innerAngle = angle - time * Math.PI * 4;
    
    const x = centerX + Math.cos(innerAngle) * innerRadius;
    const y = centerY + Math.sin(innerAngle) * innerRadius;
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
  
  // Fill inner shape with gradient
  const gradient = ctx.createRadialGradient(
    centerX, centerY, 0,
    centerX, centerY, innerRadius
  );
  gradient.addColorStop(0, `${settings.color}99`);
  gradient.addColorStop(1, `${settings.color}11`);
  
  ctx.fillStyle = gradient;
  ctx.fill();
  
  // Add connecting lines between inner and outer shapes
  ctx.strokeStyle = `${settings.color}44`;
  ctx.lineWidth = 1;
  
  for (let i = 0; i < particles; i++) {
    const angle = (i / particles) * Math.PI * 2;
    
    // Outer point
    const distortedAngle = angle + Math.sin(time * Math.PI * 2) * 0.2 * highLevel;
    const outerX = centerX + Math.cos(distortedAngle) * radius * (1 + bassLevel * 0.2);
    const outerY = centerY + Math.sin(distortedAngle) * radius * (1 + bassLevel * 0.2);
    
    // Inner point
    const innerAngle = angle - time * Math.PI * 4;
    const innerX = centerX + Math.cos(innerAngle) * innerRadius;
    const innerY = centerY + Math.sin(innerAngle) * innerRadius;
    
    ctx.beginPath();
    ctx.moveTo(outerX, outerY);
    ctx.lineTo(innerX, innerY);
    ctx.stroke();
  }
};

export const drawMultilineAnimation = (
  ctx: CanvasRenderingContext2D,
  dataArray: Uint8Array,
  canvas: HTMLCanvasElement,
  bufferLength: number,
  timestamp: number,
  settings: {
    color: string;
    sensitivity: number;
  }
) => {
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  
  // Multiple parallel lines with different heights
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
  const baseColor = settings.color.slice(1); // Remove # from hex
  const r = parseInt(baseColor.slice(0, 2), 16);
  const g = parseInt(baseColor.slice(2, 4), 16);
  const b = parseInt(baseColor.slice(4, 6), 16);
  
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
      gradient.addColorStop(j / (lineCount - 1), `${lineColors[j]}44`);
    }
    
    ctx.strokeStyle = gradient;
    ctx.stroke();
  }
};

export const drawStackAnimation = (
  ctx: CanvasRenderingContext2D,
  dataArray: Uint8Array,
  canvas: HTMLCanvasElement,
  bufferLength: number,
  timestamp: number,
  settings: {
    color: string;
    sensitivity: number;
  }
) => {
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  
  // Stacked layers that move with the audio
  const layerCount = 10;
  const layerHeight = canvasHeight / layerCount;
  
  // Create color gradient across layers
  const baseColor = settings.color.slice(1); // Remove # from hex
  const r = parseInt(baseColor.slice(0, 2), 16);
  const g = parseInt(baseColor.slice(2, 4), 16);
  const b = parseInt(baseColor.slice(4, 6), 16);
  
  // Draw from bottom to top
  for (let layer = 0; layer < layerCount; layer++) {
    // Each layer gets data from different frequency range
    const startFreq = Math.floor((layer / layerCount) * bufferLength * 0.8);
    const endFreq = Math.floor(((layer + 1) / layerCount) * bufferLength * 0.8);
    
    // Get average value for this frequency range
    let sum = 0;
    for (let i = startFreq; i < endFreq; i++) {
      sum += dataArray[i];
    }
    const avgValue = sum / (endFreq - startFreq) * settings.sensitivity;
    const normalizedValue = avgValue / 255;
    
    // Layer base position
    const y = canvasHeight - (layer + 1) * layerHeight;
    
    // Calculate layer color (gradient from base color to lighter shade)
    const layerShade = layer / layerCount;
    const layerR = Math.min(r + Math.floor((255 - r) * layerShade * 0.7), 255);
    const layerG = Math.min(g + Math.floor((255 - g) * layerShade * 0.7), 255);
    const layerB = Math.min(b + Math.floor((255 - b) * layerShade * 0.7), 255);
    const layerColor = `rgb(${layerR}, ${layerG}, ${layerB})`;
    
    // Create points for this layer
    const points: VisualizationPoint[] = [];
    const pointCount = 20;
    
    // Animation speed increases with layer index
    const layerPhase = (timestamp % 10000) / 10000 * Math.PI * 2;
    const layerSpeed = 1 + (layer / layerCount) * 2;
    
    // Start with bottom edge
    points.push({ x: 0, y: canvasHeight });
    
    // Add curved points across the layer
    for (let i = 0; i <= pointCount; i++) {
      const x = canvasWidth * (i / pointCount);
      
      // Base y-position for this point
      const baseY = y;
      
      // Add wave motion with phase offset, amplitude based on audio
      const waveHeight = layerHeight * 2 * normalizedValue;
      const waveY = Math.sin(i * 0.4 + layerPhase * layerSpeed) * waveHeight;
      
      points.push({ x, y: baseY + waveY });
    }
    
    // End with bottom right corner
    points.push({ x: canvasWidth, y: canvasHeight });
    
    // Draw the layer shape
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    
    // Draw curves between points
    for (let i = 1; i < points.length - 2; i++) {
      const cp1 = {
        x: (points[i].x + points[i+1].x) / 2,
        y: points[i].y
      };
      const cp2 = {
        x: (points[i].x + points[i+1].x) / 2,
        y: points[i+1].y
      };
      
      ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, points[i+1].x, points[i+1].y);
    }
    
    ctx.lineTo(points[points.length-1].x, points[points.length-1].y);
    
    // Fill with gradient
    const gradient = ctx.createLinearGradient(0, y, 0, canvasHeight);
    gradient.addColorStop(0, `${layerColor}99`);
    gradient.addColorStop(1, `${layerColor}33`);
    
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Add subtle highlight to top edge
    ctx.beginPath();
    ctx.moveTo(points[1].x, points[1].y);
    
    for (let i = 1; i < points.length - 2; i++) {
      const cp1 = {
        x: (points[i].x + points[i+1].x) / 2,
        y: points[i].y
      };
      const cp2 = {
        x: (points[i].x + points[i+1].x) / 2,
        y: points[i+1].y
      };
      
      ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, points[i+1].x, points[i+1].y);
    }
    
    ctx.strokeStyle = `${layerColor}CC`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
};
