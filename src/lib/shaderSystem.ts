import * as THREE from 'three';
import {
  classicGradientShader,
  vectorFlowShader,
  turbulenceShader,
  plasmaShader,
  fluidShader,
  particleShader,
  kaleidoscopeShader,
  vertexShader
} from './shaders/fragmentShaders';
import { QualityManager, QualityLevel } from './performance/qualityManager';
import { GradientSampler } from './color/gradients';
import { enhancedNoiseSystem } from './shaders/enhancedNoise';
import { FluidSystem } from './fluid/FluidSystem';
import { FluidConfig, defaultFluidConfig } from './shaders/fluidShaders';
import { UniversalGrainConfig, defaultGrainConfig, addGrainToShader } from './shaders/universalGrain';

export interface ShaderUniforms {
  [key: string]: { value: any };
  u_time: { value: number };
  u_resolution: { value: THREE.Vector2 };
  u_mouse: { value: THREE.Vector2 };
  u_color1: { value: THREE.Vector3 };
  u_color2: { value: THREE.Vector3 };
  u_color3: { value: THREE.Vector3 };
  u_speed: { value: number };
  u_scale: { value: number };
  u_octaves: { value: number };
  u_lacunarity: { value: number };
  u_persistence: { value: number };
  u_flow_strength?: { value: number };
  u_turbulence?: { value: number };
  u_plasma_intensity?: { value: number };
  u_viscosity?: { value: number };
  u_pressure?: { value: number };
  u_particleCount?: { value: number };
  u_particleSize?: { value: number };
  u_segments?: { value: number };
  u_rotation?: { value: number };
  u_gradientTexture?: { value: THREE.DataTexture | null };

  // Universal grain uniforms
  u_grainIntensity: { value: number };
  u_grainSize: { value: number };
  u_grainSpeed: { value: number };
  u_grainContrast: { value: number };
  u_grainType: { value: number };
  u_grainBlendMode: { value: number };

  // Mouse interaction control
  u_mouseInteractionEnabled: { value: number };
}

export type ShaderType = 'classic' | 'vector' | 'turbulence' | 'plasma' | 'fluid' | 'particle' | 'kaleidoscope' | 'fluidInteractive';

export class ShaderSystem {
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer;
  private material: THREE.ShaderMaterial;
  private mesh: THREE.Mesh;
  private uniforms: ShaderUniforms;
  private qualityManager: QualityManager;
  private gradientTexture: THREE.DataTexture | null = null;
  private lastFrameTime: number = 0;
  private clock: THREE.Clock;
  private mouse: THREE.Vector2;
  private currentShader: ShaderType = 'classic';
  private fluidSystem: FluidSystem | null = null;
  private grainConfig: UniversalGrainConfig;

  constructor(canvas: HTMLCanvasElement) {
    // Initialize Three.js components
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false
    });

    this.clock = new THREE.Clock();
    this.mouse = new THREE.Vector2();

    // Set renderer properties
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Initialize uniforms
    this.uniforms = {
      u_time: { value: 0.0 },
      u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      u_mouse: { value: new THREE.Vector2() },
      u_color1: { value: new THREE.Vector3(0.8, 0.2, 0.9) }, // Purple
      u_color2: { value: new THREE.Vector3(0.2, 0.8, 0.9) }, // Cyan
      u_color3: { value: new THREE.Vector3(0.9, 0.4, 0.2) }, // Orange
      u_speed: { value: 0.5 },
      u_scale: { value: 2.0 },
      u_octaves: { value: 4 },
      u_lacunarity: { value: 2.0 },
      u_persistence: { value: 0.5 },
      u_flow_strength: { value: 1.0 },
      u_turbulence: { value: 4.0 },
      u_plasma_intensity: { value: 1.5 },
      u_viscosity: { value: 0.8 },
      u_pressure: { value: 2.0 },
      u_particleCount: { value: 25 },
      u_particleSize: { value: 1.0 },
      u_segments: { value: 6 },
      u_rotation: { value: 0 },
      u_gradientTexture: { value: null },

      // Universal grain uniforms
      u_grainIntensity: { value: defaultGrainConfig.grainIntensity },
      u_grainSize: { value: defaultGrainConfig.grainSize },
      u_grainSpeed: { value: defaultGrainConfig.grainSpeed },
      u_grainContrast: { value: defaultGrainConfig.grainContrast },
      u_grainType: { value: defaultGrainConfig.grainType },
      u_grainBlendMode: { value: defaultGrainConfig.grainBlendMode },

      // Mouse interaction control
      u_mouseInteractionEnabled: { value: 1.0 } // 1.0 = enabled, 0.0 = disabled
    };

    // Initialize grain configuration
    this.grainConfig = { ...defaultGrainConfig };

    // Create geometry and material
    const geometry = new THREE.PlaneGeometry(2, 2);
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader,
      fragmentShader: classicGradientShader,
      side: THREE.DoubleSide
    });

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.scene.add(this.mesh);

    // Initialize quality manager
    this.qualityManager = new QualityManager();

    // Event listeners
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Mouse movement
    window.addEventListener('mousemove', (event) => {
      this.mouse.x = event.clientX;
      this.mouse.y = window.innerHeight - event.clientY; // Flip Y coordinate
      this.uniforms.u_mouse.value.copy(this.mouse);
    });

    // Window resize
    window.addEventListener('resize', () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      this.renderer.setSize(width, height);
      this.uniforms.u_resolution.value.set(width, height);
    });
  }

  switchShader(type: ShaderType) {
    this.currentShader = type;

    // Handle fluid interactive mode separately
    if (type === 'fluidInteractive') {
      // Dispose existing fluid system if any
      if (this.fluidSystem) {
        this.fluidSystem.dispose();
      }

      // Create new fluid system
      this.fluidSystem = new FluidSystem(this.renderer.domElement, defaultFluidConfig);
      return;
    } else {
      // Dispose fluid system if switching away from it
      if (this.fluidSystem) {
        this.fluidSystem.dispose();
        this.fluidSystem = null;
      }
    }

    let fragmentShader: string;
    switch (type) {
      case 'classic':
        fragmentShader = classicGradientShader;
        break;
      case 'vector':
        fragmentShader = vectorFlowShader;
        break;
      case 'turbulence':
        fragmentShader = turbulenceShader;
        break;
      case 'plasma':
        fragmentShader = plasmaShader;
        break;
      case 'fluid':
        fragmentShader = fluidShader;
        break;
      case 'particle':
        fragmentShader = particleShader;
        break;
      case 'kaleidoscope':
        fragmentShader = kaleidoscopeShader;
        break;
      default:
        fragmentShader = classicGradientShader;
    }

    // All shaders now have grain support

    // Create new material with updated shader
    const newMaterial = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader,
      fragmentShader,
      side: THREE.DoubleSide
    });

    // Update mesh material
    (this.mesh.material as THREE.ShaderMaterial).dispose();
    this.mesh.material = newMaterial;
    this.material = newMaterial;
  }

  updateColors(color1: string, color2: string, color3: string) {
    const c1 = new THREE.Color(color1);
    const c2 = new THREE.Color(color2);
    const c3 = new THREE.Color(color3);

    this.uniforms.u_color1.value.set(c1.r, c1.g, c1.b);
    this.uniforms.u_color2.value.set(c2.r, c2.g, c2.b);
    this.uniforms.u_color3.value.set(c3.r, c3.g, c3.b);

    // Force immediate visual update
    this.material.needsUpdate = true;
  }

  updateParameter(name: keyof ShaderUniforms, value: number) {
    if (this.uniforms[name]) {
      (this.uniforms[name] as { value: number }).value = value;
      // Force material update for immediate visual feedback
      this.material.needsUpdate = true;
    }
  }

  // Update gradient texture for advanced color system
  updateGradientTexture(data: Float32Array) {
    if (!this.material) return;

    const texture = new THREE.DataTexture(
      data,
      data.length / 4, 1,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    texture.needsUpdate = true;

    if (this.uniforms.u_gradientTexture) {
      this.uniforms.u_gradientTexture.value = texture;
    }
  }

  // Get current FPS for performance monitoring
  getFPS(): number {
    return this.fps;
  }

  private fps = 60;

  randomizeColors() {
    const colors = [
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
      ['#ff073a', '#39ff14', '#ff9600']
    ];

    const randomPalette = colors[Math.floor(Math.random() * colors.length)];
    this.updateColors(randomPalette[0], randomPalette[1], randomPalette[2]);
  }

  render() {
    // Calculate FPS and update performance metrics
    const currentTime = performance.now();
    if (this.lastFrameTime > 0) {
      const deltaTime = currentTime - this.lastFrameTime;
      this.fps = 1000 / deltaTime;
      this.qualityManager.updatePerformanceMetrics(this.fps, deltaTime);
    }
    this.lastFrameTime = currentTime;

    // Handle fluid interactive rendering
    if (this.currentShader === 'fluidInteractive' && this.fluidSystem) {
      this.fluidSystem.render();
    } else {
      this.uniforms.u_time.value = this.clock.getElapsedTime();
      this.renderer.render(this.scene, this.camera);
    }
  }

  // Get quality manager for external access
  getQualityManager(): QualityManager {
    return this.qualityManager;
  }

  // Update shader with current quality settings
  updateShaderQuality() {
    const defines = this.qualityManager.getShaderDefines();
    const settings = this.qualityManager.getQualitySettings();

    // Update uniform values based on quality
    this.updateParameter('u_octaves', settings.octaves);

    // Recreate material with quality defines and enhanced noise system
    const qualityFragmentShader = defines + '\n' + enhancedNoiseSystem + '\n' + this.getFragmentShaderForType(this.currentShader);

    const newMaterial = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader,
      fragmentShader: qualityFragmentShader,
      side: THREE.DoubleSide
    });

    // Update mesh material
    (this.mesh.material as THREE.ShaderMaterial).dispose();
    this.mesh.material = newMaterial;
    this.material = newMaterial;
  }

  private getFragmentShaderForType(type: ShaderType): string {
    // Early return for fluidInteractive to avoid unreachable comparison warning
    if (type === 'fluidInteractive') {
      return ''; // Handled externally by FluidSystem
    }

    let fragmentShader: string;
    switch (type) {
      case 'classic':
        fragmentShader = classicGradientShader;
        break;
      case 'vector':
        fragmentShader = vectorFlowShader;
        break;
      case 'turbulence':
        fragmentShader = turbulenceShader;
        break;
      case 'plasma':
        fragmentShader = plasmaShader;
        break;
      case 'fluid':
        fragmentShader = fluidShader;
        break;
      case 'particle':
        fragmentShader = particleShader;
        break;
      case 'kaleidoscope':
        fragmentShader = kaleidoscopeShader;
        break;
      default:
        fragmentShader = classicGradientShader;
    }

    // Add universal grain support (applies to all non-interactive shaders)
    fragmentShader = addGrainToShader(fragmentShader);
    return fragmentShader;
  }

  dispose() {
    if (this.fluidSystem) {
      this.fluidSystem.dispose();
    }
    this.renderer.dispose();
    this.material.dispose();
    this.mesh.geometry.dispose();
  }

  // Get fluid system for external configuration
  getFluidSystem(): FluidSystem | null {
    return this.fluidSystem;
  }

  // Update fluid configuration
  updateFluidConfig(config: Partial<FluidConfig>) {
    if (this.fluidSystem) {
      this.fluidSystem.updateConfig(config);
    }
  }

  // Update fluid speed
  updateFluidSpeed(speed: number) {
    if (this.fluidSystem) {
      this.fluidSystem.updateSpeed(speed);
    }
  }

  // Update fluid scale
  updateFluidScale(scale: number) {
    if (this.fluidSystem) {
      this.fluidSystem.updateScale(scale);
    }
  }

  // Update universal grain configuration
  updateGrainConfig(config: Partial<UniversalGrainConfig>) {
    this.grainConfig = { ...this.grainConfig, ...config };

    // Update uniforms
    if (config.grainIntensity !== undefined) {
      this.uniforms.u_grainIntensity.value = config.grainIntensity;
    }
    if (config.grainSize !== undefined) {
      this.uniforms.u_grainSize.value = config.grainSize;
    }
    if (config.grainSpeed !== undefined) {
      this.uniforms.u_grainSpeed.value = config.grainSpeed;
    }
    if (config.grainContrast !== undefined) {
      this.uniforms.u_grainContrast.value = config.grainContrast;
    }
    if (config.grainType !== undefined) {
      this.uniforms.u_grainType.value = config.grainType;
    }
    if (config.grainBlendMode !== undefined) {
      this.uniforms.u_grainBlendMode.value = config.grainBlendMode;
    }
  }

  // Get current grain configuration
  getGrainConfig(): UniversalGrainConfig {
    return { ...this.grainConfig };
  }

  // Update mouse interaction state
  updateMouseInteraction(enabled: boolean) {
    this.uniforms.u_mouseInteractionEnabled.value = enabled ? 1.0 : 0.0;

    // Also update fluid system if it exists
    if (this.fluidSystem) {
      this.fluidSystem.updateMouseInteraction(enabled);
    }
  }

  getRenderer() {
    return this.renderer;
  }
}