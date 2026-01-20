import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DEFAULT_THEME_TOKENS } from '@/lib/theme-tokens';
import { applyThemeTokens, mergeThemeTokens } from '@/lib/theme-utils';
import { getCompanyTheme, getPlatformTheme } from '@/services/theme';
import { ColorMode, COLOR_MODE_KEY, createNeutralTokens } from '@/lib/color-modes';
import type { ThemeTokens } from '@/types/theme';

const THEME_CACHE_KEY = 'driverly-theme-cache';

interface ThemeContextType {
  tokens: ThemeTokens;
  setTokens: (tokens: ThemeTokens) => void;
  isThemeLoading: boolean;
  colorMode: ColorMode;
  setColorMode: (mode: ColorMode) => void;
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

// Get stored color mode
function getStoredColorMode(): ColorMode {
  try {
    const stored = localStorage.getItem(COLOR_MODE_KEY);
    return stored === 'neutral' ? 'neutral' : 'expressive';
  } catch {
    return 'expressive';
  }
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
  // Initialize with cached theme to prevent flash
  const [baseTokens, setBaseTokens] = useState<ThemeTokens>(getCachedTheme);
  const [colorMode, setColorModeState] = useState<ColorMode>(getStoredColorMode);
  const [isThemeLoading, setIsThemeLoading] = useState(true);

  // Compute effective tokens based on color mode
  const tokens = colorMode === 'neutral' ? createNeutralTokens(baseTokens) : baseTokens;

  // Persist color mode changes
  const setColorMode = useCallback((mode: ColorMode) => {
    setColorModeState(mode);
    try {
      localStorage.setItem(COLOR_MODE_KEY, mode);
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Wrapper for setTokens to update base tokens
  const setTokens = useCallback((newTokens: ThemeTokens) => {
    setBaseTokens(newTokens);
  }, []);

  // Apply tokens whenever they change (including color mode changes)
  useEffect(() => {
    applyThemeTokens(tokens);
  }, [tokens, colorMode]);

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
            setBaseTokens(merged);
            cacheTheme(merged);
          }
        } else if (isActive) {
          setBaseTokens(platformTokens);
          cacheTheme(platformTokens);
        }
      } catch {
        if (isActive) {
          setBaseTokens(DEFAULT_THEME_TOKENS);
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
    <ThemeContext.Provider value={{ tokens, setTokens, isThemeLoading, colorMode, setColorMode }}>
      {children}
    </ThemeContext.Provider>
  );
}
