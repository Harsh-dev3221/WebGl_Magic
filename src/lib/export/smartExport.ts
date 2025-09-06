// Smart export system that only includes necessary code for each shader type
// Eliminates bloat from unused features and other shader types

import { ShaderFeatures, getShaderFeatures, calculateOptimization } from './featureDetection';
import {
  basePrecision,
  basePermutation,
  noise2D,
  noise3D,
  fbmFunctions,
  curlNoiseFunctions,
  hsvConversion,
  proceduralGradient,
  colorBlending,
  mouseInteraction,
  advancedMath,
  domainWarping,
  grainBase,
  grainTypes,
  blendModes
} from './modularComponents';

export interface SmartExportData {
  shaderType: string;
  name: string;
  gradient: any;
  shaderParams: any;
  grainConfig?: {
    grainIntensity: number;
    grainSize: number;
    grainSpeed: number;
    grainContrast: number;
    grainType: number;
    grainBlendMode: number;
  };
  mouseInteractionEnabled?: boolean;
}

// Build optimized shader code based on actual feature usage
export function buildOptimizedShader(shaderType: string, exportData: SmartExportData): string {
  const features = getShaderFeatures(shaderType);
  let shaderCode = '';

  // Always include base precision
  shaderCode += basePrecision + '\n';

  // Add uniforms based on shader type
  shaderCode += generateUniforms(shaderType, features, exportData) + '\n';

  // Add varying
  shaderCode += 'varying vec2 vUv;\n\n';

  // Add only required noise components
  if (features.uses2DNoise || features.uses3DNoise) {
    shaderCode += basePermutation + '\n';
  }

  if (features.uses2DNoise) {
    shaderCode += noise2D + '\n';
  }

  if (features.uses3DNoise) {
    shaderCode += noise3D + '\n';
  }

  if (features.usesFBM) {
    shaderCode += fbmFunctions + '\n';
  }

  if (features.usesCurlNoise) {
    shaderCode += curlNoiseFunctions + '\n';
  }

  // Add only required color utilities
  if (features.usesHSVConversion) {
    shaderCode += hsvConversion + '\n';
  }

  if (features.usesProceduralGradient) {
    shaderCode += proceduralGradient + '\n';
  }

  if (features.usesColorBlending) {
    shaderCode += colorBlending + '\n';
  }

  // Add mouse interaction if needed
  if (features.usesMouseInteraction) {
    shaderCode += mouseInteraction + '\n';
  }

  // Add advanced math if needed
  if (features.usesAdvancedMath) {
    shaderCode += advancedMath + '\n';
  }

  // Add domain warping if needed
  if (features.usesDomainWarping) {
    shaderCode += domainWarping + '\n';
  }

  // Add grain system if used (always include if grain is supported by shader)
  if (features.usesGrain) {
    shaderCode += buildGrainSystem(exportData.grainConfig || {
      grainIntensity: 0,
      grainSize: 100,
      grainSpeed: 1,
      grainContrast: 1,
      grainType: 0,
      grainBlendMode: 0
    }) + '\n';
  }

  // Add the main shader logic
  shaderCode += generateMainFunction(shaderType, features, exportData);

  return shaderCode;
}

// Generate minimal uniforms - most values are baked in
function generateUniforms(shaderType: string, features: ShaderFeatures, exportData: SmartExportData): string {
  let uniforms = `
// Minimal uniforms - most settings baked into shader code
uniform float u_time;
uniform vec2 u_resolution;
uniform vec3 u_color1;
uniform vec3 u_color2;
uniform vec3 u_color3;
uniform sampler2D u_gradientTexture;`;

  // Add mouse uniform only if mouse interaction is enabled
  if (features.usesMouseInteraction && exportData.mouseInteractionEnabled !== false) {
    uniforms += '\nuniform vec2 u_mouse;';
  }

  // No other uniforms needed - all parameters are baked into the shader code
  // This includes: speed, scale, octaves, lacunarity, persistence, grain settings, etc.

  return uniforms;
}

// Build grain system with EXACT settings baked in (no uniforms needed)
function buildGrainSystem(grainConfig: any): string {
  // If no grain or intensity is 0, return empty grain function
  if (!grainConfig || grainConfig.grainIntensity <= 0) {
    return `
vec3 applyGrain(vec3 color, vec2 uv, float time) {
    return color; // No grain applied
}`;
  }

  let grainCode = grainBase + '\n';

  // Bake in the EXACT settings - no uniforms needed!
  const grainSize = grainConfig.grainSize || 100;
  const grainSpeed = grainConfig.grainSpeed || 1;
  const grainContrast = grainConfig.grainContrast || 1;
  const grainIntensity = grainConfig.grainIntensity || 0;

  // Add only the grain type that's being used with baked-in values
  const grainTypeNames = ['film', 'digital', 'organic', 'animated', 'halftone'];
  const usedGrainType = grainTypeNames[grainConfig.grainType] || 'film';

  // Build the grain function with baked-in size and speed values
  grainCode += buildGrainFunction(usedGrainType, grainSize, grainSpeed) + '\n';

  // Add only the blend mode that's being used
  const blendModeNames = ['overlay', 'multiply', 'screen', 'softLight', 'linear'];
  const usedBlendMode = blendModeNames[grainConfig.grainBlendMode] || 'overlay';
  grainCode += blendModes[usedBlendMode as keyof typeof blendModes] + '\n';

  // Add the apply grain function with BAKED-IN values
  grainCode += `
vec3 applyGrain(vec3 color, vec2 uv, float time) {
    // BAKED-IN grain settings from studio:
    // Intensity: ${grainIntensity}
    // Size: ${grainSize}
    // Speed: ${grainSpeed}
    // Contrast: ${grainContrast}
    // Type: ${usedGrainType}
    // Blend Mode: ${usedBlendMode}

    float grain = grain${usedGrainType.charAt(0).toUpperCase() + usedGrainType.slice(1)}(uv, time);
    grain = clamp(grain * ${grainContrast.toFixed(2)}, 0.0, 1.0);
    vec3 grainColor = vec3(grain);

    vec3 blendedColor = blend${usedBlendMode.charAt(0).toUpperCase() + usedBlendMode.slice(1)}(color, grainColor);
    return mix(color, blendedColor, ${grainIntensity.toFixed(2)});
}`;

  return grainCode;
}

// Build grain function with baked-in values
function buildGrainFunction(grainType: string, size: number, speed: number): string {
  switch (grainType) {
    case 'film':
      return `
float grainFilm(vec2 uv, float time) {
    vec2 grainUV = uv * ${size.toFixed(1)};
    float grain1 = grainRandomTime(floor(grainUV), time * ${speed.toFixed(1)});
    float grain2 = grainRandomTime(floor(grainUV + vec2(1.0, 0.0)), time * ${speed.toFixed(1)});
    float grain3 = grainRandomTime(floor(grainUV + vec2(0.0, 1.0)), time * ${speed.toFixed(1)});
    float grain4 = grainRandomTime(floor(grainUV + vec2(1.0, 1.0)), time * ${speed.toFixed(1)});
    vec2 f = fract(grainUV);
    float baseGrain = mix(mix(grain1, grain2, f.x), mix(grain3, grain4, f.x), f.y);
    float fineGrain = grainRandomTime(grainUV * 2.0, time * ${(speed * 1.5).toFixed(1)}) * 0.3;
    return pow(baseGrain * 0.7 + fineGrain, 0.8);
}`;
    case 'digital':
      return `
float grainDigital(vec2 uv, float time) {
    vec2 grainUV = uv * ${size.toFixed(1)};
    float baseNoise = grainRandomTime(floor(grainUV), time * ${speed.toFixed(1)});
    float temporalNoise = grainRandomTime(vec2(time * ${(speed * 10.0).toFixed(1)}), 0.0) * 0.1;
    return floor((baseNoise + temporalNoise) * 8.0) / 8.0;
}`;
    case 'organic':
      return `
float grainOrganic(vec2 uv, float time) {
    vec2 grainUV = uv * ${size.toFixed(1)};
    float grain = 0.0;
    float amplitude = 1.0;
    for (int i = 0; i < 3; i++) {
        grain += grainRandomTime(grainUV, time * ${speed.toFixed(1)}) * amplitude;
        grainUV *= 2.0;
        amplitude *= 0.5;
    }
    return grain / 1.875;
}`;
    case 'animated':
      return `
float grainAnimated(vec2 uv, float time) {
    vec2 grainUV = uv * ${size.toFixed(1)} + sin(time * ${speed.toFixed(1)}) * 0.1;
    float angle = time * ${(speed * 0.5).toFixed(1)};
    mat2 rotation = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    grainUV = rotation * grainUV;
    return grainRandomTime(grainUV, time * ${speed.toFixed(1)});
}`;
    case 'halftone':
      return `
float grainHalftone(vec2 uv, float time) {
    vec2 grainUV = uv * ${size.toFixed(1)};
    vec2 center = floor(grainUV) + 0.5;
    float dist = length(grainUV - center);
    float noise = grainRandomTime(center, time * ${speed.toFixed(1)});
    return smoothstep(0.3 * noise, 0.5 * noise, dist);
}`;
    default:
      return '';
  }
}

// Generate the main function with BAKED-IN settings
function generateMainFunction(shaderType: string, features: ShaderFeatures, exportData: SmartExportData): string {
  // Bake in the exact parameter values from the studio
  const speed = exportData.shaderParams.speed || 1.0;
  const scale = exportData.shaderParams.scale || 1.0;
  const octaves = exportData.shaderParams.octaves || 4;
  const lacunarity = exportData.shaderParams.lacunarity || 2.0;
  const persistence = exportData.shaderParams.persistence || 0.5;
  const mouseEnabled = exportData.mouseInteractionEnabled !== false;

  // Shader-specific parameters (will be used when we add specific shader implementations)
  // For now, focusing on core Classic shader with all studio settings baked in

  // Generate shader-specific code with baked-in studio settings
  switch (shaderType) {
    case 'classic':
      return generateClassicShader(speed, scale, octaves, lacunarity, persistence, mouseEnabled, features);
    case 'vector':
      return generateVectorShader(speed, scale, octaves, lacunarity, persistence, exportData.shaderParams.flowStrength || 1.0, mouseEnabled, features);
    case 'turbulence':
      return generateTurbulenceShader(speed, scale, octaves, lacunarity, persistence, exportData.shaderParams.turbulence || 4.0, mouseEnabled, features);
    case 'plasma':
      return generatePlasmaShader(speed, scale, exportData.shaderParams.plasmaIntensity || 1.5, mouseEnabled, features);
    case 'fluid':
      return generateFluidShader(speed, scale, exportData.shaderParams.viscosity || 0.8, exportData.shaderParams.pressure || 2.0, mouseEnabled, features);
    case 'particle':
      return generateParticleShader(speed, scale, exportData.shaderParams.particleCount || 25, exportData.shaderParams.particleSize || 1.0, mouseEnabled, features);
    case 'kaleidoscope':
      return generateKaleidoscopeShader(speed, scale, exportData.shaderParams.segments || 6, exportData.shaderParams.rotation || 0, mouseEnabled, features);
    case 'fluidInteractive':
      return generateFluidInteractiveShader(exportData);
    default:
      // Fallback to classic for unknown types
      return generateClassicShader(speed, scale, octaves, lacunarity, persistence, mouseEnabled, features);
  }
}

// Generate Classic Gradient shader with baked-in settings
function generateClassicShader(speed: number, scale: number, octaves: number, lacunarity: number, persistence: number, mouseEnabled: boolean, features: ShaderFeatures): string {
  return `
void main() {
    vec2 uv = vUv;
    vec2 p = uv * ${scale.toFixed(1)};

    // BAKED-IN settings from studio:
    // Speed: ${speed}
    // Scale: ${scale}
    // Octaves: ${octaves}
    // Lacunarity: ${lacunarity}
    // Persistence: ${persistence}
    // Mouse Interaction: ${mouseEnabled}

    // Animate the noise with baked-in speed
    vec3 noiseInput = vec3(p, u_time * ${speed.toFixed(1)});

    // Generate layered noise with baked-in parameters
    float noise1 = fbm3D(noiseInput, ${Math.floor(octaves)}, ${lacunarity.toFixed(1)}, ${persistence.toFixed(1)});
    float noise2 = fbm3D(noiseInput + vec3(100.0, 200.0, 300.0), ${Math.floor(octaves)}, ${lacunarity.toFixed(1)}, ${persistence.toFixed(1)});

    // Combine noises for complexity
    float combined = (noise1 + noise2 * 0.5) * 0.5 + 0.5;

    ${mouseEnabled ? `
    // Add mouse interaction (baked-in setting: enabled)
    vec2 mouse = u_mouse / u_resolution;
    float mouseDist = distance(uv, mouse);
    combined += sin(mouseDist * 10.0 - u_time * 2.0) * 0.1;` : `
    // Mouse interaction disabled in studio settings`}

    // Generate color from gradient texture or fallback to procedural
    vec3 color = texture2D(u_gradientTexture, vec2(combined, 0.5)).rgb;
    if (color.r + color.g + color.b < 0.01) {
        color = proceduralGradient(combined, u_color1, u_color2, u_color3);
    }

    ${features.usesGrain ? `
    // Apply grain effect with baked-in settings
    color = applyGrain(color, uv, u_time);` : ''}

    gl_FragColor = vec4(color, 1.0);
}`;
}

// Generate Vector Flow shader with baked-in settings
function generateVectorShader(speed: number, scale: number, octaves: number, lacunarity: number, persistence: number, flowStrength: number, mouseEnabled: boolean, features: ShaderFeatures): string {
  return `
void main() {
    vec2 uv = vUv;
    vec2 p = uv * ${scale.toFixed(1)};

    // BAKED-IN Vector Flow settings:
    // Speed: ${speed}, Scale: ${scale}, Flow Strength: ${flowStrength}
    // Octaves: ${octaves}, Lacunarity: ${lacunarity}, Persistence: ${persistence}

    // Generate vector field using curl noise (STUDIO ACCURATE)
    vec3 noisePos = vec3(p, u_time * ${speed.toFixed(1)});
    vec3 flow = curlNoise3D(noisePos, 0.01) * ${flowStrength.toFixed(2)};

    // Distort sampling position with flow (STUDIO METHOD)
    vec2 distortedP = p + flow.xy * 0.1;

    // Sample noise at distorted position (STUDIO ACCURATE)
    float noise1 = fbm3D(vec3(distortedP, u_time * ${speed.toFixed(1)} * 0.5), ${Math.floor(octaves)}, ${lacunarity.toFixed(1)}, ${persistence.toFixed(1)});
    float noise2 = fbm3D(vec3(distortedP + vec2(100.0), u_time * ${speed.toFixed(1)} * 0.3), ${Math.floor(octaves)}, ${lacunarity.toFixed(1)}, ${persistence.toFixed(1)});

    // Create flowing patterns (STUDIO METHOD)
    float combined = noise1 + noise2 * 0.5;
    combined = combined * 0.5 + 0.5;

    // Add flow visualization (STUDIO FEATURE)
    float flowMagnitude = length(flow.xy);
    combined += flowMagnitude * 0.2;

    ${mouseEnabled ? `
    // Mouse interaction with vector field (STUDIO ACCURATE)
    vec2 mouse = u_mouse / u_resolution;
    vec2 mouseForce = (uv - mouse) * 2.0;
    float mouseInfluence = exp(-dot(mouseForce, mouseForce) * 5.0);
    combined += mouseInfluence * 0.3;` : ''}

    // Generate color
    vec3 color = texture2D(u_gradientTexture, vec2(combined, 0.5)).rgb;
    if (color.r + color.g + color.b < 0.01) {
        color = proceduralGradient(combined, u_color1, u_color2, u_color3);
    }

    // Add flow-based color shifts (STUDIO FEATURE - MISSING COLOR LAYERS!)
    color += flow * 0.1;

    ${features.usesGrain ? `color = applyGrain(color, uv, u_time);` : ''}

    gl_FragColor = vec4(color, 1.0);
}`;
}

// Generate Turbulence shader with baked-in settings
function generateTurbulenceShader(speed: number, scale: number, octaves: number, lacunarity: number, persistence: number, turbulence: number, mouseEnabled: boolean, features: ShaderFeatures): string {
  return `
void main() {
    vec2 uv = vUv;
    vec2 p = uv * ${scale.toFixed(1)};

    // BAKED-IN Turbulence settings:
    // Speed: ${speed}, Scale: ${scale}, Turbulence: ${turbulence}
    // Octaves: ${octaves}, Lacunarity: ${lacunarity}, Persistence: ${persistence}

    // Domain warping for turbulence (STUDIO ACCURATE)
    vec2 q = vec2(
        fbm3D(vec3(p, u_time * ${speed.toFixed(1)}), ${Math.floor(octaves)}, ${lacunarity.toFixed(1)}, ${persistence.toFixed(1)}),
        fbm3D(vec3(p + vec2(5.2, 1.3), u_time * ${speed.toFixed(1)}), ${Math.floor(octaves)}, ${lacunarity.toFixed(1)}, ${persistence.toFixed(1)})
    );

    vec2 r = vec2(
        fbm3D(vec3(p + 4.0 * q + vec2(1.7, 9.2), u_time * ${speed.toFixed(1)} * 0.5), ${Math.floor(octaves)}, ${lacunarity.toFixed(1)}, ${persistence.toFixed(1)}),
        fbm3D(vec3(p + 4.0 * q + vec2(8.3, 2.8), u_time * ${speed.toFixed(1)} * 0.5), ${Math.floor(octaves)}, ${lacunarity.toFixed(1)}, ${persistence.toFixed(1)})
    );

    // Final noise with domain warping (STUDIO METHOD)
    float noise = fbm3D(vec3(p + ${turbulence.toFixed(2)} * r, u_time * ${speed.toFixed(1)} * 0.3), ${Math.floor(octaves)}, ${lacunarity.toFixed(1)}, ${persistence.toFixed(1)});
    noise = noise * 0.5 + 0.5;

    ${mouseEnabled ? `
    // Add subtle mouse interaction (STUDIO ACCURATE)
    vec2 mouse = u_mouse / u_resolution;
    float mouseDist = distance(uv, mouse);
    noise += sin(mouseDist * 8.0 - u_time * 3.0) * 0.05;` : ''}

    // Generate color
    vec3 color = texture2D(u_gradientTexture, vec2(noise, 0.5)).rgb;
    if (color.r + color.g + color.b < 0.01) {
        color = proceduralGradient(noise, u_color1, u_color2, u_color3);
    }

    // Add depth with secondary noise (STUDIO FEATURE)
    float depth = fbm3D(vec3(p * 0.5, u_time * ${speed.toFixed(1)} * 0.1), 3, 2.0, 0.5) * 0.1;
    color = mix(color, color * 1.2, depth);

    ${features.usesGrain ? `color = applyGrain(color, uv, u_time);` : ''}

    gl_FragColor = vec4(color, 1.0);
}`;
}

// Generate Plasma shader with baked-in settings
function generatePlasmaShader(speed: number, scale: number, plasmaIntensity: number, mouseEnabled: boolean, features: ShaderFeatures): string {
  return `
void main() {
    vec2 uv = vUv;
    vec2 p = uv * ${scale.toFixed(1)};

    // BAKED-IN Plasma settings:
    // Speed: ${speed}, Scale: ${scale}, Intensity: ${plasmaIntensity}

    float time = u_time * ${speed.toFixed(1)};

    // Multiple sine waves for plasma effect (STUDIO ACCURATE)
    float plasma = sin(p.x * 2.0 + time);
    plasma += sin(p.y * 3.0 + time * 1.5);
    plasma += sin((p.x + p.y) * 1.5 + time * 0.5);
    plasma += sin(sqrt(p.x * p.x + p.y * p.y) * 4.0 + time * 2.0);

    // Add noise for organic feel (STUDIO FEATURE)
    float noise = snoise3D(vec3(p * 2.0, time * 0.3)) * 0.5;
    plasma += noise;

    // Normalize and add intensity (STUDIO METHOD)
    plasma = (plasma + 4.0) / 8.0;
    plasma = pow(plasma, ${plasmaIntensity.toFixed(2)});

    ${mouseEnabled ? `
    // Mouse interaction (STUDIO ACCURATE)
    vec2 mouse = u_mouse / u_resolution;
    float mouseDist = distance(uv, mouse);
    plasma += sin(mouseDist * 15.0 - time * 4.0) * 0.1;` : ''}

    // Generate color
    vec3 color = texture2D(u_gradientTexture, vec2(plasma, 0.5)).rgb;
    if (color.r + color.g + color.b < 0.01) {
        color = proceduralGradient(plasma, u_color1, u_color2, u_color3);
    }

    // Add glow effect (STUDIO FEATURE)
    float glow = 1.0 - smoothstep(0.0, 0.8, plasma);
    color += glow * u_color2 * 0.3;

    ${features.usesGrain ? `color = applyGrain(color, uv, u_time);` : ''}

    gl_FragColor = vec4(color, 1.0);
}`;
}

// Generate Fluid shader with baked-in settings
function generateFluidShader(speed: number, scale: number, viscosity: number, pressure: number, mouseEnabled: boolean, features: ShaderFeatures): string {
  return `
// Fluid simulation using simplified Navier-Stokes (STUDIO ACCURATE)
vec2 curl(vec2 p) {
    float eps = 0.001;
    float n1 = snoise3D(vec3(p.x, p.y + eps, u_time * ${speed.toFixed(1)}));
    float n2 = snoise3D(vec3(p.x, p.y - eps, u_time * ${speed.toFixed(1)}));
    float n3 = snoise3D(vec3(p.x + eps, p.y, u_time * ${speed.toFixed(1)}));
    float n4 = snoise3D(vec3(p.x - eps, p.y, u_time * ${speed.toFixed(1)}));

    // Normalize curl by epsilon*2 to keep values reasonable
    vec2 c = vec2(n1 - n2, n4 - n3) / (2.0 * eps);
    return c * ${scale.toFixed(1)} * 0.2; // scale down to avoid large jumps
}

void main() {
    vec2 uv = vUv;
    vec2 mouse = u_mouse / u_resolution;

    // BAKED-IN Fluid settings:
    // Speed: ${speed}, Scale: ${scale}, Viscosity: ${viscosity}, Pressure: ${pressure}

    // Create fluid flow field (STUDIO METHOD)
    vec2 p = uv * ${scale.toFixed(1)} + u_time * ${speed.toFixed(1)} * 0.1;
    vec2 velocity = curl(p);

    ${mouseEnabled ? `
    // Add mouse influence for fluid interaction (STUDIO ACCURATE)
    float mouseInfluence = 1.0 - length(uv - mouse);
    mouseInfluence = smoothstep(0.0, 0.3, mouseInfluence);
    velocity += (uv - mouse) * mouseInfluence * ${pressure.toFixed(2)};` : ''}

    // Apply viscosity damping (STUDIO METHOD)
    velocity *= ${viscosity.toFixed(2)};

    // Advect the coordinates (STUDIO METHOD)
    vec2 fluidUV = uv + velocity * 0.1;

    // Sample gradient based on fluid flow (STUDIO ACCURATE)
    float gradientPos = length(velocity) * 0.5 + sin(fluidUV.x * 10.0 + u_time) * 0.1;
    gradientPos = clamp(gradientPos, 0.0, 1.0);

    vec3 color = texture2D(u_gradientTexture, vec2(gradientPos, 0.5)).rgb;

    // Add flow visualization (STUDIO FEATURE)
    float flowMagnitude = length(velocity);
    color += vec3(flowMagnitude * 0.5);

    ${features.usesGrain ? `color = applyGrain(color, uv, u_time);` : ''}

    gl_FragColor = vec4(color, 1.0);
}`;
}

// Generate Particle shader with baked-in settings
function generateParticleShader(speed: number, scale: number, particleCount: number, particleSize: number, mouseEnabled: boolean, features: ShaderFeatures): string {
  return `
void main() {
    vec2 uv = vUv;
    vec2 p = uv * ${scale.toFixed(1)};

    // BAKED-IN Particle settings:
    // Speed: ${speed}, Scale: ${scale}, Count: ${particleCount}, Size: ${particleSize}

    // Generate particle field
    float time = u_time * ${speed.toFixed(1)};
    float particles = 0.0;

    // Create multiple particle layers
    for (int i = 0; i < ${Math.floor(particleCount)}; i++) {
        vec2 particlePos = vec2(
            sin(time * 0.5 + float(i) * 0.1) * 0.3 + 0.5,
            cos(time * 0.3 + float(i) * 0.15) * 0.3 + 0.5
        );

        float dist = distance(uv, particlePos);
        particles += smoothstep(${particleSize.toFixed(3)}, 0.0, dist);
    }

    ${mouseEnabled ? `
    // Add mouse interaction
    vec2 mouse = u_mouse / u_resolution;
    float mouseDist = distance(uv, mouse);
    particles += sin(mouseDist * 10.0 - time * 2.0) * 0.1;` : ''}

    // Generate color
    vec3 color = texture2D(u_gradientTexture, vec2(particles, 0.5)).rgb;
    if (color.r + color.g + color.b < 0.01) {
        color = proceduralGradient(particles, u_color1, u_color2, u_color3);
    }

    ${features.usesGrain ? `color = applyGrain(color, uv, u_time);` : ''}

    gl_FragColor = vec4(color, 1.0);
}`;
}

// Generate Kaleidoscope shader with baked-in settings
function generateKaleidoscopeShader(speed: number, scale: number, segments: number, rotation: number, mouseEnabled: boolean, features: ShaderFeatures): string {
  return `
// Kaleidoscope transformation (STUDIO ACCURATE)
vec2 kaleidoscope(vec2 uv, float segments) {
    vec2 center = vec2(0.5);
    vec2 pos = uv - center;

    // Convert to polar coordinates
    float angle = atan(pos.y, pos.x);
    float radius = length(pos);

    // Apply kaleidoscope effect
    float segmentAngle = 2.0 * 3.14159 / segments;
    angle = mod(angle, segmentAngle);

    // Mirror alternate segments (STUDIO METHOD)
    if (mod(floor(atan(pos.y, pos.x) / segmentAngle), 2.0) > 0.5) {
        angle = segmentAngle - angle;
    }

    // Add rotation with optional mouse interaction
    float rotation = ${rotation.toFixed(2)} + u_time * ${speed.toFixed(1)} * 0.5;
    ${mouseEnabled ? `
    vec2 mouse = u_mouse / u_resolution;
    float mouseInfluence = length(mouse - vec2(0.5)) * 2.0;
    rotation += mouseInfluence * 3.14159;` : ''}
    angle += rotation;

    // Convert back to cartesian
    return vec2(cos(angle), sin(angle)) * radius + center;
}

void main() {
    vec2 uv = vUv;

    // BAKED-IN Kaleidoscope settings:
    // Speed: ${speed}, Scale: ${scale}, Segments: ${segments}, Rotation: ${rotation}

    // Apply kaleidoscope transformation (STUDIO METHOD)
    vec2 kaleidoUV = kaleidoscope(uv, ${segments.toFixed(1)});

    // Generate pattern (STUDIO ACCURATE - Multiple noise layers)
    vec2 noiseUV = kaleidoUV * ${scale.toFixed(1)};
    float noise1 = snoise3D(vec3(noiseUV, u_time * ${speed.toFixed(1)}));
    float noise2 = snoise3D(vec3(noiseUV * 2.0, u_time * ${speed.toFixed(1)} * 0.7));
    float noise3 = snoise3D(vec3(noiseUV * 4.0, u_time * ${speed.toFixed(1)} * 0.3));

    // Combine noise layers (STUDIO METHOD)
    float pattern = noise1 * 0.5 + noise2 * 0.3 + noise3 * 0.2;
    pattern = pattern * 0.5 + 0.5;

    // Sample gradient
    vec3 color = texture2D(u_gradientTexture, vec2(pattern, 0.5)).rgb;

    // Add radial gradient effect (STUDIO FEATURE)
    float radialGradient = 1.0 - length(uv - vec2(0.5));
    color *= radialGradient * 1.5;

    ${features.usesGrain ? `color = applyGrain(color, uv, u_time);` : ''}

    gl_FragColor = vec4(color, 1.0);
}`;
}

// Generate Fluid Interactive shader - NOTE: This is a special case that needs dual-pass rendering
function generateFluidInteractiveShader(exportData: any): string {
  // For now, return a message that Fluid Interactive needs special handling
  return `
// FLUID INTERACTIVE SHADER - SPECIAL DUAL-PASS SYSTEM
// This shader type requires a complete dual-pass rendering system
// that cannot be exported as a simple fragment shader.
//
// Fluid Interactive uses:
// 1. Fluid simulation pass (Navier-Stokes equations)
// 2. Display pass (pattern generation with fluid distortion)
// 3. Ping-pong render targets for fluid state persistence
// 4. Real-time mouse interaction system
//
// To use Fluid Interactive, please use the studio interface
// or implement a custom dual-pass rendering system.

void main() {
    vec2 uv = vUv;

    // Placeholder pattern for export compatibility (using only basic math)
    float time = u_time * 0.5;

    // Create animated wave pattern without noise functions
    float pattern1 = sin(uv.x * 8.0 + time * 2.0);
    float pattern2 = cos(uv.y * 6.0 + time * 1.5);
    float pattern3 = sin((uv.x + uv.y) * 4.0 + time);

    // Combine patterns
    float pattern = (pattern1 + pattern2 + pattern3) * 0.33;
    pattern = pattern * 0.5 + 0.5;

    // Add some complexity with distance field
    vec2 center = vec2(0.5);
    float dist = length(uv - center);
    pattern += sin(dist * 10.0 - time * 3.0) * 0.2;

    // Clamp to valid range
    pattern = clamp(pattern, 0.0, 1.0);

    // Generate color from gradient texture or fallback to procedural
    vec3 color = texture2D(u_gradientTexture, vec2(pattern, 0.5)).rgb;
    if (color.r + color.g + color.b < 0.01) {
        // Simple procedural gradient fallback
        color = mix(u_color1, u_color2, pattern);
        color = mix(color, u_color3, sin(pattern * 3.14159) * 0.5 + 0.5);
    }

    gl_FragColor = vec4(color, 1.0);
}`;
}

export function generateOptimizationReport(shaderType: string): string {
  const optimization = calculateOptimization(shaderType);
  const features = getShaderFeatures(shaderType);

  return `
SMART EXPORT OPTIMIZATION REPORT
Shader Type: ${shaderType.toUpperCase()}

SIZE REDUCTION:
• Original Size: ${optimization.originalSize} lines
• Optimized Size: ${optimization.optimizedSize} lines
• Reduction: ${optimization.reduction} lines (${optimization.reductionPercent}%)

INCLUDED FEATURES:
${features.uses2DNoise ? '• 2D Simplex Noise' : ''}
${features.uses3DNoise ? '• 3D Simplex Noise' : ''}
${features.usesFBM ? '• Fractal Brownian Motion' : ''}
${features.usesCurlNoise ? '• Curl Noise (Vector Fields)' : ''}
${features.usesHSVConversion ? '• HSV Color Conversion' : ''}
${features.usesProceduralGradient ? '• Procedural Gradients' : ''}
${features.usesColorBlending ? '• Color Blending Functions' : ''}
${features.usesGrain ? '• Grain Effects System' : ''}
${features.usesMouseInteraction ? '• Mouse Interaction' : ''}
${features.usesAdvancedMath ? '• Advanced Math Functions' : ''}
${features.usesDomainWarping ? '• Domain Warping' : ''}
${features.usesFluidSimulation ? '• Fluid Simulation' : ''}

EXCLUDED (NOT NEEDED):
${!features.uses2DNoise ? '• 2D Simplex Noise' : ''}
${!features.uses3DNoise ? '• 3D Simplex Noise' : ''}
${!features.usesFBM ? '• Fractal Brownian Motion' : ''}
${!features.usesCurlNoise ? '• Curl Noise (Vector Fields)' : ''}
${!features.usesHSVConversion ? '• HSV Color Conversion' : ''}
${!features.usesColorBlending ? '• Color Blending Functions' : ''}
${!features.usesAdvancedMath ? '• Advanced Math Functions' : ''}
${!features.usesDomainWarping ? '• Domain Warping' : ''}
${!features.usesFluidSimulation ? '• Fluid Simulation' : ''}

RESULT: Clean, minimal code with only necessary features!
`;
}
