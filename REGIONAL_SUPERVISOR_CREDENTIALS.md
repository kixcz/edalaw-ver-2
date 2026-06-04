# E-Dalaw System Account Credentials

## Regional Supervisor Accounts

### Generic Test Account (Recommended for Testing)
```
Email: regional@edalaw.gov.ph
Password: password
Role: Regional Supervisor
Region: First available region in database
```

### Region-Specific Accounts
(These accounts are created only if the corresponding regions exist in the database)

#### National Capital Region (NCR)
```
Email: regional.ncr@edalaw.gov.ph
Password: password
Name: Maria Santos Reyes
Region: National Capital Region (NCR)
```

#### Region I (Ilocos Region)
```
Email: regional.region1@edalaw.gov.ph
Password: password
Name: Juan Bautista Cruz
Region: Region I
```

#### Region III (Central Luzon)
```
Email: regional.region3@edalaw.gov.ph
Password: password
Name: Elena Garcia Lopez
Region: Region III
```

#### Region VII (Central Visayas)
```
Email: regional.region7@edalaw.gov.ph
Password: password
Name: Roberto Dela Cruz Fernandez
Region: Region VII
```

---

## Access URL
```
http://127.0.0.1:8000/dashboard/regional-supervisor
```

---

## Regional Supervisor Capabilities

### Overview Dashboard
- View total branches, annexes, dormitories, cells, and PDLs in their region
- Monitor number of jail wardens assigned
- Track active vs inactive branches

### Branch Management Module
**View All Branches:**
- See all BJMP branches within their region
- View assigned Jail Warden for each branch
- See counts: annexes, dorms, cells, PDLs per branch
- Check branch status (active/inactive/maintenance)

**Create New Branch:**
- Add new branches to their region
- Specify: code, name, type (provincial/district/sub-provincial), location, description, status

**Edit Branch:**
- Update branch details
- Change status or reassign information

**Delete Branch:**
- Remove branches (only if no jails exist under that branch)
- Safety check prevents deletion of branches with existing facilities

### Detailed Breakdown Module
Hierarchical view showing:
```
Branch
└── Jail
    └── Dormitory
        └── Annex
            └── Cells
                └── PDLs (with full details: name, age, gender)
```

### Analytics Module
- Bar chart: Branches by Type
- Bar chart: PDL Count per Branch

---

## Other System Accounts

### National Office
```
Email: national@edalaw.gov.ph
Password: password
Access: http://127.0.0.1:8000/dashboard/national-office
```

### Super Admin
(Check DatabaseSeeder for specific accounts)
```
Access: http://127.0.0.1:8000/dashboard/super-admin
```

### Jail Officer
```
Access: http://127.0.0.1:8000/dashboard/jail-officer
```

---

## Running the Seeder

To create Regional Supervisor accounts, run:
```bash
php artisan db:seed --class=RegionalSupervisorSeeder
```

Or run the complete seeder:
```bash
php artisan db:seed
```

This will:
1. Create the `regional_supervisor` role
2. Create accounts for each available region
3. Create a generic test account (regional@edalaw.gov.ph)

---

## Important Notes

1. **Region Assignment**: Regional Supervisors can only see and manage branches within their assigned region
2. **Security**: Accounts are scoped to prevent cross-region access
3. **Deletion Protection**: Cannot delete branches that have existing jails
4. **Default Password**: All seeded accounts use `password` as the default password
5. **Change Passwords**: In production, always change default passwords immediately

---

## Troubleshooting

### No Regions Found Error
If you see "No regions found. Please run RegionSeeder first":
```bash
php artisan db:seed --class=RegionBranchSeeder
```

Then run the Regional Supervisor seeder again.

### Account Not Working
Make sure migrations are up to date:
```bash
php artisan migrate:fresh --seed
```

This will reset the database and run all seeders.
