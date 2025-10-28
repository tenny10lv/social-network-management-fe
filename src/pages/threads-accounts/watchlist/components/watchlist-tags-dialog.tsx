'use client';

import { useEffect, useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { WatchlistAccount } from '../types';

interface WatchlistTagsDialogProps {
  open: boolean;
  account?: WatchlistAccount | null;
  onOpenChange: (open: boolean) => void;
  onSave: (accountId: string, tags: string[]) => void;
}

export function WatchlistTagsDialog({ open, account, onOpenChange, onSave }: WatchlistTagsDialogProps) {
  const [tagsValue, setTagsValue] = useState('');

  useEffect(() => {
    if (account) {
      setTagsValue(account.tags.join(', '));
    } else {
      setTagsValue('');
    }
  }, [account]);

  if (!account) {
    return null;
  }

  const handleSave = () => {
    const tags = tagsValue
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    onSave(account.id, tags);
  };

  const previewTags = tagsValue
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit tags for {account.displayName}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Keep watchlist segments organized so your team knows why this profile matters.
          </p>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="watchlist-tags">Comma separated tags</Label>
            <Input
              id="watchlist-tags"
              value={tagsValue}
              onChange={(event) => setTagsValue(event.target.value)}
              placeholder="e.g. drops, collabs, sustainability"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase text-muted-foreground">Preview</Label>
            <div className="flex flex-wrap gap-1.5">
              {previewTags.length === 0 ? (
                <span className="text-xs text-muted-foreground">No tags defined yet.</span>
              ) : (
                previewTags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs font-medium">
                    {tag}
                  </Badge>
                ))
              )}
            </div>
          </div>
        </DialogBody>
        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <Button type="button" variant="secondary" onClick={handleSave}>
            Save
          </Button>
          <DialogClose asChild>
            <Button type="button" variant="ghost">
              Cancel
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
