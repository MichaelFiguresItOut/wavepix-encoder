import { VisualizerSettings } from '@/hooks/useAudioVisualization';
import { formatColorWithOpacity } from './utils';

export const drawSpiderWebAnimation = (
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
      baseHue = (timestamp / 15 * currentRainbowSpeed) % 360; // Keep base cycle speed
      if (isNaN(baseHue)) baseHue = 0;
  }

  // Process each bar placement option
  settings.barPlacement.forEach(placement => {
    // Calculate the center position based on placement
    let centerX, centerY;
    
    if (settings.horizontalOrientation) {
      centerX = canvasWidth / 2;
      if (placement === 'top') {
        centerY = canvasHeight * 0.2; // Near the top
      } else if (placement === 'middle') {
        centerY = canvasHeight / 2; // Middle of the screen
      } else { // bottom
        centerY = canvasHeight * 0.8; // Near the bottom
      }
    } else {
      centerY = canvasHeight / 2;
      if (placement === 'bottom') { // Left in vertical orientation
        centerX = canvasWidth * 0.2; // Near the left
      } else if (placement === 'middle') {
        centerX = canvasWidth / 2; // Middle of the screen
      } else { // top (Right in vertical orientation)
        centerX = canvasWidth * 0.8; // Near the right
      }
    }
    
    // Animation settings
    const time = timestamp / 1000;
    const rotation = (timestamp % 60000) / 60000 * Math.PI * 2 * (settings.rotationSpeed / 2);
    const webSize = Math.min(canvasWidth, canvasHeight) * 0.4; // Base web size
    
    // Get audio data
    const bassData = getAverageFrequency(dataArray, 0, Math.floor(bufferLength * 0.1));
    const midData = getAverageFrequency(dataArray, Math.floor(bufferLength * 0.1), Math.floor(bufferLength * 0.5));
    const trebleData = getAverageFrequency(dataArray, Math.floor(bufferLength * 0.5), bufferLength);
    
    const bassNormalized = bassData / 255 * settings.sensitivity;
    const midNormalized = midData / 255 * settings.sensitivity;
    const trebleNormalized = trebleData / 255 * settings.sensitivity;
    
    // Number of sides in the web (spokes)
    const sides = 8;
    const angle = (Math.PI * 2) / sides;
    
    // Number of rings in the web
    const ringCount = 5;
    
    // Draw the spider web
    settings.animationStart.forEach(animationStart => {
      // Draw the concentric rings
      for (let ring = 1; ring <= ringCount; ring++) {
        const ringProgress = ring / ringCount;
        
        // Calculate ring radius with audio reactivity
        let ringSize;
        if (animationStart === 'beginning') {
          // Rings grow from inside out
          ringSize = webSize * ringProgress * (1 + bassNormalized * 0.3);
        } else if (animationStart === 'end') {
          // Rings grow from outside in
          ringSize = webSize * (1 - ringProgress + 1) * (1 + midNormalized * 0.3);
        } else { // middle
          // Rings pulse from middle based on audio
          const pulseFactor = Math.sin(time * 2 + ring * 0.5) * 0.1 + 0.9;
          ringSize = webSize * ringProgress * pulseFactor * (1 + trebleNormalized * 0.3);
        }
        
        // Determine ring color
        let ringStrokeStyle: string;
        if (baseHue !== null) {
            const ringHue = (baseHue + ring * 20) % 360;
            const ringOpacity = 0.3 - (ring * 0.03);
            ringStrokeStyle = `hsla(${ringHue}, 85%, 65%, ${ringOpacity})`;
        } else {
            ringStrokeStyle = formatColorWithOpacity(settings.color, 0.3 - (ring * 0.03));
        }

        // Draw the ring
        ctx.beginPath();
        for (let i = 0; i <= sides; i++) {
          const pointAngle = angle * i + rotation;
          
          // Add some wobble based on audio
          const wobble = Math.sin(pointAngle * 3 + time * 2) * midNormalized * 10;
          
          const pointX = centerX + (ringSize + wobble) * Math.cos(pointAngle);
          const pointY = centerY + (ringSize + wobble) * Math.sin(pointAngle);
          
          if (i === 0) {
            ctx.moveTo(pointX, pointY);
          } else {
            ctx.lineTo(pointX, pointY);
          }
        }
        ctx.closePath();
        
        ctx.strokeStyle = ringStrokeStyle;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      
      // Draw the spokes (radial lines)
      for (let i = 0; i < sides; i++) {
        const spokeAngle = angle * i + rotation;
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        
        // Calculate end point with audio reactivity
        const spokeFactor = 1 + (bassNormalized * 0.2 + midNormalized * 0.2 + trebleNormalized * 0.2) / 3;
        const spokeLength = webSize * spokeFactor;
        
        const endX = centerX + spokeLength * Math.cos(spokeAngle);
        const endY = centerY + spokeLength * Math.sin(spokeAngle);
        
        ctx.lineTo(endX, endY);
        
        // Determine spoke color
        let spokeStrokeStyle: string;
        if (baseHue !== null) {
            const spokeHue = (baseHue + i * (360 / sides)) % 360;
            spokeStrokeStyle = `hsla(${spokeHue}, 85%, 70%, 0.6)`;
        } else {
            spokeStrokeStyle = formatColorWithOpacity(settings.color, 0.6);
        }

        // Draw spoke
        ctx.strokeStyle = spokeStrokeStyle;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      
      // Draw nodes at intersections with audio reactivity
      for (let ring = 1; ring <= ringCount; ring++) {
        const ringProgress = ring / ringCount;
        
        // Calculate ring radius with audio reactivity
        let ringSize;
        if (animationStart === 'beginning') {
          ringSize = webSize * ringProgress * (1 + bassNormalized * 0.3);
        } else if (animationStart === 'end') {
          ringSize = webSize * (1 - ringProgress + 1) * (1 + midNormalized * 0.3);
        } else {
          const pulseFactor = Math.sin(time * 2 + ring * 0.5) * 0.1 + 0.9;
          ringSize = webSize * ringProgress * pulseFactor * (1 + trebleNormalized * 0.3);
        }
        
        for (let i = 0; i < sides; i++) {
          const nodeAngle = angle * i + rotation;
          
          // Add some wobble based on audio
          const wobble = Math.sin(nodeAngle * 3 + time * 2) * midNormalized * 10;
          
          const nodeX = centerX + (ringSize + wobble) * Math.cos(nodeAngle);
          const nodeY = centerY + (ringSize + wobble) * Math.sin(nodeAngle);
          
          // Calculate node size based on audio intensity
          const audioFactor = getFrequencyValue(dataArray, i, sides, bufferLength) / 255 * settings.sensitivity;
          const nodeSize = 1 + audioFactor * 5;
          
          // Determine node colors
          let nodeFillStyle: string;
          let nodeShadowColor: string;
          if (baseHue !== null) {
              const nodeHue = (baseHue + ring * 15 + i * (360 / sides)) % 360;
              const nodeLightness = 60 + audioFactor * 20;
              nodeFillStyle = `hsla(${nodeHue}, 90%, ${nodeLightness}%, 1.0)`;
              nodeShadowColor = `hsla(${nodeHue}, 90%, 70%, 0.7)`;
          } else {
              nodeFillStyle = settings.color;
              nodeShadowColor = settings.color;
          }

          // Draw the node with glow effect
          ctx.shadowBlur = 10;
          ctx.shadowColor = nodeShadowColor;
          ctx.beginPath();
          ctx.arc(nodeX, nodeY, nodeSize, 0, Math.PI * 2);
          ctx.fillStyle = nodeFillStyle;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
      
      // Draw a spider if there's enough audio intensity
      const overallIntensity = (bassNormalized + midNormalized + trebleNormalized) / 3;
      if (overallIntensity > 0.6) {
        // Spider position changes based on audio
        const spiderAngle = time * (0.5 + overallIntensity) + rotation;
        const spiderRingIndex = Math.floor(overallIntensity * ringCount) % ringCount || 1;
        const spiderRingProgress = spiderRingIndex / ringCount;
        const spiderRadius = webSize * spiderRingProgress * (1 + bassNormalized * 0.2);
        
        const spiderX = centerX + spiderRadius * Math.cos(spiderAngle);
        const spiderY = centerY + spiderRadius * Math.sin(spiderAngle);
        
        // Draw the spider body
        const spiderSize = 3 + overallIntensity * 5;
        
        // Determine spider colors
        let spiderFillStyle: string;
        let spiderStrokeStyle: string;
        if (baseHue !== null) {
            const spiderHue = (baseHue + timestamp / 5) % 360; // Slowly changing hue for spider
            spiderFillStyle = `hsla(${spiderHue}, 80%, 40%, 1.0)`; // Darker body
            spiderStrokeStyle = `hsla(${spiderHue}, 80%, 60%, 1.0)`; // Lighter legs
        } else {
            spiderFillStyle = settings.color; 
            spiderStrokeStyle = settings.color;
        }
        
        // Draw the spider body
        ctx.beginPath();
        ctx.arc(spiderX, spiderY, spiderSize, 0, Math.PI * 2);
        ctx.fillStyle = spiderFillStyle;
        ctx.fill();
        
        // Draw spider legs
        const legCount = 8;
        const legLength = spiderSize * 2;
        
        for (let leg = 0; leg < legCount; leg++) {
          const legAngle = (leg / legCount) * Math.PI * 2 + time * 2;
          
          ctx.beginPath();
          ctx.moveTo(spiderX, spiderY);
          
          // Legs are more dynamic when audio is more intense
          const legX = spiderX + legLength * Math.cos(legAngle) * (1 + Math.sin(time * 4) * 0.2 * overallIntensity);
          const legY = spiderY + legLength * Math.sin(legAngle) * (1 + Math.cos(time * 4) * 0.2 * overallIntensity);
          
          // Create a bent leg with a control point
          const cpDistance = legLength * 0.6;
          const cpAngle = legAngle + Math.sin(time * 3 + leg) * 0.5;
          const cpX = spiderX + cpDistance * Math.cos(cpAngle);
          const cpY = spiderY + cpDistance * Math.sin(cpAngle);
          
          ctx.quadraticCurveTo(cpX, cpY, legX, legY);
          
          ctx.strokeStyle = spiderStrokeStyle;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    });
  });
};

// Helper function to get average frequency in a range
function getAverageFrequency(dataArray: Uint8Array, start: number, end: number): number {
  let sum = 0;
  const count = end - start;
  
  if (count <= 0) return 0;
  
  for (let i = start; i < end; i++) {
    sum += dataArray[i];
  }
  
  return sum / count;
}

// Helper function to get frequency value at a specific index
function getFrequencyValue(dataArray: Uint8Array, index: number, totalPoints: number, bufferLength: number): number {
  const dataIndex = Math.floor((index / totalPoints) * bufferLength);
  return dataArray[dataIndex] || 0;
} 