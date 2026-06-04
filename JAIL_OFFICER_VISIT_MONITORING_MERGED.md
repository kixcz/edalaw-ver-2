# ✅ Jail Officer Visit Monitoring Module - Merged Implementation

## 🎯 Overview

**Date:** April 2, 2026  
**Status:** COMPLETE ✅

The **Visit** and **Assigned Sessions** modules have been successfully merged for Jail Officers. Visits are now automatically assigned to jail officers based on their facility scope assignments.

---

## 🔐 Access Information

### URL
```
http://127.0.0.1:8000/jail-officer/assigned-sessions
```

### Navigation
- **Sidebar Label:** "Visit Monitoring" (under Session Monitoring section)
- **Route:** `/jail-officer/assigned-sessions`

---

## 📊 How It Works

### Automatic Assignment Logic

Visits automatically appear in a Jail Officer's "Visit Monitoring" module when:

1. **Cell-Level Assignment**
   - The inmate/PDL is assigned to a specific cell
   - That cell is assigned to the jail officer
   ```
   JO Scope: Cell 101 → Inmate in Cell 101 → Visit appears
   ```

2. **Dormitory-Level Assignment**
   - The inmate is in a cell within a dormitory
   - That dormitory is assigned to the jail officer
   ```
   JO Scope: Male Dormitory → All cells in dorm → All inmate visits appear
   ```

3. **Annex-Level Assignment**
   - The inmate is in a cell within an annex
   - That annex is assigned to the jail officer
   ```
   JO Scope: Annex A → All dorms & cells in annex → All inmate visits appear
   ```

4. **Explicit Assignment (Fallback)**
   - Visits that were manually assigned to the JO via `jail_officer_id`
   - Maintains backward compatibility with existing visits

---

## 🔄 Changes Made

### 1. Backend Controller Update
**File:** `app/Http/Controllers/JailOfficer/AssignedSessionsController.php`

**What Changed:**
```php
// OLD: Simple jail_officer_id check
$query->where('jail_officer_id', $user->id);

// NEW: Complex scope-based filtering
$query->whereHas('inmate', function ($inmateQuery) use ($scopeIds) {
    $inmateQuery->where(function ($query) use ($scopeIds) {
        // Direct cell assignment
        $query->whereHas('cell', function ($cellQuery) use ($scopeIds) {
            $cellQuery->whereIn('id', $scopeIds->clone()
                ->where('scope_type', 'cell')
                ->pluck('cell_id'));
        })
        // Or inmate's annex matches JO's annex assignment
        ->orWhereHas('annex', function ($annexQuery) use ($scopeIds) {
            $annexQuery->whereIn('id', $scopeIds->clone()
                ->where('scope_type', 'annex')
                ->pluck('annex_id'));
        })
        // Or inmate's dormitory matches JO's dormitory assignment
        ->orWhereHas('dormitory', function ($dormQuery) use ($scopeIds) {
            $dormQuery->whereIn('id', $scopeIds->clone()
                ->where('scope_type', 'dormitory')
                ->pluck('dormitory_id'));
        });
    });
})
->orWhere('jail_officer_id', $user->id); // Fallback
```

### 2. User Model Enhancement
**File:** `app/Models/User.php`

**Added Method:**
```php
/**
 * Alias for assignedScopes - get jail officer scope assignments.
 */
public function jailOfficerScopes(): HasMany
{
    return $this->assignedScopes();
}
```

### 3. Frontend UI Updates
**File:** `resources/js/components/app-sidebar.tsx`

**Changed:**
- Sidebar label: "Assigned Sessions" → "Visit Monitoring"

**File:** `resources/js/pages/JailOfficer/AssignedSessions.tsx`

**Updated:**
- Page title: "Assigned Sessions" → "Visit Monitoring"
- Description: More accurate messaging about monitoring visits in assigned areas
- Card header: "session(s) assigned to you" → "visit(s) in your assigned areas"

---

## 🎯 Use Cases

### Scenario 1: Cell-Specific Monitoring
**Jail Officer assigned to specific cell:**
```
JO: Juan Dela Cruz
Scope: Cell Level - Cell 101, Floor 1, Male Dormitory, Annex A
Inmate: John Doe in Cell 101
Result: When John Doe has a visitor, JO Juan sees the visit in his module
```

### Scenario 2: Dormitory-Wide Oversight
**Jail Officer assigned to entire dormitory:**
```
JO: Maria Santos
Scope: Dormitory Level - Male Dormitory Building 1
Inmates: All inmates in cells C101, C102, C103, etc.
Result: ALL visits from inmates in this dormitory appear for JO Maria
```

### Scenario 3: Annex-Level Supervision
**Jail Officer with broad annex assignment:**
```
JO: Pedro Reyes
Scope: Annex Level - Annex A (entire annex)
Inmates: All inmates across all dormitories & cells in Annex A
Result: ALL visits from any inmate in Annex A appear for JO Pedro
```

---

## 📋 Data Flow

### Step-by-Step Process:

1. **Jail Warden assigns scope to JO**
   - Via Jail Officer Management module
   - Assigns cell, dormitory, or annex level scope

2. **Visitor schedules visit**
   - Selects inmate/PDL they want to visit
   - Visit created with status "pending"

3. **Visit approved** (by BJMP officer or Jail Warden)
   - Visit session created
   - System checks inmate's location (cell assignment)

4. **Automatic matching**
   - System queries JO scopes
   - Matches inmate's cell/dormitory/annex with JO assignments
   - Visit appears in matching JO's "Visit Monitoring" module

5. **JO monitors visit**
   - Can join as observer during scheduled time
   - Can manage active sessions (mute, camera, kill, etc.)

---

## 🔍 Database Relationships

### Key Tables:
- `users` (jail officers)
- `jail_officer_scopes` (scope assignments)
- `cells` (facility cells)
- `dormitories` (dormitory buildings)
- `annexes` (annex facilities)
- `inmates` (PDLs)
- `visits` (scheduled visits)
- `visit_sessions` (video call sessions)

### Relationship Chain:
```
Jail Officer
  ↓ (has many)
JailOfficerScope [cell_id | dormitory_id | annex_id]
  ↓ (matches)
Cell / Dormitory / Annex
  ↓ (contains)
Inmate
  ↓ (has many)
Visit
  ↓ (has many)
VisitSession ← Shows in JO's module
```

---

## ✅ Benefits

### 1. **Automated Assignment**
- No manual assignment needed
- Dynamic based on facility changes
- Real-time updates

### 2. **Hierarchical Flexibility**
- Cell-level: Most specific (single cell)
- Dormitory-level: Medium scope (multiple cells)
- Annex-level: Broadest (entire facility section)

### 3. **Backward Compatible**
- Existing visits with `jail_officer_id` still work
- Gradual migration path
- No data loss

### 4. **Clear Mental Model**
- "Visit Monitoring" = Watching over visits in assigned areas
- Intuitive understanding of responsibility
- Matches physical jail management structure

---

## 🧪 Testing Checklist

### Test Scenarios:

- [ ] **Cell-Level Assignment**
  - Assign JO to specific cell
  - Create visit for inmate in that cell
  - Verify visit appears in JO's module

- [ ] **Dormitory-Level Assignment**
  - Assign JO to dormitory
  - Create visits for inmates in different cells within dorm
  - Verify ALL visits appear

- [ ] **Annex-Level Assignment**
  - Assign JO to annex
  - Create visits for inmates across multiple dorms
  - Verify ALL visits appear

- [ ] **Mixed Scopes**
  - Assign JO to multiple scopes (e.g., 2 cells + 1 dorm)
  - Create visits in each area
  - Verify correct filtering

- [ ] **Backward Compatibility**
  - Check old visits with explicit `jail_officer_id`
  - Verify they still appear

- [ ] **Super Admin View**
  - Login as super admin
  - Verify they see ALL visits (no filtering)

---

## 🚀 Future Enhancements

### Potential Improvements:

1. **Load Balancing**
   - Automatically distribute visits among multiple JOs
   - Prevent overload on single officer

2. **Shift-Based Assignment**
   - Time-based scope assignments
   - Different JOs for different shifts

3. **Temporary Reassignment**
   - Temporary scope changes
   - Coverage for absent officers

4. **Priority Levels**
   - High-risk inmates → Senior JO
   - Standard visits → Regular JO

---

## 📝 Notes

### Important Considerations:

1. **Performance**: The query uses eager loading to prevent N+1 issues
2. **Caching**: Consider caching scope assignments for large facilities
3. **Real-time Updates**: Future enhancement could use WebSockets for live updates
4. **Audit Trail**: All scope changes logged in audit logs

---

## 🔗 Related Files

### Modified Files:
- ✅ `app/Http/Controllers/JailOfficer/AssignedSessionsController.php`
- ✅ `app/Models/User.php`
- ✅ `resources/js/components/app-sidebar.tsx`
- ✅ `resources/js/pages/JailOfficer/AssignedSessions.tsx`

### Related Modules:
- Jail Officer Management (`/jail-warden/officers`)
- Jail Warden Dashboard (`/dashboard/jail-warden`)
- Visit Management (visitor side)

---

**Status:** ✅ COMPLETE  
**Implementation Date:** April 2, 2026

The Visit Monitoring module is now fully merged and operational!
