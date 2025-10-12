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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { WatchlistAccount } from '../types';

const PAGE_SIZE_OPTIONS = [5, 10, 20];

const formatDateTime = (value: string) =>
  format(new Date(value), 'MMM d, yyyy • HH:mm');

const stickyActionsColumnClasses =
  'sticky right-0 w-[124px] min-w-[124px] max-w-[124px] bg-background text-right shadow-[inset_1px_0_0_theme(colors.border)] supports-[backdrop-filter]:bg-background/90 backdrop-blur';

const tableHeaderCellClasses =
  'px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground align-middle';

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
      <CardHeader className="py-5">
        <CardHeading>
          <CardTitle>Watchlist Accounts</CardTitle>
          <p className="text-sm text-muted-foreground">
            Monitor competitor activity and trigger new crawls when major updates drop.
          </p>
        </CardHeading>
        <CardToolbar className="flex-col gap-4 xl:flex-row xl:items-center xl:justify-between xl:gap-6">
          <div className="relative w-full xl:max-w-[280px]">
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
      <CardTable className="overflow-hidden">
        <Table
          className="min-w-full border-separate border-spacing-0"
          wrapperClassName="max-h-[480px] overflow-x-auto overflow-y-auto"
        >
            <TableHeader
              className="sticky top-0 z-30 [&>tr]:border-b [&>tr]:border-border/80 [&>tr]:bg-background [&>tr>th]:sticky [&>tr>th]:top-0 [&>tr>th]:z-30 [&>tr>th]:bg-background [&>tr>th]:supports-[backdrop-filter]:bg-background/95 [&>tr>th]:backdrop-blur"
            >
              <TableRow className="[&>th]:whitespace-nowrap">
                <TableHead className={cn(tableHeaderCellClasses, 'min-w-[320px] text-left')}>Account</TableHead>
                <TableHead className={cn(tableHeaderCellClasses, 'min-w-[200px] text-left')}>Category</TableHead>
                <TableHead className={cn(tableHeaderCellClasses, 'min-w-[220px] text-left')}>Last Crawled</TableHead>
                <TableHead className={cn(tableHeaderCellClasses, 'min-w-[320px] text-left')}>Tags</TableHead>
                <TableHead className={cn(tableHeaderCellClasses, 'w-[160px] text-left')}>Status</TableHead>
                <TableHead className={cn(tableHeaderCellClasses, stickyActionsColumnClasses, 'z-40 text-right')}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="[&>tr]:border-b [&>tr:last-child]:border-0">
              {currentRecords.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="col-span-full px-5 py-10 text-center text-sm text-muted-foreground"
                >
                  No accounts match your filters.
                </TableCell>
              </TableRow>
              ) : (
                currentRecords.map((account) => (
                  <TableRow
                    key={account.id}
                    data-state={account.id === selectedAccountId ? 'selected' : undefined}
                    className={cn(
                      'group cursor-pointer transition hover:bg-muted/40',
                      account.id === selectedAccountId && 'bg-primary/5',
                    )}
                    onClick={() => onSelectAccount(account.id)}
                  >
                    <TableCell className="min-w-[320px] align-top px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-11">
                          <AvatarImage src={account.avatarUrl} alt={account.displayName} />
                          <AvatarFallback>{account.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="max-w-[200px] truncate font-medium leading-tight">
                                  {account.displayName}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" align="start">
                                {account.displayName}
                              </TooltipContent>
                            </Tooltip>
                            <Badge variant="secondary" appearance="light" className="capitalize">
                              {account.platform.toLowerCase()}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">{account.handle}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[200px] align-top px-5 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium leading-tight">{account.category}</span>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="size-3.5" />
                          Monitoring since {format(new Date(account.monitoringSince), 'MMM d, yyyy')}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[220px] align-top px-5 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium leading-tight">{formatDateTime(account.lastCrawledAt)}</span>
                        <span className="text-xs text-muted-foreground">{account.crawlFrequency} crawl</span>
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[320px] align-top px-5 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {account.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs font-medium">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[160px] align-top px-5 py-4">
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
                    <TableCell
                      className={cn(
                        stickyActionsColumnClasses,
                        'z-30 align-top px-5 py-4 transition-colors group-hover:bg-muted/40 group-data-[state=selected]:bg-primary/5',
                      )}
                    >
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
