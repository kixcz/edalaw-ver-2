# Jail Warden Facility Management Implementation

## Overview

Complete implementation of facility management modules for Jail Wardens with automatic branch/annex/dormitory linkage and scope-based officer assignment.

## Backend Implementation ✅ COMPLETE

### Controllers Created

#### 1. **AnnexManagementController** (`app/Http/Controllers/JailWarden/AnnexManagementController.php`)

**Features:**
- ✅ List all annexes in warden's branch
- ✅ Create annex (auto-assigns `branch_id` from logged-in warden)
- ✅ Update annex (with branch ownership verification)
- ✅ Delete annex (prevents deletion if has dormitories)
- ✅ Pagination support (10 per page)
- ✅ Includes dormitory and cell counts

**Key Security:**
```php
// Auto-assign branch ID
$validated['branch_id'] = $user->branch_id;

// Verify ownership before update/delete
if ($annex->branch_id !== $user->branch_id) {
    abort(403, 'Unauthorized action.');
}
```

#### 2. **DormitoryManagementController** (`app/Http/Controllers/JailWarden/DormitoryManagementController.php`)

**Features:**
- ✅ List all dormitories with their annex information
- ✅ Create dormitory (requires `annex_id` selection)
- ✅ Update dormitory (can change annex assignment)
- ✅ Delete dormitory (prevents deletion if has cells)
- ✅ Pagination support (10 per page)

**Key Logic:**
```php
// Verify annex belongs to warden's branch
$annex = Annex::where('id', $validated['annex_id'])
    ->where('branch_id', $user->branch_id)
    ->firstOrFail();
```

#### 3. **CellManagementController** (`app/Http/Controllers/JailWarden/CellManagementController.php`)

**Features:**
- ✅ List all cells with dormitory and annex hierarchy
- ✅ Create cell (requires `dormitory_id` selection)
- ✅ Update cell (can change dormitory assignment)
- ✅ Delete cell (prevents deletion if has inmates)
- ✅ Pagination support (15 per page)
- ✅ Unique cell_number validation

**Key Logic:**
```php
// Verify through full hierarchy: cell → dormitory → annex → branch
$dormitory = Dormitory::join('annexes', 'dormitories.annex_id', '=', 'annexes.id')
    ->where('dormitories.id', $validated['dormitory_id'])
    ->where('annexes.branch_id', $user->branch_id)
    ->firstOrFail();
```

### Routes Added (`routes/web.php`)

```php
// Annex Management
Route::get('jail-warden/annexes', [AnnexManagementController::class, 'index'])
    ->name('jail-warden.annexes.index');
Route::post('jail-warden/annexes', [AnnexManagementController::class, 'store'])
    ->name('jail-warden.annexes.store');
Route::put('jail-warden/annexes/{annex}', [AnnexManagementController::class, 'update'])
    ->name('jail-warden.annexes.update');
Route::delete('jail-warden/annexes/{annex}', [AnnexManagementController::class, 'destroy'])
    ->name('jail-warden.annexes.destroy');

// Dormitory Management
Route::get('jail-warden/dormitories', [DormitoryManagementController::class, 'index'])
    ->name('jail-warden.dormitories.index');
Route::post('jail-warden/dormitories', [DormitoryManagementController::class, 'store'])
    ->name('jail-warden.dormitories.store');
Route::put('jail-warden/dormitories/{dormitory}', [DormitoryManagementController::class, 'update'])
    ->name('jail-warden.dormitories.update');
Route::delete('jail-warden/dormitories/{dormitory}', [DormitoryManagementController::class, 'destroy'])
    ->name('jail-warden.dormitories.destroy');

// Cell Management
Route::get('jail-warden/cells', [CellManagementController::class, 'index'])
    ->name('jail-warden.cells.index');
Route::post('jail-warden/cells', [CellManagementController::class, 'store'])
    ->name('jail-warden.cells.store');
Route::put('jail-warden/cells/{cell}', [CellManagementController::class, 'update'])
    ->name('jail-warden.cells.update');
Route::delete('jail-warden/cells/{cell}', [CellManagementController::class, 'destroy'])
    ->name('jail-warden.cells.destroy');
```

All routes are protected by `role:jail_warden` middleware.

## Frontend Implementation 📝 TODO

### 1. Annex Management Page

**File:** `resources/js/Pages/JailWarden/AnnexManagement/Index.tsx` ✅ CREATED

**Components Needed:**
- ✅ Table listing all annexes with counts
- ✅ Create modal with form (name, description, status)
- ✅ Edit modal with pre-filled data
- ✅ Delete confirmation
- ✅ Pagination controls

**Form Fields:**
```typescript
{
    name: string (required),
    description: string (optional),
    status: 'active' | 'inactive'
}
```

### 2. Dormitory Management Page

**File:** `resources/js/Pages/JailWarden/DormitoryManagement/Index.tsx` ⏳ TODO

**Components Needed:**
- Table listing dormitories with annex info
- Create modal with annex dropdown
- Edit modal with annex selection
- Delete confirmation

**Form Fields:**
```typescript
{
    name: string (required),
    type: string (required), // e.g., 'male', 'female', 'juvenile'
    description: string (optional),
    status: 'active' | 'inactive',
    annex_id: number (required, dropdown from active annexes)
}
```

### 3. Cell Management Page

**File:** `resources/js/Pages/JailWarden/CellManagement/Index.tsx` ⏳ TODO

**Components Needed:**
- Table listing cells with dormitory & annex hierarchy
- Create modal with dormitory dropdown
- Edit modal with dormitory selection
- Delete confirmation

**Form Fields:**
```typescript
{
    cell_number: string (required, unique),
    capacity: number (1-100),
    status: 'active' | 'inactive',
    dormitory_id: number (required, dropdown from active dormitories)
}
```

### 4. Jail Officer Management Enhancement

**Current Location:** `resources/js/Pages/JailWarden/Dashboard.tsx` (Officers tab)

**Enhancement Needed:**
- Move to dedicated page: `JailWarden/OfficerManagement/Index.tsx`
- Add scope assignment UI with 3 levels:
  - 🏢 **Annex Level**: Dropdown of all annexes
  - 🛏️ **Dormitory Level**: Cascading dropdown (select annex → show dormitories)
  - 📍 **Cell Level**: Cascading dropdown (select annex → select dormitory → show cells)

**Scope Assignment Form:**
```typescript
{
    jail_officer_id: number,
    scope_type: 'annex' | 'dormitory' | 'cell',
    annex_id?: number,
    dormitory_id?: number,
    cell_id?: number
}
```

### 5. Sidebar Navigation Update

**File:** `resources/js/Components/Sidebar.tsx` or wherever the sidebar is defined

**Add Menu Items:**
```tsx
// Jail Warden Navigation Group
{
    group: 'Facility Management',
    items: [
        {
            name: 'Annex Management',
            href: route('jail-warden.annexes.index'),
            icon: '🏢',
        },
        {
            name: 'Dormitory Management',
            href: route('jail-warden.dormitories.index'),
            icon: '🛏️',
        },
        {
            name: 'Cell Management',
            href: route('jail-warden.cells.index'),
            icon: '📍',
        },
        {
            name: 'Jail Officers',
            href: route('dashboard.jail-warden'), // Or new officer management page
            icon: '👮',
        },
    ]
}
```

## Database Schema Reference

```sql
-- Hierarchy: Branch → Annex → Dormitory → Cell

annexes
├── id
├── branch_id → branches.id (auto-assigned from warden's branch)
├── name
├── description
├── status
└── timestamps

dormitories
├── id
├── annex_id → annexes.id (selected from dropdown)
├── name
├── type
├── description
├── status
└── timestamps

cells
├── id
├── dormitory_id → dormitories.id (selected from dropdown)
├── cell_number (unique)
├── capacity
├── status
└── timestamps
```

## Testing Checklist

### Annex Management
- [ ] Create annex → verify `branch_id` auto-assigned
- [ ] Update annex → verify ownership check
- [ ] Delete annex without dormitories → success
- [ ] Delete annex with dormitories → error message
- [ ] Pagination works correctly

### Dormitory Management
- [ ] Create dormitory → select annex from dropdown
- [ ] Verify only annexes from warden's branch shown
- [ ] Update dormitory → can change annex
- [ ] Delete dormitory without cells → success
- [ ] Delete dormitory with cells → error message

### Cell Management
- [ ] Create cell → select dormitory from dropdown
- [ ] Verify only dormitories from warden's branch shown
- [ ] Unique cell_number validation works
- [ ] Update cell → can change dormitory
- [ ] Delete cell without inmates → success
- [ ] Delete cell with inmates → error message

### Security Tests
- [ ] Jail warden from Branch A cannot access Branch B's annexes
- [ ] Unauthorized users cannot access management pages
- [ ] All write operations verify branch ownership

## Next Steps

1. **Create Dormitory Management Page** (follow Annex pattern)
2. **Create Cell Management Page** (follow Annex pattern)
3. **Enhance Officer Management** with scope assignment UI
4. **Update Sidebar** navigation
5. **Test Complete Flow**: Create Annex → Create Dormitory → Create Cell → Assign Officer

## Files Summary

### Backend (Complete ✅)
- `app/Http/Controllers/JailWarden/AnnexManagementController.php`
- `app/Http/Controllers/JailWarden/DormitoryManagementController.php`
- `app/Http/Controllers/JailWarden/CellManagementController.php`
- `routes/web.php` (updated with management routes)

### Frontend (In Progress 📝)
- `resources/js/Pages/JailWarden/AnnexManagement/Index.tsx` ✅
- `resources/js/Pages/JailWarden/DormitoryManagement/Index.tsx` ⏳
- `resources/js/Pages/JailWarden/CellManagement/Index.tsx` ⏳
- `resources/js/Pages/JailWarden/OfficerManagement/Index.tsx` ⏳
- `resources/js/Components/Sidebar.tsx` (needs update) ⏳

## Key Features Implemented

✅ **Automatic Branch Linking**: Every annex created is automatically assigned to the logged-in warden's branch

✅ **Hierarchical Linkage**: 
- Dormitories must belong to an annex
- Cells must belong to a dormitory
- All verified through branch ownership

✅ **Security**: Branch ownership verification on all CRUD operations

✅ **Cascade Prevention**: Cannot delete parent facilities with existing children

✅ **Pagination**: Efficient data loading with server-side pagination

✅ **Eager Loading**: Optimized queries with proper relationship loading
