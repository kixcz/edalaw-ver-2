import AuthLayoutTemplate from '@/layouts/auth/auth-simple-layout';
import { FlashToasts } from '@/components/flash-toasts';

export default function AuthLayout({
    children,
    title,
    description,
    ...props
}: {
    children: React.ReactNode;
    title: string;
    description: string;
}) {
    return (
        <AuthLayoutTemplate title={title} description={description} {...props}>
            <FlashToasts />
            {children}
        </AuthLayoutTemplate>
    );
}
