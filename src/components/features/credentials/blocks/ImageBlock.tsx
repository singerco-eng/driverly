import type { ImageBlockContent } from '@/types/instructionBuilder';

interface ImageBlockProps {
  content: ImageBlockContent;
  blockId: string;
  readOnly?: boolean;
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
        className="max-w-full max-h-80 object-contain rounded-lg border"
        loading="lazy"
      />
      {content.caption && (
        <figcaption className="text-sm text-muted-foreground text-center">
          {content.caption}
        </figcaption>
      )}
    </figure>
  );
}
