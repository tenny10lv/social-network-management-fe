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
import { Clock4, EllipsisVertical, Send, XCircle } from 'lucide-react';
import { CrawledPost, MyThreadsAccount, PublishingTask } from '../types';

const PAGE_SIZE_OPTIONS = [5, 10, 20];

interface ScheduledPostsPanelProps {
  tasks: PublishingTask[];
  posts: CrawledPost[];
  myAccounts: MyThreadsAccount[];
  onOpenSchedule: (postId: string, taskId: string) => void;
  onPublishNow: (taskId: string, postId: string) => void;
  onCancelSchedule: (taskId: string, postId: string) => void;
}

export function ScheduledPostsPanel({
  tasks,
  posts,
  myAccounts,
  onOpenSchedule,
  onPublishNow,
  onCancelSchedule,
}: ScheduledPostsPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [accountFilter, setAccountFilter] = useState<'all' | string>('all');
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [page, setPage] = useState(1);

  const postsMap = useMemo(() => {
    return posts.reduce<Record<string, CrawledPost>>((map, post) => {
      map[post.id] = post;
      return map;
    }, {});
  }, [posts]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (task.status !== 'scheduled') {
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
        const aTime = a.scheduledFor ? new Date(a.scheduledFor).getTime() : 0;
        const bTime = b.scheduledFor ? new Date(b.scheduledFor).getTime() : 0;
        return aTime - bTime;
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
      return 'Not scheduled';
    }
    return format(new Date(value), 'MMM d, yyyy • HH:mm');
  };

  return (
    <Card>
      <CardHeader>
        <CardHeading>
          <CardTitle>Scheduled Posts</CardTitle>
          <p className="text-sm text-muted-foreground">
            Review queued repurposed posts, adjust launch windows, or publish early when momentum builds.
          </p>
        </CardHeading>
        <CardToolbar className="flex-col gap-4 xl:flex-row xl:items-center xl:justify-between xl:gap-6">
          <Input
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Search scheduled copy"
            className="w-full xl:w-72"
          />
          <div className="flex w-full items-center gap-2 xl:w-auto">
            <Label className="hidden text-xs font-medium text-muted-foreground xl:inline-flex">Publishing to</Label>
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
      <CardTable>
        <ScrollArea>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Post</TableHead>
                <TableHead className="w-[200px]">Target Account</TableHead>
                <TableHead className="w-[180px]">Scheduled For</TableHead>
                <TableHead className="w-[60px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                    {tasks.length === 0
                      ? 'No scheduled posts yet. Schedule from the crawled posts tab.'
                      : 'No scheduled posts match your filters.'}
                  </TableCell>
                </TableRow>
              ) : (
                currentRecords.map((task) => {
                  const post = postsMap[task.postId];
                  const targetAccount = resolveTargetAccount(task.targetAccountId);

                  return (
                    <TableRow key={task.id}>
                      <TableCell className="align-top py-4">
                        <div className="flex flex-col gap-2">
                          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                            {post?.topics.map((topic) => (
                              <Badge key={topic} variant="outline" className="text-xs font-medium">
                                #{topic}
                              </Badge>
                            ))}
                          </div>
                          <p className="text-sm leading-relaxed text-foreground">{post?.content}</p>
                        </div>
                      </TableCell>
                      <TableCell className="align-top py-4">
                        {targetAccount ? (
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium leading-tight">{targetAccount.displayName}</span>
                            <span className="text-xs text-muted-foreground">{targetAccount.handle}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Unknown account</span>
                        )}
                      </TableCell>
                      <TableCell className="align-top py-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-medium leading-tight">{formatTimestamp(task.scheduledFor)}</span>
                          <span className="text-xs text-muted-foreground">Local timezone adapts automatically.</span>
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
                            <DropdownMenuItem onClick={() => onOpenSchedule(task.postId, task.id)}>
                              <Clock4 className="mr-2 size-4" />
                              Reschedule
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onPublishNow(task.id, task.postId)}>
                              <Send className="mr-2 size-4" />
                              Publish now
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => onCancelSchedule(task.id, task.postId)}
                              className="text-destructive"
                            >
                              <XCircle className="mr-2 size-4" />
                              Cancel schedule
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
              {sortedTasks.length ? ` • ${sortedTasks.length} total` : ''}
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <span className="text-xs text-muted-foreground">
          {currentRecords.length} scheduled post{currentRecords.length === 1 ? '' : 's'} on this page.
        </span>
      </CardFooter>
    </Card>
  );
}
