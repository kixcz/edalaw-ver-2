import { Head, Link, router } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { Download, Eye, Flag, MessageSquare, MoreVertical, X, List, BarChart2, Archive, MessageCircle, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell as RechartsCell } from 'recharts';

import { DataTable } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';

const COLORS = ['#0d9488', '#f59e0b', '#3b82f6', '#ef4444'];

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

type Session = {
    id: number;
    room_id: string;
    session_type: string;
    visitor_name: string | null;
    inmate_name: string;
    scheduled_start: string;
    scheduled_end: string;
    duration_seconds: number;
    status: string;
    total_messages: number;
    flagged_count: number;
    csv_download_url: string;
};

type ChatLog = {
    id: number;
    sender: string;
    sender_label: string;
    sender_name: string;
    message: string;
    sent_at: string;
    flagged: boolean;
    flag_reason: string | null;
};

type ChatSessionData = {
    session: {
        id: number;
        room_id: string;
        session_type: string;
        visitor_name: string | null;
        inmate_name: string;
        started_at: string;
        ended_at: string;
        duration_seconds: number;
        status: string;
    };
    chatLogs: ChatLog[];
};

type Props = {
    sessions: Session[];
    stats: { total_sessions: number; total_messages: number; flagged_sessions: number; visit_sessions: number; eburol_sessions: number; avg_duration: string };
    chartData: { sessions_by_type: { type: string; count: number }[]; messages_by_session: { session: string; count: number }[] };
    filters: { type?: string; has_flagged?: boolean };
};

export default function ChatRecordings({ sessions, stats, chartData, filters }: Props) {
    const [selectedSession, setSelectedSession] = useState<Session | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [chatData, setChatData] = useState<ChatSessionData | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleViewDetails = async (session: Session) => {
        setSelectedSession(session);
        setIsLoading(true);
        setIsModalOpen(true);
        
        try {
            const url = `/api/chat-recordings/session/${session.room_id}`;
            const response = await fetch(url);
            const result = await response.json();
            if (result.success) {
                setChatData(result.data);
            }
        } catch (error) {
            console.error('Failed to load chat logs:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedSession(null);
        setChatData(null);
    };

    const columns: ColumnDef<Session>[] = useMemo(() => [
        { 
            accessorKey: 'room_id', 
            header: 'Room ID', 
            cell: ({ row }) => <code className="text-xs">{row.original.room_id}</code> 
        },
        { accessorKey: 'visitor_name', header: 'Visitor', cell: ({ row }) => row.original.visitor_name ?? '—' },
        { accessorKey: 'inmate_name', header: 'PDL' },
        { 
            accessorKey: 'session_type', 
            header: 'Type', 
            cell: ({ row }) => row.original.session_type === 'visit' ? 'Visit' : 'E-Burol' 
        },
        {
            accessorKey: 'scheduled_start',
            header: 'Started',
            cell: ({ row }) => (
                <span className="text-sm">
                    {new Date(row.original.scheduled_start).toLocaleString()}
                </span>
            ),
        },
        {
            accessorKey: 'duration_seconds',
            header: 'Duration',
            cell: ({ row }) => {
                const seconds = row.original.duration_seconds;
                const hours = Math.floor(seconds / 3600);
                const minutes = Math.floor((seconds % 3600) / 60);
                const secs = seconds % 60;
                
                if (hours > 0) {
                    return `${hours}h ${minutes}m ${secs}s`;
                } else if (minutes > 0) {
                    return `${minutes}m ${secs}s`;
                }
                return `${secs}s`;
            }
        },
        { accessorKey: 'status', header: 'Status', cell: ({ row }) => <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border">{row.original.status}</span> },
        { accessorKey: 'total_messages', header: 'Messages', cell: ({ row }) => row.original.total_messages },
        {
            accessorKey: 'flagged_count',
            header: 'Flagged',
            cell: ({ row }) => (
                row.original.flagged_count > 0
                    ? <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-red-100 text-red-700 border border-red-200">{row.original.flagged_count}</span>
                    : <span className="text-muted-foreground">0</span>
            ),
        },
        {
            id: 'actions',
            header: 'Actions',
            cell: ({ row }) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewDetails(row.original)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <a href={row.original.csv_download_url}>
                                <Download className="mr-2 h-4 w-4" />
                                Download CSV
                            </a>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ),
        },
    ], []);

    return (
        <AppLayout>
            <Head title="Chat Archive" />
            <div className="min-h-screen bg-background">
                {/* Header */}
                <div className="bg-card border-b border-border px-6 py-5 sticky top-0 z-30 shadow-sm">
                    <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-primary rounded-xl"><Archive className="w-5 h-5 text-white" /></div>
                            <div>
                                <h1 className="text-lg font-bold text-foreground leading-none">Chat Archive</h1>
                                <p className="text-xs text-muted-foreground mt-0.5">Session chat logs, flagged messages, and export files</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">
                    {/* KPI Cards */}
                    <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <StatCard icon={<Archive className="w-5 h-5" />} value={stats.total_sessions} label="Total Sessions" accent="bg-primary" iconBg="bg-primary/10" iconColor="text-primary" />
                        <StatCard icon={<MessageCircle className="w-5 h-5" />} value={stats.total_messages} label="Total Messages" accent="bg-teal-600" iconBg="bg-teal-50" iconColor="text-teal-600" />
                        <StatCard icon={<AlertTriangle className="w-5 h-5" />} value={stats.flagged_sessions} label="Flagged" accent="bg-red-600" iconBg="bg-red-50" iconColor="text-red-600" />
                        <StatCard icon={<MessageSquare className="w-5 h-5" />} value={stats.visit_sessions} label="Visits" accent="bg-blue-600" iconBg="bg-blue-50" iconColor="text-blue-600" />
                    </div>

                    {/* Tabs */}
                    <Tabs defaultValue="records" className="space-y-4">
                        <TabsList className="bg-card border border-border p-1 rounded-xl shadow-sm h-auto gap-1">
                            <TabsTrigger value="records" className="data-[state=active]:text-primary rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground gap-2 transition-all">
                                <List className="w-4 h-4" />Sessions
                            </TabsTrigger>
                            <TabsTrigger value="analytics" className="data-[state=active]:text-primary rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground gap-2 transition-all">
                                <BarChart2 className="w-4 h-4" />Analytics
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="records">
                            <Card className="border-0 shadow-sm">
                                <div className="px-6 py-4 border-b border-border">
                                    <h3 className="font-semibold text-foreground">Chat Sessions</h3>
                                    <p className="text-xs text-muted-foreground mt-0.5">{sessions.length} sessions with chat logs</p>
                                </div>
                                <div className="p-6">
                                    <DataTable
                                        columns={columns}
                                        data={sessions}
                                        searchKey="chat_search"
                                        searchPlaceholder="Search by room ID, visitor, PDL..."
                                        initialSorting={[{ id: 'scheduled_start', desc: true }]}
                                    />
                                </div>
                            </Card>
                        </TabsContent>

                        <TabsContent value="analytics">
                            <div className="grid gap-4 md:grid-cols-2">
                                <Card className="border-0 shadow-sm">
                                    <div className="px-6 pt-5 pb-2 border-b border-border">
                                        <h4 className="font-semibold text-foreground text-sm">Sessions by Type</h4>
                                        <p className="text-xs text-muted-foreground mt-0.5">Visit vs E-Burol distribution</p>
                                    </div>
                                    <CardContent className="p-4 pt-5">
                                        <ResponsiveContainer width="100%" height={280}>
                                            <PieChart>
                                                <Pie data={chartData.sessions_by_type} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={100}>
                                                    {chartData.sessions_by_type.map((_, i) => <RechartsCell key={i} fill={COLORS[i % COLORS.length]} />)}
                                                </Pie>
                                                <RechartsTooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>
                                <Card className="border-0 shadow-sm">
                                    <div className="px-6 pt-5 pb-2 border-b border-border">
                                        <h4 className="font-semibold text-foreground text-sm">Messages per Session</h4>
                                        <p className="text-xs text-muted-foreground mt-0.5">Top 10 sessions by message count</p>
                                    </div>
                                    <CardContent className="p-4 pt-5">
                                        <ResponsiveContainer width="100%" height={280}>
                                            <BarChart data={chartData.messages_by_session} margin={{ top: 5, right: 10, left: -20, bottom: 60 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                                <XAxis dataKey="session" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} angle={-45} textAnchor="end" />
                                                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                                <RechartsTooltip />
                                                <Bar dataKey="count" fill="#0891b2" radius={[4, 4, 0, 0]} name="Messages" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>

            {/* Floating Modal for Chat Details */}
            <Dialog open={isModalOpen} onOpenChange={(open) => { if (!open) closeModal(); }}>
                <DialogContent className="sm:max-w-4xl max-h-[85vh] flex flex-col">
                    <DialogHeader className="shrink-0">
                        <DialogTitle>Chat Session</DialogTitle>
                        <DialogDescription>
                            Room: <code className="text-xs">{selectedSession?.room_id}</code>
                        </DialogDescription>
                    </DialogHeader>

                    {/* Modal Content - Chat Messages */}
                    <div className="flex-1 overflow-y-auto min-h-0">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="animate-spin h-8 w-8 border-4 border-cyan-600 border-t-transparent rounded-full" />
                            </div>
                        ) : chatData?.chatLogs && chatData.chatLogs.length > 0 ? (
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[180px]">Timestamp</TableHead>
                                            <TableHead className="w-[150px]">Sender</TableHead>
                                            <TableHead>Message</TableHead>
                                            <TableHead className="w-[100px] text-center">Flagged</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {chatData.chatLogs.map((log) => (
                                            <TableRow key={log.id} className="hover:bg-muted/50">
                                                <TableCell className="text-muted-foreground whitespace-nowrap">
                                                    {log.sent_at ? new Date(log.sent_at).toLocaleString([], { 
                                                        dateStyle: 'short',
                                                        timeStyle: 'short'
                                                    }) : 'N/A'}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${['visitor', 'guest'].includes(log.sender.toLowerCase()) ? 'bg-blue-100 text-blue-800' : log.sender.toLowerCase() === 'inmate' || log.sender.toLowerCase() === 'pdl' ? 'bg-orange-100 text-orange-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                                            {log.sender_label}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {log.sender_name}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="max-w-[400px] break-words">
                                                    {log.message}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {log.flagged ? (
                                                        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-red-100 text-red-700 border border-red-200">
                                                            <Flag className="h-3 w-3 mr-1 inline" />
                                                            Yes
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted-foreground text-xs">—</span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                            <div className="text-center py-12 text-muted-foreground">
                                <MessageSquare className="mx-auto h-16 w-16 mb-4 opacity-20" />
                                <p>No chat messages in this session</p>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="shrink-0">
                        <div className="text-sm text-muted-foreground mr-auto">
                            {chatData?.chatLogs?.length || 0} message(s)
                        </div>
                        <Button variant="outline" onClick={closeModal}>Close</Button>
                        <Button onClick={() => selectedSession && window.open(selectedSession.csv_download_url, '_blank')}>
                            <Download className="mr-2 h-4 w-4" />
                            Download CSV
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
