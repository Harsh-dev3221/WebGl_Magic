import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
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

    console.log('Applied initial configuration to shader system');
  }, [shaderSystem, initialConfig]);

  useEffect(() => {
    if (!shaderSystem) return;

    shaderSystem.updateParameter('u_speed', isPlaying ? speed : 0);

    // Update gradient texture when config changes
    const texture = generateTexture(256);
    if (texture && shaderSystem.updateGradientTexture) {
      shaderSystem.updateGradientTexture(texture);
    }
  }, [shaderSystem, speed, isPlaying, generateTexture, gradientConfig]);

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
    const newConfig = {
      ...gradientConfig,
      stops: [
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
    kaleidoscope: 'Symmetrical patterns with mirror reflections'
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
                rotation
              }}
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
              Motion
            </TabsTrigger>
            <TabsTrigger value="advanced" className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              <Settings className="w-4 h-4" />
              Noise
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
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                    {shaderDescriptions[currentShader]}
                  </p>
                </div>
              </div>

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
            </TabsContent>

            <TabsContent value="advanced" className="space-y-6 mt-0">
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
            </TabsContent>
          </div>
        </Tabs>
      </Card>
    </div>
  );
};