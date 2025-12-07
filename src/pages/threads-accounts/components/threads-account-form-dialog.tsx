'use client';

import { useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { RiCheckboxCircleFill } from '@remixicon/react';
import { AlertCircle, Check, ChevronsUpDown, LoaderCircle, UserCheck, UserPlus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ThreadsAccountFormValues,
  ThreadsAccountRecord,
  ProxyOption,
  CategoryOption,
  WatchlistAccountOption,
  threadsAccountBaseSchema,
  threadsAccountCreateSchema,
  createThreadsAccount,
  updateThreadsAccount,
} from '../api';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ThreadsAccountFormDialogProps {
  mode: 'create' | 'edit';
  threadsAccountId?: string | null;
  account?: ThreadsAccountRecord | null;
  initialValues: ThreadsAccountFormValues;
  proxyOptions: ProxyOption[];
  categoryOptions: CategoryOption[];
  watchlistOptions: WatchlistAccountOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DEFAULT_VALUES: ThreadsAccountFormValues = {
  username: '',
  password: '',
  proxyId: '',
  categoryId: '',
  watchlistAccountIds: [],
};

const sanitizeId = (value?: string | null) => {
  if (value === null || value === undefined) {
    return '';
  }

  const trimmed = String(value).trim();

  return trimmed;
};

const sanitizeIds = (values?: (string | null | undefined)[] | null) =>
  Array.isArray(values) ? values.map((value) => sanitizeId(value)).filter(Boolean) : [];

export function ThreadsAccountFormDialog({
  mode,
  threadsAccountId,
  account,
  initialValues,
  proxyOptions,
  categoryOptions,
  watchlistOptions,
  open,
  onOpenChange,
}: ThreadsAccountFormDialogProps) {
  const queryClient = useQueryClient();
  const schema = useMemo(
    () => (mode === 'create' ? threadsAccountCreateSchema : threadsAccountBaseSchema),
    [mode],
  );

  const form = useForm<ThreadsAccountFormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialValues,
  });
  const [isWatchlistPopoverOpen, setIsWatchlistPopoverOpen] = useState(false);
  const mergedProxyOptions = useMemo(() => {
    if (!account?.proxyId) {
      return proxyOptions;
    }

    const normalizedId = sanitizeId(account.proxyId);

    if (!normalizedId || proxyOptions.some((option) => option.id === normalizedId)) {
      return proxyOptions;
    }

    return [
      ...proxyOptions,
      {
        id: normalizedId,
        name: account.proxyName ?? 'Current proxy',
      },
    ];
  }, [account, proxyOptions]);

  const mergedCategoryOptions = useMemo(() => {
    if (!account?.categoryId) {
      return categoryOptions;
    }

    const normalizedId = sanitizeId(account.categoryId);

    if (!normalizedId || categoryOptions.some((option) => option.id === normalizedId)) {
      return categoryOptions;
    }

    return [
      ...categoryOptions,
      {
        id: normalizedId,
        name: account.categoryName ?? 'Current category',
      },
    ];
  }, [account, categoryOptions]);

  const mergedWatchlistOptions = useMemo(() => {
    const baseOptions = watchlistOptions ?? [];
    const seen = new Set(baseOptions.map((option) => option.id));
    const extras: WatchlistAccountOption[] = [];
    const accountWatchlistOptions = account?.watchlistAccounts ?? [];
    const accountWatchlistIds = sanitizeIds(
      (account?.watchlistAccountIds ??
        accountWatchlistOptions.map((option) => option?.id)) as (string | null | undefined)[] | null,
    );

    accountWatchlistIds.forEach((id) => {
      if (seen.has(id)) {
        return;
      }

      const matched = accountWatchlistOptions.find((option) => option?.id === id);
      const name =
        (matched?.name && matched.name.trim()) ||
        (matched?.username && matched.username.trim()) ||
        id;

      extras.push({
        id,
        name,
        username: matched?.username ?? null,
      });
      seen.add(id);
    });

    return [...baseOptions, ...extras];
  }, [account?.watchlistAccountIds, account?.watchlistAccounts, watchlistOptions]);

  const createMutation = useMutation({
    mutationFn: (values: ThreadsAccountFormValues) => createThreadsAccount(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['threadsAccounts'] });
      toast.custom(
        (t) => (
          <Alert variant="mono" icon="success" onClose={() => toast.dismiss(t)}>
            <AlertIcon>
              <RiCheckboxCircleFill />
            </AlertIcon>
            <AlertTitle>Threads account added successfully.</AlertTitle>
          </Alert>
        ),
        {
          duration: 4000,
        },
      );
      onOpenChange(false);
    },
    onError: (error) => {
      toast.custom(
        (t) => (
          <Alert variant="mono" icon="destructive" onClose={() => toast.dismiss(t)}>
            <AlertIcon>
              <AlertCircle className="size-5" />
            </AlertIcon>
            <AlertTitle>{error?.message ?? 'Failed to add Threads account.'}</AlertTitle>
          </Alert>
        ),
        { duration: 5000 },
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: ThreadsAccountFormValues) =>
      updateThreadsAccount({
        id: threadsAccountId as string,
        data: values,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['threadsAccounts'] });
      toast.custom(
        (t) => (
          <Alert variant="mono" icon="success" onClose={() => toast.dismiss(t)}>
            <AlertIcon>
              <RiCheckboxCircleFill />
            </AlertIcon>
            <AlertTitle>Threads account updated successfully.</AlertTitle>
          </Alert>
        ),
        {
          duration: 4000,
        },
      );
      onOpenChange(false);
    },
    onError: (error) => {
      toast.custom(
        (t) => (
          <Alert variant="mono" icon="destructive" onClose={() => toast.dismiss(t)}>
            <AlertIcon>
              <AlertCircle className="size-5" />
            </AlertIcon>
            <AlertTitle>{error?.message ?? 'Failed to update Threads account.'}</AlertTitle>
          </Alert>
        ),
        { duration: 5000 },
      );
    },
  });

  const mutation = mode === 'create' ? createMutation : updateMutation;
  const isSubmitting = mutation.isPending;

  const onSubmit = (values: ThreadsAccountFormValues) => {
    const trimmedPassword = values.password?.trim() ?? '';
    const normalizedWatchlistIds = sanitizeIds(values.watchlistAccountIds);

    mutation.mutate({
      username: values.username.trim(),
      password: mode === 'edit' && !trimmedPassword ? undefined : trimmedPassword,
      proxyId: values.proxyId.trim(),
      categoryId: values.categoryId.trim(),
      watchlistAccountIds: normalizedWatchlistIds,
    });
  };

  const title = mode === 'create' ? 'Add Threads Account' : 'Update Threads Account';
  const submitLabel = mode === 'create' ? 'Create' : 'Save Changes';
  const TitleIcon = mode === 'create' ? UserPlus : UserCheck;

  const proxyPlaceholder = mergedProxyOptions.length ? 'Select proxy' : 'No proxies available';
  const categoryPlaceholder = mergedCategoryOptions.length ? 'Select category' : 'No categories available';
  const watchlistPlaceholder = mergedWatchlistOptions.length
    ? 'Select watchlist accounts'
    : 'No watchlist accounts available';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TitleIcon className="size-5" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="threads-user"
                        autoComplete="username"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={mode === 'edit' ? 'Leave blank to keep current' : 'Sup3rS3cret!'}
                        autoComplete={mode === 'create' ? 'new-password' : 'current-password'}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="proxyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Proxy</FormLabel>
                      <FormControl>
                        <Select value={field.value || undefined} onValueChange={field.onChange}>
                          <SelectTrigger disabled={!mergedProxyOptions.length}>
                            <SelectValue placeholder={proxyPlaceholder} />
                          </SelectTrigger>
                          <SelectContent>
                            {mergedProxyOptions.map((proxy) => (
                              <SelectItem key={proxy.id} value={proxy.id}>
                                {proxy.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <Select value={field.value || undefined} onValueChange={field.onChange}>
                          <SelectTrigger disabled={!mergedCategoryOptions.length}>
                            <SelectValue placeholder={categoryPlaceholder} />
                          </SelectTrigger>
                          <SelectContent>
                            {mergedCategoryOptions.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="watchlistAccountIds"
                render={({ field, fieldState }) => {
                  const selectedIds = Array.isArray(field.value) ? field.value : [];
                  const selectedLabels = selectedIds
                    .map((id) => {
                      const option = mergedWatchlistOptions.find((item) => item.id === id);

                      if (!option) {
                        return id;
                      }

                      if (option.name?.trim()) {
                        return option.name.trim();
                      }

                      if (option.username?.trim()) {
                        return option.username.trim();
                      }

                      return id;
                    })
                    .filter(Boolean);

                  const toggleSelection = (id: string) => {
                    const exists = selectedIds.includes(id);
                    const nextValue = exists
                      ? selectedIds.filter((item) => item !== id)
                      : [...selectedIds, id];
                    field.onChange(nextValue);
                  };

                  return (
                    <FormItem>
                      <FormLabel>Watchlist Accounts</FormLabel>
                      <Popover open={isWatchlistPopoverOpen} onOpenChange={setIsWatchlistPopoverOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <button
                              type="button"
                              role="combobox"
                              aria-expanded={isWatchlistPopoverOpen}
                              aria-label="Watchlist Accounts"
                              data-invalid={fieldState.invalid}
                              className={cn(
                                'flex min-h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-left text-sm text-foreground shadow-xs shadow-black/5 transition focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 data-[invalid=true]:border-destructive/60 data-[invalid=true]:ring-destructive/10',
                                !mergedWatchlistOptions.length && 'opacity-60',
                              )}
                              disabled={!mergedWatchlistOptions.length}
                            >
                              <span className="flex flex-1 flex-wrap items-center gap-1">
                                {selectedLabels.length ? (
                                  selectedLabels.map((label, index) => (
                                    <Badge key={`${selectedIds[index]}-${label}`} variant="secondary">
                                      {label}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-muted-foreground">{watchlistPlaceholder}</span>
                                )}
                              </span>
                              <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                            </button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[420px] max-w-[calc(100vw-2rem)] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search watchlist accounts..." />
                            <CommandList>
                              <CommandEmpty>No watchlist accounts found.</CommandEmpty>
                              <CommandGroup>
                                {mergedWatchlistOptions.map((option) => {
                                  const isSelected = selectedIds.includes(option.id);

                                  return (
                                    <CommandItem
                                      key={option.id}
                                      onSelect={() => toggleSelection(option.id)}
                                    >
                                      <div
                                        className={cn(
                                          'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary',
                                          isSelected
                                            ? 'bg-primary text-primary-foreground'
                                            : 'opacity-50 [&_svg]:invisible',
                                        )}
                                      >
                                        <Check className="h-3 w-3" />
                                      </div>
                                      <div className="flex flex-col">
                                        <span>{option.name}</span>
                                        {option.username ? (
                                          <span className="text-xs text-muted-foreground">
                                            @{option.username}
                                          </span>
                                        ) : null}
                                      </div>
                                    </CommandItem>
                                  );
                                })}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              <FormItem>
                <FormLabel>Session Mode</FormLabel>
                <FormControl>
                  <Input value="persistent/ephemeral" disabled readOnly />
                </FormControl>
              </FormItem>
              <DialogFooter className="gap-2 sm:justify-between">
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={isSubmitting}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <LoaderCircle className="mr-2 size-4 animate-spin" />}
                  {submitLabel}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
