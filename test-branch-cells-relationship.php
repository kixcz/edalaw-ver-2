<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Branch;

echo "=== TESTING BRANCH CELLS RELATIONSHIP ===\n\n";

try {
    $branch = Branch::first();
    
    if (!$branch) {
        echo "No branches found!\n";
        exit;
    }
    
    echo "Testing with Branch ID: {$branch->id} ({$branch->name})\n\n";
    
    // Test the cells relationship
    echo "Counting cells...\n";
    $count = $branch->cells()->count();
    echo "✓ Cells count: $count\n";
    
    echo "\n✅ Relationship works!\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "\nStack trace:\n" . $e->getTraceAsString() . "\n";
}
