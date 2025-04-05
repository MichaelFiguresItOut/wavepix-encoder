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

// *** MODIFIED Signature: Takes frequencyData directly ***
export const renderVisualization = (
  timestamp: number,
  frequencyData: Uint8Array, // Changed from analyser: AnalyserNode
  canvas: HTMLCanvasElement,
  settings: VisualizerSettings,
  rotationAngle: number
): void => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // *** Use frequencyData.length instead of analyser.frequencyBinCount ***
  const bufferLength = frequencyData.length;
  // *** No longer need to call getByteFrequencyData here ***
  // analyser.getByteFrequencyData(dataArray); -> REMOVED

  // Use the passed-in frequencyData directly
  const dataArray = frequencyData;

  // ClearRect might be handled by the specific visualization or background fill
  // ctx.clearRect(0, 0, canvas.width, canvas.height); // Keep if needed, or let background handle

  // Fill background (Optional, might conflict with EncodingPanel background setting)
  // Consider removing this if background is handled before calling renderVisualization
  // ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
  // ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Call the appropriate visualization function based on settings
  // Passing the dataArray and bufferLength directly
  switch(settings.type) {
    case "bars":
      drawBars(ctx, dataArray, canvas, bufferLength, settings);
      break;
    case "wave":
      drawWave(ctx, dataArray, canvas, bufferLength, settings);
      break;
    case "circle":
      drawCircle(ctx, dataArray, canvas, bufferLength, rotationAngle, settings);
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
      // Ensure default case also uses dataArray correctly
      drawBars(ctx, dataArray, canvas, bufferLength, settings);
  }
};