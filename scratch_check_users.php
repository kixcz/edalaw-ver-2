<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$roles = App\Models\Role::all(['id', 'name', 'slug']);
echo "ROLES:\n" . json_encode($roles, JSON_PRETTY_PRINT) . "\n\n";

$users = App\Models\User::with('role')->take(50)->get(['id', 'email', 'role_id', 'approval_status']);
$userList = $users->map(fn($u) => [
    'id' => $u->id,
    'email' => $u->email,
    'role' => $u->role?->slug,
    'approval_status' => $u->approval_status,
]);
echo "USERS:\n" . json_encode($userList, JSON_PRETTY_PRINT) . "\n";
