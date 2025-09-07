// Export utilities for saving and loading shader configurations
import { GradientConfig } from './color/gradients';
import { ShaderType } from './shaderSystem';
import { generateSmartHTML } from './export/smartHTMLExport';
import { generateOptimizationReport } from './export/smartExport';
import {
    classicGradientShader,
    vectorFlowShader,
    turbulenceShader,
    plasmaShader,
    fluidShader,
    particleShader,
    kaleidoscopeShader
} from './shaders/fragmentShaders';

export interface ShaderExportData {
    // Metadata
    name: string;
    description: string;
    version: string;
    timestamp: string;

    // Shader Configuration
    shaderType: ShaderType;

    // Animation Parameters
    speed: number;
    scale: number;
    isPlaying: boolean;

    // Noise Parameters (for applicable shaders)
    octaves: number;
    lacunarity: number;
    persistence: number;

    // Shader-specific Parameters
    shaderParams: {
        // Core animation parameters
        speed?: number;
        scale?: number;
        octaves?: number;
        lacunarity?: number;
        persistence?: number;

        // Shader-specific parameters
        flowStrength?: number;      // vector
        turbulence?: number;        // turbulence
        plasmaIntensity?: number;   // plasma
        viscosity?: number;         // fluid
        pressure?: number;          // fluid
        particleCount?: number;     // particle
        particleSize?: number;      // particle
        segments?: number;          // kaleidoscope
        rotation?: number;          // kaleidoscope

        // Fluid Interactive parameters
        brushSize?: number;         // fluidInteractive
        brushStrength?: number;     // fluidInteractive
        distortionAmount?: number;  // fluidInteractive
        fluidDecay?: number;        // fluidInteractive
        trailLength?: number;       // fluidInteractive
        stopDecay?: number;         // fluidInteractive
        colorIntensity?: number;    // fluidInteractive
        softness?: number;          // fluidInteractive

        // Grain parameters - CRITICAL FOR SMART EXPORT
        grainIntensity?: number;
        grainSize?: number;
        grainSpeed?: number;
        grainContrast?: number;
        grainType?: number;
        grainBlendMode?: number;

        // Mouse interaction
        mouseInteractionEnabled?: boolean;
    };

    // Gradient Configuration
    gradient: GradientConfig;

    // Generated Code (for developer reference)
    generatedCode: {
        fragmentShader: string;
        uniforms: Record<string, any>;
        htmlSetup: string;
        jsSetup: string;
    };
}

export interface ExportOptions {
    includeCode?: boolean;
    format?: 'json' | 'js' | 'html';
    minify?: boolean;
}

// Generate shader-specific fragment shader code
export function generateFragmentShaderCode(shaderType: ShaderType): string {
    const shaderMap = {
        'classic': classicGradientShader,
        'vector': vectorFlowShader,
        'turbulence': turbulenceShader,
        'plasma': plasmaShader,
        'fluid': fluidShader,
        'particle': particleShader,
        'kaleidoscope': kaleidoscopeShader,
        'fluidInteractive': '// Fluid Interactive shader requires dual-pass rendering system'
    };

    const actualShader = shaderMap[shaderType];

    if (!actualShader) {
        return `// Fragment Shader: ${shaderType} (not found)
// Generated from Vector Field Studio

const fragmentShader = \`// Shader not available for export\`;`;
    }

    return `// Fragment Shader: ${shaderType}
// Generated from Vector Field Studio - Exact reproduction

const fragmentShader = \`${actualShader.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`;`;
}

// Generate vertex shader code
export function generateVertexShaderCode(): string {
    return `// Vertex Shader
const vertexShader = \`varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}\`;`;
}// Generate a complete standalone HTML file with the exact shader configuration
export function generateStandaloneHTML(exportData: ShaderExportData): string {
    const { shaderType, gradient, shaderParams } = exportData;

    // Get the actual fragment shader code
    const shaderMap = {
        'classic': classicGradientShader,
        'vector': vectorFlowShader,
        'turbulence': turbulenceShader,
        'plasma': plasmaShader,
        'fluid': fluidShader,
        'particle': particleShader,
        'kaleidoscope': kaleidoscopeShader,
        'fluidInteractive': '// Fluid Interactive shader requires dual-pass rendering system'
    };

    const fragmentShaderSource = shaderMap[shaderType];

    // Convert gradient stops to a format that can be used in the shader
    // Convert gradient stops to a format that can be used in the shader
    const gradientStops = gradient.stops
        .map(stop => ({
            position: stop.position,
            color: [
                stop.color.r,
                stop.color.g,
                stop.color.b,
                1.0
            ]
        }))
        .sort((a, b) => a.position - b.position); // CRUCIAL: Sort by position!

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${exportData.name} - Vector Field Shader</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            overflow: hidden;
            background: #000;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        canvas {
            display: block;
            width: 100vw;
            height: 100vh;
        }
        .info {
            position: absolute;
            top: 20px;
            left: 20px;
            color: white;
            background: rgba(0, 0, 0, 0.7);
            padding: 15px;
            border-radius: 8px;
            backdrop-filter: blur(10px);
            z-index: 100;
            max-width: 300px;
        }
        .info h3 {
            margin: 0 0 10px 0;
            font-size: 18px;
        }
        .info p {
            margin: 5px 0;
            font-size: 14px;
            opacity: 0.9;
        }
        .controls {
            position: absolute;
            bottom: 20px;
            left: 20px;
            color: white;
            background: rgba(0, 0, 0, 0.7);
            padding: 15px;
            border-radius: 8px;
            backdrop-filter: blur(10px);
            z-index: 100;
        }
        .controls button {
            background: rgba(255, 255, 255, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.3);
            color: white;
            padding: 8px 16px;
            margin: 5px;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        .controls button:hover {
            background: rgba(255, 255, 255, 0.3);
        }
    </style>
</head>
<body>
    <canvas id="shader-canvas"></canvas>
    
    <div class="info">
        <h3>${exportData.name}</h3>
        <p><strong>Shader:</strong> ${shaderType}</p>
        <p><strong>Speed:</strong> ${exportData.speed}</p>
        <p><strong>Scale:</strong> ${exportData.scale}</p>
        <p><strong>Generated:</strong> ${new Date(exportData.timestamp).toLocaleDateString()}</p>
        ${exportData.description ? `<p><em>${exportData.description}</em></p>` : ''}
    </div>
    
    <div class="controls">
        <button onclick="toggleAnimation()">${exportData.isPlaying ? 'Pause' : 'Play'}</button>
        <button onclick="resetView()">Reset</button>
        <button onclick="randomizeColors()">Random Colors</button>
    </div>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <script>
        // Shader configuration - EXACT COPY from Vector Field Studio
        const SHADER_CONFIG = {
            type: '${shaderType}',
            speed: ${exportData.speed},
            scale: ${exportData.scale},
            octaves: ${exportData.octaves},
            lacunarity: ${exportData.lacunarity},
            persistence: ${exportData.persistence},
            isPlaying: ${exportData.isPlaying},
            gradient: ${JSON.stringify(gradient, null, 12)},
            shaderParams: ${JSON.stringify(shaderParams, null, 12)}
        };

        // Vertex Shader
        const vertexShader = \`
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        \`;

        // Fragment Shader - EXACT COPY from studio
        const fragmentShader = \`${fragmentShaderSource.replace(/`/g, '\\`')}\`;

        // Gradient data
        const gradientStops = ${JSON.stringify(gradientStops, null, 12)};

        // Three.js setup
        let scene, camera, renderer, material, geometry, mesh;
        let uniforms;
        let isAnimating = SHADER_CONFIG.isPlaying;
        let startTime = Date.now();

        function init() {
            const canvas = document.getElementById('shader-canvas');
            
            // Check WebGL support
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (!gl) {
                console.error('WebGL not supported!');
                return;
            }
            
            // Scene setup
            scene = new THREE.Scene();
            camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
            renderer = new THREE.WebGLRenderer({ 
                canvas: canvas, 
                antialias: true,
                alpha: false 
            });
            
            // Create gradient texture
            const gradientTexture = createGradientTexture();
            
            // Uniforms - EXACT VALUES from studio
            uniforms = {
                u_time: { value: 0.0 },
                u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
                u_mouse: { value: new THREE.Vector2(window.innerWidth * 0.5, window.innerHeight * 0.5) },
                u_speed: { value: SHADER_CONFIG.speed },
                u_scale: { value: SHADER_CONFIG.scale },
                u_octaves: { value: SHADER_CONFIG.octaves },
                u_lacunarity: { value: SHADER_CONFIG.lacunarity },
                u_persistence: { value: SHADER_CONFIG.persistence },
                u_gradientTexture: { value: gradientTexture },
                u_gradient_steps: { value: gradientStops.length },
                // Fallback colors for shader compatibility
                u_color1: { value: new THREE.Vector3(gradientStops[0] ? gradientStops[0].color[0] : 1.0, gradientStops[0] ? gradientStops[0].color[1] : 0.0, gradientStops[0] ? gradientStops[0].color[2] : 0.0) },
                u_color2: { value: new THREE.Vector3(gradientStops[1] ? gradientStops[1].color[0] : 0.0, gradientStops[1] ? gradientStops[1].color[1] : 1.0, gradientStops[1] ? gradientStops[1].color[2] : 0.0) },
                u_color3: { value: new THREE.Vector3(gradientStops[2] ? gradientStops[2].color[0] : 0.0, gradientStops[2] ? gradientStops[2].color[1] : 0.0, gradientStops[2] ? gradientStops[2].color[2] : 1.0) }
            };

            // Add shader-specific parameters
            const params = SHADER_CONFIG.shaderParams;
            if (params.flowStrength !== undefined) uniforms.u_flow_strength = { value: params.flowStrength };
            if (params.turbulence !== undefined) uniforms.u_turbulence = { value: params.turbulence };
            if (params.plasmaIntensity !== undefined) uniforms.u_plasma_intensity = { value: params.plasmaIntensity };
            if (params.viscosity !== undefined) uniforms.u_viscosity = { value: params.viscosity };
            if (params.pressure !== undefined) uniforms.u_pressure = { value: params.pressure };
            if (params.particleCount !== undefined) uniforms.u_particle_count = { value: params.particleCount };
            if (params.particleSize !== undefined) uniforms.u_particle_size = { value: params.particleSize };
            if (params.segments !== undefined) uniforms.u_segments = { value: params.segments };
            if (params.rotation !== undefined) uniforms.u_rotation = { value: params.rotation };

            // Create material
            material = new THREE.ShaderMaterial({
                uniforms: uniforms,
                vertexShader: vertexShader,
                fragmentShader: fragmentShader,
                side: THREE.DoubleSide
            });

            // Create geometry and mesh
            geometry = new THREE.PlaneGeometry(2, 2);
            mesh = new THREE.Mesh(geometry, material);
            scene.add(mesh);

            // Set initial size now that uniforms are initialized
            updateSize();

            // Mouse interaction
            setupMouseInteraction();
            
            // Start animation
            animate();
        }

        function createGradientTexture() {
            const width = 256;
            const height = 1;
            const data = new Uint8Array(width * height * 4);

            for (let i = 0; i < width; i++) {
                const t = i / (width - 1);
                const color = sampleGradient(t);
                
                const index = i * 4;
                data[index] = Math.floor(color[0] * 255);     // R
                data[index + 1] = Math.floor(color[1] * 255); // G
                data[index + 2] = Math.floor(color[2] * 255); // B
                data[index + 3] = Math.floor(color[3] * 255); // A
            }

            const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
            texture.needsUpdate = true;
            texture.wrapS = THREE.ClampToEdgeWrapping;
            texture.wrapT = THREE.ClampToEdgeWrapping;
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
            
            return texture;
        }

        function sampleGradient(t) {
            t = Math.max(0, Math.min(1, t));
            
            if (gradientStops.length === 0) {
                return [1, 1, 1, 1];
            }
            if (gradientStops.length === 1) return gradientStops[0].color;
            
            // Gradient stops are now sorted by position
            // Handle edge cases
            if (t <= gradientStops[0].position) {
                return gradientStops[0].color;
            }
            if (t >= gradientStops[gradientStops.length - 1].position) {
                return gradientStops[gradientStops.length - 1].color;
            }
            
            // Find surrounding stops
            let beforeStop = gradientStops[0];
            let afterStop = gradientStops[gradientStops.length - 1];
            
            for (let i = 0; i < gradientStops.length - 1; i++) {
                if (t >= gradientStops[i].position && t <= gradientStops[i + 1].position) {
                    beforeStop = gradientStops[i];
                    afterStop = gradientStops[i + 1];
                    break;
                }
            }
            
            // Interpolate
            const range = afterStop.position - beforeStop.position;
            let localT = range === 0 ? 0 : (t - beforeStop.position) / range;
            
            // Apply smooth interpolation (matching studio behavior)
            localT = localT * localT * (3 - 2 * localT); // smoothstep
            
            const result = [
                beforeStop.color[0] + (afterStop.color[0] - beforeStop.color[0]) * localT,
                beforeStop.color[1] + (afterStop.color[1] - beforeStop.color[1]) * localT,
                beforeStop.color[2] + (afterStop.color[2] - beforeStop.color[2]) * localT,
                beforeStop.color[3] + (afterStop.color[3] - beforeStop.color[3]) * localT
            ];
            
            return result;
        }

        function setupMouseInteraction() {
            let mouseX = window.innerWidth * 0.5;
            let mouseY = window.innerHeight * 0.5;
            
            function updateMouse(event) {
                mouseX = event.clientX;
                mouseY = window.innerHeight - event.clientY; // Flip Y coordinate like studio
                
                // Safety check for uniforms
                if (uniforms && uniforms.u_mouse) {
                    uniforms.u_mouse.value.set(mouseX, mouseY);
                }
            }
            
            // Initialize mouse position
            if (uniforms && uniforms.u_mouse) {
                uniforms.u_mouse.value.set(mouseX, mouseY);
            }
            
            window.addEventListener('mousemove', updateMouse);
            window.addEventListener('touchmove', (event) => {
                if (event.touches.length > 0) {
                    const touch = event.touches[0];
                    updateMouse({
                        clientX: touch.clientX,
                        clientY: touch.clientY
                    });
                }
            });
        }

        function animate() {
            requestAnimationFrame(animate);
            
            if (isAnimating && uniforms && uniforms.u_time) {
                const elapsedTime = (Date.now() - startTime) * 0.001;
                uniforms.u_time.value = elapsedTime;
            }
            
            if (renderer && scene && camera) {
                renderer.render(scene, camera);
            }
        }

        function updateSize() {
            const width = window.innerWidth;
            const height = window.innerHeight;
            
            renderer.setSize(width, height);
            
            // Safety check to ensure uniforms are initialized
            if (uniforms && uniforms.u_resolution) {
                uniforms.u_resolution.value.set(width, height);
            }
        }

        function toggleAnimation() {
            isAnimating = !isAnimating;
            if (isAnimating && uniforms && uniforms.u_time) {
                startTime = Date.now() - uniforms.u_time.value * 1000;
            }
            
            const button = document.querySelector('.controls button');
            if (button) {
                button.textContent = isAnimating ? 'Pause' : 'Play';
            }
        }

        function resetView() {
            if (uniforms) {
                if (uniforms.u_time) uniforms.u_time.value = 0;
                if (uniforms.u_mouse) uniforms.u_mouse.value.set(window.innerWidth * 0.5, window.innerHeight * 0.5);
            }
            startTime = Date.now();
        }

        function randomizeColors() {
            // Generate random gradient
            const newStops = [];
            const numStops = 3 + Math.floor(Math.random() * 3);
            
            for (let i = 0; i < numStops; i++) {
                newStops.push({
                    position: i / (numStops - 1),
                    color: [Math.random(), Math.random(), Math.random(), 1.0]
                });
            }
            
            gradientStops.length = 0;
            gradientStops.push(...newStops);
            
            // Update texture with safety check
            if (uniforms && uniforms.u_gradient_texture) {
                const newTexture = createGradientTexture();
                uniforms.u_gradient_texture.value = newTexture;
            }
        }

        // Initialize when page loads
        window.addEventListener('load', init);
        window.addEventListener('resize', updateSize);
    </script>
</body>
</html>`;
}

// Generate Three.js setup code
export function generateThreeJSSetup(exportData: ShaderExportData): string {
    const { shaderType, gradient, shaderParams } = exportData;
    const fragmentShader = generateFragmentShaderCode(shaderType);

    return `// Three.js WebGL Shader Setup
// Generated from Vector Field Studio

import * as THREE from 'three';

// Vertex Shader
const vertexShader = \`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
\`;

// Fragment Shader (${shaderType})
${fragmentShader}

// Gradient Configuration
const gradientConfig = ${JSON.stringify(gradient, null, 2)};

// Setup Scene
export function setupShaderScene(canvas) {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  
  // Shader uniforms
  const uniforms = {
    u_time: { value: 0 },
    u_resolution: { value: new THREE.Vector2(canvas.width, canvas.height) },
    u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
    u_speed: { value: ${exportData.speed} },
    u_scale: { value: ${exportData.scale} },
    u_octaves: { value: ${exportData.octaves} },
    u_lacunarity: { value: ${exportData.lacunarity} },
    u_persistence: { value: ${exportData.persistence} },
    ${Object.entries(shaderParams)
            .filter(([_, value]) => value !== undefined)
            .map(([key, value]) => `u_${key}: { value: ${value} }`)
            .join(',\n    ')}
  };
  
  // Create gradient texture (you'll need to implement gradient sampling)
  const gradientTexture = createGradientTexture(gradientConfig);
  uniforms.u_gradientTexture = { value: gradientTexture };
  
  // Create material
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    side: THREE.DoubleSide
  });
  
  // Create mesh
  const geometry = new THREE.PlaneGeometry(2, 2);
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);
  
  // Animation loop
  function animate() {
    uniforms.u_time.value = performance.now() * 0.001;
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  
  return { scene, camera, renderer, uniforms, animate };
}

// Helper function to create gradient texture
function createGradientTexture(gradientConfig) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');
  
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
  gradientConfig.stops.forEach(stop => {
    const color = \`rgb(\${Math.round(stop.color.r * 255)}, \${Math.round(stop.color.g * 255)}, \${Math.round(stop.color.b * 255)})\`;
    gradient.addColorStop(stop.position, color);
  });
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  
  return texture;
}`;
}

// Generate HTML template
export function generateHTMLTemplate(exportData: ShaderExportData): string {
    // Safely stringify the config for HTML embedding
    const safeConfig = {
        name: exportData.name,
        description: exportData.description,
        shaderType: exportData.shaderType,
        speed: exportData.speed,
        scale: exportData.scale,
        timestamp: exportData.timestamp,
        gradientStops: exportData.gradient.stops.length,
        interpolation: exportData.gradient.interpolation,
        easing: exportData.gradient.easing
    };

    // Pre-process gradient stops for safe embedding
    const gradientStopsJson = JSON.stringify(exportData.gradient.stops);
    const shaderType = exportData.shaderType;
    const speed = exportData.speed;
    const scale = exportData.scale;

    // Helper function to get actual fragment shader
    function getActualFragmentShader(shaderType: string): string {
        // Import the actual shaders - this needs to be handled properly
        // For now, let's create a comprehensive shader implementation

        const shaderMap: Record<string, string> = {
            'classic': `
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_speed;
uniform float u_scale;
uniform float u_octaves;
uniform float u_lacunarity;
uniform float u_persistence;
uniform sampler2D u_gradientTexture;
varying vec2 vUv;

// Enhanced noise functions
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 st) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 6; i++) {
        value += amplitude * noise(st);
        st *= u_lacunarity;
        amplitude *= u_persistence;
    }
    return value;
}

void main() {
    vec2 uv = vUv;
    float time = u_time * u_speed;
    
    vec2 pos = uv * u_scale + time * 0.1;
    float pattern = fbm(pos);
    
    pattern = smoothstep(0.0, 1.0, pattern);
    
    vec4 gradientColor = texture2D(u_gradientTexture, vec2(pattern, 0.5));
    
    // Add mouse interaction
    vec2 mouse = u_mouse;
    float mouseDist = length(uv - mouse);
    float mouseEffect = 1.0 - smoothstep(0.0, 0.3, mouseDist);
    gradientColor.rgb += vec3(0.1) * mouseEffect;
    
    gl_FragColor = gradientColor;
}`,
            'vector': `
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_speed;
uniform float u_scale;
uniform sampler2D u_gradientTexture;
varying vec2 vUv;

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

vec2 curl(vec2 p) {
    float eps = 0.01;
    float n1 = noise(p + vec2(eps, 0.0));
    float n2 = noise(p - vec2(eps, 0.0));
    float n3 = noise(p + vec2(0.0, eps));
    float n4 = noise(p - vec2(0.0, eps));
    
    float dx = (n1 - n2) / (2.0 * eps);
    float dy = (n3 - n4) / (2.0 * eps);
    
    return vec2(dy, -dx);
}

void main() {
    vec2 uv = vUv;
    float time = u_time * u_speed;
    
    vec2 pos = uv * u_scale;
    vec2 flow = curl(pos + time * 0.1);
    
    vec2 flowUV = uv + flow * 0.1;
    float pattern = length(flow);
    
    pattern = smoothstep(0.0, 1.0, pattern);
    
    vec4 gradientColor = texture2D(u_gradientTexture, vec2(pattern, 0.5));
    
    // Add mouse interaction
    vec2 mouse = u_mouse;
    float mouseDist = length(uv - mouse);
    float mouseEffect = 1.0 - smoothstep(0.0, 0.3, mouseDist);
    gradientColor.rgb += vec3(0.1) * mouseEffect;
    
    gl_FragColor = gradientColor;
}`,
            'plasma': `
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_speed;
uniform float u_scale;
uniform sampler2D u_gradientTexture;
varying vec2 vUv;

void main() {
    vec2 uv = vUv;
    float time = u_time * u_speed;
    
    vec2 pos = uv * u_scale;
    
    float x = pos.x + time;
    float y = pos.y + time * 0.7;
    
    float pattern = sin(x) * cos(y) + sin(x + y) * cos(x - y);
    pattern += sin(sqrt(x*x + y*y) + time);
    pattern = pattern * 0.25 + 0.5;
    
    pattern = smoothstep(0.0, 1.0, pattern);
    
    vec4 gradientColor = texture2D(u_gradientTexture, vec2(pattern, 0.5));
    
    // Add mouse interaction
    vec2 mouse = u_mouse;
    float mouseDist = length(uv - mouse);
    float mouseEffect = 1.0 - smoothstep(0.0, 0.3, mouseDist);
    gradientColor.rgb += vec3(0.1) * mouseEffect;
    
    gl_FragColor = gradientColor;
}`,
            'turbulence': `
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_speed;
uniform float u_scale;
uniform float u_octaves;
uniform float u_lacunarity;
uniform float u_persistence;
uniform sampler2D u_gradientTexture;
varying vec2 vUv;

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float turbulentNoise(vec2 st) {
    float value = 0.0;
    float amplitude = 1.0;
    for (int i = 0; i < 6; i++) {
        value += abs(noise(st) * 2.0 - 1.0) * amplitude;
        st *= u_lacunarity;
        amplitude *= u_persistence;
    }
    return value;
}

void main() {
    vec2 uv = vUv;
    float time = u_time * u_speed;
    
    vec2 pos = uv * u_scale + time * 0.1;
    float pattern = turbulentNoise(pos);
    
    pattern = smoothstep(0.0, 1.0, pattern);
    
    vec4 gradientColor = texture2D(u_gradientTexture, vec2(pattern, 0.5));
    
    // Add mouse interaction
    vec2 mouse = u_mouse;
    float mouseDist = length(uv - mouse);
    float mouseEffect = 1.0 - smoothstep(0.0, 0.3, mouseDist);
    gradientColor.rgb += vec3(0.1) * mouseEffect;
    
    gl_FragColor = gradientColor;
}`,
            'fluid': `
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_speed;
uniform float u_scale;
uniform sampler2D u_gradientTexture;
varying vec2 vUv;

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

vec2 fluidFlow(vec2 p, float t) {
    float n1 = noise(p + t);
    float n2 = noise(p + vec2(100.0) + t);
    return vec2(n1, n2) * 2.0 - 1.0;
}

void main() {
    vec2 uv = vUv;
    float time = u_time * u_speed;
    
    vec2 pos = uv * u_scale;
    vec2 flow = fluidFlow(pos, time);
    
    vec2 flowUV = uv + flow * 0.1;
    float pattern = length(flow) * 0.5;
    
    pattern = smoothstep(0.0, 1.0, pattern);
    
    vec4 gradientColor = texture2D(u_gradientTexture, vec2(pattern, 0.5));
    
    // Add mouse interaction
    vec2 mouse = u_mouse;
    float mouseDist = length(uv - mouse);
    float mouseEffect = 1.0 - smoothstep(0.0, 0.3, mouseDist);
    gradientColor.rgb += vec3(0.1) * mouseEffect;
    
    gl_FragColor = gradientColor;
}`,
            'particle': `
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_speed;
uniform float u_scale;
uniform sampler2D u_gradientTexture;
varying vec2 vUv;

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float particles(vec2 p, float t) {
    float pattern = 0.0;
    for (int i = 0; i < 10; i++) {
        vec2 offset = vec2(float(i) * 13.7, float(i) * 17.3);
        vec2 pos = p + offset + t * (1.0 + float(i) * 0.1);
        float dist = length(fract(pos) - 0.5);
        pattern += 1.0 - smoothstep(0.1, 0.2, dist);
    }
    return pattern * 0.1;
}

void main() {
    vec2 uv = vUv;
    float time = u_time * u_speed;
    
    vec2 pos = uv * u_scale;
    float pattern = particles(pos, time);
    
    pattern = smoothstep(0.0, 1.0, pattern);
    
    vec4 gradientColor = texture2D(u_gradientTexture, vec2(pattern, 0.5));
    
    // Add mouse interaction
    vec2 mouse = u_mouse;
    float mouseDist = length(uv - mouse);
    float mouseEffect = 1.0 - smoothstep(0.0, 0.3, mouseDist);
    gradientColor.rgb += vec3(0.1) * mouseEffect;
    
    gl_FragColor = gradientColor;
}`,
            'kaleidoscope': `
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_speed;
uniform float u_scale;
uniform sampler2D u_gradientTexture;
varying vec2 vUv;

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

vec2 kaleidoscope(vec2 p, int segments) {
    float angle = atan(p.y, p.x);
    float radius = length(p);
    float segmentAngle = 6.28318 / float(segments);
    angle = mod(angle, segmentAngle * 2.0);
    if (angle > segmentAngle) {
        angle = segmentAngle * 2.0 - angle;
    }
    return vec2(cos(angle), sin(angle)) * radius;
}

void main() {
    vec2 uv = vUv - 0.5;
    float time = u_time * u_speed;
    
    vec2 kUv = kaleidoscope(uv * u_scale, 6);
    float pattern = noise(kUv + time * 0.1);
    
    pattern = smoothstep(0.0, 1.0, pattern);
    
    vec4 gradientColor = texture2D(u_gradientTexture, vec2(pattern, 0.5));
    
    // Add mouse interaction
    vec2 mouse = u_mouse - 0.5;
    float mouseDist = length(uv - mouse);
    float mouseEffect = 1.0 - smoothstep(0.0, 0.3, mouseDist);
    gradientColor.rgb += vec3(0.1) * mouseEffect;
    
    gl_FragColor = gradientColor;
}`
        };

        // Add other shader types with similar comprehensive implementations
        if (!shaderMap[shaderType]) {
            shaderMap[shaderType] = shaderMap['classic']; // Fallback
        }

        return shaderMap[shaderType];
    }

    // Get actual fragment shader implementation
    const actualFragmentShader = getActualFragmentShader(shaderType);

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${exportData.name.replace(/"/g, '&quot;')} - Generated Shader</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            overflow: hidden;
            background: #000;
            font-family: Arial, sans-serif;
        }
        canvas {
            display: block;
            width: 100vw;
            height: 100vh;
        }
        .info {
            position: absolute;
            top: 20px;
            left: 20px;
            color: white;
            background: rgba(0,0,0,0.5);
            padding: 10px;
            border-radius: 8px;
            font-size: 14px;
            max-width: 300px;
        }
        .controls {
            position: absolute;
            top: 20px;
            right: 20px;
            color: white;
            background: rgba(0,0,0,0.5);
            padding: 10px;
            border-radius: 8px;
            font-size: 12px;
        }
        button {
            background: rgba(255,255,255,0.2);
            color: white;
            border: 1px solid rgba(255,255,255,0.3);
            padding: 8px 12px;
            border-radius: 4px;
            cursor: pointer;
            margin: 2px;
        }
        button:hover {
            background: rgba(255,255,255,0.3);
        }
    </style>
</head>
<body>
    <canvas id="canvas"></canvas>
    <div class="info">
        <h3>${exportData.name.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</h3>
        <p>${exportData.description.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
        <p><strong>Shader Type:</strong> ${exportData.shaderType}</p>
        <p><strong>Generated:</strong> ${new Date(exportData.timestamp).toLocaleDateString()}</p>
        <details>
            <summary>Configuration</summary>
            <pre style="font-size: 10px; margin-top: 5px;">{
  "type": "${exportData.shaderType}",
  "speed": ${exportData.speed},
  "scale": ${exportData.scale},
  "gradient": "${exportData.gradient.stops.length} stops",
  "interpolation": "${exportData.gradient.interpolation}",
  "easing": "${exportData.gradient.easing}"
}</pre>
        </details>
    </div>
    
    <div class="controls">
        <div>Controls:</div>
        <button onclick="toggleAnimation()">Play/Pause</button>
        <button onclick="randomizeParams()">Randomize</button>
        <br>
        <small>Move mouse to interact</small>
    </div>
    
    <!-- Three.js CDN -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    
    <script>
        // Configuration exported from Vector Field Studio
        const exportedConfig = ${JSON.stringify(safeConfig, null, 2)};
        
        let scene, camera, renderer, uniforms, isPlaying = true;
        
        // Initialize
        function init() {
            const canvas = document.getElementById('canvas');
            scene = new THREE.Scene();
            camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
            renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
            renderer.setSize(window.innerWidth, window.innerHeight);
            
            // Create gradient texture for shader sampling
            const gradientStops = ${gradientStopsJson};
            const gradientTexture = createGradientTexture(gradientStops);
            
            // Get the complete fragment shader for this type
            const completeFragmentShader = \`${actualFragmentShader.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`;
            
            const material = new THREE.ShaderMaterial({
                uniforms: {
                    u_time: { value: 0 },
                    u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
                    u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
                    u_speed: { value: ${speed} },
                    u_scale: { value: ${scale} },
                    u_octaves: { value: ${exportData.octaves || 4} },
                    u_lacunarity: { value: ${exportData.lacunarity || 2.0} },
                    u_persistence: { value: ${exportData.persistence || 0.5} },
                    u_gradientTexture: { value: gradientTexture }
                },
                vertexShader: \`varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}\`,
                fragmentShader: completeFragmentShader
            });
            
            // Helper function to create gradient texture
            function createGradientTexture(gradientStops) {
                const canvas = document.createElement('canvas');
                canvas.width = 256;
                canvas.height = 1;
                const ctx = canvas.getContext('2d');
                
                const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
                gradientStops.forEach(stop => {
                    const color = \`rgb(\${Math.round(stop.color.r * 255)}, \${Math.round(stop.color.g * 255)}, \${Math.round(stop.color.b * 255)})\`;
                    gradient.addColorStop(stop.position, color);
                });
                
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                const texture = new THREE.CanvasTexture(canvas);
                texture.wrapS = THREE.ClampToEdgeWrapping;
                texture.wrapT = THREE.ClampToEdgeWrapping;
                texture.minFilter = THREE.LinearFilter;
                texture.magFilter = THREE.LinearFilter;
                
                return texture;
            }
            
            uniforms = material.uniforms;
            
            const geometry = new THREE.PlaneGeometry(2, 2);
            const mesh = new THREE.Mesh(geometry, material);
            scene.add(mesh);
            
            // Mouse interaction
            document.addEventListener('mousemove', function(e) {
                uniforms.u_mouse.value.x = e.clientX / window.innerWidth;
                uniforms.u_mouse.value.y = 1.0 - e.clientY / window.innerHeight;
            });
            
            // Window resize
            window.addEventListener('resize', function() {
                renderer.setSize(window.innerWidth, window.innerHeight);
                uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
            });
            
            animate();
        }
        
        function animate() {
            if (isPlaying) {
                uniforms.u_time.value = performance.now() * 0.001;
            }
            renderer.render(scene, camera);
            requestAnimationFrame(animate);
        }
        
        function toggleAnimation() {
            isPlaying = !isPlaying;
        }
        
        function randomizeParams() {
            uniforms.u_speed.value = Math.random() * 2;
            uniforms.u_scale.value = 1 + Math.random() * 5;
        }
        
        // Start the application
        init();
        
        // Full shader configuration loaded
        // NOTE: This is a simplified demo. Use the exported JS/JSON files for the complete implementation.
    </script>
</body>
</html>`;
}

// Export configuration as downloadable file
export function downloadExport(data: ShaderExportData, options: ExportOptions = {}) {
    const { format = 'json', includeCode = true } = options;

    let content: string;
    let filename: string;
    let mimeType: string;

    switch (format) {
        case 'json':
            content = JSON.stringify(data, null, 2);
            filename = `${data.name.replace(/\s+/g, '_')}_config.json`;
            mimeType = 'application/json';
            break;

        case 'js':
            content = `// Generated shader configuration
export const shaderConfig = ${JSON.stringify(data, null, 2)};

${includeCode ? generateThreeJSSetup(data) : ''}`;
            filename = `${data.name.replace(/\s+/g, '_')}_shader.js`;
            mimeType = 'text/javascript';
            break;

        case 'html':
            content = generateStandaloneHTML(data);
            filename = `${data.name.replace(/\s+/g, '_')}_shader.html`;
            mimeType = 'text/html';
            break;

        default:
            throw new Error(`Unsupported format: ${format}`);
    }

    // Create download
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

// Copy configuration to clipboard
export async function copyToClipboard(data: ShaderExportData, format: 'json' | 'js' = 'json') {
    let content: string;

    if (format === 'json') {
        content = JSON.stringify(data, null, 2);
    } else {
        content = `// Shader Configuration\nconst config = ${JSON.stringify(data, null, 2)};`;
    }

    try {
        await navigator.clipboard.writeText(content);
        return true;
    } catch (error) {
        console.error('Failed to copy to clipboard:', error);
        return false;
    }
}

// Generate shareable URL with configuration
export function generateShareableURL(data: ShaderExportData): string {
    const baseUrl = window.location.origin + window.location.pathname;
    const config = {
        s: data.shaderType,
        g: data.gradient,
        p: data.shaderParams,
        speed: data.speed,
        scale: data.scale,
        octaves: data.octaves,
        lacunarity: data.lacunarity,
        persistence: data.persistence
    };

    const compressed = btoa(JSON.stringify(config));
    return `${baseUrl}?config=${compressed}`;
}

// Parse shareable URL
export function parseShareableURL(url: string): Partial<ShaderExportData> | null {
    try {
        const urlObj = new URL(url);
        const config = urlObj.searchParams.get('config');
        if (!config) return null;

        const parsed = JSON.parse(atob(config));
        return {
            shaderType: parsed.s,
            gradient: parsed.g,
            shaderParams: parsed.p,
            speed: parsed.speed,
            scale: parsed.scale,
            octaves: parsed.octaves,
            lacunarity: parsed.lacunarity,
            persistence: parsed.persistence
        };
    } catch (error) {
        console.error('Failed to parse shareable URL:', error);
        return null;
    }
}

// Generate a standalone JavaScript module containing the shader configuration & setup
export function generateJavaScriptCode(exportData: ShaderExportData): string {
    const fragmentShaderCode = generateFragmentShaderCode(exportData.shaderType);
    const fragmentShaderEscaped = fragmentShaderCode.replace(/`/g, '\\`');
    const gradientConfig = JSON.stringify(exportData.gradient, null, 2).replace(/`/g, '\\`');
    const fullConfig = JSON.stringify(exportData, null, 2).replace(/`/g, '\\`');

    return `// ==============================
// Auto-generated Shader Export
// Source: Vector Field Studio
// ==============================
import * as THREE from 'three';

// Full original export data (metadata + params)
export const exportedData = ${fullConfig};

// Gradient configuration (extracted for convenience)
export const gradientConfig = ${gradientConfig};

${fragmentShaderEscaped}

// Minimal vertex shader
const vertexShader = 'varying vec2 vUv;\\nvoid main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }';

// Create a 1D gradient texture from gradientConfig
function createGradientTexture(config){
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 1;
    const ctx = canvas.getContext('2d');
    const g = ctx.createLinearGradient(0,0,canvas.width,0);
    config.stops.sort((a,b)=>a.position-b.position).forEach(stop=>{
        const c = 'rgb(' + Math.round(stop.color.r*255) + ',' + Math.round(stop.color.g*255) + ',' + Math.round(stop.color.b*255) + ')';
        g.addColorStop(stop.position, c);
    });
    ctx.fillStyle = g; ctx.fillRect(0,0,canvas.width,canvas.height);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    return tex;
}

export function initShader(canvas, options = {}) {
    const data = exportedData; // convenience
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1,1,1,-1,0,1);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight);

    const gradientTexture = createGradientTexture(gradientConfig);

    const uniforms = {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(renderer.domElement.width, renderer.domElement.height) },
        u_mouse: { value: new THREE.Vector2(0.5,0.5) },
        u_speed: { value: data.speed },
        u_scale: { value: data.scale },
        u_octaves: { value: data.octaves },
        u_lacunarity: { value: data.lacunarity },
        u_persistence: { value: data.persistence },
        u_gradientTexture: { value: gradientTexture }
    };

    // Inject shader-specific params
    Object.entries(data.shaderParams || {}).forEach(([k,v])=>{
        const uniformName = 'u_' + k;
        if(v !== undefined && (uniforms as any)[uniformName] === undefined){
            (uniforms as any)[uniformName] = { value: v };
        }
    });

    const material = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, side: THREE.DoubleSide });
    const geometry = new THREE.PlaneGeometry(2,2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    let playing = data.isPlaying;
    function animate(){
        if(playing){ (uniforms as any).u_time.value = performance.now() * 0.001; }
        renderer.render(scene, camera);
        requestAnimationFrame(animate);
    }
    animate();

    // Resize handling
    function handleResize(){
        const w = canvas.clientWidth || window.innerWidth;
        const h = canvas.clientHeight || window.innerHeight;
        renderer.setSize(w,h,false);
        (uniforms as any).u_resolution.value.set(w,h);
    }
    window.addEventListener('resize', handleResize);

    // Mouse interaction (normalized)
    function handleMouse(e: MouseEvent){
        (uniforms as any).u_mouse.value.x = e.clientX / window.innerWidth;
        (uniforms as any).u_mouse.value.y = 1 - e.clientY / window.innerHeight;
    }
    window.addEventListener('mousemove', handleMouse);

    return {
        scene, camera, renderer, mesh, uniforms,
        play(){ playing = true; },
        pause(){ playing = false; },
        dispose(){
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('mousemove', handleMouse);
            geometry.dispose();
            material.dispose();
            gradientTexture.dispose();
            renderer.dispose();
        }
    };
}

// Optional auto-init if a canvas with id 'shader-canvas' exists
if (typeof window !== 'undefined') {
    const autoCanvas = document.getElementById('shader-canvas');
    if(autoCanvas instanceof HTMLCanvasElement){
        initShader(autoCanvas);
    }
}
`;
}

// 🚀 NEW: Smart Export System - Only includes necessary code!
export function downloadSmartShaderExport(exportData: ShaderExportData, format: 'html' | 'js' | 'json' = 'html') {
    // Convert to SmartExportData format with ALL studio settings
    const smartExportData = {
        shaderType: exportData.shaderType,
        name: exportData.name,
        gradient: exportData.gradient,
        shaderParams: {
            // Include ALL parameters from the studio
            ...exportData.shaderParams,
            // Ensure core parameters are included
            speed: exportData.speed,
            scale: exportData.scale,
            octaves: exportData.octaves,
            lacunarity: exportData.lacunarity,
            persistence: exportData.persistence,
        },
        grainConfig: {
            grainIntensity: exportData.shaderParams?.grainIntensity || 0,
            grainSize: exportData.shaderParams?.grainSize || 100,
            grainSpeed: exportData.shaderParams?.grainSpeed || 1,
            grainContrast: exportData.shaderParams?.grainContrast || 1,
            grainType: exportData.shaderParams?.grainType || 0,
            grainBlendMode: exportData.shaderParams?.grainBlendMode || 0
        },
        mouseInteractionEnabled: exportData.shaderParams?.mouseInteractionEnabled !== false
    };

    // Debug: Log the complete export data to verify all values are captured
    console.log('🎯 SMART EXPORT DEBUG - Complete Studio Settings:');
    console.log('Shader Type:', smartExportData.shaderType);
    console.log('Core Params:', {
        speed: smartExportData.shaderParams.speed,
        scale: smartExportData.shaderParams.scale,
        octaves: smartExportData.shaderParams.octaves,
        lacunarity: smartExportData.shaderParams.lacunarity,
        persistence: smartExportData.shaderParams.persistence
    });
    console.log('Grain Config:', smartExportData.grainConfig);
    console.log('Mouse Interaction:', smartExportData.mouseInteractionEnabled);
    console.log('All Shader Params:', smartExportData.shaderParams);

    let content: string;
    let filename: string;
    let mimeType: string;

    switch (format) {
        case 'html':
            content = generateSmartHTML(smartExportData);
            filename = `${exportData.name.replace(/\s+/g, '_')}_smart_shader.html`;
            mimeType = 'text/html';
            break;
        case 'js':
            // For now, fall back to regular JS export (can be enhanced later)
            content = generateJavaScriptCode(exportData);
            filename = `${exportData.name.replace(/\s+/g, '_')}_smart_shader.js`;
            mimeType = 'text/javascript';
            break;
        case 'json':
            // Enhanced JSON with optimization info
            const optimizationReport = generateOptimizationReport(exportData.shaderType);
            content = JSON.stringify({
                ...exportData,
                smartExport: true,
                optimizationReport: optimizationReport
            }, null, 2);
            filename = `${exportData.name.replace(/\s+/g, '_')}_smart_config.json`;
            mimeType = 'application/json';
            break;
        default:
            throw new Error(`Unsupported export format: ${format}`);
    }

    // Create and trigger download
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Log optimization info to console
    if (format === 'html') {
        console.log(generateOptimizationReport(exportData.shaderType));
    }
}
