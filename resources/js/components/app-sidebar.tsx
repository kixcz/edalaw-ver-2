import { Link, router, usePage } from '@inertiajs/react';
import {
    Archive,
    Bell,
    Building,
    Building2,
    Calendar,
    Clock,
    Columns4,
    Fence,
    FileText,
    Film,
    Flag,
    Folder,
    Heart,
    Key,
    LayoutGrid,
    Link2,
    MessageCircle,
    MessageSquare,
    Monitor,
    PersonStanding,
    Phone,
    Scale,
    Settings,
    Shield,
    Sliders,
    Users,
    Video,
    Warehouse,
} from 'lucide-react';
import { useEffect, useRef } from 'react';

import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import type { NavItem, SharedData } from '@/types';
import AppLogo from './app-logo';

export function AppSidebar() {
    const page = usePage<SharedData>();
    const sidebarRef = useRef<HTMLDivElement>(null);

    if (!page?.props) {
        return null;
    }

    const auth = page.props.auth;
    const userRole = String(auth?.user?.role ?? '');

    // Save scroll position before navigation
    useEffect(() => {
        let isMounted = true;

        const handleStart = () => {
            if (isMounted && sidebarRef.current) {
                const scrollTop = sidebarRef.current.scrollTop;
                localStorage.setItem(
                    'jailOfficerSidebarScrollPosition',
                    scrollTop.toString(),
                );
            }
        };

        router.on('start', handleStart);

        return () => {
            isMounted = false;
            // Note: Inertia v2+ doesn't have router.off(), cleanup happens automatically
        };
    }, []);

    // Restore scroll position after page load
    useEffect(() => {
        const savedPosition = localStorage.getItem(
            'jailOfficerSidebarScrollPosition',
        );
        if (savedPosition && sidebarRef.current) {
            const scrollTop = parseInt(savedPosition, 10);
            // Use setTimeout to ensure the DOM is ready
            setTimeout(() => {
                if (sidebarRef.current) {
                    sidebarRef.current.scrollTop = scrollTop;
                }
            }, 50);
        }
    }, [page.component]); // Restore when page component changes

    const mainNavItems: NavItem[] = [];

    // Role-specific dashboard routes
    const getDashboardRoute = () => {
        if (userRole === 'national') return '/dashboard/national-office';
        if (userRole === 'jail_warden') return '/dashboard/jail-warden';
        if (userRole === 'jail_officer') return '/dashboard/jail-officer';
        if (userRole === 'monitoring_officer')
            return '/dashboard/monitoring-officer';
        if (userRole === 'bjmp_officer') return '/dashboard';
        if (userRole === 'visitor') return '/dashboard';
        if (userRole === 'super_admin') return '/dashboard';
        return '/dashboard';
    };

    if (userRole !== 'visitor' && userRole !== 'super_admin') {
        mainNavItems.push({
            title: 'Dashboard',
            href: getDashboardRoute(),
            icon: LayoutGrid,
        });
    }

    let superAdminNavGroups:
        | Array<{ label: string; items: NavItem[] }>
        | undefined;
    if (userRole === 'super_admin') {
        const unreadAdminCount =
            typeof page.props.unreadAdminNotificationCount === 'number'
                ? page.props.unreadAdminNotificationCount
                : 0;

        superAdminNavGroups = [
            {
                label: 'Main',
                items: [
                    {
                        title: 'Dashboard',
                        href: '/dashboard',
                        icon: LayoutGrid,
                    },
                    {
                        title: 'Notification',
                        href: '/admin/notifications',
                        icon: Bell,
                        badge:
                            unreadAdminCount > 0 ? unreadAdminCount : undefined,
                    },
                ],
            },
            {
                label: 'Services',
                items: [
                    {
                        title: 'Visit',
                        href: '/admin/schedules',
                        icon: Calendar,
                    },
                    {
                        title: 'E-Burol',
                        href: '/admin/eburols',
                        icon: Heart,
                    },
                    {
                        title: 'Appeals',
                        href: '/admin/appeals',
                        icon: Scale,
                    },
                ],
            },
            {
                label: 'Monitoring',
                items: [
                    {
                        title: 'Users',
                        href: '/admin/users',
                        icon: Users,
                    },
                    {
                        title: 'User Sessions',
                        href: '/admin/sessions',
                        icon: Monitor,
                    },
                    // {
                    //     title: 'Call Session',
                    //     href: '/monitoring-officer/assigned-sessions',
                    //     icon: Video,
                    // },
                    // {
                    //     title: 'Video Recordings',
                    //     href: '/monitoring/video-recordings',
                    //     icon: Film,
                    // },
                    // {
                    //     title: 'Chat Archive',
                    //     href: '/monitoring/chat-recordings',
                    //     icon: MessageCircle,
                    // },
                    // {
                    //     title: 'Incident Reporting',
                    //     href: '/admin/incident-reporting',
                    //     icon: Flag,
                    // },
                    // {
                    //     title: 'Inmate Tunnels',
                    //     href: '/admin/inmate-tunnels',
                    //     icon: Link2,
                    // },
                    // {
                    //     title: 'Chat Logs',
                    //     href: '/admin/chat-logs',
                    //     icon: MessageCircle,
                    // },
                ],
            },
            {
                label: 'Administration',
                items: [
                    {
                        title: 'Configuration',
                        href: '/settings/time-slot-capacity',
                        icon: Sliders,
                    },
                    {
                        title: 'System History',
                        href: '/admin/audit-logs',
                        icon: FileText,
                    },
                    {
                        title: 'Settings',
                        href: '/settings',
                        icon: Settings,
                    },
                    {
                        title: 'Feedback',
                        href: '/admin/suggestions',
                        icon: MessageSquare,
                    },
                ],
            },
        ];
    }

    // Visitor navigation with categories
    let visitorNavGroups:
        | Array<{ label: string; items: NavItem[] }>
        | undefined;
    if (userRole === 'visitor') {
        const unreadCount = page.props.unreadNotificationCount || 0;

        visitorNavGroups = [
            {
                label: 'Main',
                items: [
                    {
                        title: 'Dashboard',
                        href: '/dashboard',
                        icon: LayoutGrid,
                    },
                    {
                        title: 'Notification',
                        href: '/visitor/notifications',
                        icon: Bell,
                        badge: unreadCount > 0 ? unreadCount : undefined,
                    },
                ],
            },
            {
                label: 'Applications',
                items: [
                    {
                        title: 'Apply for visit',
                        href: '/visitor/schedule',
                        icon: Calendar,
                    },
                    {
                        title: 'Apply for E-Burol',
                        href: '/visitor/eburol',
                        icon: Heart,
                    },
                    {
                        title: 'Appeal',
                        href: '/visitor/appeals',
                        icon: Scale,
                    },
                ],
            },
            {
                label: 'Logs & Records',
                items: [
                    {
                        title: 'History',
                        href: '/visitor/history',
                        icon: FileText,
                    },
                    {
                        title: 'Call Logs',
                        href: '/visitor/call-logs',
                        icon: Phone,
                    },
                    {
                        title: 'Session',
                        href: '/visitor/sessions',
                        icon: Shield,
                    },
                    {
                        title: 'Tagged Inmates',
                        href: '/visitor/tagged-inmates',
                        icon: Users,
                    },
                    {
                        title: 'Files Archive',
                        href: '/visitor/files-uploaded',
                        icon: Folder,
                    },
                ],
            },
            {
                label: 'Support',
                items: [
                    {
                        title: 'Feedback',
                        href: '/visitor/suggestions',
                        icon: MessageSquare,
                    },
                    {
                        title: 'Settings',
                        href: '/settings',
                        icon: Settings,
                    },
                ],
            },
        ];
    }

    // BJMP Officer navigation with categories
    let bjmpOfficerNavGroups:
        | Array<{ label: string; items: NavItem[] }>
        | undefined;
    if (userRole === 'bjmp_officer') {
        const unreadBjmpCount = page.props.unreadNotificationCount ?? 0;
        bjmpOfficerNavGroups = [
            {
                label: 'Main',
                items: [
                    {
                        title: 'Dashboard',
                        href: '/dashboard',
                        icon: LayoutGrid,
                    },
                    {
                        title: 'Notifications',
                        href: '/bjmp-officer/notifications',
                        icon: Bell,
                        badge:
                            unreadBjmpCount > 0 ? unreadBjmpCount : undefined,
                    },
                ],
            },
            {
                label: 'Services',
                items: [
                    {
                        title: 'E-Burol',
                        href: '/bjmp-officer/eburols',
                        icon: Heart,
                    },
                    {
                        title: 'Visit Schedules',
                        href: '/bjmp-officer/schedules',
                        icon: Calendar,
                    },
                    {
                        title: 'Appeals',
                        href: '/bjmp-officer/appeals',
                        icon: Scale,
                    },
                ],
            },
            {
                label: 'Facility Management',
                items: [
                    {
                        title: 'Cell Management',
                        href: '/bjmp-officer/cells',
                        icon: Building,
                    },
                    {
                        title: 'Inmate Management',
                        href: '/bjmp-officer/inmates',
                        icon: Users,
                    },
                    {
                        title: 'Cell Schedules',
                        href: '/bjmp-officer/cell-schedules',
                        icon: Clock,
                    },
                ],
            },
            {
                label: 'System',
                items: [
                    {
                        title: 'History Logs',
                        href: '/bjmp-officer/audit-logs',
                        icon: FileText,
                    },
                    { title: 'Settings', href: '/settings', icon: Settings },
                ],
            },
        ];
    }

    // Monitoring Officer navigation with categories
    let monitoringOfficerNavGroups:
        | Array<{ label: string; items: NavItem[] }>
        | undefined;
    if (userRole === 'monitoring_officer') {
        const unreadMoCount = page.props.unreadNotificationCount ?? 0;
        monitoringOfficerNavGroups = [
            {
                label: 'Main',
                items: [
                    {
                        title: 'Dashboard',
                        href: '/dashboard/monitoring-officer',
                        icon: LayoutGrid,
                    },
                    {
                        title: 'Assigned Sessions',
                        href: '/monitoring-officer/assigned-sessions',
                        icon: Video,
                    },
                    {
                        title: 'Notifications',
                        href: '/monitoring-officer/notifications',
                        icon: Bell,
                        badge: unreadMoCount > 0 ? unreadMoCount : undefined,
                    },
                ],
            },
            {
                label: 'Archives',
                items: [
                    {
                        title: 'History',
                        href: '/monitoring-officer/history',
                        icon: FileText,
                    },
                    {
                        title: 'Video Recordings',
                        href: '/monitoring-officer/video-recordings',
                        icon: Film,
                    },
                    {
                        title: 'Chat Recordings',
                        href: '/monitoring-officer/chat-recordings',
                        icon: MessageCircle,
                    },
                ],
            },
            {
                label: 'Security',
                items: [
                    {
                        title: 'Incident Reporting',
                        href: '/monitoring-officer/incidents',
                        icon: Flag,
                    },
                    {
                        title: 'Inmate Tunnel',
                        href: '/monitoring-officer/inmate-tunnels',
                        icon: Link2,
                    },
                ],
            },
            {
                label: 'Configuration',
                items: [
                    {
                        title: 'Settings',
                        href: '/settings',
                        icon: Settings,
                    },
                ],
            },
        ];
    }

    // Jail Officer navigation (streamlined - scope-based facility categories)
    let jailOfficerNavGroups:
        | Array<{ label: string; items: NavItem[] }>
        | undefined;
    if (userRole === 'jail_officer') {
        const unreadJailCount = page.props.unreadNotificationCount ?? 0;

        // Get user's active scopes
        const userScopes: any[] = Array.isArray(
            page.props.auth?.user?.assigned_scopes,
        )
            ? page.props.auth.user.assigned_scopes
            : [];
        const activeScopes = userScopes.filter((scope) => scope.is_active);

        // Determine scope levels present (not individual facilities)
        const hasCellScope = activeScopes.some((s) => s.scope_type === 'cell');
        const hasDormitoryScope = activeScopes.some(
            (s) => s.scope_type === 'dormitory',
        );
        const hasBuildingScope = activeScopes.some(
            (s) => s.scope_type === 'building' || s.scope_type === 'annex',
        );

        // Get highest scope level for filtering
        const highestScope = hasBuildingScope
            ? 'building'
            : hasDormitoryScope
              ? 'dormitory'
              : hasCellScope
                ? 'cell'
                : null;

        // Build facility management items based on scope levels
        const facilityItems: NavItem[] = [];

        // Add category-based menus (not individual facilities)
        if (hasBuildingScope || hasDormitoryScope || hasCellScope) {
            // Buildings/Annexes - show if officer has building-level access
            if (hasBuildingScope) {
                facilityItems.push({
                    title: 'Buildings',
                    href: '/jail-officer/annexes',
                    icon: Warehouse,
                });
            }

            // Dormitories - show if officer has dormitory or building level access
            if (hasDormitoryScope || hasBuildingScope) {
                facilityItems.push({
                    title: 'Dormitories',
                    href: '/jail-officer/dormitories',
                    icon: Building,
                });
            }

            // Cells - always show if officer has any scope
            facilityItems.push({
                title: 'Cells',
                href: '/jail-officer/cells-hierarchical',
                icon: Columns4,
            });

            // PDLs Management - always show if officer has any scope
            facilityItems.push({
                title: 'PDL Management',
                href: '/jail-officer/inmates-hierarchical',
                icon: PersonStanding,
            });

            // Cell Schedules - always show if officer has any scope
            facilityItems.push({
                title: 'Cell Schedules',
                href: '/jail-officer/cell-schedules',
                icon: Clock,
            });
        }

        jailOfficerNavGroups = [
            {
                label: 'Main',
                items: [
                    {
                        title: 'Dashboard',
                        href: '/dashboard/jail-officer',
                        icon: LayoutGrid,
                    },
                    {
                        title: 'Notifications',
                        href: '/jail-officer/notifications',
                        icon: Bell,
                        badge:
                            unreadJailCount > 0 ? unreadJailCount : undefined,
                    },
                ],
            },
            {
                label: 'Visit Management',
                items: [
                    {
                        title: 'Assigned Visit Sessions',
                        href: '/jail-officer/assigned-visit-sessions',
                        icon: Calendar,
                    },
                    {
                        title: 'E-Burol Monitoring',
                        href: '/jail-officer/eburol-monitoring',
                        icon: Heart,
                    },
                ],
            },
            {
                label: 'Session Monitoring',
                items: [
                    {
                        title: 'Chat Logs',
                        href: '/jail-officer/chat-logs',
                        icon: MessageCircle,
                    },
                    {
                        title: 'Chat Archive',
                        href: '/jail-officer/chat-recordings',
                        icon: Archive,
                    },
                    {
                        title: 'Inmate Tunnels',
                        href: '/jail-officer/inmate-tunnels',
                        icon: Key,
                    },
                    {
                        title: 'Audit Logs',
                        href: '/jail-officer/audit-logs',
                        icon: FileText,
                    },
                ],
            },
            ...(facilityItems.length > 0
                ? [
                      {
                          label: 'Facility Management',
                          items: facilityItems,
                      },
                  ]
                : []),
            {
                label: 'Configuration',
                items: [
                    {
                        title: 'Settings',
                        href: '/settings',
                        icon: Settings,
                    },
                ],
            },
        ];
    }

    // National Office navigation with management modules
    let nationalOfficeNavGroups:
        | Array<{ label: string; items: NavItem[] }>
        | undefined;
    if (userRole === 'national') {
        nationalOfficeNavGroups = [
            {
                label: 'Main',
                items: [
                    {
                        title: 'Dashboard',
                        href: '/dashboard/national-office',
                        icon: LayoutGrid,
                    },
                ],
            },
            {
                label: 'Administrative Management',
                items: [
                    {
                        title: 'Regions',
                        href: '/national-office/regions',
                        icon: Columns4,
                    },
                    {
                        title: 'Branches',
                        href: '/national-office/branches',
                        icon: Building2,
                    },
                    {
                        title: 'Officers',
                        href: '/national-office/officers',
                        icon: Users,
                    },
                ],
            },
            {
                label: 'Facility Management',
                items: [
                    {
                        title: 'Annexes',
                        href: '/national-office/annexes',
                        icon: Warehouse,
                    },
                    {
                        title: 'Dormitories',
                        href: '/national-office/dormitories',
                        icon: Building,
                    },
                    {
                        title: 'Cells',
                        href: '/national-office/cells',
                        icon: Fence,
                    },
                ],
            },
            {
                label: 'PDL Registry',
                items: [
                    {
                        title: 'PDLs',
                        href: '/national-office/pdls',
                        icon: PersonStanding,
                    },
                ],
            },
        ];
    }

    // Jail Warden navigation with categories
    let jailWardenNavGroups:
        | Array<{ label: string; items: NavItem[] }>
        | undefined;
    if (userRole === 'jail_warden') {
        jailWardenNavGroups = [
            {
                label: 'Main',
                items: [
                    {
                        title: 'Dashboard',
                        href: '/dashboard/jail-warden',
                        icon: LayoutGrid,
                    },
                ],
            },
            {
                label: 'Facility Management',
                items: [
                    {
                        title: 'Annex',
                        href: '/jail-warden/annexes',
                        icon: Warehouse,
                    },
                    {
                        title: 'Dormitory',
                        href: '/jail-warden/dormitories',
                        icon: Building,
                    },
                    {
                        title: 'Cell',
                        href: '/jail-warden/cells',
                        icon: Fence,
                    },
                ],
            },
            {
                label: 'Inmate Management',
                items: [
                    {
                        title: 'PDLs',
                        href: '/jail-warden/pdls',
                        icon: Users,
                    },
                ],
            },
            {
                label: 'Personnel',
                items: [
                    {
                        title: 'Jail Officers',
                        href: '/jail-warden/officers',
                        icon: Users,
                    },
                ],
            },
            {
                label: 'Configuration',
                items: [
                    {
                        title: 'Settings',
                        href: '/settings',
                        icon: Settings,
                    },
                ],
            },
        ];
    }

    return (
        <Sidebar
            ref={sidebarRef}
            collapsible="icon"
            variant="inset"
            className="sidebar-scroll-custom"
        >
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={getDashboardRoute()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                {userRole === 'visitor' && visitorNavGroups ? (
                    <NavMain groups={visitorNavGroups} />
                ) : userRole === 'national' && nationalOfficeNavGroups ? (
                    <NavMain groups={nationalOfficeNavGroups} />
                ) : userRole === 'super_admin' && superAdminNavGroups ? (
                    <NavMain groups={superAdminNavGroups} />
                ) : userRole === 'bjmp_officer' && bjmpOfficerNavGroups ? (
                    <NavMain groups={bjmpOfficerNavGroups} />
                ) : userRole === 'monitoring_officer' &&
                  monitoringOfficerNavGroups ? (
                    <NavMain groups={monitoringOfficerNavGroups} />
                ) : userRole === 'jail_officer' && jailOfficerNavGroups ? (
                    <NavMain groups={jailOfficerNavGroups} />
                ) : userRole === 'jail_warden' && jailWardenNavGroups ? (
                    <NavMain groups={jailWardenNavGroups} />
                ) : (
                    <NavMain items={mainNavItems} />
                )}
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
