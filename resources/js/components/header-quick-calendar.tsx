import { useState, useEffect, useMemo } from 'react';
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Clock,
    Video,
    Users,
    Heart,
    Tv,
    X,
    Filter,
    CheckCircle2,
    CalendarDays,
    AlertCircle
} from 'lucide-react';
import axios from 'axios';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type CalendarEvent = {
    id: number;
    type: 'visit' | 'eburol';
    visit_type: 'virtual' | 'physical' | 'eburol';
    title: string;
    date: string;
    time: string;
    status: string;
    visitor_name: string;
    pdl_name: string;
    deceased_name?: string;
    cell?: string | null;
};

export function HeaderQuickCalendar({ endpoint }: { endpoint?: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(() => {
        const today = new Date();
        return new Date(today.getFullYear(), today.getMonth(), 1);
    });
    const [selectedDate, setSelectedDate] = useState(() => {
        return new Date().toISOString().split('T')[0];
    });
    const [typeFilter, setTypeFilter] = useState<'all' | 'virtual' | 'physical' | 'eburol'>('all');

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const url = endpoint || (window.location.pathname.startsWith('/visitor') ? '/visitor/quick-calendar-events' : '/jail-officer/quick-calendar-events');
            const res = await axios.get(url);
            if (res.data?.events) {
                setEvents(res.data.events);
            }
        } catch (err) {
            console.error('Failed to load quick calendar events:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchEvents();
        }
    }, [isOpen]);

    // Filter events by type
    const filteredEvents = useMemo(() => {
        if (typeFilter === 'all') return events;
        return events.filter(e => e.visit_type === typeFilter);
    }, [events, typeFilter]);

    // Map events by date
    const eventsByDate = useMemo(() => {
        const map = new Map<string, CalendarEvent[]>();
        filteredEvents.forEach(e => {
            if (!map.has(e.date)) {
                map.set(e.date, []);
            }
            map.get(e.date)!.push(e);
        });
        return map;
    }, [filteredEvents]);

    // Month grid
    const calendarGrid = useMemo(() => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();

        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();

        const days: Array<{
            dateStr: string;
            dayNumber: number;
            isCurrentMonth: boolean;
            isToday: boolean;
            events: CalendarEvent[];
        }> = [];

        // Prev month padding
        for (let i = firstDayOfMonth - 1; i >= 0; i--) {
            const d = new Date(year, month - 1, daysInPrevMonth - i);
            const dateStr = d.toISOString().split('T')[0];
            days.push({
                dateStr,
                dayNumber: d.getDate(),
                isCurrentMonth: false,
                isToday: new Date().toISOString().split('T')[0] === dateStr,
                events: eventsByDate.get(dateStr) || [],
            });
        }

        // Current month
        for (let i = 1; i <= daysInMonth; i++) {
            const d = new Date(year, month, i);
            const dateStr = d.toISOString().split('T')[0];
            days.push({
                dateStr,
                dayNumber: i,
                isCurrentMonth: true,
                isToday: new Date().toISOString().split('T')[0] === dateStr,
                events: eventsByDate.get(dateStr) || [],
            });
        }

        // Next month padding
        const remaining = (7 - (days.length % 7)) % 7;
        for (let i = 1; i <= remaining; i++) {
            const d = new Date(year, month + 1, i);
            const dateStr = d.toISOString().split('T')[0];
            days.push({
                dateStr,
                dayNumber: i,
                isCurrentMonth: false,
                isToday: new Date().toISOString().split('T')[0] === dateStr,
                events: eventsByDate.get(dateStr) || [],
            });
        }

        return days;
    }, [currentMonth, eventsByDate]);

    // Events on selected date
    const selectedDateEvents = useMemo(() => {
        return eventsByDate.get(selectedDate) || [];
    }, [eventsByDate, selectedDate]);

    const prevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

    const goToToday = () => {
        const today = new Date();
        setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
        setSelectedDate(today.toISOString().split('T')[0]);
    };

    return (
        <>
            {/* Header Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="relative inline-flex size-9 items-center justify-center rounded-full border border-input bg-background text-sm font-medium shadow-sm transition-colors hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 dark:hover:bg-orange-950/30 dark:hover:text-orange-400"
                title="Quick View Calendar & Schedule"
                aria-label="Quick Calendar"
            >
                <CalendarIcon className="size-4 text-foreground hover:text-orange-600 transition-colors" />
            </button>

            {/* Quick View Calendar Modal */}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl bg-background border-border shadow-xl">
                    {/* Header */}
                    <div className="p-6 border-b border-border/80 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/50 text-orange-600 flex items-center justify-center shrink-0">
                                <CalendarDays className="w-5 h-5 text-orange-600" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg font-bold text-foreground">
                                    Quick Schedule & Visit Calendar
                                </DialogTitle>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Quick snapshot of all scheduled physical visits, virtual sessions, and e-Burol wakes.
                                </p>
                            </div>
                        </div>

                        {/* Month navigation and filter pills */}
                        <div className="flex items-center gap-2">
                            <div className="flex items-center bg-card p-1 rounded-xl border border-border shadow-xs">
                                <Button variant="ghost" size="sm" onClick={prevMonth} className="h-8 w-8 p-0 rounded-lg">
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={goToToday} className="h-8 px-2.5 text-xs font-semibold rounded-lg">
                                    Today
                                </Button>
                                <Button variant="ghost" size="sm" onClick={nextMonth} className="h-8 w-8 p-0 rounded-lg">
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Filter Tabs & Month Title */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                                <span>{currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                                <Badge variant="outline" className="text-xs font-normal">
                                    {filteredEvents.length} Total Sessions
                                </Badge>
                            </h3>

                            {/* Type filter pills */}
                            <div className="flex items-center gap-1.5 overflow-x-auto p-1 bg-muted/40 rounded-xl border border-border/70 text-xs">
                                <button
                                    type="button"
                                    onClick={() => setTypeFilter('all')}
                                    className={`px-3 py-1 rounded-lg font-medium transition ${
                                        typeFilter === 'all'
                                            ? 'bg-white dark:bg-card text-foreground shadow-xs font-semibold'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    All
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTypeFilter('virtual')}
                                    className={`px-3 py-1 rounded-lg font-medium flex items-center gap-1 transition ${
                                        typeFilter === 'virtual'
                                            ? 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 shadow-xs font-semibold'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    <Video className="w-3 h-3 text-sky-500" />
                                    <span>Virtual</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTypeFilter('physical')}
                                    className={`px-3 py-1 rounded-lg font-medium flex items-center gap-1 transition ${
                                        typeFilter === 'physical'
                                            ? 'bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300 shadow-xs font-semibold'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    <Users className="w-3 h-3 text-orange-500" />
                                    <span>Physical</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTypeFilter('eburol')}
                                    className={`px-3 py-1 rounded-lg font-medium flex items-center gap-1 transition ${
                                        typeFilter === 'eburol'
                                            ? 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 shadow-xs font-semibold'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    <Heart className="w-3 h-3 text-purple-500" />
                                    <span>e-Burol</span>
                                </button>
                            </div>
                        </div>

                        {/* Calendar Grid */}
                        <div className="rounded-2xl border border-border overflow-hidden bg-card shadow-xs">
                            <div className="grid grid-cols-7 bg-muted/40 border-b border-border text-center text-xs font-semibold text-muted-foreground py-2.5">
                                <div>Sun</div>
                                <div>Mon</div>
                                <div>Tue</div>
                                <div>Wed</div>
                                <div>Thu</div>
                                <div>Fri</div>
                                <div>Sat</div>
                            </div>

                            <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-border/60">
                                {calendarGrid.map((day, idx) => {
                                    const isSelected = selectedDate === day.dateStr;
                                    const dayEvents = day.events;
                                    const virtualCount = dayEvents.filter(e => e.visit_type === 'virtual').length;
                                    const physicalCount = dayEvents.filter(e => e.visit_type === 'physical').length;
                                    const eburolCount = dayEvents.filter(e => e.visit_type === 'eburol').length;

                                    return (
                                        <div
                                            key={`${day.dateStr}-${idx}`}
                                            onClick={() => setSelectedDate(day.dateStr)}
                                            className={`min-h-[85px] p-2 transition-all cursor-pointer flex flex-col justify-between ${
                                                isSelected
                                                    ? 'bg-orange-500/10 ring-2 ring-orange-500 ring-inset z-10'
                                                    : !day.isCurrentMonth
                                                        ? 'bg-muted/15 text-muted-foreground/40'
                                                        : 'hover:bg-muted/30 bg-card'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span
                                                    className={`text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center ${
                                                        day.isToday
                                                            ? 'bg-blue-600 text-white'
                                                            : isSelected
                                                                ? 'bg-orange-500 text-white'
                                                                : day.isCurrentMonth
                                                                    ? 'text-foreground'
                                                                    : 'text-muted-foreground/50'
                                                    }`}
                                                >
                                                    {day.dayNumber}
                                                </span>

                                                {dayEvents.length > 0 && (
                                                    <span className="text-[10px] font-bold text-muted-foreground px-1.5 py-0.2 rounded bg-muted">
                                                        {dayEvents.length}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Micro chips */}
                                            <div className="space-y-1 my-1">
                                                {virtualCount > 0 && (
                                                    <div className="text-[9px] bg-sky-100/80 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 px-1 py-0.5 rounded font-semibold truncate flex items-center gap-1">
                                                        <Video className="w-2.5 h-2.5 shrink-0" />
                                                        <span>{virtualCount} Virtual</span>
                                                    </div>
                                                )}
                                                {physicalCount > 0 && (
                                                    <div className="text-[9px] bg-orange-100/80 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 px-1 py-0.5 rounded font-semibold truncate flex items-center gap-1">
                                                        <Users className="w-2.5 h-2.5 shrink-0" />
                                                        <span>{physicalCount} Physical</span>
                                                    </div>
                                                )}
                                                {eburolCount > 0 && (
                                                    <div className="text-[9px] bg-purple-100/80 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 px-1 py-0.5 rounded font-semibold truncate flex items-center gap-1">
                                                        <Heart className="w-2.5 h-2.5 shrink-0" />
                                                        <span>{eburolCount} e-Burol</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Selected Date Detail Drawer */}
                        <div className="rounded-2xl border border-border/80 p-5 bg-muted/20 space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-orange-500" />
                                    <span>
                                        Sessions for{' '}
                                        {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
                                            weekday: 'long',
                                            month: 'long',
                                            day: 'numeric',
                                            year: 'numeric'
                                        })}
                                    </span>
                                </h4>
                                <Badge variant="outline" className="text-xs">
                                    {selectedDateEvents.length}{' '}
                                    {selectedDateEvents.length === 1 ? 'Session' : 'Sessions'}
                                </Badge>
                            </div>

                            {selectedDateEvents.length === 0 ? (
                                <div className="py-6 text-center text-xs text-muted-foreground">
                                    No sessions or visit activities scheduled on this day.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                    {selectedDateEvents.map((ev, i) => (
                                        <div
                                            key={`${ev.type}-${ev.id}-${i}`}
                                            className="p-3.5 bg-card rounded-xl border border-border/80 shadow-xs space-y-2"
                                        >
                                            <div className="flex items-center justify-between gap-1">
                                                <span className="text-[11px] font-bold px-2 py-0.5 bg-muted rounded">
                                                    {ev.time}
                                                </span>
                                                <span
                                                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                                                        ev.status === 'approved'
                                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                                            : ev.status === 'pending'
                                                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                                                : 'bg-muted text-muted-foreground'
                                                    }`}
                                                >
                                                    {ev.status}
                                                </span>
                                            </div>

                                            <div className="text-xs">
                                                <div className="font-bold text-foreground">
                                                    {ev.title}
                                                </div>
                                                <div className="text-muted-foreground mt-0.5">
                                                    PDL: <span className="font-semibold text-foreground">{ev.pdl_name}</span>
                                                </div>
                                                <div className="text-muted-foreground">
                                                    Visitor: <span className="font-medium text-foreground">{ev.visitor_name}</span>
                                                </div>
                                                {ev.cell && (
                                                    <div className="text-[10px] text-muted-foreground mt-1">
                                                        Cell: {ev.cell}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
