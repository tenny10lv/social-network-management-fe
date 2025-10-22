import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { logAuditEvent, updatePostSentiment } from '@/pages/accounts/watchlist/api';

interface SentimentArgs {
  postId: string;
  sentiment: string;
  accountId: string;
}

export function useSentimentTagging() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ postId, sentiment }: SentimentArgs) => updatePostSentiment(postId, sentiment),
    onSuccess: async (post, variables) => {
      toast.success('Sentiment updated.');
      void queryClient.invalidateQueries({ queryKey: ['watchlistPosts', variables.accountId] });
      await logAuditEvent({
        action: 'update',
        entity: 'watchlist-post',
        entityId: variables.postId,
        metadata: {
          sentiment: variables.sentiment,
        },
      });
    },
  });

  const update = (args: SentimentArgs) => {
    mutation.mutate(args);
  };

  return {
    update,
    isUpdating: mutation.isPending,
    updatingPostId: mutation.variables?.postId,
  };
}
