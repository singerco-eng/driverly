import React from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface AIGeneratorButtonProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  size?: 'default' | 'icon';
  className?: string;
}

export const AIGeneratorButton: React.FC<AIGeneratorButtonProps> = ({
  onClick,
  disabled = false,
  loading = false,
  size = 'icon',
  className,
}) => {
  return (
    <Button
      type="button"
      variant="glass-subtle"
      size={size}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'group relative overflow-hidden transition-all duration-300',
        'hover:shadow-glow hover:scale-105',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        size === 'icon' ? 'h-8 w-8 p-0' : 'h-10 w-10 p-0',
        className
      )}
      title="Generate with AI"
    >
      <div className="absolute inset-0 bg-gradient-subtle opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <Sparkles 
        className={cn(
          'relative z-10 transition-all duration-300',
          loading && 'animate-spin',
          'group-hover:text-primary group-hover:scale-110',
          size === 'icon' ? 'h-4 w-4' : 'h-5 w-5'
        )} 
      />
    </Button>
  );
};