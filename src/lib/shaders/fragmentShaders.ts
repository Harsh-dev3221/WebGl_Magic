import { simplexNoise2D, simplexNoise3D, fbm, curlNoise, colorUtils } from './noise';

export const fluidShader = `
precision highp float;

uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform vec3 u_color1;
uniform vec3 u_color2;
uniform vec3 u_color3;
uniform float u_speed;
uniform float u_scale;
uniform float u_viscosity;
uniform float u_pressure;
uniform sampler2D u_gradientTexture;

// Grain uniforms
uniform float u_grainIntensity;
uniform float u_grainSize;
uniform float u_grainSpeed;
uniform float u_grainContrast;
uniform int u_grainType;
uniform int u_grainBlendMode;

// Mouse interaction control
uniform float u_mouseInteractionEnabled;

varying vec2 vUv;

${simplexNoise3D}

// Compact grain system
float grainRandom(vec2 st) { return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123); }
float grainRandomTime(vec2 st, float time) { return fract(sin(dot(st.xy + time, vec2(12.9898, 78.233))) * 43758.5453123); }
float grainFilm(vec2 uv, float time) { vec2 grainUV = uv * u_grainSize; float grain1 = grainRandomTime(floor(grainUV), time * u_grainSpeed); float grain2 = grainRandomTime(floor(grainUV + vec2(1.0, 0.0)), time * u_grainSpeed); float grain3 = grainRandomTime(floor(grainUV + vec2(0.0, 1.0)), time * u_grainSpeed); float grain4 = grainRandomTime(floor(grainUV + vec2(1.0, 1.0)), time * u_grainSpeed); vec2 f = fract(grainUV); float baseGrain = mix(mix(grain1, grain2, f.x), mix(grain3, grain4, f.x), f.y); float fineGrain = grainRandomTime(grainUV * 2.0, time * u_grainSpeed * 1.5) * 0.3; return pow(baseGrain * 0.7 + fineGrain, 0.8); }
float grainDigital(vec2 uv, float time) { vec2 grainUV = uv * u_grainSize; float baseNoise = grainRandomTime(floor(grainUV), time * u_grainSpeed); float temporalNoise = grainRandomTime(vec2(time * u_grainSpeed * 10.0), 0.0) * 0.1; return floor((baseNoise + temporalNoise) * 8.0) / 8.0; }
float grainOrganic(vec2 uv, float time) { vec2 grainUV = uv * u_grainSize; float grain = 0.0; float amplitude = 1.0; for (int i = 0; i < 3; i++) { grain += grainRandomTime(grainUV, time * u_grainSpeed) * amplitude; grainUV *= 2.0; amplitude *= 0.5; } return grain / 1.875; }
float grainAnimated(vec2 uv, float time) { vec2 grainUV = uv * u_grainSize + sin(time * u_grainSpeed) * 0.1; float angle = time * u_grainSpeed * 0.5; mat2 rotation = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)); grainUV = rotation * grainUV; return grainRandomTime(grainUV, time * u_grainSpeed); }
float grainHalftone(vec2 uv, float time) { vec2 grainUV = uv * u_grainSize; vec2 center = floor(grainUV) + 0.5; float dist = length(grainUV - center); float noise = grainRandomTime(center, time * u_grainSpeed); return smoothstep(0.3 * noise, 0.5 * noise, dist); }
vec3 blendOverlay(vec3 base, vec3 blend) { return mix(2.0 * base * blend, 1.0 - 2.0 * (1.0 - base) * (1.0 - blend), step(0.5, base)); }
vec3 blendMultiply(vec3 base, vec3 blend) { return base * blend; }
vec3 blendScreen(vec3 base, vec3 blend) { return 1.0 - (1.0 - base) * (1.0 - blend); }
vec3 blendSoftLight(vec3 base, vec3 blend) { vec3 result1 = 2.0 * base * blend + base * base * (1.0 - 2.0 * blend); vec3 result2 = sqrt(base) * (2.0 * blend - 1.0) + 2.0 * base * (1.0 - blend); return mix(result1, result2, step(0.5, blend)); }
vec3 blendLinear(vec3 base, vec3 blend) { return base + (blend - 0.5); }
vec3 applyGrain(vec3 color, vec2 uv, float time) { if (u_grainIntensity <= 0.0) return color; float grain = 0.0; if (u_grainType == 0) grain = grainFilm(uv, time); else if (u_grainType == 1) grain = grainDigital(uv, time); else if (u_grainType == 2) grain = grainOrganic(uv, time); else if (u_grainType == 3) grain = grainAnimated(uv, time); else if (u_grainType == 4) grain = grainHalftone(uv, time); grain = clamp(grain * u_grainContrast, 0.0, 1.0); vec3 grainColor = vec3(grain); vec3 blendedColor; if (u_grainBlendMode == 0) blendedColor = blendOverlay(color, grainColor); else if (u_grainBlendMode == 1) blendedColor = blendMultiply(color, grainColor); else if (u_grainBlendMode == 2) blendedColor = blendScreen(color, grainColor); else if (u_grainBlendMode == 3) blendedColor = blendSoftLight(color, grainColor); else blendedColor = blendLinear(color, grainColor); return mix(color, blendedColor, u_grainIntensity); }

// Fluid simulation using simplified Navier-Stokes
vec2 curl(vec2 p) {
    float eps = 0.001;
    float n1 = snoise3D(vec3(p.x, p.y + eps, u_time * u_speed));
    float n2 = snoise3D(vec3(p.x, p.y - eps, u_time * u_speed));
    float n3 = snoise3D(vec3(p.x + eps, p.y, u_time * u_speed));
    float n4 = snoise3D(vec3(p.x - eps, p.y, u_time * u_speed));
    
    // Normalize curl by epsilon*2 to keep values reasonable
    vec2 c = vec2(n1 - n2, n4 - n3) / (2.0 * eps);
    return c * u_scale * 0.2; // scale down to avoid large jumps
}

void main() {
    vec2 uv = vUv;
    vec2 mouse = u_mouse / u_resolution;
    
    // Create fluid flow field
    vec2 p = uv * u_scale + u_time * u_speed * 0.1;
    vec2 velocity = curl(p);
    
    // Add mouse influence for fluid interaction (if enabled)
    if (u_mouseInteractionEnabled > 0.5) {
        float mouseInfluence = 1.0 - length(uv - mouse);
        mouseInfluence = smoothstep(0.0, 0.3, mouseInfluence);
        velocity += (uv - mouse) * mouseInfluence * u_pressure;
    }
    
    // Apply viscosity damping
    velocity *= u_viscosity;
    
    // Advect the coordinates
    vec2 fluidUV = uv + velocity * 0.1;
    
    // Sample gradient based on fluid flow
    float gradientPos = length(velocity) * 0.5 + sin(fluidUV.x * 10.0 + u_time) * 0.1;
    gradientPos = clamp(gradientPos, 0.0, 1.0);
    
    vec3 color = texture2D(u_gradientTexture, vec2(gradientPos, 0.5)).rgb;
    
    // Add flow visualization
    float flowMagnitude = length(velocity);
    color += vec3(flowMagnitude * 0.5);

    // Apply advanced grain effect
    color = applyGrain(color, uv, u_time);

    gl_FragColor = vec4(color, 1.0);
}
`;

export const particleShader = `
precision highp float;

uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform vec3 u_color1;
uniform vec3 u_color2;
uniform vec3 u_color3;
uniform float u_speed;
uniform float u_scale;
uniform float u_particleCount;
uniform float u_particleSize;
uniform sampler2D u_gradientTexture;

// Grain uniforms
uniform float u_grainIntensity;
uniform float u_grainSize;
uniform float u_grainSpeed;
uniform float u_grainContrast;
uniform int u_grainType;
uniform int u_grainBlendMode;

// Mouse interaction control
uniform float u_mouseInteractionEnabled;

varying vec2 vUv;

${simplexNoise3D}

// Compact grain system
float grainRandom(vec2 st) { return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123); }
float grainRandomTime(vec2 st, float time) { return fract(sin(dot(st.xy + time, vec2(12.9898, 78.233))) * 43758.5453123); }
float grainFilm(vec2 uv, float time) { vec2 grainUV = uv * u_grainSize; float grain1 = grainRandomTime(floor(grainUV), time * u_grainSpeed); float grain2 = grainRandomTime(floor(grainUV + vec2(1.0, 0.0)), time * u_grainSpeed); float grain3 = grainRandomTime(floor(grainUV + vec2(0.0, 1.0)), time * u_grainSpeed); float grain4 = grainRandomTime(floor(grainUV + vec2(1.0, 1.0)), time * u_grainSpeed); vec2 f = fract(grainUV); float baseGrain = mix(mix(grain1, grain2, f.x), mix(grain3, grain4, f.x), f.y); float fineGrain = grainRandomTime(grainUV * 2.0, time * u_grainSpeed * 1.5) * 0.3; return pow(baseGrain * 0.7 + fineGrain, 0.8); }
float grainDigital(vec2 uv, float time) { vec2 grainUV = uv * u_grainSize; float baseNoise = grainRandomTime(floor(grainUV), time * u_grainSpeed); float temporalNoise = grainRandomTime(vec2(time * u_grainSpeed * 10.0), 0.0) * 0.1; return floor((baseNoise + temporalNoise) * 8.0) / 8.0; }
float grainOrganic(vec2 uv, float time) { vec2 grainUV = uv * u_grainSize; float grain = 0.0; float amplitude = 1.0; for (int i = 0; i < 3; i++) { grain += grainRandomTime(grainUV, time * u_grainSpeed) * amplitude; grainUV *= 2.0; amplitude *= 0.5; } return grain / 1.875; }
float grainAnimated(vec2 uv, float time) { vec2 grainUV = uv * u_grainSize + sin(time * u_grainSpeed) * 0.1; float angle = time * u_grainSpeed * 0.5; mat2 rotation = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)); grainUV = rotation * grainUV; return grainRandomTime(grainUV, time * u_grainSpeed); }
float grainHalftone(vec2 uv, float time) { vec2 grainUV = uv * u_grainSize; vec2 center = floor(grainUV) + 0.5; float dist = length(grainUV - center); float noise = grainRandomTime(center, time * u_grainSpeed); return smoothstep(0.3 * noise, 0.5 * noise, dist); }
vec3 blendOverlay(vec3 base, vec3 blend) { return mix(2.0 * base * blend, 1.0 - 2.0 * (1.0 - base) * (1.0 - blend), step(0.5, base)); }
vec3 blendMultiply(vec3 base, vec3 blend) { return base * blend; }
vec3 blendScreen(vec3 base, vec3 blend) { return 1.0 - (1.0 - base) * (1.0 - blend); }
vec3 blendSoftLight(vec3 base, vec3 blend) { vec3 result1 = 2.0 * base * blend + base * base * (1.0 - 2.0 * blend); vec3 result2 = sqrt(base) * (2.0 * blend - 1.0) + 2.0 * base * (1.0 - blend); return mix(result1, result2, step(0.5, blend)); }
vec3 blendLinear(vec3 base, vec3 blend) { return base + (blend - 0.5); }
vec3 applyGrain(vec3 color, vec2 uv, float time) { if (u_grainIntensity <= 0.0) return color; float grain = 0.0; if (u_grainType == 0) grain = grainFilm(uv, time); else if (u_grainType == 1) grain = grainDigital(uv, time); else if (u_grainType == 2) grain = grainOrganic(uv, time); else if (u_grainType == 3) grain = grainAnimated(uv, time); else if (u_grainType == 4) grain = grainHalftone(uv, time); grain = clamp(grain * u_grainContrast, 0.0, 1.0); vec3 grainColor = vec3(grain); vec3 blendedColor; if (u_grainBlendMode == 0) blendedColor = blendOverlay(color, grainColor); else if (u_grainBlendMode == 1) blendedColor = blendMultiply(color, grainColor); else if (u_grainBlendMode == 2) blendedColor = blendScreen(color, grainColor); else if (u_grainBlendMode == 3) blendedColor = blendSoftLight(color, grainColor); else blendedColor = blendLinear(color, grainColor); return mix(color, blendedColor, u_grainIntensity); }

// Hash function for pseudo-random numbers
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// Particle system simulation
vec3 particleSystem(vec2 uv) {
    vec3 color = vec3(0.0);
    float particleCount = u_particleCount;
    
    for (float i = 0.0; i < 50.0; i++) {
        if (i >= particleCount) break;
        
        // Generate particle position using hash
        vec2 seed = vec2(i * 0.1, i * 0.2);
        vec2 particlePos = vec2(
            hash(seed) + sin(u_time * u_speed + i * 0.5) * 0.3,
            hash(seed + vec2(1.0, 1.0)) + cos(u_time * u_speed + i * 0.7) * 0.3
        );
        
        // Wrap particles
        particlePos = fract(particlePos);
        
        // Calculate distance to particle
        float dist = length(uv - particlePos);
        
        // Create particle with size and falloff
        float particle = 1.0 - smoothstep(0.0, u_particleSize * 0.05, dist);
        particle = pow(particle, 3.0);
        
        // Sample gradient for particle color
        float gradientPos = hash(seed + vec2(2.0, 2.0));
        vec3 particleColor = texture2D(u_gradientTexture, vec2(gradientPos, 0.5)).rgb;
        
        // Add particle to accumulation
        color += particleColor * particle;
    }
    
    return color;
}

void main() {
    vec2 uv = vUv;
    vec2 mouse = u_mouse / u_resolution;
    
    // Create particle background noise
    vec2 noiseUV = uv * u_scale + u_time * u_speed * 0.1;
    float backgroundNoise = snoise3D(vec3(noiseUV, u_time * 0.1));
    
    // Get particle system color
    vec3 particles = particleSystem(uv);
    
    // Sample gradient for background
    float gradientPos = backgroundNoise * 0.5 + 0.5;
    vec3 backgroundColor = texture2D(u_gradientTexture, vec2(gradientPos, 0.5)).rgb * 0.3;
    
    // Combine particles with background
    vec3 color = backgroundColor + particles;
    
    // Add mouse interaction glow (if enabled)
    if (u_mouseInteractionEnabled > 0.5) {
        float mouseInfluence = 1.0 - length(uv - mouse);
        mouseInfluence = smoothstep(0.0, 0.4, mouseInfluence);
        color += vec3(mouseInfluence * 0.5);
    }

    // Apply advanced grain effect
    color = applyGrain(color, uv, u_time);

    gl_FragColor = vec4(color, 1.0);
}
`;

export const kaleidoscopeShader = `
precision highp float;

uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform vec3 u_color1;
uniform vec3 u_color2;
uniform vec3 u_color3;
uniform float u_speed;
uniform float u_scale;
uniform float u_segments;
uniform float u_rotation;
uniform sampler2D u_gradientTexture;

// Grain uniforms
uniform float u_grainIntensity;
uniform float u_grainSize;
uniform float u_grainSpeed;
uniform float u_grainContrast;
uniform int u_grainType;
uniform int u_grainBlendMode;

// Mouse interaction control
uniform float u_mouseInteractionEnabled;

varying vec2 vUv;

${simplexNoise3D}

// Compact grain system
float grainRandom(vec2 st) { return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123); }
float grainRandomTime(vec2 st, float time) { return fract(sin(dot(st.xy + time, vec2(12.9898, 78.233))) * 43758.5453123); }
float grainFilm(vec2 uv, float time) { vec2 grainUV = uv * u_grainSize; float grain1 = grainRandomTime(floor(grainUV), time * u_grainSpeed); float grain2 = grainRandomTime(floor(grainUV + vec2(1.0, 0.0)), time * u_grainSpeed); float grain3 = grainRandomTime(floor(grainUV + vec2(0.0, 1.0)), time * u_grainSpeed); float grain4 = grainRandomTime(floor(grainUV + vec2(1.0, 1.0)), time * u_grainSpeed); vec2 f = fract(grainUV); float baseGrain = mix(mix(grain1, grain2, f.x), mix(grain3, grain4, f.x), f.y); float fineGrain = grainRandomTime(grainUV * 2.0, time * u_grainSpeed * 1.5) * 0.3; return pow(baseGrain * 0.7 + fineGrain, 0.8); }
float grainDigital(vec2 uv, float time) { vec2 grainUV = uv * u_grainSize; float baseNoise = grainRandomTime(floor(grainUV), time * u_grainSpeed); float temporalNoise = grainRandomTime(vec2(time * u_grainSpeed * 10.0), 0.0) * 0.1; return floor((baseNoise + temporalNoise) * 8.0) / 8.0; }
float grainOrganic(vec2 uv, float time) { vec2 grainUV = uv * u_grainSize; float grain = 0.0; float amplitude = 1.0; for (int i = 0; i < 3; i++) { grain += grainRandomTime(grainUV, time * u_grainSpeed) * amplitude; grainUV *= 2.0; amplitude *= 0.5; } return grain / 1.875; }
float grainAnimated(vec2 uv, float time) { vec2 grainUV = uv * u_grainSize + sin(time * u_grainSpeed) * 0.1; float angle = time * u_grainSpeed * 0.5; mat2 rotation = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)); grainUV = rotation * grainUV; return grainRandomTime(grainUV, time * u_grainSpeed); }
float grainHalftone(vec2 uv, float time) { vec2 grainUV = uv * u_grainSize; vec2 center = floor(grainUV) + 0.5; float dist = length(grainUV - center); float noise = grainRandomTime(center, time * u_grainSpeed); return smoothstep(0.3 * noise, 0.5 * noise, dist); }
vec3 blendOverlay(vec3 base, vec3 blend) { return mix(2.0 * base * blend, 1.0 - 2.0 * (1.0 - base) * (1.0 - blend), step(0.5, base)); }
vec3 blendMultiply(vec3 base, vec3 blend) { return base * blend; }
vec3 blendScreen(vec3 base, vec3 blend) { return 1.0 - (1.0 - base) * (1.0 - blend); }
vec3 blendSoftLight(vec3 base, vec3 blend) { vec3 result1 = 2.0 * base * blend + base * base * (1.0 - 2.0 * blend); vec3 result2 = sqrt(base) * (2.0 * blend - 1.0) + 2.0 * base * (1.0 - blend); return mix(result1, result2, step(0.5, blend)); }
vec3 blendLinear(vec3 base, vec3 blend) { return base + (blend - 0.5); }
vec3 applyGrain(vec3 color, vec2 uv, float time) { if (u_grainIntensity <= 0.0) return color; float grain = 0.0; if (u_grainType == 0) grain = grainFilm(uv, time); else if (u_grainType == 1) grain = grainDigital(uv, time); else if (u_grainType == 2) grain = grainOrganic(uv, time); else if (u_grainType == 3) grain = grainAnimated(uv, time); else if (u_grainType == 4) grain = grainHalftone(uv, time); grain = clamp(grain * u_grainContrast, 0.0, 1.0); vec3 grainColor = vec3(grain); vec3 blendedColor; if (u_grainBlendMode == 0) blendedColor = blendOverlay(color, grainColor); else if (u_grainBlendMode == 1) blendedColor = blendMultiply(color, grainColor); else if (u_grainBlendMode == 2) blendedColor = blendScreen(color, grainColor); else if (u_grainBlendMode == 3) blendedColor = blendSoftLight(color, grainColor); else blendedColor = blendLinear(color, grainColor); return mix(color, blendedColor, u_grainIntensity); }

// Kaleidoscope transformation
vec2 kaleidoscope(vec2 uv, float segments) {
    vec2 center = vec2(0.5);
    vec2 pos = uv - center;
    
    // Convert to polar coordinates
    float angle = atan(pos.y, pos.x);
    float radius = length(pos);
    
    // Apply kaleidoscope effect
    float segmentAngle = 2.0 * 3.14159 / segments;
    angle = mod(angle, segmentAngle);
    
    // Mirror alternate segments
    if (mod(floor(atan(pos.y, pos.x) / segmentAngle), 2.0) > 0.5) {
        angle = segmentAngle - angle;
    }
    
    // Add rotation with optional mouse interaction
    float rotation = u_rotation + u_time * u_speed * 0.5;
    if (u_mouseInteractionEnabled > 0.5) {
        vec2 mouse = u_mouse / u_resolution;
        float mouseInfluence = length(mouse - vec2(0.5)) * 2.0;
        rotation += mouseInfluence * 3.14159;
    }
    angle += rotation;
    
    // Convert back to cartesian
    return vec2(cos(angle), sin(angle)) * radius + center;
}

void main() {
    vec2 uv = vUv;
    
    // Apply kaleidoscope transformation
    vec2 kaleidoUV = kaleidoscope(uv, u_segments);
    
    // Generate pattern
    vec2 noiseUV = kaleidoUV * u_scale;
    float noise1 = snoise3D(vec3(noiseUV, u_time * u_speed));
    float noise2 = snoise3D(vec3(noiseUV * 2.0, u_time * u_speed * 0.7));
    float noise3 = snoise3D(vec3(noiseUV * 4.0, u_time * u_speed * 0.3));
    
    // Combine noise layers
    float pattern = noise1 * 0.5 + noise2 * 0.3 + noise3 * 0.2;
    pattern = pattern * 0.5 + 0.5;
    
    // Sample gradient
    vec3 color = texture2D(u_gradientTexture, vec2(pattern, 0.5)).rgb;
    
    // Add radial gradient effect
    float radialGradient = 1.0 - length(uv - vec2(0.5));
    color *= radialGradient * 1.5;

    // Apply advanced grain effect
    color = applyGrain(color, uv, u_time);

    gl_FragColor = vec4(color, 1.0);
}
`;

// Previous shaders remain the same...
export const classicGradientShader = `
// Base gradient shader
precision mediump float;

uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform vec3 u_color1;
uniform vec3 u_color2;
uniform vec3 u_color3;
uniform float u_speed;
uniform float u_scale;
uniform int u_octaves;
uniform float u_lacunarity;
uniform float u_persistence;
uniform sampler2D u_gradientTexture;

// Grain uniforms
uniform float u_grainIntensity;
uniform float u_grainSize;
uniform float u_grainSpeed;
uniform float u_grainContrast;
uniform int u_grainType;
uniform int u_grainBlendMode;

// Mouse interaction control
uniform float u_mouseInteractionEnabled;

varying vec2 vUv;

${simplexNoise2D}
${simplexNoise3D}
${fbm}
${colorUtils}

// Grain functions
float grainRandom(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

float grainRandomTime(vec2 st, float time) {
    return fract(sin(dot(st.xy + time, vec2(12.9898, 78.233))) * 43758.5453123);
}

float grainFilm(vec2 uv, float time) {
    vec2 grainUV = uv * u_grainSize;

    // Multi-octave film grain for realism
    float grain1 = grainRandomTime(floor(grainUV), time * u_grainSpeed);
    float grain2 = grainRandomTime(floor(grainUV + vec2(1.0, 0.0)), time * u_grainSpeed);
    float grain3 = grainRandomTime(floor(grainUV + vec2(0.0, 1.0)), time * u_grainSpeed);
    float grain4 = grainRandomTime(floor(grainUV + vec2(1.0, 1.0)), time * u_grainSpeed);

    vec2 f = fract(grainUV);
    float baseGrain = mix(mix(grain1, grain2, f.x), mix(grain3, grain4, f.x), f.y);

    // Add fine detail layer
    float fineGrain = grainRandomTime(grainUV * 2.0, time * u_grainSpeed * 1.5) * 0.3;

    // Combine with film-like gamma curve
    float finalGrain = baseGrain * 0.7 + fineGrain;
    return pow(finalGrain, 0.8);
}

float grainDigital(vec2 uv, float time) {
    vec2 grainUV = uv * u_grainSize;

    // Clean digital noise with sharp transitions
    float baseNoise = grainRandomTime(floor(grainUV), time * u_grainSpeed);

    // Add temporal variation for digital flicker
    float temporalNoise = grainRandomTime(vec2(time * u_grainSpeed * 10.0), 0.0) * 0.1;

    // Quantize for digital look
    float digitalGrain = floor((baseNoise + temporalNoise) * 8.0) / 8.0;
    return digitalGrain;
}

float grainOrganic(vec2 uv, float time) {
    vec2 grainUV = uv * u_grainSize;
    float grain = 0.0;
    float amplitude = 1.0;

    // Multi-octave organic noise
    for (int i = 0; i < 3; i++) {
        grain += grainRandomTime(grainUV, time * u_grainSpeed) * amplitude;
        grainUV *= 2.0;
        amplitude *= 0.5;
    }

    return grain / 1.875; // Normalize
}

float grainAnimated(vec2 uv, float time) {
    vec2 grainUV = uv * u_grainSize + sin(time * u_grainSpeed) * 0.1;

    // Add rotation for more dynamic movement
    float angle = time * u_grainSpeed * 0.5;
    mat2 rotation = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    grainUV = rotation * grainUV;

    return grainRandomTime(grainUV, time * u_grainSpeed);
}

float grainHalftone(vec2 uv, float time) {
    vec2 grainUV = uv * u_grainSize;
    vec2 center = floor(grainUV) + 0.5;
    float dist = length(grainUV - center);
    float noise = grainRandomTime(center, time * u_grainSpeed);
    return smoothstep(0.3 * noise, 0.5 * noise, dist);
}

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
    return base + (blend - 0.5);
}

vec3 applyGrain(vec3 color, vec2 uv, float time) {
    if (u_grainIntensity <= 0.0) {
        return color;
    }

    float grain = 0.0;
    if (u_grainType == 0) {
        grain = grainFilm(uv, time);
    } else if (u_grainType == 1) {
        grain = grainDigital(uv, time);
    } else if (u_grainType == 2) {
        grain = grainOrganic(uv, time);
    } else if (u_grainType == 3) {
        grain = grainAnimated(uv, time);
    } else if (u_grainType == 4) {
        grain = grainHalftone(uv, time);
    }

    grain = clamp(grain * u_grainContrast, 0.0, 1.0);
    vec3 grainColor = vec3(grain);

    vec3 blendedColor;
    if (u_grainBlendMode == 0) {
        blendedColor = blendOverlay(color, grainColor);
    } else if (u_grainBlendMode == 1) {
        blendedColor = blendMultiply(color, grainColor);
    } else if (u_grainBlendMode == 2) {
        blendedColor = blendScreen(color, grainColor);
    } else if (u_grainBlendMode == 3) {
        blendedColor = blendSoftLight(color, grainColor);
    } else {
        blendedColor = blendLinear(color, grainColor);
    }

    return mix(color, blendedColor, u_grainIntensity);
}

void main() {
    vec2 uv = vUv;
    vec2 p = uv * u_scale;
    
    // Animate the noise
    vec3 noiseInput = vec3(p, u_time * u_speed);
    
    // Generate layered noise
    float noise1 = fbm3D(noiseInput, u_octaves, u_lacunarity, u_persistence);
    float noise2 = fbm3D(noiseInput + vec3(100.0, 200.0, 300.0), u_octaves, u_lacunarity, u_persistence);
    
    // Combine noises for complexity
    float combined = (noise1 + noise2 * 0.5) * 0.5 + 0.5;
    
    // Add mouse interaction (if enabled)
    if (u_mouseInteractionEnabled > 0.5) {
        vec2 mouse = u_mouse / u_resolution;
        float mouseDist = distance(uv, mouse);
        combined += sin(mouseDist * 10.0 - u_time * 2.0) * 0.1;
    }
    
    // Generate color from gradient texture or fallback to procedural
    vec3 color = texture2D(u_gradientTexture, vec2(combined, 0.5)).rgb;
    if (color.r + color.g + color.b < 0.01) {
        color = proceduralGradient(combined, u_color1, u_color2, u_color3);
    }

    // Apply advanced grain effect
    color = applyGrain(color, uv, u_time);

    gl_FragColor = vec4(color, 1.0);
}
`;

export const vectorFlowShader = `
// Vector flow / curl noise shader
precision mediump float;

uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform vec3 u_color1;
uniform vec3 u_color2;
uniform vec3 u_color3;
uniform float u_speed;
uniform float u_scale;
uniform float u_flow_strength;
uniform int u_octaves;
uniform float u_lacunarity;
uniform float u_persistence;
uniform sampler2D u_gradientTexture;

// Grain uniforms
uniform float u_grainIntensity;
uniform float u_grainSize;
uniform float u_grainSpeed;
uniform float u_grainContrast;
uniform int u_grainType;
uniform int u_grainBlendMode;

// Mouse interaction control
uniform float u_mouseInteractionEnabled;

varying vec2 vUv;

${simplexNoise2D}
${simplexNoise3D}
${fbm}
${curlNoise}
${colorUtils}

// Grain functions (same as classic shader)
float grainRandom(vec2 st) { return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123); }
float grainRandomTime(vec2 st, float time) { return fract(sin(dot(st.xy + time, vec2(12.9898, 78.233))) * 43758.5453123); }

float grainFilm(vec2 uv, float time) {
    vec2 grainUV = uv * u_grainSize;
    float grain1 = grainRandomTime(floor(grainUV), time * u_grainSpeed);
    float grain2 = grainRandomTime(floor(grainUV + vec2(1.0, 0.0)), time * u_grainSpeed);
    float grain3 = grainRandomTime(floor(grainUV + vec2(0.0, 1.0)), time * u_grainSpeed);
    float grain4 = grainRandomTime(floor(grainUV + vec2(1.0, 1.0)), time * u_grainSpeed);
    vec2 f = fract(grainUV);
    float baseGrain = mix(mix(grain1, grain2, f.x), mix(grain3, grain4, f.x), f.y);
    float fineGrain = grainRandomTime(grainUV * 2.0, time * u_grainSpeed * 1.5) * 0.3;
    return pow(baseGrain * 0.7 + fineGrain, 0.8);
}

float grainDigital(vec2 uv, float time) {
    vec2 grainUV = uv * u_grainSize;
    float baseNoise = grainRandomTime(floor(grainUV), time * u_grainSpeed);
    float temporalNoise = grainRandomTime(vec2(time * u_grainSpeed * 10.0), 0.0) * 0.1;
    return floor((baseNoise + temporalNoise) * 8.0) / 8.0;
}

float grainOrganic(vec2 uv, float time) {
    vec2 grainUV = uv * u_grainSize;
    float grain = 0.0; float amplitude = 1.0;
    for (int i = 0; i < 3; i++) {
        grain += grainRandomTime(grainUV, time * u_grainSpeed) * amplitude;
        grainUV *= 2.0; amplitude *= 0.5;
    }
    return grain / 1.875;
}

float grainAnimated(vec2 uv, float time) {
    vec2 grainUV = uv * u_grainSize + sin(time * u_grainSpeed) * 0.1;
    float angle = time * u_grainSpeed * 0.5;
    mat2 rotation = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    grainUV = rotation * grainUV;
    return grainRandomTime(grainUV, time * u_grainSpeed);
}

float grainHalftone(vec2 uv, float time) {
    vec2 grainUV = uv * u_grainSize;
    vec2 center = floor(grainUV) + 0.5;
    float dist = length(grainUV - center);
    float noise = grainRandomTime(center, time * u_grainSpeed);
    return smoothstep(0.3 * noise, 0.5 * noise, dist);
}

vec3 blendOverlay(vec3 base, vec3 blend) { return mix(2.0 * base * blend, 1.0 - 2.0 * (1.0 - base) * (1.0 - blend), step(0.5, base)); }
vec3 blendMultiply(vec3 base, vec3 blend) { return base * blend; }
vec3 blendScreen(vec3 base, vec3 blend) { return 1.0 - (1.0 - base) * (1.0 - blend); }
vec3 blendSoftLight(vec3 base, vec3 blend) { vec3 result1 = 2.0 * base * blend + base * base * (1.0 - 2.0 * blend); vec3 result2 = sqrt(base) * (2.0 * blend - 1.0) + 2.0 * base * (1.0 - blend); return mix(result1, result2, step(0.5, blend)); }
vec3 blendLinear(vec3 base, vec3 blend) { return base + (blend - 0.5); }

vec3 applyGrain(vec3 color, vec2 uv, float time) {
    if (u_grainIntensity <= 0.0) return color;
    float grain = 0.0;
    if (u_grainType == 0) grain = grainFilm(uv, time);
    else if (u_grainType == 1) grain = grainDigital(uv, time);
    else if (u_grainType == 2) grain = grainOrganic(uv, time);
    else if (u_grainType == 3) grain = grainAnimated(uv, time);
    else if (u_grainType == 4) grain = grainHalftone(uv, time);
    grain = clamp(grain * u_grainContrast, 0.0, 1.0);
    vec3 grainColor = vec3(grain);
    vec3 blendedColor;
    if (u_grainBlendMode == 0) blendedColor = blendOverlay(color, grainColor);
    else if (u_grainBlendMode == 1) blendedColor = blendMultiply(color, grainColor);
    else if (u_grainBlendMode == 2) blendedColor = blendScreen(color, grainColor);
    else if (u_grainBlendMode == 3) blendedColor = blendSoftLight(color, grainColor);
    else blendedColor = blendLinear(color, grainColor);
    return mix(color, blendedColor, u_grainIntensity);
}

void main() {
    vec2 uv = vUv;
    vec2 p = uv * u_scale;
    
    // Generate vector field using curl noise
    vec3 noisePos = vec3(p, u_time * u_speed);
    // Use the correct curl noise function (previously referenced undefined curlNoise)
    vec3 flow = curlNoise3D(noisePos, 0.01) * u_flow_strength;
    
    // Distort sampling position with flow
    vec2 distortedP = p + flow.xy * 0.1;
    
    // Sample noise at distorted position
    float noise1 = fbm3D(vec3(distortedP, u_time * u_speed * 0.5), u_octaves, u_lacunarity, u_persistence);
    float noise2 = fbm3D(vec3(distortedP + vec2(100.0), u_time * u_speed * 0.3), u_octaves, u_lacunarity, u_persistence);
    
    // Create flowing patterns
    float combined = noise1 + noise2 * 0.5;
    combined = combined * 0.5 + 0.5;
    
    // Add flow visualization
    float flowMagnitude = length(flow.xy);
    combined += flowMagnitude * 0.2;
    
    // Mouse interaction with vector field (if enabled)
    if (u_mouseInteractionEnabled > 0.5) {
        vec2 mouse = u_mouse / u_resolution;
        vec2 mouseForce = (uv - mouse) * 2.0;
        float mouseInfluence = exp(-dot(mouseForce, mouseForce) * 5.0);
        combined += mouseInfluence * 0.3;
    }
    
    // Generate color from gradient texture or fallback to procedural
    vec3 color = texture2D(u_gradientTexture, vec2(combined, 0.5)).rgb;
    if (color.r + color.g + color.b < 0.01) {
        color = proceduralGradient(combined, u_color1, u_color2, u_color3);
    }
    
    // Add flow-based color shifts
    color += flow * 0.1;

    // Apply advanced grain effect
    color = applyGrain(color, uv, u_time);

    gl_FragColor = vec4(color, 1.0);
}
`;

export const turbulenceShader = `
// Domain-warped turbulence shader
precision mediump float;

uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform vec3 u_color1;
uniform vec3 u_color2;
uniform vec3 u_color3;
uniform float u_speed;
uniform float u_scale;
uniform float u_turbulence;
uniform int u_octaves;
uniform float u_lacunarity;
uniform float u_persistence;
uniform sampler2D u_gradientTexture;

// Grain uniforms
uniform float u_grainIntensity;
uniform float u_grainSize;
uniform float u_grainSpeed;
uniform float u_grainContrast;
uniform int u_grainType;
uniform int u_grainBlendMode;

// Mouse interaction control
uniform float u_mouseInteractionEnabled;

varying vec2 vUv;

${simplexNoise2D}
${simplexNoise3D}
${fbm}
${colorUtils}

// Compact grain system
float grainRandom(vec2 st) { return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123); }
float grainRandomTime(vec2 st, float time) { return fract(sin(dot(st.xy + time, vec2(12.9898, 78.233))) * 43758.5453123); }
float grainFilm(vec2 uv, float time) { vec2 grainUV = uv * u_grainSize; float grain1 = grainRandomTime(floor(grainUV), time * u_grainSpeed); float grain2 = grainRandomTime(floor(grainUV + vec2(1.0, 0.0)), time * u_grainSpeed); float grain3 = grainRandomTime(floor(grainUV + vec2(0.0, 1.0)), time * u_grainSpeed); float grain4 = grainRandomTime(floor(grainUV + vec2(1.0, 1.0)), time * u_grainSpeed); vec2 f = fract(grainUV); float baseGrain = mix(mix(grain1, grain2, f.x), mix(grain3, grain4, f.x), f.y); float fineGrain = grainRandomTime(grainUV * 2.0, time * u_grainSpeed * 1.5) * 0.3; return pow(baseGrain * 0.7 + fineGrain, 0.8); }
float grainDigital(vec2 uv, float time) { vec2 grainUV = uv * u_grainSize; float baseNoise = grainRandomTime(floor(grainUV), time * u_grainSpeed); float temporalNoise = grainRandomTime(vec2(time * u_grainSpeed * 10.0), 0.0) * 0.1; return floor((baseNoise + temporalNoise) * 8.0) / 8.0; }
float grainOrganic(vec2 uv, float time) { vec2 grainUV = uv * u_grainSize; float grain = 0.0; float amplitude = 1.0; for (int i = 0; i < 3; i++) { grain += grainRandomTime(grainUV, time * u_grainSpeed) * amplitude; grainUV *= 2.0; amplitude *= 0.5; } return grain / 1.875; }
float grainAnimated(vec2 uv, float time) { vec2 grainUV = uv * u_grainSize + sin(time * u_grainSpeed) * 0.1; float angle = time * u_grainSpeed * 0.5; mat2 rotation = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)); grainUV = rotation * grainUV; return grainRandomTime(grainUV, time * u_grainSpeed); }
float grainHalftone(vec2 uv, float time) { vec2 grainUV = uv * u_grainSize; vec2 center = floor(grainUV) + 0.5; float dist = length(grainUV - center); float noise = grainRandomTime(center, time * u_grainSpeed); return smoothstep(0.3 * noise, 0.5 * noise, dist); }
vec3 blendOverlay(vec3 base, vec3 blend) { return mix(2.0 * base * blend, 1.0 - 2.0 * (1.0 - base) * (1.0 - blend), step(0.5, base)); }
vec3 blendMultiply(vec3 base, vec3 blend) { return base * blend; }
vec3 blendScreen(vec3 base, vec3 blend) { return 1.0 - (1.0 - base) * (1.0 - blend); }
vec3 blendSoftLight(vec3 base, vec3 blend) { vec3 result1 = 2.0 * base * blend + base * base * (1.0 - 2.0 * blend); vec3 result2 = sqrt(base) * (2.0 * blend - 1.0) + 2.0 * base * (1.0 - blend); return mix(result1, result2, step(0.5, blend)); }
vec3 blendLinear(vec3 base, vec3 blend) { return base + (blend - 0.5); }
vec3 applyGrain(vec3 color, vec2 uv, float time) { if (u_grainIntensity <= 0.0) return color; float grain = 0.0; if (u_grainType == 0) grain = grainFilm(uv, time); else if (u_grainType == 1) grain = grainDigital(uv, time); else if (u_grainType == 2) grain = grainOrganic(uv, time); else if (u_grainType == 3) grain = grainAnimated(uv, time); else if (u_grainType == 4) grain = grainHalftone(uv, time); grain = clamp(grain * u_grainContrast, 0.0, 1.0); vec3 grainColor = vec3(grain); vec3 blendedColor; if (u_grainBlendMode == 0) blendedColor = blendOverlay(color, grainColor); else if (u_grainBlendMode == 1) blendedColor = blendMultiply(color, grainColor); else if (u_grainBlendMode == 2) blendedColor = blendScreen(color, grainColor); else if (u_grainBlendMode == 3) blendedColor = blendSoftLight(color, grainColor); else blendedColor = blendLinear(color, grainColor); return mix(color, blendedColor, u_grainIntensity); }

void main() {
    vec2 uv = vUv;
    vec2 p = uv * u_scale;
    
    // Domain warping for turbulence
    vec2 q = vec2(
        fbm3D(vec3(p, u_time * u_speed), u_octaves, u_lacunarity, u_persistence),
        fbm3D(vec3(p + vec2(5.2, 1.3), u_time * u_speed), u_octaves, u_lacunarity, u_persistence)
    );
    
    vec2 r = vec2(
        fbm3D(vec3(p + 4.0 * q + vec2(1.7, 9.2), u_time * u_speed * 0.5), u_octaves, u_lacunarity, u_persistence),
        fbm3D(vec3(p + 4.0 * q + vec2(8.3, 2.8), u_time * u_speed * 0.5), u_octaves, u_lacunarity, u_persistence)
    );
    
    // Final noise with domain warping
    float noise = fbm3D(vec3(p + u_turbulence * r, u_time * u_speed * 0.3), u_octaves, u_lacunarity, u_persistence);
    noise = noise * 0.5 + 0.5;
    
    // Add subtle mouse interaction (if enabled)
    if (u_mouseInteractionEnabled > 0.5) {
        vec2 mouse = u_mouse / u_resolution;
        float mouseDist = distance(uv, mouse);
        noise += sin(mouseDist * 8.0 - u_time * 3.0) * 0.05;
    }
    
    // Generate color from gradient texture or fallback to procedural
    vec3 color = texture2D(u_gradientTexture, vec2(noise, 0.5)).rgb;
    if (color.r + color.g + color.b < 0.01) {
        color = proceduralGradient(noise, u_color1, u_color2, u_color3);
    }
    
    // Add depth with secondary noise
    float depth = fbm3D(vec3(p * 0.5, u_time * u_speed * 0.1), 3, 2.0, 0.5) * 0.1;
    color = mix(color, color * 1.2, depth);

    // Apply advanced grain effect
    color = applyGrain(color, uv, u_time);

    gl_FragColor = vec4(color, 1.0);
}
`;

export const plasmaShader = `
// Classic plasma shader with noise modulation
precision mediump float;

uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform vec3 u_color1;
uniform vec3 u_color2;
uniform vec3 u_color3;
uniform float u_speed;
uniform float u_scale;
uniform float u_plasma_intensity;
uniform sampler2D u_gradientTexture;

// Grain uniforms
uniform float u_grainIntensity;
uniform float u_grainSize;
uniform float u_grainSpeed;
uniform float u_grainContrast;
uniform int u_grainType;
uniform int u_grainBlendMode;

// Mouse interaction control
uniform float u_mouseInteractionEnabled;

varying vec2 vUv;

${simplexNoise2D}
${simplexNoise3D}
${colorUtils}

// Compact grain system
float grainRandom(vec2 st) { return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123); }
float grainRandomTime(vec2 st, float time) { return fract(sin(dot(st.xy + time, vec2(12.9898, 78.233))) * 43758.5453123); }
float grainFilm(vec2 uv, float time) { vec2 grainUV = uv * u_grainSize; float grain1 = grainRandomTime(floor(grainUV), time * u_grainSpeed); float grain2 = grainRandomTime(floor(grainUV + vec2(1.0, 0.0)), time * u_grainSpeed); float grain3 = grainRandomTime(floor(grainUV + vec2(0.0, 1.0)), time * u_grainSpeed); float grain4 = grainRandomTime(floor(grainUV + vec2(1.0, 1.0)), time * u_grainSpeed); vec2 f = fract(grainUV); float baseGrain = mix(mix(grain1, grain2, f.x), mix(grain3, grain4, f.x), f.y); float fineGrain = grainRandomTime(grainUV * 2.0, time * u_grainSpeed * 1.5) * 0.3; return pow(baseGrain * 0.7 + fineGrain, 0.8); }
float grainDigital(vec2 uv, float time) { vec2 grainUV = uv * u_grainSize; float baseNoise = grainRandomTime(floor(grainUV), time * u_grainSpeed); float temporalNoise = grainRandomTime(vec2(time * u_grainSpeed * 10.0), 0.0) * 0.1; return floor((baseNoise + temporalNoise) * 8.0) / 8.0; }
float grainOrganic(vec2 uv, float time) { vec2 grainUV = uv * u_grainSize; float grain = 0.0; float amplitude = 1.0; for (int i = 0; i < 3; i++) { grain += grainRandomTime(grainUV, time * u_grainSpeed) * amplitude; grainUV *= 2.0; amplitude *= 0.5; } return grain / 1.875; }
float grainAnimated(vec2 uv, float time) { vec2 grainUV = uv * u_grainSize + sin(time * u_grainSpeed) * 0.1; float angle = time * u_grainSpeed * 0.5; mat2 rotation = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)); grainUV = rotation * grainUV; return grainRandomTime(grainUV, time * u_grainSpeed); }
float grainHalftone(vec2 uv, float time) { vec2 grainUV = uv * u_grainSize; vec2 center = floor(grainUV) + 0.5; float dist = length(grainUV - center); float noise = grainRandomTime(center, time * u_grainSpeed); return smoothstep(0.3 * noise, 0.5 * noise, dist); }
vec3 blendOverlay(vec3 base, vec3 blend) { return mix(2.0 * base * blend, 1.0 - 2.0 * (1.0 - base) * (1.0 - blend), step(0.5, base)); }
vec3 blendMultiply(vec3 base, vec3 blend) { return base * blend; }
vec3 blendScreen(vec3 base, vec3 blend) { return 1.0 - (1.0 - base) * (1.0 - blend); }
vec3 blendSoftLight(vec3 base, vec3 blend) { vec3 result1 = 2.0 * base * blend + base * base * (1.0 - 2.0 * blend); vec3 result2 = sqrt(base) * (2.0 * blend - 1.0) + 2.0 * base * (1.0 - blend); return mix(result1, result2, step(0.5, blend)); }
vec3 blendLinear(vec3 base, vec3 blend) { return base + (blend - 0.5); }
vec3 applyGrain(vec3 color, vec2 uv, float time) { if (u_grainIntensity <= 0.0) return color; float grain = 0.0; if (u_grainType == 0) grain = grainFilm(uv, time); else if (u_grainType == 1) grain = grainDigital(uv, time); else if (u_grainType == 2) grain = grainOrganic(uv, time); else if (u_grainType == 3) grain = grainAnimated(uv, time); else if (u_grainType == 4) grain = grainHalftone(uv, time); grain = clamp(grain * u_grainContrast, 0.0, 1.0); vec3 grainColor = vec3(grain); vec3 blendedColor; if (u_grainBlendMode == 0) blendedColor = blendOverlay(color, grainColor); else if (u_grainBlendMode == 1) blendedColor = blendMultiply(color, grainColor); else if (u_grainBlendMode == 2) blendedColor = blendScreen(color, grainColor); else if (u_grainBlendMode == 3) blendedColor = blendSoftLight(color, grainColor); else blendedColor = blendLinear(color, grainColor); return mix(color, blendedColor, u_grainIntensity); }

void main() {
    vec2 uv = vUv;
    vec2 p = uv * u_scale;
    
    float time = u_time * u_speed;
    
    // Multiple sine waves for plasma effect
    float plasma = sin(p.x * 2.0 + time);
    plasma += sin(p.y * 3.0 + time * 1.5);
    plasma += sin((p.x + p.y) * 1.5 + time * 0.5);
    plasma += sin(sqrt(p.x * p.x + p.y * p.y) * 4.0 + time * 2.0);
    
    // Add noise for organic feel
    float noise = snoise3D(vec3(p * 2.0, time * 0.3)) * 0.5;
    plasma += noise;
    
    // Normalize and add intensity
    plasma = (plasma + 4.0) / 8.0;
    plasma = pow(plasma, u_plasma_intensity);
    
    // Mouse interaction (if enabled)
    if (u_mouseInteractionEnabled > 0.5) {
        vec2 mouse = u_mouse / u_resolution;
        float mouseDist = distance(uv, mouse);
        plasma += sin(mouseDist * 15.0 - time * 4.0) * 0.1;
    }
    
    // Generate color from gradient texture or fallback to procedural
    vec3 color = texture2D(u_gradientTexture, vec2(plasma, 0.5)).rgb;
    if (color.r + color.g + color.b < 0.01) {
        color = proceduralGradient(plasma, u_color1, u_color2, u_color3);
    }
    
    // Add glow effect
    float glow = 1.0 - smoothstep(0.0, 0.8, plasma);
    color += glow * u_color2 * 0.3;

    // Apply advanced grain effect
    color = applyGrain(color, uv, u_time);

    gl_FragColor = vec4(color, 1.0);
}
`;

export const vertexShader = `
varying vec2 vUv;

void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;