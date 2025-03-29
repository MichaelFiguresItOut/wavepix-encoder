
import {
  drawBars,
  drawWave,
  drawCircle,
  drawLineAnimation,
  drawSiriAnimation,
  drawDotsAnimation,
  drawFormationAnimation,
  drawMultilineAnimation,
  drawStackAnimation
} from './visualizations';
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
      drawBars(ctx, dataArray, canvas, bufferLength, {
        barWidth: settings.barWidth,
        color: settings.color,
        sensitivity: settings.sensitivity,
        showMirror: settings.showMirror
      });
      break;
    case "wave":
      drawWave(ctx, dataArray, canvas, bufferLength, {
        color: settings.color,
        sensitivity: settings.sensitivity,
        showMirror: settings.showMirror
      });
      break;
    case "circle":
      drawCircle(ctx, dataArray, canvas, bufferLength, rotationAngle, {
        color: settings.color,
        sensitivity: settings.sensitivity
      });
      break;
    case "line":
      drawLineAnimation(ctx, dataArray, canvas, bufferLength, timestamp, {
        color: settings.color,
        sensitivity: settings.sensitivity
      });
      break;
    case "siri":
      drawSiriAnimation(ctx, dataArray, canvas, bufferLength, timestamp, {
        color: settings.color,
        sensitivity: settings.sensitivity
      });
      break;
    case "dots":
      drawDotsAnimation(ctx, dataArray, canvas, bufferLength, timestamp, {
        color: settings.color,
        sensitivity: settings.sensitivity
      });
      break;
    case "formation":
      drawFormationAnimation(ctx, dataArray, canvas, bufferLength, timestamp, {
        color: settings.color,
        sensitivity: settings.sensitivity
      });
      break;
    case "multiline":
      drawMultilineAnimation(ctx, dataArray, canvas, bufferLength, timestamp, {
        color: settings.color,
        sensitivity: settings.sensitivity
      });
      break;
    case "stack":
      drawStackAnimation(ctx, dataArray, canvas, bufferLength, timestamp, {
        color: settings.color,
        sensitivity: settings.sensitivity
      });
      break;
    default:
      drawBars(ctx, dataArray, canvas, bufferLength, {
        barWidth: settings.barWidth,
        color: settings.color,
        sensitivity: settings.sensitivity,
        showMirror: settings.showMirror
      });
  }
};
