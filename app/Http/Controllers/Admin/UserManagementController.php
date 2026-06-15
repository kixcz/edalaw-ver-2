<?php

namespace App\Http\Controllers\Admin;

use App\ApprovalStatus;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserSession;
use App\Services\AuditLogService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class UserManagementController extends Controller
{
    /**
     * Display the user management page.
     */
    public function index(): Response
    {
        $user = auth()->user();
        $query = User::with('role');

        // Jail Wardens can only see users in their branch
        if ($user->role->slug === 'jail_warden' && $user->branch_id) {
            $query->where('branch_id', $user->branch_id);
        }

        $users = $query->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($user) {
                // Check if user has an active session
                $hasActiveSession = UserSession::where('user_id', $user->id)
                    ->where('is_current', true)
                    ->where('last_activity', '>=', now()->subHours(2))
                    ->exists();

                return [
                    'id' => $user->id,
                    'first_name' => $user->first_name,
                    'middle_name' => $user->middle_name,
                    'last_name' => $user->last_name,
                    'dob' => $user->dob?->format('Y-m-d'),
                    'gender' => $user->gender,
                    'street' => $user->street,
                    'brgy' => $user->brgy,
                    'municipality' => $user->municipality,
                    'province' => $user->province,
                    'postal_code' => $user->postal_code,
                    'email' => $user->email,
                    'contact_number' => $user->contact_number,
                    'role' => $user->role?->slug,
                    'role_name' => $user->role?->name,
                    'approval_status' => $user->approval_status,
                    'rejection_reason' => $user->rejection_reason,
                    'email_verified_at' => $user->email_verified_at?->format('Y-m-d H:i:s'),
                    'created_at' => $user->created_at->format('Y-m-d H:i:s'),
                    'is_active' => $hasActiveSession,
                    'id_document_1_path' => $user->id_document_1_path,
                    'id_document_2_path' => $user->id_document_2_path,
                ];
            });

        // Get unique roles for filter (exclude removed roles)
        $roles = \App\Models\Role::whereIn('slug', ['national', 'regional_supervisor', 'jail_warden', 'jail_officer', 'visitor'])
            ->orderBy('name')
            ->get(['id', 'name', 'slug']);

        return Inertia::render('Admin/UserManagement', [
            'users' => $users,
            'roles' => $roles,
        ]);
    }

    /**
     * Approve a pending user.
     */
    public function approve(Request $request, User $user): RedirectResponse
    {
        $user->update([
            'approval_status' => ApprovalStatus::Approved,
        ]);

        // Log the action
        AuditLogService::logAction(
            'user_approved',
            $user,
            'User Management',
            "Approved user account: {$user->email} ({$user->first_name} {$user->last_name})",
            $request,
            [
                'user_email' => $user->email,
                'user_name' => trim("{$user->first_name} {$user->middle_name} {$user->last_name}"),
                'user_role' => $user->role?->slug,
            ]
        );

        return redirect()->route('admin.users.index')
            ->with('success', 'User approved successfully.');
    }

    /**
     * Reject a pending user.
     */
    public function reject(Request $request, User $user): RedirectResponse
    {
        $request->validate([
            'rejection_reason' => ['required', 'string', 'min:10', 'max:1000'],
        ]);

        $user->update([
            'approval_status' => ApprovalStatus::Rejected,
            'rejection_reason' => $request->rejection_reason,
        ]);

        // Send notification to user about rejection
        \App\Services\NotificationService::createAccountRejectionNotification($user);

        // Log the action
        AuditLogService::logAction(
            'user_rejected',
            $user,
            'User Management',
            "Rejected user account: {$user->email} ({$user->first_name} {$user->last_name}). Reason: ".substr($request->rejection_reason, 0, 100),
            $request,
            [
                'user_email' => $user->email,
                'user_name' => trim("{$user->first_name} {$user->middle_name} {$user->last_name}"),
                'user_role' => $user->role?->slug,
                'rejection_reason' => $request->rejection_reason,
            ]
        );

        return redirect()->route('admin.users.index')
            ->with('success', 'User rejected successfully.');
    }

    /**
     * Update user approval status.
     */
    public function updateStatus(Request $request, User $user): RedirectResponse
    {
        $request->validate([
            'approval_status' => 'required|in:pending,approved,rejected',
            'rejection_reason' => ['exclude_unless:approval_status,rejected', 'string', 'min:10', 'max:1000'],
        ]);

        $updateData = [
            'approval_status' => $request->approval_status,
        ];

        if ($request->approval_status === ApprovalStatus::Rejected->value) {
            $updateData['rejection_reason'] = $request->rejection_reason;
        } else {
            $updateData['rejection_reason'] = null;
        }

        $oldStatus = $user->approval_status;
        $user->update($updateData);

        // Send notification if rejected
        if ($request->approval_status === ApprovalStatus::Rejected->value) {
            \App\Services\NotificationService::createAccountRejectionNotification($user);
        }

        // Log the action
        $statusChange = "Status changed from {$oldStatus->value} to {$request->approval_status}";
        AuditLogService::logAction(
            'user_status_updated',
            $user,
            'User Management',
            "Updated user status for {$user->email} ({$user->first_name} {$user->last_name}): {$statusChange}",
            $request,
            [
                'user_email' => $user->email,
                'user_name' => trim("{$user->first_name} {$user->middle_name} {$user->last_name}"),
                'user_role' => $user->role?->slug,
                'old_status' => $oldStatus->value,
                'new_status' => $request->approval_status,
                'rejection_reason' => $request->rejection_reason ?? null,
            ]
        );

        return redirect()->route('admin.users.index')
            ->with('success', 'User status updated successfully.');
    }

    /**
     * Store a newly created user.
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'first_name' => ['required', 'string', 'max:255'],
            'middle_name' => ['nullable', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'dob' => ['nullable', 'date', 'before:today'],
            'gender' => ['nullable', 'string', 'in:male,female,other'],
            'street' => ['nullable', 'string', 'max:255'],
            'brgy' => ['nullable', 'string', 'max:255'],
            'municipality' => ['nullable', 'string', 'max:255'],
            'province' => ['nullable', 'string', 'max:255'],
            'postal_code' => ['nullable', 'string', 'max:10'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'contact_number' => ['nullable', 'string', 'max:20', 'unique:users,contact_number'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'role_id' => ['required', 'exists:roles,id'],
        ], [
            'email.unique' => 'This email address is already registered to another account.',
            'contact_number.unique' => 'This contact number is already in use by another account.',
        ]);

        $createData = [
            'first_name' => $request->first_name,
            'middle_name' => $request->middle_name,
            'last_name' => $request->last_name,
            'dob' => $request->dob,
            'gender' => $request->gender,
            'street' => $request->street,
            'brgy' => $request->brgy,
            'municipality' => $request->municipality,
            'province' => $request->province,
            'postal_code' => $request->postal_code,
            'email' => $request->email,
            'contact_number' => $request->contact_number,
            'password' => $request->password,
            'role_id' => $request->role_id,
            'approval_status' => ApprovalStatus::Approved,
            'email_verified_at' => now(),
        ];

        // Jail wardens create users in their branch
        if (auth()->user()->role->slug === 'jail_warden' && auth()->user()->branch_id) {
            $createData['branch_id'] = auth()->user()->branch_id;
        }

        $user = User::create($createData);

        // Log the action
        $role = \App\Models\Role::find($request->role_id);
        AuditLogService::logAction(
            'user_created',
            $user,
            'User Management',
            "Created new user account: {$user->email} ({$user->first_name} {$user->last_name}) with role: {$role?->name}",
            $request,
            [
                'user_email' => $user->email,
                'user_name' => trim("{$user->first_name} {$user->middle_name} {$user->last_name}"),
                'user_role' => $role?->slug,
                'created_by_admin' => true,
            ]
        );

        return redirect()->route('admin.users.index')
            ->with('success', 'User created successfully.');
    }

    /**
     * Update user information.
     */
    public function update(Request $request, User $user): RedirectResponse
    {
        $request->validate([
            'first_name' => ['required', 'string', 'max:255'],
            'middle_name' => ['nullable', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'dob' => ['nullable', 'date', 'before:today'],
            'gender' => ['nullable', 'string', 'in:male,female,other'],
            'street' => ['nullable', 'string', 'max:255'],
            'brgy' => ['nullable', 'string', 'max:255'],
            'municipality' => ['nullable', 'string', 'max:255'],
            'province' => ['nullable', 'string', 'max:255'],
            'postal_code' => ['nullable', 'string', 'max:10'],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'contact_number' => ['nullable', 'string', 'max:20', Rule::unique('users', 'contact_number')->ignore($user->id)],
            'role_id' => ['required', 'exists:roles,id'],
        ], [
            'email.unique' => 'This email address is already registered to another account.',
            'contact_number.unique' => 'This contact number is already in use by another account.',
        ]);

        // Store old values for logging
        $oldEmail = $user->email;
        $oldRole = $user->role?->slug;
        $oldName = trim("{$user->first_name} {$user->middle_name} {$user->last_name}");

        $user->update([
            'first_name' => $request->first_name,
            'middle_name' => $request->middle_name,
            'last_name' => $request->last_name,
            'dob' => $request->dob,
            'gender' => $request->gender,
            'street' => $request->street,
            'brgy' => $request->brgy,
            'municipality' => $request->municipality,
            'province' => $request->province,
            'postal_code' => $request->postal_code,
            'email' => $request->email,
            'contact_number' => $request->contact_number,
            'role_id' => $request->role_id,
        ]);

        // Refresh to get updated role
        $user->refresh();
        $newRole = $user->role?->slug;
        $newName = trim("{$user->first_name} {$user->middle_name} {$user->last_name}");

        // Log the action
        $changes = [];
        if ($oldEmail !== $user->email) {
            $changes[] = "Email: {$oldEmail} → {$user->email}";
        }
        if ($oldRole !== $newRole) {
            $changes[] = "Role: {$oldRole} → {$newRole}";
        }
        if ($oldName !== $newName) {
            $changes[] = "Name: {$oldName} → {$newName}";
        }

        $changeDescription = ! empty($changes) ? ' Changes: '.implode(', ', $changes) : '';

        AuditLogService::logAction(
            'user_updated',
            $user,
            'User Management',
            "Updated user account: {$user->email} ({$user->first_name} {$user->last_name}).{$changeDescription}",
            $request,
            [
                'user_email' => $user->email,
                'user_name' => $newName,
                'user_role' => $newRole,
                'old_email' => $oldEmail,
                'old_role' => $oldRole,
                'old_name' => $oldName,
            ]
        );

        return redirect()->route('admin.users.index')
            ->with('success', 'User updated successfully.');
    }

    /**
     * Delete a user.
     */
    public function destroy(Request $request, User $user): RedirectResponse
    {
        // Store user info before deletion for logging
        $userEmail = $user->email;
        $userName = trim("{$user->first_name} {$user->middle_name} {$user->last_name}");
        $userRole = $user->role?->slug;
        $userId = $user->id;

        // Log the action before deletion
        AuditLogService::logAction(
            'user_deleted',
            $user,
            'User Management',
            "Deleted user account: {$userEmail} ({$userName})",
            $request,
            [
                'user_email' => $userEmail,
                'user_name' => $userName,
                'user_role' => $userRole,
                'deleted_user_id' => $userId,
            ]
        );

        $user->delete();

        return redirect()->route('admin.users.index')
            ->with('success', 'User deleted successfully.');
    }
}
