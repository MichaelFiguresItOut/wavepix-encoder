import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardFooter, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Video, Play, Pause, Download, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { VisualizerSettings } from "@/hooks/useAudioVisualization";
import { renderVisualization } from "@/utils/visualizationRenderer";
// Import MP4Box - make sure types are available or use 'any' if necessary
// You might need to install @types/mp4box or configure it properly
import MP4Box, { MP4File, MP4Info, MP4Sample } from 'mp4box';

// Helper function to check WebCodecs support
const checkWebCodecsSupport = async (config: VideoEncoderConfig | AudioEncoderConfig, type: 'video' | 'audio') => {
  try {
    if (type === 'video') {
      return await VideoEncoder.isConfigSupported(config as VideoEncoderConfig);
    } else {
      return await AudioEncoder.isConfigSupported(config as AudioEncoderConfig);
    }
  } catch (e) {
    console.error(`Error checking ${type} codec support:`, e);
    return false; // Indicate lack of support or error during check
  }
};

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
  const [quality, setQuality] = useState(80); // Represents percentage for bitrate calculation
  const [showBackground, setShowBackground] = useState(true);
  const [isEncoding, setIsEncoding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [useWebCodecs, setUseWebCodecs] = useState(true); // Default to WebCodecs if supported
  const [webCodecsSupported, setWebCodecsSupported] = useState<boolean | null>(null);
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const downloadUrlRef = useRef<string>("");
  const downloadFileNameRef = useRef<string>("waveform-visualization.mp4");
  const abortControllerRef = useRef<AbortController | null>(null);

  // Check WebCodecs support on mount
  useEffect(() => {
    const checkSupport = async () => {
      // Define basic configs to check support
      const videoConfig: VideoEncoderConfig = {
        codec: 'avc1.42E01E', // H.264 Baseline
        width: 640, height: 480, // Dummy dimensions
        framerate: 30
      };
      const audioConfig: AudioEncoderConfig = {
        codec: 'mp4a.40.2', // AAC-LC
        sampleRate: 44100, // Common sample rate
        numberOfChannels: 2,
      };
      const videoSupport = await checkWebCodecsSupport(videoConfig, 'video');
      const audioSupport = await checkWebCodecsSupport(audioConfig, 'audio');
      const supported = videoSupport && audioSupport;
      setWebCodecsSupported(supported);
      if (!supported) {
        setUseWebCodecs(false); // Fallback if not supported
        console.warn("WebCodecs API not fully supported. Encoding quality/reliability may be reduced.");
        toast({
          variant: "destructive",
          title: "WebCodecs Not Supported",
          description: "Your browser may not fully support WebCodecs. CFR encoding might fail or produce VFR video.",
        });
      } else {
         console.log("WebCodecs API is supported.");
      }
    };
    checkSupport();
  }, [toast]);

  // Setup canvas - moved creation logic here
  useEffect(() => {
    if (!canvasRef.current) {
      const canvas = document.createElement('canvas');
      canvasRef.current = canvas;
    }
    // Update canvas size when resolution changes
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = getResolutionWidth(resolution);
      canvas.height = getResolutionHeight(resolution);
    }
  }, [resolution]);


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

  // Simplified draw function for offline rendering
  // NOTE: This version doesn't use AnalyserNode directly for offline frame generation.
  // It relies on the timestamp to drive any time-based animations in renderVisualization.
  // If renderVisualization *strictly* needs live AnalyserNode data, it needs modification
  // or a different approach (pre-calculating visualization data).
  const drawFrame = (timestampMs: number) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Background
    ctx.fillStyle = showBackground ? '#0f0f0f' : 'rgba(0, 0, 0, 0)';
    ctx.fillRect(0, 0, width, height);

    // Pass a placeholder or null AnalyserNode if renderVisualization requires the argument
    // but doesn't strictly need its live data for offline rendering based on timestamp.
    // Adapt this if your renderVisualization requires specific data.
    const dummyAnalyser = null; // Or create a basic AnalyserNode if needed by the function signature

    renderVisualization(
      timestampMs, // Pass current frame time
      dummyAnalyser as unknown as AnalyserNode, // Adapt as needed
      canvas,
      visualizerSettings,
      (timestampMs / 1000) * visualizerSettings.rotationSpeed // Example time-based animation
    );
  };

  const handleAbort = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      console.log("Encoding aborted by user.");
      setIsEncoding(false);
      setProgress(0);
      toast({ title: "Encoding Aborted" });
    }
  };


  const handleEncode = async () => {
    if (!audioBuffer) {
      toast({ variant: "destructive", title: "No audio loaded" });
      return;
    }
    if (isEncoding) return; // Prevent multiple concurrent encodings

    if (useWebCodecs && !webCodecsSupported) {
       toast({
        variant: "destructive",
        title: "WebCodecs Required",
        description: "WebCodecs is not supported in your browser. Cannot perform CFR encoding.",
      });
       return;
    }

    setIsEncoding(true);
    setProgress(0);
    if (downloadUrlRef.current) {
        URL.revokeObjectURL(downloadUrlRef.current);
        downloadUrlRef.current = "";
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    // --- WebCodecs + mp4box.js Encoding ---
    try {
      const fps = parseInt(frameRate, 10);
      const width = getResolutionWidth(resolution);
      const height = getResolutionHeight(resolution);
      const durationSec = audioBuffer.duration;
      const totalFrames = Math.ceil(durationSec * fps);
      const frameDurationUs = Math.round(1_000_000 / fps);

      // Estimate bitrate based on resolution and quality setting (adjust factor as needed)
      const qualityFactor = quality / 100; // 0.1 to 1.0
      const baseBitrate = width * height * fps * 0.07; // Rough H.264 estimate factor
      const videoBitrate = Math.round(baseBitrate * (0.5 + qualityFactor * 1.5)); // Adjust curve
      const audioBitrate = 128_000; // AAC bitrate

      console.log(`Encoding settings: ${width}x${height} @ ${fps}fps, ${totalFrames} frames, Video Bitrate: ${videoBitrate}, Audio Bitrate: ${audioBitrate}`);

      toast({ title: "Starting CFR Encoding", description: `Using WebCodecs and mp4box.js...` });

      // 1. Configure Encoders
      let videoEncoder: VideoEncoder | null = null;
      let audioEncoder: AudioEncoder | null = null;

      const videoConfig: VideoEncoderConfig = {
        codec: 'avc1.42E01E', // H.264 Baseline profile - widely compatible
        width: width,
        height: height,
        framerate: fps,
        bitrate: videoBitrate,
        // Consider adding 'latencyMode: "quality"' if available/needed
      };

      const audioConfig: AudioEncoderConfig = {
        codec: 'mp4a.40.2', // AAC-LC
        sampleRate: audioBuffer.sampleRate,
        numberOfChannels: audioBuffer.numberOfChannels,
        bitrate: audioBitrate,
      };

      // Check support again with specific config
      const vSupport = await VideoEncoder.isConfigSupported(videoConfig);
      const aSupport = await AudioEncoder.isConfigSupported(audioConfig);
      if (!vSupport || !aSupport) {
          throw new Error(`Unsupported config: Video(${vSupport}), Audio(${aSupport})`);
      }

      // 2. Initialize MP4Box
      const mp4file = MP4Box.createFile();
      let videoTrackId: number | null = null;
      let audioTrackId: number | null = null;

      // --- Video Encoder Setup ---
      videoEncoder = new VideoEncoder({
        output: (chunk, meta) => {
          if (videoTrackId === null && meta?.decoderConfig) {
            console.log("Adding video track to MP4Box");
            videoTrackId = mp4file.addTrack({
              width: width,
              height: height,
              timescale: 1_000_000, // Use microseconds timescale
              duration: Math.round(durationSec * 1_000_000),
              media_duration: Math.round(durationSec * 1_000_000),
              nb_samples: totalFrames,
              hdlr: 'vide',
              name: 'VideoHandler',
              type: 'avc1', // Match the codec
              avcDecoderConfigRecord: meta.decoderConfig.description, // IMPORTANT
            });
          }
          if (videoTrackId !== null && chunk.byteLength > 0) {
            const sample: MP4Sample = {
              number: 0, // mp4box calculates sample number
              track_id: videoTrackId,
              description_index: 1, // Usually 1 after config
              is_sync: chunk.type === 'key',
              cts: chunk.timestamp, // Use chunk timestamp directly (microseconds)
              dts: chunk.timestamp, // Use chunk timestamp directly (microseconds)
              duration: chunk.duration ?? frameDurationUs, // Use chunk duration or calculated (microseconds)
              size: chunk.byteLength,
              data: new Uint8Array(chunk.byteLength), // mp4box expects Uint8Array data
            };
            chunk.copyTo(sample.data); // Copy data efficiently
            mp4file.addSample(videoTrackId, sample.data, { // Use the addSample variation expecting buffer
                duration: sample.duration,
                dts: sample.dts,
                cts: sample.cts,
                is_sync: sample.is_sync,
            });
          }
        },
        error: (e) => {
          console.error("VideoEncoder error:", e);
          toast({ variant: "destructive", title: "Video Encoding Error", description: e.message });
          handleAbort(); // Abort on error
        },
      });
      await videoEncoder.configure(videoConfig);

      // --- Audio Encoder Setup ---
      audioEncoder = new AudioEncoder({
        output: (chunk, meta) => {
          if (audioTrackId === null && meta?.decoderConfig) {
            console.log("Adding audio track to MP4Box");
            audioTrackId = mp4file.addTrack({
              timescale: 1_000_000, // Microseconds timescale matching video often helps
              media_duration: Math.round(durationSec * 1_000_000),
              duration: Math.round(durationSec * 1_000_000),
              samplerate: audioBuffer.sampleRate,
              channel_count: audioBuffer.numberOfChannels,
              hdlr: 'soun',
              name: 'SoundHandler',
              type: 'mp4a', // Match the codec
              aacDecoderConfigRecord: meta.decoderConfig.description, // IMPORTANT for AAC
            });
          }
           if (audioTrackId !== null && chunk.byteLength > 0) {
               const sampleData = new Uint8Array(chunk.byteLength);
               chunk.copyTo(sampleData);
               mp4file.addSample(audioTrackId, sampleData, {
                   duration: chunk.duration, // microseconds
                   dts: chunk.timestamp,     // microseconds
                   cts: chunk.timestamp,     // microseconds
                   is_sync: chunk.type === 'key', // Typically true for audio
               });
           }
        },
        error: (e) => {
          console.error("AudioEncoder error:", e);
          toast({ variant: "destructive", title: "Audio Encoding Error", description: e.message });
          handleAbort(); // Abort on error
        },
      });
      await audioEncoder.configure(audioConfig);


      // 3. Process Frames and Audio
      const canvas = canvasRef.current;
      if (!canvas) throw new Error("Canvas not available");
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Could not get canvas context");

      console.log("Starting frame generation loop...");
      for (let i = 0; i < totalFrames; i++) {
        if (signal.aborted) throw new Error("Encoding aborted");

        const frameTimestampUs = i * frameDurationUs;
        const frameTimestampMs = frameTimestampUs / 1000;

        // Draw Visualization for the current frame
        drawFrame(frameTimestampMs);

        // Create VideoFrame
        const videoFrame = new VideoFrame(canvas, {
          timestamp: frameTimestampUs, // Microseconds
          duration: frameDurationUs,  // Microseconds
        });

        // Encode Video Frame
        // Handle potential backpressure (though less likely in offline mode)
        if (videoEncoder.encodeQueueSize > 20) {
             console.warn("Video encoder queue high, waiting...");
             await videoEncoder.flush(); // Force processing
             console.warn("Video encoder queue flushed.");
        }
        videoEncoder.encode(videoFrame);
        videoFrame.close(); // Close the frame after encoding

        // Update Progress
        setProgress(Math.round(((i + 1) / totalFrames) * 95)); // Leave last 5% for flushing/muxing

        // Yield to the event loop occasionally to keep UI responsive
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
      console.log("Frame generation complete.");

      // 4. Encode Full Audio Track
      // WebCodecs works best with smaller chunks of AudioData.
      // Slice the AudioBuffer into manageable chunks.
      console.log("Encoding full audio track...");
      const audioDurationUs = durationSec * 1_000_000;
      const audioSampleRate = audioBuffer.sampleRate;
      const numChannels = audioBuffer.numberOfChannels;
      const chunkSizeSec = 0.5; // Process audio in 0.5 second chunks
      const chunkSizeSamples = Math.round(chunkSizeSec * audioSampleRate);

      for (let channel = 0; channel < numChannels; channel++) {
         const pcmData = audioBuffer.getChannelData(channel); // Float32Array

         for (let offset = 0; offset < pcmData.length; offset += chunkSizeSamples) {
            if (signal.aborted) throw new Error("Encoding aborted");

             const chunkEnd = Math.min(offset + chunkSizeSamples, pcmData.length);
             const chunk = pcmData.slice(offset, chunkEnd);
             const chunkTimestampUs = Math.round((offset / audioSampleRate) * 1_000_000);
             const chunkDurationUs = Math.round((chunk.length / audioSampleRate) * 1_000_000);

             if (chunk.length > 0) {
                 const audioData = new AudioData({
                     format: 'f32-planar', // Matches getChannelData output
                     sampleRate: audioSampleRate,
                     numberOfFrames: chunk.length,
                     numberOfChannels: 1, // Process planar data one channel at a time
                     timestamp: chunkTimestampUs, // Microseconds
                     data: chunk, // Pass the Float32Array directly
                 });

                // Handle potential backpressure
                if (audioEncoder.encodeQueueSize > 20) {
                     console.warn("Audio encoder queue high, waiting...");
                     await audioEncoder.flush();
                     console.warn("Audio encoder queue flushed.");
                }
                audioEncoder.encode(audioData);
                audioData.close();
             }
             // Yield briefly if needed
            // await new Promise(resolve => setTimeout(resolve, 0));
         }
      }
      console.log("Audio chunking and encoding initiated.");


      // 5. Flush Encoders
      console.log("Flushing encoders...");
      await Promise.all([videoEncoder.flush(), audioEncoder.flush()]);
      console.log("Encoders flushed.");
      setProgress(98);

      // 6. Finalize MP4Box File
      console.log("Finalizing MP4 file...");
      mp4file.onReady = (info: MP4Info) => {
        console.log("MP4Box ready:", info);
        // Get the buffer - mp4file.buffer is the ArrayBuffer
        const buffer = info.buffer; // Use the buffer from the onReady callback argument
        if (!buffer) {
             throw new Error("MP4Box failed to generate buffer.");
        }
        const blob = new Blob([buffer], { type: 'video/mp4' });
        finishEncoding(blob);
        // Clean up MP4Box resources if necessary (usually handled internally)
      };

      mp4file.onError = (e: any) => {
           console.error("MP4Box error:", e);
           throw new Error(`MP4Box muxing error: ${e}`);
      };

      // Some mp4box versions might need explicit save/end command
      // mp4file.save(); // Or similar method if available, check mp4box docs


    } catch (error: any) {
      console.error("Encoding process error:", error);
      if (error.message !== "Encoding aborted") { // Don't show toast if user aborted
        toast({
          variant: "destructive",
          title: "Encoding Failed",
          description: error.message ?? "An unknown error occurred during WebCodecs/MP4Box encoding."
        });
      }
      setIsEncoding(false);
      setProgress(0);
    } finally {
      // 7. Cleanup
      console.log("Cleaning up encoders...");
      // Ensure encoders are closed even if errors occurred
      try { videoEncoder?.close(); } catch(e) { console.warn("Error closing video encoder", e); }
      try { audioEncoder?.close(); } catch(e) { console.warn("Error closing audio encoder", e); }
      abortControllerRef.current = null; // Clear abort controller
       console.log("Cleanup complete.");
    }
  };


  const finishEncoding = (blob: Blob, fileExtension: string = 'mp4') => {
    setIsEncoding(false);
    setProgress(100);

    toast({
      variant: "default",
      title: "Encoding complete",
      description: "CFR video successfully encoded with WebCodecs!",
    });

    // Revoke previous URL if it exists
    if (downloadUrlRef.current) {
        URL.revokeObjectURL(downloadUrlRef.current);
    }

    const url = URL.createObjectURL(blob);
    downloadUrlRef.current = url;
    downloadFileNameRef.current = `waveform-visualization-${resolution}-${frameRate}fps.${fileExtension}`;

    toast({
      variant: "default",
      title: "Download ready",
      description: "Click the Download button to save your video.",
    });
  };

  const handleDownload = () => {
    if (!downloadUrlRef.current) {
      toast({ variant: "destructive", title: "No video available", description: "Encode a video first." });
      return;
    }

    const a = document.createElement('a');
    a.href = downloadUrlRef.current;
    a.download = downloadFileNameRef.current;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    toast({ title: "Download started" });
  };


  return (
    <Card className="w-full encoder-section">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Video className="h-5 w-5 text-primary" />
          Encoding Options
        </CardTitle>
        <CardDescription>Customize your output video settings (CFR using WebCodecs)</CardDescription>
      </CardHeader>
      <CardContent>
         {webCodecsSupported === false && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-md text-sm flex items-center gap-2">
               <AlertTriangle className="h-5 w-5 text-destructive" />
               <span>WebCodecs not fully supported. CFR encoding may fail or be unavailable.</span>
            </div>
         )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Resolution, Frame Rate */}
          <div className="space-y-4">
            {/* ... (Resolution Select - same as before) ... */}
             <div className="space-y-2">
              <Label>Resolution</Label>
              <Select value={resolution} onValueChange={setResolution} disabled={isEncoding}>
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
              <Label>Frame Rate (FPS)</Label>
              <Select value={frameRate} onValueChange={setFrameRate} disabled={isEncoding}>
                <SelectTrigger>
                  <SelectValue placeholder="Select frame rate" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24">24</SelectItem>
                  <SelectItem value="30">30</SelectItem>
                  <SelectItem value="60">60</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

           {/* Quality, Background */}
          <div className="space-y-4">
            {/* ... (Quality Slider - same as before) ... */}
             <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Quality (Bitrate Estimate): {quality}%</Label>
              </div>
              <Slider
                min={10}
                max={100}
                step={1}
                value={[quality]}
                onValueChange={([value]) => setQuality(value)}
                disabled={isEncoding}
              />
            </div>
            <div className="flex items-center space-x-2 pt-4">
              <Switch
                id="background"
                checked={showBackground}
                onCheckedChange={setShowBackground}
                disabled={isEncoding}
              />
              <Label htmlFor="background">Include Background</Label>
            </div>
             {/* Removed the CFR switch as WebCodecs is now the primary method */}
              {/* You could add it back as a fallback toggle if needed */}
          </div>
        </div>

        {isEncoding && (
          <div className="mt-6 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Encoding progress</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
             <Button variant="outline" size="sm" onClick={handleAbort} className="mt-2">
               Cancel Encoding
             </Button>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between pt-4">
        {/* Play/Pause Preview Button */}
        <Button
          variant="outline"
          onClick={onPlayPauseToggle}
          disabled={!audioBuffer || isEncoding}
          className="flex items-center gap-2"
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {isPlaying ? "Pause Preview" : "Play Preview"}
        </Button>

        {/* Encode/Download Buttons */}
        <div className="flex gap-2">
          <Button
            variant="default"
            onClick={handleEncode}
            disabled={!audioBuffer || isEncoding || webCodecsSupported === false}
            className="flex items-center gap-2"
            title={webCodecsSupported === false ? "WebCodecs not supported by browser" : "Start encoding process"}
          >
            <Video className="h-4 w-4" />
            {isEncoding ? `Encoding... (${progress}%)` : "Encode Video (CFR)"}
          </Button>

          <Button
            variant="outline"
            onClick={handleDownload}
            disabled={isEncoding || !downloadUrlRef.current}
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
