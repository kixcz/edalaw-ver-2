<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class AuditLogService
{
    /**
     * Log an appeal-related action.
     */
    public static function logAppealAction(
        string $action,
        Model $auditable,
        ?string $description = null,
        ?Request $request = null
    ): void {
        $user = auth()->user();
        $description = $description ?? self::getDefaultDescription($action, $auditable);

        AuditLog::create([
            'action' => $action,
            'auditable_type' => get_class($auditable),
            'auditable_id' => $auditable->id,
            'user_id' => $user?->id,
            'user_role' => $user?->role?->slug,
            'description' => $description,
            'metadata' => [
                'user_email' => $user?->email,
                'user_name' => $user ? trim("{$user->first_name} {$user->middle_name} {$user->last_name}") : 'System',
            ],
            'ip_address' => $request?->ip(),
            'user_agent' => $request?->userAgent(),
        ]);
    }

    /**
     * Log a general action (for BJMP officers and other users).
     */
    public static function logAction(
        string $action,
        Model $auditable,
        ?string $module = null,
        ?string $description = null,
        ?Request $request = null,
        ?array $additionalMetadata = null
    ): void {
        $user = auth()->user();
        $auditableType = class_basename($auditable);
        $description = $description ?? self::getDefaultDescription($action, $auditable);

        $metadata = [
            'user_email' => $user?->email,
            'user_name' => $user ? trim("{$user->first_name} {$user->middle_name} {$user->last_name}") : 'System',
            'module' => $module ?? $auditableType,
        ];

        if ($additionalMetadata) {
            $metadata = array_merge($metadata, $additionalMetadata);
        }

        AuditLog::create([
            'action' => $action,
            'auditable_type' => get_class($auditable),
            'auditable_id' => $auditable->id,
            'user_id' => $user?->id,
            'user_role' => $user?->role?->slug,
            'description' => $description,
            'metadata' => $metadata,
            'ip_address' => $request?->ip(),
            'user_agent' => $request?->userAgent(),
        ]);
    }

    /**
     * Get default description for an action.
     */
    private static function getDefaultDescription(string $action, Model $auditable): string
    {
        $auditableType = class_basename($auditable);

        return match ($action) {
            'appeal_submitted' => "Appeal submitted for {$auditableType} #{$auditable->id}",
            'appeal_reviewed' => "Appeal reviewed for {$auditableType} #{$auditable->id}",
            'appeal_auto_rejected' => "Appeal automatically rejected (deadline passed) for {$auditableType} #{$auditable->id}",
            'appeal_status_updated' => "Appeal #{$auditable->id} status updated",
            'eburol_approved' => "E-Burol application #{$auditable->id} approved",
            'eburol_rejected' => "E-Burol application #{$auditable->id} rejected",
            'eburol_status_updated' => "E-Burol application #{$auditable->id} status updated",
            'eburol_created' => "E-Burol application #{$auditable->id} created",
            'eburol_updated' => "E-Burol application #{$auditable->id} updated",
            'eburol_deleted' => "E-Burol application #{$auditable->id} deleted",
            'eburol_submitted' => "E-Burol application #{$auditable->id} submitted",
            'eburol_rescheduled' => "E-Burol application #{$auditable->id} rescheduled",
            'visit_approved' => "Visit schedule #{$auditable->id} approved",
            'visit_rejected' => "Visit schedule #{$auditable->id} rejected",
            'visit_status_updated' => "Visit schedule #{$auditable->id} status updated",
            'visit_created' => "Visit schedule #{$auditable->id} created",
            'visit_updated' => "Visit schedule #{$auditable->id} updated",
            'visit_deleted' => "Visit schedule #{$auditable->id} deleted",
            'visit_rescheduled' => "Visit schedule #{$auditable->id} rescheduled",
            'visit_submitted' => "Visit schedule #{$auditable->id} submitted",
            'visit_cancelled' => "Visit schedule #{$auditable->id} cancelled",
            'user_approved' => "User account #{$auditable->id} approved",
            'user_rejected' => "User account #{$auditable->id} rejected",
            'user_created' => "User account #{$auditable->id} created",
            'user_updated' => "User account #{$auditable->id} updated",
            'user_deleted' => "User account #{$auditable->id} deleted",
            'user_status_updated' => "User account #{$auditable->id} status updated",
            'suggestion_submitted' => "Suggestion/Complaint #{$auditable->id} submitted",
            'session_started' => "Session #{$auditable->id} started",
            'session_ended' => "Session #{$auditable->id} ended",
            'session_killed' => "Session #{$auditable->id} terminated by monitor",
            'chat_locked' => "Chat locked for session #{$auditable->id}",
            'chat_unlocked' => "Chat unlocked for session #{$auditable->id}",
            default => "Action '{$action}' performed on {$auditableType} #{$auditable->id}",
        };
    }
}
