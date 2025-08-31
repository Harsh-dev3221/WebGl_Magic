// Quality management system for adaptive performance optimization

export interface QualitySettings {
  level: QualityLevel;
  octaves: number;
  epsilon: number;
  precision: 'lowp' | 'mediump' | 'highp';
  maxParticles: number;
  enableAdvancedEffects: boolean;
  useOptimizedNoise: boolean;
}

export enum QualityLevel {
  Low = 0,
  Medium = 1,
  High = 2,
  Ultra = 3
}

export class QualityManager {
  private currentQuality: QualityLevel = QualityLevel.Medium;
  private deviceCapabilities: DeviceCapabilities;
  private performanceMetrics: PerformanceMetrics;

  constructor() {
    this.deviceCapabilities = this.detectDeviceCapabilities();
    this.performanceMetrics = {
      fps: 60,
      frameTime: 16.67,
      averageFps: 60,
      dropped: 0
    };
    
    // Set initial quality based on device capabilities
    this.currentQuality = this.getRecommendedQuality();
  }

  private detectDeviceCapabilities(): DeviceCapabilities {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;
    
    if (!gl) {
      return { 
        supportsHighPrecision: false, 
        maxTextureSize: 1024, 
        isMobile: true,
        gpuTier: 'low'
      };
    }

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : '';
    
    // Check for high precision float support
    const fragmentPrecision = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
    const supportsHighPrecision = fragmentPrecision ? fragmentPrecision.precision > 0 : false;

    // Detect mobile devices
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Estimate GPU tier based on renderer string and other factors
    let gpuTier: 'low' | 'medium' | 'high' = 'medium';
    
    if (renderer.includes('PowerVR') || renderer.includes('Adreno 3') || renderer.includes('Mali-4')) {
      gpuTier = 'low';
    } else if (renderer.includes('GeForce GTX') || renderer.includes('Radeon RX') || renderer.includes('M1') || renderer.includes('M2')) {
      gpuTier = 'high';
    }

    return {
      supportsHighPrecision,
      maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      isMobile,
      gpuTier,
      renderer
    };
  }

  private getRecommendedQuality(): QualityLevel {
    const { isMobile, gpuTier, supportsHighPrecision } = this.deviceCapabilities;

    // Conservative quality selection for mobile devices
    if (isMobile) {
      return gpuTier === 'high' ? QualityLevel.Medium : QualityLevel.Low;
    }

    // Desktop quality selection
    switch (gpuTier) {
      case 'low':
        return QualityLevel.Low;
      case 'medium':
        return supportsHighPrecision ? QualityLevel.Medium : QualityLevel.Low;
      case 'high':
        return QualityLevel.High;
      default:
        return QualityLevel.Medium;
    }
  }

  getQualitySettings(): QualitySettings {
    const settings: Record<QualityLevel, QualitySettings> = {
      [QualityLevel.Low]: {
        level: QualityLevel.Low,
        octaves: 2,
        epsilon: 0.01,
        precision: 'mediump',
        maxParticles: 50,
        enableAdvancedEffects: false,
        useOptimizedNoise: true
      },
      [QualityLevel.Medium]: {
        level: QualityLevel.Medium,
        octaves: 4,
        epsilon: 0.005,
        precision: this.deviceCapabilities.supportsHighPrecision ? 'highp' : 'mediump',
        maxParticles: 100,
        enableAdvancedEffects: true,
        useOptimizedNoise: true
      },
      [QualityLevel.High]: {
        level: QualityLevel.High,
        octaves: 6,
        epsilon: 0.002,
        precision: 'highp',
        maxParticles: 200,
        enableAdvancedEffects: true,
        useOptimizedNoise: false
      },
      [QualityLevel.Ultra]: {
        level: QualityLevel.Ultra,
        octaves: 8,
        epsilon: 0.001,
        precision: 'highp',
        maxParticles: 500,
        enableAdvancedEffects: true,
        useOptimizedNoise: false
      }
    };

    return settings[this.currentQuality];
  }

  updatePerformanceMetrics(fps: number, frameTime: number) {
    this.performanceMetrics.fps = fps;
    this.performanceMetrics.frameTime = frameTime;
    
    // Update rolling average
    this.performanceMetrics.averageFps = 
      (this.performanceMetrics.averageFps * 0.9) + (fps * 0.1);

    // Count dropped frames (below 30 FPS threshold)
    if (fps < 30) {
      this.performanceMetrics.dropped++;
    }

    // Adaptive quality adjustment
    this.adaptQuality();
  }

  private adaptQuality() {
    const { averageFps, dropped } = this.performanceMetrics;
    
    // Downgrade quality if performance is poor
    if (averageFps < 45 && dropped > 10) {
      if (this.currentQuality > QualityLevel.Low) {
        this.currentQuality--;
        this.performanceMetrics.dropped = 0; // Reset counter
      }
    }
    
    // Upgrade quality if performance is good (be more conservative)
    else if (averageFps > 55 && dropped === 0) {
      if (this.currentQuality < QualityLevel.Ultra && 
          this.currentQuality < this.getRecommendedQuality() + 1) {
        this.currentQuality++;
      }
    }
  }

  getCurrentQuality(): QualityLevel {
    return this.currentQuality;
  }

  setQuality(quality: QualityLevel) {
    this.currentQuality = quality;
  }

  getDeviceCapabilities(): DeviceCapabilities {
    return this.deviceCapabilities;
  }

  getPerformanceMetrics(): PerformanceMetrics {
    return this.performanceMetrics;
  }

  // Generate shader defines based on current quality
  getShaderDefines(): string {
    const settings = this.getQualitySettings();
    
    return `
#define QUALITY_LEVEL ${settings.level}
#define OCTAVES ${settings.octaves}
#define EPSILON ${settings.epsilon}
#define MAX_PARTICLES ${settings.maxParticles}
${settings.enableAdvancedEffects ? '#define ENABLE_ADVANCED_EFFECTS' : ''}
${settings.useOptimizedNoise ? '#define USE_OPTIMIZED_NOISE' : ''}
${settings.precision === 'highp' ? 
  '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif' : 
  `precision ${settings.precision} float;`
}
`;
  }
}

interface DeviceCapabilities {
  supportsHighPrecision: boolean;
  maxTextureSize: number;
  isMobile: boolean;
  gpuTier: 'low' | 'medium' | 'high';
  renderer?: string;
}

interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  averageFps: number;
  dropped: number;
}