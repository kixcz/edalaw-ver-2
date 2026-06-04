import { Head, useForm } from '@inertiajs/react';
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
import AuthLayout from '@/layouts/auth-layout';
import { login } from '@/routes';
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
        privacy_policy_acknowledgment: false,
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
        <AuthLayout
            title="Create an account"
            description="Enter your details below to create your account"
        >
            <Head title="Register" />
            <div className="mx-auto w-full max-w-md">
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

                    <div className="rounded-lg border-l-4 border-l-orange-500 bg-muted/40 p-5 space-y-4">
                        <div className="flex items-start gap-3">
                            <Checkbox
                                id="consent_accepted"
                                checked={form.data.consent_accepted}
                                onCheckedChange={(checked) => form.setData('consent_accepted', Boolean(checked))}
                                required
                                tabIndex={15}
                                className="mt-1 h-5 w-5"
                            />
                            <div className="flex-1 space-y-2">
                                <Label
                                    htmlFor="consent_accepted"
                                    className="text-sm font-normal leading-relaxed cursor-pointer"
                                >
                                    <span className="font-medium text-foreground">Informed Consent:</span>{" "}
                                    <span className="text-muted-foreground">By creating an e-Dalaw account, I voluntarily provide my personal information and consent to its collection, processing, storage, and use for account registration, identity verification, visitation management, security monitoring, communication, and other legitimate system operations. I understand that my personal data will be processed in accordance with Republic Act No. 10173, otherwise known as the Data Privacy Act of 2012, and applicable institutional policies. I certify that the information I provide is true, accurate, and complete, and I acknowledge that any falsification, misrepresentation, or omission of material information may result in the denial, suspension, or termination of my access to the system and may subject me to applicable administrative, civil, or criminal liabilities.</span>
                                </Label>
                                <InputError message={form.errors.consent_accepted} />
                            </div>
                        </div>
                        
                        <div className="flex items-start gap-3">
                            <Checkbox
                                id="privacy_policy_acknowledgment"
                                checked={form.data.privacy_policy_acknowledgment}
                                onCheckedChange={(checked) => form.setData('privacy_policy_acknowledgment', Boolean(checked))}
                                required
                                tabIndex={16}
                                className="mt-1 h-5 w-5"
                            />
                            <div className="flex-1 space-y-2">
                                <Label
                                    htmlFor="privacy_policy_acknowledgment"
                                    className="text-sm font-normal leading-relaxed cursor-pointer"
                                >
                                    <span className="font-medium text-foreground">Data Privacy Policy Acknowledgment:</span>{" "}
                                    <span className="text-muted-foreground">I have read, understood, and agree to the Data Privacy Policy and Terms of Use.</span>
                                </Label>
                                <InputError message={form.errors.privacy_policy_acknowledgment} />
                            </div>
                        </div>
                        
                        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
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
                            Your consent and acknowledgment are required to proceed with registration
                        </div>
                    </div>

                    <Button
                        type="submit"
                        className="mt-2 w-full"
                        tabIndex={17}
                        disabled={form.processing || !form.data.consent_accepted || !form.data.privacy_policy_acknowledgment}
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
        </AuthLayout>
    );
}
