'use client';

import { useEffect, useState } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { logAuditEvent, updateAlertSettings, UpdateAlertSettingsPayload } from '../api';
import { WatchlistAccount } from '../types';

interface AlertSettingsModalProps {
  open: boolean;
  account: WatchlistAccount | null;
  onOpenChange: (open: boolean) => void;
}

export function AlertSettingsModal({ open, account, onOpenChange }: AlertSettingsModalProps) {
  const queryClient = useQueryClient();
  const [notifyOnNewPost, setNotifyOnNewPost] = useState(true);
  const [notifyOnFollowerSpike, setNotifyOnFollowerSpike] = useState(true);
  const [notifyOnEngagementDrop, setNotifyOnEngagementDrop] = useState(false);

  useEffect(() => {
    if (open && account?.alerts) {
      setNotifyOnNewPost(Boolean(account.alerts.notifyOnNewPost));
      setNotifyOnFollowerSpike(Boolean(account.alerts.notifyOnFollowerSpike));
      setNotifyOnEngagementDrop(Boolean(account.alerts.notifyOnEngagementDrop));
    }
  }, [account, open]);

  useEffect(() => {
    if (!open) {
      setNotifyOnNewPost(true);
      setNotifyOnFollowerSpike(true);
      setNotifyOnEngagementDrop(false);
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: async (payload: UpdateAlertSettingsPayload) => {
      if (!account) {
        throw new Error('Missing account');
      }
      const response = await updateAlertSettings(account.id, payload);
      await logAuditEvent({
        action: 'update',
        entity: 'watchlist-account',
        entityId: account.id,
        metadata: { alerts: payload },
      });
      return response;
    },
    onSuccess: () => {
      toast.success('Alert preferences saved.');
      void queryClient.invalidateQueries({ queryKey: ['watchlistAccounts'] });
      onOpenChange(false);
    },
  });

  const handleSave = () => {
    if (!account || mutation.isPending) {
      return;
    }

    mutation.mutate({
      notifyOnNewPost,
      notifyOnFollowerSpike,
      notifyOnEngagementDrop,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Alert Settings</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Configure when the team should be notified about significant changes for {account?.displayName ?? 'this account'}.
          </p>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/40 p-4">
            <div className="space-y-1">
              <Label className="text-sm font-medium">New posts</Label>
              <p className="text-xs text-muted-foreground">Alert whenever a new thread is captured.</p>
            </div>
            <Switch checked={notifyOnNewPost} onCheckedChange={(value) => setNotifyOnNewPost(value)} />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/40 p-4">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Follower spikes</Label>
              <p className="text-xs text-muted-foreground">Notify if daily follower growth exceeds usual patterns.</p>
            </div>
            <Switch checked={notifyOnFollowerSpike} onCheckedChange={(value) => setNotifyOnFollowerSpike(value)} />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/40 p-4">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Engagement drops</Label>
              <p className="text-xs text-muted-foreground">Ping the team when engagement rate falls below target.</p>
            </div>
            <Switch checked={notifyOnEngagementDrop} onCheckedChange={(value) => setNotifyOnEngagementDrop(value)} />
          </div>
        </DialogBody>
        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <Button type="button" variant="primary" onClick={handleSave} disabled={mutation.isPending}>
            {mutation.isPending ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                Saving
              </span>
            ) : (
              'Save preferences'
            )}
          </Button>
          <DialogClose asChild>
            <Button type="button" variant="ghost" disabled={mutation.isPending}>
              Cancel
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
