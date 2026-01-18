import { ALL_MOODS, type Mood } from "./types";
import { hslToRgb, parseHslToken, rgbToOklch, type OKLCH } from "./color";

export type ResolvedMoodColors = {
  mood: Mood;
  hsl1: string;
  hsl2: string;
  hsl3: string;
  ok1: OKLCH;
  ok2: OKLCH;
  ok3: OKLCH;
};

let cache = new Map<Mood, ResolvedMoodColors>();
let initialized = false;
let initPromise: Promise<void> | null = null;

function readTokens(mood: Mood): ResolvedMoodColors | null {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return null;
  }

  const wrapper = document.createElement("div");
  wrapper.style.position = "absolute";
  wrapper.style.visibility = "hidden";
  wrapper.style.pointerEvents = "none";
  wrapper.style.inset = "-9999px auto auto -9999px";
  wrapper.className = "moodbloom-theme";

  const probe = document.createElement("div");
  probe.className = `theme-${mood}`;
  wrapper.appendChild(probe);

  document.body.appendChild(wrapper);
  try {
    const styles = window.getComputedStyle(probe);
    const raw1 = (styles.getPropertyValue("--mood-1") || "").trim();
    const raw2 = (styles.getPropertyValue("--mood-2") || "").trim();
    const raw3 = (styles.getPropertyValue("--mood-3") || "").trim();

    const hsl1 = raw1 || "0 0% 50%";
    const hsl2 = raw2 || hsl1;
    const hsl3 = raw3 || hsl2;

    const ok1 = rgbToOklch(hslToRgb(parseHslToken(hsl1)));
    const ok2 = rgbToOklch(hslToRgb(parseHslToken(hsl2)));
    const ok3 = rgbToOklch(hslToRgb(parseHslToken(hsl3)));

    return { mood, hsl1, hsl2, hsl3, ok1, ok2, ok3 };
  } finally {
    document.body.removeChild(wrapper);
  }
}

export function initTokenCache(): Promise<void> {
  if (initialized) {
    return Promise.resolve();
  }
  if (initPromise) {
    return initPromise;
  }
  if (typeof window === "undefined" || typeof document === "undefined") {
    initialized = true;
    return Promise.resolve();
  }

  initPromise = new Promise<void>((resolve) => {
    const schedule =
      typeof window !== "undefined" && typeof window.requestAnimationFrame === "function"
        ? window.requestAnimationFrame.bind(window)
        : (cb: FrameRequestCallback) => {
            const now = typeof performance !== "undefined" ? performance.now() : Date.now();
            setTimeout(() => cb(now), 16);
          };

    schedule(() => {
      const next = new Map<Mood, ResolvedMoodColors>();
      for (const mood of ALL_MOODS) {
        const resolved = readTokens(mood);
        if (resolved) {
          next.set(mood, resolved);
        }
      }
      cache = next;
      initialized = true;
      resolve();
    });
  });

  return initPromise;
}

export function getMoodColors(mood: Mood): ResolvedMoodColors | undefined {
  return cache.get(mood);
}

export function isTokenCacheReady(): boolean {
  return initialized;
}

export function getAllMoodColors(): Map<Mood, ResolvedMoodColors> {
  return new Map(cache);
}

/**
 * Invalidate cached colors for a specific mood or all moods
 * Forces re-reading from CSS on next access
 */
export function invalidateCache(mood?: Mood): void {
  if (mood) {
    cache.delete(mood);
  } else {
    cache.clear();
  }
}

/**
 * Refresh cached colors by re-reading from CSS
 * Call this when tokens have been updated
 */
export function refreshCache(mood?: Mood): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  if (mood) {
    // Refresh specific mood
    const resolved = readTokens(mood);
    if (resolved) {
      cache.set(mood, resolved);
    }
  } else {
    // Refresh all moods
    const next = new Map<Mood, ResolvedMoodColors>();
    for (const m of ALL_MOODS) {
      const resolved = readTokens(m);
      if (resolved) {
        next.set(m, resolved);
      }
    }
    cache = next;
  }
}

/**
 * Read live tokens from CSS for a specific mood
 * Bypasses cache for real-time updates
 */
export function readLiveTokens(mood: Mood): ResolvedMoodColors | null {
  return readTokens(mood);
}

// Auto-refresh cache when tokens change
if (typeof window !== "undefined") {
  window.addEventListener("moodtokenschange", () => {
    // Refresh all cached moods
    refreshCache();
  });
}

