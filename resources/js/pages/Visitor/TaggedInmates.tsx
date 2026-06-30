import { useState, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Users, Calendar, FileText, CheckCircle, AlertCircle, X, ShieldCheck, Video, Building, Clock, UserCheck, ClockIcon, CheckCircle2, XCircle } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { TimeSlotPicker } from '@/components/TimeSlotPicker';
import axios from 'axios';

interface TaggedInmate {
    inmate_id: number;
    inmate_full_name: string;
    inmate_first_name: string;
    inmate_middle_name: string;
    inmate_last_name: string;
    relationship_proof_file_id: number | null;
    additional_proof_file_id: number | null;
    has_relationship_proof: boolean;
    has_additional_proof: boolean;
    cell_id: number;
    cell_number: string;
    available_days: Record<number, { virtual: boolean; physical: boolean }>;
}

interface Props {
    taggedInmates: TaggedInmate[];
    stats: {
        total_tagged_inmates: number;
        with_proof?: number;
        without_proof?: number;
        virtual_available?: number;
    };
}

const StatCard = ({ icon, value, label, accent, iconBg, iconColor }: { icon: React.ReactNode; value: number | string; label: string; accent: string; iconBg: string; iconColor: string }) => (
    <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
            <div className="flex items-stretch">
                <div className={`w-1.5 shrink-0 ${accent}`} />
                <div className="flex items-center gap-4 px-5 py-4 flex-1">
                    <div className={`p-2.5 rounded-xl ${iconBg} ${iconColor}`}>{icon}</div>
                    <div>
                        <div className="text-2xl font-bold text-slate-800 leading-none">{value}</div>
                        <div className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-wide">{label}</div>
                    </div>
                </div>
            </div>
        </CardContent>
    </Card>
);

export default function TaggedInmates({ taggedInmates, stats }: Props) {
    const [selectedInmate, setSelectedInmate] = useState<TaggedInmate | null>(null);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [scheduleData, setScheduleData] = useState({
        scheduled_date: '',
        scheduled_time: '',
        visit_type: 'virtual',
        notes: '',
    });

    // Schedule management states
    const [bookedSlots, setBookedSlots] = useState<string[]>([]);
    const [slotCapacities, setSlotCapacities] = useState<Record<string, { current: number; max: number; isFull: boolean }>>({});
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [dayUnavailable, setDayUnavailable] = useState(false);
    const [durationMinutes, setDurationMinutes] = useState(20);
    const [intervalMinutes, setIntervalMinutes] = useState(5);
    const [startTime, setStartTime] = useState('07:00');
    const [endTime, setEndTime] = useState('18:00');

    // Fetch booked slots and capacities when date changes
    useEffect(() => {
        if (!selectedDate || !selectedInmate || !scheduleData.visit_type) {
            setBookedSlots([]);
            setSlotCapacities({});
            return;
        }

        const fetchSlotData = async () => {
            setLoadingSlots(true);
            setDayUnavailable(false);
            try {
                const response = await fetch(
                    `/visitor/schedule/booked-slots?date=${selectedDate}&visit_type=${scheduleData.visit_type}&inmate_id=${selectedInmate.inmate_id}`
                );
                const data = await response.json();
                
                if (data.slotCapacities) {
                    setSlotCapacities(data.slotCapacities);
                }
                if (data.isDayUnavailable === true) {
                    setDayUnavailable(true);
                }
                if (typeof data.durationMinutes === 'number') {
                    setDurationMinutes(data.durationMinutes);
                }
                if (typeof data.intervalMinutes === 'number') {
                    setIntervalMinutes(data.intervalMinutes);
                }
                if (data.startTime) {
                    setStartTime(data.startTime);
                }
                if (data.endTime) {
                    setEndTime(data.endTime);
                }
                
                // Combine all booked slots
                const allBooked = [
                    ...(data.userBookedSlots || []),
                    ...(data.inmateBookedSlots || []),
                ];
                setBookedSlots(allBooked);
            } catch (error) {
                console.error('Error fetching slot data:', error);
            } finally {
                setLoadingSlots(false);
            }
        };

        fetchSlotData();
    }, [selectedDate, selectedInmate, scheduleData.visit_type]);

    const breadcrumbs = [
        { title: 'Dashboard', href: '/dashboard/visitor' },
        { title: 'Tagged Inmates', href: '/visitor/tagged-inmates' },
    ];

    const handleOpenScheduleModal = (inmate: TaggedInmate) => {
        setSelectedInmate(inmate);
        setScheduleData({
            scheduled_date: '',
            scheduled_time: '',
            visit_type: 'virtual',
            notes: '',
        });
        setSelectedDate('');
        setBookedSlots([]);
        setSlotCapacities({});
        setDayUnavailable(false);
        setIsScheduleModalOpen(true);
    };

    const handleCloseScheduleModal = () => {
        setSelectedInmate(null);
        setIsScheduleModalOpen(false);
        setScheduleData({
            scheduled_date: '',
            scheduled_time: '',
            visit_type: 'virtual',
            notes: '',
        });
    };

    const handleScheduleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedInmate) return;

        router.post('/visitor/schedule', {
            scheduled_date: scheduleData.scheduled_date,
            scheduled_time: scheduleData.scheduled_time,
            visit_type: scheduleData.visit_type,
            inmate_first_name: selectedInmate.inmate_first_name,
            inmate_middle_name: selectedInmate.inmate_middle_name,
            inmate_last_name: selectedInmate.inmate_last_name,
            notes: scheduleData.notes,
            relationship_proof_file_id: selectedInmate.relationship_proof_file_id,
            additional_proof_file_id: selectedInmate.additional_proof_file_id,
            use_existing_documents: true,
        }, {
            onSuccess: () => {
                toast.success('Visit scheduled successfully!');
                handleCloseScheduleModal();
            },
            onError: (errors) => {
                const firstError = Object.values(errors)[0] as string;
                toast.error(firstError || 'Failed to schedule visit. Please try again.');
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Tagged Inmates" />
            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <div className="bg-white border-b border-slate-200 px-6 py-5 sticky top-0 z-30 shadow-sm">
                    <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-teal-600 rounded-xl"><UserCheck className="w-5 h-5 text-white" /></div>
                            <div>
                                <h1 className="text-lg font-bold text-slate-900 leading-none">Tagged Inmates</h1>
                                <p className="text-xs text-slate-500 mt-0.5">Inmates you can quickly schedule visits with</p>
                            </div>
                        </div>
                        <Link
                            href="/dashboard/visitor"
                            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                        >
                            ← Back to Dashboard
                        </Link>
                    </div>
                </div>

                <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">
                    {/* KPI Cards */}
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <StatCard icon={<UserCheck className="w-5 h-5" />} value={stats?.total_tagged_inmates || 0} label="Total Tagged" accent="bg-teal-600" iconBg="bg-teal-50" iconColor="text-teal-600" />
                        <StatCard icon={<FileText className="w-5 h-5" />} value={stats?.with_proof || 0} label="With Proof" accent="bg-green-600" iconBg="bg-green-50" iconColor="text-green-600" />
                        <StatCard icon={<AlertCircle className="w-5 h-5" />} value={stats?.without_proof || 0} label="Without Proof" accent="bg-amber-600" iconBg="bg-amber-50" iconColor="text-amber-600" />
                        <StatCard icon={<Video className="w-5 h-5" />} value={stats?.virtual_available || 0} label="Virtual Available" accent="bg-blue-600" iconBg="bg-blue-50" iconColor="text-blue-600" />
                    </div>

                {/* Info Banner */}
                <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="pt-6">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                            <div className="space-y-1">
                                <h3 className="font-medium text-blue-900">What are Tagged Inmates?</h3>
                                <p className="text-sm text-blue-800">
                                    These are inmates from your approved visit schedules. You can use this list to quickly reschedule visits 
                                    without re-entering inmate information or uploading documents again. This saves time and avoids redundancy.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Tagged Inmates List */}
                <Card>
                    <CardHeader>
                        <CardTitle>Your Tagged Inmates</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {taggedInmates.length === 0 ? (
                            <div className="text-center py-12">
                                <User className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                                <h3 className="text-lg font-medium mb-2">No Tagged Inmates Yet</h3>
                                <p className="text-muted-foreground mb-4">
                                    Once your visit schedule is approved, the inmate will appear here
                                </p>
                                <Link
                                    href="/visitor/schedule-visit"
                                    className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                                >
                                    Schedule Your First Visit
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {taggedInmates.map((inmate, index) => (
                                    <div
                                        key={`${inmate.inmate_id}-${index}`}
                                        className="rounded-lg border p-3 space-y-2"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3 flex-1">
                                                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                                    <User className="h-4 w-4 text-blue-600" />
                                                </div>
                                                <div className="space-y-0.5 flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h3 className="font-semibold text-sm truncate">
                                                            {inmate.inmate_full_name}
                                                        </h3>
                                                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                                                            <CheckCircle className="h-2.5 w-2.5 mr-1" />
                                                            Verified
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                                                        <span className="flex items-center gap-1">
                                                            <FileText className="h-3 w-3" />
                                                            Relationship Proof:{' '}
                                                            {inmate.has_relationship_proof ? (
                                                                <span className="text-green-600 font-medium">On file</span>
                                                            ) : (
                                                                <span className="text-orange-600">Not provided</span>
                                                            )}
                                                        </span>
                                                        {inmate.has_additional_proof && (
                                                            <span className="flex items-center gap-1">
                                                                <FileText className="h-3 w-3" />
                                                                Additional Proof:{' '}
                                                                <span className="text-green-600 font-medium">On file</span>
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <Button
                                                size="sm"
                                                onClick={() => handleOpenScheduleModal(inmate)}
                                                className="flex-shrink-0"
                                            >
                                                <Calendar className="h-3.5 w-3.5 mr-1.5" />
                                                Schedule Visit
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Schedule Visit Modal */}
            <Dialog open={isScheduleModalOpen} onOpenChange={setIsScheduleModalOpen}>
                <DialogContent className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Apply for Visit Schedule</DialogTitle>
                        <DialogDescription>
                            PDL details and documents are already on file. Just select your preferred schedule.
                        </DialogDescription>
                    </DialogHeader>
                    
                    {/* Privacy Notice */}
                    <div style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', padding: '10px 24px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        <ShieldCheck style={{ width: '14px', height: '14px', color: '#6B7280', flexShrink: 0, marginTop: '1px' }} />
                        <div>
                            <div style={{ fontSize: '9px', fontWeight: 700, color: '#374151', marginBottom: '2px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                                Data Privacy Notice
                            </div>
                            <div style={{ fontSize: '9px', lineHeight: '1.5', color: '#4B5563' }}>
                                The information provided in this visitation request will be collected and processed solely for identity verification, visitation scheduling, approval processing, security monitoring, record management, and other legitimate operational purposes. All information shall be handled in accordance with the Data Privacy Act of 2012 and applicable privacy and security policies.
                                <br />
                                <span style={{ fontStyle: 'italic' }}>
                                    (Ang impormasyon nga gihatag niini nga hangyo sa pagbisita mocollect ug giproseso lamang alang sa pag-verify sa pagkatawo, pag-iskedyul sa pagbisita, pagproseso sa apruba, pag-monitor sa seguridad, pagdumala sa rekord, ug uban pa nga lehitimo nga katuyoan sa operasyon. Ang tanan nga impormasyon gipangdumala sumala sa Data Privacy Act of 2012 ug mga nahisgutan nga privacy ug security policies.)
                                </span>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleScheduleSubmit}>
                        <div className="flex flex-col gap-5 py-4">
                            {/* Visit Type */}
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="visit_type">
                                    Visit Type <span className="text-destructive">*</span>
                                </Label>
                                <Select
                                    value={scheduleData.visit_type}
                                    onValueChange={(value) => {
                                        setScheduleData({ ...scheduleData, visit_type: value, scheduled_time: '' });
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
                            </div>

                            {/* PDL Information */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold flex items-center gap-2">
                                    <User className="size-4" />
                                    PDL Information
                                </h3>

                                <div className="rounded-lg border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-4">
                                    <div className="flex items-start gap-3">
                                        <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                                            <CheckCircle className="h-5 w-5 text-green-600" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-semibold text-green-900">{selectedInmate?.inmate_full_name}</p>
                                            <p className="text-xs text-green-700 mt-1">
                                                Cell: {selectedInmate?.cell_number} • Documents on file from previous approved visit
                                            </p>
                                            {/* Available Days */}
                                            {selectedInmate && (
                                                <div className="mt-2">
                                                    <p className="text-xs text-green-700 mb-1">Available days for {scheduleData.visit_type} visits:</p>
                                                    <div className="flex flex-wrap gap-1">
                                                        {Object.entries(selectedInmate.available_days)
                                                            .filter(([day, availability]) => {
                                                                return scheduleData.visit_type === 'virtual' 
                                                                    ? availability.virtual 
                                                                    : availability.physical;
                                                            })
                                                            .map(([day]) => {
                                                                const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                                                                return (
                                                                    <Badge 
                                                                        key={day} 
                                                                        variant="outline" 
                                                                        className="bg-white text-green-700 border-green-300 text-xs"
                                                                    >
                                                                        {dayNames[parseInt(day)]}
                                                                    </Badge>
                                                                );
                                                            })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Scheduled Date - Calendar Picker */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold flex items-center gap-2">
                                    <CalendarIcon className="size-4" />
                                    Select Date <span className="text-destructive">*</span>
                                </h3>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                'w-full justify-start text-left font-normal h-12',
                                                !scheduleData.scheduled_date && 'text-muted-foreground'
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-5 w-5" />
                                            {scheduleData.scheduled_date ? (
                                                <span className="font-medium">{format(new Date(scheduleData.scheduled_date), 'EEEE, MMMM d, yyyy')}</span>
                                            ) : (
                                                <span>Select a date from the calendar</span>
                                            )}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-4" align="start">
                                        <div className="space-y-3">
                                            <input
                                                type="date"
                                                value={scheduleData.scheduled_date}
                                                min={new Date().toISOString().split('T')[0]}
                                                onChange={(e) => {
                                                    setScheduleData({ ...scheduleData, scheduled_date: e.target.value, scheduled_time: '' });
                                                    setSelectedDate(e.target.value);
                                                }}
                                                className="w-full p-2 border rounded"
                                                required
                                            />
                                            {selectedInmate && scheduleData.visit_type && (
                                                <div className="text-xs text-muted-foreground">
                                                    <p className="font-medium mb-1">Allowed days:</p>
                                                    <div className="flex flex-wrap gap-1">
                                                        {Object.entries(selectedInmate.available_days)
                                                            .filter(([day, availability]) => {
                                                                return scheduleData.visit_type === 'virtual' 
                                                                    ? availability.virtual 
                                                                    : availability.physical;
                                                            })
                                                            .map(([day]) => {
                                                                const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                                                                return (
                                                                    <Badge key={day} variant="outline" className="text-xs">
                                                                        {dayNames[parseInt(day)]}
                                                                    </Badge>
                                                                );
                                                            })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </PopoverContent>
                                </Popover>
                                {dayUnavailable && (
                                    <div className="rounded-md bg-amber-500/10 p-3 text-sm text-amber-800 flex items-start gap-2">
                                        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                                        <span>This date is currently unavailable for scheduling. Please select another date.</span>
                                    </div>
                                )}
                            </div>

                            {/* Time Slot Picker */}
                            {scheduleData.scheduled_date && selectedInmate && (
                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold flex items-center gap-2">
                                        <Clock className="size-4" />
                                        Select Time Slot <span className="text-destructive">*</span>
                                    </h3>
                                    {loadingSlots ? (
                                        <div className="flex items-center justify-center py-8">
                                            <div className="text-sm text-muted-foreground">Loading available time slots...</div>
                                        </div>
                                    ) : (
                                        <TimeSlotPicker
                                            selectedTime={scheduleData.scheduled_time}
                                            bookedSlots={bookedSlots}
                                            slotCapacities={slotCapacities}
                                            visitType={scheduleData.visit_type as 'physical' | 'virtual'}
                                            durationMinutes={durationMinutes}
                                            intervalMinutes={intervalMinutes}
                                            selectedDate={scheduleData.scheduled_date}
                                            startTime={startTime}
                                            endTime={endTime}
                                            onTimeSelect={(time) => {
                                                setScheduleData({ ...scheduleData, scheduled_time: time });
                                            }}
                                        />
                                    )}
                                </div>
                            )}

                            {/* Notes */}
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="notes">Notes (Optional)</Label>
                                <Textarea
                                    id="notes"
                                    value={scheduleData.notes}
                                    onChange={(e) => setScheduleData({ ...scheduleData, notes: e.target.value })}
                                    placeholder="Any additional information..."
                                    rows={3}
                                />
                            </div>

                            {/* Documents On File */}
                            <div className="rounded-lg border bg-muted/50 p-4">
                                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    Documents On File:
                                </h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex items-center gap-2">
                                        <FileText className="h-4 w-4" />
                                        <span>Relationship Proof: </span>
                                        {selectedInmate?.has_relationship_proof ? (
                                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                                                <CheckCircle className="h-3 w-3 mr-1" /> Available
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">
                                                Not provided
                                            </Badge>
                                        )}
                                    </div>
                                    {selectedInmate?.has_additional_proof && (
                                        <div className="flex items-center gap-2">
                                            <FileText className="h-4 w-4" />
                                            <span>Additional Proof: </span>
                                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                                                <CheckCircle className="h-3 w-3 mr-1" /> Available
                                            </Badge>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        <DialogFooter className="border-t pt-4">
                            <Button type="button" variant="outline" onClick={handleCloseScheduleModal}>
                                Cancel
                            </Button>
                            <Button 
                                type="submit"
                                disabled={!scheduleData.scheduled_date || !scheduleData.scheduled_time}
                            >
                                <Calendar className="h-4 w-4 mr-2" />
                                Schedule Visit
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            </div>
        </AppLayout>
    );
}
