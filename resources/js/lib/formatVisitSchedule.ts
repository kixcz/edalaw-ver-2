/**
 * Single source of truth for displaying visit schedule date and time across all modules.
 * Times are shown in 12-hour format with configurable duration.
 */
export type VisitType = 'virtual' | 'physical';

export interface FormattedSchedule {
    dateLabel: string;
    timeLabel: string;
}

// Default durations (should match admin settings)
const DEFAULT_DURATIONS: Record<VisitType, number> = {
    virtual: 20,  // 20 minutes for virtual visits
    physical: 30, // 30 minutes for physical visits
};

const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
};

/** Format hour/minute as 12-hour string (e.g. "3:00 PM"). */
export function to12hr(hours: number, minutes: number): string {
    const period = hours < 12 ? 'AM' : 'PM';
    const h = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    const m = minutes.toString().padStart(2, '0');
    return `${h}:${m} ${period}`;
}

/** Format a time string like "14:05" or "14:05:00" into "2:05 PM" */
export function formatTime12(timeStr?: string | null): string {
    if (!timeStr) return '—';
    const parts = timeStr.trim().split(':');
    if (parts.length < 2) return timeStr;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return timeStr;
    return to12hr(h, m);
}

/**
 * Format scheduled_date + scheduled_time + visit_type into consistent date and time strings (12-hour format).
 * Duration is based on visit type (virtual: 20 min, physical: 30 min by default).
 */
export function formatVisitSchedule(
    scheduledDate: string,
    scheduledTime: string | null,
    visitType: VisitType,
    durationMinutes?: number
): FormattedSchedule {
    const dateLabel = new Date(scheduledDate).toLocaleDateString('en-US', dateOptions);

    if (!scheduledTime) {
        return { dateLabel, timeLabel: '—' };
    }

    const [hours, minutes] = scheduledTime.split(':').map(Number);
    
    // Use provided duration or default based on visit type
    const duration = durationMinutes ?? DEFAULT_DURATIONS[visitType] ?? 20;
    
    // Calculate end time
    const startTotalMinutes = hours * 60 + minutes;
    const endTotalMinutes = startTotalMinutes + duration;
    const endH = Math.floor(endTotalMinutes / 60);
    const endM = endTotalMinutes % 60;
    
    const timeLabel = `${to12hr(hours, minutes)} – ${to12hr(endH, endM)}`;

    return { dateLabel, timeLabel };
}

/**
 * Format session scheduled_start and scheduled_end (ISO strings) into 12-hour time style.
 */
export function formatSessionSchedule(scheduledStart: string, scheduledEnd: string): FormattedSchedule {
    const start = new Date(scheduledStart);
    const end = new Date(scheduledEnd);
    const dateLabel = start.toLocaleDateString('en-US', dateOptions);
    const timeLabel = `${to12hr(start.getHours(), start.getMinutes())} – ${to12hr(end.getHours(), end.getMinutes())}`;
    return { dateLabel, timeLabel };
}

/**
 * Whether the visit's scheduled slot has ended (so video link should be disabled).
 * Duration is based on visit type (virtual: 20 min, physical: 30 min by default).
 */
export function isScheduleEnded(scheduledDate: string, scheduledTime: string | null, visitType: VisitType, durationMinutes?: number): boolean {
    if (!scheduledTime) return true;
    const [hours, minutes] = scheduledTime.split(':').map(Number);
    const duration = durationMinutes ?? DEFAULT_DURATIONS[visitType] ?? 20;
    const end = new Date(scheduledDate);
    const endTotalMinutes = hours * 60 + minutes + duration;
    const endH = Math.floor(endTotalMinutes / 60);
    const endM = endTotalMinutes % 60;
    end.setHours(endH, endM, 0, 0);
    return new Date() >= end;
}
