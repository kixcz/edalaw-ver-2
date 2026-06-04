<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

// Simulate regional supervisor login
$user = App\Models\User::where('email', 'regional@edalaw.gov.ph')->first();
echo "Testing as: {$user->email} (Region ID: {$user->region_id})" . PHP_EOL . PHP_EOL;

// Test query from controller
$branches = App\Models\Branch::where('region_id', $user->region_id)
    ->with(['jailWarden'])
    ->get()
    ->map(function ($branch) {
        return [
            'id' => $branch->id,
            'code' => $branch->code,
            'name' => $branch->name,
            'type' => 'provincial',
            'status' => $branch->status,
            'location' => $branch->description ?? 'N/A',
            'warden' => $branch->jailWarden ? [
                'name' => trim("{$branch->jailWarden->first_name} {$branch->jailWarden->middle_name} {$branch->jailWarden->last_name}"),
                'email' => $branch->jailWarden->email,
            ] : null,
            'total_annexes' => $branch->annexes()->count(),
            'total_dormitories' => $branch->dormitories()->count(),
            'total_cells' => $branch->cells()->count(),
            'total_pdls' => $branch->cells()->withCount('inmates')->get()->sum('inmates_count'),
        ];
    });

echo "Found " . $branches->count() . " branches:" . PHP_EOL;
foreach($branches as $branch) {
    echo PHP_EOL . "Branch: {$branch['name']} ({$branch['code']})" . PHP_EOL;
    echo "  Status: {$branch['status']}" . PHP_EOL;
    echo "  Type: {$branch['type']}" . PHP_EOL;
    echo "  Location: {$branch['location']}" . PHP_EOL;
    echo "  Warden: " . ($branch['warden'] ? $branch['warden']['name'] : 'None') . PHP_EOL;
    echo "  Annexes: {$branch['total_annexes']}" . PHP_EOL;
    echo "  Dorms: {$branch['total_dormitories']}" . PHP_EOL;
    echo "  Cells: {$branch['total_cells']}" . PHP_EOL;
    echo "  PDLs: {$branch['total_pdls']}" . PHP_EOL;
}
