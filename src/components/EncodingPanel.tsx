import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardFooter, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Video, Play, Pause, Download } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";

interface EncodingPanelProps {
  audioBuffer: AudioBuffer | null;
  isPlaying: boolean;
  onPlayPauseToggle: () => void;
}

const EncodingPanel: React.FC<EncodingPanelProps> = ({ 
  audioBuffer, 
  isPlaying,
  onPlayPauseToggle 
}) => {
  const [resolution, setResolution] = useState("1080p");
  const [frameRate, setFrameRate] = useState("30");
  const [quality, setQuality] = useState(80);
  const [showBackground, setShowBackground] = useState(true);
  const [isEncoding, setIsEncoding] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const animationFrameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const downloadFileNameRef = useRef<string>("waveform-visualization.mp4");
  const downloadUrlRef = useRef<string>("");
  const selectedMimeTypeRef = useRef<string>("");

  // Set up canvas and context for encoding
  useEffect(() => {
    if (!canvasRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = getResolutionWidth(resolution);
      canvas.height = getResolutionHeight(resolution);
      canvasRef.current = canvas;
    }

    if (!audioContextRef.current && audioBuffer) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
    }

    return () => {
      if (audioSourceRef.current) {
        audioSourceRef.current.stop();
        audioSourceRef.current.disconnect();
      }
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [audioBuffer, resolution]);

  const getResolutionWidth = (res: string): number => {
    switch (res) {
      case "720p": return 1280;
      case "1080p": return 1920;
      case "1440p": return 2560;
      case "4K": return 3840;
      default: return 1920;
    }
  };

  const getResolutionHeight = (res: string): number => {
    switch (res) {
      case "720p": return 720;
      case "1080p": return 1080;
      case "1440p": return 1440;
      case "4K": return 2160;
      default: return 1080;
    }
  };

  const drawWaveform = (dataArray: Uint8Array, bufferLength: number) => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    
    // Background color
    if (showBackground) {
      ctx.fillStyle = '#0f0f0f';
    } else {
      ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    }
    ctx.fillRect(0, 0, width, height);
    
    // Calculate quality-based settings
    const barOpacity = quality / 100;
    const barWidth = Math.max(2, Math.floor(width / bufferLength) - 1);
    const barColor = `rgba(59, 130, 246, ${barOpacity})`; // primary color with dynamic opacity
    
    // Draw the bars
    const barHeightMultiplier = height * 0.5 * (quality / 100);
    
    ctx.fillStyle = barColor;
    
    for (let i = 0; i < bufferLength; i++) {
      const barHeight = (dataArray[i] / 255) * barHeightMultiplier;
      const x = i * (barWidth + 1);
      const y = (height / 2) - (barHeight / 2);
      
      ctx.fillRect(x, y, barWidth, barHeight);
    }
  };

  const handleEncode = async () => {
    if (!audioBuffer || !canvasRef.current) {
      toast({
        variant: "destructive",
        title: "No audio loaded",
        description: "Please upload an audio file first."
      });
      return;
    }
    
    setIsEncoding(true);
    setProgress(0);
    
    try {
      // Set up canvas stream for recording
      const canvas = canvasRef.current;
      const fps = parseInt(frameRate, 10);
      
      // Set up canvas stream
      const canvasStream = canvas.captureStream(fps);
      
      // Set up audio context for visualization (but not playback)
      if (audioContextRef.current && analyserRef.current) {
        // Create a silent offline context for visualization
        const offlineContext = new OfflineAudioContext({
          numberOfChannels: audioBuffer.numberOfChannels,
          length: audioBuffer.length,
          sampleRate: audioBuffer.sampleRate
        });
        
        // Create a source for visualization only
        audioSourceRef.current = audioContextRef.current.createBufferSource();
        audioSourceRef.current.buffer = audioBuffer;
        audioSourceRef.current.connect(analyserRef.current);
        
        // Create audio stream for recording
        const audioStreamDestination = audioContextRef.current.createMediaStreamDestination();
        const audioSource = audioContextRef.current.createBufferSource();
        audioSource.buffer = audioBuffer;
        audioSource.connect(audioStreamDestination);
        
        // Combine canvas and audio streams
        const combinedStream = new MediaStream();
        canvasStream.getVideoTracks().forEach(track => combinedStream.addTrack(track));
        audioStreamDestination.stream.getAudioTracks().forEach(track => combinedStream.addTrack(track));
        
        // Test different MIME types for compatibility, prioritize MP4
        const mimeTypes = [
          'video/mp4',
          'video/mp4;codecs=h264',
          'video/webm;codecs=h264',
          'video/webm',
          'video/webm;codecs=vp8',
        ];
        
        // Find the first supported MIME type
        let mimeType = '';
        for (const type of mimeTypes) {
          if (MediaRecorder.isTypeSupported(type)) {
            mimeType = type;
            console.log(`Using MIME type: ${type}`);
            selectedMimeTypeRef.current = type;
            break;
          }
        }
        
        if (!mimeType) {
          throw new Error("No supported MIME type found for video encoding");
        }
        
        // Options for the MediaRecorder
        const options = {
          mimeType: mimeType,
          videoBitsPerSecond: quality * 100000 // Higher bitrate for better quality
        };
        
        // Create media recorder with combined streams
        mediaRecorderRef.current = new MediaRecorder(combinedStream, options);
        chunksRef.current = [];
        
        mediaRecorderRef.current.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunksRef.current.push(e.data);
          }
        };
        
        mediaRecorderRef.current.onstop = () => {
          // Determine the correct file extension based on the MIME type used
          const fileExtension = selectedMimeTypeRef.current.includes('mp4') ? 'mp4' : 'webm';
          const blob = new Blob(chunksRef.current, { type: selectedMimeTypeRef.current });
          
          finishEncoding(blob, fileExtension);
          
          // Stop the audio source used for visualization
          if (audioSourceRef.current) {
            audioSourceRef.current.stop();
          }
          
          // Stop the audio source used for recording
          audioSource.stop();
        };
        
        // Start the animation and recording
        startTimeRef.current = performance.now();
        const duration = audioBuffer.duration * 1000; // in ms
        
        // Set up analyzer for visualization
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        const animate = (timestamp: number) => {
          if (!analyserRef.current) return;
          
          // Calculate progress
          const elapsed = timestamp - startTimeRef.current;
          const newProgress = Math.min(100, Math.round((elapsed / duration) * 100));
          setProgress(newProgress);
          
          // Draw frame
          analyserRef.current.getByteFrequencyData(dataArray);
          drawWaveform(dataArray, bufferLength);
          
          // Continue animation if not done
          if (elapsed < duration) {
            animationFrameRef.current = requestAnimationFrame(animate);
          } else {
            // Encoding complete
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
              mediaRecorderRef.current.stop();
            }
          }
        };
        
        // Start recording and animation
        mediaRecorderRef.current.start(100); // Collect data every 100ms
        audioSourceRef.current.start(0); // Start source for visualization
        audioSource.start(0); // Start source for recording (with audio)
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        throw new Error("Audio context not initialized");
      }
    } catch (error) {
      console.error("Encoding error:", error);
      setIsEncoding(false);
      toast({
        variant: "destructive",
        title: "Encoding failed",
        description: error instanceof Error ? error.message : "An unknown error occurred"
      });
    }
  };

  const finishEncoding = (blob: Blob, fileExtension: string = 'mp4') => {
    setIsEncoding(false);
    setProgress(100);
    
    toast({
      title: "Encoding complete",
      description: "Your video has been successfully encoded!"
    });
    
    // Create download URL
    const url = URL.createObjectURL(blob);
    
    // Get file name with proper extension
    const fileName = `waveform-visualization.${fileExtension}`;
    
    // Store the URL and filename for later download
    videoRef.current = document.createElement('video');
    videoRef.current.src = url;
    downloadUrlRef.current = url;
    downloadFileNameRef.current = fileName;
    
    // Show download toast
    toast({
      title: "Download ready",
      description: "Click the Download button to save your video."
    });
  };

  const handleDownload = () => {
    if (!videoRef.current || !videoRef.current.src) {
      toast({
        variant: "destructive",
        title: "No video available",
        description: "Please encode a video first."
      });
      return;
    }
    
    // Create temporary link and trigger download
    const a = document.createElement('a');
    a.href = downloadUrlRef.current || videoRef.current.src;
    a.download = downloadFileNameRef.current;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    toast({
      title: "Download started",
      description: "Your encoded video will download shortly."
    });
  };

  return (
    <Card className="w-full encoder-section">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Video className="h-5 w-5 text-primary" />
          Encoding Options
        </CardTitle>
        <CardDescription>Customize your output video settings</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Resolution</Label>
              <Select value={resolution} onValueChange={setResolution}>
                <SelectTrigger>
                  <SelectValue placeholder="Select resolution" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="720p">720p (1280×720)</SelectItem>
                  <SelectItem value="1080p">1080p (1920×1080)</SelectItem>
                  <SelectItem value="1440p">1440p (2560×1440)</SelectItem>
                  <SelectItem value="4K">4K (3840×2160)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Frame Rate</Label>
              <Select value={frameRate} onValueChange={setFrameRate}>
                <SelectTrigger>
                  <SelectValue placeholder="Select frame rate" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24">24 FPS</SelectItem>
                  <SelectItem value="30">30 FPS</SelectItem>
                  <SelectItem value="60">60 FPS</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Quality: {quality}%</Label>
              </div>
              <Slider 
                min={10} 
                max={100} 
                step={1} 
                value={[quality]} 
                onValueChange={([value]) => setQuality(value)}
              />
            </div>
            
            <div className="flex items-center space-x-2 pt-4">
              <Switch 
                id="background" 
                checked={showBackground} 
                onCheckedChange={setShowBackground}
              />
              <Label htmlFor="background">Include Background</Label>
            </div>
          </div>
        </div>
        
        {isEncoding && (
          <div className="mt-6 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Encoding progress</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between pt-2">
        <Button
          variant="outline"
          onClick={onPlayPauseToggle}
          disabled={!audioBuffer || isEncoding}
          className="flex items-center gap-2"
        >
          {isPlaying ? (
            <>
              <Pause className="h-4 w-4" /> Pause Preview
            </>
          ) : (
            <>
              <Play className="h-4 w-4" /> Play Preview
            </>
          )}
        </Button>
        
        <div className="flex gap-2">
          <Button
            variant="default"
            onClick={handleEncode}
            disabled={!audioBuffer || isEncoding}
            className="flex items-center gap-2"
          >
            <Video className="h-4 w-4" />
            {isEncoding ? "Encoding..." : "Encode Video"}
          </Button>
          
          <Button
            variant="outline"
            onClick={handleDownload}
            disabled={progress < 100}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default EncodingPanel;
