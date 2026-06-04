# Cell Management Module - Hierarchical Flow Update

## Changes Implemented

### Overview
Modified the cell management flow to enforce hierarchical selection: **Jail → Dormitory → Annex/Building → Cell**

### Backend Changes

#### `app/Http/Controllers/JailOfficer/CellManagementController.php`
**Updated dropdown data loading:**
- Removed `active()` scope from jails, dormitories, and annexes queries
- Removed filter conditions that were limiting dropdowns based on current filters
- Now loads ALL records for dropdowns to ensure options are always available

```php
// Before:
$jails = Jail::active()->orderBy('name')->get(['id', 'name', 'code']);
$dormitories = Dormitory::active()
    ->when($jailId, fn($q) => $q->where('jail_id', $jailId))
    ->with('jail')
    ->orderBy('name')
    ->get(['id', 'jail_id', 'name']);
$annexes = Annex::active()
    ->when($dormitoryId, fn($q) => $q->where('dormitory_id', $dormitoryId))
    ->with('dormitory')
    ->orderBy('name')
    ->get(['id', 'dormitory_id', 'name']);

// After:
$jails = Jail::orderBy('name')->get(['id', 'name', 'code']);
$dormitories = Dormitory::with('jail')
    ->orderBy('name')
    ->get(['id', 'jail_id', 'name']);
$annexes = Annex::with('dormitory')
    ->orderBy('name')
    ->get(['id', 'dormitory_id', 'name']);
```

### Frontend Changes

#### `resources/js/pages/BjmpOfficer/CellManagement.tsx`

**1. Updated Type Definitions:**
- Added nested hierarchy to `Cell` type (`annex.dormitory.jail`)
- Added `Jail`, `Dormitory`, and `Annex` types
- Updated `Props` to include `jails`, `dormitories`, and `annexes` arrays
- Updated `filters` to include `jail_id`, `dormitory_id`, and `annex_id`

**2. Enhanced State Management:**
- Added state for hierarchical filters: `jailFilter`, `dormitoryFilter`, `annexFilter`
- Updated forms to include `jail_id` and `dormitory_id` fields

**3. Updated DataTable Columns:**
- Added new "Location" column showing full hierarchy:
  - Annex name
  - Dormitory name
  - Jail name (in parentheses)

**4. Enhanced Filter Section:**
- Added cascading dropdown filters:
  - Jail filter
  - Dormitory filter (filtered by selected jail)
  - Annex filter (filtered by selected dormitory)
  - Status filter
- Filters update automatically when parent changes

**5. Create Modal - Hierarchical Dropdowns:**
Added three-level cascading dropdown:
1. **Jail dropdown** - Shows all jails
2. **Dormitory dropdown** - Shows only dormitories under selected jail (disabled until jail selected)
3. **Annex/Building dropdown** - Shows only annexes under selected dormitory (disabled until dormitory selected)

**Features:**
- Auto-clears child selections when parent changes
- Disabled state enforcement (can't select dormitory without jail, can't select annex without dormitory)
- Real-time filtering based on parent selection
- Validation error display for required annex field

**6. Edit Modal - Hierarchical Dropdowns:**
Same cascading dropdown structure as create modal, with:
- Pre-populated values from selected cell
- Shows current location in hierarchy
- Allows changing location at any level

**7. Updated Search Function:**
- Includes hierarchical filters in search parameters
- Preserves filter state across searches

## User Flow

### Creating a Cell

1. Click "Add Cell" button
2. **Select Jail** from dropdown
3. **Select Dormitory** (only dormitories under selected jail appear)
4. **Select Annex/Building** (only annexes under selected dormitory appear)
5. Enter **Cell Number** (e.g., "Cell 1", "A-101")
6. Enter **Capacity** (1-50)
7. Select **Status** (Active/Inactive)
8. Click "Create Cell"

### Editing a Cell

1. Click actions menu (⋮) on a cell row
2. Click "Edit"
3. Can change **Jail**, **Dormitory**, or **Annex** using cascading dropdowns
4. Can modify **Cell Number**, **Capacity**, or **Status**
5. Click "Update Cell"

### Filtering Cells

Use the filter dropdowns above the table:
- **Filter by Jail** → Shows cells in that jail
- **Filter by Dormitory** → Shows cells in that dormitory (within selected jail)
- **Filter by Annex** → Shows cells in that annex (within selected dormitory)
- **Filter by Status** → Shows active/inactive cells

## Visual Changes

### Table View
**Before:**
- Cell Number
- Capacity
- Current Inmates
- Status
- Actions

**After:**
- **Location** (NEW) - Shows full hierarchy path
- Cell Number
- Capacity
- Current Inmates
- Status
- Actions

### Create/Edit Modals
**Before:**
- Cell Number
- Capacity
- Status

**After:**
- **Jail** (NEW - Required)
- **Dormitory** (NEW - Required)
- **Annex/Building** (NEW - Required)
- Cell Number
- Capacity
- Status

## Benefits

1. **Clear Hierarchy** - Enforces proper facility structure
2. **Prevents Errors** - Can't create cell without valid location
3. **Better Organization** - Easy to see where cells are located
4. **Flexible Filtering** - Filter by any level of hierarchy
5. **Easy Transfer** - Can move cells between locations

## Build Output

```
public/build/assets/CellManagement-C8EMitHD.js (13.31 kB)
```

## Testing Checklist

- [ ] Create a cell with full hierarchy selection
- [ ] Edit a cell and change its location
- [ ] Filter cells by jail
- [ ] Filter cells by dormitory
- [ ] Filter cells by annex
- [ ] Verify dropdown cascading works correctly
- [ ] Verify disabled states work properly
- [ ] Check validation errors display correctly
