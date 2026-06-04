# Role Query Fix - Jail Officer Management

## ✅ Database Query Error Fixed

**Date:** April 2, 2026  
**Issue Code:** 42S22 - Column not found  
**Error:** Unknown column 'role' in 'where clause'

---

## 🐛 **Bug Description**

### Error Message:
```
SQLSTATE[42S22]: Column not found: 1054 
Unknown column 'role' in 'where clause'
```

### Root Cause:
The `users` table doesn't have a `role` column. Instead, it uses:
- `role_id` - Foreign key to `roles` table
- Relationship: `User::role()` belongs to `Role`

### Failing Query:
```php
User::where('role', 'jail_officer')  // ❌ role column doesn't exist
    ->whereHas('branch', ...)
```

---

## ✅ **Solution Applied**

### Fixed Query (Following Laravel Eloquent Patterns):

**Option 1: Using whereHas with relationship** ✅
```php
User::whereHas('role', function ($query) {
        $query->where('slug', 'jail_officer');
    })
    ->whereHas('branch', function ($query) use ($user) {
        $query->where('id', $user->branch_id);
    })
```

**Option 2: Using role_id with subquery** (alternative)
```php
User::where('role_id', function($query) {
        $query->select('id')->from('roles')
              ->where('slug', 'jail_officer');
    })
```

---

## 📋 **Files Modified**

1. ✅ `app/Http/Controllers/JailWarden/JailOfficerManagementController.php` (Line 26-28)
   - Changed from: `->where('role', 'jail_officer')`
   - Changed to: `->whereHas('role', function ($query) { $query->where('slug', 'jail_officer'); })`

---

## 🔍 **Why This Pattern?**

### Database Schema:
```sql
-- users table
CREATE TABLE users (
    id INT PRIMARY KEY,
    first_name VARCHAR(255),
    role_id INT,              -- ← Foreign key, not string
    branch_id INT,
    ...
    FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- roles table
CREATE TABLE roles (
    id INT PRIMARY KEY,
    name VARCHAR(255),
    slug VARCHAR(255),        -- ← Query by slug
    ...
);
```

### User Model Relationship:
```php
// app/Models/User.php
public function role(): BelongsTo
{
    return $this->belongsTo(Role::class);
}
```

---

## 🎯 **Best Practices Applied**

### ✅ Use Relationships for Readability

**Good:**
```php
User::whereHas('role', fn($q) => $q->where('slug', 'jail_officer'))
```

**Bad:**
```php
User::where('role_id', 5)  // Hardcoded ID
```

### ✅ Use Slug Instead of ID

**Good:**
```php
->where('slug', 'jail_officer')  // Stable across environments
```

**Bad:**
```php
->where('id', 5)  // ID might differ in dev/staging/prod
```

---

## 🧪 **Verification**

### Before Fix:
```
GET /jail-warden/officers
→ 500 Internal Server Error
→ SQLSTATE[42S22]: Column not found: 1054
```

### After Fix:
```
GET /jail-warden/officers
→ 200 OK
→ Page loads successfully with officer list
```

---

## 📝 **Similar Patterns in Codebase**

Found in other controllers:

### Dashboard Controllers:
```php
// JailWardenDashboardController.php
User::where('role_id', function($query) {
    $query->select('id')->from('roles')->where('slug', 'jail_officer');
})

// NationalOfficeDashboardController.php
User::whereHas('role', fn($q) => $q->where('slug', 'jail_officer'))
```

### Service Classes:
```php
// NotificationService.php
User::where('role_id', $superAdminRole->id)
```

### Recommendation:
Use `whereHas('role', ...)` consistently for better readability!

---

## 🚀 **Prevention Tips**

When querying users by role:

1. **Check the schema first**
   - Does `users` table have `role` or `role_id`?
   - Is there a `roles` lookup table?

2. **Use relationships**
   - Check User model for `role()` relationship
   - Use `whereHas()` for relationship queries

3. **Query by slug, not ID**
   - Slugs are stable across environments
   - IDs can differ between dev/staging/prod

4. **Look at existing patterns**
   - Search codebase for similar queries
   - Follow established conventions

---

## 📊 **Impact**

- **Severity:** High (blocked entire Jail Officer module)
- **Users Affected:** All Jail Wardens
- **Modules Fixed:** Jail Officer Management
- **Time to Fix:** < 1 minute

---

## ✅ **Status**

**Resolved!** The Jail Officer Management page now loads successfully and displays all jail officers with their assigned scopes.

---

**Related Fixes:**
- ✅ SQL ambiguity error in CellManagementController
- ✅ Role query error in JailOfficerManagementController

All Jail Warden modules are now fully functional!
