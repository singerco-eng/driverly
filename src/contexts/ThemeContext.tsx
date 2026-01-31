import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DEFAULT_THEME_TOKENS } from '@/lib/theme-tokens';
import { applyThemeTokens, mergeThemeTokens, deriveTokensForMode } from '@/lib/theme-utils';
import { getCompanyTheme, getPlatformTheme } from '@/services/theme';
import { THEME_PRESETS, getPresetById } from '@/lib/theme-presets';
import type { ThemeTokens } from '@/types/theme';

const THEME_CACHE_KEY = 'driverly-theme-cache';
const THEME_PRESET_KEY = 'driverly-theme-preset';
const COLOR_MODE_KEY = 'driverly-color-mode';

export type ColorMode = 'light' | 'dark';

interface ThemeContextType {
  tokens: ThemeTokens;
  setTokens: (tokens: ThemeTokens) => void;
  isThemeLoading: boolean;
  /** Currently selected preset ID (null = use server theme) */
  selectedPresetId: string | null;
  /** Select a preset by ID (null = reset to server theme) */
  setSelectedPresetId: (presetId: string | null) => void;
  /** Current color mode (light or dark) */
  colorMode: ColorMode;
  /** Set the color mode */
  setColorMode: (mode: ColorMode) => void;
  /** Toggle between light and dark mode */
  toggleColorMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

interface ThemeProviderProps {
  children: ReactNode;
}

// Get cached theme or default
function getCachedTheme(): ThemeTokens {
  try {
    const cached = localStorage.getItem(THEME_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached) as ThemeTokens;
    }
  } catch {
    // Ignore errors
  }
  return DEFAULT_THEME_TOKENS;
}

// Get stored preset ID
function getStoredPresetId(): string | null {
  try {
    return localStorage.getItem(THEME_PRESET_KEY);
  } catch {
    return null;
  }
}

// Get stored color mode
function getStoredColorMode(): ColorMode {
  try {
    const stored = localStorage.getItem(COLOR_MODE_KEY);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
  } catch {
    // Ignore errors
  }
  return 'dark'; // Default to dark mode
}

// Cache theme to localStorage
function cacheTheme(tokens: ThemeTokens) {
  try {
    localStorage.setItem(THEME_CACHE_KEY, JSON.stringify(tokens));
  } catch {
    // Ignore errors (e.g., localStorage full or disabled)
  }
}

// Mark the app as theme-ready (removes loading state)
function markThemeReady() {
  const root = document.getElementById('root');
  if (root) {
    root.classList.remove('theme-loading');
    root.classList.add('theme-ready');
  }
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { profile, isLoading } = useAuth();
  // Base tokens from server (platform + company overrides)
  const [serverTokens, setServerTokens] = useState<ThemeTokens>(getCachedTheme);
  // User-selected preset ID
  const [selectedPresetId, setSelectedPresetIdState] = useState<string | null>(getStoredPresetId);
  // Color mode (light/dark)
  const [colorMode, setColorModeState] = useState<ColorMode>(getStoredColorMode);
  const [isThemeLoading, setIsThemeLoading] = useState(true);

  // Get the selected preset
  const selectedPreset = selectedPresetId ? getPresetById(selectedPresetId) : null;

  // Compute effective tokens based on preset and color mode
  const tokens = selectedPreset
    ? deriveTokensForMode(selectedPreset, colorMode)
    : colorMode === 'light'
      ? deriveTokensForMode({ colors: { primary: '#808080', accent: '#666666', background: '#f5f5f5', destructive: '#ef4444' } } as any, 'light')
      : serverTokens;

  // Persist preset selection
  const setSelectedPresetId = useCallback((presetId: string | null) => {
    setSelectedPresetIdState(presetId);
    try {
      if (presetId) {
        localStorage.setItem(THEME_PRESET_KEY, presetId);
      } else {
        localStorage.removeItem(THEME_PRESET_KEY);
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Persist color mode
  const setColorMode = useCallback((mode: ColorMode) => {
    setColorModeState(mode);
    try {
      localStorage.setItem(COLOR_MODE_KEY, mode);
      // Also set data attribute for CSS targeting
      document.documentElement.dataset.colorMode = mode;
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Toggle color mode
  const toggleColorMode = useCallback(() => {
    setColorMode(colorMode === 'dark' ? 'light' : 'dark');
  }, [colorMode, setColorMode]);

  // Wrapper for setTokens to update server tokens (used by super admin)
  const setTokens = useCallback((newTokens: ThemeTokens) => {
    setServerTokens(newTokens);
    // Clear preset selection when manually setting tokens
    setSelectedPresetId(null);
  }, [setSelectedPresetId]);

  // Apply tokens whenever they change
  useEffect(() => {
    applyThemeTokens(tokens);
  }, [tokens]);

  // Load theme from server
  useEffect(() => {
    let isActive = true;

    const loadTheme = async () => {
      if (isLoading) return;
      setIsThemeLoading(true);

      try {
        const platformTokens = await getPlatformTheme();

        if (profile?.company_id && profile.role !== 'super_admin') {
          const companyOverrides = await getCompanyTheme(profile.company_id);
          const merged = mergeThemeTokens(platformTokens, companyOverrides);
          if (isActive) {
            setServerTokens(merged);
            cacheTheme(merged);
          }
        } else if (isActive) {
          setServerTokens(platformTokens);
          cacheTheme(platformTokens);
        }
      } catch {
        if (isActive) {
          setServerTokens(DEFAULT_THEME_TOKENS);
          cacheTheme(DEFAULT_THEME_TOKENS);
        }
      } finally {
        if (isActive) {
          setIsThemeLoading(false);
          // Mark app as ready to show content
          markThemeReady();
        }
      }
    };

    loadTheme();

    return () => {
      isActive = false;
    };
  }, [isLoading, profile?.company_id, profile?.role]);

  // If auth is still loading but we have cached theme, show content
  useEffect(() => {
    if (isLoading) {
      // After a brief delay, show content even if still loading
      // This prevents indefinite blank screen
      const timeout = setTimeout(() => {
        markThemeReady();
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [isLoading]);

  return (
    <ThemeContext.Provider value={{ 
      tokens, 
      setTokens, 
      isThemeLoading, 
      selectedPresetId, 
      setSelectedPresetId,
      colorMode,
      setColorMode,
      toggleColorMode
    }}>
      {children}
    </ThemeContext.Provider>
  );
}
