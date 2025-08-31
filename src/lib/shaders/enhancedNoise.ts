// Enhanced noise library with proper 3D curl noise, bitangent noise, and domain warping

import {
    simplexNoise2D,
    simplexNoise3D,
    fbm,
    colorUtils
} from './noise';

// Precision qualifiers for adaptive quality
export const precisionConfig = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
#else
    precision mediump float;
#endif
`;

// Optimized permutation functions - using shared include guards
export const optimizedPermute = `
#ifndef PERMUTE_INCLUDED
#define PERMUTE_INCLUDED
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
#endif
`;

// Enhanced 3D Curl Noise - Proper implementation
export const curlNoise3D = `
${simplexNoise3D}

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

// Bitangent noise - More efficient divergence-free alternative
export const bitangentNoise = `
${simplexNoise3D}

// Bitangent noise - Computationally efficient alternative to curl noise
vec3 bitangentNoise3D(vec3 p, float epsilon) {
    // Two independent scalar fields with different offsets
    vec3 offsetA = vec3(123.45, 678.9, -456.1);
    vec3 offsetB = vec3(-789.2, 345.6, 901.2);
    
    // Calculate gradients of field A
    vec3 gradA = vec3(
        (snoise3D(vec3(p.x + epsilon, p.y, p.z) + offsetA) - 
         snoise3D(vec3(p.x - epsilon, p.y, p.z) + offsetA)) / (2.0 * epsilon),
        (snoise3D(vec3(p.x, p.y + epsilon, p.z) + offsetA) - 
         snoise3D(vec3(p.x, p.y - epsilon, p.z) + offsetA)) / (2.0 * epsilon),
        (snoise3D(vec3(p.x, p.y, p.z + epsilon) + offsetA) - 
         snoise3D(vec3(p.x, p.y, p.z - epsilon) + offsetA)) / (2.0 * epsilon)
    );
    
    // Calculate gradients of field B
    vec3 gradB = vec3(
        (snoise3D(vec3(p.x + epsilon, p.y, p.z) + offsetB) - 
         snoise3D(vec3(p.x - epsilon, p.y, p.z) + offsetB)) / (2.0 * epsilon),
        (snoise3D(vec3(p.x, p.y + epsilon, p.z) + offsetB) - 
         snoise3D(vec3(p.x, p.y - epsilon, p.z) + offsetB)) / (2.0 * epsilon),
        (snoise3D(vec3(p.x, p.y, p.z + epsilon) + offsetB) - 
         snoise3D(vec3(p.x, p.y, p.z - epsilon) + offsetB)) / (2.0 * epsilon)
    );
    
    // Cross product is automatically divergence-free
    return cross(gradA, gradB);
}

// 2D version for performance-critical applications
vec2 bitangentNoise2D(vec2 p, float time, float epsilon) {
    vec3 result3D = bitangentNoise3D(vec3(p, time), epsilon);
    return result3D.xy;
}
`;

// Domain warping functions for enhanced complexity
export const domainWarping = `
${simplexNoise2D}
${simplexNoise3D}

// Single-layer domain warping
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

// Multi-layer recursive warping for complex organic patterns
vec2 recursiveWarp2D(vec2 p, int iterations, float strength) {
    vec2 pos = p;
    float currentStrength = strength;
    
    for (int i = 0; i < 4; i++) {
        if (i >= iterations) break;
        pos = warp2D(pos, currentStrength);
        currentStrength *= 0.5;
    }
    
    return pos;
}

// Vortex warping for swirling patterns
vec2 vortexWarp(vec2 p, vec2 center, float strength, float falloff) {
    vec2 offset = p - center;
    float distance = length(offset);
    float angle = atan(offset.y, offset.x);
    
    // Apply vortex transformation with falloff
    float vortexStrength = strength * exp(-distance * falloff);
    angle += vortexStrength;
    
    return center + distance * vec2(cos(angle), sin(angle));
}

// Turbulent domain warping
vec2 turbulentWarp(vec2 p, float strength, int octaves) {
    vec2 warp = vec2(0.0);
    float amplitude = 1.0;
    float frequency = 1.0;
    
    for (int i = 0; i < 6; i++) {
        if (i >= octaves) break;
        warp += amplitude * vec2(
            snoise(p * frequency + vec2(123.4, 567.8)),
            snoise(p * frequency + vec2(890.1, 234.5))
        );
        frequency *= 2.0;
        amplitude *= 0.5;
    }
    
    return p + strength * warp;
}
`;

// Quality presets and adaptive functions
export const qualityPresets = `
// Quality presets for adaptive performance
#define QUALITY_LOW 0
#define QUALITY_MEDIUM 1  
#define QUALITY_HIGH 2
#define QUALITY_ULTRA 3

// Adaptive quality functions using branchless GPU-friendly code
int getAdaptiveOctaves(int quality) {
    // Use step functions instead of branches
    float q = float(quality);
    return int(2.0 + step(1.0, q) * 2.0 + step(2.0, q) * 2.0 + step(3.0, q) * 2.0);
}

float getAdaptiveEpsilon(int quality) {
    float q = float(quality);
    return mix(
        mix(0.01, 0.005, step(1.0, q)),
        mix(0.002, 0.001, step(3.0, q)),
        step(2.0, q)
    );
}

// Branchless quality selection
float adaptiveDetail(float base, int quality) {
    float q = float(quality);
    float multiplier = 0.5 + 
                      step(1.0, q) * 0.25 + 
                      step(2.0, q) * 0.25 + 
                      step(3.0, q) * 0.25;
    return base * multiplier;
}
`;

// Utility functions for noise manipulation
export const noiseUtils = `
// Smooth fade curves (C1 and C2 continuous)
float fadeIn(float t) {
    return t * t * (3.0 - 2.0 * t); // Smoothstep (C1 continuous)
}

float fadeInOut(float t) {
    return t * t * t * (t * (t * 6.0 - 15.0) + 10.0); // Smootherstep (C2 continuous)
}

// Noise value remapping utilities (branchless)
float remap(float value, float inputMin, float inputMax, float outputMin, float outputMax) {
    return outputMin + (outputMax - outputMin) * 
           clamp((value - inputMin) / (inputMax - inputMin), 0.0, 1.0);
}

// Bias and gain functions for artistic control
float bias(float value, float bias) {
    return value / ((1.0 / max(bias, 0.001) - 2.0) * (1.0 - value) + 1.0);
}

float gain(float value, float gain) {
    return value < 0.5 ? 
           bias(value * 2.0, gain) * 0.5 : 
           bias(value * 2.0 - 1.0, 1.0 - gain) * 0.5 + 0.5;
}

// Turbulence functions using absolute value
float turbulence2D(vec2 p, int octaves) {
    float value = 0.0;
    float amplitude = 1.0;
    float frequency = 1.0;
    float maxValue = 0.0;
    
    for (int i = 0; i < 8; i++) {
        if (i >= octaves) break;
        value += abs(snoise(p * frequency)) * amplitude;
        maxValue += amplitude;
        frequency *= 2.0;
        amplitude *= 0.5;
    }
    
    return value / maxValue;
}

// Ridged turbulence for mountain-like patterns
float ridgedTurbulence(vec2 p, int octaves) {
    float value = 0.0;
    float amplitude = 1.0;
    float frequency = 1.0;
    float maxValue = 0.0;
    
    for (int i = 0; i < 8; i++) {
        if (i >= octaves) break;
        float n = abs(snoise(p * frequency));
        n = 1.0 - n; // Invert
        n = n * n; // Square for sharper ridges
        value += n * amplitude;
        maxValue += amplitude;
        frequency *= 2.0;
        amplitude *= 0.5;
    }
    
    return value / maxValue;
}
`;

// Complete enhanced noise system
export const enhancedNoiseSystem = `
${precisionConfig}
${optimizedPermute}
${simplexNoise2D}
${simplexNoise3D}
${fbm}
${curlNoise3D}
${bitangentNoise}
${domainWarping}
${qualityPresets}
${noiseUtils}
${colorUtils}
`;