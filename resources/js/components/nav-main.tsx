import { Link } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import type { NavItem } from '@/types';

type NavGroup = {
    label: string;
    items: NavItem[];
};

type NavMainProps = {
    items?: NavItem[];
    groups?: NavGroup[];
};

export function NavMain({ items = [], groups = [] }: NavMainProps) {
    const { isCurrentUrl } = useCurrentUrl();

    // If groups are provided, render groups; otherwise render flat items
    if (groups.length > 0) {
        return (
            <>
                {groups.map((group, groupIndex) => (
                    <SidebarGroup key={groupIndex} className="px-2 py-0">
                        <SidebarGroupLabel className="font-bold text-foreground">{group.label}</SidebarGroupLabel>
                        <SidebarMenu className="w-auto border-l border-border ml-3 pl-2 group-data-[collapsible=icon]:border-none group-data-[collapsible=icon]:ml-0 group-data-[collapsible=icon]:pl-0">
                            {group.items.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={isCurrentUrl(item.href)}
                                        tooltip={{ children: item.title }}
                                    >
                                        <Link href={item.href} prefetch className="w-full">
                                            {item.icon && <item.icon />}
                                            <span className="flex-1">{item.title}</span>
                                            {item.badge !== undefined && item.badge > 0 && (
                                                <Badge variant="default" className="ml-auto bg-blue-500 hover:bg-blue-600">
                                                    {item.badge}
                                                </Badge>
                                            )}
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroup>
                ))}
            </>
        );
    }

    // Default: render flat items with "Platform" label
    return (
        <SidebarGroup className="px-2 py-0">
            <SidebarGroupLabel className="font-bold text-foreground">Platform</SidebarGroupLabel>
            <SidebarMenu className="w-auto border-l border-border ml-3 pl-2 group-data-[collapsible=icon]:border-none group-data-[collapsible=icon]:ml-0 group-data-[collapsible=icon]:pl-0">
                {items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                            asChild
                            isActive={isCurrentUrl(item.href)}
                            tooltip={{ children: item.title }}
                        >
                            <Link href={item.href} prefetch className="w-full">
                                {item.icon && <item.icon />}
                                <span className="flex-1">{item.title}</span>
                                {item.badge !== undefined && item.badge > 0 && (
                                    <Badge variant="default" className="ml-auto bg-blue-500 hover:bg-blue-600">
                                        {item.badge}
                                    </Badge>
                                )}
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
        </SidebarGroup>
    );
}
