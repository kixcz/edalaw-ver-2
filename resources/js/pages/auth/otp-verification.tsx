import { Head, router, useForm, Link } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { 
    Mail, 
    Smartphone, 
    ArrowRight, 
    RotateCcw, 
    ShieldCheck, 
    Lock, 
    Shield, 
    UserCheck, 
    FileText, 
    Edit3, 
    ChevronLeft,
    CheckCircle2
} from 'lucide-react';

import InputError from '@/components/input-error';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from '@/components/ui/input-otp';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

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

    // Format masked phone number
    const displayPhone = sent_to_value || contact_number || '0967697****';
    const displayEmail = email || 'panaligankayeantoinette@gmail.com';

    useEffect(() => {
        const storedTime = sessionStorage.getItem('otp_last_resend_time');
        if (storedTime) {
            const elapsed = Math.floor((Date.now() - parseInt(storedTime)) / 1000);
            const remaining = Math.max(0, 120 - elapsed);
            if (remaining > 0) {
                setCooldownSeconds(remaining);
            }
        }

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
        if (cooldownSeconds > 0) return;
        
        router.post(resend_url, {}, {
            preserveScroll: true,
            onSuccess: () => {
                form.setData('otp', '');
                const now = Date.now();
                sessionStorage.setItem('otp_last_resend_time', now.toString());
                setLastResendTime(now);
                setCooldownSeconds(120);
            },
        });
    };

    const formatCooldownTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-between selection:bg-orange-500 selection:text-white">
            <Head title="OTP Verification - eDalaw+" />

            {/* Top Navigation Bar with Logo and Back to Home */}
            <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex aspect-square size-11 items-center justify-center rounded-xl bg-white shadow-xs border border-slate-200/80 p-1">
                        <img
                            src="/edalaw_logo.png"
                            alt="eDalaw Logo"
                            className="size-full object-contain"
                        />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xl font-bold tracking-tight text-slate-900 leading-none">
                            eDalaw+
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium tracking-wide mt-0.5">
                            Bureau of Jail Management and Penology
                        </span>
                    </div>
                </div>

                <Link
                    href="/"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-xs transition-colors"
                >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Back to Home</span>
                </Link>
            </header>

            {/* Main Content: Two Columns */}
            <main className="w-full max-w-7xl mx-auto px-6 py-4 flex-1 flex items-center justify-center">
                <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                    {/* LEFT COLUMN: Visual Presentation & Key Value Props */}
                    <div className="lg:col-span-6 space-y-10">
                        {/* Title & Description */}
                        <div className="space-y-3">
                            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
                                Secure Access <br />
                                to <span className="text-orange-600">eDalaw+</span>
                            </h1>
                            <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-lg">
                                We sent a 6-digit One-Time Password (OTP) to your registered contact number. Please enter the code to continue.
                            </p>
                        </div>

                        {/* Graphic Mockup Area: Phone + OTP Bubble + Shield */}
                        <div className="relative py-4 flex items-center justify-center max-w-md mx-auto lg:mx-0">
                            {/* Decorative background circle gradient */}
                            <div className="absolute w-72 h-72 rounded-full bg-gradient-to-tr from-orange-200/60 to-amber-100/40 blur-2xl -z-10" />

                            <div className="relative w-64 h-72 flex items-center justify-center">
                                {/* Smartphone Frame Vector */}
                                <div className="relative w-44 h-64 bg-slate-900 rounded-[2.5rem] p-2.5 shadow-2xl border-4 border-slate-800">
                                    {/* Notch */}
                                    <div className="w-16 h-3 bg-slate-800 rounded-full mx-auto mb-2" />
                                    {/* Phone Screen */}
                                    <div className="w-full h-[85%] bg-gradient-to-b from-slate-100 to-slate-200 rounded-[1.8rem] flex flex-col items-center justify-center p-3 relative overflow-hidden">
                                        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 mb-2">
                                            <ShieldCheck className="w-5 h-5 text-orange-600" />
                                        </div>
                                        <div className="h-1.5 w-16 bg-slate-300 rounded-full mb-1" />
                                        <div className="h-1.5 w-24 bg-slate-200 rounded-full" />
                                    </div>
                                </div>

                                {/* Floating OTP SMS Bubble */}
                                <div className="absolute -left-6 top-16 bg-white/95 backdrop-blur-sm rounded-2xl p-3.5 shadow-xl border border-slate-200/80 flex items-start gap-3 w-56 animate-in fade-in slide-in-from-left duration-500">
                                    <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center text-white shrink-0 shadow-xs">
                                        <Mail className="w-4 h-4" />
                                    </div>
                                    <div className="space-y-0.5 text-left">
                                        <div className="text-[10px] text-slate-500 font-medium">Your eDalaw+ verification code is:</div>
                                        <div className="text-base font-extrabold tracking-widest text-slate-900 font-mono">123456</div>
                                    </div>
                                </div>

                                {/* Floating Shield Security Badge */}
                                <div className="absolute -right-2 bottom-8 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl p-3.5 shadow-xl text-white flex items-center justify-center">
                                    <Lock className="w-6 h-6 stroke-[2.5]" />
                                </div>
                            </div>
                        </div>

                        {/* 4 Feature/Assurance Badges */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                            {/* Feature 1 */}
                            <div className="space-y-1.5">
                                <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600">
                                    <Lock className="w-4 h-4 text-orange-600" />
                                </div>
                                <div className="text-xs font-bold text-slate-900 leading-tight">Your data is protected</div>
                                <p className="text-[11px] text-slate-500 leading-normal">
                                    We follow the Data Privacy Act of 2012 (RA 10173).
                                </p>
                            </div>

                            {/* Feature 2 */}
                            <div className="space-y-1.5">
                                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                                    <Shield className="w-4 h-4 text-blue-600" />
                                </div>
                                <div className="text-xs font-bold text-slate-900 leading-tight">Secure verification</div>
                                <p className="text-[11px] text-slate-500 leading-normal">
                                    OTP ensures only you can access your account.
                                </p>
                            </div>

                            {/* Feature 3 */}
                            <div className="space-y-1.5">
                                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                                    <UserCheck className="w-4 h-4 text-emerald-600" />
                                </div>
                                <div className="text-xs font-bold text-slate-900 leading-tight">Authorized use only</div>
                                <p className="text-[11px] text-slate-500 leading-normal">
                                    For legitimate, authorized, and official purposes only.
                                </p>
                            </div>

                            {/* Feature 4 */}
                            <div className="space-y-1.5">
                                <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
                                    <FileText className="w-4 h-4 text-purple-600" />
                                </div>
                                <div className="text-xs font-bold text-slate-900 leading-tight">Confidential information</div>
                                <p className="text-[11px] text-slate-500 leading-normal">
                                    Your personal information is kept private and secure.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: The OTP Card */}
                    <div className="lg:col-span-6 flex justify-center lg:justify-end">
                        <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200/90 shadow-xl p-8 sm:p-10 space-y-7">
                            {/* Card Header: Orange Mail Icon + Title */}
                            <div className="text-center space-y-2">
                                <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 mx-auto shadow-xs">
                                    <Mail className="w-7 h-7 text-orange-600" />
                                </div>
                                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                                    {title}
                                </h2>
                                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                                    {description}
                                </p>
                            </div>

                            {/* Privacy Notice Box */}
                            <div className="p-4 bg-orange-50/70 border border-orange-200/80 rounded-2xl text-xs space-y-1.5 text-left">
                                <div className="flex items-center gap-1.5 font-bold text-orange-950">
                                    <ShieldCheck className="w-4 h-4 text-orange-600 shrink-0" />
                                    <span>Privacy Notice</span>
                                </div>
                                <p className="text-slate-600 text-[11px] leading-relaxed">
                                    Personal information collected through this form is processed in accordance with Republic Act No. 10173 (Data Privacy Act of 2012) and will be used only for legitimate, authorized, and proportionate purposes related to the operation of the eDalaw system.
                                </p>
                            </div>

                            {/* Delivery Target Info Box */}
                            <div className="p-3.5 bg-slate-50/80 border border-slate-200/70 rounded-2xl flex items-center justify-between text-xs">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 shrink-0 shadow-2xs">
                                        <Smartphone className="w-4 h-4 text-slate-700" />
                                    </div>
                                    <div className="text-left">
                                        <div className="text-[10px] text-slate-400 font-medium">OTP sent to</div>
                                        <div className="font-bold text-slate-900 text-xs tracking-wider">{displayPhone}</div>
                                        <div className="text-[10px] text-slate-500">Account: {displayEmail}</div>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => router.visit('/profile')}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-orange-600 hover:text-orange-700 bg-white hover:bg-orange-50 border border-orange-200 rounded-lg shadow-2xs transition-colors"
                                >
                                    <Edit3 className="w-3 h-3" />
                                    <span>Edit</span>
                                </button>
                            </div>

                            {/* OTP Form */}
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {warning && (
                                    <Alert variant="destructive">
                                        <AlertTitle>OTP delivery issue</AlertTitle>
                                        <AlertDescription>{warning}</AlertDescription>
                                    </Alert>
                                )}

                                {/* OTP 6 Digits Boxes */}
                                <div className="flex flex-col items-center gap-2">
                                    <InputOTP
                                        id="otp"
                                        maxLength={6}
                                        value={form.data.otp}
                                        onChange={(value) => form.setData('otp', value)}
                                        disabled={form.processing}
                                        pattern={REGEXP_ONLY_DIGITS}
                                    >
                                        <InputOTPGroup className="gap-2.5 sm:gap-3">
                                            {[0, 1, 2, 3, 4, 5].map((idx) => (
                                                <InputOTPSlot
                                                    key={idx}
                                                    index={idx}
                                                    className={cn(
                                                        "w-11 h-12 sm:w-12 sm:h-14 text-lg font-bold rounded-xl border border-slate-200 bg-slate-50/60 transition-all",
                                                        "first:rounded-xl last:rounded-xl",
                                                        form.data.otp.length === idx && "border-orange-500 ring-2 ring-orange-400/20 bg-white"
                                                    )}
                                                />
                                            ))}
                                        </InputOTPGroup>
                                    </InputOTP>
                                    <InputError message={form.errors.otp} className="text-center mt-1" />
                                </div>

                                {/* Verify OTP Button */}
                                <Button
                                    type="submit"
                                    disabled={form.processing || form.data.otp.length !== 6}
                                    className="w-full h-12 bg-orange-600 hover:bg-orange-500 text-white font-bold text-sm rounded-xl shadow-xs gap-2 transition-all"
                                >
                                    {form.processing ? (
                                        <Spinner className="w-4 h-4 text-white" />
                                    ) : (
                                        <>
                                            <span>Verify OTP</span>
                                            <ArrowRight className="w-4 h-4" />
                                        </>
                                    )}
                                </Button>

                                {/* Divider or */}
                                <div className="relative flex items-center justify-center">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-slate-200" />
                                    </div>
                                    <span className="relative bg-white px-3 text-[11px] font-medium text-slate-400 uppercase">
                                        or
                                    </span>
                                </div>

                                {/* Resend OTP Button */}
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleResend}
                                    disabled={form.processing || cooldownSeconds > 0}
                                    className="w-full h-11 text-xs font-bold text-orange-600 border border-orange-200 hover:bg-orange-50/60 rounded-xl gap-2 shadow-2xs transition-colors"
                                >
                                    {cooldownSeconds > 0 ? (
                                        <>
                                            <Spinner className="w-3.5 h-3.5 text-orange-600" />
                                            <span>Resend in {formatCooldownTime(cooldownSeconds)}</span>
                                        </>
                                    ) : (
                                        <>
                                            <RotateCcw className="w-3.5 h-3.5 text-orange-600" />
                                            <span>Resend OTP</span>
                                        </>
                                    )}
                                </Button>

                                {/* Help & Expiration Notice */}
                                <div className="text-center space-y-1 text-slate-400 text-[11px]">
                                    <p>Didn't receive the OTP? Check your contact number or try resending.</p>
                                    <p className="font-medium text-slate-500">OTP expires in 10 minutes.</p>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </main>

            {/* Simple Clean Footer */}
            <footer className="w-full py-4 text-center text-xs text-slate-400 border-t border-slate-100">
                &copy; {new Date().getFullYear()} eDalaw+ Bureau of Jail Management and Penology. All rights reserved.
            </footer>
        </div>
    );
}
