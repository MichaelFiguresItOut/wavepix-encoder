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
  
  const [settings, setSettings] = useState<VisualizerSettings>({
    type: "bars",
    barWidth: 5,
    color: "#3B82F6",
    sensitivity: 1.5,
    smoothing: 0.5,
    showMirror: false,
    rotationSpeed: 0.2,
    horizontalOrientation: true,
    verticalOrientation: false,
    barPlacement: ["bottom"],
    animationStart: ["beginning"],
    ...initialSettings
  });

  // Initialize audio context and analyzer
  useEffect(() => {
    if (!audioBuffer) return;
    
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioContextRef.current = audioContext;
    
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 512; // Increased for better resolution
    analyser.smoothingTimeConstant = settings.smoothing;
    analyserRef.current = analyser;
    
    return () => {
      if (audioContextRef.current?.state !== 'closed') {
        audioContextRef.current?.close();
      }
    };
  }, [audioBuffer]);
  
  // Handle play/pause
  useEffect(() => {
    if (!audioBuffer || !analyserRef.current || !audioContextRef.current) return;
    
    if (isPlaying) {
      // Stop previous playback if any
      if (audioSourceRef.current) {
        audioSourceRef.current.stop();
      }
      
      // Create a new audio source
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);
      source.start(0);
      audioSourceRef.current = source;
      
      // Reset time reference for animations
      timeRef.current = 0;
    } else {
      // Stop playback
      if (audioSourceRef.current) {
        audioSourceRef.current.stop();
        audioSourceRef.current = null;
      }
      
      // Stop visualization
      cancelAnimationFrame(animationRef.current);
    }
    
    return () => {
      cancelAnimationFrame(animationRef.current);
      if (audioSourceRef.current) {
        audioSourceRef.current.stop();
        audioSourceRef.current = null;
      }
    };
  }, [isPlaying, audioBuffer]);
  
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
    
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    
    const renderFrame = (timestamp: number) => {
      animationRef.current = requestAnimationFrame(renderFrame);
      
      // Update time for animations
      if (timeRef.current === 0) {
        timeRef.current = timestamp;
      }
      const deltaTime = timestamp - timeRef.current;
      timeRef.current = timestamp;
      
      // Update rotation angle for circle visualization
      rotationAngleRef.current += settings.rotationSpeed * (deltaTime / 1000);
      
      renderFunction(timestamp, analyser, canvas, settings, rotationAngleRef.current);
    };
    
    renderFrame(0);
  };

  return {
    canvasRef,
    settings,
    setSettings,
    startVisualization,
    animationRef
  };
};
