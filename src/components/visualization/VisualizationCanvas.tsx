
import React, { useEffect } from "react";
import { useAudioVisualization } from "@/hooks/useAudioVisualization";
import { renderVisualization } from "@/utils/visualizationRenderer";

interface VisualizationCanvasProps {
  audioBuffer: AudioBuffer | null;
  isPlaying: boolean;
  settings: any;
  onCanvasRef?: (ref: React.RefObject<HTMLCanvasElement>) => void;
}

const VisualizationCanvas: React.FC<VisualizationCanvasProps> = ({
  audioBuffer,
  isPlaying,
  settings,
  onCanvasRef
}) => {
  const { canvasRef, startVisualization, animationRef, settings: hookSettings, setSettings } = useAudioVisualization({
    audioBuffer,
    isPlaying,
    initialSettings: settings
  });
  
  // Update hook settings when component settings change
  useEffect(() => {
    setSettings(settings);
  }, [settings, setSettings]);
  
  // Start visualization when playing
  useEffect(() => {
    if (isPlaying) {
      startVisualization(renderVisualization);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
  }, [isPlaying, settings, startVisualization, animationRef]);
  
  // Pass the canvas ref to parent if needed
  useEffect(() => {
    if (onCanvasRef) {
      onCanvasRef(canvasRef);
    }
  }, [canvasRef, onCanvasRef]);

  return (
    <div className="rounded-lg border overflow-hidden h-[300px] relative bg-black/30">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        width={800}
        height={300}
      />
      {!audioBuffer && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
          Upload an audio file to visualize
        </div>
      )}
    </div>
  );
};

export default VisualizationCanvas;
