'use client';

import { type ComponentProps, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RiCheckboxCircleFill } from '@remixicon/react';
import {
  AlertCircle,
  EllipsisVertical,
  LoaderCircle,
  RefreshCcw,
  Server,
} from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardHeading,
  CardTable,
  CardTitle,
  CardToolbar,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Pagination, PaginationContent, PaginationItem } from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableLoadingState } from '@/components/ui/table-loading-state';
import {
  cancelPublishJob,
  getPublishJobs,
  PublishJobRecord,
  retryPublishJob,
} from './api';
import { PublishJobFormDialog } from './components/publish-job-form-dialog';
import { PublishJobDetailDialog } from './components/publish-job-detail-dialog';

const PAGE_SIZE_OPTIONS = [10, 20, 50];

type ConfirmState = {
  action: 'retry' | 'cancel';
  jobId: string;
} | null;

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

export function PublishingModuleContent() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE_OPTIONS[0]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [detailJobId, setDetailJobId] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);

  const publishJobsQuery = useQuery({
    queryKey: ['publish-jobs', page, limit],
    queryFn: () => getPublishJobs({ page, limit }),
    keepPreviousData: true,
  });

  const retryMutation = useMutation({
    mutationFn: (id: string) => retryPublishJob(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['publish-jobs'] });
      toast.custom(
        (t) => (
          <Alert variant="mono" icon="success" onClose={() => toast.dismiss(t)}>
            <AlertIcon>
              <RiCheckboxCircleFill />
            </AlertIcon>
            <AlertTitle>Publish job retried successfully.</AlertTitle>
          </Alert>
        ),
        {
          duration: 4000,
        },
      );
      setConfirmState(null);
    },
    onError: (mutationError: Error) => {
      toast.custom(
        (t) => (
          <Alert variant="mono" icon="destructive" onClose={() => toast.dismiss(t)}>
            <AlertIcon>
              <AlertCircle className="size-5" />
            </AlertIcon>
            <AlertTitle>{mutationError.message}</AlertTitle>
          </Alert>
        ),
        {
          duration: 5000,
        },
      );
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelPublishJob(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['publish-jobs'] });
      toast.custom(
        (t) => (
          <Alert variant="mono" icon="success" onClose={() => toast.dismiss(t)}>
            <AlertIcon>
              <RiCheckboxCircleFill />
            </AlertIcon>
            <AlertTitle>Publish job cancelled successfully.</AlertTitle>
          </Alert>
        ),
        {
          duration: 4000,
        },
      );
      setConfirmState(null);
    },
    onError: (mutationError: Error) => {
      toast.custom(
        (t) => (
          <Alert variant="mono" icon="destructive" onClose={() => toast.dismiss(t)}>
            <AlertIcon>
              <AlertCircle className="size-5" />
            </AlertIcon>
            <AlertTitle>{mutationError.message}</AlertTitle>
          </Alert>
        ),
        {
          duration: 5000,
        },
      );
    },
  });

  const data = publishJobsQuery.data;
  const records: PublishJobRecord[] = data?.data ?? [];

  const paginationMeta = useMemo(() => {
    const total = data?.meta?.total;
    const totalPages = data?.meta?.totalPages;
    const resolvedTotalPages =
      typeof totalPages === 'number'
        ? totalPages
        : typeof total === 'number'
          ? Math.max(1, Math.ceil(total / limit))
          : undefined;

    const canGoNext =
      resolvedTotalPages !== undefined
        ? page < resolvedTotalPages
        : (data?.data?.length ?? 0) === limit;

    const canGoPrevious = page > 1;

    return {
      total,
      totalPages: resolvedTotalPages,
      canGoNext,
      canGoPrevious,
    };
  }, [data, limit, page]);

  const handleNextPage = () => {
    if (paginationMeta.canGoNext) {
      setPage((current) => current + 1);
    }
  };

  const handlePreviousPage = () => {
    if (paginationMeta.canGoPrevious) {
      setPage((current) => Math.max(1, current - 1));
    }
  };

  const handlePageSizeChange = (value: string) => {
    const nextLimit = Number(value);
    setLimit(nextLimit);
    setPage(1);
  };

  const openRetryConfirm = (jobId: string) => {
    setConfirmState({ action: 'retry', jobId });
  };

  const openCancelConfirm = (jobId: string) => {
    setConfirmState({ action: 'cancel', jobId });
  };

  const closeConfirm = () => {
    setConfirmState(null);
  };

  const confirmAction = () => {
    if (!confirmState) {
      return;
    }

    if (confirmState.action === 'retry') {
      retryMutation.mutate(confirmState.jobId);
    } else {
      cancelMutation.mutate(confirmState.jobId);
    }
  };

  const isMutating = retryMutation.isPending || cancelMutation.isPending;
  const hasError = publishJobsQuery.isError;
  const error = publishJobsQuery.error as Error | null;

  return (
    <>
      <Card>
        <CardHeader className="py-4">
          <CardHeading>
            <CardTitle>Publishing Jobs</CardTitle>
            <span className="text-sm text-muted-foreground">
              Monitor scheduled and completed publishing jobs.
            </span>
          </CardHeading>
          <CardToolbar>
            <Button onClick={() => setIsFormOpen(true)}>Create Publish Job</Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => void queryClient.invalidateQueries({ queryKey: ['publish-jobs'] })}
            >
              <RefreshCcw className="size-4" />
            </Button>
          </CardToolbar>
        </CardHeader>
        <CardTable>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Content</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="sticky right-0 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {publishJobsQuery.isLoading ? (
                <TableLoadingState colSpan={7} message="Loading publish jobs..." cellClassName="py-12" />
              ) : hasError ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-6">
                    <Alert variant="mono" icon="destructive">
                      <AlertIcon>
                        <Server className="size-5" />
                      </AlertIcon>
                      <AlertTitle>{error?.message ?? 'Failed to load publish jobs.'}</AlertTitle>
                    </Alert>
                  </TableCell>
                </TableRow>
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                    No publish jobs found.
                  </TableCell>
                </TableRow>
              ) : (
                records.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium">{job.contentTitle || '—'}</TableCell>
                    <TableCell>{job.accountName || '—'}</TableCell>
                    <TableCell>{getStatusBadge(job.status)}</TableCell>
                    <TableCell>{formatDate(job.scheduledAt)}</TableCell>
                    <TableCell>{formatDate(job.createdAt)}</TableCell>
                    <TableCell>{formatDate(job.updatedAt)}</TableCell>
                    <TableCell className="sticky right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="hover:bg-muted">
                            <EllipsisVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setDetailJobId(job.id)}>
                            View Detail
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openRetryConfirm(job.id)}
                            disabled={isMutating}
                          >
                            Retry
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => openCancelConfirm(job.id)}
                            disabled={isMutating}
                          >
                            Cancel
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardTable>
        <CardContent className="pt-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Rows per page:</span>
              <Select value={String(limit)} onValueChange={handlePageSizeChange}>
                <SelectTrigger className="w-[90px]">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={String(option)}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-4">
              <Pagination className="sm:order-2">
                <PaginationContent>
                  <PaginationItem>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePreviousPage}
                      disabled={!paginationMeta.canGoPrevious}
                    >
                      Previous
                    </Button>
                  </PaginationItem>
                  <PaginationItem>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextPage}
                      disabled={!paginationMeta.canGoNext}
                    >
                      Next
                    </Button>
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
              <div className="text-sm text-muted-foreground sm:order-1">
                Page {page}
                {paginationMeta.totalPages ? ` of ${paginationMeta.totalPages}` : ''}
                {typeof paginationMeta.total === 'number' ? ` • ${paginationMeta.total} total` : ''}
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <span className="text-xs text-muted-foreground">
            {records.length} item{records.length === 1 ? '' : 's'} on this page.
          </span>
        </CardFooter>
      </Card>

      <PublishJobFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} />

      <PublishJobDetailDialog
        jobId={detailJobId}
        open={detailJobId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDetailJobId(null);
          }
        }}
      />

      <AlertDialog
        open={!!confirmState}
        onOpenChange={(open) => {
          if (!open) {
            closeConfirm();
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmState?.action === 'retry' ? 'Retry publish job' : 'Cancel publish job'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmState?.action === 'retry'
                ? 'Are you sure you want to retry this job? It will be sent to the publishing queue again.'
                : 'Are you sure you want to cancel this job? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline" onClick={closeConfirm} disabled={isMutating}>
                Close
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant={confirmState?.action === 'cancel' ? 'destructive' : 'default'}
                onClick={confirmAction}
                disabled={isMutating}
              >
                {isMutating && <LoaderCircle className="mr-2 size-4 animate-spin" />}
                {confirmState?.action === 'retry' ? 'Retry job' : 'Cancel job'}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
