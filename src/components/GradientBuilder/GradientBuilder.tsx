import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Palette } from 'lucide-react';
import {
  GradientConfig,
  GradientStop,
  InterpolationMode,
  EasingFunction,
  GradientSampler,
  createGradientStop,
  addGradientStop,
  removeGradientStop,
  updateGradientStop,
  gradientToCSS
} from '@/lib/color/gradients';
import { generateHarmony, generateThemePalette, HarmonyType } from '@/lib/color/harmony';
import { hexToRgb, rgbToHex } from '@/lib/color/spaces';

interface GradientBuilderProps {
  config: GradientConfig;
  onChange: (config: GradientConfig) => void;
  className?: string;
}

export function GradientBuilder({ config, onChange, className }: GradientBuilderProps) {
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [draggedStopId, setDraggedStopId] = useState<string | null>(null);
  const [previewSampler, setPreviewSampler] = useState<GradientSampler | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartPosition, setDragStartPosition] = useState(0);
  const gradientBarRef = useRef<HTMLDivElement>(null);

  // Update sampler when config changes
  useEffect(() => {
    setPreviewSampler(new GradientSampler(config));
  }, [config]);

  // Generate preview gradient CSS string
  const previewGradient = gradientToCSS(config);

  // Generate a stable hash-like class name for the gradient preview based on stops & interpolation/easing
  const gradientClass = useMemo(() => {
    const raw = config.stops.map(s => `${s.id}:${s.position.toFixed(4)}:${rgbToHex(s.color.r, s.color.g, s.color.b)}`).join('|') + `|${config.interpolation}|${config.easing}`;
    // Simple hash
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = ((hash << 5) - hash) + raw.charCodeAt(i);
      hash |= 0; // Convert to 32bit int
    }
    return `gradient-preview-${Math.abs(hash)}`;
  }, [config]);

  // Build dynamic CSS (avoids inline style attributes to satisfy no-inline-styles rule)
  const dynamicCSS = useMemo(() => {
    let css = `.${gradientClass}{background:${previewGradient};}`;
    for (const stop of config.stops) {
      const leftPct = (stop.position * 100).toFixed(2);
      const colorHex = rgbToHex(stop.color.r, stop.color.g, stop.color.b);
      css += `\n.gradient-stop-${stop.id}{left:${leftPct}%;}`;
      css += `\n.gradient-stop-${stop.id} .gradient-stop-color-${stop.id}{background-color:${colorHex};}`;
    }
    return css;
  }, [config.stops, previewGradient, gradientClass]);

  // Handle adding new stop
  const handleAddStop = useCallback((position: number) => {
    if (!previewSampler) return;

    const sampledColor = previewSampler.sample(position);
    const hexColor = rgbToHex(sampledColor.r, sampledColor.g, sampledColor.b);
    const newConfig = addGradientStop(config, hexColor, position);
    onChange(newConfig);
  }, [config, onChange, previewSampler]);

  // Handle removing stop
  const handleRemoveStop = useCallback((stopId: string) => {
    if (config.stops.length <= 2) return; // Keep at least 2 stops

    const newConfig = removeGradientStop(config, stopId);
    onChange(newConfig);

    if (selectedStopId === stopId) {
      setSelectedStopId(null);
    }
  }, [config, onChange, selectedStopId]);

  // Handle stop position change
  const handleStopPositionChange = useCallback((stopId: string, position: number) => {
    const newConfig = updateGradientStop(config, stopId, { position });
    onChange(newConfig);
  }, [config, onChange]);

  // Handle stop color change
  const handleStopColorChange = useCallback((stopId: string, color: string) => {
    try {
      const rgbColor = hexToRgb(color);
      const newConfig = updateGradientStop(config, stopId, { color: rgbColor });
      onChange(newConfig);
    } catch (error) {
      console.error('Invalid color:', color);
    }
  }, [config, onChange]);

  // Handle interpolation mode change
  const handleInterpolationChange = useCallback((interpolation: InterpolationMode) => {
    onChange({ ...config, interpolation });
  }, [config, onChange]);

  // Handle easing change
  const handleEasingChange = useCallback((easing: EasingFunction) => {
    onChange({ ...config, easing });
  }, [config, onChange]);

  // Generate harmony colors
  const handleGenerateHarmony = useCallback((harmonyType: HarmonyType) => {
    if (config.stops.length === 0) return;

    const baseColor = config.stops[0].color;
    const harmony = generateHarmony(baseColor, harmonyType);

    const newStops: GradientStop[] = harmony.hexColors.map((hexColor, index) =>
      createGradientStop(hexColor, index / (harmony.hexColors.length - 1))
    );

    onChange({ ...config, stops: newStops });
  }, [config, onChange]);

  // Generate theme palette
  const handleGenerateTheme = useCallback((theme: string) => {
    const themePalette = generateThemePalette(theme as any);

    const newStops: GradientStop[] = themePalette.hexColors.map((hexColor, index) =>
      createGradientStop(hexColor, index / (themePalette.hexColors.length - 1))
    );

    onChange({ ...config, stops: newStops });
  }, [config, onChange]);

  // Handle gradient bar click
  const handleGradientBarClick = useCallback((e: React.MouseEvent) => {
    if (!gradientBarRef.current || isDragging) return;

    const rect = gradientBarRef.current.getBoundingClientRect();
    const position = (e.clientX - rect.left) / rect.width;

    handleAddStop(Math.max(0, Math.min(1, position)));
  }, [handleAddStop, isDragging]);

  // Drag & Drop handlers
  const handleMouseDown = useCallback((e: React.MouseEvent, stopId: string) => {
    e.stopPropagation();
    if (!gradientBarRef.current) return;

    const rect = gradientBarRef.current.getBoundingClientRect();
    const stop = config.stops.find(s => s.id === stopId);
    if (!stop) return;

    setIsDragging(true);
    setDraggedStopId(stopId);
    setSelectedStopId(stopId);
    setDragStartX(e.clientX);
    setDragStartPosition(stop.position);

    // Prevent text selection during drag
    document.body.style.userSelect = 'none';
  }, [config.stops]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !draggedStopId || !gradientBarRef.current) return;

    const rect = gradientBarRef.current.getBoundingClientRect();
    const deltaX = e.clientX - dragStartX;
    const deltaPosition = deltaX / rect.width;
    let newPosition = dragStartPosition + deltaPosition;

    // Snap to grid (every 5%)
    const snapGrid = 0.05;
    newPosition = Math.round(newPosition / snapGrid) * snapGrid;

    // Clamp position
    newPosition = Math.max(0, Math.min(1, newPosition));

    handleStopPositionChange(draggedStopId, newPosition);
  }, [isDragging, draggedStopId, dragStartX, dragStartPosition, handleStopPositionChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDraggedStopId(null);
    document.body.style.userSelect = '';
  }, []);

  // Add global mouse event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const selectedStop = selectedStopId ? config.stops.find(stop => stop.id === selectedStopId) : null;

  return (
    <Card className={`p-6 space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Gradient Builder</h3>
      </div>

      {/* Gradient Preview */}
      <div className="space-y-3">
        <label className="text-sm font-medium">Gradient Preview</label>
        {/* Dynamic style tag to host generated classes (not counted as inline style attributes) */}
        <style>{dynamicCSS}</style>
        <div
          ref={gradientBarRef}
          className={`relative h-16 rounded-lg border-2 border-border cursor-pointer overflow-visible ${gradientClass}`}
          onClick={handleGradientBarClick}
        >
          {/* Color Stops */}
          {config.stops.map((stop) => (
            <div
              key={stop.id}
              className={`absolute top-0 w-8 h-full cursor-grab active:cursor-grabbing transform -translate-x-4 gradient-stop-${stop.id} ${selectedStopId === stop.id ? 'z-20' : 'z-10'} ${isDragging && draggedStopId === stop.id ? 'scale-110' : ''}`}
              onMouseDown={(e) => handleMouseDown(e, stop.id)}
              onClick={(e) => {
                e.stopPropagation();
                if (!isDragging) {
                  setSelectedStopId(stop.id);
                }
              }}
            >
              <div
                className={`w-8 h-8 rounded-full border-3 border-background shadow-lg hover:scale-110 transition-transform gradient-stop-color-${stop.id} ${selectedStopId === stop.id ? 'ring-2 ring-primary scale-110' : ''} ${isDragging && draggedStopId === stop.id ? 'ring-4 ring-primary/50' : ''}`}
              />
              {config.stops.length > 2 && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute -top-2 -right-2 w-6 h-6 p-0 rounded-full opacity-0 hover:opacity-100 transition-opacity hover:scale-110 shadow-lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveStop(stop.id);
                  }}
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Click anywhere on the gradient to add a new color stop
        </p>
      </div>

      {/* Selected Stop Controls */}
      {selectedStop && (
        <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
          <h4 className="text-sm font-medium">Color Stop</h4>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium">Color</label>
              <input
                type="color"
                value={rgbToHex(selectedStop.color.r, selectedStop.color.g, selectedStop.color.b)}
                onChange={(e) => handleStopColorChange(selectedStop.id, e.target.value)}
                className="w-full h-10 rounded border cursor-pointer"
                title="Select color for this stop"
                placeholder="#RRGGBB"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium">Position: {Math.round(selectedStop.position * 100)}%</label>
              <Slider
                value={[selectedStop.position * 100]}
                onValueChange={([value]) => handleStopPositionChange(selectedStop.id, value / 100)}
                max={100}
                step={1}
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Interpolation Mode</label>
          <Select value={config.interpolation} onValueChange={handleInterpolationChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rgb">RGB (Digital)</SelectItem>
              <SelectItem value="hsv">HSV (Vibrant)</SelectItem>
              <SelectItem value="lab">LAB (Perceptual)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Easing</label>
          <Select value={config.easing} onValueChange={handleEasingChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="linear">Linear</SelectItem>
              <SelectItem value="ease-in">Ease In</SelectItem>
              <SelectItem value="ease-out">Ease Out</SelectItem>
              <SelectItem value="ease-in-out">Ease In Out</SelectItem>
              <SelectItem value="bezier">Smooth Curve</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium">Quick Generate</h4>

        <div className="space-y-2">
          <label className="text-xs font-medium">Color Harmony</label>
          <div className="flex flex-wrap gap-2">
            {(['complementary', 'triadic', 'analogous', 'tetradic', 'monochromatic'] as HarmonyType[]).map((harmony) => (
              <Button
                key={harmony}
                variant="outline"
                size="sm"
                onClick={() => handleGenerateHarmony(harmony)}
                className="text-xs"
              >
                {harmony.charAt(0).toUpperCase() + harmony.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium">Theme Presets</label>
          <div className="flex flex-wrap gap-2">
            {['sunset', 'ocean', 'forest', 'cyberpunk', 'pastel'].map((theme) => (
              <Button
                key={theme}
                variant="outline"
                size="sm"
                onClick={() => handleGenerateTheme(theme)}
                className="text-xs"
              >
                {theme.charAt(0).toUpperCase() + theme.slice(1)}
              </Button>
            ))}
          </div>
        </div>
      </div>

    </Card>
  );
}