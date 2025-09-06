import { useEffect, useRef, useState } from 'react';
import { ShaderSystem } from '@/lib/shaderSystem';
import { ShaderControls } from '@/components/ShaderControls';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Info, Github, ExternalLink } from 'lucide-react';
import { parseShareableURL } from '@/lib/exportUtils';

export const ShaderStudio = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shaderSystemRef = useRef<ShaderSystem | null>(null);
  const animationRef = useRef<number>();
  const [isLoaded, setIsLoaded] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [sharedConfig, setSharedConfig] = useState<any>(null);

  // Parse URL parameters on mount
  useEffect(() => {
    const currentUrl = window.location.href;
    const parsedConfig = parseShareableURL(currentUrl);
    if (parsedConfig) {
      setSharedConfig(parsedConfig);
      // Shared configuration loaded from URL
    }
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Initialize shader system
    const shaderSystem = new ShaderSystem(canvasRef.current);
    shaderSystemRef.current = shaderSystem;

    // Start render loop
    const animate = () => {
      shaderSystem.render();
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();
    setIsLoaded(true);

    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      shaderSystem.dispose();
    };
  }, []);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ display: 'block' }}
      />

      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-10 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-bold text-foreground drop-shadow-lg">
              Vector Field Studio
            </h1>
            <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
              WebGL + Three.js
            </Badge>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowInfo(!showInfo)}
              className="text-foreground/80 hover:text-foreground hover:bg-background/20"
            >
              <Info className="w-4 h-4 mr-2" />
              Info
            </Button>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-foreground/80 hover:text-foreground hover:bg-background/20"
            >
              <a href="https://github.com/Harsh-dev3221/WebGl_Magic" target="_blank" rel="noopener noreferrer">
                <Github className="w-4 h-4 mr-2" />
                Source
              </a>
            </Button>
          </div>
        </div>
      </header>

      {/* Info Panel */}
      {showInfo && (
        <div className="absolute inset-0 z-20 bg-background/80 backdrop-blur-sm flex items-center justify-center p-6">
          <Card className="max-w-2xl bg-control-bg/90 backdrop-blur-md border-control-border p-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground">About Vector Field Studio</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowInfo(false)}
                className="text-foreground/60 hover:text-foreground"
              >
                ✕
              </Button>
            </div>

            <div className="space-y-4 text-foreground/90">
              <p>
                A real-time procedural background generator using advanced WebGL shaders and Three.js.
                Experience four different noise algorithms creating fluid, animated gradients.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h3 className="font-semibold text-primary">Shader Types</h3>
                  <ul className="text-sm space-y-1 text-foreground/80">
                    <li><strong>Classic:</strong> Layered Simplex noise</li>
                    <li><strong>Vector:</strong> Curl noise flow fields</li>
                    <li><strong>Turbulence:</strong> Domain warping</li>
                    <li><strong>Plasma:</strong> Sine wave interference</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-accent">Features</h3>
                  <ul className="text-sm space-y-1 text-foreground/80">
                    <li>• Real-time parameter control</li>
                    <li>• Mouse interaction</li>
                    <li>• Color palette randomization</li>
                    <li>• Optimized for 60fps</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-center space-x-4 pt-4 border-t border-control-border">
                <Button variant="outline" size="sm" asChild>
                  <a href="https://threejs.org" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Three.js Docs
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href="https://www.shadertoy.com" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Shadertoy
                  </a>
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Controls Panel - Responsive */}
      <div className="absolute top-24 right-6 z-10 w-80 max-w-[calc(100vw-3rem)] max-h-[calc(100vh-8rem)] overflow-y-auto">
        {isLoaded && (
          <ShaderControls
            shaderSystem={shaderSystemRef.current}
            initialConfig={sharedConfig}
          />
        )}
      </div>

      {/* Performance indicator */}
      <div className="absolute bottom-6 left-6 z-10">
        <Badge
          variant="secondary"
          className="bg-control-bg/80 backdrop-blur-sm text-foreground/80 border-control-border"
        >
          {isLoaded ? 'WebGL Active' : 'Loading...'}
        </Badge>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-6 left-6 z-10">
        <Card className="bg-control-bg/60 backdrop-blur-sm border-control-border p-3">
          <p className="text-xs text-foreground/70">
            Move mouse to interact • Use controls to customize
          </p>
        </Card>
      </div>
    </div>
  );
};