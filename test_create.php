<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

try {
    $role = \App\Models\Role::where('slug', 'jail_officer')->firstOrFail();
    \App\Models\User::create([
        'first_name' => 'Test',
        'last_name' => 'Test',
        'email' => 'test_jo@test.com',
        'password' => bcrypt('password123'),
        'role_id' => $role->id,
        'branch_id' => 1,
        'approval_status' => 'approved'
    ]);
    echo "SUCCESS\n";
} catch (\Throwable $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
