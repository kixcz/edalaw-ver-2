import { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Users, Calendar, FileText, CheckCircle, AlertCircle, X } from 'lucide-react';
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
}

interface Props {
    taggedInmates: TaggedInmate[];
    stats: {
        total_tagged_inmates: number;
    };
}

export default function TaggedInmates({ taggedInmates, stats }: Props) {
    const [selectedInmate, setSelectedInmate] = useState<TaggedInmate | null>(null);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [scheduleData, setScheduleData] = useState({
        scheduled_date: '',
        scheduled_time: '',
        visit_type: 'virtual',
        notes: '',
    });

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
            ...scheduleData,
            inmate_id: selectedInmate.inmate_id,
            inmate_first_name: selectedInmate.inmate_first_name,
            inmate_middle_name: selectedInmate.inmate_middle_name,
            inmate_last_name: selectedInmate.inmate_last_name,
            relationship_proof_file_id: selectedInmate.relationship_proof_file_id,
            additional_proof_file_id: selectedInmate.additional_proof_file_id,
            use_existing_documents: true,
        }, {
            onSuccess: () => {
                toast.success('Visit scheduled successfully!');
                handleCloseScheduleModal();
            },
            onError: (errors) => {
                toast.error('Failed to schedule visit. Please try again.');
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Tagged Inmates" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">Tagged Inmates</h1>
                        <p className="text-muted-foreground">
                            Inmates you can quickly schedule visits with
                        </p>
                    </div>
                    <Link
                        href="/dashboard/visitor"
                        className="inline-flex items-center justify-center rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                        ← Back to Dashboard
                    </Link>
                </div>

                {/* Statistics Cards */}
                <div className="grid auto-rows-min gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Total Tagged Inmates
                            </CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.total_tagged_inmates}</div>
                            <p className="text-xs text-muted-foreground mt-2">
                                From approved visits
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Quick Reschedule
                            </CardTitle>
                            <Calendar className="h-4 w-4 text-blue-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.total_tagged_inmates}</div>
                            <p className="text-xs text-muted-foreground mt-2">
                                Ready for instant scheduling
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Documents On File
                            </CardTitle>
                            <FileText className="h-4 w-4 text-purple-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {taggedInmates.filter(i => i.has_relationship_proof).length}
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                                With proof of relationship
                            </p>
                        </CardContent>
                    </Card>
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
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Schedule Visit for {selectedInmate?.inmate_full_name}</DialogTitle>
                        <DialogDescription>
                            Inmate details and documents are already on file. Just select your preferred schedule.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <form onSubmit={handleScheduleSubmit}>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="scheduled_date">Date *</Label>
                                    <Input
                                        id="scheduled_date"
                                        type="date"
                                        value={scheduleData.scheduled_date}
                                        onChange={(e) => setScheduleData({ ...scheduleData, scheduled_date: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="scheduled_time">Time *</Label>
                                    <Input
                                        id="scheduled_time"
                                        type="time"
                                        value={scheduleData.scheduled_time}
                                        onChange={(e) => setScheduleData({ ...scheduleData, scheduled_time: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <Label htmlFor="visit_type">Visit Type *</Label>
                                <Select
                                    value={scheduleData.visit_type}
                                    onValueChange={(value) => setScheduleData({ ...scheduleData, visit_type: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="virtual">Virtual Visit</SelectItem>
                                        <SelectItem value="physical">Physical Visit</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <div className="space-y-2">
                                <Label htmlFor="notes">Notes (Optional)</Label>
                                <Textarea
                                    id="notes"
                                    value={scheduleData.notes}
                                    onChange={(e) => setScheduleData({ ...scheduleData, notes: e.target.value })}
                                    placeholder="Any additional information..."
                                    rows={3}
                                />
                            </div>
                            
                            <div className="rounded-lg border bg-muted p-4">
                                <h4 className="text-sm font-semibold mb-2">Documents On File:</h4>
                                <div className="space-y-1 text-sm">
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
                        
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={handleCloseScheduleModal}>
                                Cancel
                            </Button>
                            <Button type="submit">
                                <Calendar className="h-4 w-4 mr-2" />
                                Schedule Visit
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
