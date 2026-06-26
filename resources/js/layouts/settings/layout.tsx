import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn, toUrl } from '@/lib/utils';
import { edit as editAppearance } from '@/routes/appearance';
import { edit } from '@/routes/profile';
import { show } from '@/routes/two-factor';
import { edit as editPassword } from '@/routes/user-password';
import type { NavItem, SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import {
    Clock,
    KeyRound,
    MonitorCog,
    Palette,
    ShieldCheck,
    UserRound,
} from 'lucide-react';
import type { PropsWithChildren } from 'react';

export default function SettingsLayout({ children }: PropsWithChildren) {
    const { isCurrentUrl } = useCurrentUrl();
    const page = usePage<SharedData>();
    const userRole = page.props.auth?.user?.role;

    if (typeof window === 'undefined') {
        return null;
    }

    const sidebarNavItems: NavItem[] = [
        {
            title: 'Profile',
            href: edit(),
            icon: UserRound,
        },
        {
            title: 'Password',
            href: editPassword(),
            icon: KeyRound,
        },
        {
            title: 'Two-Factor Auth',
            href: show(),
            icon: ShieldCheck,
        },
        {
            title: 'Appearance',
            href: editAppearance(),
            icon: Palette,
        },
    ];

    if (userRole === 'super_admin') {
        sidebarNavItems.push({
            title: 'Time Slot Capacity',
            href: '/settings/time-slot-capacity',
            icon: Clock,
        });
    }

    return (
        <div className="px-4 py-6 sm:px-6 lg:px-8">
            <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <Heading
                    title="Settings"
                    description="Manage your profile, security, appearance, and account preferences"
                />
                <div className="hidden items-center gap-2 rounded-full border bg-card px-3 py-2 text-xs font-medium text-muted-foreground shadow-sm lg:flex">
                    <MonitorCog className="h-4 w-4" />
                    Account control center
                </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[260px_1fr]">
                <aside className="xl:sticky xl:top-6 xl:self-start">
                    <div className="rounded-2xl border bg-card p-2 shadow-sm">
                        <nav
                            className="grid grid-cols-2 gap-1 sm:grid-cols-4 xl:grid-cols-1"
                            aria-label="Settings"
                        >
                            {sidebarNavItems.map((item, index) => {
                                const active = isCurrentUrl(item.href);

                                return (
                                    <Button
                                        key={`${toUrl(item.href)}-${index}`}
                                        size="sm"
                                        variant="ghost"
                                        asChild
                                        className={cn(
                                            'h-auto justify-start rounded-xl px-3 py-2.5 text-left text-sm',
                                            active &&
                                                'bg-muted text-foreground shadow-sm',
                                        )}
                                    >
                                        <Link href={item.href}>
                                            {item.icon && (
                                                <item.icon className="h-4 w-4 shrink-0" />
                                            )}
                                            <span className="truncate">
                                                {item.title}
                                            </span>
                                        </Link>
                                    </Button>
                                );
                            })}
                        </nav>
                    </div>
                </aside>

                <Separator className="xl:hidden" />

                <div className="min-w-0 flex-1">
                    <section className="w-full space-y-8">{children}</section>
                </div>
            </div>
        </div>
    );
}
