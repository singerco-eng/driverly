
import React from 'react';
import { cn } from '@/lib/utils';

interface AudioLevelMeterProps {
  level: number; // 0-100 percentage
  className?: string;
  variant?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const AudioLevelMeter: React.FC<AudioLevelMeterProps> = ({
  level,
  className,
  variant = 'horizontal',
  size = 'md',
  showLabel = true
}) => {
  const clampedLevel = Math.max(0, Math.min(100, level));
  
  // Determine color based on level
  const getBarColor = () => {
    if (clampedLevel < 30) return 'bg-green-500';
    if (clampedLevel < 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getSizeClasses = () => {
    if (variant === 'horizontal') {
      switch (size) {
        case 'sm': return 'h-2 w-32';
        case 'md': return 'h-3 w-48';
        case 'lg': return 'h-4 w-64';
        default: return 'h-3 w-48';
      }
    } else {
      switch (size) {
        case 'sm': return 'w-2 h-32';
        case 'md': return 'w-3 h-48';
        case 'lg': return 'w-4 h-64';
        default: return 'w-3 h-48';
      }
    }
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {showLabel && (
        <span className="text-sm text-muted-foreground min-w-[3rem]">
          {Math.round(clampedLevel)}%
        </span>
      )}
      
      <div className={cn(
        'relative rounded-full overflow-hidden',
        'bg-muted border border-border',
        getSizeClasses()
      )}>
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 via-yellow-500/20 to-red-500/20" />
        
        {/* Active level bar */}
        <div
          className={cn(
            'absolute transition-all duration-75 ease-out rounded-full',
            getBarColor(),
            variant === 'horizontal' ? 'inset-y-0 left-0' : 'inset-x-0 bottom-0'
          )}
          style={{
            [variant === 'horizontal' ? 'width' : 'height']: `${clampedLevel}%`
          }}
        />
        
        {/* Shimmer effect when active */}
        {clampedLevel > 5 && (
          <div className={cn(
            'absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent',
            'animate-pulse'
          )} />
        )}
      </div>
      
      {/* Peak indicators */}
      <div className="flex gap-1">
        {[1, 2, 3].map((dot) => (
          <div
            key={dot}
            className={cn(
              'w-1 h-1 rounded-full transition-colors duration-150',
              clampedLevel > (dot * 25) ? 'bg-primary-muted' : 'bg-muted'
            )}
          />
        ))}
      </div>
    </div>
  );
};
