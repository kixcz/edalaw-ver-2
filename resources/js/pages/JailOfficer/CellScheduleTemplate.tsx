import { Head, router, useForm, usePage } from '@inertiajs/react';
import { Save, AlertCircle, Monitor, UserCheck } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Cell Schedules',
        href: '/jail-officer/cell-schedules',
    },
];

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

const DAYS = [1, 2, 3, 4, 5, 6, 0]; // Monday to Sunday

export default function CellScheduleTemplate({ cells, dayNames }: Props) {
    const { flash } = usePage().props as { flash?: { success?: string; error?: string } };
    const [savingCellId, setSavingCellId] = useState<number | null>(null);

    // Initialize form data for each cell
    const initialSchedules: Record<number, Record<number, ScheduleDay>> = {};
    cells.forEach((cell) => {
        initialSchedules[cell.id] = {};
        DAYS.forEach((day) => {
            initialSchedules[cell.id][day] = {
                virtual_available: cell.schedules[day]?.virtual_available ?? false,
                physical_available: cell.schedules[day]?.physical_available ?? false,
            };
        });
    });

    const [schedules, setSchedules] = useState(initialSchedules);

    const handleScheduleChange = (
        cellId: number,
        day: number,
        type: 'virtual' | 'physical',
        checked: boolean
    ) => {
        setSchedules((prev) => ({
            ...prev,
            [cellId]: {
                ...prev[cellId],
                [day]: {
                    ...prev[cellId][day],
                    [`${type}_available`]: checked,
                },
            },
        }));
    };

    const handleSaveCell = (cellId: number) => {
        setSavingCellId(cellId);
        const cellSchedules = schedules[cellId];
        const formattedSchedules = DAYS.map((day) => ({
            day_of_week: day,
            virtual_available: cellSchedules[day].virtual_available,
            physical_available: cellSchedules[day].physical_available,
        }));

        router.put(
            `/jail-officer/cell-schedules/${cellId}`,
            { schedules: formattedSchedules },
            {
                onFinish: () => setSavingCellId(null),
            }
        );
    };

    const hasAnySchedule = (cell: Cell): boolean => {
        return DAYS.some(
            (day) =>
                schedules[cell.id]?.[day]?.virtual_available ||
                schedules[cell.id]?.[day]?.physical_available
        );
    };

    const getDayAbbreviation = (day: number): string => {
        const abbreviations: Record<number, string> = {
            0: 'Sun',
            1: 'Mon',
            2: 'Tue',
            3: 'Wed',
            4: 'Thu',
            5: 'Fri',
            6: 'Sat',
        };
        return abbreviations[day] || '';
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Cell Schedule Templates" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">Cell Schedule Templates</h1>
                        <p className="text-muted-foreground">
                            Configure which days each cell is available for virtual and physical visits
                        </p>
                    </div>
                </div>

                {flash?.success && (
                    <div className="rounded-md bg-green-500/10 p-4 text-green-600">
                        {flash.success}
                    </div>
                )}
                {flash?.error && (
                    <div className="rounded-md bg-destructive/10 p-4 text-destructive">
                        {flash.error}
                    </div>
                )}

                <div className="grid gap-4">
                    {cells.length === 0 ? (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-12">
                                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                                <p className="text-lg font-medium">No cells found</p>
                                <p className="text-muted-foreground">
                                    Please create cells first in the Cell Management page
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        cells.map((cell) => (
                            <Card key={cell.id}>
                                <CardHeader className="pb-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <CardTitle>{cell.cell_number}</CardTitle>
                                            <Badge
                                                variant={cell.status === 'active' ? 'default' : 'secondary'}
                                            >
                                                {cell.status === 'active' ? 'Active' : 'Inactive'}
                                            </Badge>
                                            {!hasAnySchedule(cell) && (
                                                <Badge variant="destructive" className="gap-1">
                                                    <AlertCircle className="h-3 w-3" />
                                                    No schedule set
                                                </Badge>
                                            )}
                                        </div>
                                        <Button
                                            onClick={() => handleSaveCell(cell.id)}
                                            disabled={savingCellId === cell.id}
                                            size="sm"
                                        >
                                            <Save className="mr-2 h-4 w-4" />
                                            {savingCellId === cell.id ? 'Saving...' : 'Save'}
                                        </Button>
                                    </div>
                                    <CardDescription>
                                        Configure visit availability for each day of the week
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {/* Header row */}
                                        <div className="grid grid-cols-8 gap-2 items-center">
                                            <div className="text-sm font-medium text-muted-foreground">
                                                Day
                                            </div>
                                            {DAYS.map((day) => (
                                                <div
                                                    key={day}
                                                    className="text-center text-sm font-medium"
                                                >
                                                    {getDayAbbreviation(day)}
                                                </div>
                                            ))}
                                        </div>
                                        <Separator />
                                        {/* Virtual visits row */}
                                        <div className="grid grid-cols-8 gap-2 items-center">
                                            <div className="flex items-center gap-2 text-sm">
                                                <Monitor className="h-4 w-4 text-blue-500" />
                                                <span>Virtual</span>
                                            </div>
                                            {DAYS.map((day) => (
                                                <div key={day} className="flex justify-center">
                                                    <Checkbox
                                                        checked={
                                                            schedules[cell.id]?.[day]
                                                                ?.virtual_available ?? false
                                                        }
                                                        onCheckedChange={(checked) =>
                                                            handleScheduleChange(
                                                                cell.id,
                                                                day,
                                                                'virtual',
                                                                checked as boolean
                                                            )
                                                        }
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                        {/* Physical visits row */}
                                        <div className="grid grid-cols-8 gap-2 items-center">
                                            <div className="flex items-center gap-2 text-sm">
                                                <UserCheck className="h-4 w-4 text-green-500" />
                                                <span>Physical</span>
                                            </div>
                                            {DAYS.map((day) => (
                                                <div key={day} className="flex justify-center">
                                                    <Checkbox
                                                        checked={
                                                            schedules[cell.id]?.[day]
                                                                ?.physical_available ?? false
                                                        }
                                                        onCheckedChange={(checked) =>
                                                            handleScheduleChange(
                                                                cell.id,
                                                                day,
                                                                'physical',
                                                                checked as boolean
                                                            )
                                                        }
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Summary */}
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {DAYS.map((day) => {
                                            const schedule = schedules[cell.id]?.[day];
                                            const hasVirtual = schedule?.virtual_available;
                                            const hasPhysical = schedule?.physical_available;

                                            if (!hasVirtual && !hasPhysical) return null;

                                            return (
                                                <div
                                                    key={day}
                                                    className="flex items-center gap-1 text-xs"
                                                >
                                                    <span className="font-medium">
                                                        {dayNames[day]}:
                                                    </span>
                                                    {hasVirtual && (
                                                        <Badge
                                                            variant="outline"
                                                            className="text-xs bg-blue-50 text-blue-600 border-blue-200"
                                                        >
                                                            Virtual
                                                        </Badge>
                                                    )}
                                                    {hasPhysical && (
                                                        <Badge
                                                            variant="outline"
                                                            className="text-xs bg-green-50 text-green-600 border-green-200"
                                                        >
                                                            Physical
                                                        </Badge>
                                                    )}
                                                </div>
                                            );
                                        })}
                                        {!hasAnySchedule(cell) && (
                                            <span className="text-xs text-muted-foreground">
                                                No days configured for visits
                                            </span>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>

                {/* Legend */}
                <Card className="mt-4">
                    <CardHeader>
                        <CardTitle className="text-sm">Legend & Instructions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex flex-wrap gap-6 text-sm">
                                <div className="flex items-center gap-2">
                                    <Monitor className="h-4 w-4 text-blue-500" />
                                    <span>Virtual - Video call visits</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <UserCheck className="h-4 w-4 text-green-500" />
                                    <span>Physical - In-person visits</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Checkbox checked={true} className="pointer-events-none" />
                                    <span>Checked = Available</span>
                                </div>
                            </div>
                            <div className="border-t pt-4">
                                <p className="text-sm font-medium mb-2">Time Configuration:</p>
                                <ul className="text-xs space-y-1 text-muted-foreground">
                                    <li>• <strong>Start/End Time:</strong> Operating hours for each visit type (applies to all days)</li>
                                    <li>• <strong>Duration:</strong> Length of each visit in minutes (1-120 min)</li>
                                    <li>• <strong>Interval:</strong> Break time between visits in minutes (0-30 min, set to 0 for no break)</li>
                                    <li>• Visitors will see available time slots based on these settings when scheduling</li>
                                </ul>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
