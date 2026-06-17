<?php

use App\Exceptions\ConcurrentLoginAttemptException;
use App\Exceptions\InsufficientSmsBalanceException;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->encryptCookies(except: ['appearance', 'sidebar_state']);

        $middleware->web(append: [
            HandleAppearance::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
            \App\Http\Middleware\UpdateSessionActivity::class,
        ]);

        $middleware->alias([
            'role' => \App\Http\Middleware\EnsureRole::class,
            'approved' => \App\Http\Middleware\EnsureApproved::class,
            'prevent_duplicate_inmate' => \App\Http\Middleware\PreventDuplicateInmateSession::class,
            'branch_scope' => \App\Http\Middleware\EnforceBranchScope::class,
            'resolve_jo_scope' => \App\Http\Middleware\ResolveJailOfficerScope::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (ConcurrentLoginAttemptException $e, $request) {
            return redirect()->route('concurrent-login-warning')
                ->with('concurrent_login_email', $e->user->email)
                ->with('warning', 'concurrent');
        });

        $exceptions->render(function (ValidationException $e, $request) {
            if (! $request->isMethod('POST') || $request->path() !== 'login') {
                return null;
            }
            $messages = $e->validator->errors()->getMessages();
            $otpRequired = isset($messages['otp']) && in_array('OTP required', $messages['otp'], true);
            if ($otpRequired || $request->session()->get('login.requires_otp')) {
                $url = route('otp-verification.show');

                return $request->header('X-Inertia')
                    ? Inertia::location($url)
                    : redirect()->to($url, 303);
            }

            return null;
        });

        $exceptions->render(function (InsufficientSmsBalanceException $e, $request) {
            Log::error('SMS Insufficient Balance', [
                'message' => $e->getMessage(),
            ]);

            return response()->view('errors.sms-insufficient-balance', [
                'message' => 'Insufficient SMS balance. Please add funds to your Semaphore account to enable messaging.',
            ], 503);
        });
    })->create();
