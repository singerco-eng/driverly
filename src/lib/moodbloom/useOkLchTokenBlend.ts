import { useEffect, useRef } from "react";

type RGB = { r: number; g: number; b: number };
export type BlendTokens = { m1: string; m2: string; m3?: string };

function parseHsl(hsl: string): RGB | null {
  if (typeof window === "undefined" || typeof document === "undefined") return null;
  try {
    const el = document.createElement("div");
    el.style.color = hsl.trim().startsWith("hsl(") ? hsl : `hsl(${hsl})`;
    document.body.appendChild(el);
    const cs = getComputedStyle(el).color;
    document.body.removeChild(el);
    const match = cs.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (!match) return null;
    return { r: +match[1] / 255, g: +match[2] / 255, b: +match[3] / 255 };
  } catch {
    return null;
  }
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const srgbToLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const linearToSrgb = (c: number) => (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);

function rgbToOklab(r: number, g: number, b: number) {
  const rl = srgbToLinear(r);
  const gl = srgbToLinear(g);
  const bl = srgbToLinear(b);

  const l = Math.cbrt(0.4122214708 * rl + 0.5363325363 * gl + 0.0514459929 * bl);
  const m = Math.cbrt(0.2119034982 * rl + 0.6806995451 * gl + 0.1073969566 * bl);
  const s = Math.cbrt(0.0883024619 * rl + 0.2817188376 * gl + 0.6299787005 * bl);

  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { L, A, B };
}

function oklabToRgb(L: number, A: number, B: number): RGB {
  const l = Math.pow(L + 0.3963377774 * A + 0.2158037573 * B, 3);
  const m = Math.pow(L - 0.1055613458 * A - 0.0638541728 * B, 3);
  const s = Math.pow(L - 0.0894841775 * A - 1.291485548 * B, 3);

  const rl = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const gl = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bl = 0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  return {
    r: clamp01(linearToSrgb(rl)),
    g: clamp01(linearToSrgb(gl)),
    b: clamp01(linearToSrgb(bl)),
  };
}

function rgbToOklch(rgb: RGB) {
  const { L, A, B } = rgbToOklab(rgb.r, rgb.g, rgb.b);
  const C = Math.sqrt(A * A + B * B);
  let h = Math.atan2(B, A);
  if (h < 0) h += 2 * Math.PI;
  return { L, C, h };
}

function oklchToRgb(L: number, C: number, h: number): RGB {
  const A = Math.cos(h) * C;
  const B = Math.sin(h) * C;
  return oklabToRgb(L, A, B);
}

function oklchToRgbGamutMapped(L: number, C: number, h: number): RGB {
  const inGamut = (c: RGB) => c.r >= 0 && c.r <= 1 && c.g >= 0 && c.g <= 1 && c.b >= 0 && c.b <= 1;
  let rgb = oklchToRgb(L, C, h);
  if (inGamut(rgb)) return rgb;
  let lo = 0;
  let hi = C;
  for (let i = 0; i < 16; i++) {
    const mid = (lo + hi) / 2;
    rgb = oklchToRgb(L, mid, h);
    if (inGamut(rgb)) lo = mid;
    else hi = mid;
  }
  return oklchToRgb(L, lo, h);
}

const toRgbString = (rgb: RGB) => {
  const to255 = (x: number) => Math.round(clamp01(x) * 255);
  return `rgb(${to255(rgb.r)}, ${to255(rgb.g)}, ${to255(rgb.b)})`;
};

function mixOklch(a: RGB, b: RGB, t: number) {
  const A = rgbToOklch(a);
  const B = rgbToOklch(b);
  let dh = B.h - A.h;
  if (Math.abs(dh) > Math.PI) dh -= Math.sign(dh) * 2 * Math.PI;
  const L = A.L + (B.L - A.L) * t;
  const C = A.C + (B.C - A.C) * t;
  const h = A.h + dh * t;
  return toRgbString(oklchToRgbGamutMapped(L, Math.max(0, C), h));
}

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function startOkLchTokenBlend(container: HTMLElement, from: BlendTokens, to: BlendTokens, durationMs = 1300) {
  const a1 = parseHsl(from.m1);
  const a2 = parseHsl(from.m2);
  const a3 = from.m3 ? parseHsl(from.m3) : null;
  const b1 = parseHsl(to.m1);
  const b2 = parseHsl(to.m2);
  const b3 = to.m3 ? parseHsl(to.m3) : null;

  if (!a1 || !a2 || !b1 || !b2) return () => {};

  let raf: number | null = null;
  let start: number | null = null;
  const baseAngle = 135;
  const angleSwing = 28;
  const midBase = 42;
  const endBase = 92;
  const midSwing = 4;
  const endSwing = 4;
  const speedBoost = 0.85;
  const m3LeadMs = 120;

  const tick = (ts: number) => {
    if (start == null) start = ts;
    const t = Math.min(1, (ts - start) / durationMs);
    const eased = easeInOutCubic(t);

    const angle = baseAngle + Math.sin(eased * Math.PI) * angleSwing;
    const swing = eased < 0.5 ? eased * 2 : 2 - eased * 2;
    const mid = midBase + swing * midSwing;
    const end = endBase + swing * endSwing;

    container.style.setProperty("--grad-angle", `${angle}deg`);
    container.style.setProperty("--stop-mid", `${mid}%`);
    container.style.setProperty("--stop-end", `${end}%`);
    container.style.setProperty("--mood-bg-speed", `${Math.max(20, 28 * speedBoost)}s`);

    const tM3 = Math.min(1, Math.max(0, (ts - (start - m3LeadMs)) / durationMs));
    const easedM3 = easeInOutCubic(tM3);

    const c1 = mixOklch(a1, b1, eased);
    const c2 = mixOklch(a2, b2, eased);
    const c3 = a3 && b3 ? mixOklch(a3, b3, easedM3) : c2;

    container.style.setProperty("--m1-blend", c1);
    container.style.setProperty("--m2-blend", c2);
    container.style.setProperty("--m3-blend", c3);

    if (t < 1) {
      raf = requestAnimationFrame(tick);
    } else {
      queueMicrotask(() => {
        container.style.removeProperty("--m1-blend");
        container.style.removeProperty("--m2-blend");
        container.style.removeProperty("--m3-blend");
        container.style.removeProperty("--grad-angle");
        container.style.removeProperty("--stop-mid");
        container.style.removeProperty("--stop-end");
        container.style.removeProperty("--mood-bg-speed");
      });
    }
  };

  raf = requestAnimationFrame(tick);
  return () => {
    if (raf) cancelAnimationFrame(raf);
  };
}

export function useOkLchTokenBlend(options: {
  container: HTMLElement | null;
  from: BlendTokens;
  to: BlendTokens;
  active: boolean;
  durationMs?: number;
}) {
  const { container, from, to, active, durationMs = 1100 } = options;
  const stopRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!container || !active) return;
    stopRef.current = startOkLchTokenBlend(container, from, to, durationMs);
    return () => stopRef.current();
  }, [container, from, to, active, durationMs]);
}
