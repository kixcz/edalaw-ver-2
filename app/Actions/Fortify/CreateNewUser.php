<?php

namespace App\Actions\Fortify;

use App\ApprovalStatus;
use App\Concerns\PasswordValidationRules;
use App\Concerns\ProfileValidationRules;
use App\Models\Role;
use App\Models\User;
use App\Services\OtpService;
use Illuminate\Support\Facades\Validator;
use Laravel\Fortify\Contracts\CreatesNewUsers;

class CreateNewUser implements CreatesNewUsers
{
    use PasswordValidationRules, ProfileValidationRules;

    /**
     * Validate and create a newly registered user.
     *
     * @param  array<string, string>  $input
     */
    public function create(array $input): User
    {
        $request = request();

        $role = Role::where('slug', 'visitor')->first();
        if (! $role) {
            Validator::make([], ['role_id' => 'required'])
                ->after(function ($validator) {
                    $validator->errors()->add('role_id', 'Visitor role is not configured. Please contact support.');
                })
                ->validate();
        }

        // Validate ID documents for visitor (at least 2 proofs of identity)
        Validator::make($request->all(), [
            'id_document_1' => ['required', 'file', 'mimes:jpeg,jpg,png,pdf', 'max:5120'],
            'id_document_2' => ['required', 'file', 'mimes:jpeg,jpg,png,pdf', 'max:5120'],
        ], [
            'id_document_1.required' => 'Please upload at least two proofs of identity (e.g. valid ID, birth certificate).',
            'id_document_2.required' => 'Please upload a second proof of identity.',
        ])->validate();

        // Validate informed consent acceptance
        Validator::make($input, [
            'consent_accepted' => ['required', 'accepted'],
        ], [
            'consent_accepted.accepted' => 'You must accept the informed consent to register.',
        ])->validate();

        Validator::make($input, [
            ...$this->profileRules(),
            'password' => $this->passwordRules(),
        ])->validate();

        // Store ID documents for visitor, BJMP officer, and monitoring officer
        $idDocument1Path = null;
        $idDocument2Path = null;

        if ($request->hasFile('id_document_1') && $request->hasFile('id_document_2')) {
            $idDocument1Path = $request->file('id_document_1')->store('users/id_documents', 'public');
            $idDocument2Path = $request->file('id_document_2')->store('users/id_documents', 'public');
        }

        $user = User::create([
            'first_name' => $input['first_name'],
            'middle_name' => $input['middle_name'] ?? null,
            'last_name' => $input['last_name'],
            'email' => $input['email'],
            'contact_number' => $input['contact_number'] ?? null,
            'password' => $input['password'],
            'dob' => $input['dob'],
            'gender' => $input['gender'],
            'street' => $input['street'],
            'brgy' => $input['brgy'],
            'municipality' => $input['municipality'],
            'province' => $input['province'],
            'postal_code' => $input['postal_code'],
            'role_id' => $role->id,
            'approval_status' => ApprovalStatus::Pending,
            'id_document_1_path' => $idDocument1Path,
            'id_document_2_path' => $idDocument2Path,
            'consent_accepted' => true,
            'consent_timestamp' => now(),
        ]);

        // Send OTP to email and SMS for verification
        $otpService = new OtpService;

        $otpResult = $otpService->generateAndSendRegistration($user);
        if (! $otpResult['success']) {
            session()->flash('otp_warning', $otpResult['error'] ?? 'Unable to deliver OTP. Please contact support.');
        }

        // Notify super admins about new user registration
        \App\Services\NotificationService::notifySuperAdminsAboutNewUser($user);

        return $user;
    }
}
