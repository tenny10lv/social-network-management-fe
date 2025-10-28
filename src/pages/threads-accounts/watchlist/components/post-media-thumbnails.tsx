'use client';

import { Play } from 'lucide-react';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { cn } from '@/lib/utils';
import { PostMediaImage, PostMediaVideo } from '../types';

interface PostMediaThumbnailsProps {
  type: 'images' | 'videos';
  images?: PostMediaImage[];
  videos?: PostMediaVideo[];
  onClick?: (index: number) => void;
  className?: string;
}

export function PostMediaThumbnails({
  type,
  images,
  videos,
  onClick,
  className,
}: PostMediaThumbnailsProps) {
  const isImagePreview = type === 'images';
  const items = isImagePreview ? images ?? [] : videos ?? [];

  if (items.length === 0) {
    return (
      <span className={cn('text-xs text-muted-foreground', className)}>
        {isImagePreview ? 'No images' : 'No videos'}
      </span>
    );
  }

  const visibleItems = items.slice(0, 4);
  const remaining = Math.max(items.length - visibleItems.length, 0);

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {visibleItems.map((item, index) => {
        const showOverflowBadge = remaining > 0 && index === visibleItems.length - 1;

        return (
          <button
            key={index}
            type="button"
            onClick={() => onClick?.(index)}
            aria-label={
              isImagePreview
                ? `Open image ${index + 1} gallery`
                : `Open video ${index + 1} gallery`
            }
            className="group relative h-14 w-14 overflow-hidden rounded-md border border-border bg-muted/40 text-left transition hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <AspectRatio ratio={1} className="h-full w-full">
              {isImagePreview ? (
                <img
                  src={(item as PostMediaImage).src}
                  alt={(item as PostMediaImage).alt ?? 'Post media image'}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="relative h-full w-full">
                  {(item as PostMediaVideo).thumbnail ? (
                    <img
                      src={(item as PostMediaVideo).thumbnail}
                      alt={(item as PostMediaVideo).title ?? 'Post media video'}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
                      <Play className="size-5" />
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white transition group-hover:bg-black/30">
                    <Play className="size-4" />
                  </div>
                </div>
              )}
            </AspectRatio>
            {showOverflowBadge && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-xs font-semibold text-white">
                +{remaining}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
