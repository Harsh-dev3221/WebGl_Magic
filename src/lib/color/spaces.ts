// Color space conversion utilities for professional gradient control

export interface HSVColor {
  h: number; // 0-360
  s: number; // 0-1
  v: number; // 0-1
}

export interface LABColor {
  l: number; // 0-100
  a: number; // -128 to 127
  b: number; // -128 to 127
}

export interface RGBColor {
  r: number; // 0-1
  g: number; // 0-1
  b: number; // 0-1
}

export interface XYZColor {
  x: number;
  y: number;
  z: number;
}

// RGB to HSV conversion
export function rgbToHsv(r: number, g: number, b: number): HSVColor {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;
  
  let h = 0;
  if (diff !== 0) {
    if (max === r) h = ((g - b) / diff) % 6;
    else if (max === g) h = (b - r) / diff + 2;
    else h = (r - g) / diff + 4;
  }
  h = Math.round(h * 60);
  if (h < 0) h += 360;
  
  const s = max === 0 ? 0 : diff / max;
  const v = max;
  
  return { h, s, v };
}

// HSV to RGB conversion
export function hsvToRgb(h: number, s: number, v: number): RGBColor {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  
  let r = 0, g = 0, b = 0;
  
  if (h >= 0 && h < 60) {
    r = c; g = x; b = 0;
  } else if (h >= 60 && h < 120) {
    r = x; g = c; b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0; g = c; b = x;
  } else if (h >= 180 && h < 240) {
    r = 0; g = x; b = c;
  } else if (h >= 240 && h < 300) {
    r = x; g = 0; b = c;
  } else if (h >= 300 && h < 360) {
    r = c; g = 0; b = x;
  }
  
  return {
    r: r + m,
    g: g + m,
    b: b + m
  };
}

// RGB to XYZ conversion (D65 illuminant)
export function rgbToXyz(r: number, g: number, b: number): XYZColor {
  // Apply gamma correction
  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;
  
  // Apply transformation matrix
  const x = r * 0.4124564 + g * 0.3575761 + b * 0.1804375;
  const y = r * 0.2126729 + g * 0.7151522 + b * 0.0721750;
  const z = r * 0.0193339 + g * 0.1191920 + b * 0.9503041;
  
  return { x, y, z };
}

// XYZ to LAB conversion
export function xyzToLab(x: number, y: number, z: number): LABColor {
  // D65 white point
  const xn = 0.95047;
  const yn = 1.00000;
  const zn = 1.08883;
  
  x = x / xn;
  y = y / yn;
  z = z / zn;
  
  const fx = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x + 16/116);
  const fy = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y + 16/116);
  const fz = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z + 16/116);
  
  const l = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const b = 200 * (fy - fz);
  
  return { l, a, b };
}

// RGB to LAB conversion (convenience function)
export function rgbToLab(r: number, g: number, b: number): LABColor {
  const xyz = rgbToXyz(r, g, b);
  return xyzToLab(xyz.x, xyz.y, xyz.z);
}

// LAB to XYZ conversion
export function labToXyz(l: number, a: number, b: number): XYZColor {
  const fy = (l + 16) / 116;
  const fx = a / 500 + fy;
  const fz = fy - b / 200;
  
  const x = fx > 0.206897 ? Math.pow(fx, 3) : (fx - 16/116) / 7.787;
  const y = fy > 0.206897 ? Math.pow(fy, 3) : (fy - 16/116) / 7.787;
  const z = fz > 0.206897 ? Math.pow(fz, 3) : (fz - 16/116) / 7.787;
  
  // D65 white point
  return {
    x: x * 0.95047,
    y: y * 1.00000,
    z: z * 1.08883
  };
}

// XYZ to RGB conversion
export function xyzToRgb(x: number, y: number, z: number): RGBColor {
  // Apply inverse transformation matrix
  let r = x * 3.2404542 + y * -1.5371385 + z * -0.4985314;
  let g = x * -0.9692660 + y * 1.8760108 + z * 0.0415560;
  let b = x * 0.0556434 + y * -0.2040259 + z * 1.0572252;
  
  // Apply inverse gamma correction
  r = r > 0.0031308 ? 1.055 * Math.pow(r, 1/2.4) - 0.055 : 12.92 * r;
  g = g > 0.0031308 ? 1.055 * Math.pow(g, 1/2.4) - 0.055 : 12.92 * g;
  b = b > 0.0031308 ? 1.055 * Math.pow(b, 1/2.4) - 0.055 : 12.92 * b;
  
  return {
    r: Math.max(0, Math.min(1, r)),
    g: Math.max(0, Math.min(1, g)),
    b: Math.max(0, Math.min(1, b))
  };
}

// LAB to RGB conversion (convenience function)
export function labToRgb(l: number, a: number, b: number): RGBColor {
  const xyz = labToXyz(l, a, b);
  return xyzToRgb(xyz.x, xyz.y, xyz.z);
}

// Color interpolation in different spaces
export function interpolateRGB(color1: RGBColor, color2: RGBColor, t: number): RGBColor {
  return {
    r: color1.r + (color2.r - color1.r) * t,
    g: color1.g + (color2.g - color1.g) * t,
    b: color1.b + (color2.b - color1.b) * t
  };
}

export function interpolateHSV(color1: HSVColor, color2: HSVColor, t: number): HSVColor {
  // Handle hue wraparound
  let h1 = color1.h;
  let h2 = color2.h;
  
  if (Math.abs(h2 - h1) > 180) {
    if (h2 > h1) h1 += 360;
    else h2 += 360;
  }
  
  let h = h1 + (h2 - h1) * t;
  if (h >= 360) h -= 360;
  if (h < 0) h += 360;
  
  return {
    h,
    s: color1.s + (color2.s - color1.s) * t,
    v: color1.v + (color2.v - color1.v) * t
  };
}

export function interpolateLAB(color1: LABColor, color2: LABColor, t: number): LABColor {
  return {
    l: color1.l + (color2.l - color1.l) * t,
    a: color1.a + (color2.a - color1.a) * t,
    b: color1.b + (color2.b - color1.b) * t
  };
}

// Color harmony generation functions
export function generateColorHarmony(baseColor: RGBColor, type: 'complementary' | 'triadic' | 'analogous' | 'splitComplementary'): RGBColor[] {
  const hsv = rgbToHsv(baseColor.r, baseColor.g, baseColor.b);
  const colors: RGBColor[] = [baseColor];

  switch (type) {
    case 'complementary':
      colors.push(hsvToRgb((hsv.h + 180) % 360, hsv.s, hsv.v));
      break;
      
    case 'triadic':
      colors.push(
        hsvToRgb((hsv.h + 120) % 360, hsv.s, hsv.v),
        hsvToRgb((hsv.h + 240) % 360, hsv.s, hsv.v)
      );
      break;
      
    case 'analogous':
      colors.push(
        hsvToRgb((hsv.h + 30) % 360, hsv.s, hsv.v),
        hsvToRgb((hsv.h - 30 + 360) % 360, hsv.s, hsv.v)
      );
      break;
      
    case 'splitComplementary':
      colors.push(
        hsvToRgb((hsv.h + 150) % 360, hsv.s, hsv.v),
        hsvToRgb((hsv.h + 210) % 360, hsv.s, hsv.v)
      );
      break;
  }

  return colors;
}

// Enhanced color temperature conversion
export function colorTemperatureToRgb(kelvin: number): RGBColor {
  const temp = kelvin / 100;

  let red: number, green: number, blue: number;

  if (temp <= 66) {
    red = 255;
    green = temp;
    green = 99.4708025861 * Math.log(green) - 161.1195681661;
    
    if (temp >= 19) {
      blue = temp - 10;
      blue = 138.5177312231 * Math.log(blue) - 305.0447927307;
    } else {
      blue = 0;
    }
  } else {
    red = temp - 60;
    red = 329.698727446 * Math.pow(red, -0.1332047592);
    
    green = temp - 60;
    green = 288.1221695283 * Math.pow(green, -0.0755148492);
    
    blue = 255;
  }

  return {
    r: Math.max(0, Math.min(255, red)) / 255,
    g: Math.max(0, Math.min(255, green)) / 255,
    b: Math.max(0, Math.min(255, blue)) / 255
  };
}

// Convert hex string to RGB
export function hexToRgb(hex: string): RGBColor {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) throw new Error(`Invalid hex color: ${hex}`);
  
  return {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255
  };
}

// Convert RGB to hex string
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.round(n * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Perceptually uniform color distance (Delta E CIE76 approximation)
export function colorDistance(color1: LABColor, color2: LABColor): number {
  const deltaL = color1.l - color2.l;
  const deltaA = color1.a - color2.a;
  const deltaB = color1.b - color2.b;
  
  return Math.sqrt(deltaL * deltaL + deltaA * deltaA + deltaB * deltaB);
}