'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { AlertTriangle, EllipsisVertical, RefreshCw, Search, Tag, X, Plus } from 'lucide-react';
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
import { Pagination, PaginationContent, PaginationItem } from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableLoadingState } from '@/components/ui/table-loading-state';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { buildThreadsProfileUrl } from '@/lib/threads';
import {
  stickyActionsColumnBaseClasses,
  stickyActionsColumnWidthClasses,
  tableBodyClassName,
  tableClassName,
  tableHeaderCellClasses,
  tableHeaderClassName,
  tableWrapperClassName,
} from './table-styles';
import { WatchlistAccountRow } from '../types';

const DEFAULT_PAGE_SIZE_OPTIONS = [5, 10, 20];

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return format(date, 'MMM d, yyyy • HH:mm');
};
const stickyActionsColumnClasses = cn(stickyActionsColumnBaseClasses, stickyActionsColumnWidthClasses);

interface WatchlistAccountsTableProps {
  accounts: WatchlistAccountRow[];
  selectedAccountId: string | null;
  searchQuery: string;
  page: number;
  pageSize: number;
  totalPages?: number;
  totalCount?: number;
  isLoading?: boolean;
  errorMessage?: string | null;
  pageSizeOptions?: number[];
  onSearchQueryChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onSelectAccount: (threadsAccountId: string) => void;
  onRequestEditTags: (account: WatchlistAccountRow) => void;
  onRequestRemove: (account: WatchlistAccountRow) => void;
  onTriggerCrawl: (threadsAccountId: string) => void;
  onRequestAddAccount: () => void;
  onRetry?: () => void;
}

export function WatchlistAccountsTable({
  accounts,
  selectedAccountId,
  searchQuery,
  page,
  pageSize,
  totalPages = 1,
  totalCount,
  isLoading,
  errorMessage,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  onSearchQueryChange,
  onPageChange,
  onPageSizeChange,
  onSelectAccount,
  onRequestEditTags,
  onRequestRemove,
  onTriggerCrawl,
  onRequestAddAccount,
  onRetry,
}: WatchlistAccountsTableProps) {
  const [searchInput, setSearchInput] = useState(searchQuery);

  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    if (searchInput === searchQuery) {
      return;
    }

    const handle = window.setTimeout(() => {
      onSearchQueryChange(searchInput);
    }, 400);

    return () => {
      window.clearTimeout(handle);
    };
  }, [onSearchQueryChange, searchInput, searchQuery]);

  const computedTotalPages = Math.max(1, totalPages || 1);
  const currentPage = Math.min(Math.max(1, page), computedTotalPages);
  const currentRecords = accounts;
  const totalCountLabel = typeof totalCount === 'number' ? totalCount : accounts.length;

  return (
    <Card>
      <CardHeader className="py-5">
        <CardHeading className="w-full space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Watchlist Accounts</CardTitle>
            <Button
              type="button"
              variant="primary"
              size="md"
              className="w-full sm:w-auto"
              onClick={onRequestAddAccount}
            >
              <Plus className="size-3.5" />
              Add Watchlist Account
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Monitor competitor activity and trigger new crawls when major updates drop.
          </p>
        </CardHeading>
        <CardToolbar className="flex-col gap-4 xl:flex-row xl:items-center xl:justify-between xl:gap-6">
          <div className="relative w-full xl:max-w-[360px]">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search accounts"
              className="w-full pl-9"
            />
            {searchInput && (
              <Button
                size="icon"
                variant="ghost"
                className="absolute right-1.5 top-1/2 size-6 -translate-y-1/2"
                onClick={() => setSearchInput('')}
              >
                <X className="size-4" />
              </Button>
            )}
          </div>
        </CardToolbar>
      </CardHeader>
      <CardTable className="overflow-hidden">
        <Table className={tableClassName} wrapperClassName={tableWrapperClassName}>
            <TableHeader className={tableHeaderClassName}>
              <TableRow className="[&>th]:whitespace-nowrap">
                <TableHead className={cn(tableHeaderCellClasses, 'min-w-[320px] text-left')}>Account</TableHead>
                <TableHead className={cn(tableHeaderCellClasses, 'min-w-[220px] text-left')}>Category</TableHead>
                <TableHead className={cn(tableHeaderCellClasses, 'min-w-[220px] text-left')}>Last Crawled</TableHead>
                <TableHead className={cn(tableHeaderCellClasses, stickyActionsColumnClasses, 'z-[6] text-center')}>
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className={tableBodyClassName}>
              {isLoading ? (
                <TableLoadingState
                  colSpan={4}
                  message="Loading watchlist accounts..."
                  cellClassName="col-span-full px-5 py-10"
                />
              ) : errorMessage ? (
                <TableRow>
                  <TableCell colSpan={4} className="col-span-full px-5 py-8 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="size-4" />
                        <span className="text-sm font-medium">
                          {errorMessage || 'Failed to load watchlist accounts.'}
                        </span>
                      </div>
                      {onRetry ? (
                        <Button variant="outline" size="sm" onClick={onRetry}>
                          Try again
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ) : currentRecords.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="col-span-full px-5 py-10 text-center text-sm text-muted-foreground"
                  >
                    No accounts found.
                  </TableCell>
                </TableRow>
              ) : (
                currentRecords.map((account) => {
                  const fallbackInitials = (account.displayName || account.handle || account.id).slice(0, 2).toUpperCase();
                  const profileUrl = buildThreadsProfileUrl(account.username);

                  return (
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
                          <AvatarFallback>{fallbackInitials}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex flex-col gap-0.5">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <a
                                    href={profileUrl ?? '#'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="max-w-[200px] truncate font-medium leading-tight text-primary hover:underline"
                                    onClick={(event) => {
                                      if (!profileUrl) {
                                        event.preventDefault();
                                      }
                                    }}
                                  >
                                    {account.displayName}
                                  </a>
                                </TooltipTrigger>
                                <TooltipContent side="top" align="start">
                                  {account.displayName}
                                </TooltipContent>
                              </Tooltip>
                              <span className="text-xs text-muted-foreground">{account.handle}</span>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="min-w-[220px] align-top px-5 py-4">
                        <span className="text-sm font-medium leading-tight">{account.category}</span>
                      </TableCell>
                      <TableCell className="min-w-[220px] align-top px-5 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-medium leading-tight">{formatDateTime(account.lastCrawledAt)}</span>
                          <span className="text-xs text-muted-foreground">{account.crawlFrequency} crawl</span>
                        </div>
                      </TableCell>
                      <TableCell
                        className={cn(
                          stickyActionsColumnClasses,
                          'align-top py-4 text-right transition-colors group-hover:bg-muted/40 group-data-[state=selected]:bg-primary/5',
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
                  );
                })
              )}
            </TableBody>
        </Table>
      </CardTable>
      <CardContent className="border-t pt-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            Rows per page:
            <Select
              value={String(pageSize)}
              onValueChange={(value) => {
                onPageSizeChange(Number(value));
                if (currentPage !== 1) {
                  onPageChange(1);
                }
              }}
            >
              <SelectTrigger className="w-[100px]">
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
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1 || isLoading}
                  >
                    Previous
                  </Button>
                </PaginationItem>
                <PaginationItem>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(Math.min(computedTotalPages, currentPage + 1))}
                    disabled={currentPage === computedTotalPages || isLoading}
                  >
                    Next
                  </Button>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
            <div className="text-sm text-muted-foreground sm:order-1">
              Page {currentPage} of {computedTotalPages}
              {totalCountLabel ? ` • ${totalCountLabel} total` : ''}
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <span className="text-xs text-muted-foreground">
          Showing {currentRecords.length} of {totalCountLabel} monitored accounts.
        </span>
      </CardFooter>
    </Card>
  );
}
