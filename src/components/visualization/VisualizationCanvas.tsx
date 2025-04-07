import React, { useEffect } from "react";
import { useAudioVisualization } from "@/hooks/useAudioVisualization";
import { renderVisualization } from "@/utils/visualizationRenderer";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const isMobile = useIsMobile();
  const { canvasRef, startVisualization, animationRef, settings: hookSettings, setSettings } = useAudioVisualization({
    audioBuffer,
    isPlaying,
    initialSettings: settings
  });
  
  // Update canvas dimensions based on device
  useEffect(() => {
    const updateCanvasDimensions = () => {
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const container = canvas.parentElement;
        if (container) {
          // Set canvas to match container size
          canvas.width = container.clientWidth;
          canvas.height = container.clientHeight;
        }
      }
    };

    updateCanvasDimensions();
    window.addEventListener('resize', updateCanvasDimensions);
    
    return () => {
      window.removeEventListener('resize', updateCanvasDimensions);
    };
  }, [canvasRef]);
  
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
    <div className="rounded-lg border overflow-hidden h-full relative bg-black/30">
      <canvas
        ref={canvasRef}
        className="w-full h-full touch-none"
        width={isMobile ? 800 : 1200}
        height={isMobile ? 400 : 600}
      />
      {!audioBuffer && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground p-4 text-center">
          {isMobile ? "Tap to upload audio" : "Upload an audio file to visualize"}
        </div>
      )}
    </div>
  );
};

export default VisualizationCanvas;
