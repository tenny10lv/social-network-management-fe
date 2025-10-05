'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RiCheckboxCircleFill } from '@remixicon/react';
import {
  EllipsisVertical,
  LoaderCircle,
  LogIn,
  Pencil,
  RefreshCcw,
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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
  AccountRecord,
  deleteAccount,
  getAccounts,
  loginAccount,
} from './api';
import { AccountFormDialog } from './components/account-form-dialog';

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

const getStatusBadge = (record: AccountRecord) => {
  const variant = record.isActive ? 'success' : 'secondary';
  const label = record.status || (record.isActive ? 'Active' : 'Inactive');

  return (
    <Badge variant={variant} appearance="light">
      {label}
    </Badge>
  );
};

export function AccountModuleContent() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE_OPTIONS[0]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [loginAccountId, setLoginAccountId] = useState<string | null>(null);

  const accountsQuery = useQuery({
    queryKey: ['accounts', page, limit],
    queryFn: () => getAccounts({ page, limit }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAccount(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.custom(
        (t) => (
          <Alert variant="mono" icon="success" onClose={() => toast.dismiss(t)}>
            <AlertIcon>
              <RiCheckboxCircleFill />
            </AlertIcon>
            <AlertTitle>Account deleted successfully.</AlertTitle>
          </Alert>
        ),
        {
          duration: 4000,
        },
      );
      setIsConfirmOpen(false);
      setSelectedAccountId(null);
    },
  });

  const loginMutation = useMutation({
    mutationFn: (id: string) => loginAccount(id),
    onMutate: (id: string) => {
      setLoginAccountId(id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.custom(
        (t) => (
          <Alert variant="mono" icon="success" onClose={() => toast.dismiss(t)}>
            <AlertIcon>
              <RiCheckboxCircleFill />
            </AlertIcon>
            <AlertTitle>Account login started successfully.</AlertTitle>
          </Alert>
        ),
        {
          duration: 4000,
        },
      );
    },
    onSettled: () => {
      setLoginAccountId(null);
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
    setFormMode('create');
    setSelectedAccountId(null);
    setIsFormOpen(true);
  };

  const openEditModal = (id: string) => {
    setFormMode('edit');
    setSelectedAccountId(id);
    setIsFormOpen(true);
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
  const records: AccountRecord[] = data?.data ?? [];

  return (
    <>
      <Card>
        <CardHeader className="py-4">
          <CardHeading>
            <CardTitle>Accounts</CardTitle>
            <span className="text-sm text-muted-foreground">
              Manage connected social network accounts and credentials.
            </span>
          </CardHeading>
          <CardToolbar>
            <Button onClick={openCreateModal}>Create Account</Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => void queryClient.invalidateQueries({ queryKey: ['accounts'] })}
            >
              <RefreshCcw className="size-4" />
            </Button>
          </CardToolbar>
        </CardHeader>
        <CardTable>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Platform</TableHead>
                <TableHead>Account Name</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Proxy</TableHead>
                <TableHead>Status</TableHead>
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
                      Loading accounts...
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
                      <AlertTitle>{error?.message ?? 'Failed to load accounts.'}</AlertTitle>
                    </Alert>
                  </TableCell>
                </TableRow>
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                    No accounts found.
                  </TableCell>
                </TableRow>
              ) : (
                records.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">{account.platform || '—'}</TableCell>
                    <TableCell>{account.accountName || '—'}</TableCell>
                    <TableCell>{account.username || '—'}</TableCell>
                    <TableCell>{account.proxyName ?? account.proxyId ?? '—'}</TableCell>
                    <TableCell>{getStatusBadge(account)}</TableCell>
                    <TableCell>{formatDate(account.createdAt)}</TableCell>
                    <TableCell>{formatDate(account.updatedAt)}</TableCell>
                    <TableCell className="sticky right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75">
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
                          <DropdownMenuItem
                            onClick={() => loginMutation.mutate(account.id)}
                            disabled={loginMutation.isPending && loginAccountId === account.id}
                          >
                            {loginMutation.isPending && loginAccountId === account.id ? (
                              <LoaderCircle className="me-2 size-4 animate-spin" />
                            ) : (
                              <LogIn className="me-2 size-4" />
                            )}
                            Login
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

      <AccountFormDialog
        mode={formMode}
        accountId={selectedAccountId}
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) {
            setSelectedAccountId(null);
          }
        }}
      />

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this account? This action cannot be undone.
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
