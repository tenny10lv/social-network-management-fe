'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  Search,
  Settings,
  Users,
  X,
} from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
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
import { fetchAccountComparison } from '../api';
import {
  AccountComparisonDataset,
  Watcher,
  WatchlistAccount,
  WatchlistAnalyticsSummary,
} from '../types';
import { AnalyticsSummary } from './analytics-summary';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ResponsiveContainer, LineChart, CartesianGrid, Line, XAxis, YAxis, Legend } from 'recharts';

const PAGE_SIZE_OPTIONS = [5, 10, 20];

const stickyActionsColumnClasses = cn(stickyActionsColumnBaseClasses, stickyActionsColumnWidthClasses);

const formatDateTime = (value?: string) => {
  if (!value) {
    return '—';
  }
  return format(new Date(value), 'MMM d, yyyy • HH:mm');
};

const statusConfig: Record<WatchlistAccount['lastCrawlStatus'], { label: string; icon: React.ReactNode; variant: 'success' | 'warning' | 'secondary' }> = {
  success: {
    label: 'Success',
    icon: <CheckCircle2 className="size-3" />,
    variant: 'success',
  },
  failed: {
    label: 'Failed',
    icon: <AlertTriangle className="size-3" />,
    variant: 'warning',
  },
  scheduled: {
    label: 'Scheduled',
    icon: <RefreshCw className="size-3 animate-spin" />,
    variant: 'secondary',
  },
  running: {
    label: 'Running',
    icon: <RefreshCw className="size-3 animate-spin" />,
    variant: 'secondary',
  },
};

interface WatchlistAccountsTableProps {
  accounts: WatchlistAccount[];
  watchers: Watcher[];
  analyticsSummary?: WatchlistAnalyticsSummary | null;
  isLoading?: boolean;
  selectedAccountId: string | null;
  onSelectAccount: (accountId: string) => void;
  onRequestAddAccount: () => void;
  onEditAccount: (account: WatchlistAccount) => void;
  onDeleteAccount: (account: WatchlistAccount) => void;
  onOpenAlerts: (account: WatchlistAccount) => void;
  onSyncAccount: (accountId: string) => void;
  onAssignWatcher: (accountId: string, watcherId: string | null) => void;
}

const buildCompareDataset = (data: AccountComparisonDataset[]) => {
  const followerGrowth: Record<string, Record<string, number>> = {};
  const postFrequency: Record<string, Record<string, number>> = {};
  const engagement: Record<string, Record<string, number>> = {};

  data.forEach((account) => {
    account.followerGrowth.forEach((point) => {
      followerGrowth[point.date] = followerGrowth[point.date] ?? {};
      followerGrowth[point.date][account.accountName] = point.value;
    });
    account.postFrequency.forEach((point) => {
      postFrequency[point.date] = postFrequency[point.date] ?? {};
      postFrequency[point.date][account.accountName] = point.posts;
    });
    account.engagement.forEach((point) => {
      engagement[point.date] = engagement[point.date] ?? {};
      engagement[point.date][account.accountName] = point.engagementRate;
    });
  });

  const toChartData = (record: Record<string, Record<string, number>>) =>
    Object.entries(record)
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .map(([date, series]) => ({ date, ...series }));

  return {
    followerGrowth: toChartData(followerGrowth),
    postFrequency: toChartData(postFrequency),
    engagement: toChartData(engagement),
  };
};

interface CompareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading: boolean;
  accounts: AccountComparisonDataset[];
}

function CompareAccountsModal({ open, onOpenChange, isLoading, accounts }: CompareModalProps) {
  const hasData = accounts.length > 0;
  const chartData = useMemo(() => (hasData ? buildCompareDataset(accounts) : null), [accounts, hasData]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Compare Accounts</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-6">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-48 rounded-xl" />
              <Skeleton className="h-48 rounded-xl" />
              <Skeleton className="h-48 rounded-xl md:col-span-2" />
            </div>
          ) : hasData && chartData ? (
            <div className="space-y-6">
              <div>
                <h3 className="mb-2 text-sm font-semibold">Follower Growth</h3>
                <div className="h-56 w-full">
                  <ResponsiveContainer>
                    <LineChart data={chartData.followerGrowth}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tickLine={false} minTickGap={24} />
                      <YAxis tickLine={false} width={70} />
                      <Legend />
                      {accounts.map((account) => (
                        <Line
                          key={`followers-${account.accountId}`}
                          type="monotone"
                          dataKey={account.accountName}
                          strokeWidth={2}
                          stroke={`hsl(var(--chart-${(accounts.indexOf(account) % 6) + 1}))`}
                          dot={false}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h3 className="mb-2 text-sm font-semibold">Post Frequency</h3>
                  <div className="h-48 w-full">
                    <ResponsiveContainer>
                      <LineChart data={chartData.postFrequency}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tickLine={false} minTickGap={24} />
                        <YAxis tickLine={false} width={60} />
                        <Legend />
                        {accounts.map((account) => (
                          <Line
                            key={`frequency-${account.accountId}`}
                            type="monotone"
                            dataKey={account.accountName}
                            strokeWidth={2}
                            stroke={`hsl(var(--chart-${(accounts.indexOf(account) % 6) + 1}))`}
                            dot={false}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-semibold">Engagement Rate</h3>
                  <div className="h-48 w-full">
                    <ResponsiveContainer>
                      <LineChart data={chartData.engagement}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tickLine={false} minTickGap={24} />
                        <YAxis tickLine={false} width={60} />
                        <Legend />
                        {accounts.map((account) => (
                          <Line
                            key={`engagement-${account.accountId}`}
                            type="monotone"
                            dataKey={account.accountName}
                            strokeWidth={2}
                            stroke={`hsl(var(--chart-${(accounts.indexOf(account) % 6) + 1}))`}
                            dot={false}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Select two or three accounts to generate comparison analytics.</p>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

export function WatchlistAccountsTable({
  accounts,
  watchers,
  analyticsSummary,
  isLoading = false,
  selectedAccountId,
  onSelectAccount,
  onRequestAddAccount,
  onEditAccount,
  onDeleteAccount,
  onOpenAlerts,
  onSyncAccount,
  onAssignWatcher,
}: WatchlistAccountsTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<'all' | WatchlistAccount['platform']>('all');
  const [riskFilter, setRiskFilter] = useState<'all' | WatchlistAccount['riskLevel']>('all');
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [page, setPage] = useState(1);
  const [compareOpen, setCompareOpen] = useState(false);

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

  const { selectedIds, toggle, clear, summary } = useBulkActions(filteredAccounts);

  const totalPages = Math.max(1, Math.ceil(filteredAccounts.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const currentRecords = filteredAccounts.slice(startIndex, startIndex + pageSize);

  const compareMutation = useMutation({
    mutationFn: fetchAccountComparison,
    onSuccess: () => {
      setCompareOpen(true);
    },
  });

  const handleToggleSelection = (accountId: string) => {
    if (selectedIds.includes(accountId)) {
      toggle(accountId);
      return;
    }

    if (summary.count >= 3) {
      return;
    }

    toggle(accountId);
  };

  const handleCompare = () => {
    if (summary.count < 2 || summary.count > 3) {
      return;
    }

    compareMutation.mutate(selectedIds);
  };

  const comparisonData = compareMutation.data ?? [];

  return (
    <Card>
      <CardHeader className="py-5">
        <CardHeading>
          <CardTitle>Watchlist Accounts</CardTitle>
          <p className="text-sm text-muted-foreground">
            Monitor competitor activity, manage alerts, and trigger new crawls when major updates drop.
          </p>
        </CardHeading>
        <CardToolbar className="flex-col gap-4 xl:flex-row xl:items-center xl:justify-between xl:gap-6">
          <div className="relative w-full xl:max-w-[280px]">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setPage(1);
              }}
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
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
              {summary.count >= 2 && summary.count <= 3 ? (
                <Button type="button" variant="outline" onClick={handleCompare} disabled={compareMutation.isPending}>
                  {compareMutation.isPending ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin" /> Comparing
                    </span>
                  ) : (
                    'Compare'
                  )}
                </Button>
              ) : null}
              <Button
                type="button"
                variant="primary"
                size="md"
                className="w-full sm:w-auto"
                onClick={onRequestAddAccount}
              >
                Add Watchlist Account
              </Button>
            </div>
          </div>
        </CardToolbar>
      </CardHeader>
      <CardTable className="overflow-hidden">
        <Table className={tableClassName} wrapperClassName={tableWrapperClassName}>
          <TableHeader className={tableHeaderClassName}>
            <TableRow className="[&>th]:whitespace-nowrap">
              <TableHead className={cn(tableHeaderCellClasses, 'w-12 text-left')}></TableHead>
              <TableHead className={cn(tableHeaderCellClasses, 'min-w-[280px] text-left')}>Account</TableHead>
              <TableHead className={cn(tableHeaderCellClasses, 'min-w-[200px] text-left')}>Category & Watcher</TableHead>
              <TableHead className={cn(tableHeaderCellClasses, 'min-w-[220px] text-left')}>Last Crawl</TableHead>
              <TableHead className={cn(tableHeaderCellClasses, 'min-w-[260px] text-left')}>Tags</TableHead>
              <TableHead className={cn(tableHeaderCellClasses, 'min-w-[160px] text-left')}>Risk</TableHead>
              <TableHead className={cn(tableHeaderCellClasses, stickyActionsColumnClasses, 'z-[6] text-center')}>
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className={tableBodyClassName}>
            {isLoading ? (
              Array.from({ length: pageSize }).map((_, index) => (
                <TableRow key={`skeleton-${index}`}>
                  {Array.from({ length: 7 }).map((__, colIndex) => (
                    <TableCell key={colIndex} className="px-5 py-4">
                      <Skeleton className="h-8 w-full rounded-md" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : currentRecords.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="px-5 py-10 text-center text-sm text-muted-foreground">
                  No accounts match your filters.
                </TableCell>
              </TableRow>
            ) : (
              currentRecords.map((account) => {
                const status = statusConfig[account.lastCrawlStatus] ?? statusConfig.success;

                const profileUsername = account.username || account.handle.replace(/^@/, '');

                return (
                  <TableRow
                    key={account.id}
                    data-state={account.id === selectedAccountId ? 'selected' : undefined}
                    className={cn(
                      'group transition hover:bg-muted/40',
                      account.id === selectedAccountId && 'bg-primary/5',
                    )}
                  >
                    <TableCell className="px-5 py-4 align-top">
                      <Checkbox
                        aria-label={`Select ${account.displayName} for comparison`}
                        checked={selectedIds.includes(account.id)}
                        onCheckedChange={() => handleToggleSelection(account.id)}
                        disabled={!selectedIds.includes(account.id) && summary.count >= 3}
                      />
                    </TableCell>
                    <TableCell
                      className="min-w-[280px] cursor-pointer px-5 py-4"
                      onClick={() => onSelectAccount(account.id)}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="size-11">
                          <AvatarImage src={account.avatarUrl} alt={account.displayName} />
                          <AvatarFallback>{account.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 space-y-1">
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
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="size-7 text-muted-foreground hover:text-foreground"
                              onClick={(event) => {
                                event.stopPropagation();
                                onOpenAlerts(account);
                              }}
                            >
                              <Settings className="size-4" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <span>{account.handle}</span>
                            <span aria-hidden>•</span>
                            <span>{account.followerCount.toLocaleString()} followers</span>
                          </div>
                          {account.note ? (
                            <p className="text-xs text-muted-foreground">{account.note}</p>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[200px] px-5 py-4 align-top">
                      <div className="space-y-2">
                        <div className="text-sm font-medium leading-tight">{account.category}</div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Users className="size-3.5" /> Monitoring since {format(new Date(account.monitoringSince), 'MMM d, yyyy')}
                        </div>
                        <Select
                          value={account.watcher?.id ?? 'unassigned'}
                          onValueChange={(value) => onAssignWatcher(account.id, value === 'unassigned' ? null : value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue>
                              {account.watcher ? account.watcher.name : 'Assign watcher'}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent align="start">
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {watchers.map((watcher) => (
                              <SelectItem key={watcher.id} value={watcher.id}>
                                {watcher.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[220px] px-5 py-4 align-top">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={status.variant} appearance="light" className="flex items-center gap-1 text-xs">
                            {status.icon}
                            <span>{status.label}</span>
                          </Badge>
                          <span className="text-xs text-muted-foreground">{account.crawlFrequency} crawl</span>
                        </div>
                        <div className="text-sm font-medium leading-tight text-foreground">
                          {formatDateTime(account.lastCrawledAt)}
                        </div>
                        {account.lastCrawlMessage ? (
                          <p className="text-xs text-muted-foreground">{account.lastCrawlMessage}</p>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[260px] px-5 py-4 align-top">
                      <div className="flex flex-wrap gap-1.5">
                        {account.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs font-medium">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[160px] px-5 py-4 align-top">
                      <div className="space-y-1">
                        <Badge
                          variant={account.riskLevel === 'high' ? 'destructive' : account.riskLevel === 'medium' ? 'warning' : 'success'}
                          appearance="light"
                          className="capitalize"
                        >
                          {account.riskLevel}
                        </Badge>
                        <div className="text-xs text-muted-foreground">Sentiment trend • {account.sentimentTrend}</div>
                      </div>
                    </TableCell>
                    <TableCell
                      className={cn(
                        stickyActionsColumnClasses,
                        'align-top py-4 text-right transition-colors group-hover:bg-muted/40 group-data-[state=selected]:bg-primary/5',
                      )}
                    >
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onEditAccount(account)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => onSyncAccount(account.id)}
                          title="Sync now"
                        >
                          <RefreshCw className="size-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuItem
                              onClick={() => {
                                window.open(`https://www.threads.net/@${profileUsername}`, '_blank', 'noopener');
                              }}
                            >
                              <ExternalLink className="mr-2 size-4" />
                              Open Threads Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onSelectAccount(account.id)}>
                              View activity
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onDeleteAccount(account)} className="text-destructive">
                              Remove account
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
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
      <CardFooter className="flex flex-col gap-6">
        <span className="text-xs text-muted-foreground">
          Showing {currentRecords.length} of {filteredAccounts.length} monitored accounts.
        </span>
        {analyticsSummary ? <AnalyticsSummary summary={analyticsSummary} /> : null}
      </CardFooter>
      <CompareAccountsModal
        open={compareOpen}
        onOpenChange={(open) => {
          setCompareOpen(open);
          if (!open) {
            clear();
          }
        }}
        isLoading={compareMutation.isPending}
        accounts={comparisonData}
      />
    </Card>
  );
}
