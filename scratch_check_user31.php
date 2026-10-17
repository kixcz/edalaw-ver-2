<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$user = App\Models\User::find(31);
echo "User 31 email: " . $user->email . "\n";
echo "Email verified at: " . ($user->email_verified_at ? $user->email_verified_at->toDateTimeString() : 'NULL') . "\n";
echo "Approval status: " . ($user->approval_status ? (is_object($user->approval_status) ? $user->approval_status->value : $user->approval_status) : 'NULL') . "\n";
echo "Role: " . $user->role?->slug . "\n";
