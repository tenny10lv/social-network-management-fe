'use client';

import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { EllipsisVertical, Filter, RefreshCw, Search, Tag, Users, X } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { WatchlistAccount } from '../types';

const PAGE_SIZE_OPTIONS = [5, 10, 20];

const formatDateTime = (value: string) =>
  format(new Date(value), 'MMM d, yyyy • HH:mm');

interface WatchlistAccountsTableProps {
  accounts: WatchlistAccount[];
  selectedAccountId: string | null;
  onSelectAccount: (accountId: string) => void;
  onRequestEditTags: (account: WatchlistAccount) => void;
  onRequestRemove: (account: WatchlistAccount) => void;
  onTriggerCrawl: (accountId: string) => void;
}

export function WatchlistAccountsTable({
  accounts,
  selectedAccountId,
  onSelectAccount,
  onRequestEditTags,
  onRequestRemove,
  onTriggerCrawl,
}: WatchlistAccountsTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<'all' | WatchlistAccount['platform']>('all');
  const [riskFilter, setRiskFilter] = useState<'all' | WatchlistAccount['riskLevel']>('all');
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, platformFilter, riskFilter, pageSize]);

  const filteredAccounts = useMemo(() => {
    return accounts.filter((account) => {
      const matchSearch = searchQuery
        ? account.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          account.handle.toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      const matchPlatform = platformFilter === 'all' ? true : account.platform === platformFilter;
      const matchRisk = riskFilter === 'all' ? true : account.riskLevel === riskFilter;

      return matchSearch && matchPlatform && matchRisk;
    });
  }, [accounts, platformFilter, riskFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredAccounts.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const currentRecords = filteredAccounts.slice(startIndex, startIndex + pageSize);

  return (
    <Card>
      <CardHeader>
        <CardHeading>
          <CardTitle>Watchlist Accounts</CardTitle>
          <p className="text-sm text-muted-foreground">
            Monitor competitor activity and trigger new crawls when major updates drop.
          </p>
        </CardHeading>
        <CardToolbar className="flex-col gap-4 lg:flex-row lg:items-center lg:justify-end">
          <div className="relative w-full lg:w-64">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search accounts"
              className="w-full pl-9"
            />
            {searchQuery && (
              <Button
                size="icon"
                variant="ghost"
                className="absolute right-1.5 top-1/2 size-6 -translate-y-1/2"
                onClick={() => setSearchQuery('')}
              >
                <X className="size-4" />
              </Button>
            )}
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <Label className="hidden text-xs font-medium text-muted-foreground sm:inline-flex">Platform</Label>
              <Select value={platformFilter} onValueChange={(value) => setPlatformFilter(value as typeof platformFilter)}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue placeholder="Platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All platforms</SelectItem>
                  <SelectItem value="Threads">Threads</SelectItem>
                  <SelectItem value="Instagram">Instagram</SelectItem>
                  <SelectItem value="TikTok">TikTok</SelectItem>
                  <SelectItem value="X">X</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <Label className="hidden text-xs font-medium text-muted-foreground sm:inline-flex">Risk</Label>
              <Select value={riskFilter} onValueChange={(value) => setRiskFilter(value as typeof riskFilter)}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue placeholder="Risk level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All risk levels</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardToolbar>
      </CardHeader>
      <CardTable>
        <ScrollArea>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[220px]">Account</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="w-[160px]">Last Crawled</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
                <TableHead className="w-[60px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    No accounts match your filters.
                  </TableCell>
                </TableRow>
              ) : (
                currentRecords.map((account) => (
                  <TableRow
                    key={account.id}
                    data-state={account.id === selectedAccountId ? 'selected' : undefined}
                    className={cn(
                      'cursor-pointer transition hover:bg-muted/40',
                      account.id === selectedAccountId && 'bg-primary/5',
                    )}
                    onClick={() => onSelectAccount(account.id)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-11">
                          <AvatarImage src={account.avatarUrl} alt={account.displayName} />
                          <AvatarFallback>{account.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium leading-tight">{account.displayName}</span>
                            <Badge variant="secondary" appearance="light" className="capitalize">
                              {account.platform.toLowerCase()}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">{account.handle}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium leading-tight">{account.category}</span>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="size-3.5" />
                          Monitoring since {format(new Date(account.monitoringSince), 'MMM d, yyyy')}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium leading-tight">{formatDateTime(account.lastCrawledAt)}</span>
                        <span className="text-xs text-muted-foreground">{account.crawlFrequency} crawl</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        {account.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs font-medium">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge
                          variant={account.status === 'monitoring' ? 'success' : 'secondary'}
                          appearance="light"
                          className="w-fit capitalize"
                        >
                          {account.status}
                        </Badge>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Filter className="size-3.5" />
                          Risk {account.riskLevel}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8">
                            <EllipsisVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => onSelectAccount(account.id)}>
                            View pipeline
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onTriggerCrawl(account.id)}>
                            <RefreshCw className="mr-2 size-4" />
                            Trigger crawl
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onRequestEditTags(account)}>
                            <Tag className="mr-2 size-4" />
                            Edit tags
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onRequestRemove(account)} className="text-destructive">
                            Remove from watchlist
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
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
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
              {filteredAccounts.length ? ` • ${filteredAccounts.length} total` : ''}
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <span className="text-xs text-muted-foreground">
          Showing {currentRecords.length} of {filteredAccounts.length} monitored accounts.
        </span>
      </CardFooter>
    </Card>
  );
}
