import { Head, router, useForm, usePage } from '@inertiajs/react';

import type { ColumnDef } from '@tanstack/react-table';
import axios from 'axios';

import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { RelationshipPicker } from '@/components/RelationshipPicker';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Clock, Plus, Scale, User, Video, X, CalendarClock, FileText, MoreVertical, FileOutput, VideoIcon, Search, Building, AlertCircle, CheckCircle2, Upload, Eye } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { DataTable } from '@/components/data-table';
import InputError from '@/components/input-error';
import { TimeSlotPicker } from '@/components/TimeSlotPicker';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import AppLayout from '@/layouts/app-layout';
import { formatVisitSchedule } from '@/lib/formatVisitSchedule';
import visitor from '@/routes/visitor/index';
import type { BreadcrumbItem } from '@/types';

type InmateSearchResult = {
    id: number;
    first_name: string;
    middle_name: string | null;
    last_name: string;
    inmate_number: string;
    cell: {
        id: number;
        cell_number: string;
    };
    available_days: Record<number, { virtual: boolean; physical: boolean }>;
};

type VisitSessionInfo = {
    id: number;
    scheduled_start: string;
    scheduled_end: string;
    status: string;
    terms_accepted_at: string | null;
    can_join_video: boolean;
    join_disabled_reason?: 'not_started' | 'ended' | null;
} | null;

type Visit = {
    id: number;
    scheduled_date: string;
    scheduled_time: string | null;
    visit_type: 'virtual' | 'physical';
    inmate_first_name: string;
    inmate_middle_name: string | null;
    inmate_last_name: string;
    status: 'pending' | 'approved' | 'rejected' | 'missed' | 'completed' | 'cancelled';
    notes: string | null;
    meeting_link: string | null;
    join_url: string | null;
    access_key: string | null;
    access_key_expires_at: string | null;
    jail_officer_id: number | null;
    jail_officer_name: string | null;
    rejection_reason: string | null;
    created_at: string;
    can_appeal?: boolean;
    appeal_deadline?: string | null;
    visit_session?: VisitSessionInfo;
};

type Props = {
    visits: Visit[];
    bookedTimeSlots?: string[];
    today_unavailable?: boolean;
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Visit Management',
        href: '/visitor/schedule',
    },
];

function getStatusBadge(status: string) {
    const badges: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string; label: string }> = {
        pending: {
            variant: 'secondary',
            className: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
            label: 'Pending',
        },
        approved: {
            variant: 'default',
            className: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
            label: 'Approved',
        },
        rejected: {
            variant: 'destructive',
            className: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
            label: 'Rejected',
        },
        completed: {
            variant: 'default',
            className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
            label: 'Completed',
        },
        missed: {
            variant: 'outline',
            className: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20',
            label: 'Missed',
        },
        cancelled: {
            variant: 'outline',
            className: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
            label: 'Cancelled',
        },
    };

    const config = badges[status] || badges.pending;
    return (
        <Badge variant={config.variant} className={config.className}>
            {config.label}
        </Badge>
    );
}

function getVisitTypeBadge(type: string) {
    return type === 'virtual' ? (
        <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20">
            Virtual
        </Badge>
    ) : (
        <Badge variant="secondary" className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20">
            Physical
        </Badge>
    );
}

function formatTimeUntil(scheduledStart: string): string {
    const now = Date.now();
    const start = new Date(scheduledStart).getTime();
    const diff = start - now;
    
    if (diff <= 0) return '';
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours >= 1) {
        const remainingMinutes = minutes % 60;
        return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes}m`;
}


export default function ScheduleManagement({ visits, bookedTimeSlots = [] }: Props) {
    const { props } = usePage<{ bookedTimeSlots?: string[] }>();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
    const [isAppealModalOpen, setIsAppealModalOpen] = useState(false);
    const [selectedVisitForReschedule, setSelectedVisitForReschedule] = useState<Visit | null>(null);
    const [selectedVisitForAppeal, setSelectedVisitForAppeal] = useState<Visit | null>(null);
    useToast();
    const [visitType, setVisitType] = useState<string>('');
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [rescheduleDate, setRescheduleDate] = useState<string>('');
    const [bookedSlots, setBookedSlots] = useState<string[]>(bookedTimeSlots);
    const [rescheduleBookedSlots, setRescheduleBookedSlots] = useState<string[]>([]);
    const [slotCapacities, setSlotCapacities] = useState<Record<string, { current: number; max: number; isFull: boolean }>>({});
    const [userBookedSlots, setUserBookedSlots] = useState<string[]>([]);
    const [inmateBookedSlots, setInmateBookedSlots] = useState<string[]>([]);
    const [rescheduleSlotCapacities, setRescheduleSlotCapacities] = useState<Record<string, { current: number; max: number; isFull: boolean }>>({});
    const [isDayUnavailable, setIsDayUnavailable] = useState(false);
    const [rescheduleDayUnavailable, setRescheduleDayUnavailable] = useState(false);
    const [durationMinutes, setDurationMinutes] = useState<number>(20);
    const [intervalMinutes, setIntervalMinutes] = useState<number>(5);
    const [startTime, setStartTime] = useState<string>('07:00');
    const [endTime, setEndTime] = useState<string>('18:00');
    const [rescheduleDurationMinutes, setRescheduleDurationMinutes] = useState<number>(20);
    const [rescheduleIntervalMinutes, setRescheduleIntervalMinutes] = useState<number>(5);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [visitTypeFilter, setVisitTypeFilter] = useState<string>('all');
    const [videoTermsModalOpen, setVideoTermsModalOpen] = useState(false);
    const [selectedSessionForVideo, setSelectedSessionForVideo] = useState<{ sessionId: number; visit: Visit } | null>(null);
    const [videoTermsAccepted, setVideoTermsAccepted] = useState(false);
    const [acceptingTerms, setAcceptingTerms] = useState(false);
    const [beforeScheduleSession, setBeforeScheduleSession] = useState<{ sessionId: number; visit: Visit } | null>(null);
    const [isViewDetailsModalOpen, setIsViewDetailsModalOpen] = useState(false);
    const [selectedVisitForDetails, setSelectedVisitForDetails] = useState<Visit | null>(null);
    const todayDate = new Date();
    const today = todayDate.toISOString().split('T')[0];
    const tomorrow = new Date(todayDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minScheduleDate = (usePage().props as Props).today_unavailable ? tomorrow.toISOString().split('T')[0] : today;

    // Listen for video room close events (from localStorage)
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (!e.key || !e.key.startsWith('session_refresh_')) return;
            
            const sessionId = e.key.replace('session_refresh_', '');
            const value = e.newValue;
            
            if (value === 'ended') {
                console.log(`Session ${sessionId} ended - refreshing page...`);
                // Refresh the page to update session status
                window.location.reload();
            }
        };

        window.addEventListener('storage', handleStorageChange);
        
        // Cleanup listener on unmount
        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);

    // Inmate search states
    const [isSearchingInmate, setIsSearchingInmate] = useState(false);
    const [inmateSearchResult, setInmateSearchResult] = useState<InmateSearchResult | null>(null);
    const [inmateSearchError, setInmateSearchError] = useState<string | null>(null);
    const [selectedInmateId, setSelectedInmateId] = useState<number | null>(null);
    const [cellAvailabilityError, setCellAvailabilityError] = useState<string | null>(null);
    const [isInmateTagged, setIsInmateTagged] = useState<boolean | null>(null);

    const form = useForm({
        scheduled_date: '',
        scheduled_time: '',
        visit_type: '',
        inmate_first_name: '',
        inmate_middle_name: '',
        inmate_last_name: '',
        relationship_to_inmate: '',
        notes: '',
        relationship_proof: null as File | null,
        additional_proof: null as File | null,
        privacy_acknowledged: false,
    });

    const rescheduleForm = useForm({
        scheduled_date: '',
        scheduled_time: '',
    });

    const appealForm = useForm({
        appealable_type: 'visit',
        appealable_id: 0,
        reason: '',
        documents: [] as File[],
    });

    // Update booked slots when props change
    const bookedTimeSlotsFromProps = props.bookedTimeSlots;
    useEffect(() => {
        if (bookedTimeSlotsFromProps !== undefined) {
            setBookedSlots(bookedTimeSlotsFromProps);
            setLoadingSlots(false);
        }
    }, [bookedTimeSlotsFromProps]);

    // Fetch capacity information when date or visit type changes
    useEffect(() => {
        if (!selectedDate || !visitType) {
            setSlotCapacities({});
            setUserBookedSlots([]);
            setInmateBookedSlots([]);
            setLoadingSlots(false);
            return;
        }

        const fetchSlotCapacities = async () => {
            setLoadingSlots(true);
            setIsDayUnavailable(false);
            try {
                let url = `/visitor/schedules/booked-slots?date=${selectedDate}&visit_type=${visitType}`;
                if (selectedInmateId) {
                    url += `&inmate_id=${selectedInmateId}`;
                }
                
                const response = await fetch(url);
                const data = await response.json();
                if (data.slotCapacities) {
                    setSlotCapacities(data.slotCapacities);
                }
                if (Array.isArray(data.userBookedSlots)) {
                    setUserBookedSlots(data.userBookedSlots);
                } else {
                    setUserBookedSlots([]);
                }
                if (Array.isArray(data.inmateBookedSlots)) {
                    setInmateBookedSlots(data.inmateBookedSlots);
                } else {
                    setInmateBookedSlots([]);
                }
                if (data.isDayUnavailable === true) {
                    setIsDayUnavailable(true);
                }
                // Set duration and interval from admin settings
                if (typeof data.durationMinutes === 'number') {
                    setDurationMinutes(data.durationMinutes);
                }
                if (typeof data.intervalMinutes === 'number') {
                    setIntervalMinutes(data.intervalMinutes);
                }
                if (typeof data.startTime === 'string') {
                    setStartTime(data.startTime);
                }
                if (typeof data.endTime === 'string') {
                    setEndTime(data.endTime);
                }
            } catch (error) {
                console.error('Error fetching slot capacities:', error);
            } finally {
                setLoadingSlots(false);
            }
        };

        fetchSlotCapacities();
    }, [selectedDate, visitType, selectedInmateId]);

    // Filter visits based on selected filters
    const filteredVisits = useMemo(() => {
        return visits.filter((visit) => {
            const matchesStatus = statusFilter === 'all' || visit.status === statusFilter;
            const matchesVisitType = visitTypeFilter === 'all' || visit.visit_type === visitTypeFilter;
            return matchesStatus && matchesVisitType;
        });
    }, [visits, statusFilter, visitTypeFilter]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validate that selected date matches cell schedule
        if (inmateSearchResult && form.data.scheduled_date && form.data.visit_type) {
            const selectedDate = new Date(form.data.scheduled_date);
            const dayOfWeek = selectedDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
            const availability = inmateSearchResult.available_days[dayOfWeek];
            
            let isAllowed = false;
            if (form.data.visit_type === 'virtual' && availability?.virtual) {
                isAllowed = true;
            } else if (form.data.visit_type === 'physical' && availability?.physical) {
                isAllowed = true;
            }
            
            if (!isAllowed) {
                const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                toast.error(`This cell is not available for ${form.data.visit_type} visits on ${dayNames[dayOfWeek]}s. Please select a different date.`);
                return;
            }
        }
        
        form.post(visitor.schedule.store().url, {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => {
                form.reset();
                setVisitType('');
                setSelectedDate('');
                setBookedSlots([]);
                setInmateSearchResult(null);
                setSelectedInmateId(null);
                setCellAvailabilityError(null);
                setIsModalOpen(false);
            },
            onError: () => {
                toast.error('Failed to submit visit schedule. Please check the form and try again.');
            },
        });
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        form.reset();
        setVisitType('');
        setSelectedDate('');
        setBookedSlots([]);
        setInmateSearchResult(null);
        setInmateSearchError(null);
        setSelectedInmateId(null);
        setCellAvailabilityError(null);
    };

    // Search for inmate by name
    const handleSearchInmate = async () => {
        if (!form.data.inmate_first_name || !form.data.inmate_last_name) {
            setInmateSearchError('Please enter both first name and last name to search');
            return;
        }

        setIsSearchingInmate(true);
        setInmateSearchError(null);
        setInmateSearchResult(null);
        setSelectedInmateId(null);
        setCellAvailabilityError(null);
        setIsInmateTagged(null);

        try {
            console.log('Searching for inmate:', {
                first_name: form.data.inmate_first_name,
                middle_name: form.data.inmate_middle_name,
                last_name: form.data.inmate_last_name,
            });
            
            const response = await axios.post('/visitor/schedule/search-inmate', {
                first_name: form.data.inmate_first_name,
                middle_name: form.data.inmate_middle_name,
                last_name: form.data.inmate_last_name,
            });

            console.log('Search response:', response.data);

            if (response.data.found && response.data.inmate) {
                setInmateSearchResult(response.data.inmate);
                setSelectedInmateId(response.data.inmate.id);
                
                // Check if inmate is already tagged to this visitor
                if (response.data.inmate.id) {
                    try {
                        const tagResponse = await axios.post('/visitor/schedule/check-inmate-tagged', {
                            inmate_id: response.data.inmate.id,
                        });
                        setIsInmateTagged(tagResponse.data.is_tagged);
                        
                        if (tagResponse.data.is_tagged) {
                            toast.success('This inmate is already tagged to your account. No need to upload proof of relationship documents.');
                        }
                    } catch (tagError) {
                        console.error('Error checking tag status:', tagError);
                        // Continue even if tag check fails
                    }
                }
                
                // Show warning if inmate has no cell assigned
                if (response.data.warning) {
                    toast.warning(response.data.warning);
                }
            } else {
                setInmateSearchError(response.data.message || 'Inmate not found');
            }
        } catch (error: any) {
            console.error('Inmate search error:', error);
            if (error.response?.status === 404) {
                setInmateSearchError(error.response.data.message || 'Inmate not found');
            } else if (error.response?.status === 500) {
                setInmateSearchError('Server error. Please try again later.');
            } else {
                setInmateSearchError('An error occurred while searching. Please try again.');
            }
        } finally {
            setIsSearchingInmate(false);
        }
    };

    // Check cell availability when date or visit type changes
    const checkCellAvailability = async (date: string, visitType: string) => {
        if (!selectedInmateId || !date || !visitType) {
            setCellAvailabilityError(null);
            return;
        }

        try {
            const response = await axios.post('/visitor/schedule/check-cell-availability', {
                inmate_id: selectedInmateId,
                date: date,
                visit_type: visitType,
            });

            if (!response.data.available) {
                setCellAvailabilityError(response.data.message || 'This cell is not available for the selected date and visit type.');
            } else {
                setCellAvailabilityError(null);
            }
        } catch (error) {
            setCellAvailabilityError(null);
        }
    };

    const handleCancelVisit = (visitId: number) => {
        if (!confirm('Are you sure you want to cancel this visit schedule?')) {
            return;
        }

        router.post(visitor.schedule.cancel(visitId).url, {}, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Visit schedule cancelled successfully.');
            },
            onError: () => {
                toast.error('Failed to cancel visit schedule. Please try again.');
            },
        });
    };

    const handleOpenRescheduleModal = (visit: Visit) => {
        setSelectedVisitForReschedule(visit);
        setRescheduleDate(visit.scheduled_date);
        rescheduleForm.setData({
            scheduled_date: visit.scheduled_date,
            scheduled_time: visit.scheduled_time || '',
        });
        setIsRescheduleModalOpen(true);
    };

    const handleRescheduleModalClose = () => {
        setIsRescheduleModalOpen(false);
        setSelectedVisitForReschedule(null);
        rescheduleForm.reset();
        setRescheduleDate('');
        setRescheduleBookedSlots([]);
    };

    const handleRescheduleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedVisitForReschedule) {
            return;
        }

        rescheduleForm.post(visitor.schedule.reschedule(selectedVisitForReschedule.id).url, {
            preserveScroll: true,
            onSuccess: () => {
                rescheduleForm.reset();
                setRescheduleDate('');
                setRescheduleBookedSlots([]);
                setIsRescheduleModalOpen(false);
                setSelectedVisitForReschedule(null);
            },
            onError: () => {
                toast.error('Failed to reschedule visit. Please check the form and try again.');
            },
        });
    };

    const handleOpenAppealModal = (visit: Visit) => {
        if (!visit.can_appeal) {
            toast.error('The deadline for submitting an appeal has passed (48 hours after rejection).');
            return;
        }
        setSelectedVisitForAppeal(visit);
        appealForm.setData({
            appealable_type: 'visit',
            appealable_id: visit.id,
            reason: '',
            documents: [],
        });
        setIsAppealModalOpen(true);
    };

    const handleAppealModalClose = () => {
        setIsAppealModalOpen(false);
        setSelectedVisitForAppeal(null);
        appealForm.reset();
    };

    const handleOpenScheduleModal = () => {
        setIsModalOpen(true);
    };

    const handleCloseScheduleModal = () => {
        setIsModalOpen(false);
    };

    const handleAppealSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        appealForm.post('/visitor/appeals', {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => {
                appealForm.reset();
                setIsAppealModalOpen(false);
                setSelectedVisitForAppeal(null);
                toast.success('Appeal submitted successfully.');
            },
            onError: (errors) => {
                console.error('Appeal submission errors:', errors);
                
                // Get the first error message to show in toast
                const errorMessages: string[] = [];
                
                // Check for field-specific errors
                if (errors.reason) {
                    errorMessages.push(Array.isArray(errors.reason) ? errors.reason[0] : errors.reason);
                }
                if (errors.documents) {
                    errorMessages.push(Array.isArray(errors.documents) ? errors.documents[0] : errors.documents);
                }
                if (errors.appealable_type) {
                    errorMessages.push(Array.isArray(errors.appealable_type) ? errors.appealable_type[0] : errors.appealable_type);
                }
                if (errors.appealable_id) {
                    errorMessages.push(Array.isArray(errors.appealable_id) ? errors.appealable_id[0] : errors.appealable_id);
                }
                
                // Check for general appeal error
                if (errors.appeal) {
                    errorMessages.push(Array.isArray(errors.appeal) ? errors.appeal[0] : errors.appeal);
                }
                
                // Show the first error message in toast
                if (errorMessages.length > 0) {
                    toast.error(errorMessages[0]);
                } else {
                    toast.error('Failed to submit appeal. Please check the form and try again.');
                }
            },
        });
    };

    const handleAppealFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        appealForm.setData('documents', files);
    };

    // Fetch booked slots for reschedule date
    useEffect(() => {
        if (rescheduleDate && rescheduleDate !== selectedVisitForReschedule?.scheduled_date) {
            setLoadingSlots(true);
            router.get(
                visitor.schedule.index().url,
                { date: rescheduleDate },
                {
                    preserveState: true,
                    preserveScroll: true,
                    only: ['bookedTimeSlots'],
                    onSuccess: (page) => {
                        const bookedSlots = (page.props as { bookedTimeSlots?: string[] }).bookedTimeSlots || [];
                        setRescheduleBookedSlots(bookedSlots);
                        setLoadingSlots(false);
                    },
                    onError: () => {
                        setLoadingSlots(false);
                    },
                },
            );
        } else if (rescheduleDate === selectedVisitForReschedule?.scheduled_date) {
            // If rescheduling to the same date, exclude the current visit's time slot
            const currentTimeSlot = selectedVisitForReschedule?.scheduled_time;
            const bookedSlots = bookedTimeSlots.filter(slot => slot !== currentTimeSlot);
            setRescheduleBookedSlots(bookedSlots);
        }
    }, [rescheduleDate, selectedVisitForReschedule]);

    // Fetch capacity information for reschedule
    useEffect(() => {
        if (!rescheduleDate || !selectedVisitForReschedule) {
            setRescheduleSlotCapacities({});
            return;
        }

        const fetchRescheduleSlotCapacities = async () => {
            setLoadingSlots(true);
            setRescheduleDayUnavailable(false);
            try {
                const visitType = selectedVisitForReschedule.visit_type;
                const response = await fetch(`/visitor/schedules/booked-slots?date=${rescheduleDate}&visit_type=${visitType}`);
                const data = await response.json();
                if (data.slotCapacities) {
                    setRescheduleSlotCapacities(data.slotCapacities);
                }
                if (data.isDayUnavailable === true) {
                    setRescheduleDayUnavailable(true);
                }
                // Set duration and interval from admin settings
                if (typeof data.durationMinutes === 'number') {
                    setRescheduleDurationMinutes(data.durationMinutes);
                }
                if (typeof data.intervalMinutes === 'number') {
                    setRescheduleIntervalMinutes(data.intervalMinutes);
                }
            } catch (error) {
                console.error('Error fetching reschedule slot capacities:', error);
            } finally {
                setLoadingSlots(false);
            }
        };

        fetchRescheduleSlotCapacities();
    }, [rescheduleDate, selectedVisitForReschedule]);

    const columns: ColumnDef<Visit>[] = useMemo(() => [
        {
            accessorKey: 'id',
            header: 'ID',
            cell: ({ row }) => (
                <span className="font-mono text-sm text-muted-foreground">#{row.original.id}</span>
            ),
        },
        {
            accessorKey: 'scheduled_date',
            header: 'Date / Time', 
            cell: ({ row }) => {
                const visit = row.original;
                const { dateLabel, timeLabel } = formatVisitSchedule(
                    visit.scheduled_date,
                    visit.scheduled_time ?? null,
                    visit.visit_type
                );
                return (
                    <div className="space-y-1">
                        <div className="font-medium">{dateLabel}</div>
                        <div className="text-sm text-muted-foreground">{timeLabel}</div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'visit_type',
            header: 'Visit Type',
            cell: ({ row }) => getVisitTypeBadge(row.original.visit_type),
        },
        // {
        //     id: 'access_key',
        //     header: 'Access Key',
        //     cell: ({ row }) => {
        //         const visit = row.original;
        //         if (visit.visit_type === 'virtual') {
        //             return <span className="text-sm text-muted-foreground">Not applicable</span>;
        //         }
        //         if (visit.access_key) {
        //             return (
        //                 <code className="rounded bg-muted px-2 py-1 font-mono text-sm font-bold">
        //                     {visit.access_key}
        //                 </code>
        //             );
        //         }
        //         if (visit.status === 'approved') {
        //             return <span className="text-sm text-muted-foreground">Not generated</span>;
        //         }
        //         return <span className="text-sm text-muted-foreground">—</span>;
        //     },
        // },
        {
            id: 'jail_officer',
            header: 'Jail Officer',
            cell: ({ row }) => {
                const visit = row.original;
                if (visit.visit_type === 'physical') {
                    return <span className="text-sm text-muted-foreground">Not applicable</span>;
                }
                if (visit.jail_officer_name) {
                    return <span className="text-sm">{visit.jail_officer_name}</span>;
                }
                return <span className="text-sm text-muted-foreground">Not assigned</span>;
            },
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => getStatusBadge(row.original.status),
        },
        // {
        //     id: 'rejection_reason',
        //     header: 'Rejection Reasons',
        //     cell: ({ row }) => {
        //         const visit = row.original;
        //         if (visit.status === 'approved') {
        //             return <span className="text-sm text-muted-foreground">Application was approved</span>;
        //         }
        //         if (visit.status === 'pending') {
        //             return <span className="text-sm text-muted-foreground">Application was pending</span>;
        //         }
        //         if (visit.status === 'rejected' && visit.rejection_reason) {
        //             return (
        //                 <p className="max-w-xs text-sm text-destructive">{visit.rejection_reason}</p>
        //             );
        //         }
        //         return <span className="text-sm text-muted-foreground">—</span>;
        //     },
        // },
        {
            id: 'icon',
            header: '',
            cell: ({ row }) => {
                const visit = row.original;
                if (visit.visit_type === 'physical' && visit.status === 'approved') {
                    return (
                        <Button size="sm" variant="outline" asChild>
                            <a
                                href={`/visits/${visit.id}/proof`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex gap-2"
                                title="Proof of appointment (print to show officer)"
                            >
                                <FileOutput className="h-4 w-4" />
                                PDF
                            </a>
                        </Button>
                    );
                }
                if (visit.visit_type === 'virtual' && visit.status === 'approved') {
                    const session = visit.visit_session;
                    if (session?.can_join_video) {
                        return (
                            <Button
                                size="sm"
                                variant="default"
                                className="bg-green-600 hover:bg-green-700 inline-flex gap-2"
                                title="Join video call"
                                onClick={() => {
                                    if (!session) return;
                                    
                                    // Check if session has started
                                    const now = Date.now();
                                    const scheduledStart = session.scheduled_start ? new Date(session.scheduled_start).getTime() : now;
                                    
                                    if (scheduledStart > now) {
                                        setBeforeScheduleSession({ sessionId: session.id, visit });
                                        return;
                                    }
                                    
                                    setSelectedSessionForVideo({ sessionId: session.id, visit });
                                    setVideoTermsAccepted(false);
                                    setVideoTermsModalOpen(true);
                                }}
                            >
                                <VideoIcon className="h-4 w-4" />
                                Video Call
                            </Button>
                        );
                    }
                    if (session && ['completed', 'terminated'].includes(session.status)) {
                        return <span className="text-sm text-muted-foreground">Completed</span>;
                    }
                    const sessionNotExpired = session && new Date(session.scheduled_end) > new Date() && !['completed', 'terminated'].includes(session.status);
                    if (session && !session.can_join_video) {
                        if (sessionNotExpired) {
                            return (
                                <Button
                                    size="sm"
                                    variant="default"
                                    className="bg-green-600 hover:bg-green-700 inline-flex gap-2"
                                    title="Join video call (a reminder will show if it's not yet time)"
                                    onClick={() => {
                                        if (!session) return;
                                        
                                        const now = Date.now();
                                        const scheduledStart = session.scheduled_start ? new Date(session.scheduled_start).getTime() : now;
                                        
                                        if (scheduledStart > now) {
                                            setBeforeScheduleSession({ sessionId: session.id, visit });
                                            return;
                                        }
                                        
                                        setSelectedSessionForVideo({ sessionId: session.id, visit });
                                        setVideoTermsAccepted(false);
                                        setVideoTermsModalOpen(true);
                                    }}
                                >
                                    <VideoIcon className="h-4 w-4" />
                                    Video Call
                                </Button>
                            );
                        }
                        const tooltip = session.join_disabled_reason === 'not_started'
                            ? 'Video call is available from the scheduled start time.'
                            : session.join_disabled_reason === 'ended'
                                ? 'Schedule has ended.'
                                : 'Available during scheduled time only.';
                        return (
                            <Button size="sm" variant="outline" disabled className="inline-flex gap-2" title={tooltip}>
                                <VideoIcon className="h-4 w-4" />
                                Video Call
                            </Button>
                        );
                    }
                    if (visit.join_url) {
                        return (
                            <Button size="sm" variant="outline" asChild className="inline-flex gap-2">
                                <a href={visit.join_url} title="Join video call">
                                    <VideoIcon className="h-4 w-4" />
                                    Join
                                </a>
                            </Button>
                        );
                    }
                }
                return <span className="text-sm text-muted-foreground">—</span>;
            },
        },
        {
            id: 'actions',
            header: 'Actions',
            cell: ({ row }) => {
                const visit = row.original;
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            
                            {/* View Details - Always shown */}
                            <DropdownMenuItem onClick={() => {
                                setSelectedVisitForDetails(visit);
                                setIsViewDetailsModalOpen(true);
                            }}>
                                <Eye className="mr-2 h-4 w-4" />
                                View details
                            </DropdownMenuItem>
                            
                            {/* Proof of Appointment - Only for approved physical visits */}
                            {visit.visit_type === 'physical' && visit.status === 'approved' && (
                                <DropdownMenuItem onClick={() => {
                                    window.open(`/visits/${visit.id}/proof`, '_blank');
                                }}>
                                    <FileOutput className="mr-2 h-4 w-4" />
                                    Proof of appointment
                                </DropdownMenuItem>
                            )}
                            
                            {/* Rejection Reason - Only for rejected visits */}
                            {visit.status === 'rejected' && visit.rejection_reason && (
                                <DropdownMenuItem onClick={() => {
                                    setSelectedVisitForDetails(visit);
                                    setIsViewDetailsModalOpen(true);
                                }}>
                                    <AlertCircle className="mr-2 h-4 w-4" />
                                    View rejection reason
                                </DropdownMenuItem>
                            )}
                            
                            {visit.status === 'approved' && (
                                <DropdownMenuItem onClick={() => {
                                    const inmateName = encodeURIComponent(`${visit.inmate_first_name} ${visit.inmate_last_name}`);
                                    window.location.href = `/visitor/schedule?inmate=${inmateName}`;
                                }}>
                                    <User className="mr-2 h-4 w-4" />
                                    Set new schedule
                                </DropdownMenuItem>
                            )}
                            {(visit.status === 'pending' || visit.status === 'approved') && (
                                <>
                                    <DropdownMenuItem onClick={() => handleOpenRescheduleModal(visit)}>
                                        <CalendarClock className="mr-2 h-4 w-4" />
                                        Reschedule
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => handleCancelVisit(visit.id)}
                                        className="text-destructive focus:text-destructive"
                                    >
                                        <X className="mr-2 h-4 w-4" />
                                        Cancel
                                    </DropdownMenuItem>
                                </>
                            )}
                            {visit.status === 'rejected' && visit.can_appeal && (
                                <DropdownMenuItem onClick={() => handleOpenAppealModal(visit)}>
                                    <Scale className="mr-2 h-4 w-4" />
                                    Appeal
                                </DropdownMenuItem>
                            )}
                            {visit.status === 'rejected' && !visit.can_appeal && (
                                <DropdownMenuItem disabled className="text-muted-foreground">
                                    Appeal deadline passed
                                </DropdownMenuItem>
                            )}
                            {!['pending', 'approved', 'rejected'].includes(visit.status) && (
                                <DropdownMenuItem disabled className="text-muted-foreground">
                                    No actions available
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            },
        },
    ], [handleCancelVisit, handleOpenRescheduleModal, handleOpenAppealModal]);

    const currentVisitType = visitType || form.data.visit_type || '';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Visit Management" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">Visit Management</h1>
                        <p className="text-muted-foreground">
                            View and manage your visit schedule requests
                        </p>
                    </div>
                    <Button onClick={() => setIsModalOpen(true)}>
                        <Plus className="mr-2 size-4" />
                        Apply for Schedule
                    </Button>
                </div>

                {/* Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>My Visits</CardTitle>
                        <CardDescription>
                            {filteredVisits.length} of {visits.length} visit{visits.length !== 1 ? 's' : ''}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <DataTable
                            columns={columns}
                            data={filteredVisits}
                            searchKey="inmate_first_name"
                            searchPlaceholder="Search by inmate name, date..."
                            initialSorting={[{ id: 'scheduled_date', desc: true }]}
                            headerActions={
                                <div className="flex flex-wrap items-center gap-2">
                                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                                        <SelectTrigger className="w-[150px]">
                                            <SelectValue placeholder="All Statuses" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Statuses</SelectItem>
                                            <SelectItem value="pending">Pending</SelectItem>
                                            <SelectItem value="approved">Approved</SelectItem>
                                            <SelectItem value="rejected">Rejected</SelectItem>
                                            <SelectItem value="completed">Completed</SelectItem>
                                            <SelectItem value="missed">Missed</SelectItem>
                                            <SelectItem value="cancelled">Cancelled</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Select value={visitTypeFilter} onValueChange={setVisitTypeFilter}>
                                        <SelectTrigger className="w-[130px]">
                                            <SelectValue placeholder="All Types" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Types</SelectItem>
                                            <SelectItem value="virtual">Virtual</SelectItem>
                                            <SelectItem value="physical">Physical</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            }
                            emptyStateAction={
                                <button
                                    type="button"
                                    onClick={handleOpenScheduleModal}
                                    className="text-sm text-primary hover:underline font-medium"
                                >
                                    Apply for Visit
                                </button>
                            }
                        />
                    </CardContent>
                </Card>

                <Dialog open={videoTermsModalOpen} onOpenChange={setVideoTermsModalOpen}>
                    <DialogContent className="sm:max-w-2xl border-l-4 border-l-orange-500">
                      
                        <div className="space-y-6 py-4">
                            <div className="bg-orange-50 p-4 rounded-md">
                                <p className="text-sm text-gray-800 leading-relaxed">
                                    <strong className="font-semibold text-gray-900">Session Participation Consent:</strong>{" "}
                                    <span className="text-gray-700">By joining this session, I acknowledge and agree that the session may be monitored, recorded, reviewed, and documented by authorized personnel for security, compliance, audit, documentation, incident investigation, and legitimate operational purposes. I understand that chat messages, audio, video, and other session-related activities may be logged and retained in accordance with applicable policies and retention requirements. I further understand that any violation of applicable rules, regulations, or visitation policies may result in the immediate termination of the session and may be subject to appropriate administrative or legal action.</span>
                                </p>
                            </div>

                            <div className="flex items-start gap-3">
                                <Checkbox
                                    id="video-consent"
                                    checked={videoTermsAccepted}
                                    onCheckedChange={(c) => setVideoTermsAccepted(c === true)}
                                    className="h-5 w-5 mt-0.5"
                                />
                                <Label htmlFor="video-consent" className="text-sm font-medium cursor-pointer leading-snug">
                                    I have read, understood, and agree to the session monitoring and recording conditions.
                                </Label>
                            </div>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button 
                                variant="outline" 
                                onClick={() => {
                                    setVideoTermsModalOpen(false);
                                    setSelectedSessionForVideo(null);
                                }}
                                className="flex-1 mr-2 sm:flex-none"
                            >
                                Decline
                            </Button>
                            <Button 
                                disabled={!videoTermsAccepted || acceptingTerms}
                                onClick={async () => {
                                    if (!selectedSessionForVideo) return;
                                    const sessionId = selectedSessionForVideo.sessionId;
                                    setAcceptingTerms(true);
                                    
                                    try {
                                        const response = await axios.post(`/visit/session/${sessionId}/accept-consent`, {});
                                        if (response.data.success) {
                                            setVideoTermsModalOpen(false);
                                            setSelectedSessionForVideo(null);
                                            setAcceptingTerms(false);
                                            window.open(`/visit/session/${sessionId}/video-room`, '_blank');
                                        }
                                    } catch (error) {
                                        console.error('Error accepting consent:', error);
                                        setAcceptingTerms(false);
                                        alert('Error accepting consent. Please try again.');
                                    }
                                }}
                                className="flex-1 sm:flex-none bg-orange-600 hover:bg-orange-700 text-white"
                            >
                                {acceptingTerms ? 'Processing...' : 'I Accept'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Session Not Started Yet Modal */}
                <Dialog open={!!beforeScheduleSession} onOpenChange={(open) => !open && setBeforeScheduleSession(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Session not started yet</DialogTitle>
                            <DialogDescription>
                                {beforeScheduleSession?.visit.visit_session?.scheduled_start
                                    ? `This session starts in ${formatTimeUntil(beforeScheduleSession.visit.visit_session.scheduled_start)}. You can wait and try again when it's time, or cancel.`
                                    : 'This session has not started yet.'}
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setBeforeScheduleSession(null)}>
                                Wait
                            </Button>
                            <Button variant="secondary" onClick={() => setBeforeScheduleSession(null)}>
                                Cancel
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* View Details Modal */}
                <Dialog open={isViewDetailsModalOpen} onOpenChange={(open) => !open && setIsViewDetailsModalOpen(false)}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Visit Details</DialogTitle>
                        </DialogHeader>
                        
                        {selectedVisitForDetails && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <h4 className="text-sm font-semibold text-muted-foreground">Inmate Name</h4>
                                        <p className="text-sm">
                                            {selectedVisitForDetails.inmate_first_name}
                                            {selectedVisitForDetails.inmate_middle_name && ` ${selectedVisitForDetails.inmate_middle_name}`}
                                            {selectedVisitForDetails.inmate_last_name && ` ${selectedVisitForDetails.inmate_last_name}`}
                                        </p>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-semibold text-muted-foreground">Visit Type</h4>
                                        <p className="text-sm capitalize">{selectedVisitForDetails.visit_type}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <h4 className="text-sm font-semibold text-muted-foreground">Scheduled Date</h4>
                                        <p className="text-sm">{selectedVisitForDetails.scheduled_date}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-semibold text-muted-foreground">Scheduled Time</h4>
                                        <p className="text-sm">{selectedVisitForDetails.scheduled_time || 'Not specified'}</p>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-sm font-semibold text-muted-foreground">Status</h4>
                                    <div className="mt-1">
                                        {getStatusBadge(selectedVisitForDetails.status)}
                                    </div>
                                </div>

                                {selectedVisitForDetails.jail_officer_name && (
                                    <div>
                                        <h4 className="text-sm font-semibold text-muted-foreground">Assigned Jail Officer</h4>
                                        <p className="text-sm">{selectedVisitForDetails.jail_officer_name}</p>
                                    </div>
                                )}

                                {selectedVisitForDetails.notes && (
                                    <div>
                                        <h4 className="text-sm font-semibold text-muted-foreground">Notes</h4>
                                        <p className="text-sm">{selectedVisitForDetails.notes}</p>
                                    </div>
                                )}

                                {selectedVisitForDetails.rejection_reason && (
                                    <div>
                                        <h4 className="text-sm font-semibold text-muted-foreground">Rejection Reason</h4>
                                        <p className="text-sm text-destructive">{selectedVisitForDetails.rejection_reason}</p>
                                    </div>
                                )}

                                <div className="pt-4 border-t">
                                    <h4 className="text-sm font-semibold text-muted-foreground">Created At</h4>
                                    <p className="text-sm text-muted-foreground">
                                        {new Date(selectedVisitForDetails.created_at).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        )}

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsViewDetailsModalOpen(false)}>
                                Close
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Apply Schedule Modal - vertical layout, moderate width */}
                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    <DialogContent className="max-w-lg w-full max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Apply for Visit Schedule</DialogTitle>
                            <DialogDescription>
                                Fill in all the details to submit a visit schedule request
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit}>
                            <div className="flex flex-col gap-4">
                                <div className="flex flex-col gap-2">
                                    <Label htmlFor="visit_type">
                                        Visit Type <span className="text-destructive">*</span>
                                    </Label>
                                    <Select
                                        value={currentVisitType}
                                        onValueChange={(value) => {
                                            setVisitType(value);
                                            form.setData('visit_type', value);
                                            if (form.data.scheduled_time) {
                                                form.setData('scheduled_time', '');
                                            }
                                            // Check cell availability when visit type changes
                                            if (form.data.scheduled_date) {
                                                checkCellAvailability(form.data.scheduled_date, value);
                                            }
                                        }}
                                    >
                                        <SelectTrigger id="visit_type">
                                            <SelectValue placeholder="Select visit type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="virtual">Virtual ({durationMinutes}-min)</SelectItem>
                                            <SelectItem value="physical">Physical ({durationMinutes}-min)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <input type="hidden" name="visit_type" value={currentVisitType} />
                                    <InputError message={form.errors.visit_type} />
                                </div>

                                 <div className="space-y-4">
                                    <h3 className="text-sm font-semibold flex items-center gap-2">
                                        <User className="size-4" />
                                        Inmate Information
                                    </h3>

                                    <div className="flex flex-col gap-2">
                                        <Label htmlFor="inmate_first_name">
                                            Inmate First Name <span className="text-destructive">*</span>
                                        </Label>
                                        <Input
                                            id="inmate_first_name"
                                            type="text"
                                            required
                                            name="inmate_first_name"
                                            placeholder="First name"
                                            value={form.data.inmate_first_name || ''}
                                            onChange={(e) => {
                                                form.setData('inmate_first_name', e.target.value);
                                                setInmateSearchResult(null);
                                                setInmateSearchError(null);
                                            }}
                                        />
                                        <InputError message={form.errors.inmate_first_name} />
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <Label htmlFor="inmate_middle_name">Inmate Middle Name</Label>
                                        <Input
                                            id="inmate_middle_name"
                                            type="text"
                                            name="inmate_middle_name"
                                            placeholder="Middle name (optional)"
                                            value={form.data.inmate_middle_name || ''}
                                            onChange={(e) => {
                                                form.setData('inmate_middle_name', e.target.value);
                                                setInmateSearchResult(null);
                                                setInmateSearchError(null);
                                            }}
                                        />
                                        <InputError message={form.errors.inmate_middle_name} />
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <Label htmlFor="inmate_last_name">
                                            Inmate Last Name <span className="text-destructive">*</span>
                                        </Label>
                                        <Input
                                            id="inmate_last_name"
                                            type="text"
                                            required
                                            name="inmate_last_name"
                                            placeholder="Last name"
                                            value={form.data.inmate_last_name || ''}
                                            onChange={(e) => {
                                                form.setData('inmate_last_name', e.target.value);
                                                setInmateSearchResult(null);
                                                setInmateSearchError(null);
                                            }}
                                        />
                                        <InputError message={form.errors.inmate_last_name} />
                                    </div>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleSearchInmate}
                                        disabled={isSearchingInmate}
                                        className="w-full"
                                    >
                                        {isSearchingInmate ? (
                                            <>
                                                <Spinner className="mr-2 h-4 w-4" />
                                                Searching...
                                            </>
                                        ) : (
                                            <>
                                                <Search className="mr-2 h-4 w-4" />
                                                Search Inmate
                                            </>
                                        )}
                                    </Button>

                                    {/* Search Error */}
                                    {inmateSearchError && (
                                        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive flex items-start gap-2">
                                            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                                            <span>{inmateSearchError}</span>
                                        </div>
                                    )}

                                    {/* Search Result - Cell Schedule */}
                                    {inmateSearchResult && (
                                        <div className="rounded-md bg-green-500/10 p-3 text-sm">
                                            <div className="flex items-start gap-2 mb-3">
                                                <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600 shrink-0" />
                                                <span className="font-medium text-green-800">Inmate found!</span>
                                            </div>
                                            <div className="ml-6">
                                                <p className="text-xs text-muted-foreground mb-2">
                                                    {form.data.visit_type 
                                                        ? `Available ${form.data.visit_type} visit days for this cell:`
                                                        : 'Available visit days for this cell:'}
                                                </p>
                                                <div className="flex flex-wrap gap-1">
                                                    {Object.entries(inmateSearchResult.available_days).map(([day, availability]) => {
                                                        const dayNum = parseInt(day);
                                                        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                                                        const hasVirtual = availability.virtual;
                                                        const hasPhysical = availability.physical;
                                                        
                                                        // Filter based on selected visit type
                                                        if (form.data.visit_type === 'virtual' && !hasVirtual) return null;
                                                        if (form.data.visit_type === 'physical' && !hasPhysical) return null;
                                                        if (!form.data.visit_type && !hasVirtual && !hasPhysical) return null;
                                                        
                                                        // Determine label based on visit type selection
                                                        let label = '';
                                                        let badgeClass = '';
                                                        
                                                        if (form.data.visit_type === 'virtual') {
                                                            label = '';
                                                            badgeClass = 'bg-blue-50 text-blue-700 border-blue-200';
                                                        } else if (form.data.visit_type === 'physical') {
                                                            label = '';
                                                            badgeClass = 'bg-green-50 text-green-700 border-green-200';
                                                        } else {
                                                            // No visit type selected yet, show all
                                                            if (hasVirtual && hasPhysical) {
                                                                label = ' (Both)';
                                                                badgeClass = 'bg-purple-50 text-purple-700 border-purple-200';
                                                            } else if (hasVirtual) {
                                                                label = ' (Virtual)';
                                                                badgeClass = 'bg-blue-50 text-blue-700 border-blue-200';
                                                            } else {
                                                                label = ' (Physical)';
                                                                badgeClass = 'bg-green-50 text-green-700 border-green-200';
                                                            }
                                                        }
                                                        
                                                        return (
                                                            <Badge 
                                                                key={day} 
                                                                variant="outline" 
                                                                className={`text-xs ${badgeClass}`}
                                                            >
                                                                {dayNames[dayNum]}
                                                                {label}
                                                            </Badge>
                                                        );
                                                    })}
                                                    {(() => {
                                                        const filteredDays = Object.entries(inmateSearchResult.available_days).filter(([day, availability]) => {
                                                            const hasVirtual = availability.virtual;
                                                            const hasPhysical = availability.physical;
                                                            if (form.data.visit_type === 'virtual' && !hasVirtual) return false;
                                                            if (form.data.visit_type === 'physical' && !hasPhysical) return false;
                                                            return hasVirtual || hasPhysical;
                                                        });
                                                        
                                                        if (filteredDays.length === 0) {
                                                            return (
                                                                <span className="text-xs text-destructive">
                                                                    {form.data.visit_type 
                                                                        ? `No ${form.data.visit_type} visit days configured for this cell`
                                                                        : 'No days configured for visits'}
                                                                </span>
                                                            );
                                                        }
                                                        return null;
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>


                                {/* Cell Availability Error */}
                                {cellAvailabilityError && (
                                    <div className="rounded-md bg-amber-500/10 p-3 text-sm text-amber-800 flex items-start gap-2">
                                        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                                        <span>{cellAvailabilityError}</span>
                                    </div>
                                )}

                                {/* Relationship to Inmate */}
                                <div className="flex flex-col gap-2">
                                    <RelationshipPicker
                                        id="relationship_to_inmate"
                                        value={form.data.relationship_to_inmate || ''}
                                        onChange={(value) => form.setData('relationship_to_inmate', value)}
                                        error={form.errors.relationship_to_inmate}
                                        label="Your relationship to the inmate *"
                                    />
                                </div>

                                <div className="flex flex-col gap-2">
                                    <Label htmlFor="scheduled_date">
                                        Scheduled Date <span className="text-destructive">*</span>
                                    </Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className={cn(
                                                    'w-full justify-start text-left font-normal',
                                                    !form.data.scheduled_date && 'text-muted-foreground'
                                                )}
                                                disabled={!inmateSearchResult || !form.data.visit_type}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {form.data.scheduled_date ? format(new Date(form.data.scheduled_date), 'PPP') : <span>Select a date</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={form.data.scheduled_date ? new Date(form.data.scheduled_date) : undefined}
                                                onSelect={(date) => {
                                                    if (!date) return;
                                                    
                                                    const dateStr = format(date, 'yyyy-MM-dd');
                                                    
                                                    // Validate date against cell schedule
                                                    if (date && inmateSearchResult && form.data.visit_type) {
                                                        const selectedDate = new Date(dateStr);
                                                        const dayOfWeek = selectedDate.getDay();
                                                        const availability = inmateSearchResult.available_days[dayOfWeek];
                                                        const isAllowed = form.data.visit_type === 'virtual' 
                                                            ? availability?.virtual 
                                                            : availability?.physical;
                                                        
                                                        if (!isAllowed) {
                                                            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                                                            const allowedDays = Object.entries(inmateSearchResult.available_days)
                                                                .filter(([d, a]) => form.data.visit_type === 'virtual' ? a.virtual : a.physical)
                                                                .map(([d]) => dayNames[parseInt(d)]);
                                                            toast.error(`This cell is not available for ${form.data.visit_type} visits on ${dayNames[dayOfWeek]}s. Please select a ${allowedDays.join(', ')}.`);
                                                            return;
                                                        }
                                                    }
                                                    
                                                    form.setData('scheduled_date', dateStr);
                                                    setSelectedDate(dateStr);
                                                    if (form.data.scheduled_time) {
                                                        form.setData('scheduled_time', '');
                                                    }
                                                    // Check cell availability
                                                    if (form.data.visit_type) {
                                                        checkCellAvailability(dateStr, form.data.visit_type);
                                                    }
                                                }}
                                                initialFocus
                                                disabled={(date) => {
                                                    const minDate = new Date(minScheduleDate);
                                                    // Allow today's date - only disable past dates
                                                    const today = new Date();
                                                    today.setHours(0, 0, 0, 0);
                                                    return date < today;
                                                }}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <InputError message={form.errors.scheduled_date} />
                                    {inmateSearchResult && form.data.visit_type && (() => {
                                        const allowedDays = Object.entries(inmateSearchResult.available_days)
                                            .filter(([day, availability]) => {
                                                if (form.data.visit_type === 'virtual') return availability.virtual;
                                                if (form.data.visit_type === 'physical') return availability.physical;
                                                return false;
                                            })
                                            .map(([day]) => parseInt(day));
                                        
                                        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                                        const allowedDayNames = allowedDays.map(d => dayNames[d]);
                                        
                                        if (allowedDayNames.length > 0) {
                                            return (
                                                <p className="text-xs text-muted-foreground">
                                                    Only {allowedDayNames.join(', ')} available for {form.data.visit_type} visits
                                                </p>
                                            );
                                        }
                                        return (
                                            <p className="text-xs text-destructive">
                                                No {form.data.visit_type} visit days available for this cell
                                            </p>
                                        );
                                    })()}
                                    {!inmateSearchResult && (
                                        <p className="text-xs text-muted-foreground">
                                            Past dates are not available for selection
                                        </p>
                                    )}
                                </div>

                                <div className="flex flex-col gap-2">
                                    <Label>
                                        Scheduled Time <span className="text-destructive">*</span>
                                    </Label>
                                    {!form.data.scheduled_date ? (
                                        <div className="border rounded-lg p-4 bg-muted/30 text-center text-sm text-muted-foreground">
                                            <Clock className="size-5 mx-auto mb-2 opacity-50" />
                                            Please select a date first to view available time slots
                                        </div>
                                    ) : !form.data.visit_type ? (
                                        <div className="border rounded-lg p-4 bg-muted/30 text-center text-sm text-muted-foreground">
                                            <Clock className="size-5 mx-auto mb-2 opacity-50" />
                                            Please select a visit type first
                                        </div>
                                    ) : (
                                        <>
                                            {loadingSlots && (
                                                <div className="flex items-center justify-center py-2 text-sm text-muted-foreground mb-2">
                                                    <Spinner className="size-4 mr-2" />
                                                    Loading booked slots...
                                                </div>
                                            )}
                                            {isDayUnavailable ? (
                                                <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 text-center text-sm text-amber-800 dark:text-amber-200">
                                                    <strong>Unavailable.</strong> Schedule times for this day end at {(() => {
                                                        const [endHour, endMin] = endTime.split(':');
                                                        const hour = parseInt(endHour);
                                                        const period = hour >= 12 ? 'PM' : 'AM';
                                                        const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
                                                        return `${displayHour}:${endMin} ${period}`;
                                                    })()}. Please select another date.
                                                </div>
                                            ) : (
                                                <TimeSlotPicker
                                                    selectedTime={form.data.scheduled_time || ''}
                                                    bookedSlots={bookedSlots}
                                                    slotCapacities={slotCapacities}
                                                    userBookedSlots={userBookedSlots}
                                                    inmateBookedSlots={inmateBookedSlots}
                                                    visitType={form.data.visit_type as 'physical' | 'virtual'}
                                                    durationMinutes={durationMinutes}
                                                    intervalMinutes={intervalMinutes}
                                                    selectedDate={form.data.scheduled_date}
                                                    startTime={startTime}
                                                    endTime={endTime}
                                                    onTimeSelect={(time) => {
                                                        form.setData('scheduled_time', time);
                                                    }}
                                                />
                                            )}
                                            <input
                                                type="hidden"
                                                name="scheduled_time"
                                                value={form.data.scheduled_time || ''}
                                            />
                                        </>
                                    )}
                                    <InputError message={form.errors.scheduled_time} />
                                </div>

                               

                                <div className="flex flex-col gap-4">
                                    <h3 className="text-sm font-semibold flex items-center gap-2">
                                        <FileText className="size-4" />
                                        Required Documents
                                    </h3>

                                    {isInmateTagged === true ? (
                                        <div className="rounded-lg bg-green-50 border border-green-200 p-4">
                                            <div className="flex items-start gap-3">
                                                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                                                <div>
                                                    <h4 className="text-sm font-semibold text-green-900">Proof of Relationship Not Required</h4>
                                                    <p className="text-xs text-green-700 mt-1">
                                                        This inmate is already tagged to your account from a previous approved visit. You do not need to upload proof of relationship documents.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-4">
                                            <div className="flex flex-col gap-2">
                                                <Label htmlFor="relationship_proof">
                                                    Proof of Relationship <span className="text-destructive">*</span>
                                                </Label>
                                                <div className="relative border-2 border-dashed rounded-lg p-4 transition-colors hover:border-primary/50 focus-within:border-primary focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                                                    <Input
                                                        id="relationship_proof"
                                                        type="file"
                                                        name="relationship_proof"
                                                        accept=".pdf,.jpg,.jpeg,.png"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0] || null;
                                                            form.setData('relationship_proof', file);
                                                        }}
                                                        required={isInmateTagged !== true}
                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                    />
                                                    <div className="space-y-3">
                                                        {form.data.relationship_proof ? (
                                                            <div className="flex items-center gap-4">
                                                                {form.data.relationship_proof.type.startsWith('image/') ? (
                                                                    <img 
                                                                        src={URL.createObjectURL(form.data.relationship_proof)} 
                                                                        alt="Preview"
                                                                        className="h-24 w-24 object-cover rounded-lg border-2 shadow-sm"
                                                                    />
                                                                ) : (
                                                                    <div className="h-24 w-24 flex items-center justify-center bg-muted rounded-lg border-2">
                                                                        <FileText className="h-12 w-12 text-muted-foreground" />
                                                                    </div>
                                                                )}
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-semibold truncate">{form.data.relationship_proof.name}</p>
                                                                    <p className="text-xs text-muted-foreground mt-1">
                                                                        Size: {(form.data.relationship_proof.size / 1024 / 1024).toFixed(2)} MB
                                                                    </p>
                                                                    <p className="text-xs text-muted-foreground capitalize">
                                                                        Type: {form.data.relationship_proof.type.split('/')[1]?.toUpperCase() || 'PDF'}
                                                                    </p>
                                                                    <Badge variant="secondary" className="mt-2">
                                                                        ✓ File selected
                                                                    </Badge>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                                                <div className="rounded-full bg-muted p-4 mb-3">
                                                                    <Upload className="h-8 w-8 text-muted-foreground" />
                                                                </div>
                                                                <p className="text-sm font-medium">Click to upload or drag and drop</p>
                                                                <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG (Max 10MB)</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <p className="text-xs text-muted-foreground -mt-2">
                                                    Accepted formats: PDF, JPG, PNG (Max 10MB)
                                                </p>
                                                <InputError message={form.errors.relationship_proof} />
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <Label htmlFor="additional_proof">
                                                    Additional/Supporting Proof of Relationship <span className="text-destructive">*</span>
                                                </Label>
                                                <div className="relative border-2 border-dashed rounded-lg p-4 transition-colors hover:border-primary/50 focus-within:border-primary focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                                                    <Input
                                                        id="additional_proof"
                                                        type="file"
                                                        name="additional_proof"
                                                        accept=".pdf,.jpg,.jpeg,.png"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0] || null;
                                                            form.setData('additional_proof', file);
                                                        }}
                                                        required={isInmateTagged !== true}
                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                    />
                                                    <div className="space-y-3">
                                                        {form.data.additional_proof ? (
                                                            <div className="flex items-center gap-4">
                                                                {form.data.additional_proof.type.startsWith('image/') ? (
                                                                    <img 
                                                                        src={URL.createObjectURL(form.data.additional_proof)} 
                                                                        alt="Preview"
                                                                        className="h-24 w-24 object-cover rounded-lg border-2 shadow-sm"
                                                                    />
                                                                ) : (
                                                                    <div className="h-24 w-24 flex items-center justify-center bg-muted rounded-lg border-2">
                                                                        <FileText className="h-12 w-12 text-muted-foreground" />
                                                                    </div>
                                                                )}
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-semibold truncate">{form.data.additional_proof.name}</p>
                                                                    <p className="text-xs text-muted-foreground mt-1">
                                                                        Size: {(form.data.additional_proof.size / 1024 / 1024).toFixed(2)} MB
                                                                    </p>
                                                                    <p className="text-xs text-muted-foreground capitalize">
                                                                        Type: {form.data.additional_proof.type.split('/')[1]?.toUpperCase() || 'PDF'}
                                                                    </p>
                                                                    <Badge variant="secondary" className="mt-2">
                                                                        ✓ File selected
                                                                    </Badge>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                                                <div className="rounded-full bg-muted p-4 mb-3">
                                                                    <Upload className="h-8 w-8 text-muted-foreground" />
                                                                </div>
                                                                <p className="text-sm font-medium">Click to upload or drag and drop</p>
                                                                <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG (Max 10MB)</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <p className="text-xs text-muted-foreground -mt-2">
                                                    Accepted formats: PDF, JPG, PNG (Max 10MB)
                                                </p>
                                                <InputError message={form.errors.additional_proof} />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col gap-2">
                                    <Label htmlFor="notes">Additional Notes</Label>
                                    <Textarea
                                        id="notes"
                                        name="notes"
                                        rows={3}
                                        value={form.data.notes || ''}
                                        onChange={(e) => form.setData('notes', e.target.value)}
                                        placeholder="Any additional information or special requests..."
                                    />
                                    <InputError message={form.errors.notes} />
                                </div>

                                {/* Privacy Notice - Conditional based on visit type */}
                                {form.data.visit_type && (
                                    <div className="rounded-lg border-l-4 border-l-blue-500 bg-blue-500/10 p-4 mt-2">
                                        <div className="flex items-start gap-3">
                                            <Checkbox
                                                id="privacy_acknowledged"
                                                checked={form.data.privacy_acknowledged}
                                                onCheckedChange={(checked) => form.setData('privacy_acknowledged', Boolean(checked))}
                                                required
                                                className="mt-1 h-5 w-5"
                                            />
                                            <div className="flex-1 space-y-2">
                                                <Label
                                                    htmlFor="privacy_acknowledged"
                                                    className="text-sm font-normal leading-relaxed cursor-pointer"
                                                >
                                                                                                        <span className="text-muted-foreground">
                                                        {form.data.visit_type === 'virtual' ? (
                                                            <>The information provided in this visitation request will be collected and processed solely for identity verification, visitation scheduling, approval processing, security monitoring, record management, and other legitimate operational purposes. All information shall be handled in accordance with the Data Privacy Act of 2012 and applicable privacy and security policies.</>
                                                        ) : (
                                                            <>The information collected through this request will be used exclusively for visitor verification, schedule management, facility access validation, security monitoring, and compliance with visitation procedures. Personal data shall be processed in accordance with Republic Act No. 10173 and applicable institutional regulations.</>
                                                        )}
                                                    </span>
                                                </Label>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <DialogFooter className="mt-6">
                                <Button type="button" variant="outline" onClick={handleModalClose}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={form.processing || !form.data.privacy_acknowledged}>
                                    {form.processing && <Spinner className="mr-2 size-4" />}
                                    Submit Visit Request
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Reschedule Modal */}
                <Dialog open={isRescheduleModalOpen} onOpenChange={setIsRescheduleModalOpen}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Reschedule Visit</DialogTitle>
                            <DialogDescription>
                                Select a new date and time for your visit schedule
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleRescheduleSubmit}>
                            <div className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="reschedule_date">
                                        Scheduled Date <span className="text-destructive">*</span>
                                    </Label>
                                    <div className="relative">
                                        <CalendarIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            id="reschedule_date"
                                            type="date"
                                            required
                                            min={minScheduleDate}
                                            name="scheduled_date"
                                            className="pl-10"
                                            value={rescheduleForm.data.scheduled_date || ''}
                                            onChange={(e) => {
                                                const date = e.target.value;
                                                rescheduleForm.setData('scheduled_date', date);
                                                setRescheduleDate(date);
                                                if (rescheduleForm.data.scheduled_time) {
                                                    rescheduleForm.setData('scheduled_time', '');
                                                }
                                            }}
                                        />
                                    </div>
                                    <InputError message={rescheduleForm.errors.scheduled_date} />
                                    <p className="text-xs text-muted-foreground">
                                        Past dates are not available for selection
                                    </p>
                                </div>

                                <div className="grid gap-2">
                                    <Label>
                                        Scheduled Time <span className="text-destructive">*</span>
                                    </Label>
                                    {!rescheduleForm.data.scheduled_date ? (
                                        <div className="border rounded-lg p-4 bg-muted/30 text-center text-sm text-muted-foreground">
                                            <Clock className="size-5 mx-auto mb-2 opacity-50" />
                                            Please select a date first to view available time slots
                                        </div>
                                    ) : (
                                        <>
                                            {loadingSlots && (
                                                <div className="flex items-center justify-center py-2 text-sm text-muted-foreground mb-2">
                                                    <Spinner className="size-4 mr-2" />
                                                    Loading booked slots...
                                                </div>
                                            )}
                                            {rescheduleDayUnavailable ? (
                                                <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 text-center text-sm text-amber-800 dark:text-amber-200">
                                                    <strong>Unavailable.</strong> Schedule times for this day end at {(() => {
                                                        const [endHour, endMin] = endTime.split(':');
                                                        const hour = parseInt(endHour);
                                                        const period = hour >= 12 ? 'PM' : 'AM';
                                                        const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
                                                        return `${displayHour}:${endMin} ${period}`;
                                                    })()}. Please select another date.
                                                </div>
                                            ) : (
                                                <TimeSlotPicker
                                                    selectedTime={rescheduleForm.data.scheduled_time || ''}
                                                    onTimeSelect={(time) => {
                                                        rescheduleForm.setData('scheduled_time', time);
                                                    }}
                                                    bookedSlots={rescheduleBookedSlots}
                                                    slotCapacities={rescheduleSlotCapacities}
                                                    visitType={selectedVisitForReschedule?.visit_type as 'physical' | 'virtual'}
                                                    durationMinutes={rescheduleDurationMinutes}
                                                    intervalMinutes={rescheduleIntervalMinutes}
                                                    selectedDate={rescheduleForm.data.scheduled_date}
                                                    startTime={startTime}
                                                    endTime={endTime}
                                                />
                                            )}
                                        </>
                                    )}
                                    <InputError message={rescheduleForm.errors.scheduled_time} />
                                </div>
                            </div>
                            <DialogFooter className="mt-6">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleRescheduleModalClose}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={rescheduleForm.processing}
                                >
                                    {rescheduleForm.processing ? (
                                        <>
                                            <Spinner className="mr-2 size-4" />
                                            Rescheduling...
                                        </>
                                    ) : (
                                        'Reschedule Visit'
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Appeal Modal */}
                <Dialog open={isAppealModalOpen} onOpenChange={setIsAppealModalOpen}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Submit Appeal</DialogTitle>
                            <DialogDescription>
                                Provide a reason for your appeal and optionally attach supporting documents.
                                Appeals must be submitted within 48 hours after rejection.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleAppealSubmit}>
                            <div className="space-y-4">
                                {selectedVisitForAppeal && (
                                    <div className="rounded-lg bg-muted p-4">
                                        <Label className="text-sm font-semibold">Appealing:</Label>
                                        <p className="text-sm mt-1">
                                            Visit Schedule - Inmate: {selectedVisitForAppeal.inmate_first_name} {selectedVisitForAppeal.inmate_middle_name} {selectedVisitForAppeal.inmate_last_name}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            Scheduled: {selectedVisitForAppeal.scheduled_date} {selectedVisitForAppeal.scheduled_time && `at ${selectedVisitForAppeal.scheduled_time}`}
                                        </p>
                                        {selectedVisitForAppeal.rejection_reason && (
                                            <p className="text-sm text-destructive mt-2">
                                                <strong>Rejection Reason:</strong> {selectedVisitForAppeal.rejection_reason}
                                            </p>
                                        )}
                                    </div>
                                )}

                                <div className="grid gap-2">
                                    <Label htmlFor="appeal_reason">
                                        Appeal Reason <span className="text-destructive">*</span>
                                    </Label>
                                    <Textarea
                                        id="appeal_reason"
                                        required
                                        rows={6}
                                        value={appealForm.data.reason}
                                        onChange={(e) => appealForm.setData('reason', e.target.value)}
                                        placeholder="Please provide a detailed reason for your appeal. Explain why you believe the rejection should be reconsidered..."
                                        minLength={10}
                                        maxLength={2000}
                                    />
                                    <InputError message={appealForm.errors.reason} />
                                    <p className="text-xs text-muted-foreground">
                                        Minimum 10 characters, maximum 2000 characters
                                    </p>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="appeal_documents">
                                        Supporting Documents (Optional)
                                    </Label>
                                    <Input
                                        id="appeal_documents"
                                        type="file"
                                        multiple
                                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                        onChange={handleAppealFileChange}
                                    />
                                    <InputError message={appealForm.errors.documents} />
                                    {appealForm.errors.appeal && (
                                        <div className="text-sm text-destructive">
                                            {Array.isArray(appealForm.errors.appeal) ? appealForm.errors.appeal[0] : appealForm.errors.appeal}
                                        </div>
                                    )}
                                    <p className="text-xs text-muted-foreground">
                                        You can upload up to 5 files (PDF, DOC, DOCX, JPG, JPEG, PNG). Max 5MB per file.
                                    </p>
                                    {appealForm.data.documents.length > 0 && (
                                        <div className="text-sm text-muted-foreground">
                                            Selected: {appealForm.data.documents.length} file(s)
                                        </div>
                                    )}
                                </div>
                            </div>
                            <DialogFooter className="mt-6">
                                <Button type="button" variant="outline" onClick={handleAppealModalClose}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={appealForm.processing}>
                                    {appealForm.processing ? 'Submitting...' : 'Submit Appeal'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
