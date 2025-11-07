'use client';

import type { ChangeEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RiCheckboxCircleFill } from '@remixicon/react';
import { AlertCircle, EllipsisVertical, LoaderCircle, Pencil, RefreshCcw, Search, Trash2 } from 'lucide-react';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Pagination, PaginationContent, PaginationItem } from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import {
  type ThreadsWatchlistAccountRecord,
  deleteThreadsWatchlistAccount,
  getThreadsWatchlistAccounts,
} from './api';
import { ThreadsWatchlistAccountCreateDialog } from './components/threads-watchlist-account-create-dialog';
import { ThreadsWatchlistAccountEditDialog } from './components/threads-watchlist-account-edit-dialog';

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

const formatFollowerCount = (value?: number | null) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '—';
  }

  return new Intl.NumberFormat(undefined, {
    notation: value >= 10_000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(value);
};

const getStatusBadge = (record: ThreadsWatchlistAccountRecord) => {
  const label = record.status?.trim() || (record.isActive ? 'Active' : 'Inactive');
  const normalizedLabel = label || 'Unknown';
  const variant = record.isActive ? 'success' : 'secondary';

  return (
    <Badge variant={variant} appearance="light">
      {normalizedLabel}
    </Badge>
  );
};

const renderVerifiedBadge = (isVerified?: boolean) => {
  if (isVerified) {
    return (
      <Badge variant="success" appearance="light" className="flex items-center gap-1">
        <RiCheckboxCircleFill className="size-3" />
        Verified
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" appearance="light">
      No
    </Badge>
  );
};

const getInitials = (username?: string | null, fallback?: string | null) => {
  const source = username || fallback;

  if (!source) {
    return 'TH';
  }

  const parts = source.split(' ').filter(Boolean);

  if (parts.length === 0) {
    return source.slice(0, 2).toUpperCase();
  }

  const initials = parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return initials || source.slice(0, 2).toUpperCase();
};

export function ThreadsWatchlistAccountsModuleContent() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE_OPTIONS[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 400);

    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  const accountsQuery = useQuery({
    queryKey: [
      'threadsWatchlistAccounts',
      { page, limit, search: debouncedSearch, status: statusFilter },
    ],
    queryFn: () =>
      getThreadsWatchlistAccounts({
        page,
        limit,
        search: debouncedSearch || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
      }),
    keepPreviousData: true,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteThreadsWatchlistAccount(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['threadsWatchlistAccounts'] });
      toast.custom(
        (t) => (
          <Alert variant="mono" icon="success" onClose={() => toast.dismiss(t)}>
            <AlertIcon>
              <RiCheckboxCircleFill />
            </AlertIcon>
            <AlertTitle>Watchlist account deleted successfully.</AlertTitle>
          </Alert>
        ),
        { duration: 4000 },
      );
      setIsConfirmOpen(false);
      setSelectedAccountId(null);
    },
    onError: (error) => {
      toast.custom(
        (t) => (
          <Alert variant="mono" icon="destructive" onClose={() => toast.dismiss(t)}>
            <AlertIcon>
              <AlertCircle className="size-5" />
            </AlertIcon>
            <AlertTitle>{error?.message ?? 'Failed to delete watchlist account.'}</AlertTitle>
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
    setIsCreateOpen(true);
  };

  const openEditModal = (id: string) => {
    setSelectedAccountId(id);
    setIsEditOpen(true);
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
      setPage(1);
    }
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
  const records: ThreadsWatchlistAccountRecord[] = data?.data ?? [];

  const statusSelectPlaceholder =
    statusFilter === 'all' ? 'All statuses' : statusFilter === 'active' ? 'Active' : 'Inactive';

  return (
    <>
      <Card>
        <CardHeader className="py-4">
          <CardHeading>
            <CardTitle>Threads Watchlist Accounts</CardTitle>
            <span className="text-sm text-muted-foreground">
              Track high-priority profiles and control automatic syncing.
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
                  placeholder="Search by username or category"
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
              <Button onClick={openCreateModal}>Add Watchlist Account</Button>
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
                <TableHead>Avatar</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Follower Count</TableHead>
                <TableHead>Verified</TableHead>
                <TableHead>Last Synced</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2 text-sm">
                      <LoaderCircle className="size-4 animate-spin" />
                      Loading watchlist accounts...
                    </div>
                  </TableCell>
                </TableRow>
              ) : hasError ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-6">
                    <Alert variant="mono" icon="destructive">
                      <AlertIcon>
                        <AlertCircle className="size-5" />
                      </AlertIcon>
                      <AlertTitle>{error?.message ?? 'Failed to load watchlist accounts.'}</AlertTitle>
                    </Alert>
                  </TableCell>
                </TableRow>
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                    No watchlist accounts found.
                  </TableCell>
                </TableRow>
              ) : (
                records.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell>
                      <Avatar className="size-10">
                        <AvatarImage src={account.avatarUrl ?? undefined} alt={account.username ?? 'Avatar'} />
                        <AvatarFallback>{getInitials(account.username, account.accountName)}</AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{account.username || '—'}</span>
                        {account.accountName && (
                          <span className="text-xs text-muted-foreground">{account.accountName}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(account)}</TableCell>
                    <TableCell>{formatFollowerCount(account.followerCount)}</TableCell>
                    <TableCell>{renderVerifiedBadge(account.isVerified)}</TableCell>
                    <TableCell>{formatDate(account.lastSyncedAt)}</TableCell>
                    <TableCell>{formatDate(account.createdAt)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="hover:bg-muted">
                            <EllipsisVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditModal(account.id)}>
                            <Pencil className="me-2 size-4" />
                            Update
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

      <ThreadsWatchlistAccountCreateDialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          setIsCreateOpen(open);
        }}
      />

      <ThreadsWatchlistAccountEditDialog
        accountId={selectedAccountId}
        open={isEditOpen}
        onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) {
            setSelectedAccountId(null);
          }
        }}
      />

      <AlertDialog
        open={isConfirmOpen}
        onOpenChange={(open) => {
          setIsConfirmOpen(open);
          if (!open && !deleteMutation.isPending) {
            setSelectedAccountId(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete watchlist account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this watchlist account? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline" onClick={closeDeleteConfirm} disabled={deleteMutation.isPending}>
                Cancel
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending && <LoaderCircle className="mr-2 size-4 animate-spin" />}
                Delete
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
