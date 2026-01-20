import type { ImageBlockContent } from '@/types/instructionBuilder';

interface ImageBlockProps {
  content: ImageBlockContent;
  blockId: string;
}

export function ImageBlock({ content }: ImageBlockProps) {
  if (!content.url) {
    return (
      <div className="h-48 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
        No image URL provided
      </div>
    );
  }

  return (
    <figure className="space-y-2">
      <img
        src={content.url}
        alt={content.alt || 'Credential image'}
        className="max-w-full rounded-lg border"
      />
      {content.caption && (
        <figcaption className="text-sm text-muted-foreground text-center">
          {content.caption}
        </figcaption>
      )}
    </figure>
  );
}
