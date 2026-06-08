import { Link } from '@inertiajs/react';
import ThemeToggle from '@/components/theme-toggle';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

export default function AuthSimpleLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    return (
        <div className="flex min-h-screen flex-col bg-background">
            {/* Theme Toggle - Top Right */}
            <div className="absolute top-4 right-4">
                <ThemeToggle />
            </div>
            
            {/* Main Content - Centered */}
            <div className="flex-1 flex items-center justify-center p-6 md:p-10">
                <div className="w-full max-w-4xl">
                    <div className="flex flex-col gap-6">
                        {/* Back to Home Link */}
                        <Link
                            href={home()}
                            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Home
                        </Link>

                        <div className="flex flex-col items-center gap-4">
                            <Link
                                href={home()}
                                className="flex flex-col items-center gap-2 font-medium"
                            >
                                <div className="mb-4 flex items-center justify-center gap-4 md:gap-8">
                                    <img
                                        src="/cids_logo.png"
                                        alt="CIDS Logo"
                                        className="h-20 w-auto object-contain md:h-35"
                                    />
                                    <img
                                        src="/dssc_logo.png"
                                        alt="DSSC Logo"
                                        className="h-18 w-auto object-contain md:h-30"
                                    />
                                    <img
                                        src="/edalaw_logo.png"
                                        alt="EDALaw Logo"
                                        className="h-18 w-auto object-contain md:h-30"
                                    />
                                    <img
                                        src="/bjmp_logo.png"
                                        alt="BJMP Logo"
                                        className="h-18 w-auto object-contain md:h-30"
                                    />
                                </div>
                                <span className="sr-only">{title}</span>
                            </Link>

                            <div className="space-y-2 text-center">
                                <h1 className="text-xl font-medium">{title}</h1>
                                <p className="text-center text-sm text-muted-foreground">
                                    {description}
                                </p>
                            </div>
                        </div>

                        {/* Privacy Notice - Top of Form */}
                        <div className="mx-auto w-full max-w-md">
                            <div className="bg-orange-50 dark:bg-orange-950/20 border-2 border-orange-200 dark:border-orange-800 rounded-xl p-5">
                                <div className="flex items-start gap-3">
                                    <ShieldCheck className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h3 className="text-sm font-semibold text-orange-900 dark:text-orange-100 mb-1">
                                            Privacy Notice
                                        </h3>
                                        <p className="text-xs text-orange-800 dark:text-orange-200 leading-relaxed">
                                            Personal information collected through this form is processed in accordance with Republic Act No. 10173 (Data Privacy Act of 2012) and will be used only for legitimate, authorized, and proportionate purposes related to the operation of the eDalaw system.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
