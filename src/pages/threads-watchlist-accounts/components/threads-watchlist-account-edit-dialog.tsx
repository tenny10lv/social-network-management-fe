'use client';

import { useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RiCheckboxCircleFill } from '@remixicon/react';
import { AlertCircle, LoaderCircle, Pencil } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

import {
  getCategoryOptions,
  getThreadsWatchlistAccount,
  threadsWatchlistAccountUpdateSchema,
  type CategoryOption,
  type ThreadsWatchlistAccountRecord,
  type ThreadsWatchlistAccountUpdateValues,
  updateThreadsWatchlistAccount,
} from '../api';

interface ThreadsWatchlistAccountEditDialogProps {
  threadsAccountId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEFAULT_VALUES: ThreadsWatchlistAccountUpdateValues = {
  note: '',
  categoryId: '',
  isActive: true,
};

export function ThreadsWatchlistAccountEditDialog({
  threadsAccountId,
  open,
  onOpenChange,
}: ThreadsWatchlistAccountEditDialogProps) {
  const queryClient = useQueryClient();

  const form = useForm<ThreadsWatchlistAccountUpdateValues>({
    resolver: zodResolver(threadsWatchlistAccountUpdateSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const { reset } = form;

  const accountQuery = useQuery<ThreadsWatchlistAccountRecord, Error>({
    queryKey: ['threadsWatchlistAccount', threadsAccountId],
    queryFn: () => getThreadsWatchlistAccount(threadsAccountId as string),
    enabled: open && Boolean(threadsAccountId),
  });

  const categoriesQuery = useQuery<CategoryOption[], Error>({
    queryKey: ['threadsWatchlistCategoryOptions'],
    queryFn: getCategoryOptions,
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!threadsAccountId) {
      reset(DEFAULT_VALUES);
      return;
    }

    const account = accountQuery.data;

    if (!account) {
      return;
    }

    reset({
      note: account.note ?? '',
      categoryId: account.categoryId ?? '',
      isActive: account.isActive ?? false,
    });
  }, [threadsAccountId, accountQuery.data, open, reset]);

  const categoryOptions = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);

  const mutation = useMutation({
    mutationFn: (values: ThreadsWatchlistAccountUpdateValues) => {
      if (!threadsAccountId) {
        throw new Error('No watchlist account selected.');
      }

      return updateThreadsWatchlistAccount({
        id: threadsAccountId,
        values: {
          note: values.note ?? '',
          categoryId: values.categoryId ?? '',
          isActive: values.isActive,
        },
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['threadsWatchlistAccounts'] });
      if (threadsAccountId) {
        void queryClient.invalidateQueries({ queryKey: ['threadsWatchlistAccount', threadsAccountId] });
      }
      toast.custom(
        (t) => (
          <Alert variant="mono" icon="success" onClose={() => toast.dismiss(t)}>
            <AlertIcon>
              <RiCheckboxCircleFill />
            </AlertIcon>
            <AlertTitle>Watchlist account updated successfully.</AlertTitle>
          </Alert>
        ),
        { duration: 4000 },
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
            <AlertTitle>{error?.message ?? 'Failed to update watchlist account.'}</AlertTitle>
          </Alert>
        ),
        { duration: 5000 },
      );
    },
  });

  const isSubmitting = mutation.isPending;

  const onSubmit = (values: ThreadsWatchlistAccountUpdateValues) => {
    if (!threadsAccountId) {
      return;
    }

    mutation.mutate({
      note: values.note ?? '',
      categoryId: values.categoryId ?? '',
      isActive: values.isActive,
    });
  };

  const categoryPlaceholder = categoriesQuery.isLoading
    ? 'Loading categories...'
    : categoriesQuery.isError
      ? 'Unable to load categories'
      : 'Select category';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="size-5" />
            Update Watchlist Account
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
          {open && !threadsAccountId ? (
            <Alert variant="mono" icon="destructive">
              <AlertIcon>
                <AlertCircle className="size-5" />
              </AlertIcon>
              <AlertTitle>No watchlist account selected.</AlertTitle>
            </Alert>
          ) : accountQuery.isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <LoaderCircle className="size-5 animate-spin" />
              <span className="ms-2 text-sm">Loading watchlist account details...</span>
            </div>
          ) : accountQuery.isError ? (
            <Alert variant="mono" icon="destructive">
              <AlertIcon>
                <AlertCircle className="size-5" />
              </AlertIcon>
              <AlertTitle>
                {accountQuery.error?.message ?? 'Unable to load watchlist account details.'}
              </AlertTitle>
            </Alert>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="note"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Internal Note</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Add context for your team..."
                          rows={4}
                          {...field}
                        />
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
                        <Select
                          value={field.value ? field.value : '__none__'}
                          onValueChange={(value) =>
                            field.onChange(value === '__none__' ? '' : value)
                          }
                        >
                          <SelectTrigger disabled={categoriesQuery.isLoading}>
                            <SelectValue placeholder={categoryPlaceholder} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">No category</SelectItem>
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
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/40 p-4">
                      <div>
                        <FormLabel className="text-base">Active</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Pause to stop automated syncing for this profile.
                        </p>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
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
                  <Button type="submit" disabled={isSubmitting || !threadsAccountId}>
                    {isSubmitting && <LoaderCircle className="mr-2 size-4 animate-spin" />}
                    Save Changes
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
