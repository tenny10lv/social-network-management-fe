'use client';

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { RiCheckboxCircleFill } from '@remixicon/react';
import { AlertCircle, EllipsisVertical, LoaderCircle, RefreshCcw, Server } from 'lucide-react';
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { ProxyFormDialog } from './components/proxy-form-dialog';
import { deleteProxy, getProxies, pingProxy, ProxyRecord } from './api';

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

const getStatusBadge = (isActive: boolean) => (
  <Badge variant={isActive ? 'success' : 'secondary'} appearance="light">
    {isActive ? 'Active' : 'Inactive'}
  </Badge>
);

export function NetworkProxiesContent() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE_OPTIONS[0]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedProxyId, setSelectedProxyId] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pingingProxyId, setPingingProxyId] = useState<string | null>(null);
  const [lastPingIps, setLastPingIps] = useState<Record<string, string>>({});

  const proxiesQuery = useQuery({
    queryKey: ['proxies', page, limit],
    queryFn: () => getProxies({ page, limit }),
    keepPreviousData: true,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProxy(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['proxies'] });
      toast.custom(
        (t) => (
          <Alert
            variant="mono"
            icon="success"
            onClose={() => toast.dismiss(t)}
          >
            <AlertIcon>
              <RiCheckboxCircleFill />
            </AlertIcon>
            <AlertTitle>Proxy deleted successfully.</AlertTitle>
          </Alert>
        ),
        {
          duration: 4000,
        },
      );
      setIsConfirmOpen(false);
      setSelectedProxyId(null);
    },
    onError: (mutationError: Error) => {
      toast.custom(
        (t) => (
          <Alert
            variant="mono"
            icon="destructive"
            onClose={() => toast.dismiss(t)}
          >
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

  const pingMutation = useMutation({
    mutationFn: (id: string) => pingProxy(id),
    onSuccess: (result, proxyId) => {
      const ip = result?.ip;

      toast.custom(
        (t) => (
          <Alert variant="mono" icon="success" onClose={() => toast.dismiss(t)}>
            <AlertIcon>
              <RiCheckboxCircleFill />
            </AlertIcon>
            <AlertTitle>{`Proxy is alive.${ip ? ` IP: ${ip}` : ''}`}</AlertTitle>
          </Alert>
        ),
        {
          duration: 4000,
        },
      );

      setLastPingIps((previous) => {
        if (!ip) {
          const rest = { ...previous };
          delete rest[proxyId];
          return rest;
        }

        return {
          ...previous,
          [proxyId]: ip,
        };
      });
    },
    onError: (mutationError: Error) => {
      toast.custom(
        (t) => (
          <Alert variant="mono" icon="destructive" onClose={() => toast.dismiss(t)}>
            <AlertIcon>
              <AlertCircle className="size-5" />
            </AlertIcon>
            <AlertTitle>{`Proxy test failed: ${mutationError.message}`}</AlertTitle>
          </Alert>
        ),
        {
          duration: 5000,
        },
      );
    },
    onSettled: () => {
      setPingingProxyId(null);
    },
  });

  const data = proxiesQuery.data;

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
    setSelectedProxyId(null);
    setIsFormOpen(true);
  };

  const openEditModal = (id: string) => {
    setFormMode('edit');
    setSelectedProxyId(id);
    setIsFormOpen(true);
  };

  const openDeleteConfirm = (id: string) => {
    setSelectedProxyId(id);
    setIsConfirmOpen(true);
  };

  const closeDeleteConfirm = () => {
    setIsConfirmOpen(false);
    setSelectedProxyId(null);
  };

  const handleDelete = () => {
    if (selectedProxyId) {
      deleteMutation.mutate(selectedProxyId);
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

  const isLoading = proxiesQuery.isLoading || proxiesQuery.isFetching;
  const hasError = proxiesQuery.isError;
  const error = proxiesQuery.error as Error | null;
  const records: ProxyRecord[] = data?.data ?? [];

  return (
    <>
      <Card>
        <CardHeader className="py-4">
          <CardHeading >
            <CardTitle>Proxies</CardTitle>
            <span className="text-sm text-muted-foreground">
              Manage and configure outbound proxy servers.
            </span>
          </CardHeading>
          <CardToolbar>
            <Button onClick={openCreateModal}>Create Proxy</Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => void queryClient.invalidateQueries({ queryKey: ['proxies'] })}
            >
              <RefreshCcw className="size-4" />
            </Button>
          </CardToolbar>
        </CardHeader>
        <CardTable>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Host</TableHead>
                <TableHead>Port</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Detected IP</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="sticky right-0 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-12 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2 text-sm">
                      <LoaderCircle className="size-4 animate-spin" />
                      Loading proxies...
                    </div>
                  </TableCell>
                </TableRow>
              ) : hasError ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-6">
                    <Alert variant="mono" icon="destructive">
                      <AlertIcon>
                        <Server className="size-5" />
                      </AlertIcon>
                      <AlertTitle>{error?.message ?? 'Failed to load proxies.'}</AlertTitle>
                    </Alert>
                  </TableCell>
                </TableRow>
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-12 text-center text-muted-foreground">
                    No proxies found.
                  </TableCell>
                </TableRow>
              ) : (
                records.map((proxy) => (
                  <TableRow key={proxy.id}>
                    <TableCell className="font-medium">{proxy.name}</TableCell>
                    <TableCell>{proxy.host}</TableCell>
                    <TableCell>{proxy.port}</TableCell>
                    <TableCell>{proxy.username ?? '—'}</TableCell>
                    <TableCell>{getStatusBadge(proxy.isActive)}</TableCell>
                    <TableCell>
                      {pingingProxyId === proxy.id ? (
                        <span className="flex items-center gap-2 text-sm text-muted-foreground">
                          <LoaderCircle className="size-4 animate-spin" />
                          Testing...
                        </span>
                      ) : (
                        lastPingIps[proxy.id] ?? '—'
                      )}
                    </TableCell>
                    <TableCell>{formatDate(proxy.createdAt)}</TableCell>
                    <TableCell>{formatDate(proxy.updatedAt)}</TableCell>
                    <TableCell className="sticky right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="hover:bg-muted">
                            <EllipsisVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            disabled={pingingProxyId === proxy.id || pingMutation.isPending}
                            onSelect={() => {
                              if (pingingProxyId === proxy.id || pingMutation.isPending) {
                                return;
                              }

                              setPingingProxyId(proxy.id);
                              pingMutation.mutate(proxy.id);
                            }}
                            className="flex items-center gap-2"
                          >
                            {pingingProxyId === proxy.id ? (
                              <>
                                <LoaderCircle className="size-4 animate-spin" />
                                Pinging...
                              </>
                            ) : (
                              'Ping'
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditModal(proxy.id)}>
                            Update
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openDeleteConfirm(proxy.id)}
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
                {paginationMeta.totalPages
                  ? ` of ${paginationMeta.totalPages}`
                  : ''}
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

      <ProxyFormDialog
        mode={formMode}
        proxyId={selectedProxyId}
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) {
            setSelectedProxyId(null);
          }
        }}
      />

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete proxy</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this proxy? This action cannot be undone.
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
