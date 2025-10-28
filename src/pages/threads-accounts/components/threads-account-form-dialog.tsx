'use client';

import { useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RiCheckboxCircleFill } from '@remixicon/react';
import { AlertCircle, LoaderCircle, UserCheck } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  ThreadsAccountFormValues,
  ThreadsAccountRecord,
  ProxyOption,
  threadsAccountBaseSchema,
  threadsAccountCreateSchema,
  createThreadsAccount,
  getThreadsAccount,
  getProxyOptions,
  updateThreadsAccount,
} from '../api';

interface ThreadsAccountFormDialogProps {
  mode: 'create' | 'edit';
  accountId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PLATFORM_OPTIONS = [
  { value: 'FACEBOOK', label: 'Facebook' },
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'TIKTOK', label: 'TikTok' },
  { value: 'THREADS', label: 'Threads' },
];

const DEFAULT_VALUES: ThreadsAccountFormValues = {
  platform: '',
  accountName: '',
  username: '',
  password: '',
  proxyId: null,
  isActive: true,
};

const resolvePlatformValue = (value?: string | null) => {
  if (!value) {
    return '';
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return '';
  }

  const directMatch = PLATFORM_OPTIONS.find((option) => option.value === trimmed);
  if (directMatch) {
    return directMatch.value;
  }

  const caseInsensitiveMatch = PLATFORM_OPTIONS.find(
    (option) => option.value.toLowerCase() === trimmed.toLowerCase(),
  );

  return caseInsensitiveMatch?.value ?? trimmed;
};

const sanitizeProxyId = (value?: string | null) => {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = String(value).trim();

  return trimmed === '' ? null : trimmed;
};

const NO_PROXY_OPTION_VALUE = '__no_proxy__';

export function ThreadsAccountFormDialog({
  mode,
  accountId,
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
    defaultValues: DEFAULT_VALUES,
  });

  const { reset } = form;

  const {
    data: account,
    isLoading: isAccountLoading,
    isError: isAccountError,
    error: accountError,
  } = useQuery<ThreadsAccountRecord, Error>({
    queryKey: ['threadsAccount', accountId],
    queryFn: () => getThreadsAccount(accountId as string),
    enabled: mode === 'edit' && !!accountId && open,
  });

  const proxiesQuery = useQuery<ProxyOption[], Error>({
    queryKey: ['proxy-options'],
    queryFn: getProxyOptions,
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (open && mode === 'create') {
      reset(DEFAULT_VALUES);
    }
  }, [mode, open, reset]);

  useEffect(() => {
    if (account && mode === 'edit' && open) {
      reset({
        platform: resolvePlatformValue(account.platform),
        accountName: account.accountName ?? '',
        username: account.username ?? '',
        password: '',
        proxyId: sanitizeProxyId(account.proxyId),
        isActive: account.isActive,
      });
    }
  }, [account, mode, open, reset]);

  const proxyOptions = useMemo(() => {
    const options = proxiesQuery.data ?? [];

    if (!account || !account.proxyId) {
      return options;
    }

    const normalizedId = sanitizeProxyId(account.proxyId);

    if (!normalizedId || options.some((option) => option.id === normalizedId)) {
      return options;
    }

    return [
      ...options,
      {
        id: normalizedId,
        name: account.proxyName ?? 'Current proxy',
      },
    ];
  }, [account, proxiesQuery.data]);

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
            <AlertTitle>Threads account created successfully.</AlertTitle>
          </Alert>
        ),
        {
          duration: 4000,
        },
      );
      onOpenChange(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: ThreadsAccountFormValues) =>
      updateThreadsAccount({
        id: accountId as string,
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
  });

  const mutation = mode === 'create' ? createMutation : updateMutation;
  const isSubmitting = mutation.isPending;

  const onSubmit = (values: ThreadsAccountFormValues) => {
    mutation.mutate({
      ...values,
      password: mode === 'edit' && !values.password ? undefined : values.password,
    });
  };

  const title = mode === 'create' ? 'Create Threads Account' : 'Update Threads Account';
  const submitLabel = mode === 'create' ? 'Create Threads Account' : 'Update Threads Account';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="size-5" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
          {mode === 'edit' && isAccountLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <LoaderCircle className="size-5 animate-spin" />
              <span className="ms-2 text-sm">Loading Threads account details...</span>
            </div>
          ) : mode === 'edit' && isAccountError ? (
            <Alert variant="mono" icon="destructive">
              <AlertIcon>
                <AlertCircle className="size-5" />
              </AlertIcon>
              <AlertTitle>{accountError?.message ?? 'Unable to load Threads account details.'}</AlertTitle>
            </Alert>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="platform"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Platform</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value || undefined}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select platform" />
                          </SelectTrigger>
                          <SelectContent>
                            {PLATFORM_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
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
                  name="accountName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Threads Account Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Marketing Threads Account" autoComplete="off" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="username" autoComplete="username" {...field} />
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
                            placeholder={
                              mode === 'edit'
                                ? 'Leave blank to keep current'
                                : 'Password'
                            }
                            autoComplete={mode === 'create' ? 'new-password' : 'current-password'}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="proxyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Proxy</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value ?? NO_PROXY_OPTION_VALUE}
                          onValueChange={(value) =>
                            field.onChange(value === NO_PROXY_OPTION_VALUE ? null : value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select proxy" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NO_PROXY_OPTION_VALUE}>No proxy</SelectItem>
                            {proxyOptions.map((proxy) => (
                              <SelectItem key={proxy.id} value={proxy.id}>
                                {proxy.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      {proxiesQuery.isError && (
                        <p className="text-xs text-destructive">
                          {proxiesQuery.error?.message ?? 'Failed to load proxies.'}
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center gap-3 rounded-lg border border-border/60 p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(value) => field.onChange(Boolean(value))}
                        />
                      </FormControl>
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm">Active</FormLabel>
                        <p className="text-xs text-muted-foreground">
                          Enable this Threads account for automations and scheduled jobs.
                        </p>
                      </div>
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && (
                      <LoaderCircle className="mr-2 size-4 animate-spin" />
                    )}
                    {submitLabel}
                  </Button>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">
                      Cancel
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
