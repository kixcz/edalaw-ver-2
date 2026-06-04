<?php

namespace App\Http\Controllers\Visitor;

use App\Http\Controllers\Controller;
use App\Models\VisitSession;
use Carbon\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class CallLogController extends Controller
{
    /**
     * Display the call logs page.
     */
    public function index(): Response
    {
        $now = now();
        
        // Fetch visit sessions for the current user (both visits and eburol)
        $callLogs = VisitSession::with(['visit', 'eburol', 'inmateTunnels.inmate'])
            ->whereHas('visit', fn($q) => $q->where('user_id', auth()->id()))
            ->orWhereHas('eburol', fn($q) => $q->where('user_id', auth()->id()))
            ->orderBy('scheduled_start', 'desc')
            ->get()
            ->map(function ($session) use ($now) {
                // Determine the display status based on your requirements
                $status = $this->determineSessionStatus($session, $now);
                
                // Get participant names
                $visitorName = $session->visit?->user?->name ?? $session->eburol?->user?->name ?? 'Visitor';
                $inmateName = $session->inmateTunnels->first()?->inmate?->name ?? 'Inmate';
                
                // Calculate duration
                $durationSeconds = $session->duration_seconds ?? 0;
                if (!$durationSeconds && $session->started_at && $session->ended_at) {
                    $durationSeconds = $session->started_at->diffInSeconds($session->ended_at);
                }
                
                return [
                    'id' => $session->id,
                    'phone_number' => null,
                    'call_type' => 'video',
                    'call_date' => $session->scheduled_start->format('Y-m-d H:i:s'),
                    'duration' => $durationSeconds > 0 ? $durationSeconds : null,
                    'notes' => sprintf('Video call with %s', $inmateName),
                    'status' => $status,
                    'created_at' => $session->created_at->format('Y-m-d H:i:s'),
                    // Additional data for frontend
                    'visitor_name' => $visitorName,
                    'inmate_name' => $inmateName,
                    'scheduled_end' => $session->scheduled_end?->format('Y-m-d H:i:s'),
                    'visitor_joined_at' => $session->visitor_joined_at?->format('Y-m-d H:i:s'),
                    'inmate_joined_at' => $session->inmate_joined_at?->format('Y-m-d H:i:s'),
                    'end_reason' => $session->end_reason,
                ];
            });

        return Inertia::render('Visitor/CallLogs', [
            'callLogs' => $callLogs,
        ]);
    }
    
    /**
     * Determine session status based on business rules.
     *
     * Status mapping:
     * - scheduled: Not yet at scheduled time AND session never became active
     * - active: BOTH visitor AND inmate have joined (visitor_joined_at AND inmate_joined_at exist)
     * - completed: Session ended normally, both sides joined, duration ≥ minimum threshold
     * - missed: Scheduled time passed AND visitor never joined
     * - terminated: Monitoring officer ended the session manually (end_reason present)
     */
    private function determineSessionStatus($session, $now): string
    {
        // If session has an explicit end status from backend, respect it
        if (in_array($session->status, ['completed', 'terminated', 'missed'])) {
            return $session->status;
        }
        
        // Check if both participants joined
        $bothJoined = $session->visitor_joined_at && $session->inmate_joined_at;
        $visitorJoined = $session->visitor_joined_at;
        $inmateJoined = $session->inmate_joined_at;
        
        // Calculate actual duration if available
        $actualDuration = 0;
        if ($session->started_at && $session->ended_at) {
            $actualDuration = $session->started_at->diffInSeconds($session->ended_at);
        } elseif ($session->duration_seconds) {
            $actualDuration = $session->duration_seconds;
        }
        
        // Minimum threshold: 60 seconds (1 minute)
        $minimumThreshold = 60;
        
        // ACTIVE: Both visitor AND inmate have joined, session still within schedule or recently ended
        if ($bothJoined && $session->status === 'active') {
            return 'active';
        }
        
        // If session already ended (not active), determine final outcome
        if ($session->ended_at || $now->isAfter($session->scheduled_end)) {
            // TERMINATED: Officer ended manually OR session ended before minimum duration despite both joining
            if ($session->end_reason || ($bothJoined && $actualDuration < $minimumThreshold)) {
                return 'terminated';
            }
            
            // COMPLETED: Both joined AND duration >= threshold
            if ($bothJoined && $actualDuration >= $minimumThreshold) {
                return 'completed';
            }
            
            // MISSED: Visitor never joined (even if inmate joined)
            if (!$visitorJoined) {
                return 'missed';
            }
            
            // Fallback: If one joined but not both, and no clear termination
            if (!$bothJoined) {
                return 'missed';
            }
        }
        
        // SCHEDULED: Not yet at scheduled start time
        if ($now->isBefore($session->scheduled_start)) {
            return 'scheduled';
        }
        
        // Within scheduled window but not started yet
        if ($now->between($session->scheduled_start, $session->scheduled_end)) {
            if (!$visitorJoined && !$inmateJoined) {
                return 'scheduled'; // Waiting for participants
            }
            if ($visitorJoined && !$inmateJoined) {
                return 'active'; // Visitor waiting for inmate
            }
            if ($inmateJoined && !$visitorJoined) {
                return 'active'; // Inmate waiting for visitor
            }
        }
        
        // Default fallback
        return $session->status ?? 'scheduled';
    }
}
