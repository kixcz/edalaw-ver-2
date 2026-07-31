import { Link, router, usePage } from '@inertiajs/react';
import { ChevronDown, LogOut, Palette, Shield, User } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';
import { logout } from '@/routes';
import type { SharedData } from '@/types';

function getFullName(user: SharedData['auth']['user']): string {
    const parts = [user.first_name, user.middle_name, user.last_name].filter(Boolean);
    return parts.join(' ') || 'User';
}

export default function HeaderUserDropdown() {
    const { auth } = usePage<SharedData>().props;
    const user = auth.user;
    const getInitials = useInitials();
    const cleanup = useMobileNavigation();
    const fullName = getFullName(user);

    const handleLogout = () => {
        cleanup();
        router.flushAll();
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full border border-input bg-background py-1.5 pl-1.5 pr-3 shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                    aria-label="User menu"
                >
                    <Avatar className="size-7 overflow-hidden rounded-full">
                        <AvatarImage src={user.avatar} alt={fullName} />
                        <AvatarFallback className="rounded-full bg-neutral-200 text-xs text-black dark:bg-neutral-700 dark:text-white">
                            {getInitials(fullName)}
                        </AvatarFallback>
                    </Avatar>
                    <div className="hidden flex-col items-start text-left text-xs leading-tight md:flex">
                        <span className="truncate font-medium text-foreground">{fullName}</span>
                        <span className="truncate text-[10px] text-muted-foreground">{user.email}</span>
                    </div>
                    <ChevronDown className="hidden size-3 text-muted-foreground md:block" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                    <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                        <Avatar className="size-8 overflow-hidden rounded-full">
                            <AvatarImage src={user.avatar} alt={fullName} />
                            <AvatarFallback className="rounded-lg bg-neutral-200 text-black dark:bg-neutral-700 dark:text-white">
                                {getInitials(fullName)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="grid flex-1 text-left text-sm leading-tight">
                            <span className="truncate font-medium">{fullName}</span>
                            <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                        </div>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                        <Link
                            className="block w-full cursor-pointer"
                            href="/settings/profile"
                            prefetch
                            onClick={cleanup}
                        >
                            <User className="mr-2 size-4" />
                            Profile
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link
                            className="block w-full cursor-pointer"
                            href="/settings/password"
                            prefetch
                            onClick={cleanup}
                        >
                            <Shield className="mr-2 size-4" />
                            Security
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link
                            className="block w-full cursor-pointer"
                            href="/settings/appearance"
                            prefetch
                            onClick={cleanup}
                        >
                            <Palette className="mr-2 size-4" />
                            Appearance
                        </Link>
                    </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link
                        className="block w-full cursor-pointer"
                        href={logout()}
                        as="button"
                        onClick={handleLogout}
                    >
                        <LogOut className="mr-2 size-4" />
                        Log out
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
