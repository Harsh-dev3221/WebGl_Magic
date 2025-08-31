// Advanced gradient system with multi-stop support and professional interpolation

import { 
  RGBColor, 
  HSVColor, 
  LABColor, 
  interpolateRGB, 
  interpolateHSV, 
  interpolateLAB,
  rgbToHsv,
  hsvToRgb,
  rgbToLab,
  labToRgb,
  hexToRgb,
  rgbToHex
} from './spaces';

export interface GradientStop {
  id: string;
  color: RGBColor;
  position: number; // 0-1
}

export type InterpolationMode = 'rgb' | 'hsv' | 'lab';
export type EasingFunction = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'bezier';

export interface GradientConfig {
  stops: GradientStop[];
  interpolation: InterpolationMode;
  easing: EasingFunction;
  angle?: number; // For linear gradients
}

export class GradientSampler {
  private config: GradientConfig;
  private sortedStops: GradientStop[];

  constructor(config: GradientConfig) {
    this.config = config;
    this.sortedStops = [...config.stops].sort((a, b) => a.position - b.position);
  }

  // Sample gradient at given position (0-1)
  sample(position: number): RGBColor {
    position = Math.max(0, Math.min(1, position));
    
    // Find surrounding stops
    if (position <= this.sortedStops[0].position) {
      return this.sortedStops[0].color;
    }
    
    if (position >= this.sortedStops[this.sortedStops.length - 1].position) {
      return this.sortedStops[this.sortedStops.length - 1].color;
    }
    
    // Find the two stops to interpolate between
    let leftStop = this.sortedStops[0];
    let rightStop = this.sortedStops[1];
    
    for (let i = 0; i < this.sortedStops.length - 1; i++) {
      if (position >= this.sortedStops[i].position && position <= this.sortedStops[i + 1].position) {
        leftStop = this.sortedStops[i];
        rightStop = this.sortedStops[i + 1];
        break;
      }
    }
    
    // Calculate interpolation factor
    const range = rightStop.position - leftStop.position;
    let t = range === 0 ? 0 : (position - leftStop.position) / range;
    
    // Apply easing
    t = this.applyEasing(t);
    
    // Interpolate based on color space
    return this.interpolateColors(leftStop.color, rightStop.color, t);
  }

  private applyEasing(t: number): number {
    switch (this.config.easing) {
      case 'ease-in':
        return t * t;
      case 'ease-out':
        return 1 - Math.pow(1 - t, 2);
      case 'ease-in-out':
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      case 'bezier':
        // Cubic bezier approximation for smooth curves
        return t * t * (3 - 2 * t);
      default:
        return t;
    }
  }

  private interpolateColors(color1: RGBColor, color2: RGBColor, t: number): RGBColor {
    switch (this.config.interpolation) {
      case 'hsv': {
        const hsv1 = rgbToHsv(color1.r, color1.g, color1.b);
        const hsv2 = rgbToHsv(color2.r, color2.g, color2.b);
        const interpolated = interpolateHSV(hsv1, hsv2, t);
        return hsvToRgb(interpolated.h, interpolated.s, interpolated.v);
      }
      case 'lab': {
        const lab1 = rgbToLab(color1.r, color1.g, color1.b);
        const lab2 = rgbToLab(color2.r, color2.g, color2.b);
        const interpolated = interpolateLAB(lab1, lab2, t);
        return labToRgb(interpolated.l, interpolated.a, interpolated.b);
      }
      default:
        return interpolateRGB(color1, color2, t);
    }
  }

  // Generate texture data for shader sampling
  generateTexture(width: number = 256): Float32Array {
    const data = new Float32Array(width * 4); // RGBA
    
    for (let i = 0; i < width; i++) {
      const position = i / (width - 1);
      const color = this.sample(position);
      
      const baseIndex = i * 4;
      data[baseIndex] = color.r;
      data[baseIndex + 1] = color.g;
      data[baseIndex + 2] = color.b;
      data[baseIndex + 3] = 1.0; // Alpha
    }
    
    return data;
  }

  // Update configuration
  updateConfig(config: Partial<GradientConfig>) {
    this.config = { ...this.config, ...config };
    if (config.stops) {
      this.sortedStops = [...this.config.stops].sort((a, b) => a.position - b.position);
    }
  }
}

// Utility functions for gradient manipulation
export function createGradientStop(color: string | RGBColor, position: number): GradientStop {
  const rgbColor = typeof color === 'string' ? hexToRgb(color) : color;
  return {
    id: Math.random().toString(36).substr(2, 9),
    color: rgbColor,
    position: Math.max(0, Math.min(1, position))
  };
}

export function addGradientStop(config: GradientConfig, color: string | RGBColor, position: number): GradientConfig {
  const newStop = createGradientStop(color, position);
  return {
    ...config,
    stops: [...config.stops, newStop]
  };
}

export function removeGradientStop(config: GradientConfig, stopId: string): GradientConfig {
  return {
    ...config,
    stops: config.stops.filter(stop => stop.id !== stopId)
  };
}

export function updateGradientStop(
  config: GradientConfig, 
  stopId: string, 
  updates: Partial<Omit<GradientStop, 'id'>>
): GradientConfig {
  return {
    ...config,
    stops: config.stops.map(stop => 
      stop.id === stopId ? { ...stop, ...updates } : stop
    )
  };
}

// Export gradient to CSS
export function gradientToCSS(config: GradientConfig): string {
  const angle = config.angle || 0;
  const stops = [...config.stops]
    .sort((a, b) => a.position - b.position)
    .map(stop => {
      const hex = rgbToHex(stop.color.r, stop.color.g, stop.color.b);
      return `${hex} ${Math.round(stop.position * 100)}%`;
    });
  
  return `linear-gradient(${angle}deg, ${stops.join(', ')})`;
}

// Create gradient from CSS string (basic parsing)
export function gradientFromCSS(css: string): GradientConfig | null {
  const match = css.match(/linear-gradient\(([^)]+)\)/);
  if (!match) return null;
  
  const parts = match[1].split(',').map(part => part.trim());
  const angle = parseFloat(parts[0]) || 0;
  const stops: GradientStop[] = [];
  
  for (let i = 1; i < parts.length; i++) {
    const stopMatch = parts[i].match(/(#[a-fA-F0-9]{6})\s+(\d+)%/);
    if (stopMatch) {
      stops.push(createGradientStop(stopMatch[1], parseInt(stopMatch[2]) / 100));
    }
  }
  
  return {
    stops,
    interpolation: 'rgb',
    easing: 'linear',
    angle
  };
}