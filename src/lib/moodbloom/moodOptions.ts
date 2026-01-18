import type React from "react";
import { Smile, Heart, Zap, Meh, Frown } from "lucide-react";
import type { Mood } from "./types";
import { ALL_MOODS } from "./types";

type IconComponent = React.ComponentType<{ className?: string }>;

export const MOOD_ICON_MAP: Record<Mood, IconComponent> = {
  happy: Smile,
  excited: Zap,
  manic: Zap,
  calm: Heart,
  content: Smile,
  neutral: Meh,
  irritable: Frown,
  angry: Frown,
  anxious: Frown,
  depressed: Frown,
};

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export const MOOD_OPTIONS = ALL_MOODS.map((mood) => ({
  value: mood,
  label: capitalize(mood),
  icon: MOOD_ICON_MAP[mood],
}));
