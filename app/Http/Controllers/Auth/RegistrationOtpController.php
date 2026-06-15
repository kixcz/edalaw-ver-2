<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\OtpService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Session;
use Inertia\Inertia;
use Inertia\Response;

class RegistrationOtpController extends Controller
{
    /**
     * Show the registration OTP verification page.
     */
    public function show(Request $request): Response|RedirectResponse
    {
        $userId = Session::get('registration.user_id');

        if (! $userId) {
            return redirect()->route('register');
        }

        $user = User::find($userId);

        if (! $user) {
            Session::forget(['registration.user_id']);

            return redirect()->route('register');
        }

        return Inertia::render('auth/otp-verification', [
            'email' => $user->email,
            'contact_number' => $user->contact_number ? substr_replace($user->contact_number, '****', -4) : null,
            'verify_url' => route('registration-otp.verify'),
            'resend_url' => route('registration-otp.resend'),
            'title' => 'Verify your account',
            'description' => 'Enter the 6-digit OTP sent to your email and contact number',
            'sent_to_label' => null,
            'sent_to_value' => null,
            'warning' => session('otp_warning'),
        ]);
    }

    /**
     * Verify registration OTP and complete registration.
     */
    public function verify(Request $request): RedirectResponse
    {
        $request->validate([
            'otp' => ['required', 'string', 'size:6'],
        ]);

        $userId = Session::get('registration.user_id');

        if (! $userId) {
            return redirect()->route('register')
                ->withErrors(['otp' => 'Session expired. Please register again.']);
        }

        $user = User::find($userId);

        if (! $user) {
            Session::forget(['registration.user_id']);

            return redirect()->route('register')
                ->withErrors(['otp' => 'User not found. Please register again.']);
        }

        $otpService = new OtpService;

        if (! $otpService->verify($user, $request->otp, 'registration')) {
            return back()->withErrors(['otp' => 'Invalid or expired OTP. Please try again.']);
        }

        $user->forceFill([
            'email_verified_at' => now(),
        ])->save();

        Session::forget(['registration.user_id']);

        Auth::login($user);

        // Redirect to visitor dashboard (home) since visitors are auto-approved
        return redirect()->route('home');
    }

    /**
     * Resend registration OTP.
     */
    public function resend(Request $request): RedirectResponse
    {
        $userId = Session::get('registration.user_id');

        if (! $userId) {
            return redirect()->route('register')
                ->withErrors(['otp' => 'Session expired. Please register again.']);
        }

        $user = User::find($userId);

        if (! $user) {
            Session::forget(['registration.user_id']);

            return redirect()->route('register')
                ->withErrors(['otp' => 'User not found. Please register again.']);
        }

        $otpService = new OtpService;
        $result = $otpService->generateAndSendRegistration($user);

        if ($result['success']) {
            return back()->with('success', 'OTP has been resent to your email and contact number.');
        }

        return back()->withErrors(['otp' => $result['error'] ?? 'Failed to resend OTP. Please try again.']);
    }
}
