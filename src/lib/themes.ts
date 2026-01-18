export type ThemeName = "none" | "agentic-mapping" | "agentic-dispatch" | "moodbloom" | "acculynx" | "vasion" | "aryv";

type RecursivePartial<T> = {
  [P in keyof T]?: T[P] extends Record<string, unknown> ? RecursivePartial<T[P]> : T[P];
};

export interface ButtonStyle {
  background: string;
  color: string;
  hoverBackground?: string;
  hoverColor?: string;
  border?: string;
  shadow?: string;
  glow?: string;
  textShadow?: string;
}

export interface ContainerStyle {
  background: string;
  border?: string;
  shadow?: string;
  overlay?: string;
}

export interface CardStyle {
  background: string;
  border: string;
  shadow: string;
  highlight?: string;
}

export interface GlassStyle {
  surface: string;
  outline: string;
  shadowEffect: string;
  blurAmount: string;
}

export interface ChipStyle {
  background: string;
  color: string;
  border?: string;
  shadow?: string;
  textShadow?: string;
}

export interface DecorStyle {
  grid?: string;
  glow?: string;
  accent?: string;
}

export interface ThemeTokens {
  container: ContainerStyle;
  card: CardStyle;
  buttons: {
    primary: ButtonStyle;
    secondary: ButtonStyle;
    ghost: ButtonStyle;
  };
  glass: GlassStyle;
  chip: ChipStyle;
  decor: DecorStyle;
}

export interface ThemeDesignSystemMeta {
  scopeClass?: string;
  reviewClass?: string;
  overlayRootId?: string;
  cssVars?: Record<string, string>;
  reviewMatcher?: (path: string) => boolean;
  /**
   * If true, all tokens are defined in CSS under the scope class.
   * ThemeContext will NOT inject colors/tokens to :root for this theme.
   * This follows the Moodbloom pattern for isolated design systems.
   */
  useCssScopedTokens?: boolean;
}

export interface Theme {
  name: string;
  displayName: string;
  colors: Record<string, string>;
  tokens: ThemeTokens;
  hasGradient?: boolean;
  gradient?: string;
  type?: "company" | "commission";
  logo?: string;
    designSystem?: ThemeDesignSystemMeta;
}

const buildBaseTokens = (colors: Record<string, string>): ThemeTokens => ({
  container: {
    background: `linear-gradient(135deg, hsl(${colors.background}), hsl(${colors.background} / 0.85))`,
    border: `1px solid hsl(${colors.border} / 0.35)`,
    shadow: `0 30px 80px hsl(${colors["glass-shadow"]} / 0.35)`,
    overlay: `radial-gradient(circle at 20% 20%, hsla(${colors.primary} / 0.3), transparent 55%)`,
  },
  card: {
    background: `hsl(${colors.card} / 0.95)`,
    border: `1px solid hsl(${colors.border} / 0.45)`,
    shadow: `0 20px 60px hsl(${colors["glass-shadow"]} / 0.35)`,
    highlight: `linear-gradient(120deg, hsla(${colors.primary} / 0.15), transparent)`,
  },
  buttons: {
    primary: {
      background: `linear-gradient(120deg, hsl(${colors.primary}), hsl(${colors.accent ?? colors.primary}))`,
      color: `hsl(${colors["primary-foreground"]})`,
      hoverBackground: `linear-gradient(120deg, hsl(${colors.primary} / 0.95), hsl(${colors.accent ?? colors.primary}))`,
      border: "none",
      shadow: `0 15px 30px hsla(${colors.primary} / 0.35)`,
      glow: `0 0 45px hsla(${colors.primary} / 0.45)`,
    },
    secondary: {
      background: `hsl(${colors.secondary})`,
      color: `hsl(${colors["secondary-foreground"]})`,
      hoverBackground: `hsl(${colors.secondary} / 0.9)`,
      border: `1px solid hsl(${colors.border} / 0.5)`,
      shadow: `inset 0 1px 0 hsla(${colors.foreground} / 0.2)`,
    },
    ghost: {
      background: "transparent",
      color: `hsl(${colors.primary})`,
      hoverBackground: `hsla(${colors.primary} / 0.12)`,
      border: "1px solid transparent",
      textShadow: `0 0 20px hsla(${colors.primary} / 0.4)`,
    },
  },
  glass: {
    surface: `hsla(${colors["glass-bg"]} / 0.5)`,
    outline: `1px solid hsla(${colors["glass-border"]} / 0.4)`,
    shadowEffect: `0 40px 80px hsla(${colors["glass-shadow"]} / 0.4)`,
    blurAmount: "18px",
  },
  chip: {
    background: `hsla(${colors.accent ?? colors.primary} / 0.2)`,
    color: `hsl(${colors["accent-foreground"] ?? colors["primary-foreground"]})`,
    border: `1px solid hsla(${colors.accent ?? colors.primary} / 0.4)`,
    shadow: "none",
    textShadow: "none",
  },
  decor: {
    grid: `linear-gradient(90deg, hsla(${colors.border} / 0.15) 1px, transparent 1px), linear-gradient(0deg, hsla(${colors.border} / 0.15) 1px, transparent 1px)`,
    glow: `0 0 60px hsla(${colors.primary} / 0.45)`,
    accent: `hsla(${colors.accent ?? colors.primary} / 0.4)`,
  },
});

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const deepClone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const mergeInto = (target: Record<string, unknown>, source: Record<string, unknown>) => {
  Object.entries(source).forEach(([key, value]) => {
    if (value === undefined) return;
    if (isObject(value)) {
      if (!isObject(target[key])) {
        target[key] = {};
      }
      mergeInto(target[key] as Record<string, unknown>, value);
    } else {
      target[key] = value;
    }
  });
};

const createThemeTokens = (colors: Record<string, string>, overrides?: RecursivePartial<ThemeTokens>) => {
  const base = deepClone(buildBaseTokens(colors));
  if (overrides) {
    mergeInto(base as unknown as Record<string, unknown>, overrides as unknown as Record<string, unknown>);
  }
  return base;
};

const toCssTokenSegment = (segment: string) =>
  segment
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/_/g, "-")
    .toLowerCase();

const flattenTokens = (obj: Record<string, unknown>, path: string[] = []): Record<string, string> => {
  return Object.entries(obj).reduce<Record<string, string>>((acc, [key, value]) => {
    const nextPath = [...path, toCssTokenSegment(key)];
    if (isObject(value)) {
      Object.assign(acc, flattenTokens(value, nextPath));
      return acc;
    }
    if (typeof value === "string") {
      acc[`--${nextPath.join("-")}`] = value;
    }
    return acc;
  }, {});
};

export const getThemeCssVars = (theme: Theme) => {
  // If theme uses CSS-scoped tokens, don't inject anything to :root
  // All tokens are defined in CSS under the scope class
  if (theme.designSystem?.useCssScopedTokens) {
    return {};
  }
  
  const vars: Record<string, string> = {};
  Object.entries(theme.colors).forEach(([key, value]) => {
    vars[`--${key}`] = value;
  });
  Object.assign(vars, flattenTokens(theme.tokens));
  if (theme.gradient) {
    vars["--theme-gradient"] = theme.gradient;
  }
  if (theme.designSystem?.cssVars) {
    Object.assign(vars, theme.designSystem.cssVars);
  }
  return vars;
};

const noneColors = {
  background: "0 0% 8%",
  foreground: "0 0% 92%",
  card: "0 0% 12%",
  "card-foreground": "0 0% 92%",
  popover: "0 0% 10%",
  "popover-foreground": "0 0% 92%",
  primary: "0 0% 60%",
  "primary-foreground": "0 0% 8%",
  secondary: "0 0% 15%",
  "secondary-foreground": "0 0% 92%",
  muted: "0 0% 30%",
  "muted-foreground": "0 0% 70%",
  accent: "0 0% 50%",
  "accent-foreground": "0 0% 8%",
  destructive: "0 62% 50%",
  "destructive-foreground": "0 0% 92%",
  border: "0 0% 20%",
  input: "0 0% 18%",
  ring: "0 0% 60%",
  "glass-bg": "0 0% 12%",
  "glass-border": "0 0% 25%",
  "glass-shadow": "0 0% 5%",
};

// Agentic Mapping theme colors
// EXACT MATCH to singerco-eng/design-system crimson.tokens.css .dark
// Source: gh api repos/singerco-eng/design-system/contents/src/styles/brands/crimson.tokens.css
// 
// The crimson brand uses hue 350 (deep red) with ~18-20% saturation for dark surfaces
// This creates the "dark muted crimson" look of the review interface
const agenticMappingColors = {
  background: "350 20% 7%",
  foreground: "0 0% 98%",
  card: "350 20% 10%",
  "card-foreground": "0 0% 98%",
  popover: "350 20% 10%",
  "popover-foreground": "0 0% 98%",
  // CRIMSON PRIMARY - vibrant red
  primary: "350 85% 56%",
  "primary-foreground": "0 0% 98%",
  // Crimson-tinted dark grays
  secondary: "350 18% 16%",
  "secondary-foreground": "0 0% 98%",
  muted: "350 18% 16%",
  "muted-foreground": "0 0% 80%",
  // Royal Violet accent (from crimson tokens)
  accent: "270 50% 24%",
  "accent-foreground": "0 0% 98%",
  destructive: "0 84% 65%",
  "destructive-foreground": "0 0% 98%",
  border: "350 18% 18%",
  input: "350 18% 18%",
  ring: "350 85% 56%",
  "glass-bg": "350 18% 12%",
  "glass-border": "350 18% 18%",
  "glass-shadow": "350 18% 7%",
};

const agenticDispatchColors = {
  background: "215 28% 6%",
  foreground: "210 20% 98%",
  card: "215 25% 10%",
  "card-foreground": "210 20% 98%",
  "card-subtle": "215 25% 8%",
  popover: "215 25% 10%",
  "popover-foreground": "210 20% 98%",
  primary: "218 95% 58%",
  "primary-foreground": "215 28% 6%",
  "primary-hover": "218 95% 65%",
  secondary: "215 25% 16%",
  "secondary-foreground": "210 20% 98%",
  muted: "215 25% 16%",
  "muted-foreground": "215 15% 72%",
  accent: "259 94% 56%",
  "accent-foreground": "210 20% 98%",
  destructive: "0 84% 65%",
  "destructive-foreground": "210 20% 98%",
  border: "215 25% 18%",
  input: "215 25% 18%",
  ring: "218 95% 58%",
  "glass-bg": "215 25% 12%",
  "glass-border": "215 25% 25%",
  "glass-shadow": "215 28% 6%",
  success: "142 76% 42%",
  "success-foreground": "210 20% 98%",
  warning: "38 92% 55%",
  "warning-foreground": "215 28% 6%",
  "live-connected": "142 76% 42%",
  "live-connecting": "38 92% 55%",
  "live-disconnected": "0 84% 65%",
  "live-glow": "142 76% 42%",
};

const moodbloomColors = {
  // LIGHT MODE (matches actual Moodbloom design system)
  background: "0 0% 100%",
  foreground: "222.2 84% 4.9%",
  card: "0 0% 100%",
  "card-foreground": "222.2 84% 4.9%",
  popover: "0 0% 100%",
  "popover-foreground": "222.2 84% 4.9%",
  primary: "222.2 47.4% 11.2%",
  "primary-foreground": "210 40% 98%",
  secondary: "210 40% 96.1%",
  "secondary-foreground": "222.2 47.4% 11.2%",
  muted: "210 40% 96.1%",
  "muted-foreground": "215.4 16.3% 46.9%",
  accent: "210 40% 96.1%",
  "accent-foreground": "222.2 47.4% 11.2%",
  destructive: "0 84.2% 60.2%",
  "destructive-foreground": "210 40% 98%",
  border: "214.3 31.8% 91.4%",
  input: "214.3 31.8% 91.4%",
  ring: "222.2 84% 4.9%",
  "glass-bg": "0 0% 100%",
  "glass-border": "160 35% 25%",
  "glass-shadow": "160 45% 5%",
};

const acculynxColors = {
  background: "0 0% 97%",
  foreground: "200 45% 20%",
  card: "0 0% 100%",
  "card-foreground": "200 45% 20%",
  popover: "0 0% 100%",
  "popover-foreground": "200 45% 20%",
  primary: "13 88% 65%",
  "primary-foreground": "0 0% 100%",
  secondary: "200 50% 25%",
  "secondary-foreground": "0 0% 100%",
  muted: "0 0% 90%",
  "muted-foreground": "200 25% 40%",
  accent: "13 88% 65%",
  "accent-foreground": "0 0% 100%",
  destructive: "0 62% 50%",
  "destructive-foreground": "0 0% 100%",
  border: "0 0% 88%",
  input: "0 0% 92%",
  ring: "13 88% 65%",
  "glass-bg": "0 0% 100%",
  "glass-border": "0 0% 85%",
  "glass-shadow": "0 0% 60%",
};

const vasionColors = {
  background: "240 10% 93%",
  foreground: "265 55% 15%",
  card: "0 0% 100%",
  "card-foreground": "265 55% 15%",
  popover: "0 0% 100%",
  "popover-foreground": "265 55% 15%",
  primary: "265 75% 55%",
  "primary-foreground": "0 0% 100%",
  secondary: "240 10% 90%",
  "secondary-foreground": "265 55% 15%",
  muted: "240 10% 88%",
  "muted-foreground": "265 35% 40%",
  accent: "20 100% 50%",
  "accent-foreground": "0 0% 100%",
  destructive: "0 62% 50%",
  "destructive-foreground": "0 0% 100%",
  border: "240 10% 85%",
  input: "240 10% 90%",
  ring: "265 75% 55%",
  "glass-bg": "0 0% 100%",
  "glass-border": "240 10% 85%",
  "glass-shadow": "240 10% 70%",
};

const aryvColors = {
  background: "0 0% 8%",
  foreground: "0 0% 92%",
  card: "0 0% 12%",
  "card-foreground": "0 0% 92%",
  popover: "0 0% 10%",
  "popover-foreground": "0 0% 92%",
  primary: "45 70% 58%",
  "primary-foreground": "0 0% 8%",
  secondary: "0 0% 15%",
  "secondary-foreground": "0 0% 92%",
  muted: "0 0% 30%",
  "muted-foreground": "0 0% 70%",
  accent: "45 80% 65%",
  "accent-foreground": "0 0% 8%",
  destructive: "0 62% 50%",
  "destructive-foreground": "0 0% 92%",
  border: "0 0% 20%",
  input: "0 0% 18%",
  ring: "45 70% 58%",
  "glass-bg": "0 0% 12%",
  "glass-border": "0 0% 25%",
  "glass-shadow": "0 0% 5%",
};

export const themes: Record<ThemeName, Theme> = {
  none: {
    name: "none",
    displayName: "None",
    colors: noneColors,
    tokens: createThemeTokens(noneColors),
  },
  "agentic-mapping": {
    name: "agentic-mapping",
    displayName: "Agentic Mapping",
    type: "commission",
    colors: agenticMappingColors,
    tokens: createThemeTokens(agenticMappingColors, {
      // EXACT MATCH to singerco-eng/design-system crimson.tokens.css .dark
      // All surfaces use crimson hue (350) with low saturation for dark muted crimson look
      container: {
        background:
          "radial-gradient(circle at 18% 20%, hsla(350, 85%, 56%, 0.08), transparent 50%), linear-gradient(135deg, hsl(350 20% 7%), hsl(350 18% 10%))",
        overlay:
          "linear-gradient(120deg, hsla(350, 85%, 56%, 0.04), hsla(350, 84%, 20%, 0.03)), radial-gradient(circle at 80% 10%, hsla(350, 85%, 56%, 0.06), transparent 45%)",
        shadow: "0 45px 120px hsla(350, 18%, 7%, 0.60)",
        border: "1px solid hsla(350, 18%, 18%, 0.5)",
      },
      card: {
        background:
          "linear-gradient(160deg, hsla(350, 18%, 12%, 0.95), hsla(350, 18%, 10%, 0.95))",
        border: "1px solid hsla(350, 18%, 18%, 0.3)",
        shadow: "0 30px 80px hsla(350, 18%, 7%, 0.5)",
        highlight: "linear-gradient(120deg, hsla(350, 85%, 56%, 0.08), transparent)",
      },
      buttons: {
        primary: {
          // CRIMSON gradient from crimson.tokens.css
          background:
            "linear-gradient(135deg, hsl(350 85% 56%), hsl(350 84% 18%))",
          color: "hsl(0 0% 98%)",
          hoverBackground:
            "linear-gradient(135deg, hsl(350 85% 62%), hsl(350 84% 24%))",
          border: "1px solid hsla(350, 85%, 56%, 0.5)",
          shadow: "0 0 20px hsla(350, 85%, 56%, 0.18)",
          glow: "0 0 30px hsla(350, 85%, 56%, 0.28)",
          textShadow: "0 2px 8px hsla(0, 0%, 0%, 0.3)",
        },
        secondary: {
          background: "hsla(350, 18%, 16%, 0.92)",
          color: "hsl(0 0% 98%)",
          hoverBackground: "hsla(350, 18%, 20%, 0.95)",
          border: "1px solid hsla(350, 18%, 18%, 0.4)",
          shadow: "inset 0 1px 0 hsla(0, 0%, 98%, 0.08)",
        },
        ghost: {
          background: "transparent",
          color: "hsl(0 0% 98%)",
          hoverBackground: "hsla(350, 18%, 16%, 0.3)",
          border: "1px solid transparent",
          textShadow: "none",
        },
      },
      glass: {
        surface: "hsla(350, 18%, 12%, 0.80)",
        outline: "1px solid hsla(350, 18%, 18%, 0.3)",
        shadowEffect: "0 60px 120px hsla(350, 18%, 7%, 0.50)",
        blurAmount: "24px",
      },
      chip: {
        background: "hsla(350, 85%, 56%, 0.15)",
        color: "hsl(0 0% 98%)",
        border: "1px solid hsla(350, 85%, 56%, 0.35)",
        shadow: "0 5px 20px hsla(350, 85%, 56%, 0.15)",
        textShadow: "0 0 12px hsla(350, 85%, 56%, 0.3)",
      },
      decor: {
        grid:
          "linear-gradient(90deg, hsla(350, 85%, 56%, 0.08) 1px, transparent 1px), linear-gradient(0deg, hsla(350, 85%, 56%, 0.08) 1px, transparent 1px)",
        glow: "0 0 80px hsla(350, 85%, 56%, 0.20)",
        accent: "hsla(350, 84%, 18%, 0.4)",
      },
    }),
    hasGradient: true,
    gradient: "linear-gradient(135deg, hsl(350 85% 56%), hsl(350 84% 18%))", // Crimson gradient
    designSystem: {
      scopeClass: "ad-expressive",
      reviewClass: "ad-review",
      reviewMatcher: (path: string) => /review/.test(path) || /agentic/.test(path),
      overlayRootId: "overlay-root",
      // All tokens are defined in agentic-mapping.css under .ad-expressive
      // ThemeContext will NOT inject colors/tokens to :root
      useCssScopedTokens: true,
    },
  },
  "agentic-dispatch": {
    name: "agentic-dispatch",
    displayName: "Agentic Dispatch",
    type: "commission",
    colors: agenticDispatchColors,
    tokens: createThemeTokens(agenticDispatchColors, {
      container: {
        background: "linear-gradient(135deg, hsl(215 28% 6%), hsl(215 25% 8%))",
        border: "1px solid hsla(218 95% 58% / 0.2)",
        shadow: "0 20px 70px hsl(215 28% 6% / 0.65)",
      },
      card: {
        background: "linear-gradient(135deg, hsl(215 25% 10%), hsl(215 25% 12%))",
        border: "1px solid hsla(218 95% 58% / 0.15)",
        shadow: "0 25px 80px hsl(215 28% 6% / 0.55)",
        highlight: "linear-gradient(120deg, hsla(218 95% 58% / 0.08), transparent)",
      },
      buttons: {
        primary: {
          background: "linear-gradient(135deg, hsl(218 95% 58%), hsl(259 94% 56%))",
          color: "hsl(210 20% 98%)",
          hoverBackground: "linear-gradient(135deg, hsl(218 95% 65%), hsl(259 94% 60%))",
          border: "1px solid hsla(218 95% 58% / 0.3)",
          shadow: "0 10px 25px hsla(218 95% 58% / 0.25)",
          glow: "0 0 30px hsla(218 95% 58% / 0.35)",
        },
        secondary: {
          background: "hsl(215 25% 16%)",
          color: "hsl(210 20% 98%)",
          hoverBackground: "hsl(215 25% 20%)",
          border: "1px solid hsla(215 25% 18% / 0.5)",
          shadow: "inset 0 1px 0 hsla(210 20% 98% / 0.1)",
        },
        ghost: {
          background: "transparent",
          color: "hsl(210 20% 98%)",
          hoverBackground: "hsla(218 95% 58% / 0.12)",
          border: "1px solid transparent",
          textShadow: "none",
        },
      },
      glass: {
        surface: "hsla(215 25% 12% / 0.8)",
        outline: "1px solid hsla(215 25% 25% / 0.3)",
        shadowEffect: "0 10px 25px hsla(215 28% 6% / 0.4)",
        blurAmount: "16px",
      },
      chip: {
        background: "hsla(259 94% 56% / 0.15)",
        color: "hsl(210 20% 98%)",
        border: "1px solid hsla(259 94% 56% / 0.3)",
        shadow: "0 0 15px hsla(259 94% 56% / 0.2)",
        textShadow: "none",
      },
    }),
    hasGradient: true,
    gradient: "linear-gradient(135deg, hsl(218 95% 58%), hsl(259 94% 56%))",
    designSystem: {
      scopeClass: "agentic-dispatch",
      cssVars: {
        "--gradient-primary": "linear-gradient(135deg, hsl(218 95% 58%), hsl(259 94% 56%))",
        "--gradient-hero": "linear-gradient(135deg, hsl(218 95% 58% / 0.08), hsl(259 94% 56% / 0.08))",
        "--gradient-card": "linear-gradient(135deg, hsl(215 25% 10%), hsl(215 25% 12%))",
        "--gradient-card-subtle": "linear-gradient(135deg, hsl(215 25% 8%), hsl(215 25% 10%))",
        "--gradient-destructive": "linear-gradient(135deg, hsl(0 84% 65%), hsl(0 84% 55%))",
        "--glass-subtle": "hsl(215 25% 12% / 0.8)",
        "--glass-intense": "hsl(215 25% 16% / 0.9)",
        "--glass-dark": "hsl(215 28% 8% / 0.95)",
        "--shadow-soft": "0 4px 6px -1px hsl(215 28% 6% / 0.3)",
        "--shadow-medium": "0 10px 25px -3px hsl(215 28% 6% / 0.4)",
        "--shadow-glow": "0 0 20px hsl(218 95% 58% / 0.15)",
        "--shadow-glow-intense": "0 0 30px hsl(218 95% 58% / 0.25)",
      },
    },
  },
  moodbloom: {
    name: "moodbloom",
    displayName: "Moodbloom",
    type: "commission",
    colors: moodbloomColors,
      tokens: createThemeTokens(moodbloomColors, {
        buttons: {
          primary: {
            background: "linear-gradient(135deg, hsl(150 75% 55%), hsl(170 70% 50%))",
            hoverBackground: "linear-gradient(135deg, hsl(150 75% 60%), hsl(170 70% 55%))",
          },
        },
        glass: {
          surface: "0 0% 100%",
          outline: "1px solid hsl(214 32% 91%)",
          shadowEffect: "0 20px 40px hsl(222 84% 5% / 0.25)",
          blurAmount: "18px",
        },
      }),
    hasGradient: true,
    gradient: "linear-gradient(135deg, hsl(150 75% 55%), hsl(170 70% 50%))",
      designSystem: {
        scopeClass: "moodbloom-theme",
        cssVars: {
          "--glass-surface": "0 0% 100%",
          "--glass-border": "214 32% 91%",
          "--shadow-color": "222 84% 5%",
          "--on-gradient-foreground": "0 0% 100%",
          "--on-gradient-muted-foreground": "0 0% 96%",
          "--on-gradient-border": "0 0% 100%",
          "--on-gradient-ring": "0 0% 100%",
          "--on-container-foreground": "222.2 47.4% 11.2%",
          "--on-container-muted-foreground": "215.4 16.3% 46.9%",
          "--on-container-border": "214 20% 80%",
          "--on-container-ring": "222.2 47.4% 11.2%",
        },
      },
  },
  acculynx: {
    name: "acculynx",
    displayName: "AccuLynx",
    type: "company",
    logo: "/src/assets/acculynx-logo.jpg",
    colors: acculynxColors,
    tokens: createThemeTokens(acculynxColors, {
      container: {
        background: "linear-gradient(135deg, #ffffff, #f8f8f8)",
        border: "1px solid hsla(0, 0%, 80%, 0.6)",
        shadow: "0 20px 50px rgba(40, 40, 40, 0.08)",
      },
      glass: {
        surface: "hsla(0, 0%, 100%, 0.8)",
        outline: "1px solid hsla(0, 0%, 80%, 0.6)",
        shadowEffect: "0 30px 60px rgba(0, 0, 0, 0.15)",
        blurAmount: "14px",
      },
    }),
  },
  vasion: {
    name: "vasion",
    displayName: "Vasion",
    type: "company",
    logo: "/src/assets/vasion-logo.jpg",
    colors: vasionColors,
    tokens: createThemeTokens(vasionColors),
    hasGradient: true,
    gradient: "linear-gradient(135deg, hsl(265 75% 55%), hsl(340 65% 50%))",
  },
  aryv: {
    name: "aryv",
    displayName: "Aryv",
    type: "company",
    logo: "/src/assets/aryv-logo.png",
    colors: aryvColors,
    tokens: createThemeTokens(aryvColors),
  },
};
