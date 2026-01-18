import { APCAcontrast, sRGBtoY } from "apca-w3";
export type HSL = { h: number; s: number; l: number };
export type RGB = { r: number; g: number; b: number };

// Parse tokens like "210 40% 98%" (no hsl()) into HSL numbers
export function parseHslToken(token: string): HSL {
  const cleaned = token.trim().replace(/\s+/g, " ");
  const m = cleaned.match(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%/);
  if (!m) return { h: 0, s: 0, l: 0 };
  return { h: Number(m[1]), s: Number(m[2]), l: Number(m[3]) };
}

export function hslToRgb({ h, s, l }: HSL): RGB {
  const S = s / 100;
  const L = l / 100;
  const C = (1 - Math.abs(2 * L - 1)) * S;
  const Hp = (h % 360 + 360) % 360 / 60;
  const X = C * (1 - Math.abs((Hp % 2) - 1));
  let r1 = 0, g1 = 0, b1 = 0;
  if (0 <= Hp && Hp < 1) { r1 = C; g1 = X; b1 = 0; }
  else if (1 <= Hp && Hp < 2) { r1 = X; g1 = C; b1 = 0; }
  else if (2 <= Hp && Hp < 3) { r1 = 0; g1 = C; b1 = X; }
  else if (3 <= Hp && Hp < 4) { r1 = 0; g1 = X; b1 = C; }
  else if (4 <= Hp && Hp < 5) { r1 = X; g1 = 0; b1 = C; }
  else { r1 = C; g1 = 0; b1 = X; }
  const m = L - C / 2;
  return { r: Math.round((r1 + m) * 255), g: Math.round((g1 + m) * 255), b: Math.round((b1 + m) * 255) };
}

export function rgbToLuminance({ r, g, b }: RGB): number {
  // sRGB to linear
  const srgb = [r, g, b].map(v => v / 255);
  const linear = srgb.map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  const [R, G, B] = linear as [number, number, number];
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

export function contrastRatio(l1: number, l2: number): number {
  const L1 = Math.max(l1, l2);
  const L2 = Math.min(l1, l2);
  return (L1 + 0.05) / (L2 + 0.05);
}

export function hslString(hsl: HSL): string {
  return `${Math.round(hsl.h)} ${round1(hsl.s)}% ${round1(hsl.l)}%`;
}

function round1(n: number) { return Math.round(n * 10) / 10; }

export function averageRgb(colors: RGB[]): RGB {
  const n = colors.length || 1;
  const r = Math.round(colors.reduce((a, c) => a + c.r, 0) / n);
  const g = Math.round(colors.reduce((a, c) => a + c.g, 0) / n);
  const b = Math.round(colors.reduce((a, c) => a + c.b, 0) / n);
  return { r, g, b };
}

// Alpha blend foreground over background
export function blendRgb(fg: RGB, bg: RGB, alpha: number): RGB {
  const a = Math.max(0, Math.min(1, alpha));
  const r = Math.round(fg.r * a + bg.r * (1 - a));
  const g = Math.round(fg.g * a + bg.g * (1 - a));
  const b = Math.round(fg.b * a + bg.b * (1 - a));
  return { r, g, b };
}

export const WHITE_HSL: HSL = { h: 0, s: 0, l: 100 };
export const NEAR_WHITE_HSL: HSL = { h: 0, s: 0, l: 98 };
export const BLACK_HSL: HSL = { h: 0, s: 0, l: 0 };
export const NEAR_BLACK_HSL: HSL = { h: 0, s: 0, l: 10 };

// --- OKLab / OKLCH Types ---
export type OKLab = { L: number; a: number; b: number };
export type OKLCH = { L: number; C: number; h: number };

// --- Helpers ---
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const clamp255 = (x: number) => Math.min(255, Math.max(0, Math.round(x)));
const degToRad = (d: number) => (d * Math.PI) / 180;
const radToDeg = (r: number) => (r * 180) / Math.PI;
const wrapDeg = (d: number) => ((d % 360) + 360) % 360;

// --- sRGB <-> linear ---
function srgbToLinear(v: number): number {
  const s = v / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}
function linearToSrgb(v: number): number {
  return v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
}

// --- sRGB -> OKLab/OKLCH ---
export function rgbToOklch(rgb: RGB): OKLCH {
  const r = srgbToLinear(rgb.r);
  const g = srgbToLinear(rgb.g);
  const b = srgbToLinear(rgb.b);

  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
  const b2 = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;

  const C = Math.sqrt(a * a + b2 * b2);
  const h = wrapDeg(radToDeg(Math.atan2(b2, a)));
  return { L, C, h };
}

// --- OKLCH -> sRGB ---
export function oklchToRgb(ok: OKLCH): RGB {
  const { L, C, h } = ok;
  const a = C * Math.cos(degToRad(h));
  const b = C * Math.sin(degToRad(h));

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const rl = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const gl = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bl = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  const r = clamp255(linearToSrgb(rl) * 255);
  const g = clamp255(linearToSrgb(gl) * 255);
  const b3 = clamp255(linearToSrgb(bl) * 255);
  return { r, g, b: b3 };
}

// --- RGB -> HSL (for emitting tokens) ---
export function rgbToHsl({ r, g, b }: RGB): HSL {
  const r1 = r / 255, g1 = g / 255, b1 = b / 255;
  const max = Math.max(r1, g1, b1), min = Math.min(r1, g1, b1);
  let h = 0, s = 0, l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r1: h = (g1 - b1) / d + (g1 < b1 ? 6 : 0); break;
      case g1: h = (b1 - r1) / d + 2; break;
      default: h = (r1 - g1) / d + 4; break;
    }
    h *= 60;
  }
  return { h: h || 0, s: s * 100, l: l * 100 };
}

// --- APCA Lc wrapper ---
export function apcaLc(fg: RGB, bg: RGB): number {
  const tx = [fg.r, fg.g, fg.b, 1.0] as [number, number, number, number];
  const bgc = [bg.r, bg.g, bg.b, 1.0] as [number, number, number, number];
  return APCAcontrast(sRGBtoY(tx), sRGBtoY(bgc));
}

// --- Neutral text picker using OKLCH + APCA ---
export function pickNeutralTextForBackgroundsAPCA(
  backgrounds: RGB[],
  targetLc: number = 60
): { rgb: RGB; lc: number; polarity: "light" | "dark" } {
  // grid search over two ranges for stability
  const ranges: Array<{ from: number; to: number; step: number; polarity: "light"|"dark" }> = [
    { from: 60, to: 100, step: 1, polarity: "light" },
    { from: 0, to: 40, step: 1, polarity: "dark" },
  ];

  let best: { rgb: RGB; lc: number; polarity: "light" | "dark" } = { rgb: { r: 255, g: 255, b: 255 }, lc: -Infinity, polarity: "light" };
  for (const range of ranges) {
    for (let L = range.from; L <= range.to; L += range.step) {
      const candidate = oklchToRgb({ L: L / 100, C: 0, h: 0 }); // true neutral
      // compute worst-case absolute Lc across all backgrounds
      const minAbsLc = backgrounds.reduce((min, bg) => {
        const lc = Math.abs(apcaLc(candidate, bg));
        return Math.min(min, lc);
      }, Infinity);
      if (minAbsLc > best.lc) {
        best = { rgb: candidate, lc: minAbsLc, polarity: range.polarity };
      }
      if (minAbsLc >= targetLc) {
        // early exit if we meet target with good margin
        best = { rgb: candidate, lc: minAbsLc, polarity: range.polarity };
        // keep searching current range to potentially improve, but we could also break here
      }
    }
  }

  return best;
}

// --- OKLCH Interpolation for Mood Transitions ---

/**
 * Interpolate between two OKLCH colors
 * @param from Starting color in OKLCH
 * @param to Target color in OKLCH
 * @param t Progress (0-1)
 * @returns Interpolated OKLCH color
 */
export function interpolateOKLCH(from: OKLCH, to: OKLCH, t: number): OKLCH {
  // Clamp t to 0-1
  const progress = Math.max(0, Math.min(1, t));
  
  // Interpolate lightness and chroma linearly
  const L = from.L + (to.L - from.L) * progress;
  const C = from.C + (to.C - from.C) * progress;
  
  // Handle hue interpolation (shortest path around the circle)
  let h1 = from.h;
  let h2 = to.h;
  let hDiff = h2 - h1;
  
  // Find shortest path around the color wheel
  if (hDiff > 180) hDiff -= 360;
  if (hDiff < -180) hDiff += 360;
  
  const h = wrapDeg(h1 + hDiff * progress);
  
  return { L, C, h };
}

/**
 * Convert HSL string (e.g., "46 65% 72%") to OKLCH
 */
export function hslTokenToOKLCH(hslToken: string): OKLCH {
  const hsl = parseHslToken(hslToken);
  const rgb = hslToRgb(hsl);
  return rgbToOklch(rgb);
}

/**
 * Convert OKLCH to HSL string token
 */
export function oklchToHslToken(oklch: OKLCH): string {
  const rgb = oklchToRgb(oklch);
  const hsl = rgbToHsl(rgb);
  return hslString(hsl);
}

/**
 * Calculate the maximum distance from a point to viewport corners
 * @param x X position as percentage (0-100)
 * @param y Y position as percentage (0-100)
 * @returns Maximum distance as percentage
 */
export function calculateMaxDistance(x: number, y: number): number {
  // Calculate distances to all four corners
  const distances = [
    Math.sqrt(x * x + y * y),                           // Top-left
    Math.sqrt((100 - x) * (100 - x) + y * y),          // Top-right
    Math.sqrt(x * x + (100 - y) * (100 - y)),          // Bottom-left
    Math.sqrt((100 - x) * (100 - x) + (100 - y) * (100 - y)) // Bottom-right
  ];
  
  return Math.max(...distances);
}

/**
 * Boost saturation of OKLCH color for impact effect
 * @param color OKLCH color
 * @param boost Amount to boost (1.0 = no boost, 1.5 = 50% more saturated)
 * @returns Boosted OKLCH color
 */
function boostSaturation(color: OKLCH, boost: number): OKLCH {
  return {
    L: color.L,
    C: Math.min(0.4, color.C * boost), // Cap at 0.4 to stay in gamut
    h: color.h
  };
}

/**
 * Generate gradient stops for enhanced ink drop effect
 * @param fromColors Starting mood colors (mood-1, mood-2, mood-3)
 * @param toColors Target mood colors
 * @param progress Animation progress (0-1)
 * @param originX Click origin X as percentage
 * @param originY Click origin Y as percentage
 * @returns Array of gradient stops with positions and colors
 */
export function generateRadialBurstStops(
  fromColors: { color1: string; color2: string; color3?: string },
  toColors: { color1: string; color2: string; color3?: string },
  progress: number,
  originX: number = 50,
  originY: number = 50
): Array<{ position: number; color: string }> {
  // If progress is 1 and colors are the same, generate a static radial gradient
  const isStatic = progress >= 1 && 
    fromColors.color1 === toColors.color1 && 
    fromColors.color2 === toColors.color2;
  
  if (isStatic) {
    // Generate a nice radial gradient for the current mood
    const color1 = hslTokenToOKLCH(toColors.color1);
    const color2 = hslTokenToOKLCH(toColors.color2);
    const color3 = toColors.color3 ? hslTokenToOKLCH(toColors.color3) : color2;
    
    const rgb1 = oklchToRgb(color1);
    const rgb2 = oklchToRgb(color2);
    const rgb3 = oklchToRgb(color3);
    
    return [
      { position: 0, color: `rgb(${rgb1.r}, ${rgb1.g}, ${rgb1.b})` },
      { position: 30, color: `rgb(${rgb3.r}, ${rgb3.g}, ${rgb3.b})` },
      { position: 70, color: `rgb(${rgb2.r}, ${rgb2.g}, ${rgb2.b})` },
      { position: 100, color: `rgb(${rgb1.r}, ${rgb1.g}, ${rgb1.b})` }
    ];
  }
  // Convert HSL tokens to OKLCH
  const from1 = hslTokenToOKLCH(fromColors.color1);
  const from2 = hslTokenToOKLCH(fromColors.color2);
  const from3 = fromColors.color3 ? hslTokenToOKLCH(fromColors.color3) : from2;
  
  const to1 = hslTokenToOKLCH(toColors.color1);
  const to2 = hslTokenToOKLCH(toColors.color2);
  const to3 = toColors.color3 ? hslTokenToOKLCH(toColors.color3) : to2;
  
  // Calculate the maximum distance needed to cover the entire viewport
  const maxDistance = calculateMaxDistance(originX, originY);
  
  // Force complete transition at high progress values
  if (progress >= 0.95) {
    // At 95%+ progress, skip interpolation and use pure target colors
    const rgb1 = oklchToRgb(to1);
    const rgb2 = oklchToRgb(to2);
    const rgb3 = oklchToRgb(to3);
    
    return [
      { position: 0, color: `rgb(${rgb1.r}, ${rgb1.g}, ${rgb1.b})` },
      { position: 35, color: `rgb(${rgb3.r}, ${rgb3.g}, ${rgb3.b})` },
      { position: 70, color: `rgb(${rgb2.r}, ${rgb2.g}, ${rgb2.b})` },
      { position: 100, color: `rgb(${rgb1.r}, ${rgb1.g}, ${rgb1.b})` }
    ];
  }
  
  // Multi-phase animation for ink drop effect
  // Phase 1: Impact (0-0.05) - concentrated burst at origin
  // Phase 2: Splash (0.05-0.15) - rapid expansion with high saturation
  // Phase 3: Wave (0.15-1.0) - smooth propagation across viewport
  
  let waveRadius: number;
  let saturationBoost: number;
  let transitionZoneWidth: number;
  
  if (progress < 0.05) {
    // Impact phase - small, intense burst
    const impactProgress = progress / 0.05;
    waveRadius = impactProgress * 10; // Quickly expand to 10% radius
    saturationBoost = 1.8; // Very saturated at impact point
    transitionZoneWidth = 2; // Ultra-sharp edge
  } else if (progress < 0.15) {
    // Splash phase - rapid expansion with high saturation
    const splashProgress = (progress - 0.05) / 0.1;
    const easedSplash = 1 - Math.pow(1 - splashProgress, 2);
    waveRadius = 10 + easedSplash * 25; // Expand from 10% to 35%
    saturationBoost = 1.8 - (splashProgress * 0.5); // Fade saturation from 1.8 to 1.3
    transitionZoneWidth = 2 + splashProgress * 2; // Gradually soften edge from 2% to 4%
  } else {
    // Wave phase - continue to full coverage
    const waveProgress = (progress - 0.15) / 0.85;
    const easedWave = 1 - Math.pow(1 - waveProgress, 2.5);
    waveRadius = 35 + easedWave * (maxDistance * 2 - 35); // Cover 200% for complete fill
    saturationBoost = 1.3 - (waveProgress * 0.3); // Gradually return to normal saturation
    transitionZoneWidth = 4 + waveProgress * 2; // Soften edge as wave expands
  }
  
  const stops: Array<{ position: number; color: string }> = [];
  
  // Inner zone - pure new mood with saturation boost at center
  if (waveRadius > 0) {
    // Apply saturation boost for ink drop effect
    const boostedTo1 = boostSaturation(to1, saturationBoost);
    const boostedTo2 = boostSaturation(to2, saturationBoost * 0.9);
    const boostedTo3 = boostSaturation(to3, saturationBoost * 0.95);
    
    // Center point - most saturated
    const centerColor = oklchToRgb(boostedTo1);
    stops.push({
      position: 0,
      color: `rgb(${centerColor.r}, ${centerColor.g}, ${centerColor.b})`
    });
    
    // Add gradient layers within the burst area
    if (waveRadius > 5) {
      // Inner gradient for depth
      const innerColor = oklchToRgb(boostedTo3);
      stops.push({
        position: Math.min(waveRadius * 0.3, waveRadius - transitionZoneWidth - 1),
        color: `rgb(${innerColor.r}, ${innerColor.g}, ${innerColor.b})`
      });
    }
    
    if (waveRadius > 15) {
      // Mid-zone gradient
      const midColor = oklchToRgb(boostSaturation(to2, saturationBoost * 0.8));
      stops.push({
        position: Math.min(waveRadius * 0.6, waveRadius - transitionZoneWidth - 1),
        color: `rgb(${midColor.r}, ${midColor.g}, ${midColor.b})`
      });
    }
    
    // Edge of new mood zone - less saturated
    const edgeColor = oklchToRgb(to2);
    stops.push({
      position: Math.max(0, waveRadius - transitionZoneWidth),
      color: `rgb(${edgeColor.r}, ${edgeColor.g}, ${edgeColor.b})`
    });
  }
  
  // Transition zone - sharp wave front
  if (waveRadius > 0 && waveRadius < maxDistance * 1.5) {
    // Create sharp wave front with minimal blending
    // Use aggressive interpolation for cleaner transition
    const waveProgress = Math.min(1, progress * 1.2); // Accelerate transition
    const blendColor = interpolateOKLCH(from1, to1, 0.7 + waveProgress * 0.3);
    const blendRgb = oklchToRgb(blendColor);
    
    stops.push({
      position: Math.min(waveRadius, 100),
      color: `rgb(${blendRgb.r}, ${blendRgb.g}, ${blendRgb.b})`
    });
  }
  
  // Outer zone - old mood
  if (waveRadius < maxDistance) {
    // End of transition zone - start of old mood
    const oldColor1 = oklchToRgb(from1);
    stops.push({
      position: Math.min(waveRadius + transitionZoneWidth, 100),
      color: `rgb(${oldColor1.r}, ${oldColor1.g}, ${oldColor1.b})`
    });
    
    // Add gradient variety in old mood area
    if (waveRadius + transitionZoneWidth + 20 < 100) {
      const oldColor3 = oklchToRgb(from3);
      stops.push({
        position: Math.min(waveRadius + transitionZoneWidth + 20, 90),
        color: `rgb(${oldColor3.r}, ${oldColor3.g}, ${oldColor3.b})`
      });
    }
    
    // Outer edge
    const oldColor2 = oklchToRgb(from2);
    stops.push({
      position: 100,
      color: `rgb(${oldColor2.r}, ${oldColor2.g}, ${oldColor2.b})`
    });
  } else {
    // Wave has covered everything - all new mood
    const newColor2 = oklchToRgb(to2);
    stops.push({
      position: 100,
      color: `rgb(${newColor2.r}, ${newColor2.g}, ${newColor2.b})`
    });
  }
  
  return stops;
}

/**
 * Generate gradient stops for radial push effect
 * @deprecated Use generateRadialBurstStops instead
 */
export function generateRadialGradientStops(
  fromColors: { color1: string; color2: string; color3?: string },
  toColors: { color1: string; color2: string; color3?: string },
  progress: number,
  numStops: number = 7
): Array<{ position: number; color: string }> {
  // Fallback to burst with default center
  return generateRadialBurstStops(fromColors, toColors, progress, 50, 50);
}

// --- Accent (hued) text picker using HSL hue and APCA floors ---
export function pickAccentTextForBackgroundsAPCA(
  backgrounds: RGB[],
  targetLc: number,
  hue: number,
  saturation: number = 12,
  options?: { prefer?: "subtle" | "aggressive" }
): { rgb: RGB; lc: number; polarity: "light" | "dark" } {
  const sat = Math.max(0, Math.min(100, saturation));
  const prefer = options?.prefer ?? "subtle";
  const ranges: Array<{ lo: number; hi: number; polarity: "light" | "dark" }> = [
    { lo: 62, hi: 98, polarity: "light" },
    { lo: 2, hi: 38, polarity: "dark" },
  ];

  let best: { rgb: RGB; lc: number; polarity: "light" | "dark" } = { rgb: { r: 255, g: 255, b: 255 }, lc: -Infinity, polarity: "light" };
  let bestMeeting: { rgb: RGB; lc: number; polarity: "light" | "dark" } | null = null;

  for (const r of ranges) {
    let lo = r.lo;
    let hi = r.hi;
    let candidate: RGB = hslToRgb({ h: hue, s: sat, l: (lo + hi) / 2 });
    let minAbsLc = 0;

    // binary search ~9 iterations
    for (let i = 0; i < 9; i++) {
      const mid = (lo + hi) / 2;
      candidate = hslToRgb({ h: hue, s: sat, l: mid });
      minAbsLc = backgrounds.reduce((min, bg) => {
        const lc = Math.abs(apcaLc(candidate, bg));
        return Math.min(min, lc);
      }, Infinity);

      if (minAbsLc >= targetLc) {
        // we can try to move closer to center (reduce contrast) while staying >= target
        if (r.polarity === "light") hi = mid; else lo = mid;
        bestMeeting = { rgb: candidate, lc: minAbsLc, polarity: r.polarity };
      } else {
        // need more contrast: move outward
        if (r.polarity === "light") lo = mid; else hi = mid;
      }
    }

  
    // track best overall
    if (!bestMeeting) {
      if (minAbsLc > best.lc) best = { rgb: candidate, lc: minAbsLc, polarity: r.polarity };
    }
  }

  if (bestMeeting) {
    // If both polarities met, choose based on preference
    const otherRange = bestMeeting.polarity === "light" ? { lo: 2, hi: 38, polarity: "dark" as const } : { lo: 62, hi: 98, polarity: "light" as const };
    let lo = otherRange.lo, hi = otherRange.hi;
    let meetOther: { rgb: RGB; lc: number; polarity: "light" | "dark" } | null = null;
    for (let i = 0; i < 9; i++) {
      const mid = (lo + hi) / 2;
      const cand = hslToRgb({ h: hue, s: sat, l: mid });
      const minAbsLc = backgrounds.reduce((min, bg) => Math.min(min, Math.abs(apcaLc(cand, bg))), Infinity);
      if (minAbsLc >= targetLc) { if (otherRange.polarity === "light") hi = mid; else lo = mid; meetOther = { rgb: cand, lc: minAbsLc, polarity: otherRange.polarity }; }
      else { if (otherRange.polarity === "light") lo = mid; else hi = mid; }
    }

    if (meetOther) {
      if (prefer === "aggressive") {
        // pick the higher contrast option
        return meetOther.lc > bestMeeting.lc ? meetOther : bestMeeting;
      } else {
        // subtle: pick closer to target (lower lc)
        return meetOther.lc < bestMeeting.lc ? meetOther : bestMeeting;
      }
    }
    return bestMeeting;
  }

  // If we couldn't meet target on either side, return best effort
  return best;
}

// Derive a vibrant accent token from two mood stops.
// Uses OKLCH for stable hue/chroma/lightness handling and returns an HSL token string.
export function deriveAccentFromTokens(m1: HSL, m2: HSL): HSL {
  // Convert to OKLCH
  const ok1 = rgbToOklch(hslToRgb(m1));
  const ok2 = rgbToOklch(hslToRgb(m2));

  // Circular average hue
  const x = Math.cos(degToRad(ok1.h)) + Math.cos(degToRad(ok2.h));
  const y = Math.sin(degToRad(ok1.h)) + Math.sin(degToRad(ok2.h));
  const h = wrapDeg(radToDeg(Math.atan2(y, x)));

  // Boost chroma a bit; keep in a safe gamut range
  const baseC = (ok1.C + ok2.C) / 2;
  const C = Math.min(0.32, baseC * 1.1 + 0.015);

  // Slightly deepen L to add richness but keep it luminous
  const baseL = (ok1.L + ok2.L) / 2;
  const L = clamp01(baseL * 0.98 + 0.01);

  const rgb = oklchToRgb({ L, C, h });
  const out = rgbToHsl(rgb);
  out.s = Math.max(36, Math.min(80, out.s));
  out.l = Math.max(40, Math.min(68, out.l));
  return out;
}

