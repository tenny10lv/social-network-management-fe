import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { AlertCircle, CalendarClock, Copy, EllipsisVertical, Eye, Search } from 'lucide-react';

import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pagination, PaginationContent, PaginationItem } from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableLoadingState } from '@/components/ui/table-loading-state';
import { cn } from '@/lib/utils';
import { ThreadPost, ThreadPostListResponse, ThreadsPostType } from '../posts-api';
import { PostMediaImage, PostMediaVideo, WatchlistAccountRow } from '../types';
import { PostMediaThumbnails } from './post-media-thumbnails';
import { MediaViewerDialog } from './media-viewer-dialog';
import {
  stickyActionsColumnBaseClasses,
  stickyActionsColumnWidthClasses,
  tableBodyClassName,
  tableClassName,
  tableHeaderCellClasses,
  tableHeaderClassName,
  tableWrapperClassName,
} from './table-styles';

const PAGE_SIZE_OPTIONS = [10, 20, 50];
const stickyActionsColumnClasses = cn(stickyActionsColumnBaseClasses, stickyActionsColumnWidthClasses);

type ThreadsCrawledPostsTableProps = {
  account?: WatchlistAccountRow | null;
  posts: ThreadPost[];
  meta: ThreadPostListResponse['meta'];
  keyword: string;
  isPinned: boolean;
  isReply: boolean;
  type: ThreadsPostType | 'ALL';
  isLoading?: boolean;
  isFetching?: boolean;
  error?: Error | null;
  pageSizeOptions?: number[];
  onKeywordChange: (value: string) => void;
  onPinnedChange: (value: boolean) => void;
  onReplyChange: (value: boolean) => void;
  onTypeChange: (value: ThreadsPostType | 'ALL') => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onRetry?: () => void;
};

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return format(date, 'MMM d, yyyy • HH:mm');
};

const resolveCaption = (post: ThreadPost) => {
  if (post.caption) {
    return post.caption;
  }

  if (post.textFragments.length > 0) {
    return post.textFragments.join(' ');
  }

  return post.code ?? post.postId ?? post.pk ?? '—';
};

export function ThreadsCrawledPostsTable({
  account,
  posts,
  meta,
  keyword,
  isPinned,
  isReply,
  type,
  isLoading = false,
  isFetching = false,
  error,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  onKeywordChange,
  onPinnedChange,
  onReplyChange,
  onTypeChange,
  onPageChange,
  onPageSizeChange,
  onRetry,
}: ThreadsCrawledPostsTableProps) {
  const page = Math.max(1, meta.page || 1);
  const limit = Math.max(1, meta.limit || 10);
  const totalPages = Math.max(1, meta.totalPages || 1);
  const totalCount = meta.totalCount ?? posts.length;
  const [mediaViewer, setMediaViewer] = useState<{ postId: string; type: 'images' | 'videos' } | null>(null);

  const mediaByPostId = useMemo(
    () =>
      posts.reduce<Record<string, { images: PostMediaImage[]; videos: PostMediaVideo[] }>>((accumulator, post) => {
        const images =
          post.imageMediaItems?.reduce<PostMediaImage[]>((items, item, index) => {
            const source = item.url ?? (item as { sourceUrl?: string }).sourceUrl ?? item.previewUrl ?? item.thumbnailUrl;
            if (!source) {
              return items;
            }
            items.push({
              src: source,
              full: item.url ?? (item as { sourceUrl?: string }).sourceUrl ?? undefined,
              alt: `Image ${index + 1} for post ${post.postId ?? post.pk ?? post.code ?? post.id}`,
            });
            return items;
          }, []) ?? [];

        const videos =
          post.videoMediaItems?.reduce<PostMediaVideo[]>((items, item, index) => {
            const source = item.url ?? (item as { sourceUrl?: string }).sourceUrl ?? item.previewUrl;
            if (!source) {
              return items;
            }
            items.push({
              src: source,
              thumbnail: item.thumbnailUrl ?? item.previewUrl ?? undefined,
              title: `Video ${index + 1} for post ${post.postId ?? post.pk ?? post.code ?? post.id}`,
            });
            return items;
          }, []) ?? [];

        accumulator[post.id] = { images, videos };
        return accumulator;
      }, {}),
    [posts],
  );

  const postsById = useMemo(
    () =>
      posts.reduce<Record<string, ThreadPost>>((accumulator, post) => {
        accumulator[post.id] = post;
        return accumulator;
      }, {}),
    [posts],
  );

  const activeMedia = mediaViewer ? mediaByPostId[mediaViewer.postId] : null;
  const activePost = mediaViewer ? postsById[mediaViewer.postId] : null;

  return (
    <Card>
      <CardHeader className="space-y-4 py-5">
        <CardHeading className="w-full space-y-2">
          <CardTitle>Crawled Posts</CardTitle>
          {account ? (
            <p className="text-sm text-muted-foreground">
              Latest threads captured for <span className="font-medium">{account.displayName}</span>. Showing page {page}{' '}
              of {totalPages}.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Select a watchlist account to view crawled posts and apply filters.
            </p>
          )}
        </CardHeading>

        <CardToolbar className="flex w-full flex-wrap items-center justify-between gap-3">
          <div className="relative flex min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={keyword}
              onChange={(event) => onKeywordChange(event.target.value)}
              placeholder="Search by keyword"
              className="w-full pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <div className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3.5 py-1.5 min-w-[170px] sm:min-w-[190px]">
              <Label className="text-sm font-medium text-foreground whitespace-nowrap">Pinned only</Label>
              <Switch
                size="sm"
                checked={isPinned}
                onCheckedChange={(checked) => onPinnedChange(Boolean(checked))}
              />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3.5 py-1.5 min-w-[170px] sm:min-w-[190px]">
              <Label className="text-sm font-medium text-foreground whitespace-nowrap">Replies only</Label>
              <Switch
                size="sm"
                checked={isReply}
                onCheckedChange={(checked) => onReplyChange(Boolean(checked))}
              />
            </div>
            <div className="flex min-w-[160px] flex-1 flex-col gap-1">
              <Select value={type} onValueChange={(value) => onTypeChange(value as ThreadsPostType | 'ALL')}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Post type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">ALL</SelectItem>
                  <SelectItem value={ThreadsPostType.NORMAL}>{ThreadsPostType.NORMAL}</SelectItem>
                  <SelectItem value={ThreadsPostType.TEXT}>{ThreadsPostType.TEXT}</SelectItem>
                  <SelectItem value={ThreadsPostType.IMAGE}>{ThreadsPostType.IMAGE}</SelectItem>
                  <SelectItem value={ThreadsPostType.VIDEO}>{ThreadsPostType.VIDEO}</SelectItem>
                  <SelectItem value={ThreadsPostType.SHORT}>{ThreadsPostType.SHORT}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardToolbar>
      </CardHeader>
      <CardTable className="overflow-hidden">
        <Table className={tableClassName} wrapperClassName={tableWrapperClassName}>
          <TableHeader className={tableHeaderClassName}>
            <TableRow className="[&>th]:whitespace-nowrap">
              <TableHead className={cn(tableHeaderCellClasses, 'min-w-[220px] text-left')}>Taken At</TableHead>
              <TableHead className={cn(tableHeaderCellClasses, 'min-w-[180px] text-left')}>Post ID / PK</TableHead>
              <TableHead className={cn(tableHeaderCellClasses, 'min-w-[320px] text-left')}>Caption</TableHead>
              <TableHead className={cn(tableHeaderCellClasses, 'min-w-[120px] text-left')}>Likes</TableHead>
              <TableHead className={cn(tableHeaderCellClasses, 'min-w-[120px] text-left')}>Reply</TableHead>
              <TableHead className={cn(tableHeaderCellClasses, 'min-w-[120px] text-left')}>Pinned</TableHead>
              <TableHead className={cn(tableHeaderCellClasses, 'min-w-[180px] text-left')}>Media</TableHead>
              <TableHead className={cn(tableHeaderCellClasses, 'min-w-[140px] text-left')}>Type</TableHead>
              <TableHead className={cn(tableHeaderCellClasses, stickyActionsColumnClasses, 'z-[6] text-left')}>
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className={tableBodyClassName}>
            {isLoading ? (
              <TableLoadingState
                colSpan={9}
                message="Loading crawled posts..."
                cellClassName="px-5 py-10"
              />
            ) : error ? (
              <TableRow>
                <TableCell colSpan={9} className="px-5 py-8">
                  <Alert variant="mono" icon="destructive">
                    <AlertIcon>
                      <AlertCircle className="size-5" />
                    </AlertIcon>
                    <AlertTitle>{error.message || 'Failed to load crawled posts.'}</AlertTitle>
                    {onRetry ? (
                      <Button variant="outline" size="sm" className="mt-3" onClick={onRetry} disabled={isFetching}>
                        Retry
                      </Button>
                    ) : null}
                  </Alert>
                </TableCell>
              </TableRow>
            ) : posts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="px-5 py-10 text-center text-sm text-muted-foreground">
                  No crawled posts found for this account.
                </TableCell>
              </TableRow>
            ) : (
              posts.map((post) => {
                const idLabel = post.postId ?? post.pk ?? post.code ?? post.id;
                const caption = resolveCaption(post);
                const threadUrl =
                  post.code && account?.username
                    ? `https://www.threads.com/@${encodeURIComponent(account.username)}/post/${encodeURIComponent(post.code)}`
                    : null;
                const media = mediaByPostId[post.id];

                return (
                  <TableRow key={post.id} className="transition-colors hover:bg-muted/40">
                    <TableCell className="min-w-[220px] align-top px-5 py-4">
                      <span className="text-sm font-medium leading-tight">{formatDateTime(post.takenAt ?? post.createdAt)}</span>
                      {post.updatedAt ? (
                        <span className="mt-1 block text-xs text-muted-foreground">Updated {formatDateTime(post.updatedAt)}</span>
                      ) : null}
                    </TableCell>
                    <TableCell className="min-w-[180px] align-top px-5 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-semibold leading-tight text-foreground">{idLabel}</span>
                        {post.code && (
                          <span className="text-xs text-muted-foreground">
                            Code:{' '}
                            {threadUrl ? (
                              <a
                                href={threadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary underline-offset-4 hover:underline"
                              >
                                {post.code}
                              </a>
                            ) : (
                              post.code
                            )}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[320px] align-top px-5 py-4">
                      <p className="line-clamp-3 text-sm leading-relaxed text-foreground">{caption}</p>
                    </TableCell>
                    <TableCell className="min-w-[120px] align-top px-5 py-4">
                      <span className="text-sm font-semibold text-foreground">{post.likeCount.toLocaleString()}</span>
                    </TableCell>
                    <TableCell className="min-w-[120px] align-top px-5 py-4">
                      <Badge variant={post.isReply ? 'secondary' : 'outline'} appearance="light" className="capitalize">
                        {post.isReply ? 'Yes' : 'No'}
                      </Badge>
                    </TableCell>
                    <TableCell className="min-w-[120px] align-top px-5 py-4">
                      <Badge
                        variant={post.isPinned ? 'primary' : 'outline'}
                        appearance="light"
                        className="capitalize whitespace-nowrap"
                      >
                        {post.isPinned ? 'Pinned' : 'Not pinned'}
                      </Badge>
                    </TableCell>
                    <TableCell className="min-w-[180px] align-top px-5 py-4">
                      <div className="flex flex-col gap-2">
                        <PostMediaThumbnails
                          type="images"
                          images={media?.images}
                          onClick={() => setMediaViewer({ postId: post.id, type: 'images' })}
                        />
                        <PostMediaThumbnails
                          type="videos"
                          videos={media?.videos}
                          onClick={() => setMediaViewer({ postId: post.id, type: 'videos' })}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[140px] align-top px-5 py-4">
                      <Badge variant="outline" className="capitalize">
                        {post.type ?? 'Unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={cn(
                        stickyActionsColumnClasses,
                        'align-top px-5 py-4 text-left transition-colors',
                      )}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8">
                            <EllipsisVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuItem>
                            <Copy className="mr-2 size-4" />
                            Clone post now
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <CalendarClock className="mr-2 size-4" />
                            Schedule clone
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Eye className="mr-2 size-4" />
                            View post
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
      <MediaViewerDialog
        open={Boolean(mediaViewer)}
        type={mediaViewer?.type ?? 'images'}
        title={
          mediaViewer
            ? `${mediaViewer.type === 'images' ? 'Images' : 'Videos'} • ${activePost ? resolveCaption(activePost) : 'Post media'}`
            : ''
        }
        images={mediaViewer?.type === 'images' ? activeMedia?.images : undefined}
        videos={mediaViewer?.type === 'videos' ? activeMedia?.videos : undefined}
        onOpenChange={(openState) => {
          if (!openState) {
            setMediaViewer(null);
          }
        }}
      />
      <CardContent className="border-t pt-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            Rows per page:
            <Select
              value={String(limit)}
              onValueChange={(value) => {
                onPageSizeChange(Number(value));
                onPageChange(1);
              }}
            >
              <SelectTrigger className="w-[110px]">
                <SelectValue placeholder="Rows" />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((option) => (
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
                    onClick={() => onPageChange(Math.max(1, page - 1))}
                    disabled={page === 1 || isLoading}
                  >
                    Previous
                  </Button>
                </PaginationItem>
                <PaginationItem>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages || isLoading}
                  >
                    Next
                  </Button>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
            <div className="text-sm text-muted-foreground sm:order-1">
              Page {page} of {totalPages} • {totalCount.toLocaleString()} total
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <span className="text-xs text-muted-foreground">
          {posts.length} post{posts.length === 1 ? '' : 's'} on this page.
          {isFetching && !isLoading ? ' Refreshing…' : ''}
        </span>
      </CardFooter>
    </Card>
  );
}
