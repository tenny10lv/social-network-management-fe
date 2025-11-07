'use client';

import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { RiCheckboxCircleFill } from '@remixicon/react';
import { AlertCircle, LoaderCircle, UserPlus } from 'lucide-react';
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

import {
  createThreadsWatchlistAccount,
  threadsWatchlistAccountCreateSchema,
  type ThreadsWatchlistAccountCreateValues,
} from '../api';

interface ThreadsWatchlistAccountCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEFAULT_VALUES: ThreadsWatchlistAccountCreateValues = {
  username: '',
};

export function ThreadsWatchlistAccountCreateDialog({
  open,
  onOpenChange,
}: ThreadsWatchlistAccountCreateDialogProps) {
  const queryClient = useQueryClient();

  const form = useForm<ThreadsWatchlistAccountCreateValues>({
    resolver: zodResolver(threadsWatchlistAccountCreateSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const { reset } = form;

  useEffect(() => {
    if (open) {
      reset(DEFAULT_VALUES);
    }
  }, [open, reset]);

  const mutation = useMutation({
    mutationFn: (values: ThreadsWatchlistAccountCreateValues) =>
      createThreadsWatchlistAccount({ username: values.username.trim() }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['threadsWatchlistAccounts'] });
      toast.custom(
        (t) => (
          <Alert variant="mono" icon="success" onClose={() => toast.dismiss(t)}>
            <AlertIcon>
              <RiCheckboxCircleFill />
            </AlertIcon>
            <AlertTitle>Watchlist account added successfully.</AlertTitle>
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
            <AlertTitle>{error?.message ?? 'Failed to add watchlist account.'}</AlertTitle>
          </Alert>
        ),
        { duration: 5000 },
      );
    },
  });

  const isSubmitting = mutation.isPending;

  const onSubmit = (values: ThreadsWatchlistAccountCreateValues) => {
    mutation.mutate({ username: values.username.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="size-5" />
            Add Watchlist Account
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
                      <Input placeholder="threads-user" autoComplete="off" {...field} />
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
                  Create
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
