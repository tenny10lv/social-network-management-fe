import { ReactNode } from 'react';
import { CalendarCheck, CheckCircle2, Clock3, ListTodo } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

interface ActivityItem {
  title: string;
  description: string;
  href?: string;
  badge?: string;
  icon: 'check' | 'calendar' | 'clock';
}

const ICONS: Record<ActivityItem['icon'], ReactNode> = {
  check: <CheckCircle2 className="size-4 text-green-500" />,
  calendar: <CalendarCheck className="size-4 text-blue-500" />,
  clock: <Clock3 className="size-4 text-amber-500" />,
};

const ACTIVITIES: ActivityItem[] = [
  {
    title: 'Review scheduled posts',
    description: '2 Threads posts are awaiting final approval before publishing.',
    href: '/publishing',
    badge: 'Due today',
    icon: 'calendar',
  },
  {
    title: 'Refresh proxy pool health',
    description: 'Run validation on 1 proxy group with degraded uptime.',
    href: '/network/proxies',
    badge: 'Action needed',
    icon: 'check',
  },
  {
    title: 'Sync team onboarding checklist',
    description: 'Invite pending teammates and assign starter roles.',
    href: '/account/members/import-members',
    icon: 'clock',
  },
];

export function ActivitySheet({ trigger }: { trigger: ReactNode }) {
  return (
    <Sheet>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent className="p-0 gap-0 sm:w-[420px] sm:max-w-none inset-5 start-auto h-auto rounded-lg [&_[data-slot=sheet-close]]:top-4.5 [&_[data-slot=sheet-close]]:end-5">
        <SheetHeader className="px-5 py-4 border-b border-border text-start">
          <SheetTitle className="text-base font-semibold">Activity &amp; Tasks</SheetTitle>
          <p className="text-xs text-muted-foreground">
            Stay on top of approvals, reviews, and automation reminders across your workspace.
          </p>
        </SheetHeader>
        <SheetBody className="p-0">
          <div className="divide-y divide-border">
            {ACTIVITIES.map((activity, index) => (
              <div key={`${activity.title}-${index}`} className="px-5 py-4 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 text-muted-foreground">{ICONS[activity.icon]}</span>
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-medium text-foreground">
                        {activity.title}
                      </span>
                      <p className="text-xs text-muted-foreground leading-snug">
                        {activity.description}
                      </p>
                    </div>
                  </div>
                  {activity.badge && (
                    <Badge variant="secondary" size="sm" className="shrink-0">
                      {activity.badge}
                    </Badge>
                  )}
                </div>
                {activity.href && (
                  <Button asChild variant="link" size="sm" className="px-0 self-start text-primary">
                    <Link to={activity.href}>
                      Open task
                    </Link>
                  </Button>
                )}
              </div>
            ))}
          </div>
        </SheetBody>
        <SheetFooter className="px-5 py-3 border-t border-border flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ListTodo className="size-4" />
            <span>View detailed history and workflow automation.</span>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link to="/account/activity">Go to activity</Link>
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
