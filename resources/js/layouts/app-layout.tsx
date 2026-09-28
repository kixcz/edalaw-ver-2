import AppSidebarLayout from '@/layouts/app/app-sidebar-layout';
import type { AppLayoutProps } from '@/types';

import { FlashToasts } from '@/components/flash-toasts';

export default function AppLayout({
    children,
    breadcrumbs,
    ...props
}: AppLayoutProps) {
    return (
        <AppSidebarLayout breadcrumbs={breadcrumbs} {...props}>
            <FlashToasts />
            {children}
        </AppSidebarLayout>
    );
}
