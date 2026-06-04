# Hierarchical Data Scoping Implementation

## Overview

This document describes the strict hierarchical data scoping system implemented in the eDalaw application. The system ensures that users can only access data within their authorized organizational scope.

## Hierarchy Structure

```
National Office (No restrictions)
    ↓
Region
    ↓
Branch
    ↓
Jail
    ↓
Dormitory
    ↓
Annex/Building
    ↓
Cell
```

## Database Schema Changes

### New Tables

1. **regions** - Top-level administrative divisions
   - `id`, `name`, `code`, `description`, `status`

2. **branches** - Regional offices that own jails
   - `id`, `region_id`, `name`, `code`, `description`, `status`

### Modified Tables

1. **jails** - Added `branch_id` foreign key
2. **cells** - Added `annex_id` foreign key (was missing)
3. **users** - Added `branch_id` foreign key (nullable for national office)
4. **visit_sessions** - Added `jail_id` for ownership tracking
5. **visits** - Added `jail_id` for ownership tracking

All foreign keys are indexed for performance.

## User Roles and Access Levels

### 1. National Office Users
- **Role**: `national` or `National Office`
- **Access**: Unrestricted access to all data across all regions and branches
- **Branch ID**: Not required (can be null)
- **Scope**: Global (no filtering applied)

### 2. Super Admin Users
- **Role**: `super-admin` or `Super Admin`
- **Access**: Can access all data within their assigned branch
- **Branch ID**: Required
- **Scope**: Branch-level (automatically filtered by `branch_id`)
- **Special**: Can create/add jail officers automatically assigned to their branch

### 3. Jail Officers
- **Role**: `jail-officer` or `Jail Officer`
- **Access**: Can access all data within their assigned branch
- **Branch ID**: Required
- **Scope**: Branch-level (automatically filtered by `branch_id`)

## Implementation Details

### Eloquent Models Updated

#### Models with Direct Branch Ownership
- **Jail**: Uses `HasBranchScope` trait
- **Visit**: Uses `HasBranchScope` trait
- **VisitSession**: Uses `HasBranchScope` trait
- **User**: Has `branch()` relationship and role-checking methods

#### Models with Inherited Branch Ownership
- **Cell**: Uses `HasBranchScopeThroughRelation` trait (resolves through annex → dormitory → jail → branch)
- **Annex**: Uses `HasBranchScopeThroughRelation` trait (resolves through dormitory → jail → branch)
- **Dormitory**: Uses `HasBranchScopeThroughRelation` trait (resolves through jail → branch)

### Global Query Scopes

Two traits provide automatic query scoping:

#### 1. `HasBranchScope` Trait
For models with a direct `branch_id` column.

**Features:**
- Automatically filters queries based on authenticated user's role
- Provides `scopeWithinBranch()` method
- Provides `scopeWithinBranches()` method
- Provides `scopeAccessibleByCurrentUser()` method

**Usage Example:**
```php
// Automatically filtered by user's branch
$jails = Jail::all();

// Explicitly filter by specific branch
$jails = Jail::withinBranch($branchId)->get();

// Filter by multiple branches
$jails = Jail::withinBranches([$branchId1, $branchId2])->get();
```

#### 2. `HasBranchScopeThroughRelation` Trait
For models that inherit branch ownership through relationships.

**Requirements:**
- Must define `$branchRelationshipPath` property
- Relationship chain must end at a model with `branch_id`

**Usage Example:**
```php
// Cell model configuration
class Cell extends Model
{
    use HasBranchScopeThroughRelation;
    
    protected string $branchRelationshipPath = 'jail';
}

// Queries are automatically filtered through the relationship chain
$cells = Cell::all(); // Only cells in user's branch
```

### Middleware Layer

**EnforceBranchScope Middleware**

Provides request-level enforcement:
- Validates branch-level users have `branch_id` assigned
- Stores branch scope in request for controller access
- Registered as `branch_scope` middleware alias

**Usage:**
```php
Route::middleware(['auth', 'branch_scope'])->group(function () {
    Route::get('/jails', [JailController::class, 'index']);
});
```

### Service Layer

**BranchScopeService**

Provides utility methods for complex scoping scenarios:

```php
use App\Services\BranchScopeService;

// Apply scope to custom queries
$service->applyScope($query, $user);

// Apply scope through relationships
$service->applyScopeThroughRelation($query, $user, 'jail.branch');

// Get accessible branches
$branches = $service->getAccessibleBranches($user);

// Validate record ownership
$canAccess = $service->validateRecordOwnership($record, $user);
```

## Automatic Query Filtering

### How It Works

1. **Model Boot Process**: When a model uses `HasBranchScope` or `HasBranchScopeThroughRelation`, Laravel's `boot` method registers a global scope.

2. **Query Interception**: Every query is intercepted before execution:
   ```php
   static::addGlobalScope('branch', function (Builder $query) {
       $user = auth()->user();
       
       if ($user->isNationalOffice()) {
           return; // No filtering for national users
       }
       
       if ($user->hasBranchAccess() && $user->branch_id) {
           $query->where('branch_id', $user->branch_id);
       }
   });
   ```

3. **Relationship Resolution**: For inherited scopes, the trait uses `whereHas()` to filter through relationships.

### Example Scenarios

#### Scenario 1: National Office User Accessing Jails
```php
$user = User::find(1); // National office user
auth()->setUser($user);

$jails = Jail::all(); // Returns ALL jails (no filtering)
```

#### Scenario 2: Jail Officer Accessing Cells
```php
$user = User::find(2); // Jail officer with branch_id = 5
auth()->setUser($user);

$cells = Cell::all(); 
// SQL: SELECT * FROM cells 
// WHERE EXISTS (
//   SELECT * FROM annexes 
//   INNER JOIN dormitories ON ...
//   INNER JOIN jails ON ...
//   WHERE jails.branch_id = 5
// )
```

#### Scenario 3: Visit Sessions
```php
$user = User::find(3); // Super admin with branch_id = 3
auth()->setUser($user);

$sessions = VisitSession::all();
// Automatically filtered to sessions where jail.branch_id = 3
```

## Security Considerations

### Backend Enforcement Only
- **CRITICAL**: All scoping is enforced at the backend level
- Frontend/UI filtering is supplementary, not primary security
- Never rely on client-side validation for access control

### Service Layer Validation
Always validate record ownership in service methods:

```php
public function updateVisit(Visit $visit, array $data): Visit
{
    $user = auth()->user();
    
    // Prevent unauthorized updates
    if (!app(BranchScopeService::class)->validateRecordOwnership($visit, $user)) {
        abort(403, 'Unauthorized access to visit record.');
    }
    
    $visit->update($data);
    return $visit;
}
```

### Controller Best Practices
```php
public function show(VisitSession $session)
{
    // Global scope already applied, but double-check for safety
    if (!app(BranchScopeService::class)->validateRecordOwnership($session, auth()->user())) {
        abort(403);
    }
    
    return Inertia::render('VisitSession/Show', [
        'session' => $session
    ]);
}
```

## Performance Optimization

### Indexes
All foreign key columns are indexed:
- `branch_id` on `jails`, `users`
- `jail_id` on `dormitories`, `visit_sessions`, `visits`
- `annex_id` on `cells`
- `region_id` on `branches`

### Query Optimization Tips
1. Use eager loading to avoid N+1 queries:
   ```php
   Jail::with('dormitories.annexes.cells')->get();
   ```

2. For complex queries, use the service layer's subquery methods

3. Cache frequently accessed branch hierarchies if needed

## Testing

### Migration Testing
Run migrations to apply schema changes:
```bash
php artisan migrate
```

### Seed Test Data
Seed regions and branches:
```bash
php artisan db:seed --class=RegionBranchSeeder
```

### Verify Scoping
Test that scoping works correctly:
```php
// Test as national user
$user = User::factory()->create(['role_id' => $nationalRoleId, 'branch_id' => null]);
$this->actingAs($user);
$this->assertEquals(100, Jail::count()); // All jails visible

// Test as branch user
$user = User::factory()->create(['role_id' => $adminRoleId, 'branch_id' => 1]);
$this->actingAs($user);
$this->assertEquals(10, Jail::count()); // Only branch 1 jails visible
```

## Maintenance

### Adding New Models
To add branch scoping to a new model:

1. **Direct branch_id column**: Add `branch_id` to table, use `HasBranchScope` trait
2. **Inherited through relationship**: Define relationship chain, use `HasBranchScopeThroughRelation` trait

### Modifying Scope Logic
Update the trait files in `app/Traits/`:
- `HasBranchScope.php`
- `HasBranchScopeThroughRelation.php`

## Troubleshooting

### Common Issues

**Issue**: "Column not found: branch_id"
- **Solution**: Run migrations to add the column

**Issue**: Global scope not applying
- **Solution**: Ensure trait is used in the model and relationships are properly defined

**Issue**: Performance degradation
- **Solution**: Check indexes on foreign key columns, use eager loading

## Summary

This hierarchical data scoping system provides:
- ✅ Automatic query filtering based on user roles
- ✅ Multi-level inheritance through relationships
- ✅ Backend-enforced security
- ✅ Performance-optimized with indexes
- ✅ Reusable traits and services
- ✅ Comprehensive coverage across all modules

All core entities are now tagged with ownership keys and access is strictly enforced at the backend using global query constraints.
