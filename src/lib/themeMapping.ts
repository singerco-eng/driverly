import type { ThemeName } from "./themes";

export interface DesignSystemThemeConfig {
  theme: "dark" | "light";
  brand: "crimson" | "default" | "violet" | "emerald" | "amber";
  expressive?: boolean;
}

/**
 * Maps portfolio theme names to design system theme configuration.
 * This ensures design system components receive the correct theme context.
 */
export const mapPortfolioThemeToDS = (
  portfolioTheme: ThemeName,
): DesignSystemThemeConfig => {
  switch (portfolioTheme) {
    case "agentic-mapping":
      return {
        theme: "dark",
        brand: "crimson",
        expressive: true, // Use expressive styling from admin
      };
    case "agentic-dispatch":
      return {
        theme: "dark",
        brand: "violet",
        expressive: true,
      };
    case "moodbloom":
      return {
        theme: "dark",
        brand: "emerald",
        expressive: true,
      };
    case "acculynx":
      return {
        theme: "light",
        brand: "default",
        expressive: false,
      };
    case "vasion":
      return {
        theme: "light",
        brand: "violet",
        expressive: false,
      };
    case "aryv":
      return {
        theme: "dark",
        brand: "amber",
        expressive: false,
      };
    case "none":
    default:
      return {
        theme: "dark",
        brand: "default",
        expressive: false,
      };
  }
};

/**
 * Checks if a theme should use expressive styling (matching admin patterns)
 */
export const shouldUseExpressive = (theme: ThemeName): boolean => {
  return mapPortfolioThemeToDS(theme).expressive ?? false;
};
