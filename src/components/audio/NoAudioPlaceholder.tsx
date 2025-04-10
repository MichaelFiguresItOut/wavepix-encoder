
import React from "react";

interface NoAudioPlaceholderProps {
  message?: string;
}

const NoAudioPlaceholder: React.FC<NoAudioPlaceholderProps> = ({ 
  message = "Upload an audio file and press play to preview the visualization" 
}) => {
  return (
    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-center p-4">
      {message}
    </div>
  );
};

export default NoAudioPlaceholder;
