import { Head, router } from '@inertiajs/react';
import { Computer, Globe, MapPin, Monitor, ShieldCheck, Smartphone, Tablet, Trash2, X } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type Session = {
    id: number;
    session_id: string;
    ip_address: string | null;
    device_type: string | null;
    device_name: string | null;
    browser: string | null;
    platform: string | null;
    location: string | null;
    is_current: boolean;
    last_activity: string | null;
    created_at: string;
    is_active: boolean;
};

type Props = {
    sessions: Session[];
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Session Management',
        href: '/visitor/sessions',
    },
];

function getDeviceIcon(deviceType: string | null) {
    switch (deviceType) {
        case 'mobile':
            return <Smartphone className="h-5 w-5" />;
        case 'tablet':
            return <Tablet className="h-5 w-5" />;
        case 'desktop':
            return <Monitor className="h-5 w-5" />;
        default:
            return <Computer className="h-5 w-5" />;
    }
}

function getDeviceTypeBadge(deviceType: string | null) {
    const colors: Record<string, string> = {
        mobile: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
        tablet: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
        desktop: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
    };

    return (
        <Badge variant="outline" className={colors[deviceType || ''] || ''}>
            {deviceType ? deviceType.charAt(0).toUpperCase() + deviceType.slice(1) : 'Unknown'}
        </Badge>
    );
}

export default function Sessions({ sessions }: Props) {
    const [revokingSession, setRevokingSession] = useState<number | null>(null);
    const [revokingAll, setRevokingAll] = useState(false);

    const handleRevoke = (sessionId: number) => {
        setRevokingSession(sessionId);
        router.delete(`/visitor/sessions/${sessionId}`, {
            preserveScroll: true,
            onFinish: () => setRevokingSession(null),
        });
    };

    const handleRevokeAll = () => {
        setRevokingAll(true);
        router.post('/visitor/sessions/revoke-all', {}, {
            preserveScroll: true,
            onFinish: () => setRevokingAll(false),
        });
    };

    const otherSessions = sessions.filter((s) => !s.is_current);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Session Management" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">Session Management</h1>
                        <p className="text-muted-foreground">
                            View and manage your active login sessions across different devices
                        </p>
                    </div>
                    {otherSessions.length > 0 && (
                        <Button
                            onClick={handleRevokeAll}
                            disabled={revokingAll}
                            variant="destructive"
                        >
                            {revokingAll ? (
                                <>
                                    <X className="mr-2 h-4 w-4 animate-spin" />
                                    Revoking...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Revoke All Other Sessions
                                </>
                            )}
                        </Button>
                    )}
                </div>

                {/* Privacy Notice */}
                <div style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', padding: '10px 24px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <ShieldCheck style={{ width: '14px', height: '14px', color: '#6B7280', flexShrink: 0, marginTop: '1px' }} />
                    <div>
                        <div style={{ fontSize: '9px', fontWeight: 700, color: '#374151', marginBottom: '2px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                            Data Privacy Notice
                        </div>
                        <div style={{ fontSize: '9px', lineHeight: '1.5', color: '#4B5563' }}>
                            For security, compliance, and audit purposes, the system records session metadata including login timestamps, IP addresses, device information, and connection activity. Such information is accessible only to authorized personnel and is processed in accordance with Republic Act No. 10173 (Data Privacy Act of 2012) and applicable privacy policies.
                            <br />
                            <span style={{ fontStyle: 'italic' }}>
                                (Alang sa seguridad, pagsunod sa balaod, ug audit, ang sistema nagrekord sa session metadata lakip ang login timestamps, IP addresses, impormasyon sa device, ug kalabutan sa koneksyon. Kini nga impormasyon accessible lamang sa mga awtorisadong personel ug giproseso sumala sa Republic Act No. 10173 (Data Privacy Act of 2012) ug mga nahisgutan nga privacy policies.)
                            </span>
                        </div>
                    </div>
                </div>

                {/* Sessions Table */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Active Sessions</CardTitle>
                                <CardDescription>
                                    {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'} found
                                </CardDescription>
                            </div>
                            {otherSessions.length > 0 && (
                                <Button
                                    onClick={handleRevokeAll}
                                    disabled={revokingAll}
                                    variant="destructive"
                                    size="sm"
                                >
                                    {revokingAll ? (
                                        <>
                                            <X className="mr-2 h-4 w-4 animate-spin" />
                                            Revoking...
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Revoke All Other Sessions
                                        </>
                                    )}
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {sessions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12">
                                <Computer className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
                                <p className="text-lg font-medium text-muted-foreground">
                                    No active sessions
                                </p>
                            </div>
                        ) : (
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Device</TableHead>
                                            <TableHead>Browser & Platform</TableHead>
                                            <TableHead>IP Address & Location</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Last Activity</TableHead>
                                            <TableHead>Logged In</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sessions.map((session) => (
                                            <TableRow key={session.id}>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex-shrink-0">
                                                            {getDeviceIcon(session.device_type)}
                                                        </div>
                                                        <div>
                                                            <div className="font-medium">
                                                                {session.device_name || 'Unknown Device'}
                                                            </div>
                                                            {getDeviceTypeBadge(session.device_type)}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <Globe className="h-4 w-4 text-muted-foreground" />
                                                        <span>
                                                            {session.browser || 'Unknown Browser'}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground mt-1">
                                                        {session.platform || 'Unknown Platform'}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <MapPin className="h-4 w-4 text-muted-foreground" />
                                                        <span>{session.ip_address || 'Unknown IP'}</span>
                                                    </div>
                                                    {session.location && (
                                                        <div className="text-xs text-muted-foreground mt-1">
                                                            {session.location}
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {session.is_current ? (
                                                        <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                                                            Current
                                                        </Badge>
                                                    ) : session.is_active ? (
                                                        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20">
                                                            Active
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="secondary">
                                                            Inactive
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {session.last_activity ? (
                                                        <div className="text-sm">
                                                            {new Date(session.last_activity).toLocaleString()}
                                                        </div>
                                                    ) : (
                                                        <span className="text-sm text-muted-foreground">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm">
                                                        {new Date(session.created_at).toLocaleString()}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {!session.is_current && (
                                                        <Button
                                                            size="sm"
                                                            variant="destructive"
                                                            onClick={() => handleRevoke(session.id)}
                                                            disabled={revokingSession === session.id}
                                                        >
                                                            {revokingSession === session.id ? (
                                                                <X className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <>
                                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                                    Revoke
                                                                </>
                                                            )}
                                                        </Button>
                                                    )}
                                                    {session.is_current && (
                                                        <span className="text-xs text-muted-foreground">Current session</span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Security Notice */}
                <Card className="border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20">
                    <CardHeader>
                        <CardTitle className="text-sm">Security Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            As a visitor, you can only be logged in on one device at a time for security purposes.
                            If you log in from a new device, all other sessions will be automatically revoked.
                            If you notice any suspicious activity, please revoke the session immediately.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

