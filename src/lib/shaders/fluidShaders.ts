// Fluid Interactivity Shaders with Distortion
// Based on advanced fluid simulation with mouse interaction

export const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const fluidSimulationShader = `
  uniform float iTime;
  uniform vec2 iResolution;
  uniform vec4 iMouse;
  uniform int iFrame;
  uniform sampler2D iPreviousFrame;
  uniform float uBrushSize;
  uniform float uBrushStrength;
  uniform float uFluidDecay;
  uniform float uTrailLength;
  uniform float uStopDecay;
  varying vec2 vUv;
  
  vec2 ur, U;
  
  // Line distance function for brush interaction
  float ln(vec2 p, vec2 a, vec2 b) {
      return length(p-a-(b-a)*clamp(dot(p-a,b-a)/dot(b-a,b-a),0.,1.));
  }
  
  // Texture sampling with offset
  vec4 t(vec2 v, int a, int b) {
      return texture2D(iPreviousFrame, fract((v+vec2(float(a),float(b)))/ur));
  }
  
  // Basic texture sampling
  vec4 t(vec2 v) {
      return texture2D(iPreviousFrame, fract(v/ur));
  }
  
  // Triangle area calculation for fluid dynamics
  float area(vec2 a, vec2 b, vec2 c) {
      float A = length(b-c), B = length(c-a), C = length(a-b), s = 0.5*(A+B+C);
      return sqrt(s*(s-A)*(s-B)*(s-C));
  }
  
  void main() {
      U = vUv * iResolution;
      ur = iResolution.xy;
      
      // Initialize fluid on first frame
      if (iFrame < 1) {
          float w = 0.5+sin(0.2*U.x)*0.5;
          float q = length(U-0.5*ur);
          gl_FragColor = vec4(0.1*exp(-0.001*q*q),0,0,w);
      } else {
          // Fluid simulation step
          vec2 v = U,
               A = v + vec2( 1, 1),
               B = v + vec2( 1,-1),
               C = v + vec2(-1, 1),
               D = v + vec2(-1,-1);
          
          // Advection step - trace particles backward
          for (int i = 0; i < 8; i++) {
              v -= t(v).xy;
              A -= t(A).xy;
              B -= t(B).xy;
              C -= t(C).xy;
              D -= t(D).xy;
          }
          
          // Sample current state and neighbors
          vec4 me = t(v);
          vec4 n = t(v, 0, 1),
              e = t(v, 1, 0),
              s = t(v, 0, -1),
              w = t(v, -1, 0);
          vec4 ne = .25*(n+e+s+w);
          
          // Diffusion and pressure projection
          me = mix(t(v), ne, vec4(0.15,0.15,0.95,0.));
          me.z = me.z - 0.01*((area(A,B,C)+area(B,C,D))-4.);
          
          // Pressure gradient
          vec4 pr = vec4(e.z,w.z,n.z,s.z);
          me.xy = me.xy + 100.*vec2(pr.x-pr.y, pr.z-pr.w)/ur;
          
          // Apply decay
          me.xy *= uFluidDecay;
          me.z *= uTrailLength;
          
          // Mouse interaction
          if (iMouse.z > 0.0) {
              vec2 mousePos = iMouse.xy;
              vec2 mousePrev = iMouse.zw;
              vec2 mouseVel = mousePos - mousePrev;
              float velMagnitude = length(mouseVel);
              float q = ln(U, mousePos, mousePrev);
              vec2 m = mousePos - mousePrev;
              float l = length(m);
              if (l > 0.0) m = min(l, 10.0) * m / l;
              
              float brushSizeFactor = 1e-4 / uBrushSize;
              float strengthFactor = 0.03 * uBrushStrength;
              
              float falloff = exp(-brushSizeFactor*q*q*q);
              falloff = pow(falloff, 0.5);
              
              me.xyw += strengthFactor * falloff * vec3(m, 10.);
              
              // Slow decay when mouse stops
              if (velMagnitude < 2.0) {
                  float distToCursor = length(U - mousePos);
                  float influence = exp(-distToCursor * 0.01);
                  float cursorDecay = mix(1.0, uStopDecay, influence);
                  me.xy *= cursorDecay;
                  me.z *= cursorDecay;
              }
          }
          
          gl_FragColor = clamp(me, -0.4, 0.4);
      }
  }
`;

export const fluidDisplayShader = `
  uniform float iTime;
  uniform vec2 iResolution;
  uniform sampler2D iFluid;
  uniform float uDistortionAmount;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform vec3 uColor3;
  uniform vec3 uColor4;
  uniform float uColorIntensity;
  uniform float uSoftness;

  // Grain uniforms
  uniform float uGrainIntensity;
  uniform float uGrainSize;
  uniform float uGrainSpeed;
  uniform float uGrainContrast;
  uniform int uGrainType;
  uniform float uGrainBlendMode;

  varying vec2 vUv;

  // High-quality random function
  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
  }

  // Improved random with time
  float randomTime(vec2 st, float time) {
    return fract(sin(dot(st.xy + time, vec2(12.9898, 78.233))) * 43758.5453123);
  }

  // Enhanced film grain function with better distribution
  float filmGrain(vec2 uv, float time) {
    vec2 grainUV = uv * uGrainSize;
    // Multi-octave grain for more realistic texture
    float grain1 = randomTime(floor(grainUV), time * uGrainSpeed);

    // Add some smoothing for more realistic grain
    float grain2 = randomTime(floor(grainUV + vec2(1.0, 0.0)), time * uGrainSpeed);
    float grain3 = randomTime(floor(grainUV + vec2(0.0, 1.0)), time * uGrainSpeed);
    float grain4 = randomTime(floor(grainUV + vec2(1.0, 1.0)), time * uGrainSpeed);

    vec2 f = fract(grainUV);
    float baseGrain = mix(mix(grain1, grain2, f.x), mix(grain3, grain4, f.x), f.y);

    // Add fine detail layer
    float fineGrain = randomTime(grainUV * 2.0, time * uGrainSpeed * 1.5) * 0.3;

    // Combine layers with proper film grain distribution
    float finalGrain = baseGrain * 0.7 + fineGrain;

    // Apply film-like gamma curve
    return pow(finalGrain, 0.8);
  }

  // Enhanced digital noise grain
  float digitalGrain(vec2 uv, float time) {
    vec2 grainUV = uv * uGrainSize;

    // Clean digital noise with sharp transitions
    float baseNoise = randomTime(floor(grainUV), time * uGrainSpeed);

    // Add temporal variation for digital flicker
    float temporalNoise = randomTime(vec2(time * uGrainSpeed * 10.0), 0.0) * 0.1;

    // Combine with quantization for digital look
    float digitalGrain = floor((baseNoise + temporalNoise) * 8.0) / 8.0;

    return digitalGrain;
  }

  // Organic grain with multiple octaves
  float organicGrain(vec2 uv, float time) {
    vec2 grainUV = uv * uGrainSize;
    float grain = 0.0;
    float amplitude = 1.0;

    for (int i = 0; i < 3; i++) {
      grain += randomTime(grainUV, time * uGrainSpeed) * amplitude;
      grainUV *= 2.0;
      amplitude *= 0.5;
    }

    return grain / 1.875; // Normalize
  }

  // Animated grain with flow
  float animatedGrain(vec2 uv, float time, vec2 flow) {
    vec2 grainUV = uv * uGrainSize + flow * 0.1;
    return randomTime(grainUV, time * uGrainSpeed);
  }

  // Halftone pattern grain
  float halftoneGrain(vec2 uv, float time) {
    vec2 grainUV = uv * uGrainSize;
    vec2 center = floor(grainUV) + 0.5;
    float dist = length(grainUV - center);
    float noise = randomTime(center, time * uGrainSpeed);
    return smoothstep(0.3 * noise, 0.5 * noise, dist);
  }

  // Proper blend mode implementations
  vec3 blendOverlay(vec3 base, vec3 blend) {
    return mix(
      2.0 * base * blend,
      1.0 - 2.0 * (1.0 - base) * (1.0 - blend),
      step(0.5, base)
    );
  }

  vec3 blendMultiply(vec3 base, vec3 blend) {
    return base * blend;
  }

  vec3 blendScreen(vec3 base, vec3 blend) {
    return 1.0 - (1.0 - base) * (1.0 - blend);
  }

  vec3 blendSoftLight(vec3 base, vec3 blend) {
    vec3 result1 = 2.0 * base * blend + base * base * (1.0 - 2.0 * blend);
    vec3 result2 = sqrt(base) * (2.0 * blend - 1.0) + 2.0 * base * (1.0 - blend);
    return mix(result1, result2, step(0.5, blend));
  }

  vec3 blendLinear(vec3 base, vec3 blend) {
    return base + blend;
  }

  // Apply grain with proper blend modes
  vec3 applyGrain(vec3 color, float grain, float blendMode) {
    // Normalize grain to 0-1 range and apply contrast
    grain = clamp(grain * uGrainContrast, 0.0, 1.0);

    // Create grain color (grayscale)
    vec3 grainColor = vec3(grain);

    // Apply blend mode
    vec3 blendedColor;

    if (blendMode < 0.5) {
      // Overlay blend (0)
      blendedColor = blendOverlay(color, grainColor);
    } else if (blendMode < 1.5) {
      // Multiply blend (1)
      blendedColor = blendMultiply(color, grainColor);
    } else if (blendMode < 2.5) {
      // Screen blend (2)
      blendedColor = blendScreen(color, grainColor);
    } else if (blendMode < 3.5) {
      // Soft Light blend (3)
      blendedColor = blendSoftLight(color, grainColor);
    } else {
      // Linear blend (4)
      blendedColor = blendLinear(color, grainColor - 0.5);
    }

    // Mix with original color based on grain intensity
    return mix(color, blendedColor, uGrainIntensity);
  }

  void main() {
    vec2 fragCoord = vUv * iResolution;

    // Sample fluid velocity
    vec4 fluid = texture2D(iFluid, vUv);
    vec2 fluidVel = fluid.xy;

    // Normalize coordinates
    float mr = min(iResolution.x, iResolution.y);
    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / mr;

    // Apply fluid distortion
    uv += fluidVel * (0.5 * uDistortionAmount);

    // Generate animated pattern
    float d = -iTime * 0.5;
    float a = 0.0;
    for (float i = 0.0; i < 8.0; ++i) {
      a += cos(i - d - a * uv.x);
      d += sin(uv.y * i + a);
    }
    d += iTime * 0.5;

    // Create color mixers
    float mixer1 = cos(uv.x * d) * 0.5 + 0.5;
    float mixer2 = cos(uv.y * a) * 0.5 + 0.5;
    float mixer3 = sin(d + a) * 0.5 + 0.5;

    // Apply softness
    float smoothAmount = clamp(uSoftness * 0.1, 0.0, 0.9);
    mixer1 = mix(mixer1, 0.5, smoothAmount);
    mixer2 = mix(mixer2, 0.5, smoothAmount);
    mixer3 = mix(mixer3, 0.5, smoothAmount);

    // Blend colors
    vec3 col = mix(uColor1, uColor2, mixer1);
    col = mix(col, uColor3, mixer2);
    col = mix(col, uColor4, mixer3 * 0.4);

    // Apply intensity
    col *= uColorIntensity;

    // Generate grain based on type
    float grain = 0.0;
    if (uGrainType == 0) {
      grain = filmGrain(vUv, iTime);
    } else if (uGrainType == 1) {
      grain = digitalGrain(vUv, iTime);
    } else if (uGrainType == 2) {
      grain = organicGrain(vUv, iTime);
    } else if (uGrainType == 3) {
      grain = animatedGrain(vUv, iTime, fluidVel);
    } else if (uGrainType == 4) {
      grain = halftoneGrain(vUv, iTime);
    }

    // Apply grain to color
    if (uGrainIntensity > 0.0) {
      col = applyGrain(col, grain, uGrainBlendMode);
    }

    gl_FragColor = vec4(col, 1.0);
  }
`;

// Configuration interface for fluid system
export interface FluidConfig {
  brushSize: number;
  brushStrength: number;
  distortionAmount: number;
  fluidDecay: number;
  trailLength: number;
  stopDecay: number;
  color1: string;
  color2: string;
  color3: string;
  color4: string;
  colorIntensity: number;
  softness: number;

  // Grain parameters
  grainIntensity: number;
  grainSize: number;
  grainSpeed: number;
  grainContrast: number;
  grainType: number; // 0: Film, 1: Digital, 2: Organic, 3: Animated, 4: Halftone
  grainBlendMode: number; // 0: Overlay, 1: Multiply, 2: Screen, 3: Soft Light, 4: Linear
}

// Default configuration
export const defaultFluidConfig: FluidConfig = {
  brushSize: 25.0,
  brushStrength: 0.5,
  distortionAmount: 2.5,
  fluidDecay: 0.98,
  trailLength: 0.8,
  stopDecay: 0.85,
  color1: "#b8fff7",
  color2: "#6e3466",
  color3: "#0133ff",
  color4: "#66d1fe",
  colorIntensity: 1.0,
  softness: 1.0,

  // Grain defaults
  grainIntensity: 0.0, // Start with no grain
  grainSize: 100.0,
  grainSpeed: 1.0,
  grainContrast: 1.0,
  grainType: 3, // Animated grain (default)
  grainBlendMode: 0, // Overlay
};

// Utility function to convert hex to RGB
export function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b];
}
