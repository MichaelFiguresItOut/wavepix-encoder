// Shared utility functions for visualizations

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

// Helper function to properly format colors with opacity
export const formatColorWithOpacity = (color: string, opacity: number): string => {
  // If the color is already a hex value with #
  if (color.startsWith('#')) {
    // Convert hex to rgb
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  
  // If the color is already in rgb format
  if (color.startsWith('rgb(')) {
    // Extract rgb values
    const rgbValues = color.match(/\d+/g);
    if (rgbValues && rgbValues.length >= 3) {
      return `rgba(${rgbValues[0]}, ${rgbValues[1]}, ${rgbValues[2]}, ${opacity})`;
    }
  }
  
  // If the color is already in rgba format, just return it
  if (color.startsWith('rgba(')) {
    return color;
  }
  
  // Default fallback
  return `rgba(0, 0, 0, ${opacity})`;
};

// Calculate Y position based on bar placement
export const getYPositionForPlacement = (canvasHeight: number, placement: string, barHeight: number) => {
  switch (placement) {
    case 'top':
      return 0;
    case 'middle':
      return (canvasHeight - barHeight) / 2;
    case 'bottom':
    default:
      return canvasHeight - barHeight;
  }
};

// Calculate X position based on bar placement for vertical orientation
export const getXPositionForPlacement = (canvasWidth: number, placement: string, barWidth: number) => {
  switch (placement) {
    case 'top': // Right side in vertical mode
      return canvasWidth - barWidth;
    case 'middle':
      return (canvasWidth - barWidth) / 2;
    case 'bottom': // Left side in vertical mode
    default:
      return 0;
  }
};

// Get animation starting position based on settings
export const getAnimationStartPosition = (canvasWidth: number, animationStart: string) => {
  switch (animationStart) {
    case 'beginning':
      return 0;
    case 'middle':
      return canvasWidth / 2;
    case 'end':
      return canvasWidth;
    default:
      return 0;
  }
};

// Get horizontal drawing direction based on animation start
export const getHorizontalDirection = (animationStart: string) => {
  switch (animationStart) {
    case 'beginning':
      return 1; // Left to right
    case 'end':
      return -1; // Right to left
    case 'middle':
      return 0; // Both directions
    default:
      return 1;
  }
};

// Get vertical drawing direction based on animation start
export const getVerticalDirection = (animationStart: string) => {
  switch (animationStart) {
    case 'beginning':
      return 1; // Top to bottom
    case 'end':
      return -1; // Bottom to top
    case 'middle':
      return 0; // Both directions
    default:
      return 1;
  }
};

// Common visualization settings interface
export interface VisualizationSettings {
  color: string;
  sensitivity: number;
  showMirror: boolean;
  horizontalOrientation: boolean;
  verticalOrientation: boolean;
  barPlacement: string[];
  animationStart: string[];
}

// Bar-specific settings
export interface BarVisualizationSettings extends VisualizationSettings {
  barWidth: number;
}
