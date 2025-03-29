
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AudioWaveform } from "lucide-react";
import { VisualizerSettings } from "@/hooks/useAudioVisualization";
import VisualizationCanvas from "./visualization/VisualizationCanvas";
import VisualizationSettings from "./visualization/VisualizationSettings";

interface WaveformVisualizerProps {
  audioBuffer: AudioBuffer | null;
  isPlaying: boolean;
}

const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({ 
  audioBuffer, 
  isPlaying 
}) => {
  const [settings, setSettings] = useState<VisualizerSettings>({
    type: "bars",
    barWidth: 5,
    color: "#3B82F6",
    sensitivity: 1.5,
    smoothing: 0.5,
    showMirror: false,
    rotationSpeed: 0.2
  });

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
            onSettingsChange={setSettings}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default WaveformVisualizer;
