// Smart feature detection system for optimized shader exports
// Only includes the code that's actually needed for each shader type

export interface ShaderFeatures {
  // Noise system requirements
  uses2DNoise: boolean;
  uses3DNoise: boolean;
  usesFBM: boolean;
  usesCurlNoise: boolean;

  // Color system requirements
  usesHSVConversion: boolean;
  usesProceduralGradient: boolean;
  usesColorBlending: boolean;
  usesAdvancedColorUtils: boolean;

  // Grain system requirements
  usesGrain: boolean;
  grainTypes: number[]; // Which grain types are actually used
  blendModes: number[]; // Which blend modes are actually used

  // Mouse interaction
  usesMouseInteraction: boolean;

  // Advanced features
  usesAdvancedMath: boolean;
  usesDomainWarping: boolean;
  usesFluidSimulation: boolean;
}

// Feature detection for each shader type
export const shaderFeatureMap: Record<string, ShaderFeatures> = {
  'classic': {
    uses2DNoise: true,
    uses3DNoise: true,
    usesFBM: true,
    usesCurlNoise: false,
    usesHSVConversion: false,
    usesProceduralGradient: true,
    usesColorBlending: false,
    usesAdvancedColorUtils: false,
    usesGrain: true,
    grainTypes: [0, 1, 2, 3, 4], // All grain types available
    blendModes: [0, 1, 2, 3, 4], // All blend modes available
    usesMouseInteraction: true,
    usesAdvancedMath: false,
    usesDomainWarping: false,
    usesFluidSimulation: false
  },

  'vector': {
    uses2DNoise: true,
    uses3DNoise: true,
    usesFBM: true,
    usesCurlNoise: true, // Vector flow uses curl noise
    usesHSVConversion: true,
    usesProceduralGradient: true,
    usesColorBlending: true,
    usesAdvancedColorUtils: true,
    usesGrain: true,
    grainTypes: [0, 1, 2, 3, 4],
    blendModes: [0, 1, 2, 3, 4],
    usesMouseInteraction: true,
    usesAdvancedMath: true,
    usesDomainWarping: false,
    usesFluidSimulation: false
  },

  'turbulence': {
    uses2DNoise: true,
    uses3DNoise: true,
    usesFBM: true,
    usesCurlNoise: false,
    usesHSVConversion: false,
    usesProceduralGradient: true,
    usesColorBlending: false,
    usesAdvancedColorUtils: false,
    usesGrain: true,
    grainTypes: [0, 1, 2, 3, 4],
    blendModes: [0, 1, 2, 3, 4],
    usesMouseInteraction: true,
    usesAdvancedMath: false,
    usesDomainWarping: true, // Turbulence uses domain warping
    usesFluidSimulation: false
  },

  'plasma': {
    uses2DNoise: true,
    uses3DNoise: true,
    usesFBM: false, // Plasma uses simple noise, not FBM
    usesCurlNoise: false,
    usesHSVConversion: false,
    usesProceduralGradient: true,
    usesColorBlending: false,
    usesAdvancedColorUtils: false,
    usesGrain: true,
    grainTypes: [0, 1, 2, 3, 4],
    blendModes: [0, 1, 2, 3, 4],
    usesMouseInteraction: true,
    usesAdvancedMath: true, // Plasma uses sine waves and sqrt
    usesDomainWarping: false,
    usesFluidSimulation: false
  },

  'fluid': {
    uses2DNoise: false,
    uses3DNoise: true,
    usesFBM: false,
    usesCurlNoise: false,
    usesHSVConversion: false,
    usesProceduralGradient: true,
    usesColorBlending: false,
    usesAdvancedColorUtils: false,
    usesGrain: true,
    grainTypes: [0, 1, 2, 3, 4],
    blendModes: [0, 1, 2, 3, 4],
    usesMouseInteraction: true,
    usesAdvancedMath: false,
    usesDomainWarping: false,
    usesFluidSimulation: true
  },

  'particle': {
    uses2DNoise: false,
    uses3DNoise: true,
    usesFBM: false,
    usesCurlNoise: false,
    usesHSVConversion: true, // Particle uses HSV for color effects
    usesProceduralGradient: true,
    usesColorBlending: true,
    usesAdvancedColorUtils: true,
    usesGrain: true,
    grainTypes: [0, 1, 2, 3, 4],
    blendModes: [0, 1, 2, 3, 4],
    usesMouseInteraction: true,
    usesAdvancedMath: true, // Particle uses distance calculations
    usesDomainWarping: false,
    usesFluidSimulation: false
  },

  'kaleidoscope': {
    uses2DNoise: false,
    uses3DNoise: true,
    usesFBM: false,
    usesCurlNoise: false,
    usesHSVConversion: true, // Kaleidoscope uses HSV for color cycling
    usesProceduralGradient: true,
    usesColorBlending: false,
    usesAdvancedColorUtils: true,
    usesGrain: true,
    grainTypes: [0, 1, 2, 3, 4],
    blendModes: [0, 1, 2, 3, 4],
    usesMouseInteraction: true,
    usesAdvancedMath: true, // Kaleidoscope uses trigonometry
    usesDomainWarping: false,
    usesFluidSimulation: false
  },

  'fluidInteractive': {
    uses2DNoise: false,
    uses3DNoise: false, // Placeholder shader doesn't use noise
    usesFBM: false,
    usesCurlNoise: false, // Placeholder shader doesn't use curl noise
    usesHSVConversion: false,
    usesProceduralGradient: true, // Uses simple procedural gradient fallback
    usesColorBlending: false,
    usesAdvancedColorUtils: false,
    usesGrain: false, // Placeholder shader doesn't use grain
    grainTypes: [],
    blendModes: [],
    usesMouseInteraction: false, // Placeholder shader doesn't use mouse
    usesAdvancedMath: false, // Only uses basic sin/cos/length/mix
    usesDomainWarping: false,
    usesFluidSimulation: false // Placeholder shader, not real fluid simulation
  }
};

// Get features for a specific shader type
export function getShaderFeatures(shaderType: string): ShaderFeatures {
  return shaderFeatureMap[shaderType] || shaderFeatureMap['classic'];
}

// Calculate estimated code size reduction
export function calculateOptimization(shaderType: string): {
  originalSize: number;
  optimizedSize: number;
  reduction: number;
  reductionPercent: number;
} {
  const features = getShaderFeatures(shaderType);

  // Estimated line counts for each component
  const componentSizes = {
    noise2D: 100,
    noise3D: 150,
    fbm: 80,
    curlNoise: 120,
    hsvConversion: 30,
    proceduralGradient: 50,
    colorBlending: 40,
    advancedColorUtils: 100,
    grainSystem: 300,
    mouseInteraction: 20,
    advancedMath: 50,
    domainWarping: 80,
    fluidSimulation: 200
  };

  // Calculate original size (everything included)
  const originalSize = Object.values(componentSizes).reduce((sum, size) => sum + size, 0) + 200; // +200 for base shader

  // Calculate optimized size (only what's needed)
  let optimizedSize = 200; // Base shader

  if (features.uses2DNoise) optimizedSize += componentSizes.noise2D;
  if (features.uses3DNoise) optimizedSize += componentSizes.noise3D;
  if (features.usesFBM) optimizedSize += componentSizes.fbm;
  if (features.usesCurlNoise) optimizedSize += componentSizes.curlNoise;
  if (features.usesHSVConversion) optimizedSize += componentSizes.hsvConversion;
  if (features.usesProceduralGradient) optimizedSize += componentSizes.proceduralGradient;
  if (features.usesColorBlending) optimizedSize += componentSizes.colorBlending;
  if (features.usesAdvancedColorUtils) optimizedSize += componentSizes.advancedColorUtils;
  if (features.usesGrain) optimizedSize += componentSizes.grainSystem;
  if (features.usesMouseInteraction) optimizedSize += componentSizes.mouseInteraction;
  if (features.usesAdvancedMath) optimizedSize += componentSizes.advancedMath;
  if (features.usesDomainWarping) optimizedSize += componentSizes.domainWarping;
  if (features.usesFluidSimulation) optimizedSize += componentSizes.fluidSimulation;

  const reduction = originalSize - optimizedSize;
  const reductionPercent = Math.round((reduction / originalSize) * 100);

  return {
    originalSize,
    optimizedSize,
    reduction,
    reductionPercent
  };
}
