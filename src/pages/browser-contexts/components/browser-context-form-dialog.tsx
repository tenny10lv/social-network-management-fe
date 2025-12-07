'use client';

import { ChangeEvent, useEffect, useMemo, useRef } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RiCheckboxCircleFill } from '@remixicon/react';
import { AlertCircle, LoaderCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
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
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BROWSER_CONTEXTS_QUERY_KEY,
  BROWSER_CONTEXT_ACCOUNT_OPTIONS_QUERY_KEY,
  BrowserContextAccountOption,
  BrowserContextFormValues,
  BrowserContextRecord,
  browserContextFormSchema,
  createBrowserContext,
  getAccountOptions,
  getBrowserContext,
  updateBrowserContext,
} from '../api';

interface BrowserContextFormDialogProps {
  mode: 'create' | 'edit';
  contextId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEFAULT_VALUES: BrowserContextFormValues = {
  threadsAccountId: '',
  accountName: '',
  userAgent: '',
  viewportWidth: 1280,
  viewportHeight: 720,
  timezone: '',
  locale: '',
  proxyUrl: '',
  storageState: '',
  userDataDirPath: '',
  fingerprint: '',
  note: '',
  isActive: true,
};

export function BrowserContextFormDialog({
  mode,
  contextId,
  open,
  onOpenChange,
}: BrowserContextFormDialogProps) {
  const queryClient = useQueryClient();

  const form = useForm<BrowserContextFormValues>({
    resolver: zodResolver(browserContextFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const { reset, setValue } = form;
  const storageStateFileInputRef = useRef<HTMLInputElement | null>(null);

  const handleStorageStateFileUpload = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const trimmed = text.trim();
      const value = trimmed ? text : '';

      setValue('storageState', value, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });

      if (trimmed) {
        try {
          JSON.parse(text);
          form.clearErrors('storageState');
        } catch (jsonError) {
          form.setError('storageState', {
            type: 'validate',
            message:
              jsonError instanceof Error
                ? `Uploaded file must contain valid JSON: ${jsonError.message}`
                : 'Uploaded file must contain valid JSON.',
          });
        }
      } else {
        form.clearErrors('storageState');
      }
    } catch (error) {
      form.setError('storageState', {
        type: 'validate',
        message: error instanceof Error ? error.message : 'Unable to read file.',
      });
    } finally {
      event.target.value = '';
    }
  };

  const accountOptionsQuery = useQuery({
    queryKey: BROWSER_CONTEXT_ACCOUNT_OPTIONS_QUERY_KEY,
    queryFn: getAccountOptions,
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  const contextQuery = useQuery<BrowserContextRecord, Error>({
    queryKey: ['browser-context', contextId],
    queryFn: () => getBrowserContext(contextId as string),
    enabled: mode === 'edit' && !!contextId && open,
  });

  useEffect(() => {
    if (open && mode === 'create') {
      reset(DEFAULT_VALUES);
    }
  }, [mode, open, reset]);

  useEffect(() => {
    if (contextQuery.data && mode === 'edit' && open) {
      const record = contextQuery.data;

      reset({
        threadsAccountId: record.threadsAccountId ?? '',
        accountName: record.accountName ?? '',
        userAgent: record.userAgent ?? '',
        viewportWidth: record.viewportWidth ?? DEFAULT_VALUES.viewportWidth,
        viewportHeight: record.viewportHeight ?? DEFAULT_VALUES.viewportHeight,
        timezone: record.timezone ?? '',
        locale: record.locale ?? '',
        proxyUrl: record.proxyUrl ?? '',
        storageState: record.storageState ?? '',
        userDataDirPath: record.userDataDirPath ?? '',
        fingerprint: record.fingerprint ?? '',
        note: record.note ?? '',
        isActive: record.isActive,
      });
    }
  }, [contextQuery.data, mode, open, reset]);

  const handleAccountSelect = (threadsAccountId: string) => {
    setValue('threadsAccountId', threadsAccountId, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });

    const matchedOption = accountOptionsQuery.data?.find(
      (option) => option.id === threadsAccountId,
    );

    setValue('accountName', matchedOption?.name ?? '', {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  const createMutation = useMutation({
    mutationFn: (values: BrowserContextFormValues) => createBrowserContext(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [BROWSER_CONTEXTS_QUERY_KEY] });
      toast.custom(
        (t) => (
          <Alert variant="mono" icon="success" onClose={() => toast.dismiss(t)}>
            <AlertIcon>
              <RiCheckboxCircleFill />
            </AlertIcon>
            <AlertTitle>Browser context created successfully.</AlertTitle>
          </Alert>
        ),
        {
          duration: 4000,
        },
      );
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.custom(
        (t) => (
          <Alert variant="mono" icon="destructive" onClose={() => toast.dismiss(t)}>
            <AlertIcon>
              <AlertCircle className="size-5" />
            </AlertIcon>
            <AlertTitle>{error.message}</AlertTitle>
          </Alert>
        ),
        {
          duration: 5000,
        },
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: BrowserContextFormValues }) =>
      updateBrowserContext({ id, data }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [BROWSER_CONTEXTS_QUERY_KEY] });
      toast.custom(
        (t) => (
          <Alert variant="mono" icon="success" onClose={() => toast.dismiss(t)}>
            <AlertIcon>
              <RiCheckboxCircleFill />
            </AlertIcon>
            <AlertTitle>Browser context updated successfully.</AlertTitle>
          </Alert>
        ),
        {
          duration: 4000,
        },
      );
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.custom(
        (t) => (
          <Alert variant="mono" icon="destructive" onClose={() => toast.dismiss(t)}>
            <AlertIcon>
              <AlertCircle className="size-5" />
            </AlertIcon>
            <AlertTitle>{error.message}</AlertTitle>
          </Alert>
        ),
        {
          duration: 5000,
        },
      );
    },
  });

  const submitLabel = mode === 'create' ? 'Create' : 'Update';
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const accountOptions = useMemo(
    () => accountOptionsQuery.data ?? [],
    [accountOptionsQuery.data],
  );

  const onSubmit = (values: BrowserContextFormValues) => {
    if (mode === 'create') {
      createMutation.mutate(values);
    } else if (contextId) {
      updateMutation.mutate({ id: contextId, data: values });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Create Browser Context' : 'Update Browser Context'}
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
          {mode === 'edit' && contextQuery.isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <LoaderCircle className="size-5 animate-spin" />
              <span className="ms-2 text-sm">Loading browser context...</span>
            </div>
          ) : contextQuery.isError ? (
            <Alert variant="mono" icon="destructive">
              <AlertIcon>
                <AlertCircle className="size-5" />
              </AlertIcon>
              <AlertTitle>{contextQuery.error?.message}</AlertTitle>
            </Alert>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="threadsAccountId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account</FormLabel>
                        <FormControl>
                          <Select
                            value={field.value}
                            onValueChange={(value) => handleAccountSelect(value)}
                            disabled={accountOptionsQuery.isLoading}
                          >
                            <SelectTrigger>
                              <SelectValue
                                placeholder={
                                  accountOptionsQuery.isLoading
                                    ? 'Loading accounts...'
                                    : 'Select account'
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {accountOptions.map((option: BrowserContextAccountOption) => (
                                <SelectItem key={option.id} value={option.id}>
                                  {option.name}
                                </SelectItem>
                              ))}
                              {accountOptionsQuery.isError && (
                                <SelectItem value="__error" disabled>
                                  Failed to load accounts
                                </SelectItem>
                              )}
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
                        <FormLabel>Account name</FormLabel>
                        <FormControl>
                          <Input placeholder="Account name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="userAgent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>User agent</FormLabel>
                      <FormControl>
                        <Textarea rows={3} placeholder="Mozilla/5.0 ..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="viewportWidth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Viewport width</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            step={1}
                            value={field.value ?? ''}
                            onChange={(event) => {
                              const value = event.target.value;
                              field.onChange(value === '' ? value : Number(value));
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="viewportHeight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Viewport height</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            step={1}
                            value={field.value ?? ''}
                            onChange={(event) => {
                              const value = event.target.value;
                              field.onChange(value === '' ? value : Number(value));
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="timezone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Timezone</FormLabel>
                        <FormControl>
                          <Input placeholder="America/New_York" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="locale"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Locale</FormLabel>
                        <FormControl>
                          <Input placeholder="en-US" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="proxyUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Proxy URL</FormLabel>
                      <FormControl>
                        <Input placeholder="http://user:pass@host:port" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="storageState"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Storage state (JSON)</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <Textarea rows={4} placeholder='{"cookies":[]}' {...field} />
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <Input
                              ref={storageStateFileInputRef}
                              type="file"
                              accept="application/json,.json"
                              className="hidden"
                              onChange={handleStorageStateFileUpload}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => storageStateFileInputRef.current?.click()}
                            >
                              Upload JSON
                            </Button>
                            <span>Optional: import storage state from a JSON file.</span>
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="userDataDirPath"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>User data directory path</FormLabel>
                      <FormControl>
                        <Input placeholder="/var/app/browser-data" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fingerprint"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fingerprint (JSON)</FormLabel>
                      <FormControl>
                        <Textarea rows={4} placeholder='{"fingerprint":{}}' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="note"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Note</FormLabel>
                      <FormControl>
                        <Textarea rows={3} placeholder="Optional notes about this context" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Active</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-3">
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                          <span className="text-sm text-muted-foreground">
                            Enable this browser context for automation runs
                          </span>
                        </div>
                      </FormControl>
                      <FormMessage />
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
