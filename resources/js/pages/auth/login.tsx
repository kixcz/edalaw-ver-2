import { Head, Link, usePage } from '@inertiajs/react';
import { Eye, EyeOff, ShieldCheck, Moon, Sun } from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { register, home } from '@/routes';
import { useAppearance } from '@/hooks/use-appearance';

type Props = {
    status?: string;
    canResetPassword?: boolean;
    canRegister?: boolean;
    loginUrl?: string;
    forgotPasswordUrl?: string;
    csrfToken?: string;
    oldEmail?: string;
};

export default function Login({
    status,
    canResetPassword = false,
    canRegister = false,
    loginUrl = '/login',
    forgotPasswordUrl = '/password/forgot',
    csrfToken = '',
    oldEmail = '',
}: Props) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState(oldEmail);
    const [password, setPassword] = useState('');
    const [remember, setRemember] = useState(false);
    
    const { resolvedAppearance, updateAppearance } = useAppearance();
    
    const toggleTheme = () => {
        updateAppearance(resolvedAppearance === 'dark' ? 'light' : 'dark');
    };

    const { props } = usePage();
    const errors = (props.errors as Record<string, string> | undefined) ?? {};

    const handleSubmit = (e: React.FormEvent) => {
        setIsSubmitting(true);
        (e.target as HTMLFormElement).submit();
    };

    return (
        <>
            <Head title="Log in" />
            <div className="grid min-h-svh lg:grid-cols-2">
                {/* Left Column - Form (Scrollable) */}
                <div className="flex flex-col gap-4 p-6 md:p-10 overflow-y-auto">
                    {/* Top Bar with Logo and Theme Toggle */}
                    <div className="flex justify-between items-center gap-2 md:justify-between">
                        <Link href={home()} className="flex items-center gap-3 font-medium">
                            <img src="/edalaw_logo.png" alt="eDalaw Logo" className="h-10 w-auto" />
                            <span className="text-xl font-semibold text-foreground">eDalaw</span>
                        </Link>
                        
                        {/* Theme Toggle */}
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-lg border border-border hover:bg-accent transition-colors"
                            aria-label="Toggle theme"
                        >
                            {resolvedAppearance === 'dark' ? (
                                <Sun className="w-5 h-5" />
                            ) : (
                                <Moon className="w-5 h-5" />
                            )}
                        </button>
                    </div>

                    {/* Heading - Above Form Container */}
                    <div className="space-y-2 text-center">
                        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
                        <p className="text-sm text-muted-foreground">
                            Enter your email or contact number and password to log in
                        </p>
                    </div>

                    {/* Form Container */}
                    <div className="flex flex-1 items-center justify-center">
                        <div className="w-full max-w-md">
                            {status && (
                                <div className="mb-6 rounded-lg bg-green-50 p-4 text-sm text-green-800 dark:bg-green-950/20 dark:text-green-400 border border-green-200 dark:border-green-900">
                                    {status}
                                </div>
                            )}

                            {/* Privacy Notice - Top of Form Container */}
                            <div className="mb-6 bg-orange-50 dark:bg-orange-950/20 border-2 border-orange-200 dark:border-orange-800 rounded-xl p-4">
                                <div className="flex items-start gap-3">
                                    <ShieldCheck className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                                    <p className="text-xs text-orange-800 dark:text-orange-200 leading-relaxed">
                                        Login activities are recorded for security, audit, and compliance purposes. Access logs may be retained and reviewed by authorized personnel to protect the integrity and security of the eDalaw system.
                                    </p>
                                </div>
                            </div>

                            <form method="POST" action={loginUrl || '/login'} onSubmit={handleSubmit} className="space-y-6">
                                <input type="hidden" name="_token" value={csrfToken} />
                                
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email or contact number</Label>
                                        <Input
                                            id="email"
                                            name="email"
                                            type="text"
                                            required
                                            autoFocus
                                            autoComplete="username"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="Email or contact number"
                                        />
                                        <InputError
                                            message={
                                                Array.isArray(errors.email)
                                                    ? errors.email[0]
                                                    : errors.email
                                            }
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center">
                                            <Label htmlFor="password">Password</Label>
                                            {canResetPassword && (
                                                <TextLink
                                                    href={forgotPasswordUrl}
                                                    className="ml-auto text-sm"
                                                >
                                                    Forgot password?
                                                </TextLink>
                                            )}
                                        </div>
                                        <div className="relative">
                                            <Input
                                                id="password"
                                                name="password"
                                                type={showPassword ? 'text' : 'password'}
                                                required
                                                autoComplete="current-password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="Password"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                {showPassword ? (
                                                    <EyeOff className="w-4 h-4" />
                                                ) : (
                                                    <Eye className="w-4 h-4" />
                                                )}
                                            </button>
                                        </div>
                                        <InputError
                                            message={
                                                Array.isArray(errors.password)
                                                    ? errors.password[0]
                                                    : errors.password
                                            }
                                        />
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            id="remember"
                                            name="remember"
                                            checked={remember}
                                            onCheckedChange={(checked) => setRemember(checked as boolean)}
                                        />
                                        <Label htmlFor="remember" className="text-sm font-normal">
                                            Remember me
                                        </Label>
                                    </div>
                                </div>

                                <Button type="submit" className="w-full" disabled={isSubmitting}>
                                    {isSubmitting ? (
                                        <>
                                            <Spinner className="mr-2" />
                                            Logging in...
                                        </>
                                    ) : (
                                        'Log in'
                                    )}
                                </Button>

                                <div className="text-center text-sm text-muted-foreground">
                                    Don't have an account?{' '}
                                    {canRegister && (
                                        <TextLink href={register()} tabIndex={4}>
                                            Create account
                                        </TextLink>
                                    )}
                                </div>

                                <div className="text-center text-sm">
                                    <TextLink href="/inmate-tunnel">
                                        Join through secure tunnel
                                    </TextLink>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                {/* Right Column - Cover Image (Fixed) */}
                <div className="relative hidden lg:block">
                    <div className="sticky top-0 h-svh">
                    {/* Orange gradient background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700" />
                    
                    {/* Decorative elements */}
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl" />
                        <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl" />
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-white rounded-full blur-2xl" />
                    </div>
                    
                    {/* Center content */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                        {/* Login Icon */}
                        <div className="mb-8 p-6 bg-white/10 backdrop-blur-sm rounded-3xl border-2 border-white/20">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="w-24 h-24"
                            >
                                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                                <polyline points="10 17 15 12 10 7" />
                                <line x1="15" x2="3" y1="12" y2="12" />
                            </svg>
                        </div>
                        
                        {/* Text */}
                        <h2 className="text-4xl font-bold mb-4 text-center">Welcome to eDalaw</h2>
                        <p className="text-lg text-white/90 text-center max-w-md px-8 leading-relaxed">
                            Secure visitation management platform connecting families with their loved ones
                        </p>
                        
                        {/* Feature highlights */}
                        <div className="mt-12 space-y-3">
                            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm px-6 py-3 rounded-full border border-white/20">
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                                <span className="text-sm font-medium">Virtual & Physical Visits</span>
                            </div>
                            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm px-6 py-3 rounded-full border border-white/20">
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                                <span className="text-sm font-medium">Secure & Encrypted</span>
                            </div>
                            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm px-6 py-3 rounded-full border border-white/20">
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                                <span className="text-sm font-medium">Easy Scheduling</span>
                            </div>
                        </div>
                    </div>
                    </div>
                </div>
            </div>
        </>
    );
}
