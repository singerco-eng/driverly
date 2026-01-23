import type { RichTextBlockContent } from '@/types/instructionBuilder';

interface RichTextBlockProps {
  content: RichTextBlockContent;
  blockId: string;
}

export function RichTextBlock({ content }: RichTextBlockProps) {
  if (!content.html) {
    return null;
  }

  // Note: In production, sanitize HTML with DOMPurify or similar
  return (
    <div 
      className="prose prose-sm dark:prose-invert max-w-none p-4 rounded-lg bg-muted/50 border border-border/50 [&>p]:text-foreground [&>ul]:text-foreground [&>ol]:text-foreground [&_strong]:text-foreground"
      dangerouslySetInnerHTML={{ __html: content.html }}
    />
  );
}
