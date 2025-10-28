'use client';

import { useEffect, useMemo, useState } from 'react';
import { addHours, format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { CalendarClock, CalendarDays } from 'lucide-react';
import { CrawledPost, MyThreadsAccount, PublishingTask } from '../types';

interface SchedulePostDialogProps {
  open: boolean;
  post?: CrawledPost | null;
  myAccounts: MyThreadsAccount[];
  task?: PublishingTask | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (payload: { postId: string; targetAccountId: string; scheduledFor: string; notes?: string; taskId?: string }) => void;
}

export function SchedulePostDialog({ open, post, myAccounts, task, onOpenChange, onConfirm }: SchedulePostDialogProps) {
  const primaryAccountId = useMemo(() => myAccounts.find((account) => account.isPrimary)?.id, [myAccounts]);
  const [selectedAccount, setSelectedAccount] = useState(primaryAccountId ?? myAccounts[0]?.id ?? '');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [timeValue, setTimeValue] = useState('09:00');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!post) {
      return;
    }

    const resolvedAccount = post.targetAccountId ?? task?.targetAccountId ?? primaryAccountId ?? myAccounts[0]?.id ?? '';
    setSelectedAccount(resolvedAccount);
    setNotes(task?.notes ?? '');

    if (task?.scheduledFor ?? post.scheduledFor) {
      const scheduledDate = new Date(task?.scheduledFor ?? post.scheduledFor ?? new Date().toISOString());
      setSelectedDate(scheduledDate);
      setTimeValue(format(scheduledDate, 'HH:mm'));
    } else {
      const defaultDate = addHours(new Date(), 2);
      setSelectedDate(defaultDate);
      setTimeValue(format(defaultDate, 'HH:mm'));
    }
  }, [myAccounts, post, primaryAccountId, task]);

  if (!post) {
    return null;
  }

  const handleConfirm = () => {
    if (!selectedDate || !selectedAccount) {
      return;
    }

    const [hours, minutes] = timeValue.split(':').map(Number);
    const combined = new Date(selectedDate);
    combined.setHours(hours ?? 0, minutes ?? 0, 0, 0);

    onConfirm({
      postId: post.id,
      targetAccountId: selectedAccount,
      scheduledFor: combined.toISOString(),
      notes: notes ? notes : undefined,
      taskId: task?.id,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Schedule Post</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Choose the owned account and launch window for republishing.
          </p>
        </DialogHeader>
        <DialogBody className="space-y-6">
          <div className="space-y-3">
            <Label className="text-xs uppercase text-muted-foreground">Captured content</Label>
            <p className="text-sm leading-relaxed text-foreground">{post.content}</p>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              {post.topics.map((topic) => (
                <Badge key={topic} variant="outline" className="text-xs font-medium">
                  #{topic}
                </Badge>
              ))}
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Publish to</Label>
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {myAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.displayName} ({account.handle})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Optional instructions for the publishing queue"
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Go live on</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    mode="input"
                    className={cn('w-full justify-start', !selectedDate && 'text-muted-foreground')}
                  >
                    <CalendarDays className="mr-2 size-4" />
                    {selectedDate ? format(selectedDate, 'MMM d, yyyy') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                    disabled={[{ before: new Date() }]}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Time</Label>
              <div className="relative">
                <CalendarClock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input type="time" value={timeValue} onChange={(event) => setTimeValue(event.target.value)} className="pl-9" />
              </div>
            </div>
          </div>
        </DialogBody>
        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-muted-foreground">
            Times are localized automatically to each Threads account timezone.
          </span>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <Button type="button" variant="secondary" onClick={handleConfirm}>
              Save schedule
            </Button>
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </DialogClose>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
