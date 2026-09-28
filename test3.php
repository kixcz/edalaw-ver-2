<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$user = \App\Models\User::find(25);
echo json_encode(['cells' => $user->getAuthorizedCellIds(), 'buildings' => $user->getAuthorizedBuildingIds(), 'dormitories' => $user->getAuthorizedDormitoryIds()]);
