import { Head, router, useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';

import { REGEXP_ONLY_DIGITS } from 'input-otp';
import InputError from '@/components/input-error';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from '@/components/ui/input-otp';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import AuthLayout from '@/layouts/auth-layout';

type Props = {
    email?: string;
    contact_number?: string | null;
    verify_url?: string;
    resend_url?: string;
    title?: string;
    description?: string;
    sent_to_label?: string;
    sent_to_value?: string | null;
    warning?: string;
};

export default function OtpVerification({
    email,
    contact_number,
    verify_url = '/otp-verification/verify',
    resend_url = '/otp-verification/resend',
    title = 'Verify OTP',
    description = 'Enter the 6-digit OTP sent to your contact number',
    sent_to_label,
    sent_to_value,
    warning,
}: Props) {
    const form = useForm({
        otp: '',
        remember: false,
    });

    const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);
    const [lastResendTime, setLastResendTime] = useState<number | null>(null);

    useEffect(() => {
        // Check if there's a stored last resend time in sessionStorage
        const storedTime = sessionStorage.getItem('otp_last_resend_time');
        if (storedTime) {
            const elapsed = Math.floor((Date.now() - parseInt(storedTime)) / 1000);
            const remaining = Math.max(0, 120 - elapsed); // 2 minutes = 120 seconds
            if (remaining > 0) {
                setCooldownSeconds(remaining);
            }
        }

        // Countdown timer
        const interval = setInterval(() => {
            setCooldownSeconds((prev) => {
                if (prev <= 0) return 0;
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post(verify_url, {
            preserveScroll: true,
        });
    };

    const handleResend = () => {
        if (cooldownSeconds > 0) return; // Prevent clicking during cooldown
        
        router.post(resend_url, {}, {
            preserveScroll: true,
            onSuccess: () => {
                form.setData('otp', '');
                // Store the resend time and start cooldown
                const now = Date.now();
                sessionStorage.setItem('otp_last_resend_time', now.toString());
                setLastResendTime(now);
                setCooldownSeconds(120); // 2 minutes cooldown
            },
        });
    };

    const formatCooldownTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <AuthLayout
            title={title}
            description={description}
        >
            <Head title="OTP Verification" />

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div className="grid gap-6 rounded-lg border p-6 max-w-sm mx-auto">
                    {warning && (
                        <Alert variant="destructive">
                            <AlertTitle>OTP delivery issue</AlertTitle>
                            <AlertDescription>{warning}</AlertDescription>
                        </Alert>
                    )}
                    <div className="space-y-2 text-center">
                        <p className="text-sm text-muted-foreground">
                            {description}
                        </p>
                        {sent_to_value ? (
                            <p className="text-sm font-medium">
                                {sent_to_label ? `${sent_to_label}: ${sent_to_value}` : sent_to_value}
                            </p>
                        ) : contact_number ? (
                            <p className="text-sm font-medium">{contact_number}</p>
                        ) : null}
                        {email && (
                            <p className="text-xs text-muted-foreground">
                                Account: {email}
                            </p>
                        )}
                    </div>

                    <div className="flex flex-col items-center gap-4">
                        <Label htmlFor="otp" className="text-center">
                            Enter OTP
                        </Label>
                        <InputOTP
                            id="otp"
                            maxLength={6}
                            value={form.data.otp}
                            onChange={(value) => form.setData('otp', value)}
                            disabled={form.processing}
                            pattern={REGEXP_ONLY_DIGITS}
                        >
                            <InputOTPGroup>
                                <InputOTPSlot index={0} />
                                <InputOTPSlot index={1} />
                                <InputOTPSlot index={2} />
                                <InputOTPSlot index={3} />
                                <InputOTPSlot index={4} />
                                <InputOTPSlot index={5} />
                            </InputOTPGroup>
                        </InputOTP>
                        <InputError message={form.errors.otp} />
                    </div>

                    <div className="flex justify-center">
                        <Button
                            type="submit"
                            className="w-full max-w-xs"
                            disabled={form.processing || form.data.otp.length !== 6}
                        >
                            {form.processing && <Spinner />}
                            Verify OTP
                        </Button>
                    </div>

                    <div className="text-center">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={handleResend}
                            disabled={form.processing || cooldownSeconds > 0}
                            className="text-sm"
                        >
                            {cooldownSeconds > 0 ? (
                                <>
                                    <Spinner className="mr-2 h-4 w-4" />
                                    Resend in {formatCooldownTime(cooldownSeconds)}
                                </>
                            ) : (
                                'Resend OTP'
                            )}
                        </Button>
                    </div>

                    <div className="text-center text-xs text-muted-foreground">
                        <p>Didn't receive the OTP? Check your contact number or try resending.</p>
                        <p className="mt-1">OTP expires in 10 minutes.</p>
                    </div>
                </div>
            </form>
        </AuthLayout>
    );
}

