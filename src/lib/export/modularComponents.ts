// Modular shader components for smart export system
// Each component can be selectively included based on actual usage

// Base precision and permutation (always needed for noise)
export const basePrecision = `
precision mediump float;
`;

export const basePermutation = `
// Optimized permutation functions
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
`;

// Modular noise components
export const noise2D = `
// 2D Simplex Noise
float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i.xy);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m; m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}
`;

export const noise3D = `
// 3D Simplex Noise
float snoise3D(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m; m = m * m;
    return 42.0 * dot(m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
`;

export const fbmFunctions = `
// Fractal Brownian Motion
float fbm(vec2 p, int octaves, float lacunarity, float persistence) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    float maxValue = 0.0;
    for (int i = 0; i < 8; i++) {
        if (i >= octaves) break;
        value += amplitude * snoise(p * frequency);
        maxValue += amplitude;
        frequency *= lacunarity;
        amplitude *= persistence;
    }
    return value / maxValue;
}

float fbm3D(vec3 p, int octaves, float lacunarity, float persistence) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    float maxValue = 0.0;
    for (int i = 0; i < 8; i++) {
        if (i >= octaves) break;
        value += amplitude * snoise3D(p * frequency);
        maxValue += amplitude;
        frequency *= lacunarity;
        amplitude *= persistence;
    }
    return value / maxValue;
}
`;

export const curlNoiseFunctions = `
// Curl Noise for vector fields
vec3 curlNoise3D(vec3 p, float epsilon) {
    vec3 offsetA = vec3(123.4, 567.8, 901.2);
    vec3 offsetB = vec3(345.6, 789.0, 123.4);
    vec3 offsetC = vec3(567.8, 901.2, 345.6);
    
    float Fx_y1 = snoise3D(vec3(p.x, p.y + epsilon, p.z) + offsetA);
    float Fx_y2 = snoise3D(vec3(p.x, p.y - epsilon, p.z) + offsetA);
    float dFx_dy = (Fx_y1 - Fx_y2) / (2.0 * epsilon);
    
    float Fx_z1 = snoise3D(vec3(p.x, p.y, p.z + epsilon) + offsetA);
    float Fx_z2 = snoise3D(vec3(p.x, p.y, p.z - epsilon) + offsetA);
    float dFx_dz = (Fx_z1 - Fx_z2) / (2.0 * epsilon);
    
    float Fy_x1 = snoise3D(vec3(p.x + epsilon, p.y, p.z) + offsetB);
    float Fy_x2 = snoise3D(vec3(p.x - epsilon, p.y, p.z) + offsetB);
    float dFy_dx = (Fy_x1 - Fy_x2) / (2.0 * epsilon);
    
    float Fy_z1 = snoise3D(vec3(p.x, p.y, p.z + epsilon) + offsetB);
    float Fy_z2 = snoise3D(vec3(p.x, p.y, p.z - epsilon) + offsetB);
    float dFy_dz = (Fy_z1 - Fy_z2) / (2.0 * epsilon);
    
    float Fz_x1 = snoise3D(vec3(p.x + epsilon, p.y, p.z) + offsetC);
    float Fz_x2 = snoise3D(vec3(p.x - epsilon, p.y, p.z) + offsetC);
    float dFz_dx = (Fz_x1 - Fz_x2) / (2.0 * epsilon);
    
    float Fz_y1 = snoise3D(vec3(p.x, p.y + epsilon, p.z) + offsetC);
    float Fz_y2 = snoise3D(vec3(p.x, p.y - epsilon, p.z) + offsetC);
    float dFz_dy = (Fz_y1 - Fz_y2) / (2.0 * epsilon);
    
    return vec3(dFz_dy - dFy_dz, dFx_dz - dFz_dx, dFy_dx - dFx_dy);
}

vec2 curlNoise2D(vec2 p, float time, float epsilon) {
    vec3 curl3D = curlNoise3D(vec3(p, time), epsilon);
    return curl3D.xy;
}
`;

export const hsvConversion = `
// HSV to RGB conversion
vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

vec3 rgb2hsv(vec3 c) {
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}
`;

export const proceduralGradient = `
// Procedural gradient generation
vec3 proceduralGradient(float t, vec3 color1, vec3 color2, vec3 color3) {
    t = clamp(t, 0.0, 1.0);
    if (t < 0.5) {
        return mix(color1, color2, t * 2.0);
    } else {
        return mix(color2, color3, (t - 0.5) * 2.0);
    }
}
`;

export const colorBlending = `
// Color blending functions
vec3 blendMultiply(vec3 base, vec3 blend) { return base * blend; }
vec3 blendScreen(vec3 base, vec3 blend) { return 1.0 - (1.0 - base) * (1.0 - blend); }
vec3 blendSoftLight(vec3 base, vec3 blend) {
    return mix(2.0 * base * blend + base * base * (1.0 - 2.0 * blend),
               sqrt(base) * (2.0 * blend - 1.0) + 2.0 * base * (1.0 - blend),
               step(0.5, blend));
}
`;

export const mouseInteraction = `
// Mouse interaction utilities
float getMouseInfluence(vec2 uv, vec2 mouse, float radius) {
    float dist = distance(uv, mouse);
    return 1.0 - smoothstep(0.0, radius, dist);
}
`;

export const advancedMath = `
// Advanced mathematical functions
float smoothMin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}

float smoothMax(float a, float b, float k) {
    return -smoothMin(-a, -b, k);
}
`;

export const domainWarping = `
// Domain warping functions
vec2 warp2D(vec2 p, float strength) {
    return p + strength * vec2(
        snoise(p + vec2(123.4, 567.8)),
        snoise(p + vec2(890.1, 234.5))
    );
}

vec3 warp3D(vec3 p, float strength) {
    return p + strength * vec3(
        snoise3D(p + vec3(123.4, 567.8, 901.2)),
        snoise3D(p + vec3(345.6, 789.0, 123.4)),
        snoise3D(p + vec3(567.8, 901.2, 345.6))
    );
}
`;

// Grain system components
export const grainBase = `
// Base grain functions
float grainRandom(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

float grainRandomTime(vec2 st, float time) {
    return fract(sin(dot(st.xy + time, vec2(12.9898, 78.233))) * 43758.5453123);
}
`;

export const grainTypes = {
    film: `
float grainFilm(vec2 uv, float time) {
    vec2 grainUV = uv * 100.0;
    float grain1 = grainRandomTime(floor(grainUV), time * 1.0);
    float grain2 = grainRandomTime(floor(grainUV + vec2(1.0, 0.0)), time * 1.0);
    float grain3 = grainRandomTime(floor(grainUV + vec2(0.0, 1.0)), time * 1.0);
    float grain4 = grainRandomTime(floor(grainUV + vec2(1.0, 1.0)), time * 1.0);
    vec2 f = fract(grainUV);
    float baseGrain = mix(mix(grain1, grain2, f.x), mix(grain3, grain4, f.x), f.y);
    float fineGrain = grainRandomTime(grainUV * 2.0, time * 1.0 * 1.5) * 0.3;
    return pow(baseGrain * 0.7 + fineGrain, 0.8);
}`,

    digital: `
float grainDigital(vec2 uv, float time) {
    vec2 grainUV = uv * 100.0;
    float baseNoise = grainRandomTime(floor(grainUV), time * 1.0);
    float temporalNoise = grainRandomTime(vec2(time * 1.0 * 10.0), 0.0) * 0.1;
    return floor((baseNoise + temporalNoise) * 8.0) / 8.0;
}`,

    organic: `
float grainOrganic(vec2 uv, float time) {
    vec2 grainUV = uv * 100.0;
    float grain = 0.0;
    float amplitude = 1.0;
    for (int i = 0; i < 3; i++) {
        grain += grainRandomTime(grainUV, time * 1.0) * amplitude;
        grainUV *= 2.0;
        amplitude *= 0.5;
    }
    return grain / 1.875;
}`,

    animated: `
float grainAnimated(vec2 uv, float time) {
    vec2 grainUV = uv * 100.0 + sin(time * 1.0) * 0.1;
    float angle = time * 1.0 * 0.5;
    mat2 rotation = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    grainUV = rotation * grainUV;
    return grainRandomTime(grainUV, time * 1.0);
}`,

    halftone: `
float grainHalftone(vec2 uv, float time) {
    vec2 grainUV = uv * 100.0;
    vec2 center = floor(grainUV) + 0.5;
    float dist = length(grainUV - center);
    float noise = grainRandomTime(center, time * 1.0);
    return smoothstep(0.3 * noise, 0.5 * noise, dist);
}`
};

export const blendModes = {
    overlay: `vec3 blendOverlay(vec3 base, vec3 blend) {
    return mix(2.0 * base * blend, 1.0 - 2.0 * (1.0 - base) * (1.0 - blend), step(0.5, base));
  }`,

    multiply: `vec3 blendMultiply(vec3 base, vec3 blend) { return base * blend; }`,

    screen: `vec3 blendScreen(vec3 base, vec3 blend) {
    return 1.0 - (1.0 - base) * (1.0 - blend);
  }`,

    softLight: `vec3 blendSoftLight(vec3 base, vec3 blend) {
    vec3 result1 = 2.0 * base * blend + base * base * (1.0 - 2.0 * blend);
    vec3 result2 = sqrt(base) * (2.0 * blend - 1.0) + 2.0 * base * (1.0 - blend);
    return mix(result1, result2, step(0.5, blend));
  }`,

    linear: `vec3 blendLinear(vec3 base, vec3 blend) { return base + (blend - 0.5); }`
};
