
export interface AudioProcessorOptions {
  smoothingTimeConstant?: number;
  fftSize?: number;
}

export class AudioProcessor {
  private audioContext: AudioContext;
  private analyser: AnalyserNode;
  private source: AudioBufferSourceNode | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private isPlaying = false;
  
  constructor(options: AudioProcessorOptions = {}) {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.analyser = this.audioContext.createAnalyser();
    
    this.analyser.fftSize = options.fftSize || 256;
    this.analyser.smoothingTimeConstant = options.smoothingTimeConstant || 0.8;
    
    this.analyser.connect(this.audioContext.destination);
  }
  
  async loadAudioFile(file: File): Promise<AudioBuffer> {
    const arrayBuffer = await file.arrayBuffer();
    this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    return this.audioBuffer;
  }
  
  play(): void {
    if (!this.audioBuffer) return;
    
    // Stop previous playback if any
    this.stop();
    
    // Create a new audio source
    this.source = this.audioContext.createBufferSource();
    this.source.buffer = this.audioBuffer;
    this.source.connect(this.analyser);
    this.source.start(0);
    this.isPlaying = true;
    
    // Set up end event
    this.source.onended = () => {
      this.isPlaying = false;
    };
  }
  
  stop(): void {
    if (this.source) {
      this.source.stop();
      this.source.disconnect();
      this.source = null;
    }
    this.isPlaying = false;
  }
  
  getFrequencyData(): Uint8Array {
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);
    return dataArray;
  }
  
  getTimeData(): Uint8Array {
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteTimeDomainData(dataArray);
    return dataArray;
  }
  
  setOptions(options: AudioProcessorOptions): void {
    if (options.fftSize) {
      this.analyser.fftSize = options.fftSize;
    }
    
    if (options.smoothingTimeConstant !== undefined) {
      this.analyser.smoothingTimeConstant = options.smoothingTimeConstant;
    }
  }
  
  isAudioPlaying(): boolean {
    return this.isPlaying;
  }
  
  getAudioDuration(): number {
    return this.audioBuffer ? this.audioBuffer.duration : 0;
  }
  
  getSampleRate(): number {
    return this.audioBuffer ? this.audioBuffer.sampleRate : 0;
  }
  
  getNumberOfChannels(): number {
    return this.audioBuffer ? this.audioBuffer.numberOfChannels : 0;
  }
}

export default AudioProcessor;
