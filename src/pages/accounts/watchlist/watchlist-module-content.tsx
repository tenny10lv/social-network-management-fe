'use client';

import { useCallback, useMemo, useState } from 'react';
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
  WATCHLIST_ACCOUNTS,
} from './mock-data';
import {
  CrawledPost,
  MyThreadsAccount,
  PublishingTask,
  WatchlistAccount,
} from './types';
import { WatchlistAccountsTable } from './components/watchlist-accounts-table';
import { MyThreadsAccountsTable } from './components/my-threads-accounts-table';
import { CrawledPostsPanel } from './components/crawled-posts-panel';
import { ScheduledPostsPanel } from './components/scheduled-posts-panel';
import { PublishedHistoryPanel } from './components/published-history-panel';
import { PostEditorDialog } from './components/post-editor-dialog';
import { SchedulePostDialog } from './components/schedule-post-dialog';
import { WatchlistTagsDialog } from './components/watchlist-tags-dialog';

const createId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 11);

export function WatchlistModuleContent() {
  const [watchlistAccounts, setWatchlistAccounts] = useState<WatchlistAccount[]>(WATCHLIST_ACCOUNTS);
  const [myAccounts, setMyAccounts] = useState<MyThreadsAccount[]>(MY_THREADS_ACCOUNTS);
  const [crawledPosts, setCrawledPosts] = useState<CrawledPost[]>(CRAWLED_POSTS);
  const [publishingTasks, setPublishingTasks] = useState<PublishingTask[]>(PUBLISHING_TASKS);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(WATCHLIST_ACCOUNTS[0]?.id ?? null);
  const [activeTab, setActiveTab] = useState<'crawled' | 'scheduled' | 'published'>('crawled');
  const [tagEditorAccount, setTagEditorAccount] = useState<WatchlistAccount | null>(null);
  const [editorState, setEditorState] = useState<{ postId: string; intent: 'edit' | 'publish' } | null>(null);
  const [scheduleState, setScheduleState] = useState<{ postId: string; taskId?: string } | null>(null);
  const [accountPendingRemoval, setAccountPendingRemoval] = useState<WatchlistAccount | null>(null);

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

  const handleToggleMyAccountStatus = useCallback((accountId: string) => {
    setMyAccounts((previous) =>
      previous.map((account) =>
        account.id === accountId
          ? { ...account, status: account.status === 'active' ? 'paused' : 'active' }
          : account,
      ),
    );
  }, []);

  const handleSetPrimaryAccount = useCallback((accountId: string) => {
    setMyAccounts((previous) => previous.map((account) => ({ ...account, isPrimary: account.id === accountId })));
  }, []);

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

  return (
    <div className="grid w-full gap-6 md:gap-8 xl:grid-cols-12 2xl:gap-12">
      <div className="xl:col-span-5 2xl:col-span-5 self-start xl:min-w-[340px]">
        <WatchlistAccountsTable
          accounts={watchlistAccounts}
          selectedAccountId={selectedAccountId}
          onSelectAccount={handleSelectAccount}
          onRequestEditTags={setTagEditorAccount}
          onRequestRemove={setAccountPendingRemoval}
          onTriggerCrawl={handleTriggerCrawl}
        />
      </div>
      <div className="xl:col-span-6 2xl:col-span-7 flex flex-col gap-6">
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
      <div className="self-start xl:col-span-4 xl:col-start-1 xl:row-start-2 xl:min-w-[340px] 2xl:col-span-3 2xl:col-start-1 2xl:row-start-2">
        <MyThreadsAccountsTable
          accounts={myAccounts}
          onSetPrimary={handleSetPrimaryAccount}
          onToggleStatus={handleToggleMyAccountStatus}
        />
      </div>

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
