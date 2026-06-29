import { Head, router, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    Calendar,
    Check,
    Minus,
    Monitor,
    Pencil,
    Save,
    Search,
    Sparkles,
    UserCheck,
    X,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { cn } from '@/lib/utils';

type ScheduleDay = {
    virtual_available: boolean;
    physical_available: boolean;
};

type Cell = {
    id: number;
    cell_number: string;
    status: 'active' | 'inactive';
    schedules: Record<number, ScheduleDay>;
};

type Props = {
    cells: Cell[];
    dayNames: Record<number, string>;
};

// Monday -> Sunday
const DAYS = [1, 2, 3, 4, 5, 6, 0];
const WEEKDAYS = [1, 2, 3, 4, 5];
const WEEKEND = [6, 0];

const DAY_ABBR: Record<number, string> = {
    0: 'Su',
    1: 'Mo',
    2: 'Tu',
    3: 'We',
    4: 'Th',
    5: 'Fr',
    6: 'Sa',
};

type VisitType = 'virtual' | 'physical';
type ApplyTarget = 'all' | 'selected' | 'single';

function emptyWeek(): Record<number, ScheduleDay> {
    const week: Record<number, ScheduleDay> = {};
    DAYS.forEach((d) => (week[d] = { virtual_available: false, physical_available: false }));
    return week;
}

function buildScheduleMap(cells: Cell[]): Record<number, Record<number, ScheduleDay>> {
    const map: Record<number, Record<number, ScheduleDay>> = {};
    cells.forEach((cell) => {
        const week = emptyWeek();
        DAYS.forEach((day) => {
            week[day] = {
                virtual_available: cell.schedules[day]?.virtual_available ?? false,
                physical_available: cell.schedules[day]?.physical_available ?? false,
            };
        });
        map[cell.id] = week;
    });
    return map;
}

function weekEquals(a: Record<number, ScheduleDay>, b: Record<number, ScheduleDay>): boolean {
    return DAYS.every(
        (d) =>
            a[d].virtual_available === b[d].virtual_available &&
            a[d].physical_available === b[d].physical_available
    );
}

function activeDayCount(week: Record<number, ScheduleDay>, type: VisitType): number {
    return DAYS.filter((d) => week[d][`${type}_available`]).length;
}

export default function CellScheduleTemplate({ cells, dayNames }: Props) {
    const { flash } = usePage().props as { flash?: { success?: string; error?: string } };

    const originalSchedules = useMemo(() => buildScheduleMap(cells), [cells]);
    const [schedules, setSchedules] = useState(originalSchedules);
    const [isSaving, setIsSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [selectedCellIds, setSelectedCellIds] = useState<Set<number>>(new Set());

    // --- Builder modal state ---
    const [builderOpen, setBuilderOpen] = useState(false);
    const [builderWeek, setBuilderWeek] = useState<Record<number, ScheduleDay>>(emptyWeek());
    const [applyTarget, setApplyTarget] = useState<ApplyTarget>('all');
    const [singleCellId, setSingleCellId] = useState<number | null>(null);

    const dirtyCellIds = useMemo(() => {
        const dirty = new Set<number>();
        cells.forEach((cell) => {
            if (!weekEquals(schedules[cell.id], originalSchedules[cell.id])) {
                dirty.add(cell.id);
            }
        });
        return dirty;
    }, [schedules, originalSchedules, cells]);

    const dirtyCount = dirtyCellIds.size;

    const filteredCells = useMemo(() => {
        let result = cells;
        if (statusFilter !== 'all') {
            result = result.filter((c) => c.status === statusFilter);
        }
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            result = result.filter((c) => c.cell_number.toLowerCase().includes(q));
        }
        return result;
    }, [cells, search, statusFilter]);

    // --- Open builder in different modes ---
    const openBuilderForAll = () => {
        setBuilderWeek(emptyWeek());
        setApplyTarget(selectedCellIds.size > 0 ? 'selected' : 'all');
        setSingleCellId(null);
        setBuilderOpen(true);
    };

    const openBuilderForCell = (cellId: number) => {
        setBuilderWeek(JSON.parse(JSON.stringify(schedules[cellId])));
        setApplyTarget('single');
        setSingleCellId(cellId);
        setBuilderOpen(true);
    };

    // --- Builder interactions ---
    const toggleBuilderDay = (day: number, type: VisitType) => {
        setBuilderWeek((prev) => ({
            ...prev,
            [day]: { ...prev[day], [`${type}_available`]: !prev[day][`${type}_available`] },
        }));
    };

    const bulkBuilder = (days: number[], type: VisitType) => {
        const key = `${type}_available` as const;
        const allOn = days.every((d) => builderWeek[d][key]);
        const next = !allOn;
        setBuilderWeek((prev) => {
            const updated = { ...prev };
            days.forEach((d) => (updated[d] = { ...updated[d], [key]: next }));
            return updated;
        });
    };

    const clearBuilder = () => setBuilderWeek(emptyWeek());

    const targetCellIds = (): number[] => {
        if (applyTarget === 'all') return cells.map((c) => c.id);
        if (applyTarget === 'single') return singleCellId ? [singleCellId] : [];
        return Array.from(selectedCellIds);
    };

    const targetCount = targetCellIds().length;

    const handleApply = () => {
        const ids = targetCellIds();
        if (ids.length === 0) return;
        setSchedules((prev) => {
            const next = { ...prev };
            ids.forEach((id) => {
                next[id] = JSON.parse(JSON.stringify(builderWeek));
            });
            return next;
        });
        setBuilderOpen(false);
    };

    const revertCell = (cellId: number) => {
        setSchedules((prev) => ({ ...prev, [cellId]: originalSchedules[cellId] }));
    };

    const revertAll = () => setSchedules(originalSchedules);

    // --- Selection ---
    const toggleSelectCell = (cellId: number) => {
        setSelectedCellIds((prev) => {
            const next = new Set(prev);
            if (next.has(cellId)) next.delete(cellId);
            else next.add(cellId);
            return next;
        });
    };

    const allFilteredSelected =
        filteredCells.length > 0 && filteredCells.every((c) => selectedCellIds.has(c.id));

    const toggleSelectAllFiltered = () => {
        setSelectedCellIds((prev) => {
            const next = new Set(prev);
            if (allFilteredSelected) {
                filteredCells.forEach((c) => next.delete(c.id));
            } else {
                filteredCells.forEach((c) => next.add(c.id));
            }
            return next;
        });
    };

    // --- Persist ---
    const handleSaveAll = () => {
        if (dirtyCount === 0) return;
        setIsSaving(true);

        const payload = Array.from(dirtyCellIds).map((cellId) => ({
            cell_id: cellId,
            schedules: DAYS.map((day) => ({
                day_of_week: day,
                virtual_available: schedules[cellId][day].virtual_available,
                physical_available: schedules[cellId][day].physical_available,
            })),
        }));

        router.put(
            '/jail-officer/cell-schedules/bulk',
            { cells: payload },
            { onFinish: () => setIsSaving(false) }
        );
    };

    const builderHasAny = DAYS.some(
        (d) => builderWeek[d].virtual_available || builderWeek[d].physical_available
    );

    return (
        <AppLayout>
            <Head title="Cell Schedule Templates" />
            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <div className="bg-white border-b border-slate-200 px-6 py-5 sticky top-0 z-30 shadow-sm">
                    <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-violet-600 rounded-xl"><Calendar className="w-5 h-5 text-white" /></div>
                            <div>
                                <h1 className="text-lg font-bold text-slate-900 leading-none">Cell Schedule Templates</h1>
                                <p className="text-xs text-slate-500 mt-0.5">Set which days each cell allows virtual and physical visits</p>
                            </div>
                        </div>
                        <Button onClick={openBuilderForAll} className="bg-violet-600 hover:bg-violet-700 text-white shadow-sm gap-1.5 text-sm">
                            <Sparkles className="w-4 h-4" />Open Schedule Builder
                        </Button>
                    </div>
                </div>

                <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">
                    {flash?.success && (
                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg text-sm">{flash.success}</div>
                    )}
                    {flash?.error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{flash.error}</div>
                    )}

                    {/* Table Card */}
                    <Card className="border-0 shadow-sm">
                    {/* Toolbar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="relative w-64">
                                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search cell number…"
                                    className="h-9 pl-9 text-sm"
                                />
                            </div>

                            <Select
                                value={statusFilter}
                                onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
                            >
                                <SelectTrigger className="h-9 w-36 text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All statuses</SelectItem>
                                    <SelectItem value="active">Active only</SelectItem>
                                    <SelectItem value="inactive">Inactive only</SelectItem>
                                </SelectContent>
                            </Select>

                            {selectedCellIds.size > 0 && (
                                <>
                                    <Badge variant="secondary" className="h-9 gap-1.5 px-3">
                                        {selectedCellIds.size} selected
                                        <button
                                            type="button"
                                            onClick={() => setSelectedCellIds(new Set())}
                                            aria-label="Clear selection"
                                            className="ml-0.5 rounded-full hover:text-foreground"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                    <Button size="sm" variant="outline" onClick={openBuilderForAll}>
                                        Apply schedule to selected
                                    </Button>
                                </>
                            )}
                        </div>

                        <p className="text-xs text-muted-foreground">
                            {filteredCells.length} of {cells.length} cell
                            {cells.length === 1 ? '' : 's'}
                        </p>
                    </div>

                    {/* Table */}
                    {filteredCells.length === 0 ? (
                        <CardContent className="flex flex-1 flex-col items-center justify-center py-16">
                            <AlertCircle className="mb-3 h-10 w-10 text-muted-foreground" />
                            <p className="text-base font-medium">
                                {cells.length === 0 ? 'No cells found' : 'No matching cells'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {cells.length === 0
                                    ? 'Create cells first in the Cell Management page.'
                                    : 'Try a different search term or filter.'}
                            </p>
                        </CardContent>
                    ) : (
                        <div className="flex-1 overflow-auto">
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 z-10 bg-background">
                                    <tr className="border-b text-xs text-muted-foreground">
                                        <th className="w-12 px-5 py-3">
                                            <Checkbox
                                                checked={allFilteredSelected}
                                                onCheckedChange={toggleSelectAllFiltered}
                                                aria-label="Select all visible cells"
                                            />
                                        </th>
                                        <th className="px-3 py-3 text-left font-medium">Cell</th>
                                        <th className="px-3 py-3 text-left font-medium">Status</th>
                                        <th className="px-3 py-3 text-left font-medium">
                                            <span className="flex items-center gap-1.5">
                                                <Monitor className="h-3.5 w-3.5" />
                                                Virtual
                                            </span>
                                        </th>
                                        <th className="px-3 py-3 text-left font-medium">
                                            <span className="flex items-center gap-1.5">
                                                <UserCheck className="h-3.5 w-3.5" />
                                                Physical
                                            </span>
                                        </th>
                                        <th className="w-24 px-5 py-3 text-right font-medium">
                                            Action
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredCells.map((cell) => {
                                        const week = schedules[cell.id];
                                        const isDirty = dirtyCellIds.has(cell.id);
                                        const vCount = activeDayCount(week, 'virtual');
                                        const pCount = activeDayCount(week, 'physical');

                                        return (
                                            <tr
                                                key={cell.id}
                                                className={cn(
                                                    'border-b last:border-b-0 transition-colors hover:bg-muted/30',
                                                    isDirty && 'bg-amber-50/50 dark:bg-amber-950/10',
                                                    cell.status === 'inactive' && 'text-muted-foreground'
                                                )}
                                            >
                                                <td className="px-5 py-3.5">
                                                    <Checkbox
                                                        checked={selectedCellIds.has(cell.id)}
                                                        onCheckedChange={() =>
                                                            toggleSelectCell(cell.id)
                                                        }
                                                        aria-label={`Select ${cell.cell_number}`}
                                                    />
                                                </td>
                                                <td className="px-3 py-3.5 font-medium text-foreground">
                                                    <span className="flex items-center gap-2">
                                                        {cell.cell_number}
                                                        {isDirty && (
                                                            <span
                                                                className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500"
                                                                title="Unsaved changes"
                                                            />
                                                        )}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3.5">
                                                    <Badge
                                                        variant={
                                                            cell.status === 'active'
                                                                ? 'default'
                                                                : 'secondary'
                                                        }
                                                        className="text-[11px]"
                                                    >
                                                        {cell.status === 'active'
                                                            ? 'Active'
                                                            : 'Inactive'}
                                                    </Badge>
                                                </td>
                                                <td className="px-3 py-3.5">
                                                    <DayPreview week={week} type="virtual" />
                                                    <span className="ml-2 text-xs text-muted-foreground">
                                                        {vCount === 0
                                                            ? 'None'
                                                            : vCount === 7
                                                              ? 'Every day'
                                                              : `${vCount} day${vCount === 1 ? '' : 's'}`}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3.5">
                                                    <DayPreview week={week} type="physical" />
                                                    <span className="ml-2 text-xs text-muted-foreground">
                                                        {pCount === 0
                                                            ? 'None'
                                                            : pCount === 7
                                                              ? 'Every day'
                                                              : `${pCount} day${pCount === 1 ? '' : 's'}`}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        {isDirty && (
                                                            <button
                                                                type="button"
                                                                onClick={() => revertCell(cell.id)}
                                                                title="Revert to saved"
                                                                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                                                            >
                                                                <X className="h-3.5 w-3.5" />
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                openBuilderForCell(cell.id)
                                                            }
                                                            title={`Edit schedule for ${cell.cell_number}`}
                                                            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                                                        >
                                                            <Pencil className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>

                {/* ---------- Sticky save bar ---------- */}
                {dirtyCount > 0 && (
                    <div className="sticky bottom-0 flex items-center justify-between rounded-lg border bg-background px-5 py-3 shadow-lg">
                        <p className="text-sm">
                            <span className="font-medium">{dirtyCount}</span> cell
                            {dirtyCount === 1 ? '' : 's'} with unsaved changes
                        </p>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={revertAll}>
                                Discard all
                            </Button>
                            <Button size="sm" onClick={handleSaveAll} disabled={isSaving}>
                                <Save className="mr-2 h-4 w-4" />
                                {isSaving ? 'Saving…' : 'Save changes'}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
            </div>

            {/* ---------------------------------------------------------------- */}
            {/* Schedule builder modal                                            */}
            {/* ---------------------------------------------------------------- */}
            <Dialog open={builderOpen} onOpenChange={setBuilderOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Schedule builder</DialogTitle>
                        <DialogDescription>
                            Build a weekly availability pattern, then apply it to one cell,
                            selected cells, or every cell.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-5 py-2">
                        <DayGrid week={builderWeek} onToggle={toggleBuilderDay} onBulk={bulkBuilder} />

                        {builderHasAny && (
                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={clearBuilder}
                                    className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-destructive hover:underline"
                                >
                                    Clear all days
                                </button>
                            </div>
                        )}

                        <div className="space-y-2 rounded-lg border bg-muted/30 p-4">
                            <p className="text-xs font-medium text-muted-foreground">
                                Apply this schedule to
                            </p>
                            <div className="grid gap-2 sm:grid-cols-3">
                                <TargetOption
                                    active={applyTarget === 'all'}
                                    onClick={() => setApplyTarget('all')}
                                    label="All cells"
                                    sublabel={`${cells.length} total`}
                                />
                                <TargetOption
                                    active={applyTarget === 'selected'}
                                    onClick={() => setApplyTarget('selected')}
                                    label="Selected"
                                    sublabel={
                                        selectedCellIds.size > 0
                                            ? `${selectedCellIds.size} chosen`
                                            : 'None chosen yet'
                                    }
                                    disabled={selectedCellIds.size === 0}
                                />
                                <TargetOption
                                    active={applyTarget === 'single'}
                                    onClick={() => setApplyTarget('single')}
                                    label="One cell"
                                    sublabel={
                                        singleCellId
                                            ? cells.find((c) => c.id === singleCellId)?.cell_number
                                            : 'Choose below'
                                    }
                                />
                            </div>

                            {applyTarget === 'single' && (
                                <Select
                                    value={singleCellId ? String(singleCellId) : ''}
                                    onValueChange={(v) => setSingleCellId(Number(v))}
                                >
                                    <SelectTrigger className="h-9 text-sm">
                                        <SelectValue placeholder="Choose a cell" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {cells.map((c) => (
                                            <SelectItem key={c.id} value={String(c.id)}>
                                                {c.cell_number}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:justify-between">
                        <p className="text-xs text-muted-foreground">
                            Applying updates the table only — nothing is saved until you click
                            "Save changes."
                        </p>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setBuilderOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleApply}
                                disabled={
                                    !builderHasAny ||
                                    targetCount === 0 ||
                                    (applyTarget === 'single' && !singleCellId)
                                }
                            >
                                Apply to {targetCount} cell{targetCount === 1 ? '' : 's'}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

/* ---------------------------------------------------------------- */
/* Builder day grid (inside modal)                                   */
/* ---------------------------------------------------------------- */

function DayGrid({
    week,
    onToggle,
    onBulk,
}: {
    week: Record<number, ScheduleDay>;
    onToggle: (day: number, type: VisitType) => void;
    onBulk: (days: number[], type: VisitType) => void;
}) {
    const rows: { type: VisitType; label: string; icon: React.ReactNode }[] = [
        { type: 'virtual', label: 'Virtual', icon: <Monitor className="h-3.5 w-3.5" /> },
        { type: 'physical', label: 'Physical', icon: <UserCheck className="h-3.5 w-3.5" /> },
    ];

    return (
        <table className="w-full border-collapse text-sm">
            <thead>
                <tr>
                    <th className="w-24 pb-2 text-left text-xs font-medium text-muted-foreground">
                        Visit type
                    </th>
                    {DAYS.map((day) => (
                        <th
                            key={day}
                            className="pb-2 text-center text-xs font-medium text-muted-foreground"
                        >
                            {DAY_ABBR[day]}
                        </th>
                    ))}
                    <th className="w-44 pb-2 text-right text-xs font-medium text-muted-foreground">
                        Quick fill
                    </th>
                </tr>
            </thead>
            <tbody>
                {rows.map((row) => (
                    <tr key={row.type} className="border-t">
                        <td className="py-2.5 pr-2">
                            <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                                {row.icon}
                                {row.label}
                            </span>
                        </td>
                        {DAYS.map((day) => {
                            const isOn = week[day][`${row.type}_available`];
                            return (
                                <td key={day} className="py-1.5 text-center">
                                    <button
                                        type="button"
                                        onClick={() => onToggle(day, row.type)}
                                        aria-pressed={isOn}
                                        aria-label={`${row.label} on ${DAY_ABBR[day]}`}
                                        className={cn(
                                            'mx-auto flex h-8 w-9 items-center justify-center rounded-md border text-xs font-medium transition-colors',
                                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                                            isOn
                                                ? 'border-primary bg-primary text-primary-foreground'
                                                : 'border-input bg-background text-muted-foreground/40 hover:bg-muted'
                                        )}
                                    >
                                        {isOn ? (
                                            <Check className="h-3.5 w-3.5" />
                                        ) : (
                                            <Minus className="h-3 w-3" />
                                        )}
                                    </button>
                                </td>
                            );
                        })}
                        <td className="py-1.5 text-right">
                            <div className="flex justify-end gap-1">
                                <QuickFillButton
                                    label="Weekdays"
                                    onClick={() => onBulk(WEEKDAYS, row.type)}
                                />
                                <QuickFillButton
                                    label="Weekend"
                                    onClick={() => onBulk(WEEKEND, row.type)}
                                />
                                <QuickFillButton label="All" onClick={() => onBulk(DAYS, row.type)} />
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function QuickFillButton({ label, onClick }: { label: string; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="rounded-md border border-input px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
            {label}
        </button>
    );
}

/* ---------------------------------------------------------------- */
/* Apply-target option                                               */
/* ---------------------------------------------------------------- */

function TargetOption({
    active,
    onClick,
    label,
    sublabel,
    disabled,
}: {
    active: boolean;
    onClick: () => void;
    label: string;
    sublabel?: string;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={cn(
                'rounded-md border bg-background px-3 py-2 text-left transition-colors',
                'disabled:cursor-not-allowed disabled:opacity-50',
                active ? 'border-primary ring-1 ring-primary' : 'border-input hover:bg-muted/50'
            )}
        >
            <span className="block text-sm font-medium">{label}</span>
            {sublabel && (
                <span className="block text-[11px] text-muted-foreground">{sublabel}</span>
            )}
        </button>
    );
}

/* ---------------------------------------------------------------- */
/* Read-only day preview (table cell) — 7 small dots                 */
/* ---------------------------------------------------------------- */

function DayPreview({ week, type }: { week: Record<number, ScheduleDay>; type: VisitType }) {
    return (
        <span className="inline-flex items-center gap-0.5 align-middle">
            {DAYS.map((day) => {
                const isOn = week[day][`${type}_available`];
                return (
                    <span
                        key={day}
                        title={DAY_ABBR[day]}
                        className={cn(
                            'flex h-5 w-5 items-center justify-center rounded text-[9px] font-medium',
                            isOn
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground/40'
                        )}
                    >
                        {DAY_ABBR[day][0]}
                    </span>
                );
            })}
        </span>
    );
}
