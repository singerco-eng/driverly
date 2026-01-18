import type { Mood, MoodColors } from "./types";

/**
 * Moodbloom Color System
 * 
 * 10 moods organized by therapeutic categories
 * Colors use HSL format for consistency with theme system
 */

export const MOOD_COLORS: Record<Mood, MoodColors> = {
  // VIBRANT (high energy, positive)
  // Phase 1: Increased saturation, reduced lightness for richer colors
  happy: {
    primary: "50 98% 62%",      // Bright yellow (was 95% 65%)
    secondary: "160 82% 52%",   // Teal (was 75% 55%)
    gradient: "linear-gradient(135deg, hsl(50 98% 62%), hsl(160 82% 52%))",
  },
  excited: {
    primary: "30 100% 58%",     // Orange (was 100% 60%)
    secondary: "340 92% 58%",   // Pink (was 85% 60%)
    gradient: "linear-gradient(135deg, hsl(30 100% 58%), hsl(340 92% 58%))",
  },
  manic: {
    primary: "285 92% 62%",     // Magenta (was 85% 65%)
    secondary: "335 95% 58%",   // Hot pink (was 90% 60%)
    gradient: "linear-gradient(135deg, hsl(285 92% 62%), hsl(335 95% 58%))",
  },

  // GENTLE (low energy, positive)
  // Phase 1: Increased saturation, reduced lightness
  calm: {
    primary: "200 78% 52%",     // Sky blue (was 70% 55%)
    secondary: "165 68% 48%",   // Seafoam (was 60% 50%)
    gradient: "linear-gradient(135deg, hsl(200 78% 52%), hsl(165 68% 48%))",
  },
  content: {
    primary: "145 65% 52%",     // Sage green (was 55% 55%)
    secondary: "85 60% 56%",    // Soft lime (was 50% 60%)
    gradient: "linear-gradient(135deg, hsl(145 65% 52%), hsl(85 60% 56%))",
  },

  // NEUTRAL
  // Phase 1: Slight saturation increase
  neutral: {
    primary: "220 22% 58%",     // Soft grey-blue (was 15% 60%)
    secondary: "40 28% 62%",    // Warm grey (was 20% 65%)
    gradient: "linear-gradient(135deg, hsl(220 22% 58%), hsl(40 28% 62%))",
  },

  // AGITATED (high energy, negative)
  // Phase 1: Increased saturation, reduced lightness for intensity
  irritable: {
    primary: "25 88% 52%",      // Burnt orange (was 80% 55%)
    secondary: "5 80% 48%",     // Red-orange (was 70% 50%)
    gradient: "linear-gradient(135deg, hsl(25 88% 52%), hsl(5 80% 48%))",
  },
  angry: {
    primary: "0 92% 52%",       // Red (was 85% 55%)
    secondary: "15 82% 48%",    // Scarlet (was 75% 50%)
    gradient: "linear-gradient(135deg, hsl(0 92% 52%), hsl(15 82% 48%))",
  },

  // BLEAK (low energy, negative)
  // Phase 1: Increased saturation even for darker moods
  anxious: {
    primary: "270 55% 48%",     // Purple (was 45% 50%)
    secondary: "240 65% 42%",   // Deep blue (was 55% 45%)
    gradient: "linear-gradient(135deg, hsl(270 55% 48%), hsl(240 65% 42%))",
  },
  depressed: {
    primary: "220 35% 33%",     // Dark grey-blue (was 25% 35%)
    secondary: "210 40% 28%",   // Darker blue (was 30% 30%)
    gradient: "linear-gradient(135deg, hsl(220 35% 33%), hsl(210 40% 28%))",
  },
};

/**
 * Get colors for a specific mood
 */
export function moodToColors(mood: Mood): MoodColors {
  return MOOD_COLORS[mood];
}

/**
 * Apply mood colors to a DOM element via CSS custom properties
 */
export function applyMoodColors(element: HTMLElement, mood: Mood) {
  const colors = moodToColors(mood);
  element.style.setProperty("--mood-primary", colors.primary);
  element.style.setProperty("--mood-secondary", colors.secondary);
  element.style.setProperty("--mood-gradient", colors.gradient);
}

/**
 * Get CSS class name for a mood theme
 */
export function getMoodThemeClass(mood: Mood): string {
  return `theme-${mood}`;
}
