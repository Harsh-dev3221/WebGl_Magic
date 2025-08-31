// Enhanced GLSL noise functions with precision optimization for procedural generation

// Precision qualifiers for adaptive quality
export const precisionConfig = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
#else
    precision mediump float;
#endif
`;

// Optimized permutation using computed polynomials (no texture lookup)
export const optimizedPermute = `
#ifndef PERMUTE_INCLUDED
#define PERMUTE_INCLUDED
// Optimized permutation and modulus helpers (included once)
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
#endif
`;

export const simplexNoise2D = `
#ifndef SIMPLEX_2D_INCLUDED
#define SIMPLEX_2D_INCLUDED
${optimizedPermute}

float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187,  // (3.0-sqrt(3.0))/6.0
                        0.366025403784439,  // 0.5*(sqrt(3.0)-1.0)
                       -0.577350269189626,  // -1.0 + 2.0 * C.x
                        0.024390243902439); // 1.0 / 41.0

    // First corner
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);

    // Other corners
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;

    // Permutations
    i = mod289(i.xy);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
                    + i.x + vec3(0.0, i1.x, 1.0 ));

    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m;
    m = m*m;

    // Gradients: 41 points uniformly over a line, mapped onto a diamond.
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;

    // Normalise gradients implicitly by scaling m
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );

    // Compute final noise value at P
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}
#endif
`;

export const simplexNoise3D = `
#ifndef SIMPLEX_3D_INCLUDED
#define SIMPLEX_3D_INCLUDED
${optimizedPermute}

float snoise3D(vec3 v) {
    const vec2  C = vec2(1.0/6.0, 1.0/3.0);
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

    // First corner
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    // Other corners
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    // Permutations
    i = mod289(i);
    vec4 p = permute( permute( permute(
                i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

    // Gradients: 7x7 points over a square, mapped onto an octahedron.
    mediump float n_ = 0.142857142857; // 1.0/7.0
    vec3  ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );

    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);

    // Normalise gradients
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    // Mix final noise value
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
}
#endif
`;

export const fbm = `
// Enhanced Fractal Brownian Motion with adaptive quality
float fbm(vec2 p, int octaves, float lacunarity, float persistence) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    float maxValue = 0.0; // Used for normalizing result
    
    for (int i = 0; i < 8; i++) {
        if (i >= octaves) break;
        value += amplitude * snoise(p * frequency);
        maxValue += amplitude;
        frequency *= lacunarity;
        amplitude *= persistence;
    }
    return value / maxValue; // Normalize to [-1, 1] range
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

// Ridged noise for mountainous patterns
float ridgedNoise(vec2 p, int octaves, float lacunarity, float persistence) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    float maxValue = 0.0;
    
    for (int i = 0; i < 8; i++) {
        if (i >= octaves) break;
        float n = abs(snoise(p * frequency));
        n = 1.0 - n; // Invert for ridges
        n = n * n; // Square for sharper ridges
        value += amplitude * n;
        maxValue += amplitude;
        frequency *= lacunarity;
        amplitude *= persistence;
    }
    return value / maxValue;
}
`;

export const curlNoise = `
// Proper 3D Curl noise implementation for divergence-free vector fields
vec3 curlNoise3D(vec3 p, float epsilon) {
    // Calculate partial derivatives using finite differences
    // For proper curl, we need: curl(F) = (∂Fz/∂y - ∂Fy/∂z, ∂Fx/∂z - ∂Fz/∂x, ∂Fy/∂x - ∂Fx/∂y)
    
    // Generate vector potential from three offset noise fields
    vec3 offsetA = vec3(123.45, 678.9, -456.1);
    vec3 offsetB = vec3(-789.2, 345.6, 901.2);
    vec3 offsetC = vec3(234.56, -567.8, 890.1);
    
    // Calculate components of vector potential F = (Fx, Fy, Fz)
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
    
    // Compute curl components
    return vec3(
        dFz_dy - dFy_dz,  // x component: ∂Fz/∂y - ∂Fy/∂z
        dFx_dz - dFz_dx,  // y component: ∂Fx/∂z - ∂Fz/∂x
        dFy_dx - dFx_dy   // z component: ∂Fy/∂x - ∂Fx/∂y
    );
}

// 2D projection for background effects
vec2 curlNoise2D(vec2 p, float time, float epsilon) {
    vec3 curl3D = curlNoise3D(vec3(p, time), epsilon);
    return curl3D.xy;
}
`;

export const colorUtils = `
// Enhanced color utilities with multiple color space support

// HSV to RGB conversion (optimized)
vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

// RGB to HSV conversion
vec3 rgb2hsv(vec3 c) {
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
    
    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

// LAB color space approximation for perceptually uniform interpolation
vec3 rgb2lab_approx(vec3 rgb) {
    // Simplified LAB conversion for performance
    vec3 xyz = vec3(
        dot(rgb, vec3(0.4124, 0.3576, 0.1805)),
        dot(rgb, vec3(0.2126, 0.7152, 0.0722)),
        dot(rgb, vec3(0.0193, 0.1192, 0.9505))
    );
    
    xyz = mix(pow(xyz, vec3(1.0/3.0)), xyz * 7.787 + 0.137931, step(xyz, vec3(0.008856)));
    
    return vec3(
        116.0 * xyz.y - 16.0,
        500.0 * (xyz.x - xyz.y),
        200.0 * (xyz.y - xyz.z)
    );
}

// Branchless smooth color mixing using step functions
vec3 colorMix(vec3 colorA, vec3 colorB, vec3 colorC, float t) {
    // Use smoothstep for better transitions
    t = smoothstep(0.0, 1.0, t);
    
    // Branchless mixing using step functions
    vec3 ab = mix(colorA, colorB, clamp(t * 2.0, 0.0, 1.0));
    vec3 bc = mix(colorB, colorC, clamp((t - 0.5) * 2.0, 0.0, 1.0));
    
    return mix(ab, bc, step(0.5, t));
}

// Enhanced procedural gradient with color harmony
vec3 proceduralGradient(float t, vec3 color1, vec3 color2, vec3 color3) {
    t = smoothstep(0.0, 1.0, t);
    
    // Use smoother interpolation curves
    float curve1 = smoothstep(0.0, 0.5, t);
    float curve2 = smoothstep(0.3, 0.7, t);
    float curve3 = smoothstep(0.5, 1.0, t);
    
    vec3 mix1 = mix(color1, color2, curve1);
    vec3 mix2 = mix(color2, color3, curve2);
    
    return mix(mix1, mix2, curve3);
}

// Color temperature adjustment
vec3 adjustTemperature(vec3 color, float temperature) {
    // Simplified color temperature (warm/cool adjustment)
    vec3 warm = color * vec3(1.0, 0.9, 0.7);
    vec3 cool = color * vec3(0.7, 0.9, 1.0);
    return mix(cool, warm, clamp(temperature, 0.0, 1.0));
}

// Saturation adjustment
vec3 adjustSaturation(vec3 color, float saturation) {
    float luminance = dot(color, vec3(0.299, 0.587, 0.114));
    return mix(vec3(luminance), color, saturation);
}
`;
