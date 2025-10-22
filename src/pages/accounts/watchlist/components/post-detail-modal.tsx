'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, MessageCircle, Repeat2, ThumbsUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { fetchPostDetail } from '../api';

interface PostDetailModalProps {
  open: boolean;
  postId: string | null;
  onOpenChange: (open: boolean) => void;
}

export function PostDetailModal({ open, postId, onOpenChange }: PostDetailModalProps) {
  const query = useQuery({
    queryKey: ['watchlistPostDetail', postId],
    queryFn: () => fetchPostDetail(postId!),
    enabled: open && Boolean(postId),
  });

  const detail = query.data;

  const media = useMemo(() => {
    if (!detail) {
      return null;
    }

    if (detail.images && detail.images.length > 0) {
      return detail.images[0].src;
    }

    if (detail.videos && detail.videos.length > 0) {
      return detail.videos[0].thumbnail ?? detail.videos[0].src;
    }

    return detail.previewImage ?? null;
  }, [detail]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Post Details</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          {query.isLoading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : detail ? (
            <ScrollArea className="max-h-[420px] space-y-4 pr-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">
                      {detail.accountDisplayName} • {detail.accountHandle}
                    </p>
                    <p className="text-sm leading-relaxed text-foreground whitespace-pre-line">{detail.content}</p>
                  </div>
                </div>
                {detail.hashtags && detail.hashtags.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {detail.hashtags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                ) : null}
                {detail.categoryTags && detail.categoryTags.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {detail.categoryTags.map((tag) => (
                      <Badge key={tag} variant="secondary" appearance="light" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
              {media ? (
                <div className="overflow-hidden rounded-lg border">
                  <img src={media} alt="Post preview" className="h-auto w-full object-cover" />
                </div>
              ) : null}
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <ThumbsUp className="size-4 text-foreground" />
                  <span className="font-semibold text-foreground">{detail.likes.toLocaleString()}</span>
                  <span>likes</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageCircle className="size-4 text-foreground" />
                  <span className="font-semibold text-foreground">{detail.replies.toLocaleString()}</span>
                  <span>comments</span>
                </div>
                <div className="flex items-center gap-1">
                  <Repeat2 className="size-4 text-foreground" />
                  <span className="font-semibold text-foreground">{detail.reposts.toLocaleString()}</span>
                  <span>reposts</span>
                </div>
                {typeof detail.engagementRate === 'number' ? (
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-foreground">{detail.engagementRate.toFixed(2)}%</span>
                    <span>engagement</span>
                  </div>
                ) : null}
                <Badge variant="outline" className="capitalize">
                  {detail.sentiment} sentiment
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                <p>Captured at: {detail.capturedAt ? new Date(detail.capturedAt).toLocaleString() : '—'}</p>
                {detail.originalUrl ? (
                  <p>
                    Original URL:{' '}
                    <a
                      href={detail.originalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      {detail.originalUrl}
                    </a>
                  </p>
                ) : null}
              </div>
              {detail.sentimentSummary ? (
                <p className="text-sm text-muted-foreground">{detail.sentimentSummary}</p>
              ) : null}
            </ScrollArea>
          ) : (
            <p className="text-sm text-muted-foreground">Unable to load post details.</p>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
