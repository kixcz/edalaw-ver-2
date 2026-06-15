<?php

use App\ApprovalStatus;
use App\Models\OtpVerification;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    $this->seed(RoleSeeder::class);
    config()->set('mail.default', 'array');
    config()->set('services.semaphore.api_key', 'test-api-key');
});

test('visitor registration redirects to registration otp verification and does not keep user logged in', function () {
    Http::fake([
        'api.semaphore.co/*' => Http::response([['message_id' => 'test-123']], 200),
    ]);

    $visitorRoleId = (int) Role::where('slug', 'visitor')->value('id');

    $response = $this->post('/register', [
        'role_id' => (string) $visitorRoleId,
        'first_name' => 'Test',
        'middle_name' => '',
        'last_name' => 'Visitor',
        'email' => 'test.visitor@example.com',
        'contact_number' => '09171234567',
        'dob' => '1995-01-01',
        'gender' => 'male',
        'street' => '123 Main St',
        'region' => 'Region IV-A',
        'brgy' => 'Brgy 1',
        'municipality' => 'Test City',
        'province' => 'Test Province',
        'postal_code' => '1234',
        'password' => 'password',
        'password_confirmation' => 'password',
        'consent_accepted' => true,
    ]);

    $response->assertRedirect(route('registration-otp.show'));
    $this->assertGuest();

    $user = User::where('email', 'test.visitor@example.com')->firstOrFail();
    expect($user->approval_status)->toBe(ApprovalStatus::Approved);
    expect($user->role?->slug)->toBe('visitor');

    $response->assertSessionHas('registration.user_id', $user->id);
});

test('registration otp verification logs the user in and redirects to visitor dashboard', function () {
    $user = User::factory()->visitor()->create([
        'approval_status' => ApprovalStatus::Approved,
        'email_verified_at' => null,
    ]);

    $otp = OtpVerification::create([
        'user_id' => $user->id,
        'otp' => '123456',
        'type' => 'registration',
        'expires_at' => now()->addMinutes(10),
        'is_used' => false,
    ]);

    session(['registration.user_id' => $user->id]);

    $response = $this->post(route('registration-otp.verify'), [
        'otp' => $otp->otp,
    ]);

    // Auto-approved visitors should go to their dashboard (home)
    $response->assertRedirect(route('home'));
    $this->assertAuthenticatedAs($user);
    expect($user->fresh()->email_verified_at)->not->toBeNull();
});
