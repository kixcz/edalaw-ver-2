import { Transition } from '@headlessui/react';
import { Form, Head, Link, usePage } from '@inertiajs/react';
import { ShieldCheck, Pencil } from 'lucide-react';
import { useState } from 'react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import DeleteUser from '@/components/delete-user';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { edit } from '@/routes/profile';
import { send } from '@/routes/verification';
import type { BreadcrumbItem, SharedData } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Profile settings',
        href: edit().url,
    },
];

type UserData = {
    first_name: string;
    middle_name: string | null;
    last_name: string;
    email: string;
    contact_number: string | null;
    dob: string | null;
    gender: string | null;
    street: string | null;
    brgy: string | null;
    municipality: string | null;
    province: string | null;
    postal_code: string | null;
    id_document_1_path: string | null;
    id_document_2_path: string | null;
};

export default function Profile({
    mustVerifyEmail,
    status,
    user,
}: {
    mustVerifyEmail: boolean;
    status?: string;
    user: UserData;
}) {
    const { auth } = usePage<SharedData>().props;
    const [showUpdateForm, setShowUpdateForm] = useState(false);

    const formatGender = (gender: string | null) => {
        if (!gender) return 'N/A';
        return gender.charAt(0).toUpperCase() + gender.slice(1);
    };

    const formatDate = (date: string | null) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const formatAddress = () => {
        const parts = [user.street, user.brgy, user.municipality, user.province, user.postal_code].filter(Boolean);
        return parts.length > 0 ? parts.join(', ') : 'N/A';
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Profile settings" />

            <h1 className="sr-only">Profile Settings</h1>

            <SettingsLayout>
                <div className="space-y-6">
                    {/* Privacy Notice */}
                    <div className="bg-orange-50 dark:bg-orange-950/20 border-2 border-orange-200 dark:border-orange-800 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                            <ShieldCheck className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-orange-800 dark:text-orange-200 leading-relaxed">
                                The information provided in this profile will be used for identity verification, account maintenance, communication, and visitation management. Only authorized personnel may access this information for legitimate operational purposes.
                            </p>
                        </div>
                    </div>

                    {/* Personal Information */}
                    <div className="rounded-lg border bg-card">
                        <div className="p-6">
                            <h2 className="text-lg font-semibold mb-4">Personal Information</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <Label className="text-muted-foreground text-sm">First Name</Label>
                                    <p className="text-base font-medium mt-1">{user.first_name || 'N/A'}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground text-sm">Middle Name</Label>
                                    <p className="text-base font-medium mt-1">{user.middle_name || 'N/A'}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground text-sm">Last Name</Label>
                                    <p className="text-base font-medium mt-1">{user.last_name || 'N/A'}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground text-sm">Date of Birth</Label>
                                    <p className="text-base font-medium mt-1">{formatDate(user.dob)}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground text-sm">Gender</Label>
                                    <p className="text-base font-medium mt-1">{formatGender(user.gender)}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground text-sm">Contact Number</Label>
                                    <p className="text-base font-medium mt-1">{user.contact_number || 'N/A'}</p>
                                </div>
                                <div className="md:col-span-2">
                                    <Label className="text-muted-foreground text-sm">Address</Label>
                                    <p className="text-base font-medium mt-1">{formatAddress()}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Submitted IDs */}
                    <div className="rounded-lg border bg-card">
                        <div className="p-6">
                            <h2 className="text-lg font-semibold mb-4">Submitted Identification Documents</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <Label className="text-muted-foreground text-sm">Primary ID</Label>
                                    <div className="mt-2">
                                        {user.id_document_1_path ? (
                                            <a
                                                href={`/storage/${user.id_document_1_path}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                                            >
                                                View Primary ID
                                            </a>
                                        ) : (
                                            <p className="text-sm text-muted-foreground">No document uploaded</p>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground text-sm">Secondary ID</Label>
                                    <div className="mt-2">
                                        {user.id_document_2_path ? (
                                            <a
                                                href={`/storage/${user.id_document_2_path}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                                            >
                                                View Secondary ID
                                            </a>
                                        ) : (
                                            <p className="text-sm text-muted-foreground">No document uploaded</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Update Profile Information Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Heading
                                variant="small"
                                title="Profile information"
                                description="Update your email address"
                            />
                            <Button
                                onClick={() => setShowUpdateForm(!showUpdateForm)}
                                variant="outline"
                                size="sm"
                            >
                                <Pencil className="w-4 h-4 mr-2" />
                                {showUpdateForm ? 'Cancel' : 'Update Profile'}
                            </Button>
                        </div>

                        {showUpdateForm && (
                            <>
                                {/* Privacy Notice for Update Form */}
                                <div className="bg-orange-50 dark:bg-orange-950/20 border-2 border-orange-200 dark:border-orange-800 rounded-xl p-4">
                                    <div className="flex items-start gap-3">
                                        <ShieldCheck className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                                        <p className="text-xs text-orange-800 dark:text-orange-200 leading-relaxed">
                                            Personal information updated through this form will be used solely for maintaining accurate visitor records, identity verification, communication, and authorized visitation activities. All updates will be processed and stored in accordance with the Data Privacy Act of 2012 and applicable institutional policies.
                                        </p>
                                    </div>
                                </div>

                                <Form
                                    {...ProfileController.update.patch()}
                                    options={{
                                        preserveScroll: true,
                                    }}
                                    className="space-y-6"
                                >
                                    {({ processing, recentlySuccessful, errors }) => (
                                        <>
                                            <div className="grid gap-2">
                                                <Label htmlFor="email">Email address</Label>

                                                <Input
                                                    id="email"
                                                    type="email"
                                                    className="mt-1 block w-full"
                                                    defaultValue={auth.user.email}
                                                    name="email"
                                                    required
                                                    autoComplete="username"
                                                    placeholder="Email address"
                                                />

                                                <InputError
                                                    className="mt-2"
                                                    message={errors.email}
                                                />
                                            </div>

                                            {mustVerifyEmail &&
                                                auth.user.email_verified_at === null && (
                                                    <div>
                                                        <p className="-mt-4 text-sm text-muted-foreground">
                                                            Your email address is
                                                            unverified.{' '}
                                                            <Link
                                                                href={send()}
                                                                as="button"
                                                                className="text-foreground underline decoration-neutral-300 underline-offset-4 transition-colors duration-300 ease-out hover:decoration-current! dark:decoration-neutral-500"
                                                            >
                                                                Click here to resend the
                                                                verification email.
                                                            </Link>
                                                        </p>

                                                        {status ===
                                                            'verification-link-sent' && (
                                                            <div className="mt-2 text-sm font-medium text-green-600">
                                                                A new verification link has
                                                                been sent to your email
                                                                address.
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                            <div className="flex items-center gap-4">
                                                <Button
                                                    disabled={processing}
                                                    data-test="update-profile-button"
                                                >
                                                    Save
                                                </Button>

                                                <Transition
                                                    show={recentlySuccessful}
                                                    enter="transition ease-in-out"
                                                    enterFrom="opacity-0"
                                                    leave="transition ease-in-out"
                                                    leaveTo="opacity-0"
                                                >
                                                    <p className="text-sm text-neutral-600">
                                                        Saved
                                                    </p>
                                                </Transition>
                                            </div>
                                        </>
                                    )}
                                </Form>
                            </>
                        )}
                    </div>
                </div>

                <DeleteUser />
            </SettingsLayout>
        </AppLayout>
    );
}
