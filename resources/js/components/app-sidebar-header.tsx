import { Link, usePage } from '@inertiajs/react';
import { Bell, MessageSquare } from 'lucide-react';

import { Breadcrumbs } from '@/components/breadcrumbs';
import HeaderUserDropdown from '@/components/header-user-dropdown';
import ThemeSelector from '@/components/theme-selector';
import { Badge } from '@/components/ui/badge';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';
import type { SharedData } from '@/types';

function notificationHref(role: string | undefined): string | null {
    switch (role) {
        case 'visitor':
            return '/visitor/notifications';
        case 'bjmp_officer':
            return '/bjmp-officer/notifications';
        case 'jail_officer':
            return '/jail-officer/notifications';
        case 'monitoring_officer':
            return '/monitoring-officer/notifications';
        case 'super_admin':
            return '/admin/notifications';
        default:
            return null;
    }
}

function unreadCount(page: { props?: Record<string, unknown> }): number {
    if (typeof page.props?.unreadNotificationCount === 'number') {
        return page.props.unreadNotificationCount;
    }
    if (typeof page.props?.unreadAdminNotificationCount === 'number') {
        return page.props.unreadAdminNotificationCount;
    }
    return 0;
}

export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    const page = usePage<SharedData>();
    const role = page.props?.auth?.user?.role;
    const href = notificationHref(role);
    const count = unreadCount(page);

    return (
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-sidebar-border/50 px-6 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-4">
            <div className="flex items-center gap-2">
                <SidebarTrigger className="-ml-1" />
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>
            <div className="flex items-center gap-2">
                {/* Theme Selector */}
                <ThemeSelector />

                {/* Notification Bell */}
                {href && (
                    <Link
                        href={href}
                        className="relative inline-flex size-9 items-center justify-center rounded-full border border-input bg-background text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                        aria-label="Notifications"
                    >
                        <Bell className="size-4" />
                        {count > 0 && (
                            <Badge variant="default" className="absolute -right-1 -top-1 size-4 rounded-full p-0 text-[10px] leading-none">
                                {count > 99 ? '99+' : count}
                            </Badge>
                        )}
                    </Link>
                )}

                {/* Message Icon (visual indicator only) */}
                <div
                    className="relative inline-flex size-9 items-center justify-center rounded-full border border-input bg-background text-sm font-medium shadow-sm"
                    aria-label="Messages"
                >
                    <MessageSquare className="size-4 text-muted-foreground" />
                </div>

                {/* User Dropdown */}
                <HeaderUserDropdown />
            </div>
        </header>
    );
}
