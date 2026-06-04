<?php

namespace App\Actions\Fortify;

use App\ApprovalStatus;
use App\Exceptions\ConcurrentLoginAttemptException;
use App\Models\ConcurrentLoginAttempt;
use App\Models\User;
use App\Services\NotificationService;
use App\Services\OtpService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Session;
use Illuminate\Validation\ValidationException;
use Laravel\Fortify\Fortify;

class AuthenticateUser
{
    
    public function __invoke(Request $request): ?User
    {
        $login = trim((string) $request->input(Fortify::username()));
        $user = User::with('role')
            ->where(function ($q) use ($login) {
                $q->where('email', $login)
                    ->orWhere('contact_number', $login)
                    ->orWhere('contact_number', ltrim($login, '0'));
            })
            ->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            return null;
        }

        if (strtolower((string) $user->role?->slug) !== 'visitor') {
            $this->guardAgainstConcurrentLogin($request, $user);

            return $user;
        }

        if ($user->approval_status === ApprovalStatus::Pending) {
            return $user;
        }

        if ($user->approval_status === ApprovalStatus::Rejected) {
            return $user;
        }

        if ($user->approval_status !== ApprovalStatus::Approved) {
            throw ValidationException::withMessages([
                'email' => 'Your account is not approved. Please contact support.',
            ]);
        }

        $this->guardAgainstConcurrentLogin($request, $user);

        if (empty(trim((string) ($user->contact_number ?? '')))) {
            throw ValidationException::withMessages([
                'email' => 'No contact number on file. Please contact support to add your mobile number before logging in.',
            ]);
        }

        $otpService = new OtpService;
        $result = $otpService->generateAndSend($user, 'login');

        if (! $result['success']) {
            throw ValidationException::withMessages([
                'otp' => $result['error'] ?? 'Failed to send OTP.',
            ]);
        }

        Session::put('login.user_id', $user->id);
        Session::put('login.requires_otp', true);
        Session::put('login.remember', $request->boolean('remember'));

        throw ValidationException::withMessages([
            'otp' => 'OTP required',
        ]);
    }

    private function guardAgainstConcurrentLogin(Request $request, User $user): void
    {
        $sessionLifetimeMinutes = (int) config('session.lifetime', 120);
        $cutoffTimestamp = now()->subMinutes($sessionLifetimeMinutes)->timestamp;

        $hasOtherActiveSession = DB::table(config('session.table', 'sessions'))
            ->where('user_id', $user->id)
            ->where('last_activity', '>=', $cutoffTimestamp)
            ->exists();

        if (! $hasOtherActiveSession) {
            return;
        }

        ConcurrentLoginAttempt::create([
            'user_id' => $user->id,
            'email' => $user->email,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'attempted_at' => now(),
        ]);

        NotificationService::notifyConcurrentLoginAttempt(
            $user,
            $request->ip() ?? 'unknown',
            $request->userAgent() ?? ''
        );

        throw new ConcurrentLoginAttemptException($user, $request);
    }
}
