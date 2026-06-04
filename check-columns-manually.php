<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

echo "Checking columns directly:\n";

$annexesCols = DB::select('DESCRIBE annexes');
echo "\nANNEXES columns:\n";
foreach ($annexesCols as $col) {
    echo "  - {$col->Field}\n";
}
echo "Has dormitory_id? " . (Schema::hasColumn('annexes', 'dormitory_id') ? 'YES' : 'NO') . "\n";

$dormitoriesCols = DB::select('DESCRIBE dormitories');
echo "\nDORMITORIES columns:\n";
foreach ($dormitoriesCols as $col) {
    echo "  - {$col->Field}\n";
}
echo "Has jail_id? " . (Schema::hasColumn('dormitories', 'jail_id') ? 'YES' : 'NO') . "\n";

$cellsCols = DB::select('DESCRIBE cells');
echo "\nCELLS columns:\n";
foreach ($cellsCols as $col) {
    echo "  - {$col->Field}\n";
}
echo "Has annex_id? " . (Schema::hasColumn('cells', 'annex_id') ? 'YES' : 'NO') . "\n";
