# 🎬 Grain System Documentation

## Overview
The Grain System adds cinematic texture and visual depth to the Fluid Simulation shader, providing comprehensive controls for creating various grain effects from subtle film texture to dramatic artistic overlays.

## 🎯 Features

### Grain Types
1. **Film Grain** (Type 0) - Classic analog film texture with organic randomness
2. **Digital Noise** (Type 1) - Clean, uniform digital grain patterns
3. **Organic Grain** (Type 2) - Natural, irregular patterns with smooth variations
4. **Animated Grain** (Type 3) - Time-based moving grain that responds to fluid motion
5. **Halftone Pattern** (Type 4) - Dot-matrix style grain for artistic effects

### Blend Modes
1. **Overlay** (Mode 0) - Balanced blend preserving highlights and shadows
2. **Multiply** (Mode 1) - Darkens the image, good for subtle grain
3. **Screen** (Mode 2) - Lightens the image, creates bright grain effects
4. **Soft Light** (Mode 3) - Gentle contrast enhancement
5. **Linear** (Mode 4) - Direct additive blending for strong effects

## 🎛️ Controls

### Grain Intensity (0.0 - 1.0)
- **Purpose**: Controls the overall strength of the grain effect
- **Default**: 0.0 (no grain)
- **Recommended**: 0.1-0.3 for subtle effects, 0.4-0.8 for dramatic looks

### Grain Size (10.0 - 500.0)
- **Purpose**: Controls the scale/resolution of grain particles
- **Default**: 100.0
- **Small values (10-50)**: Fine, detailed grain
- **Large values (200-500)**: Coarse, chunky grain

### Grain Speed (0.0 - 5.0)
- **Purpose**: Controls animation speed for time-based grain types
- **Default**: 1.0
- **0.0**: Static grain
- **1.0-2.0**: Natural motion
- **3.0-5.0**: Fast, energetic grain

### Grain Contrast (0.1 - 3.0)
- **Purpose**: Controls the contrast/sharpness of grain patterns
- **Default**: 1.0
- **Low values (0.1-0.8)**: Soft, subtle grain
- **High values (1.5-3.0)**: Sharp, pronounced grain

## 🎨 Creative Usage

### Cinematic Film Look
```
Grain Type: Film (0)
Intensity: 0.15-0.25
Size: 80-120
Speed: 0.5-1.0
Contrast: 0.8-1.2
Blend Mode: Overlay (0)
```

### Digital Glitch Effect
```
Grain Type: Digital (1)
Intensity: 0.4-0.6
Size: 20-40
Speed: 2.0-4.0
Contrast: 2.0-3.0
Blend Mode: Screen (2)
```

### Organic Texture
```
Grain Type: Organic (2)
Intensity: 0.2-0.4
Size: 150-300
Speed: 0.5-1.5
Contrast: 1.0-1.5
Blend Mode: Soft Light (3)
```

### Animated Fluid Grain
```
Grain Type: Animated (3)
Intensity: 0.3-0.5
Size: 60-100
Speed: 1.5-2.5
Contrast: 1.2-1.8
Blend Mode: Overlay (0)
```

### Artistic Halftone
```
Grain Type: Halftone (4)
Intensity: 0.5-0.8
Size: 40-80
Speed: 1.0
Contrast: 2.0-2.5
Blend Mode: Multiply (1)
```

## 🔧 Technical Implementation

### Shader Integration
The grain system is fully integrated into the fluid display shader with:
- Real-time parameter updates
- Optimized noise functions
- Multiple blend mode implementations
- Fluid motion-responsive animated grain

### Performance Considerations
- Grain calculations are performed in the fragment shader
- Optimized noise functions for real-time performance
- Adaptive quality scaling based on device capabilities
- Minimal performance impact when grain intensity is 0.0

## 🎮 User Interface

### Location
Grain controls are located in the **Animation** tab under the **Grain Effects** section when the Fluid Simulation shader is active.

### Controls Layout
- **Grain Intensity**: Slider (0.0 - 1.0)
- **Grain Size**: Slider (10.0 - 500.0)
- **Grain Speed**: Slider (0.0 - 5.0)
- **Grain Contrast**: Slider (0.1 - 3.0)
- **Grain Type**: Dropdown (5 options)
- **Blend Mode**: Dropdown (5 options)

## 🚀 Getting Started

1. **Switch to Fluid Simulation**: Select "Fluid Simulation" from the shader type dropdown
2. **Navigate to Animation Tab**: Click the "Animation" tab in the controls panel
3. **Find Grain Effects**: Scroll to the "Grain Effects" section
4. **Start with Intensity**: Increase "Grain Intensity" from 0.0 to see immediate effects
5. **Experiment**: Try different grain types and blend modes
6. **Fine-tune**: Adjust size, speed, and contrast for desired look

## 💡 Tips & Best Practices

- Start with low intensity values and gradually increase
- Film grain works well for most scenarios
- Animated grain responds to fluid motion for dynamic effects
- Use multiply blend mode for subtle, darkening grain
- Use screen blend mode for bright, energetic grain
- Combine with other fluid parameters for unique looks
- Higher contrast values work well with larger grain sizes
