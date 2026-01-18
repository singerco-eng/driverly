// Agenticy Design System - Design Tokens
// Centralized design tokens for consistent theming across the application

export const designTokens = {
  // Colors - Core semantic tokens
  colors: {
    // Primary brand colors
    primary: {
      DEFAULT: 'hsl(var(--primary))',
      foreground: 'hsl(var(--primary-foreground))',
      hover: 'hsl(var(--primary-hover))',
    },
    secondary: {
      DEFAULT: 'hsl(var(--secondary))',
      foreground: 'hsl(var(--secondary-foreground))',
    },
    accent: {
      DEFAULT: 'hsl(var(--accent))',
      foreground: 'hsl(var(--accent-foreground))',
    },
    
    // Status colors
    success: {
      DEFAULT: 'hsl(var(--success))',
      foreground: 'hsl(var(--success-foreground))',
    },
    warning: {
      DEFAULT: 'hsl(var(--warning))',
      foreground: 'hsl(var(--warning-foreground))',
    },
    destructive: {
      DEFAULT: 'hsl(var(--destructive))',
      foreground: 'hsl(var(--destructive-foreground))',
    },
    
    // Surface colors
    background: 'hsl(var(--background))',
    foreground: 'hsl(var(--foreground))',
    card: {
      DEFAULT: 'hsl(var(--card))',
      foreground: 'hsl(var(--card-foreground))',
    },
    muted: {
      DEFAULT: 'hsl(var(--muted))',
      foreground: 'hsl(var(--muted-foreground))',
    },
    
    // Interactive elements
    border: 'hsl(var(--border))',
    input: 'hsl(var(--input))',
    ring: 'hsl(var(--ring))',
  },

  // Gradients
  gradients: {
    primary: 'var(--gradient-primary)',
    hero: 'var(--gradient-hero)',
    card: 'var(--gradient-card)',
    cardSubtle: 'var(--gradient-card-subtle)',
  },

  // Shadows
  shadows: {
    soft: 'var(--shadow-soft)',
    medium: 'var(--shadow-medium)',
    glow: 'var(--shadow-glow)',
    glowIntense: 'var(--shadow-glow-intense)',
  },

  // Glass effects
  glass: {
    subtle: 'var(--glass-subtle)',
    intense: 'var(--glass-intense)',
    dark: 'var(--glass-dark)',
  },

  // Spacing scale (based on Tailwind's spacing)
  spacing: {
    xs: '0.25rem',   // 1
    sm: '0.5rem',    // 2
    md: '1rem',      // 4
    lg: '1.5rem',    // 6
    xl: '2rem',      // 8
    '2xl': '2.5rem', // 10
    '3xl': '3rem',   // 12
    '4xl': '4rem',   // 16
    '5xl': '5rem',   // 20
  },

  // Border radius scale
  radius: {
    none: '0',
    sm: 'calc(var(--radius) - 4px)',
    md: 'calc(var(--radius) - 2px)',
    lg: 'var(--radius)',
    xl: 'calc(var(--radius) + 4px)',
    '2xl': 'calc(var(--radius) + 8px)',
    full: '9999px',
  },

  // Typography scale
  typography: {
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1rem' }],
      sm: ['0.875rem', { lineHeight: '1.25rem' }],
      base: ['1rem', { lineHeight: '1.5rem' }],
      lg: ['1.125rem', { lineHeight: '1.75rem' }],
      xl: ['1.25rem', { lineHeight: '1.75rem' }],
      '2xl': ['1.5rem', { lineHeight: '2rem' }],
      '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
      '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      '5xl': ['3rem', { lineHeight: '1' }],
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },

  // Animation durations
  animation: {
    duration: {
      fast: '150ms',
      normal: '200ms',
      slow: '300ms',
      slower: '500ms',
    },
    easing: {
      default: 'cubic-bezier(0.4, 0, 0.2, 1)',
      in: 'cubic-bezier(0.4, 0, 1, 1)',
      out: 'cubic-bezier(0, 0, 0.2, 1)',
      inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },

  // Breakpoints (matches Tailwind defaults)
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },

  // Z-index scale
  zIndex: {
    base: 0,
    elevated: 10,
    overlay: 20,
    dropdown: 50,
    sticky: 100,
    modal: 1000,
    tooltip: 1010,
    toast: 1020,
  },
} as const

// Type definitions for better TypeScript support
export type DesignTokens = typeof designTokens
export type ColorToken = keyof typeof designTokens.colors
export type SpacingToken = keyof typeof designTokens.spacing
export type RadiusToken = keyof typeof designTokens.radius
export type ShadowToken = keyof typeof designTokens.shadows
export type GradientToken = keyof typeof designTokens.gradients

// Helper functions for accessing design tokens
export const getColor = (token: string) => designTokens.colors[token as ColorToken] || token
export const getSpacing = (token: SpacingToken) => designTokens.spacing[token]
export const getRadius = (token: RadiusToken) => designTokens.radius[token]
export const getShadow = (token: ShadowToken) => designTokens.shadows[token]
export const getGradient = (token: GradientToken) => designTokens.gradients[token]