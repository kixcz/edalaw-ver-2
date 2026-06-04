# Jail Warden & Scope Assignment System

## Overview

The E-Dalaw system now includes a **Jail Warden** role that serves as the head of each BJMP branch facility. The Jail Warden has the authority to assign Jail Officers to specific scope levels (Annex, Dormitory, or Cell) within their facility.

---

## 🏛️ Organizational Hierarchy

```
National Office (Unrestricted Access)
├── Region I (Ilocos Region)
│   └── Branch 1 (Laoag)
│       ├── Jail Warden (Head of Facility)
│       ├── Super Admin (Branch Manager)
│       └── Jail Officers (Assigned to specific scopes)
│           ├── Annex Level Officer
│           ├── Dormitory Level Officer
│           └── Cell Level Officer
```

---

## 👥 New User Roles

### 1. **Jail Warden** (`jail_warden`)
- **Role**: Head of the entire BJMP branch facility
- **Access**: Full branch-level access (same as Super Admin)
- **Responsibilities**:
  - Overall facility management
  - Assign Jail Officers to scope levels
  - Manage annexes, dormitories, and cells
  - Oversee all operations within the branch

### 2. **Jail Officer with Scopes** (`jail_officer`)
- **Role**: Operational officer with restricted access based on assignment
- **Scope Levels**:
  - **Annex Level**: Can access all dormitories and cells within assigned annex
  - **Dormitory Level**: Can access only the assigned dormitory and its cells
  - **Cell Level**: Can access only the assigned cell and its PDLs

---

## 🔐 Scope Assignment System

### Database Schema

**Table: `jail_officer_scopes`**
```sql
- id (primary key)
- jail_officer_id (FK → users) - The assigned JO
- assigned_by (FK → users) - Jail Warden who assigned
- scope_type (enum: 'annex', 'dormitory', 'cell')
- annex_id (FK → annexes, nullable)
- dormitory_id (FK → dormitories, nullable)
- cell_id (FK → cells, nullable)
- is_active (boolean)
- timestamps
```

### Scope Level Examples

#### **Annex-Level Assignment**
```php
// Jail Officer can access:
// - All dormitories in Building A
// - All cells within those dormitories
// - All PDLs in those cells

Scope: annex
Annex: Building A
Dormitories: Male Dorm 1, Female Dorm 1, Juvenile Dorm 1
Cells: 10+ cells across all dorms
```

#### **Dormitory-Level Assignment**
```php
// Jail Officer can access:
// - Only Male Dormitory 1
// - All cells within Male Dorm 1
// - All PDLs in those cells

Scope: dormitory
Dormitory: Male Dormitory 1
Cells: 4-5 cells inside this dorm
```

#### **Cell-Level Assignment**
```php
// Jail Officer can access:
// - Only Cell 101-A
// - Only PDLs assigned to Cell 101-A

Scope: cell
Cell: 101-A
PDLs: 15-20 inmates in this cell
```

---

## 🎯 Automatic Visit Assignment Logic

When a visitor schedules a visit to a specific PDL:

1. System identifies the PDL's current cell assignment
2. Finds the Jail Officer with active scope covering that cell
3. Automatically assigns that JO as the monitoring officer for the visit

### Flow Diagram
```
Visitor Schedules Visit
    ↓
System checks PDL's cell location
    ↓
Find JO with matching scope:
  - If PDL in Cell 101-A → Find JO assigned to Cell 101-A
  - If PDL in Cell 101-A but no cell-level JO → Find JO assigned to Dorm containing Cell 101-A
  - If no dorm-level JO → Find JO assigned to Annex containing that Dorm
    ↓
Assign JO to visit session
```

---

## 📋 Updated Credentials

### National Office
```
Email: national@edalaw.gov.ph
Password: password
Access: ALL branches, ALL jails, ALL data
```

### Jail Wardens (One per Branch)
```
Region I:
- warden.LAO-001@edalaw.gov.ph (Laoag)
- warden.VIG-001@edalaw.gov.ph (Vigan)
- warden.SF-001@edalaw.gov.ph (San Fernando)

NCR:
- warden.MNL-001@edalaw.gov.ph (Manila Main)
- warden.QC-001@edalaw.gov.ph (Quezon City)
- warden.MKT-001@edalaw.gov.ph (Makati)
- warden.PSG-001@edalaw.gov.ph (Pasig)

Region VII:
- warden.CEB-001@edalaw.gov.ph (Cebu)
- warden.BOH-001@edalaw.gov.ph (Bohol)
- warden.NE-001@edalaw.gov.ph (Negros Oriental)

Region III:
- warden.ANG-001@edalaw.gov.ph (Angeles)
- warden.SFP-001@edalaw.gov.ph (San Fernando Pampanga)
- warden.TRL-001@edalaw.gov.ph (Tarlac)

Password: password (for all)
Access: Full branch management + scope assignments
```

### Super Admins (Same as before)
```
superadmin.{BRANCH_CODE}@edalaw.gov.ph
Password: password
Access: Branch-level analytics and reports
```

### Jail Officers (With Scope Assignments)
```
officer1.{BRANCH_CODE}@edalaw.gov.ph
officer2.{BRANCH_CODE}@edalaw.gov.ph
officer3.{BRANCH_CODE}@edalaw.gov.ph
officer4.{BRANCH_CODE}@edalaw.gov.ph

Password: password (for all)
Access: Depends on assigned scope (annex/dorm/cell level)
```

---

## 🗂️ Data Access Matrix

| Role | National | Branch | Jail | Annex | Dorm | Cell | PDLs |
|------|----------|--------|------|-------|------|------|------|
| **National Office** | ✅ All Regions | ✅ All Branches | ✅ All Jails | ✅ All | ✅ All | ✅ All | ✅ All |
| **Super Admin** | ❌ | ✅ Their Branch | ✅ Branch Jails | ✅ Branch | ✅ Branch | ✅ Branch | ✅ Branch PDLs |
| **Jail Warden** | ❌ | ✅ Their Branch | ✅ Branch Jails | ✅ Branch | ✅ Branch | ✅ Branch | ✅ Branch PDLs |
| **JO (Annex)** | ❌ | ❌ | ❌ | ✅ Assigned Annex | ✅ Annex Dorms | ✅ Annex Cells | ✅ Annex PDLs |
| **JO (Dorm)** | ❌ | ❌ | ❌ | ❌ | ✅ Assigned Dorm | ✅ Dorm Cells | ✅ Dorm PDLs |
| **JO (Cell)** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Assigned Cell | ✅ Cell PDLs |

---

## 🔧 Implementation Files

### Models
- `app/Models/JailOfficerScope.php` - Scope assignment model
- `app/Models/User.php` - Updated with scope relationships
- `app/Models/Cell.php` - Added scoping support
- `app/Models/Dormitory.php` - Added scoping support
- `app/Models/Annex.php` - Added scoping support

### Seeders
- `database/seeders/RoleSeeder.php` - Added Jail Warden role
- `database/seeders/HierarchicalUserSeeder.php` - Creates Wardens per branch
- `database/seeders/JailOfficerScopeSeeder.php` - Assigns scopes to JOs

### Migrations
- `2026_04_02_000009_create_jail_officer_scopes_table.php` - Scope assignments table

### Traits
- `app/Traits/HasBranchScope.php` - Updated to handle jail_id filtering
- `app/Traits/HasBranchScopeThroughRelation.php` - For deeper hierarchy scoping

---

## 🚀 Usage Examples

### Jail Warden Assigning Scope

```php
use App\Models\JailOfficerScope;
use App\Models\User;
use App\Models\Cell;

// Get the Jail Warden
$warden = User::where('email', 'warden.MNL-001@edalaw.gov.ph')->first();

// Get a Jail Officer
$officer = User::where('email', 'officer1.MNL-001@edalaw.gov.ph')->first();

// Get a specific cell
$cell = Cell::find(123);

// Assign officer to cell-level scope
JailOfficerScope::create([
    'jail_officer_id' => $officer->id,
    'assigned_by' => $warden->id,
    'scope_type' => 'cell',
    'cell_id' => $cell->id,
    'is_active' => true,
]);
```

### Finding JO for a PDL's Cell

```php
use App\Models\Inmate;
use App\Models\JailOfficerScope;

// Get the inmate
$inmate = Inmate::with('cell.annex.dormitory')->find($inmateId);

// Find assigned JO (priority: cell → dorm → annex)
$assignedJO = JailOfficerScope::active()
    ->where('cell_id', $inmate->cell_id)
    ->orWhere('dormitory_id', $inmate->cell->annex->dormitory_id)
    ->orWhere('annex_id', $inmate->cell->annex_id)
    ->first()?->jailOfficer;
```

---

## ⚙️ Commands

### Re-seed Everything (Fresh Start)
```bash
php artisan migrate:fresh --seed
```

### Seed Only Scope Assignments
```bash
php artisan db:seed --class=JailOfficerScopeSeeder
```

### Seed Only Users (with Wardens)
```bash
php artisan db:seed --class=HierarchicalUserSeeder
```

---

## 📊 Current Seeded Data

After running the seeders:
- ✅ 13 Jail Wardens (one per branch)
- ✅ 13 Super Admins (one per branch)
- ✅ ~52 Jail Officers with scope assignments
  - Mix of annex, dormitory, and cell-level assignments
  - All assignments made by respective Jail Wardens

---

## 🎯 Next Steps

1. **Create UI for Jail Wardens** to manage scope assignments
2. **Build National Office Dashboard** showing all 13 branches
3. **Update Super Admin Dashboard** to show only their branch data
4. **Implement automatic visit-to-JO assignment** based on PDL location
5. **Create JO Dashboard** showing only their assigned scope data

---

## 🔍 Testing Scenarios

### Scenario 1: National Office View
```bash
Login: national@edalaw.gov.ph
Expected: See all 13 branches, 30 jails, all visits, all JOs
```

### Scenario 2: Jail Warden Management
```bash
Login: warden.MNL-001@edalaw.gov.ph
Expected: 
  - Full Manila Main Branch access
  - Can assign JOs to scopes
  - Can manage all facilities in branch
```

### Scenario 3: Super Admin Analytics
```bash
Login: superadmin.MNL-001@edalaw.gov.ph
Expected:
  - See only Manila Main Branch data
  - Branch-level reports and analytics
  - Cannot see other branches
```

### Scenario 4: Jail Officer (Cell-Level)
```bash
Login: officer1.MNL-001@edalaw.gov.ph
Expected:
  - See only assigned cell/dorm/annex data
  - Only PDLs in their scope
  - Only visits involving their PDLs
```

---

## 📝 Notes

- Jail Wardens and Super Admins have the same access level (branch-wide)
- Scope assignments are **hierarchical**: Cell ⊂ Dorm ⊂ Annex
- Multiple JOs can be assigned to the same scope
- JOs can have multiple active scope assignments
- Visits are automatically assigned to the JO responsible for the PDL's location
