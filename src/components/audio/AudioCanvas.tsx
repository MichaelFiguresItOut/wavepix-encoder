
import React, { useRef, useEffect } from "react";
import { renderVisualization } from "@/utils/visualizationRenderer";
import { VisualizerSettings } from "@/hooks/useAudioVisualization";

interface AudioCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  audioBuffer: AudioBuffer | null;
}

const AudioCanvas: React.FC<AudioCanvasProps> = ({ canvasRef, audioBuffer }) => {
  return (
    <canvas
      ref={canvasRef}
      className="w-full"
      width={800}
      height={300}
    />
  );
};

export default AudioCanvas;
