'use client';

import { type ComponentProps, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, LoaderCircle } from 'lucide-react';
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Code } from '@/components/ui/code';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { getPublishJob, PublishJobRecord } from '../api';

interface PublishJobDetailDialogProps {
  jobId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formatDate = (value?: string | null) => {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const getStatusBadge = (status?: string | null) => {
  if (!status) {
    return <Badge appearance="light">Unknown</Badge>;
  }

  const normalized = status.toString().toLowerCase();

  let variant: ComponentProps<typeof Badge>['variant'] = 'secondary';

  if (['completed', 'success', 'successful', 'published', 'done'].includes(normalized)) {
    variant = 'success';
  } else if (['failed', 'error', 'cancelled', 'canceled'].includes(normalized)) {
    variant = 'destructive';
  } else if (['pending', 'queued', 'waiting', 'scheduled'].includes(normalized)) {
    variant = 'info';
  } else if (['running', 'processing', 'in_progress', 'in-progress'].includes(normalized)) {
    variant = 'warning';
  }

  const label = status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <Badge variant={variant} appearance="light">
      {label}
    </Badge>
  );
};

const formatPlatformResponse = (value: PublishJobRecord['platformResponse']) => {
  if (value === null || typeof value === 'undefined') {
    return 'No platform response.';
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return value;
    }
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

export function PublishJobDetailDialog({ jobId, open, onOpenChange }: PublishJobDetailDialogProps) {
  const jobQuery = useQuery<PublishJobRecord, Error>({
    queryKey: ['publish-job', jobId],
    queryFn: () => getPublishJob(jobId as string),
    enabled: open && !!jobId,
  });

  const statusBadge = useMemo(() => getStatusBadge(jobQuery.data?.status), [jobQuery.data?.status]);
  const platformResponse = useMemo(
    () => formatPlatformResponse(jobQuery.data?.platformResponse),
    [jobQuery.data?.platformResponse],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Publish Job Detail</DialogTitle>
        </DialogHeader>
        <DialogBody>
          {jobQuery.isLoading ? (
            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
              <LoaderCircle className="mr-2 size-4 animate-spin" />
              Loading job detail...
            </div>
          ) : jobQuery.isError ? (
            <Alert variant="mono" icon="destructive">
              <AlertIcon>
                <AlertCircle className="size-5" />
              </AlertIcon>
              <AlertTitle>{jobQuery.error?.message ?? 'Failed to load job detail.'}</AlertTitle>
            </Alert>
          ) : jobQuery.data ? (
            <div className="space-y-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-xs text-muted-foreground uppercase">Account</div>
                  <div className="text-sm font-medium">{jobQuery.data.accountName || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase">Content</div>
                  <div className="text-sm font-medium">{jobQuery.data.contentTitle || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase">Status</div>
                  <div className="mt-1">{statusBadge}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase">Scheduled</div>
                  <div className="text-sm font-medium">{formatDate(jobQuery.data.scheduledAt)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase">Created</div>
                  <div className="text-sm font-medium">{formatDate(jobQuery.data.createdAt)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase">Updated</div>
                  <div className="text-sm font-medium">{formatDate(jobQuery.data.updatedAt)}</div>
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase">Platform response</div>
                <ScrollArea className="mt-2 max-h-64">
                  <Code
                    asChild
                    variant="outline"
                    size="sm"
                    className="block w-full rounded-md"
                    showCopyButton
                    copyText={platformResponse}
                  >
                    <pre className="max-h-64 w-full whitespace-pre-wrap break-words font-mono text-xs leading-5">
                      {platformResponse}
                    </pre>
                  </Code>
                </ScrollArea>
              </div>
            </div>
          ) : (
            <div className="py-6 text-sm text-muted-foreground">No job data available.</div>
          )}
        </DialogBody>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
