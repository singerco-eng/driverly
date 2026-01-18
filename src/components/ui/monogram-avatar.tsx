
import React from 'react';
import { Avatar, AvatarFallback, avatarVariants } from './avatar';
import { cn } from '@/lib/utils';
import { type VariantProps } from 'class-variance-authority';

const monogramStyles = [
  'bg-gradient-to-br from-primary to-primary-glow text-white',
  'bg-gradient-to-br from-accent to-primary text-white', 
  'bg-gradient-to-br from-primary-glow to-accent text-white',
  'bg-gradient-to-br from-success to-primary text-white',
  'bg-gradient-to-br from-warning to-accent text-white',
  'bg-gradient-to-br from-primary to-accent text-white',
];

interface MonogramAvatarProps extends VariantProps<typeof avatarVariants> {
  name: string;
  className?: string;
  variant?: number;
}

const getInitials = (name: string) => {
  return name
    .split(' ')
    .filter(part => part.length > 0)
    .map(part => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
};

export const MonogramAvatar: React.FC<MonogramAvatarProps> = ({
  name,
  size = "default",
  className,
  variant,
  ...props
}) => {
  const initials = getInitials(name);
  
  // Use provided variant or generate one based on name
  const styleIndex = variant !== undefined 
    ? variant % monogramStyles.length
    : Math.abs(name.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0)) % monogramStyles.length;
  
  const monogramStyle = monogramStyles[styleIndex];

  return (
    <Avatar size={size} className={className} {...props}>
      <AvatarFallback className={cn(monogramStyle, "font-semibold text-sm")}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
};
