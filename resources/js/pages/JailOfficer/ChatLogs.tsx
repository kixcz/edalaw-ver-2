import { Head, router } from '@inertiajs/react';
import { Download, Filter, MessageCircle, Search, X, List, BarChart2, Flag, Users, Calendar } from 'lucide-react';
import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell as RechartsCell } from 'recharts';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';

const COLORS = ['#3b82f6', '#f97316', '#10b981', '#ef4444'];

const StatCard = ({ icon, value, label, accent, iconBg, iconColor }: { icon: React.ReactNode; value: number | string; label: string; accent: string; iconBg: string; iconColor: string }) => (
    <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
            <div className="flex items-stretch">
                <div className={`w-1.5 shrink-0 ${accent}`} />
                <div className="flex items-center gap-4 px-5 py-4 flex-1">
                    <div className={`p-2.5 rounded-xl ${iconBg} ${iconColor}`}>{icon}</div>
                    <div>
                        <div className="text-2xl font-bold text-foreground leading-none">{value}</div>
                        <div className="text-xs text-muted-foreground mt-1 font-medium uppercase tracking-wide">{label}</div>
                    </div>
                </div>
            </div>
        </CardContent>
    </Card>
);

type ChatLog = {
    id: number;
    session_id: number;
    sender: string;
    sender_name: string;
    message: string;
    sent_at: string;
    flagged: boolean;
    flag_reason: string | null;
    visitor_name: string;
    inmate_name: string;
    session_type: string;
};

type Props = {
    chatLogs: ChatLog[];
    stats: { total_messages: number; flagged_messages: number; visitor_messages: number; inmate_messages: number; monitor_messages: number; today_messages: number };
    chartData: { messages_by_sender: { sender: string; count: number }[]; messages_by_day: { day: string; count: number }[] };
    pagination: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    filters: {
        session_id?: string;
        date_from?: string;
        date_to?: string;
        sender?: string;
        flagged?: string;
    };
};

export default function ChatLogs({ chatLogs, stats, chartData, pagination, filters }: Props) {
    const [localFilters, setLocalFilters] = useState({
        session_id: filters.session_id || '',
        date_from: filters.date_from || '',
        date_to: filters.date_to || '',
        sender: filters.sender || '',
        flagged: filters.flagged || '',
    });

    const applyFilters = () => {
        const params: Record<string, string> = {};
        if (localFilters.session_id) params.session_id = localFilters.session_id;
        if (localFilters.date_from) params.date_from = localFilters.date_from;
        if (localFilters.date_to) params.date_to = localFilters.date_to;
        if (localFilters.sender) params.sender = localFilters.sender;
        if (localFilters.flagged) params.flagged = localFilters.flagged;
        
        router.get('/jail-officer/chat-logs', params, { preserveState: true });
    };

    const clearFilters = () => {
        setLocalFilters({
            session_id: '',
            date_from: '',
            date_to: '',
            sender: '',
            flagged: '',
        });
        router.get('/jail-officer/chat-logs', {}, { preserveState: true });
    };

    const exportCsv = () => {
        const params = new URLSearchParams();
        if (localFilters.session_id) params.append('session_id', localFilters.session_id);
        if (localFilters.date_from) params.append('date_from', localFilters.date_from);
        if (localFilters.date_to) params.append('date_to', localFilters.date_to);
        if (localFilters.sender) params.append('sender', localFilters.sender);
        if (localFilters.flagged) params.append('flagged', localFilters.flagged);
        
        window.location.href = `/jail-officer/chat-logs/export?${params.toString()}`;
    };

    const getSenderBadgeColor = (sender: string) => {
        switch (sender) {
            case 'visitor':
                return 'bg-blue-100 text-blue-800';
            case 'inmate':
                return 'bg-orange-100 text-orange-800';
            case 'monitor':
                return 'bg-emerald-100 text-emerald-800';
            default:
                return 'bg-muted text-foreground';
        }
    };

    return (
        <AppLayout>
            <Head title="Chat Logs" />
            <div className="min-h-screen bg-background">
                {/* Header */}
                <div className="bg-card border-b border-border px-6 py-5 sticky top-0 z-30 shadow-sm">
                    <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-primary rounded-xl"><MessageCircle className="w-5 h-5 text-white" /></div>
                            <div>
                                <h1 className="text-lg font-bold text-foreground leading-none">Chat Logs</h1>
                                <p className="text-xs text-muted-foreground mt-0.5">View and export chat messages from all visit sessions</p>
                            </div>
                        </div>
                        <Button onClick={exportCsv} variant="outline" className="h-9">
                            <Download className="mr-2 h-4 w-4" />
                            Export CSV
                        </Button>
                    </div>
                </div>

                <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">
                    {/* KPI Cards */}
                    <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <StatCard icon={<MessageCircle className="w-5 h-5" />} value={stats.total_messages} label="Total Messages" accent="bg-primary" iconBg="bg-primary/10" iconColor="text-primary" />
                        <StatCard icon={<Flag className="w-5 h-5" />} value={stats.flagged_messages} label="Flagged" accent="bg-red-600" iconBg="bg-red-50" iconColor="text-red-600" />
                        <StatCard icon={<Users className="w-5 h-5" />} value={stats.visitor_messages} label="Visitor" accent="bg-blue-600" iconBg="bg-blue-50" iconColor="text-blue-600" />
                        <StatCard icon={<Users className="w-5 h-5" />} value={stats.inmate_messages} label="Inmate" accent="bg-orange-600" iconBg="bg-orange-50" iconColor="text-orange-600" />
                    </div>

                    {/* Tabs */}
                    <Tabs defaultValue="records" className="space-y-4">
                        <TabsList className="bg-card border border-border p-1 rounded-xl shadow-sm h-auto gap-1">
                            <TabsTrigger value="records" className="data-[state=active]:text-primary rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground gap-2 transition-all">
                                <List className="w-4 h-4" />Messages
                            </TabsTrigger>
                            <TabsTrigger value="analytics" className="data-[state=active]:text-primary rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground gap-2 transition-all">
                                <BarChart2 className="w-4 h-4" />Analytics
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="records">
                            <Card className="border-0 shadow-sm">
                                <div className="px-6 py-4 border-b border-border">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Filter className="h-4 w-4 text-muted-foreground" />
                                        <h3 className="font-semibold text-foreground">Filters</h3>
                                    </div>
                                    <div className="grid gap-4 md:grid-cols-5">
                                        <div className="grid gap-2">
                                            <Label htmlFor="session_id">Session ID</Label>
                                            <Input
                                                id="session_id"
                                                placeholder="Enter session ID"
                                                value={localFilters.session_id}
                                                onChange={(e) => setLocalFilters({ ...localFilters, session_id: e.target.value })}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="date_from">Date From</Label>
                                            <Input
                                                id="date_from"
                                                type="date"
                                                value={localFilters.date_from}
                                                onChange={(e) => setLocalFilters({ ...localFilters, date_from: e.target.value })}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="date_to">Date To</Label>
                                            <Input
                                                id="date_to"
                                                type="date"
                                                value={localFilters.date_to}
                                                onChange={(e) => setLocalFilters({ ...localFilters, date_to: e.target.value })}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="sender">Sender</Label>
                                            <Select
                                                value={localFilters.sender || 'all'}
                                                onValueChange={(value) => setLocalFilters({ ...localFilters, sender: value === 'all' ? '' : value })}
                                            >
                                                <SelectTrigger id="sender">
                                                    <SelectValue placeholder="All senders" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">All senders</SelectItem>
                                                    <SelectItem value="visitor">Visitor</SelectItem>
                                                    <SelectItem value="inmate">Inmate</SelectItem>
                                                    <SelectItem value="monitor">Monitor</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="flagged">Flagged</Label>
                                            <Select
                                                value={localFilters.flagged || 'all'}
                                                onValueChange={(value) => setLocalFilters({ ...localFilters, flagged: value === 'all' ? '' : value })}
                                            >
                                                <SelectTrigger id="flagged">
                                                    <SelectValue placeholder="All messages" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">All messages</SelectItem>
                                                    <SelectItem value="true">Flagged only</SelectItem>
                                                    <SelectItem value="false">Not flagged</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex gap-2">
                                        <Button onClick={applyFilters} size="sm">
                                            <Search className="mr-2 h-4 w-4" />
                                            Apply Filters
                                        </Button>
                                        <Button variant="outline" onClick={clearFilters} size="sm">
                                            <X className="mr-2 h-4 w-4" />
                                            Clear
                                        </Button>
                                    </div>
                                </div>
                                <div className="px-6 py-4 border-b border-border">
                                    <h3 className="font-semibold text-foreground">Messages ({pagination.total})</h3>
                                    <p className="text-xs text-muted-foreground mt-0.5">Showing {chatLogs.length} of {pagination.total} messages</p>
                                </div>
                                <div className="p-6">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>ID</TableHead>
                                                <TableHead>Session</TableHead>
                                                <TableHead>Visitor</TableHead>
                                                <TableHead>Inmate</TableHead>
                                                <TableHead>Sender</TableHead>
                                                <TableHead>Message</TableHead>
                                                <TableHead>Sent At</TableHead>
                                                <TableHead>Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {chatLogs.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                                                        No chat logs found
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                chatLogs.map((log) => (
                                                    <TableRow key={log.id}>
                                                        <TableCell className="font-mono text-sm">#{log.id}</TableCell>
                                                        <TableCell className="font-mono text-sm">#{log.session_id}</TableCell>
                                                        <TableCell>{log.visitor_name}</TableCell>
                                                        <TableCell>{log.inmate_name}</TableCell>
                                                        <TableCell>
                                                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getSenderBadgeColor(log.sender)}`}>
                                                                {log.sender}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="max-w-xs truncate" title={log.message}>
                                                            {log.message}
                                                        </TableCell>
                                                        <TableCell className="text-sm text-muted-foreground">
                                                            {new Date(log.sent_at).toLocaleString()}
                                                        </TableCell>
                                                        <TableCell>
                                                            {log.flagged ? (
                                                                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-red-100 text-red-700 border border-red-200" title={log.flag_reason || ''}>
                                                                    Flagged
                                                                </span>
                                                            ) : (
                                                                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border">
                                                                    Normal
                                                                </span>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>

                                    {/* Pagination */}
                                    {pagination.last_page > 1 && (
                                        <div className="mt-4 flex items-center justify-between">
                                            <p className="text-sm text-muted-foreground">
                                                Page {pagination.current_page} of {pagination.last_page}
                                            </p>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={pagination.current_page === 1}
                                                    onClick={() => router.get('/jail-officer/chat-logs', { 
                                                        page: pagination.current_page - 1,
                                                        ...filters 
                                                    }, { preserveState: true })}
                                                >
                                                    Previous
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={pagination.current_page === pagination.last_page}
                                                    onClick={() => router.get('/jail-officer/chat-logs', { 
                                                        page: pagination.current_page + 1,
                                                        ...filters 
                                                    }, { preserveState: true })}
                                                >
                                                    Next
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </TabsContent>

                        <TabsContent value="analytics">
                            <div className="grid gap-4 md:grid-cols-2">
                                <Card className="border-0 shadow-sm">
                                    <div className="px-6 pt-5 pb-2 border-b border-border">
                                        <h4 className="font-semibold text-foreground text-sm">Messages by Sender</h4>
                                        <p className="text-xs text-muted-foreground mt-0.5">Distribution by sender type</p>
                                    </div>
                                    <CardContent className="p-4 pt-5">
                                        <ResponsiveContainer width="100%" height={280}>
                                            <PieChart>
                                                <Pie data={chartData.messages_by_sender} dataKey="count" nameKey="sender" cx="50%" cy="50%" outerRadius={100}>
                                                    {chartData.messages_by_sender.map((_, i) => <RechartsCell key={i} fill={COLORS[i % COLORS.length]} />)}
                                                </Pie>
                                                <RechartsTooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>
                                <Card className="border-0 shadow-sm">
                                    <div className="px-6 pt-5 pb-2 border-b border-border">
                                        <h4 className="font-semibold text-foreground text-sm">Messages by Day</h4>
                                        <p className="text-xs text-muted-foreground mt-0.5">Recent activity trend</p>
                                    </div>
                                    <CardContent className="p-4 pt-5">
                                        <ResponsiveContainer width="100%" height={280}>
                                            <BarChart data={chartData.messages_by_day} margin={{ top: 5, right: 10, left: -20, bottom: 60 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                                <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                                <RechartsTooltip />
                                                <Bar dataKey="count" fill="#0d9488" radius={[4, 4, 0, 0]} name="Messages" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </AppLayout>
    );
}
