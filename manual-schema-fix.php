<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;

echo "=== MANUAL SCHEMA FIX ===\n\n";

try {
    // Fix annexes - remove dormitory_id
    echo "1. Removing dormitory_id from annexes...\n";
    $fks = DB::select("
        SELECT CONSTRAINT_NAME 
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'annexes'
        AND COLUMN_NAME = 'dormitory_id'
        AND REFERENCED_TABLE_NAME IS NOT NULL
    ");
    
    if (!empty($fks)) {
        DB::statement('ALTER TABLE annexes DROP FOREIGN KEY ' . $fks[0]->CONSTRAINT_NAME);
    }
    DB::statement('ALTER TABLE annexes DROP COLUMN dormitory_id');
    echo "   ✓ Done\n";
} catch (\Exception $e) {
    echo "   Error: " . $e->getMessage() . "\n";
}

try {
    // Fix dormitories - remove jail_id
    echo "2. Removing jail_id from dormitories...\n";
    $fks = DB::select("
        SELECT CONSTRAINT_NAME 
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'dormitories'
        AND COLUMN_NAME = 'jail_id'
        AND REFERENCED_TABLE_NAME IS NOT NULL
    ");
    
    if (!empty($fks)) {
        DB::statement('ALTER TABLE dormitories DROP FOREIGN KEY ' . $fks[0]->CONSTRAINT_NAME);
    }
    DB::statement('ALTER TABLE dormitories DROP COLUMN jail_id');
    echo "   ✓ Done\n";
} catch (\Exception $e) {
    echo "   Error: " . $e->getMessage() . "\n";
}

try {
    // Fix cells - remove annex_id
    echo "3. Removing annex_id from cells...\n";
    $fks = DB::select("
        SELECT CONSTRAINT_NAME 
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'cells'
        AND COLUMN_NAME = 'annex_id'
        AND REFERENCED_TABLE_NAME IS NOT NULL
    ");
    
    if (!empty($fks)) {
        DB::statement('ALTER TABLE cells DROP FOREIGN KEY ' . $fks[0]->CONSTRAINT_NAME);
    }
    DB::statement('ALTER TABLE cells DROP COLUMN annex_id');
    echo "   ✓ Done\n";
} catch (\Exception $e) {
    echo "   Error: " . $e->getMessage() . "\n";
}

echo "\n=== VERIFICATION ===\n";
$cols = DB::select('DESCRIBE annexes');
echo "ANNEXES: " . implode(', ', array_column($cols, 'Field')) . "\n";

$cols = DB::select('DESCRIBE dormitories');
echo "DORMITORIES: " . implode(', ', array_column($cols, 'Field')) . "\n";

$cols = DB::select('DESCRIBE cells');
echo "CELLS: " . implode(', ', array_column($cols, 'Field')) . "\n";

echo "\n✓ Manual fix complete!\n";
