import { useState, useEffect, useCallback } from 'react';
import { ColorMode, COLOR_MODE_KEY } from '@/lib/color-modes';

/**
 * Hook to manage color mode preference (expressive vs neutral)
 * Persists to localStorage and syncs across tabs
 */
export function useColorMode() {
  const [colorMode, setColorModeState] = useState<ColorMode>(() => {
    if (typeof window === 'undefined') return 'expressive';
    const stored = localStorage.getItem(COLOR_MODE_KEY);
    return (stored === 'neutral' ? 'neutral' : 'expressive') as ColorMode;
  });

  // Sync across tabs
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === COLOR_MODE_KEY && e.newValue) {
        setColorModeState(e.newValue as ColorMode);
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const setColorMode = useCallback((mode: ColorMode) => {
    setColorModeState(mode);
    localStorage.setItem(COLOR_MODE_KEY, mode);
    
    // Dispatch custom event for same-tab listeners
    window.dispatchEvent(new CustomEvent('colorModeChange', { detail: mode }));
  }, []);

  return { colorMode, setColorMode };
}

/**
 * Get initial color mode (for use outside React)
 */
export function getStoredColorMode(): ColorMode {
  if (typeof window === 'undefined') return 'expressive';
  const stored = localStorage.getItem(COLOR_MODE_KEY);
  return (stored === 'neutral' ? 'neutral' : 'expressive') as ColorMode;
}
