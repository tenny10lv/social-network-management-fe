'use client';

import { useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RiCheckboxCircleFill } from '@remixicon/react';
import { AlertCircle, LoaderCircle, ServerCog } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import {
  ProxyFormValues,
  ProxyRecord,
  createProxy,
  getProxy,
  proxyBaseSchema,
  proxyCreateSchema,
  updateProxy,
} from '../api';

interface ProxyFormDialogProps {
  mode: 'create' | 'edit';
  proxyId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEFAULT_VALUES: ProxyFormValues = {
  name: '',
  host: '',
  port: 8080,
  username: '',
  password: '',
  isActive: true,
};

export function ProxyFormDialog({
  mode,
  proxyId,
  open,
  onOpenChange,
}: ProxyFormDialogProps) {
  const queryClient = useQueryClient();
  const schema = useMemo(
    () => (mode === 'create' ? proxyCreateSchema : proxyBaseSchema),
    [mode],
  );

  const form = useForm<ProxyFormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULT_VALUES,
  });

  const { reset } = form;

  const {
    data: proxy,
    isLoading: isProxyLoading,
    isError,
    error,
  } = useQuery<ProxyRecord, Error>({
    queryKey: ['proxy', proxyId],
    queryFn: () => getProxy(proxyId as string),
    enabled: mode === 'edit' && !!proxyId && open,
  });

  useEffect(() => {
    if (open) {
      if (mode === 'create') {
        reset(DEFAULT_VALUES);
      }
    }
  }, [mode, open, reset]);

  useEffect(() => {
    if (proxy && mode === 'edit' && open) {
      reset({
        name: proxy.name,
        host: proxy.host,
        port: proxy.port,
        username: proxy.username ?? '',
        password: '',
        isActive: proxy.isActive,
      });
    }
  }, [proxy, mode, reset, open]);

  const createMutation = useMutation({
    mutationFn: (values: ProxyFormValues) => createProxy(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['proxies'] });
      toast.custom(
        (t) => (
          <Alert
            variant="mono"
            icon="success"
            onClose={() => toast.dismiss(t)}
          >
            <AlertIcon>
              <RiCheckboxCircleFill />
            </AlertIcon>
            <AlertTitle>Proxy created successfully.</AlertTitle>
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
          <Alert
            variant="mono"
            icon="destructive"
            onClose={() => toast.dismiss(t)}
          >
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
    mutationFn: (values: ProxyFormValues) =>
      updateProxy({
        id: proxyId as string,
        data: values,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['proxies'] });
      toast.custom(
        (t) => (
          <Alert
            variant="mono"
            icon="success"
            onClose={() => toast.dismiss(t)}
          >
            <AlertIcon>
              <RiCheckboxCircleFill />
            </AlertIcon>
            <AlertTitle>Proxy updated successfully.</AlertTitle>
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
          <Alert
            variant="mono"
            icon="destructive"
            onClose={() => toast.dismiss(t)}
          >
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

  const mutation = mode === 'create' ? createMutation : updateMutation;
  const isSubmitting = mutation.isPending;

  const onSubmit = (values: ProxyFormValues) => {
    const payload = {
      ...values,
      password:
        mode === 'edit' && !values.password ? undefined : values.password,
    } as ProxyFormValues;

    mutation.mutate(payload);
  };

  const title = mode === 'create' ? 'Create Proxy' : 'Update Proxy';
  const submitLabel = mode === 'create' ? 'Create Proxy' : 'Update Proxy';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ServerCog className="size-5" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
          {mode === 'edit' && isProxyLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <LoaderCircle className="size-5 animate-spin" />
              <span className="ms-2 text-sm">Loading proxy details...</span>
            </div>
          ) : isError ? (
            <Alert variant="mono" icon="destructive">
              <AlertIcon>
                <AlertCircle className="size-5" />
              </AlertIcon>
              <AlertTitle>{error.message}</AlertTitle>
            </Alert>
          ) : (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-5"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Proxy Name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <FormField
                    control={form.control}
                    name="host"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Host</FormLabel>
                        <FormControl>
                          <Input placeholder="proxy.example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="port"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Port</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            step={1}
                            placeholder="8080"
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="Username" autoComplete="off" {...field} />
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
                            placeholder={mode === 'edit' ? 'Leave blank to keep current' : 'Password'}
                            autoComplete="new-password"
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
                  name="isActive"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Active</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                          <span className="text-sm text-muted-foreground">
                            Enable this proxy for use
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
