import { drawBars } from './visualizations/bars';
import { drawWave } from './visualizations/wave';
import { drawCircle } from './visualizations/circle';
import { drawLineAnimation } from './visualizations/line';
import { drawSiriAnimation } from './visualizations/siri';
import { drawDotsAnimation } from './visualizations/dots';
import { drawBubblesAnimation } from './visualizations/bubbles';
import { drawFormationAnimation } from './visualizations/formation';
import { drawMultilineAnimation } from './visualizations/multiline';
import { drawLightningAnimation } from './visualizations/lightning';
import { drawHoneycombAnimation } from './visualizations/honeycomb';
import { drawFireAnimation } from './visualizations/fire';
import { drawSpiderWebAnimation } from './visualizations/spiderweb';
import { VisualizerSettings } from '@/hooks/useAudioVisualization';

export const renderVisualization = (
  timestamp: number,
  analyser: AnalyserNode,
  canvas: HTMLCanvasElement,
  settings: VisualizerSettings,
  rotationAngle: number
): void => {
  try {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Check if canvas dimensions are valid
    if (canvas.width <= 0 || canvas.height <= 0) {
      console.warn("Invalid canvas dimensions, cannot render visualization");
      return;
    }
    
    // Get frequency data
    const bufferLength = analyser.frequencyBinCount || 256;
    const dataArray = new Uint8Array(bufferLength);
    
    try {
      analyser.getByteFrequencyData(dataArray);
    } catch (error) {
      console.error("Error getting frequency data:", error);
      // Fill with random data as fallback so we still see something
      for (let i = 0; i < dataArray.length; i++) {
        dataArray[i] = Math.random() * 128;
      }
    }
    
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Reset canvas context properties to ensure consistent rendering
    ctx.globalAlpha = 1.0;
    ctx.globalCompositeOperation = 'source-over';
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#000000';
    ctx.fillStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
    
    // Fill background - Restoring this layer for preview correctness
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Call the appropriate visualization function based on settings
    try {
      switch(settings.type) {
        case "bars":
          drawBars(ctx, dataArray, canvas, bufferLength, settings, timestamp);
          break;
        case "wave":
          drawWave(ctx, dataArray, canvas, bufferLength, settings, timestamp);
          break;
        case "circle":
          drawCircle(ctx, dataArray, canvas, bufferLength, timestamp, settings);
          break;
        case "line":
          drawLineAnimation(ctx, dataArray, canvas, bufferLength, timestamp, settings);
          break;
        case "siri":
          drawSiriAnimation(ctx, dataArray, canvas, bufferLength, timestamp, settings);
          break;
        case "dots":
          drawDotsAnimation(ctx, dataArray, canvas, bufferLength, timestamp, settings);
          break;
        case "bubbles":
          drawBubblesAnimation(ctx, dataArray, canvas, bufferLength, timestamp, settings);
          break;
        case "formation":
          drawFormationAnimation(ctx, dataArray, canvas, bufferLength, timestamp, settings);
          break;
        case "multiline":
          drawMultilineAnimation(ctx, dataArray, canvas, bufferLength, timestamp, settings);
          break;
        case "lightning":
          drawLightningAnimation(ctx, dataArray, canvas, bufferLength, timestamp, settings);
          break;
        case "honeycomb":
          drawHoneycombAnimation(ctx, dataArray, canvas, bufferLength, timestamp, settings);
          break;
        case "fire":
          drawFireAnimation(ctx, dataArray, canvas, bufferLength, timestamp, settings);
          break;
        case "spiderweb":
          drawSpiderWebAnimation(ctx, dataArray, canvas, bufferLength, timestamp, settings);
          break;
        default:
          drawBars(ctx, dataArray, canvas, bufferLength, settings, timestamp);
      }
    } catch (error) {
      console.error(`Error rendering ${settings.type} visualization:`, error);
      
      // Fallback - draw simple bars if the specific visualization fails
      try {
        // Draw a simple bars visualization as fallback
        const barWidth = 5;
        const barCount = Math.min(Math.floor(canvas.width / barWidth), bufferLength);
        
        ctx.fillStyle = settings.color || '#3B82F6';
        for (let i = 0; i < barCount; i++) {
          const barIndex = Math.floor(i * (bufferLength / barCount));
          const barHeight = (dataArray[barIndex] / 255.0) * canvas.height * 0.8;
          ctx.fillRect(
            i * barWidth, 
            canvas.height - barHeight, 
            barWidth - 1, 
            barHeight
          );
        }
      } catch (fallbackError) {
        console.error("Even fallback rendering failed:", fallbackError);
      }
    }
  } catch (outerError) {
    console.error("Critical error in renderVisualization:", outerError);
  }
};
