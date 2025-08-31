// Color harmony algorithms for generating aesthetically pleasing color schemes

import { RGBColor, HSVColor, rgbToHsv, hsvToRgb, hexToRgb, rgbToHex } from './spaces';

export type HarmonyType = 
  | 'complementary' 
  | 'triadic' 
  | 'analogous' 
  | 'tetradic' 
  | 'split-complementary'
  | 'monochromatic';

export interface ColorScheme {
  type: HarmonyType;
  colors: RGBColor[];
  hexColors: string[];
}

// Generate color harmony based on a base color
export function generateHarmony(baseColor: string | RGBColor, type: HarmonyType): ColorScheme {
  const rgb = typeof baseColor === 'string' ? hexToRgb(baseColor) : baseColor;
  const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
  
  let colors: HSVColor[] = [];
  
  switch (type) {
    case 'complementary':
      colors = [
        hsv,
        { ...hsv, h: (hsv.h + 180) % 360 }
      ];
      break;
      
    case 'triadic':
      colors = [
        hsv,
        { ...hsv, h: (hsv.h + 120) % 360 },
        { ...hsv, h: (hsv.h + 240) % 360 }
      ];
      break;
      
    case 'analogous':
      colors = [
        { ...hsv, h: (hsv.h - 30 + 360) % 360 },
        hsv,
        { ...hsv, h: (hsv.h + 30) % 360 }
      ];
      break;
      
    case 'tetradic':
      colors = [
        hsv,
        { ...hsv, h: (hsv.h + 90) % 360 },
        { ...hsv, h: (hsv.h + 180) % 360 },
        { ...hsv, h: (hsv.h + 270) % 360 }
      ];
      break;
      
    case 'split-complementary':
      colors = [
        hsv,
        { ...hsv, h: (hsv.h + 150) % 360 },
        { ...hsv, h: (hsv.h + 210) % 360 }
      ];
      break;
      
    case 'monochromatic':
      colors = [
        { ...hsv, s: hsv.s * 0.3, v: hsv.v * 0.7 },
        { ...hsv, s: hsv.s * 0.6, v: hsv.v * 0.85 },
        hsv,
        { ...hsv, s: hsv.s * 0.8, v: hsv.v * 1.15 },
        { ...hsv, s: hsv.s * 0.5, v: hsv.v * 1.3 }
      ].map(color => ({
        ...color,
        s: Math.max(0, Math.min(1, color.s)),
        v: Math.max(0, Math.min(1, color.v))
      }));
      break;
  }
  
  const rgbColors = colors.map(color => hsvToRgb(color.h, color.s, color.v));
  const hexColors = rgbColors.map(color => rgbToHex(color.r, color.g, color.b));
  
  return {
    type,
    colors: rgbColors,
    hexColors
  };
}

// Generate random color with controlled properties
export function generateRandomColor(options: {
  hueRange?: [number, number];
  saturationRange?: [number, number];
  valueRange?: [number, number];
} = {}): RGBColor {
  const {
    hueRange = [0, 360],
    saturationRange = [0.3, 1],
    valueRange = [0.3, 1]
  } = options;
  
  const h = hueRange[0] + Math.random() * (hueRange[1] - hueRange[0]);
  const s = saturationRange[0] + Math.random() * (saturationRange[1] - saturationRange[0]);
  const v = valueRange[0] + Math.random() * (valueRange[1] - valueRange[0]);
  
  return hsvToRgb(h, s, v);
}

// Analyze color properties
export function analyzeColor(color: RGBColor): {
  brightness: number;
  saturation: number;
  warmth: number; // -1 (cool) to 1 (warm)
  contrast: number;
} {
  const hsv = rgbToHsv(color.r, color.g, color.b);
  
  // Calculate perceived brightness using luminance formula
  const brightness = 0.299 * color.r + 0.587 * color.g + 0.114 * color.b;
  
  // Warmth based on hue (red/orange = warm, blue/cyan = cool)
  let warmth = 0;
  if (hsv.h >= 0 && hsv.h <= 60) warmth = 1 - (hsv.h / 60) * 0.5; // Red to yellow
  else if (hsv.h > 60 && hsv.h <= 120) warmth = 0.5 - (hsv.h - 60) / 60; // Yellow to green
  else if (hsv.h > 120 && hsv.h <= 180) warmth = -0.5 - (hsv.h - 120) / 60 * 0.5; // Green to cyan
  else if (hsv.h > 180 && hsv.h <= 240) warmth = -1; // Cyan to blue
  else if (hsv.h > 240 && hsv.h <= 300) warmth = -0.5 + (hsv.h - 240) / 60 * 0.5; // Blue to magenta
  else warmth = 0.5 + (hsv.h - 300) / 60 * 0.5; // Magenta to red
  
  return {
    brightness,
    saturation: hsv.s,
    warmth,
    contrast: brightness > 0.5 ? 1 - brightness : brightness
  };
}

// Generate color palette based on mood/theme
export function generateThemePalette(theme: 'sunset' | 'ocean' | 'forest' | 'cyberpunk' | 'pastel' | 'monochrome'): ColorScheme {
  let colors: RGBColor[] = [];
  
  switch (theme) {
    case 'sunset':
      colors = [
        hexToRgb('#FF6B35'), // Orange
        hexToRgb('#F7931E'), // Yellow-orange
        hexToRgb('#FFE15C'), // Yellow
        hexToRgb('#FF8E72'), // Coral
        hexToRgb('#C73E1D')  // Deep red
      ];
      break;
      
    case 'ocean':
      colors = [
        hexToRgb('#003366'), // Deep blue
        hexToRgb('#004080'), // Blue
        hexToRgb('#0066CC'), // Light blue
        hexToRgb('#3399FF'), // Sky blue
        hexToRgb('#66CCFF')  // Pale blue
      ];
      break;
      
    case 'forest':
      colors = [
        hexToRgb('#0D4F3C'), // Deep green
        hexToRgb('#186F47'), // Forest green
        hexToRgb('#2E8B57'), // Sea green
        hexToRgb('#66CDAA'), // Medium aquamarine
        hexToRgb('#98FB98')  // Pale green
      ];
      break;
      
    case 'cyberpunk':
      colors = [
        hexToRgb('#FF0080'), // Hot pink
        hexToRgb('#00FFFF'), // Cyan
        hexToRgb('#8000FF'), // Purple
        hexToRgb('#FFFF00'), // Yellow
        hexToRgb('#FF4000')  // Red-orange
      ];
      break;
      
    case 'pastel':
      colors = [
        hexToRgb('#FFB3DE'), // Pink
        hexToRgb('#B3E5FF'), // Blue
        hexToRgb('#B3FFB3'), // Green
        hexToRgb('#FFFFB3'), // Yellow
        hexToRgb('#E5B3FF')  // Purple
      ];
      break;
      
    case 'monochrome':
      colors = [
        hexToRgb('#000000'), // Black
        hexToRgb('#404040'), // Dark gray
        hexToRgb('#808080'), // Gray
        hexToRgb('#C0C0C0'), // Light gray
        hexToRgb('#FFFFFF')  // White
      ];
      break;
  }
  
  return {
    type: 'monochromatic',
    colors,
    hexColors: colors.map(color => rgbToHex(color.r, color.g, color.b))
  };
}

// Find best color combinations for gradients
export function suggestGradientColors(baseColor: string | RGBColor, count: number = 3): RGBColor[] {
  const rgb = typeof baseColor === 'string' ? hexToRgb(baseColor) : baseColor;
  const analysis = analyzeColor(rgb);
  
  // Generate complementary colors with slight variations
  const harmony = generateHarmony(rgb, 'analogous');
  const colors = [...harmony.colors];
  
  // Add variations based on color analysis
  while (colors.length < count) {
    const variation = generateRandomColor({
      hueRange: [0, 360],
      saturationRange: [analysis.saturation * 0.7, Math.min(1, analysis.saturation * 1.3)],
      valueRange: [analysis.brightness * 0.7, Math.min(1, analysis.brightness * 1.3)]
    });
    colors.push(variation);
  }
  
  return colors.slice(0, count);
}