<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;

echo "Cleaning up duplicate columns...\n\n";

// 1. Remove dormitory_id from annexes
try {
    $fk = DB::selectOne("
        SELECT CONSTRAINT_NAME 
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'annexes'
        AND COLUMN_NAME = 'dormitory_id'
        AND REFERENCED_TABLE_NAME IS NOT NULL
        LIMIT 1
    ");
    
    if ($fk) {
        DB::statement("ALTER TABLE annexes DROP FOREIGN KEY {$fk->CONSTRAINT_NAME}");
        echo "✓ Dropped FK: {$fk->CONSTRAINT_NAME}\n";
    }
    
    DB::statement("ALTER TABLE annexes DROP COLUMN dormitory_id");
    echo "✓ Removed dormitory_id from annexes\n";
} catch (Exception $e) {
    echo "✗ Error with annexes: " . $e->getMessage() . "\n";
}

// 2. Remove jail_id from dormitories
try {
    $fk = DB::selectOne("
        SELECT CONSTRAINT_NAME 
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'dormitories'
        AND COLUMN_NAME = 'jail_id'
        AND REFERENCED_TABLE_NAME IS NOT NULL
        LIMIT 1
    ");
    
    if ($fk) {
        DB::statement("ALTER TABLE dormitories DROP FOREIGN KEY {$fk->CONSTRAINT_NAME}");
        echo "✓ Dropped FK: {$fk->CONSTRAINT_NAME}\n";
    }
    
    DB::statement("ALTER TABLE dormitories DROP COLUMN jail_id");
    echo "✓ Removed jail_id from dormitories\n";
} catch (Exception $e) {
    echo "✗ Error with dormitories: " . $e->getMessage() . "\n";
}

// 3. Remove annex_id from cells
try {
    $fk = DB::selectOne("
        SELECT CONSTRAINT_NAME 
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'cells'
        AND COLUMN_NAME = 'annex_id'
        AND REFERENCED_TABLE_NAME IS NOT NULL
        LIMIT 1
    ");
    
    if ($fk) {
        DB::statement("ALTER TABLE cells DROP FOREIGN KEY {$fk->CONSTRAINT_NAME}");
        echo "✓ Dropped FK: {$fk->CONSTRAINT_NAME}\n";
    }
    
    DB::statement("ALTER TABLE cells DROP COLUMN annex_id");
    echo "✓ Removed annex_id from cells\n";
} catch (Exception $e) {
    echo "✗ Error with cells: " . $e->getMessage() . "\n";
}

echo "\n✅ Cleanup done!\n";
