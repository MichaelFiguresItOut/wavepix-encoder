
import React, { useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface PreviewPanelProps {
  audioBuffer: AudioBuffer | null;
  isPlaying: boolean;
}

const PreviewPanel: React.FC<PreviewPanelProps> = ({ audioBuffer, isPlaying }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // Initialize audio context and analyzer
  useEffect(() => {
    if (!audioBuffer) return;
    
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioContextRef.current = audioContext;
    
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;
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
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const renderFrame = () => {
      animationRef.current = requestAnimationFrame(renderFrame);
      
      analyser.getByteFrequencyData(dataArray);
      
      // Clear the canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Set background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Calculate bar width based on canvas size
      const barWidth = canvas.width / bufferLength * 2.5;
      let barHeight;
      let x = 0;
      
      // Draw the waveform
      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] * 0.7;
        
        // Create gradient
        const gradient = ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
        gradient.addColorStop(0, 'rgba(59, 130, 246, 0.8)');
        gradient.addColorStop(1, 'rgba(59, 130, 246, 0.2)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        
        x += barWidth + 1;
      }
    };
    
    renderFrame();
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
