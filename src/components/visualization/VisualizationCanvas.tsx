import React, { useEffect, useRef } from "react";
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
  const { canvasRef, startVisualization, animationRef, settings: hookSettings, setSettings, renderFrozenVisualization } = useAudioVisualization({
    audioBuffer,
    isPlaying,
    initialSettings: settings
  });
  
  // Update canvas dimensions based on device
  useEffect(() => {
    const updateCanvasDimensions = () => {
      if (canvasRef.current) {
        try {
          const canvas = canvasRef.current;
          const container = canvas.parentElement;
          if (container) {
            // Set canvas to match container size
            canvas.width = container.clientWidth;
            canvas.height = container.clientHeight;
          }
        } catch (error) {
          console.error("Error updating canvas dimensions:", error);
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
    try {
      setSettings(settings);
    } catch (error) {
      console.error("Error updating settings:", error);
    }
  }, [settings, setSettings]);
  
  // Start visualization when playing or render frozen frame when paused
  useEffect(() => {
    try {
      if (isPlaying) {
        startVisualization(renderVisualization);
      } else {
        // First ensure we have the latest frame data before canceling the animation
        if (audioBuffer) {
          try {
            // Force immediate rendering of the frozen visualization
            renderFrozenVisualization();
            
            // Then cancel animation after we've captured the data
            if (animationRef.current) {
              cancelAnimationFrame(animationRef.current);
              animationRef.current = 0;
            }
          } catch (error) {
            console.error("Error rendering frozen visualization in VisualizationCanvas:", error);
            
            // Fallback - render a blank canvas
            if (canvasRef.current) {
              const ctx = canvasRef.current.getContext('2d');
              if (ctx) {
                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
                ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Error in play/pause effect:", error);
    }
    
    // Cleanup function to ensure animations are properly stopped
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = 0;
      }
    };
  }, [isPlaying, settings, startVisualization, animationRef, audioBuffer, renderFrozenVisualization]);
  
  // Pass the canvas ref to parent if needed
  useEffect(() => {
    if (onCanvasRef) {
      try {
        onCanvasRef(canvasRef);
      } catch (error) {
        console.error("Error passing canvas ref to parent:", error);
      }
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
