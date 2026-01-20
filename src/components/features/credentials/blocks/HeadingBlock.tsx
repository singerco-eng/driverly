import type { HeadingBlockContent } from '@/types/instructionBuilder';
import { cn } from '@/lib/utils';

interface HeadingBlockProps {
  content: HeadingBlockContent;
  blockId: string;
}

const levelStyles = {
  1: 'text-2xl font-bold',
  2: 'text-xl font-semibold',
  3: 'text-lg font-medium',
};

export function HeadingBlock({ content }: HeadingBlockProps) {
  const Tag = `h${content.level}` as 'h1' | 'h2' | 'h3';
  
  return (
    <Tag className={cn(levelStyles[content.level], 'text-foreground')}>
      {content.text}
    </Tag>
  );
}
