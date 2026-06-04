<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;

echo "=== TESTING BRANCH CELLS QUERY ===\n\n";

try {
    $branch = DB::table('branches')->first();
    
    if (!$branch) {
        echo "No branches found!\n";
        exit;
    }
    
    echo "Testing with Branch ID: {$branch->id} ({$branch->name})\n\n";
    
    // Check annexes
    $annexes = DB::table('annexes')->where('branch_id', $branch->id)->count();
    echo "Annexes in this branch: $annexes\n";
    
    // Check dormitories through annexes
    $dorms = DB::table('dormitories')
        ->join('annexes', 'dormitories.annex_id', '=', 'annexes.id')
        ->where('annexes.branch_id', $branch->id)
        ->count();
    echo "Dormitories in this branch: $dorms\n";
    
    // Check cells through dormitories and annexes
    $cells = DB::table('cells')
        ->join('dormitories', 'cells.dormitory_id', '=', 'dormitories.id')
        ->join('annexes', 'dormitories.annex_id', '=', 'annexes.id')
        ->where('annexes.branch_id', $branch->id)
        ->count();
    echo "Cells in this branch: $cells\n";
    
    echo "\n✅ Manual query works!\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
