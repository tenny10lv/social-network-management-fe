'use client';

import { useCallback, useEffect, useMemo, useState, useId } from 'react';
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
import { Label } from '@/components/ui/label';
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
  const proxyStringInputId = useId();

  const form = useForm<ProxyFormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULT_VALUES,
  });

  const { reset, setValue } = form;
  const [proxyString, setProxyString] = useState('');

  const parseAndApplyProxyString = useCallback(
    (rawValue: string) => {
      const normalized = rawValue.trim();

      if (!normalized) {
        return;
      }

      const parts = normalized.split(':');

      if (parts.length < 4) {
        return;
      }

      const [hostPart, portPart, usernamePart, ...passwordParts] = parts;
      const host = hostPart?.trim();
      const portString = portPart?.trim();
      const username = usernamePart?.trim();
      const password = passwordParts.join(':').trim();

      if (!host || !portString || !username || !password) {
        return;
      }

      const port = Number(portString);

      if (!Number.isInteger(port) || port <= 0) {
        return;
      }

      setValue('host', host, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
      setValue('port', port, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
      setValue('username', username, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
      setValue('password', password, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
    },
    [setValue],
  );

  const handleProxyStringInput = useCallback(
    (value: string) => {
      setProxyString(value);
      parseAndApplyProxyString(value);
    },
    [parseAndApplyProxyString],
  );

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
        setProxyString('');
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
      setProxyString('');
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
                <div className="flex flex-col gap-2.5">
                  <Label htmlFor={proxyStringInputId}>Proxy String</Label>
                  <Input
                    id={proxyStringInputId}
                    placeholder="IP:PORT:USER:PASS"
                    autoComplete="off"
                    value={proxyString}
                    onChange={(event) => handleProxyStringInput(event.target.value)}
                    onPaste={(event) => {
                      event.preventDefault();
                      const pastedText = event.clipboardData?.getData('text') ?? '';
                      handleProxyStringInput(pastedText);
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Paste to auto-fill host, port, username, and password.
                  </p>
                </div>
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
