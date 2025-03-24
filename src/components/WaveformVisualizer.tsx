
import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AudioWaveform } from "lucide-react";

interface WaveformVisualizerProps {
  audioBuffer: AudioBuffer | null;
  isPlaying: boolean;
}

interface VisualizerSettings {
  type: "bars" | "wave" | "circle";
  barWidth: number;
  color: string;
  sensitivity: number;
  smoothing: number;
  showMirror: boolean;
}

const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({ audioBuffer, isPlaying }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  const [settings, setSettings] = useState<VisualizerSettings>({
    type: "bars",
    barWidth: 5,
    color: "#3B82F6",
    sensitivity: 1.5,
    smoothing: 0.5,
    showMirror: false
  });

  // Initialize audio context and analyzer
  useEffect(() => {
    if (!audioBuffer) return;
    
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioContextRef.current = audioContext;
    
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
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
  
  // Effect for updating analyzer settings
  useEffect(() => {
    if (analyserRef.current) {
      analyserRef.current.smoothingTimeConstant = settings.smoothing;
    }
  }, [settings.smoothing]);

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
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (settings.type === "bars") {
        drawBars(ctx, dataArray, canvas, bufferLength);
      } else if (settings.type === "wave") {
        drawWave(ctx, dataArray, canvas, bufferLength);
      } else if (settings.type === "circle") {
        drawCircle(ctx, dataArray, canvas, bufferLength);
      }
    };
    
    renderFrame();
  };

  const drawBars = (
    ctx: CanvasRenderingContext2D,
    dataArray: Uint8Array,
    canvas: HTMLCanvasElement,
    bufferLength: number
  ) => {
    const barWidth = settings.barWidth;
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    
    const totalBars = Math.min(Math.floor(canvasWidth / (barWidth + 1)), bufferLength);
    const barSpacing = 1;
    
    ctx.fillStyle = settings.color;
    
    for (let i = 0; i < totalBars; i++) {
      const index = Math.floor(i * (bufferLength / totalBars));
      const value = dataArray[index] * settings.sensitivity;
      const barHeight = (value / 255) * canvasHeight;
      
      const x = i * (barWidth + barSpacing);
      const y = canvasHeight - barHeight;
      
      // Create gradient for each bar
      const gradient = ctx.createLinearGradient(x, canvasHeight, x, y);
      gradient.addColorStop(0, `${settings.color}FF`);
      gradient.addColorStop(1, `${settings.color}22`);
      
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barWidth, barHeight);
      
      // Draw mirrored bars if enabled
      if (settings.showMirror) {
        ctx.fillStyle = `${settings.color}66`;
        ctx.fillRect(x, 0, barWidth, barHeight);
      }
    }
  };

  const drawWave = (
    ctx: CanvasRenderingContext2D,
    dataArray: Uint8Array,
    canvas: HTMLCanvasElement,
    bufferLength: number
  ) => {
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    
    ctx.strokeStyle = settings.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    const sliceWidth = canvasWidth / bufferLength;
    let x = 0;
    
    for (let i = 0; i < bufferLength; i++) {
      const value = dataArray[i] * settings.sensitivity;
      const y = (value / 255) * canvasHeight;
      
      if (i === 0) {
        ctx.moveTo(x, canvasHeight - y);
      } else {
        ctx.lineTo(x, canvasHeight - y);
      }
      
      x += sliceWidth;
    }
    
    ctx.stroke();
    
    // Draw mirrored wave if enabled
    if (settings.showMirror) {
      ctx.strokeStyle = `${settings.color}66`;
      ctx.beginPath();
      x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        const value = dataArray[i] * settings.sensitivity;
        const y = (value / 255) * canvasHeight;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        
        x += sliceWidth;
      }
      
      ctx.stroke();
    }
  };

  const drawCircle = (
    ctx: CanvasRenderingContext2D,
    dataArray: Uint8Array,
    canvas: HTMLCanvasElement,
    bufferLength: number
  ) => {
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    const radius = Math.min(centerX, centerY) * 0.8;
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, 5, 0, 2 * Math.PI);
    ctx.fillStyle = settings.color;
    ctx.fill();
    
    for (let i = 0; i < bufferLength; i++) {
      const angle = (i / bufferLength) * 2 * Math.PI;
      const value = dataArray[i] * settings.sensitivity;
      const barHeight = (value / 255) * radius;
      
      const x1 = centerX + Math.cos(angle) * radius;
      const y1 = centerY + Math.sin(angle) * radius;
      
      const x2 = centerX + Math.cos(angle) * (radius + barHeight);
      const y2 = centerY + Math.sin(angle) * (radius + barHeight);
      
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = settings.color;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  };

  return (
    <Card className="w-full encoder-section">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <AudioWaveform className="h-5 w-5 text-primary" />
          Waveform Visualizer
        </CardTitle>
        <CardDescription>Customize your audio visualization</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="mt-2 rounded-lg border overflow-hidden h-[300px] relative bg-black/30">
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Visualization Type</Label>
                <Select 
                  value={settings.type} 
                  onValueChange={(value) => setSettings({...settings, type: value as any})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select visualization type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bars">Bars</SelectItem>
                    <SelectItem value="wave">Wave</SelectItem>
                    <SelectItem value="circle">Circle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex items-center gap-2">
                  <Input 
                    type="color" 
                    value={settings.color} 
                    onChange={(e) => setSettings({...settings, color: e.target.value})}
                    className="w-12 h-10 p-1"
                  />
                  <Input 
                    type="text" 
                    value={settings.color} 
                    onChange={(e) => setSettings({...settings, color: e.target.value})}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Sensitivity: {settings.sensitivity.toFixed(1)}</Label>
                </div>
                <Slider 
                  min={0.1} 
                  max={3} 
                  step={0.1} 
                  value={[settings.sensitivity]} 
                  onValueChange={([value]) => setSettings({...settings, sensitivity: value})}
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Smoothing: {settings.smoothing.toFixed(1)}</Label>
                </div>
                <Slider 
                  min={0} 
                  max={0.9} 
                  step={0.1} 
                  value={[settings.smoothing]} 
                  onValueChange={([value]) => setSettings({...settings, smoothing: value})}
                />
              </div>
              
              {settings.type === "bars" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Bar Width: {settings.barWidth}px</Label>
                  </div>
                  <Slider 
                    min={1} 
                    max={20} 
                    step={1} 
                    value={[settings.barWidth]} 
                    onValueChange={([value]) => setSettings({...settings, barWidth: value})}
                  />
                </div>
              )}
              
              <div className="flex items-center space-x-2 pt-2">
                <Switch 
                  id="mirror" 
                  checked={settings.showMirror} 
                  onCheckedChange={(checked) => setSettings({...settings, showMirror: checked})}
                />
                <Label htmlFor="mirror">Mirrored Effect</Label>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WaveformVisualizer;
