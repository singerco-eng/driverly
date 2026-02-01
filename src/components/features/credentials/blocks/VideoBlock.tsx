import { useState } from 'react';
import type { VideoBlockContent } from '@/types/instructionBuilder';
import type { StepState } from '@/types/credentialProgress';
import { Play, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VideoBlockProps {
  content: VideoBlockContent;
  blockId: string;
  stepState: StepState;
  onStateChange: (updates: Partial<StepState>) => void;
  disabled?: boolean;
  readOnly?: boolean;
}

function getEmbedUrl(source: string, url: string): string | null {
  if (source === 'youtube') {
    // Extract video ID from various YouTube URL formats
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/);
    if (match) {
      return `https://www.youtube.com/embed/${match[1]}`;
    }
  } else if (source === 'vimeo') {
    const match = url.match(/vimeo\.com\/(\d+)/);
    if (match) {
      return `https://player.vimeo.com/video/${match[1]}`;
    }
  }
  return url; // For 'upload' type or direct embed URLs
}

export function VideoBlock({
  content,
  blockId,
  stepState,
  onStateChange,
  disabled,
  readOnly,
}: VideoBlockProps) {
  const [hasStarted, setHasStarted] = useState(false);
  const isWatched = stepState.videosWatched[blockId] ?? false;
  const isDisabled = disabled || readOnly;

  const embedUrl = getEmbedUrl(content.source, content.url);

  const handlePlay = () => {
    setHasStarted(true);
    // For simplicity, mark as watched when they start playing
    // In a real implementation, you'd track actual watch time
    if (!isDisabled && content.requireWatch) {
      setTimeout(() => {
        onStateChange({
          videosWatched: { ...stepState.videosWatched, [blockId]: true },
        });
      }, 3000); // Mark watched after 3 seconds
    }
  };

  if (!embedUrl) {
    return (
      <div className="aspect-video rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
        Invalid video URL
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {content.title && (
        <h4 className="font-medium flex items-center gap-2">
          {content.title}
          {content.requireWatch && isWatched && (
            <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
          )}
        </h4>
      )}
      
      <div className="relative rounded-lg overflow-hidden bg-black max-h-80">
        <div className="aspect-video">
          {!hasStarted ? (
            <button
              onClick={handlePlay}
              disabled={isDisabled}
              className={cn(
                'w-full h-full flex flex-col items-center justify-center gap-3 relative',
                !isDisabled && 'cursor-pointer group'
              )}
            >
              {/* Thumbnail background for uploaded videos */}
              {content.source === 'upload' && (
                <img
                  src={content.url.replace(/\.[^.]+$/, '-thumbnail.png')}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={(e) => {
                    // Hide image if thumbnail doesn't exist
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )}
              {/* Overlay */}
              <div className={cn(
                'absolute inset-0 bg-black/40 transition-colors',
                !isDisabled && 'group-hover:bg-black/30'
              )} />
              {/* Play button */}
              <div className="relative z-10 w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center shadow-lg">
                <Play className="w-8 h-8 text-primary-foreground ml-1" />
              </div>
              <span className="relative z-10 text-sm text-white/90 font-medium drop-shadow">Click to play</span>
            </button>
          ) : content.source === 'upload' ? (
            <video
              src={content.url}
              className="w-full h-full"
              autoPlay
              controls
              playsInline
            />
          ) : (
            <iframe
              src={embedUrl}
              className="w-full h-full"
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
        </div>
      </div>

      {!readOnly && content.requireWatch && !isWatched && (
        <p className="text-xs text-muted-foreground">
          ⓘ You must watch this video to continue
        </p>
      )}
    </div>
  );
}
