<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "=== Checking if annexes has branch_id ===" . PHP_EOL;
$columns = DB::select('DESCRIBE annexes');
foreach($columns as $col) {
    echo $col->Field . " - " . $col->Type . PHP_EOL;
}
