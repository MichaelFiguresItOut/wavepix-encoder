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
// Import the MODIFIED renderVisualization function
import { renderVisualization } from "@/utils/visualizationRenderer";
import MP4Box, { MP4File, MP4Info, MP4Sample } from 'mp4box';

// Helper function to check WebCodecs support
const checkWebCodecsSupport = async (config: VideoEncoderConfig | AudioEncoderConfig, type: 'video' | 'audio') => {
  try {
    if (type === 'video') {
      return await globalThis.VideoEncoder.isConfigSupported(config as VideoEncoderConfig);
    } else {
      return await globalThis.AudioEncoder.isConfigSupported(config as AudioEncoderConfig);
    }
  } catch (e) {
    console.error(`Error checking ${type} codec support:`, e);
    return false;
  }
};

// --- Pre-analysis Function (Same as before) ---
async function analyzeAudioOffline(
    audioBuffer: AudioBuffer,
    fps: number,
    fftSize: number,
    onProgress: (percent: number) => void
): Promise<{ frequencyDataPerFrame: Uint8Array[] }> {
    return new Promise(async (resolve, reject) => {
        console.log(`Starting offline analysis: ${audioBuffer.duration}s, ${fps}fps, fftSize ${fftSize}`);
        onProgress(0);
        try {
            const durationSec = audioBuffer.duration; if (!durationSec || durationSec <= 0) return reject(new Error("Invalid audio buffer duration"));
            const totalFrames = Math.ceil(durationSec * fps); if (totalFrames <= 0) return reject(new Error("Calculated total frames is zero or less"));
            const frameTimes = Array.from({ length: totalFrames }, (_, i) => (i + 0.5) / fps); const frequencyBinCount = fftSize / 2;
            const frequencyDataPerFrame: Uint8Array[] = new Array(totalFrames); let nextFrameIndex = 0; let lastReportedProgress = -1;
            // @ts-ignore
            const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext; if (!OfflineCtx) return reject(new Error("OfflineAudioContext is not supported"));
            const offlineCtx = new OfflineCtx(audioBuffer.numberOfChannels, audioBuffer.length, audioBuffer.sampleRate);
            const source = offlineCtx.createBufferSource(); source.buffer = audioBuffer; const analyser = offlineCtx.createAnalyser();
            analyser.fftSize = fftSize; analyser.smoothingTimeConstant = 0;
            const processorBufferSize = 4096; const processor = offlineCtx.createScriptProcessor(processorBufferSize, audioBuffer.numberOfChannels, audioBuffer.numberOfChannels);
            const tempFreqData = new Uint8Array(frequencyBinCount);
            processor.onaudioprocess = (event) => {
                const currentTime = event.playbackTime; const bufferDuration = processorBufferSize / offlineCtx.sampleRate; const chunkEndTime = currentTime + bufferDuration;
                analyser.getByteFrequencyData(tempFreqData);
                while (nextFrameIndex < frameTimes.length && frameTimes[nextFrameIndex] < chunkEndTime) {
                    if (frameTimes[nextFrameIndex] >= currentTime) { frequencyDataPerFrame[nextFrameIndex] = tempFreqData.slice(); }
                    else { frequencyDataPerFrame[nextFrameIndex] = (nextFrameIndex > 0 && frequencyDataPerFrame[nextFrameIndex - 1]) ? frequencyDataPerFrame[nextFrameIndex - 1] : new Uint8Array(frequencyBinCount).fill(0); console.warn(`Frame ${nextFrameIndex} time fallback used.`); }
                    nextFrameIndex++; const currentProgress = Math.round((nextFrameIndex / totalFrames) * 100); if(currentProgress > lastReportedProgress) { onProgress(currentProgress); lastReportedProgress = currentProgress; }
                }
            };
            source.connect(analyser); analyser.connect(processor); processor.connect(offlineCtx.destination); source.start(0); console.log("Starting offline audio analysis rendering...");
            offlineCtx.startRendering()
                .then(renderedBuffer => {
                    console.log("Offline analysis rendering finished.");
                    for(let i = nextFrameIndex; i < totalFrames; i++) { if (!frequencyDataPerFrame[i]) { console.warn(`Filling missing data for frame ${i} at the end.`); frequencyDataPerFrame[i] = (i > 0 && frequencyDataPerFrame[i-1]) ? frequencyDataPerFrame[i-1] : new Uint8Array(frequencyBinCount).fill(0); } } onProgress(100); resolve({ frequencyDataPerFrame });
                }) .catch(err => reject(new Error(`Offline audio analysis failed: ${err.message || err}`))) .finally(() => { try { source.disconnect(); analyser.disconnect(); processor.disconnect(); } catch (e) {} console.log("Offline analysis nodes disconnected."); });
        } catch (error: any) { reject(new Error(`Error setting up offline analysis: ${error.message}`)); }
    });
}
// --- End Pre-analysis Function ---


interface EncodingPanelProps { /* ... (same as before) ... */
  audioBuffer: AudioBuffer | null;
  isPlaying: boolean;
  onPlayPauseToggle: () => void;
  visualizerSettings: VisualizerSettings;
}

const EncodingPanel: React.FC<EncodingPanelProps> = ({ /* ... (same as before) ... */
  audioBuffer, isPlaying, onPlayPauseToggle, visualizerSettings
}) => {
  const [resolution, setResolution] = useState("1080p");
  const [frameRate, setFrameRate] = useState("30");
  const [quality, setQuality] = useState(80);
  const [showBackground, setShowBackground] = useState(true);
  const [isEncoding, setIsEncoding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTask, setCurrentTask] = useState("");
  const [webCodecsSupported, setWebCodecsSupported] = useState<boolean | null>(null);
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const downloadUrlRef = useRef<string>("");
  const downloadFileNameRef = useRef<string>("waveform-visualization.mp4");
  const abortControllerRef = useRef<AbortController | null>(null);
  const preAnalyzedDataRef = useRef<Uint8Array[] | null>(null);

  useEffect(() => { /* ... (WebCodecs Check - same as before) ... */
    const checkSupport = async () => {
       if (typeof globalThis.VideoEncoder === 'undefined' || typeof globalThis.AudioEncoder === 'undefined') { setWebCodecsSupported(false); return; }
      const videoConfig: VideoEncoderConfig = { codec: 'avc1.42E01E', width: 640, height: 480, framerate: 30 }; const audioConfig: AudioEncoderConfig = { codec: 'mp4a.40.2', sampleRate: 44100, numberOfChannels: 2, };
      const v = await checkWebCodecsSupport(videoConfig, 'video'); const a = await checkWebCodecsSupport(audioConfig, 'audio'); const supported = v && a; setWebCodecsSupported(supported);
      if (!supported) { toast({ variant: "destructive", title: "WebCodecs Not Fully Supported" }); } else { console.log("WebCodecs API is supported."); }
    }; checkSupport();
   }, [toast]);
  useEffect(() => { /* ... (Canvas setup - same as before) ... */
    if (!canvasRef.current) { canvasRef.current = document.createElement('canvas'); } const canvas = canvasRef.current;
    if (canvas) { canvas.width = getResolutionWidth(resolution); canvas.height = getResolutionHeight(resolution); }
  }, [resolution]);
  const getResolutionWidth = (res: string): number => { /* ... (same as before) ... */ switch (res) { case "720p": return 1280; case "1080p": return 1920; case "1440p": return 2560; case "4K": return 3840; default: return 1920; } };
  const getResolutionHeight = (res: string): number => { /* ... (same as before) ... */ switch (res) { case "720p": return 720; case "1080p": return 1080; case "1440p": return 1440; case "4K": return 2160; default: return 1080; } };

  // Updated drawFrame (same as before - takes data array)
  const drawFrame = (timestampMs: number, frequencyData: Uint8Array) => { /* ... (same as before) ... */
    if (!canvasRef.current) return; const canvas = canvasRef.current; const ctx = canvas.getContext('2d'); if (!ctx) return;
    const width = canvas.width; const height = canvas.height; ctx.fillStyle = showBackground ? '#0f0f0f' : 'rgba(0, 0, 0, 0)'; ctx.fillRect(0, 0, width, height);
    renderVisualization(timestampMs, frequencyData, canvas, visualizerSettings, (timestampMs / 1000) * visualizerSettings.rotationSpeed);
  };
  const handleAbort = () => { /* ... (same as before) ... */
    if (abortControllerRef.current) { abortControllerRef.current.abort(); console.log("Aborted."); setIsEncoding(false); setProgress(0); setCurrentTask(""); toast({ title: "Process Aborted" }); }
   };

  // --- UPDATED handleEncode with Hardware/Software toggle ---
  const handleEncode = async () => {
    if (!audioBuffer) { toast({ variant: "destructive", title: "No audio loaded" }); return; }
    if (isEncoding) return;
    if (webCodecsSupported === false) { toast({ variant: "destructive", title: "WebCodecs Not Supported" }); return; }

    // ***** SWITCH BETWEEN HARDWARE/SOFTWARE FOR TESTING *****
    const useHardwareAcceleration = true; // SET TO `true` TO TEST HARDWARE, `false` TO TEST SOFTWARE
    // *********************************************************

    setIsEncoding(true); setProgress(0); setCurrentTask("Initializing...");
    if (downloadUrlRef.current) URL.revokeObjectURL(downloadUrlRef.current); downloadUrlRef.current = "";
    abortControllerRef.current = new AbortController(); const signal = abortControllerRef.current.signal;
    let videoEncoder: VideoEncoder | null = null; let audioEncoder: AudioEncoder | null = null;
    let mp4file: MP4File | null = null; preAnalyzedDataRef.current = null;

    try {
      // === 1. Pre-analyze Audio (Same as before) ===
      const analysisFftSize = visualizerSettings.fftSize || 256; const targetFps = parseInt(frameRate, 10);
      setCurrentTask("Analyzing Audio"); toast({ title: "Analyzing Audio...", description: "Preparing data..." }); console.log("Starting pre-analysis...");
      const analysisResult = await analyzeAudioOffline(audioBuffer, targetFps, analysisFftSize, (p) => { if(currentTask === "Analyzing Audio") setProgress(p); });
      preAnalyzedDataRef.current = analysisResult.frequencyDataPerFrame; console.log(`Pre-analysis complete: ${preAnalyzedDataRef.current?.length ?? 0} frames.`);
      if (!preAnalyzedDataRef.current || preAnalyzedDataRef.current.length === 0) throw new Error("Audio pre-analysis failed.");
      if (signal.aborted) throw new Error("Aborted"); toast({ title: "Analysis Complete", description: "Starting encoding..." });
      setCurrentTask("Encoding Video"); setProgress(0);

      // === 2. Setup Encoders and MP4Box ===
      const fps = targetFps; const width = getResolutionWidth(resolution); const height = getResolutionHeight(resolution);
      const durationSec = audioBuffer.duration; const totalFrames = Math.ceil(durationSec * fps); const frameDurationUs = Math.round(1e6 / fps);

      // Determine AVC Level (Same as before)
      let avcLevel = '1F'; const pixelArea = width * height; /* ... level calculation ... */
      if (pixelArea <= 368640) avcLevel = '1E'; else if (pixelArea <= 737280) avcLevel = '1F'; else if (pixelArea <= 1658880) avcLevel = '20'; else if (pixelArea <= 3110400) avcLevel = '28'; else if (pixelArea <= 3686400) avcLevel = '29'; else if (pixelArea <= 7864320) avcLevel = '2A'; else if (pixelArea <= 16777216) avcLevel = '33'; else avcLevel = '34';
      const videoCodecString = `avc1.42E0${avcLevel}`; // Stick to Baseline for now

      // Calculate Bitrates (Same as before, maybe tweak factors here if needed)
      const qualityFactor = quality / 100; const baseBitrateFactor = 0.08; const qualityMultiplier = 3.0; const qualityOffset = 0.3;
      const baseBitrate = width * height * fps * baseBitrateFactor; const videoBitrate = Math.round(baseBitrate * (qualityOffset + qualityFactor * qualityMultiplier));
      const audioBitrate = 128_000;

      // --- Define Base Config ---
      const baseVideoConfig: Omit<VideoEncoderConfig, 'codec'> & { codec: string } = { // Use Omit for clarity
          codec: videoCodecString, width, height, framerate: fps, bitrate: videoBitrate, latencyMode: "quality"
      };

      // --- Create Hardware/Software Variants ---
      const videoConfig_Hardware: VideoEncoderConfig = { ...baseVideoConfig, hardwareAcceleration: "prefer-hardware" };
      const videoConfig_Software: VideoEncoderConfig = { ...baseVideoConfig, hardwareAcceleration: "prefer-software" };

      // --- Select the final config based on the toggle ---
      const finalVideoConfig = useHardwareAcceleration ? videoConfig_Hardware : videoConfig_Software;

      // Audio Config (Same as before)
      const audioConfig: AudioEncoderConfig = { codec: 'mp4a.40.2', sampleRate: audioBuffer.sampleRate, numberOfChannels: audioBuffer.numberOfChannels, bitrate: audioBitrate };

      // --- Logging Block (UPDATED) ---
      console.log(`--- Encoding Config ---`);
      console.log(`Resolution: ${width}x${height}`); console.log(`FPS: ${fps}`); console.log(`Quality Setting: ${quality}%`);
      console.log(`Calculated Target Video Bitrate: ${videoBitrate} bps (~${(videoBitrate/1e6).toFixed(2)} Mbps)`);
      console.log(`AVC Codec String: ${finalVideoConfig.codec}`);
      console.log(`Hardware Acceleration Mode: ${finalVideoConfig.hardwareAcceleration}`); // Log the selected mode
      console.log(`Audio Bitrate: ${audioConfig.bitrate}`);
      console.log(`-----------------------`);
      // Check support again RIGHT BEFORE configuring
      const finalVSupport = await checkWebCodecsSupport(finalVideoConfig, 'video'); // Use finalVideoConfig
      const finalASupport = await checkWebCodecsSupport(audioConfig, 'audio');
      console.log(`Final Support Check: Video=${finalVSupport}, Audio=${finalASupport}`);
      if (!finalVSupport || !finalASupport) { const reason = !finalVSupport ? `Final check failed for video config` : 'Final check failed for audio config'; throw new Error(`${reason}: ${JSON.stringify(!finalVSupport ? finalVideoConfig : audioConfig)}`); }
      // --- END OF LOGGING BLOCK ---

      // Initialize MP4Box & Encoders (Check support FIRST)
      mp4file = MP4Box.createFile(); let videoTrackId: number | null = null; let audioTrackId: number | null = null;
      let videoSampleCount = 0; let audioSampleCount = 0;

      videoEncoder = new VideoEncoder({ output: (c, m) => { /* ... (mp4box addTrack/addSample - same) ... */ if(signal.aborted||!mp4file)return;if(videoTrackId===null&&m?.decoderConfig){try{videoTrackId=mp4file.addTrack({width,height,timescale:1e6,duration:Math.round(durationSec*1e6),nb_samples:totalFrames,hdlr:'vide',name:'Video',type:'avc1',avcDecoderConfigRecord:m.decoderConfig.description});}catch(e:any){console.error("Add VT error",e);handleAbort();}}if(videoTrackId!==null&&c.byteLength>0){try{const d=new Uint8Array(c.byteLength);c.copyTo(d);mp4file.addSample(videoTrackId,d,{duration:c.duration??frameDurationUs,dts:c.timestamp,cts:c.timestamp,is_sync:c.type==='key'});videoSampleCount++;}catch(e){console.warn("Add VS error",e);}}}, error: (e) => { console.error("VE Error",e);handleAbort(); } });
      await videoEncoder.configure(finalVideoConfig); // *** Use finalVideoConfig ***

      audioEncoder = new AudioEncoder({ output: (c, m) => { /* ... (mp4box addTrack/addSample - same) ... */ if(signal.aborted||!mp4file)return;if(audioTrackId===null&&m?.decoderConfig){try{audioTrackId=mp4file.addTrack({timescale:1e6,media_duration:Math.round(durationSec*1e6),duration:Math.round(durationSec*1e6),samplerate:audioBuffer.sampleRate,channel_count:audioBuffer.numberOfChannels,hdlr:'soun',name:'Audio',type:'mp4a'});const t=mp4file.getTrackById(audioTrackId);if(t?.mdia?.minf?.stbl?.stsd){const b=t.mdia.minf.stbl.stsd.entries[0];/*@ts-ignore*/b.aacDecoderConfigRecord=m.decoderConfig.description;/*@ts-ignore*/b.type='mp4a';}}catch(e:any){console.error("Add AT error",e);handleAbort();}}if(audioTrackId!==null&&c.byteLength>0){try{const d=new Uint8Array(c.byteLength);c.copyTo(d);mp4file.addSample(audioTrackId,d,{duration:c.duration??0,dts:c.timestamp,cts:c.timestamp,is_sync:c.type==='key'});audioSampleCount++;}catch(e){console.warn("Add AS error",e);}}}, error: (e) => { console.error("AE Error",e);handleAbort(); } });
      await audioEncoder.configure(audioConfig);


      // === 3. Encoding Loop using Pre-analyzed Data (Same as before) ===
      console.log("Starting frame generation loop..."); const encodingProgressScale = 85; const canvas = canvasRef.current; if (!canvas) throw new Error("Canvas N/A");
      for (let i = 0; i < totalFrames; i++) { /* ... (drawFrame, create VideoFrame, encode, update progress, yield - same) ... */
        if (signal.aborted) throw new Error("Aborted"); const frameTimestampUs = i * frameDurationUs; const frameTimestampMs = frameTimestampUs / 1000;
        const freqData = preAnalyzedDataRef.current?.[i]; if (!freqData) { console.warn(`Missing Freq ${i}`); const zero = new Uint8Array((analysisFftSize/2)).fill(0); drawFrame(frameTimestampMs, zero); } else { drawFrame(frameTimestampMs, freqData); }
        const videoFrame = new VideoFrame(canvas, { timestamp: frameTimestampUs, duration: frameDurationUs }); if (videoEncoder.state !== 'configured') { console.warn("VE not configured"); videoFrame.close(); continue; }
        if (videoEncoder.encodeQueueSize > 30) { console.warn("VE Q high"); await videoEncoder.flush(); if (signal.aborted) throw new Error("Aborted"); } videoEncoder.encode(videoFrame); videoFrame.close();
        if(currentTask === "Encoding Video") setProgress(Math.round(((i + 1) / totalFrames) * encodingProgressScale)); if (i % 15 === 0) { await new Promise(r=>setTimeout(r,0)); if (signal.aborted) throw new Error("Aborted"); }
      } console.log("Frame generation complete.");

      // === 4. Encode Full Audio Track (Same as before) ===
      setCurrentTask("Encoding Audio"); console.log("Encoding audio..."); const audioProgressScale = 10; const audioProgressOffset = encodingProgressScale; /* ... (audio loop, encode, update progress, yield - same) ... */
      const audioSR = audioBuffer.sampleRate; const numCh = audioBuffer.numberOfChannels; const totalAS = audioBuffer.length; const chunkSec = 0.5; const chunkFrames = Math.round(chunkSec * audioSR); const audioFmt:AudioSampleFormat = 'f32-planar';
      for(let off=0; off<totalAS; off+=chunkFrames) { if(signal.aborted) throw new Error("Aborted"); const end=Math.min(off+chunkFrames, totalAS); const len=end-off; const tsUs=Math.round((off/audioSR)*1e6);
      if(len>0&&audioEncoder){ const pData=new Float32Array(len*numCh); for(let ch=0;ch<numCh;++ch){const cData=audioBuffer.getChannelData(ch).slice(off,end);pData.set(cData,ch*len);} const aData=new AudioData({format:audioFmt,sampleRate:audioSR,numberOfFrames:len,numberOfChannels:numCh,timestamp:tsUs,data:pData});
      if(audioEncoder.state!=='configured'){console.warn("AE not configured");aData.close();continue;} if(audioEncoder.encodeQueueSize>30){console.warn("AE Q high");await audioEncoder.flush();if(signal.aborted)throw new Error("Aborted");} audioEncoder.encode(aData);aData.close();
      if(currentTask==="Encoding Audio")setProgress(audioProgressOffset+Math.round((off/totalAS)*audioProgressScale));} if(off%(chunkFrames*10)===0){await new Promise(r=>setTimeout(r,0));if(signal.aborted)throw new Error("Aborted");}} console.log("Audio encoding initiated.");

      // === 5. Flush Encoders (Same as before) ===
      setCurrentTask("Finalizing"); console.log("Flushing..."); /* ... (flush, check abort, log counts, set progress) ... */
      await Promise.all([ videoEncoder?.state==='configured'?videoEncoder.flush():Promise.resolve(), audioEncoder?.state==='configured'?audioEncoder.flush():Promise.resolve() ]); if (signal.aborted) throw new Error("Aborted"); console.log(`Flushed. Samples: V=${videoSampleCount}, A=${audioSampleCount}`); setProgress(98);

      // === 6. Finalize MP4Box (Same as before) ===
      console.log("Finalizing MP4..."); /* ... (flush mp4box, get buffer, check size, create blob) ... */
      if (!mp4file) throw new Error("MP4Box null"); mp4file.flush(); const buffer = mp4file.getBuffer(); if (!buffer || buffer.byteLength === 0) { throw new Error("MP4Box buffer empty."); } console.log(`MP4 size: ${(buffer.byteLength/1024/1024).toFixed(2)} MB`); const blob = new Blob([buffer], { type: 'video/mp4' });
      finishEncoding(blob); // Sets progress 100

    } catch (error: any) { /* ... (Error handling - same as before) ... */
      console.error("Encoding process error:", error); if (error.message?.includes("Aborted")) { console.log("Caught intentional abort."); } else if (!signal?.aborted) { toast({ variant: "destructive", title: "Encoding Failed", description: error.message ?? "Unknown error." }); } setIsEncoding(false); setProgress(0); setCurrentTask("");
    } finally { /* ... (Cleanup - same as before) ... */
      console.log("Cleaning up..."); try { if (videoEncoder && videoEncoder.state !== "closed") videoEncoder.close(); } catch(e){} try { if (audioEncoder && audioEncoder.state !== "closed") audioEncoder.close(); } catch(e){} mp4file = null; preAnalyzedDataRef.current = null; abortControllerRef.current = null; if (currentTask !== "Complete") setCurrentTask(""); console.log("Cleanup complete.");
    }
  };

  const finishEncoding = (blob: Blob, fileExtension: string = 'mp4') => { /* ... (same as before) ... */
     setIsEncoding(false); setProgress(100); setCurrentTask("Complete"); toast({ variant: "default", title: "Encoding complete" }); if (downloadUrlRef.current) URL.revokeObjectURL(downloadUrlRef.current); const url = URL.createObjectURL(blob); downloadUrlRef.current = url; downloadFileNameRef.current = `viz-${resolution}-${frameRate}fps.${fileExtension}`; toast({ variant: "default", title: "Download ready" });
  };
  const handleDownload = () => { /* ... (same as before) ... */
     if (!downloadUrlRef.current) { toast({ variant: "destructive", title: "No video available" }); return; } const a = document.createElement('a'); a.href = downloadUrlRef.current; a.download = downloadFileNameRef.current; document.body.appendChild(a); a.click(); document.body.removeChild(a); toast({ title: "Download started" });
  };

  // --- JSX Return (Same as before) ---
  return (
    <Card className="w-full encoder-section">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Video className="h-5 w-5 text-primary" /> Encoding Options
        </CardTitle>
        <CardDescription>Creates CFR video using WebCodecs & Pre-analysis</CardDescription>
      </CardHeader>
      <CardContent>
          {webCodecsSupported === false && ( <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-md text-sm flex items-center gap-2"> <AlertTriangle className="h-5 w-5 text-destructive" /> <span>WebCodecs not supported. CFR encoding disabled.</span> </div> )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="space-y-4"> <div className="space-y-2"> <Label htmlFor="resolution-select">Resolution</Label> <Select value={resolution} onValueChange={setResolution} disabled={isEncoding}> <SelectTrigger id="resolution-select"><SelectValue /></SelectTrigger> <SelectContent><SelectItem value="720p">720p (1280×720)</SelectItem><SelectItem value="1080p">1080p (1920×1080)</SelectItem><SelectItem value="1440p">1440p (2560×1440)</SelectItem><SelectItem value="4K">4K (3840×2160)</SelectItem></SelectContent> </Select> </div> <div className="space-y-2"> <Label htmlFor="framerate-select">Frame Rate (FPS)</Label> <Select value={frameRate} onValueChange={setFrameRate} disabled={isEncoding}> <SelectTrigger id="framerate-select"><SelectValue /></SelectTrigger> <SelectContent><SelectItem value="24">24</SelectItem><SelectItem value="30">30</SelectItem><SelectItem value="60">60</SelectItem></SelectContent> </Select> </div> </div>
          <div className="space-y-4"> <div className="space-y-2"> <div className="flex items-center justify-between"><Label htmlFor="quality-slider">Quality: {quality}%</Label></div> <Slider id="quality-slider" min={10} max={100} step={1} value={[quality]} onValueChange={([v]) => setQuality(v)} disabled={isEncoding}/> </div> <div className="flex items-center space-x-2 pt-4"> <Switch id="background" checked={showBackground} onCheckedChange={setShowBackground} disabled={isEncoding}/> <Label htmlFor="background">Include Background</Label> </div> </div>
        </div>
        {isEncoding && (
          <div className="mt-6 space-y-2">
            <div className="flex justify-between text-sm font-medium"> <span>{currentTask}...</span> <span>{progress}%</span> </div> <Progress value={progress} className="h-2" />
             <Button variant="outline" size="sm" onClick={handleAbort} className="mt-2"> Cancel </Button>
          </div> )}
      </CardContent>
      <CardFooter className="flex flex-wrap justify-between gap-y-4 pt-4">
        <Button variant="outline" onClick={onPlayPauseToggle} disabled={!audioBuffer || isEncoding} className="flex items-center gap-2"> {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />} {isPlaying ? "Pause Preview" : "Play Preview"} </Button>
        <div className="flex gap-2 flex-wrap">
          <Button variant="default" onClick={handleEncode} disabled={!audioBuffer || isEncoding || webCodecsSupported === false} className="flex items-center gap-2" title={webCodecsSupported === false ? "WebCodecs not supported" : "Start encoding"}> <Video className="h-4 w-4" /> {isEncoding ? `${currentTask}...` : "Encode Video (CFR)"} </Button>
          <Button variant="outline" onClick={handleDownload} disabled={isEncoding || !downloadUrlRef.current} className="flex items-center gap-2"> <Download className="h-4 w-4" /> Download </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default EncodingPanel;