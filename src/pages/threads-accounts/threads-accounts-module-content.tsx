'use client';

import type { ChangeEvent } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RiCheckboxCircleFill } from '@remixicon/react';
import {
  AlertTriangle,
  Eye,
  EllipsisVertical,
  ListChecks,
  LoaderCircle,
  LogIn,
  Pencil,
  RefreshCcw,
  Search,
  Server,
  Trash2,
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
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Pagination, PaginationContent, PaginationItem } from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableLoadingState } from '@/components/ui/table-loading-state';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { buildThreadsProfileUrl } from '@/lib/threads';
import {
  ThreadsAccountRecord,
  deleteThreadsAccount,
  getThreadsAccount,
  getThreadsAccounts,
  getProxyOptions,
  getCategoryOptions,
  getWatchlistAccountOptions,
  loginThreadsAccount,
  type ThreadsAccountFormValues,
  type ProxyOption,
  type CategoryOption,
  type WatchlistAccountOption,
  type ThreadsAccountLoginResponse,
  type ThreadsSessionModeFailureResult,
  type ThreadsSessionModeResult,
  type ThreadsSessionModeSuccessResult,
} from './api';
import { ThreadsAccountFormDialog, DEFAULT_VALUES } from './components/threads-account-form-dialog';

const PAGE_SIZE_OPTIONS = [10, 20, 50];

const sanitizeId = (value?: string | null) => {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
};

const sanitizeIds = (values?: (string | null | undefined)[] | null) =>
  Array.isArray(values) ? values.map((value) => sanitizeId(value)).filter(Boolean) : [];

const formatSessionModeLabel = (value?: string | null) => {
  if (!value) {
    return 'Unknown';
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return 'Unknown';
  }

  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};

const formatSessionTimestamp = (value?: string | null) => {
  if (!value) {
    return 'Unknown time';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const pad = (input: number) => String(input).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

const formatFailureReason = (reason?: string | null, fallback?: string | null) => {
  const normalizedReason = reason?.trim();

  if (normalizedReason) {
    return normalizedReason;
  }

  const normalizedFallback = fallback?.trim();

  if (normalizedFallback) {
    return normalizedFallback;
  }

  return 'Unknown reason';
};

const formatErrorMessage = (value?: string | null) => value?.trim() || 'Not provided';

const sortResultsByTimestampDesc = <T extends { lastLoggedInAt?: string | null }>(results: T[]) =>
  [...results].sort((a, b) => {
    const aTime = a?.lastLoggedInAt ? Date.parse(a.lastLoggedInAt) : Number.NaN;
    const bTime = b?.lastLoggedInAt ? Date.parse(b.lastLoggedInAt) : Number.NaN;

    if (Number.isNaN(aTime) && Number.isNaN(bTime)) {
      return 0;
    }

    if (Number.isNaN(aTime)) {
      return 1;
    }

    if (Number.isNaN(bTime)) {
      return -1;
    }

    return bTime - aTime;
  });

const SuccessResultsPopover = ({ results }: { results: ThreadsSessionModeSuccessResult[] }) => {
  if (!results || results.length <= 1) {
    return null;
  }

  const ordered = sortResultsByTimestampDesc(results);

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-foreground"
              aria-label="View login history"
            >
              <ListChecks className="size-4" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>View all login attempts</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-80">
        <div className="space-y-2">
          <p className="text-sm font-semibold">Login history</p>
          <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
            {ordered.map((result, index) => (
              <div key={`success-${index}`} className="rounded-md border border-border p-2 text-xs">
                <p className="font-medium text-foreground">{formatSessionModeLabel(result.sessionMode)}</p>
                <dl className="mt-1 space-y-0.5 text-muted-foreground">
                  <div className="flex items-center justify-between gap-2">
                    <dt>Last logged in</dt>
                    <dd className="text-right font-medium text-foreground">
                      {formatSessionTimestamp(result.lastLoggedInAt)}
                    </dd>
                  </div>
                  {result.reason ? (
                    <div className="flex items-center justify-between gap-2">
                      <dt>Reason</dt>
                      <dd className="text-right text-foreground">{result.reason}</dd>
                    </div>
                  ) : null}
                </dl>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

const FailureResultsPopover = ({ results }: { results: ThreadsSessionModeFailureResult[] }) => {
  if (!results || results.length === 0) {
    return null;
  }

  const ordered = sortResultsByTimestampDesc(results);

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-destructive hover:text-destructive"
              aria-label="View failure details"
            >
              <AlertTriangle className="size-4" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>View failure details</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-96">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-destructive">Failure history</p>
          <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
            {ordered.map((result, index) => (
              <div key={`failure-${index}`} className="rounded-md border border-border p-2 text-xs">
                <p className="font-medium text-foreground">{formatSessionModeLabel(result.sessionMode)}</p>
                <dl className="mt-1 space-y-0.5 text-muted-foreground">
                  <div className="flex items-center justify-between gap-2">
                    <dt>Last logged in</dt>
                    <dd className="text-right font-medium text-foreground">
                      {formatSessionTimestamp(result.lastLoggedInAt)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt>Reason</dt>
                    <dd className="text-right text-foreground">
                      {formatFailureReason(result.reason)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt>Error</dt>
                    <dd className="text-right text-foreground">
                      {formatErrorMessage(result.failureInfo?.errorMessage)}
                    </dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

type SessionBadgeLabel = {
  primary: string;
  secondary: string;
};

const buildSuccessEntryLabel = (result: ThreadsSessionModeSuccessResult): SessionBadgeLabel => ({
  primary: formatSessionModeLabel(result.sessionMode),
  secondary: formatSessionTimestamp(result.lastLoggedInAt),
});

const buildFailureEntryLabel = (result: ThreadsSessionModeFailureResult): SessionBadgeLabel => ({
  primary: formatSessionModeLabel(result.sessionMode),
  secondary: formatFailureReason(result.reason, result.failureInfo?.errorMessage),
});

const SessionModeCell = ({ sessionMode }: { sessionMode?: ThreadsSessionModeResult | null }) => {
  const successResults = sessionMode?.successResults ?? [];
  const failureResults = sessionMode?.failureResults ?? [];
  const hasSuccess = successResults.length > 0;
  const hasFailure = failureResults.length > 0;

  if (!hasSuccess && !hasFailure) {
    return (
      <Badge variant="secondary" appearance="light" className="max-w-[260px] text-left">
        <span className="text-xs font-medium text-muted-foreground">No session data</span>
      </Badge>
    );
  }

  const orderedSuccess = sortResultsByTimestampDesc(successResults);
  const orderedFailure = sortResultsByTimestampDesc(failureResults);

  const successBadges = orderedSuccess.map((result, index) => {
    const label = buildSuccessEntryLabel(result);

    return (
      <Badge key={`session-success-${index}`} variant="success" appearance="light" className="max-w-[260px] text-left">
        <span className="text-xs leading-tight">
          <span className="font-semibold">{label.primary}</span>
          <span className="text-muted-foreground"> - {label.secondary}</span>
        </span>
      </Badge>
    );
  });

  const failureBadges = orderedFailure.map((result, index) => {
    const label = buildFailureEntryLabel(result);

    return (
      <Badge
        key={`session-failure-${index}`}
        variant="destructive"
        appearance="light"
        className="max-w-[260px] text-left"
      >
        <span className="text-xs leading-tight">
          <span className="font-semibold">{label.primary}</span>
          <span className="text-muted-foreground"> - {label.secondary}</span>
        </span>
      </Badge>
    );
  });

  const showSuccessHistory = successResults.length > 1;
  const showFailureHistory = hasFailure;

  return (
    <div className="flex items-start gap-1.5">
      <div className="flex flex-col gap-1">
        {successBadges}
        {failureBadges}
      </div>
      {(showSuccessHistory || showFailureHistory) && (
        <div className="flex flex-col gap-1">
          {showSuccessHistory && <SuccessResultsPopover results={successResults} />}
          {showFailureHistory && <FailureResultsPopover results={failureResults} />}
        </div>
      )}
    </div>
  );
};

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

const getStatusBadge = (record: ThreadsAccountRecord) => {
  const normalizedStatus = record.status?.trim() ?? '';
  const label = normalizedStatus || (record.isActive ? 'Active' : 'Inactive');
  const isActive = normalizedStatus.toLowerCase() === 'active' || record.isActive;
  const variant = isActive ? 'success' : 'secondary';

  return (
    <Badge variant={variant} appearance="light">
      {label || 'Unknown'}
    </Badge>
  );
};

export function ThreadsAccountsModuleContent() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE_OPTIONS[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [isFormPreparing, setIsFormPreparing] = useState(false);
  const [formInitialValues, setFormInitialValues] = useState<ThreadsAccountFormValues>({ ...DEFAULT_VALUES });
  const [formAccount, setFormAccount] = useState<ThreadsAccountRecord | null>(null);
  const [formProxyOptions, setFormProxyOptions] = useState<ProxyOption[]>([]);
  const [formCategoryOptions, setFormCategoryOptions] = useState<CategoryOption[]>([]);
  const [formWatchlistOptions, setFormWatchlistOptions] = useState<WatchlistAccountOption[]>([]);
  const [formInstanceKey, setFormInstanceKey] = useState(0);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  useEffect(() => {
    const handler = window.setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 300);

    return () => {
      window.clearTimeout(handler);
    };
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  const accountsQuery = useQuery({
    queryKey: ['threadsAccounts', page, limit, debouncedSearch, statusFilter],
    queryFn: () =>
      getThreadsAccounts({
        page,
        limit,
        search: debouncedSearch || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      }),
  });

  const prepareFormDialog = useCallback(
    async (mode: 'create' | 'edit', threadsAccountId?: string | null) => {
      setIsFormPreparing(true);

      try {
        const proxyPromise = queryClient.ensureQueryData<ProxyOption[]>({
          queryKey: ['proxy-options'],
          queryFn: getProxyOptions,
        });
        const categoryPromise = queryClient.ensureQueryData<CategoryOption[]>({
          queryKey: ['threads-category-options'],
          queryFn: getCategoryOptions,
        });
        const watchlistPromise = queryClient.ensureQueryData<WatchlistAccountOption[]>({
          queryKey: ['threads-watchlist-options'],
          queryFn: getWatchlistAccountOptions,
        });
        const accountPromise =
          mode === 'edit' && threadsAccountId
            ? queryClient.fetchQuery<ThreadsAccountRecord>({
                queryKey: ['threadsAccount', threadsAccountId],
                queryFn: () => getThreadsAccount(threadsAccountId as string),
                staleTime: 0,
              })
            : Promise.resolve<ThreadsAccountRecord | null>(null);

        const [proxyOptions, categoryOptions, watchlistOptions, accountRecord] = await Promise.all([
          proxyPromise,
          categoryPromise,
          watchlistPromise,
          accountPromise,
        ]);

        if (mode === 'edit' && !accountRecord) {
          throw new Error('Unable to load Threads account details.');
        }

        const nextInitialValues: ThreadsAccountFormValues =
          mode === 'edit' && accountRecord
            ? {
                username: accountRecord.username ?? '',
                password: '',
                proxyId: sanitizeId(accountRecord.proxyId),
                categoryId: sanitizeId(accountRecord.categoryId),
                watchlistAccountIds: sanitizeIds(
                  (accountRecord.watchlistAccountIds ??
                    (accountRecord.watchlistAccounts ?? []).map((option) => option?.id)) as (
                    | string
                    | null
                    | undefined
                  )[],
                ),
              }
            : { ...DEFAULT_VALUES };

        setFormProxyOptions(proxyOptions ?? []);
        setFormCategoryOptions(categoryOptions ?? []);
        setFormWatchlistOptions(watchlistOptions ?? []);
        setFormAccount(accountRecord);
        setFormInitialValues(nextInitialValues);
        setFormMode(mode);
        setSelectedAccountId(mode === 'edit' ? threadsAccountId ?? null : null);
        setFormInstanceKey((prev) => prev + 1);
        setIsFormOpen(true);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to load Threads account form.';
        toast.custom(
          (t) => (
            <Alert variant="mono" icon="destructive" onClose={() => toast.dismiss(t)}>
              <AlertIcon>
                <Server className="size-5" />
              </AlertIcon>
              <AlertTitle>{message}</AlertTitle>
            </Alert>
          ),
          { duration: 5000 },
        );
      } finally {
        setIsFormPreparing(false);
      }
    },
    [queryClient],
  );

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteThreadsAccount(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['threadsAccounts'] });
      toast.custom(
        (t) => (
          <Alert variant="mono" icon="success" onClose={() => toast.dismiss(t)}>
            <AlertIcon>
              <RiCheckboxCircleFill />
            </AlertIcon>
            <AlertTitle>Threads account deleted successfully.</AlertTitle>
          </Alert>
        ),
        {
          duration: 4000,
        },
      );
      setIsConfirmOpen(false);
      setSelectedAccountId(null);
    },
    onError: (error) => {
      toast.custom(
        (t) => (
          <Alert variant="mono" icon="destructive" onClose={() => toast.dismiss(t)}>
            <AlertIcon>
              <Server className="size-5" />
            </AlertIcon>
            <AlertTitle>{error?.message ?? 'Failed to delete Threads account.'}</AlertTitle>
          </Alert>
        ),
        { duration: 5000 },
      );
    },
  });

  const loginMutation = useMutation<ThreadsAccountLoginResponse, Error, string>({
    mutationFn: (id: string) => loginThreadsAccount(id),
    onSuccess: () => {
      toast.custom(
        (t) => (
          <Alert variant="mono" icon="success" onClose={() => toast.dismiss(t)}>
            <AlertIcon>
              <RiCheckboxCircleFill />
            </AlertIcon>
            <AlertTitle>✅ Login job created successfully for this Threads account.</AlertTitle>
          </Alert>
        ),
        { duration: 4000 },
      );
      void queryClient.invalidateQueries({ queryKey: ['threadsAccounts'] });
    },
    onError: (error) => {
      toast.custom(
        (t) => (
          <Alert variant="mono" icon="destructive" onClose={() => toast.dismiss(t)}>
            <AlertIcon>
              <Server className="size-5" />
            </AlertIcon>
            <AlertTitle>{error?.message ?? 'Failed to trigger login for this Threads account.'}</AlertTitle>
          </Alert>
        ),
        { duration: 5000 },
      );
    },
  });

  const data = accountsQuery.data;

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

  const openCreateModal = () => {
    if (isFormPreparing) {
      return;
    }

    void prepareFormDialog('create');
  };

  const openEditModal = (id: string) => {
    if (isFormPreparing) {
      return;
    }

    void prepareFormDialog('edit', id);
  };

  const openDeleteConfirm = (id: string) => {
    setSelectedAccountId(id);
    setIsConfirmOpen(true);
  };

  const closeDeleteConfirm = () => {
    setIsConfirmOpen(false);
    setSelectedAccountId(null);
  };

  const handleDelete = () => {
    if (selectedAccountId) {
      deleteMutation.mutate(selectedAccountId);
    }
  };

  const handleLogin = (id: string) => {
    if (!id) {
      return;
    }

    loginMutation.mutate(id);
  };

  const handlePageSizeChange = (value: string) => {
    const nextLimit = Number(value);
    setLimit(nextLimit);
    setPage(1);
  };

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleStatusFilterChange = (value: string) => {
    if (value === 'active' || value === 'inactive' || value === 'all') {
      setStatusFilter(value);
    }
  };

  const handleOpenWatchlist = (threadsAccountId: string) => {
    navigate(`/threads-accounts/watchlist/${threadsAccountId}`);
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

  const isLoading = accountsQuery.isLoading || accountsQuery.isFetching;
  const hasError = accountsQuery.isError;
  const error = accountsQuery.error as Error | null;
  const records: ThreadsAccountRecord[] = data?.data ?? [];

  const statusSelectPlaceholder =
    statusFilter === 'all' ? 'All statuses' : statusFilter === 'active' ? 'Active' : 'Inactive';

  return (
    <>
      <Card>
        <CardHeader className="py-4">
          <CardHeading>
            <CardTitle>Threads Accounts</CardTitle>
            <span className="text-sm text-muted-foreground">
              Manage connected Threads accounts and credentials.
            </span>
          </CardHeading>
          <CardToolbar className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="w-full lg:max-w-[65%] lg:flex-1">
              <div className="relative w-full">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  placeholder="Search by username, proxy, or category"
                  className="w-full pl-9"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Status">{statusSelectPlaceholder}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={openCreateModal} disabled={isFormPreparing}>
                Add Threads Account
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => void accountsQuery.refetch()}
                disabled={accountsQuery.isRefetching}
              >
                <RefreshCcw className={accountsQuery.isRefetching ? 'size-4 animate-spin' : 'size-4'} />
              </Button>
            </div>
          </CardToolbar>
        </CardHeader>
        <CardTable>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Proxy</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Session Mode</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead>
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableLoadingState colSpan={8} message="Loading Threads accounts..." cellClassName="py-12" />
              ) : hasError ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-6">
                    <Alert variant="mono" icon="destructive">
                      <AlertIcon>
                        <Server className="size-5" />
                      </AlertIcon>
                      <AlertTitle>{error?.message ?? 'Failed to load Threads accounts.'}</AlertTitle>
                    </Alert>
                  </TableCell>
                </TableRow>
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                    No Threads accounts found.
                  </TableCell>
                </TableRow>
              ) : (
                records.map((account) => {
                  const isLoggingIn =
                    loginMutation.isPending && loginMutation.variables === account.id;
                  const threadsProfileUrl = buildThreadsProfileUrl(account.username);

                  return (
                    <TableRow key={account.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {threadsProfileUrl ? (
                            <a
                              href={threadsProfileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-primary hover:underline"
                            >
                              {account.username}
                            </a>
                          ) : (
                            <span>{account.username || '—'}</span>
                          )}
                          {account.type === 'default' ? (
                            <Badge variant="secondary" appearance="light" className="uppercase">
                              default
                            </Badge>
                          ) : account.type === 'watcher' ? (
                            <Badge variant="primary" appearance="light" className="uppercase">
                              watcher
                            </Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>{account.proxyName ?? account.proxyId ?? '—'}</TableCell>
                      <TableCell>{account.categoryName ?? account.categoryId ?? '—'}</TableCell>
                      <TableCell>
                        <SessionModeCell sessionMode={account.sessionMode} />
                      </TableCell>
                      <TableCell>{getStatusBadge(account)}</TableCell>
                      <TableCell>{formatDate(account.createdAt)}</TableCell>
                      <TableCell>{formatDate(account.updatedAt)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="hover:bg-muted">
                              <EllipsisVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleLogin(account.id)} disabled={isLoggingIn}>
                              {isLoggingIn ? (
                                <LoaderCircle className="me-2 size-4 animate-spin" />
                              ) : (
                                <LogIn className="me-2 size-4" />
                              )}
                              {isLoggingIn ? 'Logging in...' : 'Login'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditModal(account.id)} disabled={isFormPreparing}>
                              <Pencil className="me-2 size-4" />
                              Update
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOpenWatchlist(account.id)}>
                              <Eye className="me-2 size-4" />
                              Watchlist
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openDeleteConfirm(account.id)}
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

      {isFormPreparing && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-2 rounded-md border bg-card px-4 py-3 text-sm text-muted-foreground shadow-lg">
            <LoaderCircle className="size-4 animate-spin" />
            <span>Preparing form...</span>
          </div>
        </div>
      )}

      {isFormOpen && !isFormPreparing && (
        <ThreadsAccountFormDialog
          key={formInstanceKey}
          mode={formMode}
          threadsAccountId={selectedAccountId}
          account={formAccount}
          initialValues={formInitialValues}
          proxyOptions={formProxyOptions}
          categoryOptions={formCategoryOptions}
          watchlistOptions={formWatchlistOptions}
          open={isFormOpen}
          onOpenChange={(open) => {
            setIsFormOpen(open);
            if (!open) {
              setSelectedAccountId(null);
              setFormAccount(null);
              setFormInitialValues({ ...DEFAULT_VALUES });
            }
          }}
        />
      )}

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Threads account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this Threads account? This action cannot be undone.
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
