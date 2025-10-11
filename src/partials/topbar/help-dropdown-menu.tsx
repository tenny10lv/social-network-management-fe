import { ReactNode } from 'react';
import {
  BookOpen,
  LifeBuoy,
  MessageCircleQuestion,
  PlayCircle,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HelpDropdownMenuProps {
  trigger: ReactNode;
}

export function HelpDropdownMenu({ trigger }: HelpDropdownMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-sm font-semibold text-foreground">
          Help &amp; Support
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a
            href="https://docs.socialnetwork.management/help-center"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2"
          >
            <LifeBuoy className="size-4" />
            Platform knowledge base
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href="https://docs.socialnetwork.management/automation-guides"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2"
          >
            <BookOpen className="size-4" />
            Implementation guides
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href="https://docs.socialnetwork.management/webinars"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2"
          >
            <PlayCircle className="size-4" />
            On-demand training
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a
            href="mailto:support@socialnetwork.management"
            className="flex items-center gap-2"
          >
            <MessageCircleQuestion className="size-4" />
            Contact support
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
