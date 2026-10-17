<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$user = App\Models\User::find(31);
echo "User 31 role: " . $user->role?->slug . "\n";

$rolesToTest = ['jail_officer', 'jail_warden', 'visitor', 'regional_supervisor', 'national'];
foreach ($rolesToTest as $r) {
    $u = App\Models\User::whereHas('role', fn($q) => $q->where('slug', $r))->first();
    if (!$u) continue;
    
    $req = Illuminate\Http\Request::create('/jail-officer/assigned-visit-sessions', 'GET');
    $req->setUserResolver(fn() => $u);
    
    // Check EnsureRole
    $ensureRole = new App\Http\Middleware\EnsureRole();
    try {
        $ensureRole->handle($req, fn() => response('ok'), 'jail_officer');
        $rolePass = "PASS";
    } catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) {
        $rolePass = "FAIL " . $e->getStatusCode();
    }
    
    echo "User {$u->id} ({$u->email}, role: {$r}): EnsureRole -> {$rolePass}\n";
}
