import type { ParagraphBlockContent } from '@/types/instructionBuilder';

interface ParagraphBlockProps {
  content: ParagraphBlockContent;
  blockId: string;
}

export function ParagraphBlock({ content }: ParagraphBlockProps) {
  if (!content.text) {
    return null;
  }

  return (
    <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
      {content.text}
    </p>
  );
}
