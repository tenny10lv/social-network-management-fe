'use client';

import { useCallback, useEffect, useMemo, useState, useId } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RiCheckboxCircleFill } from '@remixicon/react';
import { AlertCircle, LoaderCircle, ServerCog } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
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

const composeProxyString = ({
  host,
  port,
  username,
  password,
}: {
  host?: string | null;
  port?: number | string | null;
  username?: string | null;
  password?: string | null;
}) => {
  const trimmedHost = typeof host === 'string' ? host.trim() : host ? String(host) : '';
  const trimmedUsername =
    typeof username === 'string' ? username.trim() : username ? String(username) : '';
  const trimmedPassword =
    typeof password === 'string' ? password.trim() : password ? String(password) : '';

  let portSegment = '';

  if (typeof port === 'number') {
    portSegment = Number.isFinite(port) ? String(port) : '';
  } else if (typeof port === 'string') {
    portSegment = port.trim();
  }

  if (!trimmedHost && !trimmedUsername && !trimmedPassword && !portSegment) {
    return '';
  }

  const segments = [trimmedHost, portSegment, trimmedUsername, trimmedPassword];

  while (segments.length > 1 && segments[segments.length - 1] === '') {
    segments.pop();
  }

  return segments.join(':');
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
  const [initialPassword, setInitialPassword] = useState('');
  const watchedHost = useWatch({ control: form.control, name: 'host' });
  const watchedPort = useWatch({ control: form.control, name: 'port' });
  const watchedUsername = useWatch({ control: form.control, name: 'username' });
  const watchedPassword = useWatch({ control: form.control, name: 'password' });

  const parseAndApplyProxyString = useCallback(
    (rawValue: string) => {
      const normalized = rawValue.trim();
      const updateOptions = {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      } as const;

      if (!normalized) {
        setValue('host', '', updateOptions);
        setValue('port', undefined as unknown as ProxyFormValues['port'], updateOptions);
        setValue('username', '', updateOptions);
        setValue('password', '', updateOptions);
        return;
      }

      const parts = normalized.split(':');
      const [hostPart = '', portPart = '', usernamePart = '', ...passwordParts] = parts;

      const host = hostPart.trim();
      const portString = portPart.trim();
      const username = usernamePart.trim();
      const password = passwordParts.join(':').trim();
      const parsedPort = Number(portString);
      const sanitizedPort =
        portString === '' || !Number.isFinite(parsedPort) || parsedPort <= 0
          ? undefined
          : parsedPort;

      setValue('host', host, updateOptions);
      setValue('username', username, updateOptions);
      setValue('password', password, updateOptions);
      if (typeof sanitizedPort === 'number') {
        setValue('port', sanitizedPort, updateOptions);
      } else {
        setValue('port', undefined as unknown as ProxyFormValues['port'], updateOptions);
      }
    },
    [setValue],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    const hasDefaultPortOnly =
      (!watchedHost || String(watchedHost).trim() === '') &&
      (!watchedUsername || String(watchedUsername).trim() === '') &&
      (!watchedPassword || String(watchedPassword).trim() === '') &&
      (typeof watchedPort === 'number'
        ? watchedPort === DEFAULT_VALUES.port
        : String(watchedPort ?? '').trim() === String(DEFAULT_VALUES.port));

    if (hasDefaultPortOnly) {
      if (proxyString !== '') {
        setProxyString('');
      }
      return;
    }

    const composed = composeProxyString({
      host: watchedHost,
      port: watchedPort,
      username: watchedUsername,
      password: watchedPassword,
    });

    if (composed !== proxyString) {
      setProxyString(composed);
    }
  }, [
    open,
    watchedHost,
    watchedPort,
    watchedUsername,
    watchedPassword,
    proxyString,
  ]);

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
        setInitialPassword('');
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
        password:
          'password' in proxy && typeof proxy.password === 'string'
            ? proxy.password
            : '',
        isActive: proxy.isActive,
      });
      const existingPassword =
        'password' in proxy && typeof proxy.password === 'string' ? proxy.password : '';
      setInitialPassword(existingPassword ?? '');
      setProxyString(
        composeProxyString({
          host: proxy.host,
          port: proxy.port,
          username: proxy.username ?? '',
          password: existingPassword,
        }),
      );
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
    const shouldOmitPassword =
      mode === 'edit' && (!values.password || values.password === initialPassword);

    const payload = {
      ...values,
      password: shouldOmitPassword ? undefined : values.password,
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
