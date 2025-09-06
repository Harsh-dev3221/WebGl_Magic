# 🎨 Grain Blend Modes Guide

## Overview
The grain system now features mathematically correct blend mode implementations that follow industry-standard formulas used in professional image editing software.

## 🔬 Blend Mode Details

### 1. Overlay (Mode 0) ✨
**Formula**: `base < 0.5 ? 2 * base * blend : 1 - 2 * (1 - base) * (1 - blend)`

**Effect**: 
- Combines multiply and screen blend modes
- Preserves highlights and shadows
- Increases contrast while maintaining luminosity
- **Best for**: Subtle grain that enhances existing contrast

**Visual Result**: 
- Dark areas get darker with grain
- Light areas get lighter with grain
- Mid-tones show balanced grain effect

### 2. Multiply (Mode 1) 🌑
**Formula**: `base * blend`

**Effect**:
- Always produces darker results
- Black grain creates pure black
- White grain leaves color unchanged
- **Best for**: Dark, moody grain effects

**Visual Result**:
- Darkens the entire image
- Creates shadow-like grain
- Excellent for film noir looks

### 3. Screen (Mode 2) ☀️
**Formula**: `1 - (1 - base) * (1 - blend)`

**Effect**:
- Always produces lighter results
- White grain creates pure white
- Black grain leaves color unchanged
- **Best for**: Bright, energetic grain effects

**Visual Result**:
- Lightens the entire image
- Creates highlight-like grain
- Great for dreamy, ethereal looks

### 4. Soft Light (Mode 3) 🌅
**Formula**: Complex conditional blend that's gentler than overlay

**Effect**:
- Subtle contrast enhancement
- Gentle dodging and burning effect
- More natural than overlay
- **Best for**: Professional, subtle grain

**Visual Result**:
- Smooth contrast adjustments
- Natural-looking grain integration
- Preserves color relationships

### 5. Linear (Mode 4) ⚡
**Formula**: `base + (blend - 0.5)`

**Effect**:
- Direct additive blending
- Can create extreme results
- Centered around 50% gray
- **Best for**: Dramatic, artistic effects

**Visual Result**:
- Strong grain visibility
- Can push colors beyond normal ranges
- Creates bold, graphic looks

## 🎯 Usage Recommendations

### For Cinematic Film Look
```
Blend Mode: Overlay or Soft Light
Intensity: 0.15-0.25
Grain Type: Film
```

### For Dark, Moody Atmosphere
```
Blend Mode: Multiply
Intensity: 0.2-0.4
Grain Type: Organic
```

### For Bright, Dreamy Effect
```
Blend Mode: Screen
Intensity: 0.3-0.5
Grain Type: Digital
```

### For Subtle Professional Grade
```
Blend Mode: Soft Light
Intensity: 0.1-0.2
Grain Type: Film
```

### For Artistic/Experimental
```
Blend Mode: Linear
Intensity: 0.4-0.8
Grain Type: Halftone
```

## 🧪 Testing Each Mode

### Quick Test Procedure:
1. Set Grain Intensity to 0.5
2. Set Grain Size to 100
3. Use Film Grain type
4. Switch between blend modes to see differences:

**Overlay**: Balanced contrast enhancement
**Multiply**: Darkening effect
**Screen**: Brightening effect  
**Soft Light**: Gentle enhancement
**Linear**: Strong, direct effect

## 💡 Pro Tips

- **Start with Overlay** - Most versatile for general use
- **Use Multiply** for shadow-heavy scenes
- **Use Screen** for highlight-heavy scenes
- **Use Soft Light** for professional results
- **Use Linear** for creative experimentation

- **Combine with other parameters**:
  - Lower intensity with stronger blend modes
  - Higher contrast with gentler blend modes
  - Adjust grain size based on blend mode strength

## 🔧 Technical Notes

- All blend modes now use proper mathematical formulas
- Grain values are properly normalized (0-1 range)
- Contrast is applied before blending
- Final result is mixed with original based on intensity
- Performance optimized for real-time rendering

## 🎬 Creative Applications

### Film Emulation
- **16mm Film**: Overlay, 0.2 intensity, Film grain
- **35mm Film**: Soft Light, 0.15 intensity, Film grain
- **Digital Video**: Multiply, 0.1 intensity, Digital grain

### Artistic Styles
- **Vintage**: Screen, 0.3 intensity, Organic grain
- **Modern**: Linear, 0.4 intensity, Digital grain
- **Abstract**: Linear, 0.6 intensity, Halftone grain
