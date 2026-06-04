<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

$users = App\Models\User::whereNotNull('region_id')->get();
foreach($users as $user) {
    echo $user->email . ' - Region ID: ' . $user->region_id . PHP_EOL;
}
