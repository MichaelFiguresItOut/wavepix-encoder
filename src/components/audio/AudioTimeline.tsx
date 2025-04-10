
import React, { useState } from "react";

interface AudioTimelineProps {
  currentTime: number;
  duration: number;
  onSeek: (value: number[]) => void;
  onSeekEnd: () => void;
}

const AudioTimeline: React.FC<AudioTimelineProps> = ({
  currentTime,
  duration,
  onSeek,
  onSeekEnd
}) => {
  // Format time in MM:SS format
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-2 bg-black/50 backdrop-blur-sm rounded-lg">
      <div className="flex items-center gap-2 w-full">
        <span className="text-xs text-white/70 min-w-[40px]">
          {formatTime(currentTime)}
        </span>
        <div className="flex-1">
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.01}
            value={currentTime}
            onChange={(e) => onSeek([parseFloat(e.target.value)])}
            onMouseUp={onSeekEnd}
            onTouchEnd={onSeekEnd}
            className="w-full h-2 bg-secondary rounded-full appearance-none cursor-pointer"
          />
        </div>
        <span className="text-xs text-white/70 min-w-[40px] text-right">
          {formatTime(duration || 0)}
        </span>
      </div>
    </div>
  );
};

export default AudioTimeline;
