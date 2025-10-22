'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Download,
  ExternalLink,
  Filter,
  Loader2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Trash,
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pagination, PaginationContent, PaginationItem } from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
  stickyActionsColumnBaseClasses,
  stickyActionsColumnWidthClasses,
  tableBodyClassName,
  tableClassName,
  tableHeaderCellClasses,
  tableHeaderClassName,
  tableWrapperClassName,
} from './table-styles';
import { cn } from '@/lib/utils';
import { useBulkActions } from '@/hooks/useBulkActions';
import { useExportPosts } from '@/hooks/useExportPosts';
import { useSentimentTagging } from '@/hooks/useSentimentTagging';
import {
  addPostsToCollection,
  bulkDeletePosts,
  fetchCollections,
  fetchPostAnalytics,
  republishPost,
} from '../api';
import {
  CollectionOption,
  CrawledPost,
  PostAnalyticsSummary,
  WatchlistAccount,
} from '../types';
import { PostDetailModal } from './post-detail-modal';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ResponsiveContainer, BarChart, CartesianGrid, Bar, XAxis, YAxis, Tooltip as ChartTooltip, LineChart, Line, Legend, Cell } from 'recharts';

const PAGE_SIZE_OPTIONS = [5, 10, 20];

const stickyActionsColumnClasses = cn(stickyActionsColumnBaseClasses, stickyActionsColumnWidthClasses);

export type PostFilters = {
  search: string;
  status: 'pipeline' | 'scheduled' | 'published' | 'all';
  mediaType: 'all' | 'image' | 'video' | 'text';
  sentiment: 'all' | 'positive' | 'neutral' | 'negative';
};

const formatTimestamp = (value?: string) => {
  if (!value) {
    return '—';
  }

  return format(new Date(value), 'MMM d, yyyy • HH:mm');
};

interface CrawledPostsTableProps {
  account: WatchlistAccount | null;
  posts: CrawledPost[];
  isLoading?: boolean;
  isRefreshing?: boolean;
  filters: PostFilters;
  onFiltersChange: (filters: Partial<PostFilters>) => void;
  onRefreshCrawl: (accountId: string) => void;
}

interface CollectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPostIds: string[];
  accountId: string;
}

interface RepublishModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string | null;
}

function CollectionModal({ open, onOpenChange, selectedPostIds, accountId }: CollectionModalProps) {
  const queryClient = useQueryClient();
  const [selectedCollection, setSelectedCollection] = useState<string>('');
  const [newCollection, setNewCollection] = useState('');

  const collectionsQuery = useQuery({
    queryKey: ['watchlistCollections'],
    queryFn: fetchCollections,
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        postIds: selectedPostIds,
        collectionId: selectedCollection || undefined,
        name: selectedCollection ? undefined : newCollection,
      };
      const response = await addPostsToCollection(payload);
      await queryClient.invalidateQueries({ queryKey: ['watchlistCollections'] });
      await queryClient.invalidateQueries({ queryKey: ['watchlistPosts', accountId] });
      return response;
    },
    onSuccess: () => {
      toast.success('Posts added to collection.');
      setNewCollection('');
      setSelectedCollection('');
      onOpenChange(false);
    },
  });

  const collections = collectionsQuery.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Add to Collection</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="existing-collection">Choose existing</Label>
            <Select
              value={selectedCollection || 'none'}
              onValueChange={(value) => {
                if (value === 'none') {
                  setSelectedCollection('');
                  return;
                }
                setSelectedCollection(value);
              }}
            >
              <SelectTrigger id="existing-collection">
                <SelectValue placeholder="Select collection" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No collection</SelectItem>
                {collections.map((collection: CollectionOption) => (
                  <SelectItem key={collection.id} value={collection.id}>
                    {collection.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-collection">Or create new</Label>
            <Input
              id="new-collection"
              value={newCollection}
              onChange={(event) => {
                setNewCollection(event.target.value);
                if (event.target.value) {
                  setSelectedCollection('');
                }
              }}
              placeholder="Inspiration folder name"
            />
          </div>
        </DialogBody>
        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <Button
            type="button"
            variant="primary"
            disabled={mutation.isPending || (!selectedCollection && !newCollection)}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                Saving
              </span>
            ) : (
              'Save'
            )}
          </Button>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RepublishModal({ open, onOpenChange, postId }: RepublishModalProps) {
  const queryClient = useQueryClient();
  const [targetAccountId, setTargetAccountId] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [note, setNote] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      if (!postId) {
        throw new Error('Missing post');
      }
      const payload = {
        postId,
        targetAccountId,
        scheduledFor: scheduledFor || undefined,
        note: note || undefined,
      };
      const response = await republishPost(payload);
      await queryClient.invalidateQueries({ queryKey: ['watchlistPosts'] });
      return response;
    },
    onSuccess: () => {
      toast.success('Republish task scheduled.');
      setTargetAccountId('');
      setScheduledFor('');
      setNote('');
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Republish Post</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="republish-target">Target account ID</Label>
            <Input
              id="republish-target"
              value={targetAccountId}
              onChange={(event) => setTargetAccountId(event.target.value)}
              placeholder="threads-account-id"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="republish-datetime">Schedule (optional)</Label>
            <Input
              id="republish-datetime"
              type="datetime-local"
              value={scheduledFor}
              onChange={(event) => setScheduledFor(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="republish-note">Notes</Label>
            <Textarea
              id="republish-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Context for the publishing team"
              rows={3}
            />
          </div>
        </DialogBody>
        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <Button
            type="button"
            variant="primary"
            disabled={mutation.isPending || !targetAccountId}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                Scheduling
              </span>
            ) : (
              'Schedule republish'
            )}
          </Button>
          <Button type="button" variant="ghost" disabled={mutation.isPending} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CrawledPostsTable({
  account,
  posts,
  isLoading = false,
  isRefreshing = false,
  filters,
  onFiltersChange,
  onRefreshCrawl,
}: CrawledPostsTableProps) {
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [page, setPage] = useState(1);
  const [detailPostId, setDetailPostId] = useState<string | null>(null);
  const [isCollectionModalOpen, setCollectionModalOpen] = useState(false);
  const [republishPostId, setRepublishPostId] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const sentiment = useSentimentTagging();
  const { exportPosts, isExporting } = useExportPosts();

  const analyticsQuery = useQuery<{ topHashtags: PostAnalyticsSummary['topHashtags']; engagementOverTime: PostAnalyticsSummary['engagementOverTime'] }>({
    queryKey: ['watchlistPostsAnalytics', account?.id],
    queryFn: () => fetchPostAnalytics({ accountId: account!.id }),
    enabled: Boolean(account),
  });

  const deleteMutation = useMutation({
    mutationFn: async (postIds: string[]) => bulkDeletePosts({ postIds }),
    onSuccess: (_, variables) => {
      toast.success('Posts removed.');
      void queryClient.invalidateQueries({ queryKey: ['watchlistPosts', account?.id] });
      clear();
      if (detailPostId && variables.includes(detailPostId)) {
        setDetailPostId(null);
      }
    },
  });

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      if (filters.sentiment !== 'all' && post.sentiment !== filters.sentiment) {
        return false;
      }

      if (filters.mediaType !== 'all' && post.mediaType !== filters.mediaType) {
        return false;
      }

      if (filters.status === 'pipeline' && !(post.status === 'draft' || post.status === 'ready')) {
        return false;
      }

      if (filters.status !== 'all' && filters.status !== 'pipeline' && post.status !== filters.status) {
        return false;
      }

      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesContent = post.content.toLowerCase().includes(searchLower);
        const matchesTopic = post.topics.some((topic) => topic.toLowerCase().includes(searchLower));
        const matchesHashtag = post.hashtags?.some((tag) => tag.toLowerCase().includes(searchLower));
        if (!matchesContent && !matchesTopic && !matchesHashtag) {
          return false;
        }
      }

      return true;
    });
  }, [filters, posts]);

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const currentRecords = filteredPosts.slice(startIndex, startIndex + pageSize);

  const { selectedIds, toggle, selectAll, clear, summary } = useBulkActions(filteredPosts);

  const handleExport = (format: 'csv' | 'xlsx', postIds?: string[]) => {
    if (!account) {
      return;
    }

    exportPosts({
      accountId: account.id,
      filters: {
        search: filters.search,
        status: filters.status,
        mediaType: filters.mediaType,
        sentiment: filters.sentiment,
      },
      format,
      postIds,
    });
  };

  const handleBulkDelete = () => {
    if (!summary.count || deleteMutation.isPending) {
      return;
    }
    deleteMutation.mutate([...selectedIds]);
  };

  const handleBulkCollection = () => {
    if (!summary.count) {
      return;
    }
    setCollectionModalOpen(true);
  };

  const handleRefresh = () => {
    if (!account) {
      return;
    }
    onRefreshCrawl(account.id);
  };

  return (
    <Card>
      <CardHeader className="py-5">
        <CardHeading>
          <div className="flex flex-col gap-1.5">
            <CardTitle>Crawled Posts</CardTitle>
            {account ? (
              <p className="text-sm text-muted-foreground">
                Showing captures from <span className="font-medium">{account.displayName}</span>. Last crawl{' '}
                {formatTimestamp(account.lastCrawledAt)}.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Select a watchlist account to review crawled posts.</p>
            )}
          </div>
        </CardHeading>
        <CardToolbar className="flex-col gap-4 xl:flex-row xl:items-center xl:justify-between xl:gap-6">
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
            <div className="relative flex-1">
              <Filter className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={filters.search}
                onChange={(event) => {
                  onFiltersChange({ search: event.target.value });
                  setPage(1);
                }}
                placeholder="Search content, topics, hashtags"
                className="w-full pl-9"
              />
            </div>
            <Select
              value={filters.status}
              onValueChange={(value) => {
                onFiltersChange({ status: value as PostFilters['status'] });
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pipeline">Pipeline</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="all">All statuses</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.mediaType}
              onValueChange={(value) => {
                onFiltersChange({ mediaType: value as PostFilters['mediaType'] });
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Media" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All media</SelectItem>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="text">Text-only</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.sentiment}
              onValueChange={(value) => {
                onFiltersChange({ sentiment: value as PostFilters['sentiment'] });
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Sentiment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sentiments</SelectItem>
                <SelectItem value="positive">Positive</SelectItem>
                <SelectItem value="neutral">Neutral</SelectItem>
                <SelectItem value="negative">Negative</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" className="w-full sm:w-auto" disabled={!account || isExporting}>
                  <Download className="mr-2 size-4" /> Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => handleExport('csv')}
                  disabled={!account || isExporting}
                >
                  Export CSV
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleExport('xlsx')}
                  disabled={!account || isExporting}
                >
                  Export XLSX
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              type="button"
              variant="primary"
              className="w-full sm:w-auto"
              onClick={handleRefresh}
              disabled={!account || isRefreshing}
            >
              {isRefreshing ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" /> Refreshing
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <RefreshCw className="size-4" /> Refresh crawl
                </span>
              )}
            </Button>
          </div>
        </CardToolbar>
      </CardHeader>
      <CardTable className="overflow-hidden">
        <Table className={tableClassName} wrapperClassName={tableWrapperClassName}>
          <TableHeader className={tableHeaderClassName}>
            <TableRow className="[&>th]:whitespace-nowrap">
              <TableHead className={cn(tableHeaderCellClasses, 'w-12 text-left')}>
                <Checkbox
                  aria-label="Select all posts"
                  checked={summary.count > 0 && summary.count === filteredPosts.length}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      selectAll();
                    } else {
                      clear();
                    }
                  }}
                  disabled={filteredPosts.length === 0}
                />
              </TableHead>
              <TableHead className={cn(tableHeaderCellClasses, 'min-w-[320px] text-left')}>Post</TableHead>
              <TableHead className={cn(tableHeaderCellClasses, 'min-w-[220px] text-left')}>Captured</TableHead>
              <TableHead className={cn(tableHeaderCellClasses, 'min-w-[160px] text-left')}>Sentiment</TableHead>
              <TableHead className={cn(tableHeaderCellClasses, 'min-w-[200px] text-left')}>Engagement</TableHead>
              <TableHead className={cn(tableHeaderCellClasses, stickyActionsColumnClasses, 'z-[6] text-center')}>
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className={tableBodyClassName}>
            {isLoading ? (
              Array.from({ length: pageSize }).map((_, index) => (
                <TableRow key={`loading-${index}`}>
                  {Array.from({ length: 6 }).map((__, cellIndex) => (
                    <TableCell key={cellIndex} className="px-5 py-4">
                      <Skeleton className="h-8 w-full rounded-md" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : currentRecords.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">
                  {posts.length === 0 ? 'No crawled posts yet for this account.' : 'No posts match your filters.'}
                </TableCell>
              </TableRow>
            ) : (
              currentRecords.map((post) => {
                const isSelected = selectedIds.includes(post.id);
                const firstTopic = post.topics[0];
                const previewHashtags = post.hashtags?.slice(0, 3) ?? [];

                return (
                  <TableRow
                    key={post.id}
                    className="group cursor-pointer transition-colors hover:bg-muted/40"
                    onClick={() => setDetailPostId(post.id)}
                  >
                    <TableCell
                      className="px-5 py-4 align-top"
                      onClick={(event) => {
                        event.stopPropagation();
                        toggle(post.id);
                      }}
                    >
                      <Checkbox checked={isSelected} aria-label={`Select post ${post.id}`} />
                    </TableCell>
                    <TableCell className="min-w-[320px] px-5 py-4 align-top">
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                          {post.topics.map((topic) => (
                            <Badge key={topic} variant="outline" className="text-xs font-medium">
                              #{topic}
                            </Badge>
                          ))}
                        </div>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p className="max-w-[520px] cursor-default text-sm leading-relaxed text-foreground line-clamp-3">
                              {post.content}
                            </p>
                          </TooltipTrigger>
                          <TooltipContent align="start" className="max-w-sm text-sm leading-relaxed">
                            {post.content}
                          </TooltipContent>
                        </Tooltip>
                        <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
                          <Badge variant="secondary" appearance="light" className="capitalize">
                            {post.status}
                          </Badge>
                          <Badge variant="outline" className="capitalize">
                            {post.mediaType}
                          </Badge>
                          {previewHashtags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[220px] px-5 py-4 align-top">
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-tight text-foreground">{formatTimestamp(post.capturedAt)}</p>
                        {post.originalUrl ? (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 text-xs text-primary underline-offset-4 hover:underline"
                            onClick={(event) => {
                              event.stopPropagation();
                              window.open(post.originalUrl!, '_blank', 'noopener');
                            }}
                          >
                            <ExternalLink className="size-3.5" /> Open original
                          </button>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell
                      className="min-w-[160px] px-5 py-4 align-top"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Select
                        value={post.sentiment}
                        onValueChange={(value) => {
                          if (!account) {
                            return;
                          }
                          sentiment.update({
                            postId: post.id,
                            sentiment: value,
                            accountId: account.id,
                          });
                        }}
                        disabled={(sentiment.isUpdating && sentiment.updatingPostId === post.id) || !account}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="positive">Positive</SelectItem>
                          <SelectItem value="neutral">Neutral</SelectItem>
                          <SelectItem value="negative">Negative</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="min-w-[200px] px-5 py-4 align-top">
                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <span className="font-semibold text-foreground">{post.likes.toLocaleString()}</span>
                          likes
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <span className="font-semibold text-foreground">{post.replies.toLocaleString()}</span>
                          comments
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <span className="font-semibold text-foreground">{post.reposts.toLocaleString()}</span>
                          reposts
                        </span>
                      </div>
                    </TableCell>
                    <TableCell
                      className={cn(
                        stickyActionsColumnClasses,
                        'align-top py-4 text-right transition-colors group-hover:bg-muted/40',
                      )}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => setDetailPostId(post.id)}>
                            View details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setRepublishPostId(post.id)}>
                            Republish
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setCollectionModalOpen(true);
                              if (!selectedIds.includes(post.id)) {
                                toggle(post.id);
                              }
                            }}
                          >
                            Add to collection
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => deleteMutation.mutate([post.id])}
                          >
                            Delete post
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
      <CardContent className="border-t pt-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            Rows per page:
            <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
              <SelectTrigger className="w-[110px]">
                <SelectValue placeholder="Rows" />
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
                    onClick={() => setPage((previous) => Math.max(1, previous - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                </PaginationItem>
                <PaginationItem>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((previous) => Math.min(totalPages, previous + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
            <div className="text-sm text-muted-foreground sm:order-1">
              Page {currentPage} of {totalPages}
              {filteredPosts.length ? ` • ${filteredPosts.length} total` : ''}
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-6">
        <span className="text-xs text-muted-foreground">
          {currentRecords.length} post{currentRecords.length === 1 ? '' : 's'} on this page.
        </span>
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="bg-muted/40">
            <CardContent className="pt-6">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-muted-foreground">Top Hashtags</span>
              </div>
              <div className="h-40">
                {analyticsQuery.isLoading ? (
                  <Skeleton className="h-full w-full rounded-lg" />
                ) : analyticsQuery.data?.topHashtags?.length ? (
                  <ResponsiveContainer>
                    <BarChart data={analyticsQuery.data.topHashtags}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" tickLine={false} />
                      <YAxis tickLine={false} width={60} />
                      <ChartTooltip />
                      <Bar dataKey="value" radius={6}>
                        {analyticsQuery.data.topHashtags.map((entry, index) => (
                          <Cell key={entry.label} fill={`hsl(var(--chart-${(index % 6) + 1}))`} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-muted-foreground">Not enough data yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-muted/40">
            <CardContent className="pt-6">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-muted-foreground">Engagement Over Time</span>
              </div>
              <div className="h-40">
                {analyticsQuery.isLoading ? (
                  <Skeleton className="h-full w-full rounded-lg" />
                ) : analyticsQuery.data?.engagementOverTime?.length ? (
                  <ResponsiveContainer>
                    <LineChart data={analyticsQuery.data.engagementOverTime}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tickLine={false} minTickGap={24} />
                      <YAxis tickLine={false} width={60} />
                      <Legend />
                      <ChartTooltip />
                      <Line type="monotone" dataKey="value" name="Engagement" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-muted-foreground">Analytics will appear after more activity.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </CardFooter>
      <PostDetailModal open={Boolean(detailPostId)} postId={detailPostId} onOpenChange={(open) => !open && setDetailPostId(null)} />
      {account ? (
        <CollectionModal
          open={isCollectionModalOpen}
          onOpenChange={(open) => {
            setCollectionModalOpen(open);
            if (!open) {
              clear();
            }
          }}
          selectedPostIds={selectedIds}
          accountId={account.id}
        />
      ) : null}
      <RepublishModal
        open={Boolean(republishPostId)}
        postId={republishPostId}
        onOpenChange={(open) => {
          if (!open) {
            setRepublishPostId(null);
          }
        }}
      />
      {summary.hasSelection ? (
        <div className="sticky bottom-4 z-20 mx-4 rounded-lg border bg-background/90 p-4 shadow-lg backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm font-medium">
              {summary.count} post{summary.count === 1 ? '' : 's'} selected
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('csv', [...selectedIds])}
                disabled={isExporting}
              >
                Export selected
              </Button>
              <Button variant="outline" size="sm" onClick={handleBulkCollection}>
                <Plus className="mr-2 size-4" /> Add to collection
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={handleBulkDelete}
                disabled={deleteMutation.isPending}
              >
                <Trash className="mr-2 size-4" /> Delete
              </Button>
              <Button variant="ghost" size="sm" onClick={() => clear()}>
                Clear
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
