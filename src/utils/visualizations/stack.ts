
import { VisualizationSettings, formatColorWithOpacity, VisualizationPoint } from './utils';

export const drawStackAnimation = (
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
  
  if (!settings.showMirror) {
    // Original stack animation that builds from bottom
    const layerCount = 10;
    const layerHeight = canvasHeight / layerCount;
    
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
      gradient.addColorStop(0, formatColorWithOpacity(layerColor, 0.6));
      gradient.addColorStop(1, formatColorWithOpacity(layerColor, 0.2));
      
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
      
      ctx.strokeStyle = formatColorWithOpacity(layerColor, 0.8);
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  } else {
    // Mirror mode: radial stack emanating from center
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    
    // Animation phase
    const phase = (timestamp % 10000) / 10000 * Math.PI * 2;
    
    // Number of rings
    const ringCount = 8;
    
    // Draw rings from innermost to outermost
    for (let ring = 0; ring < ringCount; ring++) {
      // Sample data from frequency range for this ring
      const startFreq = Math.floor((ring / ringCount) * bufferLength * 0.8);
      const endFreq = Math.floor(((ring + 1) / ringCount) * bufferLength * 0.8);
      
      // Get average value for this frequency range
      let sum = 0;
      for (let i = startFreq; i < endFreq; i++) {
        sum += dataArray[i];
      }
      const avgValue = (sum / (endFreq - startFreq)) * settings.sensitivity;
      const normalizedValue = avgValue / 255;
      
      // Ring properties
      const baseRadius = 20 + (ring * 30); // Increasing radius for each ring
      const ringPhase = phase + (ring * Math.PI / 4); // Phase offset for each ring
      
      // Calculate ring color (gradient from base color to lighter shade)
      const ringProgress = ring / ringCount;
      const ringR = Math.min(r + Math.floor((255 - r) * ringProgress * 0.7), 255);
      const ringG = Math.min(g + Math.floor((255 - g) * ringProgress * 0.7), 255);
      const ringB = Math.min(b + Math.floor((255 - b) * ringProgress * 0.7), 255);
      const ringColor = `rgb(${ringR}, ${ringG}, ${ringB})`;
      
      // Points to define the ring shape
      const points: VisualizationPoint[] = [];
      const pointCount = 40;
      
      // Create distorted ring shape
      for (let i = 0; i <= pointCount; i++) {
        const angle = (i / pointCount) * Math.PI * 2;
        
        // Base radius with audio-reactive distortion
        const distortionAmount = 10 + (normalizedValue * 40);
        const distortion = Math.sin(angle * 6 + ringPhase) * distortionAmount;
        
        const radius = baseRadius + distortion;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        
        points.push({ x, y });
      }
      
      // Draw the ring
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      
      // Draw smooth curves connecting the points
      for (let i = 1; i < points.length; i++) {
        const prevPoint = points[i-1];
        const currentPoint = points[i];
        
        // Control points for smooth curves
        const cpX = (prevPoint.x + currentPoint.x) / 2;
        const cpY = (prevPoint.y + currentPoint.y) / 2;
        
        ctx.quadraticCurveTo(cpX, cpY, currentPoint.x, currentPoint.y);
      }
      
      ctx.closePath();
      
      // Fill ring with gradient
      const gradient = ctx.createRadialGradient(
        centerX, centerY, baseRadius * 0.8,
        centerX, centerY, baseRadius * 1.2
      );
      
      gradient.addColorStop(0, formatColorWithOpacity(ringColor, 0.7 - (ringProgress * 0.4)));
      gradient.addColorStop(1, formatColorWithOpacity(ringColor, 0.1));
      
      ctx.fillStyle = gradient;
      ctx.fill();
      
      // Add highlight to edge
      ctx.strokeStyle = formatColorWithOpacity(ringColor, 0.8 - (ringProgress * 0.4));
      ctx.lineWidth = 2 - ringProgress;
      ctx.stroke();
    }
  }
};
