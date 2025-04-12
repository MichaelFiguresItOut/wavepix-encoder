import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { BarPlacement, AnimationStart, VisualizerSettings } from "@/hooks/useAudioVisualization";
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

  const handleOrientationChange = (orientation: "horizontalOrientation" | "verticalOrientation", checked: boolean) => {
    // Ensure at least one orientation is enabled
    if (!checked && !settings.horizontalOrientation && orientation === "verticalOrientation") {
      onSettingsChange({
        ...settings,
        horizontalOrientation: true,
        verticalOrientation: false
      });
    } else if (!checked && !settings.verticalOrientation && orientation === "horizontalOrientation") {
      onSettingsChange({
        ...settings,
        horizontalOrientation: false,
        verticalOrientation: true
      });
    } else {
      onSettingsChange({
        ...settings,
        [orientation]: checked
      });
    }
  };

  const handleMultiSelectChange = <K extends "barPlacement" | "animationStart">(
    key: K, 
    value: K extends "barPlacement" ? BarPlacement : AnimationStart, 
    checked: boolean
  ) => {
    const currentValues = settings[key] as Array<any>;
    const newValues = checked 
      ? [...currentValues, value]
      : currentValues.filter(v => v !== value);
    
    // Ensure at least one option is selected
    if (newValues.length === 0) {
      return;
    }
    
    onSettingsChange({
      ...settings,
      [key]: newValues
    });
  };

  // Check if orientation section should be shown
  const showOrientationSection = 
    settings.type !== "circle" && 
    settings.type !== "formation" && 
    !(settings.type === "dots" && settings.showMirror) &&
    !(settings.type === "bubbles" && settings.showMirror) &&
    !(settings.type === "siri" && settings.showMirror);

  // Check if bar placement section should be shown
  const showBarPlacementSection = 
    settings.type !== "circle" && 
    settings.type !== "formation" && 
    settings.type !== "multiline" && 
    !(settings.type === "dots" && settings.showMirror) &&
    !(settings.type === "bubbles" && settings.showMirror) &&
    !(settings.type === "siri" && settings.showMirror);

  // Check if animation start section should be shown
  const showAnimationStartSection = 
    settings.type !== "circle" && 
    settings.type !== "formation" && 
    !(settings.type === "dots" && settings.showMirror) &&
    !(settings.type === "bubbles" && settings.showMirror) &&
    !(settings.type === "siri" && settings.showMirror);

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
              <SelectItem value="bubbles">Bubbles Animation</SelectItem>
              <SelectItem value="formation">Formation Animation</SelectItem>
              <SelectItem value="multiline">Multiline Animation</SelectItem>
              <SelectItem value="lightning">Lightning Animation</SelectItem>
              <SelectItem value="honeycomb">Honeycomb Animation</SelectItem>
              <SelectItem value="fire">Flame Animation</SelectItem>
              <SelectItem value="spiderweb">SpiderWeb Animation</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="color">Color</Label>
          <div className="flex items-center space-x-2">
            <Input 
              type="color" 
              id="color" 
              value={settings.color}
              onChange={(e) => handleSettingChange('color', e.target.value)}
              className="w-10 h-10 p-1"
            />
            <Input
              type="text"
              value={settings.color}
              onChange={(e) => handleSettingChange('color', e.target.value)}
              placeholder="#3B82F6"
              className="flex-grow"
            />
          </div>
        </div>

        {/* Rainbow Effect Switch */}
        { (settings.type !== 'fire') && (
          <div className="flex items-center space-x-2 pt-2">
            <Switch 
              id="rainbow" 
              checked={settings.showRainbow} 
              onCheckedChange={(checked) => handleSettingChange("showRainbow", checked)}
            />
            <Label htmlFor="rainbow" className="cursor-pointer">Rainbow Effect</Label>
          </div>
        )}
        
        {/* Rainbow effect speed slider - only relevant if rainbow is ON */}
        {settings.showRainbow && 
          (settings.type === "multiline" || 
           settings.type === "bars" || 
           settings.type === "wave" ||
           settings.type === "circle" ||
           settings.type === "dots" ||
           settings.type === "honeycomb" ||
           settings.type === "spiderweb" ||
           settings.type === "bubbles" ||
           settings.type === "formation" ||
           settings.type === "siri" ||
           settings.type === "line") && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Rainbow Speed: {settings.rainbowSpeed?.toFixed(1) || "1.0"}</Label>
            </div>
            <Slider 
              min={0.1} 
              max={5} 
              step={0.1} 
              value={[settings.rainbowSpeed || 1.0]} 
              onValueChange={([value]) => handleSettingChange("rainbowSpeed", value)}
            />
          </div>
        )}

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

        {/* Orientation checkboxes - only display for specific visualizations */}
        {showOrientationSection && (
          <div className="space-y-3">
            <Label>Orientation</Label>
            <div className="flex flex-col space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="horizontal" 
                  checked={settings.horizontalOrientation}
                  onCheckedChange={(checked) => handleOrientationChange("horizontalOrientation", !!checked)}
                />
                <Label htmlFor="horizontal" className="cursor-pointer">Horizontal</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="vertical" 
                  checked={settings.verticalOrientation}
                  onCheckedChange={(checked) => handleOrientationChange("verticalOrientation", !!checked)}
                />
                <Label htmlFor="vertical" className="cursor-pointer">Vertical</Label>
              </div>
            </div>
          </div>
        )}

        {/* Bar Placement multi-select - only display for specific visualizations */}
        {showBarPlacementSection && (
          <div className="space-y-3">
            <Label>Bar Placement</Label>
            <div className="flex flex-col space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="top-placement" 
                  checked={settings.barPlacement.includes("top")}
                  onCheckedChange={(checked) => 
                    handleMultiSelectChange("barPlacement", "top", !!checked)
                  }
                />
                <Label htmlFor="top-placement" className="cursor-pointer">
                  {settings.verticalOrientation && settings.horizontalOrientation 
                    ? "Top/Left" 
                    : settings.verticalOrientation && !settings.horizontalOrientation 
                      ? "Left" 
                      : "Top"}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="middle-placement" 
                  checked={settings.barPlacement.includes("middle")}
                  onCheckedChange={(checked) => 
                    handleMultiSelectChange("barPlacement", "middle", !!checked)
                  }
                />
                <Label htmlFor="middle-placement" className="cursor-pointer">
                  {settings.verticalOrientation && settings.horizontalOrientation ? "Middle/Middle" : "Middle"}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="bottom-placement" 
                  checked={settings.barPlacement.includes("bottom")}
                  onCheckedChange={(checked) => 
                    handleMultiSelectChange("barPlacement", "bottom", !!checked)
                  }
                />
                <Label htmlFor="bottom-placement" className="cursor-pointer">
                  {settings.verticalOrientation && settings.horizontalOrientation
                    ? "Bottom/Right"
                    : settings.verticalOrientation && !settings.horizontalOrientation 
                      ? "Right" 
                      : "Bottom"}
                </Label>
              </div>
            </div>
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
        
        {/* Hide mirrored effect button for Fire, Honeycomb, and Spiderweb animations */}
        {settings.type !== "fire" && 
         settings.type !== "honeycomb" && 
         settings.type !== "spiderweb" && (
          <div className="flex items-center space-x-2 pt-2">
            <Switch 
              id="mirror" 
              checked={settings.showMirror} 
              onCheckedChange={(checked) => handleSettingChange("showMirror", checked)}
            />
            <Label htmlFor="mirror" className="cursor-pointer">
              {/* Change label specifically for circle */}
              {settings.type === "circle" ? "Invert Effect" : 
               (settings.type === "siri" || settings.type === "dots" || settings.type === "bubbles" || settings.type === "multiline") ? 
                "Round Effect" : "Mirrored Effect"}
            </Label>
          </div>
        )}

        {/* Add Invert Effect option for Line visualization */}
        {settings.type === "line" && (
          <div className="flex items-center space-x-2 pt-2">
            <Switch 
              id="invert" 
              checked={settings.showInvert} 
              onCheckedChange={(checked) => handleSettingChange("showInvert", checked)}
            />
            <Label htmlFor="invert" className="cursor-pointer">Invert Effect</Label>
          </div>
        )}

        {/* Add Invert Effect option for Wave visualization - RE-ADDING */}
        {settings.type === "wave" && (
          <div className="flex items-center space-x-2 pt-2">
            <Switch 
              id="wave-invert" 
              checked={settings.showInvert} 
              onCheckedChange={(checked) => handleSettingChange("showInvert", checked)}
            />
            <Label htmlFor="wave-invert" className="cursor-pointer">Invert Effect</Label>
          </div>
        )}

        {/* Add a new Invert Effect option for Bubbles visualization */}
        {settings.type === "bubbles" && (
          <div className="flex items-center space-x-2 pt-2">
            <Switch 
              id="bubbles-reversed" 
              checked={settings.showReversed} 
              onCheckedChange={(checked) => handleSettingChange("showReversed", checked)}
            />
            <Label htmlFor="bubbles-reversed" className="cursor-pointer">Invert Effect</Label>
          </div>
        )}

        {/* Add a new Invert Effect option specifically for Dots visualization */}
        {settings.type === "dots" && (
          <div className="flex items-center space-x-2 pt-2">
            <Switch 
              id="reversed" 
              checked={settings.showReversed} 
              onCheckedChange={(checked) => handleSettingChange("showReversed", checked)}
            />
            <Label htmlFor="reversed" className="cursor-pointer">Invert Effect</Label>
          </div>
        )}
        
        {/* Add Invert Effect for Siri visualization when Round Effect is enabled */}
        {settings.type === "siri" && settings.showMirror && (
          <div className="flex items-center space-x-2 pt-2">
            <Switch 
              id="siri-invert" 
              checked={settings.showInvert} 
              onCheckedChange={(checked) => handleSettingChange("showInvert", checked)}
            />
            <Label htmlFor="siri-invert" className="cursor-pointer">Invert Effect</Label>
          </div>
        )}

        {/* Animation Start multi-select - only display for specific visualizations */}
        {showAnimationStartSection && (
          <div className="space-y-3">
            <Label>Animation Start</Label>
            <div className="flex flex-col space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="beginning-start" 
                  checked={settings.animationStart.includes("beginning")}
                  onCheckedChange={(checked) => 
                    handleMultiSelectChange("animationStart", "beginning", !!checked)
                  }
                />
                <Label htmlFor="beginning-start" className="cursor-pointer">
                  {settings.verticalOrientation && settings.horizontalOrientation
                    ? "Top/Left"
                    : settings.verticalOrientation && !settings.horizontalOrientation 
                      ? "Top" 
                      : "Left"}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="middle-start" 
                  checked={settings.animationStart.includes("middle")}
                  onCheckedChange={(checked) => 
                    handleMultiSelectChange("animationStart", "middle", !!checked)
                  }
                />
                <Label htmlFor="middle-start" className="cursor-pointer">
                  {settings.verticalOrientation && settings.horizontalOrientation ? "Center/Center" : "Center"}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="end-start" 
                  checked={settings.animationStart.includes("end")}
                  onCheckedChange={(checked) => 
                    handleMultiSelectChange("animationStart", "end", !!checked)
                  }
                />
                <Label htmlFor="end-start" className="cursor-pointer">
                  {settings.verticalOrientation && settings.horizontalOrientation
                    ? "Bottom/Right"
                    : settings.verticalOrientation && !settings.horizontalOrientation 
                      ? "Bottom" 
                      : "Right"}
                </Label>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VisualizationSettings;
