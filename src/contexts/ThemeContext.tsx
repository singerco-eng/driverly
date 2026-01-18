import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DEFAULT_THEME_TOKENS } from '@/lib/theme-tokens';
import { applyThemeTokens, mergeThemeTokens } from '@/lib/theme-utils';
import { getCompanyTheme, getPlatformTheme } from '@/services/theme';
import type { ThemeTokens } from '@/types/theme';

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

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { profile, isLoading } = useAuth();
  const [tokens, setTokens] = useState<ThemeTokens>(DEFAULT_THEME_TOKENS);
  const [isThemeLoading, setIsThemeLoading] = useState(true);

  useEffect(() => {
    applyThemeTokens(tokens);
  }, [tokens]);

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
          }
        } else if (isActive) {
          setTokens(platformTokens);
        }
      } catch {
        if (isActive) {
          setTokens(DEFAULT_THEME_TOKENS);
        }
      } finally {
        if (isActive) {
          setIsThemeLoading(false);
        }
      }
    };

    loadTheme();

    return () => {
      isActive = false;
    };
  }, [isLoading, profile?.company_id, profile?.role]);

  return (
    <ThemeContext.Provider value={{ tokens, setTokens, isThemeLoading }}>
      {children}
    </ThemeContext.Provider>
  );
}
