import { useTheme } from '@/contexts/ThemeContext';
import { ColorMode, COLOR_MODE_LABELS, COLOR_MODE_DESCRIPTIONS, COLOR_MODE_PREVIEW } from '@/lib/color-modes';
import { cn } from '@/lib/utils';
import { Check, Sparkles, Circle } from 'lucide-react';

interface ThemeSelectorProps {
  className?: string;
}

export function ThemeSelector({ className }: ThemeSelectorProps) {
  const { colorMode, setColorMode } = useTheme();

  const modes: ColorMode[] = ['expressive', 'neutral'];

  return (
    <div className={cn('grid grid-cols-2 gap-4', className)}>
      {modes.map((mode) => {
        const isSelected = colorMode === mode;
        const preview = COLOR_MODE_PREVIEW[mode];
        
        return (
          <button
            key={mode}
            onClick={() => setColorMode(mode)}
            className={cn(
              'relative flex flex-col rounded-lg border-2 p-4 text-left transition-all duration-200',
              'hover:border-primary/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isSelected
                ? 'border-primary bg-primary/5'
                : 'border-border bg-card hover:bg-card/80'
            )}
          >
            {/* Selection indicator */}
            {isSelected && (
              <div className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                <Check className="h-3 w-3 text-primary-foreground" />
              </div>
            )}

            {/* Color preview swatches */}
            <div className="mb-3 flex items-center gap-2">
              <div
                className="h-8 w-8 rounded-full border border-border/50 shadow-sm"
                style={{ background: preview.primary }}
              />
              <div
                className="h-6 w-6 rounded-full border border-border/50 shadow-sm"
                style={{ background: preview.accent }}
              />
            </div>

            {/* Label with icon */}
            <div className="flex items-center gap-2 mb-1">
              {mode === 'expressive' ? (
                <Sparkles className="h-4 w-4 text-primary" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="font-medium text-sm">{COLOR_MODE_LABELS[mode]}</span>
            </div>

            {/* Description */}
            <p className="text-xs text-muted-foreground">
              {COLOR_MODE_DESCRIPTIONS[mode]}
            </p>
          </button>
        );
      })}
    </div>
  );
}
