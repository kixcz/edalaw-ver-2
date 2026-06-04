<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "=== ANNEXES TABLE ===" . PHP_EOL;
print_r(DB::select('DESCRIBE annexes'));

echo PHP_EOL . "=== DORMITORIES TABLE ===" . PHP_EOL;
print_r(DB::select('DESCRIBE dormitories'));
