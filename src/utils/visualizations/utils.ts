
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

// Common visualization settings interface
export interface VisualizationSettings {
  color: string;
  sensitivity: number;
  showMirror: boolean;
  orientation: "horizontal" | "vertical" | "both";
}

// Bar-specific settings
export interface BarVisualizationSettings extends VisualizationSettings {
  barWidth: number;
}
