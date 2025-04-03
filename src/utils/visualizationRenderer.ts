
import { drawBars } from './visualizations/bars';
import { drawWave } from './visualizations/wave';
import { drawCircle } from './visualizations/circle';
import { drawLineAnimation } from './visualizations/line';
import { drawSiriAnimation } from './visualizations/siri';
import { drawDotsAnimation } from './visualizations/dots';
import { drawFormationAnimation } from './visualizations/formation';
import { drawMultilineAnimation } from './visualizations/multiline';
import { drawStackAnimation } from './visualizations/stack';
import { VisualizerSettings } from '@/hooks/useAudioVisualization';

export const renderVisualization = (
  timestamp: number,
  analyser: AnalyserNode,
  canvas: HTMLCanvasElement,
  settings: VisualizerSettings,
  rotationAngle: number
): void => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  
  analyser.getByteFrequencyData(dataArray);
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Fill background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Call the appropriate visualization function based on settings
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
    case "formation":
      drawFormationAnimation(ctx, dataArray, canvas, bufferLength, timestamp, settings);
      break;
    case "multiline":
      drawMultilineAnimation(ctx, dataArray, canvas, bufferLength, timestamp, settings);
      break;
    case "stack":
      drawStackAnimation(ctx, dataArray, canvas, bufferLength, timestamp, settings);
      break;
    default:
      drawBars(ctx, dataArray, canvas, bufferLength, settings);
  }
};
