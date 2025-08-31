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

varying vec2 vUv;

${simplexNoise3D}

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
    
    // Add mouse influence for fluid interaction
    float mouseInfluence = 1.0 - length(uv - mouse);
    mouseInfluence = smoothstep(0.0, 0.3, mouseInfluence);
    velocity += (uv - mouse) * mouseInfluence * u_pressure;
    
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

varying vec2 vUv;

${simplexNoise3D}

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
    
    // Add mouse interaction glow
    float mouseInfluence = 1.0 - length(uv - mouse);
    mouseInfluence = smoothstep(0.0, 0.4, mouseInfluence);
    color += vec3(mouseInfluence * 0.5);
    
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

varying vec2 vUv;

${simplexNoise3D}

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
    
    // Add rotation
    angle += u_rotation + u_time * u_speed * 0.5;
    
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

varying vec2 vUv;

${simplexNoise2D}
${simplexNoise3D}
${fbm}
${colorUtils}

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
    
    // Add mouse interaction
    vec2 mouse = u_mouse / u_resolution;
    float mouseDist = distance(uv, mouse);
    combined += sin(mouseDist * 10.0 - u_time * 2.0) * 0.1;
    
    // Generate color from gradient texture or fallback to procedural
    vec3 color = texture2D(u_gradientTexture, vec2(combined, 0.5)).rgb;
    if (color.r + color.g + color.b < 0.01) {
        color = proceduralGradient(combined, u_color1, u_color2, u_color3);
    }
    
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

varying vec2 vUv;

${simplexNoise2D}
${simplexNoise3D}
${fbm}
${curlNoise}
${colorUtils}

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
    
    // Mouse interaction with vector field
    vec2 mouse = u_mouse / u_resolution;
    vec2 mouseForce = (uv - mouse) * 2.0;
    float mouseInfluence = exp(-dot(mouseForce, mouseForce) * 5.0);
    combined += mouseInfluence * 0.3;
    
    // Generate color from gradient texture or fallback to procedural
    vec3 color = texture2D(u_gradientTexture, vec2(combined, 0.5)).rgb;
    if (color.r + color.g + color.b < 0.01) {
        color = proceduralGradient(combined, u_color1, u_color2, u_color3);
    }
    
    // Add flow-based color shifts
    color += flow * 0.1;
    
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

varying vec2 vUv;

${simplexNoise2D}
${simplexNoise3D}
${fbm}
${colorUtils}

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
    
    // Add subtle mouse interaction
    vec2 mouse = u_mouse / u_resolution;
    float mouseDist = distance(uv, mouse);
    noise += sin(mouseDist * 8.0 - u_time * 3.0) * 0.05;
    
    // Generate color from gradient texture or fallback to procedural
    vec3 color = texture2D(u_gradientTexture, vec2(noise, 0.5)).rgb;
    if (color.r + color.g + color.b < 0.01) {
        color = proceduralGradient(noise, u_color1, u_color2, u_color3);
    }
    
    // Add depth with secondary noise
    float depth = fbm3D(vec3(p * 0.5, u_time * u_speed * 0.1), 3, 2.0, 0.5) * 0.1;
    color = mix(color, color * 1.2, depth);
    
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

varying vec2 vUv;

${simplexNoise2D}
${simplexNoise3D}
${colorUtils}

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
    
    // Mouse interaction
    vec2 mouse = u_mouse / u_resolution;
    float mouseDist = distance(uv, mouse);
    plasma += sin(mouseDist * 15.0 - time * 4.0) * 0.1;
    
    // Generate color from gradient texture or fallback to procedural
    vec3 color = texture2D(u_gradientTexture, vec2(plasma, 0.5)).rgb;
    if (color.r + color.g + color.b < 0.01) {
        color = proceduralGradient(plasma, u_color1, u_color2, u_color3);
    }
    
    // Add glow effect
    float glow = 1.0 - smoothstep(0.0, 0.8, plasma);
    color += glow * u_color2 * 0.3;
    
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