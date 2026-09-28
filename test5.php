<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$scope = \App\Models\JailOfficerScope::find(4);
echo "Scope ID: " . $scope->id . "\n";
echo "Dormitory: " . ($scope->dormitory ? $scope->dormitory->name : 'NULL') . "\n";
echo "Building: " . ($scope->building ? $scope->building->name : 'NULL') . "\n";
