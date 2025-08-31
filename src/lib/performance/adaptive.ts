// Adaptive quality system for optimal performance across devices

export interface DeviceCapabilities {
  gpu: 'high' | 'medium' | 'low';
  memory: number; // MB
  pixelRatio: number;
  maxTextureSize: number;
  floatTextures: boolean;
  hasWebGL2: boolean;
}

export interface QualitySettings {
  shaderComplexity: 'high' | 'medium' | 'low';
  textureResolution: number;
  animationQuality: 'smooth' | 'normal' | 'basic';
  effectsEnabled: boolean;
  antiAliasing: boolean;
  precision: 'highp' | 'mediump' | 'lowp';
}

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  gpuTime: number;
  memoryUsage: number;
  droppedFrames: number;
}

export class AdaptiveQualityManager {
  private capabilities: DeviceCapabilities;
  private currentQuality: QualitySettings;
  private metrics: PerformanceMetrics;
  private targetFPS: number = 60;
  private minFPS: number = 30;
  private performanceHistory: number[] = [];
  private maxHistorySize: number = 60; // 1 second at 60fps

  constructor() {
    this.capabilities = this.detectCapabilities();
    this.currentQuality = this.getInitialQuality();
    this.metrics = this.initializeMetrics();
  }

  updatePerformanceMetrics(metrics: Partial<PerformanceMetrics>) {
    this.metrics = { ...this.metrics, ...metrics };
    this.updateMetrics(this.metrics.frameTime);
  }

  getCurrentQuality(): string {
    return this.currentQuality.shaderComplexity;
  }

  private detectCapabilities(): DeviceCapabilities {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    
    if (!gl) {
      return {
        gpu: 'low',
        memory: 512,
        pixelRatio: 1,
        maxTextureSize: 1024,
        floatTextures: false,
        hasWebGL2: false
      };
    }

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : '';
    const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : '';
    
    // Detect GPU tier based on renderer string
    let gpuTier: 'high' | 'medium' | 'low' = 'medium';
    
    const highEndGPUs = [
      'nvidia', 'geforce', 'quadro', 'tesla',
      'amd', 'radeon', 'rx ', 'r9', 'r7',
      'intel iris', 'intel hd 5', 'intel hd 6',
      'apple', 'm1', 'm2', 'a15', 'a14'
    ];
    
    const lowEndGPUs = [
      'intel hd 3', 'intel hd 4',
      'intel gma', 'intel graphics',
      'mali-400', 'mali-450', 'adreno 3',
      'powervr sgx'
    ];

    const rendererLower = renderer.toLowerCase();
    const vendorLower = vendor.toLowerCase();
    const combined = `${rendererLower} ${vendorLower}`;

    if (highEndGPUs.some(gpu => combined.includes(gpu))) {
      gpuTier = 'high';
    } else if (lowEndGPUs.some(gpu => combined.includes(gpu))) {
      gpuTier = 'low';
    }

    // Additional checks for mobile devices
    if (this.isMobile()) {
      gpuTier = gpuTier === 'high' ? 'medium' : 'low';
    }

    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    const floatTextures = !!gl.getExtension('OES_texture_float');
    const hasWebGL2 = gl instanceof WebGL2RenderingContext;

    return {
      gpu: gpuTier,
      memory: this.estimateMemory(),
      pixelRatio: Math.min(window.devicePixelRatio, 2),
      maxTextureSize,
      floatTextures,
      hasWebGL2
    };
  }

  private isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  private estimateMemory(): number {
    // @ts-ignore - Non-standard API
    if (navigator.deviceMemory) {
      // @ts-ignore
      return navigator.deviceMemory * 1024; // Convert GB to MB
    }
    
    // Fallback estimation based on device type
    if (this.isMobile()) {
      return 2048; // 2GB typical for mobile
    }
    
    return 4096; // 4GB typical for desktop
  }

  private getInitialQuality(): QualitySettings {
    const { gpu, memory, hasWebGL2 } = this.capabilities;
    
    if (gpu === 'high' && memory > 4096) {
      return {
        shaderComplexity: 'high',
        textureResolution: 512,
        animationQuality: 'smooth',
        effectsEnabled: true,
        antiAliasing: true,
        precision: hasWebGL2 ? 'highp' : 'mediump'
      };
    }
    
    if (gpu === 'medium' && memory > 2048) {
      return {
        shaderComplexity: 'medium',
        textureResolution: 256,
        animationQuality: 'normal',
        effectsEnabled: true,
        antiAliasing: false,
        precision: 'mediump'
      };
    }
    
    return {
      shaderComplexity: 'low',
      textureResolution: 128,
      animationQuality: 'basic',
      effectsEnabled: false,
      antiAliasing: false,
      precision: 'mediump'
    };
  }

  private initializeMetrics(): PerformanceMetrics {
    return {
      fps: 60,
      frameTime: 16.67,
      gpuTime: 0,
      memoryUsage: 0,
      droppedFrames: 0
    };
  }

  // Update performance metrics
  updateMetrics(frameTime: number) {
    this.metrics.frameTime = frameTime;
    this.metrics.fps = 1000 / frameTime;
    
    // Track performance history
    this.performanceHistory.push(this.metrics.fps);
    if (this.performanceHistory.length > this.maxHistorySize) {
      this.performanceHistory.shift();
    }
    
    // Count dropped frames
    if (this.metrics.fps < this.minFPS) {
      this.metrics.droppedFrames++;
    }
    
    // Auto-adjust quality if needed
    this.autoAdjustQuality();
  }

  private autoAdjustQuality() {
    if (this.performanceHistory.length < 30) return; // Need enough samples
    
    const recentFPS = this.performanceHistory.slice(-30);
    const averageFPS = recentFPS.reduce((sum, fps) => sum + fps, 0) / recentFPS.length;
    const lowFPSFrames = recentFPS.filter(fps => fps < this.minFPS).length;
    
    // If performance is consistently poor, reduce quality
    if (lowFPSFrames > 10 && this.canReduceQuality()) {
      this.reduceQuality();
      this.performanceHistory = []; // Reset history after change
    }
    
    // If performance is consistently good, try to increase quality
    else if (averageFPS > this.targetFPS * 0.9 && lowFPSFrames === 0 && this.canIncreaseQuality()) {
      this.increaseQuality();
      this.performanceHistory = []; // Reset history after change
    }
  }

  private canReduceQuality(): boolean {
    const { shaderComplexity, textureResolution, effectsEnabled, antiAliasing } = this.currentQuality;
    
    return shaderComplexity !== 'low' || 
           textureResolution > 64 || 
           effectsEnabled || 
           antiAliasing;
  }

  private canIncreaseQuality(): boolean {
    const { shaderComplexity, textureResolution, effectsEnabled, antiAliasing } = this.currentQuality;
    const maxTexture = Math.min(512, this.capabilities.maxTextureSize / 4);
    
    return shaderComplexity !== 'high' || 
           textureResolution < maxTexture || 
           !effectsEnabled || 
           !antiAliasing;
  }

  private reduceQuality() {
    const quality = { ...this.currentQuality };
    
    // Reduce in order of visual impact
    if (quality.antiAliasing) {
      quality.antiAliasing = false;
    } else if (quality.effectsEnabled) {
      quality.effectsEnabled = false;
    } else if (quality.textureResolution > 64) {
      quality.textureResolution = Math.max(64, quality.textureResolution / 2);
    } else if (quality.shaderComplexity === 'high') {
      quality.shaderComplexity = 'medium';
    } else if (quality.shaderComplexity === 'medium') {
      quality.shaderComplexity = 'low';
    } else if (quality.animationQuality === 'smooth') {
      quality.animationQuality = 'normal';
    } else if (quality.animationQuality === 'normal') {
      quality.animationQuality = 'basic';
    }
    
    this.currentQuality = quality;
    console.log('Reduced quality settings:', quality);
  }

  private increaseQuality() {
    const quality = { ...this.currentQuality };
    const maxTexture = Math.min(512, this.capabilities.maxTextureSize / 4);
    
    // Increase in reverse order
    if (quality.animationQuality === 'basic') {
      quality.animationQuality = 'normal';
    } else if (quality.animationQuality === 'normal' && this.capabilities.gpu !== 'low') {
      quality.animationQuality = 'smooth';
    } else if (quality.shaderComplexity === 'low') {
      quality.shaderComplexity = 'medium';
    } else if (quality.shaderComplexity === 'medium' && this.capabilities.gpu === 'high') {
      quality.shaderComplexity = 'high';
    } else if (quality.textureResolution < maxTexture) {
      quality.textureResolution = Math.min(maxTexture, quality.textureResolution * 2);
    } else if (!quality.effectsEnabled && this.capabilities.gpu !== 'low') {
      quality.effectsEnabled = true;
    } else if (!quality.antiAliasing && this.capabilities.gpu === 'high') {
      quality.antiAliasing = true;
    }
    
    this.currentQuality = quality;
    console.log('Increased quality settings:', quality);
  }

  // Get current quality settings
  getQualitySettings(): QualitySettings {
    return { ...this.currentQuality };
  }

  // Get device capabilities
  getCapabilities(): DeviceCapabilities {
    return { ...this.capabilities };
  }

  // Get performance metrics
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  // Manually set quality (for user override)
  setQuality(quality: Partial<QualitySettings>) {
    this.currentQuality = { ...this.currentQuality, ...quality };
    this.performanceHistory = []; // Reset history after manual change
  }

  // Get shader defines based on current quality
  getShaderDefines(): string[] {
    const defines: string[] = [];
    const { shaderComplexity, effectsEnabled, precision } = this.currentQuality;
    
    defines.push(`#define PRECISION ${precision}`);
    
    if (shaderComplexity === 'high') {
      defines.push('#define HIGH_QUALITY');
      defines.push('#define MAX_OCTAVES 8');
    } else if (shaderComplexity === 'medium') {
      defines.push('#define MEDIUM_QUALITY');
      defines.push('#define MAX_OCTAVES 6');
    } else {
      defines.push('#define LOW_QUALITY');
      defines.push('#define MAX_OCTAVES 4');
    }
    
    if (effectsEnabled) {
      defines.push('#define EFFECTS_ENABLED');
    }
    
    if (this.capabilities.floatTextures) {
      defines.push('#define FLOAT_TEXTURES');
    }
    
    return defines;
  }
}