import { useEffect, useState } from 'react';
import { StoreClientTopbar } from '@/pages/store-client/components/common/topbar';
import { SearchDialog } from '@/partials/dialogs/search/search-dialog';
import { AppsDropdownMenu } from '@/partials/topbar/apps-dropdown-menu';
import { ChatSheet } from '@/partials/topbar/chat-sheet';
import { NotificationsSheet } from '@/partials/topbar/notifications-sheet';
import { UserDropdownMenu } from '@/partials/topbar/user-dropdown-menu';
import {
    Bell,
    LayoutGrid,
    Menu,
    MessageCircleMore,
    Search,
} from 'lucide-react';
import { useLocation } from 'react-router';
import { Link } from 'react-router-dom';
import { toAbsoluteUrl } from '@/lib/helpers';
import { cn } from '@/lib/utils';
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
import { ModuleTopNav } from '@/partials/common/module-top-nav';
import { SidebarMenu } from './sidebar-menu';

export function Header() {
    const [isSidebarSheetOpen, setIsSidebarSheetOpen] = useState(false);

    const { pathname } = useLocation();
    const mobileMode = useIsMobile();

    const scrollPosition = useScrollPosition();
    const headerSticky: boolean = scrollPosition > 0;

    // Close sheet when route changes
    useEffect(() => {
        setIsSidebarSheetOpen(false);
    }, [pathname]);

    return (
        <header
            className={cn(
                'header fixed top-0 z-10 start-0 flex items-stretch shrink-0 border-b border-transparent bg-background end-0 pe-[var(--removed-body-scroll-bar-size,0px)]',
                headerSticky && 'border-b border-border',
            )}
        >
            <Container className="flex flex-col gap-2.5 lg:gap-3 py-2">
                <div className="flex items-center justify-center gap-2 lg:gap-4 h-[100%]">
                    <ModuleTopNav className="mx-0 mb-0" />
                    <div className="flex items-center gap-2.5 lg:hidden">
                        <Link to="/" className="shrink-0">
                            <img
                                src={toAbsoluteUrl('/media/app/mini-logo.svg')}
                                className="h-[25px] w-full"
                                alt="mini-logo"
                            />
                        </Link>
                        {mobileMode && (
                            <Sheet
                                open={isSidebarSheetOpen}
                                onOpenChange={setIsSidebarSheetOpen}
                            >
                                <SheetTrigger asChild>
                                    <Button variant="ghost" mode="icon">
                                        <Menu className="text-muted-foreground/70" />
                                    </Button>
                                </SheetTrigger>
                                <SheetContent
                                    className="p-0 gap-0 w-[275px]"
                                    side="left"
                                    close={false}
                                >
                                    <SheetHeader className="p-0 space-y-0" />
                                    <SheetBody className="p-0 overflow-y-auto">
                                        <SidebarMenu />
                                    </SheetBody>
                                </SheetContent>
                            </Sheet>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        {pathname.startsWith('/store-client') ? (
                            <StoreClientTopbar />
                        ) : (
                            <>
                                {!mobileMode && (
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
                                )}
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
                                <ChatSheet
                                    trigger={
                                        <Button
                                            variant="ghost"
                                            mode="icon"
                                            shape="circle"
                                            className="size-9 hover:bg-primary/10 hover:[&_svg]:text-primary"
                                        >
                                            <MessageCircleMore className="size-4.5!" />
                                        </Button>
                                    }
                                />
                                <AppsDropdownMenu
                                    trigger={
                                        <Button
                                            variant="ghost"
                                            mode="icon"
                                            shape="circle"
                                            className="size-9 hover:bg-primary/10 hover:[&_svg]:text-primary"
                                        >
                                            <LayoutGrid className="size-4.5!" />
                                        </Button>
                                    }
                                />
                                <UserDropdownMenu
                                    trigger={
                                        <img
                                            className="size-9 rounded-full border-2 border-green-500 shrink-0 cursor-pointer"
                                            src={toAbsoluteUrl('/media/avatars/300-2.png')}
                                            alt="User Avatar"
                                        />
                                    }
                                />
                            </>
                        )}
                    </div>
                </div>
            </Container>
        </header>
    );
}
