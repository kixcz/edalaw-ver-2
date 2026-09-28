<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$count = \App\Models\Cell::join('dormitories', 'cells.dormitory_id', '=', 'dormitories.id')
    ->join('annexes', 'dormitories.annex_id', '=', 'annexes.id')
    ->join('jails', 'annexes.jail_id', '=', 'jails.id')
    ->where('jails.branch_id', 1)
    ->count();
echo "\nCOUNT: " . $count . "\n";
