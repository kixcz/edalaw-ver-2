<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\ApprovalStatus;
use App\Services\JailOfficerScopeResolver;
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
        'region',
        'brgy',
        'municipality',
        'province',
        'postal_code',
        'contact_number',
        'role_id',
        'branch_id',
        'region_id',
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
     * Get the full name of the user.
     */
    public function getFullNameAttribute(): string
    {
        $name = trim($this->first_name.' '.($this->middle_name ?? '').' '.$this->last_name);

        return trim(preg_replace('/\s+/', ' ', $name));
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
     * Check if the user is a jail warden (merged with super_admin).
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
        return $this->isJailWarden() || $this->isJailOfficer();
    }

    /**
     * Get the branch ID for scoping queries.
     */
    public function getBranchIdForScope(): ?int
    {
        return $this->hasBranchAccess() ? $this->branch_id : null;
    }

    /**
     * Get active scope resolver instance.
     */
    public function scopeResolver(): JailOfficerScopeResolver
    {
        return new JailOfficerScopeResolver;
    }

    /**
     * Get all authorized cell IDs (convenience method).
     */
    public function getAuthorizedCellIds(): array
    {
        return $this->scopeResolver()->getAuthorizedCellIds($this);
    }

    /**
     * Get all authorized building IDs.
     */
    public function getAuthorizedBuildingIds(): array
    {
        return $this->scopeResolver()->getAuthorizedBuildingIds($this);
    }

    /**
     * Alias for getAuthorizedBuildingIds() - uses "annex" terminology.
     */
    public function getAuthorizedAnnexIds(): array
    {
        return $this->getAuthorizedBuildingIds();
    }

    /**
     * Get all authorized dormitory IDs.
     */
    public function getAuthorizedDormitoryIds(): array
    {
        return $this->scopeResolver()->getAuthorizedDormitoryIds($this);
    }

    /**
     * Get all authorized inmate IDs.
     */
    public function getAuthorizedInmateIds(): array
    {
        return $this->scopeResolver()->getAuthorizedInmateIds($this);
    }

    /**
     * Check if JO has scope assigned.
     */
    public function hasFacilityScope(): bool
    {
        return $this->scopeResolver()->hasActiveScope($this);
    }
}
