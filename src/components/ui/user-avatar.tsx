
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage, avatarVariants } from './avatar';
import { cn } from '@/lib/utils';
import { type VariantProps } from 'class-variance-authority';

const monogramVariants = [
  'bg-gradient-to-br from-primary to-primary-glow text-white',
  'bg-gradient-to-br from-accent to-primary text-white',
  'bg-gradient-to-br from-primary-glow to-accent text-white',
  'bg-gradient-to-br from-success to-primary text-white',
  'bg-gradient-to-br from-warning to-accent text-white',
];

interface UserAvatarProps extends VariantProps<typeof avatarVariants> {
  src?: string | null;
  fullName?: string | null;
  email?: string;
  className?: string;
  fallbackIcon?: React.ReactNode;
}

const getMonogramVariant = (name: string) => {
  const hash = name.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  return monogramVariants[Math.abs(hash) % monogramVariants.length];
};

const getInitials = (fullName: string) => {
  return fullName
    .split(' ')
    .map(name => name.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  fullName,
  email,
  size = "default",
  className,
  fallbackIcon,
  ...props
}) => {
  const displayName = fullName || email || 'User';
  const initials = getInitials(displayName);
  const monogramClass = getMonogramVariant(displayName);

  return (
    <Avatar size={size} className={className} {...props}>
      {src && <AvatarImage src={src} alt={displayName} />}
      <AvatarFallback className={cn(monogramClass, "font-semibold")}>
        {fullName ? initials : fallbackIcon || initials}
      </AvatarFallback>
    </Avatar>
  );
};
