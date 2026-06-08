import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import type { AppLayoutProps } from '@/types';

export default function AppSidebarLayout({
    children,
    breadcrumbs = [],
}: AppLayoutProps) {
    return (
        <AppShell variant="sidebar">
            <AppSidebar />
            <AppContent variant="sidebar" className="overflow-x-hidden flex flex-col">
                <AppSidebarHeader breadcrumbs={breadcrumbs} />
                <div className="flex-1">
                    {children}
                </div>
                {/* Privacy Notice Footer */}
                <div className="mt-6 px-6 py-4 border-t border-border bg-muted/30">
                    <p className="text-xs text-muted-foreground text-center leading-relaxed">
                        Personal information collected through this system is processed in accordance with Republic Act No. 10173 (Data Privacy Act of 2012) and will be used only for legitimate, authorized, and proportionate purposes related to the operation of the eDalaw system.
                    </p>
                </div>
            </AppContent>
        </AppShell>
    );
}
