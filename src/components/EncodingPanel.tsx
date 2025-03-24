
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardFooter, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Video, Play, Pause, Download } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";

interface EncodingPanelProps {
  audioBuffer: AudioBuffer | null;
  isPlaying: boolean;
  onPlayPauseToggle: () => void;
}

const EncodingPanel: React.FC<EncodingPanelProps> = ({ 
  audioBuffer, 
  isPlaying,
  onPlayPauseToggle 
}) => {
  const [resolution, setResolution] = useState("1080p");
  const [frameRate, setFrameRate] = useState("30");
  const [quality, setQuality] = useState(80);
  const [showBackground, setShowBackground] = useState(true);
  const [isEncoding, setIsEncoding] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const handleEncode = () => {
    if (!audioBuffer) {
      toast({
        variant: "destructive",
        title: "No audio loaded",
        description: "Please upload an audio file first."
      });
      return;
    }
    
    setIsEncoding(true);
    setProgress(0);
    
    // Simulate encoding progress
    const duration = 5000; // 5 seconds for demo
    const interval = 100;
    const steps = duration / interval;
    let currentStep = 0;
    
    const progressTimer = setInterval(() => {
      currentStep++;
      const newProgress = Math.min(100, Math.round((currentStep / steps) * 100));
      setProgress(newProgress);
      
      if (newProgress >= 100) {
        clearInterval(progressTimer);
        setIsEncoding(false);
        
        toast({
          title: "Encoding complete",
          description: "Your video has been successfully encoded!"
        });
        
        // In a real application, we would trigger the download here
        // For this demo, we'll show a message about the mock functionality
        setTimeout(() => {
          toast({
            title: "Download available",
            description: "Click the Download button to save your video."
          });
        }, 1000);
      }
    }, interval);
  };

  const handleDownload = () => {
    toast({
      title: "Download started",
      description: "Your encoded video will download shortly."
    });
    
    // In a real application, we would provide the actual download link
    // This is just for demonstration purposes
    setTimeout(() => {
      toast({
        title: "Note",
        description: "This is a demo. In a complete implementation, this would download the actual encoded video file."
      });
    }, 1500);
  };

  return (
    <Card className="w-full encoder-section">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Video className="h-5 w-5 text-primary" />
          Encoding Options
        </CardTitle>
        <CardDescription>Customize your output video settings</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Resolution</Label>
              <Select value={resolution} onValueChange={setResolution}>
                <SelectTrigger>
                  <SelectValue placeholder="Select resolution" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="720p">720p (1280×720)</SelectItem>
                  <SelectItem value="1080p">1080p (1920×1080)</SelectItem>
                  <SelectItem value="1440p">1440p (2560×1440)</SelectItem>
                  <SelectItem value="4K">4K (3840×2160)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Frame Rate</Label>
              <Select value={frameRate} onValueChange={setFrameRate}>
                <SelectTrigger>
                  <SelectValue placeholder="Select frame rate" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24">24 FPS</SelectItem>
                  <SelectItem value="30">30 FPS</SelectItem>
                  <SelectItem value="60">60 FPS</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Quality: {quality}%</Label>
              </div>
              <Slider 
                min={10} 
                max={100} 
                step={1} 
                value={[quality]} 
                onValueChange={([value]) => setQuality(value)}
              />
            </div>
            
            <div className="flex items-center space-x-2 pt-4">
              <Switch 
                id="background" 
                checked={showBackground} 
                onCheckedChange={setShowBackground}
              />
              <Label htmlFor="background">Include Background</Label>
            </div>
          </div>
        </div>
        
        {isEncoding && (
          <div className="mt-6 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Encoding progress</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between pt-2">
        <Button
          variant="outline"
          onClick={onPlayPauseToggle}
          disabled={!audioBuffer || isEncoding}
          className="flex items-center gap-2"
        >
          {isPlaying ? (
            <>
              <Pause className="h-4 w-4" /> Pause Preview
            </>
          ) : (
            <>
              <Play className="h-4 w-4" /> Play Preview
            </>
          )}
        </Button>
        
        <div className="flex gap-2">
          <Button
            variant="default"
            onClick={handleEncode}
            disabled={!audioBuffer || isEncoding}
            className="flex items-center gap-2"
          >
            <Video className="h-4 w-4" />
            {isEncoding ? "Encoding..." : "Encode Video"}
          </Button>
          
          <Button
            variant="outline"
            onClick={handleDownload}
            disabled={progress < 100}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default EncodingPanel;
