
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { VisualizerSettings } from "@/hooks/useAudioVisualization";
import AudioCanvas from "@/components/audio/AudioCanvas";
import AudioTimeline from "@/components/audio/AudioTimeline";
import StatusIndicators from "@/components/audio/StatusIndicators";
import NoAudioPlaceholder from "@/components/audio/NoAudioPlaceholder";
import { useAudioPlayer } from "@/components/audio/useAudioPlayer";

interface PreviewPanelProps {
  audioBuffer: AudioBuffer | null;
  isPlaying: boolean;
  settings: VisualizerSettings;
}

const PreviewPanel: React.FC<PreviewPanelProps> = ({ 
  audioBuffer, 
  isPlaying,
  settings
}) => {
  const {
    canvasRef,
    currentTime,
    duration,
    seeking,
    isPaused,
    handleSeek,
    handleSeekEnd
  } = useAudioPlayer({
    audioBuffer,
    isPlaying,
    settings
  });

  return (
    <div className="space-y-4">
      <Card className="w-full glass-panel overflow-hidden">
        <CardContent className="p-0">
          <div className="relative w-full bg-gradient-to-b from-black/80 to-black">
            <AudioCanvas 
              canvasRef={canvasRef} 
              audioBuffer={audioBuffer}
            />
            
            {!audioBuffer && <NoAudioPlaceholder />}
            
            <StatusIndicators 
              isPaused={isPaused} 
              isAudioLoaded={!!audioBuffer}
            />
          </div>
        </CardContent>
      </Card>
      
      {/* Audio playback progress slider - moved outside and below the preview panel */}
      {audioBuffer && (
        <AudioTimeline
          currentTime={currentTime}
          duration={duration}
          onSeek={handleSeek}
          onSeekEnd={handleSeekEnd}
        />
      )}
    </div>
  );
};

export default PreviewPanel;
