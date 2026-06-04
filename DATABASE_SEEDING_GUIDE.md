# Comprehensive Database Seeding Guide

## Overview

This guide documents the complete hierarchical multi-tenant database seeding system for eDalaw. The seeders create a realistic, production-like dataset that respects the hierarchical ownership structure and branch scoping rules.

## Hierarchy Structure

```
National Office (Unrestricted Access)
    ↓
Region (e.g., Region I, NCR, Region VII)
    ↓
Branch (e.g., Laoag Branch, Manila Main Branch)
    ↓
Jail (2-3 per branch)
    ↓
Dormitory (4 types: male, female, juvenile, special)
    ↓
Annex/Building (2-3 per dormitory)
    ↓
Cell (4-8 per annex)
```

## Seeder Execution Order

The seeders run in a specific order to ensure data integrity:

1. **RoleSeeder** - Creates all user roles
2. **RegionBranchSeeder** - Creates regions and branches
3. **JailFacilitySeeder** - Creates jails, dormitories, annexes, and cells
4. **HierarchicalUserSeeder** - Creates users with proper branch assignments
5. **VisitSessionSeeder** - Creates visits and visit sessions
6. **RelatedDataSeeder** - Creates call logs, video recordings, and chat logs

## Running the Seeders

### Full Seeding (Recommended)

```bash
php artisan db:seed
```

This runs `DatabaseSeeder` which orchestrates all seeders in the correct order.

### Individual Seeder

```bash
# Seed only roles
php artisan db:seed --class=RoleSeeder

# Seed only regions and branches
php artisan db:seed --class=RegionBranchSeeder

# Seed only facilities
php artisan db:seed --class=JailFacilitySeeder

# Seed only users
php artisan db:seed --class=HierarchicalUserSeeder

# Seed only visit sessions
php artisan db:seed --class=VisitSessionSeeder

# Seed only related data
php artisan db:seed --class=RelatedDataSeeder
```

## Detailed Seeder Information

### 1. RoleSeeder

**Purpose:** Creates all required user roles in the system.

**Roles Created:**
- `national` - National Office (unrestricted access)
- `super_admin` - Super Admin (branch-level access)
- `jail_officer` - Jail Officer (branch-level access)
- `bjmp_officer` - BJMP Officer
- `visitor` - Visitor
- `monitoring_officer` - Monitoring Officer

**Idempotency:** Uses `firstOrCreate()` - safe to run multiple times.

### 2. RegionBranchSeeder

**Purpose:** Creates the top-level organizational hierarchy.

**Data Created:**
- **4 Regions:**
  - Region I (Ilocos Region)
  - NCR (Metro Manila)
  - Region VII (Central Visayas)
  - Region III (Central Luzon)

- **13 Branches** distributed across regions:
  - Region I: Laoag, Vigan, San Fernando
  - NCR: Manila Main, Quezon City, Makati, Pasig
  - Region VII: Cebu, Bohol, Negros Oriental
  - Region III: Angeles, San Fernando Pampanga, Tarlac

**Characteristics:**
- Each region has 3-4 branches
- Unique codes for each region and branch
- All marked as 'active' status

**Idempotency:** Uses `firstOrCreate()` on unique codes - safe to run multiple times.

### 3. JailFacilitySeeder

**Purpose:** Creates the complete facility hierarchy for each branch.

**Data Created:**
- **Jails:** 2-3 per branch (~30 total)
  - Named: "{Branch Name} Jail #1", "#2", "#3"
  - Unique codes: "{BRANCH_CODE}-JAIL-{NUMBER}"
  - Random locations and descriptions

- **Dormitories:** 4 per jail (male, female, juvenile, special)
  - Categorized by type
  - Named: "{Jail Name} - {type} Dormitory"

- **Annexes:** 2-3 per dormitory (~240 total)
  - Named: "{Dormitory Name} - Building {NUMBER}"

- **Cells:** 4-8 per annex (~1,200 total)
  - Capacity: 4-12 inmates per cell
  - Unique cell numbers per annex
  - All marked as 'active'

**Foreign Keys:**
- `jails.branch_id` → branches.id
- `dormitories.jail_id` → jails.id
- `annexes.dormitory_id` → dormitories.id
- `cells.annex_id` → annexes.id

**Idempotency:** Uses composite unique keys - safe to run multiple times.

### 4. HierarchicalUserSeeder

**Purpose:** Creates users with proper role and branch assignments.

**Users Created:**

**National Office User:**
- Email: `national@edalaw.gov.ph`
- Password: `password`
- Role: National Office
- Branch ID: `null` (unrestricted access)
- Can access ALL data across all branches

**Super Admin Users:**
- Email: `superadmin.{BRANCH_CODE}@edalaw.gov.ph`
- Password: `password`
- Role: Super Admin
- Branch ID: Assigned to specific branch
- One per branch (~13 total)
- Can access data ONLY within their assigned branch

**Jail Officers:**
- Email: `officer{NUMBER}.{BRANCH_CODE}@edalaw.gov.ph`
- Password: `password`
- Role: Jail Officer
- Branch ID: Assigned to same branch as super admin
- 2-4 per branch (~40 total)
- Can access data ONLY within their assigned branch

**User Characteristics:**
- Realistic names using Faker
- Valid phone numbers
- All approved and email verified
- Consent accepted and timestamped

**Foreign Keys:**
- `users.role_id` → roles.id
- `users.branch_id` → branches.id

**Idempotency:** Uses `firstOrCreate()` on unique emails - safe to run multiple times.

### 5. VisitSessionSeeder

**Purpose:** Creates realistic visitation data with mixed statuses.

**Data Created:**
- **Visits:** 5-10 per jail (~200 total)
  - Status distribution:
    - Pending: 20%
    - Approved: 30%
    - Completed: 30%
    - Cancelled: 10%
    - Missed: 10%
  - Visit types: Virtual and Physical (50/50 split)
  - Scheduled dates: -5 to +10 days from current date
  - Time slots: 09:00, 10:00, 13:00, 14:00, 15:00
  - Relationships: spouse, parent, child, sibling, friend

- **Inmates:** Created as needed (~200 total)
  - Assigned to cells within jails
  - Realistic names and inmate numbers
  - Active status

- **Visit Sessions:** Created for approved/completed visits
  - Room IDs: "ROOM-{RANDOM}"
  - Status: scheduled, active, completed
  - Recording status: saved or pending
  - Realistic timestamps aligned with visit schedules

**Foreign Keys:**
- `visits.jail_id` → jails.id (ownership tracking)
- `visits.inmate_id` → inmates.id
- `visits.user_id` → users.id (visitor)
- `visits.jail_officer_id` → users.id (officer)
- `visit_sessions.visit_id` → visits.id
- `visit_sessions.jail_id` → jails.id (inherited from visit)
- `visit_sessions.monitor_id` → users.id

**Branch Ownership:**
- All visits tagged with `jail_id`
- Jail officers assigned to same branch as jail
- Automatic branch scoping applies

**Idempotency:** Creates new records each run - use `db:wipe` first for clean state.

### 6. RelatedDataSeeder

**Purpose:** Populates supporting tables for reporting and monitoring features.

**Data Created:**

**Call Logs:** (~1,300 total)
- 1-3 per visit session
- Call types: incoming, outgoing
- Status: completed, missed, failed
- Duration: 60-600 seconds
- Realistic phone numbers

**Video Recordings:** (~220 total)
- For sessions with recording_status = 'saved'
- Random URLs and file paths
- Duration: 1800-3600 seconds (30-60 minutes)
- Storage disk: s3
- Aligned with session timestamps

**Chat Logs:** (~6,800 total)
- 5-15 messages per visit session
- Senders: visitor, inmate, monitor
- Realistic message content
- Timestamps within session duration
- 10% flagged rate for testing moderation

**Foreign Keys:**
- `call_logs.user_id` → users.id
- `video_recordings.visit_session_id` → visit_sessions.id
- `chat_logs.visit_session_id` → visit_sessions.id

**Idempotency:** Creates new records each run - accumulates data.

## Data Statistics

After full seeding, expect approximately:

| Table | Count | Notes |
|-------|-------|-------|
| regions | 4 | Active regions |
| branches | 13 | Across all regions |
| jails | ~30 | 2-3 per branch |
| dormitories | ~120 | 4 per jail |
| annexes | ~360 | 2-3 per dormitory |
| cells | ~1,200 | 4-8 per annex |
| users | ~60 | 1 national, 13 super admins, ~40 jail officers |
| inmates | ~200 | Assigned to cells |
| visits | ~200 | Mixed statuses |
| visit_sessions | ~120 | Approved/completed visits |
| call_logs | ~1,300 | Associated with sessions |
| video_recordings | ~220 | Saved recordings |
| chat_logs | ~6,800 | Session messages |

## Testing Scenarios

### Scenario 1: National Office Access

```bash
# Login as national office user
email: national@edalaw.gov.ph
password: password

# Should see:
# - ALL jails across ALL branches
# - ALL visits regardless of branch
# - Unrestricted reports and analytics
```

### Scenario 2: Super Admin Branch Access

```bash
# Login as super admin for Manila Main Branch
email: superadmin.MNL-001@edalaw.gov.ph
password: password

# Should see:
# - ONLY jails under MNL-001 branch
# - ONLY visits in MNL-001 jails
# - Reports filtered to MNL-001 data
```

### Scenario 3: Jail Officer View

```bash
# Login as jail officer
email: officer1.CEB-001@edalaw.gov.ph
password: password

# Should see:
# - ONLY data within CEB-001 branch
# - Cannot access other branches' data
# - Global scope automatically applied
```

## Idempotency and Safety

### Safe to Run Multiple Times:
- ✅ RoleSeeder (uses firstOrCreate)
- ✅ RegionBranchSeeder (uses firstOrCreate on codes)
- ✅ JailFacilitySeeder (uses firstOrCreate on composite keys)
- ✅ HierarchicalUserSeeder (uses firstOrCreate on emails)

### Accumulates Data (Use db:wipe First):
- ⚠️ VisitSessionSeeder (creates new visits each run)
- ⚠️ RelatedDataSeeder (creates new logs each run)

### Recommended Development Workflow:

```bash
# Fresh start with migrations and seeders
php artisan migrate:fresh --seed

# Or keep existing data and add more
php artisan db:seed --class=VisitSessionSeeder
```

## Troubleshooting

### Issue: Foreign Key Constraint Errors

**Solution:** Ensure seeders run in correct order:
1. Roles → 2. Regions/Branches → 3. Facilities → 4. Users → 5. Visits → 6. Related Data

### Issue: Duplicate Entry Errors

**Cause:** Running visit/session seeders multiple times without cleanup.

**Solution:** 
```bash
# Option 1: Fresh database
php artisan migrate:fresh --seed

# Option 2: Truncate specific tables
php artisan tinker
>>> DB::table('visit_sessions')->truncate();
>>> DB::table('visits')->truncate();
>>> exit
```

### Issue: No Data Showing for User

**Cause:** User's branch_id doesn't match any facilities.

**Solution:** Verify user assignment:
```bash
php artisan tinker
>>> $user = User::where('email', 'superadmin.MNL-001@edalaw.gov.ph')->first();
>>> echo "User branch: " . $user->branch_id;
>>> echo "Jails in branch: " . Jail::where('branch_id', $user->branch_id)->count();
```

## Performance Considerations

### Seeding Time:
- Full seeding: ~45-60 seconds
- Most time-consuming: RelatedDataSeeder (~30s)

### Optimization Tips:
1. Use `db:seed --class=SpecificSeeder` for targeted seeding
2. Reduce counts in seeders for faster iteration
3. Cache frequently accessed data after seeding

## Customization

### Adding More Regions/Branches:

Edit `RegionBranchSeeder.php`:
```php
$regionsData = [
    [
        'name' => 'New Region',
        'code' => 'NEW',
        'branches' => [
            ['name' => 'New Branch', 'code' => 'NB-001'],
        ]
    ],
];
```

### Adjusting Data Volume:

Edit respective seeders:
```php
// In JailFacilitySeeder
$jailsCount = rand(5, 10); // Increase from rand(2, 3)

// In VisitSessionSeeder
$visitsCount = rand(20, 30); // Increase from rand(5, 10)
```

### Custom User Credentials:

Edit `HierarchicalUserSeeder.php`:
```php
User::firstOrCreate(
    ['email' => 'custom@edalaw.gov.ph'],
    [
        'password' => Hash::make('custompassword'),
        // ... other fields
    ]
);
```

## Summary

This comprehensive seeding system provides:
- ✅ Complete hierarchical multi-tenant structure
- ✅ Realistic test data for all major features
- ✅ Proper branch ownership and scoping
- ✅ Mixed data states for testing edge cases
- ✅ Idempotent-safe operations where appropriate
- ✅ Production-like dataset for development and testing

All seeded data respects the hierarchical ownership chain and validates the branch scoping implementation across the entire application.
