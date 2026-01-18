import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DEFAULT_THEME_TOKENS } from '@/lib/theme-tokens';
import { applyThemeTokens, mergeThemeTokens } from '@/lib/theme-utils';
import { getCompanyTheme, getPlatformTheme } from '@/services/theme';
import type { ThemeTokens } from '@/types/theme';

const THEME_CACHE_KEY = 'driverly-theme-cache';

interface ThemeContextType {
  tokens: ThemeTokens;
  setTokens: (tokens: ThemeTokens) => void;
  isThemeLoading: boolean;
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
  const [tokens, setTokens] = useState<ThemeTokens>(getCachedTheme);
  const [isThemeLoading, setIsThemeLoading] = useState(true);

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
            setTokens(merged);
            cacheTheme(merged);
          }
        } else if (isActive) {
          setTokens(platformTokens);
          cacheTheme(platformTokens);
        }
      } catch {
        if (isActive) {
          setTokens(DEFAULT_THEME_TOKENS);
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
    <ThemeContext.Provider value={{ tokens, setTokens, isThemeLoading }}>
      {children}
    </ThemeContext.Provider>
  );
}
