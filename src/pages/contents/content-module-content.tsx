'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { EllipsisVertical, LoaderCircle, Pencil, RefreshCcw, Server, Trash2 } from 'lucide-react';
import { RiCheckboxCircleFill } from '@remixicon/react';
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
import {
  CONTENT_ACCOUNT_OPTIONS_QUERY_KEY,
  ContentRecord,
  deleteContent,
  getAccountOptions,
  getContents,
} from './api';
import { ContentFormDialog } from './components/content-form-dialog';

const PAGE_SIZE_OPTIONS = [10, 20, 50];

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

const getStatusBadgeVariant = (status?: string | null) => {
  if (!status) {
    return 'secondary';
  }

  const normalized = status.toString().toLowerCase();

  if (['published', 'active', 'live'].includes(normalized)) {
    return 'success';
  }

  if (['scheduled', 'pending'].includes(normalized)) {
    return 'info';
  }

  if (['draft'].includes(normalized)) {
    return 'secondary';
  }

  return 'secondary';
};

export function ContentModuleContent() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE_OPTIONS[0]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const contentsQuery = useQuery({
    queryKey: ['contents', page, limit],
    queryFn: () => getContents({ page, limit }),
    keepPreviousData: true,
  });

  const accountOptionsQuery = useQuery({
    queryKey: CONTENT_ACCOUNT_OPTIONS_QUERY_KEY,
    queryFn: getAccountOptions,
    staleTime: 5 * 60 * 1000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteContent(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['contents'] });
      toast.custom(
        (t) => (
          <Alert variant="mono" icon="success" onClose={() => toast.dismiss(t)}>
            <AlertIcon>
              <RiCheckboxCircleFill />
            </AlertIcon>
            <AlertTitle>Content deleted successfully.</AlertTitle>
          </Alert>
        ),
        {
          duration: 4000,
        },
      );
      setIsConfirmOpen(false);
      setSelectedContentId(null);
    }
  });

  const data = contentsQuery.data;

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

  const accountLookup = useMemo(() => {
    const options = accountOptionsQuery.data ?? [];

    return options.reduce<Record<string, string>>((accumulator, option) => {
      accumulator[option.id] = option.name;
      return accumulator;
    }, {});
  }, [accountOptionsQuery.data]);

  const openCreateModal = () => {
    setFormMode('create');
    setSelectedContentId(null);
    setIsFormOpen(true);
  };

  const openEditModal = (id: string) => {
    setFormMode('edit');
    setSelectedContentId(id);
    setIsFormOpen(true);
  };

  const openDeleteConfirm = (id: string) => {
    setSelectedContentId(id);
    setIsConfirmOpen(true);
  };

  const closeDeleteConfirm = () => {
    setIsConfirmOpen(false);
    setSelectedContentId(null);
  };

  const handleDelete = () => {
    if (selectedContentId) {
      deleteMutation.mutate(selectedContentId);
    }
  };

  const handlePageSizeChange = (value: string) => {
    const nextLimit = Number(value);
    setLimit(nextLimit);
    setPage(1);
  };

  const handlePreviousPage = () => {
    if (paginationMeta.canGoPrevious) {
      setPage((current) => Math.max(1, current - 1));
    }
  };

  const handleNextPage = () => {
    if (paginationMeta.canGoNext) {
      setPage((current) => current + 1);
    }
  };

  const isLoading = contentsQuery.isLoading || contentsQuery.isFetching;
  const hasError = contentsQuery.isError;
  const error = contentsQuery.error as Error | null;
  const records: ContentRecord[] = data?.data ?? [];

  return (
    <>
      <Card>
        <CardHeader className="py-4">
          <CardHeading>
            <CardTitle>Contents</CardTitle>
            <span className="text-sm text-muted-foreground">
              Create, schedule, and monitor your social content pipeline.
            </span>
          </CardHeading>
          <CardToolbar>
            <Button onClick={openCreateModal}>Create Content</Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => void queryClient.invalidateQueries({ queryKey: ['contents'] })}
            >
              <RefreshCcw className="size-4" />
            </Button>
          </CardToolbar>
        </CardHeader>
        <CardTable>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Type</TableHead>
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
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2 text-sm">
                      <LoaderCircle className="size-4 animate-spin" />
                      Loading contents...
                    </div>
                  </TableCell>
                </TableRow>
              ) : hasError ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-6">
                    <Alert variant="mono" icon="destructive">
                      <AlertIcon>
                        <Server className="size-5" />
                      </AlertIcon>
                      <AlertTitle>{error?.message ?? 'Failed to load contents.'}</AlertTitle>
                    </Alert>
                  </TableCell>
                </TableRow>
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                    No content found.
                  </TableCell>
                </TableRow>
              ) : (
                records.map((content) => {
                  const accountLabel =
                    accountLookup[content.accountId] ?? content.accountName ?? '—';

                  return (
                    <TableRow key={content.id}>
                      <TableCell className="max-w-[220px] truncate font-medium">
                        {content.title || '—'}
                      </TableCell>
                      <TableCell>{accountLabel}</TableCell>
                      <TableCell>
                        <Badge variant="outline" appearance="light">
                          {content.type ?? '—'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(content.status)} appearance="light">
                          {content.status ?? '—'}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(content.scheduledAt)}</TableCell>
                      <TableCell>{formatDate(content.createdAt)}</TableCell>
                      <TableCell>{formatDate(content.updatedAt)}</TableCell>
                      <TableCell className="sticky right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="hover:bg-muted">
                              <EllipsisVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditModal(content.id)}>
                              <Pencil className="me-2 size-4" />
                              Update
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openDeleteConfirm(content.id)}
                              variant="destructive"
                            >
                              <Trash2 className="me-2 size-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
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
                {typeof paginationMeta.total === 'number'
                  ? ` • ${paginationMeta.total} total`
                  : ''}
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

      <ContentFormDialog
        key={formMode === 'edit' ? selectedContentId ?? 'edit' : 'create'}
        mode={formMode}
        contentId={selectedContentId}
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) {
            setSelectedContentId(null);
          }
        }}
      />

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete content</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this content item? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline" onClick={closeDeleteConfirm}>
                Cancel
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending && (
                  <LoaderCircle className="mr-2 size-4 animate-spin" />
                )}
                Delete
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
