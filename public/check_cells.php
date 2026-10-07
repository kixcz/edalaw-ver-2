<?php
require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$response = $kernel->handle(
    $request = Illuminate\Http\Request::capture()
);
$jo = \App\Models\User::whereHas('assignedScopes')->first();
if ($jo) {
    $authorizedCellIds = $jo->getAuthorizedCellIds();
    $cells = \App\Models\Cell::whereIn('id', $authorizedCellIds)->orderBy('cell_number')->pluck('cell_number')->toArray();
    echo "JO Name: " . $jo->first_name . " " . $jo->last_name . "\n";
    echo "Authorized Cell IDs: " . implode(',', $authorizedCellIds) . "\n";
    echo "Cells: " . implode(',', $cells) . "\n";
} else {
    echo "No JO found with assigned scopes.";
}
