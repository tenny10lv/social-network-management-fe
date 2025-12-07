'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RiCheckboxCircleFill } from '@remixicon/react';
import {
  AlertCircle,
  EllipsisVertical,
  LoaderCircle,
  RefreshCcw,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TableLoadingState } from '@/components/ui/table-loading-state';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Pagination, PaginationContent, PaginationItem } from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  BROWSER_CONTEXTS_QUERY_KEY,
  BROWSER_CONTEXT_ACCOUNT_OPTIONS_QUERY_KEY,
  BrowserContextAccountOption,
  BrowserContextRecord,
  deleteBrowserContext,
  getAccountOptions,
  getBrowserContexts,
} from './api';
import { BrowserContextFormDialog } from './components/browser-context-form-dialog';

const PAGE_SIZE_OPTIONS = [10, 20, 50];
const ALL_ACCOUNTS_FILTER = 'all';

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

const renderStatusBadge = (isActive: boolean) => (
  <Badge variant={isActive ? 'success' : 'secondary'} appearance="light">
    {isActive ? 'Active' : 'Inactive'}
  </Badge>
);

const renderViewport = (width?: number | null, height?: number | null) => {
  if (!width || !height) {
    return '—';
  }

  return `${width} × ${height}`;
};

export function BrowserContextsModuleContent() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE_OPTIONS[0]);
  const [accountFilter, setAccountFilter] = useState(ALL_ACCOUNTS_FILTER);
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedContextId, setSelectedContextId] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedSearch(searchValue.trim());
    }, 300);

    return () => {
      window.clearTimeout(handle);
    };
  }, [searchValue]);

  useEffect(() => {
    setPage(1);
  }, [accountFilter, showActiveOnly, debouncedSearch]);

  const accountOptionsQuery = useQuery({
    queryKey: BROWSER_CONTEXT_ACCOUNT_OPTIONS_QUERY_KEY,
    queryFn: getAccountOptions,
    staleTime: 5 * 60 * 1000,
  });

  const selectedAccountId = accountFilter === ALL_ACCOUNTS_FILTER ? null : accountFilter;

  const contextsQuery = useQuery({
    queryKey: [
      BROWSER_CONTEXTS_QUERY_KEY,
      {
        page,
        limit,
        threadsAccountId: selectedAccountId,
        isActive: showActiveOnly ? true : null,
        search: debouncedSearch || null,
      },
    ],
    queryFn: () =>
      getBrowserContexts({
        page,
        limit,
        threadsAccountId: selectedAccountId ?? undefined,
        isActive: showActiveOnly ? true : undefined,
        search: debouncedSearch || undefined,
      }),
    keepPreviousData: true,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBrowserContext(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [BROWSER_CONTEXTS_QUERY_KEY] });
      toast.custom(
        (t) => (
          <Alert variant="mono" icon="success" onClose={() => toast.dismiss(t)}>
            <AlertIcon>
              <RiCheckboxCircleFill />
            </AlertIcon>
            <AlertTitle>Browser context deleted successfully.</AlertTitle>
          </Alert>
        ),
        {
          duration: 4000,
        },
      );
      setIsConfirmOpen(false);
      setSelectedContextId(null);
    },
    onError: (error: Error) => {
      toast.custom(
        (t) => (
          <Alert variant="mono" icon="destructive" onClose={() => toast.dismiss(t)}>
            <AlertIcon>
              <AlertCircle className="size-5" />
            </AlertIcon>
            <AlertTitle>{error.message}</AlertTitle>
          </Alert>
        ),
        {
          duration: 5000,
        },
      );
    },
  });

  const paginationMeta = useMemo(() => {
    const data = contextsQuery.data;
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
  }, [contextsQuery.data, limit, page]);

  const openCreateModal = () => {
    setFormMode('create');
    setSelectedContextId(null);
    setIsFormOpen(true);
  };

  const openEditModal = (id: string) => {
    setFormMode('edit');
    setSelectedContextId(id);
    setIsFormOpen(true);
  };

  const openDeleteConfirm = (id: string) => {
    setSelectedContextId(id);
    setIsConfirmOpen(true);
  };

  const closeDeleteConfirm = () => {
    setIsConfirmOpen(false);
    setSelectedContextId(null);
  };

  const handleDelete = () => {
    if (selectedContextId) {
      deleteMutation.mutate(selectedContextId);
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

  const isLoading = contextsQuery.isLoading || contextsQuery.isFetching;
  const hasError = contextsQuery.isError;
  const error = contextsQuery.error as Error | null;
  const records: BrowserContextRecord[] = contextsQuery.data?.data ?? [];
  const accountOptions = accountOptionsQuery.data ?? [];

  return (
    <>
      <Card>
        <CardHeader className="py-4">
          <CardHeading>
            <CardTitle>Browser Contexts</CardTitle>
            <span className="text-sm text-muted-foreground">
              Manage persistent browser environments used across automations.
            </span>
          </CardHeading>
          <CardToolbar>
            <Button onClick={openCreateModal}>Create Browser Context</Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() =>
                void queryClient.invalidateQueries({
                  queryKey: [BROWSER_CONTEXTS_QUERY_KEY],
                })
              }
            >
              <RefreshCcw className="size-4" />
            </Button>
          </CardToolbar>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4 py-3">
              <div className="flex flex-col gap-1">
                <Label htmlFor="browser-context-account-filter">Account</Label>
                <Select
                  value={accountFilter}
                  onValueChange={(value) => setAccountFilter(value)}
                  disabled={accountOptionsQuery.isLoading}
                >
                  <SelectTrigger id="browser-context-account-filter" className="w-[220px]">
                    <SelectValue
                      placeholder={
                        accountOptionsQuery.isLoading
                          ? 'Loading accounts...'
                          : 'All accounts'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_ACCOUNTS_FILTER}>All accounts</SelectItem>
                    {accountOptions.map((option: BrowserContextAccountOption) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.name}
                      </SelectItem>
                    ))}
                    {accountOptionsQuery.isError && (
                      <SelectItem value="__error" disabled>
                        Failed to load accounts
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="browser-context-status-filter">Active only</Label>
                <div className="flex items-center gap-3">
                  <Switch
                    id="browser-context-status-filter"
                    checked={showActiveOnly}
                    onCheckedChange={(checked) => setShowActiveOnly(checked)}
                  />
                  <span className="text-sm text-muted-foreground">
                    {showActiveOnly ? 'Showing active contexts' : 'Showing all contexts'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-1 lg:w-[260px]">
              <Label htmlFor="browser-context-search">Search by account</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="browser-context-search"
                  type="search"
                  placeholder="Search account name..."
                  className="pl-9"
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                />
              </div>
            </div>
          </div>
        </CardContent>
        <CardTable>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead>User Agent</TableHead>
                <TableHead>Viewport</TableHead>
                <TableHead>Timezone</TableHead>
                <TableHead>Locale</TableHead>
                <TableHead>Proxy URL</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="sticky right-0 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableLoadingState colSpan={11} message="Loading browser contexts..." cellClassName="py-12" />
              ) : hasError ? (
                <TableRow>
                  <TableCell colSpan={11} className="py-6">
                    <Alert variant="mono" icon="destructive">
                      <AlertIcon>
                        <AlertCircle className="size-5" />
                      </AlertIcon>
                      <AlertTitle>
                        {error?.message ?? 'Failed to load browser contexts.'}
                      </AlertTitle>
                    </Alert>
                  </TableCell>
                </TableRow>
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="py-12 text-center text-muted-foreground">
                    No browser contexts found.
                  </TableCell>
                </TableRow>
              ) : (
                records.map((context) => (
                  <TableRow key={context.id}>
                    <TableCell className="font-medium">{context.accountName || '—'}</TableCell>
                    <TableCell className="max-w-[240px] whitespace-pre-wrap break-words">
                      {context.userAgent ?? '—'}
                    </TableCell>
                    <TableCell>{renderViewport(context.viewportWidth, context.viewportHeight)}</TableCell>
                    <TableCell>{context.timezone ?? '—'}</TableCell>
                    <TableCell>{context.locale ?? '—'}</TableCell>
                    <TableCell className="max-w-[200px] whitespace-pre-wrap break-all">
                      {context.proxyUrl ?? '—'}
                    </TableCell>
                    <TableCell>{renderStatusBadge(context.isActive)}</TableCell>
                    <TableCell>{formatDate(context.lastUsedAt)}</TableCell>
                    <TableCell>{formatDate(context.createdAt)}</TableCell>
                    <TableCell>{formatDate(context.updatedAt)}</TableCell>
                    <TableCell className="sticky right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="hover:bg-muted">
                            <EllipsisVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditModal(context.id)}>
                            Update
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openDeleteConfirm(context.id)}
                            variant="destructive"
                          >
                            Delete
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

      <BrowserContextFormDialog
        mode={formMode}
        contextId={selectedContextId}
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) {
            setSelectedContextId(null);
          }
        }}
      />
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete browser context</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this browser context? This action cannot be undone.
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
