import { getYPositionForPlacement, getXPositionForPlacement } from './utils';
import { VisualizerSettings } from '@/hooks/useAudioVisualization';

// --- Define Color Helpers at Top Level --- 

// Helper to calculate dynamic hue based on value and timestamp if Rainbow is ON
const getDynamicHue = (value: number, timestamp: number, currentRainbowSpeed: number, settings: VisualizerSettings) => {
  if (settings.showRainbow) {
    const normalizedValue = value / 255;
    let hue = (normalizedValue * 120) + ((timestamp / 50 * currentRainbowSpeed) % 360);
    if (isNaN(hue)) {
      hue = 0;
    }
    return hue;
  }
  return null; 
};

// Get the color string based on hue or default color
const getColorStyle = (hue: number | null, settings: VisualizerSettings, alpha: number = 1.0) => {
  if (hue !== null) {
    return `hsla(${Math.floor(hue)}, 80%, 60%, ${alpha})`;
  }
  const defaultColor = settings.color;
  if (alpha < 1.0) {
    if (defaultColor.startsWith('#') && defaultColor.length === 7) {
      const alphaHex = Math.round(alpha * 255).toString(16).padStart(2, '0');
      return `${defaultColor}${alphaHex}`;
    }
    // Basic fallback
    return `rgba(${parseInt(defaultColor.slice(1, 3), 16)}, ${parseInt(defaultColor.slice(3, 5), 16)}, ${parseInt(defaultColor.slice(5, 7), 16)}, ${alpha})`;
  }
  return defaultColor;
};

// --- Refactored Coordinate Helpers --- 

// Helper to calculate Y coordinate for horizontal wave
const getWaveY = (baseY: number, amplitude: number, placement: string, canvasHeight: number, invertMultiplier: number): number => {
  const invertedAmplitude = amplitude * invertMultiplier;
  if (placement === 'bottom') return baseY - invertedAmplitude; 
  if (placement === 'top') return baseY + invertedAmplitude;
  return baseY - invertedAmplitude; // Middle uses negative amplitude relative to center baseline
};

// Helper to calculate X coordinate for vertical wave
const getWaveX = (baseX: number, amplitude: number, placement: string, canvasWidth: number, invertMultiplier: number): number => {
  const invertedAmplitude = amplitude * invertMultiplier;
  if (placement === 'bottom') return baseX + invertedAmplitude; // Left
  if (placement === 'top') return baseX - invertedAmplitude; // Right
  return baseX + invertedAmplitude; // Middle (relative to center baseline)
};

// Helper to draw a single wave path (horizontal or vertical, main or mirrored)
const drawWavePath = (
  ctx: CanvasRenderingContext2D,
  dataArray: Uint8Array,
  bufferLength: number,
  settings: VisualizerSettings,
  timestamp: number, 
  currentRainbowSpeed: number,
  canvasWidth: number,
  canvasHeight: number,
  orientation: 'horizontal' | 'vertical',
  placement: string,
  startX: number, // Starting coordinate (x for horizontal, y for vertical)
  endX: number,   // Ending coordinate (x for horizontal, y for vertical)
  baseline: number, // Baseline coordinate (y for horizontal, x for vertical)
  direction: number,// Drawing direction (1 or -1)
  isMirror: boolean,
  invertMultiplier: number
) => {
  const length = Math.abs(endX - startX);
  const segmentCount = Math.min(bufferLength, 256); // Limit segments
  const segmentLength = length / segmentCount;

  ctx.beginPath();
  let firstPoint = true;

  for (let i = 0; i <= segmentCount; i++) {
    const dataIndex = Math.min(bufferLength - 1, Math.max(0, Math.floor(i * (bufferLength / segmentCount))));
    const value = dataArray[dataIndex] * settings.sensitivity;
    const normalizedValue = value / 255;
    
    let currentPosCoord: number; // The coordinate being drawn along (x for horizontal, y for vertical)
    let waveCoord: number; // The coordinate affected by amplitude (y for horizontal, x for vertical)
    let amplitude: number;

    // Calculate coordinates based on orientation
    if (orientation === 'horizontal') {
      currentPosCoord = startX + (i * segmentLength * direction);
      amplitude = normalizedValue * canvasHeight * 0.4;
      const yBase = getWaveY(baseline, amplitude, placement, canvasHeight, invertMultiplier);
      waveCoord = isMirror ? (baseline - (yBase - baseline)) : yBase;
    } else { // Vertical
      currentPosCoord = startX + (i * segmentLength * direction); // startX is actually startY here
      amplitude = normalizedValue * canvasWidth * 0.4;
      const xBase = getWaveX(baseline, amplitude, placement, canvasWidth, invertMultiplier); // baseline is baseX here
      waveCoord = isMirror ? (baseline - (xBase - baseline)) : xBase;
    }

    // Draw segment
    if (firstPoint) {
      if (orientation === 'horizontal') ctx.moveTo(currentPosCoord, waveCoord);
      else ctx.moveTo(waveCoord, currentPosCoord);
      firstPoint = false;
    } else {
      // Simple lineTo for now - curve calculation needs careful state management across calls
      if (orientation === 'horizontal') ctx.lineTo(currentPosCoord, waveCoord);
      else ctx.lineTo(waveCoord, currentPosCoord);
      // TODO: Re-implement quadraticCurveTo if visual difference is significant
      // This would require passing previous point info into this function or managing state.
    }
  }

  // Style and stroke the complete path
  const pathHue = getDynamicHue(128, timestamp, currentRainbowSpeed, settings);
  const pathAlpha = isMirror ? 0.4 : 1.0;
  ctx.strokeStyle = getColorStyle(pathHue, settings, pathAlpha);
  ctx.lineWidth = isMirror ? 2 : 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
};

// --- Main Exported Function --- 
export const drawWave = (
  ctx: CanvasRenderingContext2D,
  dataArray: Uint8Array,
  canvas: HTMLCanvasElement,
  bufferLength: number,
  settings: VisualizerSettings,
  timestamp: number
) => {
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  const currentRainbowSpeed = settings.rainbowSpeed || 1.0;
  const invertMultiplier = settings.showInvert ? -1 : 1;

  // Process Horizontal Orientation
  if (settings.horizontalOrientation) {
    settings.barPlacement.forEach(placement => {
      let baseY: number;
      if (placement === 'bottom') { baseY = canvasHeight; }
      else if (placement === 'top') { baseY = 0; }
      else { baseY = canvasHeight / 2; }

      settings.animationStart.forEach(animationStart => {
        let startX: number, endX: number, direction: number;

        if (animationStart === 'beginning') { startX = 0; endX = canvasWidth; direction = 1; }
        else if (animationStart === 'end') { startX = canvasWidth; endX = 0; direction = -1; }
        else { // Middle
          // Draw right half
          drawWavePath(ctx, dataArray, bufferLength, settings, timestamp, currentRainbowSpeed, canvasWidth, canvasHeight, 'horizontal', placement, canvasWidth / 2, canvasWidth, baseY, 1, false, invertMultiplier);
          // Draw left half
          drawWavePath(ctx, dataArray, bufferLength, settings, timestamp, currentRainbowSpeed, canvasWidth, canvasHeight, 'horizontal', placement, canvasWidth / 2, 0, baseY, -1, false, invertMultiplier);
          // Draw mirrors if enabled
          if (settings.showMirror) {
            drawWavePath(ctx, dataArray, bufferLength, settings, timestamp, currentRainbowSpeed, canvasWidth, canvasHeight, 'horizontal', placement, canvasWidth / 2, canvasWidth, baseY, 1, true, invertMultiplier);
            drawWavePath(ctx, dataArray, bufferLength, settings, timestamp, currentRainbowSpeed, canvasWidth, canvasHeight, 'horizontal', placement, canvasWidth / 2, 0, baseY, -1, true, invertMultiplier);
          }
          return; // Handled middle case
        }

        // Draw main wave for beginning/end
        drawWavePath(ctx, dataArray, bufferLength, settings, timestamp, currentRainbowSpeed, canvasWidth, canvasHeight, 'horizontal', placement, startX, endX, baseY, direction, false, invertMultiplier);
        // Draw mirror if enabled
        if (settings.showMirror) {
          drawWavePath(ctx, dataArray, bufferLength, settings, timestamp, currentRainbowSpeed, canvasWidth, canvasHeight, 'horizontal', placement, startX, endX, baseY, direction, true, invertMultiplier);
        }
      });
    });
  }

  // Process Vertical Orientation
  if (settings.verticalOrientation) {
    settings.barPlacement.forEach(placement => {
      let baseX: number;
      if (placement === 'bottom') { baseX = 0; } // Left
      else if (placement === 'top') { baseX = canvasWidth; } // Right
      else { baseX = canvasWidth / 2; } // Middle

      settings.animationStart.forEach(animationStart => {
        let startY: number, endY: number, direction: number;

        if (animationStart === 'beginning') { startY = 0; endY = canvasHeight; direction = 1; } // Top to Bottom
        else if (animationStart === 'end') { startY = canvasHeight; endY = 0; direction = -1; } // Bottom to Top
        else { // Middle
          // Draw bottom half
          drawWavePath(ctx, dataArray, bufferLength, settings, timestamp, currentRainbowSpeed, canvasWidth, canvasHeight, 'vertical', placement, canvasHeight / 2, canvasHeight, baseX, 1, false, invertMultiplier);
          // Draw top half
          drawWavePath(ctx, dataArray, bufferLength, settings, timestamp, currentRainbowSpeed, canvasWidth, canvasHeight, 'vertical', placement, canvasHeight / 2, 0, baseX, -1, false, invertMultiplier);
          // Draw mirrors if enabled
          if (settings.showMirror) {
            drawWavePath(ctx, dataArray, bufferLength, settings, timestamp, currentRainbowSpeed, canvasWidth, canvasHeight, 'vertical', placement, canvasHeight / 2, canvasHeight, baseX, 1, true, invertMultiplier);
            drawWavePath(ctx, dataArray, bufferLength, settings, timestamp, currentRainbowSpeed, canvasWidth, canvasHeight, 'vertical', placement, canvasHeight / 2, 0, baseX, -1, true, invertMultiplier);
          }
          return; // Handled middle case
        }

        // Draw main wave for beginning/end
        drawWavePath(ctx, dataArray, bufferLength, settings, timestamp, currentRainbowSpeed, canvasWidth, canvasHeight, 'vertical', placement, startY, endY, baseX, direction, false, invertMultiplier);
        // Draw mirror if enabled
        if (settings.showMirror) {
          drawWavePath(ctx, dataArray, bufferLength, settings, timestamp, currentRainbowSpeed, canvasWidth, canvasHeight, 'vertical', placement, startY, endY, baseX, direction, true, invertMultiplier);
        }
      });
    });
  }
};
