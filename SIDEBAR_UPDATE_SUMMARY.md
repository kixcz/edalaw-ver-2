# Jail Officer Sidebar Update - Facility Management Module

## Changes Made

Updated the jail officer sidebar navigation to include the hierarchical jail management module under the **Facility Management** group.

### New Menu Items Added

The following items were added to the Facility Management section in order of hierarchy:

1. **Jail Management** 
   - Route: `/jail-officer/jails`
   - Icon: `Building2` (distinctive multi-building icon)
   - Purpose: Manage top-level jail facilities

2. **Dormitory Management**
   - Route: `/jail-officer/dormitories`
   - Icon: `Building`
   - Purpose: Manage dormitories within jails (categorized by type: male, female, juvenile)

3. **Annex Management**
   - Route: `/jail-officer/annexes`
   - Icon: `Archive`
   - Purpose: Manage annexes/buildings within dormitories

4. **Cell Management** (existing)
   - Route: `/bjmp-officer/cells`
   - Icon: `Building`
   - Purpose: Manage individual cells within annexes

5. **Inmate Management** (existing)
   - Route: `/bjmp-officer/inmates`
   - Icon: `Users`
   - Purpose: Manage inmate assignments to cells

6. **Cell Schedules** (existing)
   - Route: `/bjmp-officer/cell-schedules`
   - Icon: `Clock`
   - Purpose: Manage visitation schedules per cell

7. **Inmate Tunnels** (existing)
   - Route: `/jail-officer/inmate-tunnels`
   - Icon: `Link2`
   - Purpose: Manage inmate tunnel access codes

## File Modified

- `resources/js/components/app-sidebar.tsx`
  - Added `Building2` icon import from lucide-react
  - Updated `jailOfficerNavGroups` Facility Management section

## Navigation Hierarchy

The menu items follow the logical organizational structure:

```
Facility Management
├── Jail Management          (Top level: e.g., "Digos City Jail")
├── Dormitory Management     (Second level: e.g., "Male Dormitory")
├── Annex Management         (Third level: e.g., "Annex 1")
├── Cell Management          (Fourth level: e.g., "Cell A-101")
├── Inmate Management        (Assigned to cells)
├── Cell Schedules           (Visitation scheduling)
└── Inmate Tunnels           (Direct access links)
```

## Access

These menu items are only visible to users with the `jail_officer` role.

## Next Steps

To complete the user experience, ensure the following frontend pages are created:

1. `resources/js/pages/JailOfficer/JailManagement.tsx`
2. `resources/js/pages/JailOfficer/DormitoryManagement.tsx`
3. `resources/js/pages/JailOfficer/AnnexManagement.tsx`

The backend infrastructure (migrations, models, controllers, routes) is already in place and ready to support these pages.

## Visual Notes

- **Building2** icon was chosen for Jail Management to distinguish it as the highest level facility
- **Building** icon used for Dormitory and Cell management (consistent with existing UI)
- **Archive** icon used for Annex Management to represent subdivisions/buildings
- Menu items are ordered hierarchically from top-level (jails) to granular (cells, inmates)
