'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
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
import { Label } from '@/components/ui/label';
import { Pagination, PaginationContent, PaginationItem } from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CrawledPost, WatchlistAccount } from '../types';
import { EllipsisVertical, Pencil, Send, Timer, TrendingUp } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { PostMediaThumbnails } from './post-media-thumbnails';
import { MediaViewerDialog } from './media-viewer-dialog';
import { cn } from '@/lib/utils';
import {
  stickyActionsColumnBaseClasses,
  stickyActionsColumnWidthClasses,
  tableBodyClassName,
  tableClassName,
  tableHeaderCellClasses,
  tableHeaderClassName,
  tableWrapperClassName,
} from './table-styles';

const PAGE_SIZE_OPTIONS = [5, 10, 20];

const stickyActionsColumnClasses = cn(stickyActionsColumnBaseClasses, stickyActionsColumnWidthClasses);

interface CrawledPostsPanelProps {
  account?: WatchlistAccount | null;
  posts: CrawledPost[];
  onOpenEditor: (postId: string, intent: 'edit' | 'publish') => void;
  onOpenSchedule: (postId: string) => void;
}

const sentimentVariantMap: Record<CrawledPost['sentiment'], 'success' | 'secondary' | 'destructive'> = {
  positive: 'success',
  neutral: 'secondary',
  negative: 'destructive',
};

const formatMediaType = (value: CrawledPost['mediaType']) => value.charAt(0).toUpperCase() + value.slice(1);

const formatStatusLabel = (value: CrawledPost['status']) => value.charAt(0).toUpperCase() + value.slice(1);

const formatSentimentLabel = (value: CrawledPost['sentiment']) =>
  `${value.charAt(0).toUpperCase() + value.slice(1)} Sentiment`;

export function CrawledPostsPanel({ account, posts, onOpenEditor, onOpenSchedule }: CrawledPostsPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'pipeline' | 'scheduled' | 'published' | 'all'>('pipeline');
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [page, setPage] = useState(1);
  const [mediaViewer, setMediaViewer] = useState<{ postId: string; type: 'images' | 'videos' } | null>(null);

  const sortedPosts = useMemo(
    () =>
      [...posts].sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime()),
    [posts],
  );

  const postsById = useMemo(
    () =>
      posts.reduce<Record<string, CrawledPost>>((accumulator, post) => {
        accumulator[post.id] = post;
        return accumulator;
      }, {}),
    [posts],
  );

  const filteredPosts = useMemo(() => {
    return sortedPosts.filter((post) => {
      const matchSearch = searchQuery
        ? post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          post.topics.some((topic) => topic.toLowerCase().includes(searchQuery.toLowerCase()))
        : true;

      let matchStatus = true;

      if (statusFilter === 'pipeline') {
        matchStatus = post.status === 'draft' || post.status === 'ready';
      } else if (statusFilter === 'scheduled') {
        matchStatus = post.status === 'scheduled';
      } else if (statusFilter === 'published') {
        matchStatus = post.status === 'published';
      }

      return matchSearch && matchStatus;
    });
  }, [sortedPosts, searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const currentRecords = filteredPosts.slice(startIndex, startIndex + pageSize);

  const formatTimestamp = (value: string | undefined) => {
    if (!value) {
      return '—';
    }
    return format(new Date(value), 'MMM d, yyyy • HH:mm');
  };

  return (
    <Card>
      <CardHeader className="py-5">
        <CardHeading>
          <div className="flex flex-col gap-1.5">
            <CardTitle>Crawled Posts</CardTitle>
            {account ? (
              <p className="text-sm text-muted-foreground">
                Showing live captures from <span className="font-medium">{account.displayName}</span>. Last crawl{' '}
                {formatTimestamp(account.lastCrawledAt)}.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Select a watchlist account to review newly crawled content.</p>
            )}
          </div>
        </CardHeading>
        <CardToolbar className="flex-col gap-4 xl:flex-row xl:items-center xl:justify-between xl:gap-6">
          <Input
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Search by topic or keyword"
            className="w-full xl:w-72"
          />
          <div className="flex w-full items-center gap-2 xl:w-auto">
            <Label className="hidden text-xs font-medium text-muted-foreground xl:inline-flex">Status</Label>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
              <SelectTrigger className="w-full xl:w-[220px]">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pipeline">Pipeline (Draft & Ready)</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="all">All statuses</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardToolbar>
      </CardHeader>
      <CardTable className="overflow-hidden">
        <Table className={tableClassName} wrapperClassName={tableWrapperClassName}>
            <TableHeader className={tableHeaderClassName}>
              <TableRow className="[&>th]:whitespace-nowrap">
                <TableHead className={cn(tableHeaderCellClasses, 'min-w-[320px] text-left')}>Post</TableHead>
                <TableHead className={cn(tableHeaderCellClasses, 'min-w-[200px] text-left')}>Images</TableHead>
                <TableHead className={cn(tableHeaderCellClasses, 'min-w-[200px] text-left')}>Videos</TableHead>
                <TableHead className={cn(tableHeaderCellClasses, 'min-w-[280px] max-w-[280px] text-left')}>
                  Captured
                </TableHead>
                <TableHead className={cn(tableHeaderCellClasses, 'min-w-[320px] max-w-[320px] text-left')}>
                  Status
                </TableHead>
                <TableHead className={cn(tableHeaderCellClasses, 'w-[220px] min-w-[220px] text-left')}>
                  Engagement
                </TableHead>
                <TableHead className={cn(tableHeaderCellClasses, stickyActionsColumnClasses, 'z-40 text-right')}>
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className={tableBodyClassName}>
              {currentRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="px-5 py-10 text-center text-sm text-muted-foreground">
                    {posts.length === 0
                      ? 'No crawled posts yet for this account.'
                      : 'No posts match your filters.'}
                  </TableCell>
                </TableRow>
              ) : (
                currentRecords.map((post) => {
                  const capturedLabel = `${formatTimestamp(post.capturedAt)} • ${formatMediaType(post.mediaType)}`;
                  const statusLabel = `${formatStatusLabel(post.status)} • ${formatSentimentLabel(post.sentiment)}`;

                  return (
                    <TableRow key={post.id} className="group transition-colors hover:bg-muted/40">
                      <TableCell className="min-w-[320px] align-top px-5 py-4">
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
                        </div>
                      </TableCell>
                      <TableCell className="align-top px-5 py-4">
                        <PostMediaThumbnails
                          type="images"
                          images={post.images}
                          onClick={() => setMediaViewer({ postId: post.id, type: 'images' })}
                        />
                      </TableCell>
                      <TableCell className="align-top px-5 py-4">
                        <PostMediaThumbnails
                          type="videos"
                          videos={post.videos}
                          onClick={() => setMediaViewer({ postId: post.id, type: 'videos' })}
                        />
                      </TableCell>
                      <TableCell className="min-w-[280px] max-w-[280px] align-top px-5 py-4">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p className="truncate whitespace-nowrap text-sm font-medium leading-tight text-foreground">
                              {capturedLabel}
                            </p>
                          </TooltipTrigger>
                          <TooltipContent align="start" className="text-sm leading-tight">
                            {capturedLabel}
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="min-w-[320px] max-w-[320px] align-top px-5 py-4">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex min-w-0 items-center gap-2 truncate whitespace-nowrap">
                              <Badge
                                variant={post.status === 'ready' ? 'primary' : post.status === 'draft' ? 'secondary' : 'success'}
                                appearance="light"
                                className="whitespace-nowrap capitalize"
                              >
                                {formatStatusLabel(post.status)}
                              </Badge>
                              <Badge
                                variant={sentimentVariantMap[post.sentiment]}
                                appearance="light"
                                className="whitespace-nowrap capitalize"
                              >
                                {formatSentimentLabel(post.sentiment)}
                              </Badge>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent align="start" className="text-sm leading-tight">
                            {statusLabel}
                          </TooltipContent>
                        </Tooltip>
                        {post.status === 'scheduled' && (
                          <span className="mt-1 block whitespace-nowrap text-xs text-muted-foreground">
                            Scheduled {formatTimestamp(post.scheduledFor)}
                          </span>
                        )}
                        {post.status === 'published' && (
                          <span className="mt-1 block whitespace-nowrap text-xs text-muted-foreground">
                            Published {formatTimestamp(post.publishedAt)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="align-top px-5 py-4">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <TrendingUp className="size-3.5 text-foreground" />
                            <span className="font-semibold text-foreground">{post.likes.toLocaleString()}</span>
                            <span>likes</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-semibold text-foreground">{post.replies.toLocaleString()}</span>
                            <span>replies</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-semibold text-foreground">{post.reposts.toLocaleString()}</span>
                            <span>reposts</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell
                        className={cn(
                          stickyActionsColumnClasses,
                          'z-40 align-top py-4 transition-colors group-hover:bg-muted/40',
                        )}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <EllipsisVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => onOpenEditor(post.id, 'edit')}>
                              <Pencil className="mr-2 size-4" />
                              Edit post
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onOpenEditor(post.id, 'publish')}>
                              <Send className="mr-2 size-4" />
                              Publish now
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onOpenSchedule(post.id)}>
                              <Timer className="mr-2 size-4" />
                              Schedule post
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
      <CardFooter>
        <span className="text-xs text-muted-foreground">
          {currentRecords.length} post{currentRecords.length === 1 ? '' : 's'} on this page.
        </span>
      </CardFooter>
      <MediaViewerDialog
        open={Boolean(mediaViewer)}
        type={mediaViewer?.type ?? 'images'}
        title={
          mediaViewer
            ? `${mediaViewer.type === 'images' ? 'Images' : 'Videos'} • ${
                postsById[mediaViewer.postId]?.topics.join(', ') ?? 'Post media'
              }`
            : ''
        }
        images={mediaViewer?.type === 'images' ? postsById[mediaViewer.postId]?.images : undefined}
        videos={mediaViewer?.type === 'videos' ? postsById[mediaViewer.postId]?.videos : undefined}
        onOpenChange={(openState) => {
          if (!openState) {
            setMediaViewer(null);
          }
        }}
      />
    </Card>
  );
}
