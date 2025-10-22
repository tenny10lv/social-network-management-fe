'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { RiCheckboxCircleFill } from '@remixicon/react';
import { LoaderCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { createWatchlistAccount } from '../api';

type AddWatchlistAccountDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (payload: { username: string; response: unknown }) => void;
};

const normalizeUsername = (value: string) => value.trim().replace(/^@+/, '');

const buildHandlePreview = (value: string) => {
  const sanitized = normalizeUsername(value);
  return sanitized ? `@${sanitized}` : '';
};

export function AddWatchlistAccountDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddWatchlistAccountDialogProps) {
  const queryClient = useQueryClient();
  const [username, setUsername] = useState('');
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = useMemo(() => buildHandlePreview(username), [username]);

  const mutation = useMutation({
    mutationFn: ({ username: candidate }: { username: string }) =>
      createWatchlistAccount({ username: candidate }),
    onSuccess: (response, variables) => {
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
            <AlertTitle>Watchlist account added successfully.</AlertTitle>
          </Alert>
        ),
        {
          duration: 4000,
        },
      );
      void queryClient.invalidateQueries({ queryKey: ['watchlistAccounts'] });
      onSuccess?.({ username: variables.username, response });
      setUsername('');
      setTouched(false);
      setError(null);
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

  useEffect(() => {
    if (!open) {
      setUsername('');
      setTouched(false);
      setError(null);
    }
  }, [open]);

  const isPending = mutation.isPending;

  const validate = (value: string) => {
    const normalized = normalizeUsername(value);

    if (!normalized) {
      return 'Threads username is required';
    }

    return null;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isPending) {
      return;
    }

    const validationMessage = validate(username);

    if (validationMessage) {
      setError(validationMessage);
      setTouched(true);
      return;
    }

    const normalized = normalizeUsername(username);
    mutation.mutate({ username: normalized });
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    setUsername(nextValue);

    if (!touched) {
      return;
    }

    setError(validate(nextValue));
  };

  const handleBlur = () => {
    if (!touched) {
      setTouched(true);
    }

    setError(validate(username));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <form onSubmit={handleSubmit} className="space-y-0">
          <DialogHeader>
            <DialogTitle>Add Watchlist Account</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Enter the Threads username you want to monitor. We&apos;ll keep an eye on new activity for
              this profile.
            </p>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="watchlist-username">Threads Username</Label>
              <Input
                id="watchlist-username"
                value={username}
                onChange={handleInputChange}
                onBlur={handleBlur}
                placeholder="e.g. urbanthreads"
                disabled={isPending}
                autoFocus
              />
              {handle && (
                <p className="text-xs text-muted-foreground">Handle preview: {handle}</p>
              )}
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </div>
          </DialogBody>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <Button type="submit" variant="primary" disabled={isPending}>
              {isPending ? (
                <span className="inline-flex items-center gap-2">
                  <LoaderCircle className="size-4 animate-spin" />
                  Saving
                </span>
              ) : (
                'Save'
              )}
            </Button>
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </DialogClose>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
