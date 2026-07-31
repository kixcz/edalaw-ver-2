import { Head, router } from '@inertiajs/react';
import { Phone } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type Props = {
    tunnel_token: string;
    session: {
        id: number;
        room_id: string;
        session_type: string;
        scheduled_start?: string;
        scheduled_end?: string;
    };
};

export default function JoinSession({ tunnel_token, session }: Props) {
    const [joining, setJoining] = useState(false);
    const [joined, setJoined] = useState(false);
    const [token, setToken] = useState<{ token: string; room_id: string; participant_id: string } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showNotStartedModal, setShowNotStartedModal] = useState(false);
    const [timeUntilStart, setTimeUntilStart] = useState<string>('');

    const formatTimeUntil = (scheduledStart: string): string => {
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
    };

    const handleJoin = async () => {
        // Check if session has started
        if (session.scheduled_start) {
            const now = Date.now();
            const scheduledStart = new Date(session.scheduled_start).getTime();
            
            if (scheduledStart > now) {
                setTimeUntilStart(formatTimeUntil(session.scheduled_start));
                setShowNotStartedModal(true);
                return;
            }
        }
        
        setError(null);
        setJoining(true);
        try {
            const res = await fetch(`/inmate/join/${tunnel_token}/token`, { method: 'GET', headers: { Accept: 'application/json' } });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'Failed to join');
                setJoining(false);
                return;
            }
            
            // Use Inertia router to visit the VideoRoom page (same as visitors)
            router.visit('/video-room', {
                method: 'get',
                data: {
                    room_id: data.room_id,
                    token: data.token,
                    participant_id: data.participant_id,
                    name: data.participant_name,
                    observer: data.is_observer ? '1' : '0',
                },
                preserveState: false,
                preserveScroll: false,
            });
        } catch (err) {
            setError('Failed to connect');
        }
        setJoining(false);
    };

    return (
        <>
            <Head title="Join Call" />
            <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 p-4">
                <div className="w-full max-w-sm rounded-lg border bg-card p-6 shadow-sm">
                    <h1 className="text-center text-lg font-semibold">Join Video Call</h1>
                    <p className="mt-2 text-center text-sm text-muted-foreground">
                        {session.session_type === 'visit' ? 'Visit' : 'E-Burol'} session
                    </p>
                    {error && (
                        <p className="mt-4 text-center text-sm text-destructive">{error}</p>
                    )}
                    <div className="mt-6 flex flex-col gap-2">
                        <button
                            type="button"
                            onClick={handleJoin}
                            disabled={joining}
                            className="inline-flex items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                        >
                            <Phone className="h-4 w-4" />
                            {joining ? 'Joining...' : 'Join Call'}
                        </button>
                        <p className="text-center text-xs text-muted-foreground">
                            This call is monitored and recorded.
                        </p>
                    </div>
                </div>
            </div>

            {/* Session Not Started Yet Modal */}
            <Dialog open={showNotStartedModal} onOpenChange={setShowNotStartedModal}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Session not started yet</DialogTitle>
                        <DialogDescription>
                            {timeUntilStart
                                ? `This session starts in ${timeUntilStart}. You can wait and try again when it's time.`
                                : 'This session has not started yet.'}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowNotStartedModal(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={() => {
                                setShowNotStartedModal(false);
                                handleJoin();
                            }}
                            className="bg-green-600 hover:bg-green-700 text-white"
                        >
                            Wait
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
