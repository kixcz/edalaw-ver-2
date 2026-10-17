import { Head } from '@inertiajs/react';
import { 
    Clock, Users, Video, UserCheck, RefreshCw, Volume2, VolumeX, 
    Maximize, Minimize, Shield, CheckCircle2, AlertCircle, ArrowRight,
    Building2, Sparkles, Radio, Sun, Moon
} from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useAppearance } from '@/hooks/use-appearance';

type QueueItem = {
    id: number;
    queue_number: string;
    pdl_name: string;
    visitor_name: string;
    relationship: string | null;
    cell_number: string;
    floor: string | null;
    dormitory_name: string;
    scheduled_time: string;
    visit_type: 'virtual' | 'physical';
    status: string;
    queue_status: 'ongoing' | 'upcoming' | 'completed';
    tunnel_code: string | null;
    access_key: string | null;
    room_id: string | null;
};

type Props = {
    jail_name: string;
    today_date: string;
    current_time: string;
    total_today: number;
    total_virtual: number;
    total_physical: number;
    total_ongoing: number;
    total_waiting: number;
    total_completed: number;
    ongoing: QueueItem[];
    up_next: QueueItem[];
    upcoming: QueueItem[];
    all_queue: QueueItem[];
};

export default function VisitQueueTv(initialProps: Props) {
    const [data, setData] = useState<Props>(initialProps);
    const [currentTimeStr, setCurrentTimeStr] = useState<string>(() => {
        return new Date().toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    });
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [audioAnnounce, setAudioAnnounce] = useState(true);
    const [lastAnnouncedId, setLastAnnouncedId] = useState<number | null>(null);
    const [filterType, setFilterType] = useState<'all' | 'virtual' | 'physical'>('all');
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Light / Dark mode toggle via app's useAppearance
    const { resolvedAppearance, updateAppearance } = useAppearance();
    const toggleTheme = () => {
        updateAppearance(resolvedAppearance === 'dark' ? 'light' : 'dark');
    };

    // Clock ticker every second
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTimeStr(new Date().toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Polling fetch every 8 seconds for real-time TV queue sync
    const fetchQueue = async () => {
        try {
            setIsRefreshing(true);
            const res = await axios.get('/jail-officer/visit-queue-tv/data');
            if (res.data) {
                setData(res.data);
            }
        } catch (err) {
            console.error('Failed to update TV queue', err);
        } finally {
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        const poll = setInterval(fetchQueue, 8000);
        return () => clearInterval(poll);
    }, []);

    // Voice announcement using browser SpeechSynthesis for "Now Calling / Up Next"
    useEffect(() => {
        if (!audioAnnounce || !window.speechSynthesis) return;

        if (data.ongoing.length > 0) {
            const current = data.ongoing[0];
            if (current && current.id !== lastAnnouncedId) {
                setLastAnnouncedId(current.id);
                try {
                    const speech = new SpeechSynthesisUtterance(
                        `Calling PDL ${current.pdl_name} from cell ${current.cell_number}. Your ${current.visit_type} visit with ${current.visitor_name} is now starting.`
                    );
                    speech.rate = 0.92;
                    speech.pitch = 1.0;
                    window.speechSynthesis.speak(speech);
                } catch (e) {
                    // Ignore speech errors
                }
            }
        }
    }, [data.ongoing, audioAnnounce, lastAnnouncedId]);

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().then(() => setIsFullScreen(true)).catch(() => {});
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen().then(() => setIsFullScreen(false)).catch(() => {});
            }
        }
    };

    const filterList = (items: QueueItem[]) => {
        if (filterType === 'all') return items;
        return items.filter(i => i.visit_type === filterType);
    };

    const displayOngoing = filterList(data.ongoing);
    const displayUpNext = filterList(data.up_next);
    const displayUpcoming = filterList(data.upcoming);

    return (
        <div className="theme-orange min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans select-none overflow-x-hidden transition-colors duration-300">
            <Head title="Visit Queue Display (TV Mode)" />

            {/* Top Broadcast Bar */}
            <header className="bg-white/95 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800/80 px-6 py-4 flex items-center justify-between backdrop-blur-md sticky top-0 z-50 shadow-xs dark:shadow-none">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl shadow-lg shadow-orange-500/25 flex items-center justify-center">
                        <Shield className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live Queue
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">| {data.jail_name}</span>
                        </div>
                        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-0.5 flex items-center gap-2">
                            PDL Visitation Queue Display
                        </h1>
                    </div>
                </div>

                {/* Center / Stats Filter Pills */}
                <div className="hidden lg:flex items-center gap-2 bg-slate-100 dark:bg-slate-950/60 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <button
                        type="button"
                        onClick={() => setFilterType('all')}
                        className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            filterType === 'all' 
                                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30' 
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        All Visits ({data.total_today})
                    </button>
                    <button
                        type="button"
                        onClick={() => setFilterType('virtual')}
                        className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            filterType === 'virtual' 
                                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30' 
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        Virtual E-Dalaw ({data.total_virtual})
                    </button>
                    <button
                        type="button"
                        onClick={() => setFilterType('physical')}
                        className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            filterType === 'physical' 
                                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30' 
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        Physical Visit ({data.total_physical})
                    </button>
                </div>

                {/* Clock & Broadcast Controls */}
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <div className="text-2xl font-black font-mono tracking-wider text-orange-600 dark:text-orange-400 drop-shadow-xs">
                            {currentTimeStr}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            {data.today_date}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 pl-3 border-l border-slate-200 dark:border-slate-800">
                        {/* Light / Dark Mode Toggle */}
                        <button
                            type="button"
                            onClick={toggleTheme}
                            title={resolvedAppearance === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                            aria-label="Toggle theme"
                            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-orange-500 dark:hover:text-orange-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
                        >
                            {resolvedAppearance === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-700" />}
                        </button>

                        {/* Voice Announce Toggle */}
                        <button
                            type="button"
                            onClick={() => setAudioAnnounce(!audioAnnounce)}
                            title={audioAnnounce ? "Voice Announcement Enabled" : "Voice Announcement Muted"}
                            className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                                audioAnnounce 
                                    ? 'bg-orange-50 dark:bg-orange-950/30 border-orange-300 dark:border-orange-500/40 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/40' 
                                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                            }`}
                        >
                            {audioAnnounce ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                        </button>

                        {/* Force Refresh */}
                        <button
                            type="button"
                            onClick={fetchQueue}
                            title="Force Refresh"
                            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-orange-500 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
                        >
                            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin text-orange-500' : ''}`} />
                        </button>

                        {/* Fullscreen Toggle */}
                        <button
                            type="button"
                            onClick={toggleFullScreen}
                            title="Toggle Fullscreen"
                            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-orange-500 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
                        >
                            {isFullScreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            </header>

            {/* Metrics Dashboard Banner */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-6 pt-5 pb-3">
                <div className="bg-white dark:bg-gradient-to-br dark:from-emerald-950/40 dark:to-slate-900 border border-emerald-200 dark:border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between shadow-xs">
                    <div>
                        <div className="text-xs uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400">Currently Ongoing</div>
                        <div className="text-3xl font-black text-slate-900 dark:text-white mt-1">{data.total_ongoing}</div>
                    </div>
                    <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400">
                        <Radio className="w-6 h-6 animate-pulse" />
                    </div>
                </div>

                <div className="bg-white dark:bg-gradient-to-br dark:from-amber-950/40 dark:to-slate-900 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-4 flex items-center justify-between shadow-xs">
                    <div>
                        <div className="text-xs uppercase font-bold tracking-wider text-amber-600 dark:text-amber-400">Next In Line</div>
                        <div className="text-3xl font-black text-slate-900 dark:text-white mt-1">{data.up_next.length}</div>
                    </div>
                    <div className="p-3 bg-amber-500/10 rounded-xl text-amber-600 dark:text-amber-400">
                        <Clock className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white dark:bg-gradient-to-br dark:from-orange-950/40 dark:to-slate-900 border border-orange-200 dark:border-orange-500/20 rounded-2xl p-4 flex items-center justify-between shadow-xs">
                    <div>
                        <div className="text-xs uppercase font-bold tracking-wider text-orange-600 dark:text-orange-400">Waiting in Queue</div>
                        <div className="text-3xl font-black text-slate-900 dark:text-white mt-1">{data.total_waiting}</div>
                    </div>
                    <div className="p-3 bg-orange-500/10 rounded-xl text-orange-600 dark:text-orange-400">
                        <Users className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-xs">
                    <div>
                        <div className="text-xs uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">Completed Today</div>
                        <div className="text-3xl font-black text-slate-900 dark:text-white mt-1">{data.total_completed}</div>
                    </div>
                    <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-400">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Main Stage: Left = NOW CALLING & UP NEXT, Right = FULL UPCOMING QUEUE */}
            <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 min-h-0">
                
                {/* Column Left (5 cols): NOW SERVING & UP NEXT CARDS */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                    {/* NOW SERVING / ACTIVE SESSION */}
                    <div className="bg-white dark:bg-gradient-to-b dark:from-slate-900 dark:to-slate-950 border-2 border-emerald-500/50 dark:border-emerald-500/40 rounded-3xl p-6 shadow-md dark:shadow-2xl relative overflow-hidden flex flex-col justify-between">
                        <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black tracking-widest uppercase bg-emerald-500 text-white dark:text-slate-950 shadow-md shadow-emerald-500/30 animate-pulse">
                                    <span className="w-2 h-2 rounded-full bg-white dark:bg-slate-950" /> Now Serving
                                </span>
                                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                    Active Visitation
                                </span>
                            </div>

                            {displayOngoing.length === 0 ? (
                                <div className="py-12 text-center">
                                    <Clock className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                                    <p className="text-lg font-bold text-slate-700 dark:text-slate-300">No Session Active</p>
                                    <p className="text-xs text-slate-500 mt-1">Next scheduled visit will be called automatically</p>
                                </div>
                            ) : (
                                displayOngoing.map((item) => (
                                    <div key={item.id} className="space-y-4">
                                        <div className="bg-slate-50 dark:bg-slate-950/80 border border-emerald-500/30 rounded-2xl p-5 shadow-xs dark:shadow-inner">
                                            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                                                <span className="font-mono font-bold">Queue #{item.queue_number}</span>
                                                <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[11px] ${
                                                    item.visit_type === 'virtual'
                                                        ? 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-500/30'
                                                        : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                                                }`}>
                                                    {item.visit_type} visit
                                                </span>
                                            </div>

                                            <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
                                                {item.pdl_name}
                                            </div>

                                            <div className="mt-2.5 flex items-center gap-3 text-sm text-emerald-600 dark:text-emerald-400 font-semibold">
                                                <Building2 className="w-4 h-4 shrink-0" />
                                                <span>Cell: {item.cell_number} ({item.floor || 'Ground'}) - {item.dormitory_name}</span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                                            <div>
                                                <span className="text-slate-500 block text-[11px]">Visitor Name</span>
                                                <span className="font-bold text-slate-900 dark:text-white text-sm">{item.visitor_name}</span>
                                                {item.relationship && (
                                                    <span className="text-slate-500 dark:text-slate-400 block text-[11px]">({item.relationship})</span>
                                                )}
                                            </div>
                                            <div>
                                                <span className="text-slate-500 block text-[11px]">Scheduled Time</span>
                                                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm font-mono">{item.scheduled_time}</span>
                                                {item.tunnel_code && (
                                                    <span className="text-slate-500 dark:text-slate-400 block font-mono text-[11px]">Code: {item.tunnel_code}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                            <span>PDL should report immediately to visit station</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">Booth Ready</span>
                        </div>
                    </div>

                    {/* UP NEXT IN LINE (First 3) */}
                    <div className="bg-white dark:bg-slate-900/70 border border-amber-300 dark:border-amber-500/30 rounded-3xl p-5 shadow-sm dark:shadow-xl flex-1 flex flex-col">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                                <h3 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                                    Up Next (Please Prepare)
                                </h3>
                            </div>
                            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                                Next {displayUpNext.length}
                            </span>
                        </div>

                        <div className="space-y-3 flex-1 overflow-y-auto">
                            {displayUpNext.length === 0 ? (
                                <div className="py-8 text-center text-slate-400 text-xs">
                                    No queued visitors currently waiting up next.
                                </div>
                            ) : (
                                displayUpNext.map((item, idx) => (
                                    <div 
                                        key={item.id}
                                        className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 hover:border-amber-500/40 transition-all flex items-center justify-between gap-3"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center font-black text-sm shrink-0">
                                                #{idx + 1}
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-slate-900 dark:text-white uppercase">
                                                    {item.pdl_name}
                                                </div>
                                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                                    Cell <span className="font-semibold text-slate-700 dark:text-slate-200">{item.cell_number}</span> • Visiting: {item.visitor_name}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-right shrink-0">
                                            <div className="text-xs font-bold text-orange-600 dark:text-orange-400 font-mono">
                                                {item.scheduled_time}
                                            </div>
                                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                                                item.visit_type === 'virtual' 
                                                    ? 'bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300' 
                                                    : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                                            }`}>
                                                {item.visit_type}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Column Right (7 cols): COMPLETE UPCOMING VISITATION SCHEDULE TABLE */}
                <div className="lg:col-span-7 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-md dark:shadow-2xl flex flex-col">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
                        <div>
                            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                                <Users className="w-5 h-5 text-orange-500" />
                                Today's Full Visitation Schedule Queue
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Showing real-time order of approved PDL visits for today
                            </p>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            Auto-updating every 8s
                        </div>
                    </div>

                    {/* Table View optimized for TV distance viewing */}
                    <div className="flex-1 overflow-y-auto pr-1">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[11px] font-bold">
                                    <th className="py-3 px-3">Queue #</th>
                                    <th className="py-3 px-3">Time</th>
                                    <th className="py-3 px-3">PDL Name</th>
                                    <th className="py-3 px-3">Cell / Location</th>
                                    <th className="py-3 px-3">Visitor Name</th>
                                    <th className="py-3 px-3">Type</th>
                                    <th className="py-3 px-3 text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                {filterList(data.all_queue).length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-12 text-slate-400 dark:text-slate-500">
                                            No visitation schedules recorded for today.
                                        </td>
                                    </tr>
                                ) : (
                                    filterList(data.all_queue).map((item, index) => {
                                        const isOngoing = item.queue_status === 'ongoing';
                                        const isUpNext = data.up_next.some(u => u.id === item.id);

                                        return (
                                            <tr 
                                                key={item.id}
                                                className={`transition-colors ${
                                                    isOngoing 
                                                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-slate-900 dark:text-white font-bold' 
                                                        : isUpNext 
                                                        ? 'bg-amber-50 dark:bg-amber-950/20 text-slate-800 dark:text-slate-200' 
                                                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/30 text-slate-700 dark:text-slate-300'
                                                }`}
                                            >
                                                <td className="py-3 px-3 font-mono font-bold text-slate-500 dark:text-slate-400">
                                                    {item.queue_number}
                                                </td>
                                                <td className="py-3 px-3 font-mono font-semibold text-orange-600 dark:text-orange-400 text-sm">
                                                    {item.scheduled_time}
                                                </td>
                                                <td className="py-3 px-3 font-bold text-slate-900 dark:text-white text-sm uppercase">
                                                    {item.pdl_name}
                                                </td>
                                                <td className="py-3 px-3">
                                                    <span className="font-semibold text-slate-900 dark:text-slate-200">{item.cell_number}</span>
                                                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">{item.dormitory_name}</span>
                                                </td>
                                                <td className="py-3 px-3 font-medium text-slate-700 dark:text-slate-300">
                                                    {item.visitor_name}
                                                    {item.relationship && (
                                                        <span className="text-[10px] text-slate-400 dark:text-slate-500 block">({item.relationship})</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-3">
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                        item.visit_type === 'virtual'
                                                            ? 'bg-orange-100 dark:bg-orange-950/80 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-500/40'
                                                            : 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/40'
                                                    }`}>
                                                        {item.visit_type === 'virtual' && <Video className="w-2.5 h-2.5" />}
                                                        {item.visit_type}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-3 text-right">
                                                    {isOngoing ? (
                                                        <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                                                            Ongoing
                                                        </span>
                                                    ) : isUpNext ? (
                                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                                                            Up Next
                                                        </span>
                                                    ) : item.status === 'completed' ? (
                                                        <span className="text-[11px] text-slate-400 dark:text-slate-500">Completed</span>
                                                    ) : (
                                                        <span className="text-[11px] text-orange-600 dark:text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">
                                                            Waiting
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Announcement Banner */}
                    <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-orange-500" />
                            <span>Reminders: PDLs should be pre-screened 10 minutes prior to call time.</span>
                        </div>
                        <div className="font-semibold text-slate-700 dark:text-slate-300">
                            Electronic Visitation & Monitoring System
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
