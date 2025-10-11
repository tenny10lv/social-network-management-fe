'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';
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
import { MyThreadsAccount } from '../types';
import { EllipsisVertical, Power, ShieldCheck, Sparkles } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const PAGE_SIZE_OPTIONS = [3, 5, 10];

interface MyThreadsAccountsTableProps {
  accounts: MyThreadsAccount[];
  onSetPrimary: (accountId: string) => void;
  onToggleStatus: (accountId: string) => void;
}

export function MyThreadsAccountsTable({ accounts, onSetPrimary, onToggleStatus }: MyThreadsAccountsTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | MyThreadsAccount['status']>('all');
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter, pageSize]);

  const filtered = useMemo(() => {
    return accounts.filter((account) => {
      const matchSearch = searchQuery
        ? account.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          account.handle.toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      const matchStatus = statusFilter === 'all' ? true : account.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [accounts, searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const currentRecords = filtered.slice(startIndex, startIndex + pageSize);

  const resolveLastPublished = (value?: string | null) => {
    if (!value) {
      return 'No posts yet';
    }

    try {
      return `${formatDistanceToNowStrict(new Date(value), { addSuffix: true })}`;
    } catch (error) {
      console.error(error);
      return 'Unknown';
    }
  };

  return (
    <Card>
      <CardHeader className="py-5">
        <CardHeading>
          <CardTitle>My Threads Accounts</CardTitle>
          <p className="text-sm text-muted-foreground">
            Configure which owned profiles receive repurposed content from the watchlist pipeline.
          </p>
        </CardHeading>
        <CardToolbar className="flex-col gap-4 xl:flex-row xl:items-center xl:justify-between xl:gap-6">
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search my accounts"
            className="w-full xl:max-w-[220px]"
          />
          <div className="flex w-full items-center gap-2 xl:w-auto">
            <Label className="hidden text-xs font-medium text-muted-foreground xl:inline-flex">Status</Label>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
              <SelectTrigger className="w-full xl:w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardToolbar>
      </CardHeader>
      <CardTable>
        <ScrollArea>
          <Table className="min-w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[72px]">Avatar</TableHead>
                <TableHead>Account</TableHead>
                <TableHead className="w-[140px]">Followers</TableHead>
                <TableHead className="w-[180px]">Publishing Window</TableHead>
                <TableHead className="w-[180px]">Last Activity</TableHead>
                <TableHead className="w-[60px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    No accounts available.
                  </TableCell>
                </TableRow>
              ) : (
                currentRecords.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="align-top py-4">
                      <Avatar className="size-11">
                        <AvatarImage src={account.avatarUrl} alt={account.displayName} />
                        <AvatarFallback>{account.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="align-top py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium leading-tight">{account.displayName}</span>
                          {account.isPrimary && (
                            <Badge variant="primary" appearance="soft" className="flex items-center gap-1 text-xs">
                              <ShieldCheck className="size-3.5" /> Primary
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">{account.handle}</span>
                      </div>
                    </TableCell>
                    <TableCell className="align-top py-4">
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold leading-tight">{account.followerCount.toLocaleString()}</span>
                        <span className="text-xs text-muted-foreground">{account.timezone.replace('_', ' ')}</span>
                      </div>
                    </TableCell>
                    <TableCell className="align-top py-4">
                      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                        <span className="text-sm font-medium text-foreground">Weekdays • 08:00 → 13:00</span>
                        <span>Auto-boost trending reposts</span>
                      </div>
                    </TableCell>
                    <TableCell className="align-top py-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium leading-tight">{resolveLastPublished(account.lastPublishedAt)}</span>
                        <Badge variant={account.status === 'active' ? 'success' : 'secondary'} appearance="light" className="w-fit">
                          {account.status === 'active' ? 'Publishing enabled' : 'Publishing paused'}
                        </Badge>
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
                          <DropdownMenuItem onClick={() => onToggleStatus(account.id)}>
                            <Power className="mr-2 size-4" />
                            {account.status === 'active' ? 'Pause publishing' : 'Resume publishing'}
                          </DropdownMenuItem>
                          {!account.isPrimary && (
                            <DropdownMenuItem onClick={() => onSetPrimary(account.id)}>
                              <Sparkles className="mr-2 size-4" />
                              Set as primary
                            </DropdownMenuItem>
                          )}
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
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            Rows per page:
            <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
              <SelectTrigger className="w-[100px]">
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
              {filtered.length ? ` • ${filtered.length} total` : ''}
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <span className="text-xs text-muted-foreground">
          {currentRecords.length} account{currentRecords.length === 1 ? '' : 's'} on this page.
        </span>
      </CardFooter>
    </Card>
  );
}
