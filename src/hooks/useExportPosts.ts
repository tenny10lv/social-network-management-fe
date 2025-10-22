import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { exportPosts, ExportPostsPayload } from '@/pages/accounts/watchlist/api';

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

type ExportArgs = ExportPostsPayload & { filename?: string };

export function useExportPosts() {
  const mutation = useMutation({
    mutationFn: async (payload: ExportArgs) => {
      const blob = await exportPosts(payload);
      return { blob, payload };
    },
    onSuccess: ({ blob, payload }) => {
      const extension = payload.format === 'xlsx' ? 'xlsx' : 'csv';
      const filename = payload.filename ?? `crawled-posts.${extension}`;
      downloadBlob(blob, filename);
      toast.success(`Export ready • Saved as ${filename}`);
    },
  });

  return {
    exportPosts: (payload: ExportArgs) => mutation.mutate(payload),
    isExporting: mutation.isPending,
  };
}
