
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AudioWaveform } from "lucide-react";
import { VisualizerSettings } from "@/hooks/useAudioVisualization";
import VisualizationCanvas from "./visualization/VisualizationCanvas";
import VisualizationSettings from "./visualization/VisualizationSettings";
import { useIsMobile } from "@/hooks/use-mobile";

interface WaveformVisualizerProps {
  audioBuffer: AudioBuffer | null;
  isPlaying: boolean;
  onSettingsChange: (settings: VisualizerSettings) => void;
  settings: VisualizerSettings;
}

const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({ 
  audioBuffer, 
  isPlaying,
  onSettingsChange,
  settings
}) => {
  const isMobile = useIsMobile();
  const handleSettingsChange = (newSettings: VisualizerSettings) => {
    onSettingsChange(newSettings);
  };

  return (
    <Card className="w-full encoder-section">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <AudioWaveform className="h-5 w-5 text-primary" />
          Audio Visualization
        </CardTitle>
        <CardDescription>Visualize and customize your audio</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Adjust visualization canvas height based on device */}
          <div className={isMobile ? "h-[250px]" : "h-[400px]"}>
            <VisualizationCanvas 
              audioBuffer={audioBuffer}
              isPlaying={isPlaying}
              settings={settings}
            />
          </div>
          
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
