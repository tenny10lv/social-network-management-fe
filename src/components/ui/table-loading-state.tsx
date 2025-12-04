'use client';

import { LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TableCell, TableRow } from '@/components/ui/table';

type TableLoadingIndicatorProps = {
  message?: string;
  className?: string;
  iconClassName?: string;
};

function TableLoadingIndicator({ message = 'Loading...', className, iconClassName }: TableLoadingIndicatorProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn('flex items-center justify-center gap-2 text-sm text-muted-foreground', className)}
    >
      <LoaderCircle className={cn('size-4 animate-spin', iconClassName)} />
      <span className="font-medium">{message}</span>
    </div>
  );
}

type TableLoadingStateProps = {
  colSpan: number;
  message?: string;
  cellClassName?: string;
  indicatorClassName?: string;
  iconClassName?: string;
};

function TableLoadingState({
  colSpan,
  message,
  cellClassName,
  indicatorClassName,
  iconClassName,
}: TableLoadingStateProps) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className={cn('px-4 py-10 text-center align-middle', cellClassName)}>
        <TableLoadingIndicator
          message={message}
          className={indicatorClassName}
          iconClassName={iconClassName}
        />
      </TableCell>
    </TableRow>
  );
}

export { TableLoadingIndicator, TableLoadingState };
