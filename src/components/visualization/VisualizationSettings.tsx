
import React from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { VisualizationOrientation, VisualizerSettings } from "@/hooks/useAudioVisualization";
import { useIsMobile } from "@/hooks/use-mobile";

interface VisualizationSettingsProps {
  settings: VisualizerSettings;
  onSettingsChange: (settings: VisualizerSettings) => void;
}

const VisualizationSettings: React.FC<VisualizationSettingsProps> = ({
  settings,
  onSettingsChange
}) => {
  const isMobile = useIsMobile();
  
  const handleSettingChange = <K extends keyof VisualizerSettings>(
    key: K,
    value: VisualizerSettings[K]
  ) => {
    onSettingsChange({
      ...settings,
      [key]: value
    });
  };

  return (
    <div className={`grid grid-cols-1 ${isMobile ? "" : "md:grid-cols-2"} gap-4 md:gap-6`}>
      <div className="space-y-3 md:space-y-4">
        <div className="space-y-2">
          <Label>Visualization Type</Label>
          <Select 
            value={settings.type} 
            onValueChange={(value) => handleSettingChange("type", value as any)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select visualization type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bars">Bars</SelectItem>
              <SelectItem value="wave">Wave</SelectItem>
              <SelectItem value="circle">Circle</SelectItem>
              <SelectItem value="line">Line Animation</SelectItem>
              <SelectItem value="siri">Siri Animation</SelectItem>
              <SelectItem value="dots">Dots Animation</SelectItem>
              <SelectItem value="formation">Formation Animation</SelectItem>
              <SelectItem value="multiline">Multiline Animation</SelectItem>
              <SelectItem value="stack">Stack Animation</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label>Color</Label>
          <div className="flex items-center gap-2">
            <Input 
              type="color" 
              value={settings.color} 
              onChange={(e) => handleSettingChange("color", e.target.value)}
              className="w-12 h-10 p-1"
            />
            <Input 
              type="text" 
              value={settings.color} 
              onChange={(e) => handleSettingChange("color", e.target.value)}
              className="flex-1"
            />
          </div>
        </div>
        
        {settings.type === "circle" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Rotation Speed: {settings.rotationSpeed.toFixed(1)}</Label>
            </div>
            <Slider 
              min={0} 
              max={1} 
              step={0.1} 
              value={[settings.rotationSpeed]} 
              onValueChange={([value]) => handleSettingChange("rotationSpeed", value)}
            />
          </div>
        )}

        {/* Orientation control - more touch-friendly on mobile */}
        {settings.type !== "circle" && (
          <div className="space-y-2">
            <Label>Orientation</Label>
            <RadioGroup 
              value={settings.orientation} 
              onValueChange={(value) => handleSettingChange("orientation", value as VisualizationOrientation)}
              className={`flex ${isMobile ? "flex-col space-y-2" : "space-x-4"}`}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="horizontal" id="horizontal" />
                <Label htmlFor="horizontal" className="cursor-pointer">Horizontal</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="vertical" id="vertical" />
                <Label htmlFor="vertical" className="cursor-pointer">Vertical</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="both" id="both" />
                <Label htmlFor="both" className="cursor-pointer">Both</Label>
              </div>
            </RadioGroup>
          </div>
        )}
      </div>
      
      <div className="space-y-3 md:space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Sensitivity: {settings.sensitivity.toFixed(1)}</Label>
          </div>
          <Slider 
            min={0.1} 
            max={3} 
            step={0.1} 
            value={[settings.sensitivity]} 
            onValueChange={([value]) => handleSettingChange("sensitivity", value)}
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Smoothing: {settings.smoothing.toFixed(1)}</Label>
          </div>
          <Slider 
            min={0} 
            max={0.9} 
            step={0.1} 
            value={[settings.smoothing]} 
            onValueChange={([value]) => handleSettingChange("smoothing", value)}
          />
        </div>
        
        {settings.type === "bars" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Bar Width: {settings.barWidth}px</Label>
            </div>
            <Slider 
              min={1} 
              max={20} 
              step={1} 
              value={[settings.barWidth]} 
              onValueChange={([value]) => handleSettingChange("barWidth", value)}
            />
          </div>
        )}
        
        <div className="flex items-center space-x-2 pt-2">
          <Switch 
            id="mirror" 
            checked={settings.showMirror} 
            onCheckedChange={(checked) => handleSettingChange("showMirror", checked)}
          />
          <Label htmlFor="mirror" className="cursor-pointer">Mirrored Effect</Label>
        </div>
      </div>
    </div>
  );
};

export default VisualizationSettings;
