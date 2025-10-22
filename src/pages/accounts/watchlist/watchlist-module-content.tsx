'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
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
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { RiCheckboxCircleFill } from '@remixicon/react';
import { AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { WatchlistAccountsTable } from './components/watchlist-accounts-table';
import { CrawledPostsTable, PostFilters } from './components/crawled-posts-table';
import { AddWatchlistAccountDialog } from './components/add-watchlist-account-dialog';
import { WatchlistAccountModalEdit } from './components/watchlist-account-modal-edit';
import { AlertSettingsModal } from './components/alert-settings-modal';
import {
  assignWatcher,
  deleteWatchlistAccount,
  fetchLastGlobalCrawl,
  fetchWatchers,
  fetchWatchlistAccounts,
  fetchWatchlistAnalyticsSummary,
  fetchWatchlistPosts,
  logAuditEvent,
} from './api';
import { useCrawlTrigger } from '@/hooks/useCrawlTrigger';
import { WatchlistAccount } from './types';

export function WatchlistModuleContent() {
  const queryClient = useQueryClient();
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [postFilters, setPostFilters] = useState<PostFilters>({
    search: '',
    status: 'pipeline',
    mediaType: 'all',
    sentiment: 'all',
  });
  const [isAddAccountDialogOpen, setAddAccountDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<WatchlistAccount | null>(null);
  const [alertsAccount, setAlertsAccount] = useState<WatchlistAccount | null>(null);
  const [accountPendingRemoval, setAccountPendingRemoval] = useState<WatchlistAccount | null>(null);

  const accountsQuery = useQuery({
    queryKey: ['watchlistAccounts'],
    queryFn: () => fetchWatchlistAccounts(),
  });

  const accounts = accountsQuery.data?.items ?? [];

  useEffect(() => {
    if (!selectedAccountId && accounts.length > 0) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === selectedAccountId) ?? null,
    [accounts, selectedAccountId],
  );

  const postsQuery = useQuery({
    queryKey: ['watchlistPosts', selectedAccountId, postFilters],
    queryFn: () =>
      selectedAccountId
        ? fetchWatchlistPosts({ accountId: selectedAccountId, ...postFilters })
        : Promise.resolve({ items: [], meta: { total: 0, page: 1, perPage: 0 } }),
    enabled: Boolean(selectedAccountId),
  });

  const watchersQuery = useQuery({
    queryKey: ['watchlistWatchers'],
    queryFn: fetchWatchers,
  });

  const analyticsSummaryQuery = useQuery({
    queryKey: ['watchlistAnalyticsSummary'],
    queryFn: fetchWatchlistAnalyticsSummary,
  });

  const lastCrawlQuery = useQuery({
    queryKey: ['watchlistLastCrawl'],
    queryFn: fetchLastGlobalCrawl,
  });

  const crawlTrigger = useCrawlTrigger();

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteWatchlistAccount(id);
      await logAuditEvent({
        action: 'delete',
        entity: 'watchlist-account',
        entityId: id,
      });
    },
    onSuccess: () => {
      toast.custom(
        (t) => (
          <Alert variant="mono" icon="success" onClose={() => toast.dismiss(t)}>
            <AlertIcon>
              <RiCheckboxCircleFill />
            </AlertIcon>
            <AlertTitle>Account removed from watchlist.</AlertTitle>
          </Alert>
        ),
        { duration: 4000 },
      );
      void queryClient.invalidateQueries({ queryKey: ['watchlistAccounts'] });
      void queryClient.invalidateQueries({ queryKey: ['watchlistPosts'] });
      setAccountPendingRemoval(null);
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
        { duration: 5000 },
      );
    },
  });

  const assignWatcherMutation = useMutation({
    mutationFn: ({ accountId, watcherId }: { accountId: string; watcherId: string | null }) =>
      assignWatcher(accountId, { watcherId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['watchlistAccounts'] });
    },
  });

  const handleFiltersChange = (updates: Partial<PostFilters>) => {
    setPostFilters((previous) => ({ ...previous, ...updates }));
  };

  const handleRemoveAccount = () => {
    if (!accountPendingRemoval) {
      return;
    }
    deleteMutation.mutate(accountPendingRemoval.id);
  };

  const handleAssignWatcher = (accountId: string, watcherId: string | null) => {
    assignWatcherMutation.mutate({ accountId, watcherId });
  };

  const posts = postsQuery.data?.items ?? [];

  const lastCrawl = lastCrawlQuery.data;
  const lastCrawlLabel = lastCrawl?.completedAt
    ? `Last global crawl completed ${formatDistanceToNow(new Date(lastCrawl.completedAt), { addSuffix: true })}`
    : 'Last global crawl pending';

  return (
    <div className="flex flex-col gap-6">
      {lastCrawl ? (
        <div className="rounded-xl border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          {lastCrawlLabel} • Status: {lastCrawl.status}
        </div>
      ) : null}
      <div className="grid w-full gap-6 xl:grid-cols-[0.42fr_0.58fr] xl:items-start">
        <div className="self-start xl:col-span-1 xl:min-w-[340px]">
          <WatchlistAccountsTable
            accounts={accounts}
            watchers={watchersQuery.data ?? []}
            analyticsSummary={analyticsSummaryQuery.data}
            isLoading={accountsQuery.isLoading}
            selectedAccountId={selectedAccountId}
            onSelectAccount={setSelectedAccountId}
            onRequestAddAccount={() => setAddAccountDialogOpen(true)}
            onEditAccount={setEditingAccount}
            onDeleteAccount={setAccountPendingRemoval}
            onOpenAlerts={setAlertsAccount}
            onSyncAccount={(accountId) => crawlTrigger.triggerSync(accountId)}
            onAssignWatcher={handleAssignWatcher}
          />
        </div>
        <div className="flex flex-col gap-6 xl:col-span-1">
          <CrawledPostsTable
            account={selectedAccount}
            posts={posts}
            isLoading={postsQuery.isLoading}
            isRefreshing={crawlTrigger.isPending && crawlTrigger.latestMode === 'crawl' && crawlTrigger.activeAccountId === selectedAccountId}
            filters={postFilters}
            onFiltersChange={handleFiltersChange}
            onRefreshCrawl={(accountId) => crawlTrigger.triggerCrawl(accountId)}
          />
        </div>
      </div>
      <AddWatchlistAccountDialog
        open={isAddAccountDialogOpen}
        onOpenChange={setAddAccountDialogOpen}
        onSuccess={() => {
          void queryClient.invalidateQueries({ queryKey: ['watchlistAccounts'] });
        }}
      />
      <WatchlistAccountModalEdit
        open={Boolean(editingAccount)}
        account={editingAccount}
        onOpenChange={(open) => {
          if (!open) {
            setEditingAccount(null);
          }
        }}
      />
      <AlertSettingsModal
        open={Boolean(alertsAccount)}
        account={alertsAccount}
        onOpenChange={(open) => {
          if (!open) {
            setAlertsAccount(null);
          }
        }}
      />
      <AlertDialog
        open={Boolean(accountPendingRemoval)}
        onOpenChange={(open) => {
          if (!open) {
            setAccountPendingRemoval(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove watchlist account</AlertDialogTitle>
            <AlertDialogDescription>
              Removing {accountPendingRemoval?.displayName} will clear associated crawled posts. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveAccount}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
