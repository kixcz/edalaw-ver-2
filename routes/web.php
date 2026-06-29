<?php

use App\ApprovalStatus;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;

Route::get('/', function () {
    if (Auth::check()) {
        $user = Auth::user();
        $user->load('role');

        if ($user->role?->slug !== 'jail_warden') {
            if ($user->approval_status === ApprovalStatus::Pending) {
                return redirect()->route('account-pending');
            }
            if ($user->approval_status === ApprovalStatus::Rejected) {
                return redirect()->route('account-rejected');
            }
            if ($user->approval_status !== ApprovalStatus::Approved) {
                Auth::logout();

                return redirect()->route('login')
                    ->withErrors(['email' => 'Your account is not approved. Please contact support.']);
            }
        }

        $role = $user->role?->slug;
        if ($role === 'jail_warden') {
            return redirect()->route('dashboard.jail-warden');
        }
        if ($role === 'jail_officer') {
            return redirect()->route('dashboard.jail-officer');
        }
        if ($role === 'visitor') {
            return redirect()->route('dashboard.visitor');
        }

        return redirect()->route('dashboard');
    }

    return Inertia::render('public/home');
})->name('home');

// Public Information Portal Routes
Route::prefix('about')->name('about.')->group(function () {
    Route::get('/', function () {
        return Inertia::render('public/about');
    })->name('index');
    Route::get('/objectives', function () {
        return Inertia::render('public/objectives');
    })->name('objectives');
});

Route::get('/services', function () {
    return Inertia::render('public/services');
})->name('services');
Route::get('/how-it-works', function () {
    return Inertia::render('public/how-it-works');
})->name('how-it-works');
Route::get('/faq', function () {
    return Inertia::render('public/faq');
})->name('faq');
Route::get('/privacy', function () {
    return Inertia::render('public/privacy');
})->name('privacy');
Route::get('/terms', function () {
    return Inertia::render('public/terms');
})->name('terms');
Route::get('/contact', function () {
    return Inertia::render('public/contact');
})->name('contact');
Route::get('/announcements', function () {
    return Inertia::render('public/announcements');
})->name('announcements');

// Dedicated Login Route
Route::get('/login', function () {
    return Inertia::render('auth/login', [
        'canResetPassword' => Features::enabled(Features::resetPasswords()),
        'canRegister' => Features::enabled(Features::registration()),
        'status' => session('status'),
        'loginUrl' => route('login.store'),
        'forgotPasswordUrl' => route('password.forgot.show'),
        'csrfToken' => csrf_token(),
        'oldEmail' => request()->old('email'),
    ]);
})->name('login');

Route::get('/test-token', function () {

    $payload = [
        'apikey' => config('videosdk.api_key'),
        'permissions' => ['allow_join'],
        'iat' => time(),
        'exp' => time() + 3600,
    ];

    return \Firebase\JWT\JWT::encode(
        $payload,
        config('videosdk.secret_key'),
        'HS256'
    );
});

Route::get('/meeting-token/{room}', [\App\Http\Controllers\VideoRoomController::class, 'token']);

// Inmate tunnel entry from login page (no auth)
Route::get('inmate-tunnel', [\App\Http\Controllers\InmateTunnelController::class, 'showEnterToken'])
    ->name('inmate.enter-token');
Route::post('inmate-tunnel', [\App\Http\Controllers\InmateTunnelController::class, 'verifyToken'])
    ->name('inmate.verify-token');

// Inmate join (no auth - tunnel token validates access) - with rate limiting and duplicate prevention
Route::middleware(['throttle:10,1', 'prevent_duplicate_inmate'])->group(function () {
    Route::get('inmate/join/{token}', [\App\Http\Controllers\InmateTunnelController::class, 'join'])
        ->name('inmate.join');
    Route::get('inmate/join/{token}/token', [\App\Http\Controllers\InmateTunnelController::class, 'getInmateToken'])
        ->name('inmate.token');
});
Route::get('inmate/tunnel-already-used', [\App\Http\Controllers\InmateTunnelController::class, 'tunnelAlreadyUsed'])
    ->name('inmate.tunnel-already-used')->middleware('guest');

// Jail officer tunnel bypass (NO auth required - OTP verification is the authentication) - with rate limiting
Route::middleware('throttle:5,1')->group(function () {
    Route::get('jail-officer/tunnel-bypass', [\App\Http\Controllers\JailOfficer\TunnelBypassController::class, 'showBypassForm'])
        ->name('jail-officer.tunnel-bypass.show');
    Route::post('jail-officer/tunnel-bypass/verify-otp', [\App\Http\Controllers\JailOfficer\TunnelBypassController::class, 'verifyOtp'])
        ->name('jail-officer.tunnel-bypass.verify-otp');
    Route::post('jail-officer/tunnel-bypass/resend-otp', [\App\Http\Controllers\JailOfficer\TunnelBypassController::class, 'resendOtp'])
        ->name('jail-officer.tunnel-bypass.resend-otp');
});

Route::get('inmate/chat', [\App\Http\Controllers\InmateTunnelController::class, 'listChat'])
    ->name('inmate.chat.list');
Route::post('inmate/chat', [\App\Http\Controllers\InmateTunnelController::class, 'sendChat'])
    ->name('inmate.chat.send');

// Embedded VideoSDK prebuilt (v2 rooms; no auth so inmate can join via token in URL)
Route::get('video-room', [\App\Http\Controllers\VideoRoomController::class, 'show'])
    ->name('video-room.show');

// Concurrent login warning (no auth - shown when login blocked due to existing session)
Route::get('concurrent-login-warning', function () {
    return Inertia::render('auth/concurrent-login-warning', [
        'email' => session('concurrent_login_email'),
        'loginUrl' => route('login'),
    ]);
})->name('concurrent-login-warning')->middleware('guest');

// Unblock OTP routes (no auth - for bypassing concurrent login block)
Route::middleware('guest')->group(function () {
    Route::get('auth/unblock-otp', [\App\Http\Controllers\Auth\UnblockOTPController::class, 'show'])
        ->name('unblock-otp.show');
    Route::post('auth/unblock-otp/send', [\App\Http\Controllers\Auth\UnblockOTPController::class, 'sendOTP'])
        ->name('unblock-otp.send');
    Route::post('auth/unblock-otp/verify', [\App\Http\Controllers\Auth\UnblockOTPController::class, 'verify'])
        ->name('unblock-otp.verify');
});

// OTP Verification routes (no auth required)
Route::middleware('guest')->group(function () {
    Route::get('otp-verification', [\App\Http\Controllers\Auth\OtpVerificationController::class, 'show'])
        ->name('otp-verification.show');
    Route::post('otp-verification/verify', [\App\Http\Controllers\Auth\OtpVerificationController::class, 'verify'])
        ->name('otp-verification.verify');
    Route::post('otp-verification/resend', [\App\Http\Controllers\Auth\OtpVerificationController::class, 'resend'])
        ->name('otp-verification.resend');

    // Registration OTP Verification (visitor registration)
    Route::get('registration/otp', [\App\Http\Controllers\Auth\RegistrationOtpController::class, 'show'])
        ->name('registration-otp.show');
    Route::post('registration/otp/verify', [\App\Http\Controllers\Auth\RegistrationOtpController::class, 'verify'])
        ->name('registration-otp.verify');
    Route::post('registration/otp/resend', [\App\Http\Controllers\Auth\RegistrationOtpController::class, 'resend'])
        ->name('registration-otp.resend');

    // Inmate Tunnel OTP Verification
    Route::get('inmate/tunnel/{token}/otp', [\App\Http\Controllers\InmateTunnelController::class, 'showOtpVerification'])
        ->name('inmate.tunnel-otp-verify.show');
    Route::post('inmate/tunnel/{token}/otp/verify', [\App\Http\Controllers\InmateTunnelController::class, 'verifyOtp'])
        ->name('inmate.tunnel-otp-verify');
    Route::post('inmate/tunnel/{token}/otp/resend', [\App\Http\Controllers\InmateTunnelController::class, 'resendOtp'])
        ->name('inmate.tunnel-otp-resend');

    // Password reset via OTP (send OTP to contact number, verify, then reset and logout other sessions)
    Route::get('password/forgot', [\App\Http\Controllers\Auth\PasswordResetOtpController::class, 'showForgotForm'])
        ->name('password.forgot.show');
    Route::post('password/forgot', [\App\Http\Controllers\Auth\PasswordResetOtpController::class, 'sendOtp'])
        ->name('password.forgot.send');
    Route::get('password/verify-otp', [\App\Http\Controllers\Auth\PasswordResetOtpController::class, 'showVerifyOtp'])
        ->name('password.verify-otp.show');
    Route::post('password/verify-otp', [\App\Http\Controllers\Auth\PasswordResetOtpController::class, 'verifyOtp'])
        ->name('password.verify-otp.submit');
    Route::get('password/reset', [\App\Http\Controllers\Auth\PasswordResetOtpController::class, 'showResetForm'])
        ->name('password.reset.show');
    Route::post('password/reset', [\App\Http\Controllers\Auth\PasswordResetOtpController::class, 'reset'])
        ->name('password.reset.submit');
});

Route::post('/video/chat', [App\Http\Controllers\VideoChatController::class, 'store'])->name('video.chat.store');
Route::post('/video/session/update', [App\Http\Controllers\VideoChatController::class, 'updateSession'])->name('video.session.update');
Route::post('/video/chat/send', [App\Http\Controllers\VideoChatController::class, 'sendMessage'])->name('video.chat.send');
Route::get('/video/chat/history/{roomId}', [App\Http\Controllers\VideoChatController::class, 'getChatHistory'])->name('video.chat.history');
Route::get('/video/chat/sync/{sessionId}', [App\Http\Controllers\VideoChatController::class, 'syncFromCloud']);
Route::get('/video/chat/export/{sessionId}', [App\Http\Controllers\VideoChatController::class, 'exportChat'])->name('video.chat.export');

// Chat Message Flagging (jail officer only) - FOR MONITORING SESSIONS ONLY
// Note: For visit session chat flagging, use: /visit/session/{session}/chat/{chatLog}/flag
Route::post('/video/chat/{session}/messages/{message}/flag', [App\Http\Controllers\ChatMessageFlagController::class, 'flag'])
    ->name('video.chat.messages.flag');

// Document serving routes (authenticated users with proper authorization)
Route::get('/documents/user/{path}', [App\Http\Controllers\DocumentController::class, 'serveUserIdDocument'])
    ->where('path', '.*')
    ->name('documents.user');
Route::get('/documents/visit/{path}', [App\Http\Controllers\DocumentController::class, 'serveVisitDocument'])
    ->where('path', '.*')
    ->name('documents.visit');
Route::get('/documents/visitor/{path}', [App\Http\Controllers\DocumentController::class, 'serveVisitorDocument'])
    ->where('path', '.*')
    ->name('documents.visitor');

Route::post('/visit-session/save-session-id', [App\Http\Controllers\Visitor\VisitSessionController::class, 'saveSessionId'])->name('visit-session.save-session-id');
Route::get('/visit-session/{session}/status', [App\Http\Controllers\Visitor\VisitSessionController::class, 'checkStatus'])->name('visit-session.status');

Route::middleware('auth')->group(function () {
    Route::get('account-pending', [\App\Http\Controllers\Auth\AccountStatusController::class, 'showPending'])
        ->name('account-pending');
    Route::get('account-rejected', [\App\Http\Controllers\Auth\AccountStatusController::class, 'showRejected'])
        ->name('account-rejected');
    Route::post('account-appeal', [\App\Http\Controllers\Auth\AccountAppealController::class, 'store'])
        ->name('account-appeal.store');
});

Route::middleware(['auth', 'verified', 'approved'])->group(function () {
    Route::get('dashboard', function () {
        $user = auth()->user();
        $role = $user->role?->slug;

        if ($role === 'national') {
            return redirect()->route('dashboard.national-office');
        }
        if ($role === 'jail_warden') {
            return redirect()->route('dashboard.jail-warden');
        }
        if ($role === 'jail_officer') {
            return redirect()->route('dashboard.jail-officer');
        }
        if ($role === 'visitor') {
            return redirect()->route('dashboard.visitor');
        }

        return Inertia::render('dashboard');

    })->name('dashboard');

    Route::middleware(['role:visitor'])->get('dashboard/visitor', \App\Http\Controllers\Dashboard\VisitorDashboardController::class)
        ->name('dashboard.visitor');

    Route::middleware(['role:national'])->get('dashboard/national-office', \App\Http\Controllers\Dashboard\NationalOfficeDashboardController::class)
        ->name('dashboard.national-office');

    Route::middleware(['role:national'])->prefix('national-office')->name('national-office.')->group(function () {
        Route::resource('regions', \App\Http\Controllers\NationalOffice\RegionManagementController::class)->except(['show', 'create', 'edit']);
        Route::resource('branches', \App\Http\Controllers\NationalOffice\BranchManagementController::class)->except(['show', 'create', 'edit']);
        Route::resource('officers', \App\Http\Controllers\NationalOffice\OfficerManagementController::class)->except(['show', 'create', 'edit']);
        Route::resource('annexes', \App\Http\Controllers\NationalOffice\AnnexManagementController::class)->except(['show', 'create', 'edit']);
        Route::resource('dormitories', \App\Http\Controllers\NationalOffice\DormitoryManagementController::class)->except(['show', 'create', 'edit']);
        Route::resource('cells', \App\Http\Controllers\NationalOffice\CellManagementController::class)->except(['show', 'create', 'edit']);
        Route::resource('pdls', \App\Http\Controllers\NationalOffice\PdlManagementController::class)->except(['show', 'create', 'edit']);
    });

    // Regional Supervisor Routes
    Route::middleware(['role:regional_supervisor'])->group(function () {
        Route::get('dashboard/regional-supervisor', [\App\Http\Controllers\Dashboard\RegionalOfficeDashboardController::class, 'index'])
            ->name('dashboard.regional-supervisor');
        Route::post('dashboard/branches', [\App\Http\Controllers\BranchManagementController::class, 'store'])
            ->name('branches.store');
        Route::put('dashboard/branches/{branch}', [\App\Http\Controllers\BranchManagementController::class, 'update'])
            ->name('branches.update');
        Route::delete('dashboard/branches/{branch}', [\App\Http\Controllers\BranchManagementController::class, 'destroy'])
            ->name('branches.destroy');

        // Branch Management Module (region-scoped CRUD)
        Route::get('regional-supervisor/branches', [\App\Http\Controllers\RegionalSupervisor\BranchManagementController::class, 'index'])
            ->name('regional-supervisor.branches.index');
        Route::post('regional-supervisor/branches', [\App\Http\Controllers\RegionalSupervisor\BranchManagementController::class, 'store'])
            ->name('regional-supervisor.branches.store');
        Route::put('regional-supervisor/branches/{branch}', [\App\Http\Controllers\RegionalSupervisor\BranchManagementController::class, 'update'])
            ->name('regional-supervisor.branches.update');
        Route::delete('regional-supervisor/branches/{branch}', [\App\Http\Controllers\RegionalSupervisor\BranchManagementController::class, 'destroy'])
            ->name('regional-supervisor.branches.destroy');

        // Jail Warden Management (scoped to regional supervisor's region)
        Route::get('regional-supervisor/wardens', [\App\Http\Controllers\RegionalSupervisor\JailWardenManagementController::class, 'index'])
            ->name('regional-supervisor.wardens.index');
        Route::post('regional-supervisor/wardens', [\App\Http\Controllers\RegionalSupervisor\JailWardenManagementController::class, 'store'])
            ->name('regional-supervisor.wardens.store');
        Route::put('regional-supervisor/wardens/{warden}', [\App\Http\Controllers\RegionalSupervisor\JailWardenManagementController::class, 'update'])
            ->name('regional-supervisor.wardens.update');
        Route::delete('regional-supervisor/wardens/{warden}', [\App\Http\Controllers\RegionalSupervisor\JailWardenManagementController::class, 'destroy'])
            ->name('regional-supervisor.wardens.destroy');

        // Jail Officer Management (scoped to regional supervisor's region)
        Route::get('regional-supervisor/officers', [\App\Http\Controllers\RegionalSupervisor\JailOfficerManagementController::class, 'index'])
            ->name('regional-supervisor.officers.index');
        Route::post('regional-supervisor/officers', [\App\Http\Controllers\RegionalSupervisor\JailOfficerManagementController::class, 'store'])
            ->name('regional-supervisor.officers.store');
        Route::put('regional-supervisor/officers/{officer}', [\App\Http\Controllers\RegionalSupervisor\JailOfficerManagementController::class, 'update'])
            ->name('regional-supervisor.officers.update');
        Route::delete('regional-supervisor/officers/{officer}', [\App\Http\Controllers\RegionalSupervisor\JailOfficerManagementController::class, 'destroy'])
            ->name('regional-supervisor.officers.destroy');
    });

    // Jail Warden Routes
    Route::middleware(['role:jail_warden'])->group(function () {
        Route::get('dashboard/jail-warden', [\App\Http\Controllers\Dashboard\JailWardenDashboardController::class, 'index'])
            ->name('dashboard.jail-warden');
        Route::post('dashboard/jail-warden/officer-scopes', [\App\Http\Controllers\JailOfficerScopeController::class, 'store'])
            ->name('jail-warden.officer-scopes.store');
        Route::put('dashboard/jail-warden/officer-scopes/{scope}', [\App\Http\Controllers\JailOfficerScopeController::class, 'update'])
            ->name('jail-warden.officer-scopes.update');
        Route::delete('dashboard/jail-warden/officer-scopes/{scope}', [\App\Http\Controllers\JailOfficerScopeController::class, 'destroy'])
            ->name('jail-warden.officer-scopes.destroy');
        Route::post('dashboard/jail-warden/officer-scopes/{scope}/transfer', [\App\Http\Controllers\JailOfficerScopeController::class, 'transfer'])
            ->name('jail-warden.officer-scopes.transfer');
        Route::post('dashboard/jail-warden/officer-scopes/{scope}/revoke', [\App\Http\Controllers\JailOfficerScopeController::class, 'revoke'])
            ->name('jail-warden.officer-scopes.revoke');

        // Annex Management
        Route::get('jail-warden/annexes', [\App\Http\Controllers\JailWarden\AnnexManagementController::class, 'index'])
            ->name('jail-warden.annexes.index');
        Route::post('jail-warden/annexes', [\App\Http\Controllers\JailWarden\AnnexManagementController::class, 'store'])
            ->name('jail-warden.annexes.store');
        Route::put('jail-warden/annexes/{annex}', [\App\Http\Controllers\JailWarden\AnnexManagementController::class, 'update'])
            ->name('jail-warden.annexes.update');
        Route::delete('jail-warden/annexes/{annex}', [\App\Http\Controllers\JailWarden\AnnexManagementController::class, 'destroy'])
            ->name('jail-warden.annexes.destroy');

        // Dormitory Management
        Route::get('jail-warden/dormitories', [\App\Http\Controllers\JailWarden\DormitoryManagementController::class, 'index'])
            ->name('jail-warden.dormitories.index');
        Route::post('jail-warden/dormitories', [\App\Http\Controllers\JailWarden\DormitoryManagementController::class, 'store'])
            ->name('jail-warden.dormitories.store');
        Route::put('jail-warden/dormitories/{dormitory}', [\App\Http\Controllers\JailWarden\DormitoryManagementController::class, 'update'])
            ->name('jail-warden.dormitories.update');
        Route::delete('jail-warden/dormitories/{dormitory}', [\App\Http\Controllers\JailWarden\DormitoryManagementController::class, 'destroy'])
            ->name('jail-warden.dormitories.destroy');

        // Cell Management
        Route::get('jail-warden/cells', [\App\Http\Controllers\JailWarden\CellManagementController::class, 'index'])
            ->name('jail-warden.cells.index');
        Route::post('jail-warden/cells', [\App\Http\Controllers\JailWarden\CellManagementController::class, 'store'])
            ->name('jail-warden.cells.store');
        Route::put('jail-warden/cells/{cell}', [\App\Http\Controllers\JailWarden\CellManagementController::class, 'update'])
            ->name('jail-warden.cells.update');
        Route::delete('jail-warden/cells/{cell}', [\App\Http\Controllers\JailWarden\CellManagementController::class, 'destroy'])
            ->name('jail-warden.cells.destroy');

        // Jail Officer Management
        Route::get('jail-warden/officers', [\App\Http\Controllers\JailWarden\JailOfficerManagementController::class, 'index'])
            ->name('jail-warden.officers.index');
        Route::post('jail-warden/officers', [\App\Http\Controllers\JailWarden\JailOfficerManagementController::class, 'store'])
            ->name('jail-warden.officers.store');

        // PDL Management
        Route::get('jail-warden/pdls', [\App\Http\Controllers\JailWarden\PdlManagementController::class, 'index'])
            ->name('jail-warden.pdls.index');
        Route::post('jail-warden/pdls', [\App\Http\Controllers\JailWarden\PdlManagementController::class, 'store'])
            ->name('jail-warden.pdls.store');
    });

    Route::middleware(['role:bjmp_officer'])->get('dashboard/bjmp-officer', [\App\Http\Controllers\Dashboard\BjmpOfficerDashboardController::class, '__invoke'])
        ->name('dashboard.bjmp-officer');
    Route::middleware(['role:bjmp_officer'])->get('dashboard/bjmp-officer/overview-data', [\App\Http\Controllers\Dashboard\BjmpOfficerDashboardController::class, 'overviewData'])
        ->name('dashboard.bjmp-officer.overview-data');
    Route::middleware(['role:bjmp_officer'])->get('dashboard/bjmp-officer/export-overview', [\App\Http\Controllers\Dashboard\BjmpOfficerDashboardController::class, 'exportCsv'])
        ->name('dashboard.bjmp-officer.export-overview');

    Route::middleware(['role:monitoring_officer'])->get('dashboard/monitoring-officer', [\App\Http\Controllers\MonitoringOfficer\AnalyticsController::class, 'index'])
        ->name('dashboard.monitoring-officer');

    Route::middleware(['role:jail_officer', 'resolve_jo_scope'])->get('dashboard/jail-officer', [\App\Http\Controllers\JailOfficer\DashboardController::class, 'index'])
        ->name('dashboard.jail-officer');

    Route::middleware(['role:jail_warden,jail_officer'])->prefix('monitoring')->name('monitoring.')->group(function () {
        Route::get('video-recordings', [\App\Http\Controllers\MonitoringOfficer\VideoRecordingsController::class, 'index'])
            ->name('video-recordings.index');
        Route::get('chat-recordings', [\App\Http\Controllers\MonitoringOfficer\ChatRecordingsController::class, 'index'])
            ->name('chat-recordings.index');
    });

    Route::middleware(['role:jail_officer'])->get('monitoring-officer/visit-monitoring', \App\Http\Controllers\MonitoringOfficer\VisitMonitoringController::class)
        ->name('monitoring-officer.visit-monitoring');
    Route::middleware(['role:jail_officer'])->get('monitoring-officer/eburol-monitoring', \App\Http\Controllers\MonitoringOfficer\EburolMonitoringController::class)
        ->name('monitoring-officer.eburol-monitoring');

    Route::middleware(['role:jail_officer,jail_warden'])->prefix('monitoring-officer')->name('monitoring-officer.')->group(function () {
        Route::get('assigned-sessions', [\App\Http\Controllers\MonitoringOfficer\AssignedSessionsController::class, 'index'])
            ->name('assigned-sessions.index');
        Route::post('assigned-sessions/{session}/generate-tunnel', [\App\Http\Controllers\MonitoringOfficer\AssignedSessionsController::class, 'generateTunnel'])
            ->name('assigned-sessions.generate-tunnel');
        Route::post('assigned-sessions/{session}/start', [\App\Http\Controllers\MonitoringOfficer\AssignedSessionsController::class, 'startSession'])
            ->name('assigned-sessions.start');
        Route::post('assigned-sessions/{session}/end', [\App\Http\Controllers\MonitoringOfficer\AssignedSessionsController::class, 'endSession'])
            ->name('assigned-sessions.end');
        Route::post('assigned-sessions/{session}/lock-chat', [\App\Http\Controllers\MonitoringOfficer\AssignedSessionsController::class, 'lockChat'])
            ->name('assigned-sessions.lock-chat');
        Route::post('assigned-sessions/{session}/unlock-chat', [\App\Http\Controllers\MonitoringOfficer\AssignedSessionsController::class, 'unlockChat'])
            ->name('assigned-sessions.unlock-chat');
        Route::get('video-recordings', [\App\Http\Controllers\MonitoringOfficer\VideoRecordingsController::class, 'index'])
            ->name('video-recordings.index');
        Route::get('chat-recordings', [\App\Http\Controllers\MonitoringOfficer\ChatRecordingsController::class, 'index'])
            ->name('chat-recordings.index');

        // Chat Logs Management
        Route::get('chat-logs', [\App\Http\Controllers\JailOfficer\ChatLogsController::class, 'index'])
            ->name('chat-logs.index');
        Route::get('chat-logs/export', [\App\Http\Controllers\JailOfficer\ChatLogsController::class, 'exportCsv'])
            ->name('chat-logs.export');
        Route::get('chat-logs/session/{session}', [\App\Http\Controllers\JailOfficer\ChatLogsController::class, 'showSession'])
            ->name('chat-logs.session');

        Route::get('analytics', [\App\Http\Controllers\MonitoringOfficer\AnalyticsController::class, 'index'])
            ->name('analytics.index');
        Route::get('analytics/export/csv', [\App\Http\Controllers\MonitoringOfficer\AnalyticsController::class, 'exportCsv'])
            ->name('analytics.export.csv');
        Route::get('incidents', [\App\Http\Controllers\MonitoringOfficer\IncidentReportingController::class, 'index'])
            ->name('incidents.index');
        Route::get('history', [\App\Http\Controllers\MonitoringOfficer\HistoryController::class, 'index'])
            ->name('history.index');
        Route::get('inmate-tunnels', [\App\Http\Controllers\MonitoringOfficer\InmateTunnelController::class, 'index'])
            ->name('inmate-tunnels.index');
        Route::get('notifications', [\App\Http\Controllers\MonitoringOfficer\NotificationController::class, 'index'])
            ->name('notifications.index');
        Route::post('notifications/{notification}/read', [\App\Http\Controllers\MonitoringOfficer\NotificationController::class, 'markAsRead'])
            ->name('notifications.read');
        Route::post('notifications/read-all', [\App\Http\Controllers\MonitoringOfficer\NotificationController::class, 'markAllAsRead'])
            ->name('notifications.read-all');
    });

    // Join as observer: jail officer or jail warden (same privileges)
    Route::middleware(['role:jail_officer,jail_warden'])->get('monitoring-officer/assigned-sessions/{session}/join', [\App\Http\Controllers\MonitoringOfficer\AssignedSessionsController::class, 'joinAsObserver'])
        ->name('monitoring-officer.assigned-sessions.join');

    Route::get('visit/session/{session}/chat', [\App\Http\Controllers\VisitSessionChatController::class, 'index'])
        ->name('visit-session.chat.index');
    Route::post('visit/session/{session}/chat', [\App\Http\Controllers\VisitSessionChatController::class, 'store'])
        ->name('visit-session.chat.store');
    Route::post('visit/session/{session}/chat/{chatLog}/flag', [\App\Http\Controllers\VisitSessionChatController::class, 'flag'])
        ->name('visit-session.chat.flag');
    Route::post('visit/session/{session}/chat/export', [\App\Http\Controllers\VisitSessionChatExportController::class, 'store'])
        ->name('visit-session.chat.export');
    Route::get('chat-exports/{chatExport}/download', [\App\Http\Controllers\VisitSessionChatExportController::class, 'download'])
        ->name('chat-exports.download');

    Route::get('visits/{visit}/proof', [\App\Http\Controllers\VisitProofController::class, 'show'])
        ->name('visits.proof');

    Route::middleware(['role:jail_warden'])->prefix('admin')->name('admin.')->group(function () {
        Route::resource('users', \App\Http\Controllers\Admin\UserManagementController::class)
            ->only(['index', 'store', 'update', 'destroy']);
        Route::post('users/{user}/approve', [\App\Http\Controllers\Admin\UserManagementController::class, 'approve'])
            ->name('users.approve');
        Route::post('users/{user}/reject', [\App\Http\Controllers\Admin\UserManagementController::class, 'reject'])
            ->name('users.reject');
        Route::post('users/{user}/update-status', [\App\Http\Controllers\Admin\UserManagementController::class, 'updateStatus'])
            ->name('users.update-status');

        Route::get('schedules', [\App\Http\Controllers\Admin\ScheduleManagementController::class, 'index'])
            ->name('schedules.index');
        Route::get('schedules/booked-slots', [\App\Http\Controllers\Admin\ScheduleManagementController::class, 'getBookedTimeSlots'])
            ->name('schedules.booked-slots');
        Route::post('schedules', [\App\Http\Controllers\Admin\ScheduleManagementController::class, 'store'])
            ->name('schedules.store');
        Route::put('schedules/{visit}', [\App\Http\Controllers\Admin\ScheduleManagementController::class, 'update'])
            ->name('schedules.update');
        Route::delete('schedules/{visit}', [\App\Http\Controllers\Admin\ScheduleManagementController::class, 'destroy'])
            ->name('schedules.destroy');
        Route::post('schedules/{visit}/approve', [\App\Http\Controllers\Admin\ScheduleManagementController::class, 'approve'])
            ->name('schedules.approve');
        Route::post('schedules/{visit}/reject', [\App\Http\Controllers\Admin\ScheduleManagementController::class, 'reject'])
            ->name('schedules.reject');
        Route::post('schedules/{visit}/update-status', [\App\Http\Controllers\Admin\ScheduleManagementController::class, 'updateStatus'])
            ->name('schedules.update-status');
        Route::post('schedules/{visit}/generate-access-key', [\App\Http\Controllers\Admin\ScheduleManagementController::class, 'generateAccessKey'])
            ->name('schedules.generate-access-key');
        Route::get('visit-session/{session}/join', [\App\Http\Controllers\StaffVisitSessionJoinController::class, 'join'])
            ->name('visit-session.join');

        Route::get('eburols', [\App\Http\Controllers\Admin\EburolManagementController::class, 'index'])
            ->name('eburols.index');
        Route::post('eburols', [\App\Http\Controllers\Admin\EburolManagementController::class, 'store'])
            ->name('eburols.store');
        Route::put('eburols/{eburol}', [\App\Http\Controllers\Admin\EburolManagementController::class, 'update'])
            ->name('eburols.update');
        Route::delete('eburols/{eburol}', [\App\Http\Controllers\Admin\EburolManagementController::class, 'destroy'])
            ->name('eburols.destroy');
        Route::post('eburols/{eburol}/approve', [\App\Http\Controllers\Admin\EburolManagementController::class, 'approve'])
            ->name('eburols.approve');
        Route::post('eburols/{eburol}/reject', [\App\Http\Controllers\Admin\EburolManagementController::class, 'reject'])
            ->name('eburols.reject');
        Route::post('eburols/{eburol}/update-status', [\App\Http\Controllers\Admin\EburolManagementController::class, 'updateStatus'])
            ->name('eburols.update-status');
        Route::get('eburols/{eburol}/document/death-certificate', [\App\Http\Controllers\Admin\EburolManagementController::class, 'deathCertificate'])
            ->name('eburols.document.death-certificate');
        Route::get('eburols/{eburol}/document/relationship-proof', [\App\Http\Controllers\Admin\EburolManagementController::class, 'relationshipProof'])
            ->name('eburols.document.relationship-proof');

        Route::get('time-slot-capacities', [\App\Http\Controllers\Admin\TimeSlotConfigurationController::class, 'index'])
            ->name('time-slot-capacities.index');
        Route::put('time-slot-capacities/{timeSlotCapacity}', [\App\Http\Controllers\Admin\TimeSlotConfigurationController::class, 'update'])
            ->name('time-slot-capacities.update');
        Route::post('time-slot-capacities/update', [\App\Http\Controllers\Admin\TimeSlotConfigurationController::class, 'updateCapacity'])
            ->name('time-slot-capacities.update-capacity');
        Route::post('time-slot-capacities/update-settings', [\App\Http\Controllers\Admin\TimeSlotConfigurationController::class, 'updateSettings'])
            ->name('time-slot-capacities.update-settings');
        Route::post('time-slot-capacities/operating-hours', [\App\Http\Controllers\Admin\TimeSlotConfigurationController::class, 'updateOperatingHours'])
            ->name('time-slot-capacities.update-operating-hours');
    });

    Route::middleware(['role:visitor'])->prefix('visitor')->name('visitor.')->group(function () {
        Route::get('schedules/booked-slots', [\App\Http\Controllers\Visitor\ScheduleController::class, 'getBookedTimeSlots'])
            ->name('schedules.booked-slots');
        Route::get('schedule', [\App\Http\Controllers\Visitor\ScheduleController::class, 'index'])
            ->name('schedule.index');
        Route::post('schedule', [\App\Http\Controllers\Visitor\ScheduleController::class, 'store'])
            ->name('schedule.store');
        Route::post('schedule/{visit}/cancel', [\App\Http\Controllers\Visitor\ScheduleController::class, 'cancel'])
            ->name('schedule.cancel');
        Route::post('schedule/{visit}/reschedule', [\App\Http\Controllers\Visitor\ScheduleController::class, 'reschedule'])
            ->name('schedule.reschedule');
        Route::get('schedule/booked-slots', [\App\Http\Controllers\Visitor\ScheduleController::class, 'getBookedTimeSlots'])
            ->name('schedule.booked-slots');
        Route::post('schedule/search-inmate', [\App\Http\Controllers\Visitor\ScheduleController::class, 'searchInmate'])
            ->name('schedule.search-inmate');
        Route::post('schedule/check-cell-availability', [\App\Http\Controllers\Visitor\ScheduleController::class, 'checkCellAvailability'])
            ->name('schedule.check-cell-availability');
        Route::post('schedule/check-inmate-tagged', [\App\Http\Controllers\Visitor\ScheduleController::class, 'checkInmateTagged'])
            ->name('schedule.check-inmate-tagged');
        Route::get('call-logs', [\App\Http\Controllers\Visitor\CallLogController::class, 'index'])
            ->name('call-logs.index');
        Route::get('eburol', [\App\Http\Controllers\Visitor\EburolController::class, 'index'])
            ->name('eburol.index');
        Route::get('eburol/slot-availability', [\App\Http\Controllers\Visitor\EburolController::class, 'slotAvailability'])
            ->name('eburol.slot-availability');
        Route::post('eburol', [\App\Http\Controllers\Visitor\EburolController::class, 'store'])
            ->name('eburol.store');
        Route::get('eburol/{eburol}', [\App\Http\Controllers\Visitor\EburolController::class, 'show'])
            ->name('eburol.show');
        Route::get('eburol/{eburol}/document/death-certificate', [\App\Http\Controllers\Visitor\EburolController::class, 'deathCertificate'])
            ->name('eburol.document.death-certificate');
        Route::get('eburol/{eburol}/document/relationship-proof', [\App\Http\Controllers\Visitor\EburolController::class, 'relationshipProof'])
            ->name('eburol.document.relationship-proof');
        Route::put('eburol/{eburol}', [\App\Http\Controllers\Visitor\EburolController::class, 'update'])
            ->name('eburol.update');
        Route::post('eburol/{eburol}/reschedule', [\App\Http\Controllers\Visitor\EburolController::class, 'reschedule'])
            ->name('eburol.reschedule');
        Route::delete('eburol/{eburol}', [\App\Http\Controllers\Visitor\EburolController::class, 'destroy'])
            ->name('eburol.destroy');
        Route::get('notifications', [\App\Http\Controllers\Visitor\NotificationController::class, 'index'])
            ->name('notifications.index');
        Route::post('notifications/{notification}/read', [\App\Http\Controllers\Visitor\NotificationController::class, 'markAsRead'])
            ->name('notifications.read');
        Route::post('notifications/read-all', [\App\Http\Controllers\Visitor\NotificationController::class, 'markAllAsRead'])
            ->name('notifications.read-all');
        Route::get('sessions', [\App\Http\Controllers\Visitor\SessionController::class, 'index'])
            ->name('sessions.index');
        Route::delete('sessions/{session}', [\App\Http\Controllers\Visitor\SessionController::class, 'revoke'])
            ->name('sessions.revoke');
        Route::post('sessions/revoke-all', [\App\Http\Controllers\Visitor\SessionController::class, 'revokeAll'])
            ->name('sessions.revoke-all');
        Route::get('appeals', [\App\Http\Controllers\Visitor\AppealController::class, 'index'])
            ->name('appeals.index');
        Route::post('appeals', [\App\Http\Controllers\Visitor\AppealController::class, 'store'])
            ->name('appeals.store');
        Route::get('appeals/documents/{document}/download', [\App\Http\Controllers\Visitor\AppealController::class, 'downloadDocument'])
            ->name('appeals.documents.download');
        Route::get('suggestions', [\App\Http\Controllers\Visitor\SuggestionController::class, 'index'])
            ->name('suggestions.index');
        Route::post('suggestions', [\App\Http\Controllers\Visitor\SuggestionController::class, 'store'])
            ->name('suggestions.store');
        Route::get('history', [\App\Http\Controllers\Visitor\AuditLogController::class, 'index'])
            ->name('history.index');
        Route::get('files-uploaded', [\App\Http\Controllers\Visitor\FilesUploadedController::class, 'index'])
            ->name('files-uploaded.index');
        Route::get('tagged-inmates', [\App\Http\Controllers\Visitor\TaggedInmatesController::class, 'index'])
            ->name('tagged-inmates.index');
    });

    Route::middleware(['role:visitor'])->group(function () {
        Route::get('visit/session/{session}', [\App\Http\Controllers\Visitor\VisitSessionController::class, 'show'])
            ->name('visit-session.show');
        Route::get('visit/session/{session}/video-room', [\App\Http\Controllers\Visitor\VisitSessionController::class, 'videoRoom'])
            ->name('visit-session.video-room');
        Route::post('visit/session/{session}/accept-terms', [\App\Http\Controllers\Visitor\VisitSessionController::class, 'acceptTerms'])
            ->name('visit-session.accept-terms');
        Route::post('visit/session/{session}/accept-consent', [\App\Http\Controllers\Visitor\VisitSessionController::class, 'acceptSessionConsent'])
            ->name('visit-session.accept-consent');
        Route::post('visit/session/{session}/participant-joined', [\App\Http\Controllers\Visitor\VisitSessionController::class, 'participantJoined'])
            ->name('visit-session.participant-joined');
        Route::post('visit/session/{session}/participant-left', [\App\Http\Controllers\Visitor\VisitSessionController::class, 'participantLeft'])
            ->name('visit-session.participant-left');
        Route::post('visit/session/{session}/time-ended', [\App\Http\Controllers\Visitor\VisitSessionController::class, 'timeEnded'])
            ->name('visit-session.time-ended');
    });

    // Cell, Inmate, and Cell Schedule Management (accessible by Jail Officer)
    Route::middleware(['role:jail_officer', 'resolve_jo_scope'])->prefix('jail-officer')->name('jail-officer.')->group(function () {
        // Cell Management
        Route::get('cells', [\App\Http\Controllers\BjmpOfficer\CellManagementController::class, 'index'])
            ->name('cells.index');
        Route::post('cells', [\App\Http\Controllers\BjmpOfficer\CellManagementController::class, 'store'])
            ->name('cells.store');
        Route::put('cells/{cell}', [\App\Http\Controllers\BjmpOfficer\CellManagementController::class, 'update'])
            ->name('cells.update');
        Route::delete('cells/{cell}', [\App\Http\Controllers\BjmpOfficer\CellManagementController::class, 'destroy'])
            ->name('cells.destroy');

        // Inmate Management
        Route::get('inmates', [\App\Http\Controllers\BjmpOfficer\InmateManagementController::class, 'index'])
            ->name('inmates.index');
        Route::post('inmates', [\App\Http\Controllers\BjmpOfficer\InmateManagementController::class, 'store'])
            ->name('inmates.store');
        Route::put('inmates/{inmate}', [\App\Http\Controllers\BjmpOfficer\InmateManagementController::class, 'update'])
            ->name('inmates.update');
        Route::delete('inmates/{inmate}', [\App\Http\Controllers\BjmpOfficer\InmateManagementController::class, 'destroy'])
            ->name('inmates.destroy');
        Route::post('inmates/{inmate}/transfer', [\App\Http\Controllers\BjmpOfficer\InmateManagementController::class, 'transfer'])
            ->name('inmates.transfer');

        // Cell Schedule Templates
        Route::get('cell-schedules', [\App\Http\Controllers\BjmpOfficer\CellScheduleTemplateController::class, 'index'])
            ->name('cell-schedules.index');
        Route::put('cell-schedules/{cell}', [\App\Http\Controllers\BjmpOfficer\CellScheduleTemplateController::class, 'update'])
            ->name('cell-schedules.update');
        Route::post('cell-schedules/bulk-update', [\App\Http\Controllers\BjmpOfficer\CellScheduleTemplateController::class, 'bulkUpdate'])
            ->name('cell-schedules.bulk-update');
    });

    // Hierarchical Jail Management (Jail Officer only)
    Route::middleware(['role:jail_officer', 'resolve_jo_scope'])->prefix('jail-officer')->name('jail-officer.')->group(function () {
        // Jail Management
        Route::get('jails', [\App\Http\Controllers\JailOfficer\JailManagementController::class, 'index'])
            ->name('jails.index');
        Route::post('jails', [\App\Http\Controllers\JailOfficer\JailManagementController::class, 'store'])
            ->name('jails.store');
        Route::put('jails/{jail}', [\App\Http\Controllers\JailOfficer\JailManagementController::class, 'update'])
            ->name('jails.update');
        Route::delete('jails/{jail}', [\App\Http\Controllers\JailOfficer\JailManagementController::class, 'destroy'])
            ->name('jails.destroy');
        Route::get('jails/{jail}', [\App\Http\Controllers\JailOfficer\JailManagementController::class, 'show'])
            ->name('jails.show');

        // Dormitory Management
        Route::get('dormitories', [\App\Http\Controllers\JailOfficer\DormitoryManagementController::class, 'index'])
            ->name('dormitories.index');
        Route::post('dormitories', [\App\Http\Controllers\JailOfficer\DormitoryManagementController::class, 'store'])
            ->name('dormitories.store');
        Route::put('dormitories/{dormitory}', [\App\Http\Controllers\JailOfficer\DormitoryManagementController::class, 'update'])
            ->name('dormitories.update');
        Route::delete('dormitories/{dormitory}', [\App\Http\Controllers\JailOfficer\DormitoryManagementController::class, 'destroy'])
            ->name('dormitories.destroy');

        // Annex Management
        Route::get('annexes', [\App\Http\Controllers\JailOfficer\AnnexManagementController::class, 'index'])
            ->name('annexes.index');
        Route::post('annexes', [\App\Http\Controllers\JailOfficer\AnnexManagementController::class, 'store'])
            ->name('annexes.store');
        Route::put('annexes/{annex}', [\App\Http\Controllers\JailOfficer\AnnexManagementController::class, 'update'])
            ->name('annexes.update');
        Route::delete('annexes/{annex}', [\App\Http\Controllers\JailOfficer\AnnexManagementController::class, 'destroy'])
            ->name('annexes.destroy');

        // Enhanced Cell Management with hierarchical filtering
        Route::get('cells-hierarchical', [\App\Http\Controllers\JailOfficer\CellManagementController::class, 'index'])
            ->name('cells.hierarchical');
        Route::post('cells-hierarchical', [\App\Http\Controllers\JailOfficer\CellManagementController::class, 'store'])
            ->name('cells.hierarchical-store');
        Route::put('cells-hierarchical/{cell}', [\App\Http\Controllers\JailOfficer\CellManagementController::class, 'update'])
            ->name('cells.hierarchical-update');
        Route::delete('cells-hierarchical/{cell}', [\App\Http\Controllers\JailOfficer\CellManagementController::class, 'destroy'])
            ->name('cells.hierarchical-destroy');

        // Enhanced Inmate Management with hierarchical filtering
        Route::get('inmates-hierarchical', [\App\Http\Controllers\JailOfficer\InmateManagementController::class, 'index'])
            ->name('inmates.hierarchical');
        Route::post('inmates-hierarchical', [\App\Http\Controllers\JailOfficer\InmateManagementController::class, 'store'])
            ->name('inmates.hierarchical-store');
        Route::put('inmates-hierarchical/{inmate}', [\App\Http\Controllers\JailOfficer\InmateManagementController::class, 'update'])
            ->name('inmates.hierarchical-update');
        Route::delete('inmates-hierarchical/{inmate}', [\App\Http\Controllers\JailOfficer\InmateManagementController::class, 'destroy'])
            ->name('inmates.hierarchical-destroy');
        Route::post('inmates-hierarchical/{inmate}/transfer', [\App\Http\Controllers\JailOfficer\InmateManagementController::class, 'transfer'])
            ->name('inmates.hierarchical-transfer');

        // Cell Schedule Templates
        Route::get('cell-schedules', [\App\Http\Controllers\JailOfficer\CellScheduleTemplateController::class, 'index'])
            ->name('cell-schedules.index');
        Route::put('cell-schedules/{cell}', [\App\Http\Controllers\JailOfficer\CellScheduleTemplateController::class, 'update'])
            ->name('cell-schedules.update');
        Route::post('cell-schedules/bulk-update', [\App\Http\Controllers\JailOfficer\CellScheduleTemplateController::class, 'bulkUpdate'])
            ->name('cell-schedules.bulk-update');
    });

    Route::middleware(['role:jail_officer', 'resolve_jo_scope'])->prefix('jail-officer')->name('jail-officer.')->group(function () {
        Route::get('notifications', [\App\Http\Controllers\BjmpOfficer\NotificationController::class, 'index'])
            ->name('notifications.index');
        Route::post('notifications/{notification}/read', [\App\Http\Controllers\BjmpOfficer\NotificationController::class, 'markAsRead'])
            ->name('notifications.read');
        Route::post('notifications/read-all', [\App\Http\Controllers\BjmpOfficer\NotificationController::class, 'markAllAsRead'])
            ->name('notifications.read-all');

        Route::get('eburols', [\App\Http\Controllers\BjmpOfficer\EburolManagementController::class, 'index'])
            ->name('eburols.index');
        Route::get('eburols/{eburol}/document/death-certificate', [\App\Http\Controllers\BjmpOfficer\EburolManagementController::class, 'deathCertificate'])
            ->name('eburols.document.death-certificate');
        Route::get('eburols/{eburol}/document/relationship-proof', [\App\Http\Controllers\BjmpOfficer\EburolManagementController::class, 'relationshipProof'])
            ->name('eburols.document.relationship-proof');
        Route::post('eburols/{eburol}/approve', [\App\Http\Controllers\BjmpOfficer\EburolManagementController::class, 'approve'])
            ->name('eburols.approve');
        Route::post('eburols/{eburol}/reject', [\App\Http\Controllers\BjmpOfficer\EburolManagementController::class, 'reject'])
            ->name('eburols.reject');
        Route::post('eburols/{eburol}/update-status', [\App\Http\Controllers\BjmpOfficer\EburolManagementController::class, 'updateStatus'])
            ->name('eburols.update-status');

        // Visit Schedule Management
        Route::get('schedules', [\App\Http\Controllers\BjmpOfficer\ScheduleManagementController::class, 'index'])
            ->name('schedules.index');
        Route::post('schedules/{visit}/approve', [\App\Http\Controllers\BjmpOfficer\ScheduleManagementController::class, 'approve'])
            ->name('schedules.approve');
        Route::post('schedules/{visit}/reject', [\App\Http\Controllers\BjmpOfficer\ScheduleManagementController::class, 'reject'])
            ->name('schedules.reject');
        Route::post('schedules/{visit}/update-status', [\App\Http\Controllers\BjmpOfficer\ScheduleManagementController::class, 'updateStatus'])
            ->name('schedules.update-status');
        Route::post('schedules/{visit}/generate-access-key', [\App\Http\Controllers\BjmpOfficer\ScheduleManagementController::class, 'generateAccessKey'])
            ->name('schedules.generate-access-key');
        Route::post('schedules/{visit}/reschedule', [\App\Http\Controllers\BjmpOfficer\ScheduleManagementController::class, 'reschedule'])
            ->name('schedules.reschedule');
        Route::get('visit-session/{session}/join', [\App\Http\Controllers\StaffVisitSessionJoinController::class, 'join'])
            ->name('visit-session.join');

        // Appeal Processing
        Route::get('appeals', [\App\Http\Controllers\BjmpOfficer\AppealReviewController::class, 'index'])
            ->name('appeals.index');
        Route::post('appeals/{appeal}/review', [\App\Http\Controllers\BjmpOfficer\AppealReviewController::class, 'review'])
            ->name('appeals.review');

        // Audit Logs
        Route::get('audit-logs', [\App\Http\Controllers\BjmpOfficer\AuditLogController::class, 'index'])
            ->name('audit-logs.index');
    });

    // Unified Jail Officer Routes (combines Monitoring Officer + BJMP Officer features)
    Route::middleware(['role:jail_officer', 'resolve_jo_scope'])->prefix('jail-officer')->name('jail-officer.')->group(function () {
        // Dashboard
        Route::get('dashboard', [\App\Http\Controllers\JailOfficer\AnalyticsController::class, 'index'])
            ->name('dashboard');
        Route::get('dashboard/export/csv', [\App\Http\Controllers\JailOfficer\AnalyticsController::class, 'exportCsv'])
            ->name('dashboard.export.csv');

        // Notifications
        Route::get('notifications', [\App\Http\Controllers\JailOfficer\NotificationController::class, 'index'])
            ->name('notifications.index');
        Route::post('notifications/{notification}/read', [\App\Http\Controllers\JailOfficer\NotificationController::class, 'markAsRead'])
            ->name('notifications.read');
        Route::post('notifications/read-all', [\App\Http\Controllers\JailOfficer\NotificationController::class, 'markAllAsRead'])
            ->name('notifications.read-all');

        // Assigned Visit Sessions (Merged approval + monitoring)
        Route::get('assigned-visit-sessions', [\App\Http\Controllers\JailOfficer\AssignedVisitSessionsController::class, 'index'])
            ->name('assigned-visit-sessions.index');
        Route::post('assigned-visit-sessions/{visit}/approve', [\App\Http\Controllers\JailOfficer\AssignedVisitSessionsController::class, 'approve'])
            ->name('assigned-visit-sessions.approve');
        Route::post('assigned-visit-sessions/{visit}/reject', [\App\Http\Controllers\JailOfficer\AssignedVisitSessionsController::class, 'reject'])
            ->name('assigned-visit-sessions.reject');

        // Schedule Management (Visits)
        Route::get('schedules', [\App\Http\Controllers\JailOfficer\ScheduleManagementController::class, 'index'])
            ->name('schedules.index');
        Route::post('schedules/{visit}/approve', [\App\Http\Controllers\JailOfficer\ScheduleManagementController::class, 'approve'])
            ->name('schedules.approve');
        Route::post('schedules/{visit}/reject', [\App\Http\Controllers\JailOfficer\ScheduleManagementController::class, 'reject'])
            ->name('schedules.reject');
        Route::post('schedules/{visit}/update-status', [\App\Http\Controllers\JailOfficer\ScheduleManagementController::class, 'updateStatus'])
            ->name('schedules.update-status');
        Route::post('schedules/{visit}/generate-access-key', [\App\Http\Controllers\JailOfficer\ScheduleManagementController::class, 'generateAccessKey'])
            ->name('schedules.generate-access-key');
        Route::post('schedules/{visit}/reschedule', [\App\Http\Controllers\JailOfficer\ScheduleManagementController::class, 'reschedule'])
            ->name('schedules.reschedule');
        Route::get('visit-session/{session}/join', [\App\Http\Controllers\StaffVisitSessionJoinController::class, 'join'])
            ->name('visit-session.join');

        // Visit Monitored Management
        Route::get('visits-monitored', [\App\Http\Controllers\JailOfficer\VisitMonitoredManagementController::class, 'index'])
            ->name('visits-monitored.index');
        Route::get('visits-monitored/{meetingId}', [\App\Http\Controllers\JailOfficer\VisitMonitoredManagementController::class, 'show'])
            ->name('visits-monitored.show');
        Route::get('visits-monitored/{meetingId}/download-chat', [\App\Http\Controllers\JailOfficer\VisitMonitoredManagementController::class, 'downloadChat'])
            ->name('visits-monitored.download-chat');
        Route::post('visits-monitored/{meetingId}/share-analytics', [\App\Http\Controllers\JailOfficer\VisitMonitoredManagementController::class, 'shareAnalytics'])
            ->name('visits-monitored.share-analytics');

        // Eburol Management
        Route::get('eburols', [\App\Http\Controllers\JailOfficer\EburolManagementController::class, 'index'])
            ->name('eburols.index');
        Route::get('eburols/{eburol}/document/death-certificate', [\App\Http\Controllers\JailOfficer\EburolManagementController::class, 'deathCertificate'])
            ->name('eburols.document.death-certificate');
        Route::get('eburols/{eburol}/document/relationship-proof', [\App\Http\Controllers\JailOfficer\EburolManagementController::class, 'relationshipProof'])
            ->name('eburols.document.relationship-proof');
        Route::post('eburols/{eburol}/approve', [\App\Http\Controllers\JailOfficer\EburolManagementController::class, 'approve'])
            ->name('eburols.approve');
        Route::post('eburols/{eburol}/reject', [\App\Http\Controllers\JailOfficer\EburolManagementController::class, 'reject'])
            ->name('eburols.reject');
        Route::post('eburols/{eburol}/update-status', [\App\Http\Controllers\JailOfficer\EburolManagementController::class, 'updateStatus'])
            ->name('eburols.update-status');

        // Session Monitoring & Assigned Sessions
        Route::get('assigned-sessions', [\App\Http\Controllers\JailOfficer\AssignedSessionsController::class, 'index'])
            ->name('assigned-sessions.index');
        Route::post('assigned-sessions/{session}/generate-tunnel', [\App\Http\Controllers\JailOfficer\AssignedSessionsController::class, 'generateTunnel'])
            ->name('assigned-sessions.generate-tunnel');
        Route::post('assigned-sessions/{session}/start', [\App\Http\Controllers\JailOfficer\AssignedSessionsController::class, 'startSession'])
            ->name('assigned-sessions.start');
        Route::post('assigned-sessions/{session}/end', [\App\Http\Controllers\JailOfficer\AssignedSessionsController::class, 'endSession'])
            ->name('assigned-sessions.end');

        // Session Management Controls (Active sessions only)
        Route::post('assigned-sessions/{session}/kill', [\App\Http\Controllers\JailOfficer\AssignedSessionsController::class, 'killSession'])
            ->name('assigned-sessions.kill');
        Route::post('assigned-sessions/{session}/mute-audio', [\App\Http\Controllers\JailOfficer\AssignedSessionsController::class, 'muteAudio'])
            ->name('assigned-sessions.mute-audio');
        Route::post('assigned-sessions/{session}/unmute-audio', [\App\Http\Controllers\JailOfficer\AssignedSessionsController::class, 'unmuteAudio'])
            ->name('assigned-sessions.unmute-audio');
        Route::post('assigned-sessions/{session}/disable-camera', [\App\Http\Controllers\JailOfficer\AssignedSessionsController::class, 'disableCamera'])
            ->name('assigned-sessions.disable-camera');
        Route::post('assigned-sessions/{session}/enable-camera', [\App\Http\Controllers\JailOfficer\AssignedSessionsController::class, 'enableCamera'])
            ->name('assigned-sessions.enable-camera');
        Route::post('assigned-sessions/{session}/lock-chat', [\App\Http\Controllers\JailOfficer\AssignedSessionsController::class, 'lockChat'])
            ->name('assigned-sessions.lock-chat');
        Route::post('assigned-sessions/{session}/unlock-chat', [\App\Http\Controllers\JailOfficer\AssignedSessionsController::class, 'unlockChat'])
            ->name('assigned-sessions.unlock-chat');
        Route::get('assigned-sessions/{session}/join', [\App\Http\Controllers\JailOfficer\AssignedSessionsController::class, 'joinAsObserver'])
            ->name('assigned-sessions.join');

        // Visit & Eburol Monitoring
        Route::get('visit-monitoring', \App\Http\Controllers\JailOfficer\VisitMonitoringController::class)
            ->name('visit-monitoring');
        Route::get('eburol-monitoring', \App\Http\Controllers\JailOfficer\EburolMonitoringController::class)
            ->name('eburol-monitoring');
        Route::get('session-monitoring', [\App\Http\Controllers\JailOfficer\SessionMonitoringController::class, 'index'])
            ->name('session-monitoring.index');

        // Recordings
        Route::get('video-recordings', [\App\Http\Controllers\JailOfficer\VideoRecordingsController::class, 'index'])
            ->name('video-recordings.index');
        Route::get('chat-recordings', [\App\Http\Controllers\JailOfficer\ChatRecordingsController::class, 'index'])
            ->name('chat-recordings.index');
        Route::get('chat-recordings/session/{roomId}', [\App\Http\Controllers\JailOfficer\ChatRecordingsController::class, 'viewSession'])
            ->name('chat-recordings.view-session');
        Route::get('chat-recordings/session/{roomId}/export', [\App\Http\Controllers\JailOfficer\ChatRecordingsController::class, 'exportSession'])
            ->name('chat-recordings.export-session');

        // Incident Reporting
        Route::get('incidents', [\App\Http\Controllers\JailOfficer\IncidentReportingController::class, 'index'])
            ->name('incidents.index');

        // History
        Route::get('history', [\App\Http\Controllers\JailOfficer\HistoryController::class, 'index'])
            ->name('history.index');

        // Inmate Tunnels
        Route::get('inmate-tunnels', [\App\Http\Controllers\JailOfficer\InmateTunnelController::class, 'index'])
            ->name('inmate-tunnels.index');

        // Appeal Review
        Route::get('appeals', [\App\Http\Controllers\JailOfficer\AppealReviewController::class, 'index'])
            ->name('appeals.index');
        Route::post('appeals/{appeal}/review', [\App\Http\Controllers\JailOfficer\AppealReviewController::class, 'review'])
            ->name('appeals.review');

        // Audit Logs
        Route::get('audit-logs', [\App\Http\Controllers\JailOfficer\AuditLogController::class, 'index'])
            ->name('audit-logs.index');

        // Chat Logs Management
        Route::get('chat-logs', [\App\Http\Controllers\JailOfficer\ChatLogsController::class, 'index'])
            ->name('chat-logs.index');
        Route::get('chat-logs/export', [\App\Http\Controllers\JailOfficer\ChatLogsController::class, 'exportCsv'])
            ->name('chat-logs.export');
        Route::get('chat-logs/session/{session}', [\App\Http\Controllers\JailOfficer\ChatLogsController::class, 'showSession'])
            ->name('chat-logs.session');
    });

    Route::middleware(['role:jail_warden'])->prefix('admin')->name('admin.')->group(function () {
        Route::get('appeals', [\App\Http\Controllers\Admin\AppealsOversightController::class, 'index'])
            ->name('appeals.index');
        Route::post('appeals/{appeal}/review', [\App\Http\Controllers\Admin\AppealsOversightController::class, 'review'])
            ->name('appeals.review');
        Route::put('appeals/{appeal}/update-status', [\App\Http\Controllers\Admin\AppealsOversightController::class, 'updateStatus'])
            ->name('appeals.update-status');
        Route::get('appeals/documents/{appealDocument}/download', [\App\Http\Controllers\Admin\AppealsOversightController::class, 'downloadDocument'])
            ->name('appeals.documents.download');
        Route::get('account-appeals', [\App\Http\Controllers\Admin\AccountAppealReviewController::class, 'index'])
            ->name('account-appeals.index');
        Route::post('account-appeals/{appeal}/review', [\App\Http\Controllers\Admin\AccountAppealReviewController::class, 'review'])
            ->name('account-appeals.review');
        Route::get('suggestions', [\App\Http\Controllers\Admin\SuggestionManagementController::class, 'index'])
            ->name('suggestions.index');
        Route::put('suggestions/{suggestion}', [\App\Http\Controllers\Admin\SuggestionManagementController::class, 'update'])
            ->name('suggestions.update');
        Route::get('notifications', [\App\Http\Controllers\Admin\NotificationManagementController::class, 'index'])
            ->name('notifications.index');
        Route::post('notifications/{notification}/read', [\App\Http\Controllers\Admin\NotificationManagementController::class, 'markAsRead'])
            ->name('notifications.read');
        Route::post('notifications/read-all', [\App\Http\Controllers\Admin\NotificationManagementController::class, 'markAllAsRead'])
            ->name('notifications.read-all');
        Route::get('sessions', [\App\Http\Controllers\Admin\SessionManagementController::class, 'index'])
            ->name('sessions.index');
        Route::delete('sessions/{session}', [\App\Http\Controllers\Admin\SessionManagementController::class, 'revoke'])
            ->name('sessions.revoke');
        Route::post('sessions/user/{user}/revoke-all', [\App\Http\Controllers\Admin\SessionManagementController::class, 'revokeUserSessions'])
            ->name('sessions.revoke-user-all');
        Route::post('sessions/revoke-my-other', [\App\Http\Controllers\Admin\SessionManagementController::class, 'revokeMyOtherSessions'])
            ->name('sessions.revoke-my-other');
        Route::get('audit-logs', [\App\Http\Controllers\Admin\AuditLogController::class, 'index'])
            ->name('audit-logs.index');
        Route::get('audit-logs/export', [\App\Http\Controllers\Admin\AuditLogController::class, 'export'])
            ->name('audit-logs.export');
        Route::get('incident-reporting', [\App\Http\Controllers\Admin\IncidentReportingController::class, 'index'])
            ->name('incident-reporting.index');
        Route::get('inmate-tunnels', [\App\Http\Controllers\Admin\InmateTunnelController::class, 'index'])
            ->name('inmate-tunnels.index');

        // Chat Logs Management
        Route::get('chat-logs', [\App\Http\Controllers\JailOfficer\ChatLogsController::class, 'index'])
            ->name('chat-logs.index');
        Route::get('chat-logs/export', [\App\Http\Controllers\JailOfficer\ChatLogsController::class, 'exportCsv'])
            ->name('chat-logs.export');
        Route::get('chat-logs/session/{session}', [\App\Http\Controllers\JailOfficer\ChatLogsController::class, 'showSession'])
            ->name('chat-logs.session');

        // Chat Recordings Management
        Route::get('chat-recordings', [\App\Http\Controllers\JailOfficer\ChatRecordingsController::class, 'index'])
            ->name('chat-recordings.index');
        Route::get('chat-recordings/session/{roomId}', [\App\Http\Controllers\JailOfficer\ChatRecordingsController::class, 'viewSession'])
            ->name('chat-recordings.view-session');
        Route::get('chat-recordings/session/{roomId}/export', [\App\Http\Controllers\JailOfficer\ChatRecordingsController::class, 'exportSession'])
            ->name('chat-recordings.export-session');
    });
});

// API route for fetching chat session data (used by modal)
Route::middleware(['auth', 'role:jail_officer'])->get('api/chat-recordings/session/{roomId}', [\App\Http\Controllers\JailOfficer\ChatRecordingsController::class, 'viewSessionApi'])
    ->name('jail-officer.chat-recordings.api');

require __DIR__.'/settings.php';
