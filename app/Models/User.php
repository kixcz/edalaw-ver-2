<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\ApprovalStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\TwoFactorAuthenticatable;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, TwoFactorAuthenticatable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'email',
        'password',
        'first_name',
        'middle_name',
        'last_name',
        'dob',
        'gender',
        'street',
        'brgy',
        'municipality',
        'province',
        'postal_code',
        'contact_number',
        'role_id',
        'branch_id',
        'approval_status',
        'rejection_reason',
        'email_verified_at',
        'id_document_1_path',
        'id_document_2_path',
        'email_verified_via_otp',
        'phone_verified_via_otp',
        'consent_accepted',
        'consent_timestamp',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
            'dob' => 'date',
            'approval_status' => ApprovalStatus::class,
        ];
    }

    /**
     * Get the role that owns the user.
     *
     * @return BelongsTo<Role>
     */
    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    /**
     * Get the branch that the user is assigned to.
     *
     * @return BelongsTo<Branch>
     */
    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    /**
     * Get the appeals for the user.
     *
     * @return HasMany<Appeal>
     */
    public function appeals(): HasMany
    {
        return $this->hasMany(Appeal::class);
    }

    /**
     * Get the scope assignments where this user is the assigned officer.
     */
    public function assignedScopes(): HasMany
    {
        return $this->hasMany(JailOfficerScope::class, 'jail_officer_id');
    }

    /**
     * Alias for assignedScopes - get jail officer scope assignments.
     */
    public function jailOfficerScopes(): HasMany
    {
        return $this->assignedScopes();
    }

    /**
     * Get the scope assignments made by this user (as warden).
     */
    public function createdScopes(): HasMany
    {
        return $this->hasMany(JailOfficerScope::class, 'assigned_by');
    }

    /**
     * Check if the user is a national office user (no branch restriction).
     */
    public function isNationalOffice(): bool
    {
        return $this->role && 
               ($this->role->slug === 'national' || $this->role->name === 'National Office');
    }

    /**
     * Check if the user is a super admin.
     */
    public function isSuperAdmin(): bool
    {
        return $this->role && 
               ($this->role->slug === 'super-admin' || $this->role->name === 'Super Admin');
    }

    /**
     * Check if the user is a jail warden.
     */
    public function isJailWarden(): bool
    {
        return $this->role && 
               ($this->role->slug === 'jail_warden' || $this->role->name === 'Jail Warden');
    }
    
    /**
     * Check if the user is a jail officer.
     */
    public function isJailOfficer(): bool
    {
        return $this->role && 
               ($this->role->slug === 'jail_officer' || $this->role->name === 'Jail Officer');
    }
    
    /**
     * Check if the user has branch-level access.
     */
    public function hasBranchAccess(): bool
    {
        return $this->isSuperAdmin() || $this->isJailWarden() || $this->isJailOfficer();
    }

    /**
     * Get the branch ID for scoping queries.
     */
    public function getBranchIdForScope(): ?int
    {
        return $this->hasBranchAccess() ? $this->branch_id : null;
    }
}
