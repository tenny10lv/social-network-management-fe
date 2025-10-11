'use client';

import { useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CrawledPost, MyThreadsAccount, SentimentLevel } from '../types';
import { Sparkles } from 'lucide-react';

interface PostEditorDialogProps {
  open: boolean;
  post?: CrawledPost | null;
  myAccounts: MyThreadsAccount[];
  intent?: 'edit' | 'publish';
  onOpenChange: (open: boolean) => void;
  onSaveDraft: (postId: string, values: { content: string; topics: string[]; sentiment: SentimentLevel; notes?: string }) => void;
  onPublishNow: (postId: string, values: { content: string; topics: string[]; targetAccountId: string; notes?: string }) => void;
  onOpenSchedule: (postId: string, initialTargetId?: string) => void;
}

interface PostEditorFormValues {
  content: string;
  topics: string;
  targetAccountId: string;
  notes: string;
  sentiment: SentimentLevel;
}

const SENTIMENT_OPTIONS: { value: SentimentLevel; label: string }[] = [
  { value: 'positive', label: 'Positive' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'negative', label: 'Negative' },
];

export function PostEditorDialog({
  open,
  post,
  myAccounts,
  intent = 'edit',
  onOpenChange,
  onSaveDraft,
  onPublishNow,
  onOpenSchedule,
}: PostEditorDialogProps) {
  const primaryAccountId = useMemo(() => myAccounts.find((account) => account.isPrimary)?.id, [myAccounts]);

  const form = useForm<PostEditorFormValues>({
    defaultValues: {
      content: post?.content ?? '',
      topics: post?.topics.join(', ') ?? '',
      targetAccountId: post?.targetAccountId ?? primaryAccountId ?? myAccounts[0]?.id ?? '',
      notes: '',
      sentiment: post?.sentiment ?? 'neutral',
    },
  });

  const { reset, watch } = form;

  useEffect(() => {
    reset({
      content: post?.content ?? '',
      topics: post?.topics.join(', ') ?? '',
      targetAccountId: post?.targetAccountId ?? primaryAccountId ?? myAccounts[0]?.id ?? '',
      notes: '',
      sentiment: post?.sentiment ?? 'neutral',
    });
  }, [myAccounts, post, primaryAccountId, reset]);

  if (!post) {
    return null;
  }

  const topicsValue = watch('topics');

  const submitDraft = (values: PostEditorFormValues) => {
    onSaveDraft(post.id, {
      content: values.content,
      topics: values.topics.split(',').map((topic) => topic.trim()).filter(Boolean),
      sentiment: values.sentiment,
      notes: values.notes ? values.notes : undefined,
    });
  };

  const submitPublish = (values: PostEditorFormValues) => {
    if (!values.targetAccountId) {
      return;
    }
    onPublishNow(post.id, {
      content: values.content,
      topics: values.topics.split(',').map((topic) => topic.trim()).filter(Boolean),
      targetAccountId: values.targetAccountId,
      notes: values.notes ? values.notes : undefined,
    });
  };

  const getTopicCount = () => {
    if (!topicsValue) {
      return 0;
    }
    return topicsValue
      .split(',')
      .map((topic) => topic.trim())
      .filter(Boolean).length;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {intent === 'publish' ? 'Publish Post' : 'Edit Captured Post'}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Captured {format(new Date(post.capturedAt), 'MMM d, yyyy • HH:mm')} • {post.mediaType} • {post.language.toUpperCase()}
          </p>
        </DialogHeader>
        <DialogBody className="space-y-6">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary" className="uppercase">{post.status}</Badge>
            <Badge variant="outline">Sentiment: {post.sentiment}</Badge>
            <Badge variant="outline">Topics: {post.topics.length}</Badge>
            <Badge variant="outline">Engagement: {post.likes.toLocaleString()} likes</Badge>
          </div>
          <Form {...form}>
            <form
              id="watchlist-post-editor"
              className="space-y-6"
              onSubmit={form.handleSubmit(submitDraft)}
            >
              <FormField
                control={form.control}
                name="content"
                rules={{ required: true }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Post copy</FormLabel>
                    <FormControl>
                      <Textarea rows={8} className="resize-none" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="topics"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Topics &amp; tags</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. product-launch, creator-program" {...field} />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">{getTopicCount()} topic{getTopicCount() === 1 ? '' : 's'} linked.</p>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sentiment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sentiment override</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select sentiment" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {SENTIMENT_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="targetAccountId"
                  rules={{ required: true }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Publish to</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select account" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {myAccounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.displayName} ({account.handle})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Internal notes</FormLabel>
                      <FormControl>
                        <Input placeholder="Add scheduling guidance or CTA" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </form>
          </Form>
        </DialogBody>
        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-muted-foreground">
            Use schedule to localize launch windows or publish instantly when trend velocity spikes.
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenSchedule(post.id, form.getValues('targetAccountId'))}
            >
              Schedule
            </Button>
            <Button type="submit" form="watchlist-post-editor" variant="secondary">
              Save draft
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => form.handleSubmit(submitPublish)()}
              className="flex items-center gap-2"
            >
              <Sparkles className="size-4" />
              Publish now
            </Button>
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Close
              </Button>
            </DialogClose>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
