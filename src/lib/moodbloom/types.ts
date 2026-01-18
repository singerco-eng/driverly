/**
 * Moodbloom Type Definitions
 * 
 * 10 therapeutic moods organized by CBT principles
 */

export type Mood = 
  // Vibrant (high energy, positive)
  | "happy" 
  | "excited" 
  | "manic"
  
  // Gentle (low energy, positive)
  | "calm" 
  | "content" 
  
  // Neutral
  | "neutral"
  
  // Agitated (high energy, negative)
  | "irritable" 
  | "angry"
  
  // Bleak (low energy, negative)
  | "anxious" 
  | "depressed";

export type MoodKind = 
  | "vibrant" 
  | "gentle" 
  | "agitated" 
  | "bleak" 
  | "neutral";

export interface MoodColors {
  primary: string;     // HSL format: "hue saturation lightness"
  secondary: string;   // HSL format: "hue saturation lightness"
  gradient: string;    // CSS gradient string
}

export const MOOD_KINDS: Record<Mood, MoodKind> = {
  happy: "vibrant",
  excited: "vibrant",
  manic: "vibrant",
  calm: "gentle",
  content: "gentle",
  neutral: "neutral",
  irritable: "agitated",
  angry: "agitated",
  anxious: "bleak",
  depressed: "bleak",
};

export const ALL_MOODS: Mood[] = [
  "happy",
  "excited", 
  "manic",
  "calm",
  "content",
  "neutral",
  "irritable",
  "angry",
  "anxious",
  "depressed",
];

export const getMoodKind = (mood: Mood): MoodKind => MOOD_KINDS[mood];
