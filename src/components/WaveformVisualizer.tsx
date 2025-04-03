
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AudioWaveform, Play, Pause } from "lucide-react";
import { VisualizerSettings } from "@/hooks/useAudioVisualization";
import VisualizationCanvas from "./visualization/VisualizationCanvas";
import VisualizationSettings from "./visualization/VisualizationSettings";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "./ui/button";

interface WaveformVisualizerProps {
  audioBuffer: AudioBuffer | null;
  isPlaying: boolean;
  onSettingsChange: (settings: VisualizerSettings) => void;
  settings: VisualizerSettings;
  onPlayPauseToggle: () => void;
}

const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({ 
  audioBuffer, 
  isPlaying,
  onSettingsChange,
  settings,
  onPlayPauseToggle
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
          {/* Visualization Canvas with Play Button */}
          <div className="space-y-2">
            <div className={isMobile ? "h-[250px]" : "h-[400px]"}>
              <VisualizationCanvas 
                audioBuffer={audioBuffer}
                isPlaying={isPlaying}
                settings={settings}
              />
            </div>
            
            {/* Play Preview Button */}
            <div className="flex justify-center">
              <Button
                onClick={onPlayPauseToggle}
                className="w-full md:w-auto"
                disabled={!audioBuffer}
                variant="default"
              >
                {isPlaying ? (
                  <>
                    <Pause className="h-5 w-5 mr-2" />
                    Pause Preview
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5 mr-2" />
                    Play Preview
                  </>
                )}
              </Button>
            </div>
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
