import { ReactNode, useEffect } from 'react';
import { ACME_DEMO_THEME } from '@/lib/theme-presets';

interface DemoThemeWrapperProps {
  children: ReactNode;
}

/**
 * Wraps demo components with CSS custom properties that match
 * the marketing site's dark gold aesthetic.
 * 
 * Also applies theme to document root so that portals (modals, dialogs)
 * inherit the theme colors.
 */
export function DemoThemeWrapper({ children }: DemoThemeWrapperProps) {
  const { tokens } = ACME_DEMO_THEME;

  // Apply theme variables to document root for portal support
  useEffect(() => {
    const root = document.documentElement;
    const originalValues: Record<string, string> = {};
    
    const themeVars: Record<string, string> = {
      '--primary': tokens.primary,
      '--primary-foreground': tokens.primary_foreground,
      '--primary-hover': adjustLightness(tokens.primary, 5),
      '--secondary': tokens.secondary,
      '--secondary-foreground': tokens.secondary_foreground,
      '--accent': tokens.accent,
      '--accent-foreground': tokens.accent_foreground,
      '--background': tokens.background,
      '--foreground': tokens.foreground,
      '--card': tokens.card,
      '--card-foreground': tokens.card_foreground,
      '--popover': tokens.card,
      '--popover-foreground': tokens.card_foreground,
      '--muted': tokens.muted,
      '--muted-foreground': tokens.muted_foreground,
      '--border': tokens.border,
      '--input': tokens.border,
      '--ring': tokens.ring,
      '--success': tokens.success,
      '--success-foreground': tokens.success_foreground,
      '--warning': tokens.warning,
      '--warning-foreground': tokens.warning_foreground,
      '--destructive': tokens.destructive,
      '--destructive-foreground': tokens.destructive_foreground,
      '--destructive-muted': tokens.destructive_muted,
      '--destructive-muted-foreground': tokens.destructive_muted_foreground,
      '--gradient-primary': `linear-gradient(135deg, hsl(${tokens.primary}), hsl(${tokens.accent}))`,
    };
    
    // Store original values and apply theme
    Object.entries(themeVars).forEach(([key, value]) => {
      originalValues[key] = root.style.getPropertyValue(key);
      root.style.setProperty(key, value);
    });
    
    // Cleanup: restore original values
    return () => {
      Object.entries(originalValues).forEach(([key, value]) => {
        if (value) {
          root.style.setProperty(key, value);
        } else {
          root.style.removeProperty(key);
        }
      });
    };
  }, [tokens]);

  // Build inline style with CSS custom properties (for direct children)
  const themeStyle: React.CSSProperties & { [key: string]: string } = {
    '--primary': tokens.primary,
    '--primary-foreground': tokens.primary_foreground,
    '--primary-hover': adjustLightness(tokens.primary, 5),
    '--secondary': tokens.secondary,
    '--secondary-foreground': tokens.secondary_foreground,
    '--accent': tokens.accent,
    '--accent-foreground': tokens.accent_foreground,
    '--background': tokens.background,
    '--foreground': tokens.foreground,
    '--card': tokens.card,
    '--card-foreground': tokens.card_foreground,
    '--popover': tokens.card,
    '--popover-foreground': tokens.card_foreground,
    '--muted': tokens.muted,
    '--muted-foreground': tokens.muted_foreground,
    '--border': tokens.border,
    '--input': tokens.border,
    '--ring': tokens.ring,
    '--success': tokens.success,
    '--success-foreground': tokens.success_foreground,
    '--warning': tokens.warning,
    '--warning-foreground': tokens.warning_foreground,
    '--destructive': tokens.destructive,
    '--destructive-foreground': tokens.destructive_foreground,
    '--destructive-muted': tokens.destructive_muted,
    '--destructive-muted-foreground': tokens.destructive_muted_foreground,
    // Gradients
    '--gradient-primary': `linear-gradient(135deg, hsl(${tokens.primary}), hsl(${tokens.accent}))`,
    '--gradient-hero': `linear-gradient(135deg, hsl(${tokens.primary} / 0.08), hsl(${tokens.accent} / 0.08))`,
    '--gradient-card': `linear-gradient(135deg, hsl(${tokens.card}), hsl(${tokens.background}))`,
    '--gradient-card-subtle': `linear-gradient(135deg, hsl(${tokens.background}), hsl(${tokens.card}))`,
    // Glass effects
    '--glass-subtle': `hsl(${tokens.card} / 0.8)`,
    '--glass-intense': `hsl(${tokens.muted} / 0.9)`,
    '--glass-dark': `hsl(${tokens.background} / 0.95)`,
    // Shadows with gold glow
    '--shadow-glow-subtle': `0 0 6px hsl(${tokens.primary} / 0.03)`,
    '--shadow-glow': `0 0 10px hsl(${tokens.primary} / 0.05)`,
    '--shadow-glow-intense': `0 0 15px hsl(${tokens.primary} / 0.08)`,
    // Sidebar colors - use muted for toned-down active state
    '--sidebar-accent': tokens.primary_muted,
    '--sidebar-accent-foreground': tokens.primary_muted_foreground,
    // Radius values
    '--radius': '0.5rem',
  };

  return (
    <div 
      style={themeStyle} 
      className="demo-theme-wrapper"
    >
      {children}
    </div>
  );
}

function adjustLightness(hsl: string, amount: number): string {
  const parts = hsl.match(/[\d.]+/g);
  if (!parts || parts.length < 3) return hsl;

  const h = parseFloat(parts[0]);
  const s = parseFloat(parts[1]);
  const l = Math.min(100, Math.max(0, parseFloat(parts[2]) + amount));

  return `${h} ${s}% ${l}%`;
}
