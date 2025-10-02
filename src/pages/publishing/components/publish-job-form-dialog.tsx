'use client';

import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RiCheckboxCircleFill } from '@remixicon/react';
import { AlertCircle, LoaderCircle } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  createPublishJob,
  getAccountOptions,
  getContentOptions,
  PUBLISH_ACCOUNT_OPTIONS_QUERY_KEY,
  PUBLISH_CONTENT_OPTIONS_QUERY_KEY,
  PublishJobFormValues,
  publishJobFormSchema,
} from '../api';

interface PublishJobFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEFAULT_VALUES: PublishJobFormValues = {
  accountId: '',
  contentId: '',
  scheduledAt: '',
};

export function PublishJobFormDialog({ open, onOpenChange }: PublishJobFormDialogProps) {
  const queryClient = useQueryClient();

  const form = useForm<PublishJobFormValues>({
    resolver: zodResolver(publishJobFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const { control, reset, handleSubmit } = form;

  const accountOptionsQuery = useQuery({
    queryKey: PUBLISH_ACCOUNT_OPTIONS_QUERY_KEY,
    queryFn: getAccountOptions,
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  const contentOptionsQuery = useQuery({
    queryKey: PUBLISH_CONTENT_OPTIONS_QUERY_KEY,
    queryFn: getContentOptions,
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!open) {
      reset(DEFAULT_VALUES);
    }
  }, [open, reset]);

  const createMutation = useMutation({
    mutationFn: createPublishJob,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['publish-jobs'] });
      toast.custom(
        (t) => (
          <Alert variant="mono" icon="success" onClose={() => toast.dismiss(t)}>
            <AlertIcon>
              <RiCheckboxCircleFill />
            </AlertIcon>
            <AlertTitle>Publish job created successfully.</AlertTitle>
          </Alert>
        ),
        {
          duration: 4000,
        },
      );
      onOpenChange(false);
      reset(DEFAULT_VALUES);
    },
    onError: (mutationError: Error) => {
      toast.custom(
        (t) => (
          <Alert variant="mono" icon="destructive" onClose={() => toast.dismiss(t)}>
            <AlertIcon>
              <AlertCircle className="size-5" />
            </AlertIcon>
            <AlertTitle>{mutationError.message}</AlertTitle>
          </Alert>
        ),
        {
          duration: 5000,
        },
      );
    },
  });

  const onSubmit = (values: PublishJobFormValues) => {
    createMutation.mutate({
      accountId: values.accountId,
      contentId: values.contentId,
      scheduledAt: values.scheduledAt || undefined,
    });
  };

  const accountOptions = accountOptionsQuery.data ?? [];
  const contentOptions = contentOptionsQuery.data ?? [];
  const isSubmitting = createMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Publish Job</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <Form {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={control}
                name="accountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={(value) => field.onChange(value)}
                        value={field.value}
                        disabled={accountOptionsQuery.isLoading}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={accountOptionsQuery.isLoading ? 'Loading accounts...' : 'Select account'} />
                        </SelectTrigger>
                        <SelectContent>
                          {accountOptionsQuery.isLoading ? (
                            <SelectItem value="loading" disabled>
                              Loading accounts...
                            </SelectItem>
                          ) : accountOptions.length === 0 ? (
                            <SelectItem value="empty" disabled>
                              No accounts available
                            </SelectItem>
                          ) : (
                            accountOptions.map((option) => (
                              <SelectItem key={option.id} value={option.id}>
                                {option.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="contentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={(value) => field.onChange(value)}
                        value={field.value}
                        disabled={contentOptionsQuery.isLoading}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={contentOptionsQuery.isLoading ? 'Loading contents...' : 'Select content'} />
                        </SelectTrigger>
                        <SelectContent>
                          {contentOptionsQuery.isLoading ? (
                            <SelectItem value="loading" disabled>
                              Loading contents...
                            </SelectItem>
                          ) : contentOptions.length === 0 ? (
                            <SelectItem value="empty" disabled>
                              No contents available
                            </SelectItem>
                          ) : (
                            contentOptions.map((option) => (
                              <SelectItem key={option.id} value={option.id}>
                                {option.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="scheduledAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Schedule at (optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        value={field.value ?? ''}
                        onChange={(event) => field.onChange(event.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-2">
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={isSubmitting}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <LoaderCircle className="mr-2 size-4 animate-spin" />}
                  Create Job
                </Button>
              </div>
            </form>
          </Form>
        </DialogBody>
        <DialogFooter />
      </DialogContent>
    </Dialog>
  );
}
