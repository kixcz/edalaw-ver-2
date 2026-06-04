# Hierarchical Data Scoping - Quick Reference Guide

## Usage Examples

### 1. Automatic Query Filtering (Recommended)

Models with `HasBranchScope` or `HasBranchScopeThroughRelation` traits automatically filter queries:

```php
// National Office User - sees ALL records
$jails = Jail::all(); // Returns all jails across all branches

// Branch-level User (branch_id = 5) - sees ONLY their branch's records
$jails = Jail::all(); // Returns only jails where branch_id = 5

// Same applies to Cell, Dormitory, Annex, Visit, VisitSession
$cells = Cell::all(); // Automatically filtered through relationship chain
$visits = Visit::all(); // Automatically filtered by branch
```

### 2. Explicit Branch Filtering

Use scope methods for explicit control:

```php
// Filter by specific branch
$jails = Jail::withinBranch($branchId)->get();

// Filter by multiple branches
$jails = Jail::withinBranches([$branchId1, $branchId2])->get();

// Filter by current user's accessible branch
$jails = Jail::accessibleByCurrentUser()->get();
```

### 3. Using BranchScopeService

For complex scenarios and manual validation:

```php
use App\Services\BranchScopeService;

$service = app(BranchScopeService::class);

// Apply scope to custom query
$query = DB::table('custom_table');
$scopedQuery = $service->applyScope($query, auth()->user());

// Validate record ownership before update
if (!$service->validateRecordOwnership($visit, auth()->user())) {
    abort(403, 'Unauthorized access');
}

// Get all accessible branches for user
$branches = $service->getAccessibleBranches(auth()->user());

// Check if user can access specific branch
$canAccess = $service->canAccessBranch(auth()->user(), $branchId);
```

### 4. Controller Example

```php
namespace App\Http\Controllers;

use App\Models\Visit;
use App\Services\BranchScopeService;
use Illuminate\Support\Facades\Auth;

class VisitController extends Controller
{
    public function index()
    {
        // Global scope already filters by branch
        $visits = Visit::with(['inmate', 'jail'])->latest()->paginate(20);
        
        return Inertia::render('Visits/Index', [
            'visits' => $visits
        ]);
    }

    public function show(Visit $visit)
    {
        // Double-check ownership (defense in depth)
        $service = app(BranchScopeService::class);
        if (!$service->validateRecordOwnership($visit, auth()->user())) {
            abort(403);
        }
        
        return Inertia::render('Visits/Show', [
            'visit' => $visit
        ]);
    }

    public function update(Visit $visit, UpdateVisitRequest $request)
    {
        // Validate ownership before allowing update
        $service = app(BranchScopeService::class);
        if (!$service->validateRecordOwnership($visit, auth()->user())) {
            abort(403, 'Cannot modify visits outside your branch.');
        }
        
        $visit->update($request->validated());
        
        return redirect()->route('visits.index');
    }
}
```

### 5. Service Layer Example

```php
namespace App\Services;

use App\Models\VisitSession;
use App\Services\BranchScopeService;

class VisitSessionService
{
    public function __construct(
        protected BranchScopeService $scopeService
    ) {}

    public function getActiveSessions()
    {
        // Global scope handles filtering
        return VisitSession::where('status', 'active')
            ->with(['visit.inmate', 'monitor'])
            ->get();
    }

    public function terminateSession(VisitSession $session, string $reason)
    {
        // Validate ownership
        if (!$this->scopeService->validateRecordOwnership($session, auth()->user())) {
            throw new \Exception('Unauthorized to terminate this session');
        }
        
        $session->update([
            'status' => 'terminated',
            'end_reason' => $reason,
            'ended_at' => now()
        ]);
        
        return $session;
    }
}
```

### 6. Middleware Usage

Apply branch scope middleware to routes:

```php
// In routes/web.php
Route::middleware(['auth', 'branch_scope'])->group(function () {
    Route::get('/jails', [JailController::class, 'index']);
    Route::get('/visits', [VisitController::class, 'index']);
});
```

## Model Configuration Reference

### Models with Direct branch_id Column

These models use `HasBranchScope` trait:

```php
use App\Traits\HasBranchScope;

class Jail extends Model
{
    use HasFactory, HasBranchScope;
    
    protected $fillable = [
        'branch_id',
        'name',
        'code',
        // ... other fields
    ];
    
    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }
}
```

**Models:**
- `Jail`
- `Visit`
- `VisitSession`
- `User` (for branch assignment)

### Models with Inherited Branch Ownership

These models use `HasBranchScopeThroughRelation` trait:

```php
use App\Traits\HasBranchScopeThroughRelation;

class Cell extends Model
{
    use HasFactory, HasBranchScopeThroughRelation;
    
    // Define the relationship path to branch
    protected string $branchRelationshipPath = 'jail';
    
    protected $fillable = [
        'annex_id',
        'cell_number',
        // ... other fields
    ];
    
    public function jail(): HasOneThrough
    {
        return $this->hasOneThrough(Jail::class, Annex::class, 'dormitory_id', 'id', 'annex_id', 'jail_id');
    }
}
```

**Models:**
- `Cell` → resolves through: cell → annex → dormitory → jail → branch
- `Annex` → resolves through: annex → dormitory → jail → branch
- `Dormitory` → resolves through: dormitory → jail → branch

## User Role Methods

Check user roles and access levels:

```php
$user = auth()->user();

// Check role type
$user->isNationalOffice();  // true if national office user
$user->isSuperAdmin();      // true if super admin
$user->isJailOfficer();     // true if jail officer

// Check access level
$user->hasBranchAccess();   // true if super admin or jail officer

// Get branch ID for scoping
$user->getBranchIdForScope();  // returns branch_id or null
```

## Common Patterns

### Pattern 1: Creating Records with Branch Assignment

```php
// When creating a jail, assign to user's branch
public function store(CreateJailRequest $request)
{
    $data = $request->validated();
    
    // Auto-assign branch for branch-level users
    if (auth()->user()->hasBranchAccess()) {
        $data['branch_id'] = auth()->user()->branch_id;
    }
    
    Jail::create($data);
    
    return redirect()->route('jails.index');
}
```

### Pattern 2: Bulk Operations with Scope Validation

```php
public function bulkUpdate(Request $request)
{
    $visitIds = $request->input('visit_ids');
    $service = app(BranchScopeService::class);
    
    foreach ($visitIds as $id) {
        $visit = Visit::find($id);
        
        // Skip if user doesn't own this record
        if (!$service->validateRecordOwnership($visit, auth()->user())) {
            continue;
        }
        
        $visit->update(['status' => 'approved']);
    }
}
```

### Pattern 3: Reporting with Branch Aggregation

```php
public function generateReport()
{
    $user = auth()->user();
    $service = app(BranchScopeService::class);
    
    // Get accessible branches
    $branchIds = $service->getAccessibleBranches($user);
    
    // Aggregate data within branch scope
    $report = DB::table('visits')
        ->whereIn('jail_id', function($query) use ($branchIds) {
            $query->select('id')->from('jails')->whereIn('branch_id', $branchIds);
        })
        ->selectRaw('DATE(scheduled_date) as date, COUNT(*) as total')
        ->groupBy('date')
        ->get();
    
    return $report;
}
```

## Performance Tips

### 1. Use Eager Loading

```php
// Good - avoids N+1 queries
Jail::with('dormitories.annexes.cells')->get();

// Better - specify only needed columns
Jail::with(['dormitories' => function($q) {
    $q->select('id', 'jail_id', 'name', 'type');
}])->get();
```

### 2. Index Foreign Keys

All foreign keys are already indexed:
- `branch_id` on `jails`, `users`
- `jail_id` on `dormitories`, `visit_sessions`, `visits`
- `annex_id` on `cells`
- `region_id` on `branches`

### 3. Cache Branch Hierarchies

For frequently accessed data:

```php
$branchData = Cache::remember(
    "branch_{$user->branch_id}_jails",
    3600,
    fn() => Jail::where('branch_id', $user->branch_id)->with('dormitories')->get()
);
```

## Testing Commands

```bash
# Run migrations
php artisan migrate

# Seed test data
php artisan db:seed --class=RegionBranchSeeder

# Test query scoping (Tinker)
php artisan tinker
>>> $user = App\Models\User::find(1);
>>> auth()->setUser($user);
>>> App\Models\Jail::count(); // Should respect branch scope
```

## Troubleshooting

### Issue: Global scope not applying

**Solution**: Verify the trait is used in the model:
```php
class MyModel extends Model
{
    use HasBranchScope; // or HasBranchScopeThroughRelation
}
```

### Issue: Relationship path incorrect

**Solution**: Check `$branchRelationshipPath` is defined correctly:
```php
class Cell extends Model
{
    use HasBranchScopeThroughRelation;
    
    protected string $branchRelationshipPath = 'jail'; // Must match method name
}
```

### Issue: Permission denied errors

**Solution**: Ensure user has correct role and branch assignment:
```php
// Check user configuration
dd(auth()->user()->load('role'), auth()->user()->branch_id);
```

## Security Best Practices

1. **Always validate in backend** - Never rely solely on frontend/UI filtering
2. **Use defense in depth** - Combine global scopes + service validation + middleware
3. **Test with different roles** - Verify scoping works for national, admin, and officer users
4. **Log unauthorized access** - Monitor attempts to access out-of-scope records
5. **Review query logs** - Ensure global scopes are being applied to SQL queries

---

This implementation provides comprehensive hierarchical data scoping that automatically filters all queries based on the authenticated user's role and branch assignment, ensuring data isolation and security across the entire application.
