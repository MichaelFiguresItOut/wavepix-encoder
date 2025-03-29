import React, { useRef, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { renderVisualization } from "@/utils/visualizationRenderer";
import { VisualizerSettings } from "@/hooks/useAudioVisualization";

interface PreviewPanelProps {
  audioBuffer: AudioBuffer | null;
  isPlaying: boolean;
  settings: VisualizerSettings; // Add this new prop
}

const PreviewPanel: React.FC<PreviewPanelProps> = ({ 
  audioBuffer, 
  isPlaying,
  settings // Use the visualizer settings from props
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const rotationAngleRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  
  // Remove local settings state since we're using props now
  
  // Initialize audio context and analyzer
  useEffect(() => {
    if (!audioBuffer) return;
    
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioContextRef.current = audioContext;
    
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 512; // Higher resolution
    analyser.smoothingTimeConstant = settings.smoothing;
    analyserRef.current = analyser;
    
    return () => {
      if (audioContextRef.current?.state !== 'closed') {
        audioContextRef.current?.close();
      }
    };
  }, [audioBuffer, settings.smoothing]);
  
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
      
      // Start visualization
      startVisualization();
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

  const startVisualization = () => {
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
      
      // Clear canvas and draw dark background
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Use our shared rendering function with the settings from props
      renderVisualization(timestamp, analyser, canvas, settings, rotationAngleRef.current);
    };
    
    renderFrame(0);
  };

  return (
    <Card className="w-full h-full glass-panel overflow-hidden">
      <CardContent className="p-0 h-full">
        <div className="relative w-full h-full bg-gradient-to-b from-black/80 to-black">
          <canvas
            ref={canvasRef}
            className="w-full h-full"
            width={800}
            height={300}
          />
          {!audioBuffer && (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-center p-4">
              Upload an audio file and press play to preview the visualization
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PreviewPanel;
