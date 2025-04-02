
import { VisualizationSettings, getAverageFrequency, formatColorWithOpacity } from './utils';

export const drawFormationAnimation = (
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
  const centerY = canvasHeight / 2;
  
  // Form a geometric pattern that transforms with music
  const time = (timestamp % 10000) / 10000;
  
  // Split the frequency data into ranges for different effects
  const bassLevel = getAverageFrequency(dataArray, 0, bufferLength * 0.1);
  const midLevel = getAverageFrequency(dataArray, bufferLength * 0.1, bufferLength * 0.5);
  const highLevel = getAverageFrequency(dataArray, bufferLength * 0.5, bufferLength);
  
  if (!settings.showMirror) {
    // Original formation with one inner and one outer shape
    const particles = 12;
    const radius = Math.min(canvasWidth, canvasHeight) * 0.35;
    
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
  } else {
    // Mirrored formation with multiple concentric shapes
    const rings = 4;
    const particles = 16;
    
    // Draw multiple rings emanating from center
    for (let ring = 0; ring < rings; ring++) {
      const ringProgress = ring / (rings - 1);
      const baseRadius = 30 + (ring * 60);
      
      // Calculate ring-specific distortion
      const ringDistortion = 0.3 * (1 - ringProgress);
      const distortionFactor = bassLevel * 0.5 + midLevel * 0.3 + highLevel * 0.2;
      
      // Rotate each ring differently
      const ringAngleOffset = time * Math.PI * 2 * (ring % 2 === 0 ? 1 : -1);
      
      ctx.beginPath();
      for (let i = 0; i <= particles; i++) {
        const angle = (i / particles) * Math.PI * 2 + ringAngleOffset;
        
        // Calculate distortion based on audio data
        const distortion = Math.sin(angle * 3 + time * Math.PI * 4) * ringDistortion * distortionFactor * baseRadius;
        
        // Calculate point position
        const radius = baseRadius + distortion;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          // For smoother shapes
          const prevIndex = i - 1;
          const prevAngle = (prevIndex / particles) * Math.PI * 2 + ringAngleOffset;
          const prevDistortion = Math.sin(prevAngle * 3 + time * Math.PI * 4) * ringDistortion * distortionFactor * baseRadius;
          const prevRadius = baseRadius + prevDistortion;
          const prevX = centerX + Math.cos(prevAngle) * prevRadius;
          const prevY = centerY + Math.sin(prevAngle) * prevRadius;
          
          const cpX = (prevX + x) / 2 + Math.cos(angle + Math.PI/2) * 20 * distortionFactor;
          const cpY = (prevY + y) / 2 + Math.sin(angle + Math.PI/2) * 20 * distortionFactor;
          
          ctx.quadraticCurveTo(cpX, cpY, x, y);
        }
      }
      ctx.closePath();
      
      // Different opacity for each ring
      const opacity = 0.7 - (ringProgress * 0.5);
      ctx.strokeStyle = formatColorWithOpacity(settings.color, opacity);
      ctx.lineWidth = 2;
      
      // Glow increases with audio intensity
      ctx.shadowBlur = 10 * distortionFactor;
      ctx.shadowColor = settings.color;
      ctx.stroke();
      ctx.shadowBlur = 0;
      
      // Fill with gradient
      const gradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, baseRadius
      );
      gradient.addColorStop(0, formatColorWithOpacity(settings.color, 0.1));
      gradient.addColorStop(1, formatColorWithOpacity(settings.color, 0.01));
      
      ctx.fillStyle = gradient;
      ctx.fill();
    }
  }
};
