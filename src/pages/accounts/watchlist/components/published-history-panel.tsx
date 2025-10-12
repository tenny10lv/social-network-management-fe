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
import { ArrowUpRight, EllipsisVertical, FilePenLine } from 'lucide-react';
import { CrawledPost, MyThreadsAccount, PublishingTask } from '../types';
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

interface PublishedHistoryPanelProps {
  tasks: PublishingTask[];
  posts: CrawledPost[];
  myAccounts: MyThreadsAccount[];
  onOpenEditor: (postId: string, intent: 'edit' | 'publish') => void;
}

export function PublishedHistoryPanel({ tasks, posts, myAccounts, onOpenEditor }: PublishedHistoryPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [accountFilter, setAccountFilter] = useState<'all' | string>('all');
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [page, setPage] = useState(1);
  const [mediaViewer, setMediaViewer] = useState<{ postId: string; type: 'images' | 'videos' } | null>(null);

  const postsMap = useMemo(() => {
    return posts.reduce<Record<string, CrawledPost>>((map, post) => {
      map[post.id] = post;
      return map;
    }, {});
  }, [posts]);

  const activeMediaPost = mediaViewer ? postsMap[mediaViewer.postId] : undefined;

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (task.status !== 'completed') {
        return false;
      }

      const post = postsMap[task.postId];
      const matchSearch = searchQuery
        ? post?.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          post?.topics.some((topic) => topic.toLowerCase().includes(searchQuery.toLowerCase()))
        : true;

      const matchAccount = accountFilter === 'all' ? true : task.targetAccountId === accountFilter;

      return matchSearch && matchAccount;
    });
  }, [accountFilter, postsMap, searchQuery, tasks]);

  const sortedTasks = useMemo(
    () =>
      [...filteredTasks].sort((a, b) => {
        const aTime = a.executedAt ? new Date(a.executedAt).getTime() : 0;
        const bTime = b.executedAt ? new Date(b.executedAt).getTime() : 0;
        return bTime - aTime;
      }),
    [filteredTasks],
  );

  const totalPages = Math.max(1, Math.ceil(sortedTasks.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const currentRecords = sortedTasks.slice(startIndex, startIndex + pageSize);

  const resolveTargetAccount = (id: string) => myAccounts.find((account) => account.id === id);

  const formatTimestamp = (value?: string) => {
    if (!value) {
      return 'Not published';
    }
    return format(new Date(value), 'MMM d, yyyy • HH:mm');
  };

  return (
    <Card>
      <CardHeader className="py-5">
        <CardHeading>
          <CardTitle>Published History</CardTitle>
          <p className="text-sm text-muted-foreground">
            Audit every republished story with destination metadata and publishing notes.
          </p>
        </CardHeading>
        <CardToolbar className="flex-col gap-4 xl:flex-row xl:items-center xl:justify-between xl:gap-6">
          <Input
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Search published copy"
            className="w-full xl:w-72"
          />
          <div className="flex w-full items-center gap-2 xl:w-auto">
            <Label className="hidden text-xs font-medium text-muted-foreground xl:inline-flex">Published to</Label>
            <Select value={accountFilter} onValueChange={(value) => setAccountFilter(value)}>
              <SelectTrigger className="w-full xl:w-[240px]">
                <SelectValue placeholder="Target account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All accounts</SelectItem>
                {myAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.displayName}
                  </SelectItem>
                ))}
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
                <TableHead className={cn(tableHeaderCellClasses, 'min-w-[220px] text-left')}>
                  Published To
                </TableHead>
                <TableHead className={cn(tableHeaderCellClasses, 'w-[220px] min-w-[220px] text-left')}>
                  Published At
                </TableHead>
                <TableHead
                  className={cn(
                    tableHeaderCellClasses,
                    stickyActionsColumnBaseClasses,
                    stickyActionsColumnWidthClasses,
                    'z-40 text-center',
                  )}
                >
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className={tableBodyClassName}>
              {currentRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">
                    {tasks.length === 0
                      ? 'No published history yet. Publish or schedule posts to build history.'
                      : 'No published posts match your filters.'}
                  </TableCell>
                </TableRow>
              ) : (
                currentRecords.map((task) => {
                  const post = postsMap[task.postId];
                  const targetAccount = resolveTargetAccount(task.targetAccountId);

                  return (
                    <TableRow key={task.id} className="group transition-colors hover:bg-muted/40">
                      <TableCell className="min-w-[320px] align-top px-5 py-4">
                        <div className="flex flex-col gap-2">
                          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                            {post?.topics.map((topic) => (
                              <Badge key={topic} variant="outline" className="text-xs font-medium">
                                #{topic}
                              </Badge>
                            ))}
                          </div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <p className="max-w-[520px] cursor-default text-sm leading-relaxed text-foreground line-clamp-3">
                                {post?.content ?? 'Content unavailable'}
                              </p>
                            </TooltipTrigger>
                            <TooltipContent align="start" className="max-w-sm text-sm leading-relaxed">
                              {post?.content ?? 'Content unavailable'}
                            </TooltipContent>
                          </Tooltip>
                          {task.notes && (
                            <span className="text-xs text-muted-foreground">Notes: {task.notes}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="align-top px-5 py-4">
                        <PostMediaThumbnails
                          type="images"
                          images={post?.images}
                          onClick={() => post && setMediaViewer({ postId: post.id, type: 'images' })}
                        />
                      </TableCell>
                      <TableCell className="align-top px-5 py-4">
                        <PostMediaThumbnails
                          type="videos"
                          videos={post?.videos}
                          onClick={() => post && setMediaViewer({ postId: post.id, type: 'videos' })}
                        />
                      </TableCell>
                      <TableCell className="align-top px-5 py-4">
                        {targetAccount ? (
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium leading-tight">{targetAccount.displayName}</span>
                            <span className="text-xs text-muted-foreground">{targetAccount.handle}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Unknown account</span>
                        )}
                      </TableCell>
                      <TableCell className="align-top px-5 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-medium leading-tight">{formatTimestamp(task.executedAt)}</span>
                          <span className="text-xs text-muted-foreground">Action type: {task.action}</span>
                        </div>
                      </TableCell>
                      <TableCell
                        className={cn(
                          stickyActionsColumnBaseClasses,
                          stickyActionsColumnWidthClasses,
                          'z-40 align-top py-4 text-right transition-colors group-hover:bg-muted/40',
                        )}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <EllipsisVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => onOpenEditor(task.postId, 'edit')}>
                              <FilePenLine className="mr-2 size-4" />
                              Edit & reuse
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onOpenEditor(task.postId, 'publish')}>
                              <ArrowUpRight className="mr-2 size-4" />
                              Publish again
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
              {sortedTasks.length ? ` • ${sortedTasks.length} total` : ''}
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <span className="text-xs text-muted-foreground">
          {currentRecords.length} published post{currentRecords.length === 1 ? '' : 's'} on this page.
        </span>
      </CardFooter>
      <MediaViewerDialog
        open={Boolean(mediaViewer)}
        type={mediaViewer?.type ?? 'images'}
        title={
          mediaViewer
            ? `${mediaViewer.type === 'images' ? 'Images' : 'Videos'} • ${
                activeMediaPost?.topics.join(', ') ?? 'Published media'
              }`
            : ''
        }
        images={mediaViewer?.type === 'images' ? activeMediaPost?.images : undefined}
        videos={mediaViewer?.type === 'videos' ? activeMediaPost?.videos : undefined}
        onOpenChange={(openState) => {
          if (!openState) {
            setMediaViewer(null);
          }
        }}
      />
    </Card>
  );
}
