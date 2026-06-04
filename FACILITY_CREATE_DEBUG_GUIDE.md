# Facility Management Create Functionality Debug Guide

## ✅ Enhanced with Error Logging

**Date:** April 2, 2026  
**Modules:** Annex, Dormitory, Cell Management

---

## 🔧 **What Was Added**

Added comprehensive console logging and error handling to help debug create/update functionality in all three facility management modules.

### Changes Made:

#### 1. **AnnexManagement/Index.tsx**
```typescript
const submitCreate = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submitting annex creation:', form.data);
    form.post(route('jail-warden.annexes.store'), {
        onSuccess: () => {
            console.log('Annex created successfully');
            form.reset();
            setIsCreateModalOpen(false);
        },
        onError: (error) => {
            console.error('Error creating annex:', error);
        },
    });
};
```

#### 2. **DormitoryManagement/Index.tsx**
Same pattern for dormitory creation

#### 3. **CellManagement/Index.tsx**
Same pattern for cell creation

---

## 🐛 **How to Debug**

### Step 1: Open Browser DevTools
1. Press `F12` or `Ctrl+Shift+I`
2. Go to **Console** tab

### Step 2: Try to Create a Facility
1. Navigate to any module (e.g., `/jail-warden/annexes`)
2. Click "Create" button
3. Fill in the form
4. Click "Create"

### Step 3: Check Console Output

#### ✅ **Success Flow:**
```
Submitting annex creation: {name: "Test Annex", description: "", status: "active"}
Annex created successfully
```

#### ❌ **Error Flow:**
```
Submitting annex creation: {name: "", description: "", status: "active"}
Error creating annex: {name: ["The name field is required."]}
```

---

## 🔍 **Common Issues & Solutions**

### Issue 1: Form Not Submitting

**Symptoms:**
- No console output
- Modal stays open
- Nothing happens when clicking "Create"

**Possible Causes:**
1. Form validation failing silently
2. JavaScript error preventing submission
3. Network issue

**Solution:**
- Check console for errors
- Verify all required fields are filled
- Check Network tab for failed requests

---

### Issue 2: Validation Errors

**Symptoms:**
```
Error creating annex: {
    name: ["The name field is required."],
    status: ["The selected status is invalid."]
}
```

**Solution:**
1. Check that all required fields have values
2. Verify dropdown selections are valid
3. Look for red error messages below fields

**Required Fields:**
- **Annex:** Name, Status
- **Dormitory:** Name, Type, Status, Annex
- **Cell:** Cell Number, Capacity, Status, Dormitory

---

### Issue 3: Route Helper Not Available

**Symptoms:**
```
ReferenceError: route is not defined
```

**Solution:**
This is a TypeScript warning only - the route helper is globally available at runtime. The code will work despite the IDE warning.

If you get actual runtime errors:
1. Ensure Ziggy is installed (`composer require tightenco/ziggy`)
2. Check `vite.config.ts` has Ziggy plugin
3. Run `npm run build`

---

### Issue 4: CSRF Token Mismatch

**Symptoms:**
```
419 CSRF token mismatch
```

**Solution:**
1. Refresh the page
2. Clear browser cache
3. Check `.env` has `SESSION_DRIVER=cookie`

---

### Issue 5: Permission Denied

**Symptoms:**
```
403 Unauthorized: Jail Warden must be assigned to a branch
```

**Solution:**
1. Ensure logged-in user has `jail_warden` role
2. Verify user has `branch_id` assigned
3. Check database: `users` table → `branch_id` column

---

## 📊 **Backend Verification**

### Check Routes Exist:
```bash
php artisan route:list --name=jail-warden.annexes
php artisan route:list --name=jail-warden.dormitories
php artisan route:list --name=jail-warden.cells
```

**Expected Output:**
```
GET|HEAD  jail-warden/annexes
POST      jail-warden/annexes
PUT       jail-warden/annexes/{annex}
DELETE    jail-warden/annexes/{annex}
```

---

### Check Controllers:

**File:** `app/Http/Controllers/JailWarden/AnnexManagementController.php`

```php
public function store(Request $request)
{
    $user = $request->user();
    
    if (!$user->branch) {
        abort(403, 'Jail Warden must be assigned to a branch.');
    }

    $validated = $request->validate([
        'name' => 'required|string|max:255',
        'description' => 'nullable|string',
        'status' => 'required|in:active,inactive',
    ]);

    $validated['branch_id'] = $user->branch_id;

    Annex::create($validated);

    return redirect()->back()->with('success', 'Annex created successfully.');
}
```

---

## 🧪 **Testing Checklist**

### Annex Creation:
1. ✅ Navigate to `/jail-warden/annexes`
2. ✅ Click "Create Annex"
3. ✅ Fill in Name (required)
4. ✅ Select Status (Active/Inactive)
5. ✅ Click "Create Annex"
6. ✅ Check console: "Submitting annex creation..."
7. ✅ Check console: "Annex created successfully"
8. ✅ Verify annex appears in table

### Dormitory Creation:
1. ✅ Navigate to `/jail-warden/dormitories`
2. ✅ Click "Create Dormitory"
3. ✅ Fill in Name (required)
4. ✅ Select Type (Male/Female/etc.)
5. ✅ Select Annex (required)
6. ✅ Select Status
7. ✅ Click "Create Dormitory"
8. ✅ Check console logs
9. ✅ Verify dormitory appears in table

### Cell Creation:
1. ✅ Navigate to `/jail-warden/cells`
2. ✅ Click "Create Cell"
3. ✅ Fill in Cell Number (required)
4. ✅ Enter Capacity (1-100)
5. ✅ Select Dormitory (required)
6. ✅ Select Status
7. ✅ Click "Create Cell"
8. ✅ Check console logs
9. ✅ Verify cell appears in table

---

## 💡 **Debugging Tips**

### 1. Use Browser Network Tab
- Open DevTools → Network tab
- Submit form
- Look for POST request
- Check response status and body

### 2. Check Laravel Logs
```bash
tail -f storage/logs/laravel.log
```

### 3. Test in Tinker
```bash
php artisan tinker
```

```php
// Test annex creation
$annex = new App\Models\Annex();
$annex->name = 'Test Annex';
$annex->branch_id = 1; // Your branch ID
$annex->status = 'active';
$annex->save();
```

### 4. Verify Database
```sql
-- Check if annex was created
SELECT * FROM annexes WHERE branch_id = 1 ORDER BY created_at DESC LIMIT 5;

-- Check dormitories
SELECT * FROM dormitories WHERE annex_id IN (SELECT id FROM annexes WHERE branch_id = 1);

-- Check cells
SELECT * FROM cells WHERE dormitory_id IN (SELECT id FROM dormitories WHERE annex_id IN (SELECT id FROM annexes WHERE branch_id = 1));
```

---

## 🎯 **Expected Behavior**

### Successful Creation Flow:
1. User clicks "Create" button
2. Modal opens with empty form
3. User fills in required fields
4. User clicks "Create" in modal
5. Console shows: "Submitting [type] creation: [data]"
6. Backend validates data
7. Record created in database
8. Console shows: "[Type] created successfully"
9. Modal closes
10. Table refreshes with new record
11. Success message appears (if implemented)

---

## 📝 **Files Modified**

1. ✅ `resources/js/Pages/JailWarden/AnnexManagement/Index.tsx`
   - Added console logging
   - Added error handler

2. ✅ `resources/js/Pages/JailWarden/DormitoryManagement/Index.tsx`
   - Added console logging
   - Added error handler

3. ✅ `resources/js/Pages/JailWarden/CellManagement/Index.tsx`
   - Added console logging
   - Added error handler

---

## 🚀 **Next Steps**

After testing:

1. **If it works:** Great! The modules are functional.
2. **If it doesn't work:** Check console output and report:
   - Exact error message
   - Screenshot of console
   - Network tab request/response
   - What you were trying to create

---

## 📊 **Current State**

✅ All three facility management modules have:
- Create functionality with logging
- Update functionality
- Delete functionality
- Error handling
- Console debugging enabled

**Modules:**
- Annex Management ✅
- Dormitory Management ✅
- Cell Management ✅

---

**Status:** ✅ READY FOR TESTING

Use the console logs to identify exactly where issues occur!
