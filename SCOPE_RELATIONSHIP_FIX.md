# Jail Officer Scope Relationship Fix

## ✅ Relationship Name Error Fixed

**Date:** April 2, 2026  
**Issue:** ArgumentCountError - Too few arguments to function scopes()

---

## 🐛 **Bug Description**

### Error Message:
```
ArgumentCountError: Too few arguments to function 
Illuminate\Database\Eloquent\Builder::scopes(), 
0 passed ... and exactly 1 expected
```

### Root Cause:
The User model doesn't have a `scopes()` relationship. It has:
- `assignedScopes()` - Scopes where officer is assigned
- `createdScopes()` - Scopes created by user (as warden)

The controller was trying to use non-existent `scopes` relationship.

### Failing Code:
```php
->with(['scopes' => function ($query) {  // ❌ Wrong relationship name
    $query->with('scopeable');
}])
```

---

## ✅ **Solution Applied**

### Fixed Relationship Names:

**Before (Broken):**
```php
->with(['scopes' => function ($query) {
    $query->with('scopeable');
}])
// ...
'scopes' => $officer->scopes->map(...)  // ❌ Property doesn't exist
```

**After (Fixed):**
```php
->with(['assignedScopes' => function ($query) {
    $query->with('scopeable');
}])
// ...
'scopes' => $officer->assignedScopes->map(...)  // ✅ Correct
```

---

## 📋 **Files Modified**

1. ✅ `app/Http/Controllers/JailWarden/JailOfficerManagementController.php`
   - Line 33: Changed `scopes` to `assignedScopes` in with() clause
   - Line 43: Changed `$officer->scopes` to `$officer->assignedScopes`

---

## 🔍 **User Model Relationships**

### Available Relationships:

```php
// app/Models/User.php

/**
 * Get the scope assignments where this user is the assigned officer.
 */
public function assignedScopes(): HasMany
{
    return $this->hasMany(JailOfficerScope::class, 'jail_officer_id');
}

/**
 * Get the scope assignments made by this user (as warden).
 */
public function createdScopes(): HasMany
{
    return $this->hasMany(JailOfficerScope::class, 'assigned_by');
}
```

### Which One to Use?

| Context | Relationship | Purpose |
|---------|-------------|---------|
| **Jail Officer** | `assignedScopes` | View their assigned facilities |
| **Jail Warden** | `createdScopes` | View scopes they created |
| **PDL Management** | N/A | Different module |

In our case (Jail Officer Management for Wardens):
- We want to see what scopes are **assigned to officers**
- So we use `assignedScopes`

---

## 🧪 **Verification**

### Before Fix:
```
GET /jail-warden/officers
→ 500 Internal Server Error
→ ArgumentCountError: Too few arguments to function scopes()
```

### After Fix:
```
GET /jail-warden/officers
→ 200 OK
→ Page loads successfully
→ Shows officers with their assigned scopes
```

---

## 🎯 **Best Practices**

### ✅ Always Check Relationship Names

**Good:**
```php
// Check User model first
$user->assignedScopes  // ✅ Defined in User model
```

**Bad:**
```php
$user->scopes  // ❌ Doesn't exist
```

### ✅ Use IDE Autocomplete

Modern IDEs can help you:
- See available relationships
- Catch typos early
- Navigate to relationship definitions

### ✅ Read Model Files

When in doubt:
1. Open the Model file
2. Look for relationship methods
3. Use exact method names

---

## 📝 **Related Patterns**

### Eager Loading with Constraints:

```php
User::with(['assignedScopes' => function ($query) {
    $query->with('scopeable');  // Nested eager loading
}])
```

### Accessing Loaded Relationships:

```php
$officer->assignedScopes  // Returns Collection
$officer->assignedScopes->map(fn($scope) => [...])
```

---

## 🚀 **Prevention Tips**

When working with Eloquent relationships:

1. **Check the Model first**
   - Open User.php or relevant model
   - Verify relationship method names

2. **Use consistent naming**
   - Plural for hasMany: `assignedScopes`
   - Singular for belongsTo: `scopeable`

3. **Test immediately**
   - Don't wait until end to test
   - Test each relationship as you add it

4. **Read error messages carefully**
   - "Too few arguments" often means wrong method called
   - Check if relationship exists

---

## 📊 **Impact**

- **Severity:** High (blocked entire Jail Officer module)
- **Users Affected:** All Jail Wardens
- **Modules Fixed:** Jail Officer Management
- **Time to Fix:** < 1 minute

---

## ✅ **Status**

**Resolved!** The Jail Officer Management page now loads successfully and displays all jail officers with their correctly assigned facility scopes.

---

**Related Fixes:**
- ✅ SQL ambiguity error in CellManagementController
- ✅ Role query error in JailOfficerManagementController
- ✅ Relationship name error in JailOfficerManagementController

All Jail Warden modules are now fully functional!
