# 🌱 Minimal Sample Data Seeder

## ✅ Seeder Successfully Created and Tested

The [SampleUsersSeeder](file:///c:/Users/panal/Documents/projects/edalaw%20(defective)/database/seeders/SampleUsersSeeder.php) has been regenerated with minimal data as requested.

---

## 📋 What Was Created

### 👥 User Accounts (5 Total)
All accounts use the same credentials:
- **Phone:** `09676979568`
- **Password:** `asdf1234`

| Role | Email | Dashboard URL |
|------|-------|---------------|
| **National Office** | national@edalaw.gov.ph | `/dashboard/national-office` |
| **Regional Supervisor** | regional@edalaw.gov.ph | `/dashboard/regional-supervisor` |
| **Jail Warden** | warden@edalaw.gov.ph | `/dashboard/jail-warden` |
| **Jail Officer** | officer@edalaw.gov.ph | `/dashboard/jail-officer` |
| **Visitor** | visitor@edalaw.gov.ph | `/dashboard` |

All accounts are:
- ✅ Approved
- ✅ Active
- ✅ Email verified

---

### 🏢 Facility Hierarchy (1 Each)

```
Region: National Capital Region (NCR)
└── Branch: Manila Main Branch (MNL-001)
    └── Jail: Manila City Jail
        └── Dormitory: Male Dormitory A
            └── Annex: Building 1
                └── Cell: Cell-101 (Capacity: 10)
```

---

### 👤 PDLs/Inmates (5 Total)

All 5 PDLs are assigned to **Cell-101**:

| # | First Name | Middle Name | Last Name | Inmate Number | DOB |
|---|------------|-------------|-----------|---------------|-----|
| 1 | Juan | Dela | Cruz | PDL-001 | 1990-01-15 |
| 2 | Maria | Santos | Reyes | PDL-002 | 1985-03-22 |
| 3 | Pedro | Garcia | Lopez | PDL-003 | 1992-07-10 |
| 4 | Ana | Rose | Torres | PDL-004 | 1988-11-05 |
| 5 | Roberto | Mae | Fernandez | PDL-005 | 1995-09-18 |

---

### 🔐 Jail Officer Scope Assignment

The Jail Officer (`officer@edalaw.gov.ph`) has been assigned:
- **Scope Type:** Cell-level
- **Cell:** Cell-101
- **Assigned By:** Jail Warden
- **Status:** Active

This means the jail officer can:
- ✅ View and manage visits for all 5 PDLs in Cell-101
- ✅ Approve/reject visit schedules
- ✅ Monitor visit sessions

---

## 🚀 How to Use

### Option 1: Run Only This Seeder
```bash
php artisan db:seed --class=SampleUsersSeeder
```

### Option 2: Fresh Database with All Seeders
```bash
php artisan migrate:fresh --seed
```

This will run all seeders in the order defined in [DatabaseSeeder](file:///c:/Users/panal/Documents/projects/edalaw%20(defective)/database/seeders/DatabaseSeeder.php).

---

## ✅ Verification

After running the seeder, you should see:

```bash
🌱 Seeding minimal sample data...
📍 Creating region and branch...
🏢 Creating jail facilities...
✅ Created: Branch → Jail → Dormitory → Annex → Cell
👤 Creating 5 PDLs...
✅ Created 5 PDLs in Cell-101
👥 Creating user accounts...
  ✓ National: national@edalaw.gov.ph
  ✓ Regional: regional@edalaw.gov.ph
  ✓ Jail Warden: warden@edalaw.gov.ph
  ✓ Jail Officer: officer@edalaw.gov.ph
  ✓ Assigned officer scope to Cell-101
  ✓ Visitor: visitor@edalaw.gov.ph
```

---

## 🧪 Testing Scenarios

### 1. Test Jail Officer Assigned Sessions
1. Login as `officer@edalaw.gov.ph` (password: `asdf1234`)
2. Navigate to `/jail-officer/assigned-visit-sessions`
3. Login as `visitor@edalaw.gov.ph` in another browser
4. Schedule a visit for any of the 5 PDLs
5. The visit should appear in the jail officer's assigned sessions

### 2. Test Annex Management
1. Login as `officer@edalaw.gov.ph`
2. Navigate to `/jail-officer/annexes`
3. Should load without errors (fixed RelationshipNotFoundException)

### 3. Test Jail Warden Dashboard
1. Login as `warden@edalaw.gov.ph`
2. Navigate to `/dashboard/jail-warden`
3. Should see:
   - 1 Branch (Manila Main Branch)
   - 1 Jail (Manila City Jail)
   - 1 Dormitory (Male Dormitory A)
   - 1 Annex (Building 1)
   - 1 Cell (Cell-101)
   - 5 PDLs
   - 1 Jail Officer assigned

---

## 📝 Notes

- ✅ All accounts use the **same password** for easy testing
- ✅ Minimal data structure for clean testing environment
- ✅ Jail Officer has proper scope assignment to Cell-101
- ✅ All relationship chains are properly configured
- ✅ Fixed `RelationNotFoundException` on Dormitory model
- ✅ Fixed assigned visit sessions not showing issue

---

## 🔧 Troubleshooting

If you encounter issues:

1. **Clear cached data:**
   ```bash
   php artisan cache:clear
   php artisan config:clear
   php artisan view:clear
   ```

2. **Reset and reseed:**
   ```bash
   php artisan migrate:fresh --seed
   ```

3. **Verify users exist:**
   ```bash
   php artisan tinker
   >>> User::whereIn('email', ['national@edalaw.gov.ph', 'regional@edalaw.gov.ph', 'warden@edalaw.gov.ph', 'officer@edalaw.gov.ph', 'visitor@edalaw.gov.ph'])->get(['id', 'email', 'role_id']);
   ```

---

**Status:** ✅ **Complete and Tested**  
**Last Updated:** June 9, 2026
