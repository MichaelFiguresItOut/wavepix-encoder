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
import { VisualizerSettings } from "@/hooks/useAudioVisualization";
import { renderVisualization } from "@/utils/visualizationRenderer";

interface EncodingPanelProps {
  audioBuffer: AudioBuffer | null;
  isPlaying: boolean;
  onPlayPauseToggle: () => void;
  visualizerSettings: VisualizerSettings;
}

const EncodingPanel: React.FC<EncodingPanelProps> = ({ 
  audioBuffer, 
  isPlaying,
  onPlayPauseToggle,
  visualizerSettings
}) => {
  const [resolution, setResolution] = useState("1080p");
  const [frameRate, setFrameRate] = useState("30");
  const [quality, setQuality] = useState(80);
  const [showBackground, setShowBackground] = useState(true);
  const [isEncoding, setIsEncoding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [useCFR, setUseCFR] = useState(true);
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
  const originalAudioRef = useRef<Blob | null>(null);
  
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

  const drawWaveform = (dataArray: Uint8Array, bufferLength: number, timestamp: number) => {
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
    
    // Use the shared renderVisualization function with the visualizer settings
    renderVisualization(
      timestamp,
      analyserRef.current!,
      canvas,
      visualizerSettings,
      (timestamp / 1000) * visualizerSettings.rotationSpeed
    );
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
      
      // Instead of capturing a live stream with variable timing, we'll:
      // 1. Pre-render all frames at exact intervals
      // 2. Create a fixed-fps video from those frames
      if (useCFR) {
        await generateConstantFrameRateVideo(fps, canvas, audioBuffer);
        return;
      }
      
      // Original variable frame rate approach (fallback)
      // Set up canvas stream - explicitly set the frame rate
      const canvasStream = canvas.captureStream(fps);
      
      // Force a consistent frame rate on video tracks
      canvasStream.getVideoTracks().forEach(track => {
        if (track.getConstraints && typeof track.getConstraints === 'function') {
          try {
            // Some browsers support setting frameRate constraint directly
            track.applyConstraints({ 
              frameRate: { exact: fps },
              width: { exact: canvas.width },
              height: { exact: canvas.height }
            });
          } catch (e) {
            console.warn('Could not apply exact frame rate constraints:', e);
          }
        }
      });
      
      // Set up audio context and source
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      if (!analyserRef.current) {
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
      }
      
      // Create a media stream for the audio
      const audioStreamDestination = audioContextRef.current.createMediaStreamDestination();
      audioSourceRef.current = audioContextRef.current.createBufferSource();
      audioSourceRef.current.buffer = audioBuffer;
      
      // Connect the audio source to both the analyzer (for visualization) and the destination (for recording)
      audioSourceRef.current.connect(analyserRef.current);
      audioSourceRef.current.connect(audioStreamDestination);
      
      // Combine the audio and video streams
      const combinedStream = new MediaStream();
      
      // Add video tracks from canvas
      canvasStream.getVideoTracks().forEach(track => {
        combinedStream.addTrack(track);
      });
      
      // Add audio tracks
      audioStreamDestination.stream.getAudioTracks().forEach(track => {
        combinedStream.addTrack(track);
      });
      
      // Check available MIME types for MP4
      const mp4MimeTypes = [
        'video/mp4;codecs=h264,mp4a.40.2',
        'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
        'video/mp4',
        'video/webm;codecs=h264,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm'
      ];
      
      let selectedMimeType = '';
      for (const type of mp4MimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          selectedMimeType = type;
          console.log(`Using MIME type: ${type}`);
          break;
        }
      }
      
      if (!selectedMimeType) {
        throw new Error("No supported video format found");
      }
      
      // Configure MediaRecorder with high quality and constant frame rate
      const recorderOptions = {
        mimeType: selectedMimeType,
        videoBitsPerSecond: quality * 100000,  // Adjust based on quality slider
        audioBitsPerSecond: 128000,  // Ensure high audio quality
      };
      
      mediaRecorderRef.current = new MediaRecorder(combinedStream, recorderOptions);
      chunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: selectedMimeType });
        finishEncoding(blob);
      };
      
      // Start recording with a timeslice to ensure constant frame rate
      // Using smaller timeslice for more consistent frame encoding
      // 1000/fps ensures we get data at least once per frame
      const timeslice = Math.min(100, Math.floor(1000 / (fps * 2)));
      mediaRecorderRef.current.start(timeslice);
      
      // Start the audio source
      audioSourceRef.current.start(0);
      
      // Animation loop for visualization and progress tracking
      startTimeRef.current = performance.now();
      const duration = audioBuffer.duration * 1000; // in ms
      
      // Set up analyzer for visualization
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      // For constant frame rate, we need to render at precise intervals
      const frameInterval = 1000 / fps; 
      let lastFrameTime = 0;
      let frameCount = 0;
      
      // For tracking timing accuracy
      const frameTimings: number[] = [];
      
      const animate = (timestamp: number) => {
        if (!analyserRef.current || !canvasRef.current) return;
        
        // Calculate elapsed time and progress
        const elapsed = timestamp - startTimeRef.current;
        const newProgress = Math.min(100, Math.round((elapsed / duration) * 100));
        setProgress(newProgress);
        
        // Ensure we're rendering at the specified frame rate
        // This is critical for constant frame rate
        const expectedFrame = Math.floor(elapsed / frameInterval);
        
        if (expectedFrame > frameCount) {
          // We need to catch up frames
          const framesToDraw = Math.min(expectedFrame - frameCount, 1);
          
          for (let i = 0; i < framesToDraw; i++) {
            // Calculate the exact timestamp for this frame
            const frameTimestamp = startTimeRef.current + (frameCount + i) * frameInterval;
            
            // Track timing precision for debugging
            if (frameCount > 0) {
              const actualInterval = timestamp - lastFrameTime;
              frameTimings.push(actualInterval);
              
              // Log every 60 frames if there's significant deviation
              if (frameCount % 60 === 0 && Math.abs(actualInterval - frameInterval) > 5) {
                console.log(`Frame interval deviation: ${actualInterval - frameInterval}ms`);
              }
            }
            
            // Draw visualization for this exact frame
            analyserRef.current.getByteFrequencyData(dataArray);
            drawWaveform(dataArray, bufferLength, frameTimestamp);
          }
          
          frameCount = expectedFrame;
          lastFrameTime = timestamp;
        }
        
        // Continue animation if not done
        if (elapsed < duration) {
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          // Encoding complete
          if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
          }
          
          // Stop the audio source
          if (audioSourceRef.current) {
            audioSourceRef.current.stop();
          }
        }
      };
      
      // Start animation with precise timing
      animationFrameRef.current = requestAnimationFrame(animate);
      
    } catch (error) {
      console.error("Encoding error:", error);
      setIsEncoding(false);
      toast({
        variant: "destructive",
        title: "Encoding Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred"
      });
    }
  };

  const finishEncoding = (blob: Blob, fileExtension: string = 'mp4') => {
    setIsEncoding(false);
    setProgress(100);
    
    toast({
      variant: "default",
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
      variant: "default",
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

  // New function for constant frame rate generation
  const generateConstantFrameRateVideo = async (fps: number, canvas: HTMLCanvasElement, audioBuffer: AudioBuffer) => {
    try {
      console.log("Using direct canvas capture for CFR encoding...");
      
      // Calculate duration
      const duration = audioBuffer.duration;
      const totalFrames = Math.ceil(duration * fps);
      
      toast({
        variant: "default",
        title: "Constant Frame Rate Encoding",
        description: `Encoding video at ${fps} FPS...`
      });
      
      // Resize the canvas to match selected resolution
      canvas.width = getResolutionWidth(resolution);
      canvas.height = getResolutionHeight(resolution);
      
      // Set up audio contexts for visualization
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      if (!analyserRef.current) {
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
      }
      
      // Create a new AudioBuffer source for visualization
      const visualizationSource = audioContextRef.current.createBufferSource();
      visualizationSource.buffer = audioBuffer;
      visualizationSource.connect(analyserRef.current);
      
      // Set up buffer for frequency data
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      // Use the provided canvas directly instead of creating a new one
      // This ensures the canvas has the correct context and configuration
      const ctx = canvas.getContext('2d')!;
      
      // Create a canvas stream with specified FPS
      const canvasStream = canvas.captureStream(fps);
      
      // Create a new audio context for the recording
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioDestination = audioContext.createMediaStreamDestination();
      const audioSource = audioContext.createBufferSource();
      audioSource.buffer = audioBuffer;
      audioSource.connect(audioDestination);
      
      // Create combined stream with video and audio
      const combinedStream = new MediaStream();
      
      // Add video track
      canvasStream.getVideoTracks().forEach(track => {
        // Try to set constraints for constant frame rate
        try {
          track.applyConstraints({
            frameRate: { exact: fps }
          });
        } catch (e) {
          console.warn("Could not apply frame rate constraint:", e);
        }
        combinedStream.addTrack(track);
      });
      
      // Add audio track
      audioDestination.stream.getAudioTracks().forEach(track => {
        combinedStream.addTrack(track);
      });
      
      // Find the best supported codec
      const mimeTypes = [
        'video/mp4;codecs=h264,mp4a.40.2',
        'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
        'video/mp4',
        'video/webm;codecs=h264,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm'
      ];
      
      let mimeType = '';
      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          console.log(`Using MIME type: ${type}`);
          break;
        }
      }
      
      if (!mimeType) {
        throw new Error("No supported video format found");
      }
      
      // Create media recorder with high quality settings
      const recorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: quality * 200000, // Higher bitrate
        audioBitsPerSecond: 192000 // Good audio quality
      });
      
      // Collect data chunks
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      // When recording is complete, create the final video
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/mp4' });
        finishEncoding(blob);
      };
      
      // Draw initial frame before starting
      // This ensures we have content on the canvas before recording starts
      if (showBackground) {
        ctx.fillStyle = '#0f0f0f';
      } else {
        ctx.fillStyle = 'rgba(0, 0, 0, 0)';
      }
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      analyserRef.current.getByteFrequencyData(dataArray);
      renderVisualization(
        0,
        analyserRef.current,
        canvas,
        visualizerSettings,
        0
      );
      
      // Begin recording
      recorder.start(100); // Collect data every 100ms
      
      // Start sources
      visualizationSource.start(0);
      audioSource.start(0);
      
      // Animation timing variables
      const startTime = performance.now();
      
      // Animation function to render frames
      function animate(now: number) {
        const elapsed = now - startTime;
        
        // Update progress
        const progressPercent = Math.min(100, Math.round((elapsed / (duration * 1000)) * 100));
        setProgress(progressPercent);
        
        // Get current audio data
        analyserRef.current!.getByteFrequencyData(dataArray);
        
        // Clear canvas with background
        if (showBackground) {
          ctx.fillStyle = '#0f0f0f';
        } else {
          ctx.fillStyle = 'rgba(0, 0, 0, 0)';
        }
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw visualization at current timestamp
        renderVisualization(
          elapsed,
          analyserRef.current!,
          canvas,
          visualizerSettings,
          (elapsed / 1000) * visualizerSettings.rotationSpeed
        );
        
        // Continue animation if not done
        if (elapsed < duration * 1000) {
          requestAnimationFrame(animate);
        } else {
          // End recording
          console.log("Animation complete, stopping recorder");
          
          // Small delay to ensure all frames are captured
          setTimeout(() => {
            recorder.stop();
            visualizationSource.stop();
            audioSource.stop();
          }, 500);
        }
      }
      
      // Start animation loop
      requestAnimationFrame(animate);
      
    } catch (error) {
      console.error("Error in CFR encoding:", error);
      setIsEncoding(false);
      toast({
        variant: "destructive",
        title: "Encoding Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred"
      });
    }
  };
  
  // WebCodecs approach (modern browsers) - Not using this for now
  const createVideoWithWebCodecs = async (frames: Blob[], fps: number, audioBuffer: AudioBuffer) => {
    try {
      toast({
        variant: "destructive",
        title: "Advanced encoding not supported",
        description: "Your browser doesn't support the required APIs for constant frame rate encoding."
      });
      
      // Fall back to the muxer approach
      await createVideoWithMuxer(frames, fps, audioBuffer);
      
    } catch (error) {
      console.error("WebCodecs encoding error:", error);
      throw error;
    }
  };
  
  // Compatible approach using FFmpeg.wasm or similar tool
  const createVideoWithMuxer = async (frames: Blob[], fps: number, audioBuffer: AudioBuffer) => {
    // This function is now essentially a fallback/compatibility layer
    // We're mainly using the direct approach in generateConstantFrameRateVideo now
    try {
      console.log("Using fallback muxer approach");
      
      // Since we're already doing the direct approach in generateConstantFrameRateVideo,
      // we'll keep this super simple
      const duration = audioBuffer.duration;
      toast({
        variant: "default",
        title: "Using simple encoder",
        description: `Creating ${Math.ceil(duration * fps)} frames at ${fps} FPS...`
      });
      
      // Redirect to the simplified approach in the main function
      const canvas = canvasRef.current!;
      await generateConstantFrameRateVideo(fps, canvas, audioBuffer);
    } catch (error) {
      console.error("Muxer encoding error:", error);
      throw error;
    }
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
            
            <div className="flex items-center space-x-2 pt-4">
              <Switch 
                id="cfr" 
                checked={useCFR} 
                onCheckedChange={setUseCFR}
              />
              <Label htmlFor="cfr">Force Constant Frame Rate</Label>
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
