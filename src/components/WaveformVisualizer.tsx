
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AudioWaveform } from "lucide-react";
import { VisualizerSettings } from "@/hooks/useAudioVisualization";
import VisualizationCanvas from "./visualization/VisualizationCanvas";
import VisualizationSettings from "./visualization/VisualizationSettings";

interface WaveformVisualizerProps {
  audioBuffer: AudioBuffer | null;
  isPlaying: boolean;
  onSettingsChange: (settings: VisualizerSettings) => void; // Add this new prop
  settings: VisualizerSettings; // Add this new prop
}

const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({ 
  audioBuffer, 
  isPlaying,
  onSettingsChange, // Receive callback to update settings in parent
  settings // Receive settings from parent
}) => {
  // Remove local state since we're using props
  const handleSettingsChange = (newSettings: VisualizerSettings) => {
    onSettingsChange(newSettings);
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
          <VisualizationCanvas 
            audioBuffer={audioBuffer}
            isPlaying={isPlaying}
            settings={settings}
          />
          
          <VisualizationSettings 
            settings={settings}
            onSettingsChange={handleSettingsChange}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default WaveformVisualizer;
