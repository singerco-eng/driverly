import type { DividerBlockContent } from '@/types/instructionBuilder';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface DividerBlockProps {
  content: DividerBlockContent;
  blockId: string;
  readOnly?: boolean;
}

export function DividerBlock({ content }: DividerBlockProps) {
  return (
    <Separator
      className={cn(
        content.style === 'dashed' && 'border-dashed',
        content.style === 'dotted' && 'border-dotted'
      )}
    />
  );
}
