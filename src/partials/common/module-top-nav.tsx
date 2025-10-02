import { type JSX } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MENU_SIDEBAR } from '@/config/menu.config';
import { MenuItem } from '@/config/types';
import { cn } from '@/lib/utils';
import { useMenu } from '@/hooks/use-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';

interface ModuleTopNavProps {
  className?: string;
}

const getTopLevelItems = (): MenuItem[] => {
  return MENU_SIDEBAR.filter((item) => !('heading' in item)) as MenuItem[];
};

export function ModuleTopNav({ className = '' }: ModuleTopNavProps) {
  const { pathname } = useLocation();
  const { isItemActive } = useMenu(pathname);
  const items = getTopLevelItems();

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="module-top-nav w-full">
      <div
        className={cn(
          'kt-scrollable-x-auto -mx-1 mb-5 flex w-full items-center gap-1 overflow-x-auto px-1',
          className,
        )}
      >
        {items.map((item) => {
          const active = isItemActive(item);
          const Icon = item.icon;
          const hasChildren = !!item.children?.length;

          if (hasChildren) {
            return (
              <DropdownMenu key={item.title}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      'shrink-0 rounded-md border border-transparent px-3 py-2 text-sm font-medium transition-colors',
                      'flex items-center gap-2',
                      active
                        ? 'bg-muted text-primary shadow-sm'
                        : 'text-muted-foreground hover:bg-muted hover:text-primary',
                    )}
                    aria-current={active ? 'page' : undefined}
                  >
                    {Icon && <Icon className="size-4" />}
                    <span>{item.title}</span>
                    <ChevronDown className="size-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[220px]">
                  {renderDropdownItems(item.children || [], isItemActive)}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          }

          return (
            <Link
              key={item.title}
              to={item.path || '#'}
              className={cn(
                'shrink-0 rounded-md border border-transparent px-3 py-2 text-sm font-medium transition-colors',
                'flex items-center gap-2',
                active
                  ? 'bg-muted text-primary shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-primary',
              )}
              aria-current={active ? 'page' : undefined}
            >
              {Icon && <Icon className="size-4" />}
              <span>{item.title}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

const renderDropdownItems = (
  items: MenuItem[],
  isItemActive: (item: MenuItem) => boolean,
): JSX.Element[] => {
  return items.map((item, index) => {
    const active = isItemActive(item);
    const hasChildren = !!item.children?.length;

    if (hasChildren) {
      return (
        <DropdownMenuSub key={`${item.title}-${index}`}>
          <DropdownMenuSubTrigger
            className={cn(
              'flex items-center gap-2 text-sm',
              active ? 'text-primary' : '',
            )}
            disabled={item.disabled}
          >
            <span>{item.title}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="min-w-[220px]">
            {renderDropdownItems(item.children || [], isItemActive)}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      );
    }

    if (!item.path) {
      return null;
    }

    return (
      <DropdownMenuItem
        key={`${item.title}-${index}`}
        className={cn(active ? 'text-primary' : '')}
        disabled={item.disabled}
        asChild
      >
        <Link to={item.path}>{item.title}</Link>
      </DropdownMenuItem>
    );
  });
};
