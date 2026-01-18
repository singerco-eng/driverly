
import React from 'react';
import { cn } from '@/lib/utils';

interface MicrophoneVisualizationProps {
  level: number; // 0-100 audio level
  className?: string;
  isActive?: boolean;
  isMuted?: boolean;
}

export const MicrophoneVisualization: React.FC<MicrophoneVisualizationProps> = ({
  level,
  className,
  isActive = true,
  isMuted = false
}) => {
  // 7 bars with center being tallest, tapering to edges
  const barCount = 7;
  const bars = Array.from({ length: barCount }, (_, index) => {
    const centerIndex = Math.floor(barCount / 2);
    const distanceFromCenter = Math.abs(index - centerIndex);
    
    // Base heights: center bar tallest, edges shortest
    const baseHeights = [0.3, 0.5, 0.7, 1.0, 0.7, 0.5, 0.3];
    const baseHeight = baseHeights[index];
    
    // Sensitivity decreases with distance from center
    const sensitivity = 1 - (distanceFromCenter * 0.15);
    
    // Calculate bar height based on audio level
    let barHeight = 0;
    if (isActive && !isMuted && level > 0) {
      const adjustedLevel = (level / 100) * sensitivity;
      barHeight = Math.max(0.1, Math.min(1, baseHeight * (0.3 + adjustedLevel * 0.7)));
    } else if (isActive && !isMuted) {
      barHeight = baseHeight * 0.1; // Minimal height when no audio
    }
    
    return {
      height: barHeight,
      baseHeight
    };
  });

  return (
    <div className={cn(
      'flex items-end justify-center gap-1 h-16 px-4',
      className
    )}>
      {bars.map((bar, index) => (
        <div
          key={index}
          className={cn(
            'w-1 rounded-full transition-all duration-100 ease-out',
            isActive && !isMuted 
              ? 'bg-gradient-to-t from-primary via-primary/80 to-accent'
              : 'bg-muted-foreground/30'
          )}
          style={{
            height: `${bar.height * 100}%`,
            minHeight: '2px'
          }}
        />
      ))}
      
      {/* Muted indicator */}
      {isMuted && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 bg-destructive/20 rounded-full flex items-center justify-center">
            <div className="w-3 h-3 bg-destructive rounded-full" />
          </div>
        </div>
      )}
    </div>
  );
};
