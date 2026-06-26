<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

try {
    echo "Testing database connection...\n";
    $result = DB::select('SELECT 1 as test');
    echo "Database connection successful!\n\n";
    
    echo "Running migration: add_branch_id_to_time_slot_capacities_table\n";
    
    // Check if migration already ran
    $exists = DB::getSchemaBuilder()->hasColumn('time_slot_capacities', 'branch_id');
    
    if ($exists) {
        echo "✓ Column 'branch_id' already exists in time_slot_capacities table\n";
    } else {
        echo "Adding branch_id column...\n";
        
        DB::statement('ALTER TABLE time_slot_capacities ADD COLUMN branch_id BIGINT UNSIGNED NULL AFTER id');
        echo "✓ Added branch_id column\n";
        
        echo "Dropping old unique constraint...\n";
        DB::statement('ALTER TABLE time_slot_capacities DROP INDEX time_slot_capacities_time_slot_visit_type_unique');
        echo "✓ Dropped old constraint\n";
        
        echo "Adding new unique constraint...\n";
        DB::statement('ALTER TABLE time_slot_capacities ADD UNIQUE KEY time_slot_branch_time_visit_unique (branch_id, time_slot, visit_type)');
        echo "✓ Added new constraint\n";
        
        echo "\n✅ Migration completed successfully!\n";
    }
    
} catch (\Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "\nStack trace:\n" . $e->getTraceAsString() . "\n";
}
