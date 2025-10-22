import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  logAuditEvent,
  triggerAccountCrawl,
  triggerAccountSync,
} from '@/pages/accounts/watchlist/api';

export type CrawlTriggerMode = 'sync' | 'crawl';

type TriggerArgs = {
  accountId: string;
  mode: CrawlTriggerMode;
};

export function useCrawlTrigger() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ accountId, mode }: TriggerArgs) => {
      if (mode === 'sync') {
        const response = await triggerAccountSync(accountId);
        return { ...response, mode };
      }

      const response = await triggerAccountCrawl(accountId);
      return { ...response, mode };
    },
    onSuccess: async (payload, variables) => {
      toast.success(
        variables.mode === 'sync'
          ? 'Manual sync queued successfully.'
          : 'Crawl refresh started successfully.',
      );

      void queryClient.invalidateQueries({ queryKey: ['watchlistAccounts'] });
      void queryClient.invalidateQueries({ queryKey: ['watchlistPosts', variables.accountId] });
      void queryClient.invalidateQueries({ queryKey: ['watchlistLastCrawl'] });

      await logAuditEvent({
        action: 'update',
        entity: 'watchlist-account',
        entityId: variables.accountId,
        metadata: {
          mode: variables.mode,
          queuedAt: payload?.queuedAt,
          status: payload?.status,
        },
      });
    },
  });

  const trigger = (accountId: string, mode: CrawlTriggerMode) => {
    mutation.mutate({ accountId, mode });
  };

  return {
    trigger,
    triggerSync: (accountId: string) => trigger(accountId, 'sync'),
    triggerCrawl: (accountId: string) => trigger(accountId, 'crawl'),
    isPending: mutation.isPending,
    latestMode: mutation.variables?.mode,
    activeAccountId: mutation.variables?.accountId,
  };
}
