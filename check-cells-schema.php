<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "=== CELLS TABLE ===" . PHP_EOL;
$columns = DB::select('DESCRIBE cells');
foreach($columns as $col) {
    echo str_pad($col->Field, 20) . " - " . $col->Type . PHP_EOL;
}
