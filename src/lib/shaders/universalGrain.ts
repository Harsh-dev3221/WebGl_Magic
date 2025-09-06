// Universal Grain System for All Shaders
// This module provides grain effects that can be added to any shader type

export const grainUniforms = `
  // Universal grain uniforms
  uniform float u_grainIntensity;
  uniform float u_grainSize;
  uniform float u_grainSpeed;
  uniform float u_grainContrast;
  uniform int u_grainType;
  uniform int u_grainBlendMode;
`;

export const grainFunctions = `
  // Simple grain random function
  float grainRandom(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
  }

  // Time-based random
  float grainRandomTime(vec2 st, float time) {
    return fract(sin(dot(st.xy + time, vec2(12.9898, 78.233))) * 43758.5453123);
  }

  // Simple film grain function
  float grainFilm(vec2 uv, float time) {
    vec2 grainUV = uv * u_grainSize;
    return grainRandomTime(grainUV, time * u_grainSpeed);
  }

  // Simple digital grain
  float grainDigital(vec2 uv, float time) {
    vec2 grainUV = uv * u_grainSize;
    float noise = grainRandomTime(grainUV, time * u_grainSpeed);
    return floor(noise * 8.0) / 8.0;
  }

  // Simple organic grain
  float grainOrganic(vec2 uv, float time) {
    vec2 grainUV = uv * u_grainSize;
    float grain1 = grainRandomTime(grainUV, time * u_grainSpeed);
    float grain2 = grainRandomTime(grainUV * 2.0, time * u_grainSpeed) * 0.5;
    return (grain1 + grain2) / 1.5;
  }

  // Simple animated grain
  float grainAnimated(vec2 uv, float time) {
    vec2 grainUV = uv * u_grainSize + sin(time * u_grainSpeed) * 0.1;
    return grainRandomTime(grainUV, time * u_grainSpeed);
  }

  // Simple halftone grain
  float grainHalftone(vec2 uv, float time) {
    vec2 grainUV = uv * u_grainSize;
    float noise = grainRandomTime(floor(grainUV), time * u_grainSpeed);
    return step(0.5, noise);
  }

  // Proper blend mode implementations
  vec3 grainBlendOverlay(vec3 base, vec3 blend) {
    return mix(
      2.0 * base * blend,
      1.0 - 2.0 * (1.0 - base) * (1.0 - blend),
      step(0.5, base)
    );
  }

  vec3 grainBlendMultiply(vec3 base, vec3 blend) {
    return base * blend;
  }

  vec3 grainBlendScreen(vec3 base, vec3 blend) {
    return 1.0 - (1.0 - base) * (1.0 - blend);
  }

  vec3 grainBlendSoftLight(vec3 base, vec3 blend) {
    vec3 result1 = 2.0 * base * blend + base * base * (1.0 - 2.0 * blend);
    vec3 result2 = sqrt(base) * (2.0 * blend - 1.0) + 2.0 * base * (1.0 - blend);
    return mix(result1, result2, step(0.5, blend));
  }

  vec3 grainBlendLinear(vec3 base, vec3 blend) {
    return base + (blend - 0.5);
  }

  // Apply grain with proper blend modes
  vec3 applyUniversalGrain(vec3 color, float time) {
    if (u_grainIntensity <= 0.0) {
      return color;
    }

    // Generate grain based on type
    float grain = 0.0;
    if (u_grainType == 0) {
      grain = grainFilm(vUv, time);
    } else if (u_grainType == 1) {
      grain = grainDigital(vUv, time);
    } else if (u_grainType == 2) {
      grain = grainOrganic(vUv, time);
    } else if (u_grainType == 3) {
      grain = grainAnimated(vUv, time);
    } else if (u_grainType == 4) {
      grain = grainHalftone(vUv, time);
    }

    // Normalize grain to 0-1 range and apply contrast
    grain = clamp(grain * u_grainContrast, 0.0, 1.0);
    
    // Create grain color (grayscale)
    vec3 grainColor = vec3(grain);
    
    // Apply blend mode
    vec3 blendedColor;
    
    if (u_grainBlendMode == 0) {
      // Overlay blend
      blendedColor = grainBlendOverlay(color, grainColor);
    } else if (u_grainBlendMode == 1) {
      // Multiply blend
      blendedColor = grainBlendMultiply(color, grainColor);
    } else if (u_grainBlendMode == 2) {
      // Screen blend
      blendedColor = grainBlendScreen(color, grainColor);
    } else if (u_grainBlendMode == 3) {
      // Soft Light blend
      blendedColor = grainBlendSoftLight(color, grainColor);
    } else {
      // Linear blend
      blendedColor = grainBlendLinear(color, grainColor);
    }
    
    // Mix with original color based on grain intensity
    return mix(color, blendedColor, u_grainIntensity);
  }
`;

// Default grain configuration for all shaders
export interface UniversalGrainConfig {
  grainIntensity: number;
  grainSize: number;
  grainSpeed: number;
  grainContrast: number;
  grainType: number; // 0: Film, 1: Digital, 2: Organic, 3: Animated, 4: Halftone
  grainBlendMode: number; // 0: Overlay, 1: Multiply, 2: Screen, 3: Soft Light, 4: Linear
}

export const defaultGrainConfig: UniversalGrainConfig = {
  grainIntensity: 0.0, // Start with no grain
  grainSize: 100.0,
  grainSpeed: 1.0,
  grainContrast: 1.0,
  grainType: 3, // Animated grain (default)
  grainBlendMode: 0, // Overlay
};

// Helper function to add grain to any shader (currently unused - grain is implemented directly in each shader)
export function addGrainToShader(shaderCode: string): string {
  // This function is kept for potential future use but is currently not used
  // All shaders now have grain implemented directly in their code
  return shaderCode;
}
