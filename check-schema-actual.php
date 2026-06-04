<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;

echo "=== ANNEXES TABLE ===\n";
$columns = DB::select('DESCRIBE annexes');
foreach ($columns as $column) {
    echo "- {$column->Field} ({$column->Type})\n";
}

echo "\n=== DORMITORIES TABLE ===\n";
$columns = DB::select('DESCRIBE dormitories');
foreach ($columns as $column) {
    echo "- {$column->Field} ({$column->Type})\n";
}

echo "\n=== CELLS TABLE ===\n";
$columns = DB::select('DESCRIBE cells');
foreach ($columns as $column) {
    echo "- {$column->Field} ({$column->Type})\n";
}

echo "\n=== JAILS TABLE ===\n";
$columns = DB::select('DESCRIBE jails');
foreach ($columns as $column) {
    echo "- {$column->Field} ({$column->Type})\n";
}

echo "\n=== BRANCHES TABLE ===\n";
$columns = DB::select('DESCRIBE branches');
foreach ($columns as $column) {
    echo "- {$column->Field} ({$column->Type})\n";
}
