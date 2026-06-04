import { Head, Link, usePage } from '@inertiajs/react';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import AuthLayout from '@/layouts/auth-layout';
import { register } from '@/routes';
import { home } from '@/routes/public-routes';

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

    const { props } = usePage();
    const errors = (props.errors as Record<string, string> | undefined) ?? {};

    const handleSubmit = (e: React.FormEvent) => {
        setIsSubmitting(true);
        (e.target as HTMLFormElement).submit();
    };

    return (
        <AuthLayout
            title="Log in to your account"
            description="Enter your email or contact number and password below to log in"
        >
            <Head title="Log in" />

            <div className="mx-auto w-full max-w-md">
                {/* Back to Home Link */}
                <Link
                    href={home()}
                    className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-orange-600 transition-colors mb-6"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Home
                </Link>

                <form
                    method="POST"
                    action={loginUrl || '/login'}
                    onSubmit={handleSubmit}
                    className="flex flex-col gap-6"
                >
                    <input type="hidden" name="_token" value={csrfToken} />
                    <div className="grid gap-6 rounded-lg border p-6">
                        <div className="grid gap-2">
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

                        <div className="grid gap-2">
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
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(e.target.value)
                                    }
                                    className="pr-10"
                                />
                                <button
                                    type="button"
                                    tabIndex={-1}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                    onClick={() =>
                                        setShowPassword((prev) => !prev)
                                    }
                                    aria-label={
                                        showPassword
                                            ? 'Hide password'
                                            : 'Show password'
                                    }
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
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

                        <div className="flex items-center space-x-3">
                            <Checkbox
                                id="remember"
                                checked={remember}
                                onCheckedChange={(checked) =>
                                    setRemember(checked === true)
                                }
                            />
                            <input
                                type="hidden"
                                name="remember"
                                value={remember ? '1' : '0'}
                            />
                            <Label htmlFor="remember">Remember me</Label>
                        </div>

                        {(Array.isArray(errors.otp) ? errors.otp[0] : errors.otp) && (
                            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                                {Array.isArray(errors.otp) ? errors.otp[0] : errors.otp}
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="mt-4 w-full"
                            disabled={isSubmitting}
                        >
                            {isSubmitting && <Spinner />}
                            {isSubmitting ? 'Logging in...' : 'Log in'}
                        </Button>

                        {canRegister && (
                        <div className="text-center text-sm text-muted-foreground">
                            Don&apos;t have an account?{' '}
                            <TextLink href={register()}>Sign up</TextLink>
                        </div>
                    )}
                    </div>

                    <div className="text-center text-sm text-muted-foreground">
                        <TextLink href="/inmate-tunnel">Join Secure Tunnel</TextLink>
                    </div>
                </form>
            </div>

            {status && (
                <div className="mb-4 text-center text-sm font-medium text-green-600">
                    {status}
                </div>
            )}
        </AuthLayout>
    );
}
