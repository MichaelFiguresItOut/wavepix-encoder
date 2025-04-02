
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
      drawBars(ctx, dataArray, canvas, bufferLength, {
        barWidth: settings.barWidth,
        color: settings.color,
        sensitivity: settings.sensitivity,
        showMirror: settings.showMirror,
        orientation: settings.orientation
      });
      break;
    case "wave":
      drawWave(ctx, dataArray, canvas, bufferLength, {
        color: settings.color,
        sensitivity: settings.sensitivity,
        showMirror: settings.showMirror,
        orientation: settings.orientation
      });
      break;
    case "circle":
      drawCircle(ctx, dataArray, canvas, bufferLength, rotationAngle, {
        color: settings.color,
        sensitivity: settings.sensitivity,
        showMirror: settings.showMirror,
        orientation: settings.orientation
      });
      break;
    case "line":
      drawLineAnimation(ctx, dataArray, canvas, bufferLength, timestamp, {
        color: settings.color,
        sensitivity: settings.sensitivity,
        showMirror: settings.showMirror,
        orientation: settings.orientation
      });
      break;
    case "siri":
      drawSiriAnimation(ctx, dataArray, canvas, bufferLength, timestamp, {
        color: settings.color,
        sensitivity: settings.sensitivity,
        showMirror: settings.showMirror,
        orientation: settings.orientation
      });
      break;
    case "dots":
      drawDotsAnimation(ctx, dataArray, canvas, bufferLength, timestamp, {
        color: settings.color,
        sensitivity: settings.sensitivity,
        showMirror: settings.showMirror,
        orientation: settings.orientation
      });
      break;
    case "formation":
      drawFormationAnimation(ctx, dataArray, canvas, bufferLength, timestamp, {
        color: settings.color,
        sensitivity: settings.sensitivity,
        showMirror: settings.showMirror,
        orientation: settings.orientation
      });
      break;
    case "multiline":
      drawMultilineAnimation(ctx, dataArray, canvas, bufferLength, timestamp, {
        color: settings.color,
        sensitivity: settings.sensitivity,
        showMirror: settings.showMirror,
        orientation: settings.orientation
      });
      break;
    case "stack":
      drawStackAnimation(ctx, dataArray, canvas, bufferLength, timestamp, {
        color: settings.color,
        sensitivity: settings.sensitivity,
        showMirror: settings.showMirror,
        orientation: settings.orientation
      });
      break;
    default:
      drawBars(ctx, dataArray, canvas, bufferLength, {
        barWidth: settings.barWidth,
        color: settings.color,
        sensitivity: settings.sensitivity,
        showMirror: settings.showMirror,
        orientation: settings.orientation
      });
  }
};
