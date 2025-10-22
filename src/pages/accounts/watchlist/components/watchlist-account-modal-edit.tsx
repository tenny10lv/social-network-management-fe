'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { logAuditEvent, updateWatchlistAccount, UpdateWatchlistAccountPayload } from '../api';
import { WatchlistAccount } from '../types';

interface WatchlistAccountModalEditProps {
  open: boolean;
  account: WatchlistAccount | null;
  onOpenChange: (open: boolean) => void;
}

const normalizeTags = (value: string) =>
  value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

export function WatchlistAccountModalEdit({ open, account, onOpenChange }: WatchlistAccountModalEditProps) {
  const queryClient = useQueryClient();
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [riskLevel, setRiskLevel] = useState<WatchlistAccount['riskLevel']>('medium');
  const [tagsInput, setTagsInput] = useState('');

  const tags = useMemo(() => normalizeTags(tagsInput), [tagsInput]);

  useEffect(() => {
    if (open && account) {
      setCategory(account.category ?? '');
      setNote(account.note ?? '');
      setRiskLevel(account.riskLevel);
      setTagsInput(account.tags.join(', '));
    }
  }, [account, open]);

  useEffect(() => {
    if (!open) {
      setCategory('');
      setNote('');
      setRiskLevel('medium');
      setTagsInput('');
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: async (payload: UpdateWatchlistAccountPayload) => {
      if (!account) {
        throw new Error('Missing account');
      }

      const updated = await updateWatchlistAccount(account.id, payload);
      await logAuditEvent({
        action: 'update',
        entity: 'watchlist-account',
        entityId: account.id,
        metadata: payload,
      });
      return updated;
    },
    onSuccess: () => {
      toast.success('Account details updated.');
      void queryClient.invalidateQueries({ queryKey: ['watchlistAccounts'] });
      onOpenChange(false);
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!account || mutation.isPending) {
      return;
    }

    mutation.mutate({
      category,
      note,
      riskLevel,
      tags,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <form onSubmit={handleSubmit} className="space-y-0">
          <DialogHeader>
            <DialogTitle>Edit Watchlist Account</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Update monitoring details, notes, and risk posture for {account?.displayName ?? 'this account'}.
            </p>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="account-category">Category</Label>
              <Input
                id="account-category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                placeholder="e.g. Media & Publishing"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account-risk">Risk level</Label>
              <Select value={riskLevel} onValueChange={(value) => setRiskLevel(value as WatchlistAccount['riskLevel'])}>
                <SelectTrigger id="account-risk">
                  <SelectValue placeholder="Select risk level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="account-tags">Tags</Label>
              <Input
                id="account-tags"
                value={tagsInput}
                onChange={(event) => setTagsInput(event.target.value)}
                placeholder="streetwear, collabs, product-launch"
              />
              <p className="text-xs text-muted-foreground">Separate multiple tags with commas.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="account-note">Internal note</Label>
              <Textarea
                id="account-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Share context for the monitoring team."
                rows={4}
              />
            </div>
          </DialogBody>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <Button type="submit" variant="primary" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Saving
                </span>
              ) : (
                'Save changes'
              )}
            </Button>
            <DialogClose asChild>
              <Button type="button" variant="ghost" disabled={mutation.isPending}>
                Cancel
              </Button>
            </DialogClose>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
