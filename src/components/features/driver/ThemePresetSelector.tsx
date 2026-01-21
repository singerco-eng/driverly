import { useTheme } from '@/contexts/ThemeContext';
import { THEME_PRESETS } from '@/lib/theme-presets';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface ThemePresetSelectorProps {
  className?: string;
}

/**
 * Minimal theme preset selector showing name and primary color swatch
 */
export function ThemePresetSelector({ className }: ThemePresetSelectorProps) {
  const { selectedPresetId, setSelectedPresetId } = useTheme();

  return (
    <div className={cn('grid grid-cols-2 sm:grid-cols-3 gap-3', className)}>
      {THEME_PRESETS.map((preset) => {
        const isSelected = selectedPresetId === preset.id;

        return (
          <button
            key={preset.id}
            onClick={() => setSelectedPresetId(preset.id)}
            className={cn(
              'relative flex items-center gap-3 rounded-lg border p-3 text-left transition-all',
              'hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isSelected
                ? 'border-primary bg-primary/5'
                : 'border-border bg-card'
            )}
          >
            {/* Color swatch */}
            <div
              className="h-8 w-8 rounded-full border border-border/50 shadow-sm flex-shrink-0"
              style={{ background: preset.colors.primary }}
            />

            {/* Name */}
            <span className="text-sm font-medium truncate flex-1">
              {preset.name}
            </span>

            {/* Selection indicator */}
            {isSelected && (
              <Check className="h-4 w-4 text-primary flex-shrink-0" />
            )}
          </button>
        );
      })}
    </div>
  );
}
