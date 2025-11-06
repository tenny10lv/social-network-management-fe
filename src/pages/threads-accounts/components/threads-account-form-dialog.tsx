'use client';

import { useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RiCheckboxCircleFill } from '@remixicon/react';
import { AlertCircle, LoaderCircle, UserCheck, UserPlus } from 'lucide-react';
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
  threadsAccountBaseSchema,
  threadsAccountCreateSchema,
  createThreadsAccount,
  getThreadsAccount,
  getProxyOptions,
  getCategoryOptions,
  updateThreadsAccount,
} from '../api';

interface ThreadsAccountFormDialogProps {
  mode: 'create' | 'edit';
  accountId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEFAULT_VALUES: ThreadsAccountFormValues = {
  username: '',
  password: '',
  proxyId: '',
  categoryId: '',
  sessionMode: 'persistent',
};

const sanitizeId = (value?: string | null) => {
  if (value === null || value === undefined) {
    return '';
  }

  const trimmed = String(value).trim();

  return trimmed;
};

const SESSION_MODE_OPTIONS = [
  { value: 'persistent', label: 'Persistent' },
  { value: 'ephemeral', label: 'Ephemeral' },
];

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

  const categoriesQuery = useQuery<CategoryOption[], Error>({
    queryKey: ['threads-category-options'],
    queryFn: getCategoryOptions,
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
        username: account.username ?? '',
        password: '',
        proxyId: sanitizeId(account.proxyId),
        categoryId: sanitizeId(account.categoryId),
        sessionMode: account.sessionMode ?? 'persistent',
      });
    }
  }, [account, mode, open, reset]);

  const proxyOptions = useMemo(() => {
    const options = proxiesQuery.data ?? [];

    if (!account || !account.proxyId) {
      return options;
    }

    const normalizedId = sanitizeId(account.proxyId);

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

  const categoryOptions = useMemo(() => {
    const options = categoriesQuery.data ?? [];

    if (!account || !account.categoryId) {
      return options;
    }

    const normalizedId = sanitizeId(account.categoryId);

    if (!normalizedId || options.some((option) => option.id === normalizedId)) {
      return options;
    }

    return [
      ...options,
      {
        id: normalizedId,
        name: account.categoryName ?? 'Current category',
      },
    ];
  }, [account, categoriesQuery.data]);

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

    mutation.mutate({
      username: values.username.trim(),
      password: mode === 'edit' && !trimmedPassword ? undefined : trimmedPassword,
      proxyId: values.proxyId.trim(),
      categoryId: values.categoryId.trim(),
      sessionMode: values.sessionMode,
    });
  };

  const title = mode === 'create' ? 'Add Threads Account' : 'Update Threads Account';
  const submitLabel = mode === 'create' ? 'Create' : 'Save Changes';
  const TitleIcon = mode === 'create' ? UserPlus : UserCheck;

  const proxyPlaceholder = proxiesQuery.isLoading
    ? 'Loading proxies...'
    : proxiesQuery.isError
      ? 'Unable to load proxies'
      : 'Select proxy';

  const categoryPlaceholder = categoriesQuery.isLoading
    ? 'Loading categories...'
    : categoriesQuery.isError
      ? 'Unable to load categories'
      : 'Select category';

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
                            <SelectTrigger disabled={proxiesQuery.isLoading}>
                              <SelectValue placeholder={proxyPlaceholder} />
                            </SelectTrigger>
                            <SelectContent>
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
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <FormControl>
                          <Select value={field.value || undefined} onValueChange={field.onChange}>
                            <SelectTrigger disabled={categoriesQuery.isLoading}>
                              <SelectValue placeholder={categoryPlaceholder} />
                            </SelectTrigger>
                            <SelectContent>
                              {categoryOptions.map((category) => (
                                <SelectItem key={category.id} value={category.id}>
                                  {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        {categoriesQuery.isError && (
                          <p className="text-xs text-destructive">
                            {categoriesQuery.error?.message ?? 'Failed to load categories.'}
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="sessionMode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Session Mode</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select session mode" />
                          </SelectTrigger>
                          <SelectContent>
                            {SESSION_MODE_OPTIONS.map((option) => (
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
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
