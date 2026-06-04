<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

$regionId = 1;
$branches = App\Models\Branch::where('region_id', $regionId)->get();
echo "Region $regionId has " . $branches->count() . " branches:" . PHP_EOL;
foreach($branches as $branch) {
    echo "  - {$branch->name} ({$branch->code})" . PHP_EOL;
    
    // Count facilities
    $jails = $branch->jails()->count();
    $dorms = $branch->dormitories()->count();
    $annexes = $branch->annexes()->count();
    $cells = $branch->cells()->count();
    
    echo "    Jails: $jails, Dorms: $dorms, Annexes: $annexes, Cells: $cells" . PHP_EOL;
}
