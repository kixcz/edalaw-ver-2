<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

echo "=== CLEANING UP ANNEXES TABLE ===\n";
if (Schema::hasColumn('annexes', 'dormitory_id')) {
    echo "- Removing dormitory_id from annexes...\n";
    // Check and drop FK
    $fks = DB::select("
        SELECT CONSTRAINT_NAME 
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'annexes'
        AND COLUMN_NAME = 'dormitory_id'
        AND REFERENCED_TABLE_NAME IS NOT NULL
    ");
    
    if (!empty($fks)) {
        echo "  Dropping FK: {$fks[0]->CONSTRAINT_NAME}\n";
        DB::statement('ALTER TABLE annexes DROP FOREIGN KEY ' . $fks[0]->CONSTRAINT_NAME);
    }
    
    DB::statement('ALTER TABLE annexes DROP COLUMN dormitory_id');
    echo "  ✓ Removed dormitory_id\n";
} else {
    echo "- dormitory_id already removed from annexes ✓\n";
}

echo "\n=== CLEANING UP DORMITORIES TABLE ===\n";
if (Schema::hasColumn('dormitories', 'jail_id')) {
    echo "- Removing jail_id from dormitories...\n";
    $fks = DB::select("
        SELECT CONSTRAINT_NAME 
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'dormitories'
        AND COLUMN_NAME = 'jail_id'
        AND REFERENCED_TABLE_NAME IS NOT NULL
    ");
    
    if (!empty($fks)) {
        echo "  Dropping FK: {$fks[0]->CONSTRAINT_NAME}\n";
        DB::statement('ALTER TABLE dormitories DROP FOREIGN KEY ' . $fks[0]->CONSTRAINT_NAME);
    }
    
    DB::statement('ALTER TABLE dormitories DROP COLUMN jail_id');
    echo "  ✓ Removed jail_id\n";
} else {
    echo "- jail_id already removed from dormitories ✓\n";
}

echo "\n=== CLEANING UP CELLS TABLE ===\n";
if (Schema::hasColumn('cells', 'annex_id')) {
    echo "- Removing annex_id from cells...\n";
    $fks = DB::select("
        SELECT CONSTRAINT_NAME 
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'cells'
        AND COLUMN_NAME = 'annex_id'
        AND REFERENCED_TABLE_NAME IS NOT NULL
    ");
    
    if (!empty($fks)) {
        echo "  Dropping FK: {$fks[0]->CONSTRAINT_NAME}\n";
        DB::statement('ALTER TABLE cells DROP FOREIGN KEY ' . $fks[0]->CONSTRAINT_NAME);
    }
    
    DB::statement('ALTER TABLE cells DROP COLUMN annex_id');
    echo "  ✓ Removed annex_id\n";
} else {
    echo "- annex_id already removed from cells ✓\n";
}

echo "\n=== FINAL SCHEMA CHECK ===\n";
$columns = DB::select('DESCRIBE annexes');
echo "ANNEXES: " . implode(', ', array_column($columns, 'Field')) . "\n";

$columns = DB::select('DESCRIBE dormitories');
echo "DORMITORIES: " . implode(', ', array_column($columns, 'Field')) . "\n";

$columns = DB::select('DESCRIBE cells');
echo "CELLS: " . implode(', ', array_column($columns, 'Field')) . "\n";

echo "\n✓ Cleanup complete!\n";
echo "New hierarchy: Branch → Annex → Dormitory → Cell → PDL\n";
