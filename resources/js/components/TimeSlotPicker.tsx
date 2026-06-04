import { Clock, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

type TimeSlot = {
    value: string; // HH:MM format (start time)
    label: string; // Display format (e.g., "7:00 AM - 7:10 AM")
    rangeLabel: string; // Full range display
    period: 'AM' | 'PM';
    currentBookings?: number;
    maxCapacity?: number;
    isFull?: boolean;
};

type TimeSlotPickerProps = {
    selectedTime?: string;
    bookedSlots?: string[];
    slotCapacities?: Record<string, { current: number; max: number; isFull: boolean }>;
    /** Slots where the current user already has a visit (unclickable, tooltip explains) */
    userBookedSlots?: string[];
    /** Slots where the inmate already has a visit scheduled (unclickable, prevents overbooking) */
    inmateBookedSlots?: string[];
    onTimeSelect: (time: string) => void;
    className?: string;
    visitType?: 'physical' | 'virtual';
    /** Duration of each visit in minutes (from admin settings) */
    durationMinutes?: number;
    /** Interval between visits in minutes (from admin settings) */
    intervalMinutes?: number;
    /** Selected date to check if time slots are in the past (format: YYYY-MM-DD) */
    selectedDate?: string;
    /** Start time for generating slots (format: HH:MM) */
    startTime?: string;
    /** End time for generating slots (format: HH:MM) */
    endTime?: string;
};

export function TimeSlotPicker({
    selectedTime,
    bookedSlots = [],
    slotCapacities = {},
    userBookedSlots = [],
    inmateBookedSlots = [],
    onTimeSelect,
    className,
    visitType,
    durationMinutes = 20,
    intervalMinutes = 5,
    selectedDate,
    startTime = '07:00',
    endTime = '18:00',
}: TimeSlotPickerProps) {
    const [activeTab, setActiveTab] = useState<'AM' | 'PM'>('AM');

    // Helper to format time for display
    const formatTime = (hour: number, minute: number, period: 'AM' | 'PM'): string => {
        const displayHour = hour === 0 ? 12 : (hour > 12 ? hour - 12 : hour);
        const displayMinute = `:${minute.toString().padStart(2, '0')}`;
        return `${displayHour}${displayMinute} ${period}`;
    };

    // Generate time slots based on duration and interval settings from admin
    const generateTimeSlots = (): TimeSlot[] => {
        const slots: TimeSlot[] = [];
        const slotInterval = durationMinutes + intervalMinutes;

        // Parse start and end times
        const [startHour, startMinute] = startTime.split(':').map(Number);
        const [endHour, endMinute] = endTime.split(':').map(Number);
        
        let currentMinutes = startHour * 60 + startMinute;
        const endMinutes = endHour * 60 + endMinute;

        while (currentMinutes < endMinutes) {
            const hour = Math.floor(currentMinutes / 60);
            const minute = currentMinutes % 60;
            const time24 = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            const period: 'AM' | 'PM' = hour < 12 ? 'AM' : 'PM';

            // Calculate end time based on duration
            const endTotalMinutes = currentMinutes + durationMinutes;
            const endHour = Math.floor(endTotalMinutes / 60);
            const endMinute = endTotalMinutes % 60;
            const endPeriod: 'AM' | 'PM' = endHour < 12 ? 'AM' : 'PM';

            const startLabel = formatTime(hour, minute, period);
            const endLabel = formatTime(endHour, endMinute, endPeriod);
            const rangeLabel = `${startLabel} - ${endLabel}`;

            const capacity = slotCapacities[time24] || { current: 0, max: 4, isFull: false };
            slots.push({
                value: time24,
                label: rangeLabel,
                rangeLabel: rangeLabel,
                period: hour < 12 ? 'AM' : 'PM',
                currentBookings: capacity.current,
                maxCapacity: capacity.max,
                isFull: capacity.isFull,
            });

            currentMinutes += slotInterval;
        }

        return slots;
    };

    const timeSlots = generateTimeSlots();
    const amSlots = timeSlots.filter((slot) => slot.period === 'AM');
    const pmSlots = timeSlots.filter((slot) => slot.period === 'PM');

    const isUserBooked = (slot: TimeSlot): boolean => userBookedSlots.includes(slot.value);

    // Check if a time slot is in the past (for today's date)
    const isPastTimeSlot = (slot: TimeSlot): boolean => {
        if (!selectedDate) return false;
        
        const today = new Date();
        const selected = new Date(selectedDate);
        
        // Check if selected date is today
        const isToday = today.toDateString() === selected.toDateString();
        if (!isToday) return false;
        
        // Parse slot time (HH:MM format)
        const [slotHour, slotMinute] = slot.value.split(':').map(Number);
        const slotTime = slotHour * 60 + slotMinute;
        
        // Get current time in minutes
        const currentHour = today.getHours();
        const currentMinute = today.getMinutes();
        const currentTime = currentHour * 60 + currentMinute;
        
        // Disable if slot time is in the past
        return slotTime <= currentTime;
    };

    const isInmateBooked = (slot: TimeSlot): boolean => {
        return inmateBookedSlots.includes(slot.value);
    };

    const isDisabled = (slot: TimeSlot): boolean => {
        return slot.isFull || isUserBooked(slot) || isInmateBooked(slot) || isPastTimeSlot(slot);
    };

    const getDisabledTooltip = (slot: TimeSlot): string => {
        if (isInmateBooked(slot)) {
            return 'This inmate already has a visit scheduled at this time. Please choose another.';
        }
        if (isUserBooked(slot)) {
            return 'You already have a visit in this time slot. Please choose another.';
        }
        if (isPastTimeSlot(slot)) {
            return 'This time slot has already passed';
        }
        if (slot.isFull) {
            return 'This time slot is full';
        }
        return '';
    };

    const handleSlotClick = (slot: TimeSlot) => {
        if (isDisabled(slot)) return;
        onTimeSelect(slot.value);
    };

    return (
        <div className={cn('space-y-4 border rounded-lg p-4 bg-card', className)}>
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                    <Clock className="size-4" />
                    Select Time Range
                </div>
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-md p-3">
                    <p className="text-xs text-blue-900 dark:text-blue-100 font-medium mb-1">
                        <AlertCircle className="size-3 inline mr-1" />
                        Select one {durationMinutes}-minute time slot per schedule.
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                        {visitType === 'virtual'
                            ? `Virtual visits use ${durationMinutes}-minute slots. Once a slot reaches capacity, it will be unavailable.`
                            : `Physical visits use ${durationMinutes}-minute slots. Once a slot reaches capacity, it will be unavailable.`}
                    </p>
                </div>
            </div>
            
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'AM' | 'PM')} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="AM">AM (7:00 AM - 12:00 PM)</TabsTrigger>
                    <TabsTrigger value="PM">PM (12:00 PM - 6:00 PM)</TabsTrigger>
                </TabsList>
                
                <TabsContent value="AM" className="mt-4">
                    <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto p-2 border rounded-md bg-muted/30">
                        {amSlots.map((slot) => {
                            const isSelected = selectedTime === slot.value;
                            const disabled = isDisabled(slot);
                            
                            return (
                                <div key={slot.value} className="relative">
                                    <Button
                                        type="button"
                                        variant={isSelected ? 'default' : 'outline'}
                                        size="sm"
                                        disabled={disabled}
                                        onClick={() => handleSlotClick(slot)}
                                        className={cn(
                                            'w-full text-xs font-medium transition-all',
                                            isSelected && 'bg-primary text-primary-foreground shadow-md',
                                            disabled && 'opacity-40 cursor-not-allowed hover:opacity-40',
                                            !disabled && !isSelected && 'hover:bg-accent'
                                        )}
                                        title={disabled ? getDisabledTooltip(slot) : `${slot.rangeLabel} — ${Math.max(0, (slot.maxCapacity ?? 0) - (slot.currentBookings ?? 0))}/${slot.maxCapacity} available`}
                                    >
                                        <div className="flex flex-col items-center gap-1">
                                            <span>{slot.label}</span>
                                            {slot.maxCapacity && (
                                                <span className={cn(
                                                    'text-[10px]',
                                                    slot.isFull ? 'text-destructive' : 'text-muted-foreground'
                                                )}>
                                                    {Math.max(0, (slot.maxCapacity ?? 0) - (slot.currentBookings ?? 0))}/{slot.maxCapacity} available
                                                </span>
                                            )}
                                        </div>
                                    </Button>
                                    {disabled && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-destructive/10 rounded-md pointer-events-none">
                                            <span className="text-[10px] font-medium text-destructive">
                                                {isUserBooked(slot) ? 'Your slot' : isPastTimeSlot(slot) ? 'Passed' : 'Full'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </TabsContent>
                
                <TabsContent value="PM" className="mt-4">
                    <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto p-2 border rounded-md bg-muted/30">
                        {pmSlots.map((slot) => {
                            const isSelected = selectedTime === slot.value;
                            const disabled = isDisabled(slot);
                            
                            return (
                                <div key={slot.value} className="relative">
                                    <Button
                                        type="button"
                                        variant={isSelected ? 'default' : 'outline'}
                                        size="sm"
                                        disabled={disabled}
                                        onClick={() => handleSlotClick(slot)}
                                        className={cn(
                                            'w-full text-xs font-medium transition-all',
                                            isSelected && 'bg-primary text-primary-foreground shadow-md',
                                            disabled && 'opacity-40 cursor-not-allowed hover:opacity-40',
                                            !disabled && !isSelected && 'hover:bg-accent'
                                        )}
                                        title={disabled ? getDisabledTooltip(slot) : `${slot.rangeLabel} — ${Math.max(0, (slot.maxCapacity ?? 0) - (slot.currentBookings ?? 0))}/${slot.maxCapacity} available`}
                                    >
                                        <div className="flex flex-col items-center gap-1">
                                            <span>{slot.label}</span>
                                            {slot.maxCapacity && (
                                                <span className={cn(
                                                    'text-[10px]',
                                                    slot.isFull ? 'text-destructive' : 'text-muted-foreground'
                                                )}>
                                                    {Math.max(0, (slot.maxCapacity ?? 0) - (slot.currentBookings ?? 0))}/{slot.maxCapacity} available
                                                </span>
                                            )}
                                        </div>
                                    </Button>
                                    {disabled && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-destructive/10 rounded-md pointer-events-none">
                                            <span className="text-[10px] font-medium text-destructive">
                                                {isUserBooked(slot) ? 'Your slot' : isPastTimeSlot(slot) ? 'Passed' : 'Full'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </TabsContent>
            </Tabs>
            
            {selectedTime && (
                <div className="text-sm font-medium text-primary border-t pt-3">
                    Selected Time Range: <span className="font-bold">{timeSlots.find(s => s.value === selectedTime)?.rangeLabel}</span>
                </div>
            )}
        </div>
    );
}
