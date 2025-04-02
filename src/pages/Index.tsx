
import React, { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AudioUploader from "@/components/AudioUploader";
import WaveformVisualizer from "@/components/WaveformVisualizer";
import EncodingPanel from "@/components/EncodingPanel";
import { VisualizerSettings } from "@/hooks/useAudioVisualization";

const Index = () => {
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Add visualization settings state at the top level
  const [visualizerSettings, setVisualizerSettings] = useState<VisualizerSettings>({
    type: "bars",
    barWidth: 5,
    color: "#3B82F6",
    sensitivity: 1.5,
    smoothing: 0.5,
    showMirror: false,
    rotationSpeed: 0.2,
    orientation: "horizontal"
  });

  const handleAudioLoaded = (file: File, buffer: AudioBuffer) => {
    setAudioFile(file);
    setAudioBuffer(buffer);
  };

  const handlePlayPauseToggle = () => {
    setIsPlaying(!isPlaying);
  };
  
  // Handler for visualization settings updates
  const handleVisualizerSettingsChange = (newSettings: VisualizerSettings) => {
    setVisualizerSettings(newSettings);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-zinc-900 to-black text-white">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6 animate-fade-in">
            <AudioUploader onAudioLoaded={handleAudioLoaded} />
            <WaveformVisualizer 
              audioBuffer={audioBuffer} 
              isPlaying={isPlaying} 
              settings={visualizerSettings}
              onSettingsChange={handleVisualizerSettingsChange}
            />
          </div>
          
          {/* Right Column */}
          <div className="space-y-6 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <EncodingPanel 
              audioBuffer={audioBuffer} 
              isPlaying={isPlaying} 
              onPlayPauseToggle={handlePlayPauseToggle} 
              visualizerSettings={visualizerSettings}
            />
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;
