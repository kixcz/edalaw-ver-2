# Jail Warden Dashboard - Database Schema & Model Update

## Summary

Successfully restructured the database schema and Eloquent models to implement the correct facility hierarchy for the Jail Warden dashboard.

## New Hierarchy

```
Branch → Annex → Dormitory → Cell → PDL (Inmate)
```

## Database Schema Changes

### Tables Rebuilt

The following tables were recreated with the correct foreign key relationships:

#### 1. **annexes** table
- **NEW**: `branch_id` (BIGINT UNSIGNED) - References `branches.id`
- **REMOVED**: `dormitory_id`
- Structure: `id`, `branch_id`, `name`, `description`, `status`, `created_at`, `updated_at`

#### 2. **dormitories** table  
- **NEW**: `annex_id` (BIGINT UNSIGNED) - References `annexes.id`
- **REMOVED**: `jail_id`
- Structure: `id`, `annex_id`, `name`, `type`, `description`, `status`, `created_at`, `updated_at`

#### 3. **cells** table
- **NEW**: `dormitory_id` (BIGINT UNSIGNED) - References `dormitories.id`
- **REMOVED**: `annex_id`
- Structure: `id`, `dormitory_id`, `cell_number`, `capacity`, `status`, `created_at`, `updated_at`

### Old Tables Backup

The old tables are preserved as:
- `annexes_old`
- `dormitories_old`  
- `cells_old`

These can be safely dropped after verification.

## Model Updates

### Branch Model (`app/Models/Branch.php`)

**Relationships Updated:**
- `annexes()` - Direct HasMany to Annex
- `dormitories()` - HasManyThrough Annex to Dormitory
- `cells()` - HasManyThrough Annex and Dormitory to Cell
- **Removed**: `jails()`, `visits()`

**Attributes Updated:**
- `total_inmates_count` - Now sums from cells directly
- `total_capacity` - Now sums from cells directly

### Annex Model (`app/Models/Annex.php`)

**Relationships Updated:**
- `branch()` - BelongsTo Branch (direct ownership)
- `dormitories()` - HasMany to Dormitory
- `cells()` - HasManyThrough Dormitory to Cell
- **Removed**: `jail()`, `jailOfficerScopes()`

**Fillable Fields:**
- Changed from `dormitory_id` to `branch_id`

**Branch Scope Path:**
- Changed from `'jail'` to `'branch'`

### Dormitory Model (`app/Models/Dormitory.php`)

**Relationships Updated:**
- `annex()` - BelongsTo Annex (direct ownership)
- `branch()` - HasOneThrough Annex to Branch
- `cells()` - HasMany to Cell
- **Removed**: `jail()`, `annexes()`, `visits()`

**Fillable Fields:**
- Changed from `jail_id` to `annex_id`

**Branch Scope Path:**
- Changed from `'jail'` to `'annex'`

### Cell Model (`app/Models/Cell.php`)

**Relationships Updated:**
- `dormitory()` - BelongsTo Dormitory (direct ownership)
- `annex()` - HasOneThrough Dormitory to Annex
- `branch()` - HasOneThrough Dormitory and Annex to Branch
- **Removed**: `jail()`, `jailOfficerScopes()`

**Fillable Fields:**
- Changed from `annex_id` to `dormitory_id`

**Branch Scope Path:**
- Changed from `'jail'` to `'dormitory'`

## Controller Updates

### JailWardenDashboardController (`app/Http/Controllers/Dashboard/JailWardenDashboardController.php`)

**Query Updates:**

1. **Dormitories Query** (Line 46):
   - OLD: `Dormitory::whereHas('jail', ...)`
   - NEW: `Dormitory::whereHas('annex.branch', ...)`

2. **Facilities Data**:
   - **Annexes**: Now queries directly by `branch_id` instead of through jail
   - **Dormitories**: Filters by `annex.branch_id` instead of `jail_id`
   - **Cells**: Filters by `dormitory.annex.branch_id` instead of `annex.dormitory.jail_id`

3. **Data Structure**:
   - Removed nested `annexes` from dormitories
   - Cells now directly under dormitories
   - Simplified hierarchy matching new structure

## Migration Created

**File**: `database/migrations/2026_04_02_173752_update_facility_hierarchy_for_jail_warden.php`

This migration handles the schema changes but manual cleanup was required due to MySQL foreign key constraints.

## Manual Cleanup Scripts Created

1. **rebuild-tables-simple.php** - Recreated tables with correct structure
2. **fix-annexes-fk.php** - Added foreign key constraint for annexes.branch_id
3. **fresh-schema-check.php** - Verified final schema structure

## Testing Status

✅ Database schema successfully updated  
✅ Eloquent models updated with correct relationships  
✅ Controller queries updated  
⏳ **Pending**: Test Jail Warden dashboard in browser  

## Next Steps

1. ✅ Clear Laravel caches (route, config, application)
2. ⏳ Test accessing `/dashboard/jail-warden` 
3. ⏳ Verify all data loads correctly
4. ⏳ Test officer scope assignment functionality
5. ⏳ Clean up old backup tables (`annexes_old`, `dormitories_old`, `cells_old`)

## Important Notes

- The `jail_id` column was removed from the facility hierarchy entirely
- "Jail" is now synonymous with "Branch" from a business logic perspective
- Wardens manage their assigned branch's facilities directly
- The hierarchy is now simpler and more intuitive: **Branch → Annex → Dormitory → Cell → PDL**
