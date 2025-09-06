// Smart HTML export system that generates clean, minimal exports
// Only includes the code needed for the specific shader type

import { SmartExportData, buildOptimizedShader, generateOptimizationReport } from './smartExport';

export function generateSmartHTML(exportData: SmartExportData): string {
    const optimizedShaderCode = buildOptimizedShader(exportData.shaderType, exportData);
    const optimizationReport = generateOptimizationReport(exportData.shaderType);

    // Convert gradient stops for the shader
    const gradientStops = exportData.gradient.stops
        .map((stop: any) => ({
            position: stop.position,
            color: [stop.color.r, stop.color.g, stop.color.b, 1.0]
        }))
        .sort((a: any, b: any) => a.position - b.position);

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${exportData.name} - Smart Shader Export</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background: #000;
            font-family: 'Courier New', monospace;
            overflow: hidden;
        }
        
        canvas {
            display: block;
            width: 100vw;
            height: 100vh;
        }
        
        .controls {
            position: fixed;
            top: 20px;
            left: 20px;
            background: rgba(0, 0, 0, 0.8);
            padding: 20px;
            border-radius: 10px;
            color: white;
            font-size: 14px;
            max-width: 300px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .control-group {
            margin-bottom: 15px;
        }
        
        .control-group h4 {
            margin: 0 0 10px 0;
            color: #4CAF50;
            font-size: 16px;
        }
        
        .control-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }
        
        input[type="range"] {
            width: 120px;
            margin-left: 10px;
        }
        
        input[type="checkbox"] {
            margin-right: 8px;
        }
        
        select {
            background: rgba(255, 255, 255, 0.1);
            color: white;
            border: 1px solid rgba(255, 255, 255, 0.2);
            padding: 4px;
            border-radius: 4px;
        }
        
        button {
            background: #4CAF50;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-family: inherit;
        }
        
        button:hover {
            background: #45a049;
        }
        
        .optimization-info {
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            padding: 15px;
            border-radius: 10px;
            color: white;
            font-size: 12px;
            max-width: 250px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .optimization-info h4 {
            margin: 0 0 10px 0;
            color: #2196F3;
        }
        
        .size-reduction {
            color: #4CAF50;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <canvas id="canvas"></canvas>
    
    <div class="controls">
        <div class="control-group">
            <h4>Animation</h4>
            <div class="control-row">
                <button onclick="toggleAnimation()" id="playBtn">Pause</button>
            </div>
        </div>

        <div class="control-group">
            <h4>Baked-In Settings</h4>
            <div style="font-size: 12px; color: #888;">
                <div>Speed: ${exportData.shaderParams.speed || 1.0}</div>
                <div>Scale: ${exportData.shaderParams.scale || 1.0}</div>
                <div>Octaves: ${exportData.shaderParams.octaves || 4}</div>
                <div>Mouse: ${exportData.mouseInteractionEnabled !== false ? 'Enabled' : 'Disabled'}</div>
                ${exportData.grainConfig && exportData.grainConfig.grainIntensity > 0 ? `
                <div>Grain: ${['Film', 'Digital', 'Organic', 'Animated', 'Halftone'][exportData.grainConfig.grainType || 0]} (${exportData.grainConfig.grainIntensity})</div>` : ''}
            </div>
            <p style="font-size: 11px; color: #666; margin-top: 8px;">
                All settings from the studio are baked into the shader code. No controls needed!
            </p>
        </div>

    </div>
    
    <div class="optimization-info">
        <h4>🚀 Smart Export</h4>
        <div>Shader: <strong>${exportData.shaderType.toUpperCase()}</strong></div>
        <div class="size-reduction">Optimized Export</div>
        <div style="font-size: 10px; margin-top: 8px; opacity: 0.8;">
            Only includes features actually used by this shader type.
            No bloat from other shaders!
        </div>
    </div>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <script>
        // OPTIMIZED SHADER CODE - Only includes what's needed!
        const fragmentShader = \`${optimizedShaderCode.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`;
        
        const vertexShader = \`
        varying vec2 vUv;

        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
        \`;

        // Three.js setup
        let scene, camera, renderer, material, mesh;
        let isPlaying = true;
        let startTime = Date.now();

        function init() {
            // Scene setup
            scene = new THREE.Scene();
            camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
            
            // Renderer setup
            renderer = new THREE.WebGLRenderer({ 
                canvas: document.getElementById('canvas'),
                antialias: true 
            });
            renderer.setSize(window.innerWidth, window.innerHeight);
            
            // Create gradient texture
            const gradientTexture = createGradientTexture();
            
            // Shader material with optimized code
            material = new THREE.ShaderMaterial({
                vertexShader: vertexShader,
                fragmentShader: fragmentShader,
                uniforms: {
                    u_time: { value: 0.0 },
                    u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
                    ${exportData.mouseInteractionEnabled !== false ? `u_mouse: { value: new THREE.Vector2(0.5, 0.5) },` : ''}
                    u_color1: { value: new THREE.Vector3(${exportData.gradient.stops[0]?.color.r || 1}, ${exportData.gradient.stops[0]?.color.g || 0}, ${exportData.gradient.stops[0]?.color.b || 0}) },
                    u_color2: { value: new THREE.Vector3(${exportData.gradient.stops[1]?.color.r || 0}, ${exportData.gradient.stops[1]?.color.g || 1}, ${exportData.gradient.stops[1]?.color.b || 0}) },
                    u_color3: { value: new THREE.Vector3(${exportData.gradient.stops[2]?.color.r || 0}, ${exportData.gradient.stops[2]?.color.g || 0}, ${exportData.gradient.stops[2]?.color.b || 1}) },
                    u_gradientTexture: { value: gradientTexture }
                }
            });
            
            // Create mesh
            const geometry = new THREE.PlaneGeometry(2, 2);
            mesh = new THREE.Mesh(geometry, material);
            scene.add(mesh);
            
            // Event listeners
            ${exportData.mouseInteractionEnabled !== false ? `
            window.addEventListener('mousemove', onMouseMove);` : ''}
            window.addEventListener('resize', onWindowResize);
            
            // Start animation
            animate();
        }

        function createGradientTexture() {
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 1;
            const ctx = canvas.getContext('2d');
            
            const gradient = ctx.createLinearGradient(0, 0, 256, 0);
            ${gradientStops.map((stop: any, index: number) =>
        `gradient.addColorStop(${stop.position}, 'rgb(${Math.round(stop.color[0] * 255)}, ${Math.round(stop.color[1] * 255)}, ${Math.round(stop.color[2] * 255)})');`
    ).join('\n            ')}
            
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 256, 1);
            
            const texture = new THREE.CanvasTexture(canvas);
            texture.wrapS = THREE.ClampToEdgeWrapping;
            texture.wrapT = THREE.ClampToEdgeWrapping;
            return texture;
        }

        ${exportData.mouseInteractionEnabled !== false ? `
        function onMouseMove(event) {
            const rect = renderer.domElement.getBoundingClientRect();
            material.uniforms.u_mouse.value.x = event.clientX - rect.left;
            material.uniforms.u_mouse.value.y = rect.height - (event.clientY - rect.top);
        }` : `
        function onMouseMove(event) {
            // Mouse interaction disabled in baked settings
        }`}

        function onWindowResize() {
            renderer.setSize(window.innerWidth, window.innerHeight);
            material.uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
        }

        function animate() {
            requestAnimationFrame(animate);
            
            if (isPlaying) {
                material.uniforms.u_time.value = (Date.now() - startTime) * 0.001;
            }
            
            renderer.render(scene, camera);
        }

        // Control functions
        function toggleAnimation() {
            isPlaying = !isPlaying;
            document.getElementById('playBtn').textContent = isPlaying ? 'Pause' : 'Play';
            if (isPlaying) {
                startTime = Date.now() - material.uniforms.u_time.value * 1000;
            }
        }

        // No control functions needed - all settings are baked into the shader!

        // Initialize
        init();
        
        // Log optimization info
        console.log(\`${optimizationReport.replace(/\n/g, '\\n')}\`);
    </script>
</body>
</html>`;
}

// No shader-specific uniforms needed - all values are baked into the shader code
