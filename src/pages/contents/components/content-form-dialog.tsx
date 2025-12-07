'use client';

import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RiCheckboxCircleFill } from '@remixicon/react';
import { AlertCircle, ImageIcon, LoaderCircle, Trash2, Upload, VideoIcon } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  CONTENT_ACCOUNT_OPTIONS_QUERY_KEY,
  ContentFormValues,
  ContentRecord,
  ContentSubmitPayload,
  contentFormSchema,
  createContent,
  getAccountOptions,
  getContent,
  updateContent,
} from '../api';
import { useFileUpload } from '@/hooks/use-file-upload';
import { cn } from '@/lib/utils';

interface ContentFormDialogProps {
  mode: 'create' | 'edit';
  contentId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TYPE_OPTIONS = [
  { value: 'TEXT', label: 'Text' },
  { value: 'IMAGE', label: 'Image' },
  { value: 'VIDEO', label: 'Video' },
  { value: 'SHORT', label: 'Short' },
] as const;

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'PUBLISHED', label: 'Published' },
] as const;

const DEFAULT_VALUES: ContentFormValues = {
  threadsAccountId: '',
  title: undefined,
  body: '',
  type: 'TEXT',
  scheduledAt: undefined,
  status: 'DRAFT',
};

const toInputDateTimeValue = (value?: string | null) => {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);

  return localDate.toISOString().slice(0, 16);
};

export function ContentFormDialog({ mode, contentId, open, onOpenChange }: ContentFormDialogProps) {
  const queryClient = useQueryClient();
  const [existingMedia, setExistingMedia] = useState<string[]>([]);

  const form = useForm<ContentFormValues>({
    resolver: zodResolver(contentFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const { control, reset, handleSubmit } = form;

  const accountOptionsQuery = useQuery({
    queryKey: CONTENT_ACCOUNT_OPTIONS_QUERY_KEY,
    queryFn: getAccountOptions,
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  const contentQuery = useQuery<ContentRecord, Error>({
    queryKey: ['content', contentId],
    queryFn: () => getContent(contentId as string),
    enabled: mode === 'edit' && !!contentId && open,
  });

  const [uploadState, uploadActions] = useFileUpload({
    multiple: true,
    accept: 'image/*,video/*',
    maxFiles: 10,
  });

  const {
    clearFiles,
    openFileDialog,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    getInputProps,
    removeFile,
  } = uploadActions;

  const newMediaFiles = useMemo(
    () =>
      uploadState.files
        .map((item) => item.file)
        .filter((file): file is File => file instanceof File),
    [uploadState.files],
  );

  useEffect(() => {
    if (open && mode === 'create') {
      reset(DEFAULT_VALUES);
      setExistingMedia([]);
      clearFiles();
    }
  }, [mode, open, reset, clearFiles]);

  useEffect(() => {
    if (contentQuery.data && mode === 'edit' && open) {
      const record = contentQuery.data;

      reset({
        threadsAccountId: record.threadsAccountId ?? '',
        title: record.title ?? undefined,
        body: record.body ?? '',
        type: (record.type as ContentFormValues['type']) ?? 'TEXT',
        scheduledAt: toInputDateTimeValue(record.scheduledAt),
        status: (record.status as ContentFormValues['status']) ?? 'DRAFT',
      });

      setExistingMedia(record.mediaUrls ?? []);
      clearFiles();
    }
  }, [contentQuery.data, mode, open, reset, clearFiles]);

  useEffect(() => {
    if (!open) {
      setExistingMedia([]);
      clearFiles();
    }
  }, [open, clearFiles]);

  const createMutation = useMutation({
    mutationFn: (values: ContentSubmitPayload) => createContent(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['contents'] });
      toast.custom(
        (t) => (
          <Alert variant="mono" icon="success" onClose={() => toast.dismiss(t)}>
            <AlertIcon>
              <RiCheckboxCircleFill />
            </AlertIcon>
            <AlertTitle>Content created successfully.</AlertTitle>
          </Alert>
        ),
        {
          duration: 4000,
        },
      );
      onOpenChange(false);
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

  const updateMutation = useMutation({
    mutationFn: (values: ContentSubmitPayload) =>
      updateContent({
        id: contentId as string,
        data: values,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['contents'] });
      toast.custom(
        (t) => (
          <Alert variant="mono" icon="success" onClose={() => toast.dismiss(t)}>
            <AlertIcon>
              <RiCheckboxCircleFill />
            </AlertIcon>
            <AlertTitle>Content updated successfully.</AlertTitle>
          </Alert>
        ),
        {
          duration: 4000,
        },
      );
      onOpenChange(false);
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

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const handleRemoveExistingMedia = (index: number) => {
    setExistingMedia((previous) => previous.filter((_, itemIndex) => itemIndex !== index));
  };

  const onSubmit = (values: ContentFormValues) => {
    const payload: ContentSubmitPayload = {
      ...values,
      title: values.title && values.title.trim().length > 0 ? values.title.trim() : undefined,
      scheduledAt:
        values.scheduledAt && values.scheduledAt.trim().length > 0
          ? values.scheduledAt.trim()
          : undefined,
      existingMediaUrls: existingMedia,
      newMediaFiles,
    };

    if (mode === 'create') {
      createMutation.mutate(payload);
    } else {
      updateMutation.mutate(payload);
    }
  };

  const uploadErrors = uploadState.errors ?? [];

  const isLoadingRecord = mode === 'edit' && contentQuery.isLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create Content' : 'Update Content'}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          {contentQuery.isError && mode === 'edit' ? (
            <Alert variant="mono" icon="destructive" className="mb-4">
              <AlertIcon>
                <AlertCircle className="size-5" />
              </AlertIcon>
              <AlertTitle>{contentQuery.error?.message ?? 'Failed to load content.'}</AlertTitle>
            </Alert>
          ) : null}
          {accountOptionsQuery.isError ? (
            <Alert variant="mono" icon="destructive" className="mb-4">
              <AlertIcon>
                <AlertCircle className="size-5" />
              </AlertIcon>
              <AlertTitle>
                {accountOptionsQuery.error instanceof Error
                  ? accountOptionsQuery.error.message
                  : 'Failed to load accounts.'}
              </AlertTitle>
            </Alert>
          ) : null}
          <Form {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={control}
                  name="threadsAccountId"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Account</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={accountOptionsQuery.isLoading || isLoadingRecord || isSubmitting}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select account" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(accountOptionsQuery.data ?? []).map((option) => (
                            <SelectItem key={option.id} value={option.id}>
                              {option.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="title"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Optional title"
                          value={field.value ?? ''}
                          onChange={field.onChange}
                          disabled={isLoadingRecord || isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="body"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Body</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={6}
                          placeholder="Write your content..."
                          value={field.value ?? ''}
                          onChange={field.onChange}
                          disabled={isLoadingRecord || isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={isLoadingRecord || isSubmitting}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TYPE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={isLoadingRecord || isSubmitting}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {STATUS_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="scheduledAt"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Scheduled At</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          value={field.value ?? ''}
                          onChange={field.onChange}
                          disabled={isLoadingRecord || isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <FormLabel>Media Files</FormLabel>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={openFileDialog}
                    disabled={isLoadingRecord || isSubmitting}
                  >
                    <Upload className="mr-2 size-4" />
                    Upload
                  </Button>
                </div>
                <div
                  className={cn(
                    'rounded-md border border-dashed p-4 transition-colors',
                    uploadState.isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/30',
                    isLoadingRecord || isSubmitting ? 'pointer-events-none opacity-70' : '',
                  )}
                  onDragEnter={handleDragEnter}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  role="presentation"
                >
                  <input {...getInputProps({ multiple: true })} />
                  <div className="text-sm text-muted-foreground">
                    Drag and drop files here, or click Upload. Images and videos are supported.
                  </div>
                  {uploadErrors.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {uploadErrors.map((message) => (
                        <Alert key={message} variant="mono" icon="destructive">
                          <AlertIcon>
                            <AlertCircle className="size-5" />
                          </AlertIcon>
                          <AlertTitle>{message}</AlertTitle>
                        </Alert>
                      ))}
                    </div>
                  ) : null}
                </div>

                <ScrollArea className="max-h-48 rounded-md border p-3">
                  <div className="space-y-3">
                    {existingMedia.length === 0 && uploadState.files.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No media selected.</p>
                    ) : null}

                    {existingMedia.map((url, index) => (
                      <div
                        key={`existing-${url}-${index}`}
                        className="flex items-center justify-between rounded-md border bg-muted/40 p-2 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <ImageIcon className="size-4 text-muted-foreground" />
                          <span className="max-w-[220px] truncate" title={url}>
                            {url}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveExistingMedia(index)}
                          disabled={isLoadingRecord || isSubmitting}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ))}

                    {uploadState.files.map((file) => {
                      const preview = file.preview;
                      const name = file.file instanceof File ? file.file.name : 'Media file';
                      const size = file.file instanceof File ? file.file.size : undefined;
                      const formattedSize =
                        typeof size === 'number'
                          ? `${(size / (1024 * 1024)).toFixed(2)} MB`
                          : undefined;

                      const isVideo =
                        file.file instanceof File && file.file.type.startsWith('video');

                      return (
                        <div
                          key={file.id}
                          className="flex items-center justify-between rounded-md border bg-background p-2 text-sm"
                        >
                          <div className="flex items-center gap-3">
                            {isVideo ? (
                              <VideoIcon className="size-4 text-muted-foreground" />
                            ) : (
                              <ImageIcon className="size-4 text-muted-foreground" />
                            )}
                            <div>
                              <div className="max-w-[220px] truncate" title={name}>
                                {name}
                              </div>
                              {formattedSize ? (
                                <div className="text-xs text-muted-foreground">{formattedSize}</div>
                              ) : null}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {preview ? (
                              <div className="hidden h-12 w-12 overflow-hidden rounded-md border bg-muted/40 sm:block">
                                <img src={preview} alt={name} className="h-full w-full object-cover" />
                              </div>
                            ) : null}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(file.id)}
                              disabled={isLoadingRecord || isSubmitting}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>

              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={isSubmitting}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={isSubmitting || isLoadingRecord}>
                  {isSubmitting ? (
                    <>
                      <LoaderCircle className="mr-2 size-4 animate-spin" />
                      Saving
                    </>
                  ) : (
                    'Save changes'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
