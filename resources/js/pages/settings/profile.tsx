import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import DeleteUser from '@/components/delete-user';
import InputError from '@/components/input-error';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { edit } from '@/routes/profile';
import { send } from '@/routes/verification';
import type { BreadcrumbItem } from '@/types';
import { Transition } from '@headlessui/react';
import { Form, Head, Link } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import {
    BadgeCheck,
    CalendarDays,
    CheckCircle2,
    ClipboardCheck,
    FileText,
    Fingerprint,
    Globe2,
    Home,
    IdCard,
    LockKeyhole,
    Mail,
    MapPin,
    Pencil,
    Phone,
    Settings,
    ShieldCheck,
    Sparkles,
    UserRound,
    Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Profile settings',
        href: edit().url,
    },
];

type UserData = {
    name: string | null;
    first_name: string | null;
    middle_name: string | null;
    last_name: string | null;
    email: string;
    email_verified_at: string | null;
    two_factor_enabled: boolean;
    role: string | null;
    role_name: string | null;
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

type RoleMeta = {
    label: string;
    eyebrow: string;
    description: string;
    badgeClass: string;
    accentClass: string;
    chips: string[];
};

type InfoItem = {
    label: string;
    value: string;
    icon: LucideIcon;
};

const roleProfiles: Record<string, RoleMeta> = {
    visitor: {
        label: 'Visitor',
        eyebrow: 'Visitor Profile',
        description:
            'Identity, contact, and visitation-ready details for secure visit coordination.',
        badgeClass:
            'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300',
        accentClass: 'from-emerald-500/20 via-teal-500/10 to-sky-500/20',
        chips: ['Visit ready', 'Identity review', 'Communication'],
    },
    jail_officer: {
        label: 'Jail Officer',
        eyebrow: 'Operations Profile',
        description:
            'Operational identity for assigned facilities, monitoring duties, and visit handling.',
        badgeClass:
            'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300',
        accentClass: 'from-blue-500/20 via-cyan-500/10 to-slate-500/20',
        chips: ['Facility operations', 'Monitoring', 'Approvals'],
    },
    bjmp_officer: {
        label: 'Jail Warden',
        eyebrow: 'Facility Leadership Profile',
        description:
            'Branch and facility oversight identity for managing officers, PDLs, and schedules.',
        badgeClass:
            'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300',
        accentClass: 'from-indigo-500/20 via-slate-500/10 to-blue-500/20',
        chips: ['Facility oversight', 'Branch scope', 'Officer management'],
    },
    jail_warden: {
        label: 'Jail Warden',
        eyebrow: 'Facility Leadership Profile',
        description:
            'Branch and facility oversight identity for managing officers, PDLs, and schedules.',
        badgeClass:
            'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300',
        accentClass: 'from-indigo-500/20 via-slate-500/10 to-blue-500/20',
        chips: ['Facility oversight', 'Branch scope', 'Officer management'],
    },
    national_office: {
        label: 'National Office',
        eyebrow: 'National Oversight Profile',
        description:
            'National-level profile for policy oversight, reporting, and facility governance.',
        badgeClass:
            'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-300',
        accentClass: 'from-violet-500/20 via-fuchsia-500/10 to-slate-500/20',
        chips: ['National oversight', 'Reporting', 'Governance'],
    },
    super_admin: {
        label: 'National Office',
        eyebrow: 'System Administration Profile',
        description:
            'National administration profile for platform oversight and system configuration.',
        badgeClass:
            'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-300',
        accentClass: 'from-violet-500/20 via-fuchsia-500/10 to-slate-500/20',
        chips: ['System oversight', 'Configuration', 'Governance'],
    },
};

function normalizeRole(role: string | null, roleName: string | null) {
    return String(role || roleName || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/-/g, '_');
}

function getRoleMeta(user: UserData): RoleMeta {
    const normalizedRole = normalizeRole(user.role, user.role_name);

    return (
        roleProfiles[normalizedRole] || {
            label: user.role_name || 'Account Holder',
            eyebrow: 'Account Profile',
            description:
                'Your account details, verification status, contact information, and security controls.',
            badgeClass:
                'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300',
            accentClass: 'from-slate-500/20 via-zinc-500/10 to-neutral-500/20',
            chips: ['Account details', 'Verification', 'Security'],
        }
    );
}

function valueOrFallback(value: string | null | undefined) {
    return value && value.trim() ? value : 'Not provided';
}

function formatGender(gender: string | null) {
    if (!gender) return 'Not provided';

    return gender.charAt(0).toUpperCase() + gender.slice(1);
}

function formatDate(date: string | null) {
    if (!date) return 'Not provided';

    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

function formatAddress(user: UserData) {
    const parts = [
        user.street,
        user.brgy,
        user.municipality,
        user.province,
        user.postal_code,
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(', ') : 'Not provided';
}

function getInitials(user: UserData) {
    const source =
        [user.first_name, user.last_name].filter(Boolean).join(' ') ||
        user.name ||
        user.email;

    return source
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('');
}

function getFullName(user: UserData) {
    const parts = [user.first_name, user.middle_name, user.last_name].filter(
        Boolean,
    );

    return parts.length > 0 ? parts.join(' ') : user.name || user.email;
}

function calculateProfileCompletion(user: UserData) {
    const fields = [
        user.first_name,
        user.last_name,
        user.email,
        user.contact_number,
        user.dob,
        user.gender,
        user.street,
        user.brgy,
        user.municipality,
        user.province,
        user.postal_code,
        user.id_document_1_path,
        user.id_document_2_path,
    ];
    const completed = fields.filter(Boolean).length;

    return Math.round((completed / fields.length) * 100);
}

function InfoRow({ icon: Icon, label, value }: InfoItem) {
    return (
        <div className="flex items-start gap-3 rounded-xl border bg-background/80 p-3">
            <div className="rounded-lg bg-muted p-2 text-muted-foreground">
                <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {label}
                </p>
                <p className="mt-1 text-sm font-medium break-words text-foreground">
                    {value}
                </p>
            </div>
        </div>
    );
}

function FieldCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl border bg-background/80 p-4">
            <Label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {label}
            </Label>
            <p className="mt-2 text-sm font-semibold text-foreground">
                {value}
            </p>
        </div>
    );
}

function DocumentCard({ label, path }: { label: string; path: string | null }) {
    return (
        <div className="rounded-xl border bg-background/80 p-4">
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-muted p-2 text-muted-foreground">
                        <IdCard className="h-4 w-4" />
                    </div>
                    <div>
                        <p className="font-medium text-foreground">{label}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {path
                                ? 'Submitted for verification'
                                : 'No document uploaded'}
                        </p>
                    </div>
                </div>
                {path ? (
                    <Button variant="outline" size="sm" asChild>
                        <a
                            href={`/storage/${path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            View
                        </a>
                    </Button>
                ) : (
                    <Badge variant="outline">Missing</Badge>
                )}
            </div>
        </div>
    );
}

export default function Profile({
    mustVerifyEmail,
    status,
    user,
}: {
    mustVerifyEmail: boolean;
    status?: string;
    user: UserData;
}) {
    const [showUpdateForm, setShowUpdateForm] = useState(false);
    const roleMeta = getRoleMeta(user);
    const profileCompletion = calculateProfileCompletion(user);
    const fullName = getFullName(user);
    const documentsSubmitted = [
        user.id_document_1_path,
        user.id_document_2_path,
    ].filter(Boolean).length;
    const isEmailVerified = Boolean(user.email_verified_at);

    const contactItems = useMemo<InfoItem[]>(
        () => [
            {
                label: 'Email address',
                value: user.email,
                icon: Mail,
            },
            {
                label: 'Contact number',
                value: valueOrFallback(user.contact_number),
                icon: Phone,
            },
            {
                label: 'Location',
                value: formatAddress(user),
                icon: MapPin,
            },
        ],
        [user],
    );

    const capabilityChips = [
        isEmailVerified ? 'Verified email' : 'Email pending',
        user.two_factor_enabled ? '2FA enabled' : '2FA available',
        ...roleMeta.chips,
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Profile settings" />

            <h1 className="sr-only">Profile Settings</h1>

            <SettingsLayout>
                <div className="space-y-6">
                    <div className="overflow-hidden rounded-3xl border bg-card shadow-sm">
                        <div
                            className={`bg-gradient-to-br ${roleMeta.accentClass} px-6 py-8 sm:px-8`}
                        >
                            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                                <div className="space-y-3">
                                    <Badge
                                        variant="outline"
                                        className="border-background/70 bg-background/80 text-foreground shadow-sm backdrop-blur"
                                    >
                                        {roleMeta.eyebrow}
                                    </Badge>
                                    <div>
                                        <h2 className="text-3xl font-semibold tracking-tight text-foreground">
                                            Profile Page
                                        </h2>
                                        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                                            {roleMeta.description}
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    onClick={() =>
                                        setShowUpdateForm((current) => !current)
                                    }
                                    variant="secondary"
                                    className="w-full justify-center bg-background/90 shadow-sm backdrop-blur sm:w-auto"
                                >
                                    {showUpdateForm ? (
                                        <Settings className="h-4 w-4" />
                                    ) : (
                                        <Pencil className="h-4 w-4" />
                                    )}
                                    {showUpdateForm
                                        ? 'Close editing'
                                        : 'Update profile'}
                                </Button>
                            </div>
                        </div>

                        <div className="grid gap-4 border-t bg-background/70 p-4 sm:grid-cols-2 lg:grid-cols-4">
                            <div className="rounded-2xl border bg-card p-4">
                                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                    Profile completion
                                </p>
                                <p className="mt-2 text-2xl font-semibold">
                                    {profileCompletion}%
                                </p>
                            </div>
                            <div className="rounded-2xl border bg-card p-4">
                                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                    Documents
                                </p>
                                <p className="mt-2 text-2xl font-semibold">
                                    {documentsSubmitted}/2
                                </p>
                            </div>
                            <div className="rounded-2xl border bg-card p-4">
                                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                    Email status
                                </p>
                                <p className="mt-2 text-sm font-semibold">
                                    {isEmailVerified
                                        ? 'Verified'
                                        : 'Pending verification'}
                                </p>
                            </div>
                            <div className="rounded-2xl border bg-card p-4">
                                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                    Security
                                </p>
                                <p className="mt-2 text-sm font-semibold">
                                    {user.two_factor_enabled
                                        ? 'Two-factor enabled'
                                        : 'Password protected'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border bg-orange-50/80 p-4 dark:border-orange-900 dark:bg-orange-950/20">
                        <div className="flex items-start gap-3">
                            <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-orange-600 dark:text-orange-400" />
                            <p className="text-xs leading-relaxed text-orange-800 dark:text-orange-200">
                                The information provided in this profile will be
                                used for identity verification, account
                                maintenance, communication, and visitation
                                management. Only authorized personnel may access
                                this information for legitimate operational
                                purposes.
                            </p>
                        </div>
                    </div>

                    <Tabs defaultValue="overview" className="space-y-6">
                        <TabsList className="grid h-auto w-full grid-cols-2 rounded-2xl p-1 sm:inline-grid sm:w-auto sm:grid-cols-4">
                            <TabsTrigger
                                value="overview"
                                className="rounded-xl"
                            >
                                Overview
                            </TabsTrigger>
                            <TabsTrigger value="account" className="rounded-xl">
                                Account
                            </TabsTrigger>
                            <TabsTrigger
                                value="security"
                                className="rounded-xl"
                            >
                                Security
                            </TabsTrigger>
                            <TabsTrigger
                                value="documents"
                                className="rounded-xl"
                            >
                                Documents
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="overview" className="space-y-6">
                            <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
                                <Card className="overflow-hidden p-0">
                                    <div
                                        className={`h-24 bg-gradient-to-br ${roleMeta.accentClass}`}
                                    />
                                    <CardContent className="-mt-12 space-y-6 p-6 pt-0">
                                        <div className="flex flex-col items-center text-center">
                                            <Avatar className="h-24 w-24 border-4 border-background shadow-md">
                                                <AvatarFallback className="bg-foreground text-xl font-semibold text-background">
                                                    {getInitials(user)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <h3 className="mt-4 text-xl font-semibold">
                                                {fullName}
                                            </h3>
                                            <p className="text-sm text-muted-foreground">
                                                {user.email}
                                            </p>
                                            <Badge
                                                variant="outline"
                                                className={`mt-3 ${roleMeta.badgeClass}`}
                                            >
                                                {roleMeta.label}
                                            </Badge>
                                        </div>

                                        <div className="space-y-3">
                                            {contactItems.map((item) => (
                                                <InfoRow
                                                    key={item.label}
                                                    {...item}
                                                />
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>

                                <div className="space-y-6">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <Sparkles className="h-5 w-5" />
                                                Account readiness
                                            </CardTitle>
                                            <CardDescription>
                                                A quick snapshot of profile
                                                completeness, verification, and
                                                account capabilities.
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-5">
                                            <div>
                                                <div className="mb-2 flex items-center justify-between text-sm">
                                                    <span className="font-medium">
                                                        Complete your profile
                                                    </span>
                                                    <span className="text-muted-foreground">
                                                        {profileCompletion}%
                                                    </span>
                                                </div>
                                                <div className="h-2 overflow-hidden rounded-full bg-muted">
                                                    <div
                                                        className="h-full rounded-full bg-foreground transition-all"
                                                        style={{
                                                            width: `${profileCompletion}%`,
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {capabilityChips.map((chip) => (
                                                    <Badge
                                                        key={chip}
                                                        variant="outline"
                                                        className="rounded-full"
                                                    >
                                                        <CheckCircle2 className="h-3 w-3" />
                                                        {chip}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <UserRound className="h-5 w-5" />
                                                Personal information
                                            </CardTitle>
                                            <CardDescription>
                                                Core identity information used
                                                for account and visitation
                                                verification.
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="grid gap-4 md:grid-cols-2">
                                            <FieldCard
                                                label="First name"
                                                value={valueOrFallback(
                                                    user.first_name,
                                                )}
                                            />
                                            <FieldCard
                                                label="Middle name"
                                                value={valueOrFallback(
                                                    user.middle_name,
                                                )}
                                            />
                                            <FieldCard
                                                label="Last name"
                                                value={valueOrFallback(
                                                    user.last_name,
                                                )}
                                            />
                                            <FieldCard
                                                label="Date of birth"
                                                value={formatDate(user.dob)}
                                            />
                                            <FieldCard
                                                label="Gender"
                                                value={formatGender(
                                                    user.gender,
                                                )}
                                            />
                                            <FieldCard
                                                label="Contact number"
                                                value={valueOrFallback(
                                                    user.contact_number,
                                                )}
                                            />
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="account" className="space-y-6">
                            <Card>
                                <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <CardTitle className="flex items-center gap-2">
                                            <Mail className="h-5 w-5" />
                                            Profile information
                                        </CardTitle>
                                        <CardDescription>
                                            Update your email address while
                                            keeping your registered identity
                                            details intact.
                                        </CardDescription>
                                    </div>
                                    <Button
                                        onClick={() =>
                                            setShowUpdateForm(
                                                (current) => !current,
                                            )
                                        }
                                        variant="outline"
                                        size="sm"
                                    >
                                        <Pencil className="h-4 w-4" />
                                        {showUpdateForm
                                            ? 'Cancel'
                                            : 'Edit email'}
                                    </Button>
                                </CardHeader>
                                <CardContent>
                                    {showUpdateForm ? (
                                        <div className="space-y-5">
                                            <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-900 dark:bg-orange-950/20">
                                                <div className="flex items-start gap-3">
                                                    <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-orange-600 dark:text-orange-400" />
                                                    <p className="text-xs leading-relaxed text-orange-800 dark:text-orange-200">
                                                        Personal information
                                                        updated through this
                                                        form will be used solely
                                                        for maintaining accurate
                                                        visitor records,
                                                        identity verification,
                                                        communication, and
                                                        authorized visitation
                                                        activities. All updates
                                                        will be processed and
                                                        stored in accordance
                                                        with the Data Privacy
                                                        Act of 2012 and
                                                        applicable institutional
                                                        policies.
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
                                                {({
                                                    processing,
                                                    recentlySuccessful,
                                                    errors,
                                                }) => (
                                                    <>
                                                        <input
                                                            type="hidden"
                                                            name="first_name"
                                                            value={
                                                                user.first_name ||
                                                                ''
                                                            }
                                                        />
                                                        <input
                                                            type="hidden"
                                                            name="middle_name"
                                                            value={
                                                                user.middle_name ||
                                                                ''
                                                            }
                                                        />
                                                        <input
                                                            type="hidden"
                                                            name="last_name"
                                                            value={
                                                                user.last_name ||
                                                                ''
                                                            }
                                                        />
                                                        <input
                                                            type="hidden"
                                                            name="dob"
                                                            value={
                                                                user.dob || ''
                                                            }
                                                        />
                                                        <input
                                                            type="hidden"
                                                            name="gender"
                                                            value={
                                                                user.gender ||
                                                                ''
                                                            }
                                                        />
                                                        <input
                                                            type="hidden"
                                                            name="street"
                                                            value={
                                                                user.street ||
                                                                ''
                                                            }
                                                        />
                                                        <input
                                                            type="hidden"
                                                            name="brgy"
                                                            value={
                                                                user.brgy || ''
                                                            }
                                                        />
                                                        <input
                                                            type="hidden"
                                                            name="municipality"
                                                            value={
                                                                user.municipality ||
                                                                ''
                                                            }
                                                        />
                                                        <input
                                                            type="hidden"
                                                            name="province"
                                                            value={
                                                                user.province ||
                                                                ''
                                                            }
                                                        />
                                                        <input
                                                            type="hidden"
                                                            name="postal_code"
                                                            value={
                                                                user.postal_code ||
                                                                ''
                                                            }
                                                        />

                                                        <div className="grid gap-2">
                                                            <Label htmlFor="email">
                                                                Email address
                                                            </Label>
                                                            <Input
                                                                id="email"
                                                                type="email"
                                                                className="mt-1 block w-full"
                                                                defaultValue={
                                                                    user.email
                                                                }
                                                                name="email"
                                                                required
                                                                autoComplete="username"
                                                                placeholder="Email address"
                                                            />
                                                            <InputError
                                                                className="mt-2"
                                                                message={
                                                                    errors.email
                                                                }
                                                            />
                                                        </div>

                                                        {mustVerifyEmail &&
                                                            !isEmailVerified && (
                                                                <div>
                                                                    <p className="text-sm text-muted-foreground">
                                                                        Your
                                                                        email
                                                                        address
                                                                        is
                                                                        unverified.{' '}
                                                                        <Link
                                                                            href={send()}
                                                                            as="button"
                                                                            className="text-foreground underline decoration-neutral-300 underline-offset-4 transition-colors duration-300 ease-out hover:decoration-current! dark:decoration-neutral-500"
                                                                        >
                                                                            Click
                                                                            here
                                                                            to
                                                                            resend
                                                                            the
                                                                            verification
                                                                            email.
                                                                        </Link>
                                                                    </p>

                                                                    {status ===
                                                                        'verification-link-sent' && (
                                                                        <div className="mt-2 text-sm font-medium text-green-600">
                                                                            A
                                                                            new
                                                                            verification
                                                                            link
                                                                            has
                                                                            been
                                                                            sent
                                                                            to
                                                                            your
                                                                            email
                                                                            address.
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}

                                                        <div className="flex items-center gap-4">
                                                            <Button
                                                                disabled={
                                                                    processing
                                                                }
                                                                data-test="update-profile-button"
                                                            >
                                                                Save changes
                                                            </Button>
                                                            <Transition
                                                                show={
                                                                    recentlySuccessful
                                                                }
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
                                        </div>
                                    ) : (
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <InfoRow
                                                label="Email address"
                                                value={user.email}
                                                icon={Mail}
                                            />
                                            <InfoRow
                                                label="Email verification"
                                                value={
                                                    isEmailVerified
                                                        ? 'Verified'
                                                        : 'Pending verification'
                                                }
                                                icon={BadgeCheck}
                                            />
                                            <InfoRow
                                                label="Role"
                                                value={roleMeta.label}
                                                icon={Users}
                                            />
                                            <InfoRow
                                                label="Account purpose"
                                                value={roleMeta.eyebrow}
                                                icon={ClipboardCheck}
                                            />
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Home className="h-5 w-5" />
                                        Address details
                                    </CardTitle>
                                    <CardDescription>
                                        Registered residential information used
                                        for account verification.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="grid gap-4 md:grid-cols-2">
                                    <FieldCard
                                        label="Street"
                                        value={valueOrFallback(user.street)}
                                    />
                                    <FieldCard
                                        label="Barangay"
                                        value={valueOrFallback(user.brgy)}
                                    />
                                    <FieldCard
                                        label="Municipality"
                                        value={valueOrFallback(
                                            user.municipality,
                                        )}
                                    />
                                    <FieldCard
                                        label="Province"
                                        value={valueOrFallback(user.province)}
                                    />
                                    <FieldCard
                                        label="Postal code"
                                        value={valueOrFallback(
                                            user.postal_code,
                                        )}
                                    />
                                    <FieldCard
                                        label="Full address"
                                        value={formatAddress(user)}
                                    />
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="security" className="space-y-6">
                            <div className="grid gap-6 lg:grid-cols-2">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <LockKeyhole className="h-5 w-5" />
                                            Security posture
                                        </CardTitle>
                                        <CardDescription>
                                            Review verification and account
                                            protection signals.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <InfoRow
                                            label="Email verification"
                                            value={
                                                isEmailVerified
                                                    ? 'Verified'
                                                    : 'Pending verification'
                                            }
                                            icon={BadgeCheck}
                                        />
                                        <InfoRow
                                            label="Two-factor authentication"
                                            value={
                                                user.two_factor_enabled
                                                    ? 'Enabled'
                                                    : 'Available in settings'
                                            }
                                            icon={ShieldCheck}
                                        />
                                        <InfoRow
                                            label="Data privacy"
                                            value="Protected under authorized operational access"
                                            icon={Fingerprint}
                                        />
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <CalendarDays className="h-5 w-5" />
                                            Account status
                                        </CardTitle>
                                        <CardDescription>
                                            Profile details used to support
                                            account maintenance and role-based
                                            access.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="rounded-xl border bg-background/80 p-4">
                                            <p className="text-sm font-medium">
                                                Role-based access
                                            </p>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                Your profile is presented with{' '}
                                                {roleMeta.label.toLowerCase()}{' '}
                                                context while using shared
                                                account controls.
                                            </p>
                                        </div>
                                        <DeleteUser />
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>

                        <TabsContent value="documents" className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <FileText className="h-5 w-5" />
                                        Submitted identification documents
                                    </CardTitle>
                                    <CardDescription>
                                        Review the IDs submitted for account and
                                        visitation verification.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="grid gap-4 md:grid-cols-2">
                                    <DocumentCard
                                        label="Primary ID"
                                        path={user.id_document_1_path}
                                    />
                                    <DocumentCard
                                        label="Secondary ID"
                                        path={user.id_document_2_path}
                                    />
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Globe2 className="h-5 w-5" />
                                        Verification summary
                                    </CardTitle>
                                    <CardDescription>
                                        A concise overview of the identity
                                        information currently on file.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="grid gap-4 md:grid-cols-3">
                                    <FieldCard
                                        label="Full name"
                                        value={fullName}
                                    />
                                    <FieldCard
                                        label="Date of birth"
                                        value={formatDate(user.dob)}
                                    />
                                    <FieldCard
                                        label="Documents on file"
                                        value={`${documentsSubmitted} of 2`}
                                    />
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
