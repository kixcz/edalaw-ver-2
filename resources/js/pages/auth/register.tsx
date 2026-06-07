import { Head, Link, useForm } from '@inertiajs/react';
import * as React from 'react';
import { useRef } from 'react';

import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { login, home } from '@/routes';
import { store } from '@/routes/register';

type Props = {
    visitor_role_id: number;
};

export default function Register({ visitor_role_id }: Props) {
    const form = useForm({
        role_id: String(visitor_role_id),
        first_name: '',
        middle_name: '',
        last_name: '',
        dob: '',
        gender: '',
        email: '',
        contact_number: '',
        street: '',
        brgy: '',
        municipality: '',
        province: '',
        postal_code: '',
        password: '',
        password_confirmation: '',
        id_document_1: null as File | null,
        id_document_2: null as File | null,
        consent_accepted: false,
    });
    const formRef = useRef<HTMLFormElement>(null);
    const [preview1, setPreview1] = React.useState<string | null>(null);
    const [preview2, setPreview2] = React.useState<string | null>(null);

    const handleFileChange = (
        field: 'id_document_1' | 'id_document_2',
        e: React.ChangeEvent<HTMLInputElement>,
        setPreview: React.Dispatch<React.SetStateAction<string | null>>
    ) => {
        const file = e.target.files?.[0];
        if (!file) {
            setPreview(null);
            return;
        }

        // Set form data
        form.setData(field, file);

        // Create preview URL for images
        if (file.type.startsWith('image/')) {
            const objectUrl = URL.createObjectURL(file);
            setPreview(objectUrl);
        } else if (file.type === 'application/pdf') {
            // For PDF, we'll show a PDF icon placeholder
            setPreview('pdf');
        } else {
            setPreview(null);
        }
    };

    const renderFileInput = (
        id: string,
        label: string,
        preview: string | null,
        setPreview: React.Dispatch<React.SetStateAction<string | null>>,
        field: 'id_document_1' | 'id_document_2'
    ) => {
        return (
            <div className="grid gap-2">
                <Label htmlFor={id}>{label}</Label>
                <div className="relative overflow-hidden rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/30 transition-colors hover:border-muted-foreground/40">
                    {!preview ? (
                        <label
                            htmlFor={id}
                            className="flex cursor-pointer flex-col items-center justify-center p-8"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="mb-3 h-12 w-12 text-muted-foreground"
                            >
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="17 8 12 3 7 8" />
                                <line x1="12" x2="12" y1="3" y2="15" />
                            </svg>
                            <p className="mb-1 text-sm font-medium text-foreground">
                                Drag and drop your file here
                            </p>
                            <p className="text-xs text-muted-foreground">
                                or click to browse (PDF, JPG, PNG)
                            </p>
                            <Input
                                id={id}
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                required
                                onChange={(e) => handleFileChange(field, e, setPreview)}
                                className="hidden"
                            />
                        </label>
                    ) : (
                        <div className="relative flex h-48 w-full items-center justify-center">
                            {preview === 'pdf' ? (
                                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="h-16 w-16"
                                    >
                                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                                        <polyline points="14 2 14 8 20 8" />
                                        <path d="M9 15l3 3 3-3" />
                                        <path d="M12 18V12" />
                                    </svg>
                                    <span className="text-sm font-medium">PDF Document</span>
                                </div>
                            ) : (
                                <img
                                    src={preview}
                                    alt="Document preview"
                                    className="h-full w-full object-contain p-2"
                                />
                            )}
                            <button
                                type="button"
                                onClick={() => {
                                    setPreview(null);
                                    form.setData(field, null);
                                    const input = document.getElementById(id);
                                    if (input) (input as HTMLInputElement).value = '';
                                }}
                                className="absolute right-2 top-2 rounded-full bg-destructive p-1.5 text-destructive-foreground opacity-90 transition-opacity hover:opacity-100"
                                title="Remove file"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="h-4 w-4"
                                >
                                    <path d="M18 6 6 18" />
                                    <path d="m6 6 12 12" />
                                </svg>
                            </button>
                        </div>
                    )}
                </div>
                <InputError message={form.errors[field]} />
            </div>
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        form.post(store().url, {
            preserveScroll: true,
            forceFormData: true,
        });
    };

    return (
        <>
            <Head title="Register" />
            <div className="grid min-h-svh lg:grid-cols-2">
                {/* Left Column - Cover Image (Fixed) */}
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
                        {/* Register Icon */}
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
                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <line x1="19" x2="19" y1="8" y2="14" />
                                <line x1="16" x2="22" y1="11" y2="11" />
                            </svg>
                        </div>
                        
                        {/* Text */}
                        <h2 className="text-4xl font-bold mb-4 text-center">Join e-Dalaw</h2>
                        <p className="text-lg text-white/90 text-center max-w-md px-8 leading-relaxed">
                            Create your account to start connecting with your loved ones securely
                        </p>
                        
                        {/* Feature highlights */}
                        <div className="mt-12 space-y-3">
                            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm px-6 py-3 rounded-full border border-white/20">
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                                <span className="text-sm font-medium">Free Account Setup</span>
                            </div>
                            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm px-6 py-3 rounded-full border border-white/20">
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                                <span className="text-sm font-medium">Identity Verification</span>
                            </div>
                            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm px-6 py-3 rounded-full border border-white/20">
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                                <span className="text-sm font-medium">Quick Approval Process</span>
                            </div>
                        </div>
                    </div>
                    </div>
                </div>

                {/* Right Column - Form (Scrollable) */}
                <div className="flex flex-col gap-4 p-6 md:p-10 overflow-y-auto">
                    {/* Logo */}
                    <div className="flex justify-center gap-2 md:justify-end">
                        <Link href={home()} className="flex items-center gap-3 font-medium">
                            <img src="/edalaw_logo.png" alt="e-Dalaw Logo" className="h-10 w-auto" />
                            <span className="text-xl font-semibold text-foreground">e-Dalaw</span>
                        </Link>
                    </div>

                    {/* Heading - Above Form Container */}
                    <div className="space-y-2 text-center">
                        <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
                        <p className="text-sm text-muted-foreground">
                            Enter your details below to create your account
                        </p>
                    </div>

                    {/* Form Container */}
                    <div className="flex flex-1 items-center justify-center">
                        <div className="w-full max-w-2xl">
                            {/* Privacy Notice - Top of Form Container */}
                            <div className="mb-6 bg-orange-50 dark:bg-orange-950/20 border-2 border-orange-200 dark:border-orange-800 rounded-xl p-4">
                                <div className="flex items-start gap-3">
                                    <svg className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                                    </svg>
                                    <p className="text-xs text-orange-800 dark:text-orange-200 leading-relaxed">
                                        Personal information collected through this form is processed in accordance with Republic Act No. 10173 (Data Privacy Act of 2012) and will be used only for legitimate, authorized, and proportionate purposes related to the operation of the e-Dalaw system.
                                    </p>
                                </div>
                            </div>

                            <form
                                ref={formRef}
                                onSubmit={handleSubmit}
                                className="flex flex-col gap-6"
                            >
                <div className="grid gap-6 rounded-lg border p-6">
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Personal Information</h3>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="first_name">First Name</Label>
                                <Input
                                    id="first_name"
                                    type="text"
                                    required
                                    autoFocus
                                    tabIndex={1}
                                    autoComplete="given-name"
                                    name="first_name"
                                    placeholder="First name"
                                    value={form.data.first_name}
                                    onChange={(e) => form.setData('first_name', e.target.value)}
                                />
                                <InputError message={form.errors.first_name} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="middle_name">Middle Name (Optional)</Label>
                                <Input
                                    id="middle_name"
                                    type="text"
                                    tabIndex={2}
                                    autoComplete="additional-name"
                                    name="middle_name"
                                    placeholder="Middle name"
                                    value={form.data.middle_name}
                                    onChange={(e) => form.setData('middle_name', e.target.value)}
                                />
                                <InputError message={form.errors.middle_name} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="last_name">Last Name</Label>
                                <Input
                                    id="last_name"
                                    type="text"
                                    required
                                    tabIndex={3}
                                    autoComplete="family-name"
                                    name="last_name"
                                    placeholder="Last name"
                                    value={form.data.last_name}
                                    onChange={(e) => form.setData('last_name', e.target.value)}
                                />
                                <InputError message={form.errors.last_name} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="gender">Gender</Label>
                                <Select
                                    value={form.data.gender}
                                    onValueChange={(value) => form.setData('gender', value)}
                                >
                                    <SelectTrigger id="gender" tabIndex={4}>
                                        <SelectValue placeholder="Select gender" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="male">Male</SelectItem>
                                        <SelectItem value="female">Female</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                                <InputError message={form.errors.gender} />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="dob">Date of Birth</Label>
                            <Input
                                id="dob"
                                type="date"
                                required
                                tabIndex={5}
                                name="dob"
                                value={form.data.dob}
                                onChange={(e) => form.setData('dob', e.target.value)}
                            />
                            <InputError message={form.errors.dob} />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Contact Information</h3>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    required
                                    tabIndex={6}
                                    autoComplete="email"
                                    name="email"
                                    placeholder="email@example.com"
                                    value={form.data.email}
                                    onChange={(e) => form.setData('email', e.target.value)}
                                />
                                <InputError message={form.errors.email} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="contact_number">Contact Number</Label>
                                <Input
                                    id="contact_number"
                                    type="tel"
                                    tabIndex={7}
                                    autoComplete="tel"
                                    name="contact_number"
                                    placeholder="Contact number"
                                    value={form.data.contact_number}
                                    onChange={(e) => form.setData('contact_number', e.target.value)}
                                />
                                <InputError message={form.errors.contact_number} />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Address</h3>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="street">Street</Label>
                                <Input
                                    id="street"
                                    type="text"
                                    required
                                    tabIndex={8}
                                    autoComplete="street-address"
                                    name="street"
                                    placeholder="Street address"
                                    value={form.data.street}
                                    onChange={(e) => form.setData('street', e.target.value)}
                                />
                                <InputError message={form.errors.street} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="brgy">Barangay</Label>
                                <Input
                                    id="brgy"
                                    type="text"
                                    required
                                    tabIndex={9}
                                    name="brgy"
                                    placeholder="Barangay"
                                    value={form.data.brgy}
                                    onChange={(e) => form.setData('brgy', e.target.value)}
                                />
                                <InputError message={form.errors.brgy} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="municipality">Municipality</Label>
                                <Input
                                    id="municipality"
                                    type="text"
                                    required
                                    tabIndex={10}
                                    name="municipality"
                                    placeholder="Municipality"
                                    value={form.data.municipality}
                                    onChange={(e) => form.setData('municipality', e.target.value)}
                                />
                                <InputError message={form.errors.municipality} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="province">Province</Label>
                                <Input
                                    id="province"
                                    type="text"
                                    required
                                    tabIndex={11}
                                    name="province"
                                    placeholder="Province"
                                    value={form.data.province}
                                    onChange={(e) => form.setData('province', e.target.value)}
                                />
                                <InputError message={form.errors.province} />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="postal_code">Postal Code</Label>
                            <Input
                                id="postal_code"
                                type="text"
                                required
                                tabIndex={12}
                                autoComplete="postal-code"
                                name="postal_code"
                                placeholder="Postal code"
                                value={form.data.postal_code}
                                onChange={(e) => form.setData('postal_code', e.target.value)}
                            />
                            <InputError message={form.errors.postal_code} />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Proof of identity (at least 2)</h3>
                        <p className="text-sm text-muted-foreground">
                            Upload at least two proofs of identity (e.g. valid ID, birth certificate). Accepted: PDF, JPG, PNG (max 5MB each).
                        </p>
                        <div className="grid grid-cols-1 gap-4">
                            {renderFileInput(
                                'id_document_1',
                                'Proof 1 (e.g. Valid ID or Birth Certificate) *',
                                preview1,
                                setPreview1,
                                'id_document_1'
                            )}
                            {renderFileInput(
                                'id_document_2',
                                'Proof 2 (e.g. Valid ID or Birth Certificate) *',
                                preview2,
                                setPreview2,
                                'id_document_2'
                            )}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Account Security</h3>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    required
                                    tabIndex={13}
                                    autoComplete="new-password"
                                    name="password"
                                    placeholder="Password"
                                    value={form.data.password}
                                    onChange={(e) => form.setData('password', e.target.value)}
                                />
                                <InputError message={form.errors.password} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password_confirmation">
                                    Confirm password
                                </Label>
                                <Input
                                    id="password_confirmation"
                                    type="password"
                                    required
                                    tabIndex={14}
                                    autoComplete="new-password"
                                    name="password_confirmation"
                                    placeholder="Confirm password"
                                    value={form.data.password_confirmation}
                                    onChange={(e) => form.setData('password_confirmation', e.target.value)}
                                />
                                <InputError message={form.errors.password_confirmation} />
                            </div>
                        </div>
                    </div>

                    <div className="rounded-lg border-l-4 border-l-orange-500 bg-muted/40 p-5 space-y-3">
                        <div className="flex items-start gap-3">
                            <Checkbox
                                id="consent_accepted"
                                checked={form.data.consent_accepted}
                                onCheckedChange={(checked) => form.setData('consent_accepted', Boolean(checked))}
                                required
                                tabIndex={15}
                                className="mt-1 h-5 w-5"
                            />
                            <Label
                                htmlFor="consent_accepted"
                                className="text-sm font-normal leading-relaxed cursor-pointer"
                            >
                                <span className="text-muted-foreground">I have read, understood, and agree to the </span>
                                <Link href="/privacy-policy" className="text-orange-600 dark:text-orange-400 hover:underline font-medium">
                                    Data Privacy Policy and Terms of Use
                                </Link>
                                <span className="text-muted-foreground">. By creating an e-Dalaw account, I voluntarily provide my personal information and consent to its collection, processing, storage, and use for account registration, identity verification, visitation management, security monitoring, communication, and other legitimate system operations. I understand that my personal data will be processed in accordance with Republic Act No. 10173, otherwise known as the Data Privacy Act of 2012, and applicable institutional policies. I certify that the information I provide is true, accurate, and complete, and I acknowledge that any falsification, misrepresentation, or omission of material information may result in the denial, suspension, or termination of my access to the system and may subject me to applicable administrative, civil, or criminal liabilities.</span>
                            </Label>
                        </div>
                        
                        <InputError message={form.errors.consent_accepted} />
                        
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="h-4 w-4"
                            >
                                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                            Your consent is required to proceed with registration
                        </div>
                    </div>

                    <Button
                        type="submit"
                        className="mt-2 w-full"
                        tabIndex={16}
                        disabled={form.processing || !form.data.consent_accepted}
                        data-test="register-user-button"
                    >
                        {form.processing && <Spinner />}
                        Create account
                    </Button>
                </div>

                <div className="text-center text-sm text-muted-foreground">
                    Already have an account?{' '}
                    <TextLink href={login().url} tabIndex={17}>
                        Log in
                    </TextLink>
                </div>
            </form>
        </div>
    </div>
</div>
            </div>
        </>
    );
}
