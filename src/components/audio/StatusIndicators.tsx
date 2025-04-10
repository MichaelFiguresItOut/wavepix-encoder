
import React from "react";

interface StatusIndicatorsProps {
  isPaused: boolean;
  isAudioLoaded: boolean;
}

const StatusIndicators: React.FC<StatusIndicatorsProps> = ({ isPaused, isAudioLoaded }) => {
  return (
    <>
      {/* Subtle looping indicator */}
      {isAudioLoaded && (
        <div className="absolute bottom-2 right-2 text-xs text-white/30 flex items-center">
          <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 14L4 9L9 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M20 20V13C20 11.9391 19.5786 10.9217 18.8284 10.1716C18.0783 9.42143 17.0609 9 16 9H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M15 14L20 9L15 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M4 4V11C4 12.0609 4.42143 13.0783 5.17157 13.8284C5.92172 14.5786 6.93913 15 8 15H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Loop enabled
        </div>
      )}
      
      {/* Pause indicator overlay */}
      {isAudioLoaded && isPaused && (
        <div className="absolute top-2 left-2 text-xs text-white/50 flex items-center bg-black/20 rounded px-2 py-1">
          <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" />
            <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" />
          </svg>
          Paused
        </div>
      )}
    </>
  );
};

export default StatusIndicators;
