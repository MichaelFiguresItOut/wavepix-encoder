import React, { useEffect, useRef, useState } from "react";
import { useAudioVisualization } from "@/hooks/useAudioVisualization";
import { renderVisualization } from "@/utils/visualizationRenderer";
import { useIsMobile } from "@/hooks/use-mobile";
import { Slider } from "@/components/ui/slider";

interface VisualizationCanvasProps {
  audioBuffer: AudioBuffer | null;
  isPlaying: boolean;
  settings: any;
  onCanvasRef?: (ref: React.RefObject<HTMLCanvasElement>) => void;
}

// Helper function to format seconds as MM:SS
const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

const VisualizationCanvas: React.FC<VisualizationCanvasProps> = ({
  audioBuffer,
  isPlaying,
  settings,
  onCanvasRef
}) => {
  const isMobile = useIsMobile();
  const [currentProgress, setCurrentProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [currentTime, setCurrentTime] = useState("0:00");
  const [totalDuration, setTotalDuration] = useState("0:00");
  
  const { 
    canvasRef, 
    startVisualization, 
    animationRef, 
    settings: hookSettings, 
    setSettings, 
    renderFrozenVisualization,
    audioContextRef,
    audioSourceRef,
    currentTimeRef,
    seekToPosition
  } = useAudioVisualization({
    audioBuffer,
    isPlaying,
    initialSettings: settings
  });
  
  // Set total duration when audio buffer changes
  useEffect(() => {
    if (audioBuffer) {
      setTotalDuration(formatTime(audioBuffer.duration));
    }
  }, [audioBuffer]);
  
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
  
  // Update progress indicator for seek bar
  useEffect(() => {
    if (!audioBuffer || !audioContextRef.current || isDragging) return;
    
    const updateProgressInterval = setInterval(() => {
      if (currentTimeRef.current !== undefined && audioBuffer) {
        const currentSeconds = currentTimeRef.current;
        const progress = (currentSeconds / audioBuffer.duration) * 100;
        setCurrentProgress(progress);
        setCurrentTime(formatTime(currentSeconds));
      }
    }, 50); // Update frequently for smoother UI
    
    return () => clearInterval(updateProgressInterval);
  }, [audioBuffer, audioContextRef, currentTimeRef, isDragging]);
  
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
  
  // Handle seek bar change from user input
  const handleSeekChange = (value: number[]) => {
    if (!audioBuffer) return;
    
    const seekPercent = value[0];
    setCurrentProgress(seekPercent);
    
    // Update current time display while dragging
    const newTimeSeconds = (seekPercent / 100) * audioBuffer.duration;
    setCurrentTime(formatTime(newTimeSeconds));
    
    setIsDragging(true);
  };
  
  // Handle when user releases the seek bar
  const handleSeekComplete = () => {
    if (!audioBuffer) return;
    
    const newPosition = (currentProgress / 100) * audioBuffer.duration;
    seekToPosition(newPosition);
    setIsDragging(false);
  };

  return (
    <div className="flex flex-col space-y-2">
      <div className={`rounded-lg border overflow-hidden relative bg-black/30 ${isMobile ? 'h-[250px]' : 'h-[300px]'}`}>
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
      
      {/* Seek bar with timestamps */}
      {audioBuffer && (
        <div className="px-1">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-muted-foreground min-w-[40px]">{currentTime}</span>
            <Slider
              value={[currentProgress]}
              min={0}
              max={100}
              step={0.1}
              onValueChange={handleSeekChange}
              onValueCommit={handleSeekComplete}
              className="cursor-pointer flex-1"
            />
            <span className="text-xs text-muted-foreground min-w-[40px]">{totalDuration}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default VisualizationCanvas;
