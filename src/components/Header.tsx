
import React from "react";
import { AudioWaveform } from "lucide-react";

const Header = () => {
  return (
    <header className="w-full flex items-center justify-between p-4 border-b border-white/10">
      <div className="flex items-center space-x-2">
        <AudioWaveform className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-semibold tracking-tight">WavePix</h1>
      </div>
      <div className="text-xs text-muted-foreground">Audio Visualizer & Encoder</div>
    </header>
  );
};

export default Header;
