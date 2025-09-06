import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shuffle, Play, Pause, RotateCcw, Palette, Settings, Zap, Download } from 'lucide-react';
import { ShaderSystem, ShaderType } from '@/lib/shaderSystem';
import { GradientBuilder } from '@/components/GradientBuilder/GradientBuilder';
import { ExportDialog } from '@/components/ExportDialog';
import { useGradient } from '@/hooks/useGradient';
import { AdaptiveQualityManager } from '@/lib/performance/adaptive';
import { createGradientStop } from '@/lib/color/gradients';

interface ShaderControlsProps {
  shaderSystem: ShaderSystem | null;
  initialConfig?: {
    shaderType?: ShaderType;
    gradient?: any;
    shaderParams?: any;
    speed?: number;
    scale?: number;
    octaves?: number;
    lacunarity?: number;
    persistence?: number;
  } | null;
}

export const ShaderControls = ({ shaderSystem, initialConfig }: ShaderControlsProps) => {
  const [isPlaying, setIsPlaying] = useState(true);
  // Prevent particle system access - default to classic if particle is attempted
  const initialShaderType = initialConfig?.shaderType === 'particle' ? 'classic' : (initialConfig?.shaderType || 'classic');
  const [currentShader, setCurrentShader] = useState<ShaderType>(initialShaderType);
  const [speed, setSpeed] = useState(initialConfig?.speed || 0.5);
  const [scale, setScale] = useState(initialConfig?.scale || 2.0);
  const [octaves, setOctaves] = useState(initialConfig?.octaves || 4);
  const [lacunarity, setLacunarity] = useState(initialConfig?.lacunarity || 2.0);
  const [persistence, setPersistence] = useState(initialConfig?.persistence || 0.5);
  const [flowStrength, setFlowStrength] = useState(initialConfig?.shaderParams?.flowStrength || 1.0);
  const [turbulence, setTurbulence] = useState(initialConfig?.shaderParams?.turbulence || 4.0);
  const [plasmaIntensity, setPlasmaIntensity] = useState(initialConfig?.shaderParams?.plasmaIntensity || 1.5);
  const [viscosity, setViscosity] = useState(initialConfig?.shaderParams?.viscosity || 0.8);
  const [pressure, setPressure] = useState(initialConfig?.shaderParams?.pressure || 2.0);
  const [particleCount, setParticleCount] = useState(initialConfig?.shaderParams?.particleCount || 25);
  const [particleSize, setParticleSize] = useState(initialConfig?.shaderParams?.particleSize || 1.0);
  const [segments, setSegments] = useState(initialConfig?.shaderParams?.segments || 6);
  const [rotation, setRotation] = useState(initialConfig?.shaderParams?.rotation || 0);

  // Fluid Interactive parameters
  const [brushSize, setBrushSize] = useState(initialConfig?.shaderParams?.brushSize || 25.0);
  const [brushStrength, setBrushStrength] = useState(initialConfig?.shaderParams?.brushStrength || 0.5);
  const [distortionAmount, setDistortionAmount] = useState(initialConfig?.shaderParams?.distortionAmount || 2.5);
  const [fluidDecay, setFluidDecay] = useState(initialConfig?.shaderParams?.fluidDecay || 0.98);
  const [trailLength, setTrailLength] = useState(initialConfig?.shaderParams?.trailLength || 0.8);
  const [stopDecay, setStopDecay] = useState(initialConfig?.shaderParams?.stopDecay || 0.85);
  const [colorIntensity, setColorIntensity] = useState(initialConfig?.shaderParams?.colorIntensity || 1.0);
  const [softness, setSoftness] = useState(initialConfig?.shaderParams?.softness || 1.0);

  // Grain parameters
  const [grainIntensity, setGrainIntensity] = useState(initialConfig?.shaderParams?.grainIntensity || 0.0);
  const [grainSize, setGrainSize] = useState(initialConfig?.shaderParams?.grainSize || 100.0);
  const [grainSpeed, setGrainSpeed] = useState(initialConfig?.shaderParams?.grainSpeed || 1.0);
  const [grainContrast, setGrainContrast] = useState(initialConfig?.shaderParams?.grainContrast || 1.0);
  const [grainType, setGrainType] = useState(initialConfig?.shaderParams?.grainType || 3);
  const [grainBlendMode, setGrainBlendMode] = useState(initialConfig?.shaderParams?.grainBlendMode || 0);

  // Mouse interaction control
  const [mouseInteractionEnabled, setMouseInteractionEnabled] = useState(initialConfig?.shaderParams?.mouseInteractionEnabled ?? true);

  const [qualityManager] = useState(() => new AdaptiveQualityManager());
  const [performanceInfo, setPerformanceInfo] = useState({ fps: 0, quality: 'high' });

  // Advanced gradient system
  const { config: gradientConfig, updateConfig: updateGradientConfig, generateTexture, resetToDefault } = useGradient(initialConfig?.gradient);

  // Apply initial configuration when shader system is ready
  useEffect(() => {
    if (!shaderSystem || !initialConfig) return;

    // Apply shader type
    if (initialConfig.shaderType) {
      shaderSystem.switchShader(initialConfig.shaderType);
    }

    // Apply initial parameters
    if (initialConfig.speed !== undefined) {
      shaderSystem.updateParameter('u_speed', initialConfig.speed);
    }
    if (initialConfig.scale !== undefined) {
      shaderSystem.updateParameter('u_scale', initialConfig.scale);
    }
    if (initialConfig.octaves !== undefined) {
      shaderSystem.updateParameter('u_octaves', initialConfig.octaves);
    }
    if (initialConfig.lacunarity !== undefined) {
      shaderSystem.updateParameter('u_lacunarity', initialConfig.lacunarity);
    }
    if (initialConfig.persistence !== undefined) {
      shaderSystem.updateParameter('u_persistence', initialConfig.persistence);
    }

    // Apply shader-specific parameters
    if (initialConfig.shaderParams) {
      Object.entries(initialConfig.shaderParams).forEach(([key, value]) => {
        if (value !== undefined && typeof value === 'number') {
          shaderSystem.updateParameter(`u_${key}`, value);
        }
      });
    }

    // Initial configuration applied to shader system
  }, [shaderSystem, initialConfig]);

  useEffect(() => {
    if (!shaderSystem) return;

    shaderSystem.updateParameter('u_speed', isPlaying ? speed : 0);

    // Update gradient texture when config changes
    const texture = generateTexture(256);
    if (texture && shaderSystem.updateGradientTexture) {
      shaderSystem.updateGradientTexture(texture);
    }

    // Update fluid system colors in real-time for fluid interactive shader
    if (currentShader === 'fluidInteractive') {
      const stops = gradientConfig.stops;
      if (stops.length >= 4) {
        const color1 = `#${Math.round(stops[0].color.r * 255).toString(16).padStart(2, '0')}${Math.round(stops[0].color.g * 255).toString(16).padStart(2, '0')}${Math.round(stops[0].color.b * 255).toString(16).padStart(2, '0')}`;
        const color2 = `#${Math.round(stops[1].color.r * 255).toString(16).padStart(2, '0')}${Math.round(stops[1].color.g * 255).toString(16).padStart(2, '0')}${Math.round(stops[1].color.b * 255).toString(16).padStart(2, '0')}`;
        const color3 = `#${Math.round(stops[2].color.r * 255).toString(16).padStart(2, '0')}${Math.round(stops[2].color.g * 255).toString(16).padStart(2, '0')}${Math.round(stops[2].color.b * 255).toString(16).padStart(2, '0')}`;
        const color4 = `#${Math.round(stops[3].color.r * 255).toString(16).padStart(2, '0')}${Math.round(stops[3].color.g * 255).toString(16).padStart(2, '0')}${Math.round(stops[3].color.b * 255).toString(16).padStart(2, '0')}`;

        shaderSystem.updateFluidConfig({
          color1,
          color2,
          color3,
          color4
        });
      } else if (stops.length >= 3) {
        // Fallback to 3 colors if only 3 stops available
        const color1 = `#${Math.round(stops[0].color.r * 255).toString(16).padStart(2, '0')}${Math.round(stops[0].color.g * 255).toString(16).padStart(2, '0')}${Math.round(stops[0].color.b * 255).toString(16).padStart(2, '0')}`;
        const color2 = `#${Math.round(stops[1].color.r * 255).toString(16).padStart(2, '0')}${Math.round(stops[1].color.g * 255).toString(16).padStart(2, '0')}${Math.round(stops[1].color.b * 255).toString(16).padStart(2, '0')}`;
        const color3 = `#${Math.round(stops[2].color.r * 255).toString(16).padStart(2, '0')}${Math.round(stops[2].color.g * 255).toString(16).padStart(2, '0')}${Math.round(stops[2].color.b * 255).toString(16).padStart(2, '0')}`;
        const color4 = color3; // Use the last color as color4

        shaderSystem.updateFluidConfig({
          color1,
          color2,
          color3,
          color4
        });
      }
    }
  }, [shaderSystem, speed, isPlaying, generateTexture, gradientConfig, currentShader]);

  // Update grain parameters for all shaders
  useEffect(() => {
    if (!shaderSystem) return;

    // Update universal grain configuration for all shaders
    shaderSystem.updateGrainConfig({
      grainIntensity,
      grainSize,
      grainSpeed,
      grainContrast,
      grainType,
      grainBlendMode
    });

    // Also update fluid shader grain if it's the current shader
    if (currentShader === 'fluidInteractive') {
      shaderSystem.updateFluidConfig({
        grainIntensity,
        grainSize,
        grainSpeed,
        grainContrast,
        grainType,
        grainBlendMode
      });
    }
  }, [shaderSystem, grainIntensity, grainSize, grainSpeed, grainContrast, grainType, grainBlendMode, currentShader]);

  // Update mouse interaction for all shaders
  useEffect(() => {
    if (!shaderSystem) return;
    shaderSystem.updateMouseInteraction(mouseInteractionEnabled);
  }, [shaderSystem, mouseInteractionEnabled]);

  // Performance monitoring
  useEffect(() => {
    if (!shaderSystem || !qualityManager) return;

    const interval = setInterval(() => {
      const fps = shaderSystem.getFPS();
      qualityManager.updatePerformanceMetrics({ fps, frameTime: 1000 / fps });

      setPerformanceInfo({
        fps: Math.round(fps),
        quality: qualityManager.getCurrentQuality()
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [shaderSystem, qualityManager]);

  const handleShaderChange = (shader: ShaderType) => {
    setCurrentShader(shader);
    if (shaderSystem) {
      shaderSystem.switchShader(shader);
    }
  };

  const handleRandomizeColors = () => {
    // Generate random gradient colors
    const randomColors = [
      // Cyberpunk palette
      ['#ff0080', '#00ffff', '#ff8000'],
      // Ocean palette
      ['#001a2e', '#0066cc', '#40e0d0'],
      // Sunset palette
      ['#ff6b35', '#f7931e', '#ffcb04'],
      // Forest palette
      ['#0b5345', '#16a085', '#a3e4d7'],
      // Aurora palette
      ['#8e44ad', '#3498db', '#1abc9c'],
      // Fire palette
      ['#e74c3c', '#f39c12', '#f1c40f'],
      // Deep space palette
      ['#2c3e50', '#8e44ad', '#e74c3c'],
      // Neon palette
      ['#ff073a', '#39ff14', '#ff9600'],
      // Purple Dream
      ['#667eea', '#764ba2', '#f093fb'],
      // Tropical
      ['#ff9a9e', '#fecfef', '#fecfef']
    ];

    const randomPalette = randomColors[Math.floor(Math.random() * randomColors.length)];

    // Create new gradient config with random colors using createGradientStop
    // For fluid interactive, we need 4 colors, so add an extra one
    const newConfig = {
      ...gradientConfig,
      stops: currentShader === 'fluidInteractive' ? [
        createGradientStop(randomPalette[0], 0),
        createGradientStop(randomPalette[1], 0.33),
        createGradientStop(randomPalette[2], 0.66),
        createGradientStop(randomPalette[0], 1) // Use first color again for 4th color
      ] : [
        createGradientStop(randomPalette[0], 0),
        createGradientStop(randomPalette[1], 0.5),
        createGradientStop(randomPalette[2], 1)
      ]
    };

    updateGradientConfig(newConfig);
  };

  const handleReset = () => {
    // Reset all parameters to default values
    setSpeed(0.5);
    setScale(2.0);
    setOctaves(4);
    setLacunarity(2.0);
    setPersistence(0.5);
    setFlowStrength(1.0);
    setTurbulence(4.0);
    setPlasmaIntensity(1.5);
    setViscosity(0.8);
    setPressure(2.0);
    setParticleCount(25);
    setParticleSize(1.0);
    setSegments(6);
    setRotation(0);

    // Reset fluid interactive parameters
    setBrushSize(25.0);
    setBrushStrength(0.5);
    setDistortionAmount(2.5);
    setFluidDecay(0.98);
    setTrailLength(0.8);
    setStopDecay(0.85);
    setColorIntensity(1.0);
    setSoftness(1.0);

    // Reset gradient to default
    resetToDefault();

    // Update shader system with default values
    if (shaderSystem) {
      shaderSystem.updateParameter('u_speed', 0.5);
      shaderSystem.updateParameter('u_scale', 2.0);
      shaderSystem.updateParameter('u_octaves', 4);
      shaderSystem.updateParameter('u_lacunarity', 2.0);
      shaderSystem.updateParameter('u_persistence', 0.5);
      shaderSystem.updateParameter('u_flow_strength', 1.0);
      shaderSystem.updateParameter('u_turbulence', 4.0);
      shaderSystem.updateParameter('u_plasma_intensity', 1.5);
      shaderSystem.updateParameter('u_viscosity', 0.8);
      shaderSystem.updateParameter('u_pressure', 2.0);
      shaderSystem.updateParameter('u_particleCount', 25);
      shaderSystem.updateParameter('u_particleSize', 1.0);
      shaderSystem.updateParameter('u_segments', 6);
      shaderSystem.updateParameter('u_rotation', 0);
    }
  };

  const shaderDescriptions = {
    classic: 'Smooth gradient transitions with layered noise',
    vector: 'Fluid motion using divergence-free vector fields',
    turbulence: 'Chaotic patterns with domain warping',
    plasma: 'Energetic sine wave interference patterns',
    fluid: 'Real-time fluid simulation with viscosity',
    kaleidoscope: 'Symmetrical patterns with mirror reflections',
    fluidInteractive: 'Advanced fluid simulation with mouse interaction and distortion'
  };

  return (
    <div className="w-full space-y-4">
      {/* Performance Indicator */}
      <Card className="bg-control-bg/90 backdrop-blur-md border-control-border/50 shadow-lg p-4">
        <div className="space-y-3">
          {/* Performance Stats Row */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full border border-primary/20">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Performance</span>
            <Badge variant="secondary" className="bg-primary/20 text-primary text-xs px-2 py-0.5">
              {performanceInfo.fps} FPS
            </Badge>
            <Badge
              variant={performanceInfo.quality === 'high' ? 'default' : 'secondary'}
              className="text-xs px-2 py-0.5"
            >
              {performanceInfo.quality.toUpperCase()}
            </Badge>
          </div>

          {/* Export Button Row */}
          <div className="flex justify-center">
            <ExportDialog
              shaderType={currentShader}
              gradientConfig={gradientConfig}
              shaderParams={{
                speed,
                scale,
                octaves,
                lacunarity,
                persistence,
                flowStrength,
                turbulence,
                plasmaIntensity,
                viscosity,
                pressure,
                particleCount,
                particleSize,
                segments,
                rotation,
                brushSize,
                brushStrength,
                distortionAmount,
                fluidDecay,
                trailLength,
                stopDecay,
                colorIntensity,
                softness,
                // Grain parameters
                grainIntensity,
                grainSize,
                grainSpeed,
                grainContrast,
                grainType,
                grainBlendMode,
                // Mouse interaction
                mouseInteractionEnabled
              } as any}
              isPlaying={isPlaying}
            >
              <Button variant="default" size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 px-6 w-full max-w-[200px]">
                <Download className="w-4 h-4" />
                Export
              </Button>
            </ExportDialog>
          </div>
        </div>
      </Card>

      {/* Main Controls */}
      <Card className="bg-control-bg/90 backdrop-blur-md border-control-border/50 shadow-lg overflow-hidden">
        <Tabs defaultValue="gradient" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-gradient-to-r from-control-bg via-control-bg/50 to-control-bg border-b border-control-border/30 rounded-none h-12">
            <TabsTrigger value="gradient" className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary border-r border-control-border/20">
              <Palette className="w-4 h-4" />
              Colors
            </TabsTrigger>
            <TabsTrigger value="animation" className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary border-r border-control-border/20">
              <Play className="w-4 h-4" />
              {currentShader === 'fluidInteractive' ? 'Fluid' : 'Motion'}
            </TabsTrigger>
            <TabsTrigger value="advanced" className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              <Settings className="w-4 h-4" />
              {currentShader === 'fluidInteractive' ? 'Advanced' : 'Noise'}
            </TabsTrigger>
          </TabsList>

          <div className="p-6">
            <TabsContent value="gradient" className="space-y-6 mt-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Advanced Gradients</h3>
                  <p className="text-sm text-muted-foreground">Create and customize color gradients</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRandomizeColors}
                    className="border-control-border hover:bg-control-hover hover:border-primary/50 transition-colors"
                  >
                    <Shuffle className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReset}
                    className="border-control-border hover:bg-control-hover hover:border-primary/50 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="bg-muted/20 rounded-lg p-4 border border-control-border/30">
                <GradientBuilder
                  config={gradientConfig}
                  onChange={updateGradientConfig}
                  className="border-0 p-0 bg-transparent"
                />
              </div>
            </TabsContent>

            <TabsContent value="animation" className="space-y-6 mt-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Animation</h3>
                  <p className="text-sm text-muted-foreground">Control motion and shader effects</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`border-control-border hover:bg-control-hover transition-colors ${isPlaying ? 'bg-primary/10 border-primary/50 text-primary' : ''
                    }`}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  <span className="ml-2">{isPlaying ? 'Pause' : 'Play'}</span>
                </Button>
              </div>

              <div className="space-y-4">
                <div className="bg-muted/20 rounded-lg p-4 border border-control-border/30">
                  <label className="text-sm font-medium text-foreground mb-3 block">Shader Type</label>
                  <Select value={currentShader} onValueChange={handleShaderChange}>
                    <SelectTrigger className="bg-control-bg border-control-border hover:border-primary/50 transition-colors">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-control-bg border-control-border">
                      <SelectItem value="classic">Classic Gradient</SelectItem>
                      <SelectItem value="vector">Vector Flow</SelectItem>
                      <SelectItem value="turbulence">Turbulence</SelectItem>
                      <SelectItem value="plasma">Plasma</SelectItem>
                      <SelectItem value="fluid">Fluid Simulation</SelectItem>
                      <SelectItem value="kaleidoscope">Kaleidoscope</SelectItem>
                      <SelectItem value="fluidInteractive">Fluid Interactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                    {shaderDescriptions[currentShader]}
                  </p>
                </div>
              </div>

              {currentShader === 'fluidInteractive' ? (
                // Fluid Interactive Motion Controls
                <div className="space-y-4">
                  <div className="bg-muted/20 rounded-lg p-4 border border-control-border/30 space-y-4">
                    <h4 className="text-sm font-semibold text-foreground">Brush Settings</h4>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-foreground">Brush Size</label>
                        <Badge variant="secondary" className="text-xs bg-primary/20 text-primary px-2 py-1">
                          {brushSize.toFixed(1)}
                        </Badge>
                      </div>
                      <Slider
                        value={[brushSize]}
                        onValueChange={(value) => {
                          const newSize = value[0];
                          setBrushSize(newSize);
                          if (shaderSystem) {
                            shaderSystem.updateFluidConfig({ brushSize: newSize });
                          }
                        }}
                        min={5}
                        max={100}
                        step={1}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-foreground">Brush Strength</label>
                        <Badge variant="secondary" className="text-xs bg-primary/20 text-primary px-2 py-1">
                          {brushStrength.toFixed(2)}
                        </Badge>
                      </div>
                      <Slider
                        value={[brushStrength]}
                        onValueChange={(value) => {
                          const newStrength = value[0];
                          setBrushStrength(newStrength);
                          if (shaderSystem) {
                            shaderSystem.updateFluidConfig({ brushStrength: newStrength });
                          }
                        }}
                        min={0.1}
                        max={2.0}
                        step={0.05}
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="bg-muted/20 rounded-lg p-4 border border-control-border/30 space-y-4">
                    <h4 className="text-sm font-semibold text-foreground">Fluid Dynamics</h4>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-foreground">Distortion Amount</label>
                        <Badge variant="secondary" className="text-xs bg-primary/20 text-primary px-2 py-1">
                          {distortionAmount.toFixed(1)}
                        </Badge>
                      </div>
                      <Slider
                        value={[distortionAmount]}
                        onValueChange={(value) => {
                          const newDistortion = value[0];
                          setDistortionAmount(newDistortion);
                          if (shaderSystem) {
                            shaderSystem.updateFluidConfig({ distortionAmount: newDistortion });
                          }
                        }}
                        min={0.5}
                        max={10.0}
                        step={0.1}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-foreground">Fluid Decay</label>
                        <Badge variant="secondary" className="text-xs bg-primary/20 text-primary px-2 py-1">
                          {fluidDecay.toFixed(3)}
                        </Badge>
                      </div>
                      <Slider
                        value={[fluidDecay]}
                        onValueChange={(value) => {
                          const newDecay = value[0];
                          setFluidDecay(newDecay);
                          if (shaderSystem) {
                            shaderSystem.updateFluidConfig({ fluidDecay: newDecay });
                          }
                        }}
                        min={0.9}
                        max={1.0}
                        step={0.001}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                // Standard Speed/Scale Controls for other shaders
                <div className="space-y-4">
                  <div className="bg-muted/20 rounded-lg p-4 border border-control-border/30 space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-foreground">Speed</label>
                        <Badge variant="secondary" className="text-xs bg-primary/20 text-primary px-2 py-1">
                          {speed.toFixed(2)}
                        </Badge>
                      </div>
                      <Slider
                        value={[speed]}
                        onValueChange={(value) => {
                          const newSpeed = value[0];
                          setSpeed(newSpeed);
                          if (shaderSystem) {
                            shaderSystem.updateParameter('u_speed', isPlaying ? newSpeed : 0);
                          }
                        }}
                        min={0}
                        max={2}
                        step={0.1}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-foreground">Scale</label>
                        <Badge variant="secondary" className="text-xs bg-primary/20 text-primary px-2 py-1">
                          {scale.toFixed(1)}
                        </Badge>
                      </div>
                      <Slider
                        value={[scale]}
                        onValueChange={(value) => {
                          const newScale = value[0];
                          setScale(newScale);
                          if (shaderSystem) {
                            shaderSystem.updateParameter('u_scale', newScale);
                          }
                        }}
                        min={0.5}
                        max={8}
                        step={0.1}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="advanced" className="space-y-6 mt-0">
              {currentShader === 'fluidInteractive' ? (
                // Fluid Interactive Advanced Controls
                <div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Fluid Controls</h3>
                    <p className="text-sm text-muted-foreground">Advanced fluid simulation parameters</p>
                  </div>



                  {/* Speed and Scale Controls for Fluid Interactive */}
                  <div className="bg-muted/20 rounded-lg p-4 border border-control-border/30 space-y-4">
                    <h4 className="text-sm font-semibold text-foreground">Animation & Scale</h4>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-foreground">Animation Speed</label>
                        <Badge variant="secondary" className="text-xs bg-primary/20 text-primary px-2 py-1">
                          {speed.toFixed(2)}
                        </Badge>
                      </div>
                      <Slider
                        value={[speed]}
                        onValueChange={(value) => {
                          const newSpeed = value[0];
                          setSpeed(newSpeed);
                          // Update fluid system with speed multiplier
                          if (shaderSystem && currentShader === 'fluidInteractive') {
                            shaderSystem.updateFluidSpeed(newSpeed);
                          }
                        }}
                        min={0}
                        max={3}
                        step={0.1}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-foreground">Pattern Scale</label>
                        <Badge variant="secondary" className="text-xs bg-primary/20 text-primary px-2 py-1">
                          {scale.toFixed(1)}
                        </Badge>
                      </div>
                      <Slider
                        value={[scale]}
                        onValueChange={(value) => {
                          const newScale = value[0];
                          setScale(newScale);
                          // Scale affects the background pattern resolution in fluid interactive
                          if (shaderSystem && currentShader === 'fluidInteractive') {
                            shaderSystem.updateFluidScale(newScale);
                          }
                        }}
                        min={0.1}
                        max={10}
                        step={0.1}
                        className="w-full"
                      />
                    </div>
                  </div>

                  {/* Color Positioning and Advanced Controls */}
                  <div className="bg-muted/20 rounded-lg p-4 border border-control-border/30 space-y-4">
                    <h4 className="text-sm font-semibold text-foreground">Color Controls</h4>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-foreground">Color Shift</label>
                        <Badge variant="secondary" className="text-xs bg-primary/20 text-primary px-2 py-1">
                          {(colorIntensity * 0.5).toFixed(2)}
                        </Badge>
                      </div>
                      <Slider
                        value={[colorIntensity * 0.5]}
                        onValueChange={(value) => {
                          const newShift = value[0];
                          // Use this to control color positioning/shifting in the fluid
                          if (shaderSystem && currentShader === 'fluidInteractive') {
                            // This could control how colors map to fluid velocity
                          }
                        }}
                        min={-2}
                        max={2}
                        step={0.05}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-foreground">Color Mixing</label>
                        <Badge variant="secondary" className="text-xs bg-primary/20 text-primary px-2 py-1">
                          {softness.toFixed(2)}
                        </Badge>
                      </div>
                      <Slider
                        value={[softness]}
                        onValueChange={(value) => {
                          const newMixing = value[0];
                          setSoftness(newMixing);
                          if (shaderSystem && currentShader === 'fluidInteractive') {
                            shaderSystem.updateFluidConfig({ softness: newMixing });
                          }
                        }}
                        min={0.1}
                        max={5.0}
                        step={0.1}
                        className="w-full"
                      />
                    </div>
                  </div>

                  {/* Advanced Fluid Controls */}
                  <div className="bg-muted/20 rounded-lg p-4 border border-control-border/30 space-y-4">
                    <h4 className="text-sm font-semibold text-foreground">Advanced Fluid Physics</h4>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-foreground">Trail Length</label>
                        <Badge variant="secondary" className="text-xs bg-primary/20 text-primary px-2 py-1">
                          {trailLength.toFixed(2)}
                        </Badge>
                      </div>
                      <Slider
                        value={[trailLength]}
                        onValueChange={(value) => {
                          const newTrail = value[0];
                          setTrailLength(newTrail);
                          if (shaderSystem) {
                            shaderSystem.updateFluidConfig({ trailLength: newTrail });
                          }
                        }}
                        min={0.1}
                        max={1.0}
                        step={0.01}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-foreground">Stop Decay</label>
                        <Badge variant="secondary" className="text-xs bg-primary/20 text-primary px-2 py-1">
                          {stopDecay.toFixed(3)}
                        </Badge>
                      </div>
                      <Slider
                        value={[stopDecay]}
                        onValueChange={(value) => {
                          const newStopDecay = value[0];
                          setStopDecay(newStopDecay);
                          if (shaderSystem) {
                            shaderSystem.updateFluidConfig({ stopDecay: newStopDecay });
                          }
                        }}
                        min={0.5}
                        max={1.0}
                        step={0.001}
                        className="w-full"
                      />
                    </div>
                  </div>

                  {/* Visual Enhancement Controls */}
                  <div className="bg-muted/20 rounded-lg p-4 border border-control-border/30 space-y-4">
                    <h4 className="text-sm font-semibold text-foreground">Visual Enhancement</h4>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-foreground">Color Intensity</label>
                        <Badge variant="secondary" className="text-xs bg-primary/20 text-primary px-2 py-1">
                          {colorIntensity.toFixed(2)}
                        </Badge>
                      </div>
                      <Slider
                        value={[colorIntensity]}
                        onValueChange={(value) => {
                          const newIntensity = value[0];
                          setColorIntensity(newIntensity);
                          if (shaderSystem) {
                            shaderSystem.updateFluidConfig({ colorIntensity: newIntensity });
                          }
                        }}
                        min={0.1}
                        max={5.0}
                        step={0.05}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-foreground">Pattern Complexity</label>
                        <Badge variant="secondary" className="text-xs bg-primary/20 text-primary px-2 py-1">
                          {(scale * 2).toFixed(1)}
                        </Badge>
                      </div>
                      <Slider
                        value={[scale * 2]}
                        onValueChange={(value) => {
                          const newComplexity = value[0];
                          const newScale = newComplexity / 2;
                          setScale(newScale);
                          // This affects the complexity of the background pattern
                          if (shaderSystem && currentShader === 'fluidInteractive') {
                            shaderSystem.updateFluidScale(newScale);
                          }
                        }}
                        min={1}
                        max={20}
                        step={0.5}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-foreground">Flow Smoothness</label>
                        <Badge variant="secondary" className="text-xs bg-primary/20 text-primary px-2 py-1">
                          {softness.toFixed(2)}
                        </Badge>
                      </div>
                      <Slider
                        value={[softness]}
                        onValueChange={(value) => {
                          const newSmoothness = value[0];
                          setSoftness(newSmoothness);
                          if (shaderSystem) {
                            shaderSystem.updateFluidConfig({ softness: newSmoothness });
                          }
                        }}
                        min={0.1}
                        max={10.0}
                        step={0.1}
                        className="w-full"
                      />
                    </div>
                  </div>

                  {/* Time and Motion Controls */}
                  <div className="bg-muted/20 rounded-lg p-4 border border-control-border/30 space-y-4">
                    <h4 className="text-sm font-semibold text-foreground">Time & Motion</h4>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-foreground">Time Scale</label>
                        <Badge variant="secondary" className="text-xs bg-primary/20 text-primary px-2 py-1">
                          {speed.toFixed(2)}
                        </Badge>
                      </div>
                      <Slider
                        value={[speed]}
                        onValueChange={(value) => {
                          const newTimeScale = value[0];
                          setSpeed(newTimeScale);
                          // This controls the overall time progression of the fluid
                          if (shaderSystem && currentShader === 'fluidInteractive') {
                            shaderSystem.updateFluidSpeed(newTimeScale);
                          }
                        }}
                        min={0}
                        max={5}
                        step={0.1}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-foreground">Motion Blur</label>
                        <Badge variant="secondary" className="text-xs bg-primary/20 text-primary px-2 py-1">
                          {(trailLength * 2).toFixed(2)}
                        </Badge>
                      </div>
                      <Slider
                        value={[trailLength * 2]}
                        onValueChange={(value) => {
                          const newBlur = value[0];
                          setTrailLength(newBlur / 2);
                          if (shaderSystem) {
                            shaderSystem.updateFluidConfig({ trailLength: newBlur / 2 });
                          }
                        }}
                        min={0.1}
                        max={2.0}
                        step={0.01}
                        className="w-full"
                      />
                    </div>
                  </div>

                  {/* Grain Effects Section */}
                  <div className="bg-muted/20 rounded-lg p-4 border border-control-border/30 space-y-4">
                    <h4 className="text-sm font-semibold text-foreground">Grain Effects</h4>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-foreground">Grain Intensity</label>
                        <Badge variant="secondary" className="text-xs bg-primary/20 text-primary px-2 py-1">
                          {grainIntensity.toFixed(2)}
                        </Badge>
                      </div>
                      <Slider
                        value={[grainIntensity]}
                        onValueChange={(value) => {
                          const newIntensity = value[0];
                          setGrainIntensity(newIntensity);
                          if (shaderSystem) {
                            shaderSystem.updateFluidConfig({ grainIntensity: newIntensity });
                          }
                        }}
                        min={0.0}
                        max={1.0}
                        step={0.01}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-foreground">Grain Size</label>
                        <Badge variant="secondary" className="text-xs bg-primary/20 text-primary px-2 py-1">
                          {grainSize.toFixed(0)}
                        </Badge>
                      </div>
                      <Slider
                        value={[grainSize]}
                        onValueChange={(value) => {
                          const newSize = value[0];
                          setGrainSize(newSize);
                          if (shaderSystem) {
                            shaderSystem.updateFluidConfig({ grainSize: newSize });
                          }
                        }}
                        min={10.0}
                        max={500.0}
                        step={5.0}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-foreground">Grain Speed</label>
                        <Badge variant="secondary" className="text-xs bg-primary/20 text-primary px-2 py-1">
                          {grainSpeed.toFixed(2)}
                        </Badge>
                      </div>
                      <Slider
                        value={[grainSpeed]}
                        onValueChange={(value) => {
                          const newSpeed = value[0];
                          setGrainSpeed(newSpeed);
                          if (shaderSystem) {
                            shaderSystem.updateFluidConfig({ grainSpeed: newSpeed });
                          }
                        }}
                        min={0.0}
                        max={5.0}
                        step={0.1}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-foreground">Grain Contrast</label>
                        <Badge variant="secondary" className="text-xs bg-primary/20 text-primary px-2 py-1">
                          {grainContrast.toFixed(2)}
                        </Badge>
                      </div>
                      <Slider
                        value={[grainContrast]}
                        onValueChange={(value) => {
                          const newContrast = value[0];
                          setGrainContrast(newContrast);
                          if (shaderSystem) {
                            shaderSystem.updateFluidConfig({ grainContrast: newContrast });
                          }
                        }}
                        min={0.1}
                        max={3.0}
                        step={0.05}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-foreground">Grain Type</label>
                        <Badge variant="secondary" className="text-xs bg-primary/20 text-primary px-2 py-1">
                          {['Film', 'Digital', 'Organic', 'Animated', 'Halftone'][grainType]}
                        </Badge>
                      </div>
                      <Select value={grainType.toString()} onValueChange={(value) => {
                        const newType = parseInt(value);
                        setGrainType(newType);
                        if (shaderSystem) {
                          shaderSystem.updateFluidConfig({ grainType: newType });
                        }
                      }}>
                        <SelectTrigger className="bg-control-bg border-control-border hover:border-primary/50 transition-colors">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-control-bg border-control-border">
                          <SelectItem value="0">Film Grain</SelectItem>
                          <SelectItem value="1">Digital Noise</SelectItem>
                          <SelectItem value="2">Organic Grain</SelectItem>
                          <SelectItem value="3">Animated Grain</SelectItem>
                          <SelectItem value="4">Halftone Pattern</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-foreground">Blend Mode</label>
                        <Badge variant="secondary" className="text-xs bg-primary/20 text-primary px-2 py-1">
                          {['Overlay', 'Multiply', 'Screen', 'Soft Light', 'Linear'][grainBlendMode]}
                        </Badge>
                      </div>
                      <Select value={grainBlendMode.toString()} onValueChange={(value) => {
                        const newBlendMode = parseInt(value);
                        setGrainBlendMode(newBlendMode);
                        if (shaderSystem) {
                          shaderSystem.updateFluidConfig({ grainBlendMode: newBlendMode });
                        }
                      }}>
                        <SelectTrigger className="bg-control-bg border-control-border hover:border-primary/50 transition-colors">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-control-bg border-control-border">
                          <SelectItem value="0">Overlay</SelectItem>
                          <SelectItem value="1">Multiply</SelectItem>
                          <SelectItem value="2">Screen</SelectItem>
                          <SelectItem value="3">Soft Light</SelectItem>
                          <SelectItem value="4">Linear</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ) : (
                // Standard Noise Parameters for other shaders
                <div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Noise Parameters</h3>
                    <p className="text-sm text-muted-foreground">Fine-tune procedural noise generation</p>
                  </div>

                  <div className="bg-muted/20 rounded-lg p-4 border border-control-border/30 space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-foreground">Octaves</label>
                        <Badge variant="secondary" className="text-xs bg-primary/20 text-primary px-2 py-1">
                          {octaves}
                        </Badge>
                      </div>
                      <Slider
                        value={[octaves]}
                        onValueChange={(value) => {
                          const newOctaves = value[0];
                          setOctaves(newOctaves);
                          if (shaderSystem) {
                            shaderSystem.updateParameter('u_octaves', newOctaves);
                          }
                        }}
                        min={1}
                        max={8}
                        step={1}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-foreground">Lacunarity</label>
                        <Badge variant="secondary" className="text-xs bg-primary/20 text-primary px-2 py-1">
                          {lacunarity.toFixed(2)}
                        </Badge>
                      </div>
                      <Slider
                        value={[lacunarity]}
                        onValueChange={(value) => {
                          const newLacunarity = value[0];
                          setLacunarity(newLacunarity);
                          if (shaderSystem) {
                            shaderSystem.updateParameter('u_lacunarity', newLacunarity);
                          }
                        }}
                        min={1}
                        max={4}
                        step={0.01}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-foreground">Persistence</label>
                        <Badge variant="secondary" className="text-xs bg-primary/20 text-primary px-2 py-1">
                          {persistence.toFixed(2)}
                        </Badge>
                      </div>
                      <Slider
                        value={[persistence]}
                        onValueChange={(value) => {
                          const newPersistence = value[0];
                          setPersistence(newPersistence);
                          if (shaderSystem) {
                            shaderSystem.updateParameter('u_persistence', newPersistence);
                          }
                        }}
                        min={0.01}
                        max={1}
                        step={0.01}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              )}

              {currentShader === 'vector' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-foreground">Flow Strength</label>
                    <Badge variant="secondary" className="text-xs">{flowStrength.toFixed(2)}</Badge>
                  </div>
                  <Slider
                    value={[flowStrength]}
                    onValueChange={(value) => {
                      const newFlowStrength = value[0];
                      setFlowStrength(newFlowStrength);
                      if (shaderSystem) {
                        shaderSystem.updateParameter('u_flow_strength', newFlowStrength);
                      }
                    }}
                    min={0}
                    max={3}
                    step={0.1}
                    className="w-full"
                  />
                </div>
              )}

              {currentShader === 'turbulence' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-foreground">Turbulence</label>
                    <Badge variant="secondary" className="text-xs">{turbulence.toFixed(1)}</Badge>
                  </div>
                  <Slider
                    value={[turbulence]}
                    onValueChange={(value) => {
                      const newTurbulence = value[0];
                      setTurbulence(newTurbulence);
                      if (shaderSystem) {
                        shaderSystem.updateParameter('u_turbulence', newTurbulence);
                      }
                    }}
                    min={0}
                    max={8}
                    step={0.1}
                    className="w-full"
                  />
                </div>
              )}

              {currentShader === 'fluid' && (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-foreground">Viscosity</label>
                      <Badge variant="secondary" className="text-xs">{viscosity.toFixed(3)}</Badge>
                    </div>
                    <Slider
                      value={[viscosity]}
                      onValueChange={(value) => {
                        const newViscosity = value[0];
                        setViscosity(newViscosity);
                        if (shaderSystem) {
                          shaderSystem.updateParameter('u_viscosity', newViscosity);
                        }
                      }}
                      min={0.1}
                      max={2}
                      step={0.01}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-foreground">Pressure</label>
                      <Badge variant="secondary" className="text-xs">{pressure.toFixed(2)}</Badge>
                    </div>
                    <Slider
                      value={[pressure]}
                      onValueChange={(value) => {
                        const newPressure = value[0];
                        setPressure(newPressure);
                        if (shaderSystem) {
                          shaderSystem.updateParameter('u_pressure', newPressure);
                        }
                      }}
                      min={0}
                      max={5}
                      step={0.1}
                      className="w-full"
                    />
                  </div>
                </>
              )}

              {currentShader === 'particle' && (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-foreground">Particle Count</label>
                      <Badge variant="secondary" className="text-xs">{particleCount}</Badge>
                    </div>
                    <Slider
                      value={[particleCount]}
                      onValueChange={(value) => {
                        const newCount = Math.round(value[0]);
                        setParticleCount(newCount);
                        if (shaderSystem) {
                          shaderSystem.updateParameter('u_particleCount', newCount);
                        }
                      }}
                      min={5}
                      max={50}
                      step={1}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-foreground">Particle Size</label>
                      <Badge variant="secondary" className="text-xs">{particleSize.toFixed(2)}</Badge>
                    </div>
                    <Slider
                      value={[particleSize]}
                      onValueChange={(value) => {
                        const newSize = value[0];
                        setParticleSize(newSize);
                        if (shaderSystem) {
                          shaderSystem.updateParameter('u_particleSize', newSize);
                        }
                      }}
                      min={0.1}
                      max={5}
                      step={0.1}
                      className="w-full"
                    />
                  </div>
                </>
              )}

              {currentShader === 'kaleidoscope' && (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-foreground">Segments</label>
                      <Badge variant="secondary" className="text-xs">{segments}</Badge>
                    </div>
                    <Slider
                      value={[segments]}
                      onValueChange={(value) => {
                        const newSegments = Math.round(value[0]);
                        setSegments(newSegments);
                        if (shaderSystem) {
                          shaderSystem.updateParameter('u_segments', newSegments);
                        }
                      }}
                      min={3}
                      max={12}
                      step={1}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-foreground">Rotation</label>
                      <Badge variant="secondary" className="text-xs">{rotation.toFixed(2)}</Badge>
                    </div>
                    <Slider
                      value={[rotation]}
                      onValueChange={(value) => {
                        const newRotation = value[0];
                        setRotation(newRotation);
                        if (shaderSystem) {
                          shaderSystem.updateParameter('u_rotation', newRotation);
                        }
                      }}
                      min={0}
                      max={6.28}
                      step={0.1}
                      className="w-full"
                    />
                  </div>
                </>
              )}

              {/* Mouse Interaction Control */}
              <div className="bg-muted/20 rounded-lg p-4 border border-control-border/30 space-y-4">
                <h4 className="text-sm font-semibold text-foreground">Mouse Interaction</h4>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">Enable Mouse Movement</label>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="text-xs bg-primary/20 text-primary px-2 py-1">
                      {mouseInteractionEnabled ? 'ON' : 'OFF'}
                    </Badge>
                    <Switch
                      checked={mouseInteractionEnabled}
                      onCheckedChange={setMouseInteractionEnabled}
                    />
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Toggle mouse cursor movement effects on the shader. When disabled, the shader will ignore mouse position and create static effects.
                </p>
              </div>

              {/* Universal Grain Effects for All Shaders (except fluidInteractive which has its own) */}
              {currentShader !== 'fluidInteractive' && (
                <div className="bg-muted/20 rounded-lg p-4 border border-control-border/30 space-y-4">
                  <h4 className="text-sm font-semibold text-foreground">Grain Effects</h4>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-foreground">Grain Intensity</label>
                      <Badge variant="secondary" className="text-xs bg-primary/20 text-primary px-2 py-1">
                        {grainIntensity.toFixed(2)}
                      </Badge>
                    </div>
                    <Slider
                      value={[grainIntensity]}
                      onValueChange={(value) => {
                        const newIntensity = value[0];
                        setGrainIntensity(newIntensity);
                      }}
                      min={0.0}
                      max={1.0}
                      step={0.01}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-foreground">Grain Size</label>
                      <Badge variant="secondary" className="text-xs bg-primary/20 text-primary px-2 py-1">
                        {grainSize.toFixed(0)}
                      </Badge>
                    </div>
                    <Slider
                      value={[grainSize]}
                      onValueChange={(value) => {
                        const newSize = value[0];
                        setGrainSize(newSize);
                      }}
                      min={10.0}
                      max={500.0}
                      step={5.0}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-foreground">Grain Speed</label>
                      <Badge variant="secondary" className="text-xs bg-primary/20 text-primary px-2 py-1">
                        {grainSpeed.toFixed(2)}
                      </Badge>
                    </div>
                    <Slider
                      value={[grainSpeed]}
                      onValueChange={(value) => {
                        const newSpeed = value[0];
                        setGrainSpeed(newSpeed);
                      }}
                      min={0.0}
                      max={5.0}
                      step={0.1}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-foreground">Grain Contrast</label>
                      <Badge variant="secondary" className="text-xs bg-primary/20 text-primary px-2 py-1">
                        {grainContrast.toFixed(2)}
                      </Badge>
                    </div>
                    <Slider
                      value={[grainContrast]}
                      onValueChange={(value) => {
                        const newContrast = value[0];
                        setGrainContrast(newContrast);
                      }}
                      min={0.1}
                      max={3.0}
                      step={0.05}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-foreground">Grain Type</label>
                      <Badge variant="secondary" className="text-xs bg-primary/20 text-primary px-2 py-1">
                        {['Film', 'Digital', 'Organic', 'Animated', 'Halftone'][grainType]}
                      </Badge>
                    </div>
                    <Select value={grainType.toString()} onValueChange={(value) => {
                      const newType = parseInt(value);
                      setGrainType(newType);
                    }}>
                      <SelectTrigger className="bg-control-bg border-control-border hover:border-primary/50 transition-colors">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-control-bg border-control-border">
                        <SelectItem value="0">Film Grain</SelectItem>
                        <SelectItem value="1">Digital Noise</SelectItem>
                        <SelectItem value="2">Organic Grain</SelectItem>
                        <SelectItem value="3">Animated Grain</SelectItem>
                        <SelectItem value="4">Halftone Pattern</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-foreground">Blend Mode</label>
                      <Badge variant="secondary" className="text-xs bg-primary/20 text-primary px-2 py-1">
                        {['Overlay', 'Multiply', 'Screen', 'Soft Light', 'Linear'][grainBlendMode]}
                      </Badge>
                    </div>
                    <Select value={grainBlendMode.toString()} onValueChange={(value) => {
                      const newBlendMode = parseInt(value);
                      setGrainBlendMode(newBlendMode);
                    }}>
                      <SelectTrigger className="bg-control-bg border-control-border hover:border-primary/50 transition-colors">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-control-bg border-control-border">
                        <SelectItem value="0">Overlay</SelectItem>
                        <SelectItem value="1">Multiply</SelectItem>
                        <SelectItem value="2">Screen</SelectItem>
                        <SelectItem value="3">Soft Light</SelectItem>
                        <SelectItem value="4">Linear</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

            </TabsContent>
          </div>
        </Tabs>
      </Card>
    </div>
  );
};