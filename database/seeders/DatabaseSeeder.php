<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->command->info('Starting hierarchical multi-tenant seeding...');
        $this->command->newLine();

        $this->call([
            // 1. Seed roles first (required by all users)
            RoleSeeder::class,
            
            // 2. Seed regions and branches (foundation of hierarchy)
            RegionBranchSeeder::class,
            
            // 3. Seed jails, dormitories, annexes, and cells
            JailFacilitySeeder::class,
            
            // 4. Seed time slot capacities
            TimeSlotCapacitySeeder::class,
            
            // 5. Seed regional supervisors
            RegionalSupervisorSeeder::class,
            
            // 6. Seed users with proper branch assignments
            HierarchicalUserSeeder::class,
            
            // 7. Seed jail officer scope assignments
            JailOfficerScopeSeeder::class,
            
            // 8. Seed inmates/PDLs (must be before visits)
            InmatePdlSeeder::class,
            
            // 9. Seed cell schedule templates
            CellScheduleTemplateSeeder::class,
            
            // 10. Seed visits and visit sessions
            VisitSessionSeeder::class,
            
            // 11. Seed visit monitored logs
            VisitMonitoredLogSeeder::class,
            
            // 12. Seed related data (call logs, recordings, chat logs)
            RelatedDataSeeder::class,
            
            // 13. Seed fake chat logs (additional data)
            FakeChatLogsSeeder::class,
            
            // 14. Seed incidents
            IncidentSeeder::class,
            
            // 15. Seed appeals
            AppealSeeder::class,
            
            // 16. Seed suggestions
            SuggestionSeeder::class,
            
            // 17. Seed notifications
            NotificationSeeder::class,
        ]);

        $this->command->newLine();
        $this->command->info('Comprehensive hierarchical multi-tenant seeding completed successfully!');
        $this->command->info('Summary:');
        $this->command->info('  - National Office user: national@edalaw.gov.ph (password: password)');
        $this->command->info('  - Regional Supervisors: regional@edalaw.gov.ph (password: password)');
        $this->command->info('  - Super Admins: Assigned to each branch');
        $this->command->info('  - Jail Wardens: Assigned to each branch');
        $this->command->info('  - Jail Officers: Multiple per branch with scope assignments');
        $this->command->info('  - BJMP Officers: Multiple per branch');
        $this->command->info('  - Monitoring Officers: Multiple');
        $this->command->info('  - Visitors: Multiple approved users');
        $this->command->info('  - Jails, Dormitories, Annexes, Cells: Created for each branch');
        $this->command->info('  - Inmates/PDLs: Assigned to cells with realistic data');
        $this->command->info('  - Cell Schedule Templates: Configured for each cell');
        $this->command->info('  - Visits & Sessions: Mixed statuses across all jails');
        $this->command->info('  - Call Logs, Video Recordings, Chat Logs: Associated with sessions');
        $this->command->info('  - Incidents: Various types and severities');
        $this->command->info('  - Appeals: Multiple statuses and types');
        $this->command->info('  - Suggestions: Various categories');
        $this->command->info('  - Notifications: Distributed across all users');
    }
}
