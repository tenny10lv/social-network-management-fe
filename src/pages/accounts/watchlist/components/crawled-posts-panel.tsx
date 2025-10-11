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
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CrawledPost, WatchlistAccount } from '../types';
import { EllipsisVertical, Pencil, Send, Timer, TrendingUp } from 'lucide-react';

const PAGE_SIZE_OPTIONS = [5, 10, 20];

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

export function CrawledPostsPanel({ account, posts, onOpenEditor, onOpenSchedule }: CrawledPostsPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'pipeline' | 'scheduled' | 'published' | 'all'>('pipeline');
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [page, setPage] = useState(1);

  const sortedPosts = useMemo(
    () =>
      [...posts].sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime()),
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
      <CardTable>
        <ScrollArea>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Post</TableHead>
                <TableHead className="w-[180px]">Captured</TableHead>
                <TableHead className="w-[180px]">Status</TableHead>
                <TableHead className="w-[200px]">Engagement</TableHead>
                <TableHead className="w-[60px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    {posts.length === 0
                      ? 'No crawled posts yet for this account.'
                      : 'No posts match your filters.'}
                  </TableCell>
                </TableRow>
              ) : (
                currentRecords.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell className="align-top py-4">
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                          {post.topics.map((topic) => (
                            <Badge key={topic} variant="outline" className="text-xs font-medium">
                              #{topic}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-sm leading-relaxed text-foreground">{post.content}</p>
                      </div>
                    </TableCell>
                    <TableCell className="align-top py-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium leading-tight">{formatTimestamp(post.capturedAt)}</span>
                        <span className="text-xs text-muted-foreground capitalize">{post.mediaType}</span>
                      </div>
                    </TableCell>
                    <TableCell className="align-top py-4">
                      <div className="flex flex-col gap-1">
                        <Badge
                          variant={post.status === 'ready' ? 'primary' : post.status === 'draft' ? 'secondary' : 'success'}
                          appearance="light"
                          className="w-fit capitalize"
                        >
                          {post.status}
                        </Badge>
                        <Badge
                          variant={sentimentVariantMap[post.sentiment]}
                          appearance="soft"
                          className="w-fit capitalize"
                        >
                          {post.sentiment} sentiment
                        </Badge>
                        {post.status === 'scheduled' && (
                          <span className="text-xs text-muted-foreground">Scheduled {formatTimestamp(post.scheduledFor)}</span>
                        )}
                        {post.status === 'published' && (
                          <span className="text-xs text-muted-foreground">Published {formatTimestamp(post.publishedAt)}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="align-top py-4">
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
                    <TableCell className="align-top py-4 text-right">
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
                ))
              )}
            </TableBody>
          </Table>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
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
    </Card>
  );
}
