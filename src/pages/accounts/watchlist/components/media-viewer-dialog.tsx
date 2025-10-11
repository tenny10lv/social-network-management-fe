'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Button } from '@/components/ui/button';
import { PostMediaImage, PostMediaVideo } from '../types';

interface MediaViewerDialogProps {
  open: boolean;
  type: 'images' | 'videos';
  title: string;
  images?: PostMediaImage[];
  videos?: PostMediaVideo[];
  onOpenChange: (open: boolean) => void;
}

export function MediaViewerDialog({
  open,
  type,
  title,
  images,
  videos,
  onOpenChange,
}: MediaViewerDialogProps) {
  const [activeImage, setActiveImage] = useState<PostMediaImage | null>(null);

  useEffect(() => {
    if (!open) {
      setActiveImage(null);
    }
  }, [open]);

  const isImages = type === 'images';
  const itemsCount = isImages ? images?.length ?? 0 : videos?.length ?? 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            {itemsCount === 0 ? (
              <p className="text-sm text-muted-foreground">
                {isImages ? 'No images available for this post.' : 'No videos available for this post.'}
              </p>
            ) : isImages ? (
              <ScrollArea className="max-h-[70vh]" viewportClassName="max-h-[70vh] pr-3">
                <div className="grid gap-4 sm:grid-cols-2">
                  {images?.map((image, index) => (
                    <button
                      key={`${image.src}-${index}`}
                      type="button"
                      onClick={() => setActiveImage(image)}
                      className="group flex flex-col gap-2 rounded-lg border border-border bg-muted/20 p-2 text-left transition hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      <AspectRatio ratio={4 / 5} className="overflow-hidden rounded-md">
                        <img src={image.src} alt={image.alt ?? 'Post image preview'} className="h-full w-full object-cover" />
                      </AspectRatio>
                      {image.alt && <span className="line-clamp-2 text-xs text-muted-foreground">{image.alt}</span>}
                      <span className="text-xs font-medium text-primary transition group-hover:text-primary/80">
                        View full size
                      </span>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <ScrollArea className="max-h-[70vh]" viewportClassName="max-h-[70vh] pr-3">
                <div className="space-y-6">
                  {videos?.map((video, index) => (
                    <div key={`${video.src}-${index}`} className="space-y-2">
                      <AspectRatio ratio={16 / 9} className="overflow-hidden rounded-lg border border-border">
                        <video
                          controls
                          poster={video.thumbnail}
                          className="h-full w-full bg-black object-cover"
                        >
                          <source src={video.src} type="video/mp4" />
                          Your browser does not support the video tag.
                        </video>
                      </AspectRatio>
                      {video.title && <p className="text-sm font-medium text-foreground">{video.title}</p>}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Playback hosted preview</span>
                        <Button asChild variant="link" className="h-auto p-0 text-xs">
                          <a href={video.src} target="_blank" rel="noreferrer">
                            Open in new tab
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(activeImage)} onOpenChange={(nextOpen) => !nextOpen && setActiveImage(null)}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{activeImage?.alt ?? 'Full resolution image'}</DialogTitle>
          </DialogHeader>
          <DialogBody className="flex items-center justify-center">
            {activeImage && (
              <img
                src={activeImage.full ?? activeImage.src}
                alt={activeImage.alt ?? 'Full resolution post image'}
                className="max-h-[75vh] w-auto max-w-full rounded-lg object-contain"
              />
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  );
}
