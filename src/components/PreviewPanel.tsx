import React, { useRef, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { renderVisualization } from "@/utils/visualizationRenderer";
import { VisualizerSettings } from "@/hooks/useAudioVisualization";

interface PreviewPanelProps {
  audioBuffer: AudioBuffer | null;
  isPlaying: boolean;
  settings: VisualizerSettings;
}

const PreviewPanel: React.FC<PreviewPanelProps> = ({ 
  audioBuffer, 
  isPlaying,
  settings
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const rotationAngleRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const isInitializedRef = useRef<boolean>(false);
  // For tracking audio position and looping
  const currentPositionRef = useRef<number>(0);
  const isPausedRef = useRef<boolean>(false);
  // For storing last frequency data when paused
  const lastFrequencyDataRef = useRef<Uint8Array | null>(null);
  
  // Added state for audio time progress
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [seeking, setSeeking] = useState<boolean>(false);
  const startTimeRef = useRef<number>(0);

  // Initialize audio context and analyzer only once
  useEffect(() => {
    if (!audioBuffer || isInitializedRef.current) return;
    
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512; // Higher resolution
      analyser.smoothingTimeConstant = settings.smoothing;
      analyserRef.current = analyser;
      
      // Initialize the lastFrequencyDataRef with zeros
      lastFrequencyDataRef.current = new Uint8Array(analyser.frequencyBinCount);
      lastFrequencyDataRef.current.fill(0);
      
      isInitializedRef.current = true;
      
      // Set duration when audio buffer is loaded
      if (audioBuffer) {
        setDuration(audioBuffer.duration);
      }
    } catch (error) {
      console.error("Error initializing audio context or analyzer:", error);
    }
    
    return () => {
      if (audioContextRef.current?.state !== 'closed') {
        try {
          audioContextRef.current?.close();
        } catch (error) {
          console.error("Error closing audio context:", error);
        }
      }
      isInitializedRef.current = false;
    };
  }, [audioBuffer]);
  
  // Separate effect to update smoothing
  useEffect(() => {
    if (analyserRef.current) {
      analyserRef.current.smoothingTimeConstant = settings.smoothing;
    }
  }, [settings.smoothing]);
  
  // Handle play/pause
  useEffect(() => {
    if (!audioBuffer || !analyserRef.current || !audioContextRef.current) return;
    
    // Function to start or resume audio playback
    const startOrResumeAudio = () => {
      try {
        // Check if audio context is closed - if so, we need to recreate it
        if (audioContextRef.current?.state === 'closed') {
          // Create a new audio context
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          audioContextRef.current = audioContext;
          
          // Create a new analyzer
          const analyser = audioContext.createAnalyser();
          analyser.fftSize = 512;
          analyser.smoothingTimeConstant = settings.smoothing;
          analyserRef.current = analyser;
          
          // Reset other refs as needed
          isPausedRef.current = false;
          currentPositionRef.current = 0;
          timeRef.current = 0;
          rotationAngleRef.current = 0;
        }
        
        // Resume audio context if it's suspended
        if (audioContextRef.current?.state === 'suspended') {
          audioContextRef.current.resume();
        }
        
        // Always update smoothing value to match current settings
        if (analyserRef.current) {
          analyserRef.current.smoothingTimeConstant = settings.smoothing;
        }
        
        // If we already have a source, don't create a new one
        if (audioSourceRef.current) {
          return;
        }
        
        // Create a new audio source
        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(analyserRef.current);
        analyserRef.current.connect(audioContextRef.current.destination);
        
        // Enable looping
        source.loop = true;
        
        // Calculate the correct start position
        let startPosition = 0;
        if (isPausedRef.current) {
          // If we were paused, start from the saved position
          startPosition = currentPositionRef.current;
          isPausedRef.current = false;
        } else {
          // If we're starting fresh, reset position and animation time
          currentPositionRef.current = 0;
          setCurrentTime(0);
          timeRef.current = 0; // Reset animation time only for fresh starts
          rotationAngleRef.current = 0; // Reset rotation only for fresh starts
        }
        
        // Start from the calculated position
        source.start(0, startPosition);
        startTimeRef.current = audioContextRef.current.currentTime;
        audioSourceRef.current = source;
        
        // Start visualization
        startVisualization();
      } catch (error) {
        console.error("Error starting audio playback:", error);
      }
    };
    
    // Function to pause audio playback
    const pauseAudio = () => {
      try {
        // Capture current frequency data before pausing
        if (analyserRef.current) {
          // Make sure we have the right size array
          const bufferLength = analyserRef.current.frequencyBinCount;
          if (!lastFrequencyDataRef.current || lastFrequencyDataRef.current.length !== bufferLength) {
            lastFrequencyDataRef.current = new Uint8Array(bufferLength);
          }
          
          // Get the latest data before we pause
          try {
            analyserRef.current.getByteFrequencyData(lastFrequencyDataRef.current);
          } catch (error) {
            console.error("Error capturing final frame data:", error);
            // Create a backup data array with some random values
            if (lastFrequencyDataRef.current) {
              for (let i = 0; i < lastFrequencyDataRef.current.length; i++) {
                lastFrequencyDataRef.current[i] = Math.random() * 128;
              }
            }
          }
        }
        
        // Now stop the audio source and suspend context
        if (audioSourceRef.current) {
          audioSourceRef.current.stop();
          audioSourceRef.current = null;
        }
        
        // Suspend audio context
        if (audioContextRef.current && audioContextRef.current.state === 'running') {
          audioContextRef.current.suspend();
        }
        
        // Immediately cancel any ongoing animation frames to prevent further updates
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = 0;
        }
        
        // Render the last known frequency data to keep the visualization visible but frozen
        renderFrozenVisualization();
      } catch (error) {
        console.error("Error pausing audio:", error);
      }
    };
    
    // Toggle play/pause
    if (isPlaying) {
      startOrResumeAudio();
    } else {
      pauseAudio();
    }
    
    return () => {
      // No need for cleanup on each toggle
    };
  }, [isPlaying, audioBuffer]);
  
  // Track position during playback
  useEffect(() => {
    if (!audioBuffer || !audioContextRef.current || !isPlaying) return;
    
    // Set up a timer to track current position for pause/resume
    const trackPositionInterval = setInterval(() => {
      if (isPlaying && audioSourceRef.current && audioContextRef.current && !seeking) {
        // Keep track of position for looping and pause/resume
        try {
          const elapsedSinceStart = audioContextRef.current.currentTime - (timeRef.current || 0);
          currentPositionRef.current = (currentPositionRef.current + elapsedSinceStart) % audioBuffer.duration;
          timeRef.current = audioContextRef.current.currentTime;
          // Update the current time state for the slider
          setCurrentTime(currentPositionRef.current);
        } catch (error) {
          console.error("Error tracking position:", error);
        }
      } else if (!isPlaying) {
        clearInterval(trackPositionInterval);
      }
    }, 100);
    
    return () => clearInterval(trackPositionInterval);
  }, [isPlaying, audioBuffer, seeking]);
  
  // Handle time seeking functionality
  const handleSeek = (value: number[]) => {
    if (!audioBuffer || !audioContextRef.current) return;
    
    const newTime = value[0];
    setSeeking(true);
    setCurrentTime(newTime);
    
    // If we're actively playing, stop the current source
    if (isPlaying && audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
        audioSourceRef.current = null;
      } catch (error) {
        console.error("Error stopping audio source during seek:", error);
      }
    }
  };
  
  // Handle end of seeking - restart audio from new position
  const handleSeekEnd = () => {
    if (!audioBuffer || !audioContextRef.current) {
      setSeeking(false);
      return;
    }
    
    // Update the current position ref
    currentPositionRef.current = currentTime;
    
    // If playing, restart from new position
    if (isPlaying) {
      try {
        if (audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume();
        }
        
        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(analyserRef.current!);
        analyserRef.current!.connect(audioContextRef.current.destination);
        source.loop = true;
        
        // Start from the current time
        source.start(0, currentTime);
        audioSourceRef.current = source;
        startTimeRef.current = audioContextRef.current.currentTime;
        timeRef.current = audioContextRef.current.currentTime;
        
        // Restart visualization
        startVisualization();
      } catch (error) {
        console.error("Error restarting audio after seek:", error);
      }
    }
    
    setSeeking(false);
  };

  // Format time in MM:SS format
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Render the last visualization frame when paused
  const renderFrozenVisualization = () => {
    try {
      if (!canvasRef.current) {
        console.warn("Cannot render frozen visualization: canvas not available");
        return;
      }
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.warn("Cannot render frozen visualization: context not available");
        return;
      }
      
      // If we don't have frequency data, create a fallback with random values
      if (!lastFrequencyDataRef.current) {
        const bufferLength = analyserRef.current?.frequencyBinCount || 256;
        lastFrequencyDataRef.current = new Uint8Array(bufferLength);
        // Fill with random values for better visuals than zeros
        for (let i = 0; i < lastFrequencyDataRef.current.length; i++) {
          lastFrequencyDataRef.current[i] = Math.random() * 128;
        }
      }
      
      // Create a fake analyzer that returns the last known frequency data
      const frozenAnalyser: AnalyserNode = {
        ...analyserRef.current,
        frequencyBinCount: lastFrequencyDataRef.current.length,
        getByteFrequencyData: (dataArray: Uint8Array) => {
          if (lastFrequencyDataRef.current) {
            try {
              dataArray.set(lastFrequencyDataRef.current);
            } catch (error) {
              console.error("Error setting frequency data in frozen visualization:", error);
              // Fill with random data as fallback
              for (let i = 0; i < dataArray.length; i++) {
                dataArray[i] = Math.random() * 128;
              }
            }
          } else {
            // Fill with random data as fallback
            for (let i = 0; i < dataArray.length; i++) {
              dataArray[i] = Math.random() * 128;
            }
          }
        }
      } as any;
      
      // Always start by drawing a dark background (even if the render fails)
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      try {
        // Render using the frozen data - use the exact same timestamp and rotation angle
        // This ensures the visualization truly freezes without advancing animation
        renderVisualization(
          timeRef.current || 0,
          frozenAnalyser,
          canvas,
          settings,
          rotationAngleRef.current
        );
      } catch (renderError) {
        console.error("Error rendering visualization:", renderError);
        
        // Fallback - draw a simple bars visualization directly
        if (lastFrequencyDataRef.current) {
          ctx.fillStyle = settings.color || '#3B82F6';
          const barWidth = 5;
          const bufferLength = lastFrequencyDataRef.current.length;
          const barCount = Math.min(Math.floor(canvas.width / barWidth), bufferLength);
          
          for (let i = 0; i < barCount; i++) {
            const barIndex = Math.floor(i * (bufferLength / barCount));
            const barHeight = (lastFrequencyDataRef.current[barIndex] / 255.0) * canvas.height * 0.8;
            ctx.fillRect(
              i * barWidth, 
              canvas.height - barHeight, 
              barWidth - 1, 
              barHeight
            );
          }
        }
      }
      
      // Ensure isPausedRef is set to true to prevent animation progression
      // if this frame gets rendered again somehow
      isPausedRef.current = true;
    } catch (error) {
      console.error("Error in renderFrozenVisualization:", error);
      
      // Fallback to just drawing a background
      try {
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
            ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          }
        }
      } catch (fallbackError) {
        console.error("Even fallback rendering failed:", fallbackError);
      }
    }
  };

  const startVisualization = () => {
    try {
      if (!canvasRef.current || !analyserRef.current) return;
      
      // Cancel any existing animation to avoid duplicates
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      
      const canvas = canvasRef.current;
      const analyser = analyserRef.current;
      
      const renderFrame = (timestamp: number) => {
        try {
          // Don't continue if we're paused - check both flags
          if (!isPlaying || isPausedRef.current) {
            return;
          }
          
          // Request next frame first to maintain animation loop
          animationRef.current = requestAnimationFrame(renderFrame);
          
          // Initialize timestamp if this is the first frame or preserve existing animation time
          if (timeRef.current === 0) {
            timeRef.current = timestamp;
          } else if (!isPausedRef.current) {
            // Only calculate animation updates when actually playing
            const deltaTime = timestamp - timeRef.current;
            
            // Update rotation angle for circle visualization
            rotationAngleRef.current += settings.rotationSpeed * (deltaTime / 1000);
            
            // Update the time reference
            timeRef.current = timestamp;
          }
          
          // Double-check we're still playing before rendering
          if (!isPlaying || isPausedRef.current) {
            cancelAnimationFrame(animationRef.current);
            return;
          }
          
          // Clear canvas and draw dark background
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Get the latest frequency data
          const bufferLength = analyser.frequencyBinCount;
          
          // Ensure we have a correctly sized frequency data array
          if (!lastFrequencyDataRef.current || lastFrequencyDataRef.current.length !== bufferLength) {
            lastFrequencyDataRef.current = new Uint8Array(bufferLength);
          }
          
          // Get current frequency data
          analyser.getByteFrequencyData(lastFrequencyDataRef.current);
          
          // Use our shared rendering function with the settings from props
          renderVisualization(timestamp, analyser, canvas, settings, rotationAngleRef.current);
        } catch (error) {
          console.error("Error in animation frame:", error);
          cancelAnimationFrame(animationRef.current);
        }
      };
      
      renderFrame(0);
    } catch (error) {
      console.error("Error starting visualization:", error);
    }
  };
  
  // Final cleanup
  useEffect(() => {
    return () => {
      // Clean up resources
      cancelAnimationFrame(animationRef.current);
      if (audioSourceRef.current) {
        try {
          audioSourceRef.current.stop();
        } catch (error) {
          console.error("Error stopping audio source:", error);
        }
        audioSourceRef.current = null;
      }
      
      if (audioContextRef.current?.state !== 'closed') {
        try {
          audioContextRef.current?.close();
        } catch (error) {
          console.error("Error closing audio context:", error);
        }
      }
    };
  }, []);

  return (
    <div className="space-y-4">
      <Card className="w-full glass-panel overflow-hidden">
        <CardContent className="p-0">
          <div className="relative w-full bg-gradient-to-b from-black/80 to-black">
            <canvas
              ref={canvasRef}
              className="w-full"
              width={800}
              height={300}
            />
            {!audioBuffer && (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-center p-4">
                Upload an audio file and press play to preview the visualization
              </div>
            )}
            
            {/* Subtle looping indicator */}
            {audioBuffer && (
              <div className="absolute bottom-2 right-2 text-xs text-white/30 flex items-center">
                <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 14L4 9L9 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M20 20V13C20 11.9391 19.5786 10.9217 18.8284 10.1716C18.0783 9.42143 17.0609 9 16 9H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M15 14L20 9L15 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M4 4V11C4 12.0609 4.42143 13.0783 5.17157 13.8284C5.92172 14.5786 6.93913 15 8 15H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Loop enabled
              </div>
            )}
            
            {/* Pause indicator overlay */}
            {audioBuffer && !isPlaying && isPausedRef.current && (
              <div className="absolute top-2 left-2 text-xs text-white/50 flex items-center bg-black/20 rounded px-2 py-1">
                <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" />
                  <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" />
                </svg>
                Paused
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Audio playback progress slider - moved outside and below the preview panel */}
      {audioBuffer && (
        <div className="p-2 bg-black/50 backdrop-blur-sm rounded-lg">
          <div className="flex items-center gap-2 w-full">
            <span className="text-xs text-white/70 min-w-[40px]">
              {formatTime(currentTime)}
            </span>
            <div className="flex-1">
              <input
                type="range"
                min={0}
                max={duration}
                step={0.01}
                value={currentTime}
                onChange={(e) => handleSeek([parseFloat(e.target.value)])}
                onMouseUp={handleSeekEnd}
                onTouchEnd={handleSeekEnd}
                className="w-full h-2 bg-secondary rounded-full appearance-none cursor-pointer"
              />
            </div>
            <span className="text-xs text-white/70 min-w-[40px] text-right">
              {formatTime(duration)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PreviewPanel;
