<?php

namespace App\Http\Controllers;

use App\Models\Visit;
use App\VisitStatus;
use App\VisitType;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class VisitProofController extends Controller
{
    /**
     * Show proof of appointment (for physical approved visits). Printable; visitor can save as PDF.
     * Authorized: visit owner (visitor), super_admin, or bjmp_officer.
     */
    public function show(Request $request, Visit $visit): Response
    {
        $user = $request->user();
        $role = $user->role?->slug;

        if ($role === 'visitor') {
            if ($visit->user_id !== $user->id) {
                abort(403, 'You can only view proof for your own visits.');
            }
        } elseif (! in_array($role, ['super_admin', 'bjmp_officer'], true)) {
            abort(403, 'Unauthorized.');
        }

        if ($visit->visit_type !== VisitType::Physical || $visit->status !== VisitStatus::Approved) {
            abort(404, 'Proof of appointment is only available for approved physical visits.');
        }

        $visit->load('user');
        $visitorName = trim("{$visit->user->first_name} {$visit->user->middle_name} {$visit->user->last_name}");
        $inmateName = trim("{$visit->inmate_first_name} {$visit->inmate_middle_name} {$visit->inmate_last_name}");

        return Inertia::render('Visitor/VisitProof', [
            'visit' => [
                'id' => $visit->id,
                'visitor_name' => $visitorName,
                'visitor_email' => $visit->user->email,
                'inmate_name' => $inmateName,
                'scheduled_date' => $visit->scheduled_date->format('F j, Y'),
                'scheduled_time' => $visit->scheduled_time,
                'qr_code_data' => $visit->qr_code_data,
                'access_key_expires_at' => $visit->access_key_expires_at?->format('F j, Y g:i A'),
            ],
        ]);
    }
}
