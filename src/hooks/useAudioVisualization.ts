import { useEffect, useRef, useState } from "react";

export type VisualizationOrientation = "horizontal" | "vertical" | "both";
export type BarPlacement = "bottom" | "middle" | "top";
export type AnimationStart = "beginning" | "middle" | "end";

export interface VisualizerSettings {
  type: "bars" | "wave" | "circle" | "line" | "siri" | "dots" | "bubbles" | "formation" | "multiline" | "lightning" | "honeycomb" | "fire" | "spiderweb";
  barWidth: number;
  color: string;
  sensitivity: number;
  smoothing: number;
  showMirror: boolean;
  showReversed: boolean;
  showInvert: boolean;
  rotationSpeed: number;
  horizontalOrientation: boolean;
  verticalOrientation: boolean;
  barPlacement: BarPlacement[];
  animationStart: AnimationStart[];
}

interface UseAudioVisualizationProps {
  audioBuffer: AudioBuffer | null;
  isPlaying: boolean;
  initialSettings?: Partial<VisualizerSettings>;
}

export const useAudioVisualization = ({
  audioBuffer,
  isPlaying,
  initialSettings = {}
}: UseAudioVisualizationProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const rotationAngleRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const currentTimeRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const isPausedRef = useRef<boolean>(false);
  const isInitializedRef = useRef<boolean>(false);
  // Store last frequency data for paused visualization
  const lastFrequencyDataRef = useRef<Uint8Array | null>(null);
  // Store render function for reuse when paused
  const lastRenderFunctionRef = useRef<((
    timestamp: number,
    analyser: AnalyserNode,
    canvas: HTMLCanvasElement,
    settings: VisualizerSettings,
    rotationAngle: number
  ) => void) | null>(null);
  
  const [settings, setSettings] = useState<VisualizerSettings>({
    type: "bars",
    barWidth: 5,
    color: "#3B82F6",
    sensitivity: 1.5,
    smoothing: 0.5,
    showMirror: false,
    showReversed: false,
    showInvert: false,
    rotationSpeed: 0.2,
    horizontalOrientation: true,
    verticalOrientation: false,
    barPlacement: ["bottom"],
    animationStart: ["beginning"],
    ...initialSettings
  });

  // Initialize audio context and analyzer only once
  useEffect(() => {
    if (!audioBuffer || isInitializedRef.current) return;
    
    // Create the audio context if it doesn't exist
    if (!audioContextRef.current) {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioContext;
      } catch (error) {
        console.error("Failed to create audio context:", error);
        return;
      }
    }
    
    // Create the analyzer if it doesn't exist
    if (!analyserRef.current && audioContextRef.current) {
      try {
        const analyser = audioContextRef.current.createAnalyser();
        analyser.fftSize = 512; // Increased for better resolution
        analyser.smoothingTimeConstant = settings.smoothing;
        analyserRef.current = analyser;
        
        // Initialize frequency data array
        lastFrequencyDataRef.current = new Uint8Array(analyser.frequencyBinCount);
        // Zero-fill it initially
        lastFrequencyDataRef.current.fill(0);
      } catch (error) {
        console.error("Failed to create analyzer:", error);
        return;
      }
    }
    
    isInitializedRef.current = true;
    
    return () => {
      // Only close the audio context when unmounting
      if (audioContextRef.current?.state !== 'closed') {
        try {
          audioContextRef.current?.close();
        } catch (error) {
          console.error("Error closing audio context:", error);
        }
      }
      isInitializedRef.current = false;
    };
  }, [audioBuffer, settings.smoothing]);
  
  // Handle play/pause
  useEffect(() => {
    if (!audioBuffer || !analyserRef.current || !audioContextRef.current) return;
    
    // Function to start or resume audio playback
    const startOrResumeAudio = () => {
      try {
        // Resume audio context if it's suspended
        if (audioContextRef.current?.state === 'suspended') {
          audioContextRef.current.resume();
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
        
        // Set up looping
        source.loop = true;
        
        // Calculate the correct offset
        let offset = 0;
        if (isPausedRef.current) {
          // If we were paused, start from the saved position
          offset = currentTimeRef.current;
          isPausedRef.current = false;
        } else {
          // If we're starting fresh, reset position and animation time
          currentTimeRef.current = 0;
          timeRef.current = 0; // Reset animation time only for fresh starts
          rotationAngleRef.current = 0; // Reset rotation only for fresh starts
        }
        
        // Start playback from the current position
        source.start(0, offset);
        startTimeRef.current = audioContextRef.current.currentTime;
        audioSourceRef.current = source;
        
        // Start visualization
        if (lastRenderFunctionRef.current) {
          startVisualization(lastRenderFunctionRef.current);
        }
      } catch (error) {
        console.error("Error starting audio:", error);
      }
    };
    
    // Function to pause audio playback
    const pauseAudio = () => {
      try {
        // Capture current frequency data before pausing
        if (analyserRef.current && audioContextRef.current) {
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
            // Create a backup data array with some random values instead of all zeros
            if (lastFrequencyDataRef.current) {
              for (let i = 0; i < lastFrequencyDataRef.current.length; i++) {
                lastFrequencyDataRef.current[i] = Math.random() * 128;
              }
            }
          }
        }
        
        // Now pause the audio and stop the source
        if (audioSourceRef.current && audioContextRef.current) {
          // Calculate current position for resume
          const elapsedTime = audioContextRef.current.currentTime - startTimeRef.current;
          currentTimeRef.current = (currentTimeRef.current + elapsedTime) % audioBuffer.duration;
          
          // Stop the current source and suspend the context
          audioSourceRef.current.stop();
          audioSourceRef.current = null;
          audioContextRef.current.suspend();
        }
        
        // Set the pause flag after capturing the frame data
        isPausedRef.current = true;
        
        // Immediately cancel any ongoing animation frames to prevent further updates
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = 0;
        }
        
        // Render frozen visual after we've captured the final frame data
        renderFrozenVisualization();
      } catch (error) {
        console.error("Error pausing audio:", error);
      }
    };
    
    // Handle play/pause toggle
    if (isPlaying) {
      startOrResumeAudio();
    } else {
      pauseAudio();
    }
    
    return () => {
      // No need to clean up everything on each toggle
    };
  }, [isPlaying, audioBuffer]);
  
  // Set up the position tracking interval
  useEffect(() => {
    if (!audioBuffer || !audioContextRef.current || !isPlaying) return;
    
    // Set up a timer to track current position for pause/resume
    const trackPositionInterval = setInterval(() => {
      if (isPlaying && audioSourceRef.current && audioContextRef.current) {
        // Calculate current position in the audio, considering looping
        const elapsedTime = audioContextRef.current.currentTime - startTimeRef.current;
        currentTimeRef.current = (currentTimeRef.current + elapsedTime) % audioBuffer.duration;
        startTimeRef.current = audioContextRef.current.currentTime; // Reset start time
      } else {
        clearInterval(trackPositionInterval);
      }
    }, 100);
    
    return () => clearInterval(trackPositionInterval);
  }, [isPlaying, audioBuffer]);
  
  // Render frozen visualization when paused
  const renderFrozenVisualization = () => {
    if (!canvasRef.current) {
      console.warn("Cannot render frozen visualization - missing canvas reference");
      return;
    }
    
    // If we don't have frequency data, create a fallback
    if (!lastFrequencyDataRef.current) {
      try {
        const bufferLength = analyserRef.current?.frequencyBinCount || 256;
        lastFrequencyDataRef.current = new Uint8Array(bufferLength);
        
        // Fill with random values rather than zeros for a better visual
        for (let i = 0; i < lastFrequencyDataRef.current.length; i++) {
          lastFrequencyDataRef.current[i] = Math.random() * 128;
        }
      } catch (error) {
        console.error("Error creating backup frequency data:", error);
        return;
      }
    }
    
    // Create a render function if we don't have one
    if (!lastRenderFunctionRef.current) {
      console.warn("Missing render function for frozen visualization - using built-in renderer");
      
      // If we don't have the original render function, use a basic renderer
      lastRenderFunctionRef.current = (timestamp, analyser, canvas, settings, rotationAngle) => {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw a simple visualization of the data
        const barWidth = 5;
        const bufferLength = lastFrequencyDataRef.current?.length || 0;
        const barCount = Math.min(Math.floor(canvas.width / barWidth), bufferLength);
        
        ctx.fillStyle = settings.color || '#3B82F6';
        for (let i = 0; i < barCount; i++) {
          const barIndex = Math.floor(i * (bufferLength / barCount));
          const barHeight = lastFrequencyDataRef.current ? 
            (lastFrequencyDataRef.current[barIndex] / 255.0) * canvas.height * 0.8 : 
            Math.random() * canvas.height * 0.5;
          ctx.fillRect(
            i * barWidth, 
            canvas.height - barHeight, 
            barWidth - 1, 
            barHeight
          );
        }
      };
    }
    
    try {
      // Create a fake analyzer that returns the stored frequency data
      const frozenAnalyzer: AnalyserNode = {
        ...analyserRef.current,
        frequencyBinCount: lastFrequencyDataRef.current?.length || 256,
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
      
      // Use the exact same timestamp and rotation angle as the last rendered frame
      // This ensures the visualization truly freezes without any animation progression
      lastRenderFunctionRef.current(
        timeRef.current || 0,
        frozenAnalyzer,
        canvasRef.current,
        settings,
        rotationAngleRef.current
      );
      
      // Set isPausedRef to true to prevent animation progressing if the frame somehow
      // gets rendered again
      isPausedRef.current = true;
    } catch (error) {
      console.error("Error in renderFrozenVisualization:", error);
      
      // Fallback to drawing a blank canvas with some background
      try {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
          ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          
          // Draw a basic visualization as a last resort
          if (lastFrequencyDataRef.current) {
            ctx.fillStyle = settings.color || '#3B82F6';
            const barWidth = 5;
            const bufferLength = lastFrequencyDataRef.current.length;
            const barCount = Math.min(Math.floor(canvasRef.current.width / barWidth), bufferLength);
            
            for (let i = 0; i < barCount; i++) {
              const barIndex = Math.floor(i * (bufferLength / barCount));
              const barHeight = (lastFrequencyDataRef.current[barIndex] / 255.0) * canvasRef.current.height * 0.8;
              ctx.fillRect(
                i * barWidth, 
                canvasRef.current.height - barHeight, 
                barWidth - 1, 
                barHeight
              );
            }
          }
        }
      } catch (fallbackError) {
        console.error("Even fallback rendering failed:", fallbackError);
      }
    }
  };
  
  // Effect for updating analyzer settings
  useEffect(() => {
    if (analyserRef.current) {
      analyserRef.current.smoothingTimeConstant = settings.smoothing;
    }
  }, [settings.smoothing]);
  
  // This function will be used to start the visualization process
  const startVisualization = (renderFunction: (
    timestamp: number,
    analyser: AnalyserNode,
    canvas: HTMLCanvasElement,
    settings: VisualizerSettings,
    rotationAngle: number
  ) => void) => {
    if (!canvasRef.current || !analyserRef.current) return;
    
    // Store render function for use when paused
    lastRenderFunctionRef.current = renderFunction;
    
    // Cancel any existing animation frame to avoid duplicates
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    
    const renderFrame = (timestamp: number) => {
      // Check both isPlaying and isPausedRef to ensure we don't animate when paused
      if (!isPlaying || isPausedRef.current) {
        // Don't continue animation if we're paused
        return;
      }
      
      // Request next frame before any processing to maintain animation loop
      animationRef.current = requestAnimationFrame(renderFrame);
      
      try {
        // Update time for animations - preserve time when resuming
        if (timeRef.current === 0) {
          timeRef.current = timestamp;
        } else if (!isPausedRef.current) {
          // Only update time deltas when actually playing (not just after resuming)
          const deltaTime = timestamp - timeRef.current;
          
          // Update rotation angle based on rotation speed setting
          if (settings.rotationSpeed > 0) {
            // Normalize to a good rotation range (0-2 radians per second)
            const rotationRate = settings.rotationSpeed * 2.0 * (deltaTime / 1000);
            rotationAngleRef.current += rotationRate;
            
            // Ensure the angle doesn't grow indefinitely
            if (rotationAngleRef.current > Math.PI * 2) {
              rotationAngleRef.current -= Math.PI * 2;
            }
          }
          
          timeRef.current = timestamp;
        }
        
        // Double-check we're still playing before updating frequency data
        if (!isPlaying || isPausedRef.current) {
          cancelAnimationFrame(animationRef.current);
          return;
        }
        
        // Get current frequency data and store it
        if (analyser && !isPausedRef.current) {
          // Make sure we have a correctly sized array
          if (!lastFrequencyDataRef.current || 
              lastFrequencyDataRef.current.length !== analyser.frequencyBinCount) {
            lastFrequencyDataRef.current = new Uint8Array(analyser.frequencyBinCount);
          }
          
          try {
            analyser.getByteFrequencyData(lastFrequencyDataRef.current);
          } catch (error) {
            console.error("Error getting frequency data:", error);
          }
        }
        
        // Call the render function
        renderFunction(timestamp, analyser, canvas, settings, rotationAngleRef.current);
      } catch (error) {
        console.error("Error in animation frame:", error);
        cancelAnimationFrame(animationRef.current);
      }
    };
    
    renderFrame(0);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animationRef.current);
      if (audioSourceRef.current) {
        try {
          audioSourceRef.current.stop();
        } catch (error) {
          console.error("Error stopping audio source during cleanup:", error);
        }
        audioSourceRef.current = null;
      }
      
      if (audioContextRef.current?.state !== 'closed') {
        try {
          audioContextRef.current?.close();
        } catch (error) {
          console.error("Error closing audio context during cleanup:", error);
        }
      }
    };
  }, []);

  return {
    canvasRef,
    settings,
    setSettings,
    startVisualization,
    animationRef,
    renderFrozenVisualization
  };
};
