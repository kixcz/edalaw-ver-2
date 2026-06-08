import { Link } from '@inertiajs/react';
import type { PropsWithChildren } from 'react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { home } from '@/routes';

export default function AuthCardLayout({
    children,
    title,
    description,
}: PropsWithChildren<{
    name?: string;
    title?: string;
    description?: string;
}>) {
    return (
        <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
            <div className="flex w-full max-w-md flex-col gap-6">
                <Link
                    href={home()}
                    className="flex items-center gap-2 self-center font-medium"
                >
                    <div className="flex h-9 w-9 items-center justify-center">
                        <img
                            src="/edalaw_logo.png"
                            alt="EDALaw Logo"
                            className="h-9 w-auto object-contain"
                        />
                    </div>
                </Link>

                <div className="flex flex-col gap-6">
                    <Card className="rounded-xl">
                        <CardHeader className="px-10 pt-8 pb-0 text-center">
                            <CardTitle className="text-xl">{title}</CardTitle>
                            <CardDescription>{description}</CardDescription>
                        </CardHeader>
                        <CardContent className="px-10 py-8">
                            {children}
                        </CardContent>
                    </Card>
                    
                    {/* Privacy Notice Footer */}
                    <div className="max-w-md mx-auto pt-4">
                        <p className="text-xs text-muted-foreground text-center leading-relaxed">
                            Personal information collected through this form is processed in accordance with Republic Act No. 10173 (Data Privacy Act of 2012) and will be used only for legitimate, authorized, and proportionate purposes related to the operation of the eDalaw system.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
