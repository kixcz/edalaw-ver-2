# PDL Management Module for Jail Warden

## ✅ Implementation Complete

**Date:** April 2, 2026  
**Status:** COMPLETE ✅

---

## 🎯 **Module Purpose**

The PDL (Person Deprived of Liberty) Management module allows Jail Wardens to:
- ✅ View all inmates/PDLs in their branch
- ✅ See complete location hierarchy (Cell → Dormitory → Annex)
- ✅ Search by name or inmate number
- ✅ Monitor PDL status and demographics
- ✅ Track age and date of birth information

---

## 📊 **Complete Jail Warden Navigation Structure**

```
🏛️ Jail Warden Dashboard
│
├─ 📋 Main
│  └─ Dashboard
│
├─ 🏢 Facility Management
│  ├─ Annex
│  ├─ Dormitory
│  └─ Cell
│
├─ 👥 Inmate Management (NEW!)
│  └─ PDLs
│
├─ 👮 Personnel
│  └─ Jail Officers
│
└─ ⚙️ Configuration
   └─ Settings
```

---

## 🆕 **What Was Created**

### 1. Backend Controller
**File:** `app/Http/Controllers/JailWarden/PdlManagementController.php`

**Features:**
```php
public function index(Request $request)
```

**Functionality:**
- ✅ Queries inmates through facility hierarchy
- ✅ Filters by warden's branch_id (security)
- ✅ Eager loads cell, dormitory, and annex relationships
- ✅ Paginates results (15 per page)
- ✅ Transforms data for frontend consumption

**Query Logic:**
```php
Inmate::join('cells', 'inmates.cell_id', '=', 'cells.id')
    ->join('dormitories', 'cells.dormitory_id', '=', 'dormitories.id')
    ->join('annexes', 'dormitories.annex_id', '=', 'annexes.id')
    ->where('annexes.branch_id', $user->branch_id)
    ->with(['cell', 'cell.dormitory', 'cell.dormitory.annex'])
    ->orderBy('last_name')
    ->orderBy('first_name')
    ->paginate(15)
```

---

### 2. Frontend Page
**File:** `resources/js/Pages/JailWarden/PdlManagement/Index.tsx`

**Features:**
- ✅ DataTable with pagination
- ✅ Search functionality (by name or number)
- ✅ Displays full name (Last, First format)
- ✅ Shows complete location hierarchy
- ✅ Age calculation from DOB
- ✅ Status badges (active/inactive)
- ✅ Responsive design

**Table Columns:**

| Column | Description |
|--------|-------------|
| **PDL Number** | Inmate ID number (monospace font) |
| **Full Name** | Last name, First name + middle name |
| **Date of Birth** | Formatted date + calculated age |
| **Status** | Badge showing active/inactive |
| **Location** | Cell → Dormitory → Annex hierarchy |

---

### 3. Route Configuration
**File:** `routes/web.php`

**New Route:**
```php
Route::get('jail-warden/pdls', [
    \App\Http\Controllers\JailWarden\PdlManagementController::class, 
    'index'
])->name('jail-warden.pdls.index');
```

---

## 🎨 **User Interface**

### Main Page Layout:
```
┌─────────────────────────────────────────────────────┐
│ 👥 PDL Management                                   │
│ View all Persons Deprived of Liberty in your branch│
├─────────────────────────────────────────────────────┤
│ [🔍 Search by name or number...]                    │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ PDL # │ Name         │ DOB   │ Status │ Location│ │
│ ├───────┼──────────────┼───────┼────────┼─────────┤ │
│ │ 12345 │ DELA CRUZ,   │ Jan 1 │ Active │ 📍 Cell │ │
│ │       │ Juan Santos  │ 1990  │ ●      │ 🏢 Dorm │ │
│ │       │              │ 36 yo │        │ 🏛️ Annex│ │
│ └───────┴──────────────┴───────┴────────┴─────────┘ │
│                                                     │
│                  Pagination Controls                │
└─────────────────────────────────────────────────────┘
```

---

## 🔍 **Search Functionality**

### Searchable Fields:
- ✅ PDL Number (inmate_number)
- ✅ First Name
- ✅ Middle Name
- ✅ Last Name

### How It Works:
```typescript
const [globalFilter, setGlobalFilter] = useState('');

// DataTable component receives:
<DataTable
    columns={columns}
    data={inmates.data || []}
    globalFilter={globalFilter}
    onGlobalFilterChange={setGlobalFilter}
/>
```

---

## 📊 **Data Display Format**

### Full Name Display:
```
Format: LAST_NAME, FIRST_NAME MIDDLE_NAME

Example:
DELA CRUZ, Juan Santos
```

### Location Hierarchy:
```
📍 Cell: A-101
🏢 Dormitory: Male Dormitory A
🏛️ Annex: Main Building
```

### Date of Birth:
```
Display: 01/15/1990
Age: 36 years old
```

---

## 🔒 **Security Features**

### Branch Isolation:
```php
// Only inmates from warden's branch
Inmate::join('cells', ...)
    ->join('dormitories', ...)
    ->join('annexes', ...)
    ->where('annexes.branch_id', $user->branch_id)
```

### Why This Works:
- Inmates are linked to cells
- Cells belong to dormitories
- Dormitories belong to annexes
- Annexes belong to branches
- Query filters by warden's branch_id

---

## 🧪 **Testing Checklist**

### Access PDL Module:
1. ✅ Login as Jail Warden
2. ✅ Click "PDLs" under "Inmate Management" in sidebar
3. ✅ Verify page loads at `/jail-warden/pdls`
4. ✅ Verify table shows all inmates in branch

### Search Functionality:
1. ✅ Type a name in search box
2. ✅ Table filters in real-time
3. ✅ Search by last name works
4. ✅ Search by first name works
5. ✅ Search by PDL number works

### Data Display:
1. ✅ Names show as "LAST, First Middle"
2. ✅ Dates formatted correctly
3. ✅ Ages calculated correctly
4. ✅ Location hierarchy complete
5. ✅ Status badges colored properly

### Pagination:
1. ✅ If >15 inmates, pagination appears
2. ✅ Can navigate between pages
3. ✅ Page numbers display correctly

---

## 📝 **Database Schema**

### Inmates Table:
```sql
CREATE TABLE inmates (
    id INT PRIMARY KEY,
    inmate_number VARCHAR(50) UNIQUE,
    first_name VARCHAR(255),
    middle_name VARCHAR(255),
    last_name VARCHAR(255),
    cell_id INT,
    date_of_birth DATE,
    status VARCHAR(20),
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    
    FOREIGN KEY (cell_id) REFERENCES cells(id)
);
```

### Relationships:
```
Inmate (cell_id)
  ↓
Cell (id, dormitory_id)
  ↓
Dormitory (id, annex_id)
  ↓
Annex (id, branch_id)
  ↓
Branch (id) ← Filtered by warden's branch_id
```

---

## 🎯 **Key Features**

### ✅ Read-Only View
Currently, PDL management is view-only. This is intentional because:
- Jail Wardens need oversight of all inmates
- Data entry handled by BJMP officers
- Prevents accidental modifications
- Maintains data integrity

### ✅ Comprehensive Information
Each PDL record shows:
- **Identity**: Full name with middle name
- **ID Number**: Unique inmate number
- **Demographics**: Date of birth and age
- **Status**: Active/inactive status
- **Location**: Complete facility hierarchy

### ✅ Easy Navigation
- Breadcrumb navigation
- Search for specific inmates
- Pagination for large lists
- Sortable columns

---

## 🚀 **Future Enhancements (Optional)**

Potential features that could be added:

### 1. Edit Capability
- Add/edit PDL information
- Transfer between cells
- Update status

### 2. Advanced Filtering
- Filter by cell/dormitory/annex
- Filter by status
- Filter by date range

### 3. Bulk Actions
- Bulk transfer inmates
- Bulk status updates
- Export to CSV/PDF

### 4. Statistics
- Total inmates per cell
- Occupancy rates
- Population trends

### 5. Quick Actions
- View visit history
- View e-burol requests
- View incident reports

---

## 📊 **Current State**

✅ **All Jail Warden Modules Complete:**

| Module | Route | Status |
|--------|-------|--------|
| Dashboard | `/dashboard/jail-warden` | ✅ Complete |
| Annex Management | `/jail-warden/annexes` | ✅ Complete |
| Dormitory Management | `/jail-warden/dormitories` | ✅ Complete |
| Cell Management | `/jail-warden/cells` | ✅ Complete |
| **PDL Management** | `/jail-warden/pdls` | ✅ **NEW!** |
| Jail Officer Management | `/jail-warden/officers` | ✅ Complete |
| Settings | `/settings` | ✅ Complete |

---

## 🔗 **Related Documentation**

- [`JAIL_WARDEN_FACILITY_MANAGEMENT_IMPLEMENTATION.md`](./JAIL_WARDEN_FACILITY_MANAGEMENT_IMPLEMENTATION.md)
- [`JAIL_OFFICER_MANAGEMENT_MODULE.md`](./JAIL_OFFICER_MANAGEMENT_MODULE.md)
- [`JAIL_WARDEN_SIDEBAR_UPDATE.md`](./JAIL_WARDEN_SIDEBAR_UPDATE.md)

---

**Status:** ✅ COMPLETE

The Jail Warden now has a complete PDL Management module with full visibility into all inmates across their branch!
