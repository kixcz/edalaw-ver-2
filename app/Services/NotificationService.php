<?php

namespace App\Services;

use App\Events\JailOfficerNotification;
use App\Models\Appeal;
use App\Models\Eburol;
use App\Models\Notification;
use App\Models\Role;
use App\Models\Suggestion;
use App\Models\User;
use App\Models\Visit;
use App\Models\VisitSession;
use Illuminate\Support\Facades\Log;

class NotificationService
{
    /**
     * Send SMS notification to visitor if they have a contact number.
     */
    private static function sendSmsToVisitor(User $user, string $title, string $message): void
    {
        // Only send SMS to visitors
        if ($user->role?->slug !== 'visitor' || ! $user->contact_number) {
            return;
        }

        try {
            $smsService = new SemaphoreSmsService;
            $smsMessage = "eDalawPlus: {$title}. {$message}";
            $smsService->send($user->contact_number, $smsMessage);
        } catch (\Exception $e) {
            Log::error('Failed to send SMS notification', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Create a notification for visit status change.
     */
    public static function createVisitNotification(Visit $visit, string $status): void
    {
        $statusMessages = [
            'approved' => 'Your visit schedule has been approved.',
            'rejected' => 'Your visit schedule has been rejected.',
            'completed' => 'Your visit has been marked as completed.',
            'missed' => 'Your visit has been marked as missed.',
        ];

        $titles = [
            'approved' => 'Visit Schedule Approved',
            'rejected' => 'Visit Schedule Rejected',
            'completed' => 'Visit Completed',
            'missed' => 'Visit Missed',
        ];

        $inmateName = trim("{$visit->inmate_first_name} {$visit->inmate_middle_name} {$visit->inmate_last_name}");
        $message = ($statusMessages[$status] ?? 'Your visit schedule status has been updated.')
            ." Inmate: {$inmateName}. Scheduled for: {$visit->scheduled_date->format('M d, Y')}";

        // Add in-app join URL so visitor gets a link that generates token (raw VideoSDK URL would prompt login)
        if ($status === 'approved' && $visit->visit_type === \App\VisitType::Virtual) {
            $session = $visit->visitSessions()->orderBy('scheduled_start', 'desc')->first();
            if ($session) {
                $joinUrl = url()->route('visit-session.show', $session);
                $message .= " Join your virtual visit: {$joinUrl}";
            }
        }

        $notification = Notification::create([
            'user_id' => $visit->user_id,
            'type' => 'visit_status',
            'title' => $titles[$status] ?? 'Visit Status Updated',
            'message' => $message,
            'notifiable_id' => $visit->id,
            'notifiable_type' => Visit::class,
        ]);

        // Send SMS to visitor
        $user = $visit->user;
        if ($user) {
            self::sendSmsToVisitor($user, $titles[$status] ?? 'Visit Status Updated', $message);
        }
    }

    /**
     * Create a notification for e-burol status change.
     */
    public static function createEburolNotification(Eburol $eburol, string $status): void
    {
        $statusMessages = [
            'approved' => 'Your e-burol application has been approved.',
            'rejected' => 'Your e-burol application has been rejected.',
            'completed' => 'Your e-burol has been marked as completed.',
        ];

        $titles = [
            'approved' => 'E-Burol Application Approved',
            'rejected' => 'E-Burol Application Rejected',
            'completed' => 'E-Burol Completed',
        ];

        $deceasedName = trim("{$eburol->deceased_first_name} {$eburol->deceased_middle_name} {$eburol->deceased_last_name}");
        $message = ($statusMessages[$status] ?? 'Your e-burol application status has been updated.')
            ." Deceased: {$deceasedName}. Wake period: {$eburol->wake_start_date->format('M d, Y')} - {$eburol->wake_end_date->format('M d, Y')}";

        $notification = Notification::create([
            'user_id' => $eburol->user_id,
            'type' => 'eburol_status',
            'title' => $titles[$status] ?? 'E-Burol Status Updated',
            'message' => $message,
            'notifiable_id' => $eburol->id,
            'notifiable_type' => Eburol::class,
        ]);

        // Send SMS to visitor
        $user = $eburol->user;
        if ($user) {
            self::sendSmsToVisitor($user, $titles[$status] ?? 'E-Burol Status Updated', $message);
        }
    }

    /**
     * Notify visitor that their session starts in 5 minutes — they should click Join to prepare.
     */
    public static function createJoinReminderNotification(VisitSession $session): void
    {
        $visitor = $session->visitor;
        if (! $visitor) {
            return;
        }

        $start = $session->scheduled_start->format('g:i A');
        $end = $session->scheduled_end->format('g:i A');
        $date = $session->scheduled_start->format('M j, Y');
        $type = $session->session_type === 'eburol' ? 'E-Burol' : 'Visit';
        $joinUrl = url()->route('visit-session.show', $session);

        $message = "Your {$type} is scheduled to start in 5 minutes ({$date}, {$start} – {$end}). Please click Join now to prepare. {$joinUrl}";

        Notification::create([
            'user_id' => $visitor->id,
            'type' => 'join_reminder',
            'title' => 'Time to join — session starts in 5 minutes',
            'message' => $message,
            'notifiable_id' => $session->id,
            'notifiable_type' => VisitSession::class,
        ]);

        self::sendSmsToVisitor($visitor, 'Time to join — session in 5 minutes', $message);
    }

    /**
     * Create a notification when a visit schedule is submitted.
     */
    public static function createVisitSubmittedNotification(Visit $visit): void
    {
        $inmateName = trim("{$visit->inmate_first_name} {$visit->inmate_middle_name} {$visit->inmate_last_name}");
        $visitType = $visit->visit_type->value === 'virtual' ? 'Virtual' : 'Physical';

        $notification = Notification::create([
            'user_id' => $visit->user_id,
            'type' => 'visit_status',
            'title' => 'Visit Schedule Application Received',
            'message' => "Your {$visitType} visit schedule application has been received by the BJMP officer. Inmate: {$inmateName}. Scheduled for: {$visit->scheduled_date->format('M d, Y')}. Please wait for approval.",
            'notifiable_id' => $visit->id,
            'notifiable_type' => Visit::class,
        ]);

        // Send SMS to visitor
        $user = $visit->user;
        if ($user) {
            self::sendSmsToVisitor($user, 'Visit Schedule Application Received', $notification->message);
        }
    }

    /**
     * Create a notification when an e-burol application is submitted.
     */
    public static function createEburolSubmittedNotification(Eburol $eburol): void
    {
        $deceasedName = trim("{$eburol->deceased_first_name} {$eburol->deceased_middle_name} {$eburol->deceased_last_name}");

        $notification = Notification::create([
            'user_id' => $eburol->user_id,
            'type' => 'eburol_status',
            'title' => 'E-Burol Application Received',
            'message' => "Your e-burol application has been received by the BJMP officer. Deceased: {$deceasedName}. Wake period: {$eburol->wake_start_date->format('M d, Y')} - {$eburol->wake_end_date->format('M d, Y')}. Please wait for approval.",
            'notifiable_id' => $eburol->id,
            'notifiable_type' => Eburol::class,
        ]);

        // Send SMS to visitor
        $user = $eburol->user;
        if ($user) {
            self::sendSmsToVisitor($user, 'E-Burol Application Received', $notification->message);
        }
    }

    /**
     * Create a notification when an appeal is submitted.
     */
    public static function createAppealSubmittedNotification(Appeal $appeal): void
    {
        $appealableType = $appeal->appealable_type === Visit::class ? 'Visit Schedule' : 'E-Burol Application';

        $notification = Notification::create([
            'user_id' => $appeal->user_id,
            'type' => 'appeal_status',
            'title' => 'Appeal Submitted',
            'message' => "Your appeal for {$appealableType} has been submitted and is pending review.",
            'notifiable_id' => $appeal->id,
            'notifiable_type' => Appeal::class,
        ]);

        // Send SMS to visitor
        $user = $appeal->user;
        if ($user) {
            self::sendSmsToVisitor($user, 'Appeal Submitted', $notification->message);
        }
    }

    /**
     * Create a notification when an appeal status changes.
     */
    public static function createAppealStatusNotification(Appeal $appeal): void
    {
        $statusMessages = [
            'approved' => 'Your appeal has been approved. The original decision has been reversed.',
            'rejected' => 'Your appeal has been rejected. This is the final decision.',
        ];

        $titles = [
            'approved' => 'Appeal Approved',
            'rejected' => 'Appeal Rejected',
        ];

        $appealableType = $appeal->appealable_type === Visit::class ? 'Visit Schedule' : 'E-Burol Application';
        $message = ($statusMessages[$appeal->status->value] ?? 'Your appeal status has been updated.')
            ." Appeal for: {$appealableType}.";

        $notification = Notification::create([
            'user_id' => $appeal->user_id,
            'type' => 'appeal_status',
            'title' => $titles[$appeal->status->value] ?? 'Appeal Status Updated',
            'message' => $message,
            'notifiable_id' => $appeal->id,
            'notifiable_type' => Appeal::class,
        ]);

        // Send SMS to visitor
        $user = $appeal->user;
        if ($user) {
            self::sendSmsToVisitor($user, $titles[$appeal->status->value] ?? 'Appeal Status Updated', $message);
        }
    }

    /**
     * Notify all super admins about a new appeal.
     */
    public static function notifySuperAdminsAboutAppeal(Appeal $appeal): void
    {
        $superAdminRole = Role::where('slug', 'super_admin')->first();
        if (! $superAdminRole) {
            return;
        }

        $superAdmins = User::where('role_id', $superAdminRole->id)->get();
        $appealableType = $appeal->appealable_type === Visit::class ? 'Visit Schedule' : 'E-Burol Application';
        $userName = trim("{$appeal->user->first_name} {$appeal->user->last_name}");

        foreach ($superAdmins as $admin) {
            Notification::create([
                'user_id' => $admin->id,
                'type' => 'admin_notification',
                'title' => 'New Appeal Submitted',
                'message' => "{$userName} has submitted an appeal for {$appealableType}. Reason: ".substr($appeal->reason, 0, 100).'...',
                'notifiable_id' => $appeal->id,
                'notifiable_type' => Appeal::class,
            ]);
        }
    }

    /**
     * Notify all BJMP officers about a new appeal.
     */
    public static function notifyBjmpOfficersAboutAppeal(Appeal $appeal): void
    {
        $bjmpRole = Role::where('slug', 'bjmp_officer')->first();
        if (! $bjmpRole) {
            return;
        }

        $bjmpOfficers = User::where('role_id', $bjmpRole->id)->get();
        $appealableType = $appeal->appealable_type === Visit::class ? 'Visit Schedule' : 'E-Burol Application';
        $userName = trim("{$appeal->user->first_name} {$appeal->user->last_name}");

        foreach ($bjmpOfficers as $officer) {
            Notification::create([
                'user_id' => $officer->id,
                'type' => 'appeal_notification',
                'title' => 'New Appeal Submitted',
                'message' => "{$userName} has submitted an appeal for {$appealableType}. Reason: ".substr($appeal->reason, 0, 100).'...',
                'notifiable_id' => $appeal->id,
                'notifiable_type' => Appeal::class,
            ]);
        }
    }

    /**
     * Notify all super admins about a new suggestion/feedback.
     */
    public static function notifySuperAdminsAboutSuggestion(Suggestion $suggestion): void
    {
        $superAdminRole = Role::where('slug', 'super_admin')->first();
        if (! $superAdminRole) {
            return;
        }

        $superAdmins = User::where('role_id', $superAdminRole->id)->get();
        $userName = trim("{$suggestion->user->first_name} {$suggestion->user->last_name}");
        $typeLabel = $suggestion->type === 'suggestion' ? 'Suggestion' : 'Complaint';

        foreach ($superAdmins as $admin) {
            Notification::create([
                'user_id' => $admin->id,
                'type' => 'admin_notification',
                'title' => "New {$typeLabel} Received",
                'message' => "{$userName} has submitted a {$suggestion->type}: {$suggestion->subject}",
                'notifiable_id' => $suggestion->id,
                'notifiable_type' => Suggestion::class,
            ]);
        }
    }

    /**
     * Create a notification for visitor when they submit a suggestion/feedback.
     */
    public static function createSuggestionSubmittedNotification(Suggestion $suggestion): void
    {
        $typeLabel = $suggestion->type === 'suggestion' ? 'Suggestion' : 'Complaint';

        $notification = Notification::create([
            'user_id' => $suggestion->user_id,
            'type' => $suggestion->type === 'suggestion' ? 'suggestion_feedback' : 'complaint_feedback',
            'title' => "{$typeLabel} Submitted",
            'message' => "Your {$suggestion->type} has been sent to the BJMP for review. Thank you for taking the time to provide your feedback!",
            'notifiable_id' => $suggestion->id,
            'notifiable_type' => Suggestion::class,
        ]);

        // Send SMS to visitor
        $user = $suggestion->user;
        if ($user) {
            self::sendSmsToVisitor($user, "{$typeLabel} Submitted", $notification->message);
        }
    }

    /**
     * Create a notification for visitor when their suggestion/feedback status is updated.
     */
    public static function createSuggestionStatusNotification(Suggestion $suggestion, string $status): void
    {
        $typeLabel = $suggestion->type === 'suggestion' ? 'Suggestion' : 'Complaint';

        $statusMessages = [
            'reviewed' => "Your {$typeLabel} has been reviewed by the administrator.",
            'in_progress' => "Your {$typeLabel} is now being processed.",
            'resolved' => "Your {$typeLabel} has been resolved.",
            'dismissed' => "Your {$typeLabel} has been dismissed.",
        ];

        $titles = [
            'reviewed' => "{$typeLabel} Reviewed",
            'in_progress' => "{$typeLabel} In Progress",
            'resolved' => "{$typeLabel} Resolved",
            'dismissed' => "{$typeLabel} Dismissed",
        ];

        $message = $statusMessages[$status] ?? "Your {$typeLabel} status has been updated to {$status}.";

        // Add admin response if available
        if ($suggestion->admin_response) {
            $responsePreview = strlen($suggestion->admin_response) > 150
                ? substr($suggestion->admin_response, 0, 150).'...'
                : $suggestion->admin_response;
            $message .= " Response: {$responsePreview}";
        }

        $notification = Notification::create([
            'user_id' => $suggestion->user_id,
            'type' => $suggestion->type === 'suggestion' ? 'suggestion_feedback' : 'complaint_feedback',
            'title' => $titles[$status] ?? "{$typeLabel} Status Updated",
            'message' => $message,
            'notifiable_id' => $suggestion->id,
            'notifiable_type' => Suggestion::class,
        ]);

        // Send SMS to visitor
        $user = $suggestion->user;
        if ($user) {
            self::sendSmsToVisitor($user, $titles[$status] ?? "{$typeLabel} Status Updated", $message);
        }
    }

    /**
     * Create a notification for device login warning.
     */
    public static function createDeviceLoginWarningNotification(User $user, string $deviceInfo, string $location): void
    {
        Notification::create([
            'user_id' => $user->id,
            'type' => 'device_warning',
            'title' => 'Security Alert: New Device Login Detected',
            'message' => "A login attempt was detected from a new device ({$deviceInfo}) at {$location}. If this wasn't you, please secure your account immediately.",
            'notifiable_id' => $user->id,
            'notifiable_type' => User::class,
        ]);
    }

    /**
     * Notify all super admins about a new user registration.
     */
    public static function notifySuperAdminsAboutNewUser(User $user): void
    {
        $superAdminRole = Role::where('slug', 'super_admin')->first();
        if (! $superAdminRole) {
            return;
        }

        $superAdmins = User::where('role_id', $superAdminRole->id)->get();
        $userName = trim("{$user->first_name} {$user->middle_name} {$user->last_name}");
        $roleName = $user->role?->name ?? 'Unknown';

        foreach ($superAdmins as $admin) {
            Notification::create([
                'user_id' => $admin->id,
                'type' => 'admin_notification',
                'title' => 'New User Registration',
                'message' => "{$userName} ({$user->email}) has registered as {$roleName}. Approval status: {$user->approval_status->value}",
                'notifiable_id' => $user->id,
                'notifiable_type' => User::class,
            ]);
        }
    }

    /**
     * Notify super admins and the user about a concurrent login attempt (same account, different device).
     */
    public static function notifyConcurrentLoginAttempt(User $user, string $ipAddress, string $userAgent): void
    {
        $userName = trim("{$user->first_name} {$user->middle_name} {$user->last_name}");
        $deviceInfo = strlen($userAgent) > 100 ? substr($userAgent, 0, 100).'...' : $userAgent;

        $superAdminRole = Role::where('slug', 'super_admin')->first();
        if ($superAdminRole) {
            $superAdmins = User::where('role_id', $superAdminRole->id)->get();
            foreach ($superAdmins as $admin) {
                Notification::create([
                    'user_id' => $admin->id,
                    'type' => 'admin_notification',
                    'title' => 'Concurrent Login Attempt',
                    'message' => "{$userName} ({$user->email}) attempted to log in from another device while already logged in. IP: {$ipAddress}. This attempt has been blocked and tracked.",
                    'notifiable_id' => $user->id,
                    'notifiable_type' => User::class,
                ]);
            }
        }

        Notification::create([
            'user_id' => $user->id,
            'type' => 'device_warning',
            'title' => 'Login Blocked: Already Logged In Elsewhere',
            'message' => "A login was attempted from another device (IP: {$ipAddress}). You are already logged in elsewhere. If this was not you, contact support. This attempt has been monitored and reported.",
            'notifiable_id' => $user->id,
            'notifiable_type' => User::class,
        ]);
    }

    /**
     * Notify all super admins about a new visit schedule.
     */
    public static function notifySuperAdminsAboutVisit(Visit $visit): void
    {
        $superAdminRole = Role::where('slug', 'super_admin')->first();
        if (! $superAdminRole) {
            return;
        }

        $superAdmins = User::where('role_id', $superAdminRole->id)->get();
        $userName = trim("{$visit->user->first_name} {$visit->user->last_name}");
        $inmateName = trim("{$visit->inmate_first_name} {$visit->inmate_middle_name} {$visit->inmate_last_name}");
        $visitType = $visit->visit_type->value === 'virtual' ? 'Virtual' : 'Physical';

        foreach ($superAdmins as $admin) {
            Notification::create([
                'user_id' => $admin->id,
                'type' => 'admin_notification',
                'title' => 'New Visit Schedule Request',
                'message' => "{$userName} has submitted a {$visitType} visit schedule for {$inmateName} on {$visit->scheduled_date->format('M d, Y')}",
                'notifiable_id' => $visit->id,
                'notifiable_type' => Visit::class,
            ]);
        }
    }

    /**
     * Notify jail officer when assigned to a visit.
     */
    public static function notifyMonitoringOfficerAboutVisit(Visit $visit): void
    {
        if (! $visit->jail_officer_id) {
            return;
        }

        $inmateName = trim("{$visit->inmate_first_name} {$visit->inmate_middle_name} {$visit->inmate_last_name}");
        $visitType = $visit->visit_type->value === 'virtual' ? 'Virtual' : 'Physical';
        $visitorName = trim("{$visit->user->first_name} {$visit->user->last_name}");

        $notification = Notification::create([
            'user_id' => $visit->jail_officer_id,
            'type' => 'monitoring_assignment',
            'title' => 'New Visit Assignment',
            'message' => "You have been assigned to monitor a {$visitType} visit. Visitor: {$visitorName}. Inmate: {$inmateName}. Scheduled for: {$visit->scheduled_date->format('M d, Y')} at {$visit->scheduled_time}.",
            'notifiable_id' => $visit->id,
            'notifiable_type' => Visit::class,
        ]);

        // Broadcast real-time notification
        $jailOfficer = $visit->jailOfficer;
        if ($jailOfficer) {
            broadcast(new JailOfficerNotification($jailOfficer, $notification));
        }
    }

    /**
     * Notify jail officer when assigned to an e-burol.
     */
    public static function notifyMonitoringOfficerAboutEburol(Eburol $eburol): void
    {
        if (! $eburol->jail_officer_id) {
            return;
        }

        $deceasedName = trim("{$eburol->deceased_first_name} {$eburol->deceased_middle_name} {$eburol->deceased_last_name}");
        $visitorName = trim("{$eburol->user->first_name} {$eburol->user->last_name}");

        $notification = Notification::create([
            'user_id' => $eburol->jail_officer_id,
            'type' => 'monitoring_assignment',
            'title' => 'New E-Burol Assignment',
            'message' => "You have been assigned to monitor an e-burol. Visitor: {$visitorName}. Deceased: {$deceasedName}. Wake period: {$eburol->wake_start_date->format('M d, Y')} - {$eburol->wake_end_date->format('M d, Y')}.",
            'notifiable_id' => $eburol->id,
            'notifiable_type' => Eburol::class,
        ]);

        // Broadcast real-time notification
        $jailOfficer = $eburol->jailOfficer;
        if ($jailOfficer) {
            broadcast(new JailOfficerNotification($jailOfficer, $notification));
        }
    }

    /**
     * Notify all super admins about a new e-burol application.
     */
    public static function notifySuperAdminsAboutEburol(Eburol $eburol): void
    {
        $superAdminRole = Role::where('slug', 'super_admin')->first();
        if (! $superAdminRole) {
            return;
        }

        $superAdmins = User::where('role_id', $superAdminRole->id)->get();
        $userName = trim("{$eburol->user->first_name} {$eburol->user->last_name}");
        $deceasedName = trim("{$eburol->deceased_first_name} {$eburol->deceased_middle_name} {$eburol->deceased_last_name}");

        foreach ($superAdmins as $admin) {
            Notification::create([
                'user_id' => $admin->id,
                'type' => 'admin_notification',
                'title' => 'New E-Burol Application',
                'message' => "{$userName} has submitted an e-burol application for {$deceasedName}. Wake period: {$eburol->wake_start_date->format('M d, Y')} - {$eburol->wake_end_date->format('M d, Y')}",
                'notifiable_id' => $eburol->id,
                'notifiable_type' => Eburol::class,
            ]);
        }
    }

    /**
     * Notify all super admins about an account appeal.
     */
    public static function notifySuperAdminsAboutAccountAppeal(Appeal $appeal): void
    {
        $superAdminRole = Role::where('slug', 'super_admin')->first();
        if (! $superAdminRole) {
            return;
        }

        $superAdmins = User::where('role_id', $superAdminRole->id)->get();
        $userName = trim("{$appeal->user->first_name} {$appeal->user->last_name}");

        foreach ($superAdmins as $admin) {
            Notification::create([
                'user_id' => $admin->id,
                'type' => 'admin_notification',
                'title' => 'New Account Appeal Submitted',
                'message' => "{$userName} ({$appeal->user->email}) has submitted an appeal for account reconsideration. Reason: ".substr($appeal->reason, 0, 100).'...',
                'notifiable_id' => $appeal->id,
                'notifiable_type' => Appeal::class,
            ]);
        }
    }

    /**
     * Create a notification when a user account is rejected.
     */
    public static function createAccountRejectionNotification(User $user): void
    {
        $userName = trim("{$user->first_name} {$user->middle_name} {$user->last_name}");
        $rejectionReason = $user->rejection_reason ? substr($user->rejection_reason, 0, 200) : 'No reason provided.';

        Notification::create([
            'user_id' => $user->id,
            'type' => 'account_status',
            'title' => 'Account Rejected',
            'message' => "Your account has been rejected. Reason: {$rejectionReason}".($user->rejection_reason && strlen($user->rejection_reason) > 200 ? '...' : '').' You may submit an appeal for reconsideration.',
            'notifiable_id' => $user->id,
            'notifiable_type' => User::class,
        ]);

        // Send SMS to visitor if they have a contact number
        self::sendSmsToVisitor($user, 'Account Rejected', "Your account has been rejected. Reason: {$rejectionReason}");
    }
}
