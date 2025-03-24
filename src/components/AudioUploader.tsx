
import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AudioWaveform, File, Upload, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface AudioUploaderProps {
  onAudioLoaded: (file: File, audioBuffer: AudioBuffer) => void;
}

const AudioUploader: React.FC<AudioUploaderProps> = ({ onAudioLoaded }) => {
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

  const handleFileChange = async (file: File | null) => {
    if (!file) return;
    
    // Check if file is an audio file
    if (!file.type.includes("audio")) {
      toast({
        variant: "destructive",
        title: "Invalid file format",
        description: "Please upload an audio file (MP3, WAV, etc)."
      });
      return;
    }
    
    setLoading(true);
    setFileName(file.name);
    
    try {
      // Read the file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      
      // Decode audio data
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      onAudioLoaded(file, audioBuffer);
      
      toast({
        title: "Audio loaded successfully",
        description: `${file.name} is ready for visualization.`
      });
    } catch (error) {
      console.error("Error loading audio:", error);
      toast({
        variant: "destructive",
        title: "Error loading audio",
        description: "Failed to process the audio file. Please try another file."
      });
      setFileName(null);
    } finally {
      setLoading(false);
    }
  };

  const handleBrowseClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const clearFile = () => {
    setFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Card className="w-full encoder-section">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <AudioWaveform className="h-5 w-5 text-primary" />
          Audio Source
        </CardTitle>
        <CardDescription>Upload or drag & drop your audio file</CardDescription>
      </CardHeader>
      <CardContent>
        <div 
          className={`mt-2 border-2 border-dashed rounded-lg p-8 text-center ${dragging ? 'border-primary bg-primary/10' : 'border-muted hover:border-muted-foreground/50'} transition-all cursor-pointer`}
          onClick={handleBrowseClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Input 
            ref={fileInputRef}
            type="file" 
            accept="audio/*"
            className="hidden"
            onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
          />
          
          {fileName ? (
            <div className="flex items-center justify-center gap-3">
              <File className="h-5 w-5 text-primary" />
              <span className="text-sm truncate max-w-[200px]">{fileName}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  clearFile();
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {loading ? "Processing audio..." : "Click to browse or drag audio file here"}
              </p>
              <p className="text-xs text-muted-foreground/70">
                Supports MP3, WAV, AAC, OGG (max 20MB)
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AudioUploader;
