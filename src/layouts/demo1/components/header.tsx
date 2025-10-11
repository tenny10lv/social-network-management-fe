import { Fragment, useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { Link } from 'react-router-dom';
import {
  Bell,
  ChevronRight,
  LifeBuoy,
  ListCheck,
  Menu,
  Plus,
  Search,
} from 'lucide-react';
import { StoreClientTopbar } from '@/pages/store-client/components/common/topbar';
import { SearchDialog } from '@/partials/dialogs/search/search-dialog';
import { NotificationsSheet } from '@/partials/topbar/notifications-sheet';
import { ActivitySheet } from '@/partials/topbar/activity-sheet';
import { HelpDropdownMenu } from '@/partials/topbar/help-dropdown-menu';
import { UserDropdownMenu } from '@/partials/topbar/user-dropdown-menu';
import { MENU_SIDEBAR } from '@/config/menu.config';
import { type MenuItem } from '@/config/types';
import { toAbsoluteUrl } from '@/lib/helpers';
import { cn } from '@/lib/utils';
import { useMenu } from '@/hooks/use-menu';
import { useIsMobile } from '@/hooks/use-mobile';
import { useScrollPosition } from '@/hooks/use-scroll-position';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Container } from '@/components/common/container';
import { SidebarMenu } from './sidebar-menu';

export function Header() {
  const [isSidebarSheetOpen, setIsSidebarSheetOpen] = useState(false);

  const { pathname } = useLocation();
  const mobileMode = useIsMobile();
  const { getBreadcrumb } = useMenu(pathname);
  const breadcrumbItems = getBreadcrumb(MENU_SIDEBAR).filter(
    (item): item is MenuItem => Boolean(item.title),
  );

  const currentTitle =
    breadcrumbItems.length > 0 ? breadcrumbItems[breadcrumbItems.length - 1].title ?? 'Dashboard' : 'Dashboard';
  const scrollPosition = useScrollPosition();
  const headerSticky: boolean = scrollPosition > 0;
  const isStorefront = pathname.startsWith('/store-client');

  // Close sheet when route changes
  useEffect(() => {
    setIsSidebarSheetOpen(false);
  }, [pathname]);

  const breadcrumbTrail = breadcrumbItems.length > 1 && (
    <nav className="flex items-center gap-1 text-xs text-muted-foreground" aria-label="Breadcrumb">
      {breadcrumbItems.map((item, index) => {
        const last = index === breadcrumbItems.length - 1;
        return (
          <Fragment key={`${item.title}-${index}`}>
            {index > 0 && <ChevronRight className="size-3 text-muted-foreground" aria-hidden="true" />}
            <span
              className={cn(
                'truncate',
                last && 'text-foreground font-medium',
              )}
            >
              {item.title}
            </span>
          </Fragment>
        );
      })}
    </nav>
  );

  return (
    <header
      className={cn(
        'header fixed top-0 z-10 start-0 flex items-stretch shrink-0 border-b border-transparent bg-background end-0 pe-[var(--removed-body-scroll-bar-size,0px)]',
        headerSticky && 'border-b border-border',
      )}
    >
      <Container className="flex flex-col gap-2.5 py-2">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex items-center gap-2.5 lg:hidden">
              <Link to="/" className="shrink-0">
                <img
                  src={toAbsoluteUrl('/media/app/mini-logo.svg')}
                  className="h-[25px] w-full"
                  alt="mini-logo"
                />
              </Link>
              {mobileMode && (
                <Sheet open={isSidebarSheetOpen} onOpenChange={setIsSidebarSheetOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" mode="icon">
                      <Menu className="text-muted-foreground/70" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent className="w-[275px] gap-0 p-0" side="left" close={false}>
                    <SheetHeader className="space-y-0 p-0" />
                    <SheetBody className="overflow-y-auto p-0">
                      <SidebarMenu />
                    </SheetBody>
                  </SheetContent>
                </Sheet>
              )}
            </div>
            {!isStorefront && (
              <div className="flex min-w-0 flex-col gap-1">
                <span className="text-base font-semibold text-foreground leading-tight truncate">
                  {currentTitle}
                </span>
                {breadcrumbTrail}
              </div>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2">
            {!isStorefront && (
              <>
                <Button
                  asChild
                  size="sm"
                  className="hidden gap-2 sm:inline-flex"
                >
                  <Link to="/publishing">
                    <Plus className="size-4" />
                    New Post
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  mode="icon"
                  shape="circle"
                  className="sm:hidden size-9 hover:bg-primary/10 hover:[&_svg]:text-primary"
                >
                  <Link to="/publishing">
                    <Plus className="size-4.5!" />
                  </Link>
                </Button>
              </>
            )}
            <SearchDialog
              trigger={
                <Button
                  variant="ghost"
                  mode="icon"
                  shape="circle"
                  className="size-9 hover:bg-primary/10 hover:[&_svg]:text-primary"
                >
                  <Search className="size-4.5!" />
                </Button>
              }
            />
            <NotificationsSheet
              trigger={
                <Button
                  variant="ghost"
                  mode="icon"
                  shape="circle"
                  className="size-9 hover:bg-primary/10 hover:[&_svg]:text-primary"
                >
                  <Bell className="size-4.5!" />
                </Button>
              }
            />
            <ActivitySheet
              trigger={
                <Button
                  variant="ghost"
                  mode="icon"
                  shape="circle"
                  className="size-9 hover:bg-primary/10 hover:[&_svg]:text-primary"
                >
                  <ListCheck className="size-4.5!" />
                </Button>
              }
            />
            <HelpDropdownMenu
              trigger={
                <Button
                  variant="ghost"
                  mode="icon"
                  shape="circle"
                  className="size-9 hover:bg-primary/10 hover:[&_svg]:text-primary"
                >
                  <LifeBuoy className="size-4.5!" />
                </Button>
              }
            />
            <UserDropdownMenu
              trigger={
                <img
                  className="size-9 shrink-0 cursor-pointer rounded-full border-2 border-green-500"
                  src={toAbsoluteUrl('/media/avatars/300-2.png')}
                  alt="User Avatar"
                />
              }
            />
          </div>
        </div>
        {isStorefront && <StoreClientTopbar />}
      </Container>
    </header>
  );
}
