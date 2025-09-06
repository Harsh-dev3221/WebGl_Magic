import * as THREE from "three";
import {
  vertexShader,
  fluidSimulationShader,
  fluidDisplayShader,
  FluidConfig,
  defaultFluidConfig,
  hexToRgb
} from "../shaders/fluidShaders";

export class FluidSystem {
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer;

  // Render targets for ping-pong fluid simulation
  private fluidTarget1: THREE.WebGLRenderTarget;
  private fluidTarget2: THREE.WebGLRenderTarget;
  private currentFluidTarget: THREE.WebGLRenderTarget;
  private previousFluidTarget: THREE.WebGLRenderTarget;

  // Materials and meshes
  private fluidMaterial: THREE.ShaderMaterial;
  private displayMaterial: THREE.ShaderMaterial;
  private fluidPlane: THREE.Mesh;
  private displayPlane: THREE.Mesh;

  // State tracking
  private frameCount: number = 0;
  private mouseX: number = 0;
  private mouseY: number = 0;
  private prevMouseX: number = 0;
  private prevMouseY: number = 0;
  private lastMoveTime: number = 0;
  private config: FluidConfig;
  private canvas: HTMLCanvasElement;
  private mouseInteractionEnabled: boolean = true;

  constructor(canvas: HTMLCanvasElement, config: FluidConfig = defaultFluidConfig) {
    this.canvas = canvas;
    this.config = { ...config };

    // Initialize Three.js components
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false
    });

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.initializeRenderTargets();
    this.initializeMaterials();
    this.initializeGeometry();
    this.setupEventListeners();
  }

  private initializeRenderTargets() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    const targetOptions = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
    };

    this.fluidTarget1 = new THREE.WebGLRenderTarget(width, height, targetOptions);
    this.fluidTarget2 = new THREE.WebGLRenderTarget(width, height, targetOptions);

    this.currentFluidTarget = this.fluidTarget1;
    this.previousFluidTarget = this.fluidTarget2;
  }

  private initializeMaterials() {
    // Fluid simulation material
    this.fluidMaterial = new THREE.ShaderMaterial({
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        iMouse: { value: new THREE.Vector4(0, 0, 0, 0) },
        iFrame: { value: 0 },
        iPreviousFrame: { value: null },
        uBrushSize: { value: this.config.brushSize },
        uBrushStrength: { value: this.config.brushStrength },
        uFluidDecay: { value: this.config.fluidDecay },
        uTrailLength: { value: this.config.trailLength },
        uStopDecay: { value: this.config.stopDecay },
      },
      vertexShader: vertexShader,
      fragmentShader: fluidSimulationShader,
    });

    // Display material
    this.displayMaterial = new THREE.ShaderMaterial({
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        iFluid: { value: null },
        uDistortionAmount: { value: this.config.distortionAmount },
        uColor1: { value: new THREE.Vector3(...hexToRgb(this.config.color1)) },
        uColor2: { value: new THREE.Vector3(...hexToRgb(this.config.color2)) },
        uColor3: { value: new THREE.Vector3(...hexToRgb(this.config.color3)) },
        uColor4: { value: new THREE.Vector3(...hexToRgb(this.config.color4)) },
        uColorIntensity: { value: this.config.colorIntensity },
        uSoftness: { value: this.config.softness },

        // Grain uniforms
        uGrainIntensity: { value: this.config.grainIntensity },
        uGrainSize: { value: this.config.grainSize },
        uGrainSpeed: { value: this.config.grainSpeed },
        uGrainContrast: { value: this.config.grainContrast },
        uGrainType: { value: this.config.grainType },
        uGrainBlendMode: { value: this.config.grainBlendMode },
      },
      vertexShader: vertexShader,
      fragmentShader: fluidDisplayShader,
    });
  }

  private initializeGeometry() {
    const geometry = new THREE.PlaneGeometry(2, 2);
    this.fluidPlane = new THREE.Mesh(geometry, this.fluidMaterial);
    this.displayPlane = new THREE.Mesh(geometry, this.displayMaterial);
  }

  private setupEventListeners() {
    // Mouse movement tracking
    this.canvas.addEventListener("mousemove", (e) => {
      if (!this.mouseInteractionEnabled) return;

      const rect = this.canvas.getBoundingClientRect();
      this.prevMouseX = this.mouseX;
      this.prevMouseY = this.mouseY;
      this.mouseX = e.clientX - rect.left;
      this.mouseY = rect.height - (e.clientY - rect.top);
      this.lastMoveTime = performance.now();

      this.fluidMaterial.uniforms.iMouse.value.set(
        this.mouseX,
        this.mouseY,
        this.prevMouseX,
        this.prevMouseY
      );
    });

    // Mouse leave event
    this.canvas.addEventListener("mouseleave", () => {
      this.fluidMaterial.uniforms.iMouse.value.set(0, 0, 0, 0);
    });

    // Window resize
    window.addEventListener("resize", () => {
      this.handleResize();
    });
  }

  private handleResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.renderer.setSize(width, height);
    this.fluidMaterial.uniforms.iResolution.value.set(width, height);
    this.displayMaterial.uniforms.iResolution.value.set(width, height);

    this.fluidTarget1.setSize(width, height);
    this.fluidTarget2.setSize(width, height);
    this.frameCount = 0;
  }

  public updateConfig(newConfig: Partial<FluidConfig>) {
    this.config = { ...this.config, ...newConfig };

    // Update fluid simulation uniforms
    this.fluidMaterial.uniforms.uBrushSize.value = this.config.brushSize;
    this.fluidMaterial.uniforms.uBrushStrength.value = this.config.brushStrength;
    this.fluidMaterial.uniforms.uFluidDecay.value = this.config.fluidDecay;
    this.fluidMaterial.uniforms.uTrailLength.value = this.config.trailLength;
    this.fluidMaterial.uniforms.uStopDecay.value = this.config.stopDecay;

    // Update display uniforms
    this.displayMaterial.uniforms.uDistortionAmount.value = this.config.distortionAmount;
    this.displayMaterial.uniforms.uColorIntensity.value = this.config.colorIntensity;
    this.displayMaterial.uniforms.uSoftness.value = this.config.softness;
    this.displayMaterial.uniforms.uColor1.value.set(...hexToRgb(this.config.color1));
    this.displayMaterial.uniforms.uColor2.value.set(...hexToRgb(this.config.color2));
    this.displayMaterial.uniforms.uColor3.value.set(...hexToRgb(this.config.color3));
    this.displayMaterial.uniforms.uColor4.value.set(...hexToRgb(this.config.color4));

    // Update grain uniforms
    this.displayMaterial.uniforms.uGrainIntensity.value = this.config.grainIntensity;
    this.displayMaterial.uniforms.uGrainSize.value = this.config.grainSize;
    this.displayMaterial.uniforms.uGrainSpeed.value = this.config.grainSpeed;
    this.displayMaterial.uniforms.uGrainContrast.value = this.config.grainContrast;
    this.displayMaterial.uniforms.uGrainType.value = this.config.grainType;
    this.displayMaterial.uniforms.uGrainBlendMode.value = this.config.grainBlendMode;
  }

  // Add methods to update speed and scale
  public updateSpeed(speed: number) {
    // Speed affects time progression - we can store this and use it in render
    this.timeMultiplier = speed;
  }

  public updateScale(scale: number) {
    // Scale could affect the pattern resolution or distortion scale
    this.patternScale = scale;
  }

  public updateMouseInteraction(enabled: boolean) {
    this.mouseInteractionEnabled = enabled;
  }

  private timeMultiplier: number = 1.0;
  private patternScale: number = 1.0;

  public render() {
    const time = performance.now() * 0.001 * this.timeMultiplier;

    // Update time uniforms
    this.fluidMaterial.uniforms.iTime.value = time;
    this.displayMaterial.uniforms.iTime.value = time;
    this.fluidMaterial.uniforms.iFrame.value = this.frameCount;

    // Clear mouse interaction if no recent movement or if mouse interaction is disabled
    if (!this.mouseInteractionEnabled || performance.now() - this.lastMoveTime > 100) {
      this.fluidMaterial.uniforms.iMouse.value.set(0, 0, 0, 0);
    }

    // Update all config-based uniforms
    this.updateConfig({});

    // Render fluid simulation to target
    this.fluidMaterial.uniforms.iPreviousFrame.value = this.previousFluidTarget.texture;
    this.renderer.setRenderTarget(this.currentFluidTarget);
    this.renderer.render(this.fluidPlane, this.camera);

    // Render display pass to screen
    this.displayMaterial.uniforms.iFluid.value = this.currentFluidTarget.texture;
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.displayPlane, this.camera);

    // Swap render targets for next frame
    const temp = this.currentFluidTarget;
    this.currentFluidTarget = this.previousFluidTarget;
    this.previousFluidTarget = temp;

    this.frameCount++;
  }

  public getConfig(): FluidConfig {
    return { ...this.config };
  }

  public dispose() {
    this.fluidTarget1.dispose();
    this.fluidTarget2.dispose();
    this.fluidMaterial.dispose();
    this.displayMaterial.dispose();
    this.fluidPlane.geometry.dispose();
    this.displayPlane.geometry.dispose();
  }
}
