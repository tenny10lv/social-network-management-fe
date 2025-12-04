'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CRAWLED_POSTS,
  MY_THREADS_ACCOUNTS,
  PUBLISHING_TASKS,
} from './mock-data';
import {
  CrawledPost,
  MyThreadsAccount,
  PublishingTask,
  WatchlistAccount,
  WatchlistAccountRow,
} from './types';
import { WatchlistAccountsTable } from './components/watchlist-accounts-table';
import { CrawledPostsPanel } from './components/crawled-posts-panel';
import { ScheduledPostsPanel } from './components/scheduled-posts-panel';
import { PublishedHistoryPanel } from './components/published-history-panel';
import { PostEditorDialog } from './components/post-editor-dialog';
import { SchedulePostDialog } from './components/schedule-post-dialog';
import { WatchlistTagsDialog } from './components/watchlist-tags-dialog';
import { AddWatchlistAccountDialog } from './components/add-watchlist-account-dialog';
import { getWatchlistAccountsByThreadsAccount } from './api';

const createId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 11);

const sanitizeUsername = (value: string) => value.trim().replace(/^@+/, '');

const buildDisplayNameFromUsername = (value: string) => {
  const sanitized = sanitizeUsername(value);

  if (!sanitized) {
    return 'New Watchlist Account';
  }

  return sanitized
    .split(/[-_.\s]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
};

const TABLE_PAGE_SIZE_OPTIONS = [5, 10, 20];

const pickValidDateValue = (candidates: (string | null | undefined)[]) => {
  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    const timestamp = Date.parse(candidate);

    if (!Number.isNaN(timestamp)) {
      return new Date(timestamp).toISOString();
    }
  }

  return null;
};

const deriveRiskLevel = (record: WatchlistAccount): WatchlistAccountRow['riskLevel'] =>
  record.isVerified ? 'low' : 'medium';

const deriveCategory = (record: WatchlistAccount) =>
  record.category?.name?.trim() ||
  record.note?.trim() ||
  (record.category?.id && String(record.category.id)) ||
  (record.categoryId && String(record.categoryId)) ||
  'Uncategorized';

const deriveTags = (record: WatchlistAccount) => {
  if (record.note) {
    const parts = record.note
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);

    if (parts.length > 0) {
      return parts;
    }

    if (record.note.trim()) {
      return [record.note.trim()];
    }
  }

  return [] as string[];
};

const mapWatchlistAccountToRow = (record: WatchlistAccount): WatchlistAccountRow => {
  const username = sanitizeUsername(record.username);
  const handle = username ? `@${username}` : record.username || '—';
  const displayName =
    record.accountName?.trim() ||
    record.fullName?.trim() ||
    buildDisplayNameFromUsername(username || record.username) ||
    'Watchlist Account';

  const monitoringSince =
    pickValidDateValue([record.createdAt, record.updatedAt, record.lastSyncedAt]) ?? new Date().toISOString();
  const lastCrawledAt =
    pickValidDateValue([record.lastSyncedAt, record.updatedAt, record.createdAt]) ?? monitoringSince;

  return {
    id: record.id,
    username: username || record.username || record.accountName || record.fullName || record.id,
    handle,
    displayName,
    platform: 'Threads',
    category: deriveCategory(record),
    tags: deriveTags(record),
    lastCrawledAt,
    crawlFrequency: 'Daily',
    riskLevel: deriveRiskLevel(record),
    avatarUrl: record.profilePicUrl ?? '',
  };
};

type WatchlistModuleContentProps = {
  threadsAccountId?: string | null;
};

export function WatchlistModuleContent({ threadsAccountId }: WatchlistModuleContentProps = {}) {
  const queryClient = useQueryClient();
  const [watchlistAccounts, setWatchlistAccounts] = useState<WatchlistAccountRow[]>([]);
  const [myAccounts] = useState<MyThreadsAccount[]>(MY_THREADS_ACCOUNTS);
  const [crawledPosts, setCrawledPosts] = useState<CrawledPost[]>(CRAWLED_POSTS);
  const [publishingTasks, setPublishingTasks] = useState<PublishingTask[]>(PUBLISHING_TASKS);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'crawled' | 'scheduled' | 'published'>('crawled');
  const [tagEditorAccount, setTagEditorAccount] = useState<WatchlistAccountRow | null>(null);
  const [editorState, setEditorState] = useState<{ postId: string; intent: 'edit' | 'publish' } | null>(null);
  const [scheduleState, setScheduleState] = useState<{ postId: string; taskId?: string } | null>(null);
  const [accountPendingRemoval, setAccountPendingRemoval] = useState<WatchlistAccountRow | null>(null);
  const [isAddAccountDialogOpen, setAddAccountDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(TABLE_PAGE_SIZE_OPTIONS[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 400);

    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
    setSelectedAccountId(null);
    setWatchlistAccounts([]);
  }, [threadsAccountId]);

  const watchlistQuery = useQuery({
    queryKey: [
      'watchlistAccounts',
      { threadsAccountId, page, limit: pageSize, search: debouncedSearch },
    ],
    queryFn: () =>
      getWatchlistAccountsByThreadsAccount({
        page,
        limit: pageSize,
        username: debouncedSearch || undefined,
        fullName: debouncedSearch || undefined,
        search: debouncedSearch || undefined,
        threadsAccountId: threadsAccountId ?? '',
      }),
    enabled: Boolean(threadsAccountId),
    keepPreviousData: true,
  });

  useEffect(() => {
    const payload = watchlistQuery.data?.data;

    if (!payload) {
      return;
    }

    setWatchlistAccounts((previous) => {
      const previousTags = new Map(previous.map((item) => [item.id, item.tags]));

      return payload.map((record) => {
        const normalized = mapWatchlistAccountToRow(record);
        const preservedTags = previousTags.get(normalized.id);

        return {
          ...normalized,
          tags: preservedTags && preservedTags.length > 0 ? preservedTags : normalized.tags,
        };
      });
    });
  }, [watchlistQuery.data]);

  useEffect(() => {
    if (watchlistAccounts.length === 0) {
      setSelectedAccountId(null);
      return;
    }

    if (selectedAccountId && watchlistAccounts.some((account) => account.id === selectedAccountId)) {
      return;
    }

    setSelectedAccountId(watchlistAccounts[0]?.id ?? null);
  }, [selectedAccountId, watchlistAccounts]);

  const selectedAccount = useMemo(
    () => watchlistAccounts.find((account) => account.id === selectedAccountId) ?? null,
    [selectedAccountId, watchlistAccounts],
  );

  const selectedAccountPosts = useMemo(
    () =>
      crawledPosts.filter((post) => post.watchlistAccountId === selectedAccountId),
    [crawledPosts, selectedAccountId],
  );

  const selectedAccountTasks = useMemo(
    () => publishingTasks.filter((task) => task.watchlistAccountId === selectedAccountId),
    [publishingTasks, selectedAccountId],
  );

  const scheduledTasks = useMemo(
    () => selectedAccountTasks.filter((task) => task.status === 'scheduled'),
    [selectedAccountTasks],
  );

  const publishedTasks = useMemo(
    () => selectedAccountTasks.filter((task) => task.status === 'completed'),
    [selectedAccountTasks],
  );

  const editingPost = useMemo(
    () => (editorState ? crawledPosts.find((post) => post.id === editorState.postId) ?? null : null),
    [crawledPosts, editorState],
  );

  const schedulingPost = useMemo(
    () => (scheduleState ? crawledPosts.find((post) => post.id === scheduleState.postId) ?? null : null),
    [crawledPosts, scheduleState],
  );

  const schedulingTask = useMemo(
    () =>
      scheduleState?.taskId
        ? publishingTasks.find((task) => task.id === scheduleState.taskId) ?? null
        : null,
    [publishingTasks, scheduleState],
  );

  const handleSelectAccount = useCallback((accountId: string) => {
    setSelectedAccountId(accountId);
  }, []);

  const handleRequestAddAccount = useCallback(() => {
    setAddAccountDialogOpen(true);
  }, [setAddAccountDialogOpen]);

  const handleAccountCreated = useCallback(
    ({ username }: { username: string; response: unknown }) => {
      const normalizedUsername = sanitizeUsername(username);

      setPage(1);
      setSelectedAccountId(null);
      setSearchTerm(normalizedUsername);
      void queryClient.invalidateQueries({ queryKey: ['watchlistAccounts'] });
    },
    [queryClient],
  );

  const handleUpdateTags = useCallback((accountId: string, tags: string[]) => {
    setWatchlistAccounts((previous) =>
      previous.map((account) => (account.id === accountId ? { ...account, tags } : account)),
    );
    setTagEditorAccount(null);
  }, []);

  const handleTriggerCrawl = useCallback(
    (accountId: string) => {
      const now = new Date().toISOString();
      setWatchlistAccounts((previous) =>
        previous.map((account) => (account.id === accountId ? { ...account, lastCrawledAt: now } : account)),
      );

      const newPost: CrawledPost = {
        id: createId(),
        watchlistAccountId: accountId,
        content:
          'Automated crawl detected a trending thread. Summarize insights and confirm if we should spin an owned response.',
        capturedAt: now,
        language: 'en',
        topics: ['watchlist', 'auto-crawl'],
        mediaType: 'text',
        status: 'ready',
        sentiment: 'positive',
        likes: 320 + Math.floor(Math.random() * 150),
        replies: 28 + Math.floor(Math.random() * 40),
        reposts: 45 + Math.floor(Math.random() * 40),
      };

      setCrawledPosts((previous) => [newPost, ...previous]);
      setActiveTab('crawled');
      setEditorState({ postId: newPost.id, intent: 'edit' });
    },
    [],
  );

  const handleRemoveAccount = useCallback(() => {
    if (!accountPendingRemoval) {
      return;
    }

    const accountId = accountPendingRemoval.id;
    const remainingAccountId = watchlistAccounts.find((account) => account.id !== accountId)?.id ?? null;

    setWatchlistAccounts((previous) => previous.filter((account) => account.id !== accountId));
    setCrawledPosts((previous) => previous.filter((post) => post.watchlistAccountId !== accountId));
    setPublishingTasks((previous) => previous.filter((task) => task.watchlistAccountId !== accountId));

    if (selectedAccountId === accountId) {
      setSelectedAccountId(remainingAccountId);
    }

    setAccountPendingRemoval(null);
  }, [accountPendingRemoval, selectedAccountId, watchlistAccounts]);

  const openScheduleDialog = useCallback(
    (postId: string, targetAccountId?: string, taskId?: string) => {
      if (targetAccountId) {
        setCrawledPosts((previous) =>
          previous.map((post) =>
            post.id === postId ? { ...post, targetAccountId } : post,
          ),
        );
      }

      setScheduleState(taskId ? { postId, taskId } : { postId });
      setActiveTab('scheduled');
    },
    [],
  );

  const handleSaveDraft = useCallback(
    (postId: string, values: { content: string; topics: string[]; sentiment: CrawledPost['sentiment']; notes?: string }) => {
      setCrawledPosts((previous) =>
        previous.map((post) =>
          post.id === postId
            ? {
                ...post,
                content: values.content,
                topics: values.topics,
                sentiment: values.sentiment,
                status: post.status === 'draft' ? 'ready' : post.status,
                editorNotes: values.notes ?? post.editorNotes,
              }
            : post,
        ),
      );
      setEditorState(null);
    },
    [],
  );

  const handlePublishNow = useCallback(
    (
      postId: string,
      values: { content: string; topics: string[]; targetAccountId: string; notes?: string },
    ) => {
      const now = new Date().toISOString();
      let postAccountId: string | null = null;

      setCrawledPosts((previous) =>
        previous.map((post) => {
          if (post.id !== postId) {
            return post;
          }

          postAccountId = post.watchlistAccountId;

          return {
            ...post,
            content: values.content,
            topics: values.topics,
            status: 'published',
            scheduledFor: undefined,
            publishedAt: now,
            targetAccountId: values.targetAccountId,
            editorNotes: values.notes ?? post.editorNotes,
          };
        }),
      );

      setPublishingTasks((previous) => {
        const existingScheduled = previous.find((task) => task.postId === postId && task.status === 'scheduled');

        if (existingScheduled) {
          return previous.map((task) =>
            task.id === existingScheduled.id
              ? {
                  ...task,
                  status: 'completed',
                  action: 'publish',
                  executedAt: now,
                  scheduledFor: undefined,
                  notes: values.notes ?? task.notes,
                  targetAccountId: values.targetAccountId,
                }
              : task,
          );
        }

        const watchlistId = postAccountId ?? selectedAccountId ?? '';

        return [
          ...previous,
          {
            id: createId(),
            postId,
            watchlistAccountId: watchlistId,
            targetAccountId: values.targetAccountId,
            action: 'publish',
            status: 'completed',
            executedAt: now,
            notes: values.notes,
          },
        ];
      });

      setEditorState(null);
      setActiveTab('published');
    },
    [selectedAccountId],
  );

  const handleScheduleConfirm = useCallback(
    (payload: { postId: string; targetAccountId: string; scheduledFor: string; notes?: string; taskId?: string }) => {
      let watchlistId = selectedAccountId ?? null;

      setCrawledPosts((previous) =>
        previous.map((post) => {
          if (post.id !== payload.postId) {
            return post;
          }

          watchlistId = post.watchlistAccountId;

          return {
            ...post,
            targetAccountId: payload.targetAccountId,
            scheduledFor: payload.scheduledFor,
            status: 'scheduled',
            editorNotes: payload.notes ?? post.editorNotes,
          };
        }),
      );

      setPublishingTasks((previous) => {
        if (payload.taskId) {
          return previous.map((task) =>
            task.id === payload.taskId
              ? {
                  ...task,
                  targetAccountId: payload.targetAccountId,
                  scheduledFor: payload.scheduledFor,
                  notes: payload.notes,
                  status: 'scheduled',
                }
              : task,
          );
        }

        const existingTask = previous.find((task) => task.postId === payload.postId && task.status === 'scheduled');
        const baseList = existingTask
          ? previous.filter((task) => task.id !== existingTask.id)
          : previous;

        return [
          ...baseList,
          {
            id: createId(),
            postId: payload.postId,
            watchlistAccountId: watchlistId ?? selectedAccountId ?? '',
            targetAccountId: payload.targetAccountId,
            action: 'schedule',
            status: 'scheduled',
            scheduledFor: payload.scheduledFor,
            notes: payload.notes,
          },
        ];
      });

      setScheduleState(null);
      setEditorState(null);
      setActiveTab('scheduled');
    },
    [selectedAccountId],
  );

  const handleCancelSchedule = useCallback((taskId: string, postId: string) => {
    setPublishingTasks((previous) =>
      previous.map((task) => (task.id === taskId ? { ...task, status: 'cancelled' } : task)),
    );
    setCrawledPosts((previous) =>
      previous.map((post) =>
        post.id === postId
          ? { ...post, status: post.status === 'published' ? post.status : 'ready', scheduledFor: undefined }
          : post,
      ),
    );
  }, []);

  const handlePublishFromSchedule = useCallback(
    (taskId: string, postId: string) => {
      const task = publishingTasks.find((item) => item.id === taskId);
      const post = crawledPosts.find((item) => item.id === postId);
      const targetAccountId =
        task?.targetAccountId ?? myAccounts.find((account) => account.isPrimary)?.id ?? '';

      handlePublishNow(postId, {
        content: post?.content ?? '',
        topics: post?.topics ?? [],
        targetAccountId,
        notes: task?.notes,
      });
    },
    [crawledPosts, handlePublishNow, myAccounts, publishingTasks],
  );

  const handlePageChange = useCallback((nextPage: number) => {
    setPage(Math.max(1, nextPage));
  }, []);

  const handlePageSizeChange = useCallback((nextSize: number) => {
    setPageSize(nextSize);
    setPage(1);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    setPage(1);
  }, []);

  const watchlistMeta = watchlistQuery.data?.meta ?? {
    page,
    limit: pageSize,
    totalPages: 1,
    totalCount: watchlistAccounts.length,
  };
  const watchlistPage = watchlistMeta.page ?? page;
  const watchlistPageSize = watchlistMeta.limit ?? pageSize;
  const watchlistTotalPages = watchlistMeta.totalPages ?? 1;
  const watchlistTotalCount = watchlistMeta.totalCount ?? watchlistAccounts.length;
  const isWatchlistLoading = watchlistQuery.isLoading || (!watchlistQuery.data && watchlistQuery.isFetching);
  const watchlistErrorMessage =
    !threadsAccountId
      ? 'Threads account id is required to load watchlist accounts.'
      : watchlistQuery.isError && !watchlistQuery.data
        ? (watchlistQuery.error as Error | null)?.message ?? 'Failed to load watchlist accounts.'
        : null;

  useEffect(() => {
    if (watchlistPage > watchlistTotalPages) {
      setPage(Math.max(1, watchlistTotalPages));
    }
  }, [watchlistPage, watchlistTotalPages]);

  return (
    <div className="grid w-full gap-6 md:gap-8 xl:grid-cols-[0.4fr_0.6fr] xl:gap-6 xl:items-start 2xl:gap-8">
      <div className="self-start xl:col-span-1 xl:min-w-[340px]">
        <WatchlistAccountsTable
          accounts={watchlistAccounts}
          selectedAccountId={selectedAccountId}
          searchQuery={searchTerm}
          page={watchlistPage}
          pageSize={watchlistPageSize}
          totalPages={watchlistTotalPages}
          totalCount={watchlistTotalCount}
          isLoading={isWatchlistLoading}
          errorMessage={watchlistErrorMessage}
          pageSizeOptions={TABLE_PAGE_SIZE_OPTIONS}
          onSearchQueryChange={handleSearchChange}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          onSelectAccount={handleSelectAccount}
          onRequestEditTags={setTagEditorAccount}
          onRequestRemove={setAccountPendingRemoval}
          onTriggerCrawl={handleTriggerCrawl}
          onRequestAddAccount={handleRequestAddAccount}
          onRetry={threadsAccountId ? () => watchlistQuery.refetch() : undefined}
        />
      </div>
      <div className="flex flex-col gap-6 xl:col-span-1">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
          <TabsList className="w-full justify-between gap-2 overflow-x-auto rounded-lg border bg-muted/40 p-1">
            <TabsTrigger value="crawled" className="flex-1 whitespace-nowrap">
              Crawled Posts
            </TabsTrigger>
            <TabsTrigger value="scheduled" className="flex-1 whitespace-nowrap">
              Scheduled
            </TabsTrigger>
            <TabsTrigger value="published" className="flex-1 whitespace-nowrap">
              Published
            </TabsTrigger>
          </TabsList>
          <TabsContent value="crawled" className="mt-6">
            <CrawledPostsPanel
              account={selectedAccount}
              posts={selectedAccountPosts}
              onOpenEditor={(postId, intent) => setEditorState({ postId, intent })}
              onOpenSchedule={(postId) => openScheduleDialog(postId)}
            />
          </TabsContent>
          <TabsContent value="scheduled" className="mt-6">
            <ScheduledPostsPanel
              tasks={scheduledTasks}
              posts={selectedAccountPosts}
              myAccounts={myAccounts}
              onOpenSchedule={(postId, taskId) => openScheduleDialog(postId, undefined, taskId)}
              onPublishNow={handlePublishFromSchedule}
              onCancelSchedule={handleCancelSchedule}
            />
          </TabsContent>
          <TabsContent value="published" className="mt-6">
            <PublishedHistoryPanel
              tasks={publishedTasks}
              posts={selectedAccountPosts}
              myAccounts={myAccounts}
              onOpenEditor={(postId, intent) => setEditorState({ postId, intent })}
            />
          </TabsContent>
        </Tabs>
      </div>
      {/* <div className="self-start xl:col-span-full xl:min-w-[340px]">
        <MyThreadsAccountsTable
          accounts={myAccounts}
          onSetPrimary={handleSetPrimaryAccount}
          onToggleStatus={handleToggleMyAccountStatus}
        />
      </div> */}

      <AddWatchlistAccountDialog
        open={isAddAccountDialogOpen}
        onOpenChange={setAddAccountDialogOpen}
        onSuccess={handleAccountCreated}
      />

      <WatchlistTagsDialog
        open={!!tagEditorAccount}
        account={tagEditorAccount}
        onOpenChange={(open) => {
          if (!open) {
            setTagEditorAccount(null);
          }
        }}
        onSave={handleUpdateTags}
      />

      <PostEditorDialog
        open={!!editorState && !!editingPost}
        post={editingPost ?? undefined}
        myAccounts={myAccounts}
        intent={editorState?.intent}
        onOpenChange={(open) => {
          if (!open) {
            setEditorState(null);
          }
        }}
        onSaveDraft={handleSaveDraft}
        onPublishNow={handlePublishNow}
        onOpenSchedule={(postId, targetId) => openScheduleDialog(postId, targetId)}
      />

      <SchedulePostDialog
        open={!!scheduleState && !!schedulingPost}
        post={schedulingPost ?? undefined}
        myAccounts={myAccounts}
        task={schedulingTask}
        onOpenChange={(open) => {
          if (!open) {
            setScheduleState(null);
          }
        }}
        onConfirm={handleScheduleConfirm}
      />

      <AlertDialog
        open={!!accountPendingRemoval}
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
              Removing {accountPendingRemoval?.displayName} will clear all associated crawled posts and publishing tasks.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAccountPendingRemoval(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
